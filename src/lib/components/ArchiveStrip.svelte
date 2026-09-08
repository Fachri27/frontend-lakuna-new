<script lang="ts">
	import { i18n } from "$lib/i18n.svelte";
	import { fetchPhotos, imgFor, type Photo } from "$lib/data";
	import RevealText from "./RevealText.svelte";
	import Reveal from "./Reveal.svelte";
	import ImageAutoSlider from "./ui/ImageAutoSlider.svelte";

	/**
	 * Arsip — strip bingkai yang hanyut lewat, tiap kartunya bisa diklik.
	 *
	 * Section ini sudah beberapa kali berganti bentuk, dan yang paling sering
	 * hilang tiap kali adalah pintu masuknya: koridor 3D sebelumnya sama sekali
	 * tidak bisa diklik. Di sini tiap kartu adalah tautan ke halaman bingkainya,
	 * dan strip berhenti saat disentuh — kalau tidak, tautannya mustahil dikenai
	 * kursor.
	 */
	const MAX_FRAMES = 14;

	const lang = $derived(i18n.lang);
	const t = $derived(i18n.c.journeys);
	let photos = $state<Photo[]>([]);

	$effect(() => {
		let alive = true;
		fetchPhotos({ type: "FOTO", limit: 60 })
			.then((r) => {
				if (alive) photos = r.photos;
			})
			.catch(() => {});
		return () => {
			alive = false;
		};
	});

	const images = $derived(
		photos.slice(0, MAX_FRAMES).map((p) => ({
			src: imgFor(p.seed, 900, 600, p.thumbUrl),
			alt: p.title[lang],
			href: `/photos/${p.id}`
		}))
	);
</script>

{#if images.length}
	<section class="as">
		<div class="as-inner">
			<Reveal class="as-head">
				<p data-reveal class="kicker text-safelight">{t.kicker}</p>
				<RevealText as="h2" text={t.title} class="as-title" />
			</Reveal>
		</div>
		<ImageAutoSlider {images} speed={60} />
	</section>
{/if}
