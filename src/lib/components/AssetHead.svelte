<script lang="ts">
	import { page } from "$app/state";
	import Seo from "./Seo.svelte";
	import {
		assetDescription,
		assetImagePath,
		assetLd,
		assetPath,
		assetTitle,
		breadcrumbLd,
		siteOrigin,
		type AssetKind,
		type AssetPageData,
		type AssetSeo,
	} from "$lib/seo";

	/** <head> halaman detail foto/video dari data load (lihat loadAssetPage di $lib/seo). */
	let { data, kind }: { data: AssetPageData; kind: AssetKind } = $props();

	// Navigasi klien: data datang belakangan (tak menahan perpindahan halaman) — judul tab menyusul.
	let late = $state<AssetSeo | null>(null);
	$effect(() => {
		const job = data.seoLater;
		late = null;
		if (!job) return;
		let alive = true;
		void job.then((s) => {
			if (alive && s && s !== "missing") late = s;
		});
		return () => {
			alive = false;
		};
	});

	const seo = $derived(data.seo ?? late);
	const origin = $derived(siteOrigin(page.url));
	const label = $derived(kind === "video" ? "Video" : "Foto");
	const listPath = $derived(kind === "video" ? "/videos" : "/photos");
</script>

{#if seo}
	<Seo
		title={assetTitle(seo)}
		description={assetDescription(seo)}
		path={assetPath(seo)}
		image={assetImagePath(seo.id)}
		imageAlt={seo.titleEn && seo.titleEn !== seo.title ? `${seo.title} — ${seo.titleEn}` : seo.title}
		type={kind === "video" ? "video.other" : "website"}
		keywords={[...seo.keywords, ...seo.categories].slice(0, 20)}
		geo={{ placename: seo.location }}
		jsonld={[
			assetLd(origin, seo),
			breadcrumbLd(origin, [
				{ name: label, path: listPath },
				{ name: seo.title, path: assetPath(seo) },
			]),
		]}
	/>
{:else}
	<Seo title={`${label} Stok Indonesia`} description={`${label} stok Indonesia dari arsip visual Nusantara, berlisensi komersial.`} />
{/if}
