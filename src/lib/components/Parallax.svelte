<script lang="ts">
	import type { Snippet } from "svelte";
	import gsap from "gsap";
	import { ScrollTrigger } from "gsap/ScrollTrigger";

	gsap.registerPlugin(ScrollTrigger);

	type Props = {
		children: Snippet;
		class?: string;
		/** translate range in px (from → to) */
		from?: number;
		to?: number;
		/** or use percentage of the element's own height */
		fromPercent?: number;
		toPercent?: number;
		scrub?: number | boolean;
		start?: string;
		end?: string;
	};

	/**
	 * Generic scrub-parallax wrapper (GSAP ScrollTrigger). Translates its content
	 * across a y-range as the element scrolls through the viewport. Used for
	 * content blocks, decorative background words, etc.
	 */
	let {
		children,
		class: className = "",
		from = -30,
		to = 30,
		fromPercent,
		toPercent,
		scrub = true,
		start = "top bottom",
		end = "bottom top"
	}: Props = $props();

	let el: HTMLDivElement | undefined = $state();

	$effect(() => {
		if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
		const node = el;
		if (!node) return;
		const vars =
			fromPercent !== undefined && toPercent !== undefined
				? { yPercent: toPercent }
				: { y: to };
		const fromVars =
			fromPercent !== undefined && toPercent !== undefined
				? { yPercent: fromPercent }
				: { y: from };
		const tween = gsap.fromTo(node, fromVars, {
			...vars,
			ease: "none",
			scrollTrigger: { trigger: node, start, end, scrub }
		});
		return () => {
			tween.scrollTrigger?.kill();
			tween.kill();
		};
	});
</script>

<div bind:this={el} class={className}>
	{@render children()}
</div>
