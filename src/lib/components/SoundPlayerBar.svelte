<script lang="ts">
	/**
	 * Bilah pemutar bawah halaman Sounds — muncul begitu sebuah lagu diputar, tetap ada saat pindah antara daftar
	 * dan halaman detail (dipasang di routes/sounds/+layout.svelte). Ponsel: sampul, judul, putar/jeda, tutup,
	 * dengan garis progres di tepi atas; layar lebar: + maju/mundur, gelombang yang bisa digeser, waktu, volume,
	 * dan tombol keranjang.
	 */
	import { fly } from "svelte/transition";
	import { cubicOut } from "svelte/easing";
	import { i18n } from "$lib/i18n.svelte";
	import { store } from "$lib/store.svelte";
	import { announcer } from "$lib/stores/announce.svelte";
	import { player } from "$lib/soundPlayer.svelte";
	import { fmtDuration, fmtIDR } from "$lib/data";
	import ApiImage from "./ApiImage.svelte";
	import Waveform from "./Waveform.svelte";

	const copy = {
		id: { region: "Pemutar audio", play: "Putar", pause: "Jeda", prev: "Sebelumnya", next: "Berikutnya", close: "Tutup pemutar", volume: "Volume", seek: "Posisi putar", addToCart: "Tambah ke keranjang", added: "Ditambahkan", error: "Pratinjau tak bisa diputar", previewTag: "Pratinjau" },
		en: { region: "Audio player", play: "Play", pause: "Pause", prev: "Previous", next: "Next", close: "Close player", volume: "Volume", seek: "Playback position", addToCart: "Add to cart", added: "Added", error: "Preview can't be played", previewTag: "Preview" },
	};
	const lang = $derived(i18n.lang);
	const t = $derived(copy[lang]);
	const track = $derived(player.track);
	const total = $derived(player.duration || track?.duration || 0);

	let added = $state(false);
	function addToCart() {
		if (!track) return;
		const title = track.title[lang];
		void store.addToCart({ id: track.id, kind: "sound", title, price: track.price, meta: track.id, thumbUrl: track.cover });
		added = true;
		announcer.announce(`${title} — ${t.added}`);
		setTimeout(() => (added = false), 1600);
	}

	// Spasi = putar/jeda (di luar kolom isian & tombol yang sedang difokus).
	function onKey(e: KeyboardEvent) {
		if (!track || e.code !== "Space" || e.repeat) return;
		const el = e.target as HTMLElement | null;
		if (el?.closest("input, textarea, select, button, a, [role=slider], [contenteditable=true]")) return;
		e.preventDefault();
		player.toggle();
	}

	// Tombol mengambang (chat, ke atas) ikut naik supaya tak tertutup bilah ini.
	$effect(() => {
		const up = !!track;
		const els = [...document.querySelectorAll<HTMLElement>(".fab-mengambang")];
		for (const el of els) el.style.bottom = up ? "6.5rem" : "";
		return () => {
			for (const el of els) el.style.bottom = "";
		};
	});
</script>

<svelte:window onkeydown={onKey} />

{#snippet ctl(label: string, onclick: () => void, path: string, cls = "")}
	<button type="button" {onclick} aria-label={label} title={label} class={`grid h-9 w-9 place-items-center rounded-full text-fg/80 transition-colors hover:bg-fg/[0.06] hover:text-safelight focus-visible:outline-2 focus-visible:outline-safelight ${cls}`}>
		<svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d={path} /></svg>
	</button>
{/snippet}

{#if track}
	<div
		role="region"
		aria-label={t.region}
		data-no-hover-sound
		data-no-click-sound
		transition:fly={{ y: 80, duration: 320, easing: cubicOut }}
		class="fixed inset-x-0 bottom-0 z-40 border-t border-hair bg-bg/92 backdrop-blur-xl"
	>
		<!-- Garis progres (ponsel). -->
		<div class="absolute inset-x-0 top-0 h-[2px] bg-fg/10 lg:hidden" aria-hidden="true">
			<div class="h-full bg-safelight" style={`width: ${player.progress * 100}%`}></div>
		</div>
		<div class="mx-auto flex max-w-[1500px] items-center gap-3 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:gap-5 sm:px-6 lg:px-10">
			<!-- Sampul + judul -->
			<a href={`/sounds/${track.id}`} class="flex min-w-0 items-center gap-3 lg:w-[17rem] lg:shrink-0">
				<span class="relative h-11 w-11 shrink-0 overflow-hidden rounded-[3px] bg-ocean sm:h-12 sm:w-12">
					{#if track.cover}<ApiImage src={track.cover} alt="" fill class="object-cover object-top" />{/if}
				</span>
				<span class="min-w-0">
					<span class="block truncate text-sm text-fg">{track.title[lang]}</span>
					<span class="block truncate text-xs text-fg-muted">
						{#if player.error}<span class="text-safelight">{t.error}</span>{:else}{track.author}{/if}
					</span>
				</span>
			</a>

			<!-- Kontrol -->
			<div class="ml-auto flex shrink-0 items-center gap-1 lg:ml-0">
				{@render ctl(t.prev, () => player.prev(), "M6 5h2v14H6zM20 6.2v11.6a1 1 0 0 1-1.53.85L10 13.2a1.4 1.4 0 0 1 0-2.4l8.47-5.45A1 1 0 0 1 20 6.2z", "hidden sm:grid")}
				<button
					type="button"
					onclick={() => player.toggle()}
					aria-label={player.playing ? t.pause : t.play}
					class="grid h-11 w-11 place-items-center rounded-full bg-safelight text-ivory shadow-[0_10px_30px_-10px_var(--safelight-glow)] transition-transform hover:scale-[1.05] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-safelight"
				>
					{#if player.loading && player.playing}
						<span class="h-5 w-5 animate-spin rounded-full border-2 border-ivory/30 border-t-ivory"></span>
					{:else if player.playing}
						<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
					{:else}
						<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.14v13.72a1 1 0 0 0 1.52.85l11.03-6.86a1 1 0 0 0 0-1.7L9.52 4.29A1 1 0 0 0 8 5.14z" /></svg>
					{/if}
				</button>
				{@render ctl(t.next, () => player.next(), "M16 5h2v14h-2zM4 6.2v11.6a1 1 0 0 0 1.53.85L14 13.2a1.4 1.4 0 0 0 0-2.4L5.53 5.35A1 1 0 0 0 4 6.2z", "hidden sm:grid")}
			</div>

			<!-- Gelombang + waktu (layar lebar) -->
			<div class="hidden min-w-0 flex-1 items-center gap-4 lg:flex">
				<span class="w-10 shrink-0 text-right font-mono text-[0.74rem] tabular-nums text-fg-muted">{fmtDuration(player.time)}</span>
				<Waveform peaks={track.waveform} progress={player.progress} active label={t.seek} onseek={(r) => player.seek(r)} bars={140} class="h-9 min-w-0 flex-1" />
				<span class="w-10 shrink-0 font-mono text-[0.74rem] tabular-nums text-fg-muted">{fmtDuration(total)}</span>
			</div>

			<!-- Volume + keranjang + tutup -->
			<div class="flex shrink-0 items-center gap-1 sm:gap-3">
				<label class="hidden items-center gap-2 xl:flex">
					<span class="sr-only">{t.volume}</span>
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" class="text-fg-muted" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4z" /><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" /></svg>
					<input
						type="range"
						min="0"
						max="1"
						step="0.05"
						value={player.volume}
						oninput={(e) => player.setVolume(Number(e.currentTarget.value))}
						class="snd-vol w-24"
					/>
				</label>
				<button
					type="button"
					onclick={addToCart}
					class="hidden items-center gap-2 rounded-full border border-hair px-4 py-2 text-xs font-medium text-fg transition-colors hover:border-safelight hover:text-safelight sm:inline-flex"
				>
					{#if added}✓ {t.added}{:else}<span aria-hidden="true">+</span> {fmtIDR(track.price)}{/if}
				</button>
				<button
					type="button"
					onclick={() => player.close()}
					aria-label={t.close}
					title={t.close}
					class="grid h-9 w-9 place-items-center rounded-full text-fg-muted transition-colors hover:bg-fg/[0.06] hover:text-safelight focus-visible:outline-2 focus-visible:outline-safelight"
				>
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.snd-vol {
		accent-color: var(--safelight);
		height: 1rem;
	}
</style>
