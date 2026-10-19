<script lang="ts">
	import { page } from "$app/state";
	import Seo from "$lib/components/Seo.svelte";
	import PhotosPage from "$lib/components/PhotosPage.svelte";
	import { breadcrumbLd, collectionLd, siteOrigin } from "$lib/seo";

	const origin = $derived(siteOrigin(page.url));
	const title = "Foto Stok Indonesia — Galeri Foto Nusantara";
	const description =
		"Telusuri foto stok Indonesia yang dikurasi: alam, kota, orang, travel, bisnis, dan sinema Nusantara dari fotografer lokal. Lisensi komersial — beli satuan atau berlangganan.";
</script>

<Seo
	{title}
	{description}
	keywords={["foto stok indonesia", "stock photo indonesia", "foto nusantara", "jual foto", "foto berlisensi"]}
	jsonld={[collectionLd(origin, "/photos", title, description), breadcrumbLd(origin, [{ name: "Foto", path: "/photos" }])]}
/>

<PhotosPage
	initialCat={page.url.searchParams.get("cat") ?? undefined}
	initialQ={page.url.searchParams.get("q") ?? undefined}
	initialBy={page.url.searchParams.get("by") ?? undefined}
/>
