<script lang="ts">
	import { pauseOffscreen } from "$lib/pauseOffscreen";
	import { isScrambledUrl, loadScrambledCached, paintScrambled, scrambleKey, scrambledSize } from "$lib/photoScramble";
	import type { Snippet } from "svelte";

	/**
	 * Koridor gambar — port Svelte dari `ImageStreamHero` (React). Dua rel
	 * kartu melaju dari jauh di belakang layar ke arah penonton. Proyeksi
	 * perspektif sendiri yang membuat kartu membesar SEKALIGUS menyapu keluar
	 * dari titik hilang, karena posisi & ukuran diskalakan faktor yang sama.
	 *
	 *  1. Kedalaman ditulis sebagai UKURAN TAMPAK geometris: tiap kartu lebih
	 *     besar dengan rasio tetap dari yang di belakangnya → pita tak robek.
	 *  2. Rel membuka keras di awal lalu menahan (`fan` > 1): pita keluar dari
	 *     tengah sebagai pita datar, menekuk sekali, lalu lari diagonal.
	 *  3. Kedua ujung loop tak pernah di layar: kartu lahir MENYEBERANG sumbu
	 *     (`railBirth` negatif) sehingga tengah selalu tertutup, dan mati
	 *     setelah tepi dalamnya lewat 50cqw.
	 *
	 * Semua panjang dalam `cqw` (persen lebar wadah) → proporsi sama di ukuran
	 * apa pun. Nilai bawaan = nilai asli komponen rujukan.
	 */
	type Path = {
		perspective: number;
		cardWidth: number;
		cardHeight: number;
		cardRadius: number;
		birthHeight: number;
		exitHeight: number;
		railBirth: number;
		railExit: number;
		fan: number;
		turnBirth: number;
		turnExit: number;
		stops: number;
	};
	const PATH: Path = {
		perspective: 30,
		cardWidth: 18,
		cardHeight: 25,
		cardRadius: 0.4,
		birthHeight: 2.6,
		exitHeight: 46,
		railBirth: -11,
		railExit: 44,
		fan: 3.3,
		turnBirth: 6,
		turnExit: 28,
		stops: 24,
	};

	let {
		images,
		imagesAlt,
		cards = 9,
		speed = 18,
		axis = 55,
		path = {},
		class: className = "",
		children,
	}: {
		images: string[];
		/** Rel kiri memakai ini bila diisi — kanan dan kiri bisa beda foto. */
		imagesAlt?: string[];
		cards?: number;
		speed?: number;
		axis?: number;
		path?: Partial<Path>;
		class?: string;
		children?: Snippet;
	} = $props();

	const rawId = $props.id();
	const uid = rawId.replace(/[^a-zA-Z0-9]/g, "");
	const right = `ish-r-${uid}`;
	const left = `ish-l-${uid}`;
	const cardCls = `ish-c-${uid}`;
	const p = $derived({ ...PATH, ...path });

	/** Sampel lintasan sekali → keyframes CSS menelusuri kurva sebenarnya. */
	function keyframes(dir: 1 | -1, name: string, q: Path) {
		const steps: string[] = [];
		for (let s = 0; s <= q.stops; s++) {
			const u = s / q.stops;
			const scale = (q.birthHeight / q.cardHeight) * Math.pow(q.exitHeight / q.birthHeight, u);
			const z = q.perspective * (1 - 1 / scale);
			const rail = q.railExit - (q.railExit - q.railBirth) * Math.pow(1 - u, q.fan);
			const turn = q.turnBirth + (q.turnExit - q.turnBirth) * u;
			steps.push(
				`${(u * 100).toFixed(2)}%{transform:translate3d(${(dir * rail).toFixed(2)}cqw,0,${z.toFixed(2)}cqw) rotateY(${(-dir * turn).toFixed(2)}deg)}`,
			);
		}
		return `@keyframes ${name}{${steps.join("")}}`;
	}
	// Dijeda (bukan dimatikan) saat hemat gerak: tiap kartu sudah "dijatuhkan"
	// di tengah lintasan oleh delay negatif, jadi membeku sebagai foto utuh.
	const css = $derived(
		`${keyframes(1, right, p)}${keyframes(-1, left, p)}` +
			`@media(prefers-reduced-motion:reduce){.${cardCls}{animation-play-state:paused}}`,
	);
	const slots = $derived(Array.from({ length: cards }, (_, i) => i));

	/**
	 * Kartu untuk foto TERACAK (lib/photoScramble.ts): <canvas> yang hanya memuat potongan yang pernah terlihat.
	 * Kartu berasio tetap (cardWidth:cardHeight) dengan object-fit: cover di tengah, jadi sisi foto yang berlebih
	 * tak pernah tampil — 18 kanvas selebar turunan 3200 px = ±460 MB memori kanvas, potongan potretnya ±separuh.
	 * Piksel potongan tetap 1:1 dengan berkasnya (tak diperkecil): kartu terdekat butuh resolusi penuh (lihat
	 * streamExit di Footer). Ubin disusun langsung ke kanvas kartu yang digeser ke pojok potongan — tanpa kanvas
	 * kerja selebar foto. Lazy seperti <img loading="lazy">; ganti src → isi lama tetap tampil sampai yang baru siap.
	 *
	 * Sumbernya ImageBitmap, satu berkas per giliran (puncak memori ±satu bitmap, bukan 12), dibagi kartu-kartu
	 * berfoto sama, lalu dilepas begitu kartunya tersusun. Gambar lintas-origin tanpa CORS (harus, supaya kanvas
	 * tetap "tainted") hanya bisa di-decode di MAIN THREAD untuk kanvas — createImageBitmap(<img>) pun begitu —
	 * dan foto 3200 px makan 65–140 ms per berkas (diukur: 8 long task beruntun saat menggulir ke footer; dulu
	 * <img> di-decode di thread raster). Jadi decode foto besar menunggu gulir berhenti (≥300 ms) + idle: kartu
	 * menajam begitu pengguna berhenti, dan animasi rel (CSS, di kompositor) tak terganggu decode. Thumbnail kecil
	 * langsung, supaya kartu tak kosong saat digulir.
	 */
	const fileOf = (url: string) => url.split(/[?#]/)[0]!;
	const cardBitmaps = new Map<string, { p: Promise<ImageBitmap | null>; t: number }>();
	let decodeChain: Promise<unknown> = Promise.resolve();
	let lastScroll = 0;
	$effect(() => {
		const on = () => (lastScroll = performance.now());
		const opt = { passive: true, capture: true };
		window.addEventListener("scroll", on, opt);
		window.addEventListener("wheel", on, opt);
		window.addEventListener("touchmove", on, opt);
		return () => {
			window.removeEventListener("scroll", on, opt);
			window.removeEventListener("wheel", on, opt);
			window.removeEventListener("touchmove", on, opt);
		};
	});
	const QUIET_MS = 300;
	const BIG_PX = 2_000_000;
	const scrollQuiet = () =>
		new Promise<void>((resolve) => {
			const check = () => {
				const wait = QUIET_MS - (performance.now() - lastScroll);
				if (wait > 0) return void window.setTimeout(check, wait + 20);
				if (typeof requestIdleCallback !== "function") return resolve();
				requestIdleCallback(() => (performance.now() - lastScroll < QUIET_MS ? check() : resolve()), { timeout: 1000 });
			};
			check();
		});
	function cardBitmap(src: string): Promise<ImageBitmap | null> {
		const id = fileOf(src);
		const hit = cardBitmaps.get(id);
		if (hit) {
			window.clearTimeout(hit.t);
			return hit.p;
		}
		const loaded = loadScrambledCached(src); // unduhan tetap paralel, decode-nya bergiliran
		const p = loaded
			.then(
				(img) =>
					(decodeChain = decodeChain
						// Bitmap jalur cepat sudah di-decode di luar thread utama; hanya <img> besar yang menunggu gulir tenang.
						.then(() => (img instanceof HTMLImageElement && img.naturalWidth * img.naturalHeight > BIG_PX ? scrollQuiet() : undefined))
						.then(() => createImageBitmap(img))
						.catch(() => null)),
			)
			.then((b) => (b instanceof ImageBitmap ? b : null), () => null);
		cardBitmaps.set(id, { p, t: 0 });
		return p;
	}
	function releaseCardBitmap(src: string) {
		const id = fileOf(src);
		const e = cardBitmaps.get(id);
		if (!e) return;
		window.clearTimeout(e.t);
		// Sesudah semua kartu yang menunggu berkas ini tersusun (callback-nya jalan di giliran yang sama).
		e.t = window.setTimeout(() => {
			if (cardBitmaps.get(id) !== e) return;
			cardBitmaps.delete(id);
			void e.p.then((b) => b?.close());
		}, 0);
	}
	function coverCard(canvas: HTMLCanvasElement, params: { src: string; ratio: number }) {
		let cur = params;
		let token = 0;
		let io: IntersectionObserver | null = null;
		const stop = () => {
			io?.disconnect();
			io = null;
		};
		const run = () => {
			const { src, ratio } = cur;
			const key = scrambleKey(src);
			const my = ++token;
			if (!key) return;
			cardBitmap(src).then(
				async (bmp) => {
					// Bitmap gagal → susun dari <img>-nya (decode sinkron, tapi tetap tampil).
					const img: CanvasImageSource | null = bmp ?? (await loadScrambledCached(src).catch(() => null));
					releaseCardBitmap(src);
					if (my !== token || !img) return;
					const { w, h } = scrambledSize(src, key);
					const wide = w / h > ratio;
					const cw = wide ? Math.max(1, Math.round(h * ratio)) : w;
					const ch = wide ? h : Math.max(1, Math.round(w / ratio));
					// Hanya potongan cover yang tampil (tengah) — kanvas tak menyimpan piksel yang terpotong.
					paintScrambled(canvas, img, src, key, { x: Math.floor((w - cw) / 2), y: Math.floor((h - ch) / 2), w: cw, h: ch });
					canvas.dataset.scr = "ok";
				},
				() => {},
			);
		};
		const start = () => {
			stop();
			if (typeof IntersectionObserver === "undefined") return run();
			io = new IntersectionObserver(
				(entries) => {
					if (entries.some((e) => e.isIntersecting)) {
						stop();
						run();
					}
				},
				{ rootMargin: "1250px" },
			);
			io.observe(canvas);
		};
		start();
		return {
			update(next: { src: string; ratio: number }) {
				if (next.src === cur.src && next.ratio === cur.ratio) return;
				const sameFile = next.ratio === cur.ratio && next.src.split(/[?#]/)[0] === cur.src.split(/[?#]/)[0];
				cur = next;
				// URL presigned diperbarui (berkas sama) → isi kanvas sudah benar.
				if (sameFile && canvas.dataset.scr === "ok") return;
				start();
			},
			destroy() {
				token++;
				stop();
			},
		};
	}
</script>

<svelte:head>
	{@html `<style>${css}</style>`}
</svelte:head>

<!-- Jeda luar layar TANPA margin (bawaan 120px): saat etalase di atas footer memenuhi layar, tepi atas koridor
	tinggal ±80px di bawah layar — dulu 18 kartu terus beranimasi tanpa terlihat (diukur: 19 dari 20 animasi yang
	berjalan di section etalase ada di luar layar). Jeda = waktu dibekukan, jadi begitu masuk layar animasi lanjut
	dari titik yang sama tanpa loncatan; tepi atas koridor pun masih di zona pudar. -->
<div class="ish {className}" style="container-type: inline-size" {@attach pauseOffscreen("0px")}>
	<div
		class="ish-view"
		aria-hidden="true"
		style={`perspective:${p.perspective}cqw;perspective-origin:50% ${axis}%`}
	>
		<div class="ish-world">
			{#each [right, left] as name, ri (name)}
				{@const pool = ri === 1 && imagesAlt?.length ? imagesAlt : images}
				{#each slots as i (i)}
					{@const src = pool.length ? pool[i % pool.length] : ""}
					<div
						class="{cardCls} ish-card"
						style={`top:${axis}%;width:${p.cardWidth}cqw;height:${p.cardHeight}cqw;` +
							`margin-left:${-p.cardWidth / 2}cqw;margin-top:${-p.cardHeight / 2}cqw;` +
							`border-radius:${p.cardRadius}cqw;animation:${name} ${speed}s linear infinite;` +
							`animation-delay:${-(i * speed) / cards}s`}
					>
						{#if src && isScrambledUrl(src)}
							<!-- Foto teracak (lib/photoScramble.ts) → <canvas> tersusun (potongan cover saja, lihat coverCard). -->
							<canvas use:coverCard={{ src, ratio: p.cardWidth / p.cardHeight }}></canvas>
						{:else if src}
							<img {src} alt="" loading="lazy" decoding="async" draggable="false" />
						{/if}
					</div>
				{/each}
			{/each}
		</div>
	</div>
	{@render children?.()}
</div>

<style>
	.ish {
		position: relative;
		overflow: hidden;
	}
	.ish-view {
		position: absolute;
		inset: 0;
		pointer-events: none;
	}
	.ish-world {
		position: absolute;
		inset: 0;
		transform-style: preserve-3d;
	}
	.ish-card {
		position: absolute;
		left: 50%;
		overflow: hidden;
		backface-visibility: hidden;
		background: #16171a;
	}
	.ish-card img,
	.ish-card canvas {
		display: block;
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
</style>
