<script module lang="ts">
	/**
	 * Marquee gambar tak berhingga: satu baris digandakan, lalu digeser
	 * translateX(0) → translateX(-50%) secara linear. Karena separuhnya salinan
	 * persis, titik akhir animasi identik dengan titik awal — loopnya tak
	 * berjahit.
	 *
	 * Tiga hal diubah dari sumber aslinya, dan masing-masing ada alasannya:
	 *
	 * 1. TIDAK ADA `<style>` yang menyentuh html/body. Aslinya menyetel
	 *    `font-family: system-ui` pada body — dari dalam sebuah komponen. Itu akan
	 *    menimpa tipografi seluruh situs, bukan cuma section ini.
	 * 2. Gambar jadi prop, bukan daftar Unsplash yang dipatok di dalam komponen.
	 * 3. Tinggi kartu tetap, lebarnya mengikuti rasio asli foto. Kartu persegi
	 *    memaksa setiap bingkai ter-crop; strip dengan tinggi seragam dan lebar
	 *    bebas justru bagaimana contact strip film sungguhan terbaca.
	 */
	export type SliderImage = {
		src: string;
		alt: string;
		/** Bila ada, kartunya jadi tautan. */
		href?: string;
	};

	/** Hash deterministik — pengganti React.useId: nama track & keyframes harus
	 *  identik antara SSR dan hydration, jadi diturunkan dari sumber gambar. */
	function hash(s: string): string {
		let h = 5381;
		for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
		return h.toString(36);
	}
</script>

<script lang="ts">
	let {
		images,
		speed = 60,
		class: className = ""
	}: { images: SliderImage[]; speed?: number; class?: string } = $props();

	// Digandakan supaya loopnya tak berjahit.
	const doubled = $derived([...images, ...images]);

	const track = $derived(`ias-t-${hash(images.map((i) => i.src).join("|"))}`);

	const css = $derived(
		`@keyframes ${track}{from{transform:translate3d(0,0,0)}to{transform:translate3d(-50%,0,0)}}` +
			`.${track}{animation:${track} ${speed}s linear infinite}` +
			// Berhenti saat disentuh atau saat ada kartu yang menerima fokus papan
			// ketik — kalau tidak, tautannya mustahil diklik.
			`.${track}:hover,.${track}:focus-within{animation-play-state:paused}` +
			`@media(prefers-reduced-motion:reduce){.${track}{animation:none}}`
	);
</script>

{#if images.length}
	<div class={`ias ${className}`}>
		{@html `<style>${css}<\/style>`}
		<div class="ias-mask">
			<div class={`${track} ias-track`}>
				{#each doubled as img, i (i)}
					{@const isClone = i >= images.length}
					{#if img.href && !isClone}
						<a href={img.href} class="ias-card" aria-label={img.alt}>
							<img
								src={img.src}
								alt={img.alt}
								loading="lazy"
								decoding="async"
								draggable="false"
							/>
						</a>
					{:else}
						<span class="ias-card" aria-hidden={isClone || undefined}>
							<!-- Salinan kedua disembunyikan dari pembaca layar dan dari urutan
								tab: isinya sama persis, jadi mengumumkannya dua kali cuma
								menggandakan kebisingan. -->
							<img
								src={img.src}
								alt={i < images.length ? img.alt : ""}
								loading="lazy"
								decoding="async"
								draggable="false"
							/>
						</span>
					{/if}
				{/each}
			</div>
		</div>
	</div>
{/if}
