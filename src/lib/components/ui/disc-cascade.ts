/**
 * Mesin & gambar label untuk <DiscCascadeCarousel> — fungsi murni (tanpa DOM), diport apa adanya dari komponen
 * React "Disc Cascade Carousel": satu angka posisi dikejar dua pegas (geser kaku + ayunan longgar), lalu tiap
 * cakram diberi pose dari jaraknya ke kedua pegas itu. Label cakram tanpa gambar dibuat di sini sebagai bentuk
 * SVG dari pola + palet (PRNG deterministik → sama di server & peramban).
 */

export type DiscCredit = {
	/** Huruf kapital kecil di kiri, mis. "Durasi". */
	label: string;
	/** Rata kanan. Larik = satu per baris. */
	value: string | string[];
};

export type DiscReview = {
	source: string;
	quote: string;
	/** 0–5, bawaan 5. */
	stars?: number;
};

export type DiscPattern = "sunburst" | "rings" | "halftone" | "horizon" | "stripes" | "eclipse" | "mosaic";

export type DiscCascadeItem = {
	/** Kunci stabil untuk {#each} (mis. id audio). Bawaan: indeks. */
	key?: string;
	/** Judul besar di blok kredit, dan cetakan di cakram kecuali `label` berkata lain. */
	title: string;
	credits?: DiscCredit[];
	reviews?: DiscReview[];
	/** Gambar label biasa. Tanpa ini (dan tanpa snippet `art`) label dibuat dari `pattern` + `palette`. */
	src?: string;
	alt?: string;
	pattern?: DiscPattern;
	/** Latar, figur, aksen. */
	palette?: [string, string, string];
	/** Teks di cakram. Bawaan `title`; "" = tanpa cetakan. */
	label?: string;
	/** "arc" mengikuti busur atas cakram, "block" bertumpuk di atas lubang. */
	labelStyle?: "arc" | "block";
	/** Warna cetakan. Bawaan hitam/putih sesuai latar label. */
	ink?: string;
	/** Teks kecil di busur bawah. Bawaan: kredit digabung. */
	fine?: string;
};

// ── gerak ─────────────────────────────────────────────────────────────

export function wrapIndex(i: number, n: number): number {
	if (n <= 0) return 0;
	return ((i % n) + n) % n;
}

/** Slide yang tampil di posisi `pos`. Tanpa loop, seretan melewati ujung tetap berarti slide ujung. */
export function indexAt(pos: number, n: number, loop: boolean): number {
	if (n <= 0) return 0;
	const i = Math.round(pos);
	return loop ? wrapIndex(i, n) : Math.min(Math.max(i, 0), n - 1);
}

/** Jarak bertanda dari posisi ke slide i (dalam slide). Dengan loop memakai jalan terpendek. */
export function offsetOf(i: number, pos: number, n: number, loop: boolean): number {
	const d = i - pos;
	return loop && n > 0 ? d - n * Math.round(d / n) : d;
}

/** Melewati ujung, deretan tetap mengikuti seretan dengan sepertiga kecepatan. */
export function rubber(pos: number, n: number): number {
	if (pos < 0) return pos / 3;
	if (pos > n - 1) return n - 1 + (pos - (n - 1)) / 3;
	return pos;
}

/** Frekuensi alami & rasio redaman dari bounce/duration gaya framer. */
export function springOf(bounce: number, duration: number): { omega: number; slide: number; tilt: number } {
	const b = Math.min(Math.max(bounce, 0), 0.9);
	return { omega: (2 * Math.PI) / Math.max(duration, 0.1), slide: 1 - b / 2, tilt: 1 - b };
}

/** Satu langkah Euler semi-implisit, dipecah supaya frame panjang tak membuatnya meledak. */
export function springStep(x: number, v: number, target: number, omega: number, zeta: number, dt: number): [number, number] {
	const steps = Math.max(1, Math.ceil(dt / (1 / 240)));
	const h = dt / steps;
	for (let k = 0; k < steps; k++) {
		v += (-omega * omega * (x - target) - 2 * zeta * omega * v) * h;
		x += v * h;
	}
	return [x, v];
}

/** Tempat seretan berhenti: ±1/5 detik dari jentikan, paling jauh tiga slide. */
export function releaseTarget(pos: number, velocity: number, n: number, loop: boolean): number {
	const here = Math.round(pos);
	let t = Math.round(pos + velocity * 0.2);
	t = Math.min(Math.max(t, here - 3), here + 3);
	return loop ? t : Math.min(Math.max(t, 0), n - 1);
}

/** Posisi terdekat yang menampilkan slide i, dihitung dari target sekarang. */
export function targetFor(i: number, target: number, n: number, loop: boolean): number {
	if (!loop) return Math.min(Math.max(i, 0), n - 1);
	const here = Math.round(target);
	let d = i - wrapIndex(here, n);
	d -= n * Math.round(d / n);
	return here + d;
}

export type PoseConfig = { spacing: number; rise: number; depth: number; yaw: number; fan: number; roll: number };

/**
 * Pose sebuah cakram. `dx` = jaraknya ke deretan yang bergeser, `d` = ke pegas yang menyusul. Posisi ikut
 * deretan; kedalaman, putaran, dan gulingan ikut pegas penyusul — itulah yang membuat cakram berayun. Cakram
 * yang mendekat berhenti maju tiga langkah di depan supaya perspektif tak meledak.
 */
export function poseOf(dx: number, d: number, c: PoseConfig) {
	const near = Math.min(d, 2.2);
	return {
		x: dx * c.spacing,
		y: -dx * c.rise,
		z: near * c.depth,
		yaw: c.yaw + d * c.fan,
		roll: d * c.roll,
		zIndex: 100 + Math.round(d * 10),
		opacity: d < -2.5 ? Math.max(0, 1 - (-d - 2.5) / 1.2) : 1,
		hidden: dx < -4 || dx > 2.8,
	};
}

// ── gambar label ──────────────────────────────────────────────────────

/** PRNG kecil deterministik: label sama di tiap render dan tiap server. */
export function rng(seed: number): () => number {
	let a = seed >>> 0;
	return () => {
		a = (a + 0x6d2b79f5) >>> 0;
		let t = a;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

/** Cetakan hitam atau putih di atas latar hex. Yang tak terbaca → putih. */
export function inkFor(bg: string): string {
	const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(bg.trim());
	if (!m) return "#ffffff";
	const h = m[1].length === 3 ? m[1].replace(/./g, (c) => c + c) : m[1];
	const lin = (i: number) => {
		const v = parseInt(h.slice(i, i + 2), 16) / 255;
		return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
	};
	const L = 0.2126 * lin(0) + 0.7152 * lin(2) + 0.0722 * lin(4);
	return L > 0.36 ? "#111111" : "#ffffff";
}

/** Pemenggalan rakus untuk label "block". Kata yang lebih panjang dari baris mendapat barisnya sendiri. */
export function wrapLabel(text: string, max: number): string[] {
	const out: string[] = [];
	let cur = "";
	for (const w of text.trim().split(/\s+/)) {
		if (!w) continue;
		if (cur && (cur + " " + w).length > max) {
			out.push(cur);
			cur = w;
		} else cur = cur ? cur + " " + w : w;
	}
	if (cur) out.push(cur);
	return out;
}

/** Ukuran huruf (dalam cakram 200 satuan) untuk `chars` huruf kapital rapat selebar `room`, maksimal `max`. */
export function fitSize(chars: number, room: number, max: number): number {
	return Math.max(6, Math.min(max, room / (Math.max(chars, 1) * 0.56)));
}

/** Lebar `chars` huruf kapital rapat pada ukuran `fs` — label dikunci ke lebar ini apa pun font yang datang. */
export function textWidth(chars: number, fs: number): number {
	return Math.max(chars, 1) * fs * 0.56;
}

export const PATTERNS: DiscPattern[] = ["horizon", "mosaic", "eclipse", "sunburst", "halftone", "rings", "stripes"];
export const PALETTES: [string, string, string][] = [
	["#1b1d1f", "#3f6b3a", "#c9d6c4"],
	["#f2e3c6", "#d2452b", "#2a5d8f"],
	["#141414", "#e9e4da", "#c8a24a"],
	["#f0c94c", "#e8572b", "#2b2622"],
	["#e9e6df", "#1d1d1d", "#d84b3c"],
	["#2d3f7a", "#e8b4c8", "#f4efe6"],
	["#d9e3df", "#16443f", "#f08a5d"],
];

/** Satu bentuk SVG label: elemen + atributnya (nama atribut SVG apa adanya), atau gradien untuk <defs>. */
export type ArtShape =
	| { t: "rect" | "circle" | "path" | "ellipse"; a: Record<string, string | number> }
	| { t: "grad"; id: string; stops: [number, string][] };

function wedge(a0: number, a1: number, r: number) {
	const p = (a: number) => (100 + r * Math.cos(a)).toFixed(2) + " " + (100 + r * Math.sin(a)).toFixed(2);
	return "M100 100L" + p(a0) + "A" + r + " " + r + " 0 0 1 " + p(a1) + "Z";
}

/** Bentuk-bentuk label buatan untuk satu pola (koordinat 0–200). `uid` membuat id gradien unik per cakram. */
export function artShapes(pattern: DiscPattern, pal: [string, string, string], seed: number, uid: string): ArtShape[] {
	const [bg, fg, ac] = pal;
	const r = rng(seed * 9973 + 17);
	const out: ArtShape[] = [{ t: "rect", a: { width: 200, height: 200, fill: bg } }];
	if (pattern === "sunburst") {
		const k = 28;
		for (let i = 0; i < k; i += 2) out.push({ t: "path", a: { d: wedge((i / k) * Math.PI * 2, ((i + 1) / k) * Math.PI * 2, 142), fill: fg } });
		out.push({ t: "circle", a: { cx: 100, cy: 100, r: 44, fill: ac } });
		out.push({ t: "circle", a: { cx: 100, cy: 100, r: 40.5, fill: "none", stroke: bg, "stroke-width": 1.6, "stroke-dasharray": "2 3.5" } });
	} else if (pattern === "rings") {
		for (let rr = 100, i = 0; rr > 36; rr -= 7, i++) out.push({ t: "circle", a: { cx: 100, cy: 100, r: rr, fill: i % 3 === 2 ? ac : i % 2 ? bg : fg } });
	} else if (pattern === "halftone") {
		const fx = 50 + r() * 100;
		const fy = 30 + r() * 60;
		for (let y = 4; y < 200; y += 8)
			for (let x = 4 + ((y / 8) % 2) * 4; x < 200; x += 8) {
				const rad = Math.max(0, 3.9 - Math.hypot(x - fx, y - fy) / 34);
				if (rad > 0.3) out.push({ t: "circle", a: { cx: x, cy: y, r: rad.toFixed(2), fill: fg } });
			}
		out.push({ t: "circle", a: { cx: fx, cy: fy, r: 16, fill: ac } });
	} else if (pattern === "horizon") {
		const gid = uid + "sky";
		out.push({ t: "grad", id: gid, stops: [[0, bg], [0.62, ac]] });
		out.push({ t: "rect", a: { width: 200, height: 200, fill: `url(#${gid})` } });
		out.push({ t: "circle", a: { cx: 60 + r() * 80, cy: 112, r: 20, fill: "#f6efe0", opacity: 0.85 } });
		// Deretan pohon: tajuk bulat dan cemara ramping di atas padang.
		let x = -4;
		while (x < 204) {
			const h = 18 + r() * 34;
			const w = 7 + r() * 9;
			if (r() > 0.45) out.push({ t: "ellipse", a: { cx: x, cy: 128 - h, rx: w, ry: w * 1.1, fill: fg } });
			else out.push({ t: "path", a: { d: "M" + x + " " + (130 - h * 1.35) + "L" + (x + w * 0.55) + " 130L" + (x - w * 0.55) + " 130Z", fill: fg } });
			out.push({ t: "rect", a: { x: x - 0.9, y: 128 - h, width: 1.8, height: h, fill: fg } });
			x += w * (0.9 + r() * 0.8);
		}
		out.push({ t: "rect", a: { y: 128, width: 200, height: 72, fill: fg } });
		for (let j = 0; j < 40; j++)
			out.push({ t: "circle", a: { cx: (r() * 200).toFixed(1), cy: (132 + r() * 66).toFixed(1), r: (0.6 + r() * 1.2).toFixed(2), fill: ac, opacity: 0.8 } });
	} else if (pattern === "stripes") {
		const rot = "rotate(" + (20 + r() * 40).toFixed(1) + " 100 100)";
		for (let i = -10; i < 20; i++) out.push({ t: "rect", a: { x: i * 14, y: -60, width: 7, height: 320, fill: i % 4 === 0 ? ac : fg, transform: rot } });
	} else if (pattern === "eclipse") {
		for (let j = 0; j < 70; j++)
			out.push({ t: "circle", a: { cx: (r() * 200).toFixed(1), cy: (r() * 200).toFixed(1), r: (0.3 + r() * 0.9).toFixed(2), fill: fg, opacity: (0.3 + r() * 0.7).toFixed(2) } });
		out.push({ t: "circle", a: { cx: 100, cy: 100, r: 78, fill: "none", stroke: ac, "stroke-width": 1, opacity: 0.6 } });
		out.push({ t: "circle", a: { cx: 100, cy: 100, r: 66, fill: fg } });
		out.push({ t: "circle", a: { cx: 118, cy: 88, r: 62, fill: bg } });
		out.push({ t: "circle", a: { cx: 100, cy: 100, r: 66, fill: "none", stroke: ac, "stroke-width": 1.4, "stroke-dasharray": "1 3" } });
	} else {
		// Mozaik: ubin dari palet dengan beberapa "jendela" bundar.
		const cols = [bg, fg, ac];
		for (let y = 0; y < 200; y += 20)
			for (let x = 0; x < 200; x += 20) {
				const c = cols[Math.floor(r() * 3)];
				const kind = r();
				out.push({ t: "rect", a: { x, y, width: 20, height: 20, fill: c } });
				if (kind > 0.7) out.push({ t: "circle", a: { cx: x + 10, cy: y + 10, r: 7, fill: cols[(cols.indexOf(c) + 1) % 3] } });
				else if (kind > 0.45) out.push({ t: "path", a: { d: "M" + x + " " + y + "h20L" + x + " " + (y + 20), fill: cols[(cols.indexOf(c) + 2) % 3] } });
			}
	}
	return out;
}

const lines = (v: string | string[]) => (Array.isArray(v) ? v : [v]);

/** Tata letak cetakan cakram: judul di busur atas (atau bertumpuk), teks kecil di busur bawah. */
export function printLayout(item: DiscCascadeItem) {
	const label = (item.label ?? item.title).toUpperCase();
	let fine = (item.fine ?? (item.credits ?? []).map((c) => c.label + " " + lines(c.value).join(", ")).join("  ·  ")).toUpperCase();
	if (fine.length > 120) fine = fine.slice(0, 118) + "…";
	if (!label) return { fine, arc: null, block: null };
	if ((item.labelStyle ?? "arc") === "arc") {
		const fs = fitSize(label.length, 226 * 0.86, 21);
		return { fine, arc: { text: label, fs, len: textWidth(label.length, fs) }, block: null };
	}
	// Bertumpuk antara y 26 dan 58: di atas lubang, di dalam tepi.
	const ls = wrapLabel(label, 11).slice(0, 3);
	const fs = Math.min(fitSize(Math.max(...ls.map((l) => l.length)), 112, 20), 32 / (ls.length * 0.98));
	const lh = fs * 0.98;
	const y0 = 58 - (ls.length - 1) * lh;
	return {
		fine,
		arc: null,
		block: {
			fs,
			lines: ls.map((text, k) => {
				const y = y0 + k * lh;
				// Tali busur di ketinggian ini (dikurangi margin) membatasi baris.
				const room = 2 * Math.sqrt(Math.max(0, 86 * 86 - (100 - y + fs * 0.35) ** 2));
				return { text, y, len: Math.min(textWidth(text.length, fs), room) };
			}),
		},
	};
}
