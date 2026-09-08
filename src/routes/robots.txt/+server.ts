// Port dari app/robots.ts (Next MetadataRoute.Robots) → SvelteKit endpoint.
export function GET(): Response {
	const body =
		"User-agent: *\n" +
		"Allow: /\n" +
		"Disallow: /checkout\n" +
		"Disallow: /payment\n" +
		"Disallow: /profile\n" +
		"Disallow: /login\n" +
		"\n" +
		"Sitemap: https://lakuna.id/sitemap.xml\n";

	return new Response(body, {
		headers: {
			"Content-Type": "text/plain",
			"Cache-Control": "max-age=3600"
		}
	});
}
