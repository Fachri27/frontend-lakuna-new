import { error } from "@sveltejs/kit";
import { apiBase } from "$lib/seo";
import type { ApiEcoDestination } from "$lib/data";
import type { PageLoad } from "./$types";

/** Destinasi ekowisata (dikelola CMS). Dimuat di server juga, supaya judul, deskripsi, dan JSON-LD ikut ter-render. */
export const load: PageLoad = async ({ params, fetch }) => {
	const slug = params.slug ?? "";
	if (!/^[a-z0-9-]{1,80}$/.test(slug)) error(404, "Destinasi tidak ditemukan");
	let res: Response;
	try {
		res = await fetch(`${apiBase()}/api/ecotourism/${slug}`, { signal: AbortSignal.timeout(6000) });
	} catch {
		error(503, "Destinasi belum bisa dimuat. Coba lagi sebentar lagi.");
	}
	if (res.status === 404 || res.status === 400) error(404, "Destinasi tidak ditemukan");
	if (!res.ok) error(503, "Destinasi belum bisa dimuat. Coba lagi sebentar lagi.");
	const json = (await res.json()) as { data?: ApiEcoDestination };
	if (!json?.data?.slug) error(404, "Destinasi tidak ditemukan");
	return { raw: json.data };
};
