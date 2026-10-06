import type { Photo } from "./data";

/** Zona halaman Ekowisata, urut dari puncak ke karang. */
export type EcoBandId = "mountain" | "forest" | "water" | "coast" | "reef";

/**
 * Kata kunci pencarian arsip per zona (id + en). Dipakai halaman Ekowisata untuk MENGISI zona dan
 * kartu etalase di beranda untuk menebak zona sebuah foto — satu sumber supaya tak berbeda.
 */
export const ECO_BAND_TERMS: Record<EcoBandId, string[]> = {
	mountain: ["gunung", "mountain"],
	forest: ["hutan", "forest"],
	water: ["danau", "lake", "sungai", "river"],
	coast: ["pantai", "beach", "mangrove"],
	reef: ["karang", "reef", "laut"],
};

const ORDER: EcoBandId[] = ["mountain", "forest", "water", "coast", "reef"];

function hit(hay: string): EcoBandId | null {
	for (const id of ORDER) if (ECO_BAND_TERMS[id].some((t) => hay.includes(t))) return id;
	return null;
}

/**
 * Zona Ekowisata tempat sebuah foto tampil. JUDUL didahulukan (lalu kata kunci): kata kunci umum seperti
 * "forest" menempel di banyak foto, sehingga pantai/danau akan salah masuk hutan bila kata kunci
 * diperiksa lebih dulu. null = tak cocok zona mana pun.
 */
export function ecoBandOf(p: Pick<Photo, "title" | "keywords" | "keywordsEn">): EcoBandId | null {
	const title = `${p.title.id} ${p.title.en}`.toLowerCase();
	return hit(title) ?? hit([...(p.keywords ?? []), ...(p.keywordsEn ?? [])].join(" ").toLowerCase());
}

/** Tautan ke halaman Ekowisata, langsung ke zona foto itu bila diketahui. */
export function ecoHrefFor(p: Pick<Photo, "title" | "keywords" | "keywordsEn">): string {
	const b = ecoBandOf(p);
	return b ? `/ecotourism#eco-${b}` : "/ecotourism";
}
