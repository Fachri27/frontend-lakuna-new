<script lang="ts">
	/**
	 * Karusel cakram Sounds (<DiscCascadeCarousel>) untuk section Sounds di landing (HomeSounds). Halaman /sounds
	 * sengaja tanpa karusel (keputusan pemilik) — di sana daftar lengkap. Tiap audio terbaru (16) jadi satu cakram bercetak: sampulnya
	 * label, judulnya di busur atas (musik) atau bertumpuk (efek suara), kredit di busur bawah. Cakram terpilih
	 * diputar lewat tombol di tengah bawah (atau klik cakramnya); yang berbunyi berputar cepat. Selama ada yang
	 * berbunyi, berpindah cakram ikut memindah pemutaran (seperti jukebox), dan lagu yang selesai lanjut ke
	 * cakram berikutnya. Belum ada audio → cakram hias berlabel foto arsip (inert).
	 *
	 * Pemutaran lewat `player` bersama (satu <audio> untuk seluruh situs). `landing`: landing tak punya bilah
	 * pemutar, jadi pratinjau dijeda saat karusel keluar layar dan dihentikan saat meninggalkan landing (kecuali ke
	 * /sounds). Tinggi = 100% pembungkus — induk yang menentukan (lihat HomeSounds).
	 */
	import { untrack } from "svelte";
	import { beforeNavigate } from "$app/navigation";
	import { i18n } from "$lib/i18n.svelte";
	import { player } from "$lib/soundPlayer.svelte";
	import { fetchPhotos, fetchSounds, fmtDuration, type Photo, type Sound } from "$lib/data";
	import ApiImage from "./ApiImage.svelte";
	import DiscCascadeCarousel from "./ui/DiscCascadeCarousel.svelte";
	import type { DiscCascadeItem } from "./ui/disc-cascade";

	let {
		landing = false,
		filters: showFilters = true,
		// Cakram ikut TINGGI layar (bukan hanya lebar): judul section + karusel harus muat satu layar.
		discSize = "clamp(160px, min(36svh, 46vw), 400px)",
		loaded = $bindable(false),
		count = $bindable(0),
		class: className = "",
	}: {
		landing?: boolean;
		/** Tombol filter Semua/Musik/Efek suara di nav karusel. */
		filters?: boolean;
		discSize?: string;
		loaded?: boolean;
		count?: number;
		class?: string;
	} = $props();

	const copy = {
		id: {
			all: "Semua",
			music: "Musik",
			sfx: "Efek suara",
			index: "Daftar",
			hint: "Geser · ← →",
			kind: "Jenis",
			length: "Durasi",
			tempo: "Tempo",
			by: "Pembuat",
			category: "Kategori",
			play: "Putar pratinjau",
			pause: "Jeda pratinjau",
			seek: "Posisi putar",
			of: "dari",
			license: "Lisensikan",
			prev: "Audio sebelumnya",
			next: "Audio berikutnya",
			region: "Katalog audio",
			failed: "Pratinjau gagal dimuat.",
		},
		en: {
			all: "All",
			music: "Music",
			sfx: "Sound effects",
			index: "Tracklist",
			hint: "Drag · ← →",
			kind: "Type",
			length: "Length",
			tempo: "Tempo",
			by: "By",
			category: "Category",
			play: "Play preview",
			pause: "Pause preview",
			seek: "Playback position",
			of: "of",
			license: "License",
			prev: "Previous audio",
			next: "Next audio",
			region: "Audio catalogue",
			failed: "The preview didn't load.",
		},
	};
	const lang = $derived(i18n.lang);
	const t = $derived(copy[lang]);

	let sounds = $state<Sound[]>([]);

	// Sekali saat tampil di peramban: 16 audio terbaru (musik & efek suara).
	$effect(() => {
		let off = false;
		fetchSounds({ limit: 16 })
			.then((r) => {
				if (!off) {
					sounds = r.sounds;
					count = r.sounds.length;
				}
			})
			.catch(() => {})
			.finally(() => {
				if (!off) loaded = true;
			});
		return () => {
			off = true;
		};
	});

	type Filter = "all" | "MUSIC" | "SFX";
	let filter = $state<Filter>("all");
	let idx = $state(0);
	const list = $derived(filter === "all" ? sounds : sounds.filter((s) => s.kind === filter));

	const discs = $derived<DiscCascadeItem[]>(
		list.map((s) => {
			const cats = lang === "en" && s.categoriesEn?.length ? s.categoriesEn : s.categories;
			return {
				key: s.id,
				title: s.title[lang],
				// Musik: judul di busur atas; efek suara: bertumpuk di atas lubang — jenisnya terbaca dari cakramnya.
				labelStyle: s.kind === "SFX" ? "block" : "arc",
				credits: [
					{ label: t.kind, value: s.kind === "SFX" ? t.sfx : t.music },
					{ label: t.length, value: fmtDuration(s.duration) },
					...(s.bpm ? [{ label: t.tempo, value: `${s.bpm} BPM` }] : []),
					{ label: t.by, value: s.author },
					...(cats.length ? [{ label: t.category, value: cats.slice(0, 2) }] : []),
				],
			};
		})
	);

	const filters = $derived(
		(
			[
				["all", t.all],
				["MUSIC", t.music],
				["SFX", t.sfx],
			] as [Filter, string][]
		).filter(([k]) => k === "all" || sounds.some((s) => s.kind === k))
	);
	function setFilter(f: Filter) {
		if (f === filter) return;
		filter = f;
		idx = 0;
	}
	const durationOf = (key?: string) => {
		const s = list.find((x) => x.id === key);
		return s ? fmtDuration(s.duration) : undefined;
	};

	const playingIndex = $derived(player.playing && player.track ? list.findIndex((s) => s.id === player.track?.id) : -1);

	function toggle(s: Sound) {
		player.play(s, list);
	}

	// Jukebox: selama ada yang berbunyi, cakram yang baru dipilih (setelah berhenti bergeser) ikut diputar.
	let followT = 0;
	function onIndex(i: number) {
		idx = i;
		window.clearTimeout(followT);
		if (!player.playing) return;
		followT = window.setTimeout(() => {
			const s = list[idx];
			if (s && player.playing && !player.isCurrent(s.id)) player.play(s, list);
		}, 450);
	}
	// Sebaliknya: lagu selesai → pemutar lanjut ke berikutnya → karusel ikut ke cakram itu. Hanya bereaksi pada
	// pergantian lagu (bukan pada idx), supaya geseran pengguna tak ditarik balik ke lagu yang sedang berbunyi.
	$effect(() => {
		const id = player.track?.id;
		if (!id) return;
		untrack(() => {
			const i = list.findIndex((s) => s.id === id);
			if (i >= 0 && i !== idx) idx = i;
		});
	});

	function seek(s: Sound, e: Event) {
		const v = Number((e.currentTarget as HTMLInputElement).value) / 1000;
		if (!player.isCurrent(s.id)) player.play(s, list);
		player.seek(v);
	}

	/** Audio yang sedang dimuat pemutar berasal dari section ini. */
	const ours = () => !!player.track && sounds.some((s) => s.id === player.track?.id);

	// Landing: keluar layar → jeda (tak ada bilah pemutar di sana untuk menghentikannya).
	let root = $state<HTMLElement | null>(null);
	$effect(() => {
		const el = root;
		if (!landing || !el || typeof IntersectionObserver === "undefined") return;
		const io = new IntersectionObserver(([e]) => {
			if (!e.isIntersecting && player.playing && ours()) player.pause();
		});
		io.observe(el);
		return () => io.disconnect();
	});

	// Landing: pergi → hentikan, kecuali ke /sounds (bilah pemutarnya melanjutkan audio yang sama). Di /sounds sendiri
	// penghentian diurus routes/sounds/+layout.svelte.
	let toSounds = false;
	beforeNavigate(({ to }) => {
		const p = to?.url.pathname ?? "";
		toSounds = p === "/sounds" || p.startsWith("/sounds/");
	});
	$effect(() => () => {
		window.clearTimeout(followT);
		if (landing && !toSounds && ours()) player.close();
	});

	// Belum ada audio: cakram hias berlabel foto arsip Lakuna (tanpa judul, tak bisa difokus — inert), supaya
	// tetap senada dengan situs; motif warna hanya bila foto pun tak ada / selama memuat.
	let decoPhotos = $state<Photo[]>([]);
	$effect(() => {
		if (!loaded || sounds.length) return;
		let off = false;
		fetchPhotos({ type: "FOTO", limit: 8 })
			.then((r) => {
				if (!off) decoPhotos = r.photos.filter((ph) => ph.thumbUrl);
			})
			.catch(() => {});
		return () => {
			off = true;
		};
	});
	const blanks = $derived<DiscCascadeItem[]>(
		decoPhotos.length
			? decoPhotos.map((ph) => ({ key: ph.id, title: "", label: "", fine: "" }))
			: Array.from({ length: 6 }, (_, i) => ({ key: "b" + i, title: "", label: "", fine: "" }))
	);
	// Latar sama dengan halaman (hitam --bg), tanpa sorotan abu — tak ada sambungan terlihat dengan section di atasnya.
	const STAGE_BG = "var(--bg)";
</script>

<!-- Mulai md, pemutar (footer) turun ke dekat tepi bawah: di tengah ia tak bertabrakan dengan tombol Bantuan /
	ke-atas di pojok. Ponsel: tetap di atas tombol-tombol itu (--dcc-bottom induk). -->
<div bind:this={root} class="relative h-full md:[--dcc-foot-bottom:clamp(1rem,3vh,2rem)] {className}">
	{#if discs.length}
		<DiscCascadeCarousel
			items={discs}
			height="100%"
			{discSize}
			background={STAGE_BG}
			frame={false}
			fade
			mark="lakuna sounds"
			serif="var(--font-display)"
			nav={showFilters ? filters.map(([k, label]) => ({ label, current: filter === k, onclick: () => setFilter(k) })) : []}
			indexLabel={t.index}
			menuMeta={(it) => durationOf(it.key)}
			loop
			autoplay={player.playing ? 0 : 4200}
			index={idx}
			defaultIndex={0}
			onIndexChange={onIndex}
			onSelect={(_, i) => list[i] && toggle(list[i])}
			{playingIndex}
			reviews={false}
			controls={false}
			hint={t.hint}
			ariaLabel={t.region}
			navLabel={t.region}
			prevLabel={t.prev}
			nextLabel={t.next}
		>
			{#snippet art(_item, i)}
				{@const s = list[i]}
				{#if s?.cover}
					{#key s.id}<ApiImage src={s.cover} alt="" fill class="object-cover object-top" />{/key}
				{:else}
					<span class="hs-blank" aria-hidden="true"></span>
				{/if}
			{/snippet}
			{#snippet footer(_item, i)}
				{@const s = list[i]}
				{#if s}
					{@const on = player.isCurrent(s.id)}
					{@const playing = on && player.playing}
					{@const dur = on ? player.duration || s.duration : s.duration}
					{@const p = on ? player.progress : 0}
					<div class="hs-foot">
						<button
							type="button"
							class="hs-play"
							class:is-loading={on && player.loading}
							onclick={() => toggle(s)}
							aria-label={`${playing ? t.pause : t.play} — ${s.title[lang]}`}
						>
							{#if playing}
								<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6.5" y="5" width="4" height="14" rx="1" /><rect x="13.5" y="5" width="4" height="14" rx="1" /></svg>
							{:else}
								<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.2v13.6a.8.8 0 0 0 1.2.7l10.6-6.8a.8.8 0 0 0 0-1.4L9.2 4.5A.8.8 0 0 0 8 5.2Z" /></svg>
							{/if}
						</button>
						<div class="hs-track">
							<input
								type="range"
								min="0"
								max="1000"
								step="1"
								value={Math.round(p * 1000)}
								oninput={(e) => seek(s, e)}
								aria-label={t.seek}
								aria-valuetext={`${fmtDuration(on ? player.time : 0)} ${t.of} ${fmtDuration(dur)}`}
								style:--p={`${p * 100}%`}
							/>
							<span class="hs-time">
								{#if on && player.error}{t.failed}{:else}{fmtDuration(on ? player.time : 0)} / {fmtDuration(dur)}{/if}
							</span>
						</div>
						<a href={`/sounds/${s.id}`} class="hs-link">{t.license}</a>
					</div>
				{/if}
			{/snippet}
		</DiscCascadeCarousel>
	{:else}
		<div inert class="h-full">
			<DiscCascadeCarousel
				items={blanks}
				height="100%"
				{discSize}
				background={STAGE_BG}
				frame={false}
				fade
				mark="lakuna sounds"
				indexLabel=""
				details={false}
				reviews={false}
				controls={false}
				hint=""
				loop
				autoplay={4200}
				defaultIndex={2}
				ariaLabel={t.region}
			>
				{#snippet art(_item, i)}
					{@const ph = decoPhotos[i]}
					{#if ph?.thumbUrl}
						<ApiImage src={ph.thumbUrl} alt="" fill class="object-cover" />
					{:else}
						<span class="hs-blank" aria-hidden="true"></span>
					{/if}
				{/snippet}
			</DiscCascadeCarousel>
		</div>
	{/if}
</div>

<style>
	.hs-blank {
		position: absolute;
		inset: 0;
		background: radial-gradient(circle at 30% 30%, color-mix(in srgb, var(--safelight) 70%, #fff), var(--safelight));
	}
	.hs-foot {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 0.55rem 1.1rem 0.55rem 0.55rem;
		border: 1px solid color-mix(in oklab, currentColor 16%, transparent);
		border-radius: 999px;
		background: color-mix(in oklab, var(--bg) 55%, transparent);
		-webkit-backdrop-filter: blur(12px);
		backdrop-filter: blur(12px);
		white-space: nowrap;
	}
	.hs-play {
		display: grid;
		flex: none;
		place-items: center;
		width: 2.75rem;
		height: 2.75rem;
		border: 0;
		border-radius: 50%;
		background: var(--fg);
		color: var(--bg);
		cursor: pointer;
		transition: transform 0.2s ease;
	}
	.hs-play svg {
		width: 1.1rem;
		height: 1.1rem;
	}
	.hs-play:active {
		transform: scale(0.92);
	}
	.hs-play:focus-visible {
		outline: 2px solid var(--safelight);
		outline-offset: 3px;
	}
	.hs-play.is-loading {
		animation: hs-pulse 1s ease-in-out infinite;
	}
	@keyframes hs-pulse {
		50% {
			opacity: 0.55;
		}
	}
	.hs-track {
		display: grid;
		gap: 0.15rem;
		width: clamp(7.5rem, 18cqw, 13rem);
	}
	.hs-track input {
		width: 100%;
		height: 1rem;
		margin: 0;
		background: transparent;
		cursor: pointer;
		-webkit-appearance: none;
		appearance: none;
	}
	.hs-track input::-webkit-slider-runnable-track {
		height: 2px;
		background: linear-gradient(90deg, var(--safelight) var(--p, 0%), color-mix(in oklab, currentColor 22%, transparent) var(--p, 0%));
	}
	.hs-track input::-moz-range-track {
		height: 2px;
		background: linear-gradient(90deg, var(--safelight) var(--p, 0%), color-mix(in oklab, currentColor 22%, transparent) var(--p, 0%));
	}
	.hs-track input::-webkit-slider-thumb {
		-webkit-appearance: none;
		width: 10px;
		height: 10px;
		margin-top: -4px;
		border-radius: 50%;
		background: currentColor;
	}
	.hs-track input::-moz-range-thumb {
		width: 10px;
		height: 10px;
		border: 0;
		border-radius: 50%;
		background: currentColor;
	}
	.hs-track input:focus-visible {
		outline: 2px solid var(--safelight);
		outline-offset: 3px;
	}
	.hs-time {
		font-size: 11px;
		letter-spacing: 0.04em;
		font-variant-numeric: tabular-nums;
		opacity: 0.7;
	}
	.hs-link {
		font-size: 0.85rem;
		color: inherit;
		text-decoration: underline;
		text-decoration-color: color-mix(in oklab, currentColor 35%, transparent);
		text-underline-offset: 0.3em;
		transition:
			color 0.25s ease,
			text-decoration-color 0.25s ease;
	}
	.hs-link:hover,
	.hs-link:focus-visible {
		color: var(--safelight);
		text-decoration-color: var(--safelight);
	}
	@media (prefers-reduced-motion: reduce) {
		.hs-play.is-loading {
			animation: none;
		}
	}
</style>
