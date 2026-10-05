<script lang="ts">
	import { page } from "$app/state";
	import VideosPage from "$lib/components/VideosPage.svelte";
</script>

<svelte:head>
	<title>Galeri Video</title>
	<meta
		name="description"
		content="Koleksi video sinema Nusantara — footage berkualitas tinggi dari alam, kota, dan kehidupan Indonesia"
	/>
	<meta property="og:title" content="Galeri Video | Lakuna" />
	<meta
		property="og:description"
		content="Koleksi video sinema Nusantara — footage berkualitas tinggi dari alam, kota, dan kehidupan Indonesia"
	/>
</svelte:head>

<VideosPage initialQ={page.url.searchParams.get("q") ?? undefined} />
