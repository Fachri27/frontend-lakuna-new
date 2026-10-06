import { afterNavigate } from "$app/navigation";

/**
 * Tombol "Kembali" di halaman detail: bila pengguna datang dari halaman lain di situs ini
 * (landing, hasil pencarian, profil, dst.), kembali ke sana lewat riwayat peramban, sehingga posisi
 * gulir ikut pulih. Dibuka langsung (tautan, tab baru, segarkan) = tak ada asal di dalam situs,
 * jadi jatuh ke `fallback` (daftar foto/video). Panggil saat inisialisasi komponen.
 */
export function backNav(fallback: string) {
	let cameFromSite = false;
	afterNavigate(({ from }) => {
		cameFromSite = !!from;
	});
	return {
		href: fallback,
		onclick(e: MouseEvent) {
			if (!cameFromSite) return; // biarkan tautan biasa (ke `fallback`) bekerja
			// Klik tengah / dengan modifier = buka tab baru: jangan dibajak.
			if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
			e.preventDefault();
			history.back();
		},
	};
}
