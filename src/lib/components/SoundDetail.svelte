<script lang="ts">
	/**
	 * Detail satu audio — susunan halaman detail video (pelat, judul, lembar lisensi, data karya, karya terkait)
	 * dengan pelat berupa pemutar: sampul + gelombang besar yang bisa digeser. Pemutarannya lewat `player`
	 * bersama, jadi bilah pemutar bawah ikut menampilkan lagu ini.
	 */
	import { goto } from "$app/navigation";
	import { page } from "$app/state";
	import gsap from "gsap";
	import { backNav } from "$lib/backNav";
	import { i18n } from "$lib/i18n.svelte";
	import { store } from "$lib/store.svelte";
	import { authModal } from "$lib/authModal.svelte";
	import { subscribeModal } from "$lib/subscribeModal.svelte";
	import { player } from "$lib/soundPlayer.svelte";
	import { assetPath, kindOfType } from "$lib/seo";
	import { fetchRelatedSounds, fetchSoundById, fmtDuration, fmtIDR, type Sound } from "$lib/data";
	import ApiImage from "./ApiImage.svelte";
	import DetailTitle from "./DetailTitle.svelte";
	import Reveal from "./Reveal.svelte";
	import SoundRow from "./SoundRow.svelte";
	import Waveform from "./Waveform.svelte";

	let { soundId }: { soundId: string } = $props();

	const copy = {
		id: {
			back: "Kembali", by: "oleh", ai: "Dibuat dengan AI", aiHint: "Karya ini dibuat dengan AI generatif lalu dikurasi tim Lakuna.",
			play: "Putar pratinjau", pause: "Jeda", seek: "Posisi putar",
			music: "Musik", sfx: "Efek suara", cat: "Kategori", duration: "Durasi", tempo: "Tempo", format: "Format", kind: "Jenis", tags: "Kata kunci",
			slip: "Lembar lisensi", usage: "Jenis pakai", fee: "Biaya lisensi", personal: "Standar", commercial: "Premium",
			personalDesc: "Video, podcast, media sosial & iklan", commercialDesc: "Kuota unduhan bulanan",
			subscribe: "Berlangganan", fromPrice: "mulai", perMonth: "/bulan",
			buyNow: "Beli sekarang", addToCart: "Tambah ke keranjang", added: "Ditambahkan", save: "Simpan", saved: "Tersimpan",
			youGet: "Yang kamu terima", original: "Berkas asli",
			previewNote: "Pratinjau diputar sebagai MP3 dengan denting penanda tiap 10 detik. Berkas asli tanpa penanda bisa diunduh setelah pembelian",
			related: "Audio terkait", relatedKicker: "Dengarkan juga", seeAll: "Lihat semua",
			missing: "Audio tidak ditemukan atau belum tayang",
		},
		en: {
			back: "Back", by: "by", ai: "Made with AI", aiHint: "This work was created with generative AI and curated by the Lakuna team.",
			play: "Play preview", pause: "Pause", seek: "Playback position",
			music: "Music", sfx: "Sound effect", cat: "Category", duration: "Length", tempo: "Tempo", format: "Format", kind: "Type", tags: "Keywords",
			slip: "Licence slip", usage: "Usage", fee: "Licence fee", personal: "Standard", commercial: "Premium",
			personalDesc: "Video, podcasts, social media & ads", commercialDesc: "Monthly download quota",
			subscribe: "Subscribe", fromPrice: "from", perMonth: "/month",
			buyNow: "Buy now", addToCart: "Add to cart", added: "Added", save: "Save", saved: "Saved",
			youGet: "What you get", original: "Original file",
			previewNote: "The preview plays as an MP3 with a marker chime every 10 seconds. The clean original file is available to download after purchase",
			related: "Related sounds", relatedKicker: "Listen next", seeAll: "See all",
			missing: "This sound wasn't found or isn't published yet",
		},
	};
	const lang = $derived(i18n.lang);
	const t = $derived(copy[lang]);
	const back = backNav("/sounds");

	let sound = $state<Sound | null>(null);
	let missing = $state(false);
	let related = $state<Sound[]>([]);
	let license = $state<"personal" | "commercial">("personal");
	let added = $state(false);
	let rootEl: HTMLDivElement | undefined = $state();

	$effect(() => {
		const id = soundId;
		let alive = true;
		fetchSoundById(id).then(({ sound: s, type }) => {
			if (!alive) return;
			// Tautan /sounds/<id foto/video> → halaman yang benar.
			if (!s && type) {
				void goto(assetPath({ id, kind: kindOfType(type) }), { replaceState: true });
				return;
			}
			if (!s) {
				missing = true;
				return;
			}
			sound = s;
			fetchRelatedSounds(id, s.kind, 6).then((r) => alive && (related = r));
		});
		return () => {
			alive = false;
		};
	});

	const current = $derived(!!sound && player.isCurrent(sound.id));
	const playingNow = $derived(current && player.playing);
	const fav = $derived(sound ? store.isFavorite(sound.id) : false);
	const kws = $derived(lang === "en" && sound?.keywordsEn?.length ? sound.keywordsEn : (sound?.keywords ?? []));
	const cats = $derived(lang === "en" && sound?.categoriesEn?.length ? sound.categoriesEn : (sound?.categories ?? []));
	const catalogNo = $derived(sound ? sound.id.slice(-6).toUpperCase() : "");
	const kindLabel = $derived(sound?.kind === "SFX" ? t.sfx : t.music);
	const queue = $derived(sound ? [sound, ...related] : []);

	function toggle() {
		if (sound) player.play(sound, queue);
	}
	function seek(r: number) {
		if (!sound) return;
		if (!current) player.play(sound, queue);
		player.seek(r);
	}

	// Pelat masuk sekali begitu datanya ada.
	$effect(() => {
		if (!sound) return;
		if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
		const plate = rootEl?.querySelector<HTMLElement>("[data-plate]");
		if (plate) gsap.fromTo(plate, { y: 28, opacity: 0 }, { y: 0, opacity: 1, duration: 1.1, ease: "power3.out" });
	});

	function handleAdd() {
		if (!sound) return;
		void store.addToCart({ id: sound.id, kind: "sound", title: sound.title[lang], price: sound.price, meta: sound.id, thumbUrl: sound.cover });
		added = true;
		setTimeout(() => (added = false), 1800);
	}
	// Beli langsung: masuk keranjang lalu ke checkout. Belum masuk → login, tetap di halaman ini.
	async function handleBuyNow() {
		if (!store.user) {
			authModal.open(page.url.pathname + page.url.search);
			return;
		}
		handleAdd();
		await goto("/checkout");
	}
	// Premium = langganan berkuota (sama dengan halaman foto & video).
	const isPremium = $derived(license === "commercial");
	const premiumFrom = $derived(subscribeModal.fromMonthly);
	const premiumRowLabel = $derived(premiumFrom ? `${fmtIDR(premiumFrom)}${t.perMonth}` : "…");
	function handlePrimary() {
		if (isPremium) subscribeModal.open();
		else void handleBuyNow();
	}
	$effect(() => {
		void subscribeModal.load();
	});
</script>

{#snippet meta(label: string, value: string)}
	<div class="flex items-baseline justify-between gap-6 border-b border-hair py-3.5 sm:block sm:border-0 sm:py-0">
		<p class="kicker shrink-0 text-fg-muted">{label}</p>
		<p class="text-right text-sm text-fg sm:mt-1.5 sm:text-left">{value}</p>
	</div>
{/snippet}

{#snippet licenseRow(active: boolean, onpick: () => void, title: string, desc: string, priceLabel: string)}
	<button
		type="button"
		role="radio"
		aria-checked={active}
		onclick={onpick}
		class="group/row flex w-full items-start justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-fg/[0.03] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-safelight"
	>
		<span class="flex items-start gap-3">
			<span class={`mt-[3px] grid h-3.5 w-3.5 shrink-0 place-items-center rounded-full border transition-colors ${active ? "border-safelight" : "border-fg-muted/50 group-hover/row:border-fg-muted"}`}>
				<span class={`h-1.5 w-1.5 rounded-full transition-colors ${active ? "bg-safelight" : "bg-transparent"}`}></span>
			</span>
			<span>
				<span class={`block text-sm ${active ? "text-fg" : "text-fg/80"}`}>{title}</span>
				<span class="mt-0.5 block text-xs leading-relaxed text-fg-muted">{desc}</span>
			</span>
		</span>
		<span class="shrink-0 pt-px text-right font-mono text-[0.82rem] tabular-nums">{priceLabel}</span>
	</button>
{/snippet}

<div data-no-hover-sound data-no-click-sound>
	{#if !sound}
		<div class="min-h-screen pt-[calc(var(--banner-h,0px)+var(--nav-h)+1.15rem)] sm:pt-28">
			{#if missing}
				<p class="mx-auto max-w-xl px-6 py-32 text-center font-display text-2xl font-light text-fg-muted">{t.missing}</p>
			{/if}
		</div>
	{:else}
		<div bind:this={rootEl} class="min-h-screen pt-[calc(var(--banner-h,0px)+var(--nav-h)+1.15rem)] sm:pt-28">
			<div class="mx-auto flex max-w-[1500px] items-center px-6 pb-6 lg:px-10">
				<a href={back.href} onclick={back.onclick} class="arrow-link text-sm text-fg-muted hover:text-safelight">
					<span class="arr">←</span> {t.back}
				</a>
			</div>

			<div class="mx-auto flex max-w-[1500px] flex-col gap-8 px-6 pb-20 lg:grid lg:grid-cols-[1fr_22rem] lg:gap-10 lg:px-10">
				<!-- ───────── Pelat pemutar ───────── -->
				<div class="min-w-0 lg:col-start-1 lg:row-start-1">
					<figure data-plate class="relative overflow-hidden rounded-[3px] border border-hair bg-fg/[0.03]">
						<div class="pointer-events-none absolute -inset-10 bg-[radial-gradient(circle_at_30%_40%,color-mix(in_srgb,var(--safelight)_14%,transparent),transparent_60%)] blur-2xl"></div>
						<div class="relative flex flex-col gap-6 p-5 sm:flex-row sm:items-stretch sm:gap-8 sm:p-7">
							<!-- Sampul + tombol putar -->
							<button
								type="button"
								onclick={toggle}
								aria-label={`${playingNow ? t.pause : t.play} — ${sound.title[lang]}`}
								aria-pressed={playingNow}
								class="group relative aspect-square w-full max-w-[15rem] shrink-0 self-center overflow-hidden rounded-[3px] bg-ocean focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-safelight sm:w-52 sm:self-auto lg:w-60"
							>
								{#if sound.cover}
									<ApiImage src={sound.cover} alt={sound.title[lang]} fill eager class="object-cover object-top transition-transform duration-700 group-hover:scale-[1.04]" />
								{/if}
								<span class="absolute inset-0 grid place-items-center bg-ocean-deep/25 transition-colors group-hover:bg-ocean-deep/40">
									<span class="grid h-16 w-16 place-items-center rounded-full bg-safelight text-ivory shadow-[0_14px_40px_-12px_var(--safelight-glow)] transition-transform group-hover:scale-[1.06]">
										{#if current && player.loading && player.playing}
											<span class="h-6 w-6 animate-spin rounded-full border-2 border-ivory/30 border-t-ivory"></span>
										{:else if playingNow}
											<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
										{:else}
											<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.14v13.72a1 1 0 0 0 1.52.85l11.03-6.86a1 1 0 0 0 0-1.7L9.52 4.29A1 1 0 0 0 8 5.14z" /></svg>
										{/if}
									</span>
								</span>
							</button>

							<!-- Gelombang besar -->
							<div class="flex min-w-0 flex-1 flex-col justify-between gap-5">
								<div class="flex flex-wrap items-center gap-2">
									<span class="kicker rounded-full border border-hair px-3 py-1.5 text-fg">{kindLabel}</span>
									{#if sound.bpm}<span class="kicker rounded-full border border-hair px-3 py-1.5 tabular-nums text-fg-muted">{sound.bpm} BPM</span>{/if}
									{#if sound.format}<span class="kicker rounded-full border border-hair px-3 py-1.5 uppercase text-fg-muted">{sound.format}</span>{/if}
								</div>
								<Waveform
									peaks={sound.waveform}
									progress={current ? player.progress : 0}
									active={current}
									label={t.seek}
									onseek={seek}
									bars={120}
									class="h-24 w-full sm:h-32"
								/>
								<div class="flex items-center justify-between font-mono text-[0.78rem] tabular-nums text-fg-muted">
									<span>{current ? fmtDuration(player.time) : "0:00"}</span>
									<span>{fmtDuration(sound.duration)}</span>
								</div>
							</div>
						</div>
					</figure>

					<div class="mt-3 flex items-center justify-between gap-4">
						<p class="kicker text-fg-muted">No. {catalogNo} — {fmtDuration(sound.duration)}</p>
						<span class="kicker text-fg-muted">{kindLabel}</span>
					</div>

					<div class="mt-8">
						<DetailTitle text={sound.title[lang]} />
						<p class="mt-3 kicker text-fg-muted">
							{t.by} <a href={`/archive/${encodeURIComponent(sound.author)}`} class="text-safelight underline-offset-4 transition-colors hover:text-fg hover:underline">{sound.author}</a>
							{#if sound.aiGenerated}
								<span title={t.aiHint} class="ml-2 inline-flex items-center rounded-full border border-hair px-2 py-0.5 align-middle text-[10px] tracking-[0.12em] text-fg">{t.ai}</span>
							{/if}
						</p>
					</div>
				</div>

				<!-- ───────── Lembar lisensi ───────── -->
				<aside class="lg:sticky lg:top-28 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-start">
					<div class="proof-slip border border-hair">
						<div class="flex items-baseline justify-between gap-4 border-b border-hair px-5 py-4">
							<span class="kicker text-fg-muted">{t.slip}</span>
							<span class="font-mono text-[0.7rem] tracking-[0.14em] text-fg-muted">{catalogNo}</span>
						</div>
						<div class="px-5 pt-4"><span class="kicker text-fg-muted">{t.usage}</span></div>
						<div role="radiogroup" aria-label={t.usage} class="mt-1 divide-y divide-hair border-b border-hair">
							{@render licenseRow(license === "personal", () => (license = "personal"), t.personal, t.personalDesc, fmtIDR(sound.price))}
							{@render licenseRow(license === "commercial", () => (license = "commercial"), t.commercial, t.commercialDesc, premiumRowLabel)}
						</div>
						<div class="border-b border-hair px-5 py-5">
							<span class="kicker text-fg-muted">{t.fee}</span>
							<p class="mt-2 font-display text-[2.1rem] font-light leading-none tracking-[-0.02em] text-fg">
								{#if isPremium}
									<span class="mr-2 font-body text-base text-fg-muted">{t.fromPrice}</span>{premiumFrom ? fmtIDR(premiumFrom) : "…"}<span class="ml-1 font-body text-base text-fg-muted">{t.perMonth}</span>
								{:else}
									{fmtIDR(sound.price)}
								{/if}
							</p>
						</div>
						<div class="px-5 py-5">
							<button
								type="button"
								onclick={handlePrimary}
								class="press w-full rounded-full bg-safelight py-3.5 text-sm font-medium text-ivory shadow-[0_14px_40px_-12px_var(--safelight-glow)] transition-transform hover:scale-[1.02] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-safelight"
							>
								{isPremium ? t.subscribe : t.buyNow}
							</button>
							<div class="mt-3.5 flex items-center justify-between text-sm">
								{#if !isPremium}
									<button type="button" onclick={handleAdd} class="inline-flex items-center gap-2 text-fg-muted transition-colors hover:text-safelight">
										<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
											<path d="M3 3h2l2.4 12.5a2 2 0 0 0 2 1.5h7.2a2 2 0 0 0 2-1.5L21 7H6" /><circle cx="9" cy="20" r="1.3" /><circle cx="18" cy="20" r="1.3" />
										</svg>
										{added ? `✓ ${t.added}` : t.addToCart}
									</button>
								{/if}
								<button type="button" onclick={() => store.toggleFavorite(sound!.id)} class="ml-auto text-fg-muted transition-colors hover:text-safelight">
									{fav ? `♥ ${t.saved}` : `♡ ${t.save}`}
								</button>
							</div>
						</div>
						<div class="border-t border-hair px-5 py-4">
							<span class="kicker text-fg-muted">{t.youGet}</span>
							<p class="mt-2 font-mono text-[0.76rem] uppercase tabular-nums text-fg">
								{[sound.format, fmtDuration(sound.duration), t.original].filter(Boolean).join(" · ")}
							</p>
							<p class="mt-2 text-xs leading-relaxed text-fg-muted">{t.previewNote}</p>
						</div>
					</div>
				</aside>

				<!-- Deskripsi & data karya -->
				<div class="max-w-2xl lg:col-start-1 lg:row-start-2 lg:-mt-4">
					<!-- Tanpa deskripsi, API mengisi desc dengan judul (bahasa mana pun) — jangan ulang judulnya. -->
					{#if sound.desc[lang] && sound.desc[lang] !== sound.title.id && sound.desc[lang] !== sound.title.en}
						<p class="text-[1.02rem] leading-relaxed text-fg-muted">{sound.desc[lang]}</p>
					{/if}
					<div class="mt-8 border-t border-hair pt-2 sm:grid sm:grid-cols-3 sm:gap-x-8 sm:gap-y-5 sm:pt-8">
						{@render meta(t.kind, kindLabel)}
						{@render meta(t.duration, fmtDuration(sound.duration))}
						{@render meta(t.tempo, sound.bpm ? `${sound.bpm} BPM` : "—")}
						{@render meta(t.format, (sound.format ?? "—").toUpperCase())}
						{@render meta(t.cat, cats.join(", ") || "—")}
						<div class="flex items-baseline justify-between gap-6 border-b border-hair py-3.5 sm:block sm:border-0 sm:py-0">
							<p class="kicker shrink-0 text-fg-muted">{t.tags}</p>
							<div class="flex flex-wrap justify-end gap-1.5 sm:mt-2 sm:justify-start">
								{#if kws.length}
									{#each kws as kw (kw)}
										<a href={`/sounds?q=${encodeURIComponent(kw)}`} class="press kicker rounded-full border border-hair px-3 py-1.5 text-fg-muted transition-colors hover:border-safelight hover:text-safelight">#{kw}</a>
									{/each}
								{:else}
									<span class="text-sm text-fg/40">—</span>
								{/if}
							</div>
						</div>
					</div>
				</div>
			</div>

			<!-- ───────── Audio terkait ───────── -->
			{#if related.length > 0}
				<section class="mx-auto max-w-[1500px] px-6 pb-28 lg:px-10">
					<Reveal class="mb-8 flex items-end justify-between gap-x-6 gap-y-4 max-[360px]:flex-wrap">
						<div>
							<p data-reveal class="kicker text-safelight">{t.relatedKicker}</p>
							<h2 data-reveal class="mt-4 font-display text-2xl font-light tracking-[-0.02em] text-fg">{t.related}</h2>
						</div>
						<a data-reveal href="/sounds" class="shrink-0 rounded-full border border-hair px-5 py-2.5 text-xs font-medium text-fg transition-colors hover:border-safelight hover:text-safelight">{t.seeAll}</a>
					</Reveal>
					<ol class="space-y-2">
						{#each related as s (s.id)}
							<li><SoundRow sound={s} queue={queue} /></li>
						{/each}
					</ol>
				</section>
			{/if}
		</div>
	{/if}
</div>
