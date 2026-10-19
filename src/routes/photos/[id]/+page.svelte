<script lang="ts">
	import { page } from "$app/state";
	import PhotoDetail from "$lib/components/PhotoDetail.svelte";
	import AssetHead from "$lib/components/AssetHead.svelte";
	import type { PageProps } from "./$types";

	let { data }: PageProps = $props();
	const id = $derived(page.params.id ?? "");
</script>

<AssetHead {data} kind="photo" />

<PhotoDetail photoId={id} />
