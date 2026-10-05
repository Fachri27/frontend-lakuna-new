<script lang="ts">
	import { onMount } from "svelte";
	import { i18n, type Lang } from "$lib/i18n.svelte";
	import ClauseDoc, { type Clause } from "./ClauseDoc.svelte";

	/**
	 * Preferensi cookie — halaman sendiri. Situs tidak memakai cookie iklan atau
	 * pelacak analitik; yang tersimpan hanya penyimpanan lokal peramban untuk
	 * menjalankan fitur. Panel di bawah membaca yang BENAR-BENAR ada di perangkat
	 * ini dan membiarkan pengguna menghapusnya.
	 */
	type GroupId = "login" | "prefs" | "cache" | "voucher" | "other";

	/** Kunci penyimpanan situs → kelompoknya (dicocokkan terhadap isi localStorage). */
	const GROUPS: { id: GroupId; test: RegExp }[] = [
		{ id: "login", test: /^lakuna-(access|refresh)-token$/ },
		{ id: "prefs", test: /^lakuna-(lang|skin|access|sound-muted|scramble-muted|hero-sound)$/ },
		{ id: "cache", test: /^lakuna:(url-mem|home-snap)/ },
		{ id: "voucher", test: /^lakuna-voucher/ },
	];

	type Copy = {
		title: string; sub: string; meta: string; rail: string; clauses: Clause[];
		panelTitle: string; panelLead: string;
		groups: Record<GroupId, { name: string; why: string }>;
		stored: string; empty: string; items: (n: number) => string;
		clearCache: string; clearCacheDone: string; clearAll: string; clearAllConfirm: string; clearAllWarn: string; cancel: string;
		cacheHint: string; related: string; privacy: string; terms: string;
	};

	const copy: Record<Lang, Copy> = {
		id: {
			title: "Preferensi Cookie",
			sub: "Apa yang tersimpan di perangkatmu saat memakai Lakuna, untuk apa, dan cara menghapusnya",
			meta: "Versi 2026.10, diperbarui 4 Oktober 2026",
			rail: "Daftar isi",
			clauses: [
				{
					id: "ringkas",
					title: "Singkatnya",
					body: [
						"Kami tidak memakai cookie iklan dan tidak memasang pelacak analitik pihak ketiga. Karena itu tidak ada persetujuan iklan yang perlu kamu atur di sini",
						"Yang kami simpan hanyalah data kecil di peramban (penyimpanan lokal) agar situs berjalan sebagaimana mestinya. Panel di bawah memperlihatkan persis apa yang ada di perangkat ini",
					],
				},
				{
					id: "perlu",
					title: "Yang diperlukan agar kamu tetap masuk",
					body: [
						"Token masuk disimpan agar kamu tidak perlu mengetik ulang kata sandi di setiap halaman. Tanpanya, akunmu, keranjang, dan unduhanmu tidak bisa diakses. Menghapusnya berarti kamu keluar dari akun",
					],
				},
				{
					id: "pilihan",
					title: "Pilihan yang kamu atur",
					body: [
						"Bahasa, tampilan, pengaturan aksesibilitas (ukuran huruf, filter warna), dan pilihan suara disimpan supaya situs ingat preferensimu pada kunjungan berikutnya",
					],
				},
				{
					id: "cepat",
					title: "Untuk mempercepat situs",
					body: [
						"Salinan singkat isi beranda dan ingatan alamat gambar disimpan supaya halaman tampil cepat dan tidak berkedip saat kamu kembali. Isinya data publik arsip, bukan data pribadimu. Aman dihapus kapan saja",
					],
				},
				{
					id: "pihak-ketiga",
					title: "Layanan pihak ketiga",
					body: [
						"Beberapa bagian dimuat dari layanan lain, yang menerima alamat IP dan jenis peramban-mu saat memuatnya: Google (huruf, dan tombol masuk dengan Google bila kamu memakainya), penyedia pembayaran di halaman bayar, serta penyedia peta satelit dan citra malam untuk globe di beranda. Aturan data mereka berlaku di sisi mereka",
					],
				},
				{
					id: "kelola",
					title: "Mengelola data ini",
					body: [
						"Gunakan panel di bawah untuk menghapusnya, atau hapus data situs lewat pengaturan peramban. Menghapus data tidak menghapus akunmu; yang hilang hanya yang tersimpan di perangkat ini",
					],
				},
			],
			panelTitle: "Di perangkat ini",
			panelLead: "Dibaca langsung dari peramban-mu sekarang",
			groups: {
				login: { name: "Masuk akun", why: "Menjaga kamu tetap masuk" },
				prefs: { name: "Preferensi", why: "Bahasa, tampilan, aksesibilitas, suara" },
				cache: { name: "Cache kecepatan", why: "Mempercepat tampilan beranda dan gambar" },
				voucher: { name: "Voucher", why: "Mengingat voucher yang sudah kamu tutup" },
				other: { name: "Lainnya", why: "Data situs lain yang belum dikelompokkan" },
			},
			stored: "Tersimpan",
			empty: "Kosong",
			items: (n) => `${n} item`,
			clearCache: "Hapus cache",
			clearCacheDone: "Cache dihapus",
			clearAll: "Hapus semua data situs",
			clearAllConfirm: "Ya, hapus dan keluar",
			clearAllWarn: "Kamu akan keluar dari akun, dan bahasa, tampilan, serta pilihan suara kembali ke bawaan",
			cancel: "Batal",
			cacheHint: "Cache aman dihapus dan tidak membuatmu keluar",
			related: "Dokumen terkait",
			privacy: "Kebijakan Privasi",
			terms: "Ketentuan Penggunaan",
		},
		en: {
			title: "Cookie Preferences",
			sub: "What is stored on your device when you use Lakuna, what for, and how to clear it",
			meta: "Version 2026.10, updated 4 October 2026",
			rail: "Contents",
			clauses: [
				{
					id: "short",
					title: "In short",
					body: [
						"We don't use advertising cookies and we don't install third-party analytics trackers. So there is no ad consent for you to set here",
						"All we store is small bits of data in your browser (local storage) so the site works properly. The panel below shows exactly what is on this device",
					],
				},
				{
					id: "needed",
					title: "What keeps you signed in",
					body: [
						"Sign-in tokens are stored so you don't have to retype your password on every page. Without them your account, cart, and downloads can't be reached. Clearing them signs you out",
					],
				},
				{
					id: "choices",
					title: "Choices you set",
					body: [
						"Language, display, accessibility settings (text size, colour filters), and sound choices are stored so the site remembers your preferences next time",
					],
				},
				{
					id: "speed",
					title: "To make the site faster",
					body: [
						"A short copy of the home page content and a memory of image addresses are stored so pages load quickly and don't flicker when you come back. It holds public archive data, not your personal data. Safe to clear any time",
					],
				},
				{
					id: "third-party",
					title: "Third-party services",
					body: [
						"Some parts load from other services, which receive your IP address and browser type when they do: Google (fonts, and the Google sign-in button if you use it), the payment provider on the payment page, and the providers of the satellite and night imagery for the home page globe. Their data rules apply on their side",
					],
				},
				{
					id: "manage",
					title: "Managing this data",
					body: [
						"Use the panel below to clear it, or clear site data in your browser settings. Clearing data doesn't delete your account; only what is stored on this device goes",
					],
				},
			],
			panelTitle: "On this device",
			panelLead: "Read straight from your browser right now",
			groups: {
				login: { name: "Sign-in", why: "Keeps you signed in" },
				prefs: { name: "Preferences", why: "Language, display, accessibility, sound" },
				cache: { name: "Speed cache", why: "Speeds up the home page and images" },
				voucher: { name: "Vouchers", why: "Remembers vouchers you've dismissed" },
				other: { name: "Other", why: "Other site data not yet grouped" },
			},
			stored: "Stored",
			empty: "Empty",
			items: (n) => `${n} ${n === 1 ? "item" : "items"}`,
			clearCache: "Clear cache",
			clearCacheDone: "Cache cleared",
			clearAll: "Clear all site data",
			clearAllConfirm: "Yes, clear and sign out",
			clearAllWarn: "You will be signed out, and language, display, and sound choices go back to the defaults",
			cancel: "Cancel",
			cacheHint: "Clearing the cache is safe and doesn't sign you out",
			related: "Related documents",
			privacy: "Privacy Policy",
			terms: "Terms of Use",
		},
	};

	const lang = $derived<Lang>(i18n.lang);
	const t = $derived(copy[lang]);

	// ── Isi penyimpanan perangkat ini ─────────────────────────────────────
	let counts = $state<Record<GroupId, number>>({ login: 0, prefs: 0, cache: 0, voucher: 0, other: 0 });
	let confirming = $state(false);
	let note = $state("");

	const isSiteKey = (k: string) => k.startsWith("lakuna");
	function groupOf(k: string): GroupId {
		return GROUPS.find((g) => g.test.test(k))?.id ?? "other";
	}
	function scan() {
		const c: Record<GroupId, number> = { login: 0, prefs: 0, cache: 0, voucher: 0, other: 0 };
		try {
			for (const store of [localStorage, sessionStorage]) {
				for (let i = 0; i < store.length; i++) {
					const k = store.key(i);
					if (k && isSiteKey(k)) c[groupOf(k)]++;
				}
			}
		} catch {
			/* penyimpanan diblokir: tampil kosong */
		}
		counts = c;
	}
	function removeWhere(pred: (k: string) => boolean) {
		try {
			for (const store of [localStorage, sessionStorage]) {
				const keys: string[] = [];
				for (let i = 0; i < store.length; i++) {
					const k = store.key(i);
					if (k && isSiteKey(k) && pred(k)) keys.push(k);
				}
				keys.forEach((k) => store.removeItem(k));
			}
		} catch {
			/* abaikan */
		}
	}
	function clearCache() {
		removeWhere((k) => groupOf(k) === "cache");
		scan();
		note = t.clearCacheDone;
	}
	function clearAll() {
		removeWhere(() => true);
		// Segarkan penuh supaya token, bahasa, dan tampilan kembali ke bawaan.
		location.reload();
	}

	onMount(scan);
	const order: GroupId[] = ["login", "prefs", "cache", "voucher", "other"];
	const visible = $derived(order.filter((g) => g !== "other" || counts.other > 0));
</script>

<ClauseDoc title={t.title} sub={t.sub} meta={t.meta} clauses={t.clauses} railLabel={t.rail} numbered={false}>
	{#snippet after()}
		<section class="ck-panel" aria-labelledby="ck-h">
			<h2 id="ck-h" class="ck-h">{t.panelTitle}</h2>
			<p class="ck-lead">{t.panelLead}</p>

			<ul class="ck-list">
				{#each visible as g (g)}
					<li class="ck-row">
						<div>
							<p class="ck-name">{t.groups[g].name}</p>
							<p class="ck-why">{t.groups[g].why}</p>
						</div>
						<p class="ck-state" class:is-on={counts[g] > 0}>
							{counts[g] > 0 ? `${t.stored} · ${t.items(counts[g])}` : t.empty}
						</p>
					</li>
				{/each}
			</ul>

			<div class="ck-actions">
				<button type="button" class="ck-btn" onclick={clearCache} data-no-click-sound>{t.clearCache}</button>
				{#if !confirming}
					<button type="button" class="ck-btn ck-btn--warn" onclick={() => (confirming = true)}>{t.clearAll}</button>
				{/if}
			</div>
			<p class="ck-hint" role="status">{note || t.cacheHint}</p>

			{#if confirming}
				<div class="ck-confirm" role="alertdialog" aria-labelledby="ck-confirm-t">
					<p id="ck-confirm-t">{t.clearAllWarn}</p>
					<div class="ck-actions">
						<button type="button" class="ck-btn ck-btn--warn" onclick={clearAll}>{t.clearAllConfirm}</button>
						<button type="button" class="ck-btn" onclick={() => (confirming = false)}>{t.cancel}</button>
					</div>
				</div>
			{/if}
		</section>

		<section class="ck-related" aria-labelledby="ck-rel-h">
			<h2 id="ck-rel-h" class="ck-rel-h">{t.related}</h2>
			<p class="ck-links">
				<a href="/privacy" class="cd-link">{t.privacy}</a>
				<a href="/terms" class="cd-link">{t.terms}</a>
			</p>
		</section>
	{/snippet}
</ClauseDoc>

<style>
	.ck-panel {
		margin-top: 3.5rem;
		padding: clamp(1.25rem, 3vw, 2rem);
		border: 1px solid var(--hair);
		border-radius: 1.1rem;
	}
	.ck-h {
		font-family: var(--font-display);
		font-size: 1.3rem;
		font-weight: 400;
	}
	.ck-lead {
		margin-top: 0.3rem;
		font-size: 0.92rem;
		color: var(--fg-muted);
	}
	.ck-list {
		margin: 1.4rem 0 0;
		padding: 0;
		list-style: none;
	}
	.ck-row {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		justify-content: space-between;
		gap: 0.4rem 1.5rem;
		padding: 0.95rem 0;
		border-top: 1px solid var(--hair);
	}
	.ck-name {
		font-weight: 500;
	}
	.ck-why {
		margin-top: 0.15rem;
		font-size: 0.9rem;
		color: var(--fg-muted);
	}
	.ck-state {
		font-size: 0.9rem;
		font-variant-numeric: tabular-nums;
		color: var(--fg-muted);
	}
	.ck-state.is-on {
		color: var(--fg);
	}
	.ck-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.7rem;
		margin-top: 1.4rem;
	}
	.ck-btn {
		min-height: 46px;
		padding: 0 1.4rem;
		border: 1px solid var(--hair);
		border-radius: 999px;
		background: transparent;
		color: var(--fg);
		font: inherit;
		font-size: 0.93rem;
		cursor: pointer;
		transition: border-color 0.2s ease, color 0.2s ease, background 0.2s ease;
	}
	.ck-btn:hover,
	.ck-btn:focus-visible {
		border-color: var(--safelight);
		color: var(--safelight);
	}
	.ck-btn--warn {
		background: var(--safelight);
		border-color: var(--safelight);
		color: #fff;
	}
	.ck-btn--warn:hover,
	.ck-btn--warn:focus-visible {
		background: var(--safelight-lamp, var(--safelight));
		color: #fff;
	}
	.ck-hint {
		margin-top: 0.9rem;
		min-height: 1.3em;
		font-size: 0.88rem;
		color: var(--fg-muted);
	}
	.ck-confirm {
		margin-top: 1.1rem;
		padding: 1.1rem 1.2rem;
		border: 1px solid var(--safelight);
		border-radius: 0.9rem;
		font-size: 0.95rem;
	}
	.ck-confirm .ck-actions {
		margin-top: 0.9rem;
	}
	.ck-related {
		margin-top: 3rem;
		padding-top: 1.75rem;
		border-top: 1px solid var(--hair);
	}
	.ck-rel-h {
		font-family: var(--font-display);
		font-size: 1.1rem;
		font-weight: 500;
	}
	.ck-links {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem 1.6rem;
		margin-top: 0.9rem;
	}
</style>
