/**
 * Ulasan yang dipublikasikan. Hanya isi dengan ulasan ASLI dari pelanggan atau
 * perajangga (dengan izin mereka) — halaman /reviews menampilkan keadaan
 * kosong yang jujur selama daftar ini kosong. Belum ada sistem ulasan di API.
 */
export type Review = {
	/** Kutipan, apa adanya. */
	quote: { id: string; en: string };
	name: string;
	/** Peran/organisasi, mis. "Art director, studio X" atau "Fotografer". */
	role: { id: string; en: string };
	/** ISO, mis. "2026-10-02". */
	date?: string;
};

export const REVIEWS: Review[] = [];
