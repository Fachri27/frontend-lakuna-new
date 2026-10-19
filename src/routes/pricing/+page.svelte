<script lang="ts">
	import { page } from "$app/state";
	import Seo from "$lib/components/Seo.svelte";
	import PricingPage from "$lib/components/PricingPage.svelte";
	import { DEFAULT_OG_IMAGE, absUrl, orgId, siteOrigin } from "$lib/seo";
	import type { PageProps } from "./$types";

	let { data }: PageProps = $props();
	const origin = $derived(siteOrigin(page.url));

	const offer = (name: string, price: number, unitCode: "MON" | "ANN") => ({
		"@type": "Offer",
		name,
		price,
		priceCurrency: "IDR",
		priceSpecification: {
			"@type": "UnitPriceSpecification",
			price,
			priceCurrency: "IDR",
			valueAddedTaxIncluded: true,
			referenceQuantity: { "@type": "QuantitativeValue", value: 1, unitCode },
		},
		availability: "https://schema.org/InStock",
		url: `${origin}/pricing`,
		seller: { "@id": orgId(origin) },
	});

	const plansLd = $derived(
		data.plans.length
			? {
					"@type": "Product",
					"@id": `${origin}/pricing#subscription`,
					name: "Langganan Lakuna Stock",
					description: "Paket berlangganan foto & video stok Indonesia dengan kuota unduhan bulanan; lisensi komersial selama langganan aktif.",
					brand: { "@id": orgId(origin) },
					image: absUrl(origin, DEFAULT_OG_IMAGE.path),
					offers: data.plans.flatMap((p) => [
						offer(`${p.name} — bulanan, ${p.quota} unduhan/bulan`, p.priceMonthly, "MON"),
						offer(`${p.name} — tahunan, ${p.quota} unduhan/bulan`, p.priceAnnual, "ANN"),
					]),
				}
			: null
	);
</script>

<Seo
	title="Harga Lisensi & Paket Langganan"
	description="Harga lisensi foto & video stok Indonesia: lisensi Standar sekali bayar per berkas, atau paket Subscription bulanan/tahunan dengan kuota unduhan. Harga dalam Rupiah, sudah termasuk pajak."
	keywords={["harga foto stok", "langganan foto stok indonesia", "harga lisensi foto", "beli foto"]}
	jsonld={plansLd}
/>

<PricingPage />
