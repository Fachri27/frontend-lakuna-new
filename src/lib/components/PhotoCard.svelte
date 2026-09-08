<script lang="ts">
	import { i18n } from "$lib/i18n.svelte";
	import { store } from "$lib/store.svelte";
	import { catLabel, fmtIDR, imgFor, type Photo } from "$lib/data";
	import ApiImage from "./ApiImage.svelte";

	let { photo, className = "" }: { photo: Photo; className?: string } = $props();

	const lang = $derived(i18n.lang);
	const fav = $derived(store.isFavorite(photo.id));
</script>

<!-- .on-darkroom: seluruh isi kartu ini ivory di atas foto bergelap-scrim,
     jadi safelight-nya harus tetap nilai lampu walau halamannya kertas. -->
<div class={`on-darkroom group relative ${className}`}>
	<a href={`/photos/${photo.id}`} class="block overflow-hidden rounded-md">
		<div class="relative aspect-[3/4] overflow-hidden">
			<ApiImage
				src={imgFor(photo.seed, 800, 1000, photo.thumbUrl)}
				alt={photo.title[lang]}
				fill
				class="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
			/>
			<div class="absolute inset-0 bg-gradient-to-t from-ocean-deep/75 via-ocean-deep/10 to-transparent" />
		</div>
		<div class="absolute inset-x-0 bottom-0 p-4">
			<span class="kicker text-safelight/90">{catLabel[photo.cat][lang]}</span>
			<h3 class="mt-1.5 font-display text-lg font-light tracking-[-0.01em] text-ivory">
				{photo.title[lang]}
			</h3>
			<p class="mt-0.5 text-xs text-ivory/60">{photo.author}</p>
		</div>
	</a>

	<span class="absolute left-3 top-3 kicker rounded-full bg-ocean-deep/55 px-2.5 py-1 text-ivory backdrop-blur">
		{fmtIDR(photo.price)}
	</span>

	<button
		type="button"
		onclick={() => store.toggleFavorite(photo.id)}
		aria-label={fav ? "Unsave" : "Save"}
		class="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-ocean-deep/45 text-ivory backdrop-blur transition-colors hover:bg-safelight"
	>
		<svg width="16" height="16" viewBox="0 0 24 24" fill={fav ? "#ff4d12" : "none"} stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
			<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" />
		</svg>
	</button>
</div>