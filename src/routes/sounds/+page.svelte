<script lang="ts">
	import { page } from "$app/state";
	import Seo from "$lib/components/Seo.svelte";
	import SoundsPage from "$lib/components/SoundsPage.svelte";
	import { breadcrumbLd, collectionLd, siteOrigin } from "$lib/seo";

	const origin = $derived(siteOrigin(page.url));
	const title = "Musik & Efek Suara Indonesia — Audio Bebas Royalti";
	const description =
		"Musik dan efek suara bebas royalti dari Nusantara: suasana hutan, laut, kota, dan budaya Indonesia. Dengarkan pratinjau, lalu lisensikan berkas WAV/MP3 aslinya.";
</script>

<Seo
	{title}
	{description}
	keywords={["musik bebas royalti", "efek suara indonesia", "sound effect indonesia", "audio stok", "musik latar"]}
	jsonld={[collectionLd(origin, "/sounds", title, description), breadcrumbLd(origin, [{ name: "Sounds", path: "/sounds" }])]}
/>

<SoundsPage
	initialQ={page.url.searchParams.get("q") ?? undefined}
	initialKind={page.url.searchParams.get("kind") ?? undefined}
	initialCat={page.url.searchParams.get("cat") ?? undefined}
/>
