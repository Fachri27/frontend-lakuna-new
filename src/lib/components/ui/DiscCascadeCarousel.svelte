<script module lang="ts">
	/**
	 * Disc Cascade Carousel — katalog yang diceritakan lewat cakram. Tiap judul adalah cakram bercetak di garis
	 * miring yang naik keluar halaman: yang di tengah terpilih, yang sebelumnya mengecil ke kiri bawah, yang
	 * berikutnya membesar setengah keluar di kanan atas. Saat berpindah, deretan bergeser, tiap cakram
	 * menggelinding seperti roda dan berayun ke posenya sesaat kemudian, dan blok kredit ikut berganti.
	 *
	 * Diport dari komponen React (tanpa dependensi selain React). Proyek ini SvelteKit, jadi ditulis ulang
	 * sebagai komponen Svelte 5 — perhitungannya (pegas, pose, label buatan) dipindah apa adanya ke
	 * `disc-cascade.ts`. Yang diubah dari sumbernya, dan alasannya:
	 *
	 * 1. Snippet `art` mengganti <img> label — gambar API situs ini teracak dan disusun di <canvas> (ApiImage),
	 *    jadi tak bisa dipasang sebagai <img src>. Tanpa snippet, `src` atau label buatan tetap dipakai.
	 * 2. Snippet `footer` boleh mengganti kutipan pers (dipakai untuk kontrol putar); kutipan tetap ada bila
	 *    `reviews` diisi dan tak ada footer.
	 * 3. Tautan nav bisa berupa tombol (`onclick`, mis. filter) dengan `current` per tautan, bukan `navActive`.
	 * 4. `playingIndex`: cakram yang sedang berbunyi berputar cepat (lapisan sendiri, jadi putaran diamnya tak
	 *    meloncat saat mulai/berhenti).
	 * 5. Tanpa `fontHref`: font diambil dari yang sudah dimuat situs (lihat bawaan serif/display), tanpa
	 *    permintaan font tambahan. Warna fokus memakai token situs (--safelight, --bg).
	 * 6. Semua teks antarmuka (tombol, petunjuk, pengumuman) lewat props supaya bisa diterjemahkan.
	 */
	export type { DiscCascadeItem, DiscCredit, DiscReview, DiscPattern } from "./disc-cascade";

	export type DiscNavLink = {
		label: string;
		href?: string;
		/** Tautan berupa tombol (mis. filter). */
		onclick?: () => void;
		current?: boolean;
	};
</script>

<script lang="ts">
	import { tick, untrack, type Snippet } from "svelte";
	import {
		PALETTES,
		PATTERNS,
		artShapes,
		indexAt,
		inkFor,
		offsetOf,
		poseOf,
		printLayout,
		releaseTarget,
		rubber,
		springOf,
		springStep,
		targetFor,
		wrapIndex,
		type DiscCascadeItem,
	} from "./disc-cascade";

	type Props = {
		items: DiscCascadeItem[];
		/** Tinggi akar. **Harus panjang pasti.** */
		height?: string;
		/** Diameter cakram terpilih, panjang CSS apa pun. */
		discSize?: string;
		spacing?: number;
		rise?: number;
		depth?: number;
		yaw?: number;
		fan?: number;
		tilt?: number;
		roll?: number;
		/** Detik per putaran diam cakram terpilih. 0 = diam. */
		spin?: number;
		sheen?: number;
		bounce?: number;
		duration?: number;
		loop?: boolean;
		/** Milidetik antar-geser otomatis. 0 = mati. */
		autoplay?: number;
		/** Merek di tengah atas; juga dicetak kecil di cakram. */
		brand?: string;
		nav?: DiscNavLink[];
		/** Label menu lompat. "" = sembunyi. */
		indexLabel?: string;
		details?: boolean;
		reviews?: boolean;
		controls?: boolean;
		hint?: string;
		frame?: boolean;
		background?: string;
		color?: string;
		serif?: string;
		sans?: string;
		display?: string;
		index?: number;
		defaultIndex?: number;
		onIndexChange?: (index: number) => void;
		/** Klik (atau Enter) pada cakram yang sudah terpilih. */
		onSelect?: (item: DiscCascadeItem, index: number) => void;
		/** Slide yang sedang berbunyi (-1 = tidak ada): cakramnya berputar cepat. */
		playingIndex?: number;
		/** Teks kecil di kanan tiap baris menu lompat. Bawaan: kredit "Year". */
		menuMeta?: (item: DiscCascadeItem) => string | undefined;
		ariaLabel?: string;
		navLabel?: string;
		prevLabel?: string;
		nextLabel?: string;
		slideLabel?: (i: number, n: number, title: string) => string;
		announce?: (item: DiscCascadeItem, i: number, n: number) => string;
		/** Gambar label sendiri (di bawah cetakan). Mengisi seluruh cakram 1:1. */
		art?: Snippet<[DiscCascadeItem, number]>;
		/** Pengganti kutipan pers di tengah bawah. */
		footer?: Snippet<[DiscCascadeItem, number]>;
		class?: string;
	};

	const first = (v: string | string[]) => (Array.isArray(v) ? v[0] : v);
	const pad = (k: number) => (k < 10 ? "0" + k : "" + k);

	let {
		items,
		height = "100svh",
		discSize = "clamp(170px, min(50vmin, 38vw), 420px)",
		spacing = 1.02,
		rise = 0.24,
		depth = 0.42,
		yaw = 22,
		fan = -10,
		tilt = -6,
		roll = 110,
		spin = 24,
		sheen = 0.6,
		bounce = 0.22,
		duration = 0.9,
		loop = false,
		autoplay = 0,
		brand = "",
		nav = [],
		indexLabel = "Index",
		details = true,
		reviews = true,
		controls = true,
		hint = "Drag to browse",
		frame = true,
		background = "color-mix(in oklab, var(--fg) 5%, var(--bg))",
		color,
		serif = 'var(--font-fraunces), "Instrument Serif", Didot, "Times New Roman", serif',
		sans = "var(--font-body)",
		display = '"Archivo", "Oswald", Impact, "Arial Narrow", sans-serif',
		index,
		defaultIndex = 2,
		onIndexChange,
		onSelect,
		playingIndex = -1,
		menuMeta = (it) => {
			const y = it.credits?.find((c) => /year|tahun/i.test(c.label));
			return y ? first(y.value) : undefined;
		},
		ariaLabel = "Catalogue",
		navLabel = "Catalogue",
		prevLabel = "Previous",
		nextLabel = "Next",
		slideLabel = (i, n, title) => `${i + 1} / ${n}: ${title}`,
		announce = (item, i, n) => `${i + 1} / ${n}: ${item.title}`,
		art,
		footer,
		class: className = "",
	}: Props = $props();

	const n = $derived(items.length);
	const start = untrack(() => Math.min(Math.max(Math.round(index ?? defaultIndex), 0), Math.max(items.length - 1, 0)));
	let active = $state(start);
	let dragging = $state(false);
	let stopped = $state(false);
	let focused = $state(false);
	let visible = $state(true);
	let menu = $state(false);

	const pid = $props.id();
	const uid = "dcc" + pid.replace(/[^a-zA-Z0-9]/g, "");
	let rootEl = $state<HTMLDivElement | null>(null);
	let stageEl = $state<HTMLDivElement | null>(null);
	let menuEl = $state<HTMLDivElement | null>(null);
	const slideEls: (HTMLButtonElement | null)[] = [];

	// Semua yang dibaca loop frame, di luar state supaya satu frame tak memicu render.
	const E = {
		a: start,
		va: 0,
		b: start,
		vb: 0,
		target: start,
		raf: 0,
		last: 0,
		size: 300,
		reduced: false,
		drag: null as null | { id: number; x0: number; pos0: number; moved: boolean; samples: { t: number; x: number }[] },
		clickBlock: false,
		wheel: 0,
		wheelAt: 0,
		stepAt: 0,
	};

	function styleFor(i: number, a: number, b: number) {
		const c = { spacing, rise, depth, yaw, fan, roll };
		const p = poseOf(offsetOf(i, a, n, loop), offsetOf(i, b, n, loop), c);
		return {
			transform:
				"translate3d(calc(" + p.x.toFixed(4) + " * var(--dcc-s)), calc(" + p.y.toFixed(4) + " * var(--dcc-s)), calc(" +
				p.z.toFixed(4) + " * var(--dcc-s))) rotateZ(" + tilt + "deg) rotateY(" + p.yaw.toFixed(3) + "deg) rotateX(8deg)",
			roll: p.roll.toFixed(2) + "deg",
			glint: (p.yaw * 3 + p.x * 40).toFixed(1) + "deg",
			zIndex: p.zIndex,
			opacity: p.opacity,
			hidden: p.hidden || p.opacity <= 0,
		};
	}

	/** Gaya awal (SSR & render ulang); sesudahnya paint() menulis langsung ke DOM. */
	function slideStyle(i: number) {
		const t = styleFor(i, E.a, E.b);
		return (
			`transform:${t.transform};z-index:${t.zIndex};--dcc-roll:${t.roll};--dcc-glint:${t.glint};` +
			(t.opacity < 1 ? `opacity:${t.opacity.toFixed(3)};` : "") +
			(t.hidden ? "visibility:hidden;" : "")
		);
	}

	function paint() {
		for (let i = 0; i < n; i++) {
			const el = slideEls[i];
			if (!el) continue;
			const t = styleFor(i, E.a, E.b);
			el.style.transform = t.transform;
			el.style.zIndex = "" + t.zIndex;
			el.style.opacity = t.opacity < 1 ? t.opacity.toFixed(3) : "";
			el.style.visibility = t.hidden ? "hidden" : "";
			el.style.setProperty("--dcc-roll", t.roll);
			el.style.setProperty("--dcc-glint", t.glint);
		}
	}

	function frame_(now: number) {
		const dt = Math.min((now - (E.last || now)) / 1000, 1 / 20);
		E.last = now;
		const s = springOf(bounce, duration);
		if (E.reduced && !E.drag) {
			E.a = E.b = E.target;
			E.va = E.vb = 0;
		} else {
			// Selama diseret deretan ada di bawah jari; hanya ayunannya yang mengejar.
			if (!E.drag) [E.a, E.va] = springStep(E.a, E.va, E.target, s.omega, s.slide, dt);
			[E.b, E.vb] = springStep(E.b, E.vb, E.a, s.omega * 1.05, s.tilt, dt);
		}
		paint();
		const settled =
			!E.drag && Math.abs(E.a - E.target) < 1e-3 && Math.abs(E.va) < 1e-2 && Math.abs(E.b - E.a) < 1e-3 && Math.abs(E.vb) < 1e-2;
		if (settled) {
			E.a = E.b = E.target;
			E.va = E.vb = 0;
			paint();
			E.raf = 0;
			E.last = 0;
			return;
		}
		E.raf = requestAnimationFrame(frame_);
	}

	function kick() {
		if (!E.raf) E.raf = requestAnimationFrame(frame_);
	}

	function setActive(i: number) {
		if (i === active) return;
		active = i;
		onIndexChange?.(i);
	}

	function setTarget(t: number) {
		if (!n) return;
		E.target = loop ? t : Math.min(Math.max(t, 0), n - 1);
		setActive(indexAt(E.target, n, loop));
		kick();
	}

	const goTo = (i: number) => setTarget(targetFor(i, E.target, n, loop));
	const step = (by: number) => setTarget(Math.round(E.target) + by);

	// Indeks terkendali dari induk.
	$effect(() => {
		const ix = index;
		const nn = n;
		if (ix == null || !nn) return;
		untrack(() => {
			if (wrapIndex(Math.round(E.target), nn) !== wrapIndex(ix, nn)) goTo(wrapIndex(ix, nn));
		});
	});

	// Daftar berubah (mis. difilter) atau konfigurasi berubah → posisi tak boleh lewat ujung; lukis ulang.
	$effect(() => {
		void [items, n, loop, spacing, rise, depth, yaw, fan, tilt, roll];
		untrack(() => {
			if (n && !loop && E.target > n - 1) setTarget(n - 1);
			else if (n && active > n - 1) setActive(indexAt(E.target, n, loop));
			void tick().then(paint);
		});
	});

	$effect(() => {
		const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
		const on = () => (E.reduced = mq.matches);
		on();
		mq.addEventListener("change", on);
		return () => mq.removeEventListener("change", on);
	});

	// Diameter cakram dalam px, untuk mengubah jarak seret menjadi slide.
	$effect(() => {
		const el = stageEl;
		if (!el) return;
		const measure = () => (E.size = el.offsetWidth || 300);
		measure();
		const ro = new ResizeObserver(measure);
		ro.observe(el);
		return () => ro.disconnect();
	});

	$effect(() => () => cancelAnimationFrame(E.raf));

	// Usapan trackpad mendatar berpindah slide; roda vertikal tetap milik halaman.
	$effect(() => {
		const el = rootEl;
		if (!el) return;
		const onWheel = (e: WheelEvent) => {
			if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
			e.preventDefault();
			const now = performance.now();
			if (now - E.wheelAt > 160) E.wheel = 0;
			E.wheelAt = now;
			E.wheel += e.deltaX;
			if (Math.abs(E.wheel) > 50 && now - E.stepAt > 320) {
				stopped = true;
				step(Math.sign(E.wheel));
				E.wheel = 0;
				E.stepAt = now;
			}
		};
		el.addEventListener("wheel", onWheel, { passive: false });
		return () => el.removeEventListener("wheel", onWheel);
	});

	// Menu lompat tertutup oleh tekanan di luar atau Escape.
	$effect(() => {
		if (!menu) return;
		const onDown = (e: PointerEvent) => {
			if (!menuEl?.contains(e.target as Node)) menu = false;
		};
		document.addEventListener("pointerdown", onDown);
		return () => document.removeEventListener("pointerdown", onDown);
	});

	// Putar otomatis berhenti di luar layar dan di tab tersembunyi.
	$effect(() => {
		const el = rootEl;
		if (!el || !autoplay) return;
		const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting && !document.hidden));
		io.observe(el);
		const onVis = () => (visible = !document.hidden);
		document.addEventListener("visibilitychange", onVis);
		return () => {
			io.disconnect();
			document.removeEventListener("visibilitychange", onVis);
		};
	});

	const autoplaying = $derived(autoplay > 0 && n > 1 && !stopped && !focused && !dragging && !menu && visible);
	$effect(() => {
		if (!autoplaying) return;
		void active;
		if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
		const t = window.setTimeout(() => {
			untrack(() => {
				if (!loop && Math.round(E.target) >= n - 1) goTo(0);
				else step(1);
			});
		}, autoplay);
		return () => window.clearTimeout(t);
	});

	// ── penunjuk ──
	function onPointerDown(e: PointerEvent) {
		if (e.button !== 0 || !n) return;
		if ((e.target as Element).closest("[data-dcc-ui]")) return;
		E.drag = { id: e.pointerId, x0: e.clientX, pos0: E.a, moved: false, samples: [{ t: e.timeStamp, x: e.clientX }] };
	}
	function onPointerMove(e: PointerEvent) {
		// Kilap & condong cakram terpilih mengikuti tetikus, tidak pernah jari.
		if (e.pointerType === "mouse" && !E.drag?.moved && stageEl && rootEl) {
			const st = stageEl.getBoundingClientRect();
			const cx = Math.max(-1, Math.min(1, (e.clientX - (st.left + st.width / 2)) / st.width));
			const cy = Math.max(-1, Math.min(1, (e.clientY - (st.top + st.height / 2)) / st.height));
			rootEl.style.setProperty("--dcc-px", cx.toFixed(3));
			rootEl.style.setProperty("--dcc-py", cy.toFixed(3));
		}
		const d = E.drag;
		if (!d || d.id !== e.pointerId) return;
		if (!d.moved) {
			if (Math.abs(e.clientX - d.x0) < 6) return;
			d.moved = true;
			d.x0 = e.clientX;
			d.pos0 = E.a;
			E.va = 0;
			rootEl?.setPointerCapture(e.pointerId);
			dragging = true;
			stopped = true;
		}
		const raw = d.pos0 - (e.clientX - d.x0) / (E.size * spacing);
		E.a = loop ? raw : rubber(raw, n);
		d.samples.push({ t: e.timeStamp, x: e.clientX });
		if (d.samples.length > 6) d.samples.shift();
		setActive(indexAt(E.a, n, loop));
		kick();
	}
	function onPointerUp(e: PointerEvent) {
		const d = E.drag;
		if (!d || d.id !== e.pointerId) return;
		E.drag = null;
		if (!d.moved) return;
		dragging = false;
		E.clickBlock = true;
		window.setTimeout(() => (E.clickBlock = false), 0);
		const a = d.samples[0];
		const b = d.samples[d.samples.length - 1];
		const ms = Math.max(b.t - a.t, 1);
		// px per ms → slide per detik, berlawanan arah seretan.
		const v = e.type === "pointercancel" ? 0 : (-(b.x - a.x) / ms / (E.size * spacing)) * 1000;
		E.va = v;
		setTarget(releaseTarget(E.a, v, n, loop));
	}
	function onPointerLeave() {
		rootEl?.style.setProperty("--dcc-px", "0");
		rootEl?.style.setProperty("--dcc-py", "0");
	}

	function onKeyDown(e: KeyboardEvent) {
		if (e.key === "Escape" && menu) {
			menu = false;
			return;
		}
		const tgt = e.target as Element;
		if (tgt.closest("[data-dcc-menu]") || tgt.closest("input, textarea, select")) return;
		let handled = true;
		if (e.key === "ArrowRight" || e.key === "ArrowDown") step(1);
		else if (e.key === "ArrowLeft" || e.key === "ArrowUp") step(-1);
		else if (e.key === "Home") goTo(0);
		else if (e.key === "End") goTo(n - 1);
		else handled = false;
		if (handled) {
			e.preventDefault();
			stopped = true;
		}
	}

	function onSlideClick(i: number) {
		if (E.clickBlock) return;
		stopped = true;
		if (i === active) onSelect?.(items[i], i);
		else goTo(i);
	}

	const atStart = $derived(!loop && active <= 0);
	const atEnd = $derived(!loop && active >= n - 1);
	const current = $derived(items[active] as DiscCascadeItem | undefined);
	const quotes = $derived((current?.reviews ?? []).slice(0, 2));
	const lines = (v: string | string[]) => (Array.isArray(v) ? v : [v]);
</script>

{#snippet hub(id: string)}
	<!-- Cincin penjepit bening, punggung tumpukan, dan pita cermin di sekitar lubang. -->
	<svg class="dcc-hub" viewBox="0 0 200 200" aria-hidden="true">
		<defs>
			<linearGradient id="{id}metal" x1="0" y1="0" x2="1" y2="1">
				<stop offset="0" stop-color="#fbfbfc" />
				<stop offset=".45" stop-color="#a9adb3" />
				<stop offset=".55" stop-color="#eef0f2" />
				<stop offset="1" stop-color="#8f949a" />
			</linearGradient>
		</defs>
		<circle cx="100" cy="100" r="35.5" fill="none" stroke="url(#{id}metal)" stroke-width="4" />
		<circle cx="100" cy="100" r="25.5" fill="rgba(232,235,239,.82)" stroke="rgba(232,235,239,.82)" stroke-width="16" />
		<circle cx="100" cy="100" r="17.6" fill="none" stroke="rgba(255,255,255,.95)" stroke-width="1.4" />
		<circle cx="100" cy="100" r="22" fill="none" stroke="rgba(0,0,0,.12)" stroke-width=".6" />
		<circle cx="100" cy="100" r="27" fill="none" stroke="rgba(255,255,255,.75)" stroke-width="1.6" />
		<circle cx="100" cy="100" r="28.6" fill="none" stroke="rgba(0,0,0,.1)" stroke-width=".6" />
		<circle cx="100" cy="100" r="33.3" fill="none" stroke="rgba(0,0,0,.16)" stroke-width=".7" />
		<circle cx="100" cy="100" r="99.3" fill="none" stroke="rgba(255,255,255,.4)" stroke-width="1.2" />
	</svg>
{/snippet}

{#snippet print(item: DiscCascadeItem, i: number, id: string, ink: string, halo: string, image: boolean)}
	{@const pl = printLayout(item)}
	{@const w = (x: number) => (image ? x * 0.4 : x)}
	<!-- Lingkar "halo" berwarna dasar label menjaga cetakan terbaca di atas gambar ramai. -->
	<svg viewBox="0 0 200 200" aria-hidden="true">
		<defs>
			<path id="{id}top" d="M28 100a72 72 0 1 1 144 0" />
			<path id="{id}bot" d="M14 100a86 86 0 0 0 172 0" />
		</defs>
		{#if pl.arc}
			<text
				fill={ink}
				font-size={pl.arc.fs.toFixed(2)}
				font-weight="700"
				text-anchor="middle"
				textLength={pl.arc.len.toFixed(1)}
				lengthAdjust="spacingAndGlyphs"
				stroke={halo}
				stroke-width={w(2.4)}
				stroke-linejoin="round"
				paint-order="stroke"
			>
				<textPath href="#{id}top" startOffset="50%">{pl.arc.text}</textPath>
			</text>
		{:else if pl.block}
			<g fill={ink} font-size={pl.block.fs.toFixed(2)} font-weight="700" stroke={halo} stroke-width={w(2.4)} stroke-linejoin="round" paint-order="stroke">
				{#each pl.block.lines as l, k (k)}
					<text x="100" y={l.y.toFixed(2)} text-anchor="middle" textLength={l.len.toFixed(1)} lengthAdjust="spacingAndGlyphs">{l.text}</text>
				{/each}
			</g>
		{/if}
		{#if pl.fine}
			<text fill={ink} font-size="5.2" letter-spacing=".7" text-anchor="middle" opacity=".86" stroke={halo} stroke-width={w(1.2)} stroke-linejoin="round" paint-order="stroke">
				<textPath href="#{id}bot" startOffset="50%">{pl.fine}</textPath>
			</text>
		{/if}
		{#if brand}
			<text x="100" y="150" fill={ink} font-size="10" font-weight="800" letter-spacing="-.4" text-anchor="middle" stroke={halo} stroke-width={w(1.2)} stroke-linejoin="round" paint-order="stroke">{brand}</text>
		{/if}
		{#if !image}
			<text x="100" y="64" fill={ink} font-size="4" letter-spacing="1.2" text-anchor="middle" opacity=".6" transform="rotate(180 100 100)">DISC {pad(i + 1)}</text>
		{/if}
	</svg>
{/snippet}

<!-- Akar = wilayah karusel yang bisa difokus (panah kiri/kanan, Home/End) dan diseret. -->
<!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_no_noninteractive_element_interactions -->
<div
	bind:this={rootEl}
	class="dcc-root {className}"
	style:height
	style:background
	style:color
	style:font-family={sans}
	style:--dcc-s={discSize}
	style:--dcc-sheen={String(sheen)}
	style:--dcc-spin={spin + "s"}
	style:--dcc-serif={serif}
	style:--dcc-display={display}
	role="region"
	aria-roledescription="carousel"
	aria-label={ariaLabel}
	tabindex="0"
	data-dragging={dragging ? "" : undefined}
	data-spin={spin > 0 ? "" : undefined}
	onkeydown={onKeyDown}
	onpointerdown={onPointerDown}
	onpointermove={onPointerMove}
	onpointerup={onPointerUp}
	onpointercancel={onPointerUp}
	onpointerleave={onPointerLeave}
	onfocusin={() => (focused = true)}
	onfocusout={(e) => {
		if (!e.currentTarget.contains(e.relatedTarget as Node | null)) focused = false;
	}}
>
	{#if frame}<div class="dcc-frame" aria-hidden="true"></div>{/if}

	{#if brand || nav.length || (indexLabel && n > 1)}
		<nav class="dcc-nav" data-dcc-ui aria-label={navLabel}>
			{#if brand}<span class="dcc-brand">{brand}</span>{/if}
			{#each nav as l, k (k)}
				{#if l.href}
					<a class="dcc-link" href={l.href} aria-current={l.current ? "page" : undefined}>{l.label}</a>
				{:else if l.onclick}
					<button type="button" class="dcc-link" aria-pressed={!!l.current} onclick={l.onclick}>{l.label}</button>
				{:else}
					<span class="dcc-link" aria-current={l.current ? "true" : undefined}>{l.label}</span>
				{/if}
			{/each}
			{#if indexLabel && n > 1}
				<div class="dcc-menu" bind:this={menuEl} data-dcc-menu>
					<button
						type="button"
						class="dcc-menubtn"
						aria-haspopup="true"
						aria-expanded={menu}
						aria-controls="{uid}list"
						onclick={() => (menu = !menu)}
					>
						{indexLabel}
						<svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
					</button>
					{#if menu}
						<ul class="dcc-list" id="{uid}list" style:font-family={sans}>
							{#each items as it, k (it.key ?? k)}
								{@const meta = menuMeta(it)}
								<li>
									<button
										type="button"
										class="dcc-opt"
										aria-current={k === active ? "true" : undefined}
										onclick={() => {
											stopped = true;
											menu = false;
											goTo(k);
										}}
									>
										<span class="dcc-optn">{pad(k + 1)}</span>
										<span class="dcc-optt">{it.title}</span>
										{#if meta}<span class="dcc-opty">{meta}</span>{/if}
									</button>
								</li>
							{/each}
						</ul>
					{/if}
				</div>
			{/if}
		</nav>
	{/if}

	{#if details && current}
		{#key current.key ?? active}
			<div class="dcc-head" aria-hidden="true">
				<p class="dcc-title dcc-in">{current.title}</p>
				{#if current.credits?.length}
					<dl class="dcc-dl">
						{#each current.credits as c, k (k)}
							<div class="dcc-row dcc-in" style:--i={k + 1}>
								<dt>{c.label}</dt>
								<dd>
									{#each lines(c.value) as v, j (j)}<span>{v}</span>{/each}
								</dd>
							</div>
						{/each}
					</dl>
				{/if}
			</div>
		{/key}
	{/if}

	<div bind:this={stageEl} class="dcc-stage">
		{#each items as item, i (item.key ?? i)}
			{@const pal = item.palette ?? PALETTES[i % PALETTES.length]}
			{@const image = !!(art || item.src)}
			{@const ink = item.ink ?? (image ? "#ffffff" : inkFor(pal[0]))}
			{@const id = uid + "d" + i}
			<button
				bind:this={slideEls[i]}
				type="button"
				class="dcc-slide"
				data-active={i === active ? "" : undefined}
				tabindex={i === active ? 0 : -1}
				aria-roledescription="slide"
				aria-label={slideLabel(i, n, item.title)}
				aria-current={i === active ? "true" : undefined}
				onclick={() => onSlideClick(i)}
				style={slideStyle(i)}
			>
				<span class="dcc-tilt">
					<span class="dcc-shade"></span>
					<span class="dcc-edge"></span>
					<span class="dcc-disc">
						<span class="dcc-roll">
							<span class="dcc-idle" style:font-family={display}>
								<span class="dcc-play" data-on={i === playingIndex ? "" : undefined}>
									{#if art}
										{@render art(item, i)}
									{:else if item.src}
										<img src={item.src} alt={item.alt ?? item.title} draggable="false" loading={Math.abs(i - start) > 3 ? "lazy" : undefined} decoding="async" width="600" height="600" />
									{:else}
										<svg viewBox="0 0 200 200" role="img" aria-label={item.alt ?? item.title}>
											{#each artShapes(item.pattern ?? PATTERNS[i % PATTERNS.length], pal, i + 1, id) as s, k (k)}
												{#if s.t === "grad"}
													<defs>
														<linearGradient id={s.id} x1="0" y1="0" x2="0" y2="1">
															{#each s.stops as [o, c], j (j)}<stop offset={o} stop-color={c} />{/each}
														</linearGradient>
													</defs>
												{:else if s.t === "rect"}
													<rect {...s.a} />
												{:else if s.t === "circle"}
													<circle {...s.a} />
												{:else if s.t === "ellipse"}
													<ellipse {...s.a} />
												{:else}
													<path {...s.a} />
												{/if}
											{/each}
										</svg>
									{/if}
									{@render print(item, i, id, ink, image ? "rgba(0,0,0,.45)" : pal[0], image)}
								</span>
							</span>
						</span>
						{@render hub(id)}
						<span class="dcc-sheen"></span>
					</span>
				</span>
			</button>
		{/each}
	</div>

	{#if footer && current}
		<div class="dcc-foot" data-dcc-ui>{@render footer(current, active)}</div>
	{:else if reviews && quotes.length}
		{#key active}
			<div class="dcc-revs" aria-hidden="true">
				{#each quotes as q, k (k)}
					{@const stars = Math.max(0, Math.min(5, Math.round(q.stars ?? 5)))}
					<figure class="dcc-rev dcc-in" style:--i={k + 3}>
						<figcaption>
							<span class="dcc-stars">{"★".repeat(stars) + "☆".repeat(5 - stars)}</span>
							<span class="dcc-src">{q.source}</span>
						</figcaption>
						<blockquote class="dcc-quote">“{q.quote}”</blockquote>
					</figure>
				{/each}
			</div>
		{/key}
	{/if}

	{#if hint}<div class="dcc-hint" aria-hidden="true">{hint}</div>{/if}

	{#if controls && n > 1}
		<div class="dcc-ctl" data-dcc-ui>
			<button
				type="button"
				class="dcc-btn"
				aria-label={prevLabel}
				disabled={atStart}
				onclick={() => {
					stopped = true;
					step(-1);
				}}
			>
				<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 12H5m6-6-6 6 6 6" /></svg>
			</button>
			<span class="dcc-count" aria-hidden="true"><b>{pad(active + 1)}</b> / {pad(n)}</span>
			<button
				type="button"
				class="dcc-btn"
				aria-label={nextLabel}
				disabled={atEnd}
				onclick={() => {
					stopped = true;
					step(1);
				}}
			>
				<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6" /></svg>
			</button>
		</div>
	{/if}

	<div class="dcc-sr" aria-live="polite" aria-atomic="true">{current ? announce(current, active, n) : ""}</div>
</div>

<style>
	.dcc-root {
		position: relative;
		overflow: hidden;
		width: 100%;
		container-type: inline-size;
		color: var(--fg);
		user-select: none;
		-webkit-user-select: none;
		touch-action: pan-y;
		outline: none;
		-webkit-tap-highlight-color: transparent;
		--dcc-pad: clamp(16px, 3.6cqw, 44px);
		/* Ruang bebas atas/bawah untuk elemen tetap di luar karusel (navbar, tombol mengambang). Diatur induk. */
		--dcc-t: var(--dcc-top, 0px);
		--dcc-b: var(--dcc-bottom, 0px);
	}
	.dcc-root:focus-visible {
		box-shadow: inset 0 0 0 2px var(--safelight);
	}
	.dcc-root[data-dragging],
	.dcc-root[data-dragging] .dcc-slide {
		cursor: grabbing;
	}
	.dcc-frame {
		position: absolute;
		inset: calc(var(--dcc-pad) * 0.45 + var(--dcc-t)) calc(var(--dcc-pad) * 0.45) calc(var(--dcc-pad) * 0.45 + var(--dcc-b));
		pointer-events: none;
		z-index: 1;
		border: 1px solid color-mix(in oklab, currentColor 14%, transparent);
	}
	.dcc-stage {
		position: absolute;
		left: 50%;
		top: calc(52% + (var(--dcc-t) - var(--dcc-b)) / 2);
		width: var(--dcc-s);
		aspect-ratio: 1 / 1;
		transform: translate(-50%, -50%);
		perspective: calc(var(--dcc-s) * 3.2);
	}
	.dcc-slide {
		position: absolute;
		inset: 0;
		margin: 0;
		padding: 0;
		border: 0;
		background: none;
		color: inherit;
		font: inherit;
		border-radius: 50%;
		cursor: pointer;
		will-change: transform;
		transform-style: preserve-3d;
		-webkit-tap-highlight-color: transparent;
		outline: none;
	}
	.dcc-tilt {
		position: absolute;
		inset: 0;
		transform-style: preserve-3d;
		transition: transform 0.5s cubic-bezier(0.2, 0.7, 0.2, 1);
	}
	.dcc-slide[data-active] .dcc-tilt {
		transform: translateZ(var(--dcc-lift, 0px)) rotateX(calc(var(--dcc-py, 0) * -12deg)) rotateY(calc(var(--dcc-px, 0) * 12deg));
	}
	.dcc-slide[data-active]:hover {
		--dcc-lift: calc(var(--dcc-s) * 0.05);
	}
	.dcc-shade {
		position: absolute;
		inset: 0;
		border-radius: 50%;
		pointer-events: none;
		transform: translate3d(0, 7%, -18px) scale(0.97);
		background: radial-gradient(circle closest-side, transparent 30%, rgba(0, 0, 0, 0.2) 52%, rgba(0, 0, 0, 0.1) 80%, transparent 100%);
	}
	.dcc-edge,
	.dcc-disc {
		position: absolute;
		inset: 0;
		border-radius: 50%;
		-webkit-mask: radial-gradient(circle closest-side, transparent 16.6%, #000 17.1%);
		mask: radial-gradient(circle closest-side, transparent 16.6%, #000 17.1%);
	}
	.dcc-edge {
		transform: translateZ(-4px);
		background: linear-gradient(160deg, #d7d9dc, #8d9196 55%, #c4c7cb);
	}
	.dcc-disc {
		overflow: hidden;
		background: #cfd2d6;
		box-shadow:
			inset 0 0 0 1px rgba(255, 255, 255, 0.28),
			inset 0 0 0 2px rgba(0, 0, 0, 0.08);
	}
	.dcc-roll,
	.dcc-idle,
	.dcc-play {
		position: absolute;
		inset: 0;
		border-radius: 50%;
	}
	.dcc-roll {
		transform: rotate(var(--dcc-roll, 0deg));
	}
	/* Cetakan cakram: huruf kapital rapat (Archivo yang sudah dimuat situs, sumbu lebar 62). */
	.dcc-idle {
		font-stretch: 62%;
	}
	.dcc-root[data-spin] .dcc-idle {
		animation: dcc-spin var(--dcc-spin) linear infinite;
		animation-play-state: paused;
	}
	.dcc-root[data-spin] .dcc-slide[data-active] .dcc-idle {
		animation-play-state: running;
	}
	.dcc-root[data-dragging] .dcc-slide .dcc-idle {
		animation-play-state: paused;
	}
	/* Sedang berbunyi: lapisan sendiri yang berputar cepat, berhenti di tempat saat dijeda. */
	.dcc-play {
		animation: dcc-spin 2.4s linear infinite;
		animation-play-state: paused;
	}
	.dcc-play[data-on] {
		animation-play-state: running;
	}
	@keyframes dcc-spin {
		to {
			transform: rotate(1turn);
		}
	}
	.dcc-play > img {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		max-width: none;
		display: block;
		object-fit: cover;
	}
	.dcc-play > svg,
	.dcc-hub {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		max-width: none;
		display: block;
		overflow: visible;
	}
	.dcc-hub {
		pointer-events: none;
	}
	.dcc-sheen {
		position: absolute;
		inset: 0;
		border-radius: 50%;
		pointer-events: none;
		mix-blend-mode: screen;
		opacity: var(--dcc-sheen);
		background:
			conic-gradient(
				from calc(var(--dcc-glint, 0deg) + var(--dcc-px, 0) * 70deg),
				transparent 0deg,
				rgba(255, 255, 255, 0.5) 16deg,
				transparent 38deg,
				transparent 140deg,
				rgba(150, 215, 255, 0.32) 168deg,
				rgba(255, 170, 225, 0.32) 186deg,
				rgba(255, 236, 170, 0.26) 200deg,
				transparent 224deg,
				transparent 360deg
			),
			radial-gradient(circle at 32% 24%, rgba(255, 255, 255, 0.3), transparent 46%);
	}
	.dcc-slide:focus-visible .dcc-disc {
		box-shadow:
			inset 0 0 0 3px var(--bg),
			inset 0 0 0 6px var(--safelight);
	}

	.dcc-nav {
		position: absolute;
		top: calc(var(--dcc-pad) * 0.9 + var(--dcc-t));
		left: 50%;
		transform: translateX(-50%);
		z-index: 5;
		display: flex;
		align-items: center;
		gap: clamp(12px, 1.8cqw, 22px);
		font-size: 12px;
		white-space: nowrap;
	}
	.dcc-brand {
		font-weight: 800;
		font-size: 15px;
		letter-spacing: -0.04em;
		margin-right: clamp(6px, 1.4cqw, 18px);
	}
	.dcc-link {
		position: relative;
		margin: 0;
		padding: 4px 0;
		border: 0;
		background: none;
		color: inherit;
		font: inherit;
		text-decoration: none;
		cursor: pointer;
		opacity: 0.6;
		transition: opacity 0.2s;
	}
	.dcc-link:hover,
	.dcc-link[aria-current],
	.dcc-link[aria-pressed="true"] {
		opacity: 1;
	}
	.dcc-link[aria-current]::after,
	.dcc-link[aria-pressed="true"]::after {
		content: "";
		position: absolute;
		left: 50%;
		bottom: -5px;
		width: 3px;
		height: 3px;
		margin-left: -1.5px;
		border-radius: 50%;
		background: currentColor;
	}
	.dcc-menu {
		position: relative;
	}
	.dcc-menubtn {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		margin: 0;
		padding: 4px 0;
		border: 0;
		background: none;
		color: inherit;
		font: inherit;
		cursor: pointer;
		opacity: 0.6;
		transition: opacity 0.2s;
	}
	.dcc-menubtn:hover,
	.dcc-menubtn[aria-expanded="true"] {
		opacity: 1;
	}
	.dcc-menubtn svg {
		transition: transform 0.25s;
	}
	.dcc-menubtn[aria-expanded="true"] svg {
		transform: rotate(180deg);
	}
	.dcc-list {
		position: absolute;
		top: calc(100% + 10px);
		left: 50%;
		transform: translateX(-50%);
		min-width: 240px;
		max-height: min(60vh, 420px);
		overflow-y: auto;
		margin: 0;
		padding: 6px;
		list-style: none;
		border-radius: 10px;
		background: color-mix(in oklab, var(--bg) 86%, transparent);
		border: 1px solid color-mix(in oklab, currentColor 12%, transparent);
		-webkit-backdrop-filter: blur(12px);
		backdrop-filter: blur(12px);
		box-shadow: 0 12px 32px -12px rgba(0, 0, 0, 0.28);
		animation: dcc-drop 0.22s cubic-bezier(0.2, 0.7, 0.2, 1) both;
	}
	@keyframes dcc-drop {
		from {
			opacity: 0;
			transform: translate(-50%, -6px);
		}
	}
	.dcc-opt {
		display: flex;
		align-items: baseline;
		gap: 10px;
		width: 100%;
		margin: 0;
		padding: 7px 10px;
		border: 0;
		border-radius: 6px;
		background: none;
		color: inherit;
		font: inherit;
		font-size: 12px;
		text-align: left;
		cursor: pointer;
	}
	.dcc-opt:hover,
	.dcc-opt:focus-visible {
		outline: none;
		background: color-mix(in oklab, currentColor 8%, transparent);
	}
	.dcc-opt[aria-current] .dcc-optt {
		font-weight: 600;
	}
	.dcc-optn {
		font-size: 10px;
		opacity: 0.45;
		font-variant-numeric: tabular-nums;
	}
	.dcc-opty {
		margin-left: auto;
		font-size: 10px;
		opacity: 0.45;
		font-variant-numeric: tabular-nums;
	}

	.dcc-head {
		position: absolute;
		top: calc(var(--dcc-pad) + var(--dcc-t));
		left: var(--dcc-pad);
		z-index: 4;
		width: clamp(170px, 21cqw, 290px);
		pointer-events: none;
	}
	.dcc-title {
		margin: 0 0 10px;
		font-family: var(--dcc-serif);
		font-weight: 400;
		font-size: clamp(20px, 2.5cqw, 34px);
		line-height: 0.98;
		letter-spacing: -0.01em;
		text-transform: uppercase;
		text-wrap: balance;
	}
	.dcc-dl {
		margin: 0;
	}
	.dcc-row {
		display: flex;
		justify-content: space-between;
		gap: 12px;
		padding: 5px 0 6px;
		border-top: 1px solid color-mix(in oklab, currentColor 55%, transparent);
	}
	.dcc-row dt {
		font-size: 7.5px;
		line-height: 12px;
		font-weight: 600;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		opacity: 0.75;
	}
	.dcc-row dd {
		margin: 0;
		font-size: 10.5px;
		line-height: 13px;
		text-align: right;
	}
	.dcc-row dd span {
		display: block;
	}
	.dcc-in {
		animation: dcc-in 0.8s cubic-bezier(0.2, 0.7, 0.1, 1) both;
		animation-delay: calc(var(--i, 0) * 60ms);
	}
	@keyframes dcc-in {
		from {
			opacity: 0;
			transform: translateY(12px);
			filter: blur(5px);
		}
	}

	.dcc-revs {
		position: absolute;
		bottom: calc(var(--dcc-pad) * 1.1 + var(--dcc-b));
		left: 50%;
		transform: translateX(-50%);
		z-index: 4;
		display: flex;
		gap: clamp(24px, 7cqw, 96px);
		pointer-events: none;
	}
	.dcc-rev {
		width: clamp(130px, 15cqw, 200px);
		margin: 0;
		text-align: center;
	}
	.dcc-stars {
		display: block;
		font-size: 8px;
		letter-spacing: 3px;
		margin-bottom: 6px;
	}
	.dcc-src {
		display: block;
		font-size: 6.5px;
		font-weight: 700;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		margin-bottom: 4px;
	}
	.dcc-quote {
		margin: 0;
		font-family: var(--dcc-serif);
		font-size: clamp(13px, 1.35cqw, 17px);
		line-height: 1.02;
		text-transform: uppercase;
		text-wrap: balance;
	}
	.dcc-foot {
		position: absolute;
		bottom: calc(var(--dcc-pad) * 1.1 + var(--dcc-b));
		left: 50%;
		transform: translateX(-50%);
		z-index: 5;
		max-width: calc(100% - var(--dcc-pad) * 2);
	}

	.dcc-ctl {
		position: absolute;
		right: var(--dcc-pad);
		bottom: calc(var(--dcc-pad) + var(--dcc-b));
		z-index: 5;
		display: flex;
		align-items: center;
		gap: 10px;
	}
	.dcc-btn {
		display: grid;
		place-items: center;
		width: 34px;
		height: 34px;
		margin: 0;
		padding: 0;
		border-radius: 999px;
		border: 1px solid color-mix(in oklab, currentColor 22%, transparent);
		background: none;
		color: inherit;
		cursor: pointer;
		transition:
			background 0.2s,
			opacity 0.2s,
			transform 0.2s;
	}
	.dcc-btn:hover:not(:disabled) {
		background: color-mix(in oklab, currentColor 8%, transparent);
	}
	.dcc-btn:active:not(:disabled) {
		transform: scale(0.9);
	}
	.dcc-btn:disabled {
		opacity: 0.28;
		cursor: default;
	}
	.dcc-btn:focus-visible,
	.dcc-menubtn:focus-visible,
	.dcc-link:focus-visible {
		outline: 2px solid currentColor;
		outline-offset: 3px;
	}
	.dcc-count {
		font-size: 11px;
		letter-spacing: 0.08em;
		font-variant-numeric: tabular-nums;
		min-width: 58px;
		text-align: center;
	}
	.dcc-count b {
		font-weight: 600;
	}
	.dcc-hint {
		position: absolute;
		left: var(--dcc-pad);
		bottom: calc(var(--dcc-pad) + var(--dcc-b));
		z-index: 4;
		font-size: 9px;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		opacity: 0.45;
		pointer-events: none;
		line-height: 34px;
	}
	.dcc-sr {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip: rect(0 0 0 0);
		white-space: nowrap;
	}

	@container (max-width: 720px) {
		.dcc-link,
		.dcc-hint {
			display: none;
		}
		.dcc-rev + .dcc-rev {
			display: none;
		}
		.dcc-head {
			width: clamp(150px, 44cqw, 230px);
			top: calc(var(--dcc-pad) * 3.2 + var(--dcc-t));
		}
		.dcc-row:nth-child(n + 3) {
			display: none;
		}
	}
	@container (max-width: 420px) {
		.dcc-revs,
		.dcc-foot {
			bottom: calc(var(--dcc-pad) * 4.4 + var(--dcc-b));
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.dcc-root .dcc-idle,
		.dcc-root .dcc-play,
		.dcc-in,
		.dcc-list {
			animation: none;
		}
		.dcc-tilt,
		.dcc-btn,
		.dcc-link,
		.dcc-menubtn svg {
			transition: none;
		}
	}
</style>
