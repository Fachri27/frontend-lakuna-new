<script lang="ts">
	import { i18n } from "$lib/i18n.svelte";
	import { store } from "$lib/store.svelte";
	import { apiPost, ApiError } from "$lib/api";
	import type { ApiResponse } from "$lib/types";

	type Status = "loading" | "paid" | "pending" | "failed";

	let { orderId }: { orderId: string } = $props();

	const copy = {
		id: {
			paid: "Pembayaran diterima",
			paidBody: "Lisensi dan unduhan resolusi penuh sudah tersedia di profilmu.",
			subPaid: "Langganan aktif",
			subPaidBody: "Kuota unduhan bulananmu sudah bisa dipakai.",
			failed: "Pembayaran dibatalkan",
			failedBody: "Pembayaran tidak berhasil, jadi order ini tidak ditagih. Ulangi pembayaran untuk mendapatkan berkasnya.",
			pending: "Menunggu pembayaran",
			pendingBody: "Selesaikan pembayaran di jendela pembayaran, lalu cek lagi untuk memperbarui halaman ini.",
			loading: "Memeriksa status pembayaran…",
			unknown: "Status pembayaran belum bisa dipastikan",
			unknownBody: "Cek lagi sebentar lagi. Bila pembayaran sudah masuk, order akan diperbarui otomatis.",
			missing: "Order tidak ditemukan",
			missingBody: "Tautan ini tidak memuat nomor order yang valid. Buka pesananmu dari profil.",
			order: "Nomor order", checked: "Diperiksa",
			errSession: "Sesi berakhir. Masuk kembali, lalu tekan Cek lagi.",
			toDownloads: "Buka unduhan saya", toProfile: "Buka profil", payAgain: "Bayar lagi",
			retry: "Cek lagi", checking: "Memeriksa…", toPhotos: "Jelajahi foto",
			copy: "Salin", copied: "Tersalin",
		},
		en: {
			paid: "Payment received",
			paidBody: "Your licenses and full-resolution downloads are ready in your profile.",
			subPaid: "Subscription active",
			subPaidBody: "Your monthly download quota is ready to use.",
			failed: "Payment cancelled",
			failedBody: "The payment didn't go through, so this order wasn't charged. Pay again to get your files.",
			pending: "Waiting for payment",
			pendingBody: "Finish paying in the payment window, then check again to update this page.",
			loading: "Checking payment status…",
			unknown: "We couldn't confirm this payment yet",
			unknownBody: "Check again in a moment. If the payment went through, the order updates automatically.",
			missing: "Order not found",
			missingBody: "This link doesn't include a valid order number. Open your orders from your profile.",
			order: "Order number", checked: "Checked",
			errSession: "Your session expired. Sign in again, then press Check again.",
			toDownloads: "Go to my downloads", toProfile: "Go to my profile", payAgain: "Pay again",
			retry: "Check again", checking: "Checking…", toPhotos: "Browse photos",
			copy: "Copy", copied: "Copied",
		},
	};

	const lang = $derived(i18n.lang);
	const t = $derived(copy[lang]);

	// Satu-satunya sumber kebenaran status LUNAS adalah backend
	// `/api/payment/check/{orderId}`. Query param (status / transaction_status)
	// TIDAK BOLEH dipakai untuk menentukan status — rawan pemalsuan via URL.
	// Awalan mengikuti backend: ORDER- (keranjang), SUB- (langganan),
	// STD- (lisensi Standar). Dulu hanya ORDER- yang diterima, sehingga
	// pembayaran langganan langsung tampil "ditolak" tanpa pernah dicek.
	const ORDER_ID_RE = /^(?:ORDER|SUB|STD)-[A-Za-z0-9-]+$/;
	const isPlanOrder = $derived(/^(?:SUB|STD)-/.test(orderId ?? ""));

	const SUCCESS_STATUSES = new Set(["PAID", "ORDER_PAID", "ACTIVE", "ALREADY_ACTIVE", "SETTLED"]);
	const FAILED_STATUSES = new Set(["CANCELLED", "ORDER_CANCELLED", "EXPIRED", "EXPIRE", "DENY"]);

	function normalizeBackendStatus(apiStatus?: string): Status {
		if (apiStatus && SUCCESS_STATUSES.has(apiStatus)) return "paid";
		if (apiStatus && FAILED_STATUSES.has(apiStatus)) return "failed";
		return "pending";
	}

	function orderIdError(): "missing" | "invalid" | null {
		if (!orderId) return "missing";
		if (!ORDER_ID_RE.test(orderId)) return "invalid";
		return null;
	}

	function sleep(ms: number) {
		return new Promise((r) => setTimeout(r, ms));
	}

	let status = $state<Status>("loading");
	let checking = $state(false);
	/** Pemeriksaan gagal (jaringan/server) — BUKAN pembayaran ditolak. */
	let checkError = $state(false);
	let sessionExpired = $state(false);
	// useRef "ran" → flag non-reaktif biasa (efek hanya jalan sekali).
	let ran = false;

	function applyError(err: unknown) {
		// 401 = sesi/token bermasalah, BUKAN pembayaran ditolak.
		if (err instanceof ApiError && err.status === 401) {
			sessionExpired = true;
			checkError = false;
		} else {
			checkError = true;
		}
		status = "pending";
	}

	async function checkOnce() {
		if (orderIdError()) return;
		checking = true;
		try {
			const res = await apiPost<ApiResponse<{ status: string }>>(`/api/payment/check/${orderId}`);
			status = normalizeBackendStatus(res.data?.status);
			checkError = false;
			sessionExpired = false;
		} catch (e) {
			applyError(e);
		} finally {
			checking = false;
		}
	}

	$effect(() => {
		if (ran) return;
		ran = true;
		let cancelled = false;

		(async () => {
			if (orderIdError()) return;
			let gotResponse = false;
			let lastError: unknown = null;
			// Backend kadang lebih lambat daripada redirect payment gateway.
			// Retry beberapa kali sampai konvergen (paid/failed) atau habis attempt.
			// Tidak ada fallback ke query param: backend satu-satunya penentu.
			for (let attempt = 0; attempt < 6; attempt++) {
				if (cancelled) return;
				try {
					const res = await apiPost<ApiResponse<{ status: string }>>(`/api/payment/check/${orderId}`);
					if (cancelled) return;
					gotResponse = true;
					lastError = null;
					const next = normalizeBackendStatus(res.data?.status);
					status = next;
					if (next === "paid" || next === "failed") break;
				} catch (err) {
					lastError = err;
				}
				if (attempt < 5) await sleep(2000);
			}
			if (cancelled) return;
			if (!gotResponse) applyError(lastError);
			else if (status === "loading") status = "pending";
		})();

		return () => {
			cancelled = true;
		};
	});

	// Saat PAID, cart server-side sudah dikosongkan backend → refresh state lokal.
	$effect(() => {
		if (status === "paid") void store.refreshCart();
	});

	/** Keadaan yang dilihat pengguna — satu nama untuk bingkai, teks, dan tombol. */
	type Kind = "missing" | "loading" | "paid" | "failed" | "pending" | "unknown";
	const kind = $derived<Kind>(
		orderIdError()
			? "missing"
			: status === "loading"
				? "loading"
				: status === "paid"
					? "paid"
					: status === "failed"
						? "failed"
						: checkError || sessionExpired
							? "unknown"
							: "pending",
	);

	const heading = $derived(
		{
			missing: t.missing,
			loading: t.loading,
			paid: isPlanOrder ? t.subPaid : t.paid,
			failed: t.failed,
			pending: t.pending,
			unknown: t.unknown,
		}[kind],
	);
	const body = $derived(
		sessionExpired
			? t.errSession
			: {
					missing: t.missingBody,
					loading: "",
					paid: isPlanOrder ? t.subPaidBody : t.paidBody,
					failed: t.failedBody,
					pending: t.pendingBody,
					unknown: t.unknownBody,
				}[kind],
	);

	const checkedAt = $derived(
		new Date().toLocaleDateString(lang === "id" ? "id-ID" : "en-US", { day: "numeric", month: "short", year: "numeric" }),
	);
	// Cetakan tepi film: nomor bingkai dari ujung nomor order.
	const edgeFrame = $derived((orderId ?? "").replace(/[^A-Za-z0-9]/g, "").slice(-3).toUpperCase() || "00");

	let copied = $state(false);
	async function copyOrder() {
		try {
			await navigator.clipboard.writeText(orderId);
			copied = true;
			setTimeout(() => (copied = false), 1600);
		} catch {
			/* clipboard ditolak — nomor tetap bisa diseleksi manual */
		}
	}

	const retryHref = $derived(isPlanOrder ? "/pricing" : "/checkout");
</script>

<section aria-live="polite" class="pr mx-auto flex min-h-[78svh] w-full max-w-[26rem] flex-col justify-center px-5 pb-24 pt-32 sm:px-0 lg:pt-40">
	<!-- Bingkai negatif: satu-satunya elemen yang "bicara" — isinya ikut status. -->
	<figure class="pr-film" data-kind={kind} aria-hidden="true">
		<div class="pr-rail"></div>
		<div class="pr-frame">
			{#if kind === "paid"}
				<svg class="pr-check" viewBox="0 0 48 48" fill="none">
					<path d="M13 25.5l7.5 7.5L35 17" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" />
				</svg>
			{:else if kind === "pending" || kind === "loading"}
				<span class="pr-scan"></span>
			{/if}
		</div>
		<div class="pr-rail pr-rail--edge">
			<span class="pr-edge">LAKUNA 400 &#9656; {edgeFrame}A</span>
		</div>
	</figure>

	<div class="mt-8">
		<h1 class="font-display text-[clamp(1.75rem,6vw,2.25rem)] font-normal leading-[1.1] tracking-[-0.015em] text-fg">
			{heading}
		</h1>
		{#if body}
			<p class="mt-3 max-w-[38ch] text-[0.95rem] leading-relaxed text-fg-muted">{body}</p>
		{/if}
	</div>

	{#if orderId}
		<dl class="pr-meta mt-7 text-sm">
			<div>
				<dt>{t.order}</dt>
				<dd class="flex min-w-0 items-center gap-2">
					<span class="truncate font-mono text-[0.8rem] text-fg" title={orderId}>{orderId}</span>
					<button type="button" class="pr-copy" onclick={copyOrder} aria-label={`${t.copy} ${t.order}`}>
						{copied ? t.copied : t.copy}
					</button>
				</dd>
			</div>
			<div>
				<dt>{t.checked}</dt>
				<dd class="text-fg">{checkedAt}</dd>
			</div>
		</dl>
	{/if}

	<div class="mt-8 flex flex-col gap-2.5 sm:flex-row">
		{#if kind === "paid"}
			<a href="/profile" class="pr-btn pr-btn--primary">{isPlanOrder ? t.toProfile : t.toDownloads}</a>
			<a href="/photos" class="pr-btn">{t.toPhotos}</a>
		{:else if kind === "failed"}
			<a href={retryHref} class="pr-btn pr-btn--primary">{t.payAgain}</a>
			<a href="/photos" class="pr-btn">{t.toPhotos}</a>
		{:else if kind === "missing"}
			<a href="/profile" class="pr-btn pr-btn--primary">{t.toProfile}</a>
			<a href="/photos" class="pr-btn">{t.toPhotos}</a>
		{:else}
			<button type="button" class="pr-btn pr-btn--primary" onclick={checkOnce} disabled={checking || kind === "loading"}>
				{checking || kind === "loading" ? t.checking : t.retry}
			</button>
			<a href="/profile" class="pr-btn">{t.toProfile}</a>
		{/if}
	</div>
</section>

<style>
	/* Negatif film selalu gelap, di tema terang maupun gelap — ia benda, bukan permukaan UI. */
	.pr-film {
		--film: #0b0a0e;
		--sprocket: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='22' height='20'%3E%3Crect x='7' y='6' width='8' height='8' rx='1.6' fill='%23e8e2d8' fill-opacity='0.16'/%3E%3C/svg%3E");
		margin: 0;
		border-radius: 6px;
		background: var(--film);
		box-shadow: 0 30px 80px -40px rgba(0, 0, 0, 0.85);
		overflow: hidden;
	}
	.pr-rail {
		position: relative;
		height: 20px;
		background: var(--sprocket) repeat-x left center;
	}
	.pr-rail--edge {
		display: flex;
		align-items: center;
	}
	/* Diselaraskan ke kisi sprocket (lubang tiap 22px di x=7..15): label
	   menutup tepat lubang ke-2..ke-8, tak ada lubang yang terpotong separuh. */
	/* Cetakan tepi pabrik film: kecil, jingga pudar, di sela lubang sprocket. */
	.pr-edge {
		position: absolute;
		left: 38px;
		width: 166px;
		height: 100%;
		display: flex;
		align-items: center;
		padding-left: 6px;
		background: var(--film);
		font-family: var(--font-mono, ui-monospace, monospace);
		font-size: 9px;
		letter-spacing: 0.12em;
		color: rgba(236, 164, 92, 0.55);
		white-space: nowrap;
	}
	.pr-frame {
		position: relative;
		aspect-ratio: 16 / 10;
		margin: 0 14px;
		border-radius: 2px;
		overflow: hidden;
		display: grid;
		place-items: center;
		background: #141318;
		transition: background 0.6s ease;
	}

	/* Lunas: bingkai tercetak — cahaya safelight membakar negatif. */
	.pr-film[data-kind="paid"] .pr-frame {
		background:
			radial-gradient(110% 90% at 28% 18%, color-mix(in srgb, var(--safelight) 70%, #fff 10%), transparent 62%),
			linear-gradient(155deg, color-mix(in srgb, var(--safelight) 55%, #120e18), #0f0c14 78%);
		color: #fff;
	}
	.pr-check {
		width: 30%;
		max-width: 5.5rem;
		stroke-dasharray: 40;
		stroke-dashoffset: 40;
		animation: pr-draw 0.7s 0.25s cubic-bezier(0.65, 0, 0.35, 1) forwards;
	}
	@keyframes pr-draw {
		to {
			stroke-dashoffset: 0;
		}
	}

	/* Menunggu: garis cahaya menyapu negatif yang belum tercetak. */
	.pr-scan {
		position: absolute;
		inset: 0;
		background: linear-gradient(
			180deg,
			transparent 0%,
			color-mix(in srgb, var(--safelight) 26%, transparent) 48%,
			color-mix(in srgb, var(--safelight) 48%, transparent) 50%,
			transparent 52%
		);
		background-size: 100% 220%;
		animation: pr-sweep 2.4s ease-in-out infinite;
	}
	@keyframes pr-sweep {
		from {
			background-position: 0 100%;
		}
		to {
			background-position: 0 -20%;
		}
	}

	/* Dibatalkan: negatif kosong berkabut, disilang tipis seperti bingkai buangan. */
	.pr-film[data-kind="failed"] .pr-frame,
	.pr-film[data-kind="missing"] .pr-frame {
		background:
			linear-gradient(to top right, transparent calc(50% - 0.6px), rgba(232, 226, 216, 0.2) 50%, transparent calc(50% + 0.6px)),
			linear-gradient(to bottom right, transparent calc(50% - 0.6px), rgba(232, 226, 216, 0.2) 50%, transparent calc(50% + 0.6px)),
			radial-gradient(80% 70% at 50% 45%, #22212a, #16151b);
	}
	.pr-film[data-kind="unknown"] .pr-frame {
		background: repeating-linear-gradient(135deg, #16151b 0 10px, #1b1a21 10px 20px);
	}

	.pr-meta {
		border-top: 1px solid var(--color-hair, rgba(128, 128, 128, 0.25));
	}
	.pr-meta > div {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding: 0.8rem 0;
		border-bottom: 1px solid var(--color-hair, rgba(128, 128, 128, 0.25));
	}
	.pr-meta dt {
		flex-shrink: 0;
		color: var(--color-fg-muted, inherit);
	}
	.pr-copy {
		flex-shrink: 0;
		border-radius: 999px;
		padding: 0.15rem 0.6rem;
		font-size: 0.75rem;
		color: var(--color-fg-muted, inherit);
		border: 1px solid var(--color-hair, rgba(128, 128, 128, 0.3));
		transition: color 0.2s, border-color 0.2s;
	}
	.pr-copy:hover {
		color: var(--safelight);
		border-color: var(--safelight);
	}

	.pr-btn {
		display: inline-flex;
		flex: 1 1 0;
		align-items: center;
		justify-content: center;
		min-height: 3rem;
		padding: 0 1.4rem;
		border-radius: 999px;
		border: 1px solid var(--color-hair, rgba(128, 128, 128, 0.3));
		font-size: 0.9rem;
		font-weight: 500;
		white-space: nowrap;
		color: var(--color-fg, inherit);
		transition: color 0.2s, border-color 0.2s, background 0.2s, transform 0.2s;
	}
	.pr-btn:hover {
		border-color: var(--safelight);
		color: var(--safelight);
	}
	.pr-btn--primary {
		flex-grow: 1.4;
		border-color: transparent;
		background: var(--safelight);
		color: #fff;
	}
	.pr-btn--primary:hover {
		color: #fff;
		border-color: transparent;
		transform: translateY(-1px);
	}
	.pr-btn:disabled {
		opacity: 0.6;
		cursor: default;
		transform: none;
	}
	.pr-btn:focus-visible,
	.pr-copy:focus-visible {
		outline: 2px solid var(--safelight);
		outline-offset: 3px;
	}

	@media (prefers-reduced-motion: reduce) {
		.pr-check {
			animation: none;
			stroke-dashoffset: 0;
		}
		.pr-scan {
			animation: none;
			background-position: 0 50%;
		}
		.pr-btn {
			transition: none;
		}
	}
</style>
