/**
 * Jumlah bingkai per provinsi, dihitung dari data arsip. `location` memuat nama
 * provinsi (kadang kota, yang dilewati: lebih baik provinsi tak dihitung
 * daripada dihitung salah — lihat normalizeProvince).
 */
import { fetchPhotos, stripPicsumPhotos, type Photo } from "$lib/data";
import { normalizeProvince } from "$lib/provinces";

export function provinceOf(location?: string): string | null {
	if (!location) return null;
	for (const part of location.split(",")) {
		const p = normalizeProvince(part);
		if (p) return p;
	}
	return null;
}

/** Foto + video, hingga 10 halaman × 100. Gagal = objek kosong. */
export async function loadProvinceCounts(): Promise<Record<string, number>> {
	try {
		const first = await fetchPhotos({ limit: 100, page: 1 });
		let rows = first.photos;
		if (first.totalPages > 1) {
			const rest = await Promise.all(
				Array.from({ length: Math.min(first.totalPages, 10) - 1 }, (_, i) => fetchPhotos({ limit: 100, page: i + 2 })),
			);
			for (const r of rest) rows = rows.concat(r.photos);
		}
		const counts: Record<string, number> = {};
		for (const p of rows) {
			const prov = provinceOf(p.location);
			if (prov) counts[prov] = (counts[prov] ?? 0) + 1;
		}
		return counts;
	} catch {
		return {};
	}
}

export type ThinCategory = { name: string; n: number; photo: Photo | null };

/**
 * Jumlah bingkai per provinsi DAN per tema (kategori), dari satu kali muat.
 * Tema diurutkan dari yang paling sedikit bingkainya; `photo` = satu bingkai
 * nyata dari tema itu (tanpa picsum) untuk gambar kartu.
 */
export async function loadLacuna(): Promise<{ counts: Record<string, number>; categories: ThinCategory[] }> {
	try {
		const first = await fetchPhotos({ limit: 100, page: 1 });
		let rows = first.photos;
		if (first.totalPages > 1) {
			const rest = await Promise.all(
				Array.from({ length: Math.min(first.totalPages, 10) - 1 }, (_, i) => fetchPhotos({ limit: 100, page: i + 2 })),
			);
			for (const r of rest) rows = rows.concat(r.photos);
		}
		const counts: Record<string, number> = {};
		const cats = new Map<string, ThinCategory>();
		const real = new Set(stripPicsumPhotos(rows).map((p) => p.id));
		for (const p of rows) {
			const prov = provinceOf(p.location);
			if (prov) counts[prov] = (counts[prov] ?? 0) + 1;
			for (const name of new Set(p.categories ?? [])) {
				const c = cats.get(name) ?? { name, n: 0, photo: null };
				c.n += 1;
				if (!c.photo && p.thumbUrl && real.has(p.id)) c.photo = p;
				cats.set(name, c);
			}
		}
		return { counts, categories: [...cats.values()].sort((a, b) => a.n - b.n || a.name.localeCompare(b.name)) };
	} catch {
		return { counts: {}, categories: [] };
	}
}
