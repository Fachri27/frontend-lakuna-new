<script lang="ts">
	/**
	 * Judul penutup footer: huruf kapital besar yang rapat, diselingi sisipan
	 * kecil italic — dan sesekali satu-dua huruf "bergulir": hurufnya meluncur
	 * keluar dari kotaknya dan salinannya masuk dari sisi lain sampai kembali
	 * di tempat, seperti gulungan mesin slot.
	 *
	 *   EVERY FRAME finds a home
	 *        in ONE ARCHIVE
	 *
	 * Iris hanya berjalan selama judul terlihat, dan mati untuk pengguna yang
	 * memilih mengurangi gerak.
	 */
	import { access } from "$lib/access.svelte";

	let {
		lineA,
		smallA,
		smallB,
		lineB,
	}: { lineA: string; smallA: string; smallB: string; lineB: string } = $props();

	/** Kata → huruf; spasi dipertahankan sebagai pemisah kata. */
	const split = (s: string) => s.trim().toUpperCase().split(/(\s+)/).filter(Boolean);
	const wordsA = $derived(split(lineA));
	const wordsB = $derived(split(lineB));

	let root = $state<HTMLElement | null>(null);
	let shown = $state(false);

	// Muncul per baris: tiap baris meluncur naik dari balik topengnya saat
	// judul masuk viewport (sekali saja). Hormat reduce-motion via CSS.
	$effect(() => {
		const el = root;
		if (!el) return;
		if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || access.settings.reduceMotion) {
			shown = true;
			return;
		}
		const io = new IntersectionObserver(
			([entry]) => {
				if (entry?.isIntersecting) {
					shown = true;
					io.disconnect();
				}
			},
			{ threshold: 0.25 },
		);
		io.observe(el);
		return () => io.disconnect();
	});

	$effect(() => {
		const el = root;
		if (!el) return;
		const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
		let visible = false;
		let timer = 0;
		const rnd = (a: number, b: number) => a + Math.random() * (b - a);

		const sliceOne = () => {
			const letters = el.querySelectorAll<HTMLElement>(".sl-ch");
			if (!letters.length) return;
			const ch = letters[Math.floor(Math.random() * letters.length)]!;
			if (ch.classList.contains("is-cut")) return;
			// Titik potong & geseran acak, dalam satuan em supaya ikut ukuran huruf.
			// Satu putaran gulung penuh, arah acak (naik / turun).
			const dur = rnd(1040, 1520);
			ch.style.setProperty("--dir", Math.random() < 0.5 ? "-1" : "1");
			ch.style.setProperty("--dur", `${dur.toFixed(0)}ms`);
			ch.classList.add("is-cut");
			window.setTimeout(() => ch.classList.remove("is-cut"), dur);
		};

		const loop = () => {
			if (!visible || reduce.matches || access.settings.reduceMotion) return;
			sliceOne();
			// Kadang dua huruf sekaligus, seperti di cetakan yang goyah.
			if (Math.random() < 0.3) window.setTimeout(sliceOne, 80);
			timer = window.setTimeout(loop, rnd(520, 1240));
		};

		const io = new IntersectionObserver(
			([entry]) => {
				const was = visible;
				visible = !!entry?.isIntersecting;
				if (visible && !was) loop();
				if (!visible) window.clearTimeout(timer);
			},
			{ threshold: 0.2 },
		);
		io.observe(el);
		return () => {
			io.disconnect();
			window.clearTimeout(timer);
		};
	});
</script>

{#snippet big(words: string[])}
	{#each words as w, wi (wi)}
		{#if /^\s+$/.test(w)}
			<span class="sl-sp"> </span>
		{:else}
			<span class="sl-word">
				{#each w.split("") as ch, ci (ci)}
					<span class="sl-ch" data-ch={ch}>{ch}</span>
				{/each}
			</span>
		{/if}
	{/each}
{/snippet}

<h2 bind:this={root} class="sl" class:is-in={shown} aria-label={`${lineA} ${smallA} ${smallB} ${lineB}`.replace(/\s+/g, " ").trim()}>
	<span class="sl-mask" aria-hidden="true">
	<span class="sl-row">
		<span class="sl-big">{@render big(wordsA)}</span>
		<span class="sl-small">{smallA}</span>
	</span>
	</span>
	<span class="sl-mask" aria-hidden="true">
	<span class="sl-row sl-row--in">
		<span class="sl-small sl-small--lead">{smallB}</span>
		<span class="sl-big">{@render big(wordsB)}</span>
	</span>
	</span>
</h2>

<style>
	.sl {
		margin: 0;
		color: var(--color-fg);
		font-family: "Archivo", var(--font-display);
		font-weight: 700;
		font-variation-settings: "wdth" 86;
		font-size: clamp(2.9rem, 9.4vw, 8.75rem);
		line-height: 0.86;
		letter-spacing: -0.045em;
	}
	.sl-row {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		column-gap: 0.12em;
		/* Muncul per baris: mulai tenggelam di balik topeng, naik berjenjang. */
		transform: translateY(112%);
		transition: transform 1s cubic-bezier(0.16, 1, 0.3, 1);
	}
	.sl-mask:nth-of-type(2) .sl-row {
		transition-delay: 0.13s;
	}
	.sl.is-in .sl-row {
		transform: translateY(0);
	}
	/* Topeng per baris: yang keluar batas tak terlihat. */
	.sl-mask {
		display: block;
		overflow: hidden;
		/* Ruang napas descender (y, g) supaya tak terpotong saat diam. */
		padding-bottom: 0.06em;
		margin-bottom: -0.06em;
	}
	@media (prefers-reduced-motion: reduce) {
		.sl-row {
			transform: none;
			transition: none;
		}
	}
	/* Baris kedua menjorok, seperti komposisi rujukan. */
	.sl-row--in {
		padding-left: 0.62em;
	}
	.sl-big {
		display: inline-flex;
		flex-wrap: wrap;
		align-items: baseline;
	}
	.sl-word {
		display: inline-flex;
		white-space: nowrap;
	}
	.sl-sp {
		display: inline-block;
		width: 0.22em;
	}
	.sl-small {
		font-family: var(--font-fraunces), "Fraunces", Georgia, serif;
		font-style: italic;
		font-weight: 300;
		font-variation-settings: normal;
		font-size: 0.2em;
		line-height: 1;
		letter-spacing: 0;
		color: var(--safelight);
		white-space: nowrap;
	}
	.sl-small--lead {
		margin-right: 0.35em;
	}

	/* ── Gulung ── */
	.sl-ch {
		position: relative;
		display: inline-block;
	}
	/* Kotak huruf jadi jendela: yang keluar batas tak terlihat. clip-path
	   (bukan overflow) supaya garis dasar inline-block tidak bergeser. */
	.sl-ch:global(.is-cut) {
		color: transparent;
		clip-path: inset(0 -0.04em);
	}
	.sl-ch:global(.is-cut)::before,
	.sl-ch:global(.is-cut)::after {
		content: attr(data-ch);
		position: absolute;
		inset: 0;
		color: var(--color-fg);
		animation-duration: var(--dur, 1280ms);
		animation-timing-function: cubic-bezier(0.7, 0, 0.3, 1);
		animation-fill-mode: both;
	}
	/* Huruf asli keluar; salinannya masuk dari sisi berlawanan. */
	.sl-ch:global(.is-cut)::before {
		animation-name: sl-out;
	}
	.sl-ch:global(.is-cut)::after {
		animation-name: sl-in;
	}
	@keyframes sl-out {
		from {
			transform: translateY(0);
		}
		to {
			transform: translateY(calc(var(--dir, -1) * 100%));
		}
	}
	@keyframes sl-in {
		from {
			transform: translateY(calc(var(--dir, -1) * -100%));
		}
		to {
			transform: translateY(0);
		}
	}

	@media (max-width: 639px) {
		.sl-row--in {
			padding-left: 0.3em;
		}
		.sl-small {
			font-size: 0.26em;
		}
	}
</style>
