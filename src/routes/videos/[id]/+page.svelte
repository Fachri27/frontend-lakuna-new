<script lang="ts">
	import { page } from "$app/state";
	import VideoDetail from "$lib/components/VideoDetail.svelte";

	// Legacy: generateMetadata → `${decodeURIComponent(id)} — Video`.
	const id = $derived(page.params.id ?? "");
	const decodedId = $derived(decodeURIComponent(id));
</script>

<svelte:head>
	<title>{decodedId} — Video</title>
	<meta name="description" content="Detail video {decodedId} — Lakuna Nusantara." />
</svelte:head>

<VideoDetail videoId={id} />
