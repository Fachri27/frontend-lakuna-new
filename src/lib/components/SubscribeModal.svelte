<script lang="ts">
	import { goto } from "$app/navigation";
	import { page } from "$app/state";
	import { i18n, type Lang } from "$lib/i18n.svelte";
	import { fmtIDR } from "$lib/data";
	import { ApiError, apiPost } from "$lib/api";
	import type { ApiResponse } from "$lib/types";
	import { authModal } from "$lib/authModal.svelte";
	import { subscribeModal } from "$lib/subscribeModal.svelte";
	import { startSubscription, type Billing } from "$lib/subscribePay";

	const copy: Record<Lang, {
		title: string; sub: string; quota: string; month: string; year: string; perMonthEq: string;
		annual: string; monthly: string; save: string; popular: string; loading: string; failed: string;
		subscribe: string; processing: string; close: string; pickPlan: string; billing: string;
		voucherPh: string; apply: string; checking: string; voucherBad: string; voucherNeedLogin: string;
		needLogin: string; badLink: string; nowActive: string; buyFail: string; pricingPage: string;
	}> = {
		id: {
			title: "Langganan Premium",
			sub: "Unduh dari seluruh arsip setiap bulan, tanpa harga per foto.",
			quota: "{n} unduhan / bulan", month: "/bulan", year: "/tahun", perMonthEq: "setara {p}/bulan",
			annual: "Tahunan", monthly: "Bulanan", save: "Hemat {n}%", popular: "Paling hemat",
			loading: "Memuat paket…", failed: "Paket belum bisa dimuat. Coba lagi sebentar lagi.",
			subscribe: "Berlangganan {name}", processing: "Memproses…", close: "Tutup",
			pickPlan: "Pilih paket", billing: "Periode bayar",
			voucherPh: "Kode voucher", apply: "Pakai", checking: "Memeriksa…", voucherBad: "Voucher tidak berlaku", voucherNeedLogin: "Masuk dulu untuk memakai voucher.",
			needLogin: "Masuk dulu untuk berlangganan.",
			badLink: "Tautan pembayaran tidak valid, pembayaran dibatalkan.",
			nowActive: "Langgananmu sudah aktif.",
			buyFail: "Gagal memulai langganan. Coba lagi.",
			pricingPage: "Bandingkan di halaman harga",
		},
		en: {
			title: "Premium subscription",
			sub: "Download from the whole archive every month, with no per-photo price.",
			quota: "{n} downloads / month", month: "/month", year: "/year", perMonthEq: "about {p}/month",
			annual: "Annual", monthly: "Monthly", save: "Save {n}%", popular: "Best value",
			loading: "Loading plans…", failed: "Plans could not be loaded. Please try again shortly.",
			subscribe: "Subscribe to {name}", processing: "Processing…", close: "Close",
			pickPlan: "Choose a plan", billing: "Billing period",
			voucherPh: "Voucher code", apply: "Apply", checking: "Checking…", voucherBad: "Voucher is not valid", voucherNeedLogin: "Sign in first to use a voucher.",
			needLogin: "Sign in first to subscribe.",
			badLink: "The payment link is not valid, payment cancelled.",
			nowActive: "Your subscription is now active.",
			buyFail: "Could not start the subscription. Try again.",
			pricingPage: "Compare on the pricing page",
		},
	};
	const lang = $derived<Lang>(i18n.lang);
	const t = $derived(copy[lang]);

	let billing = $state<Billing>("annual");
	let selectedId = $state<string | null>(null);
	let busy = $state(false);
	let message = $state("");
	// Voucher: pola yang sama dengan PricingPage — hanya untuk bayar di muka
	// (tahunan), divalidasi ke /api/vouchers/validate scope SUBSCRIPTION.
	let voucherInput = $state("");
	let appliedVoucher = $state<{ code: string; amount: number } | null>(null);
	let voucherError = $state("");
	let validating = $state(false);
	let dialogEl: HTMLDivElement | undefined = $state();
	let closeEl: HTMLButtonElement | undefined = $state();

	const plans = $derived(subscribeModal.plans);
	// Paket terpilih: pilihan pengguna, lalu paket unggulan, lalu yang pertama.
	const chosen = $derived(plans.find((p) => p.id === selectedId) ?? plans.find((p) => p.highlight) ?? plans[0] ?? null);
	const savePct = $derived(
		chosen && chosen.priceMonthly > 0 && chosen.priceAnnual > 0
			? Math.max(0, Math.round((1 - chosen.priceAnnual / (chosen.priceMonthly * 12)) * 100))
			: 0,
	);

	function priceOf(p: { priceMonthly: number; priceAnnual: number }) {
		return billing === "annual" ? p.priceAnnual : p.priceMonthly;
	}

	function resetVoucher() {
		appliedVoucher = null;
		voucherError = "";
	}

	async function applyVoucher() {
		// Voucher langganan hanya berlaku saat bayar di muka (tahunan).
		const amount = chosen ? priceOf(chosen) : 0;
		const code = voucherInput.trim();
		if (!code || validating || billing !== "annual" || amount <= 0) return;
		validating = true;
		voucherError = "";
		try {
			const res = await apiPost<ApiResponse<{ valid: boolean; reason?: string; voucher: { code: string; valueType: "PERCENT" | "NOMINAL"; value: number } }>>(
				"/api/vouchers/validate",
				{ code, scope: "SUBSCRIPTION", amount },
			);
			if (!res.data?.valid) {
				appliedVoucher = null;
				voucherError = res.data?.reason || t.voucherBad;
				return;
			}
			const amt = res.data.voucher.valueType === "PERCENT"
				? Math.round(amount * res.data.voucher.value / 100)
				: res.data.voucher.value;
			appliedVoucher = { code: res.data.voucher.code, amount: amt };
			voucherInput = "";
		} catch (err) {
			if (err instanceof ApiError && err.status === 401) voucherError = t.voucherNeedLogin;
			else if (err instanceof ApiError) voucherError = err.message || t.voucherBad;
			else voucherError = t.voucherBad;
		} finally {
			validating = false;
		}
	}

	async function subscribe() {
		if (!chosen || busy) return;
		busy = true;
		message = "";
		try {
			const r = await startSubscription(chosen.id, billing, billing === "annual" ? appliedVoucher?.code : undefined);
			if (r.kind === "pay") {
				subscribeModal.close();
				await goto(r.path);
			} else if (r.kind === "external") {
				window.location.href = r.url;
			} else if (r.kind === "badlink") {
				message = t.badLink;
			} else {
				message = t.nowActive;
			}
		} catch (err) {
			if (err instanceof ApiError && err.status === 401) {
				// Belum login: buka popup masuk, lalu kembali ke halaman ini.
				const back = page.url.pathname + page.url.search;
				subscribeModal.close();
				authModal.open(back);
			} else {
				message = err instanceof ApiError && err.message ? err.message : t.buyFail;
			}
		} finally {
			busy = false;
		}
	}

	$effect(() => {
		if (!subscribeModal.isOpen) return;
		message = "";
		closeEl?.focus();
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				subscribeModal.close();
				return;
			}
			if (e.key === "Tab" && dialogEl) {
				const focusable = dialogEl.querySelectorAll<HTMLElement>("button, [href], [tabindex]:not([tabindex='-1'])");
				if (!focusable.length) return;
				const first = focusable[0];
				const last = focusable[focusable.length - 1];
				if (e.shiftKey && document.activeElement === first) {
					e.preventDefault();
					last.focus();
				} else if (!e.shiftKey && document.activeElement === last) {
					e.preventDefault();
					first.focus();
				}
			}
		};
		window.addEventListener("keydown", onKey);
		const prev = document.body.style.overflow;
		document.body.style.overflow = "hidden";
		return () => {
			window.removeEventListener("keydown", onKey);
			document.body.style.overflow = prev;
		};
	});
</script>

{#if subscribeModal.isOpen}
	<div
		class="fixed inset-0 z-[90] grid place-items-center overflow-y-auto bg-ocean-deep/80 p-4 backdrop-blur-sm sm:p-6"
		role="presentation"
		onclick={() => subscribeModal.close()}
		onkeydown={() => {}}
	>
		<div
			bind:this={dialogEl}
			role="dialog"
			aria-modal="true"
			aria-labelledby="sub-modal-title"
			tabindex="-1"
			class="relative w-full max-w-lg overflow-hidden rounded-md bg-surface p-6 shadow-[0_50px_120px_-40px_rgba(0,0,0,0.6)] sm:p-8"
			onclick={(e) => e.stopPropagation()}
			onkeydown={() => {}}
		>
			<button
				bind:this={closeEl}
				type="button"
				onclick={() => subscribeModal.close()}
				aria-label={t.close}
				class="tap-expand absolute right-4 top-4 z-10 grid h-9 w-9 place-items-center rounded-full text-fg/40 transition-colors hover:bg-hair/40 hover:text-fg active:bg-hair/40 active:text-fg"
			>
				<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true">
					<path d="M6 6l12 12M18 6L6 18" />
				</svg>
			</button>

			<h2 id="sub-modal-title" class="pr-10 font-display text-[1.7rem] font-light leading-tight tracking-[-0.02em] text-fg">{t.title}</h2>
			<p class="mt-2 max-w-[44ch] text-sm leading-relaxed text-fg-muted">{t.sub}</p>

			{#if subscribeModal.loading && !plans.length}
				<p class="mt-6 border-t border-hair py-8 text-sm text-fg-muted" aria-live="polite">{t.loading}</p>
			{:else if subscribeModal.failed}
				<p class="mt-6 border-t border-hair py-8 text-sm text-fg-muted" aria-live="polite">{t.failed}</p>
			{:else}
				<!-- Periode bayar -->
				<div class="mt-6 flex items-center justify-between gap-3">
					<div role="group" aria-label={t.billing} class="inline-flex rounded-full border border-hair p-0.5">
						{#each ([["annual", t.annual], ["monthly", t.monthly]] as const) as [val, label] (val)}
							<button
								type="button"
								aria-pressed={billing === val}
								onclick={() => { billing = val; message = ""; resetVoucher(); }}
								class={`rounded-full px-4 py-1.5 text-sm transition-colors ${billing === val ? "bg-safelight text-ivory" : "text-fg-muted hover:text-fg"}`}
							>
								{label}
							</button>
						{/each}
					</div>
					{#if billing === "annual" && savePct > 0}
						<span class="text-sm text-safelight">{t.save.replace("{n}", String(savePct))}</span>
					{/if}
				</div>

				<!-- Pilih paket langsung di sini -->
				<div role="radiogroup" aria-label={t.pickPlan} class="mt-4 divide-y divide-hair border-y border-hair">
					{#each plans as p (p.id)}
						{@const active = chosen?.id === p.id}
						<button
							type="button"
							role="radio"
							aria-checked={active}
							onclick={() => { selectedId = p.id; message = ""; resetVoucher(); }}
							class="group/row flex w-full items-start justify-between gap-4 py-4 text-left transition-colors hover:bg-fg/[0.03] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-safelight"
						>
							<span class="flex items-start gap-3">
								<span class={`mt-[5px] grid h-3.5 w-3.5 shrink-0 place-items-center rounded-full border transition-colors ${active ? "border-safelight" : "border-fg-muted/50 group-hover/row:border-fg-muted"}`}>
									<span class={`h-1.5 w-1.5 rounded-full transition-colors ${active ? "bg-safelight" : "bg-transparent"}`}></span>
								</span>
								<span>
									<span class={`block font-display text-[1.1rem] ${active ? "text-fg" : "text-fg/85"}`}>
										{p.name[lang]}
										{#if p.highlight}
											<span class="ml-2 rounded-full border border-safelight/45 px-2 py-0.5 align-middle font-body text-[0.7rem] text-safelight">{t.popular}</span>
										{/if}
									</span>
									<span class="mt-0.5 block text-sm text-fg-muted">{t.quota.replace("{n}", String(p.quota))}</span>
								</span>
							</span>
							<span class="shrink-0 text-right">
								<span class={`block font-display text-[1.3rem] font-light tabular-nums ${active ? "text-fg" : "text-fg/85"}`}>
									{fmtIDR(priceOf(p))}<span class="ml-1 font-body text-xs text-fg-muted">{billing === "annual" ? t.year : t.month}</span>
								</span>
								{#if billing === "annual" && p.priceAnnual > 0}
									<span class="block text-xs tabular-nums text-fg-muted">{t.perMonthEq.replace("{p}", fmtIDR(Math.round(p.priceAnnual / 12)))}</span>
								{/if}
							</span>
						</button>
					{/each}
				</div>

				<button
					type="button"
					onclick={subscribe}
					disabled={busy || !chosen}
					class="mt-6 w-full rounded-full bg-safelight py-3.5 text-sm font-medium text-ivory shadow-[0_14px_40px_-12px_var(--safelight-glow)] transition-transform hover:scale-[1.02] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-safelight disabled:opacity-60 disabled:hover:scale-100"
				>
					{busy ? t.processing : t.subscribe.replace("{name}", chosen?.name[lang] ?? "")}
				</button>
				{#if billing === "annual"}
					<!-- Voucher khusus bayar di muka — pola PricingPage. -->
					<div class="mt-4">
						{#if appliedVoucher}
							<p class="flex items-center justify-between gap-3 rounded-[10px] border border-safelight/40 px-4 py-3 text-sm">
								<span class="font-mono text-safelight">{appliedVoucher.code} · −{fmtIDR(appliedVoucher.amount)}</span>
								<button type="button" onclick={resetVoucher} class="text-fg-muted underline underline-offset-4 hover:text-fg">×</button>
							</p>
						{:else}
							<div class="flex gap-2">
								<input
									type="text"
									bind:value={voucherInput}
									placeholder={t.voucherPh}
									aria-label={t.voucherPh}
									class="min-w-0 flex-1 rounded-[10px] border border-hair bg-transparent px-4 py-2.5 text-sm text-fg placeholder:text-fg-muted/70 focus:border-safelight focus:outline-none"
									onkeydown={(e) => { if (e.key === "Enter") { e.preventDefault(); void applyVoucher(); } }}
								/>
								<button
									type="button"
									onclick={() => void applyVoucher()}
									disabled={validating || !voucherInput.trim()}
									class="press shrink-0 rounded-[10px] border border-hair px-4 text-sm text-fg transition-colors hover:border-safelight hover:text-safelight disabled:opacity-50"
								>
									{validating ? t.checking : t.apply}
								</button>
							</div>
						{/if}
						{#if voucherError}<p role="alert" class="mt-2 text-xs text-red-400">{voucherError}</p>{/if}
					</div>
				{/if}
				<p role="status" aria-live="polite" class={`mt-3 text-center text-sm ${message ? "text-fg-muted" : "sr-only"}`}>{message}</p>
				<p class="mt-2 text-center text-xs text-fg-muted">
					<a href="/pricing" onclick={() => subscribeModal.close()} class="underline decoration-fg/30 underline-offset-4 hover:text-safelight">{t.pricingPage}</a>
				</p>
			{/if}
		</div>
	</div>
{/if}
