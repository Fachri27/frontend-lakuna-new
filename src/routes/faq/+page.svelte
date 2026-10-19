<script lang="ts">
	import { page } from "$app/state";
	import Seo from "$lib/components/Seo.svelte";
	import FaqPage from "$lib/components/FaqPage.svelte";
	import { FAQ } from "$lib/faq";
	import { i18n } from "$lib/i18n.svelte";
	import { absUrl, siteOrigin } from "$lib/seo";

	const origin = $derived(siteOrigin(page.url));
	// FAQPage mengikuti bahasa yang tampil (SSR: bawaan situs) — markup harus sama dengan isi halaman.
	const faqLd = $derived({
		"@type": "FAQPage",
		url: `${origin}/faq`,
		inLanguage: i18n.lang === "id" ? "id-ID" : "en",
		mainEntity: FAQ[i18n.lang].groups.flatMap((g) =>
			g.items.map((it) => ({
				"@type": "Question",
				name: it.q,
				acceptedAnswer: { "@type": "Answer", text: `${it.a}.`, url: it.link ? absUrl(origin, it.link.href) : undefined },
			}))
		),
	});
</script>

<Seo
	title="Pertanyaan Umum"
	description="Jawaban singkat tentang lisensi foto & video, pembelian, metode pembayaran, langganan, dan penghasilan kontributor di Lakuna Stock."
	jsonld={faqLd}
/>

<FaqPage />
