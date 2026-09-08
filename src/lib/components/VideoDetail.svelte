<script lang="ts">
	import ApiImage from "./ApiImage.svelte";
	import gsap from "gsap";
	import { i18n } from "$lib/i18n.svelte";
	import { store } from "$lib/store.svelte";
	import { catLabel, fmtIDR, imgFor, fetchPhotoById, fetchRelatedPhotos, type Video, type Photo } from "$lib/data";
	import Reveal from "./Reveal.svelte";

	let { videoId }: { videoId: string } = $props();

	const copy = {
		id: {
			back: "Kembali", by: "oleh", cat: "Kategori", duration: "Durasi", resolution: "Resolusi",
			format: "Format", tags: "Kata kunci", license: "Lisensi", personal: "Personal", commercial: "Komersial",
			personalDesc: "Pakai pribadi & media sosial", commercialDesc: "Pakai komersial, siaran & cetak",
			addToCart: "Tambah ke keranjang", added: "Ditambahkan", buyNow: "Beli lisensi",
			save: "Simpan", saved: "Tersimpan", play: "Putar pratinjau", stop: "Hentikan",
			previewNote: "Pratinjau tanda air. Unduhan penuh 4K setelah pembelian.",
			related: "Bingkai bergerak terkait", byArtist: "Dari perajangga yang sama",
			resValue: "4K UHD", fmtValue: "MP4 · H.265"
		},
		en: {
			back: "Back", by: "by", cat: "Category", duration: "Duration", resolution: "Resolution",
			format: "Format", tags: "Keywords", license: "License", personal: "Personal", commercial: "Commercial",
			personalDesc: "Personal & social media use", commercialDesc: "Commercial, broadcast & print use",
			addToCart: "Add to cart", added: "Added", buyNow: "Buy license",
			save: "Save", saved: "Saved", play: "Play preview", stop: "Stop",
			previewNote: "Watermarked preview. Full 4K download after purchase.",
			related: "Related motion frames", byArtist: "From the same image-maker",
			resValue: "4K UHD", fmtValue: "MP4 · H.265"
		}
	};

	const lang = $derived(i18n.lang);
	const t = $derived(copy[lang]);

	let license = $state<"personal" | "commercial">("personal");
	let added = $state(false);
	let playing = $state(false);
	let video = $state<Video | null>(null);
	let related = $state<Photo[]>([]);

	let rootEl: HTMLDivElement | undefined = $state();

	$effect(() => {
		fetchPhotoById(videoId).then((p) => {
			if (p) {
				video = { ...p, duration: "02:00", desc: p.desc };
			}
		});
		fetchRelatedPhotos(videoId, 3).then((r) => (related = r)).catch(() => {});
	});

	const fav = $derived(video ? store.isFavorite(video.id) : false);
	const price = $derived(video ? (license === "personal" ? video.price : video.price * 2) : 0);

	// Animasi plate (masuk) sekali video tersedia.
	$effect(() => {
		if (!video) return;
		if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
		const plate = rootEl?.querySelector<HTMLElement>("[data-plate]");
		if (plate) gsap.fromTo(plate, { y: 28, opacity: 0 }, { y: 0, opacity: 1, duration: 1.1, ease: "power3.out" });
	});

	function handleAdd() {
		if (!video) return;
		store.addToCart({
			id: `${video.id}-${license}`,
			kind: "video",
			title: `${video.title[lang]} — ${license === "personal" ? t.personal : t.commercial}`,
			price,
			meta: video.id
		});
		added = true;
		setTimeout(() => (added = false), 1800);
	}
</script>

{#snippet meta(label: string, value: string)}
	<div>
		<p class="kicker text-fg-muted">{label}</p>
		<p class="mt-1.5 text-sm text-fg">{value}</p>
	</div>
{/snippet}

{#snippet licenseOpt(active: boolean, onpick: () => void, title: string, desc: string, optPrice: number)}
	<button
		type="button"
		onclick={onpick}
		class={`flex w-full items-center justify-between rounded-md border p-4 text-left transition-colors ${
			active ? "border-safelight bg-safelight/5" : "border-hair hover:border-fg-muted"
		}`}
	>
		<span>
			<span class="block text-sm font-medium text-fg">{title}</span>
			<span class="mt-0.5 block text-xs text-fg-muted">{desc}</span>
		</span>
		<span class="text-sm font-medium text-fg">{fmtIDR(optPrice)}</span>
	</button>
{/snippet}

{#if !video}
	<div class="min-h-screen pt-28"></div>
{:else}
	<div bind:this={rootEl} class="min-h-screen pt-28">
		<!-- Top strip -->
		<div class="mx-auto flex max-w-[1500px] items-center justify-between px-6 pb-6 lg:px-10">
			<a href="/videos" class="arrow-link text-sm text-fg-muted hover:text-safelight">
				<span class="arr">←</span> {t.back}
			</a>
			<span class="kicker text-fg-muted">{catLabel[video.cat][lang]}</span>
		</div>

		<div class="mx-auto grid max-w-[1500px] gap-10 px-6 pb-20 lg:grid-cols-[1fr_22rem] lg:px-10">
			<!-- ───────── Plate ───────── -->
			<div>
				<figure
					data-plate
					class="relative overflow-hidden rounded-md bg-black shadow-[0_40px_90px_-40px_rgba(11,31,42,0.45)]"
				>
					<div class="pointer-events-none absolute -inset-10 bg-[radial-gradient(circle_at_50%_40%,color-mix(in_srgb,var(--safelight)_18%,transparent),transparent_60%)] blur-2xl"></div>
					<div class="relative aspect-video w-full">
						<ApiImage
							src={imgFor(video.seed, 1600, 900, video.thumbUrl)}
							alt={video.title[lang]}
							fill
							eager
							class={`object-cover transition-[opacity,filter] duration-700 ${playing ? "opacity-50" : "opacity-90"}`}
						/>
						<div class="grain pointer-events-none absolute inset-0 opacity-[0.1] mix-blend-soft-light"></div>

						<!-- play / stop -->
						<button
							type="button"
							onclick={() => (playing = !playing)}
							aria-label={playing ? t.stop : t.play}
							class="group absolute inset-0 grid place-items-center"
						>
							<span class={`grid h-20 w-20 place-items-center rounded-full border backdrop-blur transition-all duration-500 ${playing ? "scale-90 border-safelight bg-safelight/15" : "border-ivory/60 bg-ocean-deep/30 group-hover:border-safelight group-hover:bg-safelight"}`}>
								{#if playing}
									<span class="flex gap-1.5">
										<span class="h-6 w-2 rounded-full bg-ivory"></span>
										<span class="h-6 w-2 rounded-full bg-ivory"></span>
									</span>
								{:else}
									<span class="ml-1.5 border-y-[14px] border-l-[20px] border-y-transparent border-l-ivory transition-[border-color] group-hover:border-l-ivory"></span>
								{/if}
							</span>
						</button>

						<!-- faux progress bar when "playing" -->
						<div class="pointer-events-none absolute inset-x-0 bottom-0 h-1.5 bg-ocean-deep/40">
							<span class={`block h-full bg-safelight transition-[width] duration-[4000ms] ease-linear ${playing ? "w-full" : "w-0"}`}></span>
						</div>

						<span class="absolute left-4 top-4 kicker rounded-full bg-ocean-deep/60 px-3 py-1.5 text-ivory backdrop-blur">
							{video.duration}
						</span>

						{#each ["tl", "tr", "bl", "br"] as c (c)}
							<span
								class={`pointer-events-none absolute h-6 w-6 border-ivory/70 ${
									c === "tl" ? "left-4 top-4 border-l border-t"
									: c === "tr" ? "right-4 top-4 border-r border-t"
									: c === "bl" ? "bottom-4 left-4 border-b border-l"
									: "bottom-4 right-4 border-b border-r"
								}`}
							></span>
						{/each}
					</div>
				</figure>

				<!-- Caption -->
				<div class="mt-8 max-w-2xl">
					<h1 class="font-display text-[clamp(1.8rem,3.6vw,3rem)] font-light leading-[1.05] tracking-[-0.02em] text-fg">
						{video.title[lang]}
					</h1>
					<p class="mt-3 kicker text-fg-muted">
						{t.by} <span class="text-safelight">{video.author}</span>
					</p>
					<p class="mt-6 text-[1.02rem] leading-relaxed text-fg-muted">{video.desc[lang]}</p>

					<div class="mt-8 grid grid-cols-2 gap-x-8 gap-y-5 border-t border-hair pt-8 sm:grid-cols-4">
						{@render meta(t.duration, video.duration)}
						{@render meta(t.cat, catLabel[video.cat][lang])}
						{@render meta(t.resolution, t.resValue)}
						{@render meta(t.format, t.fmtValue)}
					</div>

					<div class="mt-6 flex flex-wrap gap-2">
						{#each ["4k", "cinematic", video.cat] as tag (tag)}
							<span class="kicker rounded-full border border-hair px-3 py-1.5 text-fg-muted">
								#{tag}
							</span>
						{/each}
					</div>
				</div>
			</div>

			<!-- ───────── Order panel ───────── -->
			<aside class="lg:sticky lg:top-28 lg:self-start">
				<div class="rounded-md border border-hair bg-surface/80 p-6 backdrop-blur-xl">
					<p class="kicker text-safelight">{t.license}</p>
					<p class="mt-3 font-display text-3xl font-light tracking-[-0.02em] text-fg">{fmtIDR(price)}</p>

					<div class="mt-5 space-y-2.5">
						{@render licenseOpt(license === "personal", () => (license = "personal"), t.personal, t.personalDesc, video.price)}
						{@render licenseOpt(license === "commercial", () => (license = "commercial"), t.commercial, t.commercialDesc, video.price * 2)}
					</div>

					<button
						type="button"
						onclick={handleAdd}
						class="mt-6 w-full rounded-full bg-safelight py-3.5 text-sm font-medium text-ivory shadow-[0_14px_40px_-12px_var(--safelight-glow)] transition-transform hover:scale-[1.02]"
					>
						{added ? `✓ ${t.added}` : t.addToCart}
					</button>
					<a
						href="/checkout"
						class="mt-2.5 block w-full rounded-full border border-hair py-3.5 text-center text-sm font-medium text-fg transition-colors hover:border-safelight hover:text-safelight"
					>
						{t.buyNow} →
					</a>

					<button
						type="button"
						onclick={() => store.toggleFavorite(video!.id)}
						class="mt-4 w-full text-sm text-fg-muted transition-colors hover:text-safelight"
					>
						{fav ? `♥ ${t.saved}` : `♡ ${t.save}`}
					</button>

					<div class="mt-6 border-t border-hair pt-5">
						<p class="text-center text-xs text-fg-muted">{t.previewNote}</p>
					</div>
				</div>
			</aside>
		</div>

		<!-- ───────── Related ───────── -->
		<section class="mx-auto max-w-[1500px] px-6 pb-28 lg:px-10">
			<Reveal class="mb-8">
				<p data-reveal class="kicker text-safelight">{t.related}</p>
				<h2 data-reveal class="mt-4 font-display text-2xl font-light tracking-[-0.02em] text-fg">{t.byArtist}</h2>
			</Reveal>
			<Reveal stagger={0.08} class="grid gap-4 md:grid-cols-3">
				{#each related as v (v.id)}
					<a href={`/videos/${v.id}`} data-reveal class="group overflow-hidden rounded-md border border-hair bg-surface">
						<div class="relative aspect-video w-full overflow-hidden">
							<ApiImage
								src={imgFor(v.seed, 800, 450, v.thumbUrl)}
								alt={v.title[lang]}
								fill
								class="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
							/>
							<div class="absolute inset-0 bg-ocean-deep/25 transition-colors group-hover:bg-ocean-deep/40"></div>
							<span class="absolute left-3 top-3 kicker rounded-full bg-ocean-deep/60 px-2.5 py-1 text-ivory backdrop-blur">{v.author}</span>
							<span class="absolute inset-0 grid place-items-center">
								<span class="grid h-12 w-12 place-items-center rounded-full border border-ivory/60 bg-ocean-deep/30 backdrop-blur transition-colors group-hover:border-safelight group-hover:bg-safelight">
									<span class="ml-1 border-y-7 border-l-[10px] border-y-transparent border-l-ivory"></span>
								</span>
							</span>
						</div>
						<div class="p-4">
							<span class="kicker text-safelight/90">{catLabel[v.cat][lang]}</span>
							<h3 class="mt-1.5 font-display text-lg font-light tracking-[-0.01em] text-fg">{v.title[lang]}</h3>
							<p class="mt-0.5 text-xs text-fg-muted">{v.author}</p>
							<p class="mt-3 font-display text-base font-light text-fg">{fmtIDR(v.price)}</p>
						</div>
					</a>
				{/each}
			</Reveal>
		</section>
	</div>
{/if}

