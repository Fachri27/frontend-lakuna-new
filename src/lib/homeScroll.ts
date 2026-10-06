import { beforeNavigate, afterNavigate } from "$app/navigation";
import { getLenis } from "$lib/lenis";

/**
 * Pemulihan posisi gulir landing saat kembali (Back) dari halaman lain.
 *
 * Masalah: SvelteKit memulihkan `scrollY` seketika, tapi tinggi landing baru final ±0,5 dtk kemudian
 * (bagian yang di-pin dipasang, gambar dimuat). Akibatnya pengguna melihat bagian yang SALAH dulu, lalu
 * gulir terdorong ke tempat lain.
 *
 * Di sini: posisi + tinggi dokumen disimpan saat meninggalkan "/", dan saat kembali lewat riwayat tampilan
 * ditutup (kelas `home-restoring`) sampai tinggi dokumen mencapai tinggi yang tersimpan (atau stabil),
 * baru gulir dipulihkan dan tampilan dibuka.
 */
const KEY = "lakuna:home-scroll";
const MAX_MS = 2600;
const STABLE_MS = 700;

type Saved = { y: number; h: number };

function read(): Saved | null {
	try {
		const raw = sessionStorage.getItem(KEY);
		if (!raw) return null;
		const s = JSON.parse(raw) as Saved;
		return Number.isFinite(s.y) && Number.isFinite(s.h) ? s : null;
	} catch {
		return null;
	}
}

function jump(y: number) {
	const l = getLenis();
	if (l) l.scrollTo(y, { immediate: true, force: true });
	else window.scrollTo(0, y);
}

export function installHomeScrollRestore() {
	// `document` hanya ada di peramban; fungsi ini juga dipanggil saat render di server.
	const root = () => document.documentElement;

	beforeNavigate(({ from, to, type }) => {
		if (from?.url.pathname === "/") {
			try {
				sessionStorage.setItem(
					KEY,
					JSON.stringify({ y: Math.round(window.scrollY), h: document.documentElement.scrollHeight }),
				);
			} catch {
				/* penyimpanan penuh / diblokir — abaikan */
			}
		}
		// Kembali ke landing lewat riwayat: tutup tampilan SEKARANG supaya posisi sementara tak terlihat.
		if (type === "popstate" && to?.url.pathname === "/" && read()) root().classList.add("home-restoring");
	});

	afterNavigate(({ to, type }) => {
		if (type !== "popstate" || to?.url.pathname !== "/") {
			root().classList.remove("home-restoring");
			return;
		}
		const saved = read();
		if (!saved) {
			root().classList.remove("home-restoring");
			return;
		}
		root().classList.add("home-restoring");
		const start = performance.now();
		let lastH = -1;
		let stableSince = start;
		const tick = () => {
			const now = performance.now();
			const h = document.documentElement.scrollHeight;
			if (h !== lastH) {
				lastH = h;
				stableSince = now;
			}
			const heightReady = h >= saved.h - 4;
			const stable = now - stableSince >= STABLE_MS;
			if (heightReady || stable || now - start >= MAX_MS) {
				jump(saved.y);
				// Setelah gulir dipasang, beri satu-dua frame untuk menetap lalu buka tampilan.
				requestAnimationFrame(() =>
					requestAnimationFrame(() => {
						jump(saved.y);
						root().classList.remove("home-restoring");
					}),
				);
				return;
			}
			window.setTimeout(tick, 60);
		};
		window.setTimeout(tick, 0);
	});
}
