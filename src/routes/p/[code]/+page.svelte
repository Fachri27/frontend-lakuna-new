<script lang="ts">
	/**
	 * Tautan pendek dari sertifikat lisensi: /p/854dc622 (8 heksa pertama ID) → halaman foto/video.
	 * API memecahkan kodenya (GET /api/photos/short/:code); halaman ini hanya meneruskan.
	 */
	import { goto } from "$app/navigation";
	import { page } from "$app/state";
	import { i18n } from "$lib/i18n.svelte";
	import { apiGet } from "$lib/api";
	import type { ApiResponse } from "$lib/types";
	import { assetPath, kindOfType } from "$lib/seo";

	const copy = {
		id: { opening: "Membuka karya…", missing: "Tautan ini tidak ditemukan", missingBody: "Karyanya mungkin sudah tidak tersedia.", browse: "Jelajahi koleksi" },
		en: { opening: "Opening the work…", missing: "This link was not found", missingBody: "The work may no longer be available.", browse: "Browse the collection" },
	};
	const t = $derived(copy[i18n.lang]);
	let missing = $state(false);

	$effect(() => {
		const code = (page.params.code ?? "").toLowerCase();
		missing = false;
		if (!/^[0-9a-f]{8}$/.test(code)) {
			missing = true;
			return;
		}
		let alive = true;
		apiGet<ApiResponse<{ id: string; type: "FOTO" | "VIDEO" | "AUDIO" }>>(`/api/photos/short/${code}`)
			.then((res) => {
				if (!alive) return;
				void goto(assetPath({ id: res.data.id, kind: kindOfType(res.data.type) }), { replaceState: true });
			})
			.catch(() => {
				if (alive) missing = true;
			});
		return () => {
			alive = false;
		};
	});
</script>

<svelte:head><meta name="robots" content="noindex" /></svelte:head>

<section class="mx-auto flex min-h-[60svh] max-w-xl flex-col items-center justify-center px-5 pt-32 text-center sm:px-6 lg:pt-44">
	{#if missing}
		<h1 class="font-display text-[clamp(1.8rem,5vw,3rem)] font-light tracking-[-0.02em] text-fg">{t.missing}</h1>
		<p class="mt-3 text-fg-muted">{t.missingBody}</p>
		<a href="/photos" class="arrow-link mt-8 rounded-full bg-safelight px-7 py-3.5 text-sm font-medium text-ivory">{t.browse} <span class="arr">→</span></a>
	{:else}
		<span class="h-9 w-9 animate-spin rounded-full border-2 border-hair border-t-safelight" aria-hidden="true"></span>
		<p class="mt-5 text-sm text-fg-muted" role="status">{t.opening}</p>
	{/if}
</section>
