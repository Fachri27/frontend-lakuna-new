<script lang="ts">
	import { page } from "$app/state";
	import gsap from "gsap";
	import { ScrollTrigger } from "gsap/ScrollTrigger";

	gsap.registerPlugin(ScrollTrigger);

	/** ScrollTrigger hanya untuk halaman home; route lain memakai native scroll. */
	const isHome = (p: string) => p === "/";

	/** Thin safelight progress line pinned to the very top of the viewport. */
	const pathname = $derived(page.url.pathname);
	let bar: HTMLDivElement | undefined = $state();

	$effect(() => {
		if (!isHome(pathname)) return; // non-home: zero ScrollTrigger
		if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
		const el = bar;
		if (!el) return;
		const tween = gsap.to(el, {
			scaleX: 1,
			ease: "none",
			scrollTrigger: { start: "top top", end: "max", scrub: 0.6, invalidateOnRefresh: true }
		});
		return () => {
			tween.scrollTrigger?.kill();
			tween.kill();
		};
	});
</script>

<div class="pointer-events-none fixed inset-x-0 top-0 z-[55] h-[2px]">
	<div bind:this={bar} class="h-full w-full origin-left scale-x-0 bg-safelight will-change-transform"></div>
</div>