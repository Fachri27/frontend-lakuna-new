<script lang="ts">
	/**
	 * Judul penutup footer: huruf kapital besar yang rapat, diselingi sisipan
	 * kecil italic, dengan label kecil di atasnya.
	 *
	 *   EXPLORE NUSANTARA
	 *   EVERY FRAME finds a home
	 *        in ONE ARCHIVE
	 *
	 * Dua gerak: (1) seluruh blok (label + judul) memudar masuk saat digulir ke
	 * layar dan memudar keluar saat digulir pergi — opasitas saja, mengikuti posisi
	 * gulir sehingga berbalik arah bila gulir berbalik; (2) sesekali satu-dua huruf
	 * "bergulir": hurufnya meluncur keluar dari kotaknya dan salinannya masuk dari
	 * sisi lain, seperti gulungan mesin slot — hanya selama judul terlihat penuh.
	 * Reduce-motion: selalu penuh dan diam.
	 */
	import { access } from "$lib/access.svelte";

	let {
		lineA,
		smallA,
		smallB,
		lineB,
		kicker = "",
	}: { lineA: string; smallA: string; smallB: string; lineB: string; kicker?: string } = $props();

	/** Kata → huruf; spasi dipertahankan sebagai pemisah kata. */
	const split = (s: string) => s.trim().toUpperCase().split(/(\s+)/).filter(Boolean);
	const wordsA = $derived(split(lineA));
	const wordsB = $derived(split(lineB));

	let root = $state<HTMLElement | null>(null);
	/** Terlihat penuh? Gulungan huruf hanya berjalan saat ini true. */
	let settled = false;

	$effect(() => {
		const el = root;
		if (!el) return;
		if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || access.settings.reduceMotion) {
			el.style.setProperty("--sl-o", "1");
			settled = true;
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
			// Masuk: tepi atas blok naik dari 98% ke 52% tinggi layar (rentang lebar, fade terasa mengalir).
			// Keluar: tepi bawah naik dari 14% ke 0% — sempit, supaya di dasar halaman (blok berhenti dekat
			// atas layar) keadaan akhirnya tetap penuh.
			const inP = clamp01((h * 0.98 - r.top) / (h * 0.46));
			const outP = clamp01(r.bottom / (h * 0.14));
			const o = smooth(Math.min(inP, outP));
			el.style.setProperty("--sl-o", o.toFixed(3));
			settled = o > 0.95;
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

	// Huruf bergulir acak, hanya saat judul terlihat dan sudah penuh (settled).
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
			// Satu putaran gulung penuh, arah acak (naik / turun).
			const dur = rnd(1040, 1520);
			ch.style.setProperty("--dir", Math.random() < 0.5 ? "-1" : "1");
			ch.style.setProperty("--dur", `${dur.toFixed(0)}ms`);
			ch.classList.add("is-cut");
			window.setTimeout(() => ch.classList.remove("is-cut"), dur);
		};

		const loop = () => {
			if (!visible || !settled || reduce.matches || access.settings.reduceMotion) {
				if (visible) timer = window.setTimeout(loop, 400);
				return;
			}
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

<div bind:this={root} class="sl-wrap">
	{#if kicker}
		<p class="sl-kicker">{kicker}</p>
	{/if}
	<h2 class="sl" aria-label={`${lineA} ${smallA} ${smallB} ${lineB}`.replace(/\s+/g, " ").trim()}>
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
	/* Topeng per baris: huruf yang bergulir keluar batas tak terlihat. */
	.sl-mask {
		display: block;
		overflow: hidden;
		/* Ruang napas descender (y, g) supaya tak terpotong saat diam. */
		padding-bottom: 0.06em;
		margin-bottom: -0.06em;
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
		/* Batas bawah ±13px: di tablet 0,2em × 40px = 8px tak terbaca. */
		font-size: max(0.2em, 0.8rem);
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
		/* Sisipan italic tak boleh lebih kecil dari ±13px di ponsel (dulu 0,26em × 28px ≈ 7px: tak terbaca). */
		.sl-small {
			font-size: max(0.26em, 0.8rem);
		}
	}
</style>
