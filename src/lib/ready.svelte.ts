/**
 * Kunci kesiapan landing: preloader lensa baru membuka bila semua pemegang
 * melepas kuncinya (data beranda, media hero, ubin awal peta) — jadi tak ada
 * peta hitam atau hero kosong saat lensa membuka. Batas tunggu keras tetap
 * dipegang Preloader (MAX_WAIT_MS) supaya jaringan lambat tak menggantung.
 */
const locks = new Set<string>();

/** Daftarkan penahan; kembalikan pelepas (idempoten, aman di cleanup). */
export function holdReady(key: string): () => void {
	locks.add(key);
	let done = false;
	return () => {
		if (done) return;
		done = true;
		locks.delete(key);
	};
}

/** true bila tak ada penahan tersisa. */
export function allReady(): boolean {
	return locks.size === 0;
}
