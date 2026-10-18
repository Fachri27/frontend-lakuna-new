import type { Handle } from "@sveltejs/kit";

/**
 * Security headers untuk semua respons (temuan pentest: tanpa CSP & anti-clickjacking).
 *
 * Sumber eksternal yang memang dipakai app (jadi harus diizinkan agar tidak merusak fungsi):
 * - https://picsum.photos ............ placeholder via imgFor()/dummyImg() di src/lib/data.ts
 *   (+ https://fastly.picsum.photos, tujuan redirect-nya)
 * - https://server.arcgisonline.com ... tile satelit Esri di IndonesiaMap.svelte (L.tileLayer)
 * - https://accounts.google.com ...... Google Identity Services (script + iframe tombol di app.html / LoginPage.svelte)
 * - https://fonts.googleapis.com ..... stylesheet Google Fonts (app.html)
 * - https://fonts.gstatic.com ........ file font Google Fonts
 * - http://localhost:3100 ............ backend API (VITE_API_URL)
 * - http://localhost:9000 ............ MinIO (MINIO_PUBLIC_URL) — gambar/video asli dari API
 *   (thumbUrl/watermarkUrl/imageUrl) saat USE_DUMMY_IMAGES=false
 * - https://*.trycloudflare.com ....... wildcard tunnel dev (cloudflared quick
 *   tunnel berganti host acak tiap dibuat ulang; tanpa wildcard, gambar mati
 *   dengan error CSP setiap ganti URL). Pasif (img/media) saja.
 * - https://*.googleusercontent.com ... avatar pengguna setelah login Google
 *   (avatarUrl dari backend, mis. lh3.googleusercontent.com).
 *
 * Penyimpangan dari CSP minimal di brief (demi aman-fungsional):
 * - script-src di kebijakan ini masih 'unsafe-inline', tetapi TIDAK berlaku: kit.csp (svelte.config.js)
 *   menambahkan kebijakan kedua tanpa 'unsafe-inline' (nonce + hash), dan browser menegakkan keduanya.
 *   GSAP/glightbox/leaflet aman karena di-bundle Vite (termasuk 'self').
 * - style-src + https://fonts.googleapis.com, font-src + https://fonts.gstatic.com
 *   (tanpanya font display/body fallback ke sistem).
 * - frame-src 'self' https://accounts.google.com (iframe tombol GSI).
 * - connect-src + ws:/wss: agar HMR Vite tidak diblokir saat dev (harmless di prod).
 */
// Baca dari import.meta.env dulu (file .env Vite) lalu process.env (shell/Vercel),
// supaya tunnel publik (cloudflared/ngrok) ikut diizinkan CSP saat dev share.
// Hanya ORIGIN (tanpa path): sumber CSP berpath "/api" hanya cocok persis dengan
// "/api", sehingga "/api/photos" ikut diblokir.
const rawApi =
	import.meta.env.VITE_API_URL || process.env.VITE_API_URL || "http://localhost:3100";
const API_ORIGIN = (() => {
	try {
		return new URL(rawApi.trim()).origin;
	} catch {
		return rawApi.trim().replace(/\/+$/, "").replace(/\/api$/i, "");
	}
})();
const MINIO_ORIGIN =
	import.meta.env.VITE_MINIO_PUBLIC_URL ||
	import.meta.env.MINIO_PUBLIC_URL ||
	process.env.VITE_MINIO_PUBLIC_URL ||
	process.env.MINIO_PUBLIC_URL ||
	"http://localhost:9000";

// Sumber KHUSUS dev/tunnel (HMR Vite, quick tunnel acak, API/MinIO lokal) — tidak dipasang di Vercel (produksi):
// `ws:`/`wss:` tanpa host = WebSocket ke host mana pun, dan *.trycloudflare.com bisa dibuat siapa saja gratis →
// keduanya membuka kanal pengiriman token keluar bila suatu saat ada XSS. Tunnel yang sengaja dipakai di Vercel tetap
// masuk lewat API_ORIGIN/MINIO_ORIGIN (env-nya diisi host tunnel aktif).
const IS_PROD = !!process.env.VERCEL;
const DEV_MEDIA = IS_PROD ? "" : "https://*.trycloudflare.com http://localhost:3100 http://localhost:9000";
const DEV_CONNECT = IS_PROD ? "" : `${DEV_MEDIA} ws: wss:`;

const CSP = [
	"default-src 'self'",
	// Pembayaran: tak ada skrip DOKU. Form kartu DOKU tampil sebagai iframe di halaman bayar (frame-src https:
	// di bawah) — data kartu langsung ke DOKU, tak pernah lewat halaman/skrip Lakuna.
	// Hanya pustaka GSI (rekomendasi CSP resmi Google), bukan seluruh accounts.google.com (endpoint lain di host itu
	// bisa dipakai memuat skrip lewat injeksi HTML).
	"script-src 'self' 'unsafe-inline' https://accounts.google.com/gsi/client",
	"style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://accounts.google.com",
 	"img-src 'self' data: blob: https://picsum.photos https://fastly.picsum.photos https://server.arcgisonline.com https://services.arcgisonline.com https://accounts.google.com https://*.googleusercontent.com https://*.up.railway.app " +
		`${API_ORIGIN} ${MINIO_ORIGIN} ${DEV_MEDIA}`,
	`media-src 'self' blob: https://*.up.railway.app ${API_ORIGIN} ${MINIO_ORIGIN} ${DEV_MEDIA}`,
	"font-src 'self' data: https://fonts.gstatic.com",
	// *.trycloudflare.com / *.up.railway.app (storage, sama dengan img-src): foto teracak diunduh lewat fetch CORS
	// supaya di-decode di luar thread utama (lib/photoScramble.ts).
	"connect-src 'self' https://gibs.earthdata.nasa.gov https://picsum.photos https://fastly.picsum.photos https://server.arcgisonline.com https://services.arcgisonline.com https://accounts.google.com https://fonts.googleapis.com https://fonts.gstatic.com https://*.up.railway.app " +
		`${API_ORIGIN} ${MINIO_ORIGIN} ${DEV_CONNECT}`,
	// Form kartu DOKU + verifikasi 3DS tampil di iframe milik halaman bayar; halaman ACS
	// bank berbeda-beda domainnya, jadi https: diizinkan untuk frame.
	"frame-src 'self' https://accounts.google.com https:",
	// worker-src blob: = HMR dev Vite (polling worker); tanpa ini console
	// banjir error CSP saat dev. Harmless di prod (tak ada worker blob).
	"worker-src 'self' blob:",
	"frame-ancestors 'self'",
	"object-src 'none'",
	"base-uri 'self'",
	// Form hanya ke situs sendiri / https (pengalihan pembayaran DOKU).
	"form-action 'self' https:",
].join("; ");

export const handle: Handle = async ({ event, resolve }) => {
	const res = await resolve(event);
	// SvelteKit (kit.csp di svelte.config.js) memasang kebijakan script ber-nonce; gabungkan sebagai kebijakan
	// kedua (dipisah koma = dua kebijakan, keduanya ditegakkan) supaya 'unsafe-inline' di bawah tak berlaku.
	const kitCsp = res.headers.get("content-security-policy");
	res.headers.set("Content-Security-Policy", kitCsp ? `${CSP}, ${kitCsp}` : CSP);
	// Anti-clickjacking berlapis: X-Frame-Options untuk UA lama, frame-ancestors (di CSP) yang otoritatif.
	res.headers.set("X-Frame-Options", "SAMEORIGIN");
	res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
	res.headers.set("X-Content-Type-Options", "nosniff");
	// payment tidak diblokir: iframe kartu DOKU memakainya.
	res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), usb=()");
	if (event.url.protocol === "https:") {
		res.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains");
	}
	return res;
};
