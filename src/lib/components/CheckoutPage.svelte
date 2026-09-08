<script lang="ts">
	import { goto } from "$app/navigation";
	import { i18n } from "$lib/i18n.svelte";
	import { store } from "$lib/store.svelte";
	import { fmtIDR, fetchCartEventDiscounts } from "$lib/data";
	import Reveal from "./Reveal.svelte";

	const copy = {
		id: { kicker: "Keranjang", title: "Keranjangmu", empty: "Keranjang masih kosong", emptyCta: "Jelajahi koleksi", item: "item", total: "Total", pay: "Lanjut ke pembayaran", remove: "Hapus", continue: "Lanjut belanja", eventBadge: "Event", subtotal: "Subtotal", eventDiscount: "Diskon event", estNote: "Voucher & diskon final dihitung saat bayar." },
		en: { kicker: "Cart", title: "Your cart", empty: "Your cart is empty", emptyCta: "Explore the collection", item: "item", total: "Total", pay: "Continue to payment", remove: "Remove", continue: "Keep browsing", eventBadge: "Event", subtotal: "Subtotal", eventDiscount: "Event discount", estNote: "Voucher & final discount calculated at payment." },
	};

	const lang = $derived(i18n.lang);
	const t = $derived(copy[lang]);

	const cart = $derived(store.cart);
	const cartTotal = $derived(store.cartTotal);

	// Preview diskon event per-foto (backend yang otoritatif saat buat order).
	let eventDisc = $state<{ perItem: Record<string, { name: string; amount: number }>; total: number }>({ perItem: {}, total: 0 });
	$effect(() => {
		let cancelled = false;
		fetchCartEventDiscounts(cart).then((d) => { if (!cancelled) eventDisc = d; });
		return () => { cancelled = true; };
	});

	const grandTotal = $derived(Math.max(0, cartTotal - eventDisc.total));
</script>

{#if !cart.length}
	<section class="mx-auto flex min-h-[60svh] max-w-[1500px] flex-col items-center justify-center px-5 pt-32 text-center sm:px-6 lg:pt-44">
		<p class="kicker text-safelight">{t.kicker}</p>
		<h1 class="mt-4 font-display text-[clamp(1.8rem,5vw,3.4rem)] font-light tracking-[-0.02em] text-fg sm:mt-5">{t.empty}</h1>
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
			<Reveal stagger={0.06} class="space-y-3">
				{#each cart as item (item.id)}
					{@const ev = eventDisc.perItem[item.id]}
					<div data-reveal class="flex flex-col gap-3 rounded-md border border-hair bg-surface p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:p-5">
						<div class="min-w-0">
							<span class="kicker text-safelight/80">{item.kind}</span>
							<p class="mt-1 truncate font-display text-lg font-light text-fg">{item.title}</p>
							{#if ev}
								<p class="mt-1.5 inline-flex items-center gap-2 text-[0.72rem] text-fg-muted">
									<span class="kicker text-safelight">{t.eventBadge}</span>
									<span class="truncate">{ev.name}</span>
									<span class="font-mono text-safelight">−{fmtIDR(ev.amount)}</span>
								</p>
							{/if}
						</div>
						<div class="flex items-center justify-between gap-4 sm:shrink-0 sm:justify-end sm:gap-5">
							<span class="font-display text-lg font-light text-fg">
								{#if ev}
									<span class="inline-flex flex-col items-end leading-none">
										<span class="font-mono text-[0.6em] line-through opacity-40">{fmtIDR(item.price)}</span>
										{fmtIDR(Math.max(0, item.price - ev.amount))}
									</span>
								{:else}
									{fmtIDR(item.price)}
								{/if}
							</span>
							<button type="button" onclick={() => store.removeFromCart(item.id)} class="text-xs text-fg-muted transition-colors hover:text-safelight">
								{t.remove}
							</button>
						</div>
					</div>
				{/each}
			</Reveal>

			<aside class="lg:sticky lg:top-28 lg:self-start">
				<div class="rounded-md border border-hair bg-surface p-5 sm:p-6">
					<div class="flex items-baseline justify-between text-sm text-fg-muted">
						<span>{t.subtotal}</span>
						<span>{fmtIDR(cartTotal)}</span>
					</div>
					{#if eventDisc.total > 0}
						<div class="mt-2 flex items-baseline justify-between text-sm text-safelight">
							<span>{t.eventDiscount}</span>
							<span class="font-mono">−{fmtIDR(eventDisc.total)}</span>
						</div>
					{/if}
					<div class="mt-3 flex items-baseline justify-between border-t border-hair pt-3">
						<span class="kicker text-fg-muted">{t.total}</span>
						<span class="font-display text-2xl font-light text-fg sm:text-3xl">{fmtIDR(grandTotal)}</span>
					</div>
					<button type="button" onclick={() => goto("/payment")} class="mt-5 w-full rounded-full bg-safelight py-3.5 text-sm font-medium text-ivory shadow-[0_14px_40px_-12px_var(--safelight-glow)] transition-transform hover:scale-[1.02] sm:mt-6">
						{t.pay} →
					</button>
					<a href="/photos" class="mt-2.5 block w-full rounded-full border border-hair py-3.5 text-center text-sm font-medium text-fg transition-colors hover:border-safelight hover:text-safelight">
						{t.continue}
					</a>
					<p class="mt-3 text-center text-[0.68rem] text-fg-muted">{t.estNote}</p>
				</div>
			</aside>
		</div>
	</section>
{/if}
