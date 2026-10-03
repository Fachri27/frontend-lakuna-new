<script lang="ts">
	import { i18n, type Lang } from "$lib/i18n.svelte";
	import PageShell from "./PageShell.svelte";

	type QA = { q: string; a: string; link?: { href: string; label: string } };
	type Group = { title: string; items: QA[] };

	const copy: Record<Lang, {
		title: string; sub: string; search: string; none: string; noneCta: string;
		stillTitle: string; stillBody: string; stillCta: string; groups: Group[];
	}> = {
		id: {
			title: "Pertanyaan umum",
			sub: "Jawaban singkat tentang lisensi, pembelian, langganan, dan karya perajangga.",
			search: "Cari pertanyaan",
			none: "Tidak ada pertanyaan yang cocok dengan",
			noneCta: "Tanyakan ke layanan pelanggan",
			stillTitle: "Belum ketemu jawabannya?",
			stillBody: "Tim layanan pelanggan kami siap membantu.",
			stillCta: "Hubungi layanan pelanggan",
			groups: [
				{
					title: "Lisensi",
					items: [
						{
							q: "Apa beda lisensi Standar dan Subscription?",
							a: "Standar: bayar sekali untuk satu bingkai, berlaku selamanya, untuk satu pengguna. Subscription: unduh sebanyak kuota bulanan selama langganan aktif; lisensinya mengikuti masa langgananmu.",
						},
						{
							q: "Bolehkah dipakai untuk keperluan komersial?",
							a: "Boleh: iklan, situs, media sosial, kemasan, presentasi, dan pekerjaan klien. Standar berlaku selamanya, Subscription selama langganan aktif.",
							link: { href: "/license", label: "Baca perjanjian lisensi" },
						},
						{
							q: "Apa yang tidak boleh dilakukan dengan gambar?",
							a: "Menjual kembali atau membagikan ulang berkas sebagai produk mandiri, membagikan berkas mentah ke pihak lain, memakainya untuk merek dagang atau logo, dan menjadikannya data latih model AI.",
							link: { href: "/license#pasal-3", label: "Lihat daftar lengkapnya" },
						},
						{
							q: "Siapa pemilik hak ciptanya?",
							a: "Hak cipta tetap pada fotografer dan/atau Lakuna. Lisensi memberimu hak pakai, bukan kepemilikan.",
						},
						{
							q: "Apakah aku mendapat dokumen lisensi?",
							a: "Ya. Setiap unduhan disertai sertifikat lisensi dalam PDF.",
						},
					],
				},
				{
					title: "Membeli dan mengunduh",
					items: [
						{
							q: "Kenapa gambar yang kulihat ada watermark-nya?",
							a: "Pratinjau di situs berresolusi rendah dan ber-watermark. Setelah dibayar, kamu mendapat berkas penuh tanpa watermark.",
						},
						{
							q: "Di mana aku menemukan unduhanku?",
							a: "Di profilmu, bagian Unduhan Saya. Di sana kamu bisa mengunduh berkas dan sertifikat lisensinya.",
							link: { href: "/help#unduh", label: "Panduan mengunduh" },
						},
						{
							q: "Metode pembayaran apa saja yang tersedia?",
							a: "Pembayaran diproses lewat penyedia pembayaran. Pilihannya mencakup transfer bank, QRIS, GoPay, dan kartu kredit; metode yang tersedia ditampilkan saat kamu membayar.",
						},
						{
							q: "Apakah harga sudah termasuk pajak?",
							a: "Ya, harga sudah termasuk pajak.",
						},
						{
							q: "Bisakah memakai voucher?",
							a: "Bisa. Diskon terbesar antara diskon event dan voucher dipakai otomatis. Kode voucher dimasukkan di halaman Harga.",
							link: { href: "/help#voucher", label: "Cara memakai voucher" },
						},
						{
							q: "Apakah aku perlu akun?",
							a: "Ya, untuk membeli dan mengunduh kamu perlu masuk. Kamu bisa masuk dengan email atau akun Google.",
						},
					],
				},
				{
					title: "Langganan",
					items: [
						{
							q: "Pilih Tahunan atau Bulanan?",
							a: "Tahunan dibayar di muka dan totalnya lebih murah daripada dua belas kali bayar bulanan. Bulanan dibayar setiap bulan.",
							link: { href: "/pricing", label: "Lihat harga" },
						},
						{
							q: "Apa yang terjadi saat langgananku berakhir?",
							a: "Lisensi mengikuti langganan yang aktif, jadi unduhan baru ikut berhenti. Berkas yang sudah kamu unduh selama langganan aktif tetap dalam lisensinya.",
						},
						{
							q: "Bagaimana mengubah atau membatalkan langganan?",
							a: "Hubungi layanan pelanggan dan sebutkan email akunmu.",
						},
					],
				},
				{
					title: "Perajangga",
					items: [
						{
							q: "Bagaimana cara menjadi kontributor?",
							a: "Fitur unggah untuk kontributor sedang disiapkan dan segera hadir.",
							link: { href: "/contributor", label: "Lihat halaman kontributor" },
						},
						{
							q: "Berapa penghasilan perajangga?",
							a: "70% dari setiap penjualan kembali ke perajangga.",
						},
						{
							q: "Apakah semua unggahan langsung tayang?",
							a: "Tidak. Setiap bingkai ditinjau dulu, dan hanya karya yang disetujui yang masuk arsip.",
						},
					],
				},
			],
		},
		en: {
			title: "Frequently asked questions",
			sub: "Quick answers about licensing, buying, subscriptions, and image-makers.",
			search: "Search questions",
			none: "No questions match",
			noneCta: "Ask customer service",
			stillTitle: "Didn't find the answer?",
			stillBody: "Our customer service team is here to help.",
			stillCta: "Contact customer service",
			groups: [
				{
					title: "Licensing",
					items: [
						{
							q: "What is the difference between Standard and Subscription?",
							a: "Standard: pay once for a single frame, valid forever, for one user. Subscription: download up to your monthly quota while the subscription is active; the license follows your subscription term.",
						},
						{
							q: "Can I use images commercially?",
							a: "Yes: ads, websites, social media, packaging, presentations, and client work. Standard is valid forever, Subscription while it is active.",
							link: { href: "/license", label: "Read the license agreement" },
						},
						{
							q: "What can't I do with an image?",
							a: "Resell or redistribute files as standalone products, share raw files with others, use them for trademarks or logos, or use them as training data for AI models.",
							link: { href: "/license#pasal-3", label: "See the full list" },
						},
						{
							q: "Who owns the copyright?",
							a: "Copyright stays with the photographer and/or Lakuna. A license gives you usage rights, not ownership.",
						},
						{
							q: "Do I get a license document?",
							a: "Yes. Every download comes with a PDF license certificate.",
						},
					],
				},
				{
					title: "Buying and downloading",
					items: [
						{
							q: "Why does the image I see have a watermark?",
							a: "Previews on the site are low resolution and watermarked. Once you pay, you get the full file with no watermark.",
						},
						{
							q: "Where do I find my downloads?",
							a: "In your profile, under My Downloads. There you can download the file and its license certificate.",
							link: { href: "/help#download", label: "Guide to downloading" },
						},
						{
							q: "Which payment methods can I use?",
							a: "Payments are processed through our payment provider. Options include bank transfer, QRIS, GoPay, and credit card; the methods available are shown when you pay.",
						},
						{
							q: "Do prices include tax?",
							a: "Yes, prices include tax.",
						},
						{
							q: "Can I use a voucher?",
							a: "Yes. The larger of the event discount and the voucher is applied automatically. Enter voucher codes on the Pricing page.",
							link: { href: "/help#voucher", label: "How to use a voucher" },
						},
						{
							q: "Do I need an account?",
							a: "Yes, you need to sign in to buy and download. You can sign in with email or a Google account.",
						},
					],
				},
				{
					title: "Subscriptions",
					items: [
						{
							q: "Should I choose Annual or Monthly?",
							a: "Annual is paid upfront and costs less than twelve monthly payments. Monthly is billed every month.",
							link: { href: "/pricing", label: "See pricing" },
						},
						{
							q: "What happens when my subscription ends?",
							a: "Licenses follow your active subscription, so new downloads stop. Files you downloaded while it was active stay under their license.",
						},
						{
							q: "How do I change or cancel my subscription?",
							a: "Contact customer service and tell us your account email.",
						},
					],
				},
				{
					title: "Image-makers",
					items: [
						{
							q: "How do I become a contributor?",
							a: "Uploads for contributors are being prepared and are coming soon.",
							link: { href: "/contributor", label: "See the contributor page" },
						},
						{
							q: "How much do image-makers earn?",
							a: "70% of every sale goes back to the image-maker.",
						},
						{
							q: "Is every upload published right away?",
							a: "No. Every frame is reviewed first, and only approved frames reach the archive.",
						},
					],
				},
			],
		},
	};

	const lang = $derived<Lang>(i18n.lang);
	const t = $derived(copy[lang]);

	let query = $state("");
	const q = $derived(query.trim().toLowerCase());
	const groups = $derived(
		t.groups
			.map((g) => ({
				...g,
				items: q ? g.items.filter((it) => `${it.q} ${it.a}`.toLowerCase().includes(q)) : g.items,
			}))
			.filter((g) => g.items.length),
	);
</script>

<PageShell title={t.title} sub={t.sub}>
	<div class="faq-tools">
		<label class="faq-search">
			<span class="sr-only">{t.search}</span>
			<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
			<input type="search" bind:value={query} placeholder={t.search} autocomplete="off" />
		</label>
	</div>

	<div class="faq-groups" aria-live="polite">
		{#each groups as g (g.title)}
			<section class="faq-group">
				<h2 class="faq-group__title">{g.title}</h2>
				<div class="faq-list">
					{#each g.items as it (it.q)}
						<details class="faq-item" open={!!q}>
							<summary>
								<span>{it.q}</span>
								<svg class="faq-ico" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
							</summary>
							<div class="faq-a">
								<p>{it.a}</p>
								{#if it.link}<a href={it.link.href} class="pg-link">{it.link.label}</a>{/if}
							</div>
						</details>
					{/each}
				</div>
			</section>
		{:else}
			<p class="faq-none">
				{t.none} “{query}”. <a href="/customer-service" class="pg-link">{t.noneCta}</a>
			</p>
		{/each}
	</div>

	<section class="pg-rule faq-still">
		<h2 class="pg-h2">{t.stillTitle}</h2>
		<p class="pg-p">{t.stillBody}</p>
		<a href="/customer-service" class="pg-link faq-still__cta">{t.stillCta}</a>
	</section>
</PageShell>

<style>
	.faq-tools {
		margin-top: clamp(2rem, 5vw, 3.5rem);
		max-width: 38rem;
	}
	.faq-search {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding-bottom: 0.8rem;
		border-bottom: 1px solid var(--hair);
		color: var(--fg-muted);
		transition: border-color 0.2s ease;
	}
	.faq-search:focus-within {
		border-bottom-color: var(--safelight);
	}
	.faq-search input {
		flex: 1;
		min-width: 0;
		background: transparent;
		border: 0;
		outline: none;
		font-size: 1.05rem;
		color: var(--fg);
	}
	.faq-search input::placeholder {
		color: var(--fg-muted);
	}
	.faq-groups {
		margin-top: clamp(2.5rem, 6vw, 4.5rem);
	}
	.faq-group {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: 1rem;
	}
	.faq-group + .faq-group {
		margin-top: clamp(2.5rem, 6vw, 4.5rem);
	}
	@media (min-width: 960px) {
		.faq-group {
			grid-template-columns: minmax(0, 4fr) minmax(0, 8fr);
			column-gap: clamp(3rem, 7vw, 8rem);
		}
	}
	.faq-group__title {
		font-family: var(--font-display);
		font-size: clamp(1.3rem, 2vw, 1.7rem);
		font-weight: 300;
		letter-spacing: -0.015em;
		color: var(--fg);
	}
	.faq-list {
		max-width: 52rem;
		border-top: 1px solid var(--hair);
	}
	.faq-item {
		border-bottom: 1px solid var(--hair);
	}
	.faq-item summary {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 1.5rem;
		padding: 1.15rem 0;
		font-size: 1.08rem;
		line-height: 1.45;
		color: var(--fg);
		cursor: pointer;
		list-style: none;
	}
	.faq-item summary::-webkit-details-marker {
		display: none;
	}
	.faq-ico {
		flex: none;
		align-self: center;
		color: var(--fg-muted);
		transition: transform 0.25s ease, color 0.2s ease;
	}
	.faq-item summary:hover .faq-ico {
		color: var(--fg);
	}
	.faq-item[open] .faq-ico {
		transform: rotate(45deg);
		color: var(--safelight);
	}
	.faq-a {
		max-width: 60ch;
		padding: 0 2.5rem 1.4rem 0;
	}
	.faq-a p {
		font-size: 1rem;
		line-height: 1.7;
		color: var(--fg-muted);
	}
	.faq-a :global(a) {
		display: inline-block;
		margin-top: 0.75rem;
	}
	.faq-none {
		font-size: 1.05rem;
		color: var(--fg-muted);
	}
	.faq-still__cta {
		display: inline-block;
		margin-top: 1rem;
	}
	.faq-still :global(.pg-p) {
		margin-top: 0.5rem;
		max-width: 52ch;
	}
	@media (prefers-reduced-motion: reduce) {
		.faq-ico {
			transition: none;
		}
	}
</style>
