<script lang="ts">
	import { page } from "$app/state";
	import Seo from "$lib/components/Seo.svelte";
	import PhotosPage from "$lib/components/PhotosPage.svelte";
	import { breadcrumbLd, collectionLd, siteOrigin } from "$lib/seo";

	// Halaman kategori khusus — terpisah dari /photos dan /videos.
	// Dibuka dari menu Categories di navbar; judul mengikuti nama kategori.
	// params sudah di-decode SvelteKit — decode kedua membuat "%25" → URIError (500 saat SSR).
	const name = $derived(page.params.name ?? "");
	const origin = $derived(siteOrigin(page.url));
</script>

<Seo
	title={`${name} — Foto & Video Stok Indonesia`}
	description={`Koleksi foto dan video stok ${name} dari arsip Nusantara, berlisensi komersial di Lakuna Stock.`}
	path={`/categories/${encodeURIComponent(name)}`}
	keywords={[`foto ${name.toLowerCase()}`, `stock photo ${name.toLowerCase()} indonesia`]}
	jsonld={[
		collectionLd(origin, `/categories/${encodeURIComponent(name)}`, `${name} — Foto & Video Stok Indonesia`, `Koleksi foto dan video stok ${name} dari arsip Nusantara.`),
		breadcrumbLd(origin, [{ name, path: `/categories/${encodeURIComponent(name)}` }]),
	]}
/>

<PhotosPage initialCat={name || undefined} chipTitle />
