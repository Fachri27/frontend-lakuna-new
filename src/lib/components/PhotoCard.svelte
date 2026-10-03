<script lang="ts">
	import { i18n } from "$lib/i18n.svelte";
	import { store } from "$lib/store.svelte";
	import { imgFor, type Photo } from "$lib/data";
	import ApiImage from "./ApiImage.svelte";

	let { photo, className = "", landscape = false }: { photo: Photo; className?: string; landscape?: boolean } = $props();

	const lang = $derived(i18n.lang);
	const fav = $derived(store.isFavorite(photo.id));
</script>

<!-- .on-darkroom: seluruh isi kartu ini ivory di atas foto bergelap-scrim,
     jadi safelight-nya harus tetap nilai lampu walau halamannya kertas. -->
<div class={`on-darkroom group relative ${className}`}>
	<a href={`/photos/${photo.id}`} class="block overflow-hidden rounded-md">
		<div class={`relative overflow-hidden ${landscape ? "aspect-[4/3]" : "aspect-[3/4]"}`}>
			<ApiImage
				src={imgFor(photo.seed, 800, landscape ? 600 : 1000, photo.thumbUrl)}
				alt={photo.title[lang]}
				fill
				class="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
			/>
			<div class="absolute inset-0 bg-gradient-to-t from-ocean-deep/85 via-ocean-deep/15 to-transparent" />
		</div>
	<div class="absolute inset-x-0 bottom-0 translate-y-2 p-3 opacity-0 sm:p-4 transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100 max-sm:translate-y-0 max-sm:opacity-100">
		<h3 class="line-clamp-2 font-display text-[0.95rem] sm:text-lg font-light leading-tight tracking-[-0.01em] text-ivory">
			{photo.title[lang]}
		</h3>
		<p class="mt-0.5 truncate text-[0.7rem] text-ivory/60 sm:text-xs">{photo.author}</p>
	</div>
	</a>

	<button
		type="button"
		onclick={() => store.toggleFavorite(photo.id)}
		aria-label={fav ? "Unsave" : "Save"}
		class="tap-expand absolute! right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-ocean-deep/45 text-ivory opacity-0 backdrop-blur transition-all duration-300 hover:bg-safelight focus-visible:opacity-100 active:bg-safelight group-hover:opacity-100 max-sm:opacity-100"
	>
		<svg width="16" height="16" viewBox="0 0 24 24" fill={fav ? "#ff4d12" : "none"} stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
			<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" />
		</svg>
	</button>
</div>