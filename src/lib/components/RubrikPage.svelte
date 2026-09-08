<script lang="ts">
	import { i18n } from "$lib/i18n.svelte";
	import { catLabel, COLLECTIONS, imgFor } from "$lib/data";
	import Reveal from "./Reveal.svelte";
	import ParallaxImage from "./ParallaxImage.svelte";

	const copy = {
		id: { kicker: "Rubrik", title: "Koleksi pilihan", sub: "Anjungan editorial — cerita-cerita visual yang dikurasi dari arsip Lakuna.", explore: "Jelajahi", frames: "bingkai" },
		en: { kicker: "Rubrics", title: "Curated collections", sub: "Editorial pavilions — visual stories curated from the Lakuna archive.", explore: "Explore", frames: "frames" },
	};

	const lang = $derived(i18n.lang);
	const t = $derived(copy[lang]);
</script>

<section class="mx-auto max-w-[1500px] px-6 pb-12 pt-36 lg:px-10 lg:pt-44">
	<Reveal>
		<p data-reveal class="kicker text-safelight">{t.kicker}</p>
		<h1 data-reveal class="mt-5 font-display text-[clamp(2.4rem,6vw,5rem)] font-light leading-[0.98] tracking-[-0.03em] text-fg">{t.title}</h1>
		<p data-reveal class="mt-6 max-w-xl text-[1.02rem] leading-relaxed text-fg-muted">{t.sub}</p>
	</Reveal>
</section>

<section class="mx-auto max-w-[1500px] px-6 pb-28 lg:px-10">
	<Reveal stagger={0.1} class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
		{#each COLLECTIONS as col, i (col.id)}
			<a
				href={`/photos?cat=${col.cat}`}
				data-reveal
				class={`group relative block overflow-hidden rounded-md ${i % 5 === 0 ? "md:col-span-2 lg:col-span-1" : ""}`}
			>
				<div class="relative aspect-[4/5] overflow-hidden">
					<ParallaxImage
						src={imgFor(col.seed, 900, 1100)}
						alt={col.title[lang]}
						sizes="(max-width: 768px) 100vw, 33vw"
						class="absolute inset-0"
						amount={10}
					/>
					<div class="absolute inset-0 bg-gradient-to-t from-ocean-deep/85 via-ocean-deep/20 to-transparent"></div>
				</div>
				<div class="absolute inset-x-0 bottom-0 p-6">
					<span class="kicker text-safelight/90">{catLabel[col.cat][lang]} · {col.count} {t.frames}</span>
					<h3 class="mt-2 font-display text-2xl font-light tracking-[-0.01em] text-ivory">{col.title[lang]}</h3>
					<p class="mt-2 max-w-xs text-sm leading-relaxed text-ivory/70">{col.desc[lang]}</p>
					<span class="arrow-link mt-4 text-ivory/80">
						<span class="kicker">{t.explore}</span>
						<span class="arr text-safelight">→</span>
					</span>
				</div>
			</a>
		{/each}
	</Reveal>
</section>
