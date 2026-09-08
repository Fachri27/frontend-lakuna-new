<script lang="ts">
	/**
	 * Dismissible promo bar pinned to the very top of the viewport, above the
	 * navbar. Fetches the currently active voucher from the API. Dismissal is
	 * per voucher-code — a new voucher re-shows the bar even if a previous one
	 * was dismissed.
	 */
	import { i18n } from "$lib/i18n.svelte";
	import { voucherCountdown, pad, discountLabel, type ActiveVoucher } from "$lib/voucher.svelte";
	import { apiGet } from "$lib/api";
	import type { ApiResponse } from "$lib/types";

	const BAR_H = "2.25rem"; // 36px — matches the inner row's h-9
	const SEEN_KEY = "lakuna-voucher-seen";

	const t = $derived(i18n.c.access);
	let voucher = $state<ActiveVoucher>(null);
	let loading = $state(true);
	let dismissedCode = $state<string | null>(null);

	// Fetch active voucher from API
	$effect(() => {
		apiGet<ApiResponse<NonNullable<ActiveVoucher>>>("/api/vouchers/active")
			.then((res) => (voucher = res.data))
			.catch(() => (voucher = null))
			.finally(() => (loading = false));
	});

	// Restore the last-dismissed voucher code from localStorage.
	$effect(() => {
		try {
			dismissedCode = localStorage.getItem(SEEN_KEY);
		} catch {
			/* ignore */
		}
	});

	// Seed deadline + tick the countdown every second (port dari hook React).
	$effect(() => {
		voucherCountdown.seed(voucher?.endsAt ?? null, voucher?.code);
	});
	$effect(() => {
		const id = setInterval(() => voucherCountdown.tick(), 1000);
		return () => clearInterval(id);
	});

	const cd = $derived(voucherCountdown.cd);

	const dismissed = $derived(voucher != null && dismissedCode != null && dismissedCode === voucher.code);
	const visible = $derived(!loading && !dismissed && voucher != null && cd != null && !cd.expired);

	$effect(() => {
		document.documentElement.style.setProperty("--banner-h", visible ? BAR_H : "0px");
	});

	function dismiss() {
		const code = voucher?.code ?? "1";
		try {
			localStorage.setItem(SEEN_KEY, code);
		} catch {
			/* ignore */
		}
		dismissedCode = code;
		window.dispatchEvent(new Event("voucher-seen"));
	}
</script>

{#if visible}
	<div
		data-topbar
		role="region"
		aria-label={t.voucherKicker}
		class="fixed inset-x-0 top-0 z-[60] overflow-hidden bg-safelight text-ivory transition-[height] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
		style="height: var(--banner-h, 0px)"
	>
		<div class="relative mx-auto flex h-9 max-w-[1500px] items-center justify-center gap-3 px-10 text-[0.78rem]">
			<span class="kicker text-ivory/80">{t.voucherKicker}</span>
			<span class="font-mono font-semibold tracking-wide">{voucher?.code}</span>
			{#if voucher}
				<span class="hidden text-ivory/90 sm:inline">— {discountLabel(voucher)}</span>
			{/if}

			{#if cd && !cd.expired}
				<span class="hidden items-center gap-1.5 font-mono tabular-nums text-ivory/95 sm:inline-flex">
					<span class="text-ivory/55">·</span>
					{#if cd.days > 0}
						<span>
							{cd.days} {t.d}
						</span>
					{/if}
					<span>
						{pad(cd.hours)}:{pad(cd.minutes)}:{pad(cd.seconds)}
					</span>
				</span>
			{/if}

			<a
				href="/pricing"
				class="hidden rounded-full border border-ivory/30 px-3 py-0.5 text-[0.72rem] font-medium transition-colors hover:bg-ivory hover:text-safelight md:inline"
			>
				{t.voucherCta}
			</a>

			<button
				type="button"
				onclick={dismiss}
				aria-label={t.closeLabel}
				class="absolute right-3 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-full text-ivory/85 transition-colors hover:bg-ivory/15 hover:text-ivory"
			>
				<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
					<path d="M6 6l12 12M18 6L6 18" />
				</svg>
			</button>
		</div>
	</div>
{/if}
