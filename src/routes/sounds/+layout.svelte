<script lang="ts">
	import type { Snippet } from "svelte";
	import SoundPlayerBar from "$lib/components/SoundPlayerBar.svelte";
	import { player } from "$lib/soundPlayer.svelte";

	/**
	 * Halaman Sounds memakai bahasa visual coveomusic.com (keputusan pemilik: "semua, buat semirip mungkin"):
	 * latar krem #eee, tinta #1d1812, Inter + serif miring + tulisan tangan. Situs Lakuna lainnya gelap, jadi
	 * palet terang hanya dipasang selama berada di /sounds — lewat kelas `snd-coveo` di <html> yang menimpa token
	 * tema (navbar, footer, tombol bantuan ikut terang). Pemutar bersama /sounds & /sounds/<id>: lagu tetap
	 * berjalan saat pindah antara daftar dan detail.
	 */
	let { children }: { children: Snippet } = $props();

	$effect(() => {
		const root = document.documentElement;
		root.classList.add("snd-coveo");
		return () => {
			root.classList.remove("snd-coveo");
			// Keluar dari halaman Sounds → pemutar dihentikan (kartunya hanya ada di sini).
			player.close();
		};
	});
</script>

<svelte:head>
	<link
		rel="stylesheet"
		href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Instrument+Serif:ital@0;1&family=Mrs+Saint+Delafield&display=swap"
	/>
</svelte:head>

{@render children()}

<!-- Ruang di bawah konten supaya baris terakhir tak tertutup kartu pemutar. -->
{#if player.track}<div class="h-36 max-md:h-[28rem]" aria-hidden="true"></div>{/if}

<SoundPlayerBar />

<style>
	/* Palet Coveo untuk seluruh halaman selama di /sounds (spesifisitas di atas aturan skin :root[data-skin].dark). */
	:global(html:root.dark.snd-coveo) {
		color-scheme: light;
		--paper: #f5f5f5;
		--bg: #eeeeee;
		--wash: #dddddd;
		--fg: #1d1812;
		--fg-muted: #524d46;
		--hair: rgba(0, 0, 0, 0.12);
		--surface: #f5f5f5;
		--safelight: #fe5416;
		--safelight-lamp: #fe5416;
		--shadow: 0 30px 80px -40px rgba(0, 0, 0, 0.25);
	}
	:global(html.snd-coveo body) {
		background: #eeeeee;
	}
	/* Logo footer selalu diputihkan (situs gelap) — di halaman terang ini dibuat hitam. */
	:global(html.snd-coveo footer img[src="/logo1-sm.png"]) {
		filter: brightness(0) !important;
	}
</style>
