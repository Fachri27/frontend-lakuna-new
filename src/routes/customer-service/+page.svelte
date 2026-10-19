<script lang="ts">
	import { page } from "$app/state";
	import Seo from "$lib/components/Seo.svelte";
	import ServicePage from "$lib/components/ServicePage.svelte";
	import { orgId, siteOrigin } from "$lib/seo";

	const origin = $derived(siteOrigin(page.url));
</script>

<Seo
	title="Layanan Pelanggan"
	description="Hubungi layanan pelanggan Lakuna Stock untuk pesanan, unduhan, langganan, dan lisensi foto & video."
	jsonld={{ "@type": "ContactPage", url: `${origin}/customer-service`, name: "Layanan Pelanggan Lakuna Stock", about: { "@id": orgId(origin) }, inLanguage: "id-ID" }}
/>

<ServicePage />
