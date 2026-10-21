<script lang="ts">
	/**
	 * Hero halaman Sounds — tiruan dekat hero coveomusic.com: korsel lingkaran (diameter 120vh) berisi sampul audio
	 * bersudut 24% yang miring mengikuti lingkaran dan berputar pelan (120 dtk/putaran), tulisan tangan besar di
	 * latar yang "ditulis" saat muncul, avatar bulat + nama di tengah, teks tegak di sisi kiri, pita "baru tersedia",
	 * dan petunjuk monospace di bawah. Arahkan kursor ke sampul → sampul di sekitarnya membesar bergelombang,
	 * yang jauh meredup & buram; klik → putar pratinjau (sampulnya melompat kecil + titik biru berdenyut).
	 */
	import { i18n } from "$lib/i18n.svelte";
	import { player } from "$lib/soundPlayer.svelte";
	import type { Sound } from "$lib/data";
	import ApiImage from "./ApiImage.svelte";

	let { sounds }: { sounds: Sound[] } = $props();

	const copy = {
		id: {
			script: "inilah suara kami",
			title: "Lakuna Sounds",
			sub: "Arsip suara Nusantara",
			click: "Klik sampul untuk memutar pratinjau",
			tap: "Ketuk sampul untuk memutar pratinjau",
			side: ["Musik untuk para ", "pengembara", ", para ", "pemimpi", ", para ", "pencerita", ", dan para ", "pendengar sunyi", " — latar bagi setiap momen, dan makna di setiap hening."],
			now: "Baru tersedia",
			play: "Putar",
			pause: "Jeda",
		},
		en: {
			script: "these are our sounds",
			title: "Lakuna Sounds",
			sub: "An archipelago sound archive",
			click: "Click artwork to preview a sound",
			tap: "Tap artwork to preview a sound",
			side: ["Music for the ", "wanderers", ", the ", "day-dreamers", ", the ", "storytellers", ", and the ", "quiet listeners", " — a soundtrack for every moment, and meaning in every silence."],
			now: "Now available",
			play: "Play",
			pause: "Pause",
		},
	};
	const lang = $derived(i18n.lang);
	const t = $derived(copy[lang]);

	// Selalu satu lingkaran penuh (±22 sampul seperti acuan): daftar diulang bila audionya sedikit.
	const list = $derived(sounds.slice(0, 24));
	const count = $derived(list.length ? list.length * Math.max(1, Math.ceil(18 / list.length)) : 0);
	const items = $derived(
		Array.from({ length: count }, (_, i) => {
			const a = (i / count) * Math.PI * 2;
			return { i, s: list[i % list.length]!, cos: Math.cos(a), sin: Math.sin(a) };
		})
	);
	const newest = $derived(sounds[0]);
	// Pita "baru tersedia" hanya untuk audio ≤ 30 hari.
	const fresh = $derived(!!newest?.createdAt && Date.now() - new Date(newest.createdAt).getTime() < 30 * 24 * 3600 * 1000);

	/** Indeks sampul yang sedang disorot kursor (gelombang); null = tidak ada. */
	let hovered = $state<number | null>(null);
	let bannerHover = $state(false);
	const circDist = (i: number, j: number, n: number) => Math.min(Math.abs(i - j), n - Math.abs(i - j));
	function wave(i: number) {
		if (hovered === null) return "--amp:0;--itemDelay:0s;--itemOpacity:1;--itemBlur:0px";
		const d = circDist(i, hovered, count);
		const op = Math.max(0.4, 0.4 + 0.6 * (1 - d / Math.max(1, Math.floor(count / 4))));
		return `--amp:${(0.15 * Math.exp(-0.33 * d)).toFixed(4)};--itemDelay:${d * 60}ms;--itemOpacity:${op.toFixed(3)};--itemBlur:${d}px`;
	}
	const playingId = $derived(player.playing ? player.track?.id : null);
</script>

<section class="cv-hero" class:cv-hero--hover={hovered !== null} class:cv-hero--banner={bannerHover}>
	<!-- Tulisan tangan besar di latar (acuan: "these are my stories"). -->
	<div class="cv-script" aria-hidden="true"><span>{t.script}</span></div>

	{#if fresh && newest}
		<a
			href={`/sounds/${newest.id}`}
			class="cv-banner"
			onmouseenter={() => (bannerHover = true)}
			onmouseleave={() => (bannerHover = false)}
		>
			<span class="cv-banner__dot"></span>
			<span class="cv-mono">{newest.title[lang]} &mdash; {t.now}</span>
		</a>
	{/if}

	<p class="cv-previewtext cv-mono cv-muted">
		<span class="cv-desktop">{t.click}</span><span class="cv-mobile">{t.tap}</span>
	</p>

	<p class="cv-side">
		{#each t.side as part, k (k)}{#if k % 2 === 1}<span>{part}</span>{:else}{part}{/if}{/each}
	</p>

	<div class="cv-intro">
		<div class="cv-avatar">
			<img src="/logo1-sm.png" alt="" width="200" height="36" />
		</div>
		<div class="cv-logo">
			<h1 class="cv-title">{t.title}</h1>
			<p class="cv-subtitle">{t.sub}</p>
		</div>
	</div>

	<div class="cv-fade" aria-hidden="true"></div>

	<div class="cv-carousel" style:--itemCount={count}>
		{#each items as it (it.i)}
			{@const on = playingId === it.s.id}
			<button
				type="button"
				class="cv-rel"
				class:cv-rel--playing={on}
				style={`--item:${it.i};left:calc(50% + ${(50 * it.cos).toFixed(4)}% - var(--artworkSize) / 2);top:calc(50% + ${(50 * it.sin).toFixed(4)}% - var(--artworkSize) / 2);${wave(it.i)}`}
				aria-label={`${on ? t.pause : t.play} — ${it.s.title[lang]}`}
				tabindex={it.i < list.length ? 0 : -1}
				onpointerenter={(e) => e.pointerType === "mouse" && (hovered = it.i)}
				onpointerleave={() => (hovered = null)}
				onfocus={(e) => e.currentTarget.matches(":focus-visible") && (hovered = it.i)}
				onblur={() => (hovered = null)}
				onclick={() => player.play(it.s, list)}
			>
				<span class="cv-rel__img" style={`--d:${(it.i * 0.05).toFixed(2)}s`}>
					{#if it.s.cover}<ApiImage src={it.s.cover} alt="" fill class="object-cover object-top" />{/if}
				</span>
			</button>
		{/each}
	</div>
</section>

<style>
	.cv-hero {
		position: relative;
		width: 100%;
		/* Acuan: 80vh di desktop — judul bagian berikutnya sudah mengintip di layar pertama. */
		height: 80vh;
		min-height: 560px;
		overflow: hidden;
		color: #1d1812;
		font-family: "Inter", sans-serif;
		font-size: 12px;
	}
	.cv-mono {
		font-family: ui-monospace, Menlo, Monaco, monospace;
	}
	.cv-muted {
		color: #524d46;
	}

	/* ── Tulisan tangan latar ── */
	.cv-script {
		position: absolute;
		left: 50%;
		top: 1%;
		width: 110vw;
		pointer-events: none;
		transform: translateX(-50%) rotate(-10deg);
		transition:
			opacity 1s ease,
			filter 0.75s ease;
		z-index: 0;
		text-align: center;
	}
	.cv-script span {
		display: inline-block;
		font-family: "Mrs Saint Delafield", cursive;
		font-size: clamp(7rem, 21vw, 22rem);
		line-height: 1;
		color: #f8f8f8;
		white-space: nowrap;
		clip-path: inset(0 100% 0 0);
		animation: cv-write 3.2s 0.4s cubic-bezier(0.45, 0, 0.25, 1) forwards;
	}
	@keyframes cv-write {
		to {
			clip-path: inset(0 0 0 0);
		}
	}
	.cv-hero--hover .cv-script,
	.cv-hero--banner .cv-script {
		opacity: 0.8;
		filter: blur(8px);
	}

	/* ── Pita "baru tersedia" ── */
	.cv-banner {
		position: absolute;
		top: calc(var(--banner-h, 0px) + var(--nav-h) + 18px);
		left: 50%;
		transform: translateX(-50%);
		z-index: 4;
		display: flex;
		align-items: center;
		gap: 2em;
		padding: 1em 1.8em;
		border-radius: 6px;
		/* Lebih pekat dari acuan: pita ini duduk di bawah navbar, di atas lengkung sampul. */
		background: rgba(221, 221, 221, 0.94);
		backdrop-filter: blur(10px);
		-webkit-backdrop-filter: blur(10px);
		color: #1d1812;
		font-size: 0.85em;
		text-transform: uppercase;
		white-space: nowrap;
		transition: background-color 0.2s ease;
	}
	.cv-banner:hover {
		background: #cdcdcd;
	}
	.cv-banner__dot {
		height: 6px;
		width: 6px;
		border-radius: 50%;
		background: #fe5416;
		animation: cv-pulse 2s linear infinite;
	}
	.cv-hero--banner .cv-rel {
		opacity: 0.4;
		filter: blur(3px);
	}

	/* ── Petunjuk & teks samping ── */
	.cv-previewtext {
		position: absolute;
		bottom: 4em;
		left: 50%;
		transform: translateX(-50%);
		z-index: 3;
		font-size: 0.9em;
		white-space: nowrap;
	}
	.cv-mobile {
		display: none;
	}
	.cv-side {
		position: absolute;
		left: 30px;
		top: 32%;
		max-height: 400px;
		writing-mode: vertical-rl;
		transform: rotate(180deg);
		color: #524d46;
		font-size: 0.8em;
		line-height: 1.5;
		z-index: 3;
	}
	.cv-side span {
		font-family: "Instrument Serif", serif;
		font-style: italic;
		font-size: 1.15em;
	}

	/* ── Avatar + nama ── */
	.cv-intro {
		position: absolute;
		top: 60%;
		left: 50%;
		transform: translateX(-50%);
		z-index: 3;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2em;
		text-align: center;
	}
	.cv-avatar {
		display: grid;
		place-items: center;
		height: 100px;
		width: 100px;
		overflow: hidden;
		border-radius: 100%;
		background: #fe5416;
	}
	.cv-avatar img {
		width: 78%;
		height: auto;
		filter: brightness(0) invert(1);
	}
	.cv-title {
		margin: 0 auto;
		font-size: 1.2em;
		font-weight: 600;
		text-transform: uppercase;
	}
	.cv-subtitle {
		margin: 0.2em auto 0;
		font-size: 0.8em;
		font-weight: 500;
		text-transform: uppercase;
	}

	.cv-fade {
		position: absolute;
		left: 0;
		bottom: 0;
		width: 100%;
		height: 20vh;
		background-image: linear-gradient(rgba(238, 238, 238, 0) 0%, #eeeeee 100%);
		z-index: 2;
		pointer-events: none;
	}

	/* ── Korsel ── */
	.cv-carousel {
		--diameter: 120vh;
		position: absolute;
		top: 20%;
		left: 50%;
		width: var(--diameter);
		height: var(--diameter);
		border-radius: 50%;
		animation: cv-spin 120s infinite linear;
		z-index: 1;
	}
	@keyframes cv-spin {
		from {
			transform: translateX(-50%) rotate(45deg);
		}
		to {
			transform: translateX(-50%) rotate(405deg);
		}
	}
	.cv-rel {
		--artworkSize: calc(220 / var(--itemCount) * 1vh);
		position: absolute;
		width: var(--artworkSize);
		height: var(--artworkSize);
		padding: 0;
		border: 0;
		background: none;
		cursor: pointer;
		perspective: 500px;
		transform: rotate(calc(360deg / var(--itemCount) * var(--item) + 90deg)) scale(calc(1 + var(--amp)));
		transition:
			transform 0.35s var(--itemDelay) cubic-bezier(0.3, -0.46, 0.6, 2.1),
			opacity 1s ease,
			filter 0.75s ease;
	}
	.cv-hero--hover .cv-rel {
		opacity: var(--itemOpacity);
		filter: blur(var(--itemBlur));
	}
	.cv-rel__img {
		position: relative;
		display: block;
		height: 100%;
		width: 100%;
		overflow: hidden;
		border-radius: 24%;
		background: #dddddd;
		opacity: 0;
		transform: translate3d(0, 0, -100px);
		animation: cv-in 1s var(--d) cubic-bezier(0.25, 1, 0.5, 1) forwards;
	}
	@keyframes cv-in {
		to {
			opacity: 1;
			transform: translate3d(0, 0, 0);
		}
	}
	.cv-rel::after {
		content: "";
		position: absolute;
		bottom: -24px;
		left: 50%;
		height: 8px;
		width: 8px;
		border-radius: 50%;
		transform: translateX(-50%);
		background: #d2d2d2;
		opacity: 0;
		transition:
			opacity 0.4s ease,
			background-color 0.4s ease;
	}
	.cv-rel:hover::after,
	.cv-rel:focus-visible::after {
		opacity: 1;
	}
	.cv-rel:focus-visible {
		outline: none;
	}
	.cv-rel--playing .cv-rel__img {
		animation:
			cv-in 1s var(--d) cubic-bezier(0.25, 1, 0.5, 1) forwards,
			cv-popup 0.55s cubic-bezier(0.34, 1.56, 0.64, 1);
	}
	.cv-rel--playing::after {
		opacity: 1;
		background: #2f5bff;
		animation: cv-pulse 4s ease infinite;
	}
	@keyframes cv-popup {
		50% {
			translate: 0 -8px;
		}
	}
	@keyframes cv-pulse {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.35;
		}
	}
	/* Ponsel: korsel diperkecil separuh (acuan: --carouselScale 0.5). */
	@keyframes cv-spin-m {
		from {
			transform: translate(-50%, -50%) rotate(0deg) scale(0.5);
		}
		to {
			transform: translate(-50%, -50%) rotate(360deg) scale(0.5);
		}
	}

	@media (max-width: 768px) {
		.cv-hero {
			height: 100svh;
		}
		.cv-script {
			top: 42%;
		}
		.cv-carousel {
			top: 50%;
			animation-name: cv-spin-m;
		}
		.cv-intro {
			top: 50%;
			transform: translate(-50%, -50%);
		}
		.cv-side,
		.cv-fade {
			display: none;
		}
		.cv-desktop {
			display: none;
		}
		.cv-mobile {
			display: inline;
		}
		.cv-banner {
			top: calc(var(--banner-h, 0px) + var(--nav-h) + 10px);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.cv-carousel,
		.cv-banner__dot,
		.cv-rel--playing::after {
			animation: none;
		}
		.cv-script span {
			animation: none;
			clip-path: none;
		}
	}
</style>
