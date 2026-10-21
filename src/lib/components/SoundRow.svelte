<script lang="ts">
	/**
	 * Satu baris katalog Sounds — pola daftar rilis coveomusic.com: nomor urut, sampul bersudut bulat, judul
	 * huruf kapital, lalu di kanan tanggal · jenis · durasi panjang dan tombol "Pratinjau" berbentuk pil.
	 * Ditambah kebutuhan toko Lakuna: kreator, harga, keranjang, dan simpan. Pemutarannya lewat `player`
	 * bersama, jadi hanya satu audio yang berbunyi.
	 */
	import { i18n } from "$lib/i18n.svelte";
	import { store } from "$lib/store.svelte";
	import { announcer } from "$lib/stores/announce.svelte";
	import { player } from "$lib/soundPlayer.svelte";
	import { fmtIDR, type Sound } from "$lib/data";
	import ApiImage from "./ApiImage.svelte";

	let { sound, queue, index }: { sound: Sound; queue: Sound[]; index?: number } = $props();

	const copy = {
		id: { preview: "Pratinjau", pause: "Jeda", addToCart: "Tambah ke keranjang", added: "Ditambahkan ke keranjang", save: "Simpan", unsave: "Hapus dari simpanan", music: "Musik", sfx: "Efek suara", min: "menit", sec: "detik", by: "oleh" },
		en: { preview: "Preview", pause: "Pause", addToCart: "Add to cart", added: "Added to cart", save: "Save", unsave: "Remove from saved", music: "Music", sfx: "Sound effect", min: "minutes", sec: "seconds", by: "by" },
	};
	const lang = $derived(i18n.lang);
	const t = $derived(copy[lang]);

	const current = $derived(player.isCurrent(sound.id));
	const playingNow = $derived(current && player.playing);
	const fav = $derived(store.isFavorite(sound.id));
	const title = $derived(sound.title[lang]);
	const href = $derived(`/sounds/${sound.id}`);
	const no = $derived(index !== undefined ? String(index + 1).padStart(3, "0") : "");
	const date = $derived(
		sound.createdAt
			? new Intl.DateTimeFormat(lang === "en" ? "en-US" : "id-ID", { month: "long", year: "numeric" }).format(new Date(sound.createdAt))
			: ""
	);
	const kindText = $derived(`${sound.kind === "SFX" ? t.sfx : t.music}${sound.bpm ? `, ${sound.bpm} BPM` : ""}`);
	// "3 menit 19 detik" — durasi panjang seperti acuan.
	const longDur = $derived.by(() => {
		const s = Math.max(0, Math.round(sound.duration));
		const m = Math.floor(s / 60);
		return m ? `${m} ${t.min} ${s % 60} ${t.sec}` : `${s} ${t.sec}`;
	});

	let added = $state(false);
	function addToCart() {
		void store.addToCart({ id: sound.id, kind: "sound", title, price: sound.price, meta: sound.id, thumbUrl: sound.cover });
		added = true;
		announcer.announce(`${title} — ${t.added}`);
		setTimeout(() => (added = false), 1600);
	}
</script>

<div
	class={`snd-row group relative grid items-center gap-x-4 rounded-[14px] px-3 py-3 transition-colors duration-300 sm:gap-x-6 ${
		current ? "bg-fg/[0.07]" : "hover:bg-fg/[0.04]"
	}`}
>
	<span class="hidden w-8 font-mono text-[0.72rem] tabular-nums text-fg-muted sm:block">{no}</span>

	<!-- Sampul = tombol putar juga. -->
	<button
		type="button"
		onclick={() => player.play(sound, queue)}
		aria-label={`${playingNow ? t.pause : t.preview} — ${title}`}
		class="relative h-14 w-14 shrink-0 overflow-hidden rounded-[22%] bg-ocean focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-safelight sm:h-[4.5rem] sm:w-[4.5rem]"
	>
		{#if sound.cover}
			<ApiImage src={sound.cover} alt="" fill class="object-cover object-top transition-transform duration-500 group-hover:scale-[1.05]" />
		{/if}
		{#if current}
			<span class="absolute inset-0 grid place-items-center bg-ocean-deep/45 text-ivory">
				{#if playingNow}
					<span class="snd-eq" aria-hidden="true"><i></i><i></i><i></i></span>
				{:else}
					<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.14v13.72a1 1 0 0 0 1.52.85l11.03-6.86a1 1 0 0 0 0-1.7L9.52 4.29A1 1 0 0 0 8 5.14z" /></svg>
				{/if}
			</span>
		{/if}
	</button>

	<!-- Judul (kapital) + kreator; layar sempit: jenis & durasi di bawahnya. -->
	<div class="min-w-0">
		<a {href} class="block truncate text-[0.9rem] font-semibold uppercase tracking-[0.02em] text-fg transition-colors hover:text-safelight">{title}</a>
		<p class="mt-1 truncate text-xs text-fg-muted">
			{t.by} <a href={`/archive/${encodeURIComponent(sound.author)}`} class="transition-colors hover:text-safelight">{sound.author}</a>
		</p>
		<p class="mt-1 truncate text-[0.66rem] font-medium uppercase tracking-[0.04em] text-fg/70 lg:hidden">{kindText} · {longDur} · {fmtIDR(sound.price)}</p>
	</div>

	<!-- Meta kanan (layar lebar): tanggal · jenis · durasi · harga. -->
	<p class="hidden items-center justify-end gap-5 whitespace-nowrap text-[0.7rem] font-medium uppercase tracking-[0.04em] text-fg/80 lg:flex">
		{#if date}<span class="hidden xl:inline">{date}</span>{/if}
		<span>{kindText}</span>
		<span>{longDur}</span>
		<span class="font-mono tabular-nums text-fg-muted">{fmtIDR(sound.price)}</span>
	</p>

	<!-- Aksi: pil Pratinjau + keranjang + simpan. -->
	<div class="flex items-center justify-end gap-1 sm:gap-2">
		<button
			type="button"
			onclick={() => player.play(sound, queue)}
			aria-label={`${playingNow ? t.pause : t.preview} — ${title}`}
			aria-pressed={playingNow}
			class={`press inline-flex h-10 items-center gap-2.5 rounded-full px-3 font-mono text-[0.7rem] uppercase tracking-[0.06em] transition-colors sm:px-4 ${
				playingNow ? "bg-safelight text-ivory" : "bg-fg/[0.08] text-fg hover:bg-fg/[0.14]"
			}`}
		>
			{#if playingNow}
				<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><circle cx="12" cy="12" r="9.2" /><path d="M10 9v6M14 9v6" stroke-linecap="round" /></svg>
			{:else}
				<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><circle cx="12" cy="12" r="9.2" /><path d="M10.2 8.6v6.8l5.3-3.4z" fill="currentColor" stroke-linejoin="round" /></svg>
			{/if}
			<span class="hidden sm:inline">{playingNow ? t.pause : t.preview}</span>
		</button>
		<button type="button" onclick={addToCart} aria-label={`${t.addToCart} — ${title}`} title={t.addToCart} class="snd-act grid place-items-center">
			{#if added}
				<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>
			{:else}
				<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="20" r="1.4" /><circle cx="18" cy="20" r="1.4" /><path d="M2.5 3h2.2l2.3 11.2a1.6 1.6 0 0 0 1.6 1.3h8.6a1.6 1.6 0 0 0 1.6-1.3L21 7H6" /></svg>
			{/if}
		</button>
		<button type="button" onclick={() => store.toggleFavorite(sound.id)} aria-label={`${fav ? t.unsave : t.save} — ${title}`} aria-pressed={fav} title={fav ? t.unsave : t.save} class="snd-act grid place-items-center max-sm:hidden">
			<svg width="17" height="17" viewBox="0 0 24 24" fill={fav ? "currentColor" : "none"} stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" /></svg>
		</button>
	</div>
</div>

<style>
	.snd-row {
		grid-template-columns: auto minmax(0, 1fr) auto;
	}
	@media (min-width: 640px) {
		.snd-row {
			grid-template-columns: auto auto minmax(0, 1fr) auto;
		}
	}
	@media (min-width: 1024px) {
		.snd-row {
			grid-template-columns: auto auto minmax(0, 1fr) auto auto;
		}
	}
	/* Tanpa `display`: gaya komponen (tak ber-layer) mengalahkan utilitas Tailwind seperti `max-sm:hidden`. */
	.snd-act {
		height: 2.25rem;
		width: 2.25rem;
		border-radius: 9999px;
		color: var(--fg-muted);
		transition:
			background-color 0.2s,
			color 0.2s;
	}
	.snd-act:hover {
		color: var(--safelight);
		background: color-mix(in srgb, var(--safelight) 12%, transparent);
	}
	.snd-act:focus-visible {
		outline: 2px solid var(--safelight);
		outline-offset: 1px;
	}
	/* Batang equalizer kecil di sampul saat diputar. */
	.snd-eq {
		display: inline-flex;
		align-items: flex-end;
		gap: 2px;
		height: 14px;
	}
	.snd-eq i {
		width: 3px;
		background: currentColor;
		border-radius: 1px;
		animation: snd-eq 0.9s ease-in-out infinite;
	}
	.snd-eq i:nth-child(2) {
		animation-delay: -0.3s;
	}
	.snd-eq i:nth-child(3) {
		animation-delay: -0.6s;
	}
	@keyframes snd-eq {
		0%,
		100% {
			height: 30%;
		}
		50% {
			height: 100%;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.snd-eq i {
			animation: none;
			height: 70%;
		}
	}
</style>
