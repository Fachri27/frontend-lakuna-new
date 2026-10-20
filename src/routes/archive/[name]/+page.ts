import { error } from "@sveltejs/kit";
import type { PageLoad } from "./$types";

/**
 * Nama di URL tampil di <title>, deskripsi, & JSON-LD halaman yang terindeks — teks bebas sepanjang apa pun bisa
 * dipakai untuk spam/penipuan berkedok halaman Lakuna ("… hubungi WA … untuk refund"). Nama asli tak sepanjang itu.
 */
export const load: PageLoad = ({ params }) => {
	const name = params.name ?? "";
	if (!name.trim() || name.length > 80 || /https?:|www\.|\d{7,}/i.test(name)) error(404, "Halaman tidak ditemukan");
};
