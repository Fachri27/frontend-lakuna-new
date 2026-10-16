/**
 * Penyusun FOTO TERACAK — pasangan apps/api/src/utils/scrambledImage.ts. (Bukan lib/scramble.ts: itu modul suara/efek UI.)
 *
 * Semua foto di situs dikirim API sebagai mozaik ubin yang urutannya diacak; kuncinya di fragment URL
 * (`…jpg?X-Amz-…#lk=…`). Berkas itu sendiri (tab Network, "Open image in new tab", "Save image as") hanya
 * berisi potongan acak. Di halaman, ubinnya disusun kembali ke <canvas>:
 *   - gambar dimuat TANPA crossOrigin → kanvasnya "tainted": toDataURL()/getImageData() dari konsol ditolak
 *     browser, jadi hasil susunan tak bisa diekspor;
 *   - tiap ubin disalin 1:1 di koordinat bulat (tanpa skala) → hasilnya persis sama dengan foto aslinya;
 *     penskalaan tampilan dikerjakan CSS (object-fit berlaku untuk <canvas> seperti <img>).
 * PRNG & permutasi HARUS identik dengan API.
 */
import { creditHiddenPx, isCreditedUrl } from "$lib/creditCrop";
import { sinceScroll } from "$lib/scrollCalm";

export type ScrambleKey = { w: number; h: number; b: number; seed: number };

const VERSION = 1;
const MASK = [0x5a, 0xc3, 0x17, 0x8e, 0x29, 0xf4, 0x63, 0xb1, 0x0d, 0x9e];
const FRAG = /[#&]lk=([A-Za-z0-9_-]{14})(?:&|$)/;

/** Kunci penyusun dari URL; null = bukan berkas teracak. */
export function scrambleKey(url: string | null | undefined): ScrambleKey | null {
	if (!url) return null;
	const m = FRAG.exec(url);
	if (!m) return null;
	let bin: string;
	try {
		bin = atob(m[1]!.replace(/-/g, "+").replace(/_/g, "/"));
	} catch {
		return null;
	}
	if (bin.length !== 10) return null;
	const b = new Uint8Array(10);
	for (let i = 0; i < 10; i++) b[i] = bin.charCodeAt(i) ^ MASK[i]!;
	if (b[0] !== VERSION) return null;
	const dv = new DataView(b.buffer);
	const key = { b: b[1]! * 16, w: dv.getUint16(2, true), h: dv.getUint16(4, true), seed: dv.getUint32(6, true) };
	return key.b > 0 && key.w > 0 && key.h > 0 ? key : null;
}

export function isScrambledUrl(url: string | null | undefined): boolean {
	return !!url && FRAG.test(url);
}

function mulberry32(a: number) {
	return () => {
		a |= 0;
		a = (a + 0x6d2b79f5) | 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

const perms = new Map<string, Uint32Array>();
function permutation(n: number, seed: number): Uint32Array {
	const id = `${n}:${seed}`;
	let p = perms.get(id);
	if (p) return p;
	p = new Uint32Array(n);
	for (let i = 0; i < n; i++) p[i] = i;
	const rnd = mulberry32(seed);
	for (let i = n - 1; i > 0; i--) {
		const j = Math.floor(rnd() * (i + 1));
		const t = p[i]!;
		p[i] = p[j]!;
		p[j] = t;
	}
	if (perms.size > 400) perms.clear();
	perms.set(id, p);
	return p;
}

/** Ukuran tampil (piksel berkas) sesudah pita kredit dibuang — rasio kanvasnya. */
export function scrambledSize(url: string, key: ScrambleKey): { w: number; h: number } {
	const hidden = isCreditedUrl(url) ? creditHiddenPx(key.w, key.h) : 0;
	return { w: key.w, h: Math.max(1, key.h - hidden) };
}

export type ScrambleCrop = { x: number; y: number; w: number; h: number };

/**
 * Susun `img` (berkas teracak dengan kunci `key`) ke kanvas, seukuran piksel fotonya — atau hanya potongan
 * `crop` (piksel foto, bilangan bulat; mis. kartu yang di-cover) supaya kanvas tak menyimpan piksel yang tak
 * pernah tampil. Tetap 1:1, jadi hasilnya persis.
 */
export function paintScrambled(
	canvas: HTMLCanvasElement,
	img: CanvasImageSource,
	url: string,
	key: ScrambleKey,
	crop?: ScrambleCrop,
) {
	const { w, h } = scrambledSize(url, key);
	const x0 = crop ? Math.max(0, Math.floor(crop.x)) : 0;
	const y0 = crop ? Math.max(0, Math.floor(crop.y)) : 0;
	const cw = crop ? Math.max(1, Math.min(w - x0, Math.round(crop.w))) : w;
	const ch = crop ? Math.max(1, Math.min(h - y0, Math.round(crop.h))) : h;
	if (canvas.width !== cw) canvas.width = cw;
	if (canvas.height !== ch) canvas.height = ch;
	const ctx = canvas.getContext("2d", { alpha: false });
	if (!ctx) return;
	ctx.imageSmoothingEnabled = false;
	// Stempel taint DULU (piksel 0,0 lalu tertimpa ubin): sumber dari jalur cepat (bitmap CORS) itu "bersih",
	// jadi tanpa stempel kanvasnya bisa diekspor dari konsol. Flag taint kanvas permanen.
	if (taintStamp) ctx.drawImage(taintStamp, 0, 0, 1, 1, 0, 0, 1, 1);
	const b = key.b;
	const cols = Math.ceil(key.w / b);
	const rows = Math.ceil(key.h / b);
	const perm = permutation(cols * rows, key.seed);
	for (let i = 0; i < perm.length; i++) {
		const dx = (i % cols) * b - x0;
		const dy = Math.floor(i / cols) * b - y0;
		if (dy >= ch) break; // ubin di bawah potongan / pita kredit tak perlu disalin
		if (dy + b <= 0 || dx + b <= 0 || dx >= cw) continue;
		const j = perm[i]!;
		ctx.drawImage(img, (j % cols) * b, Math.floor(j / cols) * b, b, b, dx, dy, b, b);
	}
}

/** Berkas teracak yang sudah ter-decode: <img> (jalur dasar) atau ImageBitmap (jalur cepat). */
export type ScrambledSource = HTMLImageElement | ImageBitmap;

/** Ukuran piksel berkas sumber (img: naturalWidth/Height; bitmap: width/height). */
export function sourceSize(src: ScrambledSource): { w: number; h: number } {
	return src instanceof HTMLImageElement ? { w: src.naturalWidth, h: src.naturalHeight } : { w: src.width, h: src.height };
}

/**
 * Dua jalur muat:
 *  - dasar: <img> tanpa CORS → sumbernya sendiri "tainted". Tapi Chrome men-decode gambar seperti itu di THREAD
 *    UTAMA saat pertama dilukis ke kanvas (3200 px ±70 ms, 5120 px ±130 ms; ×3 di CPU lambat) — patah-patah.
 *  - cepat: fetch CORS → createImageBitmap(blob): di-decode di luar thread utama (tanpa long task). Bitmapnya
 *    "bersih", jadi kanvas wajib distempel taint (lihat paintScrambled). Hanya dipakai bila stempelnya sudah ada;
 *    gagal (CORS/CSP storage) → kembali ke jalur dasar untuk seterusnya.
 * Stempel = kanvas 1×1 yang disalin dari gambar teracak PERTAMA yang dimuat lewat jalur dasar (lintas-origin
 * tanpa CORS → tainted); kecil, jadi melukisnya tak pernah memicu decode ulang.
 */
let taintStamp: HTMLCanvasElement | null = null;
let fastBroken = false;

function makeStamp(img: HTMLImageElement) {
	if (taintStamp || !img.naturalWidth) return;
	const c = document.createElement("canvas");
	c.width = c.height = 1;
	const ctx = c.getContext("2d");
	if (!ctx) return;
	ctx.drawImage(img, 0, 0, 1, 1, 0, 0, 1, 1);
	try {
		c.toDataURL();
		return; // tidak tainted (mis. storage satu origin dengan halaman) → bukan stempel; jalur cepat tetap mati
	} catch {
		taintStamp = c;
	}
}

function loadViaImage(url: string, priority?: "high" | "low" | "auto"): Promise<HTMLImageElement> {
	return new Promise<HTMLImageElement>((resolve, reject) => {
		const img = new Image();
		img.decoding = "async";
		if (priority) img.fetchPriority = priority;
		img.onload = () =>
			img.decode().then(
				() => (makeStamp(img), resolve(img)),
				() => (makeStamp(img), resolve(img)),
			);
		img.onerror = () => reject(new Error("scrambled image failed"));
		img.src = url;
	});
}

async function loadViaBitmap(url: string, priority?: "high" | "low" | "auto"): Promise<ImageBitmap> {
	const res = await fetch(url, { mode: "cors", credentials: "omit", ...(priority ? { priority } : {}) } as RequestInit);
	if (!res.ok) throw new Error(`HTTP ${res.status}`);
	return createImageBitmap(await res.blob());
}

const loads = new Map<string, Promise<ScrambledSource>>();
/** Muat + decode berkas teracak, cache per berkas (path tanpa query): satu foto di beberapa kanvas cukup sekali. */
export function loadScrambledCached(url: string, priority?: "high" | "low" | "auto"): Promise<ScrambledSource> {
	const id = url.split(/[?#]/)[0]!;
	let p = loads.get(id);
	if (!p) {
		p =
			taintStamp && !fastBroken && typeof createImageBitmap === "function"
				? loadViaBitmap(url, priority).catch((e) => {
						// Storage tanpa CORS / diblokir CSP: jangan coba lagi; HTTP 4xx (URL basi) tetap jalur dasar sekali ini.
						if (e instanceof TypeError) fastBroken = true;
						return loadViaImage(url, priority);
					})
				: loadViaImage(url, priority);
		// Cache hanya untuk kanvas yang meminta berkas yang sama hampir bersamaan (pelat peta + strip + viewer).
		// Sesudah itu dilepas: piksel sudah ada di kanvasnya, dan menahan gambar ter-decode = memori ganda.
		const mine = p;
		mine.then(
			() => setTimeout(() => loads.get(id) === mine && loads.delete(id), 20_000),
			() => loads.delete(id),
		);
		if (loads.size > 160) loads.delete(loads.keys().next().value!);
		loads.set(id, mine);
	}
	return p;
}

/** Ukuran intrinsik elemen gambar: <img> → naturalWidth/Height, <canvas> teracak → ukuran fotonya. */
export function intrinsicSize(el: Element | null | undefined): { w: number; h: number } | null {
	if (el instanceof HTMLImageElement) return el.naturalWidth ? { w: el.naturalWidth, h: el.naturalHeight } : null;
	if (el instanceof HTMLCanvasElement) return el.dataset.scr === "ok" ? { w: el.width, h: el.height } : null;
	return null;
}

/**
 * Penjadwal "gulir tenang" untuk menyusun gambar BESAR dari jalur dasar (<img> tanpa CORS — lihat
 * loadScrambledCached): Chrome men-decode-nya di thread utama saat pertama dilukis ke kanvas (±65–140 ms untuk
 * 3200–5120 px).
 * Itu tak boleh jatuh di tengah guliran (patah-patah), jadi kanvas besar dilukis satu per satu, hanya setelah
 * gulir berhenti ±220 ms. Gambar kecil (thumbnail) & yang diminta `priority: "high"` langsung dilukis.
 */
const BIG_PX = 1_600_000;
const CALM_MS = 220;
const calmQueue: (() => void)[] = [];
let calmTimer: ReturnType<typeof setTimeout> | 0 = 0;
function pumpCalm() {
	calmTimer = 0;
	if (!calmQueue.length) return;
	const wait = CALM_MS - sinceScroll();
	if (wait > 0) {
		calmTimer = setTimeout(pumpCalm, wait);
		return;
	}
	calmQueue.shift()!();
	// Satu per giliran: beri jeda satu frame sebelum gambar besar berikutnya.
	if (calmQueue.length) calmTimer = setTimeout(pumpCalm, 32);
}
export function whenScrollCalm(job: () => void) {
	calmQueue.push(job);
	if (!calmTimer) calmTimer = setTimeout(pumpCalm, 0);
}

/**
 * Satu IntersectionObserver untuk SEMUA kanvas lazy (bukan satu per kanvas): puluhan observer aktif dihitung
 * ulang tiap frame selama gulir. scrollMargin: kanvas di dalam strip yang digulir/terpotong (overflow) juga
 * dimuat lebih dulu, seperti <img loading="lazy"> — rootMargin saja hanya berlaku untuk viewport.
 */
let lazyIo: IntersectionObserver | null = null;
const lazyCbs = new Map<Element, () => void>();
function watchNear(el: Element, cb: () => void): () => void {
	if (!lazyIo) {
		lazyIo = new IntersectionObserver(
			(entries) => {
				for (const e of entries) {
					if (!e.isIntersecting) continue;
					const fn = lazyCbs.get(e.target);
					if (!fn) continue;
					lazyCbs.delete(e.target);
					lazyIo?.unobserve(e.target);
					fn();
				}
			},
			{ rootMargin: "1250px", scrollMargin: "1250px" } as IntersectionObserverInit,
		);
	}
	lazyCbs.set(el, cb);
	lazyIo.observe(el);
	return () => {
		if (lazyCbs.delete(el)) lazyIo?.unobserve(el);
	};
}

export type ScrambledParams =
	| string
	| null
	| undefined
	| {
			src: string | null | undefined;
			/** Muat segera (default: saat mendekati layar, seperti loading="lazy"). */
			eager?: boolean;
			priority?: "high" | "low" | "auto";
	  };

function normParams(p: ScrambledParams) {
	return typeof p === "string" || p == null ? { src: p ?? null, eager: false, priority: undefined } : { eager: false, ...p, src: p.src ?? null };
}

/**
 * Action Svelte untuk <canvas>: `<canvas use:scrambled={url}>` atau `use:scrambled={{ src, eager, priority }}`.
 * - Ukuran kanvas (= rasio foto) dipasang SEBELUM berkasnya dimuat, jadi tata letak sudah benar sejak awal.
 * - Lazy seperti <img loading="lazy"> kecuali `eager`.
 * - Sesudah tersusun: `data-scr="ok"` dan event `load` di kanvas (gagal → `error`), jadi `onload={…}` bekerja
 *   seperti pada <img>. Ganti `src` → kanvas lama tetap tampil sampai berkas baru siap (tanpa kedip).
 */
export function scrambled(canvas: HTMLCanvasElement, params: ScrambledParams) {
	let cur = normParams(params);
	let token = 0;
	let unwatch: (() => void) | null = null;
	const stopIo = () => {
		unwatch?.();
		unwatch = null;
	};
	const run = () => {
		const { src, priority } = cur;
		const key = scrambleKey(src);
		const my = ++token;
		if (!src || !key) {
			if (src) canvas.dispatchEvent(new Event("error"));
			return;
		}
		loadScrambledCached(src, priority).then(
			(img) => {
				if (my !== token) return;
				const paint = () => {
					if (my !== token) return;
					paintScrambled(canvas, img, src, key);
					canvas.dataset.scr = "ok";
					canvas.dispatchEvent(new Event("load"));
				};
				// Bitmap (jalur cepat) sudah ter-decode di luar thread utama → langsung. <img> besar → tunggu gulir tenang.
				if (img instanceof HTMLImageElement && priority !== "high" && key.w * key.h > BIG_PX) whenScrollCalm(paint);
				else paint();
			},
			() => {
				if (my !== token) return;
				canvas.dispatchEvent(new Event("error"));
			},
		);
	};
	/** Belum ada isi: pasang rasio fotonya sejak awal — juga untuk kanvas lazy yang belum dekat layar (tanpa ini
	 *  ukuran bawaan 300×150 = rasio 2:1). Kanvas kosong transparan → latar induk terlihat, seperti <img> yang belum
	 *  dimuat. Menyetel width/height tanpa konteks tidak mengalokasikan memori. */
	const presize = () => {
		const key = scrambleKey(cur.src);
		if (!cur.src || !key || canvas.dataset.scr === "ok") return;
		const { w, h } = scrambledSize(cur.src, key);
		if (canvas.width !== w) canvas.width = w;
		if (canvas.height !== h) canvas.height = h;
	};
	const start = () => {
		stopIo();
		presize();
		if (cur.eager || typeof IntersectionObserver === "undefined") return run();
		unwatch = watchNear(canvas, () => {
			unwatch = null;
			run();
		});
	};
	canvas.setAttribute("role", canvas.getAttribute("role") ?? "img");
	start();
	return {
		update(next: ScrambledParams) {
			const n = normParams(next);
			if (n.src === cur.src && n.eager === cur.eager) return;
			const sameFile = !!n.src && !!cur.src && n.src.split(/[?#]/)[0] === cur.src.split(/[?#]/)[0];
			cur = n;
			// URL presigned diperbarui (berkas sama) → isi kanvas sudah benar, tak perlu dimuat ulang.
			if (sameFile && canvas.dataset.scr === "ok") return;
			start();
		},
		destroy() {
			token++;
			stopIo();
		},
	};
}
