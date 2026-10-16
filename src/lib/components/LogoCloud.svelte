<script lang="ts">
	import type { ApiResponse } from "../types";
	import { apiGet } from "$lib/api";
	import { access } from "$lib/access.svelte";
	import { isScrambledUrl, loadScrambledCached, scrambled } from "$lib/photoScramble";
	/**
	 * Dinding logo pelanggan: grid petak berbingkai tipis. Secara acak satu petak
	 * buram lalu memudar, logonya berganti, lalu menajam kembali — satu-satunya gerak.
	 *
	 *  - Logo lebih banyak dari petak → yang masuk diambil dari logo cadangan.
	 *  - Jumlah logo pas → dua petak bertukar logo.
	 *
	 * Berhenti saat tak terlihat dan saat kursor di atas petak; hover tetap seperti
	 * biasa (logo makin terang). Reduce-motion: statis.
	 */
	type Logo = { key: string; name: string; src?: string; text?: string; cls?: string };

	let {
		eyebrow,
		items = null,
	}: {
		eyebrow: string;
		/** Logo kurasi CMS (section `percaya`): gambar asli sebagai logo. Kosong = wordmark dummy. */
		items?: { name: string; src: string }[] | null;
	} = $props();

	// Logo unggahan admin (CMS › Logo, /api/logos) menang atas segalanya;
	// kosong = kurasi foto `percaya`, lalu wordmark dummy.
	let uploaded = $state<{ name: string; src: string }[] | null>(null);
	$effect(() => {
		let alive = true;
		apiGet<ApiResponse<{ id: string; name: string; imageUrl: string | null }[]>>("/api/logos")
			.then((r) => {
				if (!alive) return;
				const list = (r.data ?? [])
					.filter((l) => l.imageUrl)
					.map((l) => ({ name: l.name, src: l.imageUrl as string }));
				uploaded = list;
			})
			.catch(() => {
				if (alive) uploaded = [];
			});
		return () => {
			alive = false;
		};
	});
	const shown = $derived(uploaded?.length ? uploaded : items?.length ? items : null);

	// Logo dummy sementara — wordmark teks sampai ada logo pelanggan asli.
	// Tiap entri punya gaya huruf sendiri supaya terbaca sebagai deretan merek.
	const dummy = [
		{ name: "NUSANTARA+", cls: "font-display font-light tracking-[0.08em]" },
		{ name: "KALA", cls: "font-mono font-medium tracking-[0.3em]" },
		{ name: "ruang·gelap", cls: "font-display italic font-light" },
		{ name: "ARUS", cls: "font-sans font-bold tracking-[0.18em]" },
		{ name: "Cahaya", cls: "font-display font-light tracking-[-0.01em]" },
		{ name: "BINGKAI", cls: "font-mono text-[0.95em] tracking-[0.22em]" },
		{ name: "Svara", cls: "font-sans font-medium italic" },
	];

	const pool = $derived<Logo[]>(
		shown
			? shown.map((l, i) => ({ key: `${l.src}-${i}`, name: l.name, src: l.src }))
			: dummy.map((l, i) => ({ key: `d-${i}`, name: l.name, text: l.name, cls: l.cls })),
	);

	/** Jumlah petak: semua logo, paling banyak dua baris di layar lebar (4 kolom × 2). */
	const MAX_CELLS = 8;
	/** Lama memudar/menajam (ms) — harus sama dengan durasi transisi CSS `.lc-face`. */
	const FADE_MS = 1000;

	let slots = $state<Logo[]>([]);
	let out = $state<boolean[]>([]);
	let spares: Logo[] = [];
	let hovered = -1;
	let gridEl = $state<HTMLElement | null>(null);
	// Gambar logo yang sudah termuat & terdekode. Hanya cadangan dari sini yang boleh masuk petak:
	// <img> yang src-nya diganti ke gambar yang belum tiba tetap menampilkan logo LAMA — logo yang
	// baru memudar keluar muncul lagi, lalu tertimpa logo baru begitu gambarnya tiba.
	const ready = new Set<string>();
	// Referensi dipegang supaya hasil dekode tetap di cache memori browser (foto teracak: cache lib/photoScramble → null).
	const preloaded = new Map<string, HTMLImageElement | null>();

	// Logo ada di bagian bawah beranda: gambarnya (±2,5 MB PNG) baru dimuat saat grid mendekati layar — dulu
	// ikut diunduh di detik pertama dan merebut bandwidth video hero.
	let near = $state(false);
	$effect(() => {
		const el = gridEl;
		if (!el || near) return;
		const io = new IntersectionObserver(
			([e]) => {
				if (e?.isIntersecting) {
					near = true;
					io.disconnect();
				}
			},
			{ rootMargin: "1200px 0px" },
		);
		io.observe(el);
		return () => io.disconnect();
	});

	// Isi petak dari kumpulan logo; gambar dimuat & didekode lebih dulu supaya pertukaran terlihat seketika.
	$effect(() => {
		const list = pool;
		const load = near;
		// Variabel lokal: membaca `slots` setelah menulisnya akan memicu efek ini lagi tanpa henti.
		const cells = list.slice(0, MAX_CELLS);
		slots = cells;
		spares = list.slice(MAX_CELLS);
		out = cells.map(() => false);
		if (!load) return;
		for (const l of list) {
			const src = l.src;
			if (!src || preloaded.has(src)) continue;
			// Foto kurasi `percaya` datang teracak (lib/photoScramble.ts): dimuat lewat cache bersama, kanvas petak
			// menyusunnya dari objek yang sama. Logo unggahan (/api/logos) tetap <img> biasa.
			if (isScrambledUrl(src)) {
				preloaded.set(src, null);
				loadScrambledCached(src).then(
					() => ready.add(src),
					() => {
						/* gagal dimuat: tak pernah dipakai sebagai cadangan */
					},
				);
				continue;
			}
			const im = new Image();
			im.src = src;
			preloaded.set(src, im);
			im.decode()
				.then(() => ready.add(src))
				.catch(() => {
					/* gagal dimuat: tak pernah dipakai sebagai cadangan */
				});
		}
	});

	$effect(() => {
		const el = gridEl;
		if (!el) return;
		if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || access.settings.reduceMotion) return;
		let visible = false;
		let timer = 0;
		const timers = new Set<number>();
		const rnd = (a: number, b: number) => a + Math.random() * (b - a);
		const later = (fn: () => void, ms: number) => {
			const t = window.setTimeout(() => {
				timers.delete(t);
				fn();
			}, ms);
			timers.add(t);
		};

		/** Indeks acak logo cadangan yang gambarnya siap tampil, atau -1 bila belum ada. */
		const readySpare = () => {
			const ks = spares.flatMap((l, k) => (!l.src || ready.has(l.src) ? [k] : []));
			return ks.length ? ks[Math.floor(Math.random() * ks.length)]! : -1;
		};

		const step = () => {
			if (!visible) return;
			const free: number[] = [];
			slots.forEach((_, i) => {
				if (!out[i] && i !== hovered) free.push(i);
			});
			if (spares.length) {
				// Satu petak: keluar buram → ganti dengan logo cadangan → masuk tajam.
				// Belum ada cadangan yang siap → lewati putaran ini.
				if (free.length && readySpare() >= 0) {
					const i = free[Math.floor(Math.random() * free.length)]!;
					out[i] = true;
					later(() => {
						const k = readySpare();
						if (k >= 0) {
							const incoming = spares[k]!;
							spares[k] = slots[i]!;
							slots[i] = incoming;
						}
						out[i] = false;
					}, FADE_MS);
				}
			} else if (free.length >= 2) {
				// Tak ada cadangan: dua petak bertukar logo.
				const i = free.splice(Math.floor(Math.random() * free.length), 1)[0]!;
				const j = free[Math.floor(Math.random() * free.length)]!;
				out[i] = true;
				out[j] = true;
				later(() => {
					const a = slots[i]!;
					slots[i] = slots[j]!;
					slots[j] = a;
					out[i] = false;
					out[j] = false;
				}, FADE_MS);
			}
			timer = window.setTimeout(step, rnd(2200, 3800));
		};

		const io = new IntersectionObserver(
			([entry]) => {
				const was = visible;
				visible = !!entry?.isIntersecting;
				if (visible && !was) timer = window.setTimeout(step, 600);
				if (!visible) window.clearTimeout(timer);
			},
			{ threshold: 0.2 },
		);
		io.observe(el);
		return () => {
			io.disconnect();
			window.clearTimeout(timer);
			timers.forEach((t) => window.clearTimeout(t));
			// Pertukaran yang dibatalkan di tengah jalan tak boleh meninggalkan petak kosong.
			out = slots.map(() => false);
		};
	});
</script>

<div data-reveal class="flex items-center justify-between border-t border-hair pt-3">
	<span class="kicker text-fg-muted">{eyebrow}</span>
</div>
<!-- Logo jadi putih polos (pengganti brightness-0 invert). Alpha sangat kecil dinolkan dulu: sebagian
     logo unggahan (mis. detik) latarnya tidak benar-benar transparan (alpha 1/255), dan latar itu
     berubah jadi kotak putih samar begitu warnanya diputihkan. -->
<svg class="lc-defs" aria-hidden="true" focusable="false">
	<filter id="lc-mono" color-interpolation-filters="sRGB">
		<feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 1 0" />
		<feComponentTransfer>
			<feFuncA type="linear" slope="1.05" intercept="-0.05" />
		</feComponentTransfer>
	</filter>
</svg>
<div bind:this={gridEl} data-reveal class="lc-grid mt-12">
	{#each slots as logo, i (i)}
		<span
			class="lc-tile"
			role="presentation"
			onpointerenter={() => (hovered = i)}
			onpointerleave={() => (hovered = -1)}
		>
			<span class="lc-face" class:is-out={out[i]}>
				{#if logo.src && isScrambledUrl(logo.src)}
					<!-- Foto teracak → <canvas> tersusun; kelas, object-contain & filter sama dengan <img>. -->
					<canvas
						use:scrambled={{ src: near ? logo.src : null, eager: true }}
						aria-label={logo.name}
						class="lc-img h-full w-full object-contain opacity-55 transition-opacity duration-200 hover:opacity-90"
					></canvas>
				{:else if logo.src}
					<img
						src={near ? logo.src : undefined}
						alt={logo.name}
						decoding="async"
						draggable={false}
						class="lc-img h-full w-full object-contain opacity-55 transition-opacity duration-200 hover:opacity-90"
					/>
				{:else}
					<span
						class={`lc-text whitespace-nowrap text-xl text-fg-muted opacity-60 transition-opacity duration-200 hover:opacity-100 sm:text-2xl ${logo.cls ?? ""}`}
					>
						{logo.text}
					</span>
				{/if}
			</span>
		</span>
	{/each}
</div>

<style>
	/* Wadah filter: tak boleh display:none (filter di dalamnya ikut mati di sebagian browser). */
	.lc-defs {
		position: absolute;
		width: 0;
		height: 0;
		overflow: hidden;
	}
	.lc-img {
		filter: url(#lc-mono);
	}
	/* Tanpa kotak: logo mengambang di grid; "petak" hanyalah ruang yang dipakai tiap logo berganti. */
	.lc-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 2rem 2rem;
	}
	@media (min-width: 640px) {
		.lc-grid {
			grid-template-columns: repeat(4, minmax(0, 1fr));
			gap: 2rem 3rem;
		}
	}
	.lc-tile {
		display: grid;
		place-items: center;
		height: 4rem;
	}
	@media (min-width: 640px) {
		.lc-tile {
			height: 5rem;
		}
	}
	/* Muka petak: yang berganti. Keluar = buram + pudar; masuk = menajam kembali. */
	.lc-face {
		/* flex + min-height 0 supaya logo yang lebar/tinggi diperkecil ke dalam ruangnya (di grid baris
		   otomatis, max-height persen tak membatasi dan logo meluber). */
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 0;
		/* Ukuran logo: 68% tinggi dan 72% lebar ruangnya (penuh = terlalu besar, 55/58% = terlalu kecil). */
		width: 72%;
		height: 68%;
		opacity: 1;
		/* `none`, bukan blur(0): tampak sama, tapi filter identitas tetap jadi lapisan filter di 8 petak. Transisi
		   ke/dari blur(10px) tetap identik — `none` diinterpolasi sebagai blur(0). */
		filter: none;
		transition:
			opacity 1s ease,
			filter 1s ease;
	}
	.lc-face.is-out {
		opacity: 0;
		filter: blur(10px);
	}
	@media (prefers-reduced-motion: reduce) {
		.lc-face {
			transition: none;
		}
	}
</style>
