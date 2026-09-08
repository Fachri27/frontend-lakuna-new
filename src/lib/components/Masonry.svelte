<script lang="ts">
	import ApiImage from "./ApiImage.svelte";
	import gsap from "gsap";
	import { ScrollTrigger } from "gsap/ScrollTrigger";
	import { i18n } from "$lib/i18n.svelte";
	import { store } from "$lib/store.svelte";
	import { catLabel, fmtIDR, imgFor, type Photo } from "$lib/data";

	gsap.registerPlugin(ScrollTrigger);

	let { photos, reduceMotion = false }: { photos: Photo[]; reduceMotion?: boolean } = $props();

	const lang = $derived(i18n.lang);

	/** Match apps/web MasonryGrid: 3 / 2 / 1 columns by breakpoint. */
	function colCountFor(w: number): number {
		if (w >= 1024) return 3;
		if (w >= 640) return 2;
		return 1;
	}

	/** Match apps/web: column parallax speeds (px), scrub 1.5. */
	const SPEEDS = [0, -80, 50, -40];

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
				if (rootEl?.isConnected) ScrollTrigger.refresh();
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
			ScrollTrigger.refresh();
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
			ScrollTrigger.refresh();
		}, root);
		return () => ctx.revert();
	});
</script>

<div bind:this={rootEl} class="masonry flex w-full items-start gap-[clamp(0.9rem,2vw,1.6rem)]">
	{#each cols as col, ci (ci)}
		<div class="masonry__col flex min-w-0 flex-1 flex-col gap-[clamp(0.9rem,2vw,1.6rem)]">
			{#each col as p (p.id)}
				{@const fav = store.isFavorite(p.id)}
				<a
					href={`/photos/${p.id}`}
					data-clip={CLIPS[photos.indexOf(p) % CLIPS.length]}
					class="masonry__card group relative block overflow-hidden rounded-sm bg-surface-2"
				>
					<div class="relative w-full overflow-hidden" style={`aspect-ratio: ${p.w} / ${p.h};`}>
						<ApiImage
							src={imgFor(p.seed, 800, Math.round((800 * p.h) / p.w), p.thumbUrl)}
							alt={p.title[lang]}
							fill
							class="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]"
						/>
						<div class="absolute inset-0 bg-gradient-to-t from-ocean-deep/80 via-transparent to-transparent" />
					</div>

					<!-- persistent tags -->
					<span class="absolute left-3 top-3 kicker rounded-full bg-ocean-deep/55 px-2.5 py-1 text-ivory backdrop-blur">
						{catLabel[p.cat][lang]}
					</span>
					<span class="absolute right-3 top-3 kicker rounded-full bg-ocean-deep/55 px-2.5 py-1 text-ivory backdrop-blur">
						{fmtIDR(p.price)}
					</span>

					<!-- hover meta -->
					<div class="absolute inset-x-0 bottom-0 translate-y-3 p-5 opacity-0 transition-all duration-500 ease-out group-hover:translate-y-0 group-hover:opacity-100">
						<h3 class="font-display text-xl font-light tracking-[-0.01em] text-ivory">
							{p.title[lang]}
						</h3>
						<p class="mt-0.5 text-xs text-ivory/70">{p.author}</p>
					</div>

					<button
						type="button"
						onclick={(e) => {
							e.preventDefault();
							store.toggleFavorite(p.id);
						}}
						aria-label={fav ? "Unsave" : "Save"}
						class="absolute bottom-3 right-3 grid h-9 w-9 place-items-center rounded-full bg-ocean-deep/45 text-ivory backdrop-blur transition-colors hover:bg-safelight"
					>
						<svg width="15" height="15" viewBox="0 0 24 24" fill={fav ? "#ff4d12" : "none"} stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
							<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" />
						</svg>
					</button>
				</a>
			{/each}
		</div>
	{/each}
</div>
