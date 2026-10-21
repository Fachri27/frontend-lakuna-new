<script lang="ts">
	/**
	 * Halaman Sounds — dibuat semirip mungkin dengan coveomusic.com (keputusan pemilik), isinya Lakuna:
	 *  1. hero korsel sampul (SoundWheel);
	 *  2. bagian cerita: kicker + judul serif miring, paragraf 366 px di tengah, dua foto Lakuna mengapit dengan
	 *     benda (piringan hitam & CD) menyembul di bawahnya;
	 *  3. kepala katalog: "Katalog / Seluruh karya" dengan jejak gambar yang mengikuti kursor (gulir di ponsel);
	 *  4. daftar semua audio (SoundRow) — ditambah saringan jenis & cari yang ditulis sehalus teks acuan;
	 *  5. ucapan terima kasih: foto besar + tanda tangan + teks kapital rata kanan-kiri.
	 * Palet terang & font dipasang di routes/sounds/+layout.svelte.
	 */
	import { untrack } from "svelte";
	import { goto } from "$app/navigation";
	import { i18n } from "$lib/i18n.svelte";
	import { fetchPhotos, fetchSounds, type Sound } from "$lib/data";
	import ApiImage from "./ApiImage.svelte";
	import SoundRow from "./SoundRow.svelte";
	import SoundWheel from "./SoundWheel.svelte";

	let { initialQ, initialKind }: { initialQ?: string; initialKind?: string; initialCat?: string } = $props();

	const copy = {
		id: {
			aboutKicker: "Seni merekam bunyi dan",
			aboutTitle: "Cerita",
			about: [
				"Setiap tempat di Nusantara punya bunyinya sendiri. Hujan yang jatuh di kanopi hutan, ombak yang pecah di karang, riuh pasar pagi, dan gamelan yang mengalun dari balai desa — semuanya cerita yang bisa didengar.",
				"Lakuna lahir sebagai arsip visual: foto dan video dari fotografer serta videografer lokal. Sounds melanjutkannya ke telinga, dengan rekaman lapangan, efek suara, dan musik yang disusun para kreator dari berbagai pulau.",
				"Setiap audio dikurasi sebelum tayang. Pratinjaunya bisa didengar di sini — MP3 dengan denting penanda halus — dan berkas aslinya (WAV, FLAC, atau MP3 kualitas penuh) tersedia setelah dilisensikan.",
				"Pakai untuk video, podcast, iklan, gim, atau karya apa pun. Lisensi Standar dibayar sekali dan berlaku selamanya; paket berlangganan memberi kuota unduhan bulanan.",
			],
			catKicker: "Katalog",
			catTitle: "Seluruh karya",
			order: { newest: "Semua audio — terbaru dulu", popular: "Semua audio — paling banyak diunduh" },
			all: "Semua", music: "Musik", sfx: "Efek suara", newest: "Terbaru", popular: "Populer",
			search: "Cari audio…", searchLabel: "Cari musik atau efek suara", clear: "Hapus",
			more: "Muat lebih banyak", loading: "Memuat…",
			empty: "Belum ada audio di arsip. Koleksi musik dan efek suara segera hadir.",
			noResults: "Tidak ada audio yang cocok.",
			ackTitle: "Terima kasih",
			ack: ["Untuk para ", "perekam lapangan", ", para ", "komposer", ", para ", "kontributor", ", dan para ", "pendengar", " — yang menjaga bunyi Nusantara tetap hidup, dan memberinya tempat di setiap karya."],
			signature: "Lakuna",
		},
		en: {
			aboutKicker: "The art of recording sound and",
			aboutTitle: "Stories",
			about: [
				"Every place in the archipelago has its own sound. Rain on the forest canopy, waves breaking on the reef, a busy morning market, gamelan drifting from the village hall — all of them stories you can hear.",
				"Lakuna began as a visual archive: photos and videos from local photographers and videographers. Sounds carries it to the ear, with field recordings, sound effects and music arranged by creators from across the islands.",
				"Every sound is curated before it goes live. Listen to the preview here — an MP3 with a soft marker chime — and the original file (WAV, FLAC or full-quality MP3) is yours once licensed.",
				"Use it for videos, podcasts, ads, games or any project. A Standard licence is paid once and lasts forever; subscriptions give a monthly download quota.",
			],
			catKicker: "Catalogue",
			catTitle: "The complete works",
			order: { newest: "All sounds — ordered by newest first", popular: "All sounds — most downloaded first" },
			all: "All", music: "Music", sfx: "Sound effects", newest: "Newest", popular: "Popular",
			search: "Search sounds…", searchLabel: "Search music or sound effects", clear: "Clear",
			more: "Load more", loading: "Loading…",
			empty: "No sounds in the archive yet. Music and sound effects are coming soon.",
			noResults: "No matching sounds.",
			ackTitle: "Acknowledgements",
			ack: ["For the ", "field recordists", ", the ", "composers", ", the ", "contributors", ", and the ", "listeners", " — who keep the sounds of the archipelago alive, and give them a place in every work."],
			signature: "Lakuna",
		},
	};
	const lang = $derived(i18n.lang);
	const t = $derived(copy[lang]);

	const kindFrom = (v?: string) => (v === "music" ? "MUSIC" : v === "sfx" ? "SFX" : undefined);
	// Nilai awal dari URL (juga untuk SSR); perubahan URL berikutnya disalin $effect di bawah.
	let kind = $state<"MUSIC" | "SFX" | undefined>(untrack(() => kindFrom(initialKind)));
	let sq = $state(untrack(() => initialQ ?? ""));
	let query = $state(untrack(() => (initialQ ?? "").trim()));
	let sort = $state<"newest" | "popular">("newest");

	let sounds = $state<Sound[]>([]);
	let total = $state(0);
	let pageNo = $state(1);
	let totalPages = $state(0);
	let loading = $state(true);
	/** Sampul korsel hero: audio terbaru, tak ikut saringan katalog. */
	let wheel = $state<Sound[]>([]);
	let wheelLoaded = $state(false);
	/** Foto arsip Lakuna untuk bagian cerita, jejak kursor, dan ucapan terima kasih. */
	let photos = $state<string[]>([]);

	$effect(() => {
		sq = initialQ ?? "";
		query = (initialQ ?? "").trim();
		kind = kindFrom(initialKind);
	});
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
		void goto(`${url.pathname}${url.search}`, { replaceState: true, keepFocus: true, noScroll: true });
	}

	$effect(() => {
		fetchSounds({ limit: 24 })
			.then((r) => (wheel = r.sounds))
			.catch(() => {})
			.finally(() => (wheelLoaded = true));
		fetchPhotos({ type: "FOTO", limit: 16 })
			.then((r) => (photos = r.photos.map((p) => p.thumbUrl).filter((u): u is string => !!u && !u.includes("picsum.photos"))))
			.catch(() => {});
	});

	let seq = 0;
	function load(page = 1) {
		const my = ++seq;
		loading = true;
		return fetchSounds({ kind, search: query || undefined, sort, page, limit: 30 })
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
		void query;
		void sort;
		void load(1);
	});

	// ── Jejak gambar di kepala katalog (acuan: gambar muncul mengikuti kursor, lalu memudar) ──
	const trailPool = $derived([...photos, ...wheel.map((s) => s.cover).filter((u): u is string => !!u)]);
	type TrailImg = { id: number; x: number; y: number; r: number; src: string; tall: boolean };
	let trail = $state<TrailImg[]>([]);
	let trailSeq = 0;
	let last = { x: -999, y: -999 };
	let headEl: HTMLElement | undefined = $state();
	function spawn(x: number, y: number) {
		if (!trailPool.length) return;
		const id = ++trailSeq;
		const src = trailPool[id % trailPool.length]!;
		trail = [...trail.slice(-14), { id, x, y, r: Math.round((Math.random() - 0.5) * 24), src, tall: id % 3 !== 0 }];
		setTimeout(() => (trail = trail.filter((i) => i.id !== id)), 1500);
	}
	function onMove(e: PointerEvent) {
		if (e.pointerType !== "mouse" || !headEl) return;
		const r = headEl.getBoundingClientRect();
		const x = e.clientX - r.left;
		const y = e.clientY - r.top;
		if (Math.hypot(x - last.x, y - last.y) < 80) return;
		last = { x, y };
		spawn(x, y);
	}
	// Ponsel: gulir melewati kepala katalog menebar gambar dari kiri ke kanan bergantian.
	$effect(() => {
		if (!window.matchMedia("(pointer: coarse)").matches || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
		let lastAt = 0;
		let x = 60;
		let dir = 1;
		const on = () => {
			const el = headEl;
			if (!el) return;
			const r = el.getBoundingClientRect();
			if (r.bottom < 0 || r.top > window.innerHeight) return;
			const now = Date.now();
			if (now - lastAt < 120) return;
			lastAt = now;
			x += dir * 46;
			if (x > r.width - 60 || x < 60) dir *= -1;
			spawn(x, window.innerHeight / 2 - r.top);
		};
		window.addEventListener("scroll", on, { passive: true });
		return () => window.removeEventListener("scroll", on);
	});
</script>

<div class="cv" data-no-hover-sound data-no-click-sound>
	<!-- ───────── 1. Hero ───────── -->
	{#if wheel.length > 0}
		<SoundWheel sounds={wheel} />
	{:else}
		<section class="cv-empty-hero">
			<div class="cv-empty-hero__avatar"><img src="/logo1-sm.png" alt="" width="200" height="36" /></div>
			<h1 class="cv-empty-hero__title">Lakuna Sounds</h1>
			{#if wheelLoaded}<p class="cv-muted">{t.empty}</p>{/if}
		</section>
	{/if}

	<!-- ───────── 2. Cerita ───────── -->
	<section class="cv-about">
		<div class="cv-wrap-l cv-about__wrap">
			{#if photos[1]}
				<div class="cv-float cv-float--right">
					<div class="cv-float__img cv-float__img--square"><ApiImage src={photos[1]} alt="" fill class="object-cover object-top" /></div>
					<span class="cv-obj cv-obj--cd" aria-hidden="true"></span>
				</div>
			{/if}
			<div class="cv-about__content">
				<h3 class="cv-h3">{t.aboutKicker} <span>{t.aboutTitle}</span></h3>
				{#each t.about as p, i (i)}<p>{p}</p>{/each}
			</div>
			{#if photos[0]}
				<div class="cv-float cv-float--left">
					<div class="cv-float__img cv-float__img--tall"><ApiImage src={photos[0]} alt="" fill class="object-cover object-top" /></div>
					<span class="cv-obj cv-obj--vinyl" aria-hidden="true"><span></span></span>
				</div>
			{/if}
		</div>
	</section>

	<!-- ───────── 3. Kepala katalog + jejak gambar ───────── -->
	<section class="cv-dischead" bind:this={headEl} onpointermove={onMove} aria-labelledby="cv-katalog">
		{#each trail as g (g.id)}
			<span
				class="cv-trail"
				class:cv-trail--tall={g.tall}
				style={`left:${g.x}px;top:${g.y}px;--r:${g.r}deg`}
				aria-hidden="true"
			>
				<ApiImage src={g.src} alt="" fill class="object-cover object-top" />
			</span>
		{/each}
		<div class="cv-wrap-l cv-dischead__wrap">
			<h3 class="cv-h3" id="cv-katalog">{t.catKicker} <span>{t.catTitle}</span></h3>
		</div>
	</section>

	<!-- ───────── 4. Daftar ───────── -->
	<section id="daftar-audio" class="cv-discography">
		<div class="cv-wrap-l">
			<h2 class="cv-h2">{sort === "popular" ? t.order.popular : t.order.newest}</h2>

			<!-- Saringan — ditulis sehalus teks kepala daftar acuan. -->
			<div class="cv-filters">
				<div class="cv-filters__group" role="radiogroup" aria-label={t.searchLabel}>
					{#each [[undefined, t.all], ["MUSIC", t.music], ["SFX", t.sfx]] as const as [k, label] (label)}
						<button type="button" role="radio" aria-checked={kind === k} class="cv-filter" onclick={() => ((kind = k), syncUrl())}>{label}</button>
					{/each}
					<span class="cv-filters__sep" aria-hidden="true">/</span>
					{#each [["newest", t.newest], ["popular", t.popular]] as const as [k, label] (k)}
						<button type="button" role="radio" aria-checked={sort === k} class="cv-filter" onclick={() => (sort = k)}>{label}</button>
					{/each}
				</div>
				<form class="cv-search" role="search" onsubmit={(e) => (e.preventDefault(), syncUrl())}>
					<input type="search" bind:value={sq} placeholder={t.search} aria-label={t.searchLabel} />
					{#if sq}<button type="button" aria-label={t.clear} onclick={() => ((sq = ""), (query = ""), syncUrl())}>×</button>{/if}
				</form>
			</div>

			{#if loading && sounds.length === 0}
				<p class="cv-state cv-mono cv-muted">{t.loading}</p>
			{:else if sounds.length === 0}
				<p class="cv-state cv-muted">{query || kind ? t.noResults : t.empty}</p>
			{:else}
				<ul class="cv-releases">
					{#each sounds as s, i (s.id)}
						<SoundRow sound={s} queue={sounds} index={sort === "newest" && !query && !kind ? total - i - 1 : undefined} />
					{/each}
				</ul>
				{#if pageNo < totalPages}
					<div class="cv-more">
						<button type="button" class="cv-btn" disabled={loading} onclick={() => load(pageNo + 1)}>{loading ? t.loading : t.more}</button>
					</div>
				{/if}
			{/if}
		</div>
	</section>

	<!-- ───────── 5. Terima kasih ───────── -->
	<section class="cv-ack-section">
		<div class="cv-wrap-l cv-ack">
			{#if photos[2]}
				<div class="cv-ack__image"><ApiImage src={photos[2]} alt="" fill class="object-cover object-top" /></div>
			{/if}
			<div class="cv-ack__container">
				<h3 class="cv-h3 cv-ack__title">{t.ackTitle}</h3>
				<div class="cv-signature">
					<span>{t.signature}</span>
					<div class="cv-signature__line"></div>
				</div>
				<p>{#each t.ack as part, k (k)}{#if k % 2 === 1}<span>{part}</span>{:else}{part}{/if}{/each}</p>
			</div>
		</div>
	</section>
</div>

<style>
	.cv {
		color: #1d1812;
		font-family: "Inter", sans-serif;
		font-size: 12px;
		overflow-x: clip;
	}
	.cv-muted {
		color: #524d46;
	}
	.cv-mono {
		font-family: ui-monospace, Menlo, Monaco, monospace;
	}
	.cv-wrap-l {
		position: relative;
		width: calc(100% - 10vw);
		margin: auto;
	}
	.cv-h3 {
		margin: 0;
		text-align: center;
		font-weight: 600;
		text-transform: uppercase;
		font-size: 1em;
	}
	.cv-h3 span {
		display: block;
		font-family: "Instrument Serif", serif;
		font-style: italic;
		font-weight: 400;
		font-size: 5em;
		letter-spacing: -0.02em;
		line-height: 1.25;
		text-transform: none;
	}
	.cv-h2 {
		margin: 0;
		text-align: center;
		font-size: 1em;
		font-weight: 600;
		text-transform: uppercase;
		color: #524d46;
	}

	/* ── Hero kosong ── */
	.cv-empty-hero {
		display: flex;
		min-height: 70vh;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 1.5em;
		padding: calc(var(--banner-h, 0px) + var(--nav-h) + 2em) 2em 2em;
		text-align: center;
	}
	.cv-empty-hero__avatar {
		display: grid;
		height: 100px;
		width: 100px;
		place-items: center;
		border-radius: 100%;
		background: #fe5416;
	}
	.cv-empty-hero__avatar img {
		width: 78%;
		height: auto;
		filter: brightness(0) invert(1);
	}
	.cv-empty-hero__title {
		margin: 0;
		font-size: 1.2em;
		font-weight: 600;
		text-transform: uppercase;
	}

	/* ── Cerita ── */
	.cv-about {
		margin-top: 2em;
	}
	.cv-about__wrap {
		min-height: 60em;
	}
	.cv-about__content {
		position: relative;
		z-index: 2;
		width: 80vw;
		max-width: 366px;
		margin: 0 auto;
	}
	.cv-about__content .cv-h3 {
		margin-bottom: 4em;
	}
	.cv-about__content p {
		margin: 3em 0;
		color: #524d46;
		line-height: 2em;
	}
	.cv-float {
		position: absolute;
		width: 24vw;
	}
	.cv-float--right {
		right: 0;
		top: 20em;
	}
	.cv-float--left {
		left: 0;
		top: 30em;
	}
	.cv-float__img {
		position: relative;
		width: 100%;
		overflow: hidden;
		border-radius: 12px;
		background: #dddddd;
	}
	.cv-float__img--tall {
		aspect-ratio: 346 / 448;
	}
	.cv-float__img--square {
		aspect-ratio: 1;
	}
	/* Benda yang menyembul di bawah foto (acuan: speaker & kamera polaroid). */
	.cv-obj {
		position: relative;
		top: -10em;
		left: 6em;
		display: block;
		height: 220px;
		width: 220px;
		margin: 0 auto -10em;
		border-radius: 50%;
		pointer-events: none;
	}
	.cv-obj--vinyl {
		background:
			radial-gradient(circle, transparent 0 17%, rgba(255, 255, 255, 0.06) 17.5% 18%, transparent 18.5%),
			repeating-radial-gradient(circle, #141414 0 2px, #1d1d1d 2px 4px);
		box-shadow: 0 30px 50px -20px rgba(0, 0, 0, 0.55);
		transform: rotate(-12deg);
	}
	.cv-obj--vinyl span {
		position: absolute;
		inset: 33%;
		border-radius: 50%;
		background: #fe5416;
		box-shadow: inset 0 0 0 9px rgba(0, 0, 0, 0.12);
	}
	.cv-obj--vinyl span::after {
		content: "";
		position: absolute;
		inset: 44%;
		border-radius: 50%;
		background: #eeeeee;
	}
	.cv-obj--cd {
		height: 190px;
		width: 190px;
		left: -5em;
		background:
			radial-gradient(circle, #eeeeee 0 9%, rgba(255, 255, 255, 0.9) 9.5% 16%, transparent 16.5%),
			conic-gradient(from 140deg, #b6d0f7, #eef4e1 82deg, #e2c1f9 155deg, #bfd1f9 209deg, #fafcfe 252deg, #bae4e2 288deg, #8c6be3 341deg, #c0d7f3);
		box-shadow:
			0 0 0 1px rgba(0, 0, 0, 0.06),
			0 30px 50px -22px rgba(0, 0, 0, 0.4);
	}

	/* ── Kepala katalog ── */
	.cv-dischead {
		position: relative;
		width: 100%;
		margin: 12em 0;
		padding: 18em 0;
	}
	.cv-dischead__wrap {
		pointer-events: none;
		z-index: 2;
	}
	.cv-dischead__wrap::after {
		content: "";
		position: absolute;
		top: 50%;
		left: 0;
		z-index: -1;
		height: 400px;
		width: 100%;
		transform: translateY(-50%);
		filter: blur(20px);
		background-image: radial-gradient(100% 50% at 50% 50%, #eeeeee 40%, rgba(238, 238, 238, 0) 100%);
	}
	.cv-trail {
		position: absolute;
		z-index: 3;
		width: 200px;
		height: 150px;
		overflow: hidden;
		border-radius: 4px;
		pointer-events: none;
		will-change: transform;
		transform: translate(-50%, -50%) rotate(var(--r)) scale(0.6);
		opacity: 0;
		box-shadow: 0 18px 40px -20px rgba(0, 0, 0, 0.5);
		animation: cv-trail 1.45s cubic-bezier(0.22, 1, 0.36, 1) forwards;
	}
	.cv-trail--tall {
		width: 150px;
		height: 200px;
	}
	@keyframes cv-trail {
		0% {
			opacity: 0;
			transform: translate(-50%, -50%) rotate(var(--r)) scale(0.6);
		}
		31% {
			opacity: 1;
			transform: translate(-50%, -50%) rotate(var(--r)) scale(1);
		}
		48% {
			opacity: 1;
			transform: translate(-50%, -50%) rotate(var(--r)) scale(1);
		}
		100% {
			opacity: 0;
			transform: translate(-50%, calc(-50% + 14px)) rotate(var(--r)) scale(0.9);
		}
	}

	/* ── Daftar ── */
	.cv-discography {
		margin: 1em auto;
	}
	.cv-filters {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: center;
		gap: 1.2em 2.4em;
		margin-top: 2.2em;
	}
	.cv-filters__group {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: center;
		gap: 0.4em 1.4em;
	}
	.cv-filters__sep {
		color: rgba(0, 0, 0, 0.2);
	}
	.cv-filter {
		padding: 0.3em 0;
		border: 0;
		border-bottom: 1px dotted transparent;
		background: none;
		color: #524d46;
		font: inherit;
		font-weight: 600;
		text-transform: uppercase;
		cursor: pointer;
		transition: color 0.2s ease;
	}
	.cv-filter:hover,
	.cv-filter[aria-checked="true"] {
		color: #1d1812;
	}
	.cv-filter[aria-checked="true"] {
		border-bottom-color: rgba(0, 0, 0, 0.35);
	}
	.cv-search {
		display: flex;
		align-items: center;
		border-bottom: 1px dotted rgba(0, 0, 0, 0.2);
	}
	.cv-search input {
		width: 14em;
		padding: 0.4em 0;
		border: 0;
		background: none;
		color: #1d1812;
		font-family: ui-monospace, Menlo, Monaco, monospace;
		font-size: 0.95em;
		outline: none;
	}
	.cv-search input::placeholder {
		color: #8a857e;
	}
	.cv-search input::-webkit-search-cancel-button {
		display: none;
	}
	.cv-search button {
		border: 0;
		background: none;
		color: #524d46;
		font-size: 1.2em;
		cursor: pointer;
	}
	.cv-releases {
		width: 100%;
		margin: 4em 0 0;
		padding: 0;
		list-style: none;
	}
	.cv-state {
		margin: 6em 0;
		text-align: center;
		font-size: 1.1em;
	}
	.cv-more {
		display: flex;
		justify-content: center;
		margin-top: 3em;
	}
	.cv-btn {
		display: flex;
		align-items: center;
		padding: 1em 1.8em;
		border: 0;
		border-radius: 40px;
		background: rgba(0, 0, 0, 0.1);
		color: #1d1812;
		font-family: ui-monospace, Menlo, Monaco, monospace;
		font-size: 0.85em;
		text-transform: uppercase;
		cursor: pointer;
		backdrop-filter: blur(10px);
		transition: background 0.4s ease;
	}
	.cv-btn:hover {
		background: rgba(0, 0, 0, 0.2);
	}

	/* ── Terima kasih ── */
	.cv-ack-section {
		margin: 12em auto;
	}
	.cv-ack {
		display: flex;
		align-items: flex-end;
		justify-content: flex-start;
		gap: 24em;
	}
	.cv-ack__image {
		position: relative;
		width: 50%;
		aspect-ratio: 648 / 590;
		overflow: hidden;
		border-radius: 12px;
		background: #dddddd;
	}
	.cv-ack__container {
		width: 100%;
		max-width: 250px;
		text-align: center;
	}
	.cv-signature {
		margin: 2em auto;
	}
	.cv-signature span {
		display: inline-block;
		font-family: "Mrs Saint Delafield", cursive;
		font-size: 4.6em;
		line-height: 1;
		transform: translateY(22%) rotate(-4deg);
	}
	.cv-signature__line {
		height: 1px;
		width: 80%;
		max-width: 220px;
		margin: auto;
		background: #d4d4d4;
	}
	.cv-ack__container p {
		margin: 0;
		color: #524d46;
		font-size: 0.7em;
		text-align: justify;
		text-transform: uppercase;
	}
	.cv-ack__container p span {
		font-weight: 600;
	}

	@media (max-width: 768px) {
		.cv-wrap-l {
			width: calc(100% - 24px);
		}
		.cv-h3 span {
			font-size: 4em;
		}
		.cv-about__wrap {
			display: grid;
			grid-template-rows: auto auto auto;
			min-height: 0;
		}
		.cv-float {
			position: relative;
			width: 100%;
		}
		.cv-float--left {
			left: auto;
			top: 5em;
			grid-row: 1;
		}
		.cv-float--right {
			right: auto;
			top: 5em;
			grid-row: 3;
		}
		.cv-about__content {
			grid-row: 2;
			margin-top: 6em;
		}
		.cv-obj {
			left: 3em;
		}
		.cv-dischead {
			margin: 6em 0;
			padding: 12em 0;
		}
		.cv-ack {
			flex-direction: column;
			align-items: center;
			gap: 6em;
		}
		.cv-ack__image {
			width: 100%;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.cv-trail {
			display: none;
		}
	}
</style>
