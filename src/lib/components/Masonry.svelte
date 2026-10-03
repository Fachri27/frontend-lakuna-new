<script lang="ts">
	import ApiImage from "./ApiImage.svelte";
	import gsap from "gsap";
	import { ScrollTrigger } from "gsap/ScrollTrigger";
	import { i18n } from "$lib/i18n.svelte";
	import { store } from "$lib/store.svelte";
	import { fmtIDR, imgFor, pickVideoPreview, type Photo } from "$lib/data";
	import { calmRefresh } from "$lib/scrollCalm";
	import { announcer } from "$lib/stores/announce.svelte";

	gsap.registerPlugin(ScrollTrigger);

	let { photos, reduceMotion = false }: { photos: Photo[]; reduceMotion?: boolean } = $props();

	const lang = $derived(i18n.lang);
	const addedMsg = $derived(lang === "id" ? "Ditambahkan" : "Added");
	const cartLabel = $derived(lang === "id" ? "Tambah ke keranjang" : "Add to cart");
	let addedId = $state<string | null>(null);

	// Daftar bisa campuran foto + video (galeri saat kategori dipilih).
	const isVideo = (p: Photo) => p.assetType === "VIDEO";
	const hrefOf = (p: Photo) => (isVideo(p) ? `/videos/${p.id}` : `/photos/${p.id}`);

	// Pratinjau gerak video saat kartu di-hover (sama seperti kartu di halaman video).
	function playPreview(e: Event) {
		if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
		const v = (e.currentTarget as HTMLElement).querySelector<HTMLVideoElement>("video[data-preview]");
		if (v?.src) void v.play().catch(() => {});
	}
	function stopPreview(e: Event) {
		const v = (e.currentTarget as HTMLElement).querySelector<HTMLVideoElement>("video[data-preview]");
		if (!v || v.paused) return;
		v.pause();
		try {
			v.currentTime = 0;
		} catch {
			/* belum termuat */
		}
	}

	function add(p: Photo) {
		store.addToCart({ id: p.id, kind: "photo", title: p.title[lang], price: p.price, meta: p.id, thumbUrl: p.thumbUrl });
		addedId = p.id;
		announcer.announce(`${p.title[lang]} ${addedMsg}`);
		setTimeout(() => (addedId = null), 1600);
	}

	/** Match apps/web MasonryGrid: 3 / 2 / 1 columns by breakpoint. */
	function colCountFor(w: number): number {
		if (w >= 1024) return 3;
		if (w >= 640) return 2;
		return 1;
	}

	/** Kolom disamakan rata (tanpa parallax) + kartu dirapatkan. */
	const SPEEDS = [0, 0, 0, 0];

	/** Directional clip-path wipes, cycled per card for a more dynamic reveal. */
	const CLIPS = [
		"inset(100% 0% 0% 0%)", // top → down
		"inset(0% 0% 0% 100%)", // left → right
		"inset(0% 0% 100% 0%)", // bottom → up
		"inset(0% 100% 0% 0%)" // right → left
	];

	let cols = $state<Photo[][]>([]);
	let rootEl: HTMLDivElement | undefined = $state();

	// `cols` adalah state yang mendorong render kartu. Saat foto async tiba (atau
	// breakpoint berganti), build() → cols = filled → commit dengan kartu di
	// DOM → $effect gsap re-run dan query .masonry__col / .masonry__card yang sudah ada.
	// Jika deps hanya [cc, reduceMotion], cc tak berubah saat foto datang (3→3
	// no-op) → gsap effect tak re-run → trigger parallax kolom & reveal kartu diukir
	// saat kolom masih kosong → parallax masonry tak pernah jalan. Revert atomic
	// (gsap.context) mencegah trigger yatim menumpuk di resize.

	// Build columns by shortest accumulated aspect-height (height/width).
	$effect(() => {
		// Tinggi masonry berubah saat kolom dibangun (foto async tiba) maupun saat
		// breakpoint berganti. Section pin di bawahnya (orbit "Arsip dalam gerak")
		// diukir saat mungkin masonry masih kosong (efek layout orbit jalan sebelum
		// efek pasif build ini), lalu bergantung refresh kebetulan (rAF/fonts.ready)
		// untuk re-ukur — kadang tak tepat waktu → orbit muncul di posisi masonry.
		// Refresh deterministik setelah kolom benar-benar render (rAF, setelah commit)
		// menyelaraskan posisi pin di bawahnya.
		function build(count: number) {
			const columns: Photo[][] = Array.from({ length: count }, () => []);
			const heights = new Array(count).fill(0);
			photos.forEach((p) => {
				const idx = heights.indexOf(Math.min(...heights));
				columns[idx].push(p);
				heights[idx] += p.h / p.w;
			});
			cols = columns;
		}
		const scheduleRefresh = () =>
			requestAnimationFrame(() => {
				if (rootEl?.isConnected) calmRefresh();
			});
		let cur = colCountFor(window.innerWidth);
		build(cur);
		scheduleRefresh();
		let t: number;
		const onResize = () => {
			window.clearTimeout(t);
			t = window.setTimeout(() => {
				const n = colCountFor(window.innerWidth);
				if (n !== cur) {
					cur = n;
					build(n);
					scheduleRefresh();
				}
			}, 200);
		};
		window.addEventListener("resize", onResize);
		return () => window.removeEventListener("resize", onResize);
	});

	// Parallax kolom + reveal clip-path kartu (dipicu scroll). Re-run saat `cols`
	// berubah (kartu sudah di DOM) — context.revert() membersihkan trigger lama.
	$effect(() => {
		void cols;
		void reduceMotion;
		const root = rootEl;
		if (!root) return;
		const reduce = reduceMotion || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
		if (reduce) {
			calmRefresh();
			return;
		}
		const ctx = gsap.context(() => {
			// Column parallax — each column drifts at a different rate.
			const colEls = root.querySelectorAll<HTMLElement>(".masonry__col");
			colEls.forEach((col, i) => {
				const speed = SPEEDS[i % SPEEDS.length];
				if (!speed) return;
				gsap.to(col, {
					y: speed,
					ease: "none",
					scrollTrigger: { trigger: root, start: "top bottom", end: "bottom top", scrub: 1.5 }
				});
			});
			// Card clip-path reveal + image scale-from-1.15 on scroll into view.
			const cards = root.querySelectorAll<HTMLElement>(".masonry__card");
			cards.forEach((card) => {
				const clip = card.dataset.clip || CLIPS[0];
				gsap.fromTo(
					card,
					{ clipPath: clip },
					{
						clipPath: "inset(0% 0% 0% 0%)",
						duration: 1,
						ease: "power3.out",
						scrollTrigger: { trigger: card, start: "top 92%", once: true }
					}
				);
				const img = card.querySelector("img");
				if (img) {
					gsap.from(img, {
						scale: 1.15,
						duration: 1.2,
						ease: "power2.out",
						scrollTrigger: { trigger: card, start: "top 92%", once: true }
					});
				}
			});
			calmRefresh();
		}, root);
		return () => ctx.revert();
	});
</script>

<div bind:this={rootEl} class="masonry flex w-full items-start gap-[clamp(0.55rem,1.2vw,1rem)]">
	{#each cols as col, ci (ci)}
		<div class="masonry__col flex min-w-0 flex-1 flex-col gap-[clamp(0.55rem,1.2vw,1rem)]">
			{#each col as p (p.id)}
				{@const fav = store.isFavorite(p.id)}
				<a
					href={hrefOf(p)}
					onmouseenter={playPreview}
					onmouseleave={stopPreview}
					onfocus={playPreview}
					onblur={stopPreview}
					data-clip={CLIPS[photos.indexOf(p) % CLIPS.length]}
					class="masonry__card group relative block pb-3 after:absolute after:bottom-0 after:left-0 after:h-px after:w-full after:origin-left after:scale-x-0 after:bg-safelight after:transition-transform after:duration-500 after:ease-out hover:after:scale-x-100 focus-visible:after:scale-x-100"
				>
					<div class="relative w-full overflow-hidden rounded-[3px] border border-hair" style={`aspect-ratio: ${p.w} / ${p.h};`}>
						<ApiImage
							src={imgFor(p.seed, 800, Math.round((800 * p.h) / p.w), p.thumbUrl)}
							alt={p.title[lang]}
							fill
							class="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]"
						/>
						{#if isVideo(p)}
							{@const prev = pickVideoPreview(p.clipUrl, p.watermarkUrl)}
							{#if prev}
								<video
									data-preview
									src={prev}
									muted
									loop
									playsinline
									preload="none"
									aria-hidden="true"
									tabindex="-1"
									class="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100 group-focus-visible:opacity-100"
								></video>
							{/if}
							<span class="absolute bottom-3 left-3 grid h-7 w-7 place-items-center rounded-full bg-ocean-deep/55 text-ivory backdrop-blur transition-opacity duration-300 group-hover:opacity-0" role="img" aria-label="Video">
								<svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5Z" /></svg>
							</span>
						{/if}
						<div class="absolute inset-0 bg-gradient-to-t from-ocean-deep/60 via-transparent to-transparent opacity-80" />
						<!-- Baris atas: hanya tombol di kanan (keranjang + hati,
							muncul saat hover) — pil kategori dilepas mengikuti
							kartu video. Kategori tetap dibaca di halaman detail. -->
						<div class="absolute inset-x-0 top-0 flex items-start justify-end gap-2 p-3">
							<span class="flex shrink-0 items-center gap-2">
								<!-- <span class="kicker inline-flex h-9 items-center whitespace-nowrap rounded-full bg-ocean-deep/55 px-4 text-ivory backdrop-blur">
									{fmtIDR(p.price)}
								</span> -->
								{#if !isVideo(p)}
								<button
									type="button"
									onclick={(e) => {
										e.preventDefault();
										add(p);
									}}
									aria-label={`${cartLabel} — ${p.title[lang]}`}
									class="tap-expand grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ocean-deep/45 text-ivory opacity-0 backdrop-blur transition-all duration-300 hover:bg-safelight focus-visible:opacity-100 active:bg-safelight group-hover:opacity-100 max-sm:opacity-100"
								>
									{#if addedId === p.id}
										<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
									{:else}
										<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="20" r="1.4" /><circle cx="18" cy="20" r="1.4" /><path d="M2.5 3h2.2l2.3 11.2a1.6 1.6 0 0 0 1.6 1.3h8.6a1.6 1.6 0 0 0 1.6-1.3L21 7H6" /></svg>
									{/if}
								</button>
								{/if}
								<button
									type="button"
									onclick={(e) => {
										e.preventDefault();
										store.toggleFavorite(p.id);
									}}
									aria-label={fav ? "Unsave" : "Save"}
									class="tap-expand grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ocean-deep/45 text-ivory opacity-0 backdrop-blur transition-all duration-300 hover:bg-safelight focus-visible:opacity-100 active:bg-safelight group-hover:opacity-100 max-sm:opacity-100"
								>
									<svg width="15" height="15" viewBox="0 0 24 24" fill={fav ? "#ff4d12" : "none"} stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
										<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" />
									</svg>
								</button>
							</span>
						</div>
						<!-- Keterangan foto: judul + fotografer, terbit bersama
							tombol saat hover (selalu tampil di mobile). -->
						<div class="absolute inset-x-0 bottom-0 translate-y-2 p-4 opacity-0 transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100 max-sm:translate-y-0 max-sm:opacity-100">
							<h3 class="font-display text-lg font-light leading-tight tracking-[-0.01em] text-ivory">
								{p.title[lang]}
							</h3>
							<p class="mt-0.5 text-xs text-ivory/60">{p.author}</p>
						</div>
					</div>

				</a>
			{/each}
		</div>
	{/each}
</div>
