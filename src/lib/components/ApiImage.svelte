<script lang="ts">
	/**
	 * Pengganti next/image — di Svelte Kit semua gambar dirender sebagai <img>
	 * biasa (tidak ada image optimizer), jadi wrapper ini tinggal memusatkan
	 * perilaku lazy/eager dan mode fill (absolute, object-fit: cover).
	 *
	 * `photoId` (foto dari API): thumbnail/pratinjau publik kecil (800/1000 px). Begitu gambar terlihat dan
	 * berkasnya ternyata direntangkan > 1,12× di layar, ia diganti versi file asli seukuran kebutuhan
	 * (/view?w=1280|2048|3200|5120, tak pernah diperbesar melebihi aslinya) — didekode dulu di latar, baru
	 * ditukar (tanpa kedip). Elemen yang membesar belakangan (animasi, resize) dinaikkan lagi ke ukuran berikutnya.
	 *
	 * Foto dari API datang TERACAK (lib/photoScramble.ts) → dirender sebagai <canvas> yang disusun ulang, bukan
	 * <img>: tab Network/Elements hanya memuat mozaik. Kelas, gaya, object-fit, dan event load/error sama.
	 */
	import { fetchPhotoOriginal, fetchSectionImage, VIEW_WIDTHS } from "$lib/data";
	import { isCreditedUrl, creditBarPx } from "$lib/creditCrop";
	import { intrinsicSize, isScrambledUrl, loadScrambledCached, scrambled } from "$lib/photoScramble";
	type ApiImageProps = {
		src: string;
		alt?: string;
		fill?: boolean;
		eager?: boolean;
		class?: string;
		style?: string;
		width?: number | string;
		height?: number | string;
		/** Dipanggil saat gambar selesai dimuat ATAU gagal (agar pemanggil tidak menunggu selamanya). */
		onload?: () => void;
		onerror?: () => void;
		/** Id foto di API — aktifkan penggantian ke versi tajam (lihat atas). Jangan diisi untuk video. */
		photoId?: string;
		/** Versi tajamnya tetap ber-watermark (pratinjau produk di halaman detail). */
		sharpWatermark?: boolean;
		/** Gambar section homepage CMS (key section, mis. "banding"): naik tingkat lewat /api/homepage/:key/image. */
		sectionKey?: string;
		/** fetchpriority berkasnya (img maupun kanvas teracak). */
		priority?: "high" | "low" | "auto";
	};

	let {
		src,
		alt = "",
		fill = false,
		eager = false,
		class: cls = "",
		style = "",
		width,
		height,
		onload,
		onerror,
		photoId,
		sharpWatermark = false,
		sectionKey,
		priority
	}: ApiImageProps = $props();

	let imgEl = $state<HTMLImageElement | HTMLCanvasElement>();
	/** Versi tajam yang sudah siap tampil — hanya berlaku untuk `src` yang sama. */
	let sharp = $state<{ for: string; url: string } | null>(null);
	const shown = $derived(sharp && sharp.for === src ? sharp.url : src);
	const asCanvas = $derived(isScrambledUrl(shown));
	const ready = (el: HTMLImageElement | HTMLCanvasElement) =>
		el instanceof HTMLCanvasElement ? el.dataset.scr === "ok" : el.complete && el.naturalWidth > 0;

	$effect(() => {
		const el = imgEl;
		const id = photoId;
		const section = sectionKey;
		const base = src;
		const wm = sharpWatermark;
		if (!el || !(id || section) || typeof IntersectionObserver === "undefined") return;
		let alive = true;
		let visible = false;
		let have = 0;
		const check = () => {
			const size = alive && visible && ready(el) ? intrinsicSize(el) : null;
			if (!size) return;
			const r = el.getBoundingClientRect();
			if (r.width < 8 || r.height < 8) return;
			const dpr = window.devicePixelRatio || 1;
			const nw = size.w;
			// Thumbnail/pratinjau berpita kredit di dasarnya (dipotong saat tampil): yang tampil hanya foto di atasnya.
			// (Kanvas teracak sudah dipotong saat disusun.)
			const nh = el instanceof HTMLImageElement && isCreditedUrl(el.currentSrc || el.src) ? size.h - creditBarPx(nw) : size.h;
			const fit = getComputedStyle(el).objectFit;
			const sx = r.width / nw;
			const sy = r.height / nh;
			const scale = fit === "contain" || fit === "scale-down" ? Math.min(sx, sy) : fit === "cover" ? Math.max(sx, sy) : sx;
			const needW = nw * scale * dpr;
			// Tak pernah tampil lebih besar dari pikselnya (toleransi pembulatan saja): ambil ukuran turunan
			// terkecil yang ≥ kebutuhan layar. Batasnya file asli sendiri (turunan tak pernah diperbesar).
			if (needW <= nw * 1.005) return; // berkas sekarang sudah cukup tajam
			const tier = VIEW_WIDTHS.find((t) => t >= needW) ?? VIEW_WIDTHS[VIEW_WIDTHS.length - 1]!;
			if (tier <= have || tier <= nw) return;
			have = tier;
			void (id ? fetchPhotoOriginal(id, tier, { watermark: wm }) : fetchSectionImage(section!, tier)).then((url) => {
				if (!alive || !url) return;
				const swap = () => {
					if (alive) sharp = { for: base, url };
				};
				if (isScrambledUrl(url)) {
					loadScrambledCached(url).then(swap, () => {});
					return;
				}
				const pre = new Image();
				pre.src = url;
				pre.decode().then(swap).catch(() => {});
			});
		};
		const io = new IntersectionObserver(
			([e]) => {
				visible = !!e?.isIntersecting;
				check();
			},
			{ rootMargin: "200px" },
		);
		const ro = new ResizeObserver(check);
		io.observe(el);
		ro.observe(el);
		el.addEventListener("load", check);
		return () => {
			alive = false;
			io.disconnect();
			ro.disconnect();
			el.removeEventListener("load", check);
		};
	});

	// Gambar dari cache bisa sudah complete sebelum handler onload terpasang
	// (tidak ada event load kedua) — laporkan langsung supaya tidak digantung.
	$effect(() => {
		const el = imgEl;
		if (el && ready(el)) onload?.();
	});
</script>

{#if asCanvas}
	<canvas
		bind:this={imgEl}
		use:scrambled={{ src: shown, eager, priority }}
		aria-label={alt}
		onload={() => onload?.()}
		onerror={() => onerror?.()}
		class={fill ? `absolute inset-0 h-full w-full ${cls}` : cls}
		style={fill ? `object-fit: cover;${style}` : style}
	></canvas>
{:else}
	<img
		bind:this={imgEl}
		src={shown}
		{alt}
		loading={eager ? "eager" : "lazy"}
		fetchpriority={priority}
		decoding="async"
		draggable={false}
		{width}
		{height}
		onload={() => onload?.()}
		onerror={() => onerror?.()}
		class={fill ? `absolute inset-0 h-full w-full ${cls}` : cls}
		style={fill ? `object-fit: cover;${style}` : style}
	/>
{/if}