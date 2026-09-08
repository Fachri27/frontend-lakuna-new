<script lang="ts">
	import type { Snippet } from "svelte";
	import gsap from "gsap";

	type RevealProps = {
		children: Snippet;
		class?: string;
		y?: number;
		stagger?: number;
		start?: string;
		duration?: number;
	};

	let {
		children,
		class: className = "",
		y = 28,
		// Satu spesifikasi masuk untuk seluruh halaman: 0.9s / power3.out /
		// stagger 0.08 — sama dengan RevealText, jadi judul dan isi di bawahnya
		// bergerak dengan irama yang sama, bukan dua tempo yang bersaing.
		stagger = 0.08,
		// dipertahankan untuk compat API; rootMargin diturunkan darinya (default "top 88%").
		start = "top 88%",
		duration = 0.9
	}: RevealProps = $props();

	let el: HTMLDivElement | undefined = $state();

	// "top 88%" -> 12% margin bawah; "top 80%" -> 20%, dst.
	const bottomMargin = start.match(/top\s+(\d+)%/)?.[1]
		? `${100 - Number(start.match(/top\s+(\d+)%/)?.[1])}%`
		: "12%";

	$effect(() => {
		const root = el;
		if (!root) return;

		/**
		 * Reveals `[data-reveal]` children into view on scroll.
		 * SSR-safe: children are hidden via CSS ONLY when `.js` is on <html>
		 * (see app.css), so without JS everything is visible. With JS, gsap.to
		 * animates them to opacity 1 / y 0 — no flash, no content lost if JS fails.
		 *
		 * Pakai IntersectionObserver (bukan ScrollTrigger) agar andal untuk konten
		 * di atas lipat: IO dijamin menembak callback untuk elemen yang sudah berada
		 * di viewport saat observe — header/judul langsung ter-reveal pada load
		 * pertama, tanpa perlu refresh. `MutationObserver` memantau anak yang ditambah
		 * async (hasil fetch API) agar mereka ikut ter-reveal.
		 */
		const io = new IntersectionObserver(
			(entries) => {
				const visible = entries
					.filter((e) => e.isIntersecting)
					.map((e) => e.target as HTMLElement)
					.filter((it) => !it.hasAttribute("data-revealed"));
				if (!visible.length) return;
				visible.forEach((it) => io.unobserve(it));
				visible.forEach((it) => it.setAttribute("data-revealed", "1"));
				gsap.to(visible, {
					opacity: 1,
					y: 0,
					duration,
					ease: "power3.out",
					stagger
				});
			},
			{ rootMargin: `0px 0px -${bottomMargin} 0px`, threshold: 0 }
		);
		const observeAll = () => {
			root.querySelectorAll<HTMLElement>("[data-reveal]:not([data-revealed])").forEach((it) => io.observe(it));
		};
		observeAll();
		const mo = new MutationObserver(observeAll);
		mo.observe(root, { childList: true, subtree: true });
		return () => {
			io.disconnect();
			mo.disconnect();
		};
	});
</script>

<div bind:this={el} class={className}>
	{@render children()}
</div>