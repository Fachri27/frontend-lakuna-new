/**
 * Saklar suara situs.
 *
 * - `sound` / `soundOn()` / `setMuted()`: saklar global untuk bunyi
 *   non-UI (rana peta, balik halaman galeri, lensa preloader, audio video
 *   hero). Modul non-komponen cukup memanggil `soundOn()` sebelum memutar.
 *   Yang perlu bereaksi saat saklar berubah (mis. video hero yang sedang
 *   bersuara) mendengar event `lakuna:sound`.
 * - `scrambleMute` / `scrambleOn()` / `toggleScramble()`: KHUSUS suara UI
 *   scramble (hover/klik tombol). Inilah yang dikendalikan tombol mute di
 *   navbar — suara lain (video hero, dsb.) punya saklarnya masing-masing
 *   dan tidak ikut bisu.
 */const KEY = "lakuna-sound-muted";

function initial(): boolean {
	if (typeof window === "undefined") return false;
	try {
		return localStorage.getItem(KEY) === "1";
	} catch {
		return false;
	}
}

export const sound = $state({ muted: initial() });

/** Boleh berbunyi sekarang? */
export function soundOn(): boolean {
	return !sound.muted;
}

export function setMuted(muted: boolean) {
	sound.muted = muted;
	try {
		localStorage.setItem(KEY, muted ? "1" : "0");
	} catch {
		/* penyimpanan diblokir — tetap berlaku untuk sesi ini */
	}
	if (typeof window !== "undefined") {
		window.dispatchEvent(new CustomEvent("lakuna:sound", { detail: { muted } }));
		// Hentikan bunyi yang sedang berjalan saat dibisukan.
		if (muted) {
			document.querySelectorAll<HTMLMediaElement>("audio").forEach((a) => {
				if (!a.paused) a.pause();
			});
		}
	}
}

export function toggleSound() {
	setMuted(!sound.muted);
}

/* ── Saklar khusus suara UI scramble (tombol mute navbar) ── */
const SCRAMBLE_KEY = "lakuna-scramble-muted";

function initialScramble(): boolean {
	if (typeof window === "undefined") return false;
	try {
		return localStorage.getItem(SCRAMBLE_KEY) === "1";
	} catch {
		return false;
	}
}

export const scrambleMute = $state({ muted: initialScramble() });

/** Boleh bunyikan scramble sekarang? */
export function scrambleOn(): boolean {
	return !scrambleMute.muted;
}

export function toggleScramble() {
	scrambleMute.muted = !scrambleMute.muted;
	try {
		localStorage.setItem(SCRAMBLE_KEY, scrambleMute.muted ? "1" : "0");
	} catch {
		/* penyimpanan diblokir — tetap berlaku untuk sesi ini */
	}
}
