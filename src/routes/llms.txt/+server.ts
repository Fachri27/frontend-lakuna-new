import type { RequestHandler } from "./$types";
import { siteOrigin } from "$lib/seo";
import { buildLlms } from "$lib/server/llms";

/** /llms.txt — ringkasan situs untuk model bahasa (GEO). Lihat $lib/server/llms.ts. */
export const GET: RequestHandler = async ({ url, fetch }) =>
	new Response(await buildLlms(siteOrigin(url), fetch, false), {
		headers: {
			"Content-Type": "text/markdown; charset=utf-8",
			"Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
			"X-Robots-Tag": "noindex",
		},
	});
