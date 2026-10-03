/**
 * Service worker minimal Lakuna Foto.
 *
 * Tujuannya SATU: memenuhi syarat installability PWA Chrome (manifest +
 * service worker dengan fetch handler + ikon 192/512). Aplikasi yang
 * di-install di desktop diberi hak "autoplay with sound" oleh Chrome, sehingga
 * bunyi lensa preloader boleh bunyi tanpa menunggu klik — lihat
 * Preloader.svelte.
 *
 * SENGAJA tidak meng-cache apa pun: caching app-shell bisa basi dan konflik
 * dengan navigasi/hidrasi SvelteKit. Semua request diteruskan ke jaringan
 * apa adanya (passthrough).
 *
 * SW_VERSION: naikkan tiap mengubah file ini supaya tab yang masih dipegang
 * SW lama langsung mengenali versi baru saat update check.
 */
const SW_VERSION = 3;

self.addEventListener("install", (event) => {
	// Langsung aktif tanpa menunggu tab lama ditutup.
	event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
	// Langsung kendalikan semua tab dalam scope.
	event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
	// Navigasi (perpindahan/refresh halaman) TIDAK diintersepsi: bila fetch-nya
	// gagal (dev server restart, tunnel putus), browser menangani sendiri tanpa
	// error console "FetchEvent resulted in a network error response" dari SW.
	// SW ini hanya syarat installability PWA, bukan cache — subresource yang
	// gagal tetap diteruskan apa adanya.
	if (event.request.mode === "navigate") return;
	// Hanya GET ke origin situs sendiri. Request ke API (origin lain) dan
	// semua non-GET dibiarkan langsung ke browser: meneruskan POST unggahan
	// berukuran GB lewat SW membaca ulang body-nya dan terputus oleh batas umur
	// FetchEvent — hasilnya "net::ERR_FAILED" pada upload video besar.
	if (event.request.method !== "GET") return;
	if (new URL(event.request.url).origin !== self.location.origin) return;
	// Passthrough murni — tidak ada cache, tidak ada offline fallback.
	// Tangkap gagal jaringan supaya console tidak banjir unhandled rejection
	// saat backend/tunnel mati; halaman tetap menangani error-nya sendiri.
	event.respondWith(fetch(event.request).catch(() => Response.error()));
});
