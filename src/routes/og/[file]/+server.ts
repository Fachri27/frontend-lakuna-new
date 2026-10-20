import type { RequestHandler } from "./$types";
import { DEFAULT_OG_IMAGE, apiBase, isAssetId } from "$lib/seo";
import { redirectToCleanPath } from "$lib/server/seoData";

/**
 * /og/<id>.jpg — gambar pratinjau tautan (og:image, Twitter Card, Google Images, sitemap) satu foto/video.
 *
 * URL-nya stabil & di domain situs: crawler menyimpan URL gambar berhari-hari, sedangkan URL storage presigned
 * kedaluwarsa dalam hitungan jam — dan gambar tampilan situs berupa mozaik teracak yang tak bisa dibaca crawler.
 * Isinya SELALU pratinjau ber-watermark; tak pernah berkas bersih. Di-cache CDN Vercel sehari.
 */

const CACHE = "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800";
const IMAGE_PATH = /\.(jpe?g|png|webp)$/i;

/** Hanya gambar raster: image/svg+xml dari upstream bisa membawa skrip yang berjalan di domain situs (token login). */
const RASTER = /^image\/(jpeg|png|webp)$/;

function send(upstream: Response): Response {
	const type = (upstream.headers.get("content-type") ?? "").split(";")[0]!.trim().toLowerCase();
	const headers = new Headers({
		"Content-Type": RASTER.test(type) ? type : "image/jpeg",
		"Cache-Control": CACHE,
		// Endpoint (+server.ts) tak mendapat CSP ber-nonce halaman: bila dibuka langsung, tetap tak bisa menjalankan apa pun.
		"Content-Security-Policy": "default-src 'none'; sandbox",
		"X-Content-Type-Options": "nosniff",
	});
	const len = upstream.headers.get("content-length");
	if (len) headers.set("Content-Length", len);
	return new Response(upstream.body, { headers });
}

const isImage = (r: Response) => r.ok && RASTER.test((r.headers.get("content-type") ?? "").split(";")[0]!.trim().toLowerCase());

/** Jalur cadangan hanya mengambil dari storage media situs — bukan URL sembarang dari respons (SSRF). */
function allowedMedia(u: URL): boolean {
	const minio = (import.meta.env.VITE_MINIO_PUBLIC_URL ?? "").trim();
	try {
		if (minio && new URL(minio).origin === u.origin) return true;
	} catch {
		/* env tak valid → hanya pola Railway */
	}
	return u.protocol === "https:" && u.hostname.endsWith(".up.railway.app");
}

const notFound = () => new Response("Not found", { status: 404, headers: { "Cache-Control": "public, max-age=300" } });

export const GET: RequestHandler = async ({ params, fetch, url }) => {
	const clean = redirectToCleanPath(url);
	if (clean) return clean;
	const file = params.file ?? "";
	const id = file.replace(/\.jpg$/i, "");
	if (id === file || !isAssetId(id)) return notFound();
	const base = apiBase();

	// 1) API baru: byte pratinjau ber-watermark (GET /api/photos/:id/og).
	try {
		const r = await fetch(`${base}/api/photos/${id}/og`, { signal: AbortSignal.timeout(15_000) });
		if (isImage(r)) return send(r);
	} catch {
		/* API tak terjangkau / lambat → cadangan */
	}

	// 2) API lama (belum punya /og, gambar belum teracak): pratinjau ber-watermark FOTO dari detailnya.
	try {
		const r = await fetch(`${base}/api/photos/${id}`, { signal: AbortSignal.timeout(6_000) });
		if (r.status === 404 || r.status === 400) return notFound();
		if (r.ok) {
			const d = ((await r.json()) as { data?: { type?: string; watermarkUrl?: string | null } }).data;
			const raw = d?.type === "FOTO" ? d.watermarkUrl : null;
			// Berkas teracak (#lk=) tak berguna untuk crawler; video: pratinjaunya MP4 → gambar bawaan.
			if (raw && !raw.includes("#lk=")) {
				const u = new URL(raw);
				if (allowedMedia(u) && IMAGE_PATH.test(u.pathname)) {
					const img = await fetch(u, { signal: AbortSignal.timeout(10_000) });
					if (isImage(img)) return send(img);
				}
			}
		}
	} catch {
		/* jatuh ke gambar bawaan */
	}

	// 3) Gambar bawaan situs (cache singkat: begitu API pulih, gambar aslinya dipakai).
	return new Response(null, { status: 302, headers: { Location: DEFAULT_OG_IMAGE.path, "Cache-Control": "public, max-age=300" } });
};
