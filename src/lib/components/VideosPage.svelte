<script lang="ts">
	import { i18n } from "$lib/i18n.svelte";
	import { store } from "$lib/store.svelte";
	import { announcer } from "$lib/stores/announce.svelte";
	import { catLabel, fmtIDR, imgFor, fetchPhotos, fetchCategories, pickVideoPreview, type Video, type ApiCatItem } from "$lib/data";
import Reveal from "./Reveal.svelte";
import SearchField from "./SearchField.svelte";
import SortSelect from "./SortSelect.svelte";
	import { goto } from "$app/navigation";

	let { initialQ }: { initialQ?: string } = $props();

	const copy = {
		id: { kicker: "Koleksi video", title: "Mengabadikan momen dalam bingkai", titleSearch: (q: string) => `Hasil untuk “${q}”`, sub: "Jelajahi ribuan video eksklusif dari berbagai peristiwa dalam format 4K dan HD", duration: "Durasi", all: "Semua", count: "klip", noResults: "Tidak ada klip yang cocok. Coba tema lain", resultsFor: "Hasil untuk", clear: "Hapus", searchLabel: "Cari di arsip video", searchPlaceholder: "Cari video", searchSubmit: "Cari", addToCart: "Tambah ke keranjang", added: "Ditambahkan", newest: "Terbaru", popular: "Populer", sortLabel: "Urutkan", timeLabel: "Waktu", anyTime: "Semua waktu", pastDay: "24 jam terakhir", pastWeek: "7 hari terakhir", pastMonth: "30 hari terakhir", pastYear: "Setahun terakhir" },
		en: { kicker: "Videos", title: "Preserving memories in frames", titleSearch: (q: string) => `Results for “${q}”`, sub: "Explore thousands of exclusive videos, clips, and footage available in 4K and HD", duration: "Duration", all: "All", count: "clips", noResults: "No matching clips. Try another theme", resultsFor: "Results for", clear: "Clear", searchLabel: "Search the video archive", searchPlaceholder: "Search for videos", searchSubmit: "Search", addToCart: "Add to cart", added: "Added", newest: "Newest", popular: "Popular", sortLabel: "Sort", timeLabel: "Time", anyTime: "All time", pastDay: "Past 24 hours", pastWeek: "Past week", pastMonth: "Past month", pastYear: "Past year" }
	};

	const lang = $derived(i18n.lang);
	const t = $derived(copy[lang]);

	let videos = $state<Video[]>([]);
	let cat = $state<string | undefined>(undefined);
	let categories = $state<ApiCatItem[]>([]);
	let addedId = $state<string | null>(null);

	function add(v: Video) {
		store.addToCart({ id: v.id, kind: "video", title: v.title[lang], price: v.price, meta: v.id, thumbUrl: v.thumbUrl });
		addedId = v.id;
		announcer.announce(`${v.title[lang]} ${t.added}`);
		setTimeout(() => (addedId = null), 1600);
	}
	// Pencarian diketik → jeda 350ms → baru fetch (pola yang sama dengan
	// pemilih foto CMS). Tanpa jeda, tiap ketikan menembak API.
	let sq = $state(initialQ ?? "");
	let query = $state((initialQ ?? "").trim());
	// Urutan + rentang waktu — pola yang sama dengan /photos.
	let sort = $state<"newest" | "popular">("newest");
	let period = $state<"all" | "day" | "week" | "month" | "year">("all");

	// Kata kunci dari URL (mis. dari pencarian navbar) mengisi kolom ini.
	$effect(() => {
		sq = initialQ ?? "";
		query = (initialQ ?? "").trim();
	});

	// Enter menuliskan kata kunci ke URL supaya hasilnya bisa dibagikan.
	function syncUrl() {
		const url = new URL(window.location.href);
		const v = sq.trim();
		if (v) url.searchParams.set("q", v);
		else url.searchParams.delete("q");
		void goto(`${url.pathname}${url.search}`, { replaceState: true, keepFocus: true, noScroll: true });
	}

	function clearSearch() {
		query = "";
		syncUrl();
	}
	$effect(() => {
		const v = sq.trim();
		const id = window.setTimeout(() => {
			query = v;
		}, 350);
		return () => window.clearTimeout(id);
	});
	// Rasio asli tiap klip dibaca dari thumbnail yang selesai dimuat — video di
	// database tidak menyimpan width/height, jadi tinggi masonry diukur dari
	// gambarnya sendiri, bukan ditebak.
	let ratios = $state<Record<string, number>>({});

	// Irama tinggi kartu saat seluruh klip beraspek sama (semua 16:9 di arsip
	// sekarang): tanpa ini kolom masonry berhenti di garis yang sama dan
	// terbaca seperti grid biasa. Potongannya lembut — 16:9, 3:2, 4:3, 5:4 —
	// jadi bingkainya tidak terpangkas habis.
	const RHYTHM = [16 / 9, 3 / 2, 4 / 3, 5 / 4];

	// Aspek dianggap bervariasi bila yang paling lebar 15% lebih lebar dari yang
	// paling sempit; saat itu terjadi, rasio asli tiap klip yang dipakai.
	const variedRatios = $derived.by(() => {
		const list = videos.map((v) => ratios[v.id]).filter((r): r is number => !!r);
		if (list.length < 2) return false;
		return Math.max(...list) / Math.min(...list) > 1.15;
	});

	function aspectFor(v: Video, i: number) {
		const real = ratios[v.id];
		if (variedRatios && real) return real;
		return RHYTHM[i % RHYTHM.length];
	}

	function readRatio(id: string, e: Event) {
		const img = e.currentTarget as HTMLImageElement;
		if (img.naturalWidth > 0 && img.naturalHeight > 0) {
			ratios = { ...ratios, [id]: img.naturalWidth / img.naturalHeight };
		}
	}

	function playPreview(e: Event) {
		if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
		const card = e.currentTarget as HTMLElement | null;
		const vid = card?.querySelector<HTMLVideoElement>("video[data-preview]");
		if (!vid?.src) return;
		// Satu pratinjau saja yang berjalan: enam klip sekaligus membuat kipas
		// laptop menyala dan tak ada yang benar-benar terbaca.
		document.querySelectorAll<HTMLVideoElement>("video[data-preview]").forEach((o) => {
			if (o !== vid && !o.paused) o.pause();
		});
		void vid.play().catch(() => {});
		// Penanda dari JS, bukan hanya :hover CSS — supaya lapisan video ikut
		// terlihat saat pratinjau dipicu lewat fokus keyboard.
		card?.setAttribute("data-playing", "");
	}

	function stopPreview(e: Event) {
		const card = e.currentTarget as HTMLElement | null;
		const vid = card?.querySelector<HTMLVideoElement>("video[data-preview]");
		if (!vid) return;
		vid.pause();
		vid.currentTime = 0;
		card?.removeAttribute("data-playing");
	}

	$effect(() => {
		fetchCategories().then((c) => (categories = c)).catch(() => {});
	});

	function load() {
		return fetchPhotos({ cat, search: query || undefined, type: "VIDEO", sort, period: period === "all" ? undefined : period, limit: 24 })
			.then((r) => {
				videos = r.photos.map((p) => ({
					id: p.id,
					title: p.title,
					author: p.author,
					cat: p.cat,
					seed: p.seed,
					duration: "02:00",
					price: p.price,
					desc: p.desc,
					thumbUrl: p.thumbUrl,
					keywords: p.keywords,
					categories: p.categories,
					// Versi H.264 hasil transcode dipakai lebih dulu: lebih ringan dan
					// pasti terputar di browser. File master hanya cadangan.
					// picsum (fallback backend saat file hilang) DITOLAK — itu
					// gambar, dipasang di <video> gagal + error CSP media-src.
					// Klip kartu bersih (tanpa watermark) dulu; pratinjau
					// ber-watermark hanya cadangan bila klip belum dibuat.
					previewUrl: pickVideoPreview(p.clipUrl, p.watermarkUrl)
				}));
			})
			.catch(() => {
				videos = [];
			});
	}

	$effect(() => {
		void cat;
		void query;
		void load();
	});

</script>

<section class="mx-auto max-w-[1500px] px-6 pb-10 pt-[calc(var(--banner-h,0px)+var(--nav-h)+1.15rem)] lg:px-10 lg:pt-[calc(var(--banner-h,0px)+var(--nav-h)+1.9rem)]">
	<Reveal>
		<p data-reveal class="kicker text-safelight">{t.kicker}</p>
		<h1 data-reveal class="mt-5 font-display text-[clamp(2.4rem,6vw,5rem)] font-light leading-[0.98] tracking-[-0.03em] text-fg">{query ? t.titleSearch(query) : t.title}</h1>
		<p data-reveal class="mt-6 whitespace-nowrap text-[min(1.02rem,1.8vw)] leading-relaxed text-fg-muted">{t.sub}</p>
		<div data-reveal class="relative z-40 mt-8 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between sm:gap-8" data-no-hover-sound data-no-click-sound>
			<SearchField
				bind:value={sq}
				placeholder={t.searchPlaceholder}
				label={t.searchLabel}
				clearLabel={t.clear}
				submitLabel={t.searchSubmit}
				onsubmit={syncUrl}
				onclear={clearSearch}
				class="min-w-0 sm:flex-1"
			/>
			<div class="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-3 sm:justify-end">
				<SortSelect
					value={sort}
					label={t.sortLabel}
					options={[
						{ value: "newest", label: t.newest },
						{ value: "popular", label: t.popular },
					]}
					onchange={(v) => ((sort = v), void load())}
				/>
				<SortSelect
					value={period}
					label={t.timeLabel}
					options={[
						{ value: "all", label: t.anyTime },
						{ value: "day", label: t.pastDay },
						{ value: "week", label: t.pastWeek },
						{ value: "month", label: t.pastMonth },
						{ value: "year", label: t.pastYear },
					]}
					onchange={(v) => ((period = v), void load())}
				/>
			</div>
		</div>
		{#if query}
			<p data-reveal class="mt-5 flex flex-wrap items-baseline gap-2 text-sm text-fg-muted">
				<span class="text-xs">{videos.length} {t.count}</span>
			</p>
		{/if}
	</Reveal>
</section>

<!-- Rel filter: pola yang sama dengan /photos — chip ramping di mobile. -->
<div class="sticky top-[calc(var(--banner-h,0px)+var(--nav-h))] z-30 border-y border-hair bg-bg/85 backdrop-blur-md sm:backdrop-blur-xl" data-no-hover-sound data-no-click-sound>
	<div class="rail-scroll mx-auto flex max-w-[1500px] items-center gap-1.5 overflow-x-auto px-[max(1.5rem,env(safe-area-inset-left))] py-1.5 sm:gap-2 sm:px-6 sm:py-3 lg:px-10">
		{#snippet chip(active: boolean, label: string, onpick: () => void)}
			<button
				type="button"
				aria-pressed={active}
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
		{@render chip(!cat, t.all, () => (cat = undefined))}
		{#each categories as c (c.id)}
			{@render chip(cat === c.name, c.name, () => (cat = c.name))}
		{/each}
		<span class="ml-auto hidden whitespace-nowrap text-xs text-fg-muted md:inline" aria-live="polite">
			{videos.length} {t.count}
		</span>
	</div>
</div>

<section class="mx-auto max-w-[1500px] px-6 py-12 pb-28 lg:px-10 lg:py-16" data-no-hover-sound data-no-click-sound>
	{#if videos.length > 0}
	<!-- Masonry kolom-CSS: tiap kartu memakai rasio klipnya sendiri, jadi klip
		tegak dan lebar tidak dipaksa masuk kotak 16:9 yang sama. Arahkan kursor
		(atau fokus keyboard) dan klipnya berjalan — gerak yang menjawab aksi. -->
	<Reveal stagger={0.06} class="gap-6 [column-fill:_balance] sm:columns-2 lg:columns-3">
		{#each videos as v, i (v.id)}
			{@const fav = store.isFavorite(v.id)}
			<!-- Kartu mengikuti bahasa halaman Foto: hanya bingkainya, dengan
				kategori & harga sebagai pil di atas gambar dan garis safelight saat
				hover. Judul dan tombol dibaca di halaman detail. -->
			<a
				data-reveal
				href={`/videos/${v.id}`}
				aria-label={`${v.title[lang]} — ${v.author}, ${fmtIDR(v.price)}`}
				class="group relative mb-[clamp(0.55rem,1.2vw,1rem)] block break-inside-avoid pb-3 after:absolute after:bottom-0 after:left-0 after:h-px after:w-full after:origin-left after:scale-x-0 after:bg-safelight after:transition-transform after:duration-500 after:ease-out hover:after:scale-x-100 focus-visible:after:scale-x-100"
				onmouseenter={playPreview}
				onmouseleave={stopPreview}
				onfocus={playPreview}
				onblur={stopPreview}
			>
				<div
					class="relative w-full overflow-hidden rounded-[3px] border border-hair"
					style={`aspect-ratio: ${aspectFor(v, i)}`}
				>
					<img
						src={imgFor(v.seed, 800, 450, v.thumbUrl)}
						alt={v.title[lang]}
						loading="lazy"
						onload={(e) => readRatio(v.id, e)}
						class="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]"
					/>
					{#if v.previewUrl}
						<video
							data-preview
							src={v.previewUrl}
							muted
							loop
							playsinline
							preload="metadata"
							aria-hidden="true"
							tabindex="-1"
							class="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100 group-focus-visible:opacity-100 group-data-[playing]:opacity-100"
						></video>
					{/if}
					<div class="pointer-events-none absolute inset-0 bg-gradient-to-t from-ocean-deep/60 via-transparent to-transparent opacity-80"></div>
					<!-- Baris atas: siku-siku, pil kategori, dan pil harga dilepas —
						hati + keranjang hanya muncul saat hover (selalu di mobile).
						Detail lengkap dibaca di halaman detail. -->
					<div class="absolute inset-x-0 top-0 flex items-start justify-end gap-2 p-3">
						<button
							type="button"
							onclick={(e) => {
								e.preventDefault();
								add(v);
							}}
							aria-label={`${t.addToCart} — ${v.title[lang]}`}
							class="tap-expand grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ocean-deep/45 text-ivory opacity-0 backdrop-blur transition-all duration-300 hover:bg-safelight focus-visible:opacity-100 active:bg-safelight group-hover:opacity-100 max-sm:opacity-100"
						>
							{#if addedId === v.id}
								<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
							{:else}
								<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="20" r="1.4" /><circle cx="18" cy="20" r="1.4" /><path d="M2.5 3h2.2l2.3 11.2a1.6 1.6 0 0 0 1.6 1.3h8.6a1.6 1.6 0 0 0 1.6-1.3L21 7H6" /></svg>
							{/if}
						</button>
						<button
							type="button"
							onclick={(e) => {
								e.preventDefault();
								store.toggleFavorite(v.id);
							}}
							aria-label={fav ? "Unsave" : "Save"}
							class="tap-expand grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ocean-deep/45 text-ivory opacity-0 backdrop-blur transition-all duration-300 hover:bg-safelight focus-visible:opacity-100 active:bg-safelight group-hover:opacity-100 max-sm:opacity-100"
						>
							<svg width="15" height="15" viewBox="0 0 24 24" fill={fav ? "#ff4d12" : "none"} stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
								<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" />
							</svg>
						</button>
					</div>
					<!-- Keterangan klip: judul + kreator, terbit bersama tombol
						saat hover (selalu tampil di mobile). -->
					<div class="absolute inset-x-0 bottom-0 translate-y-2 p-4 opacity-0 transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100 max-sm:translate-y-0 max-sm:opacity-100">
						<h3 class="font-display text-lg font-light leading-tight tracking-[-0.01em] text-ivory">
							{v.title[lang]}
						</h3>
						<p class="mt-0.5 text-xs text-ivory/60">{v.author}</p>
					</div>
				</div>
			</a>
		{/each}
	</Reveal>
	{:else}
		<p class="py-24 text-center font-display text-2xl font-light text-fg-muted">{t.noResults}</p>
	{/if}
</section>
