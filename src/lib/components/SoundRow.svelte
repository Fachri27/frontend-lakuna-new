<script lang="ts">
	/**
	 * Satu baris daftar Sounds (pola daftar lagu situs audio stok): sampul + tombol putar, judul & kreator,
	 * gelombang (bisa diklik untuk lompat), tag, durasi/BPM, lalu aksi — keranjang, simpan, salin tautan, lisensi.
	 * Pemutarannya lewat `player` bersama, jadi hanya satu lagu yang berbunyi.
	 */
	import { i18n } from "$lib/i18n.svelte";
	import { store } from "$lib/store.svelte";
	import { announcer } from "$lib/stores/announce.svelte";
	import { player } from "$lib/soundPlayer.svelte";
	import { fmtDuration, type Sound } from "$lib/data";
	import ApiImage from "./ApiImage.svelte";
	import Waveform from "./Waveform.svelte";

	let { sound, queue, index }: { sound: Sound; queue: Sound[]; index?: number } = $props();

	const copy = {
		id: { play: "Putar", pause: "Jeda", addToCart: "Tambah ke keranjang", added: "Ditambahkan ke keranjang", save: "Simpan", unsave: "Hapus dari simpanan", copy: "Salin tautan", copied: "Tautan disalin", license: "Lisensi & unduh", music: "Musik", sfx: "Efek suara", seek: "Posisi putar" },
		en: { play: "Play", pause: "Pause", addToCart: "Add to cart", added: "Added to cart", save: "Save", unsave: "Remove from saved", copy: "Copy link", copied: "Link copied", license: "License & download", music: "Music", sfx: "Sound effect", seek: "Playback position" },
	};
	const lang = $derived(i18n.lang);
	const t = $derived(copy[lang]);

	const current = $derived(player.isCurrent(sound.id));
	const playingNow = $derived(current && player.playing);
	const fav = $derived(store.isFavorite(sound.id));
	const title = $derived(sound.title[lang]);
	const tags = $derived(
		[...(lang === "en" && sound.categoriesEn?.length ? sound.categoriesEn : sound.categories), ...(lang === "en" && sound.keywordsEn?.length ? sound.keywordsEn : sound.keywords)]
			.filter((v, i, a) => a.findIndex((x) => x.toLowerCase() === v.toLowerCase()) === i)
			.slice(0, 4)
	);
	const href = $derived(`/sounds/${sound.id}`);

	let added = $state(false);
	let copied = $state(false);

	function toggle() {
		player.play(sound, queue);
	}
	function seek(r: number) {
		if (!current) player.play(sound, queue);
		player.seek(r);
	}
	function addToCart() {
		void store.addToCart({ id: sound.id, kind: "sound", title, price: sound.price, meta: sound.id, thumbUrl: sound.cover });
		added = true;
		announcer.announce(`${title} — ${t.added}`);
		setTimeout(() => (added = false), 1600);
	}
	async function copyLink() {
		try {
			await navigator.clipboard.writeText(new URL(href, window.location.origin).href);
			copied = true;
			announcer.announce(t.copied);
			setTimeout(() => (copied = false), 1600);
		} catch {
			/* clipboard diblokir — abaikan */
		}
	}
</script>

{#snippet icon(name: string)}
	{#if name === "play"}
		<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.14v13.72a1 1 0 0 0 1.52.85l11.03-6.86a1 1 0 0 0 0-1.7L9.52 4.29A1 1 0 0 0 8 5.14z" /></svg>
	{:else if name === "pause"}
		<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
	{/if}
{/snippet}

<div
	class={`snd-row group relative grid items-center gap-x-3 rounded-[3px] border px-2.5 py-2.5 transition-colors sm:gap-x-5 sm:px-3 ${
		current ? "border-safelight/45 bg-safelight/[0.06]" : "border-hair bg-fg/[0.025] hover:bg-fg/[0.05]"
	}`}
>
	<!-- Sampul = tombol putar. -->
	<button
		type="button"
		onclick={toggle}
		aria-label={`${playingNow ? t.pause : t.play} — ${title}`}
		aria-pressed={playingNow}
		class="relative h-14 w-14 shrink-0 overflow-hidden rounded-[3px] bg-ocean focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-safelight sm:h-16 sm:w-16"
	>
		{#if sound.cover}
			<ApiImage src={sound.cover} alt="" fill class="object-cover object-top transition-transform duration-500 group-hover:scale-[1.06]" />
		{/if}
		<span
			class={`absolute inset-0 grid place-items-center bg-ocean-deep/45 text-ivory transition-opacity duration-200 ${
				current ? "opacity-100" : "opacity-0 group-hover:opacity-100 focus-visible:opacity-100 max-sm:opacity-100 max-sm:bg-ocean-deep/25"
			}`}
		>
			{#if current && player.loading && player.playing}
				<span class="h-5 w-5 animate-spin rounded-full border-2 border-ivory/30 border-t-ivory"></span>
			{:else}
				{@render icon(playingNow ? "pause" : "play")}
			{/if}
		</span>
	</button>

	<!-- Judul & kreator (+ durasi di ponsel). -->
	<div class="min-w-0">
		<a {href} class="block truncate text-[0.95rem] leading-snug text-fg transition-colors hover:text-safelight">
			{#if index !== undefined}<span class="mr-2 hidden font-mono text-[0.7rem] tabular-nums text-fg-muted sm:inline">{String(index + 1).padStart(2, "0")}</span>{/if}{title}
		</a>
		<p class="mt-0.5 truncate text-xs text-fg-muted">
			<a href={`/archive/${encodeURIComponent(sound.author)}`} class="transition-colors hover:text-safelight">{sound.author}</a>
			<span class="md:hidden"> · {fmtDuration(sound.duration)}{sound.bpm ? ` · ${sound.bpm} BPM` : ""}</span>
		</p>
	</div>

	<!-- Gelombang: klik untuk lompat (memutar lagu ini bila belum). -->
	<Waveform
		peaks={sound.waveform}
		progress={current ? player.progress : 0}
		active={current}
		label={`${t.seek} — ${title}`}
		onseek={seek}
		bars={90}
		class="snd-wave hidden h-9 lg:block"
	/>

	<!-- Tag (kategori dulu, lalu kata kunci). -->
	<p class="snd-tags hidden truncate text-xs text-fg/75 xl:block">
		{tags.join(", ") || (sound.kind === "SFX" ? t.sfx : t.music)}
	</p>

	<!-- Durasi / BPM. -->
	<div class="hidden text-right font-mono text-[0.78rem] tabular-nums md:block">
		<p class="text-fg">{current && player.time > 0 ? fmtDuration(player.time) : fmtDuration(sound.duration)}</p>
		<p class="mt-0.5 text-fg-muted">{sound.bpm ? `${sound.bpm} BPM` : sound.kind === "SFX" ? "SFX" : "—"}</p>
	</div>

	<!-- Aksi. -->
	<div class="flex items-center justify-end gap-0.5 sm:gap-1">
		<button type="button" onclick={addToCart} aria-label={`${t.addToCart} — ${title}`} title={t.addToCart} class="snd-act grid place-items-center">
			{#if added}
				<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>
			{:else}
				<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
			{/if}
		</button>
		<button type="button" onclick={() => store.toggleFavorite(sound.id)} aria-label={`${fav ? t.unsave : t.save} — ${title}`} aria-pressed={fav} title={fav ? t.unsave : t.save} class="snd-act grid place-items-center">
			<svg width="17" height="17" viewBox="0 0 24 24" fill={fav ? "currentColor" : "none"} stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" /></svg>
		</button>
		<button type="button" onclick={copyLink} aria-label={`${t.copy} — ${title}`} title={copied ? t.copied : t.copy} class="snd-act grid place-items-center max-sm:hidden">
			{#if copied}
				<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>
			{:else}
				<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7" /><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" /></svg>
			{/if}
		</button>
		<a {href} aria-label={`${t.license} — ${title}`} title={t.license} class="snd-act grid place-items-center max-sm:hidden">
			<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v11M7 10.5 12 15.5l5-5" /><path d="M5 19.5h14" /></svg>
		</a>
	</div>
</div>

<style>
	.snd-row {
		grid-template-columns: auto minmax(0, 1fr) auto;
	}
	@media (min-width: 768px) {
		.snd-row {
			grid-template-columns: auto minmax(0, 1fr) 4.25rem auto;
		}
	}
	@media (min-width: 1024px) {
		.snd-row {
			grid-template-columns: auto minmax(0, 15rem) minmax(0, 1fr) 4.25rem auto;
		}
	}
	@media (min-width: 1280px) {
		.snd-row {
			grid-template-columns: auto minmax(0, 15rem) minmax(0, 1fr) minmax(0, 11rem) 4.25rem auto;
		}
	}
	/* Tanpa `display` di sini: gaya komponen (tak ber-layer) mengalahkan utilitas Tailwind, jadi `max-sm:hidden`
	   tak akan berlaku. Tata letaknya lewat kelas `grid place-items-center`. */
	.snd-act {
		height: 2.25rem;
		width: 2.25rem;
		border-radius: 9999px;
		color: var(--safelight);
		transition:
			background-color 0.2s,
			color 0.2s;
	}
	.snd-act:hover {
		background: color-mix(in srgb, var(--safelight) 12%, transparent);
	}
	.snd-act:focus-visible {
		outline: 2px solid var(--safelight);
		outline-offset: 1px;
	}
</style>
