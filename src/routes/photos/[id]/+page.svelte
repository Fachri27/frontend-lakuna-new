<script lang="ts">
	import { page } from "$app/state";
	import PhotoDetail from "$lib/components/PhotoDetail.svelte";

	// Legacy: generateMetadata → `${decodeURIComponent(id)} — Foto`.
	const id = $derived(page.params.id ?? "");
	const decodedId = $derived(decodeURIComponent(id));
</script>

<svelte:head>
	<title>{decodedId} — Foto</title>
	<meta name="description" content="Detail foto {decodedId} — Lakuna Nusantara." />
</svelte:head>

<PhotoDetail photoId={id} />
