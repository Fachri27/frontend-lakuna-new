<script lang="ts">
	import { page } from "$app/state";
	import PhotosPage from "$lib/components/PhotosPage.svelte";

	// Arsip satu fotografer — halaman sendiri, bukan query.
	const name = $derived(decodeURIComponent(page.params.name ?? ""));
</script>

<svelte:head>
	<title>{name} | Lakuna</title>
	<meta name="description" content={`Karya ${name} dari arsip Nusantara — foto dan video.`} />
	<meta property="og:title" content={`${name} | Lakuna`} />
	<meta
		property="og:description"
		content={`Karya ${name} dari arsip Nusantara — foto dan video.`}
	/>
</svelte:head>

<PhotosPage initialBy={name || undefined} />
