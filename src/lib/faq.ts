import type { Lang } from "$lib/i18n.svelte";

/**
 * Pertanyaan umum — satu sumber untuk halaman /faq dan asisten bantuan
 * (ChatBot.svelte), supaya jawabannya tak pernah berbeda.
 */
export type QA = { q: string; a: string; link?: { href: string; label: string } };
export type Group = { title: string; items: QA[] };

export type FaqCopy = {
	title: string; sub: string; search: string; none: string; noneCta: string;
	stillTitle: string; stillBody: string; stillCta: string; groups: Group[];
};

export const FAQ: Record<Lang, FaqCopy> = {
	id: {
		title: "Pertanyaan umum",
		sub: "Jawaban singkat tentang lisensi, pembelian, langganan, dan karya perajangga",
		search: "Cari pertanyaan",
		none: "Tidak ada pertanyaan yang cocok dengan",
		noneCta: "Tanyakan ke layanan pelanggan",
		stillTitle: "Belum ketemu jawabannya?",
		stillBody: "Tim layanan pelanggan kami siap membantu",
		stillCta: "Hubungi layanan pelanggan",
		groups: [
			{
				title: "Lisensi",
				items: [
					{
						q: "Apa beda lisensi Standar dan Subscription?",
						a: "Standar: bayar sekali untuk satu bingkai, berlaku selamanya, untuk satu pengguna. Subscription: unduh sebanyak kuota bulanan selama langganan aktif; lisensinya mengikuti masa langgananmu",
					},
					{
						q: "Bolehkah dipakai untuk keperluan komersial?",
						a: "Boleh: iklan, situs, media sosial, kemasan, presentasi, dan pekerjaan klien. Standar berlaku selamanya, Subscription selama langganan aktif",
						link: { href: "/license", label: "Baca perjanjian lisensi" },
					},
					{
						q: "Apa yang tidak boleh dilakukan dengan gambar?",
						a: "Menjual kembali atau membagikan ulang berkas sebagai produk mandiri, membagikan berkas mentah ke pihak lain, memakainya untuk merek dagang atau logo, dan menjadikannya data latih model AI",
						link: { href: "/license#pasal-3", label: "Lihat daftar lengkapnya" },
					},
					{
						q: "Siapa pemilik hak ciptanya?",
						a: "Hak cipta tetap pada fotografer dan/atau Lakuna. Lisensi memberimu hak pakai, bukan kepemilikan",
					},
					{
						q: "Apakah aku mendapat dokumen lisensi?",
						a: "Ya. Setiap unduhan disertai sertifikat lisensi dalam PDF",
					},
				],
			},
			{
				title: "Membeli dan mengunduh",
				items: [
					{
						q: "Kenapa gambar yang kulihat ada watermark-nya?",
						a: "Pratinjau di situs berresolusi rendah dan ber-watermark. Setelah dibayar, kamu mendapat berkas penuh tanpa watermark",
					},
					{
						q: "Di mana aku menemukan unduhanku?",
						a: "Di profilmu, bagian Unduhan Saya. Di sana kamu bisa mengunduh berkas dan sertifikat lisensinya",
						link: { href: "/help#unduh", label: "Panduan mengunduh" },
					},
					{
						q: "Metode pembayaran apa saja yang tersedia?",
						a: "Pembayaran diproses lewat penyedia pembayaran. Pilihannya mencakup transfer bank, QRIS, GoPay, dan kartu kredit; metode yang tersedia ditampilkan saat kamu membayar",
					},
					{
						q: "Apakah harga sudah termasuk pajak?",
						a: "Ya, harga sudah termasuk pajak",
					},
					{
						q: "Bisakah memakai voucher?",
						a: "Bisa. Diskon terbesar antara diskon event dan voucher dipakai otomatis. Kode voucher dimasukkan di halaman Harga",
						link: { href: "/help#voucher", label: "Cara memakai voucher" },
					},
					{
						q: "Apakah aku perlu akun?",
						a: "Ya, untuk membeli dan mengunduh kamu perlu masuk. Kamu bisa masuk dengan email atau akun Google",
					},
				],
			},
			{
				title: "Langganan",
				items: [
					{
						q: "Pilih Tahunan atau Bulanan?",
						a: "Tahunan dibayar di muka dan totalnya lebih murah daripada dua belas kali bayar bulanan. Bulanan dibayar setiap bulan",
						link: { href: "/pricing", label: "Lihat harga" },
					},
					{
						q: "Apa yang terjadi saat langgananku berakhir?",
						a: "Lisensi mengikuti langganan yang aktif, jadi unduhan baru ikut berhenti. Berkas yang sudah kamu unduh selama langganan aktif tetap dalam lisensinya",
					},
					{
						q: "Bagaimana mengubah atau membatalkan langganan?",
						a: "Hubungi layanan pelanggan dan sebutkan email akunmu",
					},
				],
			},
			{
				title: "Perajangga",
				items: [
					{
						q: "Bagaimana cara menjadi kontributor?",
						a: "Fitur unggah untuk kontributor sedang disiapkan dan segera hadir",
						link: { href: "/contributor", label: "Lihat halaman kontributor" },
					},
					{
						q: "Berapa penghasilan perajangga?",
						a: "70% dari setiap penjualan kembali ke perajangga",
					},
					{
						q: "Apakah semua unggahan langsung tayang?",
						a: "Tidak. Setiap bingkai ditinjau dulu, dan hanya karya yang disetujui yang masuk arsip",
					},
				],
			},
		],
	},
	en: {
		title: "Frequently asked questions",
		sub: "Quick answers about licensing, buying, subscriptions, and image-makers",
		search: "Search questions",
		none: "No questions match",
		noneCta: "Ask customer service",
		stillTitle: "Didn't find the answer?",
		stillBody: "Our customer service team is here to help",
		stillCta: "Contact customer service",
		groups: [
			{
				title: "Licensing",
				items: [
					{
						q: "What is the difference between Standard and Subscription?",
						a: "Standard: pay once for a single frame, valid forever, for one user. Subscription: download up to your monthly quota while the subscription is active; the license follows your subscription term",
					},
					{
						q: "Can I use images commercially?",
						a: "Yes: ads, websites, social media, packaging, presentations, and client work. Standard is valid forever, Subscription while it is active",
						link: { href: "/license", label: "Read the license agreement" },
					},
					{
						q: "What can't I do with an image?",
						a: "Resell or redistribute files as standalone products, share raw files with others, use them for trademarks or logos, or use them as training data for AI models",
						link: { href: "/license#pasal-3", label: "See the full list" },
					},
					{
						q: "Who owns the copyright?",
						a: "Copyright stays with the photographer and/or Lakuna. A license gives you usage rights, not ownership",
					},
					{
						q: "Do I get a license document?",
						a: "Yes. Every download comes with a PDF license certificate",
					},
				],
			},
			{
				title: "Buying and downloading",
				items: [
					{
						q: "Why does the image I see have a watermark?",
						a: "Previews on the site are low resolution and watermarked. Once you pay, you get the full file with no watermark",
					},
					{
						q: "Where do I find my downloads?",
						a: "In your profile, under My Downloads. There you can download the file and its license certificate",
						link: { href: "/help#download", label: "Guide to downloading" },
					},
					{
						q: "Which payment methods can I use?",
						a: "Payments are processed through our payment provider. Options include bank transfer, QRIS, GoPay, and credit card; the methods available are shown when you pay",
					},
					{
						q: "Do prices include tax?",
						a: "Yes, prices include tax",
					},
					{
						q: "Can I use a voucher?",
						a: "Yes. The larger of the event discount and the voucher is applied automatically. Enter voucher codes on the Pricing page",
						link: { href: "/help#voucher", label: "How to use a voucher" },
					},
					{
						q: "Do I need an account?",
						a: "Yes, you need to sign in to buy and download. You can sign in with email or a Google account",
					},
				],
			},
			{
				title: "Subscriptions",
				items: [
					{
						q: "Should I choose Annual or Monthly?",
						a: "Annual is paid upfront and costs less than twelve monthly payments. Monthly is billed every month",
						link: { href: "/pricing", label: "See pricing" },
					},
					{
						q: "What happens when my subscription ends?",
						a: "Licenses follow your active subscription, so new downloads stop. Files you downloaded while it was active stay under their license",
					},
					{
						q: "How do I change or cancel my subscription?",
						a: "Contact customer service and tell us your account email",
					},
				],
			},
			{
				title: "Image-makers",
				items: [
					{
						q: "How do I become a contributor?",
						a: "Uploads for contributors are being prepared and are coming soon",
						link: { href: "/contributor", label: "See the contributor page" },
					},
					{
						q: "How much do image-makers earn?",
						a: "70% of every sale goes back to the image-maker",
					},
					{
						q: "Is every upload published right away?",
						a: "No. Every frame is reviewed first, and only approved frames reach the archive",
					},
				],
			},
		],
	},
};
