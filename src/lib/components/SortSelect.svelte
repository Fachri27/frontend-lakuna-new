<script lang="ts" generics="T extends string">
	import { tick } from "svelte";

	/**
	 * Dropdown ringkas (tombol + daftar pilihan) bergaya chip situs. Pola ARIA
	 * "select-only combobox": panah/Home/End menggeser, Enter/Spasi memilih,
	 * Escape menutup dan mengembalikan fokus, klik di luar menutup.
	 */
	let {
		value,
		options,
		label,
		onchange,
		class: className = "",
	}: {
		value: T;
		options: { value: T; label: string }[];
		label: string;
		onchange: (v: T) => void;
		class?: string;
	} = $props();

	let open = $state(false);
	let active = $state(0);
	let root: HTMLDivElement | undefined = $state();
	let btn: HTMLButtonElement | undefined = $state();
	let items: HTMLButtonElement[] = $state([]);
	const uid = `sort-${Math.random().toString(36).slice(2, 8)}`;

	const current = $derived(options.find((o) => o.value === value) ?? options[0]);

	async function show(at?: number) {
		active = at ?? Math.max(0, options.findIndex((o) => o.value === value));
		open = true;
		await tick();
		items[active]?.focus();
	}
	function hide(refocus = true) {
		open = false;
		if (refocus) btn?.focus();
	}
	function pick(i: number) {
		const o = options[i];
		if (o && o.value !== value) onchange(o.value);
		hide();
	}
	function move(to: number) {
		active = (to + options.length) % options.length;
		items[active]?.focus();
	}
	function onBtnKey(e: KeyboardEvent) {
		if (e.key === "ArrowDown" || e.key === "ArrowUp") {
			e.preventDefault();
			void show();
		}
	}
	function onListKey(e: KeyboardEvent) {
		switch (e.key) {
			case "ArrowDown": e.preventDefault(); move(active + 1); break;
			case "ArrowUp": e.preventDefault(); move(active - 1); break;
			case "Home": e.preventDefault(); move(0); break;
			case "End": e.preventDefault(); move(options.length - 1); break;
			case "Escape": e.preventDefault(); e.stopPropagation(); hide(); break;
			case "Tab": hide(false); break;
		}
	}
	function onDocPointer(e: PointerEvent) {
		if (open && root && !root.contains(e.target as Node)) hide(false);
	}
</script>

<svelte:document onpointerdown={onDocPointer} />

<div bind:this={root} class={`relative ${className}`}>
	<button
		bind:this={btn}
		type="button"
		aria-haspopup="listbox"
		aria-expanded={open}
		aria-controls={uid}
		aria-label={`${label}: ${current?.label ?? ""}`}
		onclick={() => (open ? hide(false) : void show())}
		onkeydown={onBtnKey}
		class={`press kicker chip inline-flex items-center gap-2.5 whitespace-nowrap rounded-full border transition-colors ${
			open ? "border-safelight text-safelight" : "border-hair text-fg/80 hover:border-safelight hover:text-safelight"
		}`}
	>
		<span class="text-fg-muted">{label}</span>
		<span class={open ? "text-safelight" : "text-fg"}>{current?.label}</span>
		<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" class={`transition-transform duration-300 ${open ? "rotate-180" : ""}`}><path d="M6 9l6 6 6-6" /></svg>
	</button>

	{#if open}
		<div
			id={uid}
			role="listbox"
			tabindex="-1"
			aria-label={label}
			onkeydown={onListKey}
			class="sort-pop absolute right-0 z-40 mt-2 min-w-full overflow-hidden rounded-2xl border border-hair bg-bg p-1 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.8)]"
		>
			{#each options as o, i (o.value)}
				<button
					bind:this={items[i]}
					type="button"
					role="option"
					aria-selected={o.value === value}
					tabindex={i === active ? 0 : -1}
					onclick={() => pick(i)}
					onmouseenter={() => (active = i)}
					class={`flex w-full items-center justify-between gap-6 whitespace-nowrap rounded-xl px-3.5 py-2.5 text-left text-sm transition-colors focus-visible:outline-none ${
						i === active ? "bg-fg/[0.07]" : ""
					} ${o.value === value ? "text-safelight" : "text-fg"}`}
				>
					<span>{o.label}</span>
					{#if o.value === value}
						<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
					{/if}
				</button>
			{/each}
		</div>
	{/if}
</div>

<style>
	.sort-pop {
		transform-origin: top right;
		animation: sort-in 0.16s ease-out both;
	}
	@keyframes sort-in {
		from { opacity: 0; transform: translateY(-4px) scale(0.98); }
		to { opacity: 1; transform: none; }
	}
	@media (prefers-reduced-motion: reduce) {
		.sort-pop {
			animation: none;
		}
	}
</style>
