<script lang="ts">
	/**
	 * Section Sounds di landing (di bawah galeri orbit): judul berpola section landing lain (kicker + judul besar +
	 * ringkasan + tautan) lalu karusel cakram (SoundDiscs).
	 *
	 * Mulai md: judul + karusel tepat SATU LAYAR (100svh): karusel mengisi sisa tinggi di bawah judul dan cakramnya
	 * diukur dari tinggi layar, jadi tombol putar & kontrol di bawah tak terpotong. Ponsel: judul lalu karusel
	 * setinggi hampir satu layar (keduanya tak mungkin muat bersama di layar sempit).
	 */
	import { i18n } from "$lib/i18n.svelte";
	import Reveal from "./Reveal.svelte";
	import RevealText from "./RevealText.svelte";
	import SoundDiscs from "./SoundDiscs.svelte";

	const copy = {
		id: {
			kicker: "Sounds",
			heading: "Dengarkan arsipnya",
			sub: "Musik dan efek suara bebas royalti dari hutan, laut, pasar, dan panggung budaya Nusantara. Putar pratinjaunya di sini, lalu lisensikan berkas aslinya di halaman Sounds.",
			seeAll: "Lihat semua audio",
			empty: "Belum ada audio di arsip. Koleksi musik dan efek suara segera hadir.",
		},
		en: {
			kicker: "Sounds",
			heading: "Listen to the archive",
			sub: "Royalty-free music and sound effects from the forests, seas, markets and stages of the archipelago. Preview them here, then license the original files on the Sounds page.",
			seeAll: "See all audio",
			empty: "No audio in the archive yet. Music and sound effects are coming soon.",
		},
	};
	const t = $derived(copy[i18n.lang]);

	let loaded = $state(false);
	let count = $state(0);
</script>

<!-- Tanpa bingkai, tepi karusel memudar ke --bg: terbaca sebagai bagian halaman, bukan widget yang ditempel.
	--dcc-bottom: tombol Bantuan / ke-atas yang melayang di dasar layar menimpa tepi bawah karusel. -->
<section
	class="hs-sec relative flex flex-col [--dcc-bottom:4.5rem]"
	aria-labelledby="home-sounds-h"
	data-home-sounds
	data-no-hover-sound
	data-no-click-sound
>
	<!-- pt seukuran banner + navbar: saat section ini memenuhi layar, judulnya tetap di bawah navbar. -->
	<div class="mx-auto w-full max-w-[1500px] px-6 pt-[calc(var(--banner-h,0px)+var(--nav-h)+clamp(0.75rem,2.5vh,2rem))] lg:px-10">
		<!-- start 97%: section ini menumpang ekor galeri orbit (margin negatif di GsapGallery). -->
		<Reveal start="top 97%" class="relative z-10 grid gap-x-10 gap-y-5 lg:grid-cols-12 lg:items-end">
			<div class="lg:col-span-7">
				<p data-reveal class="kicker text-safelight">{t.kicker}</p>
				<div id="home-sounds-h">
					<RevealText
						as="h2"
						text={t.heading}
						class="mt-5 font-display text-[clamp(2.1rem,4.6vw,3.8rem)] font-light leading-[1.02] tracking-[-0.02em] text-fg"
					/>
				</div>
			</div>
			<div class="lg:col-span-5">
				<p data-reveal class="max-w-[46ch] text-[0.98rem] leading-relaxed text-fg-muted">{t.sub}</p>
				{#if loaded && !count}
					<!-- Katalog masih kosong: pesan di sini (bukan di atas cakram hias), tanpa tautan ke halaman kosong. -->
					<p data-reveal class="mt-4 text-[0.98rem] text-fg">{t.empty}</p>
				{:else}
					<a data-reveal href="/sounds" class="hs-link mt-4 inline-block">{t.seeAll}</a>
				{/if}
			</div>
		</Reveal>
	</div>
	<div class="hs-stage">
		<SoundDiscs landing bind:loaded bind:count />
	</div>
</section>

<style>
	.hs-stage {
		position: relative;
		height: clamp(600px, 92svh, 780px);
	}
	@media (min-width: 768px) {
		.hs-sec {
			height: 100svh;
			min-height: 680px;
		}
		.hs-stage {
			flex: 1 1 auto;
			min-height: 0;
			height: auto;
		}
	}
	.hs-link {
		font-size: 0.85rem;
		color: var(--fg);
		text-decoration: underline;
		text-decoration-color: color-mix(in oklab, currentColor 35%, transparent);
		text-underline-offset: 0.3em;
		transition:
			color 0.25s ease,
			text-decoration-color 0.25s ease;
	}
	.hs-link:hover,
	.hs-link:focus-visible {
		color: var(--safelight);
		text-decoration-color: var(--safelight);
	}
</style>
