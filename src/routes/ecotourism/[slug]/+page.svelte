<script lang="ts">
	import { page } from "$app/state";
	import Seo from "$lib/components/Seo.svelte";
	import EcoDestinationPage from "$lib/components/EcoDestinationPage.svelte";
	import { adaptEcoDestinationFull } from "$lib/data";
	import { ECO_ZONE } from "$lib/ecoBands";
	import { absUrl, assetImagePath, breadcrumbLd, siteOrigin } from "$lib/seo";
	import type { PageData } from "./$types";

	let { data }: { data: PageData } = $props();

	const d = $derived(adaptEcoDestinationFull(data.raw));
	const origin = $derived(siteOrigin(page.url));
	const path = $derived(`/ecotourism/${d.slug}`);
	const zoneName = $derived(ECO_ZONE[d.zone].name.id);
	const title = $derived(`${d.name.id} — Ekowisata ${d.region}`);
	const image = $derived(d.cover ? assetImagePath(d.cover.id) : undefined);
	const jsonld = $derived([
		{
			"@type": "TouristAttraction",
			"@id": `${absUrl(origin, path)}#place`,
			name: d.name.id,
			...(d.name.en !== d.name.id ? { alternateName: d.name.en } : {}),
			description: d.summary.id,
			url: absUrl(origin, path),
			touristType: "Ekowisata",
			isAccessibleForFree: false,
			address: { "@type": "PostalAddress", addressRegion: d.region, addressCountry: "ID" },
			...(d.latitude !== null && d.longitude !== null
				? {
						geo: {
							"@type": "GeoCoordinates",
							latitude: d.latitude,
							longitude: d.longitude,
							...(d.elevation !== null ? { elevation: d.elevation } : {}),
						},
					}
				: {}),
			...(image ? { image: absUrl(origin, image) } : {}),
			...(d.website ? { sameAs: [d.website] } : {}),
		},
		breadcrumbLd(origin, [
			{ name: "Ekowisata", path: "/ecotourism" },
			{ name: d.name.id, path },
		]),
	]);
</script>

<Seo
	{title}
	description={d.summary.id}
	{path}
	{image}
	imageAlt={d.cover ? d.cover.title.id : undefined}
	type="article"
	keywords={[d.name.id, `ekowisata ${d.region.toLowerCase()}`, `wisata alam ${d.region.toLowerCase()}`, zoneName.toLowerCase(), "foto alam indonesia"]}
	geo={{ placename: d.area ?? d.name.id, region: d.region }}
	{jsonld}
/>

{#key d.id}
	<EcoDestinationPage dest={d} />
{/key}
