<script lang="ts">
	let { line = "border-hair", icon = "text-fg/80" }: { line?: string; icon?: string } = $props();

	let mounted = $state(false);
	let dark = $state(false);

	$effect(() => {
		mounted = true;
		dark = document.documentElement.classList.contains("dark");
	});

	function toggle() {
		const next = !dark;
		dark = next;
		document.documentElement.classList.toggle("dark", next);
		try {
			localStorage.setItem("lakuna-theme", next ? "dark" : "light");
		} catch {
			/* ignore */
		}
	}
</script>

<button
	type="button"
	onclick={toggle}
	aria-label="Toggle theme"
	class={`relative grid h-9 w-9 place-items-center rounded-full border transition-colors hover:text-safelight ${line} ${icon}`}
>
	<span class={mounted && dark ? "hidden" : "block"} aria-hidden="true">
		<!-- sun -->
		<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round">
			<circle cx="12" cy="12" r="4" />
			<path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
		</svg>
	</span>
	<span class={mounted && dark ? "block" : "hidden"} aria-hidden="true">
		<!-- moon -->
		<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
			<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
		</svg>
	</span>
</button>