<script lang="ts">
	import { page } from "$app/state";
	import { i18n } from "$lib/i18n.svelte";
	import { fetchPhotos, imgFor, type Photo } from "$lib/data";
	import { sanitizeRedirect } from "$lib/authModal.svelte";
	import ApiImage from "./ApiImage.svelte";
	import AuthPanel from "./AuthPanel.svelte";
	import Reveal from "./Reveal.svelte";

	/**
	 * Halaman /login — fallback deep-link untuk popup auth global. Isi
	 * formulirnya AuthPanel yang sama persis dengan popup, jadi tidak ada dua
	 * implementasi. Redirect diambil dari query (?redirect=...).
	 */
	const copy = {
		id: { sideKicker: "Bingkai terbaru dari arsip" },
		en: { sideKicker: "Latest frame from the archive" },
	};

	const lang = $derived(i18n.lang);
	const t = $derived(copy[lang]);

	const redirectTo = $derived(sanitizeRedirect(page.url.searchParams.get("redirect")));

	// Satu bingkai nyata dari arsip sebagai thesis halaman: inilah yang
	// menunggumu di dalam. Fallback picsum bila API belum menjawab.
	let frame = $state<Photo | null>(null);
	const frameSrc = $derived(
		frame ? imgFor(frame.seed, 1200, 1500, frame.thumbUrl) : imgFor("login-frame", 1200, 1500),
	);

	// Bingkai thesis: satu foto terbaru dari arsip.
	$effect(() => {
		let alive = true;
		fetchPhotos({ limit: 1 })
			.then((r) => {
				if (alive && r.photos.length > 0) frame = r.photos[0];
			})
			.catch(() => {});
		return () => {
			alive = false;
		};
	});
</script>

<!-- Pintu arsip: separuh bingkai nyata dari database (ken-burns pelan,
viewfinder + keterangan hidup), separuh formulir. Di mobile bingkai jadi
banner atas — thesis dulu, formulir menyusul. -->
<section class="mx-auto w-full max-w-[1500px] px-4 pb-6 pt-[calc(var(--banner-h,0px)+var(--nav-h)+1rem)] sm:px-6 lg:px-10">
	<div class="grid overflow-hidden rounded-md border border-hair lg:grid-cols-[0.95fr_1.05fr] lg:min-h-[calc(100svh-var(--banner-h,0px)-var(--nav-h)-2rem)]">
		<!-- ── Bingkai thesis ── -->
		<div class="on-darkroom relative h-60 overflow-hidden bg-darkroom sm:h-72 lg:h-auto">
			<div class="login-kenburns absolute inset-0">
				<ApiImage
					src={frameSrc}
					alt={frame ? frame.title[lang] : "Bingkai dari arsip Lakuna"}
					fill
					eager
					class="object-cover"
				/>
			</div>
			<div aria-hidden="true" class="pointer-events-none absolute inset-0 bg-gradient-to-t from-ocean-deep/85 via-ocean-deep/20 to-ocean-deep/30"></div>
			<div aria-hidden="true" class="grain pointer-events-none absolute inset-0 opacity-[0.14] mix-blend-soft-light"></div>
			{#each ["tl", "tr", "bl", "br"] as cn (cn)}
				<span
					aria-hidden="true"
					class={`pointer-events-none absolute h-5 w-5 border-ivory/60 ${cn === "tl" ? "left-4 top-4 border-l border-t"
						: cn === "tr" ? "right-4 top-4 border-r border-t"
						: cn === "bl" ? "bottom-4 left-4 border-b border-l"
						: "bottom-4 right-4 border-b border-r"}`}
				></span>
			{/each}
			<div class="absolute inset-x-0 bottom-0 p-6 sm:p-8">
				<p class="kicker text-safelight">{t.sideKicker}</p>
				{#if frame}
					<p class="mt-3 font-display text-2xl font-light leading-tight tracking-[-0.01em] text-ivory sm:text-[1.7rem]">
						{frame.title[lang]}
					</p>
					<p class="mt-1.5 text-xs uppercase tracking-[0.18em] text-ivory/55">{frame.author}</p>
				{/if}
			</div>
		</div>

		<!-- ── Formulir ── -->
		<div class="flex flex-col justify-center bg-surface px-6 py-8 sm:p-10 lg:px-12">
			<Reveal>
				<AuthPanel redirectTo={redirectTo} />
			</Reveal>
		</div>
	</div>
</section>
