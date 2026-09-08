<script lang="ts">
	import gsap from "gsap";

	/**
	 * Editorial cursor follower — a single ring that lags behind the pointer with
	 * mix-blend-difference so it inverts whatever sits beneath (photos, ink, paper).
	 * Scales up + fades on interactive hover. Purely additive: the native cursor
	 * stays, so nothing breaks if JS fails or the pointer is coarse. Hidden on
	 * touch devices and reduced-motion.
	 */
	let ring: HTMLDivElement | undefined = $state();

	$effect(() => {
		if (window.matchMedia("(pointer: coarse)").matches) return;
		if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
		const el = ring;
		if (!el) return;

		gsap.set(el, { opacity: 0 });

		const xTo = gsap.quickTo(el, "x", { duration: 0.5, ease: "power3.out" });
		const yTo = gsap.quickTo(el, "y", { duration: 0.5, ease: "power3.out" });
		let shown = false;

		const move = (e: MouseEvent) => {
			if (!shown) {
				shown = true;
				gsap.to(el, { opacity: 1, duration: 0.4 });
			}
			xTo(e.clientX);
			yTo(e.clientY);
		};

		const over = (e: Event) => {
			const t = e.target as HTMLElement;
			const interactive = t.closest("a, button, [data-cursor]");
			gsap.to(el, {
				scale: interactive ? 2.1 : 1,
				opacity: interactive ? 0.55 : 1,
				duration: 0.35,
				ease: "power3.out"
			});
		};

		const out = () => gsap.to(el, { scale: 1, opacity: 1, duration: 0.35 });

		window.addEventListener("mousemove", move, { passive: true });
		window.addEventListener("mouseover", over, { passive: true });
		window.addEventListener("mouseout", out, { passive: true });

		return () => {
			window.removeEventListener("mousemove", move);
			window.removeEventListener("mouseover", over);
			window.removeEventListener("mouseout", out);
		};
	});
</script>

<div aria-hidden class="pointer-events-none fixed inset-0 z-[100] hidden md:block">
	<div bind:this={ring} class="absolute left-0 top-0 h-7 w-7 -ml-3.5 -mt-3.5 rounded-full border border-ivory mix-blend-difference"></div>
</div>