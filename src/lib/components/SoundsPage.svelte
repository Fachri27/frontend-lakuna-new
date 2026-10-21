<script lang="ts">
	/**
	 * Halaman Sounds — susunan halaman audio situs stok (judul besar, kolom cari lebar, ubin mood/genre, daftar
	 * lagu per baris dengan aksi), dalam bahasa visual Lakuna: kicker safelight, judul display tipis, garis
	 * rambut, chip bulat, rel saring lengket. Pemutar bawah ada di routes/sounds/+layout.svelte.
	 */
	import { untrack } from "svelte";
	import { goto } from "$app/navigation";
	import { i18n } from "$lib/i18n.svelte";
	import { catName, fetchSoundCategories, fetchSounds, type Sound, type SoundCategory } from "$lib/data";
	import Reveal from "./Reveal.svelte";
	import SearchField from "./SearchField.svelte";
	import SortSelect from "./SortSelect.svelte";
	import ApiImage from "./ApiImage.svelte";
	import SoundRow from "./SoundRow.svelte";

	let { initialQ, initialKind, initialCat }: { initialQ?: string; initialKind?: string; initialCat?: string } = $props();

	const copy = {
		id: {
			kicker: "Koleksi audio", kickerMixed: "Arsip suara",
			title: "Suara yang merekam Nusantara",
			titleSearch: (q: string) => `Hasil untuk “${q}”`,
			sub: "Musik dan efek suara bebas royalti — dari hutan hujan, debur ombak, riuh pasar, hingga panggung budaya. Dengarkan pratinjaunya, lalu lisensikan berkas aslinya.",
			searchLabel: "Cari musik atau efek suara", searchPlaceholder: "Cari musik atau efek suara…", searchSubmit: "Cari", clear: "Hapus",
			all: "Semua", music: "Musik", sfx: "Efek suara", kindLabel: "Jenis audio",
			sortLabel: "Urutkan", newest: "Terbaru", popular: "Populer",
			moods: "Jelajahi suasana", moodsKicker: "Mood & genre", items: "audio",
			latest: "Audio terbaru", popularList: "Paling banyak diunduh", inCat: "Kategori",
			count: "audio", more: "Muat lebih banyak", loading: "Memuat…",
			empty: "Belum ada audio di arsip. Koleksi musik dan efek suara segera hadir",
			noResults: "Tidak ada audio yang cocok. Coba kata kunci atau suasana lain",
			clearFilter: "Hapus saringan",
			cols: { title: "Judul", wave: "Pratinjau", tags: "Tag", time: "Durasi" },
		},
		en: {
			kicker: "Sounds", kickerMixed: "Sound archive",
			title: "Sounds that capture the archipelago",
			titleSearch: (q: string) => `Results for “${q}”`,
			sub: "Royalty-free music and sound effects — rainforests, crashing waves, busy markets and cultural stages. Listen to the preview, then license the original file.",
			searchLabel: "Search music or sound effects", searchPlaceholder: "Search music or sound effects…", searchSubmit: "Search", clear: "Clear",
			all: "All", music: "Music", sfx: "Sound effects", kindLabel: "Audio type",
			sortLabel: "Sort", newest: "Newest", popular: "Popular",
			moods: "Explore by mood", moodsKicker: "Moods & genres", items: "sounds",
			latest: "New sounds", popularList: "Most downloaded", inCat: "Category",
			count: "sounds", more: "Load more", loading: "Loading…",
			empty: "No sounds in the archive yet. Music and sound effects are coming soon",
			noResults: "No matching sounds. Try another keyword or mood",
			clearFilter: "Clear filter",
			cols: { title: "Title", wave: "Preview", tags: "Tags", time: "Length" },
		},
	};
	const lang = $derived(i18n.lang);
	const t = $derived(copy[lang]);

	const kindFrom = (v?: string) => (v === "music" ? "MUSIC" : v === "sfx" ? "SFX" : undefined);
	// Nilai awal dari URL (juga untuk SSR); perubahan URL berikutnya disalin $effect di bawah.
	let kind = $state<"MUSIC" | "SFX" | undefined>(untrack(() => kindFrom(initialKind)));
	let cat = $state<string | undefined>(untrack(() => initialCat || undefined));
	let sq = $state(untrack(() => initialQ ?? ""));
	let query = $state(untrack(() => (initialQ ?? "").trim()));
	let sort = $state<"newest" | "popular">("newest");

	let sounds = $state<Sound[]>([]);
	let total = $state(0);
	let pageNo = $state(1);
	let totalPages = $state(0);
	let loading = $state(true);
	let categories = $state<SoundCategory[]>([]);

	const filtered = $derived(!!query || !!cat);
	const catLabel = $derived.by(() => {
		const c = categories.find((x) => x.name === cat);
		return c ? catName(c, lang) : cat;
	});

	// Kata kunci/jenis/kategori dari URL (mis. pencarian navbar, tautan dibagikan).
	$effect(() => {
		sq = initialQ ?? "";
		query = (initialQ ?? "").trim();
		kind = kindFrom(initialKind);
		cat = initialCat || undefined;
	});

	// Ketikan → jeda 350 ms → baru menyaring (pola halaman Foto & Video).
	$effect(() => {
		const v = sq.trim();
		const id = window.setTimeout(() => (query = v), 350);
		return () => window.clearTimeout(id);
	});

	function syncUrl() {
		const url = new URL(window.location.href);
		const set = (k: string, v?: string) => (v ? url.searchParams.set(k, v) : url.searchParams.delete(k));
		set("q", sq.trim() || undefined);
		set("kind", kind === "MUSIC" ? "music" : kind === "SFX" ? "sfx" : undefined);
		set("cat", cat);
		void goto(`${url.pathname}${url.search}`, { replaceState: true, keepFocus: true, noScroll: true });
	}

	function pickKind(k: typeof kind) {
		kind = k;
		syncUrl();
	}
	function pickCat(name: string | undefined) {
		cat = name;
		syncUrl();
		if (name) document.getElementById("daftar-audio")?.scrollIntoView({ behavior: "smooth", block: "start" });
	}
	function clearAll() {
		sq = "";
		query = "";
		cat = undefined;
		syncUrl();
	}

	$effect(() => {
		fetchSoundCategories().then((c) => (categories = c));
	});

	let seq = 0;
	function load(page = 1) {
		const my = ++seq;
		loading = true;
		return fetchSounds({ kind, cat, search: query || undefined, sort, page, limit: 20 })
			.then((r) => {
				if (my !== seq) return;
				sounds = page === 1 ? r.sounds : [...sounds, ...r.sounds.filter((s) => !sounds.some((o) => o.id === s.id))];
				total = r.total;
				totalPages = r.totalPages;
				pageNo = page;
			})
			.catch(() => {
				if (my === seq && page === 1) sounds = [];
			})
			.finally(() => {
				if (my === seq) loading = false;
			});
	}

	$effect(() => {
		void kind;
		void cat;
		void query;
		void sort;
		void load(1);
	});

	// Ubin: sampul kategori dari CMS dulu, lalu sampul audio terbarunya.
	const tiles = $derived(categories.slice(0, 12));
</script>

<div data-no-hover-sound data-no-click-sound>
	<section class="mx-auto max-w-[1500px] px-6 pb-10 pt-[calc(var(--banner-h,0px)+var(--nav-h)+1.15rem)] lg:px-10 lg:pt-[calc(var(--banner-h,0px)+var(--nav-h)+1.9rem)]">
		<Reveal>
			<p data-reveal class="kicker text-safelight">{query || cat ? t.kickerMixed : t.kicker}</p>
			<h1 data-reveal class="mt-5 max-w-5xl font-display text-[clamp(2.4rem,6vw,5rem)] font-light leading-[0.98] tracking-[-0.03em] text-fg">
				{query ? t.titleSearch(query) : t.title}
			</h1>
			<p data-reveal class="mt-6 max-w-2xl text-[1.02rem] leading-relaxed text-fg-muted">{t.sub}</p>
			<div data-reveal class="relative z-40 mt-8 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
				<SearchField
					bind:value={sq}
					placeholder={t.searchPlaceholder}
					label={t.searchLabel}
					clearLabel={t.clear}
					submitLabel={t.searchSubmit}
					onsubmit={syncUrl}
					onclear={() => ((query = ""), syncUrl())}
					class="min-w-0 sm:max-w-[44rem] sm:flex-1"
				/>
				<div class="flex shrink-0 items-center gap-3 sm:justify-end">
					<SortSelect
						value={sort}
						label={t.sortLabel}
						options={[
							{ value: "newest", label: t.newest },
							{ value: "popular", label: t.popular },
						]}
						onchange={(v) => (sort = v)}
					/>
				</div>
			</div>
		</Reveal>
	</section>

	<!-- Rel saring lengket: jenis audio + kategori aktif + jumlah. -->
	<div class="sticky top-[calc(var(--banner-h,0px)+var(--nav-h))] z-30 border-y border-hair bg-bg/85 backdrop-blur-md sm:backdrop-blur-xl">
		<div class="rail-scroll mx-auto flex max-w-[1500px] items-center gap-1.5 overflow-x-auto px-[max(1.5rem,env(safe-area-inset-left))] py-1.5 sm:gap-2 sm:px-6 sm:py-3 lg:px-10">
			<div role="radiogroup" aria-label={t.kindLabel} class="flex shrink-0 items-center gap-1.5 sm:gap-2">
				{#each [[undefined, t.all], ["MUSIC", t.music], ["SFX", t.sfx]] as const as [k, label] (label)}
					<button
						type="button"
						role="radio"
						aria-checked={kind === k}
						onclick={() => pickKind(k)}
						class={`press kicker chip shrink-0 whitespace-nowrap rounded-full border transition-colors ${
							kind === k
								? "border-safelight bg-safelight text-ivory"
								: "border-hair text-fg/70 hover:border-safelight hover:text-safelight active:border-safelight active:text-safelight"
						}`}
					>
						{label}
					</button>
				{/each}
			</div>
			{#if cat}
				<span class="mx-1 h-5 w-px shrink-0 bg-hair" aria-hidden="true"></span>
				<button
					type="button"
					onclick={() => pickCat(undefined)}
					aria-label={`${t.clearFilter}: ${catLabel}`}
					class="press kicker chip inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full border border-fg/40 text-fg transition-colors hover:border-safelight hover:text-safelight"
				>
					{catLabel}
					<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
				</button>
			{/if}
			<span class="ml-auto hidden whitespace-nowrap pl-4 text-xs text-fg-muted md:inline" aria-live="polite">
				{total} {t.count}
			</span>
		</div>
	</div>

	<!-- Ubin mood & genre (kategori yang berisi audio) — hanya saat belum menyaring. -->
	{#if !filtered && tiles.length > 0}
		<section class="mx-auto max-w-[1500px] px-6 pt-12 lg:px-10 lg:pt-16">
			<Reveal class="mb-6 flex items-end justify-between gap-6">
				<div>
					<p data-reveal class="kicker text-safelight">{t.moodsKicker}</p>
					<h2 data-reveal class="mt-4 font-display text-2xl font-light tracking-[-0.02em] text-fg sm:text-[1.9rem]">{t.moods}</h2>
				</div>
			</Reveal>
			<Reveal stagger={0.05} class="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-6">
				{#each tiles as c (c.id)}
					{@const cover = c.imageUrl || c.coverUrl}
					<button
						data-reveal
						type="button"
						onclick={() => pickCat(c.name)}
						class="group relative aspect-square overflow-hidden rounded-[3px] border border-hair bg-ocean text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-safelight"
					>
						{#if cover}
							<ApiImage src={cover} alt="" fill class="object-cover object-top transition-transform duration-700 ease-out group-hover:scale-[1.07]" />
						{/if}
						<span class="pointer-events-none absolute inset-0 bg-gradient-to-t from-ocean-deep/85 via-ocean-deep/20 to-transparent"></span>
						<span class="absolute inset-x-0 bottom-0 p-4">
							<span class="block font-display text-[1.15rem] font-light leading-tight tracking-[-0.01em] text-ivory sm:text-xl">{catName(c, lang)}</span>
							<span class="mt-1 block font-mono text-[0.68rem] tabular-nums tracking-[0.08em] text-ivory/65">{c.count} {t.items}</span>
						</span>
						<span class="pointer-events-none absolute inset-x-0 bottom-0 h-px origin-left scale-x-0 bg-safelight transition-transform duration-500 group-hover:scale-x-100"></span>
					</button>
				{/each}
			</Reveal>
		</section>
	{/if}

	<!-- Daftar audio. -->
	<section id="daftar-audio" class="mx-auto max-w-[1500px] scroll-mt-[calc(var(--banner-h,0px)+var(--nav-h)+4rem)] px-6 pb-24 pt-12 lg:px-10 lg:pt-16">
		<div class="mb-5 flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
			<div>
				<p class="kicker text-safelight">{cat ? t.inCat : kind === "SFX" ? t.sfx : kind === "MUSIC" ? t.music : t.kicker}</p>
				<h2 class="mt-4 font-display text-2xl font-light tracking-[-0.02em] text-fg sm:text-[1.9rem]">
					{cat ? catLabel : query ? t.titleSearch(query) : sort === "popular" ? t.popularList : t.latest}
				</h2>
			</div>
			<p class="text-xs text-fg-muted md:hidden">{total} {t.count}</p>
		</div>

		<!-- Kepala kolom (layar lebar) — selaras grid SoundRow. -->
		{#if sounds.length > 0}
			<div class="snd-head mb-2 hidden gap-x-5 px-3 lg:grid" aria-hidden="true">
				<span class="w-16"></span>
				<span class="kicker text-fg-muted">{t.cols.title}</span>
				<span class="kicker text-fg-muted">{t.cols.wave}</span>
				<span class="kicker hidden text-fg-muted xl:block">{t.cols.tags}</span>
				<span class="kicker text-right text-fg-muted">{t.cols.time}</span>
				<span class="w-[9.75rem]"></span>
			</div>
		{/if}

		{#if loading && sounds.length === 0}
			<div class="space-y-2" aria-busy="true" aria-label={t.loading}>
				{#each Array.from({ length: 6 }) as _, i (i)}
					<div class="h-[4.6rem] animate-pulse rounded-[3px] border border-hair bg-fg/[0.03]"></div>
				{/each}
			</div>
		{:else if sounds.length === 0}
			<div class="py-24 text-center">
				<p class="mx-auto max-w-xl font-display text-2xl font-light text-fg-muted">{filtered || kind ? t.noResults : t.empty}</p>
				{#if filtered}
					<button type="button" onclick={clearAll} class="mt-6 rounded-full border border-hair px-5 py-2.5 text-xs font-medium text-fg transition-colors hover:border-safelight hover:text-safelight">
						{t.clearFilter}
					</button>
				{/if}
			</div>
		{:else}
			<ol class="space-y-2">
				{#each sounds as s, i (s.id)}
					<li><SoundRow sound={s} queue={sounds} index={i} /></li>
				{/each}
			</ol>
			{#if pageNo < totalPages}
				<div class="mt-10 flex justify-center">
					<button
						type="button"
						disabled={loading}
						onclick={() => load(pageNo + 1)}
						class="press rounded-full border border-hair px-6 py-3 text-xs font-medium text-fg transition-colors hover:border-safelight hover:text-safelight disabled:opacity-60"
					>
						{loading ? t.loading : t.more}
					</button>
				</div>
			{/if}
		{/if}
	</section>
</div>

<style>
	.snd-head {
		grid-template-columns: auto minmax(0, 15rem) minmax(0, 1fr) 4.25rem auto;
	}
	@media (min-width: 1280px) {
		.snd-head {
			grid-template-columns: auto minmax(0, 15rem) minmax(0, 1fr) minmax(0, 11rem) 4.25rem auto;
		}
	}
</style>
