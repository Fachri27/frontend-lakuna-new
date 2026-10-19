<script lang="ts">
	import { page } from "$app/state";
	import Seo from "$lib/components/Seo.svelte";
	import EcotourismPage from "$lib/components/EcotourismPage.svelte";
	import { breadcrumbLd, collectionLd, siteOrigin } from "$lib/seo";

	const origin = $derived(siteOrigin(page.url));
	const title = "Ekowisata Nusantara — Foto & Video Alam Indonesia";
	const description =
		"Ekowisata Indonesia dalam gambar: lima ekosistem dari puncak gunung, hutan hujan, danau, pantai, sampai terumbu karang — dari arsip foto dan video Lakuna Stock.";
</script>

<Seo
	{title}
	{description}
	keywords={["ekowisata indonesia", "foto alam indonesia", "wisata alam nusantara", "terumbu karang indonesia"]}
	jsonld={[collectionLd(origin, "/ecotourism", title, description), breadcrumbLd(origin, [{ name: "Ekowisata", path: "/ecotourism" }])]}
/>

<EcotourismPage />
