<script lang="ts">
	/**
	 * Detail satu audio — tiruan dekat halaman rilis coveomusic.com: tombol rumah, tulisan tangan di latar, sampul
	 * miring, nama kreator + judul besar, deretan pil (di acuan "Listen on …"; di sini aksi lisensi Lakuna), kartu
	 * hitam besar berisi sampul + tombol Pratinjau, baris data (jenis · tanggal · durasi), kartu geser (tentang,
	 * polaroid, kredit), lalu daftar semua audio.
	 */
	import { goto } from "$app/navigation";
	import { page } from "$app/state";
	import { i18n } from "$lib/i18n.svelte";
	import { store } from "$lib/store.svelte";
	import { authModal } from "$lib/authModal.svelte";
	import { subscribeModal } from "$lib/subscribeModal.svelte";
	import { announcer } from "$lib/stores/announce.svelte";
	import { player } from "$lib/soundPlayer.svelte";
	import { assetPath, kindOfType } from "$lib/seo";
	import { fetchSoundById, fetchSounds, fmtIDR, type Sound } from "$lib/data";
	import ApiImage from "./ApiImage.svelte";
	import SoundRow from "./SoundRow.svelte";

	let { soundId }: { soundId: string } = $props();

	const copy = {
		id: {
			script: "inilah suara kami", home: "Semua audio",
			buy: "Beli lisensi", addToCart: "Tambah ke keranjang", added: "Ditambahkan", save: "Simpan", saved: "Tersimpan",
			premium: "Premium", from: "mulai", perMonth: "/bulan",
			preview: "Pratinjau", pause: "Jeda",
			type: "Jenis", date: "Tanggal terbit", runtime: "Durasi total",
			music: "Musik", sfx: "Efek suara", min: "menit", sec: "detik",
			about: "Tentang audio ini", making: "Di balik rekaman", credits: "Kredit",
			aboutFallback: (k: string, d: string) => `${k} berdurasi ${d}, dikurasi tim Lakuna. Dengarkan pratinjaunya, lalu lisensikan berkas aslinya untuk video, podcast, iklan, atau karya kamu.`,
			creator: "Kreator", format: "Format", tempo: "Tempo", license: "Lisensi", licenseVal: "Standar & Premium", category: "Kategori", keywords: "Kata kunci",
			source: "Sumber: Lakuna Stock",
			ai: "Dibuat dengan AI",
			order: "Semua audio — terbaru dulu",
			missing: "Audio tidak ditemukan atau belum tayang",
			prev: "Sebelumnya", next: "Berikutnya",
		},
		en: {
			script: "these are our sounds", home: "All sounds",
			buy: "Buy licence", addToCart: "Add to cart", added: "Added", save: "Save", saved: "Saved",
			premium: "Premium", from: "from", perMonth: "/month",
			preview: "Preview", pause: "Pause",
			type: "Sound type", date: "Release date", runtime: "Total runtime",
			music: "Music", sfx: "Sound effect", min: "minutes", sec: "seconds",
			about: "Behind the sound", making: "The making of", credits: "Credits",
			aboutFallback: (k: string, d: string) => `A ${k.toLowerCase()} of ${d}, curated by the Lakuna team. Listen to the preview, then license the original file for your videos, podcasts, ads or projects.`,
			creator: "Creator", format: "Format", tempo: "Tempo", license: "Licence", licenseVal: "Standard & Premium", category: "Category", keywords: "Keywords",
			source: "Source: Lakuna Stock",
			ai: "Made with AI",
			order: "All sounds — ordered by newest first",
			missing: "This sound wasn't found or isn't published yet",
			prev: "Previous", next: "Next",
		},
	};
	const lang = $derived(i18n.lang);
	const t = $derived(copy[lang]);

	let sound = $state<Sound | null>(null);
	let missing = $state(false);
	let all = $state<Sound[]>([]);
	let allTotal = $state(0);
	let added = $state(false);

	$effect(() => {
		const id = soundId;
		let alive = true;
		fetchSoundById(id).then(({ sound: s, type }) => {
			if (!alive) return;
			if (!s && type) {
				void goto(assetPath({ id, kind: kindOfType(type) }), { replaceState: true });
				return;
			}
			if (!s) {
				missing = true;
				return;
			}
			sound = s;
		});
		fetchSounds({ limit: 30 })
			.then((r) => {
				if (!alive) return;
				all = r.sounds;
				allTotal = r.total;
			})
			.catch(() => {});
		return () => {
			alive = false;
		};
	});
	$effect(() => {
		void subscribeModal.load();
	});

	const playingNow = $derived(!!sound && player.isCurrent(sound.id) && player.playing);
	const fav = $derived(sound ? store.isFavorite(sound.id) : false);
	const kindLabel = $derived(sound?.kind === "SFX" ? t.sfx : t.music);
	const longDur = $derived.by(() => {
		const s = Math.max(0, Math.round(sound?.duration ?? 0));
		const m = Math.floor(s / 60);
		return m ? `${m} ${t.min} ${s % 60} ${t.sec}` : `${s} ${t.sec}`;
	});
	const dateText = $derived(
		sound?.createdAt
			? new Intl.DateTimeFormat(lang === "en" ? "en-US" : "id-ID", { day: "2-digit", month: "long", year: "numeric" }).format(new Date(sound.createdAt))
			: "—"
	);
	const monthYear = $derived(
		sound?.createdAt ? new Intl.DateTimeFormat(lang === "en" ? "en-US" : "id-ID", { month: "long", year: "numeric" }).format(new Date(sound.createdAt)) : ""
	);
	const aboutText = $derived.by(() => {
		if (!sound) return "";
		const d = sound.desc[lang];
		return d && d !== sound.title.id && d !== sound.title.en ? d : t.aboutFallback(kindLabel, longDur);
	});
	const cats = $derived(lang === "en" && sound?.categoriesEn?.length ? sound.categoriesEn : (sound?.categories ?? []));
	const kws = $derived(lang === "en" && sound?.keywordsEn?.length ? sound.keywordsEn : (sound?.keywords ?? []));
	const premiumFrom = $derived(subscribeModal.fromMonthly);

	function addToCart() {
		if (!sound) return;
		void store.addToCart({ id: sound.id, kind: "sound", title: sound.title[lang], price: sound.price, meta: sound.id, thumbUrl: sound.cover });
		added = true;
		announcer.announce(`${sound.title[lang]} — ${t.added}`);
		setTimeout(() => (added = false), 1800);
	}
	async function buyNow() {
		if (!store.user) {
			authModal.open(page.url.pathname + page.url.search);
			return;
		}
		addToCart();
		await goto("/checkout");
	}

	let cardsEl: HTMLDivElement | undefined = $state();
	function slide(dir: 1 | -1) {
		cardsEl?.scrollBy({ left: dir * Math.min(cardsEl.clientWidth * 0.8, 480), behavior: "smooth" });
	}
</script>

<div class="cvd" data-no-hover-sound data-no-click-sound>
	{#if !sound}
		<div class="cvd-empty">
			{#if missing}<p>{t.missing}</p>{/if}
		</div>
	{:else}
		<!-- ───────── Kepala rilis ───────── -->
		<section class="cvd-header">
			<div class="cvd-script" aria-hidden="true"><span>{t.script}</span></div>
			<a href="/sounds" class="cvd-home" aria-label={t.home} title={t.home}>
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" /></svg>
			</a>
			<div class="cvd-art">
				{#if sound.cover}<ApiImage src={sound.cover} alt={sound.title[lang]} fill eager class="object-cover object-top" />{/if}
			</div>
			<p class="cvd-artist">
				<a href={`/archive/${encodeURIComponent(sound.author)}`}>{sound.author}</a>
				{#if sound.aiGenerated}<span class="cvd-ai">{t.ai}</span>{/if}
			</p>
			<h1 class="cvd-title">{sound.title[lang]}</h1>
			<div class="cvd-pills">
				<button type="button" class="cv-pill cv-pill--dark" onclick={buyNow}>
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12M7 10l5 5 5-5" /><path d="M5 21h14" /></svg>
					{t.buy} — {fmtIDR(sound.price)}
				</button>
				<button type="button" class="cv-pill" onclick={addToCart}>
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="20" r="1.4" /><circle cx="18" cy="20" r="1.4" /><path d="M2.5 3h2.2l2.3 11.2a1.6 1.6 0 0 0 1.6 1.3h8.6a1.6 1.6 0 0 0 1.6-1.3L21 7H6" /></svg>
					{added ? `✓ ${t.added}` : t.addToCart}
				</button>
				<button type="button" class="cv-pill" aria-pressed={fav} onclick={() => store.toggleFavorite(sound!.id)}>
					<svg viewBox="0 0 24 24" fill={fav ? "currentColor" : "none"} stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" /></svg>
					{fav ? t.saved : t.save}
				</button>
				<button type="button" class="cv-pill" onclick={() => subscribeModal.open()}>
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m12 3 2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6 6.6 19.5l1.2-6L3.3 9.3l6.1-.7z" /></svg>
					{t.premium}{premiumFrom ? ` — ${t.from} ${fmtIDR(premiumFrom)}${t.perMonth}` : ""}
				</button>
			</div>
		</section>

		<!-- ───────── Kartu hitam + pratinjau ───────── -->
		<section class="cvd-artwork">
			<div class="cvd-artwork__img">
				{#if sound.cover}<ApiImage src={sound.cover} alt="" fill class="object-cover object-top" />{/if}
			</div>
			<button type="button" class="cvd-preview" aria-pressed={playingNow} onclick={() => player.play(sound!, [sound!, ...all.filter((x) => x.id !== sound!.id)])}>
				{#if playingNow}
					<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2" /><path d="M10 8.5v7M14 8.5v7" stroke="currentColor" stroke-width="2" stroke-linecap="round" /></svg>
				{:else}
					<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2" /><polygon points="10 8 16 12 10 16 10 8" fill="currentColor" /></svg>
				{/if}
				{playingNow ? t.pause : t.preview}
			</button>
		</section>

		<div class="cvd-data">
			<div class="cvd-data__item"><p>{t.type}</p><p class="cv-mono">{kindLabel}{sound.bpm ? `, ${sound.bpm} BPM` : ""}</p></div>
			<div class="cvd-data__item"><p>{t.date}</p><p class="cv-mono">{dateText}</p></div>
			<div class="cvd-data__item"><p>{t.runtime}</p><p class="cv-mono">{longDur}</p></div>
		</div>

		<!-- ───────── Kartu geser ───────── -->
		<section class="cvd-cards-wrap">
			<div class="cvd-cards" bind:this={cardsEl}>
				<article class="cvd-card cvd-card--grey">
					<p class="cv-mono cvd-card__head">{t.about}</p>
					<p class="cvd-card__story">{aboutText}</p>
				</article>
				<article class="cvd-card cvd-card--black">
					<p class="cv-mono cvd-card__head">{t.making}</p>
					<div class="cvd-polaroids">
						<span class="cvd-polaroid cvd-polaroid--back"></span>
						<span class="cvd-polaroid cvd-polaroid--back2"></span>
						<figure class="cvd-polaroid">
							<span class="cvd-polaroid__img">{#if sound.cover}<ApiImage src={sound.cover} alt="" fill class="object-cover object-top" />{/if}</span>
							<figcaption>
								{sound.location || cats[0] || kindLabel}
								<span class="cv-mono">{monthYear}</span>
							</figcaption>
						</figure>
					</div>
				</article>
				<article class="cvd-card cvd-card--white">
					<p class="cv-mono cvd-card__head">{t.credits}</p>
					<dl class="cvd-credits">
						{#each [[t.creator, sound.author], [t.license, t.licenseVal], [t.format, (sound.format ?? "—").toUpperCase()], [t.tempo, sound.bpm ? `${sound.bpm} BPM` : "—"], [t.category, cats.join(", ") || "—"], [t.keywords, kws.slice(0, 4).join(", ") || "—"]] as [k, v] (k)}
							<div class="cvd-credit"><dt class="cv-mono">{k}</dt><span aria-hidden="true"></span><dd class="cv-mono">{v}</dd></div>
						{/each}
					</dl>
					<div class="cvd-source">
						<span class="cvd-source__avatar"><img src="/logo1-sm.png" alt="" width="200" height="36" /></span>
						<span class="cv-mono">{t.source}</span>
					</div>
				</article>
			</div>
			<div class="cvd-nav">
				<button type="button" onclick={() => slide(-1)} aria-label={t.prev}>←</button>
				<button type="button" onclick={() => slide(1)} aria-label={t.next}>→</button>
			</div>
		</section>

		<!-- ───────── Semua audio ───────── -->
		{#if all.length > 0}
			<section class="cvd-list">
				<h2 class="cvd-h2">{t.order}</h2>
				<ul class="cvd-releases">
					{#each all as s, i (s.id)}
						<SoundRow sound={s} queue={all} index={allTotal - i - 1} />
					{/each}
				</ul>
			</section>
		{/if}
	{/if}
</div>

<style>
	.cvd {
		color: #1d1812;
		font-family: "Inter", sans-serif;
		font-size: 12px;
		overflow-x: clip;
	}
	.cv-mono {
		font-family: ui-monospace, Menlo, Monaco, monospace;
	}
	.cvd-empty {
		min-height: 70vh;
		padding: calc(var(--banner-h, 0px) + var(--nav-h) + 6em) 2em 4em;
		text-align: center;
		color: #524d46;
		font-size: 1.2em;
	}

	/* ── Kepala ── */
	.cvd-header {
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: calc(var(--banner-h, 0px) + var(--nav-h) + 24px) 1.5em 6em;
		text-align: center;
	}
	.cvd-script {
		position: absolute;
		left: 50%;
		top: 2%;
		z-index: 0;
		width: 110vw;
		pointer-events: none;
		transform: translateX(-50%) rotate(-10deg);
		text-align: center;
	}
	.cvd-script span {
		display: inline-block;
		font-family: "Mrs Saint Delafield", cursive;
		font-size: clamp(7rem, 21vw, 22rem);
		line-height: 1;
		color: #f8f8f8;
		white-space: nowrap;
		clip-path: inset(0 100% 0 0);
		animation: cvd-write 3.2s 0.2s cubic-bezier(0.45, 0, 0.25, 1) forwards;
	}
	@keyframes cvd-write {
		to {
			clip-path: inset(0 0 0 0);
		}
	}
	.cvd-home {
		position: relative;
		z-index: 1;
		display: grid;
		height: 36px;
		width: 36px;
		place-items: center;
		border-radius: 8px;
		background: #1d1812;
		color: #eeeeee;
	}
	.cvd-art {
		position: relative;
		z-index: 1;
		height: 104px;
		width: 104px;
		margin-top: 56px;
		overflow: hidden;
		border-radius: 10px;
		background: #dddddd;
		box-shadow: 0 18px 30px -14px rgba(0, 0, 0, 0.45);
		transform: rotate(-8deg);
	}
	.cvd-artist {
		position: relative;
		z-index: 1;
		margin: 3.4em 0 0;
		color: #524d46;
		font-weight: 600;
		text-transform: uppercase;
	}
	.cvd-artist a {
		color: inherit;
		text-decoration: none;
	}
	.cvd-ai {
		margin-left: 0.8em;
		padding: 0.2em 0.6em;
		border: 1px solid rgba(0, 0, 0, 0.2);
		border-radius: 20px;
		font-size: 0.8em;
	}
	.cvd-title {
		position: relative;
		z-index: 1;
		max-width: 16ch;
		margin: 0.25em 0 0;
		font-size: 4em;
		font-weight: 700;
		line-height: 1.05;
		letter-spacing: -0.03em;
		text-transform: uppercase;
	}
	.cvd-pills {
		position: relative;
		z-index: 1;
		display: flex;
		max-width: 620px;
		flex-wrap: wrap;
		justify-content: center;
		gap: 12px;
		margin-top: 3.5em;
	}
	.cv-pill {
		display: flex;
		align-items: center;
		gap: 2em;
		padding: 1em 1.6em;
		border: 0;
		border-radius: 40px;
		background: rgba(0, 0, 0, 0.1);
		color: #1d1812;
		font-family: ui-monospace, Menlo, Monaco, monospace;
		font-size: 0.85em;
		text-transform: uppercase;
		cursor: pointer;
		backdrop-filter: blur(10px);
		-webkit-backdrop-filter: blur(10px);
		transition: background 0.4s ease;
	}
	.cv-pill:hover {
		background: rgba(0, 0, 0, 0.2);
	}
	.cv-pill svg {
		height: 15px;
		width: 15px;
		flex-shrink: 0;
	}
	.cv-pill--dark {
		background: #1d1812;
		color: #eeeeee;
	}
	.cv-pill--dark:hover {
		background: #000000;
	}

	/* ── Kartu hitam ── */
	.cvd-artwork {
		position: relative;
		z-index: 1;
		display: flex;
		width: 80%;
		min-height: 620px;
		margin: 4em auto 1em;
		align-items: center;
		justify-content: center;
		padding: 6em;
		border-radius: 24px;
		background: #000000;
	}
	.cvd-artwork__img {
		position: relative;
		height: min(50vh, 520px);
		aspect-ratio: 1;
		overflow: hidden;
		background: #222222;
	}
	.cvd-preview {
		position: absolute;
		left: 50%;
		bottom: 8%;
		z-index: 2;
		display: flex;
		align-items: center;
		gap: 2em;
		padding: 1em 1.6em 1em 1em;
		border: 0;
		border-radius: 40px;
		background:
			linear-gradient(rgba(255, 255, 255, 0.18) 0%, rgba(255, 255, 255, 0.18) 100%),
			rgba(0, 0, 0, 0.3);
		color: #ffffff;
		font-family: ui-monospace, Menlo, Monaco, monospace;
		font-size: 0.85em;
		text-transform: uppercase;
		cursor: pointer;
		transform: translateX(-50%);
		backdrop-filter: blur(10px);
		-webkit-backdrop-filter: blur(10px);
	}
	.cvd-preview:hover {
		background:
			linear-gradient(rgba(255, 255, 255, 0.18) 0%, rgba(255, 255, 255, 0.18) 100%),
			rgba(0, 0, 0, 0.5);
	}
	.cvd-preview svg {
		height: 18px;
		width: 18px;
	}

	/* ── Baris data ── */
	.cvd-data {
		display: grid;
		width: 80%;
		grid-template-columns: 1fr 1fr 1fr;
		gap: 4em;
		margin: 0 auto 4em;
		padding: 0 2em;
	}
	.cvd-data__item {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.2em;
	}
	.cvd-data__item:nth-of-type(1) {
		align-items: flex-start;
	}
	.cvd-data__item:nth-of-type(3) {
		align-items: flex-end;
	}
	.cvd-data__item p {
		margin: 0;
		font-size: 0.85em;
		font-weight: 600;
		text-transform: uppercase;
	}
	.cvd-data__item p.cv-mono {
		font-weight: 400;
	}

	/* ── Kartu geser ── */
	.cvd-cards-wrap {
		width: 80%;
		margin: 0 auto;
	}
	.cvd-cards {
		display: flex;
		gap: 12px;
		overflow-x: auto;
		scroll-snap-type: x mandatory;
		scrollbar-width: none;
		margin-right: -12vw;
		padding-right: 12vw;
	}
	.cvd-cards::-webkit-scrollbar {
		display: none;
	}
	.cvd-card {
		position: relative;
		display: flex;
		flex: 0 0 min(460px, 82vw);
		min-height: 650px;
		flex-direction: column;
		overflow: hidden;
		padding: 24px;
		border-radius: 24px;
		scroll-snap-align: start;
	}
	.cvd-card__head {
		margin: 0;
		font-size: 1em;
		text-transform: uppercase;
	}
	.cvd-card--grey {
		background: #dcdcdc;
	}
	.cvd-card__story {
		margin: auto 0 0;
		font-size: 1.6em;
		font-weight: 500;
		line-height: 1.4;
		-webkit-mask-image: linear-gradient(180deg, #000 70%, transparent);
		mask-image: linear-gradient(180deg, #000 70%, transparent);
	}
	.cvd-card--black {
		background: #000000;
		color: #ffffff;
	}
	.cvd-polaroids {
		position: relative;
		display: grid;
		flex: 1;
		place-items: center;
	}
	.cvd-polaroid {
		position: relative;
		z-index: 2;
		width: 72%;
		margin: 0;
		padding: 12px 12px 18px;
		background: #f4f2ee;
		color: #1d1812;
		box-shadow: 0 20px 40px -20px rgba(0, 0, 0, 0.8);
		text-align: center;
	}
	.cvd-polaroid--back,
	.cvd-polaroid--back2 {
		position: absolute;
		z-index: 1;
		height: 78%;
		width: 64%;
		padding: 0;
		background: #e8e6e1;
		transform: translate(8%, -2%) rotate(3deg);
	}
	.cvd-polaroid--back2 {
		background: #dedbd5;
		transform: translate(14%, 1%) rotate(6deg);
	}
	.cvd-polaroid__img {
		position: relative;
		display: block;
		aspect-ratio: 1;
		overflow: hidden;
		background: #dddddd;
	}
	.cvd-polaroid figcaption {
		margin-top: 14px;
		font-size: 0.95em;
	}
	.cvd-polaroid figcaption span {
		display: block;
		margin-top: 4px;
		color: #524d46;
		font-size: 0.8em;
		text-transform: uppercase;
	}
	.cvd-card--white {
		background: #ffffff;
	}
	.cvd-credits {
		margin: 3.5em 0 0;
	}
	.cvd-credit {
		display: flex;
		align-items: baseline;
		gap: 0.8em;
		margin: 0 0 1.4em;
	}
	.cvd-credit dt {
		flex-shrink: 0;
		text-transform: uppercase;
	}
	.cvd-credit span {
		flex: 1;
		border-bottom: 1px dashed rgba(0, 0, 0, 0.2);
		transform: translateY(-3px);
	}
	.cvd-credit dd {
		max-width: 55%;
		margin: 0;
		overflow: hidden;
		text-align: right;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.cvd-source {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-top: auto;
	}
	.cvd-source__avatar {
		display: grid;
		height: 48px;
		width: 48px;
		place-items: center;
		border-radius: 50%;
		background: #fe5416;
	}
	.cvd-source__avatar img {
		width: 80%;
		height: auto;
		filter: brightness(0) invert(1);
	}
	.cvd-nav {
		display: flex;
		justify-content: flex-end;
		gap: 0.6em;
		margin-top: 1.4em;
	}
	.cvd-nav button {
		display: grid;
		height: 44px;
		width: 44px;
		place-items: center;
		border: 0;
		border-radius: 50%;
		background: rgba(0, 0, 0, 0.1);
		color: #1d1812;
		font-size: 1.3em;
		cursor: pointer;
	}
	.cvd-nav button:hover {
		background: rgba(0, 0, 0, 0.2);
	}

	/* ── Semua audio ── */
	.cvd-list {
		width: calc(100% - 10vw);
		margin: 12em auto 6em;
	}
	.cvd-h2 {
		margin: 0;
		text-align: center;
		font-size: 1em;
		font-weight: 600;
		text-transform: uppercase;
		color: #524d46;
	}
	.cvd-releases {
		margin: 4em 0 0;
		padding: 0;
		list-style: none;
	}

	@media (max-width: 768px) {
		.cvd-title {
			font-size: 2.6em;
		}
		.cvd-artwork {
			width: 90%;
			min-height: 250px;
			padding: 4em 2em 6em;
		}
		.cvd-artwork__img {
			height: auto;
			width: 100%;
			max-height: none;
		}
		.cvd-data {
			display: flex;
			width: calc(100% - 6em);
			flex-direction: column;
			gap: 1.4em;
			margin: 2em auto;
			padding: 0;
		}
		.cvd-data__item,
		.cvd-data__item:nth-of-type(1),
		.cvd-data__item:nth-of-type(3) {
			flex-direction: row;
			justify-content: space-between;
			align-items: center;
		}
		.cvd-cards-wrap {
			width: calc(100% - 24px);
		}
		.cvd-cards {
			margin-right: -12px;
			padding-right: 12px;
		}
		.cvd-card {
			min-height: 520px;
		}
		.cvd-list {
			width: calc(100% - 24px);
			margin-top: 6em;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.cvd-script span {
			animation: none;
			clip-path: none;
		}
	}
</style>
