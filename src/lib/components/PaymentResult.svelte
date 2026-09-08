<script lang="ts">
	import { i18n } from "$lib/i18n.svelte";
	import { store } from "$lib/store.svelte";
	import { apiPost } from "$lib/api";
	import type { ApiResponse } from "$lib/types";

	type Status = "loading" | "paid" | "cancelled" | "pending";

	let { orderId, transactionStatus }: { orderId: string; transactionStatus?: string } = $props();

	const copy = {
		id: {
			slipKicker: "Bukti cetak · Lakuna",
			paid: "Pembayaran lunas", paidBody: "Bingkai milikmu. Lisensi dan unduhan penuh menunggumu di kamar gelap profilmu.",
			paidStamp: "Lunas",
			cancelled: "Negatif ditolak", cancelledBody: "Eksposur gagal — pembayaran dibatalkan. Silakan ulangi dari awal.",
			cancelledStamp: "Ditolak",
			pending: "Masih dalam eksposur", pendingBody: "Cahaya belum sepenuhnya membakar bingkai. Selesaikan pembayaran sebelum safelight padam.",
			pendingMark: "Eksposur",
			loading: "Memeriksa status pembayaran…",
			serial: "No. Seri", date: "Tanggal", status: "Status",
			sPaid: "Lunas", sCancelled: "Dibatalkan", sPending: "Menunggu",
			toProfile: "Buka kamar gelap", toPhotos: "Jelajahi foto", retry: "Cek ulang",
		},
		en: {
			slipKicker: "Proof sheet · Lakuna",
			paid: "Payment settled", paidBody: "The frame is yours. Licenses and full downloads wait in the darkroom of your profile.",
			paidStamp: "Settled",
			cancelled: "Negative rejected", cancelledBody: "The exposure failed — payment was cancelled. Please start again.",
			cancelledStamp: "Rejected",
			pending: "Still exposing", pendingBody: "Light hasn't fully burned into the frame. Complete payment before the safelight fades.",
			pendingMark: "Exposing",
			loading: "Checking payment status…",
			serial: "Serial no.", date: "Date", status: "Status",
			sPaid: "Settled", sCancelled: "Rejected", sPending: "Pending",
			toProfile: "Open the darkroom", toPhotos: "Explore photos", retry: "Re-check",
		},
	};

	const lang = $derived(i18n.lang);
	const t = $derived(copy[lang]);

	const SUCCESS_STATUSES = new Set(["PAID", "ORDER_PAID", "ACTIVE", "ALREADY_ACTIVE", "SETTLED"]);
	const CANCELLED_STATUSES = new Set(["CANCELLED", "ORDER_CANCELLED", "EXPIRED", "EXPIRE", "DENY"]);

	function normalizeStatus(apiStatus?: string, txStatus?: string): Status {
		if (apiStatus && SUCCESS_STATUSES.has(apiStatus)) return "paid";
		if (apiStatus && CANCELLED_STATUSES.has(apiStatus)) return "cancelled";
		// Midtrans kadang kirim sinyal sukses di URL sebelum backend update.
		if (txStatus === "settlement" || txStatus === "capture") return "paid";
		// Xendit redirect: status di query string = PAID / SETTLED / EXPIRED / PENDING.
		if (txStatus === "PAID" || txStatus === "SETTLED") return "paid";
		if (txStatus === "EXPIRED" || txStatus === "deny" || txStatus === "expire" || txStatus === "cancel") return "cancelled";
		return "pending";
	}

	function sleep(ms: number) {
		return new Promise((r) => setTimeout(r, ms));
	}

	let status = $state<Status>("loading");
	let checking = $state(false);
	// useRef "ran" → flag non-reaktif biasa (efek hanya jalan sekali).
	let ran = false;

	async function checkOnce() {
		if (!orderId) {
			status = normalizeStatus(undefined, transactionStatus);
			return;
		}
		checking = true;
		try {
			const res = await apiPost<ApiResponse<{ status: string }>>(`/api/payment/check/${orderId}`);
			status = normalizeStatus(res.data?.status, transactionStatus);
		} catch {
			status = normalizeStatus(undefined, transactionStatus);
		} finally {
			checking = false;
		}
	}

	$effect(() => {
		if (ran) return;
		ran = true;
		let cancelled = false;

		(async () => {
			// Midtrans redirect kadang lebih cepat daripada backend update status.
			// Retry beberapa kali sampai konvergen (PAID/CANCELLED) atau habis attempt.
			for (let attempt = 0; attempt < 6; attempt++) {
				if (cancelled) return;
				if (orderId) {
					try {
						const res = await apiPost<ApiResponse<{ status: string }>>(`/api/payment/check/${orderId}`);
						if (cancelled) return;
						const next = normalizeStatus(res.data?.status, transactionStatus);
						status = next;
						if (next === "paid" || next === "cancelled") break;
					} catch {
						/* retry */
					}
				}
				if (attempt < 5) await sleep(2000);
			}
			if (cancelled) return;
			// Fallback bila backend masih pending tapi Midtrans sudah bilang sukses di URL.
			if (status !== "paid") status = normalizeStatus(undefined, transactionStatus);
		})();

		return () => { cancelled = true; };
	});

	// Saat PAID, cart server-side sudah dikosongkan backend → refresh state lokal.
	$effect(() => {
		if (status === "paid") void store.refreshCart();
	});

	const isPaid = $derived(status === "paid");
	const isCancelled = $derived(status === "cancelled");
	const isPending = $derived(status === "pending" || status === "loading");

	const heading = $derived(isPaid ? t.paid : isCancelled ? t.cancelled : t.pending);
	const body = $derived(isPaid ? t.paidBody : isCancelled ? t.cancelledBody : t.pendingBody);
	const statusLabel = $derived(isPaid ? t.sPaid : isCancelled ? t.sCancelled : t.sPending);
	const statusColor = $derived(isPaid ? "text-safelight" : isCancelled ? "text-fg-muted" : "text-safelight/80");
	const statusDot = $derived(isPaid ? "bg-safelight" : isCancelled ? "bg-fg-muted" : "bg-safelight/70");

	const dateStr = $derived(
		new Date().toLocaleDateString(lang === "id" ? "id-ID" : "en-US", {
			day: "2-digit",
			month: "short",
			year: "numeric",
		})
	);

	// Safelight lamp di belakang slip: berdenyut saat masih eksposur, redup saat ditolak.
	const glowClass = $derived(
		isCancelled
			? "safelight-glow opacity-20"
			: isPending
				? "safelight-glow safelight-pulse"
				: "safelight-glow"
	);
</script>

<section
	aria-live="polite"
	class="relative mx-auto flex min-h-[78svh] max-w-md flex-col items-center justify-center px-5 pb-24 pt-32 text-center sm:px-6 lg:pt-40"
>
	<!-- Safelight lamp glow -->
	<div aria-hidden class={`pointer-events-none absolute left-1/2 top-[42%] h-[34rem] w-[34rem] -translate-x-1/2 -translate-y-1/2 ${glowClass}`}></div>
	<div aria-hidden class="grain pointer-events-none absolute inset-0 opacity-[0.08] mix-blend-soft-light"></div>

	<!-- ── Proof slip ── -->
	<article class="proof-slip proof-row relative w-full overflow-hidden rounded-md border border-hair shadow-[0_50px_120px_-50px_rgba(0,0,0,0.8)]">
		<div aria-hidden class="proof-perf"></div>

		<div class="relative px-6 py-7 sm:px-9 sm:py-9">
			<!-- Header -->
			<div class="proof-row flex items-center justify-between gap-4" style="animation-delay: 80ms">
				<span class="kicker text-safelight">{t.slipKicker}</span>
				<span class="kicker text-fg-muted">{dateStr}</span>
			</div>
			<div class="rule mt-4"></div>

			<!-- ── Status mark ── -->
			<div class="relative my-9 flex h-44 items-center justify-center sm:my-12 sm:h-52">
				{#each ["tl", "tr", "bl", "br"] as const as c (c)}
					<span
						aria-hidden
						class={`pointer-events-none absolute h-4 w-4 border-fg/25 ${
							c === "tl" ? "left-0 top-0 border-l border-t"
							: c === "tr" ? "right-0 top-0 border-r border-t"
							: c === "bl" ? "bottom-0 left-0 border-b border-l"
							: "bottom-0 right-0 border-b border-r"
						}`}
					></span>
				{/each}

				{#if status === "loading"}
					<div class="grid h-20 w-20 place-items-center rounded-full border border-safelight/40">
						<span class="animate-pulse font-mono text-lg text-safelight">…</span>
					</div>
				{:else if isPaid}
					<!-- Rubber-stamp mark -->
					<div class="darkroom-stamp flex flex-col items-center px-6 py-4 text-center">
						<span class="kicker text-[0.6rem] leading-none opacity-70">Lakuna</span>
						<span class="mt-1 font-display text-2xl font-light leading-none tracking-[-0.01em] sm:text-3xl">{t.paidStamp}</span>
						<span class="mt-2 h-px w-10 bg-safelight/60"></span>
						<span class="mt-1.5 text-base leading-none text-safelight">✓</span>
					</div>
				{:else if isCancelled}
					<div class="flex flex-col items-center px-6 py-4 text-center text-fg-muted" style="transform: rotate(-4deg)">
						<span class="kicker text-[0.6rem] leading-none">Lakuna</span>
						<span class="relative mt-1 font-display text-2xl font-light leading-none tracking-[-0.01em] sm:text-3xl">
							{t.cancelledStamp}
							<span aria-hidden class="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 rotate-[-6deg] bg-fg-muted/70"></span>
						</span>
						<span class="mt-2 text-base leading-none">×</span>
					</div>
				{:else}
					<!-- Exposing frame — light travelling across the negative -->
					<div class="relative h-28 w-24 overflow-hidden rounded-sm border border-safelight/40 bg-[#050608] sm:h-32 sm:w-28">
						<div aria-hidden class="expose-scan absolute inset-x-0 top-0 h-2/3"></div>
						<div aria-hidden class="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,color-mix(in_srgb,var(--safelight)_12%,transparent),transparent_70%)]"></div>
						<div class="absolute inset-x-0 bottom-2 text-center">
							<span class="kicker text-[0.55rem] text-safelight/80">{t.pendingMark}</span>
						</div>
					</div>
				{/if}
			</div>

			<!-- Headline + body -->
			<h1
				class="proof-row font-display text-[clamp(1.7rem,4.6vw,2.6rem)] font-light leading-[1.05] tracking-[-0.02em] text-fg"
				style="animation-delay: 160ms"
			>
				{heading}
			</h1>
			<p
				class="proof-row mx-auto mt-3 max-w-sm text-sm leading-relaxed text-fg-muted sm:mt-4 sm:text-[0.95rem]"
				style="animation-delay: 220ms"
			>
				{status === "loading" ? t.loading : body}
			</p>

			<div class="rule mt-7"></div>

			<!-- Metadata -->
			{#if orderId}
				<dl class="proof-row mt-5 space-y-3 text-left" style="animation-delay: 280ms">
					<div class="flex items-baseline justify-between gap-4">
						<dt class="kicker shrink-0 text-fg-muted">{t.serial}</dt>
						<dd class="truncate font-mono text-xs text-fg">{orderId}</dd>
					</div>
					<div class="flex items-center justify-between gap-4">
						<dt class="kicker shrink-0 text-fg-muted">{t.status}</dt>
						<dd class="flex items-center gap-2 text-xs font-medium text-fg">
							<span aria-hidden class={`h-1.5 w-1.5 rounded-full ${statusDot}`}></span>
							<span class={statusColor}>{statusLabel}</span>
						</dd>
					</div>
				</dl>
			{/if}
		</div>

		<div aria-hidden class="proof-perf"></div>
	</article>

	<!-- ── Actions ── -->
	<div class="proof-row mt-7 flex w-full flex-col gap-3 sm:mt-8 sm:flex-row sm:justify-center" style="animation-delay: 340ms">
		<a
			href="/profile"
			class="arrow-link justify-center rounded-full bg-safelight px-7 py-3.5 text-sm font-medium text-ivory shadow-[0_14px_40px_-12px_var(--safelight-glow)] transition-transform hover:scale-[1.02]"
		>
			{t.toProfile} <span class="arr">→</span>
		</a>
		{#if !isPaid && !isCancelled}
			<button
				type="button"
				onclick={checkOnce}
				disabled={checking}
				class="rounded-full border border-hair px-7 py-3.5 text-sm font-medium text-fg transition-colors hover:border-safelight hover:text-safelight disabled:opacity-60"
			>
				{checking ? t.loading : t.retry}
			</button>
		{/if}
		<a
			href="/photos"
			class="rounded-full border border-hair px-7 py-3.5 text-sm font-medium text-fg transition-colors hover:border-safelight hover:text-safelight"
		>
			{t.toPhotos}
		</a>
	</div>
</section>

