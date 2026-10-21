import type { RequestHandler } from "./$types";
import { assetImagePath, assetPath, kindOfType, siteOrigin } from "$lib/seo";
import { loadCatalog, loadCategories, loadEcoDestinations, redirectToCleanPath } from "$lib/server/seoData";

/**
 * sitemap.xml dinamis: halaman publik + kategori + SEMUA foto/video yang tampil (dengan gambar pratinjaunya untuk
 * Google Images). Dulu hanya 15 halaman statis dengan lastmod = "sekarang" di tiap permintaan (sinyal palsu yang
 * membuat Google mengabaikan lastmod) dan domain lakuna.id yang belum aktif.
 *
 * Di-cache CDN 1 jam. changefreq/priority sengaja tak dipakai (diabaikan Google); lastmod hanya bila nyata.
 */

/** Halaman publik yang layak diindeks (transaksional/akun/noindex tidak dimasukkan). */
const STATIC_PATHS = [
	"/",
	"/photos",
	"/videos",
	"/sounds",
	"/archives",
	"/ecotourism",
	"/pricing",
	"/license",
	"/contributor",
	"/about",
	"/faq",
	"/help",
	"/customer-service",
	"/reviews",
	"/rubrik",
	"/terms",
	"/privacy",
	"/cookies",
];

const xmlEscape = (s: string) =>
	s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

function urlEntry(loc: string, lastmod?: string, image?: string): string {
	const valid = lastmod && !Number.isNaN(Date.parse(lastmod)) ? new Date(lastmod).toISOString() : null;
	return (
		`  <url>\n    <loc>${xmlEscape(loc)}</loc>\n` +
		(valid ? `    <lastmod>${valid}</lastmod>\n` : "") +
		(image ? `    <image:image><image:loc>${xmlEscape(image)}</image:loc></image:image>\n` : "") +
		`  </url>`
	);
}

export const GET: RequestHandler = async ({ url, fetch }) => {
	const clean = redirectToCleanPath(url);
	if (clean) return clean;
	const origin = siteOrigin(url);
	const [assets, cats, ecos] = await Promise.all([loadCatalog(fetch), loadCategories(fetch), loadEcoDestinations(fetch)]);

	const entries = [
		...STATIC_PATHS.map((p) => urlEntry(`${origin}${p}`)),
		...cats.map((c) => urlEntry(`${origin}/categories/${encodeURIComponent(c.name)}`, c.updatedAt)),
		...ecos.map((d) => urlEntry(`${origin}/ecotourism/${d.slug}`, d.updatedAt, d.cover ? `${origin}${assetImagePath(d.cover.id)}` : undefined)),
		...assets.map((a) =>
			urlEntry(`${origin}${assetPath({ id: a.id, kind: kindOfType(a.type) })}`, a.updatedAt, `${origin}${assetImagePath(a.id)}`)
		),
	];

	const xml =
		`<?xml version="1.0" encoding="UTF-8"?>\n` +
		`<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n` +
		entries.join("\n") +
		`\n</urlset>\n`;

	return new Response(xml, {
		headers: {
			"Content-Type": "application/xml; charset=utf-8",
			// API sedang tak terjangkau (hanya halaman statis) → cache singkat supaya cepat pulih.
			"Cache-Control": assets.length
				? "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400"
				: "public, max-age=0, s-maxage=300",
		},
	});
};
