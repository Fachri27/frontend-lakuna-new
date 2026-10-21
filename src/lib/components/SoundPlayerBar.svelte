<script lang="ts">
	/**
	 * Pemutar mengambang halaman Sounds — pola coveomusic.com: kartu di tengah bawah bertuliskan "Memutar
	 * pratinjau" + judul, piringan vinyl berlabel sampul yang menyembul dan berputar selama lagu berjalan, waktu
	 * "00:02 / 00:32", dan tombol jeda; ditambah garis progres yang bisa diklik dan tombol tutup (keranjang ada di
	 * baris katalog & halaman detail — kartu dibiarkan lega seperti acuan).
	 * Tetap hidup saat pindah antara /sounds dan /sounds/<id> (dipasang di routes/sounds/+layout.svelte).
	 */
	import { fly } from "svelte/transition";
	import { cubicOut } from "svelte/easing";
	import { i18n } from "$lib/i18n.svelte";
	import { player } from "$lib/soundPlayer.svelte";
	import ApiImage from "./ApiImage.svelte";

	const copy = {
		id: { region: "Pemutar audio", now: "Memutar pratinjau", paused: "Pratinjau dijeda", play: "Putar", pause: "Jeda", close: "Tutup pemutar", seek: "Posisi putar", error: "Pratinjau tak bisa diputar" },
		en: { region: "Audio player", now: "Previewing", paused: "Preview paused", play: "Play", pause: "Pause", close: "Close player", seek: "Playback position", error: "Preview can't be played" },
	};
	const lang = $derived(i18n.lang);
	const t = $derived(copy[lang]);
	const track = $derived(player.track);
	const total = $derived(player.duration || track?.duration || 0);
	const two = (n: number) => String(n).padStart(2, "0");
	const clock = (sec: number) => {
		const s = Math.max(0, Math.round(sec || 0));
		return `${two(Math.floor(s / 60))}:${two(s % 60)}`;
	};

	// Spasi = putar/jeda (di luar kolom isian & tombol yang sedang difokus).
	function onKey(e: KeyboardEvent) {
		if (!track || e.code !== "Space" || e.repeat) return;
		const el = e.target as HTMLElement | null;
		if (el?.closest("input, textarea, select, button, a, [role=slider], [contenteditable=true]")) return;
		e.preventDefault();
		player.toggle();
	}

	let bar: HTMLDivElement | undefined = $state();
	function seekAt(e: PointerEvent) {
		const r = bar!.getBoundingClientRect();
		player.seek(Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)));
	}
	function seekKey(e: KeyboardEvent) {
		if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
			e.preventDefault();
			player.skip(e.key === "ArrowRight" ? 5 : -5);
		}
	}

	// Tombol mengambang (chat, ke atas) ikut naik supaya tak tertutup kartu ini.
	$effect(() => {
		const up = !!track;
		const els = [...document.querySelectorAll<HTMLElement>(".fab-mengambang")];
		for (const el of els) el.style.bottom = up ? "8.5rem" : "";
		return () => {
			for (const el of els) el.style.bottom = "";
		};
	});
</script>

<svelte:window onkeydown={onKey} />

{#if track}
	<div
		role="region"
		aria-label={t.region}
		data-no-hover-sound
		data-no-click-sound
		transition:fly={{ y: 120, duration: 380, easing: cubicOut }}
		class="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6 sm:pb-6"
	>
		<div class="pointer-events-auto relative w-full max-w-[42rem] overflow-hidden rounded-[18px] border border-hair bg-bg/88 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.9)] backdrop-blur-xl">
			<!-- Piringan vinyl menyembul dari tengah kartu: warnanya dari sampul (diburamkan), label = sampul. -->
			<div aria-hidden="true" class="pointer-events-none absolute left-1/2 top-[22%] hidden -translate-x-1/2 sm:block">
				<div class={`snd-vinyl relative h-52 w-52 overflow-hidden rounded-full bg-ocean ${player.playing ? "snd-vinyl--on" : ""}`}>
					{#if track.cover}
						<ApiImage src={track.cover} alt="" fill class="scale-[1.6] object-cover opacity-80 blur-[6px] saturate-150" />
					{/if}
					<span class="snd-grooves absolute inset-0 rounded-full"></span>
					<div class="absolute left-1/2 top-1/2 h-[36%] w-[36%] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-full bg-ocean ring-1 ring-black/40">
						{#if track.cover}<ApiImage src={track.cover} alt="" fill class="object-cover object-top" />{/if}
					</div>
					<span class="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-bg"></span>
				</div>
			</div>

			<div class="relative flex items-center gap-3 px-4 py-4 sm:gap-4 sm:px-6 sm:py-5">
				<!-- Ponsel: sampul kecil (piringan disembunyikan). -->
				<span class="relative h-11 w-11 shrink-0 overflow-hidden rounded-[22%] bg-ocean sm:hidden">
					{#if track.cover}<ApiImage src={track.cover} alt="" fill class="object-cover object-top" />{/if}
				</span>
				<a href={`/sounds/${track.id}`} class="min-w-0 flex-1 sm:max-w-[11rem]">
					<span class="block text-[0.62rem] font-semibold uppercase tracking-[0.1em] text-fg-muted">
						{#if player.error}<span class="text-safelight">{t.error}</span>{:else}{player.playing ? t.now : t.paused}{/if}
					</span>
					<span class="mt-0.5 block truncate text-[0.85rem] font-semibold uppercase tracking-[0.02em] text-fg">{track.title[lang]}</span>
				</a>

				<div class="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
					<span class="hidden font-mono text-[0.78rem] tabular-nums text-fg sm:inline">{clock(player.time)} / {clock(total)}</span>
					<button
						type="button"
						onclick={() => player.toggle()}
						aria-label={player.playing ? t.pause : t.play}
						class="grid h-10 w-10 place-items-center rounded-full border border-hair text-fg transition-colors hover:border-safelight hover:text-safelight focus-visible:outline-2 focus-visible:outline-safelight"
					>
						{#if player.loading && player.playing}
							<span class="h-4 w-4 animate-spin rounded-full border-2 border-fg/25 border-t-fg"></span>
						{:else if player.playing}
							<span class="snd-bars" aria-hidden="true"><i></i><i></i><i></i><i></i></span>
						{:else}
							<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.14v13.72a1 1 0 0 0 1.52.85l11.03-6.86a1 1 0 0 0 0-1.7L9.52 4.29A1 1 0 0 0 8 5.14z" /></svg>
						{/if}
					</button>
					<button
						type="button"
						onclick={() => player.close()}
						aria-label={t.close}
						title={t.close}
						class="grid h-9 w-9 place-items-center rounded-full text-fg-muted transition-colors hover:bg-fg/[0.06] hover:text-safelight focus-visible:outline-2 focus-visible:outline-safelight"
					>
						<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
					</button>
				</div>
			</div>

			<!-- Garis progres (klik/geser untuk lompat). -->
			<div
				bind:this={bar}
				role="slider"
				tabindex="0"
				aria-label={t.seek}
				aria-valuemin={0}
				aria-valuemax={Math.round(total)}
				aria-valuenow={Math.round(player.time)}
				onpointerdown={seekAt}
				onkeydown={seekKey}
				class="relative h-3 cursor-pointer focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-safelight"
			>
				<div class="absolute inset-x-0 bottom-0 h-[3px] bg-fg/10">
					<div class="h-full bg-safelight" style={`width: ${player.progress * 100}%`}></div>
				</div>
			</div>
		</div>
	</div>
{/if}

<style>
	/* Alur piringan: garis-garis melingkar halus + kilau. */
	.snd-vinyl {
		box-shadow:
			0 0 0 1px rgba(255, 255, 255, 0.06),
			0 20px 50px -20px rgba(0, 0, 0, 0.8);
		animation: snd-vinyl 4.5s linear infinite;
		animation-play-state: paused;
	}
	/* Alur piringan + kilau di atas warna sampul. */
	.snd-grooves {
		background:
			radial-gradient(circle at 32% 28%, rgba(255, 255, 255, 0.22), transparent 42%),
			repeating-radial-gradient(circle, rgba(0, 0, 0, 0.32) 0 1.5px, rgba(0, 0, 0, 0.08) 1.5px 3.5px);
	}
	.snd-vinyl--on {
		animation-play-state: running;
	}
	@keyframes snd-vinyl {
		to {
			transform: rotate(360deg);
		}
	}
	/* Ikon "sedang diputar": batang equalizer. */
	.snd-bars {
		display: inline-flex;
		align-items: center;
		gap: 2px;
		height: 14px;
	}
	.snd-bars i {
		width: 2px;
		height: 100%;
		background: currentColor;
		border-radius: 1px;
		animation: snd-bars 1s ease-in-out infinite;
	}
	.snd-bars i:nth-child(2) {
		animation-delay: -0.25s;
	}
	.snd-bars i:nth-child(3) {
		animation-delay: -0.5s;
	}
	.snd-bars i:nth-child(4) {
		animation-delay: -0.75s;
	}
	@keyframes snd-bars {
		0%,
		100% {
			transform: scaleY(0.35);
		}
		50% {
			transform: scaleY(1);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.snd-vinyl,
		.snd-bars i {
			animation: none;
		}
	}
</style>
