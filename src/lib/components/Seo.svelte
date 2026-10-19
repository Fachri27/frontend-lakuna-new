<script lang="ts">
	import { page } from "$app/state";
	import { DEFAULT_DESCRIPTION, DEFAULT_OG_IMAGE, SITE_NAME, absUrl, clip, ldScript, siteOrigin } from "$lib/seo";

	/**
	 * Satu blok <head> per halaman: judul, deskripsi, kanonis, robots, Open Graph & Twitter Card (pratinjau tautan
	 * WhatsApp/IG/X/LinkedIn), geo, dan JSON-LD. Dirender SSR — crawler & mesin jawab AI membacanya tanpa JS.
	 */
	type Ld = Record<string, unknown> | null | undefined | false;
	let {
		title,
		description = DEFAULT_DESCRIPTION,
		path,
		image,
		imageAlt,
		imageWidth,
		imageHeight,
		type = "website",
		noindex = false,
		rawTitle = false,
		keywords = [],
		geo,
		jsonld = [],
	}: {
		/** Judul tanpa nama merek (ditambahkan otomatis), kecuali `rawTitle`. */
		title: string;
		description?: string;
		/** Path kanonis; bawaan path halaman ini tanpa query. */
		path?: string;
		/** Path/URL gambar pratinjau; bawaan og-default.jpg. */
		image?: string;
		imageAlt?: string;
		imageWidth?: number;
		imageHeight?: number;
		type?: "website" | "article" | "video.other";
		noindex?: boolean;
		rawTitle?: boolean;
		keywords?: string[];
		/** Lokasi konten (meta geo.* — dibaca Bing & direktori lokal). Bawaan: Indonesia. */
		geo?: { placename?: string | null; region?: string };
		jsonld?: Ld | Ld[];
	} = $props();

	const origin = $derived(siteOrigin(page.url));
	const canonical = $derived(absUrl(origin, path ?? page.url.pathname));
	const fullTitle = $derived(rawTitle || title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`);
	const desc = $derived(clip(description));
	const img = $derived(absUrl(origin, image ?? DEFAULT_OG_IMAGE.path));
	const imgW = $derived(image ? imageWidth : DEFAULT_OG_IMAGE.width);
	const imgH = $derived(image ? imageHeight : DEFAULT_OG_IMAGE.height);
	const imgAlt = $derived(imageAlt ?? (image ? title : DEFAULT_OG_IMAGE.alt));
	const ld = $derived(ldScript(...(Array.isArray(jsonld) ? jsonld : [jsonld])));
</script>

<svelte:head>
	<title>{fullTitle}</title>
	<meta name="description" content={desc} />
	{#if noindex}
		<meta name="robots" content="noindex, follow" />
	{:else}
		<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
		<link rel="canonical" href={canonical} />
	{/if}
	{#if keywords.length}
		<meta name="keywords" content={keywords.join(", ")} />
	{/if}

	<meta property="og:site_name" content={SITE_NAME} />
	<meta property="og:type" content={type} />
	<meta property="og:title" content={fullTitle} />
	<meta property="og:description" content={desc} />
	<meta property="og:url" content={canonical} />
	<meta property="og:locale" content="id_ID" />
	<meta property="og:locale:alternate" content="en_US" />
	<meta property="og:image" content={img} />
	{#if img.startsWith("https://")}
		<meta property="og:image:secure_url" content={img} />
	{/if}
	<meta property="og:image:alt" content={imgAlt} />
	{#if imgW && imgH}
		<meta property="og:image:width" content={String(imgW)} />
		<meta property="og:image:height" content={String(imgH)} />
	{/if}
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={fullTitle} />
	<meta name="twitter:description" content={desc} />
	<meta name="twitter:image" content={img} />
	<meta name="twitter:image:alt" content={imgAlt} />

	<meta name="geo.region" content={geo?.region ?? "ID"} />
	<meta name="geo.placename" content={geo?.placename ? `${geo.placename}, Indonesia` : "Indonesia"} />

	{#if ld}
		{@html ld}
	{/if}
</svelte:head>
