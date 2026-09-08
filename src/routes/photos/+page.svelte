<script lang="ts">
	import { page } from "$app/state";
	import PhotosPage from "$lib/components/PhotosPage.svelte";
</script>

<svelte:head>
	<title>Galeri Foto</title>
	<meta
		name="description"
		content="Telusuri koleksi foto Nusantara — Alam, Kota, Orang, Travel, Bisnis, dan Sinema. Ribuan bingkai berkualitas sinema dari para perajangga Indonesia."
	/>
	<meta property="og:title" content="Galeri Foto | Lakuna" />
	<meta
		property="og:description"
		content="Telusuri koleksi foto Nusantara — Alam, Kota, Orang, Travel, Bisnis, dan Sinema."
	/>
</svelte:head>

<PhotosPage
	initialCat={page.url.searchParams.get("cat") ?? undefined}
	initialQ={page.url.searchParams.get("q") ?? undefined}
/>
