<script lang="ts">
	import { i18n } from "$lib/i18n.svelte";
	import { store } from "$lib/store.svelte";
	import { fmtIDR, fetchCartEventDiscounts } from "$lib/data";
	import { apiPost, ApiError } from "$lib/api";
	import type { ApiResponse, ApiCreateOrderResult } from "$lib/types";
	import Reveal from "./Reveal.svelte";

	const copy = {
		id: {
			kicker: "Pembayaran", title: "Selesaikan pesanan", total: "Total",
			voucherLabel: "Kode voucher", voucherPlaceholder: "Mis. NUSANTARA25", voucherApply: "Terapkan",
			voucherApplied: "Voucher diterapkan", voucherInvalid: "Voucher tidak valid",
			pay: "Bayar dengan Xendit", processing: "Menyiapkan pembayaran…",
			secureNote: "Pembayaran diproses aman oleh Xendit. Kamu akan diarahkan ke halaman Xendit untuk menyelesaikan transaksi.",
			empty: "Tidak ada item untuk dibayar.", emptyCta: "Kembali ke koleksi",
			needLogin: "Masuk untuk membayar", needLoginBody: "Pesanan hanya bisa diselesaikan setelah kamu masuk.",
			goLogin: "Masuk",
			errEmptyCart: "Keranjangmu kosong.", errNoItem: "Tidak ada item berbayar di keranjang.",
			errGeneric: "Gagal membuat pesanan. Coba lagi sebentar.",
			errAuth: "Sesi berakhir. Silakan masuk kembali.",
			summary: "Ringkasan", items: "item",
			subtotal: "Subtotal",
			eventDiscount: "Diskon event",
			voucherHint: "Voucher (jika lebih besar) dipakai otomatis saat bayar.",
		},
		en: {
			kicker: "Payment", title: "Complete your order", total: "Total",
			voucherLabel: "Voucher code", voucherPlaceholder: "e.g. NUSANTARA25", voucherApply: "Apply",
			voucherApplied: "Voucher applied", voucherInvalid: "Invalid voucher",
			pay: "Pay with Xendit", processing: "Preparing payment…",
			secureNote: "Payment is securely processed by Xendit. You'll be redirected to Xendit to finish the transaction.",
			empty: "Nothing to pay for.", emptyCta: "Back to the collection",
			needLogin: "Sign in to pay", needLoginBody: "Orders can only be completed after you sign in.",
			goLogin: "Sign in",
			errEmptyCart: "Your cart is empty.", errNoItem: "No payable items in your cart.",
			errGeneric: "Failed to create the order. Please try again shortly.",
			errAuth: "Session expired. Please sign in again.",
			summary: "Summary", items: "items",
			subtotal: "Subtotal",
			eventDiscount: "Event discount",
			voucherHint: "Voucher (if larger) is applied automatically at payment.",
		},
	};

	const lang = $derived(i18n.lang);
	const t = $derived(copy[lang]);

	const cart = $derived(store.cart);
	const cartTotal = $derived(store.cartTotal);

	let voucher = $state("");
	let status = $state<"idle" | "processing">("idle");
	let error = $state<string | null>(null);
	let eventTotal = $state(0);

	// Preview diskon event (auto, per-foto). Backend take-largest dgn voucher
	// saat buat order — di sini cuma menampilkan perkiraan.
	$effect(() => {
		let cancelled = false;
		fetchCartEventDiscounts(cart).then((d) => { if (!cancelled) eventTotal = d.total; });
		return () => { cancelled = true; };
	});

	const needLogin = $derived(!store.loading && !store.user);
	const grandTotal = $derived(Math.max(0, cartTotal - eventTotal));

	async function pay(e: SubmitEvent) {
		e.preventDefault();
		if (status === "processing") return;
		status = "processing";
		error = null;
		try {
			const res = await apiPost<ApiResponse<ApiCreateOrderResult>>("/api/order", {
				voucherCode: voucher.trim() || undefined,
			});
			if (res.success && res.data.redirectUrl) {
				// Backend membuat order dari cart server-side. Jangan clear cart di sini —
				// backend menghapus item STANDAR otomatis saat status jadi PAID (lewat webhook/check).
				window.location.href = res.data.redirectUrl;
				return;
			}
			error = t.errGeneric;
			status = "idle";
		} catch (err) {
			if (err instanceof ApiError) {
				if (err.status === 401) error = t.errAuth;
				else if (err.code === "EMPTY_CART") error = t.errEmptyCart;
				else if (err.code === "NO_STANDAR_ITEM") error = t.errNoItem;
				else error = err.message || t.errGeneric;
			} else {
				error = t.errGeneric;
			}
			status = "idle";
		}
	}
</script>

{#if needLogin}
	<section class="mx-auto flex min-h-[60svh] max-w-xl flex-col items-center justify-center px-5 pt-32 text-center sm:px-6 lg:pt-44">
		<p class="kicker text-safelight">{t.kicker}</p>
		<h1 class="mt-4 font-display text-[clamp(1.8rem,5vw,3.4rem)] font-light tracking-[-0.02em] text-fg sm:mt-5">{t.needLogin}</h1>
		<p class="mt-3 text-fg-muted sm:mt-4">{t.needLoginBody}</p>
		<a href="/login" class="mt-6 rounded-full bg-safelight px-7 py-3.5 text-sm font-medium text-ivory sm:mt-8">{t.goLogin}</a>
	</section>
{:else if !cart.length}
	<section class="mx-auto flex min-h-[60svh] max-w-[1500px] flex-col items-center justify-center px-5 pt-32 text-center sm:px-6 lg:pt-44">
		<h1 class="font-display text-3xl font-light text-fg">{t.empty}</h1>
		<a href="/photos" class="arrow-link mt-6 rounded-full bg-safelight px-7 py-3.5 text-sm font-medium text-ivory sm:mt-8">
			{t.emptyCta} <span class="arr">→</span>
		</a>
	</section>
{:else}
	<section class="mx-auto max-w-[1100px] px-5 pb-28 pt-32 sm:px-6 lg:px-10 lg:pt-44">
		<Reveal>
			<p data-reveal class="kicker text-safelight">{t.kicker}</p>
			<h1 data-reveal class="mt-4 font-display text-[clamp(1.8rem,5vw,3.6rem)] font-light tracking-[-0.02em] text-fg sm:mt-5">{t.title}</h1>
		</Reveal>

		<div class="mt-8 grid gap-8 sm:mt-10 sm:gap-10 lg:grid-cols-[1fr_22rem]">
			<form onsubmit={pay} class="space-y-5 sm:space-y-6">
				<Reveal>
					<label data-reveal class="block">
						<span class="kicker text-fg-muted">{t.voucherLabel}</span>
						<input
							bind:value={voucher}
							placeholder={t.voucherPlaceholder}
							class="mt-2 w-full rounded-md border border-hair bg-surface px-4 py-3 text-sm text-fg outline-none transition-colors focus:border-safelight"
						/>
					</label>
				</Reveal>

				<Reveal>
					<p data-reveal class="text-sm text-fg-muted">{t.secureNote}</p>
				</Reveal>

				{#if error}
					<p role="alert" class="rounded-md border border-safelight/40 bg-safelight/5 px-4 py-3 text-sm text-safelight">
						{error}
					</p>
				{/if}

				<button type="submit" disabled={status === "processing"} class="w-full rounded-full bg-safelight py-3.5 text-sm font-medium text-ivory shadow-[0_14px_40px_-12px_var(--safelight-glow)] transition-transform hover:scale-[1.02] disabled:opacity-60">
					{status === "processing" ? t.processing : `${t.pay} · ${fmtIDR(grandTotal)}`}
				</button>
			</form>

			<aside class="lg:sticky lg:top-28 lg:self-start">
				<div class="rounded-md border border-hair bg-surface p-5 sm:p-6">
					<p class="kicker text-fg-muted">{t.summary}</p>
					<div class="mt-5 space-y-2 text-sm">
						{#each cart as i (i.id)}
							<div class="flex justify-between gap-3 text-fg-muted">
								<span class="truncate">{i.title}</span>
								<span class="shrink-0">{fmtIDR(i.price)}</span>
							</div>
						{/each}
					</div>
					<div class="mt-5 space-y-1.5 border-t border-hair pt-5">
						<div class="flex items-baseline justify-between text-sm text-fg-muted">
							<span>{t.subtotal}</span>
							<span>{fmtIDR(cartTotal)}</span>
						</div>
						{#if eventTotal > 0}
							<div class="flex items-baseline justify-between text-sm text-safelight">
								<span>{t.eventDiscount}</span>
								<span class="font-mono">−{fmtIDR(eventTotal)}</span>
							</div>
						{/if}
						<div class="flex items-baseline justify-between">
							<span class="kicker text-fg-muted">{t.total}</span>
							<span class="font-display text-2xl font-light text-fg sm:text-3xl">{fmtIDR(grandTotal)}</span>
						</div>
						<p class="mt-1 text-[0.68rem] text-fg-muted">{t.voucherHint}</p>
					</div>
				</div>
			</aside>
		</div>
	</section>
{/if}
