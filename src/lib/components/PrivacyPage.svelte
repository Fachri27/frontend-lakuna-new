<script lang="ts">
	import { i18n, type Lang } from "$lib/i18n.svelte";
	import { ADDRESS, COMPANY } from "$lib/contact";
	import ClauseDoc, { type Clause } from "./ClauseDoc.svelte";

	const copy: Record<Lang, { title: string; sub: string; meta: string; rail: string; clauses: Clause[]; contactNote: string; contactLink: string }> = {
		id: {
			title: "Kebijakan Privasi",
			sub: "Data pribadi apa yang kami kumpulkan saat kamu memakai Lakuna, untuk apa, dan pilihan yang kamu punya.",
			meta: "Versi 2026.10, diperbarui 2 Oktober 2026",
			rail: "Daftar isi",
			clauses: [
				{
					id: "siapa",
					title: "Siapa kami",
					body: [
						`Lakuna Stock dijalankan oleh ${COMPANY}, ${ADDRESS}.`,
						"Kebijakan ini menjelaskan data pribadi yang kami kumpulkan saat kamu memakai situs, alasannya, dan pilihanmu.",
					],
				},
				{
					id: "data",
					title: "Data yang kami kumpulkan",
					body: [
						"Akun: nama pengguna, alamat email, dan kata sandi (disimpan dalam bentuk ter-hash, bukan teks biasa). Secara opsional nama aslimu dan foto profil. Bila kamu masuk dengan Google, kami menerima nama, email, dan foto profil yang dibagikan Google.",
						"Aktivitas: favorit, keranjang, pesanan, unduhan, lisensi, dan status langganan, supaya layanan berjalan dan pembelianmu tetap bisa kamu akses.",
						"Pembayaran: kamu membayar lewat penyedia pembayaran. Kami menerima data pesanan dan status pembayaran, bukan nomor kartu lengkapmu.",
						"Kontributor: karya yang kamu unggah, nama yang kamu pakai untuk menayangkannya, serta metode dan referensi payout saat kami membayar pendapatanmu.",
						"Data teknis: alamat IP, jenis peramban, dan catatan permintaan dasar, dipakai untuk menjaga keamanan situs dan membatasi penyalahgunaan.",
						"Newsletter: bila kamu setuju menerima kabar dari kami, emailmu dipakai untuk itu.",
					],
				},
				{
					id: "penggunaan",
					title: "Cara kami memakai data",
					body: [
						"Membuat dan mengamankan akunmu; memproses pesanan, langganan, dan unduhan; menerbitkan sertifikat lisensi; membayar kontributor; menjawab permintaan bantuan; mengirim pesan layanan seperti tanda terima dan pemberitahuan langganan; mencegah penipuan dan penyalahgunaan; serta memperbaiki situs.",
					],
				},
				{
					id: "berbagi",
					title: "Dengan siapa kami berbagi",
					body: [
						"Penyedia pembayaran (misalnya Midtrans) untuk memproses pembayaran; Google bila kamu memilih masuk dengan Google dan untuk memuat huruf; serta penyedia penyimpanan dan hosting yang menyimpan berkas dan menjalankan layanan.",
						"Kami hanya membagikan yang dibutuhkan masing-masing untuk bekerja. Kami tidak menjual data pribadimu.",
					],
				},
				{
					id: "cookie",
					title: "Cookie dan penyimpanan lokal",
					body: [
						"Kami tidak memakai cookie iklan. Kami memakai penyimpanan lokal peramban untuk menjagamu tetap masuk, mengingat pilihan bahasa, tampilan, aksesibilitas, dan suara, serta menyimpan sebagian data beranda agar halaman lebih cepat dimuat.",
						"Situs tidak memuat skrip iklan pihak ketiga. Huruf dan fitur masuk dengan Google dimuat dari Google.",
						"Hapus data situs di pengaturan peramban untuk menghilangkan semuanya; kamu akan keluar dari akun. Rincian apa yang tersimpan, beserta tombol untuk menghapusnya, ada di halaman Preferensi cookie (/cookies).",
					],
				},
				{
					id: "simpan",
					title: "Berapa lama kami menyimpan data",
					body: [
						"Data akun kami simpan selama akunmu aktif. Catatan pesanan, pembayaran, dan lisensi kami simpan selama dibutuhkan untuk pembukuan, pajak, dan kewajiban hukum, serta agar lisensimu tetap berlaku.",
						"Bila data sudah tidak kami perlukan, kami menghapus atau menganonimkannya.",
					],
				},
				{
					id: "hak",
					title: "Hakmu",
					body: [
						"Kamu bisa meminta untuk melihat data pribadi yang kami simpan, memperbaikinya, menghapus akunmu, atau menarik persetujuan bila kami mengandalkannya, sesuai Undang-Undang Pelindungan Data Pribadi (UU No. 27 Tahun 2022).",
						"Hubungi layanan pelanggan dan sebutkan akun mana yang dimaksud. Kami mungkin perlu memastikan bahwa itu memang kamu.",
					],
				},
				{
					id: "keamanan",
					title: "Keamanan",
					body: [
						"Kata sandi disimpan ter-hash. Berkas disajikan lewat tautan yang kedaluwarsa. Tidak ada sistem yang sepenuhnya aman; bila pelanggaran data memengaruhimu, kami akan memberi tahu sesuai ketentuan hukum.",
					],
				},
				{
					id: "perubahan",
					title: "Perubahan kebijakan",
					body: [
						"Kami memperbarui kebijakan ini saat praktik kami berubah. Tanggal di bagian atas menunjukkan versi terbaru. Untuk perubahan penting, kami akan memberi tahu di situs.",
					],
				},
			],
			contactNote: "Pertanyaan soal privasi atau permintaan atas datamu?",
			contactLink: "Hubungi layanan pelanggan",
		},
		en: {
			title: "Privacy Policy",
			sub: "What personal data we collect when you use Lakuna, why, and the choices you have.",
			meta: "Version 2026.10, updated October 2, 2026",
			rail: "Contents",
			clauses: [
				{
					id: "who",
					title: "Who we are",
					body: [
						`Lakuna Stock is run by ${COMPANY}, ${ADDRESS}.`,
						"This policy explains the personal data we collect when you use the site, why we collect it, and what choices you have.",
					],
				},
				{
					id: "data",
					title: "What we collect",
					body: [
						"Account: username, email address, and a password (stored hashed, never in plain text). Optionally your name and a profile picture. If you sign in with Google, we receive the name, email address, and profile picture Google shares with us.",
						"Activity: favorites, cart, orders, downloads, licenses, and subscription status, so the service works and your purchases stay available to you.",
						"Payments: you pay through our payment provider. We receive your order and payment status, not your full card number.",
						"Contributors: the work you upload, the name you publish it under, and the payout method and reference when we pay your earnings.",
						"Technical data: IP address, browser type, and basic request logs, used to keep the site secure and to limit abuse.",
						"Newsletter: if you agree to receive our updates, we use your email for that.",
					],
				},
				{
					id: "use",
					title: "How we use it",
					body: [
						"To create and secure your account; process orders, subscriptions, and downloads; issue license certificates; pay contributors; answer support requests; send service messages such as receipts and subscription notices; prevent fraud and abuse; and improve the site.",
					],
				},
				{
					id: "share",
					title: "Who we share it with",
					body: [
						"Payment providers (such as Midtrans) to process payments; Google when you choose Google sign-in and to load fonts; and the storage and hosting providers that hold our files and run the service.",
						"We share only what each one needs to do its job. We do not sell your personal data.",
					],
				},
				{
					id: "cookies",
					title: "Cookies and local storage",
					body: [
						"We do not use advertising cookies. We use your browser's local storage to keep you signed in, remember your language, display, accessibility, and sound choices, and cache parts of the home page so it loads faster.",
						"The site does not load third-party advertising scripts. Fonts and Google sign-in are loaded from Google.",
						"Clear the site's data in your browser settings to remove all of this; you will be signed out. The details of what is stored, with a button to clear it, are on the Cookie preferences page (/cookies).",
					],
				},
				{
					id: "keep",
					title: "How long we keep it",
					body: [
						"We keep account data while your account is active. We keep order, payment, and license records as long as needed for accounting, tax, and legal obligations, and so your licenses stay valid.",
						"When we no longer need data, we delete or anonymise it.",
					],
				},
				{
					id: "rights",
					title: "Your rights",
					body: [
						"You can ask to see the personal data we hold about you, correct it, delete your account, or withdraw consent where we rely on it, under Indonesia's Personal Data Protection Law (Law No. 27 of 2022).",
						"Contact customer service and tell us which account the request is about. We may need to verify it is you.",
					],
				},
				{
					id: "security",
					title: "Security",
					body: [
						"Passwords are stored hashed. Files are served through links that expire. No system is perfectly secure; if a data breach affects you, we will notify you as the law requires.",
					],
				},
				{
					id: "changes",
					title: "Changes to this policy",
					body: [
						"We update this policy when our practices change. The date at the top shows the latest version. For material changes we will tell you on the site.",
					],
				},
			],
			contactNote: "Questions about privacy, or a request about your data?",
			contactLink: "Contact customer service",
		},
	};

	const lang = $derived<Lang>(i18n.lang);
	const t = $derived(copy[lang]);
</script>

<ClauseDoc title={t.title} sub={t.sub} meta={t.meta} clauses={t.clauses} railLabel={t.rail}>
	{#snippet after()}
		<p class="priv-foot">
			{t.contactNote}
			<a href="/customer-service" class="cd-link">{t.contactLink}</a>
		</p>
	{/snippet}
</ClauseDoc>

<style>
	.priv-foot {
		margin-top: 3.5rem;
		padding-top: 1.75rem;
		border-top: 1px solid var(--hair);
		font-size: 0.95rem;
		color: var(--fg-muted);
	}
	.priv-foot :global(a) {
		margin-left: 0.4rem;
	}
</style>
