import { ScrollTrigger } from "gsap/ScrollTrigger";

/**
 * Refresh ScrollTrigger yang sopan: jangan ukur ulang selagi pengguna sedang
 * menggulir. Refresh di tengah gulir (pemicunya: konten async tiba, font
 * swap, tinggi dokumen berubah) menggeser posisi pin — terbaca sebagai
 * glitch/lompatan, terutama pada guliran pertama keluar hero.
 *
 * Pola pakai: panggil markScroll() dari listener scroll pasif global
 * (sekali, di SmoothScroll), dan ganti semua ScrollTrigger.refresh() mentah
 * dengan calmRefresh() di komponen ber-ScrollTrigger.
 */
let lastScroll = 0;

export function markScroll() {
	lastScroll = Date.now();
}

/** Milidetik sejak gulir terakhir. */
export function sinceScroll() {
	return Date.now() - lastScroll;
}

/**
 * ScrollTrigger.refresh() yang ditunda sampai gulir tenang (default 900ms).
 * Aman dipanggil berkali-kali — tiap panggilan menjadwalkan ukur ulang
 * sendiri-sendiri (idempoten, murah bila tidak ada perubahan layout).
 */
export function calmRefresh(quietMs = 900) {
	const wait = Math.max(0, lastScroll + quietMs - Date.now());
	window.setTimeout(() => ScrollTrigger.refresh(), wait);
}
