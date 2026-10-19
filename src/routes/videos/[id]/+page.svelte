<script lang="ts">
	import { page } from "$app/state";
	import VideoDetail from "$lib/components/VideoDetail.svelte";
	import AssetHead from "$lib/components/AssetHead.svelte";
	import type { PageProps } from "./$types";

	let { data }: PageProps = $props();
	const id = $derived(page.params.id ?? "");
</script>

<AssetHead {data} kind="video" />

<VideoDetail videoId={id} />
