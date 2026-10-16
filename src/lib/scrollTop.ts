import { getLenis } from "$lib/lenis";

/**
 * Gulir halus ke puncak halaman — dipakai tombol "ke atas" dan logo navbar (saat sudah di beranda).
 *
 * Gulir ke atas melewati bagian globe: tanpa tanda `html[data-scrolling-top]`, logika globe menganggapnya
 * "naik dari peta", menahan gulir di awal globe, dan pengguna tak pernah sampai ke atas (lihat MapDescent
 * onUpdate). Tanda dicabut saat sampai di atas, atau setelah 6 dtk (jaga-jaga bila gulir dibatalkan pengguna).
 */
export function scrollToTop() {
	const root = document.documentElement;
	root.dataset.scrollingTop = "1";
	const done = () => {
		delete root.dataset.scrollingTop;
		window.removeEventListener("scroll", check);
		clearTimeout(timer);
	};
	const check = () => {
		if (window.scrollY <= 1) done();
	};
	const timer = setTimeout(done, 6000);
	window.addEventListener("scroll", check, { passive: true });
	// Lenis memegang gulir di landing (inersia roda masih berjalan tepat setelah menggulir dan akan
	// menimpa scrollTo bawaan); gunakan Lenis bila ada, kalau tidak gulir bawaan.
	const lenis = getLenis();
	if (lenis) lenis.scrollTo(0, { duration: 1.4, force: true });
	else window.scrollTo({ top: 0, behavior: "smooth" });
}
