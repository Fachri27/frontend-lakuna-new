<script lang="ts">
	import { i18n } from "$lib/i18n.svelte";
	import { store } from "$lib/store.svelte";
	import { imgFor, type Video } from "$lib/data";
	import ApiImage from "./ApiImage.svelte";

	/**
	 * Kartu video kecil untuk strip "Video terkait" di halaman detail.
	 * Perilaku sama dengan kartu foto + pratinjau gerak: diam (poster) lalu
	 * autoplay muted saat hover/fokus; judul, kreator, dan hati hanya terbit
	 * saat hover (selalu tampil di mobile).
	 */
	let { video }: { video: Video } = $props();

	const lang = $derived(i18n.lang);
	const fav = $derived(store.isFavorite(video.id));
	const reduceMotion = $derived(
		typeof window !== "undefined" &&
			window.matchMedia("(prefers-reduced-motion: reduce)").matches,
	);

	let vid = $state<HTMLVideoElement>();
	let card = $state<HTMLElement>();

	function play() {
		if (reduceMotion) return;
		const v = vid;
		if (!v?.src) return;
		void v.play().catch(() => {});
	}

	function stop() {
		const v = vid;
		if (!v || v.paused) return;
		v.pause();
		try {
			v.currentTime = 0;
		} catch {
			/* abaikan — video belum termuat */
		}
	}

	// Mobile tanpa hover: putar saat masuk viewport, jeda saat keluar.
	$effect(() => {
		const v = vid;
		if (!v) return;
		if (reduceMotion) return;
		if (!window.matchMedia("(pointer: coarse) and (max-width: 639px)").matches) return;
		const io = new IntersectionObserver(
			([en]) => {
				if (en.isIntersecting) void v.play().catch(() => {});
				else if (!v.paused) v.pause();
			},
			{ threshold: 0.35 },
		);
		io.observe(v);
		return () => io.disconnect();
	});
</script>

<div bind:this={card} class="on-darkroom group relative">
	<a
		href={`/videos/${video.id}`}
		class="block overflow-hidden rounded-md"
		onmouseenter={play}
		onmouseleave={stop}
		onfocus={play}
		onblur={stop}
	>
		<div class="relative aspect-[4/3] overflow-hidden">
			<ApiImage
				src={imgFor(video.seed, 800, 450, video.thumbUrl)}
				alt={video.title[lang]}
				fill
				class="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
			/>
			{#if video.previewUrl}
				<video
					bind:this={vid}
					data-preview
					src={video.previewUrl}
					muted
					loop
					playsinline
					preload="metadata"
					aria-hidden="true"
					tabindex="-1"
					class="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100 group-focus-visible:opacity-100 max-sm:opacity-100"
				></video>
			{/if}
			<div class="absolute inset-0 bg-gradient-to-t from-ocean-deep/85 via-ocean-deep/15 to-transparent" />
		</div>
		<div class="absolute inset-x-0 bottom-0 translate-y-2 p-3 opacity-0 sm:p-4 transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100 max-sm:translate-y-0 max-sm:opacity-100">
			<h3 class="line-clamp-2 font-display text-[0.95rem] sm:text-lg font-light leading-tight tracking-[-0.01em] text-ivory">
				{video.title[lang]}
			</h3>
			<p class="mt-0.5 truncate text-[0.7rem] text-ivory/60 sm:text-xs">{video.author}</p>
		</div>
	</a>

	<button
		type="button"
		onclick={() => store.toggleFavorite(video.id)}
		aria-label={fav ? "Unsave" : "Save"}
		class="tap-expand absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-ocean-deep/45 text-ivory opacity-0 backdrop-blur transition-all duration-300 hover:bg-safelight focus-visible:opacity-100 active:bg-safelight group-hover:opacity-100 max-sm:opacity-100"
	>
		<svg width="15" height="15" viewBox="0 0 24 24" fill={fav ? "#ff4d12" : "none"} stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
			<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" />
		</svg>
	</button>
</div>
