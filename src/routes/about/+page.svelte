<script lang="ts">
	import { page } from "$app/state";
	import Seo from "$lib/components/Seo.svelte";
	import AboutPage from "$lib/components/AboutPage.svelte";
	import { orgId, organizationLd, siteOrigin } from "$lib/seo";

	const origin = $derived(siteOrigin(page.url));
</script>

<Seo
	title="Tentang Kami"
	description="Lakuna Stock — arsip foto dan video Nusantara yang dikurasi, dengan lisensi yang jelas dan karya yang dibuat bersama para perajangga dari Sabang sampai Merauke."
	jsonld={[
		{ "@type": "AboutPage", url: `${origin}/about`, name: "Tentang Lakuna Stock", mainEntity: { "@id": orgId(origin) }, inLanguage: "id-ID" },
		organizationLd(origin),
	]}
/>

<AboutPage />
