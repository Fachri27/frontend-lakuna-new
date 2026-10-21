import { apiBase } from "$lib/seo";

/** Data katalog untuk sitemap.xml & llms.txt (hanya server). Semua gagal-aman: API mati → daftar kosong. */

export type CatalogRow = {
	id: string;
	type: string;
	title?: string;
	titleEn?: string | null;
	location?: string | null;
	updatedAt?: string;
};
export type CategoryRow = { name: string; nameEn?: string | null; description?: string | null; descriptionEn?: string | null; updatedAt?: string };
export type PlanRow = { name: string; quota: number; priceMonthly: number; priceAnnual: number; description?: string | null; isActive?: boolean };

/**
 * Endpoint yang di-cache CDN (sitemap, llms, /og) tak membaca query string — tapi CDN menjadikannya bagian kunci
 * cache, jadi `?n=1..N` selalu sampai ke fungsi dan ke API (kuota rate-limit API per IP dibagi semua pengunjung
 * karena semua datang dari IP Vercel). Arahkan ke alamat bersih yang sudah ter-cache.
 */
export function redirectToCleanPath(url: URL): Response | null {
	if (!url.search) return null;
	return new Response(null, { status: 301, headers: { Location: url.pathname, "Cache-Control": "public, max-age=86400" } });
}

export async function getJson<T>(fetchFn: typeof fetch, path: string, ms: number): Promise<T | null> {
	try {
		const r = await fetchFn(`${apiBase()}${path}`, { signal: AbortSignal.timeout(ms) });
		return r.ok ? ((await r.json()) as T) : null;
	} catch {
		return null;
	}
}

/** Semua foto/video publik: endpoint ringkas API baru; API lama → telusuri daftar biasa (maks 5.000). */
export async function loadCatalog(fetchFn: typeof fetch): Promise<CatalogRow[]> {
	const lite = await getJson<{ data?: CatalogRow[] }>(fetchFn, "/api/photos/sitemap", 10_000);
	if (Array.isArray(lite?.data)) return lite.data.filter((r) => r?.id);
	const out: CatalogRow[] = [];
	for (let page = 1; page <= 50; page++) {
		const res = await getJson<{ data?: CatalogRow[]; meta?: { totalPages?: number } }>(fetchFn, `/api/photos?limit=100&page=${page}`, 10_000);
		if (!res?.data?.length) break;
		out.push(...res.data.filter((r) => r?.id));
		if (page >= (res.meta?.totalPages ?? 1)) break;
	}
	return out;
}

export async function loadCategories(fetchFn: typeof fetch): Promise<CategoryRow[]> {
	const res = await getJson<{ data?: CategoryRow[] }>(fetchFn, "/api/categories?limit=100", 6_000);
	return (res?.data ?? []).filter((c) => c?.name);
}

export async function loadPlans(fetchFn: typeof fetch): Promise<PlanRow[]> {
	const res = await getJson<{ data?: PlanRow[] }>(fetchFn, "/api/plans", 6_000);
	return (res?.data ?? []).filter((p) => p?.name && p.isActive !== false);
}

export type EcoRow = { slug: string; name: string; nameEn?: string | null; region: string; summary: string; updatedAt?: string; cover?: { id: string } | null };

/** Destinasi ekowisata yang terbit (sitemap, llms.txt). */
export async function loadEcoDestinations(fetchFn: typeof fetch): Promise<EcoRow[]> {
	const res = await getJson<{ data?: EcoRow[] }>(fetchFn, "/api/ecotourism", 6_000);
	return (res?.data ?? []).filter((d) => d?.slug && d.name);
}

export const idr = (n: number) =>
	new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
