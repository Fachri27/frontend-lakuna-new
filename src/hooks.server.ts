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
 *
 * Penyimpangan dari CSP minimal di brief (demi aman-fungsional):
 * - script-src memakai 'unsafe-inline': WAJIB untuk inline bootstrap SvelteKit
 *   (%sveltekit.head%/%sveltekit.body% menyuntik <script> inline) dan inline
 *   theme-script di app.html. Tanpa ini halaman blank / tidak ter-hidrasi.
 *   GSAP/glightbox/leaflet aman karena di-bundle Vite (termasuk 'self').
 * - style-src + https://fonts.googleapis.com, font-src + https://fonts.gstatic.com
 *   (tanpanya font display/body fallback ke sistem).
 * - frame-src 'self' https://accounts.google.com (iframe tombol GSI).
 * - connect-src + ws:/wss: agar HMR Vite tidak diblokir saat dev (harmless di prod).
 */
const API_ORIGIN = process.env.VITE_API_URL || "http://localhost:3100";
const MINIO_ORIGIN = process.env.MINIO_PUBLIC_URL || "http://localhost:9000";

const CSP = [
	"default-src 'self'",
	"script-src 'self' 'unsafe-inline' https://accounts.google.com",
	"style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
	"img-src 'self' data: blob: https://picsum.photos https://fastly.picsum.photos https://server.arcgisonline.com https://accounts.google.com " +
		`${API_ORIGIN} ${MINIO_ORIGIN}`,
	`media-src 'self' blob: ${API_ORIGIN} ${MINIO_ORIGIN}`,
	"font-src 'self' data: https://fonts.gstatic.com",
	"connect-src 'self' https://picsum.photos https://fastly.picsum.photos https://server.arcgisonline.com https://accounts.google.com https://fonts.googleapis.com https://fonts.gstatic.com ws: wss: " +
		`${API_ORIGIN} ${MINIO_ORIGIN}`,
	"frame-src 'self' https://accounts.google.com",
	"frame-ancestors 'self'",
	"object-src 'none'",
	"base-uri 'self'",
].join("; ");

export const handle: Handle = async ({ event, resolve }) => {
	const res = await resolve(event);
	res.headers.set("Content-Security-Policy", CSP);
	// Anti-clickjacking berlapis: X-Frame-Options untuk UA lama, frame-ancestors (di CSP) yang otoritatif.
	res.headers.set("X-Frame-Options", "SAMEORIGIN");
	res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
	res.headers.set("X-Content-Type-Options", "nosniff");
	return res;
};
