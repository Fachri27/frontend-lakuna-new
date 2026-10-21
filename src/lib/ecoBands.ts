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

/**
 * Nama, warna latar, dan rentang ketinggian tiap zona — dipakai halaman Ekowisata (pita zona) dan halaman
 * destinasi (/ecotourism/<slug>) supaya keduanya satu bahasa visual.
 */
export const ECO_ZONE: Record<EcoBandId, { name: { id: string; en: string }; tone: [number, number, number]; from: number; to: number }> = {
	mountain: { name: { id: "Pegunungan", en: "Mountains" }, tone: [20, 27, 40], from: 3200, to: 1500 },
	forest: { name: { id: "Hutan hujan", en: "Rainforest" }, tone: [12, 28, 21], from: 1500, to: 200 },
	water: { name: { id: "Danau dan sungai", en: "Lakes and rivers" }, tone: [10, 30, 36], from: 200, to: 0 },
	coast: { name: { id: "Pantai dan mangrove", en: "Beaches and mangroves" }, tone: [31, 26, 17], from: 0, to: -5 },
	reef: { name: { id: "Terumbu karang", en: "Coral reefs" }, tone: [5, 22, 40], from: -5, to: -30 },
};

export const ECO_ORDER: EcoBandId[] = ORDER;

/** Zona dari API ("MOUNTAIN") → id pita ("mountain"). */
export function zoneOf(api: string | null | undefined): EcoBandId {
	const z = (api ?? "").toLowerCase() as EcoBandId;
	return (ORDER as string[]).includes(z) ? z : "mountain";
}
