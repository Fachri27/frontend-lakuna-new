<script lang="ts">
	import { afterNavigate, goto, replaceState } from "$app/navigation";
	import { page } from "$app/state";
	import { i18n } from "$lib/i18n.svelte";
	import { authModal } from "$lib/authModal.svelte";
	import { apiGet, apiPost, ApiError, apiPostOnce } from "$lib/api";
	import { fmtIDR } from "$lib/data";
	import type { ApiResponse } from "$lib/types";

	/**
	 * Halaman bayar custom Lakuna (DOKU Direct API) — pembeli tak pernah dibawa ke halaman checkout DOKU:
	 * QRIS, VA & kode bayar gerai (Alfamart, Indomaret) tampil di sini (lengkap dengan langkah bayar per kanal), form kartu DOKU ditanam di halaman ini dengan
	 * warna Lakuna (data kartu langsung ke DOKU), OVO & Jenius dikirim ke aplikasinya, ShopeePay/LinkAja dan paylater
	 * (Akulaku, Kredivo, Indodana) disetujui di aplikasi/halaman penyedia itu sendiri.
	 */
	let { orderId }: { orderId: string } = $props();

	type Bank = "bca" | "mandiri" | "bni" | "bri" | "permata" | "cimb" | "danamon" | "bsi" | "doku" | "maybank";
	type Store = "alfamart" | "indomaret";
	type Wallet = "ovo" | "dana" | "shopeepay" | "linkaja" | "jenius" | "dokuwallet";
	type Paylater = "akulaku" | "kredivo" | "indodana";
	type Method = "qris" | `${Bank}_va` | Store | Wallet | Paylater | "card";
	type HowTo = { channel: string; steps: string[] }[];
	type Instructions = { invoice: string; method: Method; expiresAt: string } & (
		| { kind: "va"; bank: string; vaNumber: string; howTo: { id: HowTo; en: HowTo } }
		| { kind: "store"; store: string; paymentCode: string; howTo: { id: HowTo; en: HowTo } }
		| { kind: "card"; url: string }
		| { kind: "qris"; qrImage: string }
		| { kind: "ovo"; phone: string; state: "waiting" | "failed"; failCode?: string }
		| {
				kind: "wallet";
				wallet: "shopeepay" | "linkaja" | "dana" | "dokuwallet" | Paylater;
				url: string;
				httpMethod: "GET" | "POST";
				params: { name: string; value: string }[];
			}
		| { kind: "jenius"; cashtag: string; state: "waiting" }
	);
	type Payment = {
		orderId: string;
		kind: "order" | "standar" | "subscription" | "installment";
		status: "PENDING" | "PAID" | "CANCELLED";
		amount: number;
		discount: number;
		lines: { label: string; amount: number }[];
		provider: "DOKU";
		methods: Method[];
		instructions: Instructions | null;
	};

	const copy = {
		id: {
			total: "Total dibayar",
			steps: ["Pilih cara bayar", "Bayar", "Selesai"], stepsLabel: "Langkah pembayaran",
			discount: "Diskon", order: "Nomor order",
			choose: "Pilih cara bayar", bank: "Transfer bank (virtual account)", bankHint: "Dapat nomor virtual account, berlaku 24 jam",
			store: "Bayar di gerai retail", storeHint: "Alfamart, Alfamidi, Indomaret — bayar tunai di kasir",
			storeTitle: "Bayar di kasir {store}", storeCode: "Kode pembayaran", storeLead: "Sebutkan kode ini ke kasir {store}, lalu bayar tepat sejumlah tagihan",
			stepsStore: ["Datang ke gerai {store} terdekat", "Bilang ke kasir ingin membayar tagihan DOKU, lalu sebutkan kode di atas", "Bayar sesuai nominal dan simpan struknya"],
			ewallet: "Dompet digital", ewalletTail: "setujui di aplikasimu",
			qris: "QRIS", qrisHint: "Pindai dengan aplikasi bank atau e-wallet apa pun — GoPay, OVO, DANA, ShopeePay, m-banking",
			qrisTitle: "Pindai QRIS untuk membayar", qrisLead: "Buka aplikasi bank atau e-wallet yang mendukung QRIS, lalu pindai kode ini",
			qrisSteps: ["Buka aplikasi m-banking atau e-wallet (GoPay, OVO, DANA, ShopeePay, …)", "Pilih Bayar / Scan QRIS, lalu arahkan kamera ke kode di atas", "Pastikan nominalnya sesuai, lalu konfirmasi"],
			qrisSave: "Simpan gambar QR", qrisAlt: "Kode QRIS untuk tagihan {amount}", qrisName: "QRIS",
			card: "Kartu kredit / debit", cardHint: "Visa, Mastercard, JCB — isi data kartu langsung di halaman ini",
			ovoPhone: "Nomor HP yang terdaftar di OVO", ovoPhoneHint: "Permintaan bayar dikirim ke aplikasi OVO di nomor ini",
			ovoPhoneInvalid: "Masukkan nomor HP Indonesia, contoh 0812 3456 7890",
			jeniusPhone: "Nomor HP", jeniusPhoneHint: "Nomor HP yang terhubung dengan akun Jenius-mu",
			cashtag: "$cashtag Jenius", cashtagHint: "Permintaan bayar dikirim ke aplikasi Jenius milik $cashtag ini", cashtagInvalid: "Masukkan $cashtag Jenius, contoh $namakamu",
			paylater: "Paylater (cicilan tanpa kartu)", paylaterHint: "Akulaku, Kredivo, Indodana — setujui di aplikasi penyedia",
			plPhone: "Nomor HP yang terdaftar di {provider}", plPhoneHint: "{provider} memakai nomor ini untuk menemukan akunmu",
			addr: "Alamat penagihan", addrStreet: "Alamat", addrCity: "Kota", addrPostal: "Kode pos",
			addrHint: "{provider} mewajibkan alamat. Lakuna hanya meneruskannya ke {provider} untuk tagihan ini",
			addrInvalid: "Lengkapi alamat, kota, dan kode pos 5 digit",
			jeniusTitle: "Setujui di aplikasi Jenius", jeniusLead: "Permintaan bayar {amount} sudah dikirim ke {cashtag}",
			jeniusSteps: ["Buka aplikasi Jenius di HP-mu", "Buka permintaan pembayaran dari Lakuna Stock", "Periksa nominalnya, lalu setujui"],
			payWith: "Bayar {amount} dengan {method}", charging: "Menyiapkan pembayaran…", opening: "Membuka {wallet}…",
			vaTitle: "Transfer ke virtual account {bank}",
			amountExact: "Transfer tepat sejumlah", payExact: "Bayar tepat sejumlah", copy: "Salin", copied: "Tersalin",
			stepsVa: ["Buka m-banking, internet banking, atau ATM {bank}", "Pilih transfer ke virtual account, lalu masukkan nomor di atas", "Pastikan nominalnya sama, lalu konfirmasi"],
			howToLabel: "Cara bayar lewat",
			payBefore: "Bayar sebelum {time}", left: "tersisa {left}", expired: "Waktu bayar habis. Pilih cara bayar lagi",
			waiting: "Menunggu pembayaran — halaman ini diperbarui otomatis",
			check: "Cek status sekarang", checking: "Memeriksa…", another: "Pakai cara bayar lain",
			cardTitle: "Bayar dengan kartu", cardLead: "Isi data kartumu di bawah. Bank penerbit mungkin meminta kode OTP (3D Secure) di kotak yang sama",
			cardFrame: "Form kartu kredit / debit", cardLoading: "Memuat form kartu…",
			cardSecure: "Data kartu dikirim terenkripsi langsung ke DOKU, mitra pembayaran berlisensi Bank Indonesia. Lakuna tidak melihat atau menyimpannya",
			cardFailed: "Pembayaran kartu tidak berhasil. Periksa data kartu, coba kartu lain, atau pilih cara bayar lain",
			ovoTitle: "Setujui di aplikasi OVO", ovoLead: "Permintaan bayar {amount} sudah dikirim ke OVO {phone}",
			ovoSteps: ["Buka aplikasi OVO di HP-mu", "Ketuk notifikasi pembayaran dari Lakuna Stock", "Periksa nominalnya, lalu tekan Bayar"],
			ovoSeconds: "detik untuk menyetujui",
			ovoFailedTitle: "Pembayaran OVO belum berhasil", ovoResend: "Kirim ulang ke OVO",
			ovoReason: {
				"14": "Nomor ini tidak terdaftar di OVO. Periksa lagi nomornya",
				"17": "Pembayaran ditolak di aplikasi OVO",
				timeout: "Tidak ada persetujuan dalam 70 detik. Kirim ulang, lalu buka aplikasi OVO",
				limit: "Saldo atau batas transaksi OVO tidak mencukupi",
				blocked: "Akun OVO ini diblokir. Hubungi OVO di 1500696",
				other: "OVO menolak pembayaran ini. Coba lagi atau pilih cara bayar lain",
			},
			walletTitle: "Lanjutkan di {wallet}", walletLead: "Setujui pembayaran di aplikasi {wallet}. Setelah itu kamu kembali ke Lakuna dan halaman ini diperbarui otomatis",
			walletOpen: "Buka {wallet}",
			secure: "Pembayaran diproses aman oleh DOKU. Lakuna tidak menyimpan data kartu atau rekeningmu",
			paidTitle: "Tagihan ini sudah dibayar", cancelledTitle: "Tagihan ini sudah dibatalkan",
			toResult: "Lihat status pembayaran", backShop: "Kembali belanja",
			signIn: "Masuk untuk melanjutkan pembayaran", signInBtn: "Masuk",
			notFound: "Tagihan tidak ditemukan. Buka pesananmu dari profil",
			errGeneric: "Pembayaran belum bisa disiapkan. Coba lagi atau pilih cara lain",
			errConfig: "Pembayaran DOKU belum aktif. Hubungi kami bila ini berlanjut",
			cardName: "kartu",
		},
		en: {
			total: "Total to pay",
			steps: ["Choose method", "Pay", "Done"], stepsLabel: "Payment steps",
			discount: "Discount", order: "Order number",
			choose: "Choose how to pay", bank: "Bank transfer (virtual account)", bankHint: "Get a virtual account number, valid for 24 hours",
			store: "Pay at a store", storeHint: "Alfamart, Alfamidi, Indomaret — pay cash at the cashier",
			storeTitle: "Pay at the {store} cashier", storeCode: "Payment code", storeLead: "Tell the {store} cashier this code, then pay the exact amount",
			stepsStore: ["Go to the nearest {store} store", "Tell the cashier you want to pay a DOKU bill, then give the code above", "Pay the exact amount and keep the receipt"],
			ewallet: "E-wallets", ewalletTail: "approve it in your app",
			qris: "QRIS", qrisHint: "Scan with any banking or e-wallet app — GoPay, OVO, DANA, ShopeePay, mobile banking",
			qrisTitle: "Scan the QRIS code to pay", qrisLead: "Open any banking or e-wallet app that supports QRIS and scan this code",
			qrisSteps: ["Open your mobile banking or e-wallet app (GoPay, OVO, DANA, ShopeePay, …)", "Choose Pay / Scan QRIS and point the camera at the code above", "Check the amount, then confirm"],
			qrisSave: "Save QR image", qrisAlt: "QRIS code for a {amount} bill", qrisName: "QRIS",
			card: "Credit or debit card", cardHint: "Visa, Mastercard, JCB — enter your card right on this page",
			ovoPhone: "Phone number registered with OVO", ovoPhoneHint: "We'll send the payment request to the OVO app on this number",
			ovoPhoneInvalid: "Enter an Indonesian mobile number, e.g. 0812 3456 7890",
			jeniusPhone: "Phone number", jeniusPhoneHint: "The phone number linked to your Jenius account",
			cashtag: "Jenius $cashtag", cashtagHint: "We'll send the payment request to the Jenius app of this $cashtag", cashtagInvalid: "Enter your Jenius $cashtag, e.g. $yourname",
			paylater: "Pay later (no card)", paylaterHint: "Akulaku, Kredivo, Indodana — approve it in the provider's app",
			plPhone: "Phone number registered with {provider}", plPhoneHint: "{provider} uses this number to find your account",
			addr: "Billing address", addrStreet: "Address", addrCity: "City", addrPostal: "Postal code",
			addrHint: "{provider} requires an address. Lakuna only passes it to {provider} for this bill",
			addrInvalid: "Fill in the address, city, and a 5-digit postal code",
			jeniusTitle: "Approve it in the Jenius app", jeniusLead: "We sent a {amount} payment request to {cashtag}",
			jeniusSteps: ["Open the Jenius app on your phone", "Open the payment request from Lakuna Stock", "Check the amount, then approve"],
			payWith: "Pay {amount} with {method}", charging: "Preparing payment…", opening: "Opening {wallet}…",
			vaTitle: "Transfer to this {bank} virtual account",
			amountExact: "Transfer exactly", payExact: "Pay exactly", copy: "Copy", copied: "Copied",
			stepsVa: ["Open {bank} mobile banking, internet banking, or an ATM", "Choose transfer to virtual account and enter the number above", "Make sure the amount matches, then confirm"],
			howToLabel: "How to pay via",
			payBefore: "Pay before {time}", left: "{left} left", expired: "The payment window has closed. Choose a method again",
			waiting: "Waiting for your payment — this page updates automatically",
			check: "Check status now", checking: "Checking…", another: "Use another payment method",
			cardTitle: "Pay by card", cardLead: "Enter your card below. Your bank may ask for a one-time code (3D Secure) in the same box",
			cardFrame: "Credit or debit card form", cardLoading: "Loading the card form…",
			cardSecure: "Card details are encrypted and sent straight to DOKU, a payment partner licensed by Bank Indonesia. Lakuna never sees or stores them",
			cardFailed: "The card payment didn't go through. Check your card details, try another card, or choose another method",
			ovoTitle: "Approve it in the OVO app", ovoLead: "We sent a {amount} payment request to OVO {phone}",
			ovoSteps: ["Open the OVO app on your phone", "Tap the payment notification from Lakuna Stock", "Check the amount, then tap Pay"],
			ovoSeconds: "seconds to approve",
			ovoFailedTitle: "The OVO payment didn't go through", ovoResend: "Send to OVO again",
			ovoReason: {
				"14": "This number isn't registered with OVO. Check the number",
				"17": "The payment was declined in the OVO app",
				timeout: "It wasn't approved within 70 seconds. Send it again, then open the OVO app",
				limit: "Your OVO balance or transaction limit isn't enough",
				blocked: "This OVO account is blocked. Contact OVO at 1500696",
				other: "OVO declined this payment. Try again or choose another method",
			},
			walletTitle: "Continue in {wallet}", walletLead: "Approve the payment in the {wallet} app. You'll come back to Lakuna and this page updates automatically",
			walletOpen: "Open {wallet}",
			secure: "Payments are processed securely by DOKU. Lakuna never stores your card or bank details",
			paidTitle: "This bill is already paid", cancelledTitle: "This bill was cancelled",
			toResult: "See payment status", backShop: "Back to shopping",
			signIn: "Sign in to continue your payment", signInBtn: "Sign in",
			notFound: "We couldn't find this bill. Open your orders from your profile",
			errGeneric: "We couldn't set up this payment. Try again or choose another method",
			errConfig: "DOKU payments aren't active yet. Contact us if this continues",
			cardName: "card",
		},
	};
	const lang = $derived(i18n.lang);
	const t = $derived(copy[lang]);

	const BANK_LABEL: Record<Bank, string> = {
		bca: "BCA", mandiri: "Mandiri", bni: "BNI", bri: "BRI", permata: "Permata",
		cimb: "CIMB Niaga", danamon: "Danamon", bsi: "BSI", doku: "DOKU", maybank: "Maybank",
	};
	/** Titik warna brand tiap bank / e-wallet — penanda cepat, bukan logo. */
	const BANK_COLOR: Record<Bank, string> = {
		bca: "#0060af", mandiri: "#ffb700", bni: "#f15a23", bri: "#00529c", permata: "#e30613",
		cimb: "#7b0d1e", danamon: "#f7941d", bsi: "#00a39d", doku: "#e2231a", maybank: "#ffc20e",
	};
	const STORE_LABEL: Record<Store, string> = { alfamart: "Alfamart", indomaret: "Indomaret" };
	const STORE_COLOR: Record<Store, string> = { alfamart: "#d71920", indomaret: "#0b4ea2" };
	const STORES = Object.keys(STORE_LABEL) as Store[];
	const WALLET_LABEL: Record<Wallet, string> = {
		ovo: "OVO", dana: "DANA", shopeepay: "ShopeePay", linkaja: "LinkAja", jenius: "Jenius", dokuwallet: "DOKU e-Wallet",
	};
	const WALLET_COLOR: Record<Wallet, string> = {
		ovo: "#4c3494", dana: "#118eea", shopeepay: "#ee4d2d", linkaja: "#e82529", jenius: "#00a6d6", dokuwallet: "#e2231a",
	};
	const PAYLATER_LABEL: Record<Paylater, string> = { akulaku: "Akulaku", kredivo: "Kredivo", indodana: "Indodana" };
	const PAYLATER_COLOR: Record<Paylater, string> = { akulaku: "#e4002b", kredivo: "#f47b20", indodana: "#00a0b0" };
	const PAYLATERS = Object.keys(PAYLATER_LABEL) as Paylater[];
	/** Nama penyedia tautan bayar (e-wallet / paylater) untuk tampilan "lanjutkan di …". */
	const PROVIDER_LABEL: Record<string, string> = { ...WALLET_LABEL, ...PAYLATER_LABEL };
	const BANKS = Object.keys(BANK_LABEL) as Bank[];
	const WALLETS = Object.keys(WALLET_LABEL) as Wallet[];
	const isVa = (m: Method): m is `${Bank}_va` => m.endsWith("_va");
	const isWallet = (m: Method): m is Wallet => m in WALLET_LABEL;
	const isStore = (m: Method): m is Store => m in STORE_LABEL;
	const isPaylater = (m: Method): m is Paylater => m in PAYLATER_LABEL;
	/** Kredivo & Indodana mewajibkan alamat; Akulaku cukup nomor HP. */
	const needsAddress = (m: Method) => m === "kredivo" || m === "indodana";
	/** Metode yang langsung membuka aplikasi/halaman penyedia setelah ditagih. */
	const isRedirect = (m: Method) =>
		m === "shopeepay" || m === "linkaja" || m === "dana" || m === "dokuwallet" || isPaylater(m);
	/** Hanya metode yang ditawarkan API (QRIS/DANA muncul bila akses SNAP DOKU siap). */
	const offered = (m: Method) => !!pay?.methods.includes(m);
	const banks = $derived(BANKS.filter((b) => offered(`${b}_va`)));
	const stores = $derived(STORES.filter(offered));
	const wallets = $derived(WALLETS.filter(offered));
	const paylaters = $derived(PAYLATERS.filter(offered));
	const bankOf = (m: Method) => m.slice(0, -3) as Bank;

	/** Form kartu mengarahkan iframe ke ?card=failed saat ditolak — tampilkan galatnya, buat form baru. */
	const failedFromCard = page.url.searchParams.get("card") === "failed";
	let pay = $state<Payment | null>(null);
	let loadError = $state<"auth" | "missing" | "generic" | null>(null);
	let method = $state<Method>("bca_va");
	let instr = $state<Instructions | null>(null);
	let charging = $state(false);
	let error = $state<string | null>(null);
	let checking = $state(false);
	let expired = $state(false);
	let now = $state(Date.now());
	/** Nomor HP bersama untuk OVO, Jenius, dan paylater. */
	let ovoPhone = $state("");
	let ovoPhoneError = $state<string | null>(null);
	let cashtag = $state("");
	let cashtagError = $state<string | null>(null);
	/** Alamat penagihan — hanya untuk Kredivo / Indodana, tidak disimpan di perangkat. */
	let addr = $state({ address: "", city: "", postalCode: "" });
	let addrError = $state<string | null>(null);
	let cardFailed = $state(failedFromCard);
	let frameLoads = $state(0);

	const methodName = (m: Method) =>
		m === "qris"
			? t.qrisName
			: isVa(m)
			? BANK_LABEL[bankOf(m)]
			: isStore(m)
				? STORE_LABEL[m]
				: isWallet(m)
					? WALLET_LABEL[m]
					: isPaylater(m)
						? PAYLATER_LABEL[m]
						: t.cardName;

	async function load() {
		try {
			const res = await apiGet<ApiResponse<Payment>>(`/api/payment/pay/${encodeURIComponent(orderId)}`);
			pay = res.data;
			instr = cardFailed && res.data.instructions?.kind === "card" ? null : res.data.instructions;
			if (instr) method = instr.method;
			else if (cardFailed) method = "card";
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
	// Bersihkan ?card=failed. Saat muat pertama afterNavigate berjalan sebelum router selesai hidrasi
	// (replaceState melempar galat) → tunda ke tick berikutnya.
	afterNavigate(() => {
		if (!page.url.searchParams.has("card")) return;
		setTimeout(() => {
			try {
				replaceState(page.url.pathname, {});
			} catch {
				/* URL tetap memuat ?card=failed — tak berbahaya */
			}
		}, 0);
	});

	/** Tautan dari API tetap dibatasi ke https (tak ada javascript:/data:). */
	function isHttps(raw: string | null | undefined): raw is string {
		if (!raw) return false;
		try {
			return new URL(raw).protocol === "https:";
		} catch {
			return false;
		}
	}

	// ── Status: cek berkala selama ada tagihan aktif ──
	async function checkStatus(manual = false) {
		if (checking) return;
		checking = manual;
		try {
			const res = await apiPost<ApiResponse<{ status: string }>>(`/api/payment/check/${encodeURIComponent(orderId)}`);
			const s = res.data?.status ?? "";
			if (s === "PAID") void goto(`/payment/finish?order_id=${encodeURIComponent(orderId)}`);
			else if (s === "CANCELLED") expired = true;
		} catch {
			/* jaringan — coba lagi di putaran berikutnya */
		} finally {
			checking = false;
		}
	}
	/** OVO: hasil push ditulis server di latar → baca ringkasan tagihan (tanpa memanggil DOKU). */
	async function refreshOvo() {
		try {
			const res = await apiGet<ApiResponse<Payment>>(`/api/payment/pay/${encodeURIComponent(orderId)}`);
			if (res.data.status === "PAID") {
				void goto(`/payment/finish?order_id=${encodeURIComponent(orderId)}`);
				return;
			}
			const next = res.data.instructions;
			if (next?.kind === "ovo" && instr?.kind === "ovo" && next.invoice === instr.invoice) instr = next;
		} catch {
			/* coba lagi */
		}
	}
	let ovoTimeoutFor: string | null = null;
	/** 70 detik habis: beri waktu respons OVO tiba, cek DOKU sekali, lalu anggap tak disetujui. */
	async function ovoTimedOut(invoice: string) {
		if (ovoTimeoutFor === invoice) return;
		ovoTimeoutFor = invoice;
		await new Promise((r) => setTimeout(r, 4000));
		await refreshOvo();
		await checkStatus();
		if (instr?.kind === "ovo" && instr.invoice === invoice && instr.state === "waiting") {
			instr = { ...instr, state: "failed", failCode: "TIMEOUT" };
		}
	}
	$effect(() => {
		if (!instr || expired) return;
		if (instr.kind === "ovo") {
			if (instr.state !== "waiting") return;
			// Hasil push dicatat server di latar; tiap putaran ke-3 juga tanya DOKU langsung — bila API sempat
			// restart di tengah penantian, persetujuan OVO tetap terdeteksi.
			let tick = 0;
			const id = window.setInterval(() => void (++tick % 3 === 0 ? checkStatus() : refreshOvo()), 2500);
			return () => window.clearInterval(id);
		}
		const id = window.setInterval(() => void checkStatus(), instr.kind === "wallet" ? 8000 : 5000);
		return () => window.clearInterval(id);
	});
	$effect(() => {
		if (!instr?.expiresAt) return;
		const id = window.setInterval(() => (now = Date.now()), 1000);
		return () => window.clearInterval(id);
	});
	const remaining = $derived(instr?.expiresAt ? Math.max(0, Date.parse(instr.expiresAt) - now) : null);
	$effect(() => {
		if (remaining !== 0 || !instr) return;
		if (instr.kind === "ovo") {
			if (instr.state === "waiting") void ovoTimedOut(instr.invoice);
		} else expired = true;
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

	/** 0812-3456 7890 / +62 812… → 081234567890; null bila bukan nomor HP Indonesia. */
	function normPhone(raw: string): string | null {
		let d = raw.replace(/[\s.\-()]/g, "");
		if (d.startsWith("+")) d = d.slice(1);
		if (d.startsWith("62")) d = "0" + d.slice(2);
		return /^08\d{8,11}$/.test(d) ? d : null;
	}
	function ovoReason(code: string | undefined) {
		const r = t.ovoReason;
		if (code === "14" || code === "17") return r[code];
		if (!code || code === "TIMEOUT" || code === "ERROR" || code === "26" || code === "68" || code === "-") return r.timeout;
		if (code === "61" || code === "65" || code === "67") return r.limit;
		if (code === "56" || code === "64") return r.blocked;
		return r.other;
	}

	/** Warna token halaman (var CSS) → hex tanpa # — tombol form kartu DOKU memakai aksen halaman ini. */
	function cssHex(token: string): string | null {
		const el = document.createElement("span");
		el.style.color = `var(${token})`;
		el.style.display = "none";
		document.body.appendChild(el);
		const c = getComputedStyle(el).color;
		el.remove();
		const m = /rgba?\((\d+)[,\s]+(\d+)[,\s]+(\d+)/.exec(c);
		return m ? [m[1], m[2], m[3]].map((n) => Number(n).toString(16).padStart(2, "0")).join("") : null;
	}
	/**
	 * Form kartu = lembar kertas terang (CARD_PAPER) di halaman gelap: DOKU memakai satu warna teks untuk label
	 * DAN isi kolom yang selalu berlatar putih, jadi teks terang tak terbaca di kolomnya. Latar & teks gelap
	 * dikunci; hanya tombol yang mengikuti aksen halaman.
	 */
	const CARD_PAPER = "f4f1ea";
	function cardTheme() {
		const button = cssHex("--safelight");
		return button ? { background: CARD_PAPER, font: "16171a", button, buttonFont: "ffffff" } : undefined;
	}

	/** Buka aplikasi/halaman e-wallet: ShopeePay lewat tautan biasa, LinkAja lewat form POST bertanda. */
	function openWallet(w: Extract<Instructions, { kind: "wallet" }>) {
		if (!isHttps(w.url)) {
			error = t.errGeneric;
			return false;
		}
		if (w.httpMethod === "GET") {
			window.location.assign(w.url);
			return true;
		}
		const form = document.createElement("form");
		form.method = "POST";
		form.action = w.url;
		for (const p of w.params) {
			const input = document.createElement("input");
			input.type = "hidden";
			input.name = p.name;
			input.value = p.value;
			form.appendChild(input);
		}
		document.body.appendChild(form);
		form.submit();
		return true;
	}

	async function charge() {
		if (charging || !pay) return;
		const body: Record<string, unknown> = { method, language: lang };
		if (method === "ovo" || method === "jenius" || isPaylater(method)) {
			const phone = normPhone(ovoPhone);
			if (!phone) {
				ovoPhoneError = t.ovoPhoneInvalid;
				return;
			}
			ovoPhoneError = null;
			body.phone = phone;
		}
		if (method === "jenius") {
			const tag = cashtag.trim().replace(/^\$/, "");
			if (!/^[A-Za-z0-9._]{1,29}$/.test(tag)) {
				cashtagError = t.cashtagInvalid;
				return;
			}
			cashtagError = null;
			body.cashtag = `$${tag}`;
		}
		if (needsAddress(method)) {
			const a = { address: addr.address.trim(), city: addr.city.trim(), postalCode: addr.postalCode.trim() };
			if (a.address.length < 5 || a.city.length < 2 || !/^\d{5}$/.test(a.postalCode)) {
				addrError = t.addrInvalid;
				return;
			}
			addrError = null;
			body.address = a;
		}
		if (method === "card") {
			body.theme = cardTheme();
			if (cardFailed) body.fresh = true;
		}
		charging = true;
		error = null;
		try {
			const res = await apiPostOnce<ApiResponse<Instructions>>(`/api/payment/pay/${encodeURIComponent(orderId)}/charge`, body);
			const r = res.data;
			instr = r;
			expired = false;
			cardFailed = false;
			frameLoads = 0;
			ovoTimeoutFor = null;
			if (r.kind === "wallet") {
				// Tetap "membuka…" sampai halaman berpindah ke aplikasi/halaman e-wallet.
				if (openWallet(r)) return;
			}
			charging = false;
		} catch (e) {
			charging = false;
			if (e instanceof ApiError && e.status === 409) {
				void goto(`/payment/finish?order_id=${encodeURIComponent(orderId)}`);
				return;
			}
			error =
				e instanceof ApiError && e.status === 503
					? t.errConfig
					: e instanceof ApiError
						? e.message || t.errGeneric
						: e instanceof Error
							? e.message
							: t.errGeneric;
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
	/** 8806 0123 4567 8901 — dikelompokkan per 4 supaya mudah dibaca & diketik; kode pendek (gerai) apa adanya. */
	const group = (s: string) => (s.length >= 8 ? s.replace(/(.{4})(?=.)/g, "$1 ") : s);
	const stepIndex = $derived(instr ? 1 : 0);

	/** Langkah bayar VA / gerai per kanal dari DOKU, dalam bahasa halaman (cadangan: bahasa lain). */
	const howTo = $derived.by(() => {
		if (instr?.kind !== "va" && instr?.kind !== "store") return [];
		const h = instr.howTo ?? { id: [], en: [] };
		return lang === "en" ? (h.en.length ? h.en : h.id) : h.id.length ? h.id : h.en;
	});
	let howToTab = $state(0);
	$effect(() => {
		void instr?.invoice;
		howToTab = 0;
	});
	const ovoSecondsLeft = $derived(remaining === null ? 0 : Math.ceil(remaining / 1000));
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
				<li class:is-now={stepIndex === i} class:is-done={stepIndex > i}>
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

						{#if offered("qris")}
							<!-- QRIS: satu kode untuk semua aplikasi bank / e-wallet. -->
							<div class="pp-method" class:is-on={method === "qris"}>
								<label class="pp-method-head">
									<input type="radio" name="kind" checked={method === "qris"} onchange={() => (method = "qris")} />
									<span class="pp-method-text">
										<span class="pp-method-name">{t.qris}</span>
										<span class="pp-method-hint">{t.qrisHint}</span>
									</span>
								</label>
							</div>
						{/if}

						<!-- Transfer bank: satu baris, bank dipilih di dalamnya. -->
						{#if banks.length}
						<div class="pp-method" class:is-on={isVa(method)}>
							<label class="pp-method-head">
								<input type="radio" name="kind" checked={isVa(method)} onchange={() => (method = `${banks[0]}_va`)} />
								<span class="pp-method-text">
									<span class="pp-method-name">{t.bank}</span>
									<span class="pp-method-hint">{t.bankHint}</span>
								</span>
							</label>
							{#if isVa(method)}
								<div class="pp-banks" role="radiogroup" aria-label={t.bank}>
									{#each banks as b (b)}
										<label class="pp-chip" class:is-on={method === `${b}_va`}>
											<input type="radio" name="bank" value={`${b}_va`} bind:group={method} />
											<span class="pp-dot" style={`background:${BANK_COLOR[b]}`} aria-hidden="true"></span>
											{BANK_LABEL[b]}
										</label>
									{/each}
								</div>
							{/if}
						</div>

						{/if}

						<!-- Gerai retail: kode bayar untuk kasir, gerai dipilih di dalamnya. -->
						{#if stores.length}
						<div class="pp-method" class:is-on={isStore(method)}>
							<label class="pp-method-head">
								<input type="radio" name="kind" checked={isStore(method)} onchange={() => (method = stores[0])} />
								<span class="pp-method-text">
									<span class="pp-method-name">{t.store}</span>
									<span class="pp-method-hint">{t.storeHint}</span>
								</span>
							</label>
							{#if isStore(method)}
								<div class="pp-banks" role="radiogroup" aria-label={t.store}>
									{#each stores as st (st)}
										<label class="pp-chip" class:is-on={method === st}>
											<input type="radio" name="store" value={st} bind:group={method} />
											<span class="pp-dot" style={`background:${STORE_COLOR[st]}`} aria-hidden="true"></span>
											{STORE_LABEL[st]}
										</label>
									{/each}
								</div>
							{/if}
						</div>

						{/if}

						<!-- Dompet digital: e-wallet dipilih di dalamnya; OVO butuh nomor HP. -->
						{#if wallets.length}
						<div class="pp-method" class:is-on={isWallet(method)}>
							<label class="pp-method-head">
								<input type="radio" name="kind" checked={isWallet(method)} onchange={() => (method = wallets[0])} />
								<span class="pp-method-text">
									<span class="pp-method-name">{t.ewallet}</span>
									<span class="pp-method-hint">{wallets.map((w) => WALLET_LABEL[w]).join(", ")} — {t.ewalletTail}</span>
								</span>
							</label>
							{#if isWallet(method)}
								<div class="pp-banks" role="radiogroup" aria-label={t.ewallet}>
									{#each wallets as w (w)}
										<label class="pp-chip" class:is-on={method === w}>
											<input type="radio" name="wallet" value={w} bind:group={method} />
											<span class="pp-dot" style={`background:${WALLET_COLOR[w]}`} aria-hidden="true"></span>
											{WALLET_LABEL[w]}
										</label>
									{/each}
								</div>
								{#if method === "ovo"}
									<div class="pp-field">
										<label for="pp-ovo-phone" class="pp-field-label">{t.ovoPhone}</label>
										<input
											id="pp-ovo-phone"
											class="pp-input"
											type="tel"
											inputmode="tel"
											autocomplete="tel-national"
											placeholder="0812 3456 7890"
											bind:value={ovoPhone}
											aria-invalid={ovoPhoneError ? "true" : undefined}
											aria-describedby="pp-ovo-hint"
										/>
										<p id="pp-ovo-hint" class="pp-field-hint">{ovoPhoneError ?? t.ovoPhoneHint}</p>
									</div>
								{:else if method === "jenius"}
									<div class="pp-fields">
										<div class="pp-field">
											<label for="pp-cashtag" class="pp-field-label">{t.cashtag}</label>
											<input
												id="pp-cashtag"
												class="pp-input"
												type="text"
												autocomplete="off"
												autocapitalize="off"
												spellcheck="false"
												placeholder="$namakamu"
												bind:value={cashtag}
												aria-invalid={cashtagError ? "true" : undefined}
												aria-describedby="pp-cashtag-hint"
											/>
											<p id="pp-cashtag-hint" class="pp-field-hint">{cashtagError ?? t.cashtagHint}</p>
										</div>
										<div class="pp-field">
											<label for="pp-jenius-phone" class="pp-field-label">{t.jeniusPhone}</label>
											<input
												id="pp-jenius-phone"
												class="pp-input"
												type="tel"
												inputmode="tel"
												autocomplete="tel-national"
												placeholder="0812 3456 7890"
												bind:value={ovoPhone}
												aria-invalid={ovoPhoneError ? "true" : undefined}
												aria-describedby="pp-jenius-phone-hint"
											/>
											<p id="pp-jenius-phone-hint" class="pp-field-hint">{ovoPhoneError ?? t.jeniusPhoneHint}</p>
										</div>
									</div>
								{/if}
							{/if}
						</div>

						{/if}

						<!-- Paylater: penyedia dipilih di dalamnya; semua butuh nomor HP, Kredivo/Indodana juga alamat. -->
						{#if paylaters.length}
						<div class="pp-method" class:is-on={isPaylater(method)}>
							<label class="pp-method-head">
								<input type="radio" name="kind" checked={isPaylater(method)} onchange={() => (method = paylaters[0])} />
								<span class="pp-method-text">
									<span class="pp-method-name">{t.paylater}</span>
									<span class="pp-method-hint">{t.paylaterHint}</span>
								</span>
							</label>
							{#if isPaylater(method)}
								{@const prov = PAYLATER_LABEL[method]}
								<div class="pp-banks" role="radiogroup" aria-label={t.paylater}>
									{#each paylaters as pl (pl)}
										<label class="pp-chip" class:is-on={method === pl}>
											<input type="radio" name="paylater" value={pl} bind:group={method} />
											<span class="pp-dot" style={`background:${PAYLATER_COLOR[pl]}`} aria-hidden="true"></span>
											{PAYLATER_LABEL[pl]}
										</label>
									{/each}
								</div>
								<div class="pp-fields">
									<div class="pp-field">
										<label for="pp-pl-phone" class="pp-field-label">{t.plPhone.replace("{provider}", prov)}</label>
										<input
											id="pp-pl-phone"
											class="pp-input"
											type="tel"
											inputmode="tel"
											autocomplete="tel-national"
											placeholder="0812 3456 7890"
											bind:value={ovoPhone}
											aria-invalid={ovoPhoneError ? "true" : undefined}
											aria-describedby="pp-pl-phone-hint"
										/>
										<p id="pp-pl-phone-hint" class="pp-field-hint">{ovoPhoneError ?? t.plPhoneHint.replace("{provider}", prov)}</p>
									</div>
									{#if needsAddress(method)}
										<fieldset class="pp-field pp-addr">
											<legend class="pp-field-label">{t.addr}</legend>
											<label class="sr-only" for="pp-addr-street">{t.addrStreet}</label>
											<input id="pp-addr-street" class="pp-input pp-addr-street" type="text" autocomplete="street-address" placeholder={t.addrStreet} bind:value={addr.address} aria-invalid={addrError ? "true" : undefined} aria-describedby="pp-addr-hint" />
											<label class="sr-only" for="pp-addr-city">{t.addrCity}</label>
											<input id="pp-addr-city" class="pp-input" type="text" autocomplete="address-level2" placeholder={t.addrCity} bind:value={addr.city} aria-invalid={addrError ? "true" : undefined} aria-describedby="pp-addr-hint" />
											<label class="sr-only" for="pp-addr-postal">{t.addrPostal}</label>
											<input id="pp-addr-postal" class="pp-input" type="text" inputmode="numeric" autocomplete="postal-code" maxlength="5" placeholder={t.addrPostal} bind:value={addr.postalCode} aria-invalid={addrError ? "true" : undefined} aria-describedby="pp-addr-hint" />
											<p id="pp-addr-hint" class="pp-field-hint pp-addr-hint">{addrError ?? t.addrHint.replaceAll("{provider}", prov)}</p>
										</fieldset>
									{/if}
								</div>
							{/if}
						</div>

						{/if}

						{#if offered("card")}
						<div class="pp-method" class:is-on={method === "card"}>
							<label class="pp-method-head">
								<input type="radio" name="kind" checked={method === "card"} onchange={() => (method = "card")} />
								<span class="pp-method-text">
									<span class="pp-method-name">{t.card}</span>
									<span class="pp-method-hint">{t.cardHint}</span>
								</span>
							</label>
						</div>
						{/if}
					</fieldset>

					{#if error || (cardFailed && method === "card")}<p role="alert" class="pp-error">{error ?? t.cardFailed}</p>{/if}
					<div class="pp-cta">
						<button type="button" class="pp-btn pp-btn--primary w-full" disabled={charging} onclick={charge}>
							{charging
								? isRedirect(method)
									? t.opening.replace("{wallet}", methodName(method))
									: t.charging
								: t.payWith.replace("{amount}", fmtIDR(pay.amount)).replace("{method}", methodName(method))}
						</button>
						<p class="pp-secure">
							<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
							{t.secure}
						</p>
					</div>
				{:else if instr.kind === "va" || instr.kind === "store"}
					<!-- VA & kode gerai: bentuknya sama — satu kode besar, nominal tepat, langkah per kanal. -->
					{@const code = instr.kind === "va" ? instr.vaNumber : instr.paymentCode}
					{@const where = instr.kind === "va" ? instr.bank : instr.store}
					<h1 class="pp-h1">{instr.kind === "va" ? t.vaTitle.replace("{bank}", where) : t.storeTitle.replace("{store}", where)}</h1>
					{#if instr.kind === "store"}<p class="mt-3 text-fg-muted">{t.storeLead.replace("{store}", where)}</p>{/if}
					<div class="pp-code">
						<div class="pp-code-row">
							<span class="pp-digits" aria-label={instr.kind === "store" ? t.storeCode : undefined}>{group(code)}</span>
							<button type="button" class="pp-copy" onclick={() => copyText("va", code)}>{copiedKey === "va" ? t.copied : t.copy}</button>
						</div>
						<div class="pp-code-row pp-code-row--amount">
							<span class="text-sm text-fg-muted">{instr.kind === "store" ? t.payExact : t.amountExact}</span>
							<span class="tnum text-fg">{fmtIDR(pay.amount)}</span>
							<button type="button" class="pp-copy" onclick={() => copyText("amt", String(pay!.amount))}>{copiedKey === "amt" ? t.copied : t.copy}</button>
						</div>
					</div>

					{#if howTo.length}
						<!-- Langkah bayar per kanal (ATM, m-banking, …) dari DOKU, ditampilkan dengan UI Lakuna. -->
						<div class="pp-howto">
							<div class="pp-tabs" role="tablist" aria-label={t.howToLabel}>
								{#each howTo as c, i (c.channel)}
									<button
										type="button"
										role="tab"
										id={`pp-tab-${i}`}
										class="pp-tab"
										class:is-on={howToTab === i}
										aria-selected={howToTab === i}
										aria-controls={`pp-panel-${i}`}
										tabindex={howToTab === i ? 0 : -1}
										onclick={() => (howToTab = i)}
										onkeydown={(e) => {
											if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
											e.preventDefault();
											howToTab = (howToTab + (e.key === "ArrowRight" ? 1 : howTo.length - 1)) % howTo.length;
											document.getElementById(`pp-tab-${howToTab}`)?.focus();
										}}
									>{c.channel}</button>
								{/each}
							</div>
							{#each howTo as c, i (c.channel)}
								{#if howToTab === i}
									<div role="tabpanel" id={`pp-panel-${i}`} aria-labelledby={`pp-tab-${i}`}>
										<ol class="pp-steps">
											{#each c.steps as step, j (j)}<li>{step}</li>{/each}
										</ol>
									</div>
								{/if}
							{/each}
						</div>
					{:else}
						<ol class="pp-steps">
							{#each instr.kind === "va" ? t.stepsVa : t.stepsStore as step, i (i)}
								<li>{step.replace("{bank}", where).replace("{store}", where)}</li>
							{/each}
						</ol>
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
				{:else if instr.kind === "qris"}
					<h1 class="pp-h1">{t.qrisTitle}</h1>
					{#if expired}
						<p role="alert" class="pp-error">{t.expired}</p>
					{:else}
						<p class="mt-3 text-fg-muted">{t.qrisLead}</p>
						<!-- QR selalu di atas putih (kontras pemindai), apa pun tema halaman. -->
						<div class="pp-qr">
							<img src={instr.qrImage} alt={t.qrisAlt.replace("{amount}", fmtIDR(pay.amount))} width="240" height="240" />
							<p class="pp-qr-amount tnum">{fmtIDR(pay.amount)}</p>
						</div>
						<a class="pp-howto-link" href={instr.qrImage} download={`QRIS-${orderId}.svg`}>{t.qrisSave}</a>
						<ol class="pp-steps">
							{#each t.qrisSteps as step, i (i)}<li>{step}</li>{/each}
						</ol>
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
				{:else if instr.kind === "card"}
					<h1 class="pp-h1">{t.cardTitle}</h1>
					{#if expired}
						<p role="alert" class="pp-error">{t.expired}</p>
					{:else if isHttps(instr.url)}
						<p class="mt-3 text-fg-muted">{t.cardLead}</p>
						<!-- Form kartu DOKU (berwarna halaman ini) — data kartu langsung ke DOKU, tak lewat Lakuna.
							Muatan kedua dst. = langkah 3D Secure bank → bingkai dibuat lebih tinggi. -->
						<div class="pp-cardframe" class:is-ready={frameLoads > 0} class:is-tall={frameLoads > 1}>
							{#if frameLoads === 0}<p class="pp-cardframe-loading">{t.cardLoading}</p>{/if}
							{#key instr.url}
								<iframe title={t.cardFrame} src={instr.url} allow="payment" onload={() => frameLoads++}></iframe>
							{/key}
						</div>
						<p class="pp-secure">
							<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
							{t.cardSecure}
						</p>
					{/if}
					<div class="mt-6 flex flex-col gap-2.5 sm:flex-row">
						<button type="button" class="pp-btn" onclick={another}>{t.another}</button>
					</div>
				{:else if instr.kind === "ovo"}
					{#if instr.state === "waiting"}
						<h1 class="pp-h1">{t.ovoTitle}</h1>
						<p class="mt-3 text-fg-muted">{t.ovoLead.replace("{amount}", fmtIDR(pay.amount)).replace("{phone}", instr.phone)}</p>
						<div class="pp-timer" role="timer" aria-live="off">
							<span class="pp-timer-n tnum">{ovoSecondsLeft}</span>
							<span class="text-sm text-fg-muted">{t.ovoSeconds}</span>
							<span class="pp-timer-bar" aria-hidden="true"><span style={`transform:scaleX(${Math.min(1, ovoSecondsLeft / 70)})`}></span></span>
						</div>
						<ol class="pp-steps">
							{#each t.ovoSteps as step, i (i)}<li>{step}</li>{/each}
						</ol>
						<p class="pp-wait"><span class="pp-pulse" aria-hidden="true"></span>{t.waiting}</p>
						<div class="mt-7 flex flex-col gap-2.5 sm:flex-row">
							<button type="button" class="pp-btn" onclick={another}>{t.another}</button>
						</div>
					{:else}
						<h1 class="pp-h1">{t.ovoFailedTitle}</h1>
						<p role="alert" class="pp-error">{ovoReason(instr.failCode)}</p>
						<div class="pp-field pp-field--flush">
							<label for="pp-ovo-again" class="pp-field-label">{t.ovoPhone}</label>
							<input
								id="pp-ovo-again"
								class="pp-input"
								type="tel"
								inputmode="tel"
								autocomplete="tel-national"
								placeholder="0812 3456 7890"
								bind:value={ovoPhone}
								aria-invalid={ovoPhoneError ? "true" : undefined}
								aria-describedby="pp-ovo-again-hint"
							/>
							<p id="pp-ovo-again-hint" class="pp-field-hint">{ovoPhoneError ?? t.ovoPhoneHint}</p>
						</div>
						{#if error}<p role="alert" class="pp-error">{error}</p>{/if}
						<div class="mt-6 flex flex-col gap-2.5 sm:flex-row">
							<button type="button" class="pp-btn pp-btn--primary" disabled={charging} onclick={() => { method = "ovo"; void charge(); }}>{charging ? t.charging : t.ovoResend}</button>
							<button type="button" class="pp-btn" onclick={another}>{t.another}</button>
						</div>
					{/if}
				{:else if instr.kind === "jenius"}
					<h1 class="pp-h1">{t.jeniusTitle}</h1>
					{#if expired}
						<p role="alert" class="pp-error">{t.expired}</p>
					{:else}
						<p class="mt-3 text-fg-muted">{t.jeniusLead.replace("{amount}", fmtIDR(pay.amount)).replace("{cashtag}", instr.cashtag)}</p>
						<ol class="pp-steps">
							{#each t.jeniusSteps as step, i (i)}<li>{step}</li>{/each}
						</ol>
						<p class="pp-wait"><span class="pp-pulse" aria-hidden="true"></span>{t.waiting}</p>
					{/if}
					<div class="mt-7 flex flex-col gap-2.5 sm:flex-row">
						{#if !expired}
							<button type="button" class="pp-btn pp-btn--primary" onclick={() => checkStatus(true)} disabled={checking}>{checking ? t.checking : t.check}</button>
						{/if}
						<button type="button" class="pp-btn" onclick={another}>{t.another}</button>
					</div>
				{:else}
					<!-- ShopeePay / LinkAja / paylater: pembeli kembali ke sini sebelum selesai menyetujui di penyedianya. -->
					{@const w = instr}
					<h1 class="pp-h1">{t.walletTitle.replace("{wallet}", PROVIDER_LABEL[w.wallet])}</h1>
					{#if expired}
						<p role="alert" class="pp-error">{t.expired}</p>
					{:else}
						<p class="mt-3 text-fg-muted">{t.walletLead.replaceAll("{wallet}", PROVIDER_LABEL[w.wallet])}</p>
						<p class="pp-wait"><span class="pp-pulse" aria-hidden="true"></span>{t.waiting}</p>
					{/if}
					{#if error}<p role="alert" class="pp-error">{error}</p>{/if}
					<div class="mt-7 flex flex-col gap-2.5 sm:flex-row">
						{#if !expired}
							<button type="button" class="pp-btn pp-btn--primary" onclick={() => openWallet(w)}>{t.walletOpen.replace("{wallet}", PROVIDER_LABEL[w.wallet])}</button>
							<button type="button" class="pp-btn" onclick={() => checkStatus(true)} disabled={checking}>{checking ? t.checking : t.check}</button>
						{/if}
						<button type="button" class="pp-btn" onclick={another}>{t.another}</button>
					</div>
				{/if}
			</div>
		</div>
	{/if}
</section>

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
		.pp-field:not(.pp-field--flush) {
			padding-left: 1.15rem;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.pp-method::before,
		.pp-cardframe,
		.pp-cardframe iframe,
		.pp-timer-bar span {
			transition: none;
		}
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
		font-size: clamp(1.35rem, 4.2vw, 2rem);
		letter-spacing: 0.06em;
		color: var(--color-fg);
		font-variant-numeric: tabular-nums;
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
	/* Langkah bayar per kanal: tab bergaris bawah, bukan pil — sekunder terhadap nomor VA. */
	.pp-howto {
		margin-top: 1.5rem;
	}
	.pp-tabs {
		display: flex;
		gap: 1.1rem;
		overflow-x: auto;
		border-bottom: 1px solid var(--color-hair);
		scrollbar-width: none;
	}
	.pp-tab {
		flex-shrink: 0;
		padding: 0.55rem 0 0.7rem;
		margin-bottom: -1px;
		border-bottom: 2px solid transparent;
		font-size: 0.86rem;
		color: var(--color-fg-muted);
		white-space: nowrap;
		transition: color 0.2s, border-color 0.2s;
	}
	.pp-tab:hover {
		color: var(--color-fg);
	}
	.pp-tab.is-on {
		color: var(--color-fg);
		border-bottom-color: var(--safelight);
	}
	.pp-tab:focus-visible {
		outline: 2px solid var(--safelight);
		outline-offset: 2px;
	}
	.pp-howto .pp-steps {
		margin-top: 1rem;
	}

	/* ── QRIS ── */
	.pp-qr {
		margin-top: 1.5rem;
		display: inline-grid;
		justify-items: center;
		gap: 0.6rem;
		padding: 1.1rem 1.1rem 0.9rem;
		border-radius: 14px;
		background: #fff;
	}
	.pp-qr img {
		display: block;
		width: min(240px, 62vw);
		height: auto;
		image-rendering: pixelated;
	}
	.pp-qr-amount {
		font-size: 0.95rem;
		font-weight: 500;
		color: #16171a;
	}
	.pp-howto-link {
		display: block;
		width: fit-content;
		margin-top: 0.75rem;
		font-size: 0.88rem;
		color: var(--safelight);
		text-decoration: underline;
		text-underline-offset: 3px;
	}

	/* ── Nomor OVO ── */
	.pp-field {
		display: grid;
		gap: 0.4rem;
		padding: 0 1.15rem 1.15rem calc(1.15rem + 18px + 0.9rem);
	}
	/* Beberapa kolom dalam satu metode (Jenius, paylater): bertumpuk, satu indentasi. */
	.pp-fields {
		display: grid;
		gap: 0.2rem;
	}
	.pp-fields > .pp-field + .pp-field {
		padding-top: 0;
	}
	.pp-addr {
		grid-template-columns: minmax(0, 1fr) 7.5rem;
		border: 0;
		margin: 0;
		min-width: 0;
	}
	.pp-addr legend {
		margin-bottom: 0.4rem;
	}
	.pp-addr-street,
	.pp-addr-hint {
		grid-column: 1 / -1;
	}
	.pp-field--flush {
		margin-top: 1.25rem;
		padding: 0;
		max-width: 22rem;
	}
	.pp-field-label {
		font-size: 0.84rem;
		color: var(--color-fg);
	}
	.pp-input {
		min-height: 2.9rem;
		padding: 0 0.95rem;
		border: 1px solid var(--color-hair);
		border-radius: 10px;
		background: transparent;
		color: var(--color-fg);
		font-size: 1rem;
		font-variant-numeric: tabular-nums;
		letter-spacing: 0.02em;
	}
	.pp-input::placeholder {
		color: var(--color-fg-muted);
		opacity: 0.7;
	}
	.pp-input:focus-visible {
		outline: none;
		border-color: var(--safelight);
		box-shadow: 0 0 0 3px var(--safelight-ring);
	}
	.pp-input[aria-invalid="true"] {
		border-color: #f0676b;
	}
	.pp-field-hint {
		font-size: 0.8rem;
		color: var(--color-fg-muted);
	}
	.pp-input[aria-invalid="true"] + .pp-field-hint {
		color: #f0676b;
	}

	/* ── Form kartu (iframe DOKU berwarna halaman ini) ── */
	/* Lembar kertas terang (sama dengan CARD_PAPER) — form DOKU di dalamnya berlatar warna yang sama, jadi
	   tepi iframe tak terlihat; tepi dalam 16px milik form menjadi padding lembarnya. */
	.pp-cardframe {
		position: relative;
		margin-top: 1.5rem;
		height: 284px;
		padding: 4px 0;
		border-radius: 14px;
		background: #f4f1ea;
		overflow: hidden;
		transition: height 0.35s ease;
	}
	.pp-cardframe.is-tall {
		height: 640px;
	}
	.pp-cardframe iframe {
		display: block;
		width: 100%;
		height: 100%;
		border: 0;
		opacity: 0;
		transition: opacity 0.3s ease;
	}
	.pp-cardframe.is-ready iframe {
		opacity: 1;
	}
	.pp-cardframe-loading {
		position: absolute;
		inset: 1.1rem auto auto 16px;
		font-size: 0.9rem;
		color: #5e5f61;
	}

	/* ── Hitung mundur OVO (70 detik) ── */
	.pp-timer {
		margin-top: 1.6rem;
		display: grid;
		grid-template-columns: auto 1fr;
		align-items: baseline;
		gap: 0.2rem 0.75rem;
	}
	.pp-timer-n {
		font-family: var(--font-display);
		font-size: clamp(2.4rem, 6vw, 3.2rem);
		font-weight: 300;
		line-height: 1;
		color: var(--color-fg);
	}
	.pp-timer-bar {
		grid-column: 1 / -1;
		height: 3px;
		margin-top: 0.6rem;
		border-radius: 3px;
		background: var(--color-hair);
		overflow: hidden;
	}
	.pp-timer-bar span {
		display: block;
		height: 100%;
		background: var(--safelight);
		transform-origin: left;
		transition: transform 1s linear;
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
	@media (prefers-reduced-motion: reduce) {
		.pp-pulse {
			animation: none;
		}
		.pp-btn {
			transition: none;
		}
	}
</style>
