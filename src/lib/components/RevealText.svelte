<script lang="ts">
	import gsap from "gsap";
	import { ScrollTrigger } from "gsap/ScrollTrigger";

	gsap.registerPlugin(ScrollTrigger);

	type Props = {
		text: string;
		/** Tag elemen pembungkus (default "span"). */
		as?: string;
		class?: string;
		stagger?: number;
		duration?: number;
		start?: string;
	};

	/**
	 * Splits `text` into words, each masked in an overflow-hidden span, and
	 * slides them up from below on scroll — a line/word reveal. SSR-safe:
	 * words are hidden via CSS only when `.js` is on <html>, so without JS the
	 * heading is fully visible.
	 */
	let {
		text,
		as = "span",
		class: className = "",
		stagger = 0.08,
		duration = 1,
		start = "top 88%"
	}: Props = $props();

	let el: HTMLElement | undefined = $state();
	const words = $derived(text.split(" "));

	$effect(() => {
		if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
		const node = el;
		if (!node) return;
		const inners = node.querySelectorAll<HTMLElement>(".rt-word > span");
		if (!inners.length) return;
		const tween = gsap.to(inners, {
			y: 0,
			duration,
			ease: "power3.out",
			stagger,
			scrollTrigger: { trigger: node, start, once: true }
		});
		return () => {
			tween.scrollTrigger?.kill();
			tween.kill();
		};
	});
</script>

<!-- Spasi dirender SEBAGAI simpul teks di antara kata, bukan ikut di dalam
	`.rt-word`. `.rt-word` itu `inline-block; overflow: hidden` (topengnya), dan
	spasi di ujung inline-block itu runtuh — akibatnya setiap judul terbaca
	menempel: "Arsipnyalewat.Ambil". Di luar topeng, spasinya jadi spasi biasa:
	lebarnya ikut font dan barisnya boleh patah di situ seperti teks normal. -->
<svelte:element this={as} bind:this={el} class={className}>
	{#each words as w, i (i)}<span class="rt-word"><span>{w}</span></span>{" "}{/each}
</svelte:element>
