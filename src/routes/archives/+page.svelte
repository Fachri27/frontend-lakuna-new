<script lang="ts">
	import { page } from "$app/state";
	import Seo from "$lib/components/Seo.svelte";
	import PhotosPage from "$lib/components/PhotosPage.svelte";

	// Hasil pencarian/saringan (?q=, ?cat=, ?by=) tak diindeks — halaman tipis & tak terbatas jumlahnya; tautannya tetap diikuti.
	const q = $derived(page.url.searchParams.get("q")?.trim() ?? "");
	const filtered = $derived(page.url.search.length > 1);
</script>

<Seo
	title={q ? `Hasil pencarian "${q}" — Foto & Video Stok` : "Cari Foto & Video Stok Indonesia"}
	description="Cari di arsip foto dan video stok Nusantara berdasarkan kata kunci, kategori, lokasi, atau fotografer."
	path="/archives"
	noindex={filtered}
/>

<PhotosPage
	archive
	initialCat={page.url.searchParams.get("cat") ?? undefined}
	initialQ={page.url.searchParams.get("q") ?? undefined}
	initialBy={page.url.searchParams.get("by") ?? undefined}
/>
