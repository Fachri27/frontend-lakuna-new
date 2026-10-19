<script lang="ts">
	import { page } from "$app/state";
	import Seo from "$lib/components/Seo.svelte";
	import VideosPage from "$lib/components/VideosPage.svelte";
	import { breadcrumbLd, collectionLd, siteOrigin } from "$lib/seo";

	const origin = $derived(siteOrigin(page.url));
	const title = "Video Stok Indonesia — Stock Footage Nusantara";
	const description =
		"Video stok dan stock footage Indonesia berkualitas tinggi: alam, kota, budaya, dan kehidupan Nusantara dari videografer lokal. Lisensi komersial yang jelas.";
</script>

<Seo
	{title}
	{description}
	keywords={["video stok indonesia", "stock footage indonesia", "video nusantara", "footage drone indonesia"]}
	jsonld={[collectionLd(origin, "/videos", title, description), breadcrumbLd(origin, [{ name: "Video", path: "/videos" }])]}
/>

<VideosPage initialQ={page.url.searchParams.get("q") ?? undefined} initialBy={page.url.searchParams.get("by") ?? undefined} />
