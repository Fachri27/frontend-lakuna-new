<script lang="ts">
	import type { Snippet } from "svelte";
	import SoundPlayerBar from "$lib/components/SoundPlayerBar.svelte";
	import { player } from "$lib/soundPlayer.svelte";

	/** Pemutar bersama /sounds & /sounds/<id>: lagu tetap berjalan saat pindah antara daftar dan detail. */
	let { children }: { children: Snippet } = $props();

	// Keluar dari halaman Sounds → pemutar dihentikan (bilahnya hanya ada di sini).
	$effect(() => () => player.close());
</script>

{@render children()}

<!-- Ruang di bawah konten supaya baris terakhir tak tertutup bilah pemutar. -->
{#if player.track}<div class="h-20" aria-hidden="true"></div>{/if}

<SoundPlayerBar />
