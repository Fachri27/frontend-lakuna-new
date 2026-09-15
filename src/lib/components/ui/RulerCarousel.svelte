<script module lang="ts">
	/**
	 * Penggaris karusel — nama-nama yang bergeser di antara dua skala berjarak,
	 * seperti cincin fokus lensa: yang tepat di garis tengah adalah yang "tajam".
	 *
	 * Diport dari komponen React (framer-motion + lucide-react). Proyek ini
	 * SvelteKit, jadi animasinya memakai GSAP yang sudah terpasang dan ikonnya SVG
	 * inline — tanpa dependensi baru. Yang diubah dari sumbernya, dan alasannya:
	 *
	 * 1. Posisi dihitung dari lebar item yang diukur, bukan 500px yang dipatok
	 *    dengan "item ke-4 di tengah". Aslinya meleset begitu jumlah item ≠ 9,
	 *    dan kolom 400px per kata tidak muat di HP.
	 * 2. Panah kiri/kanan hanya bekerja selama fokus ada di dalam karusel (tombol
	 *    sebelum/berikutnya atau tautannya). Aslinya memasang listener di window —
	 *    tiap tekan panah di mana pun ikut menggeser karusel (dan bentrok dengan
	 *    viewer foto di peta).
	 * 3. Salinan untuk loop tak berhingga disembunyikan dari pembaca layar dan
	 *    tidak masuk urutan Tab; posisi aktif diumumkan lewat live region.
	 * 4. Skala penggaris ikut bergeser bersama nama (lebih pelan), bukan garis
	 *    mati. Lompatan diam-diam kembali ke salinan tengah tidak menggeser skala.
	 * 5. Tinggi mengikuti isi, bukan h-screen — ini section, bukan halaman.
	 */
	export type RulerItem = {
		id: string;
		label: string;
		/** Tujuan tautan "buka" saat item ini sedang di tengah. */
		href?: string;
	};
</script>

<script lang="ts">
	import gsap from "gsap";
	import { untrack } from "svelte";

	let {
		items,
		initial = 0,
		label,
		openLabel,
		prevLabel,
		nextLabel,
		counterLabel,
		class: className = "",
	}: {
		items: RulerItem[];
		/** Indeks item yang berada di tengah saat pertama tampil. */
		initial?: number;
		/** Nama karusel untuk pembaca layar. */
		label: string;
		/** Teks tautan item aktif; `{label}` diganti nama item. */
		openLabel: string;
		prevLabel: string;
		nextLabel: string;
		/** Mis. "{i} dari {n}". */
		counterLabel: string;
		class?: string;
	} = $props();

	const n = $derived(items.length);
	// Tiga salinan berurutan. Setelah tiap gerakan, yang aktif dikembalikan ke
	// salinan tengah, jadi ujung deretannya tidak pernah tercapai.
	const loop = $derived(
		[0, 1, 2].flatMap((copy) => items.map((item, i) => ({ item, i, copy, key: `${copy}-${item.id}` }))),
	);

	let active = $state(0);
	let root = $state<HTMLDivElement>();
	let viewport = $state<HTMLDivElement>();
	let track = $state<HTMLDivElement>();
	const itemEls: HTMLButtonElement[] = [];

	let reduced = false;
	let instant = true;
	let trackX = 0;
	let rulerX = 0;

	const index = $derived(n ? ((active % n) + n) % n : 0);
	const current = $derived(n ? items[index] : null);

	$effect(() => {
		reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
	});

	// Mulai (ulang) di salinan tengah setiap kali daftar item berganti.
	$effect(() => {
		void items;
		const count = n;
		untrack(() => {
			instant = true;
			active = count ? count + Math.min(Math.max(initial, 0), count - 1) : 0;
		});
	});

	function targetX(i: number): number | null {
		const el = itemEls[i];
		if (!viewport || !el) return null;
		return viewport.clientWidth / 2 - (el.offsetLeft + el.offsetWidth / 2);
	}

	function applyX(x: number, animate: boolean) {
		const node = track;
		if (!node) return;
		if (!animate) {
			gsap.killTweensOf(node);
			trackX = x;
			gsap.set(node, { x });
			return;
		}
		gsap.to(node, {
			x,
			duration: 0.9,
			ease: "elastic.out(1, 0.85)",
			overwrite: true,
			onUpdate: () => {
				const now = gsap.getProperty(node, "x") as number;
				rulerX += (now - trackX) * 0.3;
				trackX = now;
				root?.style.setProperty("--rc-shift", `${rulerX.toFixed(2)}px`);
			},
			onComplete: normalize,
		});
	}

	/** Bila yang aktif ada di salinan pertama/ketiga, lompat diam-diam ke salinan tengah. */
	function normalize() {
		if (!n || (active >= n && active < n * 2)) return;
		instant = true;
		active += active < n ? n : -n;
	}

	$effect(() => {
		const i = active;
		void loop;
		void track;
		void viewport;
		untrack(() => {
			const x = targetX(i);
			if (x == null) return;
			const animate = !instant && !reduced;
			instant = false;
			applyX(x, animate);
			if (!animate) normalize();
		});
	});

	// Lebar berubah (rotasi HP, font selesai dimuat): pasang ulang posisi tanpa animasi.
	$effect(() => {
		const vp = viewport;
		const tr = track;
		if (!vp || !tr) return;
		const ro = new ResizeObserver(() => {
			const x = targetX(active);
			if (x == null) return;
			applyX(x, false);
			normalize();
		});
		ro.observe(vp);
		ro.observe(tr);
		return () => {
			ro.disconnect();
			gsap.killTweensOf(tr);
		};
	});

	/**
	 * Klik/tekan cepat bisa mendorong indeks melewati salinan ketiga sebelum
	 * animasi sempat selesai. Pindahkan dulu ke salinan tengah yang setara
	 * (posisi layar identik), baru melangkah.
	 */
	function recentre() {
		if (!n || (active >= n && active < n * 2)) return;
		const next = active + (active < n ? n : -n);
		const x = targetX(next);
		if (x != null) applyX(x, false);
		active = next;
	}

	function step(d: number) {
		if (!n) return;
		recentre();
		active += d;
	}

	function select(k: number) {
		if (!n) return;
		recentre();
		// Pilih salinan terdekat dari item yang sama supaya geserannya sependek mungkin.
		const i = ((k % n) + n) % n;
		active = [i, i + n, i + n * 2].reduce((best, o) =>
			Math.abs(o - active) < Math.abs(best - active) ? o : best,
		);
	}

	// Didengar di akar karusel, bukan window: tombol di dalamnya yang memegang
	// fokus, event keydown-nya naik ke sini. Dipasang lewat $effect karena akar
	// ini wadah (role="group"), bukan kontrol — handler di atribut membuatnya
	// terbaca sebagai elemen interaktif palsu.
	$effect(() => {
		const el = root;
		if (!el) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "ArrowLeft") {
				e.preventDefault();
				step(-1);
			} else if (e.key === "ArrowRight") {
				e.preventDefault();
				step(1);
			}
		};
		el.addEventListener("keydown", onKey);
		return () => el.removeEventListener("keydown", onKey);
	});
</script>

{#if n}
	<div
		bind:this={root}
		class={`rc ${className}`}
		role="group"
		aria-roledescription="carousel"
		aria-label={label}
	>
		<div class="rc-ruler" aria-hidden="true"></div>

		<div bind:this={viewport} class="rc-viewport">
			<div bind:this={track} class="rc-track">
				{#each loop as entry, k (entry.key)}
					<button
						type="button"
						bind:this={itemEls[k]}
						class="rc-item"
						class:is-active={k === active}
						tabindex="-1"
						aria-hidden={entry.copy === 1 ? undefined : "true"}
						aria-current={k === active ? "true" : undefined}
						onclick={() => select(k)}
					>
						<span class="rc-word">{entry.item.label}</span>
					</button>
				{/each}
			</div>
		</div>

		<div class="rc-ruler rc-ruler-bottom" aria-hidden="true"></div>

		<div class="rc-controls">
			<button type="button" class="rc-step" onclick={() => step(-1)} aria-label={prevLabel}>
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" aria-hidden="true">
					<polygon points="11 19 2 12 11 5 11 19" />
					<polygon points="22 19 13 12 22 5 22 19" />
				</svg>
			</button>
			<p class="rc-count" aria-live="polite">
				<span class="sr-only">{current?.label}, </span>{counterLabel
					.replace("{i}", String(index + 1))
					.replace("{n}", String(n))}
			</p>
			<button type="button" class="rc-step" onclick={() => step(1)} aria-label={nextLabel}>
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" aria-hidden="true">
					<polygon points="13 19 22 12 13 5 13 19" />
					<polygon points="2 19 11 12 2 5 2 19" />
				</svg>
			</button>
		</div>

		{#if current?.href}
			<a class="rc-open arrow-link" href={current.href}>
				{openLabel.replace("{label}", current.label)} <span class="arr">→</span>
			</a>
		{/if}
	</div>
{/if}

<style>
	.rc {
		--rc-shift: 0px;
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: center;
		color: var(--fg);
	}

	/* Skala: tik kecil tiap 12px, tik besar tiap 60px (lima tik kecil), satu garis
	   safelight di tengah. Pola digeser lewat --rc-shift; offset +30px/+6px
	   menaruh tepi ubin — tempat tiknya — tepat di tengah lebar. */
	.rc-ruler {
		width: 100%;
		height: 22px;
		background-image:
			linear-gradient(var(--safelight), var(--safelight)),
			linear-gradient(to right, currentColor 1px, transparent 1px),
			linear-gradient(to right, color-mix(in srgb, currentColor 38%, transparent) 1px, transparent 1px);
		background-repeat: no-repeat, repeat-x, repeat-x;
		background-size:
			2px 100%,
			60px 13px,
			12px 7px;
		background-position:
			50% 0,
			calc(50% + 30px + var(--rc-shift)) 0,
			calc(50% + 6px + var(--rc-shift)) 0;
		-webkit-mask-image: linear-gradient(to right, transparent, #000 14%, #000 86%, transparent);
		mask-image: linear-gradient(to right, transparent, #000 14%, #000 86%, transparent);
	}
	.rc-ruler-bottom {
		background-position:
			50% 100%,
			calc(50% + 30px + var(--rc-shift)) 100%,
			calc(50% + 6px + var(--rc-shift)) 100%;
	}

	.rc-viewport {
		width: 100%;
		overflow: hidden;
		padding-block: clamp(0.5rem, 1.6vw, 1.25rem);
		-webkit-mask-image: linear-gradient(to right, transparent, #000 18%, #000 82%, transparent);
		mask-image: linear-gradient(to right, transparent, #000 18%, #000 82%, transparent);
	}

	.rc-track {
		display: flex;
		align-items: center;
		gap: clamp(0.5rem, 2.4vw, 2rem);
		width: max-content;
		will-change: transform;
	}

	.rc-item {
		padding: 0;
		border: 0;
		background: none;
		color: inherit;
		cursor: pointer;
		font-family: var(--font-display);
		font-weight: 300;
		font-size: clamp(2.4rem, 8vw, 5.8rem);
		line-height: 1.1;
		letter-spacing: -0.025em;
		white-space: nowrap;
	}
	.rc-word {
		display: inline-block;
		opacity: 0.3;
		transform: scale(0.6);
		transform-origin: 50% 60%;
		transition:
			transform 0.6s cubic-bezier(0.16, 1, 0.3, 1),
			opacity 0.6s ease;
	}
	.rc-item:hover .rc-word {
		opacity: 0.55;
	}
	.rc-item.is-active .rc-word {
		opacity: 1;
		transform: scale(1);
	}

	.rc-controls {
		display: flex;
		align-items: center;
		gap: 1.25rem;
		margin-top: clamp(1.1rem, 2.6vw, 1.9rem);
	}
	.rc-step {
		display: grid;
		place-items: center;
		width: 2.6rem;
		height: 2.6rem;
		border: 1px solid var(--hair);
		border-radius: 999px;
		background: transparent;
		color: var(--fg);
		cursor: pointer;
		transition:
			border-color 0.3s,
			color 0.3s,
			transform 0.2s;
	}
	.rc-step:hover {
		border-color: var(--safelight);
		color: var(--safelight);
	}
	.rc-step:active {
		transform: scale(0.94);
	}
	.rc-step:focus-visible,
	.rc-open:focus-visible {
		outline: 1px solid var(--safelight);
		outline-offset: 3px;
	}
	.rc-count {
		min-width: 5.5rem;
		margin: 0;
		text-align: center;
		font-family: var(--font-body);
		font-size: 0.92rem;
		font-variant-numeric: tabular-nums;
		color: var(--fg-muted);
	}

	.rc-open {
		margin-top: 0.9rem;
		font-family: var(--font-body);
		font-size: 0.98rem;
		color: var(--fg);
		text-decoration: underline;
		text-decoration-color: var(--hair);
		text-underline-offset: 0.3em;
		transition:
			color 0.3s,
			text-decoration-color 0.3s;
	}
	.rc-open:hover {
		color: var(--safelight);
		text-decoration-color: currentColor;
	}

	@media (prefers-reduced-motion: reduce) {
		.rc-word,
		.rc-step {
			transition: none;
		}
	}
</style>
