<script lang="ts">
	import ApiImage from "./ApiImage.svelte";
	import { i18n } from "$lib/i18n.svelte";
	import { store } from "$lib/store.svelte";
	import { announcer } from "$lib/stores/announce.svelte";
	import { catLabel, fmtIDR, imgFor, fetchPhotos, type Video } from "$lib/data";
	import Reveal from "./Reveal.svelte";
	import ParallaxImage from "./ParallaxImage.svelte";

	const copy = {
		id: { kicker: "Sinema", title: "Video & motion", sub: "Cuplikan sinematik 4K dari seluruh Nusantara — drone, time-lapse, dan dokumentasi.", play: "Putar", duration: "Durasi", addToCart: "Tambah ke keranjang", added: "Ditambahkan", close: "Tutup", preview: "Pratinjau" },
		en: { kicker: "Cinema", title: "Video & motion", sub: "Cinematic 4K clips from across Nusantara — drone, time-lapse, and documentary.", play: "Play", duration: "Duration", addToCart: "Add to cart", added: "Added", close: "Close", preview: "Preview" }
	};

	const lang = $derived(i18n.lang);
	const t = $derived(copy[lang]);

	let active = $state<Video | null>(null);
	let addedId = $state<string | null>(null);
	let videos = $state<Video[]>([]);
	let lightboxEl: HTMLDivElement | undefined = $state();
	let triggerEl: HTMLButtonElement | undefined = $state();
	let closeEl: HTMLButtonElement | undefined = $state();

	$effect(() => {
		fetchPhotos({ type: "VIDEO", limit: 12 })
			.then((r) => {
				videos = r.photos.map((p) => ({
					id: p.id,
					title: p.title,
					author: p.author,
					cat: p.cat,
					seed: p.seed,
					duration: "02:00",
					price: p.price,
					desc: p.desc,
					thumbUrl: p.thumbUrl
				}));
			})
			.catch(() => {});
	});

	function add(v: Video) {
		store.addToCart({ id: v.id, kind: "video", title: v.title[lang], price: v.price, meta: v.id });
		addedId = v.id;
		announcer.announce(`${v.title[lang]} ${t.added}`);
		setTimeout(() => (addedId = null), 1600);
	}

	// Focus trap & Escape for lightbox
	$effect(() => {
		if (!active) return;
		closeEl?.focus();
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				active = null;
				triggerEl?.focus();
			}
			if (e.key === "Tab" && lightboxEl) {
				const focusable = lightboxEl.querySelectorAll<HTMLElement>("button, [href], input, [tabindex]:not([tabindex='-1'])");
				if (focusable.length === 0) return;
				const first = focusable[0];
				const last = focusable[focusable.length - 1];
				if (e.shiftKey && document.activeElement === first) {
					e.preventDefault();
					last.focus();
				} else if (!e.shiftKey && document.activeElement === last) {
					e.preventDefault();
					first.focus();
				}
			}
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	});
</script>

<section class="mx-auto max-w-[1500px] px-6 pb-12 pt-36 lg:px-10 lg:pt-44">
	<Reveal>
		<p data-reveal class="kicker text-safelight">{t.kicker}</p>
		<h1 data-reveal class="mt-5 font-display text-[clamp(2.4rem,6vw,5rem)] font-light leading-[0.98] tracking-[-0.03em] text-fg">{t.title}</h1>
		<p data-reveal class="mt-6 max-w-xl text-[1.02rem] leading-relaxed text-fg-muted">{t.sub}</p>
	</Reveal>
</section>

<section class="mx-auto max-w-[1500px] px-6 pb-28 lg:px-10">
	<Reveal stagger={0.08} class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
		{#each videos as v (v.id)}
			<div data-reveal class="group overflow-hidden rounded-md border border-hair bg-surface">
				<div class="relative block aspect-video w-full overflow-hidden">
					<a href={`/videos/${v.id}`} aria-label={v.title[lang]}>
						<ParallaxImage src={imgFor(v.seed, 800, 450, v.thumbUrl)} alt={v.title[lang]} class="absolute inset-0" amount={12} />
						<div class="absolute inset-0 bg-ocean-deep/30 transition-colors group-hover:bg-ocean-deep/45"></div>
						<span class="absolute left-3 top-3 kicker rounded-full bg-ocean-deep/60 px-2.5 py-1 text-ivory backdrop-blur">{v.duration}</span>
						<span class="absolute inset-0 grid place-items-center">
							<span class="grid h-14 w-14 place-items-center rounded-full border border-ivory/60 bg-ocean-deep/30 backdrop-blur transition-colors group-hover:border-safelight group-hover:bg-safelight">
								<span class="ml-1 border-y-8 border-l-[12px] border-y-transparent border-l-ivory group-hover:border-l-ivory"></span>
							</span>
						</span>
					</a>
					<button
						bind:this={triggerEl}
						type="button"
						onclick={() => (active = v)}
						aria-label={`${t.play} — ${v.title[lang]}`}
						class="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-ocean-deep/55 text-ivory backdrop-blur transition-colors hover:bg-safelight"
					>
						<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
							<path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 4v5h5" />
						</svg>
					</button>
				</div>
				<div class="p-5">
					<a href={`/videos/${v.id}`}>
						<span class="kicker text-safelight/90">{catLabel[v.cat][lang]}</span>
						<h3 class="mt-2 font-display text-xl font-light tracking-[-0.01em] text-fg">{v.title[lang]}</h3>
						<p class="mt-1 text-xs text-fg-muted">{v.author}</p>
					</a>
					<div class="mt-4 flex items-center justify-between">
						<span class="font-display text-lg font-light text-fg">{fmtIDR(v.price)}</span>
						<button type="button" onclick={() => add(v)} class="rounded-full border border-hair px-4 py-2 text-xs font-medium text-fg transition-colors hover:border-safelight hover:text-safelight">
							{addedId === v.id ? `✓ ${t.added}` : t.addToCart}
						</button>
					</div>
				</div>
			</div>
		{/each}
	</Reveal>
</section>

<!-- Lightbox -->
{#if active}
	<div
		class="fixed inset-0 z-[100] grid place-items-center bg-ocean-deep/80 p-6 backdrop-blur-sm"
		onclick={() => {
			active = null;
			triggerEl?.focus();
		}}
	>
		<div
			bind:this={lightboxEl}
			role="dialog"
			aria-modal="true"
			aria-label={active.title[lang]}
			class="relative w-full max-w-4xl overflow-hidden rounded-md border border-ivory/15 bg-black"
			onclick={(e) => e.stopPropagation()}
		>
			<div class="relative aspect-video">
				<ApiImage src={imgFor(active.seed, 1600, 900, active.thumbUrl)} alt={active.title[lang]} fill class="object-cover opacity-70" />
				<div class="absolute inset-0 grid place-items-center">
					<span class="grid h-20 w-20 place-items-center rounded-full bg-safelight text-ivory">
						<span class="ml-1.5 border-y-[14px] border-l-[18px] border-y-transparent border-l-ivory"></span>
					</span>
				</div>
				<span class="absolute left-4 top-4 kicker rounded-full bg-ocean-deep/60 px-3 py-1.5 text-ivory backdrop-blur">{t.preview} · {active.duration}</span>
			</div>
			<div class="flex items-center justify-between gap-4 p-6">
				<div>
					<h3 class="font-display text-2xl font-light text-ivory">{active.title[lang]}</h3>
					<p class="mt-1 text-sm text-ivory/60">{active.desc[lang]}</p>
				</div>
				<button type="button" onclick={() => add(active!)} class="shrink-0 rounded-full bg-safelight px-6 py-3 text-sm font-medium text-ivory">
					{addedId === active.id ? `✓ ${t.added}` : fmtIDR(active.price)}
				</button>
			</div>
			<button
				bind:this={closeEl}
				type="button"
				onclick={() => {
					active = null;
					triggerEl?.focus();
				}}
				aria-label={t.close}
				class="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full bg-ocean-deep/60 text-ivory backdrop-blur hover:bg-safelight"
			>
				✕
			</button>
		</div>
	</div>
{/if}
