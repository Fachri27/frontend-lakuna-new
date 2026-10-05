<script lang="ts">
	import { goto } from "$app/navigation";
	import { i18n } from "$lib/i18n.svelte";
	import { authModal } from "$lib/authModal.svelte";
	import { apiGet, apiPost, ApiError } from "$lib/api";
	import { fmtIDR } from "$lib/data";
	import type { ApiResponse } from "$lib/types";

	let { orderId }: { orderId: string } = $props();

	type Method = "bca_va" | "bni_va" | "bri_va" | "mandiri_bill" | "permata_va" | "qris" | "gopay" | "credit_card";
	type Instructions = {
		chargeId: string;
		method: Method;
		status: string;
		expiresAt: string | null;
		vaNumber?: string;
		bank?: string;
		billKey?: string;
		billerCode?: string;
		qrUrl?: string;
		deeplinkUrl?: string;
		redirectUrl?: string;
	};
	type Payment = {
		orderId: string;
		kind: "order" | "standar" | "subscription" | "installment";
		status: "PENDING" | "PAID" | "CANCELLED";
		amount: number;
		discount: number;
		lines: { label: string; amount: number }[];
		methods: Method[];
		clientKey: string;
		isProduction: boolean;
		instructions: Instructions | null;
	};

	const copy = {
		id: {
			title: "Pembayaran", total: "Total dibayar",
			steps: ["Pilih cara bayar", "Bayar", "Selesai"], stepsLabel: "Langkah pembayaran",
			bankHint: "Dapat nomor virtual account, berlaku 24 jam",
			cardName: "Kartu kredit / debit",
			secure: "Pembayaran diproses aman oleh Midtrans. Lakuna tidak menyimpan data kartumu", discount: "Diskon", order: "Nomor order",
			choose: "Pilih cara bayar", bank: "Transfer bank (virtual account)", other: "Lainnya",
			qrisDesc: "Scan dengan aplikasi bank atau dompet digital apa pun",
			gopayDesc: "Bayar lewat aplikasi Gojek atau GoPay",
			cardDesc: "Visa, Mastercard, JCB",
			payWith: "Bayar {amount} dengan {method}", charging: "Menyiapkan pembayaran…",
			vaTitle: "Transfer ke virtual account {bank}", billTitle: "Bayar tagihan Mandiri",
			billerCode: "Kode perusahaan", billKey: "Kode bayar",
			amountExact: "Transfer tepat sejumlah", copy: "Salin", copied: "Tersalin",
			qrTitle: "Scan kode QR ini", gopayOpen: "Buka GoPay",
			payBefore: "Bayar sebelum {time}", left: "tersisa {left}", expired: "Waktu bayar habis",
			waiting: "Menunggu pembayaran — halaman ini diperbarui otomatis",
			check: "Cek status sekarang", checking: "Memeriksa…", another: "Pakai cara bayar lain",
			stepsVa: ["Buka m-banking, internet banking, atau ATM {bank}", "Pilih transfer ke virtual account, lalu masukkan nomor di atas", "Pastikan nominalnya sama, lalu konfirmasi"],
			stepsBill: ["Buka Livin' by Mandiri atau ATM Mandiri, pilih Bayar → Multipayment", "Masukkan kode perusahaan, lalu kode bayar", "Periksa nominal, lalu konfirmasi"],
			cardNumber: "Nomor kartu", expiry: "Berlaku sampai (BB/TT)", cvv: "CVV",
			verify: "Verifikasi kartu", verifyHint: "Selesaikan verifikasi dari bank penerbit kartumu",
			close: "Tutup",
			paidTitle: "Tagihan ini sudah dibayar", cancelledTitle: "Tagihan ini sudah dibatalkan",
			toResult: "Lihat status pembayaran", backShop: "Kembali belanja",
			signIn: "Masuk untuk melanjutkan pembayaran", signInBtn: "Masuk",
			notFound: "Tagihan tidak ditemukan. Buka pesananmu dari profil",
			errGeneric: "Pembayaran belum bisa disiapkan. Coba lagi atau pilih cara lain",
			errCard: "Periksa lagi nomor kartu, masa berlaku, dan CVV",
			errCardFail: "Kartu ditolak atau verifikasi gagal. Coba kartu lain atau cara bayar lain",
		},
		en: {
			title: "Payment", total: "Total to pay",
			steps: ["Choose method", "Pay", "Done"], stepsLabel: "Payment steps",
			bankHint: "Get a virtual account number, valid for 24 hours",
			cardName: "Credit or debit card",
			secure: "Payments are processed securely by Midtrans. Lakuna never stores your card details", discount: "Discount", order: "Order number",
			choose: "Choose how to pay", bank: "Bank transfer (virtual account)", other: "Other methods",
			qrisDesc: "Scan with any banking or e-wallet app",
			gopayDesc: "Pay in the Gojek or GoPay app",
			cardDesc: "Visa, Mastercard, JCB",
			payWith: "Pay {amount} with {method}", charging: "Preparing payment…",
			vaTitle: "Transfer to this {bank} virtual account", billTitle: "Pay the Mandiri bill",
			billerCode: "Company code", billKey: "Payment code",
			amountExact: "Transfer exactly", copy: "Copy", copied: "Copied",
			qrTitle: "Scan this QR code", gopayOpen: "Open GoPay",
			payBefore: "Pay before {time}", left: "{left} left", expired: "The payment window has closed",
			waiting: "Waiting for your payment — this page updates automatically",
			check: "Check status now", checking: "Checking…", another: "Use another payment method",
			stepsVa: ["Open {bank} mobile banking, internet banking, or an ATM", "Choose transfer to virtual account and enter the number above", "Make sure the amount matches, then confirm"],
			stepsBill: ["Open Livin' by Mandiri or a Mandiri ATM and choose Pay → Multipayment", "Enter the company code, then the payment code", "Check the amount, then confirm"],
			cardNumber: "Card number", expiry: "Expiry (MM/YY)", cvv: "CVV",
			verify: "Verify your card", verifyHint: "Complete the check from your card's bank",
			close: "Close",
			paidTitle: "This bill is already paid", cancelledTitle: "This bill was cancelled",
			toResult: "See payment status", backShop: "Back to shopping",
			signIn: "Sign in to continue your payment", signInBtn: "Sign in",
			notFound: "We couldn't find this bill. Open your orders from your profile",
			errGeneric: "We couldn't set up this payment. Try again or choose another method",
			errCard: "Check the card number, expiry date, and CVV",
			errCardFail: "The card was declined or verification failed. Try another card or method",
		},
	};
	const lang = $derived(i18n.lang);
	const t = $derived(copy[lang]);

	const METHOD_LABEL: Record<Method, string> = {
		bca_va: "BCA", bni_va: "BNI", bri_va: "BRI", mandiri_bill: "Mandiri", permata_va: "Permata",
		qris: "QRIS", gopay: "GoPay", credit_card: "Card",
	};
	const BANKS: Method[] = ["bca_va", "bni_va", "bri_va", "mandiri_bill", "permata_va"];
	const OTHERS: Method[] = ["qris", "gopay", "credit_card"];
	/** Titik warna brand tiap bank — penanda cepat, bukan logo. */
	const BANK_COLOR: Partial<Record<Method, string>> = {
		bca_va: "#0060af", bni_va: "#f15a23", bri_va: "#00529c", mandiri_bill: "#ffb700", permata_va: "#e30613",
	};

	let pay = $state<Payment | null>(null);
	let loadError = $state<"auth" | "missing" | "generic" | null>(null);
	let method = $state<Method>("bca_va");
	let instr = $state<Instructions | null>(null);
	let charging = $state(false);
	let error = $state<string | null>(null);
	let checking = $state(false);
	let expired = $state(false);
	let now = $state(Date.now());

	const methodName = $derived(
		method === "credit_card" ? (lang === "id" ? "kartu" : "card") : METHOD_LABEL[method],
	);

	async function load() {
		try {
			const res = await apiGet<ApiResponse<Payment>>(`/api/payment/pay/${encodeURIComponent(orderId)}`);
			pay = res.data;
			instr = res.data.instructions;
			if (instr) method = instr.method;
			loadError = null;
		} catch (e) {
			if (e instanceof ApiError && e.status === 401) loadError = "auth";
			else if (e instanceof ApiError && e.status === 404) loadError = "missing";
			else loadError = "generic";
		}
	}
	$effect(() => {
		void load();
	});

	// ── Status: cek berkala selama ada instruksi aktif ──
	async function checkStatus(manual = false) {
		if (checking) return;
		checking = manual;
		try {
			const res = await apiPost<ApiResponse<{ status: string }>>(`/api/payment/check/${encodeURIComponent(orderId)}`);
			const s = res.data?.status ?? "";
			if (["PAID", "ORDER_PAID", "ACTIVE", "ALREADY_ACTIVE", "SETTLED"].includes(s)) {
				void goto(`/payment/finish?order_id=${encodeURIComponent(orderId)}`);
			} else if (["CANCELLED", "ORDER_CANCELLED", "EXPIRED", "EXPIRE", "DENY"].includes(s)) {
				expired = true;
			}
		} catch {
			/* jaringan — coba lagi di putaran berikutnya */
		} finally {
			checking = false;
		}
	}
	$effect(() => {
		if (!instr || instr.method === "credit_card") return;
		const id = window.setInterval(() => void checkStatus(), 5000);
		return () => window.clearInterval(id);
	});
	$effect(() => {
		if (!instr?.expiresAt) return;
		const id = window.setInterval(() => (now = Date.now()), 1000);
		return () => window.clearInterval(id);
	});
	const remaining = $derived(instr?.expiresAt ? Math.max(0, Date.parse(instr.expiresAt) - now) : null);
	$effect(() => {
		if (remaining === 0) expired = true;
	});
	function fmtLeft(ms: number) {
		const s = Math.floor(ms / 1000);
		const h = Math.floor(s / 3600);
		const m = Math.floor((s % 3600) / 60);
		const sec = s % 60;
		return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
	}
	const deadline = $derived(
		instr?.expiresAt
			? new Date(instr.expiresAt).toLocaleString(lang === "id" ? "id-ID" : "en-US", {
					day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
				})
			: "",
	);

	// ── Kartu ──
	let cardNumber = $state("");
	let cardExpiry = $state("");
	let cardCvv = $state("");
	let authUrl = $state<string | null>(null);
	const cardDigits = $derived(cardNumber.replace(/\D/g, ""));
	function formatCard(v: string) {
		return v.replace(/\D/g, "").slice(0, 19).replace(/(.{4})/g, "$1 ").trim();
	}
	function formatExpiry(v: string) {
		const d = v.replace(/\D/g, "").slice(0, 4);
		return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
	}
	const cardValid = $derived(
		cardDigits.length >= 13 && /^\d{2}\/\d{2}$/.test(cardExpiry) && /^\d{3,4}$/.test(cardCvv),
	);

	type Midtrans3ds = {
		getCardToken: (card: Record<string, string>, cb: { onSuccess: (r: { token_id: string }) => void; onFailure: (r: unknown) => void }) => void;
		authenticate: (url: string, cb: Record<string, (r?: unknown) => void>) => void;
	};
	function loadMidtrans(): Promise<Midtrans3ds> {
		const w = window as unknown as { MidtransNew3ds?: Midtrans3ds };
		if (w.MidtransNew3ds) return Promise.resolve(w.MidtransNew3ds);
		return new Promise((resolve, reject) => {
			const s = document.createElement("script");
			s.id = "midtrans-script";
			s.src = "https://api.midtrans.com/v2/assets/js/midtrans-new-3ds.min.js";
			s.dataset.environment = pay?.isProduction ? "production" : "sandbox";
			s.dataset.clientKey = pay?.clientKey ?? "";
			s.onload = () => (w.MidtransNew3ds ? resolve(w.MidtransNew3ds) : reject(new Error("midtrans")));
			s.onerror = () => reject(new Error("midtrans"));
			document.head.appendChild(s);
		});
	}

	async function payCard() {
		const mt = await loadMidtrans();
		const [mm, yy] = cardExpiry.split("/");
		const token = await new Promise<string>((resolve, reject) =>
			mt.getCardToken(
				{ card_number: cardDigits, card_exp_month: mm!, card_exp_year: `20${yy}`, card_cvv: cardCvv },
				{ onSuccess: (r) => resolve(r.token_id), onFailure: () => reject(new Error("card")) },
			),
		).catch(() => {
			throw new Error(t.errCard);
		});
		const res = await apiPost<ApiResponse<Instructions>>(`/api/payment/pay/${encodeURIComponent(orderId)}/charge`, {
			method: "credit_card",
			cardToken: token,
		});
		const r = res.data;
		if (r.status === "capture" || r.status === "settlement") {
			void goto(`/payment/finish?order_id=${encodeURIComponent(orderId)}`);
			return;
		}
		if (!r.redirectUrl) throw new Error(t.errCardFail);
		// 3DS di jendela milik halaman ini (bukan pop-up Midtrans).
		mt.authenticate(r.redirectUrl, {
			performAuthentication: (url) => (authUrl = String(url)),
			onSuccess: () => {
				authUrl = null;
				void goto(`/payment/finish?order_id=${encodeURIComponent(orderId)}`);
			},
			onPending: () => {
				authUrl = null;
				void checkStatus(true);
			},
			onFailure: () => {
				authUrl = null;
				error = t.errCardFail;
			},
		});
	}

	async function charge() {
		if (charging || !pay) return;
		charging = true;
		error = null;
		try {
			if (method === "credit_card") {
				await payCard();
				return;
			}
			const res = await apiPost<ApiResponse<Instructions>>(`/api/payment/pay/${encodeURIComponent(orderId)}/charge`, { method });
			instr = res.data;
			expired = false;
		} catch (e) {
			error = e instanceof ApiError ? e.message || t.errGeneric : e instanceof Error ? e.message : t.errGeneric;
		} finally {
			charging = false;
		}
	}

	function another() {
		instr = null;
		expired = false;
		error = null;
	}

	let copiedKey = $state<string | null>(null);
	async function copyText(key: string, text: string) {
		try {
			await navigator.clipboard.writeText(text);
			copiedKey = key;
			setTimeout(() => (copiedKey = null), 1600);
		} catch {
			/* clipboard ditolak — teks tetap bisa diseleksi */
		}
	}
	/** 8806 0123 4567 8901 — dikelompokkan per 4 supaya mudah dibaca & diketik. */
	const group = (s: string) => s.replace(/(.{4})(?=.)/g, "$1 ");
	const bankName = $derived((instr?.bank ?? "").toUpperCase());
	const isMobile = typeof navigator !== "undefined" && /Android|iPhone|iPad/i.test(navigator.userAgent);
</script>

<section class="pp mx-auto w-full max-w-[1100px] px-5 pb-24 pt-28 sm:px-8 lg:pt-36">
	{#if loadError === "auth"}
		<div class="pp-empty">
			<h1 class="pp-h1">{t.signIn}</h1>
			<button type="button" class="pp-btn pp-btn--primary mt-6" onclick={() => authModal.open(`/payment/pay/${orderId}`)}>{t.signInBtn}</button>
		</div>
	{:else if loadError}
		<div class="pp-empty">
			<h1 class="pp-h1">{loadError === "missing" ? t.notFound : t.errGeneric}</h1>
			<a href="/profile" class="pp-btn mt-6">{t.backShop}</a>
		</div>
	{:else if !pay}
		<div class="pp-empty" aria-busy="true"><p class="text-fg-muted">…</p></div>
	{:else if pay.status !== "PENDING"}
		<div class="pp-empty">
			<h1 class="pp-h1">{pay.status === "PAID" ? t.paidTitle : t.cancelledTitle}</h1>
			<div class="mt-6 flex flex-wrap gap-2.5">
				<a href={`/payment/finish?order_id=${encodeURIComponent(orderId)}`} class="pp-btn pp-btn--primary">{t.toResult}</a>
				<a href="/photos" class="pp-btn">{t.backShop}</a>
			</div>
		</div>
	{:else}
		<!-- Urutan nyata (pilih → bayar → selesai), jadi penanda bernomor sah. -->
		<ol class="pp-steps-bar" aria-label={t.stepsLabel}>
			{#each t.steps as step, i (i)}
				<li class:is-now={(instr ? 1 : 0) === i} class:is-done={(instr ? 1 : 0) > i}>
					<span class="pp-step-n">{i + 1}</span>{step}
				</li>
			{/each}
		</ol>

		<div class="pp-grid">
			<!-- Ringkasan tagihan: slip bertepi film — bingkai yang sama dengan
				halaman hasil pembayaran, jadi alur bayar → lunas satu rangkaian. -->
			<aside class="pp-summary">
				<div class="pp-slip">
					<div class="pp-sprocket" aria-hidden="true"></div>
					<div class="pp-slip-body">
						<p class="text-sm text-fg-muted">{t.total}</p>
						<p class="pp-amount">{fmtIDR(pay.amount)}</p>
						<ul class="pp-lines">
							{#each pay.lines as l, i (i)}
								<li><span class="min-w-0">{l.label}</span><span class="tnum shrink-0">{fmtIDR(l.amount)}</span></li>
							{/each}
							{#if pay.discount > 0}
								<li class="text-safelight"><span>{t.discount}</span><span class="tnum shrink-0">−{fmtIDR(pay.discount)}</span></li>
							{/if}
						</ul>
						<div class="pp-order">
							<span class="text-sm text-fg-muted">{t.order}</span>
							<span class="flex min-w-0 items-center gap-2">
								<span class="min-w-0 truncate font-mono text-[0.78rem] text-fg" title={orderId}>{orderId}</span>
								<button type="button" class="pp-copy" onclick={() => copyText("order", orderId)}>{copiedKey === "order" ? t.copied : t.copy}</button>
							</span>
						</div>
					</div>
					<p class="pp-edge" aria-hidden="true">LAKUNA 400 &#9656; {orderId.replace(/[^A-Za-z0-9]/g, "").slice(-4).toUpperCase()}</p>
				</div>
			</aside>

			<!-- Pilih metode / instruksi -->
			<div class="pp-main">
				{#if !instr}
					<h1 class="pp-h1">{t.choose}</h1>
					<fieldset class="pp-methods">
						<legend class="sr-only">{t.choose}</legend>

						<!-- Transfer bank: satu baris, bank dipilih di dalamnya. -->
						<div class="pp-method" class:is-on={BANKS.includes(method)}>
							<label class="pp-method-head">
								<input type="radio" name="kind" checked={BANKS.includes(method)} onchange={() => (method = "bca_va")} />
								<span class="pp-method-text">
									<span class="pp-method-name">{t.bank}</span>
									<span class="pp-method-hint">{t.bankHint}</span>
								</span>
							</label>
							{#if BANKS.includes(method)}
								<div class="pp-banks" role="radiogroup" aria-label={t.bank}>
									{#each BANKS as m (m)}
										<label class="pp-chip" class:is-on={method === m}>
											<input type="radio" name="bank" value={m} bind:group={method} />
											<span class="pp-dot" style={`background:${BANK_COLOR[m]}`} aria-hidden="true"></span>
											{METHOD_LABEL[m]}
										</label>
									{/each}
								</div>
							{/if}
						</div>

						{#each OTHERS as m (m)}
							<div class="pp-method" class:is-on={method === m}>
								<label class="pp-method-head">
									<input type="radio" name="kind" checked={method === m} onchange={() => (method = m)} />
									<span class="pp-method-text">
										<span class="pp-method-name">{m === "credit_card" ? t.cardName : METHOD_LABEL[m]}</span>
										<span class="pp-method-hint">{m === "qris" ? t.qrisDesc : m === "gopay" ? t.gopayDesc : t.cardDesc}</span>
									</span>
								</label>
								{#if m === "credit_card" && method === "credit_card"}
									<div class="pp-card">
										<label class="pp-field">
											<span>{t.cardNumber}</span>
											<input inputmode="numeric" autocomplete="cc-number" value={cardNumber} oninput={(e) => (cardNumber = formatCard(e.currentTarget.value))} placeholder="1234 5678 9012 3456" />
										</label>
										<div class="grid grid-cols-2 gap-3">
											<label class="pp-field">
												<span>{t.expiry}</span>
												<input inputmode="numeric" autocomplete="cc-exp" value={cardExpiry} oninput={(e) => (cardExpiry = formatExpiry(e.currentTarget.value))} placeholder="12/30" />
											</label>
											<label class="pp-field">
												<span>{t.cvv}</span>
												<input inputmode="numeric" autocomplete="cc-csc" maxlength="4" bind:value={cardCvv} placeholder="123" />
											</label>
										</div>
									</div>
								{/if}
							</div>
						{/each}
					</fieldset>

					{#if error}<p role="alert" class="pp-error">{error}</p>{/if}
					<div class="pp-cta">
						<button
							type="button"
							class="pp-btn pp-btn--primary w-full"
							disabled={charging || (method === "credit_card" && !cardValid)}
							onclick={charge}
						>
							{charging ? t.charging : t.payWith.replace("{amount}", fmtIDR(pay.amount)).replace("{method}", methodName)}
						</button>
						<p class="pp-secure">
							<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
							{t.secure}
						</p>
					</div>
				{:else}
					{#if instr.vaNumber || instr.billKey}
						<h1 class="pp-h1">{instr.billKey ? t.billTitle : t.vaTitle.replace("{bank}", bankName)}</h1>
						<div class="pp-code">
							{#if instr.billKey}
								<div class="pp-code-row">
									<span class="text-sm text-fg-muted">{t.billerCode}</span>
									<span class="pp-digits">{instr.billerCode}</span>
									<button type="button" class="pp-copy" onclick={() => copyText("biller", instr!.billerCode ?? "")}>{copiedKey === "biller" ? t.copied : t.copy}</button>
								</div>
								<div class="pp-code-row">
									<span class="text-sm text-fg-muted">{t.billKey}</span>
									<span class="pp-digits">{group(instr.billKey)}</span>
									<button type="button" class="pp-copy" onclick={() => copyText("bill", instr!.billKey ?? "")}>{copiedKey === "bill" ? t.copied : t.copy}</button>
								</div>
							{:else}
								<div class="pp-code-row">
									<span class="pp-digits pp-digits--lg">{group(instr.vaNumber ?? "")}</span>
									<button type="button" class="pp-copy" onclick={() => copyText("va", instr!.vaNumber ?? "")}>{copiedKey === "va" ? t.copied : t.copy}</button>
								</div>
							{/if}
							<div class="pp-code-row pp-code-row--amount">
								<span class="text-sm text-fg-muted">{t.amountExact}</span>
								<span class="tnum text-fg">{fmtIDR(pay.amount)}</span>
								<button type="button" class="pp-copy" onclick={() => copyText("amt", String(pay!.amount))}>{copiedKey === "amt" ? t.copied : t.copy}</button>
							</div>
						</div>
						<ol class="pp-steps">
							{#each instr.billKey ? t.stepsBill : t.stepsVa as step, i (i)}
								<li>{step.replace("{bank}", bankName)}</li>
							{/each}
						</ol>
					{:else if instr.qrUrl}
						<h1 class="pp-h1">{t.qrTitle}</h1>
						<p class="mt-2 text-fg-muted">{instr.method === "gopay" ? t.gopayDesc : t.qrisDesc}</p>
						<figure class="pp-qr">
							<img src={instr.qrUrl} alt={`QR ${METHOD_LABEL[instr.method]} ${fmtIDR(pay.amount)}`} width="240" height="240" />
						</figure>
						{#if instr.deeplinkUrl && isMobile}
							<a href={instr.deeplinkUrl} class="pp-btn pp-btn--primary w-full">{t.gopayOpen}</a>
						{/if}
					{/if}

					{#if expired}
						<p role="alert" class="pp-error">{t.expired}</p>
					{:else}
						<p class="pp-wait"><span class="pp-pulse" aria-hidden="true"></span>{t.waiting}</p>
						{#if remaining !== null}
							<p class="text-sm text-fg-muted">
								{t.payBefore.replace("{time}", deadline)} · <span class="tnum">{t.left.replace("{left}", fmtLeft(remaining))}</span>
							</p>
						{/if}
					{/if}

					<div class="mt-7 flex flex-col gap-2.5 sm:flex-row">
						{#if !expired}
							<button type="button" class="pp-btn pp-btn--primary" onclick={() => checkStatus(true)} disabled={checking}>{checking ? t.checking : t.check}</button>
						{/if}
						<button type="button" class="pp-btn" onclick={another}>{t.another}</button>
					</div>
				{/if}
			</div>
		</div>
	{/if}
</section>

{#if authUrl}
	<div class="pp-modal" role="dialog" aria-modal="true" aria-label={t.verify}>
		<div class="pp-modal-box">
			<div class="flex items-start justify-between gap-4 px-5 pt-5">
				<div>
					<p class="text-fg">{t.verify}</p>
					<p class="text-sm text-fg-muted">{t.verifyHint}</p>
				</div>
				<button type="button" class="pp-copy" onclick={() => (authUrl = null)}>{t.close}</button>
			</div>
			<iframe src={authUrl} title={t.verify} class="pp-3ds"></iframe>
		</div>
	</div>
{/if}

<style>
	.tnum {
		font-variant-numeric: tabular-nums;
	}
	.pp-grid {
		display: grid;
		gap: 2.5rem;
	}
	@media (min-width: 900px) {
		.pp-grid {
			grid-template-columns: minmax(0, 0.85fr) minmax(0, 1.15fr);
			gap: 4rem;
			align-items: start;
		}
		.pp-summary {
			position: sticky;
			top: 7rem;
		}
	}
	.pp-empty {
		max-width: 32rem;
		margin: 4rem auto 0;
	}
	.pp-h1 {
		font-family: var(--font-display);
		font-size: clamp(1.6rem, 3.4vw, 2.2rem);
		line-height: 1.12;
		letter-spacing: -0.015em;
		color: var(--color-fg);
	}
	/* ── Langkah ── */
	.pp-steps-bar {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem 1.6rem;
		margin-bottom: 2.5rem;
		font-size: 0.85rem;
		color: var(--color-fg-muted);
	}
	.pp-steps-bar li {
		display: flex;
		align-items: center;
		gap: 0.55rem;
	}
	.pp-step-n {
		display: grid;
		place-items: center;
		width: 1.45rem;
		height: 1.45rem;
		border-radius: 999px;
		border: 1px solid var(--color-hair);
		font-size: 0.72rem;
		font-variant-numeric: tabular-nums;
	}
	.pp-steps-bar li.is-now {
		color: var(--color-fg);
	}
	.pp-steps-bar li.is-now .pp-step-n {
		border-color: var(--safelight);
		background: var(--safelight);
		color: #fff;
	}
	.pp-steps-bar li.is-done .pp-step-n {
		border-color: var(--safelight);
		color: var(--safelight);
	}

	/* ── Slip tagihan: potongan film — lubang sprocket di tepi kiri, cetakan
	   tepi pabrik di bawah. Selalu gelap (benda, bukan permukaan UI). ── */
	.pp-slip {
		--film: #0b0a0e;
		position: relative;
		display: grid;
		grid-template-columns: 22px minmax(0, 1fr);
		border-radius: 8px;
		background: var(--film);
		color: #ece9f2;
		overflow: hidden;
		/* Tepi tipis: di tema gelap film nyaris sewarna halaman. */
		border: 1px solid rgba(255, 255, 255, 0.08);
		box-shadow: 0 30px 70px -40px rgba(0, 0, 0, 0.85);
	}
	.pp-sprocket {
		background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='22' height='22'%3E%3Crect x='7' y='6' width='8' height='9' rx='1.6' fill='%23e8e2d8' fill-opacity='0.16'/%3E%3C/svg%3E") repeat-y center top;
	}
	.pp-slip-body {
		padding: 1.6rem 1.6rem 2.4rem 1rem;
		border-left: 1px solid rgba(255, 255, 255, 0.06);
		background: linear-gradient(160deg, color-mix(in srgb, var(--safelight) 9%, transparent), transparent 55%);
	}
	.pp-slip :global(.text-fg-muted) {
		color: rgba(236, 233, 242, 0.58);
	}
	.pp-slip :global(.text-fg) {
		color: #ece9f2;
	}
	.pp-edge {
		position: absolute;
		right: 1rem;
		bottom: 0.7rem;
		font-family: var(--font-mono);
		font-size: 9px;
		letter-spacing: 0.14em;
		color: rgba(236, 164, 92, 0.55);
	}
	.pp-amount {
		margin-top: 0.35rem;
		font-family: var(--font-display);
		font-size: clamp(2.3rem, 5vw, 3.3rem);
		font-weight: 300;
		line-height: 1;
		letter-spacing: -0.025em;
		font-variant-numeric: tabular-nums;
		color: #fff;
	}
	.pp-lines {
		margin-top: 1.6rem;
		border-top: 1px solid rgba(255, 255, 255, 0.1);
	}
	.pp-lines li {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		padding: 0.75rem 0;
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
		font-size: 0.9rem;
		line-height: 1.4;
	}
	.pp-order {
		display: grid;
		gap: 0.3rem;
		padding-top: 0.85rem;
	}
	.pp-slip .pp-copy {
		border-color: rgba(255, 255, 255, 0.16);
		color: rgba(236, 233, 242, 0.7);
	}

	/* ── Metode ── */
	.pp-methods {
		margin-top: 1.5rem;
		display: grid;
		gap: 0.6rem;
	}
	.pp-method {
		position: relative;
		border: 1px solid var(--color-hair);
		border-radius: 12px;
		transition: border-color 0.2s, background 0.2s;
	}
	/* Garis safelight di kiri = satu-satunya penanda pilihan. */
	.pp-method::before {
		content: "";
		position: absolute;
		left: -1px;
		top: 14px;
		bottom: 14px;
		width: 3px;
		border-radius: 3px;
		background: var(--safelight);
		transform: scaleY(0);
		transition: transform 0.25s ease;
	}
	.pp-method:hover {
		border-color: color-mix(in srgb, var(--safelight) 40%, var(--color-hair));
	}
	.pp-method.is-on {
		border-color: color-mix(in srgb, var(--safelight) 70%, var(--color-hair));
		background: color-mix(in srgb, var(--safelight) 7%, transparent);
	}
	.pp-method.is-on::before {
		transform: scaleY(1);
	}
	.pp-method-head {
		display: flex;
		align-items: center;
		gap: 0.9rem;
		padding: 1rem 1.15rem;
		cursor: pointer;
	}
	.pp-method-head input,
	.pp-chip input {
		position: absolute;
		opacity: 0;
		pointer-events: none;
	}
	/* Radio kustom: cincin → titik saat dipilih. */
	.pp-method-head::before {
		content: "";
		flex-shrink: 0;
		width: 18px;
		height: 18px;
		border-radius: 999px;
		border: 1.5px solid var(--color-fg-muted);
		transition: border 0.2s, box-shadow 0.2s;
	}
	.pp-method.is-on > .pp-method-head::before {
		border: 5px solid var(--safelight);
	}
	.pp-method-head:has(input:focus-visible) {
		outline: 2px solid var(--safelight);
		outline-offset: 2px;
		border-radius: 12px;
	}
	.pp-method-text {
		display: grid;
		gap: 0.15rem;
		min-width: 0;
	}
	.pp-method-name {
		color: var(--color-fg);
		font-weight: 500;
	}
	.pp-method-hint {
		font-size: 0.84rem;
		color: var(--color-fg-muted);
	}
	.pp-banks {
		display: flex;
		flex-wrap: wrap;
		gap: 0.45rem;
		padding: 0 1.15rem 1.1rem calc(1.15rem + 18px + 0.9rem);
	}
	.pp-chip {
		position: relative;
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		min-height: 2.5rem;
		padding: 0 0.95rem;
		border: 1px solid var(--color-hair);
		border-radius: 999px;
		font-size: 0.9rem;
		font-weight: 500;
		color: var(--color-fg);
		cursor: pointer;
		transition: border-color 0.2s, background 0.2s;
	}
	.pp-chip:hover {
		border-color: color-mix(in srgb, var(--safelight) 55%, var(--color-hair));
	}
	.pp-chip.is-on {
		border-color: var(--safelight);
		background: color-mix(in srgb, var(--safelight) 14%, transparent);
	}
	.pp-chip:has(input:focus-visible) {
		outline: 2px solid var(--safelight);
		outline-offset: 2px;
	}
	.pp-dot {
		width: 8px;
		height: 8px;
		border-radius: 2px;
	}
	.pp-card {
		display: grid;
		gap: 0.9rem;
		padding: 0 1.15rem 1.2rem calc(1.15rem + 18px + 0.9rem);
	}
	.pp-cta {
		margin-top: 1.75rem;
	}
	.pp-secure {
		margin-top: 0.85rem;
		display: flex;
		align-items: flex-start;
		gap: 0.5rem;
		font-size: 0.8rem;
		line-height: 1.5;
		color: var(--color-fg-muted);
	}
	.pp-secure svg {
		margin-top: 0.2rem;
		flex-shrink: 0;
	}
	/* HP: tombol bayar menempel di bawah layar. */
	@media (max-width: 899px) {
		.pp-cta {
			position: sticky;
			bottom: 0;
			z-index: 5;
			margin-inline: -1.25rem;
			padding: 0.9rem 1.25rem max(0.9rem, env(safe-area-inset-bottom));
			background: linear-gradient(to top, var(--color-bg, #0c0d0f) 75%, transparent);
		}
		.pp-banks,
		.pp-card {
			padding-left: 1.15rem;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.pp-method::before {
			transition: none;
		}
	}
	.pp-field {
		display: grid;
		gap: 0.4rem;
		min-width: 0;
		font-size: 0.85rem;
		color: var(--color-fg-muted);
	}
	.pp-field input {
		/* Lebar minimum bawaan <input> membuat kolom CVV meluber di HP. */
		width: 100%;
		min-width: 0;
		border: 1px solid var(--color-hair);
		border-radius: 10px;
		background: transparent;
		padding: 0.8rem 0.9rem;
		font-family: var(--font-mono);
		font-size: 1rem;
		letter-spacing: 0.04em;
		color: var(--color-fg);
		outline: none;
	}
	.pp-field input:focus {
		border-color: var(--safelight);
	}
	.pp-error {
		margin-top: 1rem;
		font-size: 0.9rem;
		color: #f0676b;
	}

	/* Kode bayar: elemen yang paling harus terbaca — angka besar,
	   dikelompokkan per 4, seperti cetakan tepi film. */
	.pp-code {
		margin-top: 1.5rem;
		border-top: 1px solid var(--color-hair);
	}
	.pp-code-row {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem 1rem;
		padding: 1rem 0;
		border-bottom: 1px solid var(--color-hair);
	}
	.pp-code-row > :first-child {
		flex: 1 1 auto;
	}
	.pp-code-row--amount {
		font-size: 1rem;
	}
	.pp-digits {
		font-family: var(--font-mono);
		font-size: 1.15rem;
		letter-spacing: 0.08em;
		color: var(--color-fg);
		font-variant-numeric: tabular-nums;
	}
	.pp-digits--lg {
		font-size: clamp(1.35rem, 4.2vw, 2rem);
		letter-spacing: 0.06em;
	}
	.pp-copy {
		flex-shrink: 0;
		border: 1px solid var(--color-hair);
		border-radius: 999px;
		padding: 0.3rem 0.8rem;
		font-size: 0.8rem;
		color: var(--color-fg-muted);
		transition: color 0.2s, border-color 0.2s;
	}
	.pp-copy:hover {
		color: var(--safelight);
		border-color: var(--safelight);
	}
	.pp-steps {
		margin-top: 1.25rem;
		display: grid;
		gap: 0.4rem;
		padding-left: 1.2rem;
		list-style: decimal;
		font-size: 0.9rem;
		line-height: 1.55;
		color: var(--color-fg-muted);
	}
	.pp-qr {
		margin: 1.5rem 0;
		display: grid;
		place-items: center;
		width: fit-content;
		padding: 14px;
		border-radius: 12px;
		background: #fff;
	}
	.pp-qr img {
		width: min(240px, 60vw);
		height: auto;
		image-rendering: pixelated;
	}
	.pp-wait {
		margin-top: 1.5rem;
		display: flex;
		align-items: center;
		gap: 0.6rem;
		color: var(--color-fg);
	}
	.pp-pulse {
		width: 8px;
		height: 8px;
		border-radius: 999px;
		background: var(--safelight);
		animation: pp-blink 1.6s ease-in-out infinite;
	}
	@keyframes pp-blink {
		50% {
			opacity: 0.3;
		}
	}
	.pp-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-height: 3.1rem;
		padding: 0 1.5rem;
		border-radius: 999px;
		border: 1px solid var(--color-hair);
		font-size: 0.95rem;
		font-weight: 500;
		white-space: nowrap;
		color: var(--color-fg);
		transition: color 0.2s, border-color 0.2s, transform 0.2s;
	}
	.pp-btn:hover {
		border-color: var(--safelight);
		color: var(--safelight);
	}
	.pp-btn--primary {
		border-color: transparent;
		background: var(--safelight);
		color: #fff;
	}
	.pp-btn--primary:hover {
		color: #fff;
		border-color: transparent;
		transform: translateY(-1px);
	}
	.pp-btn:disabled {
		opacity: 0.55;
		cursor: default;
		transform: none;
	}
	.pp-btn:focus-visible,
	.pp-copy:focus-visible {
		outline: 2px solid var(--safelight);
		outline-offset: 3px;
	}
	.pp-modal {
		position: fixed;
		inset: 0;
		z-index: 80;
		display: grid;
		place-items: center;
		padding: 1rem;
		background: rgba(0, 0, 0, 0.65);
	}
	.pp-modal-box {
		width: min(480px, 100%);
		border-radius: 14px;
		background: var(--color-bg, #0c0d0f);
		border: 1px solid var(--color-hair);
		overflow: hidden;
	}
	.pp-3ds {
		display: block;
		width: 100%;
		height: min(560px, 75vh);
		margin-top: 1rem;
		border: 0;
		background: #fff;
	}
	@media (prefers-reduced-motion: reduce) {
		.pp-pulse {
			animation: none;
		}
		.pp-btn {
			transition: none;
		}
	}
</style>
