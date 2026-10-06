<script lang="ts">
	import type { ApiResponse } from "../types";
	import { apiGet } from "$lib/api";
	import { access } from "$lib/access.svelte";
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

	// Isi petak dari kumpulan logo; gambar dimuat lebih dulu supaya pertukaran terlihat seketika.
	$effect(() => {
		const list = pool;
		// Variabel lokal: membaca `slots` setelah menulisnya akan memicu efek ini lagi tanpa henti.
		const cells = list.slice(0, MAX_CELLS);
		slots = cells;
		spares = list.slice(MAX_CELLS);
		out = cells.map(() => false);
		for (const l of list) {
			if (l.src) {
				const im = new Image();
				im.src = l.src;
			}
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

		const step = () => {
			if (!visible) return;
			const free: number[] = [];
			slots.forEach((_, i) => {
				if (!out[i] && i !== hovered) free.push(i);
			});
			if (free.length >= 2 || (free.length === 1 && spares.length)) {
				const i = free.splice(Math.floor(Math.random() * free.length), 1)[0]!;
				if (spares.length) {
					// Satu petak: keluar buram → ganti dengan logo cadangan → masuk tajam.
					out[i] = true;
					later(() => {
						const k = Math.floor(Math.random() * spares.length);
						const incoming = spares[k]!;
						spares[k] = slots[i]!;
						slots[i] = incoming;
						out[i] = false;
					}, FADE_MS);
				} else {
					// Tak ada cadangan: dua petak bertukar logo.
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
		};
	});
</script>

<div data-reveal class="flex items-center justify-between border-t border-hair pt-3">
	<span class="kicker text-fg-muted">{eyebrow}</span>
</div>
<div bind:this={gridEl} data-reveal class="lc-grid mt-12">
	{#each slots as logo, i (i)}
		<span
			class="lc-tile"
			role="presentation"
			onpointerenter={() => (hovered = i)}
			onpointerleave={() => (hovered = -1)}
		>
			<span class="lc-face" class:is-out={out[i]}>
				{#if logo.src}
					<img
						src={logo.src}
						alt={logo.name}
						decoding="async"
						draggable={false}
						class="lc-img h-full w-full object-contain brightness-0 invert opacity-55 transition-opacity duration-200 hover:opacity-90"
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
		filter: blur(0);
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
