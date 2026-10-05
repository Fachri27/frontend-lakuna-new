<script lang="ts">
	import { untrack } from "svelte";
	import { goto } from "$app/navigation";
	import { page } from "$app/state";
	import { i18n } from "$lib/i18n.svelte";
	import { store } from "$lib/store.svelte";
	import { fmtIDR, imgFor, fetchCategories, pickTitle, type ApiCatItem } from "$lib/data";
	import { api, apiGet, apiPost, apiDelete, ApiError } from "$lib/api";
	import { authModal } from "$lib/authModal.svelte";
	import type { ApiResponse, ApiFavorite, ApiDownload, ApiOrder, ApiSubscription, ApiUser } from "$lib/types";
	import ApiImage from "./ApiImage.svelte";

	const copy = {
		id: {
			kicker: "Profil", needLogin: "Masuk untuk melihat profil", needLoginBody: "Simpan favorit, lihat unduhan, dan kelola langgananmu di satu tempat.",
			goLogin: "Masuk", profile: "Profil Saya", favorites: "Favorit", downloads: "Unduhan Saya", cart: "Keranjang Saya",
			upload: "Unggah",
			orders: "Pesanan", subscription: "Langganan", premium: "Member Premium", free: "Member",
			avChange: "Ganti foto", avTooBig: "Foto maksimal 5 MB.", avFail: "Gagal mengganti foto profil.",
			planLine: "Paket {plan} · aktif s/d {date}",
			all: "Semua", photo: "Foto", video: "Video", save: "Simpan", saved: "Tersimpan",
			nextPage: "Halaman berikutnya", prevPage: "Sebelumnya",
			noFav: "Belum ada favorit", noFavCta: "Cari bingkai favoritmu", noFavFiltered: "Belum ada favorit di jenis ini.", logout: "Keluar",
			account: "Akun", username: "Nama pengguna", email: "Email",
			quota: "Kuota", downloadsEmpty: "Unduhanmu akan muncul di sini setelah pembelian.", manage: "Kelola langganan",
			subEmpty: "Kamu belum berlangganan.", subEmptyCta: "Lihat paket", billingMonthly: "Bulanan", billingAnnual: "Tahunan",
			subStarted: "Mulai", subExpires: "Berakhir", subStatusActive: "Aktif", subStatusExpired: "Kedaluwarsa", subStatusCancelled: "Dibatalkan", subStatusInactive: "Nonaktif",
			frames: "bingkai", perMonth: "/ bulan", usedOf: "terpakai",
			changePlan: "Ganti paket", cancelSub: "Batalkan langganan", cancelSure: "Klik lagi untuk yakin batalkan",
			cancelOk: "Langganan dibatalkan.", renewSub: "Perpanjang paket",
			instTitle: "Cicilan", instMonth: "Bulan {n}", instPending: "Menunggu",
			payRemaining: "Lunasi {n} cicilan", subBusy: "Memproses…", subFail: "Gagal memproses. Coba lagi.",
			ordersEmpty: "Belum ada pesanan.", orderTotal: "Total", orderDate: "Tanggal",
			paid: "Selesai", pending: "Menunggu bayar", cancelled: "Dibatalkan", otherStatus: "Proses",
			continuePay: "Lanjut bayar",
			ordItems: "{n} item", ordPayNote: "Selesaikan pembayaran untuk mengunduh file tanpa watermark.",
			ordSeeDownloads: "Lihat unduhan", ordDiscount: "Potongan", ordCopy: "Salin ID pesanan", ordCopied: "ID tersalin",
			licStandar: "Lisensi standar", licSubscribe: "Lisensi langganan",
			downloadFull: "Unduh penuh", downloadLicense: "Lisensi PDF", preparing: "Menyiapkan…",
			upNew: "Unggah karya baru", upFile: "Berkas foto / video", upFileHint: "JPG, PNG, WebP, atau MP4 — maks 2 GB.",
			upTitle: "Judul", upPhotographer: "Nama fotografer", upDesc: "Deskripsi", upLoc: "Lokasi",
			upSubmit: "Kirim untuk kurasi", upSending: "Mengunggah…",
			upNote: "Karya kontributor tayang setelah disetujui admin.",
			upSoonTitle: "Unggah segera hadir",
			upSoonBody: "Kami sedang menyiapkan alur unggah untuk kontributor. Begitu dibuka, kamu bisa mengirim foto dan video dari halaman ini.",
			upSoonCta: "Lihat arsip",
			upSuccess: "Terkirim! Karyamu menunggu persetujuan admin.",
			upNeedFile: "Pilih berkas foto/video dulu.", upFail: "Gagal mengunggah. Coba lagi.",
			upMine: "Karyaku", upEmpty: "Belum ada karya yang diunggah.",
			stPending: "Menunggu", stApproved: "Tayang", stRejected: "Ditolak",
			upDrop: "Tarik & letakkan berkas di sini", upOr: "atau", upBrowse: "pilih dari perangkat",
			upRemove: "Hapus",
			upCats: "Kategori", upKeywords: "Kata kunci", upPickMin: "Pilih minimal 5",
			upKwSearch: "Cari keyword…", upNeedCats: "Pilih minimal 5 kategori.", upNeedKws: "Pilih minimal 5 keyword.",
			upTagFail: "Terunggah, tapi kategori/keyword gagal disimpan — admin akan menandai.",
			upDropMany: "Tarik foto/video ke sini — boleh banyak sekaligus",
			upAddMore: "Tambah berkas", upClear: "Kosongkan",
			upFilesCount: "{n} berkas · dikurasi terpisah",
			upMetaMode: "Judul & deskripsi", upMetaHint: "Bawaan untuk foto yang dikosongkan di atas — isi per foto bila mau beda.",
			upItemTitle: "Judul foto", upItemDesc: "Deskripsi foto",
			upSubmitMany: "Kirim {n} karya untuk kurasi", upSendingN: "Mengunggah {i}/{n}…",
			upSuccessN: "{n} karya terkirim dan menunggu kurasi admin (masing-masing terpisah).",
			upPartial: "{ok} terkirim, {fail} gagal — yang gagal masih di daftar, kirim ulang.",
			upStWait: "Menunggu", upStSend: "Mengunggah", upStDone: "Terkirim", upStFail: "Gagal",
			rjTitle: "Alasan ditolak", rjNone: "Kurator tidak menyertakan catatan.", rjRetry: "Unggah ulang",
			upSession: "Sesi login berakhir. Masuk lagi, lalu kirim ulang — berkas dan isian tetap tersimpan.",
			badPayUrl: "Tautan bayar pesanan ini tidak valid, pembayaran dibatalkan.",
			cartEmpty: "Keranjangmu masih kosong.", cartTotal: "Total", checkout: "Lanjut ke checkout", remove: "Hapus",
			menu: "Menu profil",
		},
		en: {
			kicker: "Profile", needLogin: "Sign in to view your profile", needLoginBody: "Save favourites, view downloads, and manage your membership in one place.",
			goLogin: "Sign in", profile: "My Profile", favorites: "Favorites", downloads: "My Downloads", cart: "My Cart",
			upload: "Upload",
			orders: "Orders", subscription: "Membership", premium: "Premium Member", free: "Member",
			avChange: "Change photo", avTooBig: "Photo must be 5 MB or less.", avFail: "Couldn't change your profile photo.",
			planLine: "{plan} plan · active until {date}",
			all: "All", photo: "Photo", video: "Video", save: "Save", saved: "Saved",
			nextPage: "Next Page", prevPage: "Previous",
			noFav: "No favourites yet", noFavCta: "Find your favourite frames", noFavFiltered: "No favourites of this type yet.", logout: "Sign out",
			account: "Account", username: "Username", email: "Email",
			quota: "Quota", downloadsEmpty: "Your downloads will appear here after purchase.", manage: "Manage membership",
			subEmpty: "You don't have a subscription yet.", subEmptyCta: "See plans", billingMonthly: "Monthly", billingAnnual: "Annual",
			subStarted: "Started", subExpires: "Expires", subStatusActive: "Active", subStatusExpired: "Expired", subStatusCancelled: "Cancelled", subStatusInactive: "Inactive",
			frames: "frames", perMonth: "/ mo", usedOf: "used",
			changePlan: "Change plan", cancelSub: "Cancel membership", cancelSure: "Click again to confirm cancellation",
			cancelOk: "Membership cancelled.", renewSub: "Renew plan",
			instTitle: "Installments", instMonth: "Month {n}", instPending: "Pending",
			payRemaining: "Settle {n} installments", subBusy: "Processing…", subFail: "Couldn't process that. Try again.",
			ordersEmpty: "No orders yet.", orderTotal: "Total", orderDate: "Date",
			paid: "Completed", pending: "Awaiting payment", cancelled: "Cancelled", otherStatus: "Processing",
			continuePay: "Continue payment",
			ordItems: "{n} items", ordPayNote: "Finish payment to download the watermark-free files.",
			ordSeeDownloads: "See downloads", ordDiscount: "Discount", ordCopy: "Copy order ID", ordCopied: "ID copied",
			licStandar: "Standard license", licSubscribe: "Subscription license",
			downloadFull: "Download full", downloadLicense: "License PDF", preparing: "Preparing…",
			upNew: "Upload new work", upFile: "Photo / video file", upFileHint: "JPG, PNG, WebP, or MP4 — max 2 GB.",
			upTitle: "Title", upPhotographer: "Photographer name", upDesc: "Description", upLoc: "Location",
			upSubmit: "Submit for review", upSending: "Uploading…",
			upNote: "Contributor uploads go live after admin approval.",
			upSoonTitle: "Upload is coming soon",
			upSoonBody: "We are building the upload flow for contributors. Once it opens, you can send photos and videos from this page.",
			upSoonCta: "Browse the archive",
			upSuccess: "Submitted! Your work is awaiting admin approval.",
			upNeedFile: "Choose a photo/video file first.", upFail: "Upload failed. Try again.",
			upMine: "My works", upEmpty: "No uploads yet.",
			stPending: "Pending", stApproved: "Live", stRejected: "Rejected",
			upDrop: "Drag & drop your file here", upOr: "or", upBrowse: "browse your device",
			upRemove: "Remove",
			upCats: "Categories", upKeywords: "Keywords", upPickMin: "Pick at least 5",
			upKwSearch: "Search keywords…", upNeedCats: "Pick at least 5 categories.", upNeedKws: "Pick at least 5 keywords.",
			upTagFail: "Uploaded, but categories/keywords failed to save — admin will tag them.",
			upDropMany: "Drag photos/videos here — as many as you like",
			upAddMore: "Add files", upClear: "Clear",
			upFilesCount: "{n} files · reviewed separately",
			upMetaMode: "Title & description", upMetaHint: "Default for photos left blank above — fill per photo to differ.",
			upItemTitle: "Photo title", upItemDesc: "Photo description",
			upSubmitMany: "Submit {n} works for review", upSendingN: "Uploading {i}/{n}…",
			upSuccessN: "{n} works submitted and awaiting admin review (each separately).",
			upPartial: "{ok} sent, {fail} failed — failed ones stay in the list, submit again.",
			upStWait: "Waiting", upStSend: "Uploading", upStDone: "Sent", upStFail: "Failed",
			rjTitle: "Why it was rejected", rjNone: "The curator didn't leave a note.", rjRetry: "Upload again",
			upSession: "Your session expired. Sign in again, then resubmit — files and details are kept.",
			badPayUrl: "This order's payment link looks invalid, payment was cancelled.",
			cartEmpty: "Your cart is empty.", cartTotal: "Total", checkout: "Go to checkout", remove: "Remove",
			menu: "Profile menu",
		},
	};

	type Section = "profile" | "favorites" | "downloads" | "cart" | "upload";
	const SECTIONS: Section[] = ["profile", "favorites", "downloads", "cart"];

	type AssetFilter = "all" | "FOTO" | "VIDEO";
	/** 6 baris × 3 kolom, sesuai grid favorit di desktop. */
	const PER_PAGE = 18;

	type FavItem = { id: string; title: string; titleEn?: string | null; thumbUrl: string; type: "FOTO" | "VIDEO" };

	type OrderCopy = { paid: string; pending: string; cancelled: string; otherStatus: string };

	function orderStatusLabel(status: string, t: OrderCopy) {
		if (status === "PAID") return t.paid;
		if (status === "PENDING") return t.pending;
		if (status === "CANCELLED") return t.cancelled;
		return t.otherStatus;
	}

	function orderStatusClass(status: string) {
		if (status === "PAID") return "ord-status ord-status--paid";
		if (status === "PENDING") return "ord-status ord-status--pending";
		return "ord-status";
	}
	/** ID pendek yang terbaca: 8 karakter pertama UUID, huruf besar. */
	function shortOrderId(o: { id: string; midtransOrderId: string | null }) {
		const raw = (o.midtransOrderId || o.id).replace(/^ORDER-/i, "");
		return `#${raw.replace(/-/g, "").slice(0, 8).toUpperCase()}`;
	}
	let copiedOrder = $state<string | null>(null);
	async function copyOrderId(o: { id: string; midtransOrderId: string | null }) {
		try {
			await navigator.clipboard.writeText(o.midtransOrderId || `ORDER-${o.id}`);
			copiedOrder = o.id;
			setTimeout(() => {
				if (copiedOrder === o.id) copiedOrder = null;
			}, 1600);
		} catch {
			/* clipboard ditolak — abaikan */
		}
	}
	function licenseLabel(l: string) {
		return l === "SUBSCRIBE" ? t.licSubscribe : t.licStandar;
	}

	const lang = $derived(i18n.lang);
	const t = $derived(copy[lang]);

	const user = $derived(store.user);
	/** Menu Unggah hanya untuk kontributor & admin — backend menolak role lain. */
	const canUpload = $derived(user?.role === "ADMIN" || user?.role === "CONTRIBUTOR");
	/** Alur unggah kontributor belum dibuka: false = tab "Upload" tetap tampil
	 *  tapi isinya halaman "segera hadir", dan tidak ada fetch
	 *  kategori/kata kunci/karya saya. Form di bawah tetap ada;
	 *  ubah ke true untuk membukanya. (Hanya UI — endpoint API tidak ikut dikunci.) */
	const UPLOAD_OPEN = false;

	// Bagian aktif ikut ?tab= supaya menu bisa ditautkan (mis. dari navbar ke Keranjang).
	const initial = page.url.searchParams.get("tab") as Section | null;
	const VALID_SECTIONS: Section[] = [...SECTIONS, "upload"];
	let section = $state<Section>(initial && VALID_SECTIONS.includes(initial) ? initial : "favorites");

	function selectSection(s: Section) {
		section = s;
		const url = new URL(page.url);
		url.searchParams.set("tab", s);
		void goto(url, { replaceState: true, noScroll: true, keepFocus: true });
	}

	let favItems = $state<FavItem[]>([]);
	let filter = $state<AssetFilter>("all");
	let favPage = $state(1);
	let downloads = $state<ApiDownload[]>([]);
	let orders = $state<ApiOrder[]>([]);
	let subscription = $state<ApiSubscription | null>(null);
	let avatarUrl = $state<string | null>(null);
	let avatarPicker = $state<HTMLInputElement | null>(null);
	let avSaving = $state(false);
	let avErr = $state("");
	// Ganti foto profil: pratinjau seketika, lalu PATCH /api/users/me/avatar
	// (API mengecilkan ke 300×300). Gagal → foto lama kembali.
	async function changeAvatar(f: File | null | undefined) {
		if (avatarPicker) avatarPicker.value = "";
		if (!f || !f.type.startsWith("image/")) return;
		avErr = "";
		if (f.size > 5 * 1024 * 1024) {
			avErr = t.avTooBig;
			return;
		}
		const prev = avatarUrl;
		const local = URL.createObjectURL(f);
		avatarUrl = local;
		avSaving = true;
		try {
			const fd = new FormData();
			fd.append("avatar", f);
			const res = await api<ApiResponse<{ avatarUrl: string | null }>>("/api/users/me/avatar", { method: "PATCH", body: fd });
			if (res.data?.avatarUrl) avatarUrl = res.data.avatarUrl;
		} catch {
			avatarUrl = prev;
			avErr = t.avFail;
		} finally {
			avSaving = false;
			// Beri waktu gambar server termuat sebelum URL lokal dilepas.
			setTimeout(() => URL.revokeObjectURL(local), 4000);
		}
	}

	// Unggahan kontributor: tercatat PENDING, tayang setelah disetujui admin.
	type MyPhoto = { id: string; title: string; thumbUrl: string | null; type: string; status: string; createdAt: string; rejectNote?: string | null; price?: number };
	/** Catatan kurator → butir alasan (dipisah per kalimat). */
	function rejectReasons(note?: string | null) {
		return (note ?? "")
			.split(/(?<=[.!?])\s+/)
			.map((x) => x.trim().replace(/\.$/, ""))
			.filter(Boolean);
	}
	let upFormEl = $state<HTMLElement | null>(null);
	/** Isi ulang judul karya yang ditolak lalu bawa ke form unggah. Harga
		diatur admin saat kurasi. */
	function retryUpload(p: MyPhoto) {
		upTitle = p.title;
		upMsg = "";
		upErr = "";
		upFormEl?.scrollIntoView({ behavior: "smooth", block: "start" });
	}
	let myPhotos = $state<MyPhoto[]>([]);
	/** 6 baris per halaman supaya daftar karya panjang tetap ringan. */
	const UP_PER_PAGE = 6;
	const ORD_PER_PAGE = 5;
	let myPage = $state(1);
	const myPageCount = $derived(Math.max(1, Math.ceil(myPhotos.length / UP_PER_PAGE)));
	const myPageItems = $derived(myPhotos.slice((myPage - 1) * UP_PER_PAGE, myPage * UP_PER_PAGE));
	// Pesanan: kartu tinggi-tinggi, 5 per halaman cukup.
	let ordPage = $state(1);
	const ordPageCount = $derived(Math.max(1, Math.ceil(orders.length / ORD_PER_PAGE)));
	const ordPageItems = $derived(orders.slice((ordPage - 1) * ORD_PER_PAGE, ordPage * ORD_PER_PAGE));
	// Banyak berkas, satu set data: tiap berkas dikirim sebagai karya
	// terpisah (POST /api/photos per berkas), jadi admin mengurasinya satu-satu.
	type UpItem = { id: number; file: File; url: string; status: "wait" | "send" | "done" | "fail"; title: string; desc: string };
	let upItems = $state<UpItem[]>([]);
	// Tiap foto punya judul & deskripsi sendiri; yang dikosongkan ikut bawaan
	// bersama di bawah. Jadi 2 foto bisa beda, sisanya ikut bawaan.
	const fileTitleOf = (name: string) => name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim();
	let upSeq = 0;
	let upProgress = $state(0);
	let upTitle = $state("");
	let upPhotographer = $state("");
	let upDesc = $state("");
	let upLoc = $state("");
	let uploading = $state(false);
	let upMsg = $state("");
	let upErr = $state("");
	// Kategori + keyword ala CMS (minimal 5 masing-masing): diambil sekali,
	// dipakai untuk seluruh batch.
	type TaxItem = { id: string; name: string };
	let catList = $state<TaxItem[]>([]);
	let kwList = $state<TaxItem[]>([]);
	// Daftar lokasi: gabungan terpakai + referensi geografi Indonesia
	// (backend, terurut populer). Panel saran custom ala keyword — dropdown
	// bawaan browser (datalist) tidak bisa di-style dan jelek.
	let locList = $state<string[]>([]);
	let locOpen = $state(false);
	const locSuggest = $derived(
		upLoc.trim()
			? locList.filter((loc) => loc.toLowerCase().includes(upLoc.trim().toLowerCase())).slice(0, 8)
			: locList.slice(0, 8),
	);
	let selCats = $state<string[]>([]);
	let selKws = $state<string[]>([]);
	let kwQuery = $state("");
	const kwSuggest = $derived(
		kwQuery.trim()
			? kwList.filter((k) => !selKws.includes(k.id) && k.name.toLowerCase().includes(kwQuery.trim().toLowerCase())).slice(0, 8)
			: [],
	);
	function loadTaxonomies() {
		if (!UPLOAD_OPEN || !canUpload || (catList.length && kwList.length)) return;
		fetchCategories().then((cats) => {
			catList = cats.map((c) => ({ id: c.id, name: c.name }));
		}).catch(() => {});
		apiGet<ApiResponse<TaxItem[]>>("/api/keywords?limit=200").then((res) => {
			if (res.success) kwList = res.data;
		}).catch(() => {});
		apiGet<ApiResponse<string[]>>("/api/photos/locations?limit=200").then((res) => {
			if (res.success) locList = res.data;
		}).catch(() => {});
	}
	function toggleCat(id: string) {
		selCats = selCats.includes(id) ? selCats.filter((c) => c !== id) : [...selCats, id];
	}
	// ── Kelola langganan ala pembayaran umum: ganti paket, batalkan,
	// lunasi cicilan (annual + bayar bulanan), perpanjang bila berakhir. ──
	type InstItem = { monthNumber: number; amount: number; status: string };
	let installments = $state<InstItem[]>([]);
	let cancelArmed = $state(false);
	let subBusy = $state(false);
	let subMsg = $state("");
	function loadSubscription() {
		apiGet<ApiResponse<ApiSubscription>>("/api/subscription").then((res) => {
			if (res.success && res.data) {
				subscription = res.data;
				if (res.data.payOption === "monthly") loadInstallments();
				else installments = [];
			}
		}).catch(() => {});
	}
	function loadInstallments() {
		apiGet<ApiResponse<{ subscriptionId: string; installments: InstItem[] } | InstItem[]>>("/api/subscription/installments").then((res) => {
			if (!res.success) return;
			const d = res.data;
			installments = Array.isArray(d) ? d : (d.installments ?? []);
		}).catch(() => {});
	}
	const instPending = $derived(installments.filter((i) => i.status === "PENDING"));
	const instPendingTotal = $derived(instPending.reduce((s, i) => s + (i.amount || 0), 0));
	async function cancelMembership() {
		if (!cancelArmed) {
			cancelArmed = true;
			subMsg = "";
			return;
		}
		cancelArmed = false;
		subBusy = true;
		subMsg = "";
		try {
			await apiDelete<ApiResponse<{ message: string }>>("/api/subscription");
			subMsg = t.cancelOk;
			installments = [];
			loadSubscription();
		} catch (err) {
			subMsg = err instanceof ApiError && err.message ? err.message : t.subFail;
		} finally {
			subBusy = false;
		}
	}
	async function payRemaining() {
		if (subBusy || !instPending.length) return;
		subBusy = true;
		subMsg = "";
		try {
			const res = await apiPost<ApiResponse<{ snapToken: string; redirectUrl: string }>>(
				"/api/subscription/installments/pay-remaining",
				{},
			);
			if (res.success && res.data?.redirectUrl && isSafePaymentUrl(res.data.redirectUrl)) {
				window.location.href = res.data.redirectUrl;
				return;
			}
			subMsg = t.subFail;
		} catch (err) {
			subMsg = err instanceof ApiError && err.message ? err.message : t.subFail;
		} finally {
			subBusy = false;
		}
	}
	// Dropzone: pratinjau bingkai sebelum dikirim — kontributor melihat
	// karyanya dalam bingkai proof, bukan nama file mentah.
	let filePicker = $state<HTMLInputElement | null>(null);
	let dragOver = $state(false);
	const isVideoFile = (f: File) => f.type.startsWith("video/");
	const fill = (tpl: string, v: Record<string, string | number>) =>
		tpl.replace(/\{(\w+)\}/g, (_, k) => String(v[k] ?? ""));
	// Lepas URL pratinjau saat komponen dilepas.
	$effect(() => () => upItems.forEach((it) => URL.revokeObjectURL(it.url)));
	function fmtSize(bytes: number) {
		if (bytes >= 1 << 20) return `${(bytes / (1 << 20)).toFixed(1)} MB`;
		return `${Math.max(1, Math.round(bytes / 1024))} KB`;
	}
	function addFiles(list: FileList | null | undefined) {
		const files = Array.from(list ?? []).filter((f) => /^(image|video)\//.test(f.type));
		if (!files.length) return;
		upErr = "";
		upMsg = "";
		upItems = [
			...upItems,
			...files.map((file) => ({ id: ++upSeq, file, url: URL.createObjectURL(file), status: "wait" as const, title: "", desc: "" })),
		];
		if (filePicker) filePicker.value = "";
	}
	function removeItem(id: number) {
		const it = upItems.find((x) => x.id === id);
		if (it) URL.revokeObjectURL(it.url);
		upItems = upItems.filter((x) => x.id !== id);
	}
	function clearItems() {
		upItems.forEach((it) => URL.revokeObjectURL(it.url));
		upItems = [];
	}

	function loadMyPhotos() {
		if (!UPLOAD_OPEN || !canUpload) return;
		apiGet<ApiResponse<MyPhoto[]>>("/api/photos/my?limit=50").then((res) => {
			if (res.success) {
				myPhotos = res.data;
				myPage = 1;
			}
		}).catch(() => {});
	}

	function upStatusLabel(status: string) {
		if (status === "APPROVED") return t.stApproved;
		if (status === "REJECTED") return t.stRejected;
		return t.stPending;
	}

	function upStatusClass(status: string) {
		if (status === "APPROVED") return "pp-pill pp-pill--on";
		if (status === "REJECTED") return "pp-pill pp-pill--off";
		return "pp-pill";
	}

	async function submitUpload(e: SubmitEvent) {
		e.preventDefault();
		upMsg = "";
		upErr = "";
		const queue = upItems.filter((it) => it.status !== "done");
		if (!queue.length) {
			upErr = t.upNeedFile;
			return;
		}
		// Sama seperti CMS: minimal 5 kategori + 5 keyword per karya.
		if (selCats.length < 5) {
			upErr = t.upNeedCats;
			return;
		}
		if (selKws.length < 5) {
			upErr = t.upNeedKws;
			return;
		}
		uploading = true;
		upProgress = 0;
		let ok = 0;
		let fail = 0;
		let tagFail = false;
		let sessionLost = false;
		// Satu penanda untuk seluruh kiriman: CMS mengelompokkannya jadi satu
		// baris "+N" dan mengurasi tiap berkas terpisah.
		const batchId = queue.length > 1 ? crypto.randomUUID() : "";
		// Berurutan, bukan paralel: berkas video bisa ratusan MB, dan satu
		// per satu memberi status yang jujur per berkas.
		for (const it of queue) {
			// Cek sesi dengan request kecil SEBELUM mengirim berkas besar: token
			// akses (15 mnt) diperbarui di sini bila perlu, dan bila sesi sudah
			// mati (refresh token ditolak, mis. akun login di tempat lain)
			// berhenti — jangan kirim GB data hanya untuk dijawab 401.
			try {
				await apiGet<ApiResponse<unknown>>("/api/users/me");
			} catch (e) {
				if (e instanceof ApiError && e.status === 401) {
					sessionLost = true;
					break;
				}
			}
			upProgress++;
			upItems = upItems.map((x) => (x.id === it.id ? { ...x, status: "send" } : x));
			try {
				const fd = new FormData();
				fd.append("photo", it.file);
				// Judul/deskripsi per foto bila diisi, kalau kosong ikut bawaan
				// bersama, terakhir fallback nama file. Harga selalu 0 — diatur
				// admin saat kurasi.
				const itemTitle = it.title.trim() || upTitle.trim() || fileTitleOf(it.file.name);
				const itemDesc = it.desc.trim() || upDesc.trim();
				fd.append("title", itemTitle);
				fd.append("photographer", upPhotographer.trim() || user?.name || "");
				fd.append("price", "0");
				if (itemDesc) fd.append("description", itemDesc);
				if (upLoc.trim()) fd.append("location", upLoc.trim());
				fd.append("type", isVideoFile(it.file) ? "VIDEO" : "FOTO");
				if (batchId) fd.append("batchId", batchId);
				const res = await apiPost<ApiResponse<{ id?: string }>>("/api/photos", fd);
				if (!res.success) throw new Error("upload failed");
				// Tandai kategori + keyword seperti alur CMS (POST terpisah per
				// karya). Gagal di sini tidak menggagalkan unggahan — admin
				// bisa menandai saat kurasi.
				const pid = res.data?.id;
				if (pid) {
					try {
						await apiPost<ApiResponse<unknown>>(`/api/photos/${pid}/categories`, { categoryIds: selCats });
						await apiPost<ApiResponse<unknown>>(`/api/photos/${pid}/keywords`, { keywordIds: selKws });
					} catch {
						tagFail = true;
					}
				}
				ok++;
				upItems = upItems.map((x) => (x.id === it.id ? { ...x, status: "done" } : x));
			} catch (e) {
				if (e instanceof ApiError && e.status === 401) {
					sessionLost = true;
					upItems = upItems.map((x) => (x.id === it.id ? { ...x, status: "wait" } : x));
					break;
				}
				fail++;
				upItems = upItems.map((x) => (x.id === it.id ? { ...x, status: "fail" } : x));
			}
		}
		uploading = false;
		if (sessionLost) {
			if (ok) loadMyPhotos();
			upItems.filter((x) => x.status === "done").forEach((x) => URL.revokeObjectURL(x.url));
			upItems = upItems.filter((x) => x.status !== "done");
			if (ok) upMsg = fill(t.upSuccessN, { n: ok });
			upErr = t.upSession;
			authModal.open("/profile?tab=upload");
			return;
		}
		if (ok) loadMyPhotos();
		if (!fail) {
			upMsg = fill(t.upSuccessN, { n: ok });
			if (tagFail) upErr = t.upTagFail;
			clearItems();
			upTitle = "";
			upDesc = "";
			upLoc = "";
		} else {
			// Sisakan hanya yang gagal untuk dikirim ulang.
			upItems.filter((x) => x.status === "done").forEach((x) => URL.revokeObjectURL(x.url));
			upItems = upItems.filter((x) => x.status !== "done");
			if (ok) upMsg = fill(t.upSuccessN, { n: ok });
			upErr = ok ? fill(t.upPartial, { ok, fail }) : t.upFail;
		}
	}
	let preparingId = $state<string | null>(null);

	const filtered = $derived(filter === "all" ? favItems : favItems.filter((f) => f.type === filter));
	const pageCount = $derived(Math.max(1, Math.ceil(filtered.length / PER_PAGE)));
	const pageItems = $derived(filtered.slice((favPage - 1) * PER_PAGE, favPage * PER_PAGE));

	let gridTop = $state<HTMLElement>();

	function setFilter(f: AssetFilter) {
		filter = f;
		favPage = 1;
	}

	function goPage(n: number) {
		favPage = Math.min(pageCount, Math.max(1, n));
		gridTop?.scrollIntoView({ block: "start", behavior: "smooth" });
	}

	// Unduh dari URL presigned (cross-origin MinIO). Coba fetch blob dulu agar
	// browser memaksa save; bila diblokir CORS, fallback buka di tab baru.
	async function downloadFromUrl(src: string, filename: string) {
		try {
			const r = await fetch(src, { mode: "cors" });
			if (!r.ok) throw new Error("fetch failed");
			const blob = await r.blob();
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = filename;
			document.body.appendChild(a);
			a.click();
			a.remove();
			URL.revokeObjectURL(url);
		} catch {
			window.open(src, "_blank", "noopener,noreferrer");
		}
	}

	// Unduh file penuh (tanpa tanda air) lewat backend yang presign originalKey.
	// Backend validasi lisensi STANDAR / subscription aktif sebelum memberi URL.
	async function handleDownloadFull(d: ApiDownload) {
		if (preparingId) return;
		preparingId = d.id;
		try {
			const res = await apiGet<ApiResponse<{ downloadUrl: string }>>(`/api/downloads/${d.photoId}`);
			if (!res.success || !res.data?.downloadUrl) throw new Error("no url");
			await downloadFromUrl(res.data.downloadUrl, `lakuna-${d.photoId}-penuh.jpg`);
		} catch {
			goto(`/photos/${d.photoId}`);
		} finally {
			preparingId = null;
		}
	}

	// Unduh sertifikat lisensi (PDF) lewat backend yang generate/presign PDF.
	async function handleDownloadLicense(d: ApiDownload) {
		if (preparingId) return;
		preparingId = `lic-${d.id}`;
		try {
			const res = await apiGet<ApiResponse<{ downloadUrl: string }>>(`/api/downloads/license/${d.id}`);
			if (!res.success || !res.data?.downloadUrl) throw new Error("no url");
			await downloadFromUrl(res.data.downloadUrl, `lakuna-lisensi-${d.id}.pdf`);
		} catch {
			/* silent */
		} finally {
			preparingId = null;
		}
	}

	$effect(() => {
		if (!user) return;
		// Avatar tidak disimpan di store, jadi diambil sekali di sini.
		apiGet<ApiResponse<ApiUser>>("/api/users/me").then((res) => {
			if (res.success) avatarUrl = res.data.avatarUrl;
		}).catch(() => {});
		apiGet<ApiResponse<ApiFavorite[]>>("/api/favorite").then((res) => {
			if (res.success) {
				favItems = res.data.map((f) => ({
					id: f.photo.id,
					title: f.photo.title,
					titleEn: f.photo.titleEn,
					thumbUrl: f.photo.thumbUrl,
					type: f.photo.type === "VIDEO" ? "VIDEO" : "FOTO",
				}));
			}
		}).catch(() => {});
		apiGet<ApiResponse<ApiDownload[]>>("/api/downloads").then((res) => {
			if (res.success) downloads = res.data;
		}).catch(() => {});
		apiGet<ApiResponse<ApiOrder[]>>("/api/order").then((res) => {
			if (res.success) {
				orders = res.data;
				ordPage = 1;
			}
		}).catch(() => {});
		loadSubscription();
		// untrack: keduanya MEMBACA state (canUpload, catList, kwList). Tanpa
		// ini, catList yang terisi memicu efek ini lagi → semua fetch di atas
		// diulang tanpa henti (dulu menghabiskan rate limit API, 429).
		untrack(() => {
			loadMyPhotos();
			loadTaxonomies();
		});
	});

	const sub = $derived(subscription);
	const hasSub = $derived(!!sub && sub.status !== "INACTIVE" && sub.plan !== "FREE" && !!sub.id);
	const isPremium = $derived(hasSub && sub?.status === "ACTIVE");
	const initials = $derived(
		(user?.name ?? "?")
			.split(/[\s._-]+/)
			.filter(Boolean)
			.slice(0, 2)
			.map((w) => w[0]!.toUpperCase())
			.join("")
	);

	function fmtDate(d?: string | null) {
		return d
			? new Date(d).toLocaleDateString(lang === "id" ? "id-ID" : "en-US", { day: "2-digit", month: "short", year: "numeric" })
			: "—";
	}

	/**
	 * Validasi `continuePaymentUrl` sebelum dirender sebagai link.
	 * Allowlist sama dengan PaymentPage: host Xendit (`checkout.xendit.co`),
	 * Midtrans snap (`app.midtrans.com` / sandbox), host backend sendiri +
	 * localhost dev. Tolak `javascript:`/skema non-https (kecuali http localhost).
	 */
	const PAYMENT_HOSTS = [
		"checkout.xendit.co",
		"invoice.xendit.co",
		"app.midtrans.com",
		"app.sandbox.midtrans.com",
	];

	function paymentHostAllowed(host: string): boolean {
		const h = host.toLowerCase();
		if ((PAYMENT_HOSTS as string[]).includes(h)) return true;
		if (h.endsWith(".xendit.co")) return true;
		if (h === "localhost" || h === "127.0.0.1") return true;
		try {
			const base = new URL(import.meta.env.VITE_API_URL || "http://localhost:3000");
			if (h === base.hostname.toLowerCase()) return true;
		} catch {
			/* abaikan — allowlist statis di atas tetap berlaku */
		}
		return false;
	}

	function isSafePaymentUrl(raw: string | null | undefined): raw is string {
		if (!raw) return false;
		const v = raw.trim();
		// Halaman bayar milik Lakuna (path relatif dari backend).
		if (/^\/payment\/pay\/[A-Za-z0-9%-]+$/.test(v)) return true;
		if (!v || v.length > 2048) return false;
		const lower = v.toLowerCase();
		if (
			lower.startsWith("javascript:") ||
			lower.startsWith("data:") ||
			lower.startsWith("vbscript:") ||
			lower.startsWith("file:")
		) return false;
		let u: URL;
		try {
			u = new URL(v);
		} catch {
			return false;
		}
		if (u.protocol !== "https:") {
			const h = u.hostname.toLowerCase();
			if (!(u.protocol === "http:" && (h === "localhost" || h === "127.0.0.1"))) return false;
		}
		return paymentHostAllowed(u.hostname);
	}
</script>


{#snippet emptyState(title: string, cta: string, href = "/photos")}
	<div class="flex flex-col items-center justify-center rounded-md border border-dashed border-hair px-6 py-20 text-center">
		<p class="font-display text-2xl font-light text-fg">{title}</p>
		<a href={href} class="arrow-link mt-5 text-sm text-safelight">{cta} <span class="arr">→</span></a>
	</div>
{/snippet}

{#snippet icon(name: Section)}
	<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
		{#if name === "profile"}
			<circle cx="12" cy="7.5" r="4" /><path d="M4.5 21c0-4.1 3.4-7 7.5-7s7.5 2.9 7.5 7z" />
		{:else if name === "favorites"}
			<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" />
		{:else if name === "downloads"}
			<path d="M12 3v12M7 10l5 5 5-5M4 17v3h16v-3" />
		{:else if name === "upload"}
			<path d="M12 16V4M7 9l5-5 5 5M4 17v3h16v-3" />
		{:else}
			<path d="M3 4h2.5l2.2 10.5h10.6L20.5 7H6.4" /><circle cx="9" cy="19" r="1.4" /><circle cx="17" cy="19" r="1.4" />
		{/if}
	</svg>
{/snippet}

{#if !user}
	<section class="mx-auto flex min-h-[70svh] max-w-xl flex-col items-center justify-center px-6 pt-36 text-center lg:pt-44">
		<p class="kicker text-safelight">{t.kicker}</p>
		<h1 class="mt-5 font-display text-[clamp(2rem,5vw,3.4rem)] font-light tracking-[-0.02em] text-fg">{t.needLogin}</h1>
		<p class="mt-4 text-fg-muted">{t.needLoginBody}</p>
		<button type="button" onclick={() => authModal.open("/profile")} class="press arrow-link mt-8 rounded-full bg-safelight px-7 py-3.5 text-sm font-medium text-ivory">
			{t.goLogin} <span class="arr">→</span>
		</button>
	</section>
{:else}
	<section class="pp mx-auto max-w-[1500px] px-4 pb-28 pt-36 sm:px-6 lg:px-10 lg:pt-44">
		<div class="pp-layout">
			<!-- Kolom kiri: identitas + menu -->
			<aside class="pp-side">
				<div class="pp-card pp-id">
					<div class="pp-avatar" class:is-premium={isPremium}>
						<button
							type="button"
							class="pp-avatar__btn"
							aria-label={t.avChange}
							disabled={avSaving}
							onclick={() => avatarPicker?.click()}
						>
							{#if avatarUrl}
								<img src={avatarUrl} alt="" class="h-full w-full rounded-full object-cover" />
							{:else}
								<span aria-hidden="true">{initials}</span>
							{/if}
							<span class="pp-avatar__edit" class:is-busy={avSaving} aria-hidden="true">
								{#if avSaving}
									<span class="pp-avatar__spin"></span>
								{:else}
									<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></svg>
									<span>{t.avChange}</span>
								{/if}
							</span>
						</button>
						<input
							bind:this={avatarPicker}
							type="file"
							accept="image/jpeg,image/png,image/webp"
							class="sr-only"
							tabindex={-1}
							aria-hidden="true"
							onchange={(e) => changeAvatar(e.currentTarget.files?.[0])}
						/>
						{#if isPremium}
							<!-- Mahkota "dipakai" miring di tepi kanan-atas lingkaran. -->
							<span class="pp-crown" title={t.premium}>
								<svg width="30" height="24" viewBox="0 0 30 24" aria-hidden="true">
									<defs>
										<linearGradient id="pp-crown-g" x1="0" y1="0" x2="0" y2="1">
											<stop offset="0" stop-color="#ffe38a" />
											<stop offset="1" stop-color="#e0a412" />
										</linearGradient>
									</defs>
									<path d="M3 8l6 5 6-10 6 10 6-5-2.5 13h-19z" fill="url(#pp-crown-g)" stroke="#8a5a00" stroke-width="1" stroke-linejoin="round" />
									<circle cx="3" cy="7.5" r="1.8" fill="#ffe38a" />
									<circle cx="15" cy="2.8" r="1.9" fill="#ffe38a" />
									<circle cx="27" cy="7.5" r="1.8" fill="#ffe38a" />
								</svg>
							</span>
						{/if}
					</div>
					{#if avErr}<p role="alert" class="mt-3 text-xs text-red-400">{avErr}</p>{/if}
					<h1 class="mt-5 font-display text-2xl font-light leading-tight tracking-[-0.01em] text-fg">{user.name}</h1>
					<p class="mt-1 truncate text-sm text-fg-muted" title={user.email}>{user.email}</p>
					<span class="pp-member mt-4" class:is-premium={isPremium}>
						{#if isPremium}
							<svg width="14" height="12" viewBox="0 0 30 24" aria-hidden="true"><path d="M3 8l6 5 6-10 6 10 6-5-2.5 13h-19z" fill="currentColor" /></svg>
						{/if}
						{isPremium ? t.premium : t.free}
					</span>
					{#if isPremium && sub}
						<p class="mt-2 text-xs text-fg-muted">
							{t.planLine.replace("{plan}", sub.plan || "Premium").replace("{date}", fmtDate(sub.expiresAt))}
						</p>
					{/if}
				</div>

				<nav class="pp-card pp-menu" aria-label={t.menu}>
					{#each SECTIONS as s (s)}
						<button
							type="button"
							class="pp-menu__item"
							aria-current={section === s ? "page" : undefined}
							onclick={() => selectSection(s)}
						>
							{@render icon(s)}
							<span>{t[s]}</span>
							{#if s === "cart" && store.cartCount > 0}
								<span class="pp-menu__count">{store.cartCount}</span>
							{:else if s === "favorites" && favItems.length > 0}
								<span class="pp-menu__count">{favItems.length}</span>
							{/if}
						</button>
					{/each}
					{#if canUpload}
						<button
							type="button"
							class="pp-menu__item"
							aria-current={section === "upload" ? "page" : undefined}
							onclick={() => selectSection("upload")}
						>
							{@render icon("upload")}
							<span>{t.upload}</span>
							{#if myPhotos.length > 0}
								<span class="pp-menu__count">{myPhotos.length}</span>
							{/if}
						</button>
					{/if}
					<button
						type="button"
						class="pp-menu__item pp-menu__logout"
						onclick={() => { void store.logout(); goto("/"); }}
					>
						<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 21H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3" /><path d="M16 17l5-5-5-5" /><path d="M21 12H9" /></svg>
						<span>{t.logout}</span>
					</button>
				</nav>
			</aside>

			<!-- Kolom kanan: isi bagian aktif -->
			<div class="pp-card pp-main" bind:this={gridTop}>
				{#if section === "favorites"}
					<h2 class="pp-title">{t.favorites}</h2>
					<div class="mt-5 flex flex-wrap gap-2" role="group" aria-label={t.favorites}>
						{#each ([["all", t.all], ["FOTO", t.photo], ["VIDEO", t.video]] as [AssetFilter, string][]) as [f, label] (f)}
							<button type="button" class="pp-chip" aria-pressed={filter === f} onclick={() => setFilter(f)}>{label}</button>
						{/each}
					</div>

					{#if !favItems.length}
						<div class="mt-8">{@render emptyState(t.noFav, t.noFavCta)}</div>
					{:else if !filtered.length}
						<p class="mt-12 text-center text-fg-muted">{t.noFavFiltered}</p>
					{:else}
						<ul class="pp-grid">
							{#each pageItems as f (f.id)}
								{@const fav = store.isFavorite(f.id)}
								<li class="pp-tile on-darkroom group">
									<a href={`/photos/${f.id}`} class="pp-tile__link">
										<ApiImage src={imgFor(f.id, 800, 600, f.thumbUrl)} alt={pickTitle(f.title, f.titleEn, lang)} fill class="object-cover transition-transform duration-700 ease-out group-hover:scale-105" />
										<span class="pp-tile__title">{pickTitle(f.title, f.titleEn, lang)}</span>
										<span class="pp-tile__tag">{f.type === "VIDEO" ? t.video : "HD"}</span>
									</a>
									<button
										type="button"
										class="pp-tile__save"
										aria-pressed={fav}
										aria-label={`${fav ? t.saved : t.save}: ${pickTitle(f.title, f.titleEn, lang)}`}
										onclick={() => store.toggleFavorite(f.id)}
									>
										<svg width="12" height="12" viewBox="0 0 24 24" fill={fav ? "currentColor" : "none"} stroke="currentColor" stroke-width="2" aria-hidden="true">
											<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" />
										</svg>
										{fav ? t.saved : t.save}
									</button>
								</li>
							{/each}
						</ul>

						{#if pageCount > 1}
							<div class="mt-12 flex flex-wrap items-center justify-center gap-3">
								{#if favPage > 1}
									<button type="button" class="pp-ghost" onclick={() => goPage(favPage - 1)}>{t.prevPage}</button>
								{/if}
								{#if favPage < pageCount}
									<button type="button" class="press arrow-link rounded-full bg-safelight px-7 py-3.5 text-sm font-medium text-ivory" onclick={() => goPage(favPage + 1)}>
										{t.nextPage} <span class="arr">→</span>
									</button>
								{/if}
							</div>
							<p class="mt-3 text-center text-xs text-fg-muted">{favPage} / {pageCount}</p>
						{/if}
					{/if}
				{/if}

				{#if section === "profile"}
					<h2 class="pp-title">{t.profile}</h2>

					<dl class="mt-8 max-w-lg border-t border-hair">
						<div class="up-row">
							<dt class="kicker shrink-0 text-fg-muted">{t.username}</dt>
							<dd class="min-w-0 flex-1 truncate text-fg">{user.name}</dd>
						</div>
						<div class="up-row">
							<dt class="kicker shrink-0 text-fg-muted">{t.email}</dt>
							<dd class="min-w-0 flex-1 truncate text-fg" title={user.email}>{user.email}</dd>
						</div>
					</dl>

					<h3 class="pp-sub">{t.subscription}</h3>
					{#if !hasSub || !sub}
						{@render emptyState(t.subEmpty, t.subEmptyCta, "/pricing")}
					{:else}
						{@const billingLabel = sub.billing === "annual" ? t.billingAnnual : t.billingMonthly}
						{@const statusLabel =
							sub.status === "ACTIVE" ? t.subStatusActive
							: sub.status === "EXPIRED" ? t.subStatusExpired
							: sub.status === "CANCELLED" ? t.subStatusCancelled
							: t.subStatusInactive}
						{@const quota = sub.quota || 0}
						{@const used = Math.min(sub.used || 0, quota)}
						{@const pct = quota > 0 ? Math.round((used / quota) * 100) : 0}
						<div class="pp-box relative max-w-lg">
							<div class="flex items-center justify-between gap-3">
								<p class="font-display text-3xl font-light tracking-[-0.02em] text-fg">{quota} <span class="text-fg-muted">{t.frames}</span></p>
								{#if sub.status === "ACTIVE"}
									<span class="pp-pill pp-pill--on">{statusLabel}</span>
								{:else}
									<span aria-hidden="true" class="darkroom-stamp rounded-sm px-3 py-1 font-mono text-[0.6rem] font-bold uppercase tracking-[0.18em] opacity-80">{statusLabel}</span>
								{/if}
							</div>
							<p class="mt-2 text-sm text-fg-muted">
								{billingLabel}{#if sub.price} · {fmtIDR(sub.price)}{#if sub.billing === "monthly"} {t.perMonth}{/if}{/if}
							</p>
							<div class="mt-6 flex justify-between border-t border-hair pt-5 text-sm">
								<span class="text-fg-muted">{t.quota}</span>
								<span class="text-fg">{used} / {quota} {t.usedOf}</span>
							</div>
							<div class="mt-3 h-1.5 overflow-hidden rounded-full bg-hair">
								<div class="h-full rounded-full bg-safelight transition-[width] duration-700" style={`width: ${pct}%`}></div>
							</div>
							<div class="mt-5 grid grid-cols-2 gap-4 border-t border-hair pt-5 text-sm">
								<div><p class="text-fg-muted">{t.subStarted}</p><p class="mt-1 text-fg">{fmtDate(sub.startedAt)}</p></div>
								<div><p class="text-fg-muted">{t.subExpires}</p><p class="mt-1 text-fg">{fmtDate(sub.expiresAt)}</p></div>
							</div>
							{#if sub.status === "ACTIVE"}
								<a href="/pricing" class="arrow-link mt-6 text-sm text-safelight">{t.manage} <span class="arr">→</span></a>
							{:else}
								<div class="mt-6 border-t border-hair pt-6">
									<a href="/pricing" class="press block rounded-full bg-safelight py-3.5 text-center text-sm font-medium text-ivory shadow-[0_14px_40px_-12px_var(--safelight-glow)] transition-transform hover:scale-[1.01]">{t.renewSub}</a>
								</div>
							{/if}
						</div>
						<!-- Aksi kelola ala pembayaran umum -->
						<div class="mt-4 flex max-w-lg flex-wrap items-center gap-3">
							{#if sub.status === "ACTIVE"}
								<a href="/pricing" class="pp-ghost">{t.changePlan}</a>
								<button
									type="button"
									class="pp-ghost"
									disabled={subBusy}
									onclick={cancelMembership}
								>
									{subBusy ? t.subBusy : cancelArmed ? t.cancelSure : t.cancelSub}
								</button>
							{/if}
						</div>
						{#if subMsg}
							<p role="status" class="mt-3 max-w-lg text-sm text-fg-muted">{subMsg}</p>
						{/if}
						{#if sub.payOption === "monthly" && installments.length}
							<div class="mt-6 max-w-lg rounded-[10px] border border-hair p-5">
								<p class="kicker text-fg-muted">{t.instTitle}</p>
								<ul class="mt-3 space-y-2">
									{#each installments as inst (inst.monthNumber)}
										<li class="flex items-center justify-between gap-3 text-sm">
											<span class="text-fg">{fill(t.instMonth, { n: inst.monthNumber })}</span>
											<span class="flex items-center gap-3">
												<span class="tabular-nums text-fg-muted">{fmtIDR(inst.amount)}</span>
												<span class={inst.status === "PAID" ? "pp-pill pp-pill--on" : "pp-pill"}>{inst.status === "PAID" ? t.paid : t.instPending}</span>
											</span>
										</li>
									{/each}
								</ul>
								{#if instPending.length}
									<button
										type="button"
										class="press mt-4 w-full rounded-full bg-safelight py-3 text-sm font-medium text-ivory disabled:opacity-60"
										disabled={subBusy}
										onclick={payRemaining}
									>
										{subBusy ? t.subBusy : `${fill(t.payRemaining, { n: instPending.length })} · ${fmtIDR(instPendingTotal)}`}
									</button>
								{/if}
							</div>
						{/if}
					{/if}

					<h3 class="pp-sub">{t.orders}</h3>
					{#if orders.length}
						<ul class="space-y-4">
							{#each ordPageItems as o (o.id)}
								{@const itemsSum = o.items.reduce((sum, it) => sum + it.price, 0)}
								<li class="ord">
									<header class="ord-head">
										<div class="min-w-0">
											<div class="flex flex-wrap items-center gap-x-3 gap-y-1.5">
												<span class={orderStatusClass(o.status)}>{orderStatusLabel(o.status, t)}</span>
												<button
													type="button"
													class="ord-id"
													title={o.midtransOrderId || `ORDER-${o.id}`}
													aria-label={t.ordCopy}
													onclick={() => copyOrderId(o)}
												>
													{copiedOrder === o.id ? t.ordCopied : shortOrderId(o)}
												</button>
											</div>
											<p class="mt-1.5 text-xs text-fg-muted">
												{fmtDate(o.createdAt)} · {t.ordItems.replace("{n}", String(o.items.length))}
											</p>
										</div>
										<p class="ord-total">{fmtIDR(o.total)}</p>
									</header>

									{#if o.items.length > 0}
										<ul class="ord-items">
											{#each o.items as it (it.id)}
												<li class="ord-item">
													<img src={imgFor(it.photo.id, 160, 120, it.photo.thumbUrl)} alt="" class="ord-thumb" loading="lazy" />
													<div class="min-w-0 flex-1">
														<p class="truncate text-sm text-fg">{pickTitle(it.photo.title, it.photo.titleEn, lang)}</p>
														<p class="mt-0.5 text-xs text-fg-muted">{licenseLabel(it.licenseType)}</p>
													</div>
													<p class="shrink-0 text-sm tabular-nums text-fg-muted">{fmtIDR(it.price)}</p>
												</li>
											{/each}
										</ul>
									{/if}

									{#if o.discountAmount > 0 && itemsSum > o.total}
										<p class="ord-line">
											<span>{t.ordDiscount}</span>
											<span class="tabular-nums text-safelight">−{fmtIDR(o.discountAmount)}</span>
										</p>
									{/if}

									{#if o.status === "PENDING" && o.continuePaymentUrl}
										<footer class="ord-foot">
											{#if isSafePaymentUrl(o.continuePaymentUrl)}
												<p class="text-xs text-fg-muted">{t.ordPayNote}</p>
												<a href={o.continuePaymentUrl} rel="noopener" class="press arrow-link shrink-0 rounded-full bg-safelight px-5 py-2.5 text-sm font-medium text-ivory">{t.continuePay} <span class="arr">→</span></a>
											{:else}
												<p role="alert" class="text-sm text-safelight">{t.badPayUrl}</p>
											{/if}
										</footer>
									{:else if o.status === "PAID"}
										<footer class="ord-foot ord-foot--quiet">
											<button type="button" class="arrow-link text-sm text-safelight" onclick={() => selectSection("downloads")}>
												{t.ordSeeDownloads} <span class="arr">→</span>
											</button>
										</footer>
									{/if}
								</li>
							{/each}
						</ul>
						{#if ordPageCount > 1}
							<div class="mt-8 flex flex-wrap items-center justify-center gap-3">
								{#if ordPage > 1}
									<button type="button" class="pp-ghost" onclick={() => { ordPage = Math.max(1, ordPage - 1); }}>{t.prevPage}</button>
								{/if}
								{#if ordPage < ordPageCount}
									<button type="button" class="press arrow-link rounded-full bg-safelight px-7 py-3.5 text-sm font-medium text-ivory" onclick={() => { ordPage = Math.min(ordPageCount, ordPage + 1); }}>
										{t.nextPage} <span class="arr">→</span>
									</button>
								{/if}
							</div>
							<p class="mt-3 text-center text-xs text-fg-muted">{ordPage} / {ordPageCount}</p>
						{/if}
					{:else}
						<p class="text-fg-muted">{t.ordersEmpty}</p>
					{/if}
				{/if}

				{#if section === "downloads"}
					<h2 class="pp-title">{t.downloads}</h2>
					<div class="mt-8">
						{#if downloads.length}
							<ul class="space-y-3">
								{#each downloads as d (d.id)}
									<li class="pp-box flex flex-wrap items-center gap-4">
										<img src={imgFor(d.photo.id, 320, 240, d.photo.thumbUrl)} alt="" loading="lazy" class="ord-thumb" />
										<div class="min-w-0 flex-1">
											<p class="truncate font-display text-lg font-light text-fg">{pickTitle(d.photo.title, d.photo.titleEn, lang)}</p>
											<p class="mt-1 text-xs text-fg-muted">{fmtDate(d.createdAt)} · {d.type}</p>
										</div>
										<span class="pp-pill hidden sm:inline-flex">{d.licenseKey}</span>
										<div class="flex shrink-0 flex-wrap gap-2">
											<button type="button" class="pp-ghost" onclick={() => handleDownloadLicense(d)} disabled={preparingId === `lic-${d.id}`}>
												{preparingId === `lic-${d.id}` ? t.preparing : t.downloadLicense}
											</button>
											<button type="button" class="press rounded-full bg-safelight px-5 py-2.5 text-sm font-medium text-ivory disabled:opacity-60" onclick={() => handleDownloadFull(d)} disabled={preparingId === d.id}>
												{preparingId === d.id ? t.preparing : t.downloadFull}
											</button>
										</div>
									</li>
								{/each}
							</ul>
						{:else}
							{@render emptyState(t.downloadsEmpty, t.noFavCta)}
						{/if}
					</div>
				{/if}

				{#if section === "cart"}
					<h2 class="pp-title">{t.cart}</h2>
					<div class="mt-8">
						{#if store.cart.length}
							<ul class="space-y-3">
								{#each store.cart as item (item.id)}
									<li class="pp-box flex items-center gap-4">
										<div class="min-w-0 flex-1">
											<p class="truncate font-display text-lg font-light text-fg">{pickTitle(item.title, item.titleEn, lang)}</p>
											{#if item.meta}<p class="mt-1 text-xs text-fg-muted">{item.meta}</p>{/if}
										</div>
										<p class="shrink-0 text-fg">{fmtIDR(item.price)}</p>
										<button type="button" class="pp-ghost" onclick={() => store.removeFromCart(item.id)}>{t.remove}</button>
									</li>
								{/each}
							</ul>
							<div class="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-hair pt-6">
								<p><span class="text-fg-muted">{t.cartTotal}</span> <span class="ml-2 font-display text-2xl font-light text-fg">{fmtIDR(store.cartTotal)}</span></p>
								<a href="/checkout" class="press arrow-link rounded-full bg-safelight px-7 py-3.5 text-sm font-medium text-ivory">{t.checkout} <span class="arr">→</span></a>
							</div>
						{:else}
							{@render emptyState(t.cartEmpty, t.noFavCta)}
						{/if}
					</div>
				{/if}

				{#if section === "upload" && canUpload}
					<h2 class="pp-title">{t.upload}</h2>
					{#if !UPLOAD_OPEN}
						<!-- Segera hadir: bingkai kosong menunggu karya; hanya bingkai
							pertama yang "menyala" (safelight), pelan berdenyut. -->
						<div class="up-soon">
							<div class="up-soon__frames" aria-hidden="true">
								<span class="up-soon__frame up-soon__frame--lit">
									<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 16V4M7 9l5-5 5 5M4 17v3h16v-3" /></svg>
								</span>
								<span class="up-soon__frame"></span>
								<span class="up-soon__frame"></span>
								<span class="up-soon__frame"></span>
							</div>
							<h3 class="up-soon__title">{t.upSoonTitle}</h3>
							<p class="up-soon__body">{t.upSoonBody}</p>
							<a href="/photos" class="pp-ghost mt-6">{t.upSoonCta}</a>
						</div>
					{:else}
					<p class="mt-3 max-w-[52ch] text-sm leading-relaxed text-fg-muted">{t.upNote}</p>

					<h3 class="pp-sub" bind:this={upFormEl}>{t.upNew}</h3>
					<form onsubmit={submitUpload} class="max-w-3xl">
						{#if upMsg}<p role="status" class="rounded-[10px] bg-green-500/10 px-4 py-3 text-sm text-green-400">{upMsg}</p>{/if}
						{#if upErr}<p role="alert" class="rounded-[10px] bg-red-500/10 px-4 py-3 text-sm text-red-400">{upErr}</p>{/if}
						<!-- Baki cahaya: klik / tarik berkas ke sini. Begitu ada
							berkas, bakinya menjadi bingkai proof berpratinjau. -->
						<input
							type="file"
							bind:this={filePicker}
							multiple
							accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime"
							onchange={(e) => addFiles(e.currentTarget.files)}
							class="sr-only"
							tabindex={-1}
							aria-hidden="true"
						/>
						{#if !upItems.length}
							<button
								type="button"
								onclick={() => filePicker?.click()}
								ondragover={(e) => { e.preventDefault(); dragOver = true; }}
								ondragleave={() => (dragOver = false)}
								ondrop={(e) => { e.preventDefault(); dragOver = false; addFiles(e.dataTransfer?.files); }}
								class="up-drop"
								class:is-over={dragOver}
							>
								<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 16V4M7 9l5-5 5 5M4 17v3h16v-3" /></svg>
								<span class="mt-4 font-display text-xl font-light text-fg">{t.upDropMany}</span>
								<span class="mt-1.5 text-sm text-fg-muted">{t.upOr} <span class="text-safelight underline underline-offset-4">{t.upBrowse}</span></span>
								<span class="mt-3 font-mono text-[0.72rem] tracking-[0.04em] text-fg-muted/80">{t.upFileHint}</span>
							</button>
						{:else}
							<!-- Lembar kontak: tiap berkas satu bingkai dengan statusnya.
								Tarik berkas lagi ke sini untuk menambah. -->
							<div
								class="up-sheet"
								class:is-over={dragOver}
								role="group"
								aria-label={fill(t.upFilesCount, { n: upItems.length })}
								ondragover={(e) => { e.preventDefault(); dragOver = true; }}
								ondragleave={() => (dragOver = false)}
								ondrop={(e) => { e.preventDefault(); dragOver = false; addFiles(e.dataTransfer?.files); }}
							>
								<div class="flex flex-wrap items-center justify-between gap-3">
									<p class="font-mono text-[0.72rem] tracking-[0.04em] text-fg-muted">{fill(t.upFilesCount, { n: upItems.length })}</p>
									<div class="flex gap-2">
										<button type="button" class="pp-ghost" disabled={uploading} onclick={() => filePicker?.click()}>{t.upAddMore}</button>
										<button type="button" class="pp-ghost" disabled={uploading} onclick={clearItems}>{t.upClear}</button>
									</div>
								</div>
								<ul class="up-grid up-grid--rows">
									{#each upItems as it (it.id)}
										<li class="up-cell" data-status={it.status}>
											<div class="up-cell__frame">
												{#if isVideoFile(it.file)}
													<video src={it.url} muted playsinline preload="metadata" class="h-full w-full object-cover"></video>
												{:else}
													<img src={it.url} alt="" class="h-full w-full object-cover" />
												{/if}
												<span class="up-proof__tag">{isVideoFile(it.file) ? t.video : "HD"}</span>
												{#if it.status !== "wait"}
													<span class="up-cell__status">
														{it.status === "send" ? t.upStSend : it.status === "done" ? t.upStDone : t.upStFail}
													</span>
												{/if}
												{#if !uploading}
													<button type="button" class="up-cell__remove" aria-label={`${t.upRemove}: ${it.file.name}`} onclick={() => removeItem(it.id)}>
														<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
													</button>
												{/if}
											</div>
											<div class="up-cell__body">
												{#if it.status !== "done"}
													<input
														type="text"
														bind:value={it.title}
														maxlength={100}
														placeholder={t.upItemTitle}
														disabled={uploading}
														class="up-input up-cell__title"
														aria-label={`${t.upItemTitle}: ${it.file.name}`}
													/>
													<textarea
														bind:value={it.desc}
														rows={2}
														maxlength={500}
														placeholder={t.upItemDesc}
														disabled={uploading}
														class="up-input up-cell__desc resize-y"
														aria-label={`${t.upItemDesc}: ${it.file.name}`}
													></textarea>
												{:else}
													<p class="truncate font-display text-lg font-light text-fg">{it.title || it.file.name}</p>
												{/if}
												<p class="mt-1 truncate font-mono text-[0.66rem] text-fg-muted/70" title={it.file.name}>{it.file.name} · {fmtSize(it.file.size)}</p>
											</div>
										</li>
									{/each}
								</ul>
							</div>
						{/if}

						<!-- Data bingkai dalam bahasa lembar: baris-baris bergaris
							rambut, bukan kotak-kotak. Harga diatur admin saat kurasi.
							Judul & deskripsi di sini adalah bawaan untuk foto yang
							dikosongkan di atas. -->
						<div class="mt-8 border-t border-hair">
							<p class="mt-4 text-xs text-fg-muted">{t.upMetaHint}</p>
							<label class="up-row">
								<span class="kicker shrink-0 text-fg-muted">{t.upTitle}</span>
								<input
									type="text"
									bind:value={upTitle}
									maxlength={100}
									placeholder="—"
									class="up-input"
								/>
							</label>
							<label class="up-row">
								<span class="kicker shrink-0 text-fg-muted">{t.upPhotographer}</span>
								<input
									type="text"
									bind:value={upPhotographer}
									placeholder={user.name}
									class="up-input"
								/>
							</label>
							<div class="up-row up-row--top">
								<span class="kicker shrink-0 pt-1 text-fg-muted">{t.upLoc}</span>
								<div class="min-w-0 flex-1">
									<input
										type="text"
										bind:value={upLoc}
										maxlength={200}
										placeholder="—"
										class="up-input"
										role="combobox"
										aria-expanded={locOpen && locSuggest.length > 0}
										aria-controls="up-loc-suggest"
										aria-label={t.upLoc}
										onfocus={() => (locOpen = true)}
										onblur={() => (locOpen = false)}
										onkeydown={(e) => {
											if (e.key === "Escape") locOpen = false;
										}}
										autocomplete="off"
									/>
									{#if locOpen && locSuggest.length}
										<ul id="up-loc-suggest" class="mt-2 overflow-hidden rounded-[10px] border border-hair">
											{#each locSuggest as loc (loc)}
												<li>
													<button
														type="button"
														onmousedown={(e) => e.preventDefault()}
														onclick={() => {
															upLoc = loc;
															locOpen = false;
														}}
														class="block w-full px-4 py-2.5 text-left text-sm text-fg transition-colors hover:bg-safelight/10 hover:text-safelight"
													>
														{loc}
													</button>
												</li>
											{/each}
										</ul>
									{/if}
								</div>
							</div>
							<label class="up-row up-row--top">
								<span class="kicker shrink-0 pt-1 text-fg-muted">{t.upDesc}</span>
								<textarea
									bind:value={upDesc}
									rows={3}
									maxlength={500}
									placeholder="—"
									class="up-input resize-y"
								></textarea>
							</label>
							<!-- Kategori + keyword ala CMS (minimal 5 masing-masing),
								berlaku untuk seluruh batch. -->
							<div class="up-row up-row--top">
								<span class="kicker shrink-0 pt-1 text-fg-muted">{t.upCats}</span>
								<div class="min-w-0 flex-1">
									<div class="flex flex-wrap gap-1.5">
										{#each catList as c (c.id)}
											{@const on = selCats.includes(c.id)}
											<button
												type="button"
												onclick={() => toggleCat(c.id)}
												aria-pressed={on}
												class="kicker rounded-full border px-3 py-1.5 transition-colors {on ? 'border-safelight text-safelight' : 'border-hair text-fg-muted hover:border-fg-muted hover:text-fg'}"
											>
												{c.name}
											</button>
										{/each}
										{#if !catList.length}
											<span class="text-sm text-fg-muted">…</span>
										{/if}
									</div>
									<p class="mt-2 font-mono text-[0.72rem] tracking-[0.04em] text-fg-muted/80">{t.upPickMin} · {selCats.length}/5</p>
								</div>
							</div>
							<div class="up-row up-row--top">
								<span class="kicker shrink-0 pt-1 text-fg-muted">{t.upKeywords}</span>
								<div class="min-w-0 flex-1">
									{#if selKws.length}
										<div class="mb-2 flex flex-wrap gap-1.5">
											{#each selKws as id (id)}
												<span class="kicker inline-flex items-center gap-1.5 rounded-full border border-safelight px-3 py-1.5 text-safelight">
													{kwList.find((k) => k.id === id)?.name ?? id}
													<button
														type="button"
														onclick={() => (selKws = selKws.filter((k) => k !== id))}
														aria-label={t.upRemove}
														class="transition-colors hover:text-fg"
													>✕</button>
												</span>
											{/each}
										</div>
									{/if}
									<input
										type="text"
										bind:value={kwQuery}
										placeholder={t.upKwSearch}
										class="up-input"
										role="combobox"
										aria-expanded={kwSuggest.length > 0}
										aria-controls="up-kw-suggest"
										aria-label={t.upKeywords}
									/>
									{#if kwSuggest.length}
										<ul id="up-kw-suggest" class="mt-2 overflow-hidden rounded-[10px] border border-hair">
											{#each kwSuggest as k (k.id)}
												<li>
													<button
														type="button"
														onclick={() => {
															selKws = [...selKws, k.id];
															kwQuery = "";
														}}
														class="block w-full px-4 py-2.5 text-left text-sm text-fg transition-colors hover:bg-safelight/10 hover:text-safelight"
													>
														{k.name}
													</button>
												</li>
											{/each}
										</ul>
									{/if}
									<p class="mt-2 font-mono text-[0.72rem] tracking-[0.04em] text-fg-muted/80">{t.upPickMin} · {selKws.length}/5</p>
								</div>
							</div>
						</div>
						<div class="mt-8 flex flex-wrap items-center gap-5">
							<button type="submit" disabled={uploading} class="press rounded-full bg-safelight px-8 py-3.5 text-sm font-semibold text-ivory shadow-[0_14px_40px_-12px_var(--safelight-glow)] transition-transform hover:scale-[1.02] disabled:opacity-60">
								{uploading
									? fill(t.upSendingN, { i: upProgress, n: upItems.filter((x) => x.status !== "done").length || upProgress })
									: upItems.length > 1
										? fill(t.upSubmitMany, { n: upItems.length })
										: t.upSubmit}
							</button>
							<p class="font-mono text-[0.72rem] tracking-[0.04em] text-fg-muted/80">{t.upFileHint}</p>
						</div>
					</form>

					<h3 class="pp-sub">{t.upMine}</h3>
					{#if myPhotos.length}
						<ul class="space-y-3">
							{#each myPageItems as p (p.id)}
								<li class="pp-box flex flex-wrap items-center gap-4" class:mw-rejected={p.status === "REJECTED"}>
									<img src={imgFor(p.id, 160, 120, p.thumbUrl)} alt={p.title} class="h-10 w-14 rounded-sm object-cover" />
									<div class="min-w-0 flex-1">
										<p class="truncate font-display text-lg font-light text-fg">{p.title}</p>
										<p class="mt-1 text-xs text-fg-muted">{p.type} · {fmtDate(p.createdAt)}</p>
									</div>
									<span class={upStatusClass(p.status)}>{upStatusLabel(p.status)}</span>
									{#if p.status === "REJECTED"}
										{@const reasons = rejectReasons(p.rejectNote)}
										<details class="mw-reason basis-full">
											<summary class="mw-reason__title">
												<span>{t.rjTitle}{#if reasons.length} ({reasons.length}){/if}</span>
												<svg class="mw-reason__chev" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
											</summary>
											<div class="mw-reason__body">
												{#if reasons.length}
													<ul class="mw-reason__list">
														{#each reasons as r, ri (ri)}<li>{r}</li>{/each}
													</ul>
												{:else}
													<p class="text-sm text-fg-muted">{t.rjNone}</p>
												{/if}
												<button type="button" class="pp-ghost mt-3" onclick={() => retryUpload(p)}>{t.rjRetry}</button>
											</div>
										</details>
									{/if}
								</li>
							{/each}
						</ul>
						{#if myPageCount > 1}
							<div class="mt-8 flex flex-wrap items-center justify-center gap-3">
								{#if myPage > 1}
									<button type="button" class="pp-ghost" onclick={() => { myPage = Math.max(1, myPage - 1); }}>{t.prevPage}</button>
								{/if}
								{#if myPage < myPageCount}
									<button type="button" class="press arrow-link rounded-full bg-safelight px-7 py-3.5 text-sm font-medium text-ivory" onclick={() => { myPage = Math.min(myPageCount, myPage + 1); }}>
										{t.nextPage} <span class="arr">→</span>
									</button>
								{/if}
							</div>
							<p class="mt-3 text-center text-xs text-fg-muted">{myPage} / {myPageCount}</p>
						{/if}
					{:else}
						<p class="text-fg-muted">{t.upEmpty}</p>
					{/if}
					{/if}
				{/if}
			</div>
		</div>
	</section>
{/if}

<style>
	/* Layout dari mockup (identitas + menu di kiri, panel isi di kanan), tapi
	   rupanya ikut tangga nada situs: kartu di anak tangga --surface, garis
	   rambut --hair, dan safelight sebagai satu-satunya lampu — menandai
	   bagian yang sedang dibuka, filter aktif, dan tombol utama. Semua token,
	   jadi ikut berbalik di tema terang/gelap. */

	.pp-layout {
		display: grid;
		gap: 1.5rem;
		align-items: start;
	}
	@media (min-width: 900px) {
		.pp-layout {
			grid-template-columns: minmax(250px, 320px) 1fr;
			gap: 2rem;
		}
		.pp-side {
			position: sticky;
			top: calc(var(--nav-h) + 1.5rem);
		}
	}

	.pp-side {
		display: grid;
		gap: 1.25rem;
		min-width: 0;
	}

	.pp-card {
		background: var(--surface);
		border: 1px solid var(--hair);
		border-radius: 10px;
		box-shadow: var(--shadow);
	}

	/* --- identitas --- */

	.pp-id {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 2.25rem 1.5rem 1.75rem;
		text-align: center;
		min-width: 0;
	}
	.pp-id > p {
		max-width: 100%;
	}

	.pp-avatar {
		position: relative;
		display: grid;
		place-items: center;
		width: 6.5rem;
		height: 6.5rem;
		border-radius: 50%;
		background: var(--wash);
		color: var(--fg);
		font-family: var(--font-display);
		font-size: 2.4rem;
		font-weight: 300;
		box-shadow: 0 0 0 1px var(--hair), 0 0 0 5px var(--surface), 0 0 0 6px var(--hair);
	}
	/* Premium: cincin luar emas. */
	.pp-avatar.is-premium {
		box-shadow:
			0 0 0 1px var(--hair),
			0 0 0 5px var(--surface),
			0 0 0 7px #e0a412,
			0 0 22px -4px rgba(224, 164, 18, 0.55);
	}
	.pp-avatar__btn {
		position: relative;
		display: grid;
		place-items: center;
		width: 100%;
		height: 100%;
		padding: 0;
		border-radius: 50%;
		color: inherit;
		font: inherit;
		cursor: pointer;
	}
	.pp-avatar__btn:focus-visible {
		outline: 2px solid var(--safelight);
		outline-offset: 9px;
	}
	.pp-avatar__edit {
		position: absolute;
		inset: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.2rem;
		border-radius: 50%;
		background: rgba(0, 0, 0, 0.55);
		color: #fff;
		font-family: var(--font-body);
		font-size: 0.68rem;
		font-weight: 500;
		opacity: 0;
		transition: opacity 0.2s ease;
	}
	.pp-avatar__btn:hover .pp-avatar__edit,
	.pp-avatar__btn:focus-visible .pp-avatar__edit,
	.pp-avatar__edit.is-busy {
		opacity: 1;
	}
	@media (hover: none) {
		/* Sentuh: ikon kecil permanen di bawah supaya tetap ketahuan bisa diganti. */
		.pp-avatar__edit {
			inset: auto 0 0 0;
			height: 34%;
			border-radius: 0 0 999px 999px;
			opacity: 1;
		}
		.pp-avatar__edit span:not(.pp-avatar__spin) {
			display: none;
		}
	}
	.pp-avatar__spin {
		width: 20px;
		height: 20px;
		border-radius: 50%;
		border: 2px solid rgba(255, 255, 255, 0.3);
		border-top-color: #fff;
		animation: pp-spin 0.8s linear infinite;
	}
	@keyframes pp-spin {
		to {
			transform: rotate(360deg);
		}
	}

	/* Mahkota dipakai miring di tepi kanan-atas lingkaran. */
	.pp-crown {
		position: absolute;
		top: -0.95rem;
		right: -0.55rem;
		transform: rotate(24deg);
		filter: drop-shadow(0 2px 3px rgba(0, 0, 0, 0.45));
		pointer-events: none;
		line-height: 0;
	}

	.pp-member {
		display: inline-flex;
		align-items: center;
		gap: 0.45rem;
		padding: 0.35rem 0.9rem;
		border-radius: 999px;
		border: 1px solid var(--hair);
		color: var(--fg-muted);
		font-size: 0.8rem;
	}
	.pp-member::before {
		content: "";
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: var(--fg-muted);
		opacity: 0.5;
	}
	.pp-member.is-premium {
		border-color: rgba(224, 164, 18, 0.5);
		background: rgba(224, 164, 18, 0.1);
		color: #e8b429;
	}
	.pp-member.is-premium::before {
		display: none;
	}

	/* --- menu --- */

	.pp-menu {
		display: grid;
		gap: 0.25rem;
		padding: 0.6rem;
	}
	@media (max-width: 899px) {
		.pp-menu {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}

	.pp-menu__item {
		position: relative;
		display: flex;
		align-items: center;
		gap: 0.8rem;
		min-height: 3.25rem;
		padding: 0 1.1rem;
		border-radius: 6px;
		color: var(--fg-muted);
		font-size: 0.98rem;
		font-weight: 500;
		text-align: left;
		transition: background-color 0.2s ease, color 0.2s ease;
	}
	.pp-menu__item:hover {
		color: var(--fg);
		background: color-mix(in srgb, var(--fg) 4%, transparent);
	}
	/* Keluar: dipisah garis rambut dari menu, tanpa lampu aktif. */
	.pp-menu__logout {
		margin-top: 0.35rem;
		border-top: 1px solid var(--hair);
		border-radius: 0 0 6px 6px;
		padding-top: 0.85rem;
	}
	/* Bagian yang dibuka: lampu safelight di tepi kiri, seperti lampu
	   indikator di pintu kamar gelap. */
	.pp-menu__item[aria-current="page"] {
		color: var(--fg);
		background: var(--wash);
	}
	.pp-menu__item[aria-current="page"]::before {
		content: "";
		position: absolute;
		left: 0;
		top: 0.8rem;
		bottom: 0.8rem;
		width: 3px;
		border-radius: 0 3px 3px 0;
		background: var(--safelight);
		box-shadow: 0 0 12px var(--safelight-glow);
	}
	.pp-menu__item[aria-current="page"] :global(svg) {
		color: var(--safelight);
	}

	.pp-menu__count {
		margin-left: auto;
		min-width: 1.4rem;
		padding: 0.05rem 0.45rem;
		border-radius: 999px;
		background: var(--wash);
		color: var(--fg-muted);
		font-size: 0.72rem;
		text-align: center;
	}
	.pp-menu__item[aria-current="page"] .pp-menu__count {
		background: var(--surface);
	}

	/* --- panel utama --- */

	.pp-main {
		min-width: 0;
		padding: 1.75rem 1.25rem 2.5rem;
		scroll-margin-top: calc(var(--nav-h) + 1.5rem);
	}
	@media (min-width: 640px) {
		.pp-main {
			padding: 2.25rem 2.5rem 3rem;
		}
	}

	.pp-title {
		font-family: var(--font-display);
		font-size: clamp(2rem, 4vw, 3rem);
		font-weight: 300;
		line-height: 1.05;
		letter-spacing: -0.02em;
		color: var(--fg);
	}

	.pp-sub {
		margin: 2.75rem 0 1rem;
		font-family: var(--font-display);
		font-size: 1.4rem;
		font-weight: 300;
		color: var(--fg);
	}

	.pp-chip {
		padding: 0.4rem 1.1rem;
		border-radius: 999px;
		border: 1px solid var(--hair);
		color: var(--fg-muted);
		font-size: 0.85rem;
		transition: border-color 0.2s ease, color 0.2s ease, background-color 0.2s ease;
	}
	.pp-chip:hover {
		color: var(--fg);
	}
	.pp-chip[aria-pressed="true"] {
		border-color: var(--safelight);
		background: color-mix(in srgb, var(--safelight) 10%, transparent);
		color: var(--safelight);
	}

	/* --- grid favorit --- */

	.pp-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
		gap: 1.25rem;
		margin-top: 2rem;
	}
	@media (min-width: 1100px) {
		.pp-grid {
			grid-template-columns: repeat(3, minmax(0, 1fr));
			gap: 1.5rem;
		}
	}

	.pp-tile {
		position: relative;
		aspect-ratio: 6 / 5;
		overflow: hidden;
		border-radius: 6px;
		background: var(--wash);
	}

	.pp-tile__link {
		position: absolute;
		inset: 0;
		display: block;
		color: var(--color-ivory);
	}
	/* Scrim tipis atas-bawah: judul dan label harus terbaca di foto terang. */
	.pp-tile__link::after {
		content: "";
		position: absolute;
		inset: 0;
		background: linear-gradient(
			to bottom,
			color-mix(in srgb, var(--color-ocean-deep) 55%, transparent),
			transparent 32%,
			transparent 70%,
			color-mix(in srgb, var(--color-ocean-deep) 50%, transparent)
		);
		pointer-events: none;
	}

	.pp-tile__title {
		position: absolute;
		z-index: 1;
		top: 0.75rem;
		left: 0.85rem;
		right: 5.5rem;
		overflow: hidden;
		font-size: 0.8rem;
		font-weight: 500;
		white-space: nowrap;
		text-overflow: ellipsis;
	}

	.pp-tile__tag {
		position: absolute;
		z-index: 1;
		right: 0.85rem;
		bottom: 0.7rem;
		font-family: var(--font-mono);
		font-size: 0.68rem;
		letter-spacing: 0.08em;
		opacity: 0.85;
	}

	.pp-tile__save {
		position: absolute;
		z-index: 2;
		top: 0.55rem;
		right: 0.6rem;
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		padding: 0.25rem 0.6rem;
		border-radius: 999px;
		background: color-mix(in srgb, var(--color-ocean-deep) 45%, transparent);
		backdrop-filter: blur(6px);
		color: var(--color-ivory);
		font-size: 0.7rem;
		font-weight: 500;
		transition: background-color 0.2s ease;
	}
	.pp-tile__save:hover {
		background: var(--safelight);
	}
	.pp-tile__save[aria-pressed="true"] svg {
		color: var(--safelight);
	}
	.pp-tile__save[aria-pressed="true"]:hover svg {
		color: var(--color-ivory);
	}

	/* --- kotak, pill, tombol sekunder --- */

	.pp-box {
		padding: 1.1rem 1.25rem;
		border: 1px solid var(--hair);
		border-radius: 8px;
		background: var(--bg);
	}

	/* --- pesanan --- */
	.ord {
		border: 1px solid var(--hair);
		border-radius: 10px;
		background: var(--bg);
		overflow: hidden;
	}
	.ord-head {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1rem;
		padding: 1.1rem 1.25rem;
	}
	.ord-total {
		flex-shrink: 0;
		font-family: var(--font-display);
		font-size: 1.35rem;
		font-weight: 300;
		font-variant-numeric: tabular-nums;
		color: var(--fg);
	}
	.ord-status {
		display: inline-flex;
		align-items: center;
		gap: 0.45rem;
		padding: 0.2rem 0.7rem;
		border-radius: 999px;
		background: color-mix(in srgb, var(--fg-muted) 12%, transparent);
		color: var(--fg-muted);
		font-size: 0.75rem;
	}
	.ord-status::before {
		content: "";
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: currentColor;
	}
	.ord-status--pending {
		background: rgba(245, 180, 40, 0.12);
		color: #e8b429;
	}
	.ord-status--paid {
		background: rgba(46, 190, 110, 0.12);
		color: #3ecf82;
	}
	.ord-id {
		font-family: var(--font-mono);
		font-size: 0.75rem;
		letter-spacing: 0.04em;
		color: var(--fg-muted);
		transition: color 0.2s ease;
	}
	.ord-id:hover,
	.ord-id:focus-visible {
		color: var(--fg);
	}
	.ord-items {
		border-top: 1px solid var(--hair);
	}
	.ord-item {
		display: flex;
		align-items: center;
		gap: 0.9rem;
		padding: 0.7rem 1.25rem;
	}
	.ord-item + .ord-item {
		border-top: 1px solid color-mix(in srgb, var(--hair) 60%, transparent);
	}
	.ord-thumb {
		width: 3.5rem;
		aspect-ratio: 4 / 3;
		flex-shrink: 0;
		border-radius: 3px;
		object-fit: cover;
		box-shadow: 0 0 0 1px var(--hair);
	}
	.ord-line {
		display: flex;
		justify-content: space-between;
		padding: 0.6rem 1.25rem;
		border-top: 1px solid var(--hair);
		font-size: 0.8rem;
		color: var(--fg-muted);
	}
	.ord-foot {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem 1.25rem;
		padding: 0.9rem 1.25rem;
		border-top: 1px solid var(--hair);
		background: color-mix(in srgb, var(--fg) 3%, transparent);
	}
	.ord-foot--quiet {
		justify-content: flex-end;
		background: transparent;
	}

	.pp-pill {
		display: inline-flex;
		align-items: center;
		padding: 0.2rem 0.75rem;
		border-radius: 999px;
		background: color-mix(in srgb, var(--fg-muted) 12%, transparent);
		color: var(--fg-muted);
		font-size: 0.75rem;
	}
	.pp-pill--on {
		background: color-mix(in srgb, var(--safelight) 12%, transparent);
		color: var(--safelight);
	}
	.pp-pill--off {
		background: color-mix(in srgb, #e5484d 12%, transparent);
		color: #e5484d;
	}

	/* Baki cahaya unggahan: area tarik-dan-letak bergaris putus-putus yang
	   menjadi bingkai proof begitu berkas masuk. */
	.up-drop {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		width: 100%;
		min-height: 240px;
		padding: 2.5rem 1.5rem;
		border-radius: 14px;
		border: 1px dashed color-mix(in srgb, var(--fg) 28%, transparent);
		color: var(--fg-muted);
		text-align: center;
		transition: border-color 0.3s ease, background 0.3s ease, color 0.3s ease;
	}
	.up-drop:hover {
		border-color: color-mix(in srgb, var(--safelight) 60%, transparent);
	}
	.up-drop.is-over {
		border-color: var(--safelight);
		background: color-mix(in srgb, var(--safelight) 7%, transparent);
		color: var(--safelight);
	}
	.up-drop:focus-visible {
		outline: 2px solid var(--safelight);
		outline-offset: 3px;
	}
	/* Karya ditolak: panel alasan dari kurator di bawah baris. */
	.mw-rejected {
		border-color: color-mix(in srgb, #e5484d 35%, var(--hair));
	}
	.mw-reason {
		margin-top: 0.25rem;
		border-radius: 8px;
		background: color-mix(in srgb, #e5484d 7%, transparent);
		border-left: 2px solid #e5484d;
	}
	.mw-reason__title {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		padding: 0.65rem 1rem;
		font-size: 0.78rem;
		font-weight: 600;
		color: #f0676b;
		cursor: pointer;
		list-style: none;
		user-select: none;
	}
	.mw-reason__title::-webkit-details-marker {
		display: none;
	}
	.mw-reason__title:focus-visible {
		outline: 2px solid var(--safelight);
		outline-offset: 2px;
		border-radius: 6px;
	}
	.mw-reason__chev {
		flex-shrink: 0;
		transition: transform 0.25s ease;
	}
	.mw-reason[open] .mw-reason__chev {
		transform: rotate(180deg);
	}
	.mw-reason__body {
		padding: 0 1rem 0.9rem;
	}
	@media (prefers-reduced-motion: reduce) {
		.mw-reason__chev {
			transition: none;
		}
	}
	.mw-reason__list {
		margin: 0;
		padding-left: 1.1rem;
		list-style: disc;
		color: var(--fg);
		font-size: 0.875rem;
		line-height: 1.6;
	}
	.mw-reason__list li::marker {
		color: #e5484d;
	}

	/* Alasan penolakan dari admin, di bawah baris karya. */
	.up-reject-note {
		margin: 0;
		padding: 0.55rem 0.8rem;
		border-left: 2px solid #e5484d;
		border-radius: 0 6px 6px 0;
		background: color-mix(in srgb, #e5484d 8%, transparent);
		color: var(--fg);
		font-size: 0.8rem;
		line-height: 1.5;
	}

	/* Lembar kontak unggahan: banyak bingkai, satu set data. */
	.up-sheet {
		padding: 1rem;
		border-radius: 14px;
		border: 1px solid var(--hair);
		background: color-mix(in srgb, var(--fg) 3%, transparent);
		transition: border-color 0.2s ease;
	}
	.up-sheet.is-over {
		border-color: var(--safelight);
	}
	.up-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
		gap: 0.9rem;
		margin-top: 1rem;
	}
	/* Mode beda-per-foto: dari contact-sheet menjadi baris-baris ledger —
		thumbnail paten di kiri, field lega di kanan. Bahasa yang sama dengan
		formulir di bawahnya, bukan kotak-kotak sempit. */
	.up-grid--rows {
		display: flex;
		flex-direction: column;
		gap: 0;
		margin-top: 1.25rem;
		border-top: 1px solid var(--hair);
	}
	.up-grid--rows .up-cell {
		display: flex;
		gap: 1.1rem;
		align-items: flex-start;
		padding: 1.1rem 0.25rem;
		border-bottom: 1px solid var(--hair);
	}
	.up-grid--rows .up-cell__frame {
		width: 7rem;
		flex-shrink: 0;
	}
	.up-grid--rows .up-cell__body {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
	}
	.up-cell__title,
	.up-cell__desc {
		display: block;
		width: 100%;
	}
	.up-cell__title {
		font-family: var(--font-display);
		font-size: 1.25rem;
		font-weight: 300;
		letter-spacing: -0.01em;
		padding-top: 0;
		padding-bottom: 0.35rem;
	}
	.up-cell__title::placeholder {
		color: var(--fg-muted);
		opacity: 0.55;
	}
	.up-cell__desc {
		font-size: 0.85rem;
		color: var(--fg-muted);
		padding-bottom: 0.25rem;
	}
	.up-cell__desc::placeholder {
		opacity: 0.55;
	}
	.up-cell__desc:focus,
	.up-cell__title:focus {
		color: var(--fg);
	}
	@media (max-width: 560px) {
		.up-grid--rows .up-cell {
			gap: 0.8rem;
		}
		.up-grid--rows .up-cell__frame {
			width: 5rem;
		}
		.up-cell__title {
			font-size: 1.05rem;
		}
	}
	.up-cell__frame {
		position: relative;
		aspect-ratio: 4 / 3;
		overflow: hidden;
		border-radius: 8px;
		background: var(--surface);
		outline: 1.5px solid transparent;
		outline-offset: 2px;
		transition: outline-color 0.2s ease;
	}
	.up-cell[data-status="send"] .up-cell__frame {
		outline-color: var(--safelight);
		animation: up-pulse 1.1s ease-in-out infinite;
	}
	.up-cell[data-status="done"] .up-cell__frame {
		outline-color: #22c55e;
	}
	.up-cell[data-status="fail"] .up-cell__frame {
		outline-color: #ef4444;
	}
	@keyframes up-pulse {
		50% {
			opacity: 0.65;
		}
	}
	.up-cell__status {
		position: absolute;
		right: 0.4rem;
		top: 0.4rem;
		padding: 0.1rem 0.5rem;
		border-radius: 999px;
		background: rgba(0, 0, 0, 0.7);
		color: #fff;
		font-size: 0.62rem;
		letter-spacing: 0.04em;
	}
	.up-cell__remove {
		position: absolute;
		right: 0.4rem;
		top: 0.4rem;
		display: grid;
		place-items: center;
		width: 22px;
		height: 22px;
		border-radius: 50%;
		background: rgba(0, 0, 0, 0.65);
		color: #fff;
		opacity: 0;
		transition: opacity 0.2s ease;
	}
	.up-cell:hover .up-cell__remove,
	.up-cell__remove:focus-visible {
		opacity: 1;
	}
	@media (hover: none) {
		.up-cell__remove {
			opacity: 1;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.up-cell[data-status="send"] .up-cell__frame {
			animation: none;
		}
	}
	.up-proof {
		display: flex;
		align-items: center;
		gap: 1.25rem;
		padding: 1rem;
		border-radius: 14px;
		border: 1px solid var(--hair);
		background: color-mix(in srgb, var(--fg) 3%, transparent);
	}
	.up-proof__frame {
		position: relative;
		width: clamp(120px, 22vw, 200px);
		aspect-ratio: 4 / 3;
		flex-shrink: 0;
		overflow: hidden;
		border-radius: 8px;
		background: var(--surface);
	}
	.up-proof__tag {
		position: absolute;
		left: 0.5rem;
		bottom: 0.5rem;
		padding: 0.15rem 0.6rem;
		border-radius: 999px;
		background: rgba(0, 0, 0, 0.65);
		color: #fff;
		font-size: 0.68rem;
		letter-spacing: 0.06em;
	}
	/* Baris data lembar: label kicker + isian tanpa bingkai, dipisah garis
	   rambut — bahasa yang sama dengan panel lisensi. */
	.up-row {
		display: flex;
		align-items: baseline;
		gap: 1.25rem;
		padding: 1rem 0.25rem;
		border-bottom: 1px solid var(--hair);
	}
	.up-row--top {
		align-items: flex-start;
	}
	.up-row .kicker {
		width: 11rem;
		flex-shrink: 0;
	}
	.up-input {
		flex: 1;
		min-width: 0;
		background: transparent;
		border: 0;
		outline: none;
		color: var(--fg);
		font-size: 0.95rem;
	}
	.up-input::placeholder {
		color: color-mix(in srgb, var(--fg-muted) 60%, transparent);
	}
	.up-input:focus {
		color: var(--fg);
	}
	.up-row:focus-within .kicker {
		color: var(--safelight);
	}
	@media (max-width: 640px) {
		.up-row {
			flex-direction: column;
			gap: 0.4rem;
		}
		.up-row .kicker {
			width: auto;
		}
	}

	/* ── Unggah: segera hadir ─────────────────────────────────────────── */
	.up-soon {
		max-width: 34rem;
		margin-top: 2.5rem;
	}
	.up-soon__frames {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 0.75rem;
	}
	.up-soon__frame {
		display: grid;
		place-items: center;
		aspect-ratio: 3 / 4;
		border-radius: 10px;
		border: 1px dashed color-mix(in srgb, var(--fg) 16%, transparent);
	}
	/* Bingkai yang menyala memudar ke kanan: yang lain makin redup. */
	.up-soon__frame:nth-child(3) {
		border-color: color-mix(in srgb, var(--fg) 11%, transparent);
	}
	.up-soon__frame:nth-child(4) {
		border-color: color-mix(in srgb, var(--fg) 7%, transparent);
	}
	.up-soon__frame--lit {
		color: var(--safelight);
		border: 1px solid color-mix(in srgb, var(--safelight) 70%, transparent);
		background: color-mix(in srgb, var(--safelight) 8%, transparent);
		animation: up-soon-glow 3.6s ease-in-out infinite;
	}
	@keyframes up-soon-glow {
		0%,
		100% {
			box-shadow: 0 0 0 0 color-mix(in srgb, var(--safelight) 0%, transparent);
		}
		50% {
			box-shadow: 0 0 34px -4px color-mix(in srgb, var(--safelight) 45%, transparent);
		}
	}
	.up-soon__title {
		margin-top: 2rem;
		font-family: var(--font-display);
		font-size: 1.6rem;
		font-weight: 300;
		letter-spacing: -0.015em;
		color: var(--fg);
	}
	.up-soon__body {
		margin-top: 0.75rem;
		max-width: 46ch;
		font-size: 0.95rem;
		line-height: 1.65;
		color: var(--fg-muted);
	}
	@media (prefers-reduced-motion: reduce) {
		.up-soon__frame--lit {
			animation: none;
		}
	}

	.pp-ghost {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 0.6rem 1.2rem;
		border-radius: 999px;
		border: 1px solid var(--hair);
		color: var(--fg);
		font-size: 0.85rem;
		font-weight: 500;
		transition: border-color 0.2s ease, color 0.2s ease;
	}
	.pp-ghost:hover {
		border-color: var(--safelight);
		color: var(--safelight);
	}
	.pp-ghost:disabled {
		opacity: 0.6;
	}

	.pp :is(button, a):focus-visible {
		outline: 2px solid var(--safelight);
		outline-offset: 2px;
	}

	@media (prefers-reduced-motion: reduce) {
		.pp * {
			transition: none !important;
		}
	}
</style>
