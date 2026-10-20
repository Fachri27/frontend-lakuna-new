<script lang="ts">
	import { page } from "$app/state";
	import Seo from "$lib/components/Seo.svelte";
	import PhotosPage from "$lib/components/PhotosPage.svelte";
	import { breadcrumbLd, collectionLd, siteOrigin } from "$lib/seo";

	// Arsip satu fotografer — halaman sendiri, bukan query.
	// params sudah di-decode SvelteKit — decode kedua membuat "%25" → URIError (500 saat SSR).
	const name = $derived(page.params.name ?? "");
	const origin = $derived(siteOrigin(page.url));
</script>

<Seo
	title={`${name} — Karya Foto & Video`}
	description={`Karya ${name} di arsip Nusantara: foto dan video stok berlisensi komersial di Lakuna Stock.`}
	path={`/archive/${encodeURIComponent(name)}`}
	jsonld={[
		{ ...collectionLd(origin, `/archive/${encodeURIComponent(name)}`, `Karya ${name}`, `Foto dan video karya ${name}.`), about: { "@type": "Person", name } },
		breadcrumbLd(origin, [{ name, path: `/archive/${encodeURIComponent(name)}` }]),
	]}
/>

<PhotosPage initialBy={name || undefined} />
