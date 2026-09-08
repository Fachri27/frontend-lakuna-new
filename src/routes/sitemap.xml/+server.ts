// Port dari app/sitemap.ts (Next MetadataRoute.Sitemap) → SvelteKit endpoint.
const BASE = "https://lakuna.id";

type SitemapEntry = {
	url: string;
	lastModified: string;
	changeFrequency: "weekly" | "monthly";
	priority: number;
};

export function GET(): Response {
	const now = new Date().toISOString();

	const entries: SitemapEntry[] = [
		{ url: BASE, lastModified: now, changeFrequency: "weekly", priority: 1 },
		{ url: `${BASE}/photos`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
		{ url: `${BASE}/videos`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
		{ url: `${BASE}/pricing`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
		{ url: `${BASE}/rubrik`, lastModified: now, changeFrequency: "weekly", priority: 0.8 }
	];

	const xml =
		`<?xml version="1.0" encoding="UTF-8"?>\n` +
		`<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
		entries
			.map(
				(e) =>
					`  <url>\n    <loc>${e.url}</loc>\n    <lastmod>${e.lastModified}</lastmod>\n    <changefreq>${e.changeFrequency}</changefreq>\n    <priority>${e.priority}</priority>\n  </url>`
			)
			.join("\n") +
		`\n</urlset>\n`;

	return new Response(xml, {
		headers: {
			"Content-Type": "application/xml",
			"Cache-Control": "max-age=3600"
		}
	});
}
