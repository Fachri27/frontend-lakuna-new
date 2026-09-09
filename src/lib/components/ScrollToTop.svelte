<script lang="ts">
	let show = $state(false);

	$effect(() => {
		const onScroll = () => (show = window.scrollY > 400);
		onScroll();
		window.addEventListener("scroll", onScroll, { passive: true });
		return () => window.removeEventListener("scroll", onScroll);
	});
</script>

<button
	type="button"
	onclick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
	aria-label="Scroll to top"
	class={`fab-mengambang fixed bottom-6 left-6 z-50 grid h-11 w-11 place-items-center rounded-full border border-hair bg-bg/80 shadow-lg backdrop-blur-md transition-all duration-300 hover:border-safelight hover:text-safelight ${
		show ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0 pointer-events-none"
	}`}
>
	<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
		<path d="M12 19V5" />
		<path d="M5 12l7-7 7 7" />
	</svg>
</button>