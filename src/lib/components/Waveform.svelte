<script lang="ts">
	/**
	 * Gelombang suara dari puncak 0–100 (Photo.waveform, dibaca API dari berkasnya) — batang tipis bergaris rata
	 * tengah. Bagian yang sudah diputar berwarna safelight. Dengan `onseek`, gelombang jadi penggeser posisi:
	 * klik/seret untuk lompat, panah kiri/kanan ±5%.
	 */
	let {
		peaks,
		progress = 0,
		bars = 96,
		active = false,
		label = "",
		onseek,
		class: cls = "",
	}: {
		peaks: number[];
		/** 0–1. */
		progress?: number;
		/** Jumlah batang yang digambar (puncak diambil ulang). */
		bars?: number;
		/** Lagu ini yang sedang dimuat/diputar → bagian terputar berwarna. */
		active?: boolean;
		label?: string;
		onseek?: (ratio: number) => void;
		class?: string;
	} = $props();

	const values = $derived.by(() => {
		const src = peaks.length ? peaks : [];
		return Array.from({ length: bars }, (_, i) => {
			if (!src.length) return 6;
			const a = Math.floor((i * src.length) / bars);
			const b = Math.max(a + 1, Math.floor(((i + 1) * src.length) / bars));
			let m = 0;
			for (let k = a; k < b && k < src.length; k++) m = Math.max(m, src[k] ?? 0);
			// Batang terpendek tetap terlihat (hening ≠ hilang).
			return Math.max(6, m);
		});
	});
	const W = $derived(bars * 4);
	const shown = $derived(Math.max(0, Math.min(1, progress)));

	let el: HTMLDivElement | undefined = $state();
	let dragging = false;

	function ratioAt(e: PointerEvent) {
		const r = el!.getBoundingClientRect();
		return Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
	}
	function down(e: PointerEvent) {
		if (!onseek || !el) return;
		e.preventDefault();
		e.stopPropagation();
		dragging = true;
		el.setPointerCapture(e.pointerId);
		onseek(ratioAt(e));
	}
	function move(e: PointerEvent) {
		if (dragging && onseek) onseek(ratioAt(e));
	}
	function up(e: PointerEvent) {
		dragging = false;
		el?.releasePointerCapture?.(e.pointerId);
	}
	function key(e: KeyboardEvent) {
		if (!onseek) return;
		if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
			e.preventDefault();
			onseek(Math.max(0, Math.min(1, shown + (e.key === "ArrowRight" ? 0.05 : -0.05))));
		} else if (e.key === "Home" || e.key === "End") {
			e.preventDefault();
			onseek(e.key === "Home" ? 0 : 0.999);
		}
	}
</script>

{#snippet svg(fillCls: string, style = "")}
	<svg viewBox={`0 0 ${W} 100`} preserveAspectRatio="none" class={`absolute inset-0 h-full w-full ${fillCls}`} {style} aria-hidden="true">
		{#each values as v, i (i)}
			<rect x={i * 4 + 0.6} y={(100 - v) / 2} width="2.8" height={v} rx="1.4" />
		{/each}
	</svg>
{/snippet}

{#if onseek}
	<div
		bind:this={el}
		role="slider"
		tabindex="0"
		aria-label={label}
		aria-valuemin={0}
		aria-valuemax={100}
		aria-valuenow={Math.round(shown * 100)}
		onpointerdown={down}
		onpointermove={move}
		onpointerup={up}
		onpointercancel={up}
		onkeydown={key}
		class={`wf group/wf relative cursor-pointer touch-none select-none rounded-[2px] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-safelight ${cls}`}
	>
		{@render svg("fill-fg/22 transition-colors group-hover/wf:fill-fg/35")}
		{@render svg(active ? "fill-safelight" : "fill-fg/55", `clip-path: inset(0 ${(1 - shown) * 100}% 0 0)`)}
	</div>
{:else}
	<div class={`relative ${cls}`}>
		{@render svg("fill-fg/22")}
		{@render svg(active ? "fill-safelight" : "fill-fg/55", `clip-path: inset(0 ${(1 - shown) * 100}% 0 0)`)}
	</div>
{/if}
