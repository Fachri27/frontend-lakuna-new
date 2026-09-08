<script lang="ts">
	import { i18n } from "$lib/i18n.svelte";
	import { fetchPhotos, fetchCategories, type Photo, type ApiCatItem } from "$lib/data";
	import Reveal from "./Reveal.svelte";
	import Masonry from "./Masonry.svelte";

	let { initialCat, initialQ }: { initialCat?: string; initialQ?: string } = $props();

	const copy = {
		id: { kicker: "Galeri", title: "Arsip foto", sub: "Bingkai-bingkai terkurasi dari Sabang hingga Merauke. Saring per tema, simpan yang menarik.", all: "Semua", count: "bingkai", resultsFor: "Hasil untuk", clear: "Hapus", noResults: "Tidak ada bingkai yang cocok. Coba kata kunci lain." },
		en: { kicker: "Gallery", title: "The photo archive", sub: "Curated frames from Sabang to Merauke. Filter by theme, save the ones that hold you.", all: "All", count: "frames", resultsFor: "Results for", clear: "Clear", noResults: "No matching frames. Try another keyword." }
	};

	const lang = $derived(i18n.lang);
	const t = $derived(copy[lang]);
	// cat = nama kategori asli dari API (mis. "Nature"). initialCat dari ?cat=... (nama).
	let cat = $state<string | undefined>(initialCat || undefined);
	let categories = $state<ApiCatItem[]>([]);
	const query = $derived((initialQ ?? "").trim());
	const needle = $derived(query.toLowerCase());
	let photos = $state<Photo[]>([]);
	let total = $state(0);

	// Sinkronkan kategori saat ?cat= berubah (navigasi antar URL tanpa remount).
	$effect(() => {
		cat = initialCat || undefined;
	});

	$effect(() => {
		fetchCategories().then((c) => (categories = c)).catch(() => {});
	});

	function load() {
		return fetchPhotos({
			cat,
			search: needle || undefined,
			type: "FOTO", // galeri foto hanya photo; video ada di /videos
			limit: 48
		})
			.then((r) => {
				photos = r.photos;
				total = r.total;
			})
			.catch(() => {
				photos = [];
				total = 0;
			});
	}

	$effect(() => {
		void cat;
		void needle;
		void load();
	});
</script>

<section class="mx-auto max-w-[1500px] px-6 pb-10 pt-36 lg:px-10 lg:pt-44">
	<Reveal>
		<p data-reveal class="kicker text-safelight">{t.kicker}</p>
		<h1 data-reveal class="mt-5 font-display text-[clamp(2.4rem,6vw,5rem)] font-light leading-[0.98] tracking-[-0.03em] text-fg">
			{t.title}
		</h1>
		<p data-reveal class="mt-6 max-w-xl text-[1.02rem] leading-relaxed text-fg-muted">{t.sub}</p>
		{#if query}
			<p data-reveal class="mt-6 flex flex-wrap items-center gap-2 text-sm text-fg-muted">
				<span class="kicker text-safelight">{t.resultsFor}</span>
				<span class="font-display text-lg font-light text-fg">“{query}”</span>
				<a href="/photos" class="arrow-link ml-2 text-xs text-fg-muted hover:text-safelight">
					{t.clear} <span class="arr">→</span>
				</a>
			</p>
		{/if}
	</Reveal>
</section>

<!-- Filter strip -->
<div class="sticky top-[4.6rem] z-30 border-y border-hair bg-bg/85 backdrop-blur-xl">
	<div class="mx-auto flex max-w-[1500px] items-center gap-2 overflow-x-auto px-6 py-3 lg:px-10">
		{#snippet chip(active: boolean, label: string, onpick: () => void)}
			<button
				type="button"
				aria-pressed={active}
				onclick={onpick}
				class={`kicker whitespace-nowrap rounded-full border px-4 py-2 transition-colors ${
					active
						? "border-safelight bg-safelight text-ivory"
						: "border-hair text-fg/70 hover:border-safelight hover:text-safelight"
				}`}
			>
				{label}
			</button>
		{/snippet}
		{@render chip(!cat, t.all, () => (cat = undefined))}
		{#each categories as c (c.id)}
			{@render chip(cat === c.name, c.name, () => (cat = c.name))}
		{/each}
		<span class="ml-auto hidden whitespace-nowrap text-xs text-fg-muted md:inline" aria-live="polite">
			{total || photos.length} {t.count}
		</span>
	</div>
</div>

<section class="mx-auto max-w-[1500px] px-6 py-12 lg:px-10 lg:py-16">
	{#if photos.length > 0}
		<Masonry {photos} />
	{:else}
		<p class="py-24 text-center font-display text-2xl font-light text-fg-muted">{t.noResults}</p>
	{/if}
</section>
