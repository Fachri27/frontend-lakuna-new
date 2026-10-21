<script lang="ts">
	/**
	 * Cuplikan Sounds di landing (di bawah galeri orbit): satu piringan hitam yang diputar sungguhan.
	 * Kiri: sampul (sleeve) dengan piringan yang tertarik keluar begitu sebuah audio dipilih, lengan jarum
	 * turun ke alur luar lalu bergeser ke dalam mengikuti jalannya pratinjau — seperti piringan asli.
	 * Kanan: sisi belakang sampul — Sisi A musik, Sisi B efek suara (4 terbaru per jenis).
	 *
	 * Pemutarannya lewat `player` bersama (satu <audio> untuk seluruh situs). Landing tak punya bilah pemutar,
	 * jadi pratinjau dijeda begitu section ini keluar layar, dan dihentikan saat meninggalkan landing — kecuali
	 * pindah ke /sounds, tempat bilah pemutar melanjutkannya.
	 */
	import { beforeNavigate } from "$app/navigation";
	import { i18n } from "$lib/i18n.svelte";
	import { player } from "$lib/soundPlayer.svelte";
	import { fetchSounds, fmtDuration, type Sound } from "$lib/data";
	import ApiImage from "./ApiImage.svelte";
	import Reveal from "./Reveal.svelte";
	import RevealText from "./RevealText.svelte";

	const copy = {
		id: {
			kicker: "Sounds",
			title: "Dengarkan arsipnya",
			sub: "Musik dan efek suara bebas royalti, dari hujan di hutan dan debur ombak sampai riuh pasar subuh. Putar pratinjaunya di piringan ini, lalu lisensikan berkas aslinya di halaman Sounds.",
			side: "Sisi",
			music: "Musik",
			sfx: "Efek suara",
			play: "Putar",
			pause: "Jeda",
			idle: "Pilih audio dari daftar, atau ketuk piringannya.",
			seek: "Posisi putar",
			of: "dari",
			license: "Lisensikan",
			all: "Lihat semua audio",
			failed: "Pratinjau gagal dimuat. Coba lagi sebentar lagi.",
			empty: "Belum ada audio di arsip. Koleksi musik dan efek suara segera hadir.",
		},
		en: {
			kicker: "Sounds",
			title: "Listen to the archive",
			sub: "Royalty-free music and sound effects, from rain in the forest and breaking surf to a market at dawn. Preview them on this record, then license the original files on the Sounds page.",
			side: "Side",
			music: "Music",
			sfx: "Sound effects",
			play: "Play",
			pause: "Pause",
			idle: "Pick a track from the list, or tap the record.",
			seek: "Playback position",
			of: "of",
			license: "License",
			all: "See all audio",
			failed: "The preview didn't load. Try again in a moment.",
			empty: "No audio in the archive yet. Music and sound effects are coming soon.",
		},
	};
	const lang = $derived(i18n.lang);
	const t = $derived(copy[lang]);

	let music = $state<Sound[]>([]);
	let sfx = $state<Sound[]>([]);
	let loaded = $state(false);

	// Sekali saat tampil di peramban: 4 musik + 4 efek suara terbaru.
	$effect(() => {
		let off = false;
		Promise.all([fetchSounds({ kind: "MUSIC", limit: 4 }), fetchSounds({ kind: "SFX", limit: 4 })])
			.then(([a, b]) => {
				if (off) return;
				music = a.sounds;
				sfx = b.sounds;
			})
			.catch(() => {})
			.finally(() => {
				if (!off) loaded = true;
			});
		return () => {
			off = true;
		};
	});

	const queue = $derived([...music, ...sfx]);
	const sides = $derived(
		[
			{ key: "a", letter: "A", name: t.music, list: music },
			{ key: "b", letter: "B", name: t.sfx, list: sfx },
		].filter((s) => s.list.length)
	);

	/** Audio dari section ini yang sedang dimuat di pemutar (bukan dari halaman lain). */
	const current = $derived(player.track && queue.some((s) => s.id === player.track?.id) ? player.track : null);
	/** Yang tampil di sampul & label: yang sedang diputar, atau audio pertama sebagai "siap diputar". */
	const shown = $derived(current ?? queue[0] ?? null);
	const spinning = $derived(!!current && player.playing);

	/**
	 * Sudut lengan (derajat, searah jarum jam dari posisi parkir menggantung). Geometrinya di CSS: poros di
	 * (pusat piringan + 1,1R, −0,85R), panjang lengan 1,55R. 16° = jarum di alur terluar (0,93R), 37° = alur
	 * terdalam tepat di luar label (0,42R) — jadi posisi jarum ikut menunjukkan sisa pratinjau.
	 */
	const armDeg = $derived(current ? 16 + 21 * player.progress : 0);

	const durationShown = $derived(current ? player.duration || current.duration : (shown?.duration ?? 0));
	const timeLabel = $derived(`${fmtDuration(current ? player.time : 0)} / ${fmtDuration(durationShown)}`);

	function play(s: Sound) {
		player.play(s, queue);
	}
	function toggleRecord() {
		if (current) player.toggle();
		else if (shown) play(shown);
	}
	function seek(e: Event) {
		const v = Number((e.currentTarget as HTMLInputElement).value) / 1000;
		if (!current && shown) play(shown);
		player.seek(v);
	}

	// Keluar layar → jeda (tak ada kontrol lain di landing untuk menghentikannya).
	let root = $state<HTMLElement | null>(null);
	$effect(() => {
		const el = root;
		if (!el || typeof IntersectionObserver === "undefined") return;
		const io = new IntersectionObserver(([e]) => {
			if (!e.isIntersecting && current && player.playing) player.pause();
		});
		io.observe(el);
		return () => io.disconnect();
	});

	// Meninggalkan landing → hentikan, kecuali ke /sounds (bilah pemutarnya melanjutkan audio yang sama).
	let toSounds = false;
	beforeNavigate(({ to }) => {
		const p = to?.url.pathname ?? "";
		toSounds = p === "/sounds" || p.startsWith("/sounds/");
	});
	$effect(() => () => {
		if (!toSounds && current) player.close();
	});
</script>

<section
	bind:this={root}
	class="relative mx-auto max-w-[1500px] px-6 pb-16 pt-[clamp(2rem,5vh,4rem)] sm:pb-24 lg:px-10 lg:pb-32"
	aria-label={t.title}
	data-no-hover-sound
	data-no-click-sound
>
	<Reveal start="top 97%" class="relative z-10 grid gap-x-10 gap-y-6 lg:grid-cols-12 lg:items-end">
		<div class="lg:col-span-7">
			<p data-reveal class="kicker text-safelight">{t.kicker}</p>
			<RevealText
				as="h2"
				text={t.title}
				class="mt-6 font-display text-[clamp(2.2rem,5vw,4.2rem)] font-light leading-[1.02] tracking-[-0.02em] text-fg"
			/>
		</div>
		<p data-reveal class="max-w-[46ch] text-[0.98rem] leading-relaxed text-fg-muted lg:col-span-5">{t.sub}</p>
	</Reveal>

	<div class="mt-12 grid gap-x-12 gap-y-12 lg:mt-16 lg:grid-cols-12 lg:items-start">
		<!-- Piringan -->
		<div class="lg:col-span-7">
			<div class="vx-stage" class:is-cued={!!current} class:is-spinning={spinning}>
				<button
					type="button"
					class="vx-record"
					onclick={toggleRecord}
					disabled={!shown}
					aria-label={shown ? `${spinning ? t.pause : t.play} — ${shown.title[lang]}` : t.play}
				>
					<span class="vx-disc" aria-hidden="true">
						<span class="vx-label">
							{#if shown?.cover}
								{#key shown.id}<ApiImage src={shown.cover} alt="" fill class="object-cover object-top" />{/key}
							{:else}
								<img src="/logo1-sm.png" alt="" class="vx-label-logo" />
							{/if}
						</span>
						<span class="vx-hole"></span>
					</span>
					<span class="vx-sheen" aria-hidden="true"></span>
					<span class="vx-glyph" class:is-loading={!!current && player.loading} aria-hidden="true">
						{#if spinning}
							<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6.5" y="5" width="4" height="14" rx="1" /><rect x="13.5" y="5" width="4" height="14" rx="1" /></svg>
						{:else}
							<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.2v13.6a.8.8 0 0 0 1.2.7l10.6-6.8a.8.8 0 0 0 0-1.4L9.2 4.5A.8.8 0 0 0 8 5.2Z" /></svg>
						{/if}
					</span>
				</button>

				<!-- Sampul ikut bisa diklik (tetikus/sentuh): saat diam, piringan & tombolnya masih di balik sampul.
					Pengguna keyboard memakai tombol piringan di atas (yang ini tak masuk urutan Tab). -->
				<button type="button" class="vx-sleeve" tabindex="-1" aria-hidden="true" onclick={toggleRecord} disabled={!shown}>
					{#if shown?.cover}
						{#key shown.id}<ApiImage src={shown.cover} alt="" fill class="object-cover object-top" />{/key}
					{:else}
						<span class="vx-sleeve-blank"><img src="/logo1-sm.png" alt="" /></span>
					{/if}
					{#if shown && !current}
						<span class="vx-glyph vx-sleeve-glyph">
							<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.2v13.6a.8.8 0 0 0 1.2.7l10.6-6.8a.8.8 0 0 0 0-1.4L9.2 4.5A.8.8 0 0 0 8 5.2Z" /></svg>
						</span>
					{/if}
				</button>

				<span class="vx-pivot" aria-hidden="true"></span>
				<span class="vx-arm" style:transform={`rotate(${armDeg}deg)`} aria-hidden="true">
					<span class="vx-arm-weight"></span>
					<span class="vx-arm-tube"></span>
					<span class="vx-arm-head"></span>
				</span>
				<span class="vx-pivot-cap" aria-hidden="true"></span>
			</div>

			<!-- Yang sedang diputar -->
			<div class="vx-now" aria-live="polite">
				{#if current}
					<div class="min-w-0">
						<p class="truncate font-display text-[1.35rem] leading-tight text-fg">{current.title[lang]}</p>
						<p class="mt-1 truncate text-sm text-fg-muted">
							{current.author}{#if current.bpm}<span class="ml-3">{current.bpm} BPM</span>{/if}
						</p>
					</div>
					<a href={`/sounds/${current.id}`} class="vx-link shrink-0">{t.license}</a>
				{:else if loaded && !queue.length}
					<p class="text-fg-muted">{t.empty}</p>
				{:else}
					<p class="text-fg-muted">{t.idle}</p>
				{/if}
			</div>
			{#if shown}
				<div class="vx-seek">
					<input
						type="range"
						min="0"
						max="1000"
						step="1"
						value={current ? Math.round(player.progress * 1000) : 0}
						oninput={seek}
						aria-label={t.seek}
						aria-valuetext={`${fmtDuration(current ? player.time : 0)} ${t.of} ${fmtDuration(durationShown)}`}
						style:--p={`${(current ? player.progress : 0) * 100}%`}
					/>
					<span class="vx-time">{timeLabel}</span>
				</div>
			{/if}
			{#if current && player.error}<p class="mt-3 text-sm text-safelight" role="alert">{t.failed}</p>{/if}
		</div>

		<!-- Sisi belakang sampul: daftar lagu per sisi -->
		{#if sides.length}
			<div class="lg:col-span-5">
				{#each sides as side (side.key)}
					<div class="vx-side">
						<h3 class="vx-side-head">
							<span class="font-display text-fg">{t.side} {side.letter}</span>
							<span class="text-fg-muted">{side.name}</span>
						</h3>
						<ol class="vx-tracks">
							{#each side.list as s, i (s.id)}
								{@const on = player.isCurrent(s.id)}
								<li>
									<button
										type="button"
										class="vx-track"
										class:is-on={on}
										onclick={() => play(s)}
										aria-pressed={on && player.playing}
										aria-label={`${on && player.playing ? t.pause : t.play} — ${s.title[lang]}`}
									>
										<span class="vx-no" aria-hidden="true">
											{#if on && player.playing}
												<span class="vx-eq"><i></i><i></i><i></i></span>
											{:else}
												{i + 1}
											{/if}
										</span>
										<span class="min-w-0">
											<span class="vx-tt">{s.title[lang]}</span>
											<span class="vx-by">{s.author}</span>
										</span>
										<span class="vx-dur">{fmtDuration(s.duration)}</span>
									</button>
								</li>
							{/each}
						</ol>
					</div>
				{/each}
				<a href="/sounds" class="vx-link mt-8 inline-block">{t.all}</a>
			</div>
		{/if}
	</div>
</section>

<style>
	/* ── Panggung piringan. Semua ukuran dalam cqw (lebar panggung) supaya komposisinya sama dari ponsel
	   sampai layar lebar: sampul 54, piringan 51 (R 25,5), pusat piringan saat keluar (63,5 ; 29). ── */
	.vx-stage {
		container-type: inline-size;
		position: relative;
		width: 100%;
		aspect-ratio: 100 / 58;
	}
	.vx-sleeve {
		position: absolute;
		left: 0;
		top: 2cqw;
		z-index: 2;
		width: 54cqw;
		aspect-ratio: 1;
		padding: 0;
		border: 0;
		overflow: hidden;
		border-radius: 0.6cqw;
		background: var(--paper);
		cursor: pointer;
		box-shadow:
			0 2.4cqw 5cqw -2cqw rgba(0, 0, 0, 0.55),
			inset 0 0 0 1px rgba(255, 255, 255, 0.07);
	}
	/* Kertas sampul: kilap tipis + bayangan bukaan di tepi kanan, tempat piringan keluar. */
	.vx-sleeve::after {
		content: "";
		position: absolute;
		inset: 0;
		pointer-events: none;
		background:
			linear-gradient(90deg, transparent 88%, rgba(0, 0, 0, 0.35)),
			linear-gradient(135deg, rgba(255, 255, 255, 0.1), transparent 40%);
	}
	.vx-sleeve:disabled {
		cursor: default;
	}
	.vx-sleeve-glyph {
		z-index: 1;
		width: 12cqw;
		height: 12cqw;
		transition: transform 0.3s ease, background-color 0.3s ease;
	}
	.vx-sleeve:hover .vx-sleeve-glyph {
		transform: translate(-50%, -50%) scale(1.06);
		background-color: color-mix(in srgb, var(--safelight) 80%, transparent);
	}
	/* Tombol di label baru terlihat begitu piringan keluar dari sampul. */
	.vx-stage:not(.is-cued) .vx-record .vx-glyph {
		opacity: 0;
	}
	.vx-sleeve-blank {
		position: absolute;
		inset: 0;
		display: grid;
		place-items: center;
		background: var(--safelight);
	}
	.vx-sleeve-blank img {
		width: 40%;
		filter: brightness(0) invert(1);
	}

	.vx-record {
		position: absolute;
		left: 38cqw;
		top: 3.5cqw;
		z-index: 1;
		width: 51cqw;
		aspect-ratio: 1;
		padding: 0;
		border: 0;
		border-radius: 50%;
		background: none;
		cursor: pointer;
		/* Diam: sebagian besar masih di dalam sampul. */
		transform: translateX(-22cqw);
		transition: transform 0.9s cubic-bezier(0.2, 0.8, 0.2, 1);
		box-shadow: 0 2cqw 4cqw -1.5cqw rgba(0, 0, 0, 0.6);
	}
	.vx-record:disabled {
		cursor: default;
	}
	.vx-stage.is-cued .vx-record {
		transform: none;
	}
	.vx-record:focus-visible {
		outline: 2px solid var(--safelight);
		outline-offset: 4px;
	}

	/* Piringan: alur halus + pita alur masuk (tepi) dan alur keluar (dekat label). Berputar 33⅓ rpm = 1,8 dtk
	   per putaran, dan berhenti di tempat saat dijeda — bukan kembali ke 0. */
	.vx-disc {
		position: absolute;
		inset: 0;
		border-radius: 50%;
		background:
			radial-gradient(circle, transparent 0 34%, #070708 34% 36.5%, transparent 36.5% 92%, #070708 92% 94%, transparent 94%),
			repeating-radial-gradient(circle, rgba(255, 255, 255, 0.045) 0 1px, transparent 1px 3px),
			#0e0e10;
		box-shadow:
			inset 0 0 0 1px rgba(255, 255, 255, 0.14),
			inset 0 0 0 0.6cqw #121214;
		animation: vx-spin 1.8s linear infinite;
		animation-play-state: paused;
	}
	.vx-stage.is-spinning .vx-disc {
		animation-play-state: running;
	}
	@keyframes vx-spin {
		to {
			transform: rotate(360deg);
		}
	}
	.vx-label {
		position: absolute;
		inset: 33%;
		overflow: hidden;
		border-radius: 50%;
		background: var(--safelight);
		display: grid;
		place-items: center;
	}
	.vx-label-logo {
		width: 62%;
		filter: brightness(0) invert(1);
	}
	.vx-hole {
		position: absolute;
		left: 50%;
		top: 50%;
		width: 1.3cqw;
		height: 1.3cqw;
		margin: -0.65cqw 0 0 -0.65cqw;
		border-radius: 50%;
		background: #050506;
		box-shadow: 0 0 0 0.25cqw rgba(255, 255, 255, 0.35);
	}
	/* Kilap cahaya tetap di tempat walau piringannya berputar (sumber cahayanya diam). */
	.vx-sheen {
		position: absolute;
		inset: 0;
		border-radius: 50%;
		pointer-events: none;
		background: conic-gradient(
			from 20deg,
			transparent 0 6%,
			rgba(255, 255, 255, 0.1) 11%,
			transparent 17% 52%,
			rgba(255, 255, 255, 0.075) 58%,
			transparent 65%
		);
		-webkit-mask: radial-gradient(circle, transparent 0 35%, #000 36%);
		mask: radial-gradient(circle, transparent 0 35%, #000 36%);
	}
	.vx-glyph {
		position: absolute;
		left: 50%;
		top: 50%;
		display: grid;
		place-items: center;
		width: 8cqw;
		height: 8cqw;
		min-width: 2.25rem;
		min-height: 2.25rem;
		transform: translate(-50%, -50%);
		border-radius: 50%;
		color: #fff;
		background: rgba(8, 8, 10, 0.55);
		backdrop-filter: blur(6px);
		-webkit-backdrop-filter: blur(6px);
		transition: opacity 0.3s ease;
	}
	.vx-glyph svg {
		width: 46%;
		height: 46%;
	}
	/* Saat berputar, label (sampulnya) yang bicara; tombol muncul lagi saat disorot. */
	.vx-stage.is-spinning .vx-glyph {
		opacity: 0;
	}
	.vx-stage.is-spinning .vx-record:hover .vx-glyph,
	.vx-stage.is-spinning .vx-record:focus-visible .vx-glyph {
		opacity: 1;
	}
	.vx-glyph.is-loading {
		opacity: 1 !important;
		animation: vx-pulse 1s ease-in-out infinite;
	}
	@keyframes vx-pulse {
		50% {
			opacity: 0.45;
		}
	}

	/* ── Lengan jarum: poros di (91,55 ; 7,3), panjang 39,5 = 1,55R. Diputar dari porosnya. ── */
	.vx-pivot,
	.vx-pivot-cap {
		position: absolute;
		left: 91.55cqw;
		top: 7.3cqw;
		border-radius: 50%;
		transform: translate(-50%, -50%);
	}
	.vx-pivot {
		z-index: 3;
		width: 8cqw;
		height: 8cqw;
		background: radial-gradient(circle at 35% 30%, #3a3b3f, #17181b 70%);
		box-shadow:
			inset 0 0 0 1px rgba(255, 255, 255, 0.12),
			0 1cqw 2cqw -0.5cqw rgba(0, 0, 0, 0.6);
	}
	.vx-pivot-cap {
		z-index: 5;
		width: 3.4cqw;
		height: 3.4cqw;
		background: radial-gradient(circle at 35% 30%, #f1f1f2, #9c9ca2 75%);
	}
	.vx-arm {
		position: absolute;
		left: 91.55cqw;
		top: 7.3cqw;
		z-index: 4;
		width: 0;
		height: 0;
		transform-origin: 0 0;
		transition: transform 0.7s cubic-bezier(0.3, 0.7, 0.2, 1);
		filter: drop-shadow(0.8cqw 1.4cqw 0.9cqw rgba(0, 0, 0, 0.5));
	}
	.vx-arm > span {
		position: absolute;
		display: block;
	}
	.vx-arm-weight {
		left: -1.7cqw;
		top: -7.4cqw;
		width: 3.4cqw;
		height: 4.6cqw;
		border-radius: 0.7cqw;
		background: linear-gradient(90deg, #8e8e94, #e3e3e6 45%, #77777d);
	}
	.vx-arm-tube {
		left: -0.4cqw;
		top: 0;
		width: 0.8cqw;
		height: 35.5cqw;
		border-radius: 0.4cqw;
		background: linear-gradient(90deg, #8a8a90, #f2f2f4 45%, #7a7a80);
	}
	/* Headshell sedikit menyerong seperti lengan sungguhan; ujungnya (jarum) di 1,55R dari poros. */
	.vx-arm-head {
		left: -1.6cqw;
		top: 34cqw;
		width: 3.2cqw;
		height: 5.6cqw;
		border-radius: 0.5cqw 0.5cqw 0.9cqw 0.9cqw;
		background: linear-gradient(90deg, #2a2b2f, #4a4b50 50%, #222326);
		box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.12);
		transform: rotate(-16deg);
		transform-origin: 50% 0;
	}

	/* ── Yang sedang diputar + penggeser ── */
	.vx-now {
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
		gap: 1.5rem;
		min-height: 3.6rem;
		margin-top: 2rem;
	}
	.vx-seek {
		display: flex;
		align-items: center;
		gap: 1rem;
		margin-top: 1rem;
	}
	.vx-seek input {
		flex: 1;
		height: 1.5rem;
		margin: 0;
		background: transparent;
		cursor: pointer;
		-webkit-appearance: none;
		appearance: none;
	}
	.vx-seek input::-webkit-slider-runnable-track {
		height: 2px;
		background: linear-gradient(90deg, var(--safelight) var(--p, 0%), var(--hair) var(--p, 0%));
	}
	.vx-seek input::-moz-range-track {
		height: 2px;
		background: linear-gradient(90deg, var(--safelight) var(--p, 0%), var(--hair) var(--p, 0%));
	}
	.vx-seek input::-webkit-slider-thumb {
		-webkit-appearance: none;
		width: 12px;
		height: 12px;
		margin-top: -5px;
		border-radius: 50%;
		background: var(--fg);
	}
	.vx-seek input::-moz-range-thumb {
		width: 12px;
		height: 12px;
		border: 0;
		border-radius: 50%;
		background: var(--fg);
	}
	.vx-seek input:focus-visible {
		outline: 2px solid var(--safelight);
		outline-offset: 4px;
	}
	.vx-time {
		font-size: 0.85rem;
		font-variant-numeric: tabular-nums;
		color: var(--fg-muted);
		white-space: nowrap;
	}
	.vx-link {
		font-size: 0.95rem;
		color: var(--fg);
		text-decoration: underline;
		text-decoration-color: color-mix(in srgb, var(--fg) 30%, transparent);
		text-underline-offset: 0.35em;
		transition: color 0.3s ease, text-decoration-color 0.3s ease;
	}
	.vx-link:hover,
	.vx-link:focus-visible {
		color: var(--safelight);
		text-decoration-color: var(--safelight);
	}

	/* ── Sisi belakang sampul ── */
	.vx-side + .vx-side {
		margin-top: 2.5rem;
	}
	.vx-side-head {
		display: flex;
		align-items: baseline;
		gap: 0.9rem;
		padding-bottom: 0.9rem;
		border-bottom: 1px solid var(--hair);
		font-size: 1.15rem;
		font-weight: 400;
	}
	.vx-side-head span:last-child {
		font-size: 0.9rem;
	}
	.vx-tracks {
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.vx-track {
		display: grid;
		grid-template-columns: 2rem minmax(0, 1fr) auto;
		align-items: center;
		gap: 0.9rem;
		width: 100%;
		padding: 0.85rem 0;
		border: 0;
		border-bottom: 1px solid var(--hair);
		background: none;
		color: var(--fg);
		text-align: left;
		cursor: pointer;
	}
	.vx-track:focus-visible {
		outline: 2px solid var(--safelight);
		outline-offset: 2px;
	}
	.vx-no {
		font-size: 0.85rem;
		font-variant-numeric: tabular-nums;
		color: var(--fg-muted);
	}
	.vx-tt {
		display: block;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-size: 1rem;
		transition: color 0.25s ease;
	}
	.vx-by {
		display: block;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		margin-top: 0.15rem;
		font-size: 0.8rem;
		color: var(--fg-muted);
	}
	.vx-dur {
		font-size: 0.85rem;
		font-variant-numeric: tabular-nums;
		color: var(--fg-muted);
	}
	.vx-track.is-on .vx-tt {
		color: var(--safelight);
	}
	/* Hanya perangkat bertetikus: di layar sentuh :hover tertinggal setelah ketukan. */
	@media (hover: hover) {
		.vx-track:hover .vx-tt {
			color: var(--safelight);
		}
	}
	.vx-eq {
		display: inline-flex;
		align-items: flex-end;
		gap: 2px;
		height: 0.8rem;
	}
	.vx-eq i {
		width: 3px;
		height: 100%;
		background: var(--safelight);
		transform-origin: bottom;
		animation: vx-eq 0.9s ease-in-out infinite;
	}
	.vx-eq i:nth-child(2) {
		animation-delay: -0.3s;
	}
	.vx-eq i:nth-child(3) {
		animation-delay: -0.6s;
	}
	@keyframes vx-eq {
		0%,
		100% {
			transform: scaleY(0.3);
		}
		50% {
			transform: scaleY(1);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.vx-disc,
		.vx-eq i,
		.vx-glyph.is-loading {
			animation: none;
		}
		.vx-record,
		.vx-arm {
			transition: none;
		}
	}
</style>
