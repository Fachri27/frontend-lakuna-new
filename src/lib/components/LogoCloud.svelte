<script lang="ts">
	import type { ApiResponse } from "../types";
	import { apiGet } from "$lib/api";
	/**
	 * Dinding logo pelanggan — potret 1:1 dari `logo-cloud-16` (React/shadcn)
	 * ke Svelte. Token warna/usulan shadcn (`bg-background`, `muted-foreground`)
	 * dipetakan ke token situs (`bg`, `fg-muted`, `hair`) supaya tetap satu
	 * bahasa dengan kamar gelap. Tanpa dependensi baru: murni <img> + utility.
	 */
	let {
		eyebrow,
		items = null,
	}: {
		eyebrow: string;
		/** Logo kurasi CMS (section `percaya`): gambar asli sebagai logo. Kosong = wordmark dummy. */
		items?: { name: string; src: string }[] | null;
	} = $props();

	// Logo unggahan admin (CMS › Logo, /api/logos) menang atas segalanya;
	// kosong = kurasi foto `percaya`, lalu wordmark dummy.
	let uploaded = $state<{ name: string; src: string }[] | null>(null);
	$effect(() => {
		let alive = true;
		apiGet<ApiResponse<{ id: string; name: string; imageUrl: string | null }[]>>("/api/logos")
			.then((r) => {
				if (!alive) return;
				const list = (r.data ?? [])
					.filter((l) => l.imageUrl)
					.map((l) => ({ name: l.name, src: l.imageUrl as string }));
				uploaded = list;
			})
			.catch(() => {
				if (alive) uploaded = [];
			});
		return () => {
			alive = false;
		};
	});
	const shown = $derived(uploaded?.length ? uploaded : (items?.length ? items : null));

	// Logo dummy sementara — wordmark teks sampai ada logo pelanggan asli.
	// Tiap entri punya gaya huruf sendiri supaya terbaca sebagai deretan
	// merek, bukan satu daftar biasa.
	const logos = [
		{ name: "NUSANTARA+", cls: "font-display font-light tracking-[0.08em]" },
		{ name: "KALA", cls: "font-mono font-medium tracking-[0.3em]" },
		{ name: "ruang·gelap", cls: "font-display italic font-light" },
		{ name: "ARUS", cls: "font-sans font-bold tracking-[0.18em]" },
		{ name: "Cahaya", cls: "font-display font-light tracking-[-0.01em]" },
		{ name: "BINGKAI", cls: "font-mono text-[0.95em] tracking-[0.22em]" },
		{ name: "Svara", cls: "font-sans font-medium italic" },
	];
</script>

<div data-reveal class="flex items-center justify-between border-t border-hair pt-3">
	<span class="kicker text-fg-muted">{eyebrow}</span>
</div>
<div class="mt-12 flex flex-wrap items-center justify-center gap-x-14 gap-y-10 sm:gap-x-20">
	{#if shown}
		{#each shown as logo, li (logo.src + "-" + li)}
			<span data-reveal>
				<img
					src={logo.src}
					alt={logo.name}
					loading="lazy"
					decoding="async"
					draggable={false}
					class="h-10 w-auto opacity-50 grayscale transition-all duration-200 hover:opacity-100 hover:grayscale-0 sm:h-12"
				/>
			</span>
		{/each}
	{:else}
		{#each logos as logo, li (logo.name + "-" + li)}
		<span data-reveal>
			<span
				class={`whitespace-nowrap text-3xl text-fg-muted opacity-50 transition-all duration-200 hover:opacity-100 sm:text-5xl ${logo.cls}`}
			>
				{logo.name}
			</span>
		</span>
		{/each}
	{/if}
</div>
