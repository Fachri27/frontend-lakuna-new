<script lang="ts">
	import { goto } from "$app/navigation";
	import { i18n, type Lang } from "$lib/i18n.svelte";
	import { store } from "$lib/store.svelte";
	import { fmtIDR, fetchPlans, fetchActiveEvents, eventAmount, bestEvent, type Plan } from "$lib/data";
	import type { ApiEvent } from "$lib/data";
	import { apiGet, apiPost, ApiError } from "$lib/api";
	import type { ApiResponse } from "$lib/types";
	import Reveal from "./Reveal.svelte";

	const copy = {
		id: {
			kicker: "Langganan", title: "Akses ribuan", titleEm: "foto dan video", titleB: "berkualitas tinggi.",
			sub: "Pilih paket sesuai kebutuhanmu.",
			standar: "Standar", subscribe: "Subscribe", popular: "Paling populer",
			monthly: "Bulanan", annual: "Tahunan", perItem: "/item", perMonth: "/mo",
			quotaLabel: "Kuota download", payMonthly: "Bayar bulanan", payUpfront: "Bayar di muka (hemat)",
			features: ["Akses semua aset HD", "Lisensi premium", "Satu akun pengguna", "Customer service 24 jam"],
			buyNow: "Beli Sekarang", subscribeNow: "Berlangganan", processing: "Memproses...",
			voucherPlaceholder: "Kode voucher", apply: "Pakai", remove: "hapus",
			voucherNeedLogin: "Silakan login untuk memeriksa voucher.",
			taxNote: "Harga sudah termasuk pajak.", trustedBy: "Dipercaya oleh", pleaseLogin: "Silakan login terlebih dahulu.",
			eventKicker: "Event berlaku", eventAfter: "Setelah event",
			discountNote: "Diskon terbesar antara event & voucher yang otomatis dipakai.",
			rateSheet: "Rate Sheet", save: "Hemat", perYear: "/yr", chooseQuota: "Pilih kuota",
			billedMonthly: "Ditagih bulanan", billedUpfront: "Ditagih di muka",
		},
		en: {
			kicker: "Membership", title: "Access thousands of", titleEm: "photos and videos", titleB: "of the highest quality.",
			sub: "Pick the plan that fits your needs.",
			standar: "Standard", subscribe: "Subscribe", popular: "Most popular",
			monthly: "Monthly", annual: "Annual", perItem: "/item", perMonth: "/mo",
			quotaLabel: "Download quota", payMonthly: "Pay monthly", payUpfront: "Pay upfront (save)",
			features: ["Access all HD assets", "Premium license", "Single user account", "24 hours customer service"],
			buyNow: "Buy Now", subscribeNow: "Subscribe", processing: "Processing...",
			voucherPlaceholder: "Voucher code", apply: "Apply", remove: "remove",
			voucherNeedLogin: "Please sign in to check a voucher.",
			taxNote: "Prices include tax.", trustedBy: "Trusted by", pleaseLogin: "Please sign in first.",
			eventKicker: "Active event", eventAfter: "After event",
			discountNote: "The larger of the event & voucher discount is applied automatically.",
			rateSheet: "Rate Sheet", save: "Save", perYear: "/yr", chooseQuota: "Choose quota",
			billedMonthly: "Billed monthly", billedUpfront: "Billed upfront",
		},
	};

	const trustedClients = ["TheJakartaPost", "Bisnis.com", "TEMPO", "Kompas", "Detik"];

	/** Respon /api/vouchers/validate. */
	type VoucherValidate = {
		valid: boolean;
		reason?: string;
		voucher: { code: string; valueType: "PERCENT" | "NOMINAL"; value: number };
	};

	const lang = $derived<Lang>(i18n.lang);
	const t = $derived(copy[lang]);

	let plans = $state<Plan[]>([]);
	let standarPrice = $state(500000);
	let quota = $state(0);
	let billing = $state<"annual" | "monthly">("annual");
	let isBuying = $state(false);
	let message = $state("");

	// Voucher states
	let stdVoucherInput = $state("");
	let stdAppliedVoucher = $state<{ code: string; amount: number } | null>(null);
	let stdVoucherError = $state("");
	let stdNeedLogin = $state(false);
	let stdValidating = $state(false);

	let subVoucherInput = $state("");
	let subAppliedVoucher = $state<{ code: string; amount: number } | null>(null);
	let subVoucherError = $state("");
	let subNeedLogin = $state(false);
	let subValidating = $state(false);
	let planEvent = $state<ApiEvent | null>(null);

	$effect(() => {
		fetchPlans().then((p) => {
			plans = p;
			if (p.length > 0) quota = p[0].quota;
		}).catch(() => {});
		apiGet<ApiResponse<{ key: string; value: string }>>("/api/settings/standar_plan_price")
			.then((res) => { if (res.data?.value) standarPrice = Number(res.data.value); })
			.catch(() => {});
	});

	const selectedPlan = $derived(plans.find((p) => p.quota === quota));
	const selectedPrice = $derived(selectedPlan ? (billing === "annual" ? selectedPlan.priceAnnual : selectedPlan.priceMonthly) : 0);
	const isUpfront = $derived(billing === "annual");

	// Ambil event diskon aktif (targetType PLAN) untuk plan terpilih. Berubah saat
	// plan atau billing berganti (harga dasar berbeda → kandidat terbaik mungkin berbeda).
	$effect(() => {
		if (!selectedPlan) { planEvent = null; return; }
		let cancelled = false;
		fetchActiveEvents({ planId: selectedPlan.id })
			.then((evs) => { if (!cancelled) planEvent = bestEvent(evs, selectedPrice); })
			.catch(() => { if (!cancelled) planEvent = null; });
		return () => { cancelled = true; };
	});

	// Aturan take-largest: diskon = max(event, voucher). Voucher subscribe hanya saat
	// bayar di muka (annual). Backend memakai aturan serupa saat membuat order/subscription.
	const eventAmt = $derived(planEvent ? eventAmount(planEvent, selectedPrice) : 0);
	const voucherAmt = $derived(isUpfront && subAppliedVoucher ? subAppliedVoucher.amount : 0);
	const subDiscount = $derived(Math.max(eventAmt, voucherAmt));
	const subFinalPrice = $derived(Math.max(0, selectedPrice - subDiscount));
	const stdFinalPrice = $derived(Math.max(0, standarPrice - (stdAppliedVoucher?.amount ?? 0)));

	async function applyStdVoucher() {
		const code = stdVoucherInput.trim();
		if (!code || stdValidating) return;
		stdValidating = true;
		stdVoucherError = "";
		stdNeedLogin = false;
		try {
			const res = await apiPost<ApiResponse<VoucherValidate>>("/api/vouchers/validate", { code, scope: "ORDER", amount: standarPrice });
			if (!res.data?.valid) {
				stdAppliedVoucher = null;
				stdVoucherError = res.data?.reason || "Voucher tidak berlaku";
				return;
			}
			const amt = res.data.voucher.valueType === "PERCENT"
				? Math.round(standarPrice * res.data.voucher.value / 100)
				: res.data.voucher.value;
			stdAppliedVoucher = { code: res.data.voucher.code, amount: amt };
			stdVoucherInput = "";
		} catch (err) {
			if (err instanceof ApiError && err.status === 401) { stdVoucherError = t.voucherNeedLogin; stdNeedLogin = true; }
			else if (err instanceof ApiError) stdVoucherError = err.message || "Gagal memeriksa voucher";
			else stdVoucherError = "Gagal memeriksa voucher";
		} finally {
			stdValidating = false;
		}
	}

	async function applySubVoucher() {
		const code = subVoucherInput.trim();
		if (!code || subValidating || !isUpfront) return;
		subValidating = true;
		subVoucherError = "";
		subNeedLogin = false;
		try {
			const res = await apiPost<ApiResponse<VoucherValidate>>("/api/vouchers/validate", { code, scope: "SUBSCRIPTION", amount: selectedPrice });
			if (!res.data?.valid) {
				subAppliedVoucher = null;
				subVoucherError = res.data?.reason || "Voucher tidak berlaku";
				return;
			}
			const amt = res.data.voucher.valueType === "PERCENT"
				? Math.round(selectedPrice * res.data.voucher.value / 100)
				: res.data.voucher.value;
			subAppliedVoucher = { code: res.data.voucher.code, amount: amt };
			subVoucherInput = "";
		} catch (err) {
			if (err instanceof ApiError && err.status === 401) { subVoucherError = t.voucherNeedLogin; subNeedLogin = true; }
			else if (err instanceof ApiError) subVoucherError = err.message || "Gagal memeriksa voucher";
			else subVoucherError = "Gagal memeriksa voucher";
		} finally {
			subValidating = false;
		}
	}

	function handleBuyStandar() {
		store.addToCart({ id: "standar-single", kind: "photo", title: t.standar, price: stdFinalPrice, meta: "standar" });
		goto("/checkout");
	}

	function handleSubscribe() {
		if (!selectedPlan) return;
		store.addToCart({
			id: `plan-${selectedPlan.id}-${billing}`,
			kind: "plan",
			title: `${selectedPlan.name[lang]} (${billing === "annual" ? t.annual : t.monthly})`,
			price: subFinalPrice,
			meta: selectedPlan.id,
		});
		goto("/checkout");
	}

	// Hemat tahunan vs bulanan (jika keduanya ada).
	const annualSavePct = $derived(
		selectedPlan && selectedPlan.priceMonthly > 0 && selectedPlan.priceAnnual > 0
			? Math.round((1 - selectedPlan.priceAnnual / (selectedPlan.priceMonthly * 12)) * 100)
			: 0
	);
</script>

<div class="relative min-h-screen overflow-hidden bg-bg text-fg mt-20">
	<!-- safelight ambient + grain -->
	<div aria-hidden class="pointer-events-none absolute -top-40 right-[-10%] h-[60vw] w-[60vw] max-w-[820px] max-h-[820px] rounded-full safelight-glow opacity-[0.07]"></div>
	<div aria-hidden class="grain pointer-events-none absolute inset-0 opacity-[0.04] mix-blend-soft-light"></div>

	<!-- ── Header ── -->
	<section class="relative px-[clamp(1.25rem,4vw,4rem)] pt-[clamp(4.5rem,11vh,8rem)] pb-10">
		<div class="mx-auto max-w-[1400px]">
			<Reveal>
				<div data-reveal class="flex items-baseline justify-between gap-6 border-b border-hair pb-5">
					<p class="kicker text-safelight">{t.kicker}</p>
					<p class="kicker text-fg-muted">{t.rateSheet} · 2026</p>
				</div>
				<h1 data-reveal class="mt-8 font-display text-[clamp(2.6rem,6.4vw,5.4rem)] font-light leading-[0.97] tracking-[-0.03em] text-fg max-w-[18ch]">
					{t.title} <span class="serif-em text-safelight">{t.titleEm}</span> {t.titleB}
				</h1>
				<p data-reveal class="mt-6 max-w-xl text-[1.02rem] leading-relaxed text-fg-muted">{t.sub}</p>
			</Reveal>
		</div>
	</section>

	<!-- ── Rate plates ── -->
	<section class="relative px-[clamp(1.25rem,4vw,4rem)] pb-20">
		<div class="mx-auto grid max-w-[1400px] gap-6 lg:grid-cols-2">
			<!-- ── 01 · Standar ── -->
			<Reveal class="h-full">
				<article data-reveal class="group relative flex h-full flex-col rounded-md border border-hair bg-surface/70 p-[clamp(1.5rem,3vw,2.75rem)] backdrop-blur-sm">
					<div class="flex items-start justify-between">
						<div>
							<span class="font-display text-[clamp(2.6rem,6vw,4rem)] font-light leading-none text-fg/12">01</span>
							<p class="kicker mt-2 text-fg">{t.standar}</p>
						</div>
						<span class="kicker text-fg-muted">{t.perItem.replace("/", "")}</span>
					</div>

					<p class="mt-6 font-display font-light text-[clamp(2.4rem,5vw,3.4rem)] leading-[0.95] tracking-[-0.02em] text-fg">
						{#if stdAppliedVoucher}
							<span class="inline-flex flex-col leading-none">
								<span class="mb-1.5 font-mono text-[0.32em] tracking-[0.08em] line-through opacity-40">{fmtIDR(standarPrice)}</span>
								{fmtIDR(stdFinalPrice)}
							</span>
						{:else}
							{fmtIDR(standarPrice)}
						{/if}
						<span class="ml-1 font-mono text-[0.82rem] tracking-[0.1em] text-fg-muted">{t.perItem}</span>
					</p>

					<ul class="mt-7 flex flex-col gap-2.5">
						{#each t.features as feat (feat)}
							<li class="flex items-baseline gap-2.5 text-[0.92rem] text-fg/80">
								<span class="font-mono text-[0.7rem] text-safelight">+</span>
								{feat}
							</li>
						{/each}
					</ul>

					<div class="mt-auto pt-7">
						<div class="mb-4 max-w-sm">
							{#if stdAppliedVoucher}
								<div class="flex items-center justify-between rounded-md border border-safelight/30 bg-safelight/5 px-3 py-2 text-[0.78rem]">
									<span class="font-mono text-safelight">{stdAppliedVoucher.code} · −{fmtIDR(stdAppliedVoucher.amount)}</span>
									<button type="button" onclick={() => (stdAppliedVoucher = null)} class="font-mono text-fg-muted underline-offset-2 hover:text-safelight">{t.remove}</button>
								</div>
							{:else}
								<div class="flex items-center gap-3">
									<input type="text" bind:value={stdVoucherInput}
										onkeydown={(e) => e.key === "Enter" && applyStdVoucher()}
										placeholder={t.voucherPlaceholder}
										class="min-w-0 flex-1 border-b border-hair bg-transparent py-1.5 text-[0.82rem] text-fg outline-none transition-colors placeholder:text-fg-muted/60 focus:border-safelight" />
									<button type="button" onclick={applyStdVoucher} disabled={stdValidating || !stdVoucherInput.trim()}
										class="arrow-link font-mono text-[0.72rem] tracking-[0.1em] uppercase text-fg-muted hover:text-safelight disabled:opacity-40">
										{stdValidating ? "…" : t.apply}
										{#if !stdValidating}<span class="arr text-safelight">→</span>{/if}
									</button>
								</div>
							{/if}
							{#if stdVoucherError}
								{#if stdNeedLogin}
									<p class="mt-2 text-[0.72rem] text-red-500">
										{stdVoucherError}
										{" "}
										<a href={`/login?redirect=${encodeURIComponent("/pricing")}`} class="underline text-safelight">Login</a>
									</p>
								{:else}
									<p class="mt-2 text-[0.72rem] text-red-500">{stdVoucherError}</p>
								{/if}
							{/if}
						</div>

						<button type="button" onclick={handleBuyStandar} disabled={isBuying}
							class="group/btn flex w-full items-center justify-between rounded-full border border-fg/30 px-7 py-4 font-mono text-[0.78rem] tracking-[0.14em] uppercase text-fg transition-colors hover:border-safelight hover:text-safelight disabled:opacity-50">
							<span>{isBuying ? t.processing : t.buyNow}</span>
							{#if !isBuying}<span class="arr text-safelight transition-transform group-hover/btn:translate-x-1">→</span>{/if}
						</button>
					</div>
				</article>
			</Reveal>

			<!-- ── 02 · Subscribe (featured) ── -->
			<Reveal class="h-full">
				<article data-reveal class="group relative flex h-full flex-col overflow-hidden rounded-md border border-safelight/40 bg-surface p-[clamp(1.5rem,3vw,2.75rem)] shadow-[0_50px_120px_-60px_var(--safelight-glow-soft)]">
					<!-- safelight aura inside -->
					<div aria-hidden class="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full safelight-glow opacity-20"></div>
					<!-- populer stamp -->
					<span class="darkroom-stamp absolute right-6 top-7 z-10 rounded-sm px-3 py-1 font-mono text-[0.6rem] font-bold tracking-[0.18em] uppercase">
						{t.popular}
					</span>

					<div class="flex items-start justify-between">
						<div>
							<span class="font-display text-[clamp(2.6rem,6vw,4rem)] font-light leading-none text-safelight/15">02</span>
							<p class="kicker mt-2 text-safelight">{t.subscribe}</p>
						</div>
					</div>

					<!-- Billing toggle — segmented -->
					<div class="mt-6 inline-flex w-full max-w-xs items-center rounded-full border border-hair bg-surface-2/50 p-1">
						{#each ([["annual", t.annual], ["monthly", t.monthly]] as const) as [val, label] (val)}
							<button type="button" onclick={() => { billing = val; subAppliedVoucher = null; }}
								class={`relative flex-1 rounded-full px-4 py-2 text-center font-mono text-[0.7rem] tracking-[0.12em] uppercase transition-colors ${billing === val ? "bg-safelight text-ivory" : "text-fg-muted hover:text-fg"}`}>
								{label}
							</button>
						{/each}
					</div>
					{#if billing === "annual" && annualSavePct > 0}
						<p class="mt-2 font-mono text-[0.66rem] tracking-[0.1em] uppercase text-safelight">{t.save} {annualSavePct}% · {t.billedUpfront}</p>
					{/if}
					{#if billing === "monthly"}
						<p class="mt-2 font-mono text-[0.66rem] tracking-[0.1em] uppercase text-fg-muted">{t.billedMonthly}</p>
					{/if}

					<!-- Quota selector -->
					{#if plans.length > 0}
						<div class="mt-6">
							<p class="kicker mb-3 text-fg-muted">{t.chooseQuota}</p>
							<div class="flex flex-wrap gap-2">
								{#each plans as p (p.id)}
									<button type="button" onclick={() => { quota = p.quota; subAppliedVoucher = null; }}
										class={`min-w-[3.2rem] rounded-md border px-3 py-2 font-mono text-[0.82rem] tracking-[0.06em] transition-colors ${quota === p.quota ? "border-safelight bg-safelight/5 text-safelight" : "border-hair text-fg-muted hover:border-fg-muted hover:text-fg"}`}>
										{p.quota}
									</button>
								{/each}
							</div>
						</div>
					{/if}

					<p class="mt-6 font-display font-light text-[clamp(2.4rem,5vw,3.4rem)] leading-[0.95] tracking-[-0.02em] text-fg">
						{#if subDiscount > 0}
							<span class="inline-flex flex-col leading-none">
								<span class="mb-1.5 font-mono text-[0.32em] tracking-[0.08em] line-through opacity-40">{fmtIDR(selectedPrice)}</span>
								{fmtIDR(subFinalPrice)}
							</span>
						{:else}
							{fmtIDR(selectedPrice)}
						{/if}
						<span class="ml-1 font-mono text-[0.82rem] tracking-[0.1em] text-fg-muted">{billing === "annual" ? t.perYear : t.perMonth}</span>
					</p>

					{#if eventAmt > 0 && planEvent}
						<div class="mt-4 rounded-md border border-safelight/40 bg-safelight/5 px-4 py-3">
							<p class="kicker text-safelight">{t.eventKicker}</p>
							<p class="mt-1.5 text-sm text-fg">
								<span class="font-medium">{planEvent.name}</span>
								<span class="ml-2 font-mono text-safelight">−{fmtIDR(eventAmt)}</span>
							</p>
							<p class="mt-1.5 text-xs text-fg-muted">{t.discountNote}</p>
						</div>
					{/if}

					<ul class="mt-7 flex flex-col gap-2.5">
						{#each t.features as feat (feat)}
							<li class="flex items-baseline gap-2.5 text-[0.92rem] text-fg/85">
								<span class="font-mono text-[0.7rem] text-safelight">+</span>
								{feat}
							</li>
						{/each}
						{#if selectedPlan}
							<li class="flex items-baseline gap-2.5 text-[0.92rem] text-fg/85">
								<span class="font-mono text-[0.7rem] text-safelight">+</span>
								{selectedPlan.quota} {lang === "id" ? "unduhan / bulan" : "downloads / month"}
							</li>
						{/if}
					</ul>

					<div class="mt-auto pt-7">
						{#if isUpfront}
							<div class="mb-4 max-w-sm">
								{#if subAppliedVoucher}
									<div class="flex items-center justify-between rounded-md border border-safelight/30 bg-safelight/5 px-3 py-2 text-[0.78rem]">
										<span class="font-mono text-safelight">{subAppliedVoucher.code} · −{fmtIDR(subAppliedVoucher.amount)}</span>
										<button type="button" onclick={() => (subAppliedVoucher = null)} class="font-mono text-fg-muted underline-offset-2 hover:text-safelight">{t.remove}</button>
									</div>
								{:else}
									<div class="flex items-center gap-3">
										<input type="text" bind:value={subVoucherInput}
											onkeydown={(e) => e.key === "Enter" && applySubVoucher()}
											placeholder={t.voucherPlaceholder}
											class="min-w-0 flex-1 border-b border-hair bg-transparent py-1.5 text-[0.82rem] text-fg outline-none transition-colors placeholder:text-fg-muted/60 focus:border-safelight" />
										<button type="button" onclick={applySubVoucher} disabled={subValidating || !subVoucherInput.trim()}
											class="arrow-link font-mono text-[0.72rem] tracking-[0.1em] uppercase text-fg-muted hover:text-safelight disabled:opacity-40">
											{subValidating ? "…" : t.apply}
											{#if !subValidating}<span class="arr text-safelight">→</span>{/if}
										</button>
									</div>
								{/if}
								{#if subVoucherError}
									{#if subNeedLogin}
										<p class="mt-2 text-[0.72rem] text-red-500">
											{subVoucherError}
											{" "}
											<a href={`/login?redirect=${encodeURIComponent("/pricing")}`} class="underline text-safelight">Login</a>
										</p>
									{:else}
										<p class="mt-2 text-[0.72rem] text-red-500">{subVoucherError}</p>
									{/if}
								{/if}
							</div>
						{/if}

						<button type="button" onclick={handleSubscribe} disabled={isBuying}
							class="group/btn flex w-full items-center justify-between rounded-full bg-safelight px-7 py-4 font-mono text-[0.78rem] tracking-[0.14em] uppercase text-ivory shadow-[0_18px_50px_-12px_var(--safelight-glow)] transition-transform hover:scale-[1.015] disabled:opacity-60">
							<span>{isBuying ? t.processing : t.subscribeNow}</span>
							{#if !isBuying}<span class="arr transition-transform group-hover/btn:translate-x-1">→</span>{/if}
						</button>

						{#if message}
							<p class={`mt-4 text-[0.82rem] ${message.includes("berhasil") ? "text-green-600" : "text-red-500"}`}>{message}</p>
						{/if}
					</div>
				</article>
			</Reveal>
		</div>

		<p class="mx-auto mt-12 max-w-[1400px] kicker text-fg-muted">{t.taxNote}</p>
	</section>

	<!-- ── Trusted Clients ── -->
	<section class="relative px-[clamp(1.25rem,4vw,4rem)] border-t border-hair py-16">
		<div class="mx-auto max-w-[1400px]">
			<p class="text-center kicker text-fg-muted mb-10">{t.trustedBy}</p>
			<div class="flex flex-wrap justify-center items-center gap-x-14 gap-y-6">
				{#each trustedClients as client (client)}
					<span class="font-display text-[1.4rem] font-light text-fg/20 transition-colors duration-300 hover:text-fg/70 cursor-default">{client}</span>
				{/each}
			</div>
		</div>
	</section>
</div>
