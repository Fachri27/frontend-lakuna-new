<script lang="ts">
	/**
	 * UI dialog untuk singleton `popup` ($lib/popup.svelte). Dipasang sekali di
	 * +layout.svelte; komponen lain cukup `await popup.popup({...})`.
	 */
	import { popup } from "$lib/popup.svelte";

	let leaving = $state(false);
	const data = $derived(popup.data);
	let overlayRef = $state<HTMLDivElement>();
	let panelRef = $state<HTMLDivElement>();
	let confirmRef = $state<HTMLButtonElement>();

	function requestClose(v: boolean) {
		// mainkan transisi keluar, lalu unmount/resolve
		if (leaving || !popup.data) return;
		leaving = true;
		window.setTimeout(() => popup.close(v), 160);
	}

	$effect(() => {
		if (!data) return;
		leaving = false;
		confirmRef?.focus();

		// Escape untuk menutup + focus trap di panel
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				requestClose(false);
				return;
			}
			if (e.key !== "Tab" || !panelRef) return;
			const focusable = panelRef.querySelectorAll<HTMLElement>(
				"button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])"
			);
			if (focusable.length === 0) return;
			const first = focusable[0];
			const last = focusable[focusable.length - 1];
			if (e.shiftKey && document.activeElement === first) {
				e.preventDefault();
				last.focus();
			} else if (!e.shiftKey && document.activeElement === last) {
				e.preventDefault();
				first.focus();
			}
		};
		window.addEventListener("keydown", onKey);

		// Kunci scroll body
		const prev = document.body.style.overflow;
		document.body.style.overflow = "hidden";

		return () => {
			window.removeEventListener("keydown", onKey);
			document.body.style.overflow = prev;
		};
	});
</script>

{#if data}
	<div
		bind:this={overlayRef}
		class={`popup-overlay fixed inset-0 z-[200] grid place-items-center bg-ocean-deep/45 p-4 backdrop-blur-[3px] transition-opacity duration-150 sm:p-6 ${
			leaving ? "opacity-0" : "animate-[popup-overlay-in_0.2s_ease-out]"
		}`}
		onclick={(e) => {
			if (e.target === overlayRef) requestClose(false);
		}}
		aria-hidden="false"
	>
		<div
			bind:this={panelRef}
			role="alertdialog"
			aria-modal="true"
			aria-label={data.title}
			class={`popup-panel relative w-full max-w-md overflow-hidden rounded-[28px] border border-hair bg-bg shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] transition-all duration-150 ${
				leaving
					? "translate-y-1 scale-[0.98] opacity-0"
					: "animate-[popup-panel-in_0.28s_cubic-bezier(0.22,1,0.36,1)]"
			}`}
		>
			<!-- aksen gradien dekoratif -->
			<div class="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-safelight/10 via-safelight/[0.03] to-transparent"></div>
			<div class="grain pointer-events-none absolute inset-0 opacity-[0.08] mix-blend-soft-light"></div>

			<!-- tombol tutup -->
			<button
				type="button"
				onclick={() => requestClose(false)}
				aria-label="Tutup"
				class="group absolute right-4 top-4 z-10 grid h-9 w-9 place-items-center rounded-full text-fg/40 transition-colors hover:bg-hair/40 hover:text-fg"
			>
				<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
					<path d="M6 6l12 12M18 6L6 18" />
				</svg>
			</button>

			<div class="relative px-8 pb-8 pt-11 text-center sm:px-10">
				<!-- ikon -->
				{#if data.icon}
					<span
						class="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-full bg-safelight/10 text-3xl ring-1 ring-inset ring-safelight/15"
						aria-hidden="true"
					>
						{data.icon}
					</span>
				{/if}

				<!-- judul -->
				<h2 class="font-display text-[clamp(1.35rem,3vw,1.75rem)] font-light leading-[1.15] tracking-[-0.01em] text-fg">
					{data.title}
				</h2>

				<!-- isi -->
				{#if data.body}
					<p class="mx-auto mt-3 max-w-sm text-[0.95rem] leading-[1.65] text-fg-muted">
						{data.body}
					</p>
				{/if}

				<!-- aksi -->
				<div class="mt-8 flex flex-col-reverse items-stretch gap-2.5 sm:flex-row sm:justify-center">
					{#if data.cancelLabel}
						<button
							type="button"
							onclick={() => requestClose(false)}
							class="flex-1 rounded-full border border-hair px-6 py-3 text-sm font-medium text-fg transition-colors hover:border-fg-muted hover:bg-hair/20 sm:flex-none"
						>
							{data.cancelLabel}
						</button>
					{/if}
					<button
						bind:this={confirmRef}
						type="button"
						onclick={() => requestClose(true)}
						class="flex-1 rounded-full bg-safelight px-8 py-3 text-sm font-semibold tracking-wide text-ivory shadow-[0_16px_40px_-10px_var(--safelight-glow)] transition-all duration-300 hover:shadow-[0_20px_50px_-10px_var(--safelight-glow)] hover:brightness-110 sm:flex-none"
					>
						{data.confirmLabel || "OK"}
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}

<!-- keyframes + reduced-motion guard (global, meniru style jsx legacy) -->
<style>
	@keyframes -global-popup-overlay-in {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}
	@keyframes -global-popup-panel-in {
		from {
			opacity: 0;
			transform: translateY(10px) scale(0.97);
		}
		to {
			opacity: 1;
			transform: translateY(0) scale(1);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		/* guard hanya untuk elemen dialog ini (meniru div[class*="animate-"] legacy) */
		.popup-overlay,
		:global(.popup-panel) {
			animation: none !important;
		}
	}
</style>
