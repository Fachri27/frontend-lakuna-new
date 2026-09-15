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
 */

self.addEventListener("install", (event) => {
	// Langsung aktif tanpa menunggu tab lama ditutup.
	event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
	// Langsung kendalikan semua tab dalam scope.
	event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
	// Passthrough murni — tidak ada cache, tidak ada offline fallback.
	event.respondWith(fetch(event.request));
});
