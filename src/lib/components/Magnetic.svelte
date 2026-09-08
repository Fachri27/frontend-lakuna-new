<script lang="ts">
	import type { Snippet } from "svelte";
	import gsap from "gsap";

	/**
	 * Wraps a CTA and pulls it toward the pointer on hover, easing back on leave.
	 * Subtle by default (strength 0.35). No-op on touch / reduced-motion.
	 */
	let {
		children,
		strength = 0.35,
		class: className = ""
	}: { children: Snippet; strength?: number; class?: string } = $props();

	let el: HTMLDivElement | undefined = $state();

	$effect(() => {
		if (window.matchMedia("(pointer: coarse)").matches) return;
		if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
		const node = el;
		if (!node) return;

		const xTo = gsap.quickTo(node, "x", { duration: 0.6, ease: "power3.out" });
		const yTo = gsap.quickTo(node, "y", { duration: 0.6, ease: "power3.out" });

		const move = (e: MouseEvent) => {
			const r = node.getBoundingClientRect();
			xTo((e.clientX - (r.left + r.width / 2)) * strength);
			yTo((e.clientY - (r.top + r.height / 2)) * strength);
		};
		const leave = () => {
			xTo(0);
			yTo(0);
		};

		node.addEventListener("mousemove", move);
		node.addEventListener("mouseleave", leave);
		return () => {
			node.removeEventListener("mousemove", move);
			node.removeEventListener("mouseleave", leave);
		};
	});
</script>

<div bind:this={el} class={className}>
	{@render children()}
</div>
