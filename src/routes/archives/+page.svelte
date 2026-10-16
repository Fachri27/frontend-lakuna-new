<script lang="ts">
	import { page } from "$app/state";
	import PhotosPage from "$lib/components/PhotosPage.svelte";
</script>

<svelte:head>
	<title>Archives | Lakuna</title>
	<meta
		name="description"
		content="Hasil pencarian arsip Nusantara — foto dan video."
	/>
	<meta property="og:title" content="Archives | Lakuna" />
	<meta
		property="og:description"
		content="Hasil pencarian arsip Nusantara — foto dan video."
	/>
</svelte:head>

<PhotosPage
	archive
	initialCat={page.url.searchParams.get("cat") ?? undefined}
	initialQ={page.url.searchParams.get("q") ?? undefined}
	initialBy={page.url.searchParams.get("by") ?? undefined}
/>
