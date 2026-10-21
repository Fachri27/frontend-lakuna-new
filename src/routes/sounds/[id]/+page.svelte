<script lang="ts">
	import { page } from "$app/state";
	import SoundDetail from "$lib/components/SoundDetail.svelte";
	import AssetHead from "$lib/components/AssetHead.svelte";
	import type { PageProps } from "./$types";

	let { data }: PageProps = $props();
	const id = $derived(page.params.id ?? "");
</script>

<AssetHead {data} kind="sound" />

{#key id}
	<SoundDetail soundId={id} />
{/key}
