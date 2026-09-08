<script lang="ts">
	/**
	 * AccessPanel — port 1:1 dari components/AccessPanel.tsx. Panel geser dari
	 * kanan (voucher aktif + pengaturan aksesibilitas), pakai singleton `access`
	 * dan copy i18n.c.access.
	 */
	import { i18n } from "$lib/i18n.svelte";
	import { access, type TextScale } from "$lib/access.svelte";
	import { voucherCountdown, pad, discountLabel, type ActiveVoucher } from "$lib/voucher.svelte";
	import { apiGet } from "$lib/api";
	import type { ApiResponse } from "$lib/types";
	import type { CvdType } from "$lib/cvd";

	// CVD option list — mirrors apps/web ColorVisionToggle (label + description).
	const CVD_SWATCHES = ["#e23b2e", "#2fae4a", "#2d7df0", "#f5c518"];

	const t = $derived(i18n.c.access);
	const settings = $derived(access.settings);

	let voucher = $state<ActiveVoucher>(null);
	let copied = $state(false);
	let panelRef = $state<HTMLDivElement>();
	let closeBtnRef = $state<HTMLButtonElement>();

	$effect(() => {
		apiGet<ApiResponse<NonNullable<ActiveVoucher>>>("/api/vouchers/active")
			.then((res) => (voucher = res.data))
			.catch(() => {});
	});

	// Seed deadline + tick countdown (port dari hook React).
	$effect(() => {
		voucherCountdown.seed(voucher?.endsAt ?? null, voucher?.code);
	});
	$effect(() => {
		const id = setInterval(() => voucherCountdown.tick(), 1000);
		return () => clearInterval(id);
	});

	const cd = $derived(voucherCountdown.cd);

	// Focus trap in panel
	$effect(() => {
		if (!access.panelOpen) return;
		closeBtnRef?.focus();
		const onKey = (e: KeyboardEvent) => {
			if (e.key !== "Tab" || !panelRef) return;
			const focusable = panelRef.querySelectorAll<HTMLElement>("a[href], button:not([disabled]), input, [tabindex]:not([tabindex='-1'])");
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
		return () => window.removeEventListener("keydown", onKey);
	});

	const progress = $derived(cd && !cd.expired ? Math.min(1, 1 - cd.remaining / cd.total) : 1);

	async function copy() {
		try {
			await navigator.clipboard.writeText(voucher?.code ?? "");
			copied = true;
			window.setTimeout(() => (copied = false), 2000);
		} catch {
			/* ignore */
		}
	}
</script>

{#snippet Toggle(label: string, desc: string, on: boolean, onChange: (v: boolean) => void)}
	<div class="flex items-center justify-between rounded-md border border-hair bg-surface px-4 py-3.5">
		<div class="pr-4">
			<p class="text-[0.86rem] font-medium text-fg">{label}</p>
			<p class="mt-0.5 text-[0.74rem] leading-relaxed text-fg-muted">{desc}</p>
		</div>
		<button
			type="button"
			role="switch"
			aria-checked={on}
			aria-label={label}
			onclick={() => onChange(!on)}
			class={`relative h-6 w-11 shrink-0 rounded-full border transition-colors duration-300 ${
				on ? "border-safelight bg-safelight" : "border-hair bg-surface-2"
			}`}
		>
			<span
				class={`absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-bg shadow transition-all duration-300 ${
					on ? "left-[1.45rem]" : "left-0.5"
				}`}
			></span>
		</button>
	</div>
{/snippet}

<!-- ── segmented control ── -->
{#snippet Segmented(options: { v: string; l: string }[], value: string, onChange: (v: string) => void, wrap = false)}
	<div class={`inline-flex rounded-full border border-hair bg-bg p-0.5 ${wrap ? "flex-wrap" : ""}`}>
		{#each options as o (o.v)}
			<button
				type="button"
				onclick={() => onChange(o.v)}
				class={`rounded-full px-3 py-1.5 text-[0.74rem] font-medium transition-colors duration-200 ${
					value === o.v ? "bg-fg text-bg" : "text-fg/70 hover:text-fg"
				}`}
			>
				{o.l}
			</button>
		{/each}
	</div>
{/snippet}

{#snippet voucherSection()}
	<!-- body — data-lenis-prevent so Lenis yields wheel events to native scroll here -->
	<div data-lenis-prevent class="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-6">
		<!-- ── voucher notification ── -->
		<section class="overflow-hidden rounded-md border border-hair bg-surface">
			<div class="flex items-center justify-between border-b border-hair px-5 py-3">
				<span class="kicker text-safelight">{t.voucherKicker}</span>
				<span class="kicker text-fg-muted">{voucher?.code}</span>
			</div>

			<div class="px-5 py-5">
				<p class="font-display text-[1.7rem] font-light leading-none tracking-[-0.02em] text-fg">
					{voucher ? discountLabel(voucher) : t.voucherTitle}
				</p>
				<p class="mt-2 text-[0.86rem] leading-relaxed text-fg-muted">
					{voucher ? voucher.description || t.voucherDefaultDesc : t.voucherDesc}
				</p>

				{#if cd && !cd.expired}
					<!-- countdown -->
					<div class="mt-5 grid grid-cols-4 gap-2">
						{#each [{ v: cd.days, l: t.d }, { v: cd.hours, l: t.h }, { v: cd.minutes, l: t.m }, { v: cd.seconds, l: t.s }] as u (u.l)}
							<div class="rounded-sm border border-hair bg-bg py-2.5 text-center">
								<span class="block font-mono text-2xl font-semibold tabular-nums text-fg">{pad(u.v)}</span>
								<span class="kicker mt-1 block text-[0.55rem] text-fg-muted">{u.l}</span>
							</div>
						{/each}
					</div>
					<!-- progress -->
					<div class="mt-4 h-1 w-full overflow-hidden rounded-full bg-surface-2">
						<div
							class="h-full rounded-full bg-safelight transition-[width] duration-1000 ease-linear"
							style={`width: ${progress * 100}%`}
						></div>
					</div>

					<!-- actions -->
					<div class="mt-5 flex items-center gap-2">
						<a
							href="/pricing"
							onclick={() => access.setPanelOpen(false)}
							class="arrow-link inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-safelight px-5 py-3 text-sm font-medium text-ivory transition-transform duration-300 hover:scale-[1.02]"
						>
							{t.voucherCta}
							<span class="arr">→</span>
						</a>
						<button
							type="button"
							onclick={copy}
							class="inline-flex items-center gap-2 rounded-full border border-hair px-4 py-3 text-[0.78rem] font-medium text-fg/80 transition-colors hover:text-safelight"
						>
							{#if copied}
								<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
								{t.copied}
							{:else}
								<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h10" /></svg>
								{t.copy}
							{/if}
						</button>
					</div>
				{:else}
					<div class="mt-5 rounded-sm border border-hair bg-surface-2/50 px-4 py-5 text-center">
						<p class="font-display text-lg font-light text-fg">{t.expired}</p>
						<p class="mt-1.5 text-[0.8rem] leading-relaxed text-fg-muted">{t.expiredDesc}</p>
					</div>
				{/if}
			</div>
		</section>

		<!-- ── accessibility ── -->
		<section class="mt-8">
			<p class="kicker text-safelight">{t.a11yKicker}</p>
			<h3 class="mt-2 font-display text-xl font-light tracking-[-0.01em] text-fg">{t.a11yTitle}</h3>

			<div class="mt-4 flex flex-col gap-3">
				{@render Toggle(t.reduceMotion, t.reduceMotionDesc, settings.reduceMotion, (v) => access.set("reduceMotion", v))}
				{@render Toggle(t.highContrast, t.highContrastDesc, settings.highContrast, (v) => access.set("highContrast", v))}

				<!-- text size -->
				<div class="rounded-md border border-hair bg-surface px-4 py-3.5">
					<div class="flex items-center justify-between">
						<span class="text-[0.86rem] font-medium text-fg">{t.textSize}</span>
						{@render Segmented(
							[
								{ v: "sm", l: "A−" },
								{ v: "md", l: "A" },
								{ v: "lg", l: "A+" },
							],
							settings.textScale,
							(v) => access.set("textScale", v as TextScale)
						)}
					</div>
				</div>

				<!-- CVD — mirrors apps/web ColorVisionToggle -->
				<div class="rounded-md border border-hair bg-surface px-4 py-4">
					<p class="text-[0.86rem] font-medium text-fg">{t.cvdTitle}</p>
					<p class="mt-1 text-[0.76rem] leading-relaxed text-fg-muted">{t.cvdDesc}</p>

					<!-- preview swatches — always filtered (identity when off) -->
					<div class="mt-3 rounded-sm border border-hair bg-bg/50 px-3 py-2.5">
						<span class="kicker text-fg-muted">{t.cvdPreview}</span>
						<div class="mt-2 flex gap-1.5" style="filter: url(#cvd-filter)">
							{#each CVD_SWATCHES as col (col)}
								<span
									class="h-6 flex-1 rounded-sm shadow-[inset_0_0_0_1px_rgba(0,0,0,0.12)]"
									style={`background: ${col}`}
								></span>
							{/each}
						</div>
					</div>

					<!-- option list (radio group) -->
					<div role="radiogroup" aria-label={t.cvdTitle} class="mt-3 flex flex-col gap-0.5">
						{#each ([
							{ v: "off", l: t.cvdOff, desc: "" },
							{ v: "protanopia", l: t.cvdProtan, desc: t.cvdProtanDesc },
							{ v: "deuteranopia", l: t.cvdDeuter, desc: t.cvdDeuterDesc },
							{ v: "tritanopia", l: t.cvdTritan, desc: t.cvdTritanDesc },
							{ v: "monokrom", l: t.cvdMono, desc: t.cvdMonoDesc },
						] as { v: CvdType; l: string; desc: string }[]) as opt (opt.v)}
							{@const on = settings.cvdType === opt.v}
							<button
								type="button"
								role="radio"
								aria-checked={on}
								onclick={() => access.set("cvdType", opt.v)}
								class={`flex items-start gap-3 rounded-md px-2.5 py-2 text-left transition-colors ${
									on ? "bg-safelight/10" : "hover:bg-bg/60"
								}`}
							>
								<span
									class={`mt-1 h-[0.85rem] w-[0.85rem] shrink-0 rounded-full border transition-all ${
										on
											? "border-safelight bg-safelight shadow-[0_0_0_3px_var(--safelight-ring)]"
											: "border-fg/25"
									}`}
								></span>
								<span class="flex min-w-0 flex-1 flex-col">
									<span class="text-[0.82rem] font-semibold text-fg">{opt.l}</span>
									{#if opt.desc}
										<span class="font-mono text-[0.62rem] leading-snug text-fg-muted">{opt.desc}</span>
									{/if}
								</span>
								{#if on}
									<svg class="mt-0.5 shrink-0 text-safelight" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
										<path d="M20 6L9 17l-5-5" />
									</svg>
								{/if}
							</button>
						{/each}
					</div>

					<!-- strength -->
					{#if settings.cvdType !== "off"}
						<div class="mt-3 border-t border-hair pt-3">
							<div class="flex items-center justify-between">
								<span class="kicker text-fg-muted">{t.cvdStrength}</span>
								<span class="font-mono text-[0.72rem] font-semibold text-safelight">
									{Math.round(settings.cvdStrength * 100)}%
								</span>
							</div>
							<input
								type="range"
								min="0"
								max="1"
								step="0.05"
								value={settings.cvdStrength}
								oninput={(e) => access.set("cvdStrength", Number(e.currentTarget.value))}
								class="cvd-range mt-2 w-full accent-safelight"
								aria-label={t.cvdStrength}
							/>
						</div>
					{/if}

					<!-- OS color-filter hint -->
					<div class="mt-3 flex gap-2 rounded-md border border-safelight/15 bg-safelight/5 px-3 py-2.5">
						<span class="font-mono text-[0.72rem] font-bold leading-relaxed text-safelight">⌘</span>
						<p class="font-mono text-[0.6rem] leading-relaxed text-fg/70">{t.cvdOsHint}</p>
					</div>

				</div>

				<button
					type="button"
					onclick={() => access.reset()}
					class="mt-1 self-start text-[0.78rem] font-medium text-fg-muted underline-offset-4 transition-colors hover:text-safelight hover:underline"
				>
					{t.reset}
				</button>

			</div>
		</section>

	</div>
{/snippet}


<!-- backdrop -->
<div
	onclick={() => access.setPanelOpen(false)}
	aria-hidden={!access.panelOpen}
	class={`fixed inset-0 z-[90] bg-ocean-deep/40 backdrop-blur-sm transition-opacity duration-500 ${
		access.panelOpen ? "opacity-100" : "pointer-events-none opacity-0"
	}`}
></div>

<!-- panel -->
<div
	bind:this={panelRef}
	role="dialog"
	aria-modal="true"
	aria-label={t.panelTitle}
	aria-hidden={!access.panelOpen}
	class={`fixed inset-y-0 right-0 z-[95] flex w-full max-w-md flex-col border-l border-hair bg-bg shadow-[0_0_80px_-20px_rgba(11,31,42,0.5)] transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
		access.panelOpen ? "translate-x-0" : "translate-x-full"
	}`}
>
	<!-- header -->
	<div class="flex items-start justify-between border-b border-hair px-6 py-6">
		<div>
			<p class="kicker text-safelight">{t.panelKicker}</p>
			<h2 class="mt-2 font-display text-2xl font-light tracking-[-0.01em] text-fg">{t.panelTitle}</h2>
			<p class="mt-1.5 text-[0.82rem] text-fg-muted">{t.panelDesc}</p>
		</div>
		<button
			bind:this={closeBtnRef}
			type="button"
			onclick={() => access.setPanelOpen(false)}
			aria-label={t.closeLabel}
			class="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-hair text-fg/70 transition-colors hover:text-safelight"
		>
			<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
				<path d="M6 6l12 12M18 6L6 18" />
			</svg>
		</button>
	</div>

	{@render voucherSection()}
</div>

