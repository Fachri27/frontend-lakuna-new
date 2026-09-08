<script lang="ts">
	import gsap from "gsap";
	import { ScrollTrigger } from "gsap/ScrollTrigger";

	gsap.registerPlugin(ScrollTrigger);

	/**
	 * Sambungan antar dua nada pada tangga kertas (lihat app.css).
	 *
	 * Halaman ini satu cetakan yang muncul di baki, bukan tumpukan section yang
	 * masing-masing mengecat dirinya sendiri. Tiap kali nadanya berpindah, yang
	 * memisahkan bukan potongan keras tapi satu basuhan tinggi dari nada A ke
	 * nada B — plus penanda yang sudah jadi kosakata halaman ini: dua rambut
	 * garis yang tumbuh dari sebuah bujur sangkar kecil, menyala warna safelight.
	 *
	 * Penandanya dipakai berulang di setiap batas nada dengan sengaja: ia
	 * menandai satu hal yang benar-benar terjadi di halaman (nada berganti,
	 * cetakannya maju satu langkah), bukan hiasan yang ditabur.
	 */
	/**
	 * "transparent" untuk batas yang berada di atas lapisan sticky (hero):
	 * di sana sambungan tidak boleh punya tepi atas yang legam, karena tepi itu
	 * akan memotong foto dan tipografi di bawahnya. Dengan transparan, hero
	 * larut ke dalam nada berikutnya — cetakannya memudar, bukan ditutup kartu.
	 */
	type Tone = "paper" | "bg" | "wash" | "darkroom" | "transparent";

	let {
		from,
		to,
		/** Sembunyikan penanda bila batasnya perlu benar-benar senyap. */
		rule = true,
		/**
		 * Basuhannya hanya dicat di mode gelap; di mode terang tingginya tetap
		 * dipakai sebagai jarak, tapi transparan.
		 *
		 * Untuk batas yang menumpang DI ATAS foto (hero yang sticky): di kamar
		 * gelap, memudar ke --wash yang nyaris hitam terbaca sebagai foto yang
		 * larut. Di mode terang --wash itu krem, jadi basuhan yang sama menjadi
		 * kabut pucat yang menelan bagian bawah foto berikut teks di atasnya.
		 */
		darkOnly = false,
		/** Tinggi basuhan. Batas di atas foto butuh ruang lebih panjang. */
		height = "clamp(64px, 10vh, 116px)",
		class: className = ""
	}: { from: Tone; to: Tone; rule?: boolean; darkOnly?: boolean; height?: string; class?: string } = $props();

	const tone = (t: Tone) => (t === "transparent" ? "transparent" : `var(--${t})`);

	let el: HTMLDivElement | undefined = $state();

	// Gradien dua-henti menghasilkan pita yang terlihat karena titik tengahnya
	// linear di sRGB. Empat henti dengan color-mix mendekati kurva ease-in-out —
	// perpindahannya terbaca sebagai basuhan, bukan sambungan.
	const wash = $derived(
		`linear-gradient(to bottom,` +
			` ${tone(from)} 0%,` +
			` color-mix(in srgb, ${tone(from)} 70%, ${tone(to)}) 30%,` +
			` color-mix(in srgb, ${tone(from)} 28%, ${tone(to)}) 62%,` +
			` ${tone(to)} 100%)`
	);

	$effect(() => {
		const node = el;
		if (!node || !rule) return;
		if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
			gsap.set(node.querySelectorAll("[data-seam-rule]"), { scaleX: 1 });
			gsap.set(node.querySelectorAll("[data-seam-mark]"), { opacity: 1 });
			return;
		}
		const ctx = gsap.context(() => {
			gsap.fromTo(
				"[data-seam-rule]",
				{ scaleX: 0 },
				{
					scaleX: 1,
					ease: "none",
					scrollTrigger: { trigger: node, start: "top bottom", end: "center center", scrub: 0.6 }
				}
			);
			// Bujur sangkarnya menyala saat batasnya melintasi tengah viewport —
			// lampu safelight yang lewat di atas baki.
			gsap.fromTo(
				"[data-seam-mark]",
				{ opacity: 0.25 },
				{
					opacity: 1,
					ease: "none",
					scrollTrigger: { trigger: node, start: "top 75%", end: "center center", scrub: 0.6 }
				}
			);
		}, node);
		return () => ctx.revert();
	});
</script>

<div
	bind:this={el}
	aria-hidden="true"
	class={`pointer-events-none relative w-full ${className}`}
	style={`height: ${height};`}
>
	<div
		class={`absolute inset-0 ${darkOnly ? "hidden dark:block" : ""}`}
		style={`background: ${wash};`}
	></div>
	{#if rule}
		<div class="absolute inset-x-0 top-1/2 flex -translate-y-1/2 items-center justify-center gap-3 px-6">
			<span data-seam-rule class="h-px w-12 origin-right bg-safelight/25 sm:w-24"></span>
			<span data-seam-mark class="rotate-45 bg-safelight/50" style="width: 4px; height: 4px;"></span>
			<span data-seam-rule class="h-px w-12 origin-left bg-safelight/25 sm:w-24"></span>
		</div>
	{/if}
</div>
