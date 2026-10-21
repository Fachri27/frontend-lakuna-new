<script lang="ts">
	/**
	 * Halaman Sounds — susunan coveomusic.com (acuan pemilik): roda sampul di hero, bagian "cerita" dengan
	 * gambar mengapit teks, lalu katalog "seluruh koleksi" berbaris dengan tombol Pratinjau, dan pemutar
	 * mengambang berpiringan vinyl (routes/sounds/+layout.svelte). Gayanya tetap Lakuna: tema gelap, kicker
	 * safelight, judul display tipis, garis rambut, chip bulat. Kebutuhan toko (cari, jenis, kategori, urutan,
	 * keranjang) ada di kepala katalog.
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
	import SoundWheel from "./SoundWheel.svelte";

	let { initialQ, initialKind, initialCat }: { initialQ?: string; initialKind?: string; initialCat?: string } = $props();

	const copy = {
		id: {
			storyKicker: "Seni bercerita lewat suara",
			storyTitle: "Bunyi yang menyimpan cerita",
			story: [
				"Setiap tempat di Nusantara punya bunyinya sendiri: hujan yang jatuh di kanopi hutan, ombak yang pecah di karang, riuh pasar pagi, dan gamelan yang mengalun dari balai desa.",
				"Lakuna Sounds mengarsipkan bunyi-bunyi itu sebagai musik dan efek suara bebas royalti — direkam dan disusun kreator lokal, lalu dikurasi sebelum tayang.",
				"Dengarkan pratinjaunya di sini. Setelah dilisensikan, berkas aslinya (WAV, FLAC, atau MP3 kualitas penuh) siap dipakai untuk video, podcast, iklan, dan karya kamu.",
			],
			catKicker: "Katalog",
			catTitle: "Seluruh koleksi",
			catTitleSearch: (q: string) => `Hasil untuk “${q}”`,
			orderNewest: "Semua audio — terbaru dulu",
			orderPopular: "Semua audio — paling banyak diunduh",
			searchLabel: "Cari musik atau efek suara", searchPlaceholder: "Cari musik atau efek suara…", searchSubmit: "Cari", clear: "Hapus",
			all: "Semua", music: "Musik", sfx: "Efek suara", kindLabel: "Jenis audio", catLabel: "Suasana",
			sortLabel: "Urutkan", newest: "Terbaru", popular: "Populer",
			count: "audio", more: "Muat lebih banyak", loading: "Memuat…",
			empty: "Belum ada audio di arsip. Koleksi musik dan efek suara segera hadir",
			noResults: "Tidak ada audio yang cocok. Coba kata kunci atau suasana lain",
			clearFilter: "Hapus saringan",
			endKicker: "Lisensi & kontributor",
			endTitle: "Pakai di karya kamu, atau bagikan rekamanmu",
			endBody: "Lisensi Standar dibayar sekali per berkas dan berlaku selamanya; paket berlangganan memberi kuota unduhan bulanan. Punya rekaman lapangan atau komposisi sendiri? Unggah lewat akun kontributor dan dapatkan bagi hasil dari setiap lisensi.",
			endLicense: "Baca lisensi", endContrib: "Jadi kontributor",
		},
		en: {
			storyKicker: "The art of sonic storytelling",
			storyTitle: "Sounds that hold stories",
			story: [
				"Every place in the archipelago has its own sound: rain on the forest canopy, waves breaking on the reef, a busy morning market, gamelan drifting from the village hall.",
				"Lakuna Sounds archives them as royalty-free music and sound effects — recorded and arranged by local creators, curated before they go live.",
				"Listen to the preview here. Once licensed, the original file (WAV, FLAC or full-quality MP3) is ready for your videos, podcasts, ads and projects.",
			],
			catKicker: "Catalogue",
			catTitle: "The complete collection",
			catTitleSearch: (q: string) => `Results for “${q}”`,
			orderNewest: "All sounds — newest first",
			orderPopular: "All sounds — most downloaded first",
			searchLabel: "Search music or sound effects", searchPlaceholder: "Search music or sound effects…", searchSubmit: "Search", clear: "Clear",
			all: "All", music: "Music", sfx: "Sound effects", kindLabel: "Audio type", catLabel: "Mood",
			sortLabel: "Sort", newest: "Newest", popular: "Popular",
			count: "sounds", more: "Load more", loading: "Loading…",
			empty: "No sounds in the archive yet. Music and sound effects are coming soon",
			noResults: "No matching sounds. Try another keyword or mood",
			clearFilter: "Clear filter",
			endKicker: "Licensing & contributors",
			endTitle: "Use it in your work, or share your recordings",
			endBody: "A Standard licence is paid once per file and lasts forever; subscriptions give a monthly download quota. Have your own field recordings or compositions? Upload them through a contributor account and earn a share of every licence.",
			endLicense: "Read the licence", endContrib: "Become a contributor",
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
	/** Sampul roda hero: audio terbaru, tak ikut saringan katalog. */
	let wheel = $state<Sound[]>([]);
	let wheelLoaded = $state(false);

	const filtered = $derived(!!query || !!cat);

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
		cat = cat === name ? undefined : name;
		syncUrl();
	}
	function clearAll() {
		sq = "";
		query = "";
		cat = undefined;
		kind = undefined;
		syncUrl();
	}

	$effect(() => {
		fetchSoundCategories().then((c) => (categories = c));
		fetchSounds({ limit: 24 })
			.then((r) => (wheel = r.sounds))
			.catch(() => {})
			.finally(() => (wheelLoaded = true));
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

	// Gambar pengapit bagian cerita: sampul kategori (CMS) dulu, lalu sampul audio terbaru.
	const sidePics = $derived(
		[...categories.map((c) => c.imageUrl || c.coverUrl), ...wheel.map((s) => s.cover)].filter((u): u is string => !!u).slice(0, 2)
	);
</script>

{#snippet chip(active: boolean, label: string, onpick: () => void, role: "radio" | "button" = "radio")}
	<button
		type="button"
		{role}
		aria-checked={role === "radio" ? active : undefined}
		aria-pressed={role === "button" ? active : undefined}
		onclick={onpick}
		class={`press kicker chip shrink-0 whitespace-nowrap rounded-full border transition-colors ${
			active
				? "border-safelight bg-safelight text-ivory"
				: "border-hair text-fg/70 hover:border-safelight hover:text-safelight active:border-safelight active:text-safelight"
		}`}
	>
		{label}
	</button>
{/snippet}

<div data-no-hover-sound data-no-click-sound>
	<!-- ───────── Hero: roda sampul ───────── -->
	{#if wheel.length > 0}
		<SoundWheel sounds={wheel} />
	{:else}
		<!-- Arsip masih kosong (atau API belum menjawab): kepala sederhana dengan H1 yang sama. -->
		<section class="mx-auto flex min-h-[60svh] max-w-[1500px] flex-col items-center justify-center px-6 pt-[calc(var(--banner-h,0px)+var(--nav-h)+2rem)] text-center lg:px-10">
			<span class="grid h-28 w-28 place-items-center rounded-full bg-safelight shadow-[0_24px_70px_-20px_var(--safelight-glow)]">
				<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" class="text-ivory" aria-hidden="true"><path d="M3 10v4M7 7v10M11 4v16M15 8v8M19 11v2" /></svg>
			</span>
			<h1 class="mt-5 text-[0.95rem] font-semibold uppercase tracking-[0.08em] text-fg">Lakuna Sounds</h1>
			{#if wheelLoaded}<p class="mt-6 max-w-md font-display text-xl font-light text-fg-muted">{t.empty}</p>{/if}
		</section>
	{/if}

	<!-- ───────── Cerita ───────── -->
	<section class="relative mx-auto max-w-[1500px] px-6 py-24 lg:px-10 lg:py-32">
		<Reveal class="text-center">
			<p data-reveal class="kicker text-safelight">{t.storyKicker}</p>
			<h2 data-reveal class="mx-auto mt-5 max-w-3xl font-display text-[clamp(2.2rem,5.4vw,4.6rem)] font-light leading-[0.98] tracking-[-0.03em] text-fg">{t.storyTitle}</h2>
		</Reveal>
		<div class="mt-16 grid items-start gap-12 lg:grid-cols-[1fr_minmax(0,28rem)_1fr] lg:gap-14">
			<div class="hidden lg:block lg:pt-40">
				{#if sidePics[0]}
					<div class="relative aspect-[4/5] overflow-hidden rounded-[14px] border border-hair">
						<ApiImage src={sidePics[0]} alt="" fill class="object-cover object-top" />
					</div>
				{/if}
			</div>
			<Reveal stagger={0.08} class="space-y-8">
				{#each t.story as para, i (i)}
					<p data-reveal class="text-[0.98rem] leading-[1.85] text-fg-muted">{para}</p>
				{/each}
			</Reveal>
			<div class="hidden lg:block">
				{#if sidePics[1]}
					<div class="relative aspect-square overflow-hidden rounded-[14px] border border-hair">
						<ApiImage src={sidePics[1]} alt="" fill class="object-cover object-top" />
					</div>
				{/if}
			</div>
		</div>
	</section>

	<!-- ───────── Katalog ───────── -->
	<section id="daftar-audio" class="mx-auto max-w-[1500px] scroll-mt-[calc(var(--banner-h,0px)+var(--nav-h)+1rem)] px-6 pb-28 lg:px-10">
		<Reveal class="text-center">
			<p data-reveal class="kicker text-safelight">{t.catKicker}</p>
			<h2 data-reveal class="mt-5 font-display text-[clamp(2.2rem,5.4vw,4.6rem)] font-light leading-[0.98] tracking-[-0.03em] text-fg">
				{query ? t.catTitleSearch(query) : t.catTitle}
			</h2>
		</Reveal>

		<!-- Kepala katalog: cari + urutan, jenis, suasana. -->
		<div class="mx-auto mt-14 flex max-w-4xl flex-col items-stretch gap-5 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
			<SearchField
				bind:value={sq}
				placeholder={t.searchPlaceholder}
				label={t.searchLabel}
				clearLabel={t.clear}
				submitLabel={t.searchSubmit}
				onsubmit={syncUrl}
				onclear={() => ((query = ""), syncUrl())}
				class="min-w-0 sm:flex-1"
			/>
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
		<div class="rail-scroll mt-6 flex items-center gap-1.5 overflow-x-auto pb-1 sm:flex-wrap sm:justify-center sm:gap-2 sm:overflow-visible">
			<div role="radiogroup" aria-label={t.kindLabel} class="flex shrink-0 gap-1.5 sm:gap-2">
				{@render chip(!kind, t.all, () => pickKind(undefined))}
				{@render chip(kind === "MUSIC", t.music, () => pickKind("MUSIC"))}
				{@render chip(kind === "SFX", t.sfx, () => pickKind("SFX"))}
			</div>
			{#if categories.length}
				<span class="mx-1 h-5 w-px shrink-0 bg-hair" aria-hidden="true"></span>
				<div role="group" aria-label={t.catLabel} class="flex shrink-0 gap-1.5 sm:flex-wrap sm:gap-2">
					{#each categories as c (c.id)}
						{@render chip(cat === c.name, catName(c, lang), () => pickCat(c.name), "button")}
					{/each}
				</div>
			{/if}
		</div>

		<p class="mt-12 text-center text-[0.72rem] font-medium uppercase tracking-[0.06em] text-fg/80" aria-live="polite">
			{sort === "popular" ? t.orderPopular : t.orderNewest} · {total} {t.count}
		</p>

		<div class="mt-6 border-t border-hair">
			{#if loading && sounds.length === 0}
				<div aria-busy="true" aria-label={t.loading}>
					{#each Array.from({ length: 5 }) as _, i (i)}
						<div class="flex items-center gap-6 border-b border-hair px-3 py-3">
							<div class="h-[4.5rem] w-[4.5rem] animate-pulse rounded-[22%] bg-fg/[0.06]"></div>
							<div class="h-3 w-48 animate-pulse rounded bg-fg/[0.06]"></div>
						</div>
					{/each}
				</div>
			{:else if sounds.length === 0}
				<div class="py-24 text-center">
					<p class="mx-auto max-w-xl font-display text-2xl font-light text-fg-muted">{filtered || kind ? t.noResults : t.empty}</p>
					{#if filtered || kind}
						<button type="button" onclick={clearAll} class="mt-6 rounded-full border border-hair px-5 py-2.5 text-xs font-medium text-fg transition-colors hover:border-safelight hover:text-safelight">
							{t.clearFilter}
						</button>
					{/if}
				</div>
			{:else}
				<ol>
					{#each sounds as s, i (s.id)}
						<li class="border-b border-hair py-2"><SoundRow sound={s} queue={sounds} index={total - i - 1} /></li>
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
		</div>
	</section>

	<!-- ───────── Penutup: lisensi & kontributor ───────── -->
	<section class="mx-auto max-w-[1500px] px-6 pb-16 lg:px-10">
		<div class="grid items-center gap-10 overflow-hidden rounded-[18px] border border-hair bg-fg/[0.025] p-8 sm:p-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16">
			<div class="relative mx-auto aspect-square w-full max-w-[22rem] overflow-hidden rounded-[18px] bg-safelight lg:mx-0">
				<p aria-hidden="true" class="absolute -left-4 bottom-6 whitespace-nowrap font-display text-[clamp(3.6rem,9vw,6.5rem)] font-light italic leading-[0.9] tracking-[-0.04em] text-ivory/90">
					suara<br />nusantara
				</p>
				<svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" class="absolute right-6 top-6 text-ivory/80" aria-hidden="true"><path d="M3 10v4M7 7v10M11 4v16M15 8v8M19 11v2" /></svg>
			</div>
			<div>
				<p class="kicker text-safelight">{t.endKicker}</p>
				<h2 class="mt-5 font-display text-[clamp(1.8rem,3.6vw,3rem)] font-light leading-[1.05] tracking-[-0.02em] text-fg">{t.endTitle}</h2>
				<p class="mt-6 max-w-xl text-[0.98rem] leading-relaxed text-fg-muted">{t.endBody}</p>
				<div class="mt-8 flex flex-wrap gap-3">
					<a href="/license" class="press rounded-full bg-safelight px-6 py-3 text-sm font-medium text-ivory transition-transform hover:scale-[1.02]">{t.endLicense}</a>
					<a href="/contributor" class="press rounded-full border border-hair px-6 py-3 text-sm font-medium text-fg transition-colors hover:border-safelight hover:text-safelight">{t.endContrib}</a>
				</div>
			</div>
		</div>
	</section>
</div>
