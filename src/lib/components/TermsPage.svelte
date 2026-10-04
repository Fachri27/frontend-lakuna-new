<script lang="ts">
	import { i18n, type Lang } from "$lib/i18n.svelte";
	import { ADDRESS, COMPANY } from "$lib/contact";
	import ClauseDoc, { type Clause } from "./ClauseDoc.svelte";

	/**
	 * Ketentuan Penggunaan situs. Dokumen sendiri: lisensi karya ada di /license,
	 * data pribadi di /privacy, penyimpanan di perangkat di /cookies.
	 */
	const copy: Record<Lang, {
		title: string; sub: string; meta: string; rail: string; clauses: Clause[];
		relatedTitle: string; related: { href: string; label: string; note: string }[];
		contactNote: string; contactLink: string;
	}> = {
		id: {
			title: "Ketentuan Penggunaan",
			sub: "Aturan memakai situs Lakuna Stock: akunmu, apa yang boleh dan tidak, membeli, dan menjual karya.",
			meta: "Versi 2026.10, diperbarui 4 Oktober 2026",
			rail: "Daftar isi",
			clauses: [
				{
					id: "tentang",
					title: "Tentang ketentuan ini",
					body: [
						`Lakuna Stock dijalankan oleh ${COMPANY}, ${ADDRESS}. Dengan membuat akun atau memakai situs ini, kamu setuju dengan ketentuan di halaman ini. Bila kamu tidak setuju, jangan memakai situs.`,
						"Ketentuan ini tentang memakai situsnya. Hak memakai karya yang kamu unduh diatur terpisah di Perjanjian Lisensi, dan data pribadimu di Kebijakan Privasi (tautan di bagian bawah).",
					],
				},
				{
					id: "akun",
					title: "Akunmu",
					body: [
						"Kamu cukup umur menurut hukum untuk membuat perjanjian, atau memakai situs dengan persetujuan orang tua atau walimu.",
						"Data yang kamu berikan harus benar. Kamu menjaga kata sandimu dan bertanggung jawab atas yang terjadi di akunmu. Satu akun dipakai satu orang; lisensi dari akunmu tidak boleh dibagikan ke akun lain.",
						"Beri tahu kami bila akunmu dipakai tanpa izin. Kami dapat menangguhkan atau menutup akun yang melanggar ketentuan ini.",
					],
				},
				{
					id: "penggunaan",
					title: "Memakai situs",
					body: [
						"Kamu boleh menelusuri arsip, mencari, menyimpan favorit, dan membeli lisensi untuk dipakai sesuai Perjanjian Lisensi.",
						"Yang tidak boleh: mengunduh arsip secara massal atau otomatis tanpa izin tertulis; menembus atau mengganggu keamanan situs; mengunggah berkas berbahaya; menghapus atau menyamarkan watermark pada pratinjau; memakai pratinjau ber-watermark untuk keperluan produksi; dan memakai situs untuk melanggar hukum.",
					],
				},
				{
					id: "konten",
					title: "Karya dan hak cipta",
					body: [
						"Karya di arsip dimiliki perajangga yang mengunggahnya. Lakuna menayangkan dan melisensikannya atas nama mereka.",
						"Pratinjau ber-watermark hanya untuk menilai karya sebelum membeli. Hak memakai karya berasal dari lisensi yang kamu beli, bukan dari mengunduh pratinjau.",
						"Bila kamu melihat karya yang melanggar hakmu, hubungi layanan pelanggan dengan tautan karyanya dan buktinya. Kami akan menelaahnya dan dapat menurunkan karya itu.",
					],
				},
				{
					id: "pembelian",
					title: "Pembelian dan pembayaran",
					body: [
						"Ada dua jenis lisensi: Standar untuk satu bingkai, dan Subscription untuk kuota unduhan bulanan. Harga, kuota, dan masa berlakunya tertera di halaman Harga sebelum kamu membayar. Harga dalam rupiah.",
						"Pembayaran diproses penyedia pembayaran. Pesanan sah setelah pembayarannya terkonfirmasi, dan sertifikat lisensi dalam PDF menyertai tiap unduhan.",
						"Voucher dan diskon punya syarat sendiri yang tertulis bersama penawarannya. Bila ada masalah dengan berkas atau pembayaran, hubungi layanan pelanggan dan sebutkan nomor pesananmu.",
					],
				},
				{
					id: "kontributor",
					title: "Bila kamu menjual karya",
					body: [
						"Karya yang kamu unggah ditinjau tim kami sebelum tayang, dan hanya yang disetujui masuk arsip. Kami dapat menolak atau menurunkan karya yang tidak memenuhi syarat atau melanggar hak orang lain.",
						"Kamu menyatakan memiliki hak atas karya itu, serta izin yang diperlukan dari orang, properti, atau tempat yang tampak di dalamnya.",
						"70% dari setiap penjualan kembali ke kamu. Pendapatanmu dibayarkan lewat metode yang kamu sampaikan di akun kontributor.",
					],
				},
				{
					id: "layanan",
					title: "Ketersediaan layanan",
					body: [
						"Kami berusaha menjaga situs tetap berjalan, tetapi tidak menjanjikan situs selalu bebas gangguan. Kami dapat mengubah, menghentikan sementara, atau menghentikan fitur, dan akan memberi tahu bila perubahannya berdampak pada pembelian yang sudah kamu lakukan.",
					],
				},
				{
					id: "tanggung-jawab",
					title: "Batas tanggung jawab",
					body: [
						"Situs disediakan sebagaimana adanya. Sejauh diizinkan hukum, Lakuna tidak bertanggung jawab atas kerugian tidak langsung atau akibat, dan tanggung jawab kami atas satu transaksi tidak melebihi jumlah yang kamu bayarkan untuk transaksi itu.",
						"Ketentuan ini tidak membatasi hak yang tidak dapat dikesampingkan menurut hukum perlindungan konsumen yang berlaku.",
					],
				},
				{
					id: "perubahan",
					title: "Perubahan ketentuan",
					body: [
						"Kami memperbarui ketentuan ini bila praktik atau hukum berubah. Tanggal di bagian atas menunjukkan versi terbaru. Untuk perubahan yang penting, kami akan memberi tahu di situs.",
					],
				},
				{
					id: "hukum",
					title: "Hukum yang berlaku",
					body: [
						"Ketentuan ini tunduk pada hukum Republik Indonesia. Bila ada sengketa, kita upayakan menyelesaikannya dengan musyawarah lebih dulu; bila tidak berhasil, melalui pengadilan yang berwenang di Indonesia.",
					],
				},
			],
			relatedTitle: "Dokumen terkait",
			related: [
				{ href: "/license", label: "Perjanjian Lisensi", note: "Apa yang boleh kamu lakukan dengan karya yang kamu unduh." },
				{ href: "/privacy", label: "Kebijakan Privasi", note: "Data pribadi yang kami kumpulkan dan pilihanmu." },
				{ href: "/cookies", label: "Preferensi cookie", note: "Apa yang tersimpan di perangkatmu dan cara menghapusnya." },
			],
			contactNote: "Ada pertanyaan tentang ketentuan ini?",
			contactLink: "Hubungi layanan pelanggan",
		},
		en: {
			title: "Terms of Use",
			sub: "The rules for using Lakuna Stock: your account, what you can and can't do, buying, and selling work.",
			meta: "Version 2026.10, updated 4 October 2026",
			rail: "Contents",
			clauses: [
				{
					id: "about",
					title: "About these terms",
					body: [
						`Lakuna Stock is run by ${COMPANY}, ${ADDRESS}. By creating an account or using this site, you agree to the terms on this page. If you don't agree, please don't use the site.`,
						"These terms are about using the site. Your right to use the work you download is set out separately in the License Agreement, and your personal data in the Privacy Policy (links at the bottom).",
					],
				},
				{
					id: "account",
					title: "Your account",
					body: [
						"You are old enough under the law to enter an agreement, or you use the site with the consent of a parent or guardian.",
						"The information you give must be accurate. You keep your password safe and are responsible for what happens in your account. One account is for one person; licenses from your account must not be shared with other accounts.",
						"Tell us if your account is used without your permission. We may suspend or close accounts that break these terms.",
					],
				},
				{
					id: "use",
					title: "Using the site",
					body: [
						"You can browse the archive, search, save favourites, and buy licenses to use under the License Agreement.",
						"You may not: download the archive in bulk or automatically without written permission; breach or disrupt the site's security; upload harmful files; remove or disguise the watermark on previews; use watermarked previews in production; or use the site to break the law.",
					],
				},
				{
					id: "content",
					title: "Work and copyright",
					body: [
						"The work in the archive belongs to the image-makers who uploaded it. Lakuna publishes and licenses it on their behalf.",
						"Watermarked previews are only for judging a work before you buy. Your right to use a work comes from the license you buy, not from downloading a preview.",
						"If you see work that infringes your rights, contact customer service with a link to it and your evidence. We will review it and may take the work down.",
					],
				},
				{
					id: "purchases",
					title: "Purchases and payment",
					body: [
						"There are two kinds of license: Standard for a single frame, and Subscription for a monthly download quota. Prices, quotas, and validity are shown on the Pricing page before you pay. Prices are in rupiah.",
						"Payments are processed by a payment provider. An order is valid once its payment is confirmed, and a PDF license certificate comes with every download.",
						"Vouchers and discounts have their own conditions, stated with the offer. If there is a problem with a file or a payment, contact customer service and give your order number.",
					],
				},
				{
					id: "contributors",
					title: "If you sell work",
					body: [
						"Work you upload is reviewed by our team before it goes live, and only approved work enters the archive. We may reject or take down work that doesn't meet the requirements or infringes other people's rights.",
						"You state that you own the rights to the work, and have the permissions needed from any people, property, or places shown in it.",
						"70% of every sale goes back to you. Your earnings are paid through the method you provide in your contributor account.",
					],
				},
				{
					id: "service",
					title: "Availability of the service",
					body: [
						"We work to keep the site running, but we don't promise it will always be free of interruption. We may change, pause, or stop features, and will tell you if a change affects a purchase you have already made.",
					],
				},
				{
					id: "liability",
					title: "Limit of liability",
					body: [
						"The site is provided as is. To the extent the law allows, Lakuna is not liable for indirect or consequential loss, and our liability for any one transaction does not exceed the amount you paid for that transaction.",
						"These terms do not limit any rights that cannot be waived under applicable consumer protection law.",
					],
				},
				{
					id: "changes",
					title: "Changes to these terms",
					body: [
						"We update these terms when our practices or the law change. The date at the top shows the latest version. For material changes we will tell you on the site.",
					],
				},
				{
					id: "law",
					title: "Governing law",
					body: [
						"These terms are governed by the laws of the Republic of Indonesia. If a dispute arises, we will try to settle it by discussion first; failing that, through the competent courts in Indonesia.",
					],
				},
			],
			relatedTitle: "Related documents",
			related: [
				{ href: "/license", label: "License Agreement", note: "What you may do with the work you download." },
				{ href: "/privacy", label: "Privacy Policy", note: "The personal data we collect and your choices." },
				{ href: "/cookies", label: "Cookie preferences", note: "What is stored on your device and how to clear it." },
			],
			contactNote: "Questions about these terms?",
			contactLink: "Contact customer service",
		},
	};

	const lang = $derived<Lang>(i18n.lang);
	const t = $derived(copy[lang]);
</script>

<ClauseDoc title={t.title} sub={t.sub} meta={t.meta} clauses={t.clauses} railLabel={t.rail}>
	{#snippet after()}
		<section class="tm-related" aria-labelledby="tm-related-h">
			<h2 id="tm-related-h" class="tm-related-h">{t.relatedTitle}</h2>
			<ul class="tm-list">
				{#each t.related as r (r.href)}
					<li>
						<a href={r.href} class="cd-link">{r.label}</a>
						<span class="tm-note">{r.note}</span>
					</li>
				{/each}
			</ul>
		</section>
		<p class="tm-foot">
			{t.contactNote}
			<a href="/customer-service" class="cd-link">{t.contactLink}</a>
		</p>
	{/snippet}
</ClauseDoc>

<style>
	.tm-related {
		margin-top: 3.5rem;
		padding-top: 1.75rem;
		border-top: 1px solid var(--hair);
	}
	.tm-related-h {
		font-family: var(--font-display);
		font-size: 1.15rem;
		font-weight: 500;
	}
	.tm-list {
		display: grid;
		gap: 0.9rem;
		margin-top: 1.1rem;
		padding: 0;
		list-style: none;
	}
	.tm-list li {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
	}
	.tm-note {
		font-size: 0.92rem;
		color: var(--fg-muted);
	}
	.tm-foot {
		margin-top: 2.5rem;
		font-size: 0.95rem;
		color: var(--fg-muted);
	}
	.tm-foot :global(a) {
		margin-left: 0.4rem;
	}
</style>
