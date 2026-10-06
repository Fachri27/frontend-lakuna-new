<script lang="ts">
	/**
	 * Judul penutup footer: huruf kapital besar yang rapat, diselingi sisipan
	 * kecil italic, dengan label kecil di atasnya.
	 *
	 *   EXPLORE NUSANTARA
	 *   EVERY FRAME finds a home
	 *        in ONE ARCHIVE
	 *
	 * Satu-satunya gerak: seluruh blok (label + judul) memudar masuk saat digulir
	 * ke layar dan memudar keluar saat digulir pergi — opasitas saja, mengikuti
	 * posisi gulir sehingga berbalik arah bila gulir berbalik. Tanpa geser, tanpa
	 * huruf bergulir. Reduce-motion: selalu penuh.
	 */
	import { access } from "$lib/access.svelte";

	let {
		lineA,
		smallA,
		smallB,
		lineB,
		kicker = "",
	}: { lineA: string; smallA: string; smallB: string; lineB: string; kicker?: string } = $props();

	/** Kata dipertahankan utuh (tak dipecah per huruf); spasi sebagai pemisah. */
	const split = (s: string) => s.trim().toUpperCase().split(/(\s+)/).filter(Boolean);
	const wordsA = $derived(split(lineA));
	const wordsB = $derived(split(lineB));

	let root = $state<HTMLElement | null>(null);

	$effect(() => {
		const el = root;
		if (!el) return;
		if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || access.settings.reduceMotion) {
			el.style.setProperty("--sl-o", "1");
			return;
		}
		const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
		const smooth = (t: number) => t * t * (3 - 2 * t);
		let raf = 0;
		let near = false;
		const paint = () => {
			raf = 0;
			const h = window.innerHeight;
			const r = el.getBoundingClientRect();
			// Masuk: tepi atas blok naik dari 96% ke 62% tinggi layar. Keluar: tepi bawah naik dari 14% ke 0%
			// — sempit, supaya di dasar halaman (blok berhenti dekat atas layar) keadaan akhirnya tetap penuh.
			const inP = clamp01((h * 0.96 - r.top) / (h * 0.34));
			const outP = clamp01(r.bottom / (h * 0.14));
			el.style.setProperty("--sl-o", smooth(Math.min(inP, outP)).toFixed(3));
		};
		const schedule = () => {
			if (!near || raf) return;
			raf = requestAnimationFrame(paint);
		};
		// Hanya mengikuti gulir selama blok dekat layar (hemat kerja di bagian halaman lain).
		const io = new IntersectionObserver(
			([entry]) => {
				near = !!entry?.isIntersecting;
				if (near) schedule();
			},
			{ rootMargin: "20% 0px 20% 0px" },
		);
		io.observe(el);
		window.addEventListener("scroll", schedule, { passive: true });
		window.addEventListener("resize", schedule);
		paint();
		return () => {
			io.disconnect();
			window.removeEventListener("scroll", schedule);
			window.removeEventListener("resize", schedule);
			if (raf) cancelAnimationFrame(raf);
		};
	});
</script>

{#snippet big(words: string[])}
	{#each words as w, wi (wi)}
		{#if /^\s+$/.test(w)}
			<span class="sl-sp"> </span>
		{:else}
			<span class="sl-word">{w}</span>
		{/if}
	{/each}
{/snippet}

<div bind:this={root} class="sl-wrap">
	{#if kicker}
		<p class="sl-kicker">{kicker}</p>
	{/if}
	<h2 class="sl" aria-label={`${lineA} ${smallA} ${smallB} ${lineB}`.replace(/\s+/g, " ").trim()}>
		<span class="sl-row" aria-hidden="true">
			<span class="sl-big">{@render big(wordsA)}</span>
			<span class="sl-small">{smallA}</span>
		</span>
		<span class="sl-row sl-row--in" aria-hidden="true">
			<span class="sl-small sl-small--lead">{smallB}</span>
			<span class="sl-big">{@render big(wordsB)}</span>
		</span>
	</h2>
</div>

<style>
	/* Fade in/out digerakkan oleh gulir lewat --sl-o (0–1). Opasitas SAJA. */
	.sl-wrap {
		opacity: var(--sl-o, 0);
		will-change: opacity;
	}
	.sl-kicker {
		margin: 0 0 1.75rem;
		font-family: var(--font-display);
		font-size: 1.05rem;
		font-weight: 700;
		line-height: 1;
		letter-spacing: 0.02em;
		text-transform: uppercase;
		color: var(--safelight);
	}
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
	}
	@media (prefers-reduced-motion: reduce) {
		.sl-wrap {
			opacity: 1;
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

	@media (max-width: 639px) {
		.sl-row--in {
			padding-left: 0.3em;
		}
		.sl-small {
			font-size: 0.26em;
		}
	}
</style>
