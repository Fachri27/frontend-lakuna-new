<script lang="ts">
	import { goto } from "$app/navigation";
	import { flip } from "svelte/animate";
	import { fly } from "svelte/transition";
	import { cubicOut } from "svelte/easing";
	import { i18n } from "$lib/i18n.svelte";
	import { store, type CartItem } from "$lib/store.svelte";
	import { fmtIDR, imgFor, fetchCartEventDiscounts, pickTitle } from "$lib/data";
	import Reveal from "./Reveal.svelte";

	const copy = {
		id: {
			kicker: "Keranjang", title: "Keranjangmu", empty: "Keranjang masih kosong",
			emptyBody: "Simpan bingkai yang kamu suka di sini, lalu bayar sekaligus",
			emptyCta: "Jelajahi koleksi", items: "{n} item", total: "Total", pay: "Lanjut ke pembayaran",
			remove: "Hapus", continue: "Lanjut belanja", eventBadge: "Event", subtotal: "Subtotal ({n} item)",
			eventDiscount: "Diskon event", estNote: "Voucher & diskon final dihitung saat bayar",
			kindPhoto: "Foto", kindVideo: "Video", kindPlan: "Paket langganan",
		},
		en: {
			kicker: "Cart", title: "Your cart", empty: "Your cart is empty",
			emptyBody: "Keep the frames you like here, then pay for them in one go",
			emptyCta: "Explore the collection", items: "{n} items", total: "Total", pay: "Continue to payment",
			remove: "Remove", continue: "Keep browsing", eventBadge: "Event", subtotal: "Subtotal ({n} items)",
			eventDiscount: "Event discount", estNote: "Voucher & final discount calculated at payment",
			kindPhoto: "Photo", kindVideo: "Video", kindPlan: "Membership plan",
		},
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
	const n = (tpl: string) => tpl.replace("{n}", String(cart.length));

	function kindLabel(item: CartItem) {
		if (item.kind === "plan") return t.kindPlan;
		if (item.kind === "video") return t.kindVideo;
		return t.kindPhoto;
	}

	let reduced = $state(false);
	$effect(() => {
		reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
	});
</script>

{#if !cart.length}
	<section class="mx-auto flex min-h-[60svh] max-w-[1500px] flex-col items-center justify-center px-5 pt-32 text-center sm:px-6 lg:pt-44">
		<!-- Bingkai kosong: bingkai foto tanpa isi, bukan ikon keranjang generik. -->
		<span class="ck-empty-frame" aria-hidden="true"></span>
		<h1 class="mt-8 font-display text-[clamp(1.8rem,5vw,3.4rem)] font-light tracking-[-0.02em] text-fg">{t.empty}</h1>
		<p class="mt-3 max-w-[40ch] text-fg-muted">{t.emptyBody}</p>
		<a href="/photos" class="press arrow-link mt-8 rounded-full bg-safelight px-7 py-3.5 text-sm font-medium text-ivory">
			{t.emptyCta} <span class="arr">→</span>
		</a>
	</section>
{:else}
	<section class="mx-auto max-w-[1100px] px-5 pb-40 pt-32 sm:px-6 lg:px-10 lg:pb-28 lg:pt-44">
		<Reveal class="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
			<div>
				<p data-reveal class="kicker text-safelight">{t.kicker}</p>
				<h1 data-reveal class="mt-4 font-display text-[clamp(1.8rem,5vw,3.6rem)] font-light tracking-[-0.02em] text-fg sm:mt-5">{t.title}</h1>
			</div>
			<p data-reveal class="pb-2 text-sm text-fg-muted">{n(t.items)}</p>
		</Reveal>

		<div class="mt-8 grid gap-8 sm:mt-10 sm:gap-10 lg:grid-cols-[1fr_22rem]">
			<!-- Satu lembar, baris-baris bergaris rambut — bukan kartu per item. -->
			<ul class="ck-sheet">
				{#each cart as item (item.id)}
					{@const ev = eventDisc.perItem[item.id]}
					<li
						class="ck-row"
						animate:flip={{ duration: reduced ? 0 : 320, easing: cubicOut }}
						out:fly={{ x: reduced ? 0 : 40, duration: reduced ? 0 : 260, easing: cubicOut }}
					>
						<div class="ck-thumb">
							{#if item.kind === "plan"}
								<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
									<rect x="7" y="3" width="14" height="11" rx="1.5" /><path d="M4 7v11a1.5 1.5 0 0 0 1.5 1.5H17" /><path d="M10 11l2.5-3 2 2.5 1.5-1.5 2 2" />
								</svg>
							{:else if item.thumbUrl}
								<img src={imgFor(item.meta ?? item.id, 240, 180, item.thumbUrl)} alt="" loading="lazy" />
							{:else}
								<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
									<rect x="3" y="5" width="18" height="14" rx="1.5" /><circle cx="12" cy="12" r="3.5" />
								</svg>
							{/if}
							{#if item.kind === "video"}
								<span class="ck-thumb__play" aria-hidden="true">
									<svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
								</span>
							{/if}
						</div>

						<div class="min-w-0 flex-1">
							<p class="text-xs text-fg-muted">{kindLabel(item)}</p>
							<p class="mt-0.5 truncate font-display text-lg font-light leading-snug text-fg">{pickTitle(item.title, item.titleEn, lang)}</p>
							{#if ev}
								<p class="mt-1.5 inline-flex max-w-full items-center gap-2 text-[0.72rem] text-fg-muted">
									<span class="ck-event">{t.eventBadge}</span>
									<span class="truncate">{ev.name}</span>
								</p>
							{/if}
						</div>

						<div class="ck-price">
							{#if ev}
								<span class="block text-xs text-fg-muted line-through">{fmtIDR(item.price)}</span>
								<span class="text-safelight">{fmtIDR(Math.max(0, item.price - ev.amount))}</span>
							{:else}
								{fmtIDR(item.price)}
							{/if}
						</div>

						<button
							type="button"
							onclick={() => store.removeFromCart(item.id)}
							class="ck-remove"
							aria-label={`${t.remove}: ${pickTitle(item.title, item.titleEn, lang)}`}
							title={t.remove}
						>
							<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
						</button>
					</li>
				{/each}
			</ul>

			<aside class="lg:sticky lg:top-28 lg:self-start">
				<div class="ck-summary">
					<div class="flex items-baseline justify-between text-sm text-fg-muted">
						<span>{n(t.subtotal)}</span>
						<span class="tabular-nums">{fmtIDR(cartTotal)}</span>
					</div>
					{#if eventDisc.total > 0}
						<div class="mt-2 flex items-baseline justify-between text-sm text-safelight">
							<span>{t.eventDiscount}</span>
							<span class="tabular-nums">−{fmtIDR(eventDisc.total)}</span>
						</div>
					{/if}
					<div class="mt-4 flex items-baseline justify-between gap-4 border-t border-hair pt-4">
						<span class="text-sm text-fg-muted">{t.total}</span>
						<span class="font-display text-3xl font-light tabular-nums tracking-[-0.01em] text-fg">{fmtIDR(grandTotal)}</span>
					</div>
					<button type="button" onclick={() => goto("/payment")} class="press arrow-link mt-6 w-full justify-center rounded-full bg-safelight py-3.5 text-sm font-medium text-ivory shadow-[0_14px_40px_-12px_var(--safelight-glow)] transition-transform hover:scale-[1.02]">
						{t.pay} <span class="arr">→</span>
					</button>
					<a href="/photos" class="mt-2.5 block w-full rounded-full border border-hair py-3.5 text-center text-sm font-medium text-fg transition-colors hover:border-safelight hover:text-safelight">
						{t.continue}
					</a>
					<p class="mt-4 text-center text-xs text-fg-muted">{t.estNote}</p>
				</div>
			</aside>
		</div>
	</section>

	<!-- Ponsel: total + bayar selalu terjangkau jempol. -->
	<div class="ck-bar lg:hidden">
		<div class="min-w-0">
			<p class="text-xs text-fg-muted">{t.total} · {n(t.items)}</p>
			<p class="font-display text-xl font-light tabular-nums text-fg">{fmtIDR(grandTotal)}</p>
		</div>
		<button type="button" onclick={() => goto("/payment")} class="press shrink-0 rounded-full bg-safelight px-6 py-3 text-sm font-medium text-ivory">
			{t.pay}
		</button>
	</div>
{/if}

<style>
	.ck-sheet {
		border-top: 1px solid var(--hair);
		border-bottom: 1px solid var(--hair);
	}
	.ck-row {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 1.1rem 0;
	}
	.ck-row + .ck-row {
		border-top: 1px solid var(--hair);
	}

	.ck-thumb {
		position: relative;
		display: grid;
		place-items: center;
		flex-shrink: 0;
		width: 5.5rem;
		aspect-ratio: 4 / 3;
		overflow: hidden;
		border-radius: 4px;
		background: var(--wash);
		color: var(--safelight);
		box-shadow: 0 0 0 1px var(--hair);
	}
	.ck-thumb img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
	.ck-thumb__play {
		position: absolute;
		left: 0.35rem;
		bottom: 0.35rem;
		display: grid;
		place-items: center;
		width: 18px;
		height: 18px;
		border-radius: 50%;
		background: rgba(0, 0, 0, 0.6);
		color: #fff;
	}

	.ck-event {
		padding: 0.05rem 0.45rem;
		border-radius: 999px;
		background: color-mix(in srgb, var(--safelight) 14%, transparent);
		color: var(--safelight);
	}

	.ck-price {
		flex-shrink: 0;
		text-align: right;
		font-family: var(--font-display);
		font-size: 1.05rem;
		font-weight: 300;
		font-variant-numeric: tabular-nums;
		color: var(--fg);
	}

	.ck-remove {
		display: grid;
		place-items: center;
		flex-shrink: 0;
		width: 2rem;
		height: 2rem;
		border-radius: 50%;
		color: var(--fg-muted);
		transition: color 0.2s ease, background-color 0.2s ease;
	}
	.ck-remove:hover {
		color: var(--safelight);
		background: color-mix(in srgb, var(--safelight) 10%, transparent);
	}
	.ck-remove:focus-visible {
		outline: 2px solid var(--safelight);
		outline-offset: 2px;
	}

	.ck-summary {
		padding: 1.5rem;
		border-radius: 8px;
		border: 1px solid var(--hair);
		background: var(--surface);
	}

	.ck-bar {
		position: fixed;
		left: 0;
		right: 0;
		bottom: 0;
		z-index: 40;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding: 0.85rem 1.25rem calc(0.85rem + env(safe-area-inset-bottom));
		border-top: 1px solid var(--hair);
		background: color-mix(in srgb, var(--bg) 88%, transparent);
		backdrop-filter: blur(14px);
	}

	.ck-empty-frame {
		width: 7rem;
		aspect-ratio: 4 / 3;
		border-radius: 4px;
		border: 1px dashed color-mix(in srgb, var(--fg) 30%, transparent);
		background:
			linear-gradient(135deg, transparent calc(50% - 0.5px), color-mix(in srgb, var(--fg) 18%, transparent) 50%, transparent calc(50% + 0.5px));
	}

	@media (max-width: 520px) {
		.ck-row {
			flex-wrap: wrap;
			gap: 0.75rem 1rem;
		}
		.ck-thumb {
			width: 4.5rem;
		}
		.ck-price {
			order: 3;
			margin-left: calc(4.5rem + 1rem);
			text-align: left;
		}
	}
</style>
