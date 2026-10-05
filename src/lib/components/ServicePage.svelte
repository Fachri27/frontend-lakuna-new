<script lang="ts">
	import { i18n, type Lang } from "$lib/i18n.svelte";
	import { ADDRESS, COMPANY, CONTACT_EMAIL, mailto } from "$lib/contact";
	import PageShell from "./PageShell.svelte";

	const copy: Record<Lang, {
		title: string; sub: string;
		reach: string; email: string; writeUs: string; visit: string;
		before: string; beforeBody: string; faq: string; help: string;
		include: string; items: { title: string; body: string }[];
		subject: string;
	}> = {
		id: {
			title: "Layanan pelanggan",
			sub: "Kami membantu soal pesanan, unduhan, langganan, dan lisensi. Layanan pelanggan tersedia 24 jam",
			reach: "Hubungi kami",
			email: "Email",
			writeUs: "Tulis ke",
			visit: "Alamat",
			before: "Sebelum menulis",
			beforeBody: "Jawabannya mungkin sudah ada di sini, dan biasanya lebih cepat",
			faq: "Pertanyaan umum",
			help: "Panduan bantuan",
			include: "Sertakan di pesanmu",
			items: [
				{ title: "Email akunmu", body: "Supaya kami bisa menemukan akun dan pesananmu" },
				{ title: "ID pesanan", body: "Salin dari pesananmu di profil (tombol Salin ID pesanan). Untuk soal pembayaran atau unduhan, ini yang paling mempercepat" },
				{ title: "Foto atau video yang dimaksud", body: "Judulnya, atau tautan halamannya" },
				{ title: "Yang terjadi dan yang kamu harapkan", body: "Ceritakan singkat. Tangkapan layar membantu bila ada pesan galat" },
			],
			subject: "Bantuan Lakuna",
		},
		en: {
			title: "Customer service",
			sub: "We help with orders, downloads, subscriptions, and licenses. Customer service is available 24 hours",
			reach: "Contact us",
			email: "Email",
			writeUs: "Write to",
			visit: "Address",
			before: "Before you write",
			beforeBody: "The answer may already be here, and it is usually faster",
			faq: "Frequently asked questions",
			help: "Help guides",
			include: "Include in your message",
			items: [
				{ title: "Your account email", body: "So we can find your account and orders" },
				{ title: "Your order ID", body: "Copy it from your order in your profile (the Copy order ID button). For payment or download issues this speeds things up the most" },
				{ title: "The photo or video concerned", body: "Its title, or a link to its page" },
				{ title: "What happened and what you expected", body: "A short description. A screenshot helps if there is an error message" },
			],
			subject: "Lakuna support",
		},
	};

	const lang = $derived<Lang>(i18n.lang);
	const t = $derived(copy[lang]);
</script>

<PageShell title={t.title} sub={t.sub}>
	<section class="pg-rule sv-row">
		<h2 class="pg-h2">{t.reach}</h2>
		<div class="sv-col">
			{#if CONTACT_EMAIL}
				<div>
					<h3 class="pg-h3">{t.email}</h3>
					<p class="pg-p"><a href={mailto(t.subject)} class="pg-link">{CONTACT_EMAIL}</a></p>
				</div>
			{/if}
			<div>
				<h3 class="pg-h3">{t.visit}</h3>
				<address class="pg-p">{COMPANY}<br />{ADDRESS}</address>
			</div>
		</div>
	</section>

	<section class="pg-rule sv-row">
		<h2 class="pg-h2">{t.before}</h2>
		<div class="sv-col">
			<p class="pg-p">{t.beforeBody}</p>
			<p class="sv-links">
				<a href="/faq" class="pg-link">{t.faq}</a>
				<a href="/help" class="pg-link">{t.help}</a>
			</p>
		</div>
	</section>

	<section class="pg-rule sv-row">
		<h2 class="pg-h2">{t.include}</h2>
		<ul class="sv-col sv-list">
			{#each t.items as it (it.title)}
				<li>
					<h3 class="pg-h3">{it.title}</h3>
					<p class="pg-p">{it.body}</p>
				</li>
			{/each}
		</ul>
	</section>
</PageShell>

<style>
	.sv-row {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: 1.25rem;
	}
	@media (min-width: 960px) {
		.sv-row {
			grid-template-columns: minmax(0, 5fr) minmax(0, 6fr);
			column-gap: clamp(3rem, 7vw, 8rem);
		}
	}
	.sv-col {
		max-width: 52ch;
	}
	.sv-col > * + * {
		margin-top: 1.75rem;
	}
	.sv-col :global(.pg-p) {
		margin-top: 0.4rem;
		font-style: normal;
	}
	.sv-links {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem 1.75rem;
	}
	.sv-list {
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.sv-list li + li {
		margin-top: 1.5rem;
	}
</style>
