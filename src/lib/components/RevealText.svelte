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
	// "\n" = pemisah baris eksplisit (mis. "Limitless access\nto the archives").
	const lines = $derived(text.split("\n").map((l) => l.split(" ")));

	$effect(() => {
		if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
		const node = el;
		if (!node) return;
		const inners = node.querySelectorAll<HTMLElement>(".rt-word > span");
		if (!inners.length) return;
		// Diputar ULANG tiap kali judul masuk layar (turun maupun naik):
		// kata naik dari bawah saat datang dari bawah, turun dari atas saat
		// datang dari atas; disembunyikan lagi hanya setelah benar-benar
		// keluar layar (tanpa kedip selagi terlihat).
		const show = (from: string) =>
			gsap.fromTo(inners, { y: from }, { y: 0, duration, ease: "power3.out", stagger, overwrite: true });
		const hide = (to: string) => {
			gsap.killTweensOf(inners);
			gsap.set(inners, { y: to });
		};
		const play = ScrollTrigger.create({
			trigger: node,
			start,
			end: "bottom top",
			onEnter: () => show("110%"),
			onEnterBack: () => show("-110%"),
		});
		const reset = ScrollTrigger.create({
			trigger: node,
			start: "top bottom",
			end: "bottom top",
			onLeave: () => hide("-110%"),
			onLeaveBack: () => hide("110%"),
		});
		return () => {
			play.kill();
			reset.kill();
			gsap.killTweensOf(inners);
		};
	});
</script>

<!-- Spasi dirender SEBAGAI simpul teks di antara kata, bukan ikut di dalam
	`.rt-word`. `.rt-word` itu `inline-block; overflow: hidden` (topengnya), dan
	spasi di ujung inline-block itu runtuh — akibatnya setiap judul terbaca
	menempel: "Arsipnyalewat.Ambil". Di luar topeng, spasinya jadi spasi biasa:
	lebarnya ikut font dan barisnya boleh patah di situ seperti teks normal. -->
<svelte:element this={as} bind:this={el} class={className}>
	{#each lines as words, li (li)}{#if li > 0}<br />{/if}{#each words as w, i (i)}<span class="rt-word"><span>{w}</span></span>{" "}{/each}{/each}
</svelte:element>
