<script lang="ts">
	import { goto } from "$app/navigation";
	import { i18n } from "$lib/i18n.svelte";
	import { fetchPhotos, fetchCategories, type Photo, type ApiCatItem } from "$lib/data";
	import Masonry from "./Masonry.svelte";
	import SearchField from "./SearchField.svelte";
	import SortSelect from "./SortSelect.svelte";

	let { initialCat, initialQ }: { initialCat?: string; initialQ?: string } = $props();

	const copy = {
		id: { kicker: "Koleksi foto", title: "Satu lensa, seribu cerita", sub: "Temukan ribuan foto dengan kualitas terbaik, dan potret memukau dari berbagai perspektif.", all: "Semua", count: "bingkai", resultsFor: "Hasil untuk", clear: "Hapus", noResults: "Tidak ada bingkai yang cocok. Coba kata kunci lain.", searchLabel: "Cari di arsip foto", searchPlaceholder: "Cari foto", searchSubmit: "Cari", titleMixed: (c: string) => `Foto dan video ${c}`, titleSearch: (q: string) => `Hasil untuk “${q}”`, subMixed: "Temukan ribuan foto dengan kualitas terbaik, dan potret memukau dari berbagai perspektif.", searchLabelMixed: "Cari di arsip", searchPlaceholderMixed: "Cari foto", newest: "Terbaru", popular: "Populer", sortLabel: "Urutkan", timeLabel: "Waktu", anyTime: "Semua waktu", pastDay: "24 jam terakhir", pastWeek: "7 hari terakhir", pastMonth: "30 hari terakhir", pastYear: "Setahun terakhir", loadingPhotos: "Memuat foto berikutnya…", loadingMixed: "Memuat berikutnya…" },
		en: { kicker: "Photos", title: "Every frame tells a story", sub: "Discover thousands of best quality images, stunning photos in a variety of angles.", all: "All", count: "frames", resultsFor: "Results for", clear: "Clear", noResults: "No matching frames. Try another keyword.", searchLabel: "Search the photo archive", searchPlaceholder: "Search for images", searchSubmit: "Search", titleMixed: (c: string) => `${c} photos and videos`, titleSearch: (q: string) => `Results for “${q}”`, subMixed: "Discover thousands of best quality images, stunning photos in a variety of angles.", searchLabelMixed: "Search the archive", searchPlaceholderMixed: "Search for images", newest: "Newest", popular: "Popular", sortLabel: "Sort", timeLabel: "Time", anyTime: "All time", pastDay: "Past 24 hours", pastWeek: "Past week", pastMonth: "Past month", pastYear: "Past year", loadingPhotos: "Loading more photos…", loadingMixed: "Loading more…" }
	};

	const lang = $derived(i18n.lang);
	const t = $derived(copy[lang]);
	// cat = nama kategori asli dari API (mis. "Nature"). initialCat dari ?cat=... (nama).
	let cat = $state<string | undefined>(initialCat || undefined);
	// Asal kategori: true bila dari ?cat= (menu navbar) → foto + video dengan
	// judul "<Kategori> photos and videos". Memilih chip di halaman ini tetap
	// galeri foto dengan judul biasa.
	let catPicked = $state(false);
	const catFromNav = $derived(!catPicked);
	let categories = $state<ApiCatItem[]>([]);
	// Isi kolom pencarian. Diketik langsung menyaring (setelah jeda singkat);
	// menekan Enter menuliskannya ke URL supaya hasilnya bisa dibagikan dan
	// tautan ?q= yang sudah ada tetap bekerja.
	let q = $state(initialQ ?? "");
	let query = $state((initialQ ?? "").trim());
	const needle = $derived(query.toLowerCase());
	// Urutan waktu: terbaru / terlama. Ganti = muat ulang dari halaman 1.
	let sort = $state<"newest" | "popular">("newest");
	let period = $state<"all" | "day" | "week" | "month" | "year">("all");
	// Kategori atau kata cari (author, keyword, pencarian) aktif = foto DAN video.
	// Tanpa keduanya: galeri foto saja (video ada di /videos).
	const mixed = $derived((!!cat && catFromNav) || !!needle);

	$effect(() => {
		q = initialQ ?? "";
		query = (initialQ ?? "").trim();
	});

	$effect(() => {
		const typed = q;
		const t = setTimeout(() => (query = typed.trim()), 260);
		return () => clearTimeout(t);
	});

	function syncUrl() {
		const url = new URL(window.location.href);
		const v = q.trim();
		if (v) url.searchParams.set("q", v);
		else url.searchParams.delete("q");
		void goto(`${url.pathname}${url.search}`, { replaceState: true, keepFocus: true, noScroll: true });
	}

	function clearSearch() {
		query = "";
		syncUrl();
	}
	let photos = $state<Photo[]>([]);
	let total = $state(0);
	// Muat 20 dulu, tambah saat mentok bawah (infinite scroll).
	const PAGE_SIZE = 20;
	let page = $state(1);
	let totalPages = $state(1);
	let loadingMore = $state(false);
	let sentinel = $state<HTMLDivElement | null>(null);

	// Sinkronkan kategori saat ?cat= berubah (navigasi antar URL tanpa remount).
	$effect(() => {
		cat = initialCat || undefined;
		catPicked = false;
	});

	$effect(() => {
		fetchCategories().then((c) => (categories = c)).catch(() => {});
	});

	// Token anti-balap: filter/search yang berubah di tengah fetch membuat
	// respons lama dibuang, bukan menimpa hasil baru.
	let loadSeq = 0;

	function load() {
		const seq = ++loadSeq;
		page = 1;
		return fetchPhotos({
			cat,
			search: needle || undefined,
			type: mixed ? undefined : "FOTO",
			sort,
			period: period === "all" ? undefined : period,
			page: 1,
			limit: PAGE_SIZE
		})
			.then((r) => {
				if (seq !== loadSeq) return;
				photos = r.photos;
				total = r.total;
				totalPages = r.totalPages;
			})
			.catch(() => {
				if (seq !== loadSeq) return;
				photos = [];
				total = 0;
				totalPages = 1;
			});
	}

	const hasMore = $derived(page < totalPages);

	function loadMore() {
		if (loadingMore || !hasMore) return;
		loadingMore = true;
		const next = page + 1;
		const seq = loadSeq;
		// Indikator muat tampil minimal sebentar: kalau API cepat, pengguna
		// tetap melihat "sedang memuat" di bawah lalu foto baru menyusul —
		// bukan foto yang tiba-tiba sudah ada.
		const minShow = new Promise((r) => setTimeout(r, 750));
		Promise.all([fetchPhotos({
			cat,
			search: needle || undefined,
			type: mixed ? undefined : "FOTO",
			sort,
			period: period === "all" ? undefined : period,
			page: next,
			limit: PAGE_SIZE
		}), minShow])
			.then(([r]) => {
				if (seq !== loadSeq) return;
				photos = [...photos, ...r.photos];
				total = r.total;
				totalPages = r.totalPages;
				page = next;
			})
			.catch(() => {})
			.finally(() => {
				loadingMore = false;
			});
	}

	// Penjaga bawah: mentok → muat halaman berikut. Sekalijs observe
	// ulang tiap sentinel berganti (Svelte me-remount saat list berubah).
	$effect(() => {
		const el = sentinel;
		if (!el) return;
		const io = new IntersectionObserver(
			(entries) => {
				if (entries.some((en) => en.isIntersecting)) loadMore();
			},
			// Dipicu saat pengguna BENAR-BENAR mentok bawah (dulu 600px lebih
			// awal → foto dimuat diam-diam di luar layar, indikator tak pernah
			// terlihat).
			{ rootMargin: "0px 0px 40px 0px" }
		);
		io.observe(el);
		return () => io.disconnect();
	});

	$effect(() => {
		void cat;
		void needle;
		void load();
	});
</script>

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

<section class="mx-auto max-w-[1500px] px-6 pb-10 pt-[calc(var(--banner-h,0px)+var(--nav-h)+1.15rem)] lg:px-10 lg:pt-[calc(var(--banner-h,0px)+var(--nav-h)+1.9rem)]">
	<div>
		<p class="kicker text-safelight">{t.kicker}</p>
			<h1 class="mt-5 font-display text-[clamp(2.4rem,6vw,5rem)] font-light leading-[0.98] tracking-[-0.03em] text-fg">
			{cat && catFromNav ? t.titleSearch(cat) : needle ? t.titleSearch(query) : t.title}
		</h1>
		<p class="mt-6 whitespace-nowrap text-[min(1.02rem,2vw)] leading-relaxed text-fg-muted">{mixed ? t.subMixed : t.sub}</p>

		<!-- Pencarian memakai bahasa yang sama dengan rel hero: garis bawah
			tipis, bukan kotak — satu produk, satu cara mencari. -->
		<!-- Pencarian di kiri, urutan (Terbaru/Terlama) + jumlah di kanan — satu
			baris sejajar; di layar sempit urutan turun ke bawah pencarian. -->
		<div class="mt-8 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between sm:gap-8" data-no-hover-sound data-no-click-sound>
			<SearchField
				bind:value={q}
				placeholder={mixed ? t.searchPlaceholderMixed : t.searchPlaceholder}
				label={mixed ? t.searchLabelMixed : t.searchLabel}
				clearLabel={t.clear}
				submitLabel={t.searchSubmit}
				onsubmit={syncUrl}
				onclear={clearSearch}
				class="min-w-0 sm:flex-1"
			/>
			<div class="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-3 sm:justify-end">
				<span class="mr-1 hidden whitespace-nowrap text-xs text-fg-muted sm:inline" aria-live="polite">
					{total || photos.length} {t.count}
				</span>
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
				<SortSelect
					value={sort}
					label={t.sortLabel}
					options={[
						{ value: "newest", label: t.newest },
						{ value: "popular", label: t.popular },
					]}
					onchange={(v) => ((sort = v), void load())}
				/>
			</div>
		</div>

		{#if query}
			<p class="mt-5 flex flex-wrap items-baseline gap-2 text-sm text-fg-muted">
				<span class="text-xs">{total} {t.count}</span>
			</p>
		{/if}
	</div>
</section>

<!-- Rel filter: bisa digeser jempol, tanpa scrollbar. Di mobile dibuat
	ramping (chip 38px) supaya tidak mendominasi layar; 44px penuh di sm+. -->
<div class="sticky top-[calc(var(--banner-h,0px)+var(--nav-h))] z-30 border-y border-hair bg-bg/85 backdrop-blur-md sm:backdrop-blur-xl" data-no-hover-sound data-no-click-sound>
	<div class="rail-scroll mx-auto flex max-w-[1500px] items-center gap-1.5 overflow-x-auto px-[max(1.5rem,env(safe-area-inset-left))] py-1.5 sm:gap-2 sm:px-6 sm:py-3 lg:px-10">
		{@render chip(!cat, t.all, () => ((cat = undefined), (catPicked = true)))}
		{#each categories as c (c.id)}
			{@render chip(cat === c.name, c.name, () => ((cat = c.name), (catPicked = true)))}
		{/each}
	</div>
</div>

<section class="mx-auto max-w-[1500px] px-6 py-12 lg:px-10 lg:py-16" data-no-hover-sound data-no-click-sound>
	{#if photos.length > 0}
		<!-- Tanpa animasi: kartu langsung tampil, tanpa parallax kolom maupun
			penyingkapan saat digulir. -->
		<Masonry {photos} reduceMotion />
		<!-- Penjaga infinite scroll: mentok bawah → 20 berikutnya. -->
		<div bind:this={sentinel} aria-hidden="true" class="h-px w-full"></div>
		{#if hasMore || loadingMore}
			<!-- Ruang indikator selalu ada selama masih ada halaman berikut, jadi
				saat mentok bawah animasi muat langsung terlihat di sini. -->
			<div class="pg-loader" class:is-on={loadingMore} role="status" aria-live="polite">
				<span class="pg-dot" style="animation-delay: 0ms"></span>
				<span class="pg-dot" style="animation-delay: 160ms"></span>
				<span class="pg-dot" style="animation-delay: 320ms"></span>
				<span class="pg-label">{loadingMore ? (mixed ? t.loadingMixed : t.loadingPhotos) : ""}</span>
			</div>
		{/if}
	{:else}
		<p class="py-24 text-center font-display text-2xl font-light text-fg-muted">{t.noResults}</p>
	{/if}
</section>

<style>
	/* Indikator muat infinite scroll: tiga titik safelight berdenyut. */
	.pg-loader {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 2.5rem 0 3rem;
		opacity: 0;
		transition: opacity 0.25s ease;
	}
	.pg-loader.is-on {
		opacity: 1;
	}
	.pg-label {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip: rect(0 0 0 0);
	}
	.pg-dot {
		width: 0.55rem;
		height: 0.55rem;
		border-radius: 999px;
		background: var(--safelight);
		animation: pg-pulse 0.9s ease-in-out infinite;
	}
	@keyframes pg-pulse {
		0%, 100% { opacity: 0.25; transform: scale(0.8); }
		50% { opacity: 1; transform: scale(1); }
	}
	@media (prefers-reduced-motion: reduce) {
		.pg-dot { animation: none; opacity: 0.7; }
	}
</style>
