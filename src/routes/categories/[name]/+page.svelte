<script lang="ts">
	import { page } from "$app/state";
	import PhotosPage from "$lib/components/PhotosPage.svelte";

	// Halaman kategori khusus — terpisah dari /photos dan /videos.
	// Dibuka dari menu Categories di navbar; judul mengikuti nama kategori.
	const name = $derived(decodeURIComponent(page.params.name ?? ""));
</script>

<svelte:head>
	<title>{name} | Lakuna</title>
	<meta name="description" content={`Koleksi ${name} dari arsip Nusantara — foto dan video`} />
	<meta property="og:title" content={`${name} | Lakuna`} />
	<meta
		property="og:description"
		content={`Koleksi ${name} dari arsip Nusantara — foto dan video`}
	/>
</svelte:head>

<PhotosPage initialCat={name || undefined} chipTitle />
