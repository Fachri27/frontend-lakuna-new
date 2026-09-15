import { access } from "./access.svelte";

/**
 * Bunyi saat membuka foto di peta: rekaman kamera Konica vintage — "pop" rana
 * lalu dengung flash yang mengisi daya (±2,5 dtk). Berkasnya di
 * static/sounds/shutter.mp3.
 *
 * Satu elemen <audio> dipakai ulang dan dimuat lebih dulu, jadi klik berikutnya
 * langsung berbunyi tanpa menunggu jaringan. Membuka foto lain sebelum bunyinya
 * habis memutarnya ulang dari awal, bukan menumpuk.
 */
const SRC = "/sounds/shutter.mp3";
const VOLUME = 0.6;

let audio: HTMLAudioElement | null = null;

function element(): HTMLAudioElement {
	if (!audio) {
		audio = new Audio(SRC);
		audio.preload = "auto";
		audio.volume = VOLUME;
	}
	return audio;
}

/** Muat berkasnya lebih dulu (mis. saat peta dipasang) supaya bunyi pertama tidak telat. */
export function primeShutter() {
	if (typeof window === "undefined") return;
	element().load();
}

/**
 * Bunyikan rana. Aman dipanggil kapan saja: kalau audio tidak tersedia, atau
 * pengguna sedang memilih mode hemat gerak, ia diam saja.
 *
 * Mode hemat gerak dipakai sebagai saklar senyap karena orang yang mematikan
 * animasi umumnya juga tidak ingin dikejutkan bunyi — dan saklar itu sudah ada
 * di panel aksesibilitas, jadi tidak perlu tombol baru yang harus dicari.
 */
export function playShutter() {
	if (typeof window === "undefined") return;
	if (access.settings.reduceMotion) return;
	if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

	try {
		const el = element();
		el.currentTime = 0;
		// Klik yang memanggil fungsi ini adalah gerakan pengguna, jadi autoplay
		// diizinkan; penolakan apa pun bukan alasan untuk menggagalkan klik.
		void el.play().catch(() => {});
	} catch {
		/* audio tidak tersedia */
	}
}
