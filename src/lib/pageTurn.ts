import { access } from "./access.svelte";
import { soundOn } from "./sound.svelte";

/**
 * Bunyi balik halaman di orbit GsapGallery: static/sounds/scroll.mp3 (Scroll Sound Effect).
 * Tiap foto berbunyi saat MUNCUL masuk orbit dan (lebih pelan) saat HILANG
 * keluar orbit — sampai foto terakhir, selama section masih terlihat.
 *
 * Dulu satu elemen <audio> dan pemicu baru dilewati selama bunyi berjalan
 * (±0,9 dtk): digulir sedikit cepat, sebagian besar foto tak kebagian bunyi.
 * Kini kolam beberapa elemen, jadi bunyi boleh bertumpuk seperti kertas
 * yang dibalik beruntun; jarak minimum antarbunyi mencegah tumpukan riuh.
 */
const SRC = "/sounds/scroll.mp3";
export const PAGE_TURN_VOLUME = 0.5;
/** Foto keluar orbit: sama bunyinya, lebih pelan — gema dari yang pergi. */
export const PAGE_TURN_EXIT_VOLUME = 0.28;
/** Berkas ±0,23 dtk, diputar apa adanya (kecepatan normal). */
const PLAYBACK_RATE = 1;
const POOL_SIZE = 4;
/** Jarak minimum antarbunyi — gulir sangat cepat tidak jadi dengung. */
const MIN_GAP_MS = 30;

let pool: HTMLAudioElement[] = [];
let lastAt = 0;

function make(): HTMLAudioElement {
	const a = new Audio(SRC);
	a.preload = "auto";
	a.playbackRate = PLAYBACK_RATE;
		return a;
}

function elements(): HTMLAudioElement[] {
	if (!pool.length) pool = Array.from({ length: POOL_SIZE }, make);
	return pool;
}

/** Muat berkasnya lebih dulu (saat galeri dipasang) supaya bunyi pertama tidak telat. */
export function primePageTurn() {
	if (typeof window === "undefined") return;
	elements().forEach((a) => a.load());
}

/**
 * Bunyikan balik halaman. Aman dipanggil kapan saja: kalau audio tidak
 * tersedia, atau pengguna memilih mode hemat gerak, ia diam saja.
 * Mode hemat gerak dipakai sebagai saklar senyap — sama seperti shutter.
 */
export function playPageTurn(volume = PAGE_TURN_VOLUME) {
	if (typeof window === "undefined") return;
	if (!soundOn()) return;
	if (access.settings.reduceMotion) return;
	if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
	const now = performance.now();
	if (now - lastAt < MIN_GAP_MS) return;
	lastAt = now;

	try {
		const list = elements();
		// Elemen yang diam dulu; semua sibuk → pakai yang paling jauh berjalan.
		const el =
			list.find((a) => a.paused || a.ended) ??
			list.reduce((a, b) => (b.currentTime > a.currentTime ? b : a));
		el.volume = volume;
		el.playbackRate = PLAYBACK_RATE;
		el.currentTime = 0;
		// onUpdate ScrollTrigger jalan saat scroll (gerakan pengguna), jadi
		// autoplay umumnya diizinkan; penolakan ditelan diam-diam.
		void el.play().catch(() => {});
	} catch {
		/* audio tidak tersedia */
	}
}
