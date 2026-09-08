<script lang="ts">
	import gsap from "gsap";
	import { ScrollTrigger } from "gsap/ScrollTrigger";
	import ApiImage from "./ApiImage.svelte";

	gsap.registerPlugin(ScrollTrigger);

	type Props = {
		src: string;
		alt: string;
		/** Dipertahankan untuk compat API next/image — di SvelteKit <img> dirender
		 *  tanpa srcset optimizer, jadi prop ini tidak dipakai. */
		sizes?: string;
		/**
		 * Frame className — MUST establish position + size, e.g. `absolute inset-0`
		 * (to fill a positioned parent) or `relative aspect-[3/4] h-full`. Do NOT
		 * rely on a default `relative` here: it would conflict with a caller's
		 * `absolute` at equal specificity and collapse the frame to 0 height.
		 */
		class?: string;
		/** parallax travel as % of the (oversize) image height */
		amount?: number;
		priority?: boolean;
		imgClassName?: string;
	};

	/**
	 * Image-inside-frame parallax: the frame keeps its aspect/height; the image
	 * is rendered ~30% taller than the frame and translated on Y across the
	 * scroll range, so it drifts within the frame without ever revealing edges.
	 */
	let {
		src,
		alt,
		sizes,
		class: className = "",
		amount = 10,
		priority = false,
		imgClassName = ""
	}: Props = $props();

	let el: HTMLDivElement | undefined = $state();
	let layoutVer = $state(0);

	// ParallaxImage ter-mount di initial render, SEBELUM pin-spacer section
	// pinned di atasnya & tinggi async rampung. Akibatnya trigger terukir dengan
	// start/end stale (posisi section saat layout masih awal), dan
	// ScrollTrigger.refresh() tak andal me-re-ukur trigger yang sudah ada karena
	// urutan pemrosesan pin. Solusinya: revert+rebuild trigger (bukan refresh)
	// setiap kali tinggi dokumen berubah — pin-spacer/tinggi async menggeser
	// section ini — sampai layout stabil. Trigger baru membaca posisi final
	// saat dibuat.
	$effect(() => {
		if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
		let raf = 0;
		let tid = 0;
		const ro = new ResizeObserver(() => {
			cancelAnimationFrame(raf);
			clearTimeout(tid);
			raf = requestAnimationFrame(() => {
				tid = window.setTimeout(() => (layoutVer += 1), 120);
			});
		});
		ro.observe(document.documentElement);
		return () => {
			cancelAnimationFrame(raf);
			clearTimeout(tid);
			ro.disconnect();
		};
	});

	$effect(() => {
		// layoutVer → revert + rebuild trigger setiap kali tinggi dokumen berubah.
		void layoutVer;
		void sizes;
		if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
		const node = el;
		const inner = node?.querySelector<HTMLElement>("[data-pi-inner]");
		if (!node || !inner) return;
		const tween = gsap.fromTo(
			inner,
			{ yPercent: -amount },
			{
				yPercent: amount,
				ease: "none",
				scrollTrigger: {
					trigger: node,
					start: "top bottom",
					end: "bottom top",
					scrub: true,
					invalidateOnRefresh: true
				}
			}
		);
		return () => {
			tween.scrollTrigger?.kill();
			tween.kill();
		};
	});
</script>

<div bind:this={el} class={`overflow-hidden ${className}`}>
	<div data-pi-inner class="absolute inset-x-0 -top-[15%] h-[130%] will-change-transform">
		<ApiImage {src} {alt} fill eager={priority} class={`object-cover ${imgClassName}`} />
	</div>
</div>
