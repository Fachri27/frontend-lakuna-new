<script lang="ts">
	import { access } from "$lib/access.svelte";
	import { i18n } from "$lib/i18n.svelte";

	let show = $state(false);

	$effect(() => {
		const onScroll = () => (show = window.scrollY > 200);
		onScroll();
		window.addEventListener("scroll", onScroll, { passive: true });
		return () => window.removeEventListener("scroll", onScroll);
	});
</script>

<button
	type="button"
	onclick={() => access.setPanelOpen(true)}
	aria-label={i18n.c.access.panelTitle}
	class={`fixed bottom-6 right-6 z-50 grid h-11 w-11 place-items-center rounded-full border border-hair bg-bg/80 shadow-lg backdrop-blur-md transition-all duration-300 hover:border-safelight hover:text-safelight ${
		show ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0 pointer-events-none"
	}`}
>
	<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
		<circle cx="12" cy="4.2" r="1.6" />
		<path d="M4.5 8.2c2.4 1.1 5 1.7 7.5 1.7s5.1-.6 7.5-1.7" />
		<path d="M12 9.9v6" />
		<path d="M12 15.9l-3.6 5.1M12 15.9l3.6 5.1" />
	</svg>
</button>