<script lang="ts">
	import { page } from "$app/state";
	import Seo from "$lib/components/Seo.svelte";
	import Home from "$lib/components/Home.svelte";
	import { DEFAULT_DESCRIPTION, SITE_NAME, SITE_TAGLINE, organizationLd, siteOrigin, websiteLd } from "$lib/seo";

	const origin = $derived(siteOrigin(page.url));
</script>

<Seo
	rawTitle
	title={`${SITE_NAME} — ${SITE_TAGLINE} | Arsip Visual Nusantara`}
	description={DEFAULT_DESCRIPTION}
	path="/"
	keywords={["foto stok indonesia", "video stok indonesia", "stock photo indonesia", "stock footage indonesia", "foto nusantara", "jual foto", "lisensi foto"]}
	jsonld={[organizationLd(origin), websiteLd(origin)]}
/>

<Home />
