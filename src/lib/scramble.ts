import { access } from "./access.svelte";
import { scrambleOn } from "./sound.svelte";

/**
 * Satu-satunya suara UI situs: static/sounds/scramble-hover.mp3.
 * Dipakai untuk hover maupun klik di seluruh situs (delegasi global di
 * layout + judul arsip). Satu elemen <audio> dipakai ulang; hover
 * di-throttle, klik selalu dari awal.
 */
const SRC = "/sounds/scramble-hover.mp3";
const VOLUME = 0.3;
const HOVER_GAP_MS = 120;

let audio: HTMLAudioElement | null = null;
let lastPlayAt = 0;

function element(): HTMLAudioElement {
	if (!audio) {
		audio = new Audio(SRC);
		audio.preload = "auto";
		audio.volume = VOLUME;
	}
	return audio;
}

/** Muat berkasnya lebih dulu supaya bunyi pertama tidak telat. */
export function primeScrambleSound() {
	if (typeof window === "undefined") return;
	element().load();
}

/** Acakan meniru front-lakuna (label nav "Cari" → "aCri" → "Cari"): huruf
    sebuah kata ditukar DI DALAM kata itu sendiri, satu tukaran per langkah,
    lalu utuh kembali. Untuk judul panjang, ini dijalankan per kata secara
    berurutan — sapuan kiri→kanan — jadi bentuk kata & baris tidak berubah
    dan judul tetap terbaca, bukan satu blok huruf yang teraduk. */
const WORD_MS = 420;
const WORD_GAP_MS = 65;

type Word = { idx: number[]; seed: number[] };

/** `breaks` = indeks awal tiap text node: RevealText membungkus kata dalam
    span terpisah dan spasinya bukan bagian teks, jadi batas node juga batas kata. */
function wordsOf(source: string[], breaks: Set<number>): Word[] {
	const words: Word[] = [];
	let cur: number[] = [];
	const flush = () => {
		if (cur.length > 1) {
			words.push({ idx: cur, seed: cur.map(() => Math.floor(Math.random() * cur.length)) });
		}
		cur = [];
	};
	source.forEach((ch, i) => {
		if (breaks.has(i)) flush();
		if (/[\p{L}\p{N}]/u.test(ch)) cur.push(i);
		else flush();
	});
	flush();
	return words;
}

/** Teks asli per elemen (dicatat sekali). Animasi SELALU berangkat dari sini,
    tidak pernah dari teks yang sedang keacak — kalau tidak, hover yang picu
    ulang di tengah jalan mencatat teks acak sebagai "asli" dan judul tidak
    pernah menata kembali (drift menumpuk). */
const snapshots = new WeakMap<HTMLElement, Array<{ node: Text; orig: string }>>();
/** Elemen yang sedang dianimasikan — hover masuk di tengah jalan diabaikan
    supaya run yang berjalan selalu selesai dan mengembalikan teks asli. */
const running = new WeakSet<HTMLElement>();

function snapshotOf(root: HTMLElement): Array<{ node: Text; orig: string }> {
	const items: Array<{ node: Text; orig: string }> = [];
	const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
	let t: Text | null;
	while ((t = walker.nextNode() as Text | null)) {
		if (!t.data.trim()) continue;
		items.push({ node: t, orig: t.data });
	}
	return items;
}

/** Acak teks elemen (per text-node, jadi markup anak seperti <span> aman),
    lalu tata kembali — efek hover judul situs referensi. */
export function scrambleElement(root: HTMLElement) {
	if (running.has(root)) return;
	let items = snapshots.get(root)?.filter((x) => x.node.isConnected) ?? [];
	// Teks berubah secara sah (ganti bahasa/CMS) → catat ulang dari live.
	// Bandingkan SEBELUM menulis apa pun agar sisa acak tak jadi "asli".
	const live = items.map((x) => x.node.data).join("");
	const snap = items.map((x) => x.orig).join("");
	if (!items.length || live !== snap) {
		items = snapshotOf(root);
		if (!items.length) return;
		snapshots.set(root, items);
	}
	const source = items.flatMap((x) => [...x.orig]);
	const total = source.length;
	if (!total) return;
	running.add(root);
	// Kunci kotak selama animasi: lebar glyph acak menggeser bungkus baris —
	// tanpa ini judul memendek/memanjang dan gambar di bawahnya melompat
	// (terlihat seperti glitch). Kembalikan semua setelah selesai.
	const prevMinH = root.style.minHeight;
	const prevMaxH = root.style.maxHeight;
	const prevOverflow = root.style.overflow;
	const h = root.offsetHeight;
	if (h) {
		root.style.minHeight = `${h}px`;
		root.style.maxHeight = `${h}px`;
		// clip, BUKAN hidden: overflow hidden membuat block formatting context
		// baru → margin judul di dalamnya berhenti "tembus" keluar, tinggi total
		// menyusut beberapa px selama animasi, dan konten di bawahnya naik-turun
		// tiap kali judul diacak. clip memotong tanpa mengubah tata letak.
		root.style.overflow = "clip";
	}
	const unlock = () => {
		if (h) {
			if (root.style.minHeight === `${h}px`) root.style.minHeight = prevMinH;
			if (root.style.maxHeight === `${h}px`) root.style.maxHeight = prevMaxH;
			if (root.style.overflow === "clip") root.style.overflow = prevOverflow;
		}
	};
	const start = performance.now();
	const breaks = new Set<number>();
	items.reduce((at, x) => (breaks.add(at), at + [...x.orig].length), 0);
	const words = wordsOf(source, breaks);
	const endAt = (words.length - 1) * WORD_GAP_MS + WORD_MS;
	function frame(now: number) {
		if (!root.isConnected) {
			unlock();
			running.delete(root);
			return;
		}
		const t = now - start;
		const p = t >= endAt ? 1 : 0;
		const mixed = source.slice();
		words.forEach((w, n) => {
			const e = t - n * WORD_GAP_MS;
			if (e < 0 || e >= WORD_MS) return;
			const local = w.idx.map((i) => source[i]);
			const step = Math.floor(e / (WORD_MS / local.length));
			for (let i = 0; i <= step && i < local.length; i += 1) {
				const j = w.seed[i];
				[local[i], local[j]] = [local[j], local[i]];
			}
			w.idx.forEach((i, k) => (mixed[i] = local[k]));
		});
		let at = 0;
		for (const { node: tn, orig } of items) {
			const len = [...orig].length;
			tn.data = mixed.slice(at, at + len).join("");
			at += len;
		}
		if (p < 1) {
			requestAnimationFrame(frame);
		} else {
			for (const { node: tn, orig } of items) tn.data = orig;
			unlock();
			running.delete(root);
		}
	}
	requestAnimationFrame(frame);
}

/**
 * Action `use:scrambleHover` — hover tepat di atas HURUF judul: animasi acak saja, TANPA bunyi
 * (judul bukan tombol; bunyi hover berulang tiap kursor lewat terasa
 * mengganggu). Diam bila reduce-motion.
 */
export function scrambleHover(node: HTMLElement) {
	function allowedNow(): boolean {
		if (typeof window === "undefined") return false;
		if (access.settings.reduceMotion) return false;
		if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
		return true;
	}

	// Tombol/tautan: seluruh areanya adalah sasaran hover, jadi cukup pointerenter.
	if (node.closest("button, a, [role='button']")) {
		const onEnter = () => {
			if (allowedNow()) scrambleElement(node);
		};
		node.addEventListener("pointerenter", onEnter);
		return {
			destroy() {
				node.removeEventListener("pointerenter", onEnter);
			},
		};
	}

	// Judul (teks biasa): elemennya blok selebar kolom, jadi kursor di ruang kosong sebelah teks
	// tak boleh memicu. Pemicu = kursor MASUK ke salah satu persegi huruf (per baris), bukan ke kotak elemen.
	const PAD = 3; // toleransi px di sekitar huruf, supaya tepi tak terasa "meleset"
	let inside = false;
	let raf = 0;
	let lastX = 0;
	let lastY = 0;

	function overText(x: number, y: number): boolean {
		const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
		const range = document.createRange();
		for (let n = walker.nextNode(); n; n = walker.nextNode()) {
			if (!(n as Text).data.trim()) continue;
			range.selectNodeContents(n);
			for (const r of range.getClientRects()) {
				if (x >= r.left - PAD && x <= r.right + PAD && y >= r.top - PAD && y <= r.bottom + PAD) return true;
			}
		}
		return false;
	}

	function check() {
		raf = 0;
		const hit = overText(lastX, lastY);
		if (hit && !inside) {
			inside = true;
			if (allowedNow()) scrambleElement(node);
		} else if (!hit) {
			inside = false;
		}
	}
	function onMove(e: PointerEvent) {
		lastX = e.clientX;
		lastY = e.clientY;
		if (!raf) raf = requestAnimationFrame(check);
	}
	function onLeave() {
		inside = false;
		if (raf) {
			cancelAnimationFrame(raf);
			raf = 0;
		}
	}
	node.addEventListener("pointermove", onMove);
	node.addEventListener("pointerleave", onLeave);
	return {
		destroy() {
			node.removeEventListener("pointermove", onMove);
			node.removeEventListener("pointerleave", onLeave);
			if (raf) cancelAnimationFrame(raf);
		},
	};
}

/** Bunyi scramble hover — di-throttle agar sapuan cepat tidak beruntun. */
export function playScrambleSound() {
	if (!allowed()) return;
	const now = performance.now();
	if (now - lastPlayAt < HOVER_GAP_MS) return;
	lastPlayAt = now;
	play();
}

/** Bunyi scramble klik — selalu dari awal. */
export function playScrambleClick() {
	if (!allowed()) return;
	play();
}

function allowed(): boolean {
	if (typeof window === "undefined") return false;
	if (!scrambleOn()) return false;
	if (access.settings.reduceMotion) return false;
	if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
	return true;
}

function play() {
		try {
			const el = element();
			el.currentTime = 0;
			// Hover & klik adalah gerakan pengguna → autoplay diizinkan;
			// penolakan ditelan diam-diam.
			void el.play().catch(() => {});
		} catch {
			/* audio tidak tersedia */
		}
	}
