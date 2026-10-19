import { redirect } from "@sveltejs/kit";
import { apiBase, isAssetId, isClientNavigation } from "$lib/seo";
import type { PageLoad } from "./$types";

/**
 * Tautan pendek sertifikat lisensi dibuka langsung (SSR) → 301 ke halaman karyanya di server, supaya crawler &
 * pratinjau tautan (WhatsApp, X) ikut sampai ke halaman foto/video. Gagal / navigasi klien → halaman ini
 * meneruskan sendiri seperti biasa.
 */
export const load: PageLoad = async ({ params, fetch }) => {
	const code = (params.code ?? "").toLowerCase();
	if (isClientNavigation() || !/^[0-9a-f]{8}$/.test(code)) return {};
	let target: string | null = null;
	try {
		const r = await fetch(`${apiBase()}/api/photos/short/${code}`, { signal: AbortSignal.timeout(4000) });
		const d = r.ok ? ((await r.json()) as { data?: { id?: string; type?: string } }).data : null;
		if (d?.id && isAssetId(d.id)) target = `/${d.type === "VIDEO" ? "videos" : "photos"}/${d.id}`;
	} catch {
		/* API tak terjangkau → diteruskan di klien */
	}
	if (target) redirect(301, target);
	return {};
};
