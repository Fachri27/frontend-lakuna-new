<script module lang="ts">
	import { pauseOffscreen } from "$lib/pauseOffscreen";
	import ApiImage from "../ApiImage.svelte";
	/**
	 * Satu baris poster yang berjalan tanpa henti.
	 *
	 * Deretnya digandakan lalu digeser sejauh 50% secara linear. Karena separuh
	 * kedua salinan persis separuh pertama, titik akhir animasi identik dengan
	 * titik awal — loopnya tak berjahit. Jarak antarkartu memakai margin, bukan
	 * `gap`: dengan gap, lebar track kurang satu jarak dari dua kali separuhnya,
	 * sehingga -50% meleset setengah jarak dan loopnya meloncat.
	 *
	 * Deret pendek diulang sampai paling sedikit `minCards` kartu per separuh,
	 * supaya separuh itu selalu lebih lebar dari layar dan tidak pernah terlihat
	 * celah kosong di monitor lebar. Durasi dihitung per kartu, jadi kecepatannya
	 * sama berapa pun jumlah fotonya.
	 *
	 * Tidak ada `<style>` yang menyentuh html/body — hanya keyframes milik track ini.
	 */
	export type SliderImage = {
		src: string;
		alt: string;
		/** Id foto di API: thumbnail yang direntangkan diganti versi tajam saat terlihat (lihat ApiImage). */
		photoId?: string;
		/** Bila ada, kartunya jadi tautan. */
		href?: string;
	};

	/** Hash deterministik: nama track & keyframes harus identik antara SSR dan
	 *  hydration, jadi diturunkan dari sumber gambar dan arahnya. */
	function hash(s: string): string {
		let h = 5381;
		for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
		return h.toString(36);
	}
</script>

<script lang="ts">
	let {
		images,
		direction = "left",
		secondsPerCard = 3.4,
		minCards = 14,
		class: className = ""
	}: {
		images: SliderImage[];
		/** Arah gerak baris. */
		direction?: "left" | "right";
		/** Waktu yang dibutuhkan satu kartu untuk bergeser sejauh lebarnya sendiri. */
		secondsPerCard?: number;
		/** Jumlah kartu minimum per separuh track. */
		minCards?: number;
		class?: string;
	} = $props();

	const filled = $derived.by(() => {
		if (!images.length) return [];
		const copies = Math.max(1, Math.ceil(minCards / images.length));
		return Array.from({ length: copies }, () => images).flat();
	});

	// Dua separuh identik: separuh kedua yang membuat loopnya tak berjahit.
	const cards = $derived([...filled, ...filled]);

	const track = $derived(`ias-t-${hash(direction + "|" + images.map((i) => i.src).join("|"))}`);

	const css = $derived.by(() => {
		const [from, to] = direction === "left" ? ["0", "-50%"] : ["-50%", "0"];
		const duration = (filled.length * secondsPerCard).toFixed(1);
		return (
			`@keyframes ${track}{from{transform:translate3d(${from},0,0)}to{transform:translate3d(${to},0,0)}}` +
			`.${track}{animation:${track} ${duration}s linear infinite}` +
			// Berhenti saat disentuh atau saat ada kartu yang menerima fokus papan
			// ketik — kalau tidak, tautannya mustahil diklik.
			`.${track}:hover,.${track}:focus-within{animation-play-state:paused}` +
			// Foto teracak dirender ApiImage sebagai <canvas> (lib/photoScramble.ts): aturan `.ias-card img` di app.css
			// berlaku sama untuknya — tanpa ini kanvas tampil seukuran pikselnya di dalam kartu.
			`.${track} .ias-card canvas{display:block;width:100%;height:100%;max-width:none;object-fit:cover;transition:transform .7s cubic-bezier(.16,1,.3,1)}` +
			`.${track} .ias-card:hover canvas,.${track} .ias-card:focus-visible canvas{transform:scale(1.04)}` +
			`@media(prefers-reduced-motion:reduce){.${track}{animation:none}.${track} .ias-card canvas{transition:none}}`
		);
	});
</script>

{#if images.length}
	<!-- Jeda luar layar tanpa margin: jeda membekukan waktu animasi, jadi baris yang baru masuk layar lanjut dari
		titik yang sama (tak ada loncatan) — margin 120px hanya membuat baris tetap berjalan saat belum terlihat. -->
	<div class={`ias ${className}`} {@attach pauseOffscreen("0px")}>
		{@html `<style>${css}<\/style>`}
		<div class="ias-mask">
			<div class={`${track} ias-track`}>
				{#each cards as img, i (i)}
					<!-- Hanya kemunculan pertama tiap foto yang diumumkan dan bisa difokus;
						salinannya tetap bisa diklik dengan tetikus, tapi disembunyikan dari
						pembaca layar dan urutan tab supaya isinya tidak terdengar berulang. -->
					{@const primary = i < filled.length}
					{#if img.href}
						<a
							href={img.href}
							class="ias-card"
							aria-label={primary ? img.alt : undefined}
							aria-hidden={primary ? undefined : "true"}
							tabindex={primary ? undefined : -1}
						>
							<ApiImage src={img.src} alt={primary ? img.alt : ""} eager={primary && i < 6} photoId={img.photoId} />
						</a>
					{:else}
						<span class="ias-card" aria-hidden={primary ? undefined : "true"}>
							<ApiImage src={img.src} alt={primary ? img.alt : ""} eager={primary && i < 6} photoId={img.photoId} />
						</span>
					{/if}
				{/each}
			</div>
		</div>
	</div>
{/if}
