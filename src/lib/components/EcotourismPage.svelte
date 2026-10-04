<script lang="ts">
	import { onMount } from "svelte";
	import { i18n, type Lang } from "$lib/i18n.svelte";
	import { fetchPhotos, imgFor, type Photo } from "$lib/data";
	import ApiImage from "./ApiImage.svelte";

	/**
	 * Ekowisata sebagai SATU garis turun: puncak → karang. Lima zona; altimeter
	 * di kiri dan warna latar mengikuti posisi gulir (satu-satunya gerak di
	 * halaman ini). Isi tiap zona diambil dari arsip menurut kata kunci.
	 */
	type Band = {
		id: "mountain" | "forest" | "water" | "coast" | "reef";
		from: number; // ketinggian (m dpl; negatif = di bawah laut) di awal zona
		to: number; // dan di akhir zona
		tone: [number, number, number]; // warna latar
		terms: string[]; // kata kunci pencarian arsip (id + en)
		name: Record<Lang, string>;
		note: Record<Lang, string>;
	};

	const BANDS: Band[] = [
		{
			id: "mountain", from: 3200, to: 1500, tone: [20, 27, 40], terms: ["gunung", "mountain"],
			name: { id: "Pegunungan", en: "Mountains" },
			note: {
				id: "Kawah, savana di ketinggian, dan jalur pendakian yang kuotanya dibatasi supaya tanahnya sempat pulih.",
				en: "Craters, high savannah, and climbing routes with visitor quotas, so the ground has time to recover.",
			},
		},
		{
			id: "forest", from: 1500, to: 200, tone: [12, 28, 21], terms: ["hutan", "forest"],
			name: { id: "Hutan hujan", en: "Rainforest" },
			note: {
				id: "Rumah orangutan, harimau, dan burung rangkong. Jalan setapaknya dipandu warga desa yang menjaganya.",
				en: "Home to orangutans, tigers, and hornbills. The trails are guided by the villagers who look after them.",
			},
		},
		{
			id: "water", from: 200, to: 0, tone: [10, 30, 36], terms: ["danau", "lake", "sungai", "river"],
			name: { id: "Danau dan sungai", en: "Lakes and rivers" },
			note: {
				id: "Perahu tanpa mesin, kampung di atas air, dan sungai yang masih menjadi jalan utama.",
				en: "Boats without engines, villages on stilts, and rivers that are still the main road.",
			},
		},
		{
			id: "coast", from: 0, to: -5, tone: [31, 26, 17], terms: ["pantai", "beach", "mangrove"],
			name: { id: "Pantai dan mangrove", en: "Beaches and mangroves" },
			note: {
				id: "Penyu bertelur, bakau yang menahan gelombang, dan kampung nelayan yang menjual hasil lautnya langsung.",
				en: "Turtles nesting, mangroves holding back the waves, and fishing villages that sell their catch directly.",
			},
		},
		{
			id: "reef", from: -5, to: -30, tone: [5, 22, 40], terms: ["karang", "reef", "laut"],
			name: { id: "Terumbu karang", en: "Coral reefs" },
			note: {
				id: "Dari Raja Ampat sampai Wakatobi: penyelaman di zona lindung, dengan tambat jangkar supaya karang tak patah.",
				en: "From Raja Ampat to Wakatobi: diving in protected zones, with mooring buoys so the coral isn't broken.",
			},
		},
	];

	const copy: Record<Lang, {
		title: string; lede: string; metaFrames: (n: number) => string; empty: string; emptyCta: string;
		seeAll: string; principlesTitle: string; principles: { say: string; body: string }[];
		ctaTitle: string; ctaBody: string; contribute: string; browse: string;
		unitAbove: string; unitBelow: string; altimeter: string;
	}> = {
		id: {
			title: "Ekowisata, dari puncak ke karang",
			lede: "Ekowisata berarti bepergian ke alam tanpa meninggalkan luka, dan membuat warga setempat ikut menikmati hasilnya. Halaman ini mengikuti satu garis turun: lima ekosistem, dari puncak gunung sampai dasar terumbu.",
			metaFrames: (n) => `${n} bingkai di zona ini`,
			empty: "Belum ada bingkai untuk zona ini.",
			emptyCta: "Kirim bingkai pertamamu",
			seeAll: "Lihat di arsip",
			principlesTitle: "Yang kami minta dari setiap bingkai",
			principles: [
				{ say: "Lokasi ditulis jelas.", body: "Pembaca perlu tahu persis apa yang mereka lihat dan di mana, supaya bisa menjaganya." },
				{ say: "Aturan kawasan dihormati.", body: "Tanpa drone di zona terlarang, tanpa menyentuh satwa atau karang, tanpa mengubah tempat demi gambar." },
				{ say: "Warga ikut terlihat.", body: "Pemandu, nelayan, dan pengelola setempat adalah bagian dari cerita, dan sebagian penghasilan tetap berpulang ke perajangga." },
			],
			ctaTitle: "Punya bingkai ekowisata?",
			ctaBody: "Kirim fotomu dan dapatkan 70% dari setiap lisensi.",
			contribute: "Jadi kontributor",
			browse: "Jelajahi arsip",
			unitAbove: "m dpl",
			unitBelow: "m di bawah laut",
			altimeter: "Altimeter: posisimu di garis turun",
		},
		en: {
			title: "Ecotourism, from summit to reef",
			lede: "Ecotourism means travelling in nature without leaving a scar, and letting local people share in the benefit. This page follows one descent: five ecosystems, from a mountain summit to the floor of a reef.",
			metaFrames: (n) => `${n} ${n === 1 ? "frame" : "frames"} in this zone`,
			empty: "No frames for this zone yet.",
			emptyCta: "Send the first frame",
			seeAll: "See in the archive",
			principlesTitle: "What we ask of every frame",
			principles: [
				{ say: "The location is written clearly.", body: "Readers need to know exactly what they're looking at and where, so they can look after it." },
				{ say: "Area rules are respected.", body: "No drones in restricted zones, no touching wildlife or coral, no changing a place for a picture." },
				{ say: "Local people are in the picture.", body: "Guides, fishers, and local managers are part of the story, and part of the income still goes back to the image-maker." },
			],
			ctaTitle: "Have ecotourism frames?",
			ctaBody: "Send your photos and earn 70% of every license.",
			contribute: "Become a contributor",
			browse: "Browse the archive",
			unitAbove: "m above sea level",
			unitBelow: "m below sea level",
			altimeter: "Altimeter: your position on the descent",
		},
	};

	const lang = $derived(i18n.lang);
	const t = $derived(copy[lang]);

	// ── Isi zona dari arsip ───────────────────────────────────────────────
	let byBand = $state<Record<string, { photos: Photo[]; total: number; done: boolean }>>({});

	onMount(() => {
		let alive = true;
		for (const b of BANDS) {
			byBand[b.id] = { photos: [], total: 0, done: false };
			Promise.all(b.terms.map((q) => fetchPhotos({ search: q, limit: 5 }).catch(() => ({ photos: [] as Photo[], total: 0, totalPages: 0 }))))
				.then((rs) => {
					if (!alive) return;
					const seen = new Set<string>();
					const merged: Photo[] = [];
					for (const r of rs) for (const p of r.photos) if (!seen.has(p.id)) (seen.add(p.id), merged.push(p));
					byBand[b.id] = { photos: merged.slice(0, 5), total: merged.length, done: true };
				});
		}
		return () => (alive = false);
	});

	const hrefOf = (p: Photo) => (p.assetType === "VIDEO" ? `/videos/${p.id}` : `/photos/${p.id}`);

	// ── Rute perjalanan + warna latar mengikuti posisi gulir ─────────────────
	// Satu garis menyambung dari awal sampai akhir halaman: turun di satu lajur,
	// lalu di tiap batas zona MENYEBERANG sepanjang garis pembatas ke lajur
	// seberang (ular-tangga). Kendaraan berjalan di atasnya mengikuti gulir dan
	// berganti per zona: pesawat → jip → motor → perahu → kapal → kapal selam →
	// pesawat. Geometri dihitung dari posisi nyata tiap zona (ikut ukuran layar dan
	// isi yang baru termuat), bukan angka tetap.
	//
	// Halus: garis baca TEREDAM (dikejar eksponensial, berhenti sendiri saat gulir
	// diam) dan semua pembaruan per-frame ditulis langsung ke DOM — kendaraan
	// adalah elemen HTML yang hanya digeser lewat transform (jalur GPU), bukan
	// render ulang Svelte di dalam SVG setinggi seluruh halaman.
	type Kind = "plane" | "jeep" | "bike" | "canoe" | "ferry" | "sub";
	const LANE_KIND: Kind[] = ["plane", "jeep", "bike", "canoe", "ferry", "sub", "plane"];
	type Seg =
		| { k: "line"; x0: number; y0: number; x1: number; y1: number; len: number; s0: number }
		| { k: "arc"; cx: number; cy: number; th0: number; th1: number; len: number; s0: number };

	let pageEl: HTMLElement;
	let heroEl: HTMLElement;
	let closeEl: HTMLElement;
	let vehEl: HTMLElement | undefined = $state();
	let vehIconEl: HTMLElement | undefined = $state();
	let doneEl: SVGPathElement | undefined = $state();
	let readEl: HTMLElement | undefined = $state();
	let readNumEl: HTMLElement | undefined = $state();
	let readUnitEl: HTMLElement | undefined = $state();
	let chipEl: HTMLElement | undefined = $state();
	let chipNumEl: HTMLElement | undefined = $state();
	let fxEl: HTMLElement | undefined = $state();
	let bandEls: HTMLElement[] = $state([]);

	// State reaktif hanya untuk yang JARANG berubah (jenis kendaraan, zona aktif).
	let vehKind = $state<Kind>("plane");
	let activeIdx = $state(0);
	let routeD = $state("");
	let routeLen = $state(1);
	let routeW = $state(0);
	let routeH = $state(0);
	/** Layar sempit: kendaraan lebih kecil supaya muat di lajur kiri. */
	let compact = $state(false);

	let segs: Seg[] = [];
	let wins: { Y: number; sA: number; sB: number }[] = [];
	let yStart = 0;
	let dividers: number[] = [];
	let winW = 200;
	let pageTop = 0; // posisi atas halaman ini dari puncak dokumen
	let pageBottom = 0;
	let cur = 0; // garis baca yang sudah diredam (koordinat halaman)
	let rafId = 0;
	let lastT = 0;
	let reduced = false;
	let lastKind: Kind = "plane";
	let lastNum = "";
	let lastBg = "";
	let lastSide: boolean | null = null;
	let lastOn: boolean | null = null;
	let prevS = -1;
	let trailAcc = 0;
	let movingTimer: ReturnType<typeof setTimeout> | undefined;
	let fxPool: HTMLElement[] = [];
	let fxI = 0;
	/** Jarak rute (px) antarjejak tiap kendaraan. */
	const TRAIL_GAP: Record<Kind, number> = { plane: 11, jeep: 15, bike: 13, canoe: 20, ferry: 12, sub: 14 };

	type Puff = { size: number; bg: string; border?: string; dx: number; dy: number; s0: number; s1: number; o: number; ms: number };
	/** Jejak di belakang kendaraan, sesuai medianya (awan, debu, riak, buih, gelembung). */
	function emit(kind: Kind | "arrive", x: number, y: number, a: number) {
		if (!fxEl) return;
		if (!fxPool.length) {
			for (let i = 0; i < 34; i++) {
				const el = document.createElement("span");
				el.className = "eco-p";
				fxEl.appendChild(el);
				fxPool.push(el);
			}
		}
		const rad = (a * Math.PI) / 180;
		const fx = Math.sin(rad); // arah maju
		const fy = -Math.cos(rad);
		const nx = -fy; // tegak lurus
		const ny = fx;
		const j = () => Math.random() - 0.5;
		const r = (lo: number, hi: number) => lo + Math.random() * (hi - lo);
		const soft = (rgb: string, alpha: number) => `radial-gradient(closest-side, rgba(${rgb},${alpha}), rgba(${rgb},0))`;
		const put = (def: Puff, ox: number, oy: number) => {
			const el = fxPool[fxI++ % fxPool.length]!;
			el.getAnimations().forEach((an) => an.cancel());
			el.style.width = el.style.height = `${def.size}px`;
			el.style.margin = `${-def.size / 2}px 0 0 ${-def.size / 2}px`;
			el.style.background = def.bg;
			el.style.border = def.border ?? "0";
			el.animate(
				[
					{ transform: `translate3d(${ox}px, ${oy}px, 0) scale(${def.s0})`, opacity: def.o },
					{ transform: `translate3d(${ox + def.dx}px, ${oy + def.dy}px, 0) scale(${def.s1})`, opacity: 0 },
				],
				{ duration: def.ms, easing: "ease-out", fill: "forwards" },
			);
		};
		// Titik di belakang kendaraan; sebaran acak supaya tak tampak seperti manik berderet.
		const bx = x - fx * 15;
		const by = y - fy * 15;
		if (kind === "plane") {
			// Awan jejak: lembut, melebar jauh, bergeser sedikit tertiup.
			put({ size: r(8, 12), bg: soft("255,255,255", 0.9), dx: j() * 14 + nx * j() * 8, dy: j() * 14 + ny * j() * 8, s0: 0.4, s1: r(3.2, 4.4), o: r(0.55, 0.85), ms: r(1500, 2100) }, bx + nx * j() * 3, by + ny * j() * 3);
		} else if (kind === "jeep" || kind === "bike") {
			// Debu: gumpalan tan yang membesar dan memudar, terlempar ke samping.
			const side = Math.random() < 0.5 ? -1 : 1;
			put({ size: r(9, 15), bg: soft("196,170,130", 0.7), dx: nx * side * r(8, 22) - fx * r(6, 16), dy: ny * side * r(8, 22) - fy * r(6, 16), s0: 0.45, s1: r(2.4, 3.6), o: r(0.45, 0.75), ms: r(800, 1300) }, bx + nx * j() * 8, by + ny * j() * 8);
		} else if (kind === "canoe") {
			put({ size: r(10, 14), bg: "transparent", border: "1.5px solid rgba(200,235,240,.8)", dx: nx * j() * 6, dy: ny * j() * 6, s0: 0.4, s1: r(2.8, 3.8), o: r(0.6, 0.9), ms: r(1100, 1600) }, bx + nx * j() * 4, by + ny * j() * 4);
		} else if (kind === "ferry") {
			// Buih haluan: dua lajur yang melebar membentuk huruf V.
			for (const side of [-1, 1]) put({ size: r(6, 10), bg: soft("255,255,255", 0.85), dx: nx * side * r(10, 18) - fx * r(4, 10), dy: ny * side * r(10, 18) - fy * r(4, 10), s0: 0.6, s1: r(1.8, 2.6), o: r(0.55, 0.85), ms: r(1000, 1500) }, bx + nx * side * r(3, 6), by + ny * side * r(3, 6));
		} else if (kind === "sub") {
			put({ size: r(4, 8), bg: "rgba(190,230,255,.15)", border: "1px solid rgba(190,230,255,.9)", dx: j() * 22, dy: j() * 22, s0: 0.6, s1: r(1.3, 1.9), o: r(0.6, 0.95), ms: r(1200, 1900) }, bx + j() * 10, by + j() * 10);
		} else {
			put({ size: 22, bg: "transparent", border: "2px solid var(--safelight)", dx: 0, dy: 0, s0: 0.3, s1: 3.1, o: 0.95, ms: 950 }, x, y); // "tiba" di tempat baru
		}
	}

	const fmtM = (m: number) => `${m < 0 ? "−" : ""}${Math.abs(Math.round(m)).toLocaleString(lang === "id" ? "id-ID" : "en-US")}`;
	const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
	const ease = (k: number) => k * k * (3 - 2 * k);
	const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

	/** Susun rute dari posisi nyata zona. Dipanggil saat ukuran/isi halaman berubah. */
	function buildRoute() {
		if (!pageEl || !heroEl || !closeEl || bandEls.length < BANDS.length) return;
		const W0 = pageEl.clientWidth;
		const H0 = pageEl.scrollHeight;
		const narrow = W0 < 1100;
		const edge = Math.min(46, Math.max(18, W0 * 0.028));
		const xL = narrow ? 24 : edge;
		const xR = narrow ? xL : W0 - edge;
		const lanes = [xL, xR, xL, xR, xL, xR, xL];
		const R = 26;
		pageTop = pageEl.getBoundingClientRect().top + scrollY;
		pageBottom = pageTop + H0;
		dividers = [...bandEls.map((e) => e.offsetTop), closeEl.offsetTop];
		yStart = Math.max(110, heroEl.offsetTop + 120);
		const yEnd = Math.max(yStart + 200, closeEl.offsetTop + closeEl.offsetHeight - 110);
		let gap = Infinity;
		for (let i = 0; i < dividers.length - 1; i++) gap = Math.min(gap, dividers[i + 1]! - dividers[i]!);
		winW = clamp(Math.min(320, gap * 0.4, dividers[0]! - yStart - 6), R + 4, 320);

		segs = [];
		wins = [];
		let s = 0;
		let x = lanes[0]!;
		let y = yStart;
		let d = `M${x} ${y}`;
		const line = (x1: number, y1: number) => {
			const len = Math.hypot(x1 - x, y1 - y);
			if (len > 0.01) segs.push({ k: "line", x0: x, y0: y, x1, y1, len, s0: s });
			s += len;
			d += ` L${x1.toFixed(1)} ${y1.toFixed(1)}`;
			x = x1;
			y = y1;
		};
		const arc = (cx: number, cy: number, th0: number, th1: number, ex: number, ey: number, sweep: 0 | 1) => {
			const len = R * Math.abs(th1 - th0);
			segs.push({ k: "arc", cx, cy, th0, th1, len, s0: s });
			s += len;
			d += ` A${R} ${R} 0 0 ${sweep} ${ex.toFixed(1)} ${ey.toFixed(1)}`;
			x = ex;
			y = ey;
		};

		for (let i = 0; i < dividers.length; i++) {
			const Y = dividers[i]!;
			const xn = lanes[i + 1]!;
			if (Math.abs(xn - x) < 2 * R + 2) continue; // layar sempit: satu lajur, lurus saja
			const dir = xn > x ? 1 : -1;
			line(x, Y - R);
			const sA = s - (winW - R);
			arc(x + dir * R, Y - R, dir > 0 ? Math.PI : 0, Math.PI / 2, x + dir * R, Y, dir > 0 ? 0 : 1);
			line(xn - dir * R, Y);
			arc(xn - dir * R, Y + R, -Math.PI / 2, dir > 0 ? 0 : -Math.PI, xn, Y + R, dir > 0 ? 1 : 0);
			wins.push({ Y, sA, sB: s + (winW - R) });
		}
		line(x, yEnd);

		routeD = d;
		routeLen = Math.max(1, s);
		routeW = W0;
		routeH = H0;
		compact = narrow;
	}

	/** Panjang rute yang ditempuh kendaraan bila garis baca ada di y (koordinat halaman). */
	function sOf(ly: number): number {
		const total = routeLen;
		if (!wins.length) return clamp(ly - yStart, 0, total);
		const first = wins[0]!;
		if (ly <= first.Y - winW) return clamp(ly - yStart, 0, total);
		for (let i = 0; i < wins.length; i++) {
			const w = wins[i]!;
			if (ly >= w.Y - winW && ly <= w.Y + winW) {
				const u = (ly - (w.Y - winW)) / (2 * winW);
				return lerp(w.sA, w.sB, u);
			}
			const nextStart = i + 1 < wins.length ? wins[i + 1]!.Y - winW : Infinity;
			if (ly < nextStart) return clamp(w.sB + (ly - (w.Y + winW)), 0, total);
		}
		return total;
	}

	/** Titik + arah (derajat searah jarum jam dari "atas") pada panjang rute s. */
	function pointAt(s: number): { x: number; y: number; a: number } {
		const sc = clamp(s, 0, routeLen);
		let seg = segs[segs.length - 1];
		for (const g of segs) {
			if (sc <= g.s0 + g.len) {
				seg = g;
				break;
			}
		}
		if (!seg) return { x: 0, y: 0, a: 180 };
		const t = seg.len > 0 ? clamp((sc - seg.s0) / seg.len, 0, 1) : 0;
		if (seg.k === "line") {
			return {
				x: lerp(seg.x0, seg.x1, t),
				y: lerp(seg.y0, seg.y1, t),
				a: (Math.atan2(seg.x1 - seg.x0, -(seg.y1 - seg.y0)) * 180) / Math.PI,
			};
		}
		const th = lerp(seg.th0, seg.th1, t);
		const R = Math.abs(seg.len / (seg.th1 - seg.th0));
		const dth = seg.th1 - seg.th0;
		return {
			x: seg.cx + R * Math.cos(th),
			y: seg.cy + R * Math.sin(th),
			a: (Math.atan2(-Math.sin(th) * dth, -(Math.cos(th) * dth)) * 180) / Math.PI,
		};
	}

	/** Tulis semua yang tampak untuk garis baca `ly` — langsung ke DOM, tanpa render ulang. */
	function apply(ly: number) {
		if (!segs.length || !vehEl) return;
		// ── zona aktif, ketinggian, warna latar (dari posisi nyata zona; tanpa baca layout)
		let i = 0;
		let u = 0;
		const top0 = dividers[0]!;
		const bottomN = dividers[BANDS.length]!;
		if (ly <= top0) {
			i = 0;
			u = 0;
		} else if (ly >= bottomN) {
			i = BANDS.length - 1;
			u = 1;
		} else {
			for (let k = 0; k < BANDS.length; k++) {
				if (ly >= dividers[k]! && ly < dividers[k + 1]!) {
					i = k;
					u = (ly - dividers[k]!) / (dividers[k + 1]! - dividers[k]!);
					break;
				}
			}
		}
		const b = BANDS[i]!;
		const elev = lerp(b.from, b.to, u);
		if (i !== activeIdx) activeIdx = i;
		const nx = BANDS[Math.min(i + 1, BANDS.length - 1)]!;
		const kk = reduced ? 0 : ease(u);
		const bg = `rgb(${[0, 1, 2].map((j) => Math.round(lerp(b.tone[j]!, nx.tone[j]!, kk))).join(", ")})`;
		if (bg !== lastBg) {
			lastBg = bg;
			pageEl.style.setProperty("--eco-bg", bg);
		}
		const num = fmtM(elev);
		if (num !== lastNum) {
			lastNum = num;
			if (readNumEl) readNumEl.textContent = num;
			if (chipNumEl) chipNumEl.textContent = num;
			if (readUnitEl) readUnitEl.textContent = elev < 0 ? "m" : "m dpl";
		}

		// ── kendaraan di rute
		const s = sOf(ly);
		const p = pointAt(s);
		vehEl.style.transform = `translate3d(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px, 0)`;
		if (vehIconEl) vehIconEl.style.transform = `rotate(${p.a.toFixed(1)}deg)`;
		doneEl?.setAttribute("stroke-dashoffset", (routeLen - s).toFixed(1));
		let lane = 0;
		for (const Y of dividers) if (ly >= Y) lane++;
		const kind = LANE_KIND[lane] ?? "plane";
		const ds = prevS < 0 ? 0 : Math.abs(s - prevS);
		prevS = s;
		if (ds > 0.15) {
			vehEl.classList.add("is-moving");
			clearTimeout(movingTimer);
			movingTimer = setTimeout(() => vehEl?.classList.remove("is-moving"), 260);
		}
		if (kind !== lastKind) {
			lastKind = kind;
			vehKind = kind;
			if (!reduced) emit("arrive", p.x, p.y, p.a);
		}
		if (!reduced && ds > 0 && lastOn !== false) {
			trailAcc += ds;
			const gap = TRAIL_GAP[kind];
			let n = 0;
			while (trailAcc >= gap && n < 2) {
				trailAcc -= gap;
				n++;
				emit(kind, p.x, p.y, p.a);
			}
			if (trailAcc > gap * 3) trailAcc = 0;
		}
		if (readEl) {
			const left = p.x > routeW / 2;
			readEl.style.transform = `translate3d(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px, 0)`;
			if (left !== lastSide) {
				lastSide = left;
				readEl.classList.toggle("is-left", left);
			}
		}
		// Pembacaan & chip disembunyikan begitu halaman ini tak lagi mengisi layar.
		const on = scrollY + innerHeight * 0.92 < pageBottom;
		if (on !== lastOn) {
			lastOn = on;
			readEl?.classList.toggle("is-off", !on);
			chipEl?.classList.toggle("is-off", !on);
		}
	}

	/** Garis baca TARGET (koordinat halaman): 45% tinggi layar dari atas. */
	const targetLine = () => scrollY + innerHeight * 0.45 - pageTop;

	function frame(now: number) {
		rafId = 0;
		const dt = Math.min(64, now - lastT || 16);
		lastT = now;
		const t = targetLine();
		// Eksponensial, tak bergantung laju frame: ±95 ms konstanta waktu.
		cur += (t - cur) * (reduced ? 1 : 1 - Math.exp(-dt / 95));
		if (Math.abs(t - cur) < 0.3) cur = t;
		apply(cur);
		if (cur !== t) rafId = requestAnimationFrame(frame);
	}
	/** Mulai (atau lanjutkan) loop; berhenti sendiri saat posisi sudah menyusul. */
	function kick() {
		if (rafId) return;
		lastT = performance.now();
		rafId = requestAnimationFrame(frame);
	}

	onMount(() => {
		reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
		// Susun ulang rute bila ukuran halaman berubah (resize, foto selesai dimuat).
		let rebuild = 0;
		const ro = new ResizeObserver(() => {
			cancelAnimationFrame(rebuild);
			rebuild = requestAnimationFrame(() => {
				buildRoute();
				cur = targetLine();
				apply(cur);
				kick();
			});
		});
		ro.observe(pageEl);
		buildRoute();
		cur = targetLine();
		// Elemen kendaraan baru ada setelah routeD terisi dan DOM diperbarui.
		requestAnimationFrame(() => apply(cur));
		const onScroll = () => kick();
		addEventListener("scroll", onScroll, { passive: true });
		addEventListener("resize", onScroll, { passive: true });
		return () => {
			removeEventListener("scroll", onScroll);
			removeEventListener("resize", onScroll);
			ro.disconnect();
			cancelAnimationFrame(rafId);
			cancelAnimationFrame(rebuild);
		};
	});

	const unit = (m: number) => (m < 0 ? t.unitBelow : t.unitAbove);
	const total = $derived(Object.values(byBand).reduce((n, b) => n + b.total, 0));
</script>

{#snippet vehicle(kind: Kind)}
	<!-- Tampak atas, moncong ke atas (diputar mengikuti arah jalan). -->
	{#if kind === "plane"}
		<path d="M12 1.5c.8 0 1.4.9 1.5 2.6l.2 4.4 8.3 4.8v2.2l-8.4-2.5.1 4.6 2.4 2v1.6L12 20.4l-3.1.8v-1.6l2.4-2 .1-4.6-8.4 2.5v-2.2l8.3-4.8.2-4.4c.1-1.7.7-2.6 1.5-2.6z" />
	{:else if kind === "jeep"}
		<rect x="6.6" y="2.4" width="10.8" height="19.2" rx="3.4" />
		<rect x="8.2" y="6" width="7.6" height="3.8" rx="1" class="eco-veh-cut" />
		<rect x="8.2" y="12" width="7.6" height="6.4" rx="1.2" class="eco-veh-cut" />
		<rect x="4.9" y="4.6" width="2" height="4" rx=".8" /><rect x="17.1" y="4.6" width="2" height="4" rx=".8" />
		<rect x="4.9" y="15" width="2" height="4" rx=".8" /><rect x="17.1" y="15" width="2" height="4" rx=".8" />
	{:else if kind === "bike"}
		<ellipse cx="12" cy="4.4" rx="1.5" ry="2.8" />
		<ellipse cx="12" cy="19.6" rx="1.5" ry="2.8" />
		<rect x="10.5" y="6.2" width="3" height="11.6" rx="1.5" />
		<rect x="6.2" y="6.8" width="11.6" height="1.7" rx=".85" />
		<circle cx="12" cy="13.2" r="2.4" class="eco-veh-cut" />
	{:else if kind === "canoe"}
		<path d="M12 1.8C15.7 6 16.5 14 14.7 22.2H9.3C7.5 14 8.3 6 12 1.8z" />
		<path d="M12 6.5V19" class="eco-veh-stroke" />
		<g class="eco-paddle"><path d="M6.6 12.5h10.8" class="eco-veh-stroke" /><rect x="5" y="11.6" width="2.6" height="1.8" rx=".8" /><rect x="16.4" y="11.6" width="2.6" height="1.8" rx=".8" /></g>
	{:else if kind === "ferry"}
		<path d="M12 1.2l5.2 7.3V21.2c-3.4 1.5-7 1.5-10.4 0V8.5z" />
		<rect x="8.4" y="11" width="7.2" height="6.2" rx="1.1" class="eco-veh-cut" />
		<g class="eco-radar"><path d="M12 8.6V5.4" class="eco-veh-stroke" /></g>
	{:else}
		<ellipse cx="12" cy="12" rx="4.1" ry="9.8" />
		<rect x="10.5" y="9" width="3" height="4.6" rx="1.2" class="eco-veh-cut" />
		<rect x="8" y="21.2" width="8" height="1.1" rx=".5" class="eco-prop" />
	{/if}
{/snippet}

{#snippet contour(kind: Band["id"])}
	<svg class="eco-contour" viewBox="0 0 400 300" fill="none" stroke="currentColor" stroke-width="1" aria-hidden="true">
		{#if kind === "mountain"}
			{#each [0, 1, 2, 3, 4, 5, 6] as k}
				<ellipse cx="210" cy="150" rx={30 + k * 26} ry={16 + k * 17} transform={`rotate(${-14 + k * 3} 210 150)`} />
			{/each}
		{:else if kind === "forest"}
			{#each [[60,70,26],[140,50,34],[230,80,28],[320,60,36],[90,150,32],[190,140,40],[290,160,30],[360,140,24],[50,230,28],[150,240,34],[250,230,30],[340,240,38]] as c}
				<circle cx={c[0]} cy={c[1]} r={c[2]} />
				<circle cx={c[0]} cy={c[1]} r={(c[2] ?? 0) * 0.55} />
			{/each}
		{:else if kind === "water"}
			{#each [0, 1, 2, 3, 4, 5, 6, 7] as k}
				<path d={`M0 ${40 + k * 32} C 70 ${22 + k * 32}, 130 ${58 + k * 32}, 200 ${40 + k * 32} S 330 ${24 + k * 32}, 400 ${40 + k * 32}`} />
			{/each}
		{:else if kind === "coast"}
			{#each [0, 1, 2, 3, 4] as k}
				<path d={`M0 ${70 + k * 22} C 80 ${40 + k * 22}, 130 ${100 + k * 22}, 210 ${64 + k * 22} S 340 ${50 + k * 22}, 400 ${80 + k * 22}`} />
			{/each}
			<path d="M0 230 C 90 205, 150 250, 240 222 S 360 210, 400 226 L400 300 L0 300 Z" />
		{:else}
			{#each [0, 1, 2, 3, 4, 5] as row}
				{#each [0, 1, 2, 3, 4, 5, 6, 7, 8] as col}
					<path d={`M${col * 48 + (row % 2) * 24} ${50 + row * 40} a 24 24 0 0 1 48 0`} />
				{/each}
			{/each}
		{/if}
	</svg>
{/snippet}

<div bind:this={pageEl} class="eco" style="--eco-bg: rgb(20, 27, 40)">
	<!-- Rute perjalanan: satu garis menyambung dari awal sampai akhir; kendaraan
		berjalan di atasnya mengikuti gulir. Dekoratif — informasinya (zona dan
		ketinggian) sudah ada di teks. -->
	{#if routeD}
		<svg class="eco-route" width={routeW} height={routeH} viewBox={`0 0 ${routeW} ${routeH}`} aria-hidden="true">
			<path d={routeD} class="eco-route-base" />
			<path bind:this={doneEl} d={routeD} class="eco-route-done" stroke-dasharray={routeLen} stroke-dashoffset={routeLen} />
		</svg>
		<div bind:this={fxEl} class="eco-fx" aria-hidden="true"></div>
		<div bind:this={vehEl} class="eco-veh" class:is-compact={compact} aria-hidden="true">
			<span class="eco-veh-shadow" data-kind={vehKind}></span>
			<span class="eco-veh-halo"></span>
			<div bind:this={vehIconEl} class="eco-veh-rot">
				<div class="eco-veh-bob" data-kind={vehKind}>
					{#key vehKind}
						<svg class="eco-veh-icon" viewBox="0 0 24 24">{@render vehicle(vehKind)}</svg>
					{/key}
				</div>
			</div>
		</div>
		<p bind:this={readEl} class="eco-read" aria-hidden="true">
			<span class="eco-read-in">
				<span bind:this={readNumEl} class="eco-alt-num">3,200</span>
				<span bind:this={readUnitEl} class="eco-alt-unit">m dpl</span>
			</span>
		</p>
	{/if}
	<p bind:this={chipEl} class="eco-chip" aria-hidden="true">
		<span bind:this={chipNumEl} class="eco-alt-num">3,200</span> <span class="eco-alt-unit">m</span>
		<span class="eco-chip-band">{BANDS[activeIdx]!.name[lang]}</span>
	</p>

	<header bind:this={heroEl} class="eco-hero">
		<h1 class="eco-title">{t.title}</h1>
		<p class="eco-lede">{t.lede}</p>
	</header>

	{#each BANDS as b, i (b.id)}
		{@const d = byBand[b.id]}
		<section bind:this={bandEls[i]} class="eco-band" aria-labelledby={`eco-${b.id}`}>
			<div class="eco-band-bg">{@render contour(b.id)}</div>
			<div class="eco-band-head">
				<h2 id={`eco-${b.id}`} class="eco-band-name">{b.name[lang]}</h2>
				<p class="eco-band-range">{fmtM(b.from)} → {fmtM(b.to)} m</p>
				<p class="eco-band-note">{b.note[lang]}</p>
			</div>

			{#if d && d.photos.length}
				<div class="eco-frames" class:is-few={d.photos.length < 3}>
					{#each d.photos as p, k (p.id)}
						<a href={hrefOf(p)} class={`eco-frame ${k === 0 ? "is-lead" : ""}`}>
							<span class="eco-frame-img">
								<ApiImage
									src={imgFor(p.seed, k === 0 ? 1200 : 700, k === 0 ? 800 : 700, p.thumbUrl)}
									alt={p.title[lang]}
									fill
									class="object-cover"
								/>
							</span>
							<span class="eco-frame-cap">
								<span class="eco-frame-title">{p.title[lang]}</span>
								{#if p.location}<span class="eco-frame-loc">{p.location}</span>{/if}
							</span>
						</a>
					{/each}
				</div>
				<a href={`/photos?q=${encodeURIComponent(b.terms[0] ?? "")}`} class="eco-link">{t.seeAll}</a>
			{:else if d?.done}
				<div class="eco-empty">
					<p>{t.empty}</p>
					<a href="/contributor" class="eco-link">{t.emptyCta}</a>
				</div>
			{/if}
		</section>
	{/each}

	<section bind:this={closeEl} class="eco-close">
		<h2 class="eco-close-title">{t.principlesTitle}</h2>
		<ul class="eco-principles">
			{#each t.principles as p (p.say)}
				<li>
					<p class="eco-p-say">{p.say}</p>
					<p class="eco-p-body">{p.body}</p>
				</li>
			{/each}
		</ul>
		<div class="eco-cta">
			<div>
				<h3 class="eco-cta-title">{t.ctaTitle}</h3>
				<p class="eco-cta-body">{t.ctaBody}</p>
			</div>
			<div class="eco-cta-actions">
				<a href="/contributor" class="eco-btn eco-btn--solid">{t.contribute}</a>
				<a href="/photos" class="eco-btn">{t.browse}</a>
			</div>
		</div>
	</section>
</div>

<style>
	.eco {
		--eco-line: rgba(241, 239, 233, 0.16);
		position: relative;
		min-height: 100vh;
		background: var(--eco-bg);
		color: var(--fg, #f1efe9);
		padding-bottom: 6rem;
		overflow-x: clip;
	}
	.eco-hero,
	.eco-band,
	.eco-close {
		max-width: 1180px;
		margin-inline: auto;
		padding-inline: clamp(1.25rem, 4vw, 4rem);
	}
	/* Lajur rute: kiri dan kanan di desktop, hanya kiri di layar sempit. */
	@media (max-width: 1099px) {
		.eco-hero,
		.eco-band,
		.eco-close {
			padding-left: 3.4rem;
		}
	}
	@media (min-width: 1100px) {
		.eco-hero,
		.eco-band,
		.eco-close {
			padding-left: clamp(5.5rem, 8vw, 8rem);
			padding-right: clamp(5.5rem, 7vw, 7.5rem);
			max-width: 1400px;
		}
	}
	.eco-hero {
		padding-top: calc(var(--banner-h, 0px) + var(--nav-h) + clamp(3rem, 9vh, 7rem));
		padding-bottom: clamp(4rem, 12vh, 9rem);
	}
	.eco-title {
		max-width: 14ch;
		font-family: var(--font-display);
		font-size: clamp(2.8rem, 7.6vw, 6.4rem);
		font-weight: 300;
		line-height: 0.98;
		letter-spacing: -0.03em;
	}
	.eco-lede {
		max-width: 54ch;
		margin-top: 1.8rem;
		font-size: clamp(1rem, 1.3vw, 1.18rem);
		line-height: 1.7;
		color: color-mix(in srgb, var(--fg, #f1efe9) 72%, transparent);
	}

	/* ── Zona ─────────────────────────────────────────────────────────── */
	.eco-band {
		position: relative;
		padding-top: clamp(4rem, 10vh, 7rem);
		padding-bottom: clamp(4rem, 10vh, 7rem);
		border-top: 1px solid var(--eco-line);
	}
	.eco-band-bg {
		position: absolute;
		inset: 0;
		display: flex;
		justify-content: flex-end;
		align-items: flex-start;
		overflow: hidden;
		color: rgba(241, 239, 233, 0.11);
		pointer-events: none;
	}
	.eco-contour {
		width: min(52vw, 640px);
		margin-top: clamp(2rem, 6vh, 4rem);
	}
	.eco-band-head {
		position: relative;
		max-width: 46ch;
	}
	.eco-band-name {
		font-family: var(--font-display);
		font-size: clamp(2.2rem, 5vw, 4.4rem);
		font-weight: 300;
		line-height: 1.02;
		letter-spacing: -0.025em;
	}
	.eco-band-range {
		margin-top: 0.9rem;
		font-variant-numeric: tabular-nums;
		font-size: 0.95rem;
		color: color-mix(in srgb, var(--fg, #f1efe9) 60%, transparent);
	}
	.eco-band-note {
		margin-top: 1.2rem;
		font-size: 1.02rem;
		line-height: 1.7;
		color: color-mix(in srgb, var(--fg, #f1efe9) 78%, transparent);
	}

	/* ── Bingkai ─────────────────────────────────────────────────────── */
	.eco-frames {
		position: relative;
		display: grid;
		grid-template-columns: repeat(12, 1fr);
		gap: clamp(0.75rem, 1.6vw, 1.5rem);
		margin-top: clamp(2.5rem, 6vh, 4rem);
	}
	.eco-frame {
		grid-column: span 6;
		display: block;
		color: inherit;
		text-decoration: none;
	}
	.eco-frame.is-lead {
		grid-column: span 12;
	}
	@media (min-width: 900px) {
		.eco-frame {
			grid-column: span 3;
		}
		.eco-frame.is-lead {
			grid-column: span 6;
			grid-row: span 2;
		}
		.eco-frames.is-few .eco-frame {
			grid-column: span 4;
		}
		.eco-frames.is-few .eco-frame.is-lead {
			grid-column: span 8;
			grid-row: auto;
		}
	}
	.eco-frame-img {
		position: relative;
		display: block;
		aspect-ratio: 4 / 3;
		overflow: hidden;
		background: rgba(241, 239, 233, 0.06);
	}
	.eco-frame.is-lead .eco-frame-img {
		aspect-ratio: 3 / 2;
	}
	.eco-frame-cap {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
		padding-top: 0.7rem;
	}
	.eco-frame-title {
		font-size: 0.95rem;
		line-height: 1.35;
	}
	.eco-frame-loc {
		font-size: 0.82rem;
		color: color-mix(in srgb, var(--fg, #f1efe9) 58%, transparent);
	}
	.eco-frame:hover .eco-frame-title,
	.eco-frame:focus-visible .eco-frame-title {
		color: var(--safelight);
	}
	.eco-frame:focus-visible {
		outline: 2px solid var(--safelight);
		outline-offset: 4px;
	}
	.eco-link {
		position: relative;
		display: inline-block;
		margin-top: 1.8rem;
		font-size: 0.95rem;
		color: var(--fg, #f1efe9);
		text-decoration: underline;
		text-decoration-color: color-mix(in srgb, var(--fg, #f1efe9) 30%, transparent);
		text-underline-offset: 0.35em;
	}
	.eco-link:hover,
	.eco-link:focus-visible {
		color: var(--safelight);
		text-decoration-color: var(--safelight);
	}
	.eco-empty {
		position: relative;
		margin-top: clamp(2rem, 5vh, 3rem);
		max-width: 46ch;
		font-size: 0.98rem;
		color: color-mix(in srgb, var(--fg, #f1efe9) 66%, transparent);
	}

	/* ── Penutup ─────────────────────────────────────────────────────── */
	.eco-close {
		padding-top: clamp(4rem, 10vh, 7rem);
		border-top: 1px solid var(--eco-line);
	}
	.eco-close-title {
		max-width: 24ch;
		font-family: var(--font-display);
		font-size: clamp(1.8rem, 3.6vw, 3rem);
		font-weight: 300;
		line-height: 1.1;
		letter-spacing: -0.02em;
	}
	.eco-principles {
		display: grid;
		gap: 2rem;
		margin-top: clamp(2rem, 5vh, 3.5rem);
		list-style: none;
		padding: 0;
	}
	@media (min-width: 900px) {
		.eco-principles {
			grid-template-columns: repeat(3, 1fr);
			gap: clamp(1.5rem, 3vw, 3rem);
		}
	}
	.eco-p-say {
		font-size: 1.05rem;
		font-weight: 500;
		line-height: 1.4;
	}
	.eco-p-body {
		margin-top: 0.5rem;
		font-size: 0.95rem;
		line-height: 1.65;
		color: color-mix(in srgb, var(--fg, #f1efe9) 68%, transparent);
	}
	.eco-cta {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-end;
		justify-content: space-between;
		gap: 1.5rem;
		margin-top: clamp(3rem, 8vh, 5rem);
		padding-top: 2rem;
		border-top: 1px solid var(--eco-line);
	}
	.eco-cta-title {
		font-family: var(--font-display);
		font-size: clamp(1.5rem, 2.8vw, 2.2rem);
		font-weight: 300;
	}
	.eco-cta-body {
		margin-top: 0.4rem;
		color: color-mix(in srgb, var(--fg, #f1efe9) 68%, transparent);
	}
	.eco-cta-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.8rem;
	}
	.eco-btn {
		display: inline-flex;
		align-items: center;
		min-height: 48px;
		padding: 0 1.5rem;
		border: 1px solid var(--eco-line);
		border-radius: 999px;
		font-size: 0.95rem;
		color: var(--fg, #f1efe9);
		text-decoration: none;
		transition: border-color 0.2s ease, color 0.2s ease, background 0.2s ease;
	}
	.eco-btn:hover,
	.eco-btn:focus-visible {
		border-color: var(--safelight);
		color: var(--safelight);
	}
	.eco-btn--solid {
		background: var(--safelight);
		border-color: var(--safelight);
		color: #fff;
	}
	.eco-btn--solid:hover,
	.eco-btn--solid:focus-visible {
		background: var(--safelight-lamp, var(--safelight));
		color: #fff;
	}

	/* ── Rute perjalanan ──────────────────────────────────────────────── */
	.eco-route {
		position: absolute;
		left: 0;
		top: 0;
		z-index: 2;
		pointer-events: none;
		overflow: visible;
	}
	.eco-route-base {
		fill: none;
		stroke: color-mix(in srgb, var(--fg, #f1efe9) 24%, transparent);
		stroke-width: 1.5;
		stroke-dasharray: 2 7;
		stroke-linecap: round;
	}
	.eco-route-done {
		fill: none;
		stroke: var(--safelight);
		stroke-width: 2.4;
		stroke-linecap: round;
	}
	/* Kendaraan = elemen HTML yang hanya digeser (translate3d) — jalur compositor. */
	.eco-veh {
		position: absolute;
		left: 0;
		top: 0;
		width: 0;
		height: 0;
		z-index: 3;
		pointer-events: none;
		will-change: transform;
	}
	.eco-veh-halo {
		position: absolute;
		left: -27px;
		top: -27px;
		width: 54px;
		height: 54px;
		border-radius: 50%;
		background: color-mix(in srgb, var(--safelight) 26%, transparent);
	}
	.eco-veh-rot {
		position: absolute;
		left: -19.2px;
		top: -19.2px;
		width: 38.4px;
		height: 38.4px;
		will-change: transform;
	}
	.eco-veh.is-compact .eco-veh-halo {
		left: -19px;
		top: -19px;
		width: 38px;
		height: 38px;
	}
	.eco-veh.is-compact .eco-veh-rot {
		left: -13.2px;
		top: -13.2px;
		width: 26.4px;
		height: 26.4px;
	}
	.eco-veh-icon {
		display: block;
		width: 100%;
		height: 100%;
		fill: var(--fg, #f1efe9);
		transform-origin: center;
		animation: eco-pop 0.28s ease-out both;
	}
	/* Bayangan: jauh & samar untuk pesawat (terbang tinggi), dekat untuk yang lain. */
	.eco-veh-shadow {
		position: absolute;
		left: -14px;
		top: -14px;
		width: 28px;
		height: 28px;
		border-radius: 50%;
		background: radial-gradient(closest-side, rgba(0, 0, 0, 0.5), transparent);
		transform: translate(6px, 8px);
	}
	.eco-veh-shadow[data-kind="plane"] {
		transform: translate(16px, 24px) scale(0.8);
		opacity: 0.55;
	}
	.eco-veh.is-compact .eco-veh-shadow {
		transform: translate(4px, 6px) scale(0.75);
	}
	/* Halo bernapas pelan: kendaraan terasa hidup bahkan saat gulir diam. */
	.eco-veh-halo {
		animation: eco-breathe 2.6s ease-in-out infinite;
	}
	@keyframes eco-breathe {
		0%, 100% { transform: scale(1); }
		50% { transform: scale(1.14); }
	}
	/* Gerak khas tiap kendaraan (pembungkus CSS di dalam yang diputar JS). */
	.eco-veh-bob {
		width: 100%;
		height: 100%;
	}
	.eco-veh-bob[data-kind="plane"] {
		animation: eco-fly 3.2s ease-in-out infinite;
	}
	.eco-veh-bob[data-kind="jeep"] {
		animation: eco-idle 0.5s linear infinite;
	}
	.eco-veh-bob[data-kind="bike"] {
		animation: eco-idle 0.5s linear infinite;
	}
	.eco-veh-bob[data-kind="canoe"] {
		animation: eco-rock 2.6s ease-in-out infinite;
	}
	.eco-veh-bob[data-kind="ferry"] {
		animation: eco-rock-lite 3.4s ease-in-out infinite;
	}
	.eco-veh-bob[data-kind="sub"] {
		animation: eco-fly 2.6s ease-in-out infinite;
	}
	.eco-veh:global(.is-moving) .eco-veh-bob[data-kind="jeep"] {
		animation: eco-jolt 0.2s linear infinite;
	}
	.eco-veh:global(.is-moving) .eco-veh-bob[data-kind="bike"] {
		animation: eco-weave 0.6s ease-in-out infinite;
	}
	@keyframes eco-fly {
		0%, 100% { transform: scale(1) rotate(-1.4deg); }
		50% { transform: scale(1.06) rotate(1.4deg); }
	}
	@keyframes eco-idle {
		0%, 100% { transform: translate(0, 0); }
		50% { transform: translate(0.3px, 0.2px); }
	}
	@keyframes eco-jolt {
		0% { transform: translate(0, 0); }
		25% { transform: translate(0.7px, -0.5px); }
		50% { transform: translate(-0.6px, 0.4px); }
		75% { transform: translate(0.5px, 0.6px); }
		100% { transform: translate(0, 0); }
	}
	@keyframes eco-weave {
		0%, 100% { transform: rotate(-3.2deg); }
		50% { transform: rotate(3.2deg); }
	}
	@keyframes eco-rock {
		0%, 100% { transform: rotate(-2.4deg) translateX(-0.4px); }
		50% { transform: rotate(2.4deg) translateX(0.4px); }
	}
	@keyframes eco-rock-lite {
		0%, 100% { transform: rotate(-1deg); }
		50% { transform: rotate(1deg); }
	}
	/* Bagian bergerak di dalam ikon. */
	.eco-paddle,
	.eco-radar,
	.eco-prop {
		transform-box: fill-box;
		transform-origin: center;
	}
	.eco-paddle {
		animation: eco-stroke 1.15s ease-in-out infinite;
	}
	@keyframes eco-stroke {
		0%, 100% { transform: rotate(-20deg); }
		50% { transform: rotate(20deg); }
	}
	.eco-radar {
		transform-origin: 12px 8.6px;
		transform-box: view-box;
		animation: eco-sweep 2.2s linear infinite;
	}
	@keyframes eco-sweep {
		to { transform: rotate(360deg); }
	}
	.eco-prop {
		animation: eco-spin 0.14s linear infinite;
	}
	@keyframes eco-spin {
		0%, 100% { transform: scaleX(1); }
		50% { transform: scaleX(0.25); }
	}
	/* Lapisan jejak (partikel dibuat lewat JS, makanya :global). */
	.eco-fx {
		position: absolute;
		left: 0;
		top: 0;
		width: 0;
		height: 0;
		z-index: 2;
		pointer-events: none;
	}
	.eco :global(.eco-p) {
		position: absolute;
		left: 0;
		top: 0;
		border-radius: 50%;
		opacity: 0;
		pointer-events: none;
		will-change: transform, opacity;
	}
	@media (prefers-reduced-motion: reduce) {
		.eco-veh-halo,
		.eco-veh-bob,
		.eco-paddle,
		.eco-radar,
		.eco-prop {
			animation: none !important;
		}
	}
	.eco-veh-cut {
		fill: color-mix(in srgb, var(--eco-bg) 85%, black);
	}
	.eco-veh-stroke {
		fill: none;
		stroke: color-mix(in srgb, var(--eco-bg) 85%, black);
		stroke-width: 1.1;
		stroke-linecap: round;
	}
	@keyframes eco-pop {
		from {
			opacity: 0;
			transform: scale(0.55);
		}
		to {
			opacity: 1;
			transform: scale(1);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.eco-veh-icon {
			animation: none;
		}
	}

	/* Pembacaan ketinggian menempel di kendaraan (desktop); layar sempit memakai chip. */
	.eco-read {
		position: absolute;
		left: 0;
		top: 0;
		width: 0;
		height: 0;
		z-index: 3;
		display: none;
		pointer-events: none;
		will-change: transform;
		transition: opacity 0.25s ease;
	}
	.eco-read-in {
		position: absolute;
		left: 40px;
		top: 0;
		display: flex;
		flex-direction: column;
		line-height: 1.12;
		white-space: nowrap;
		transform: translateY(-50%);
	}
	.eco-read:global(.is-left) .eco-read-in {
		left: auto;
		right: 40px;
		align-items: flex-end;
		text-align: right;
	}
	.eco-read:global(.is-off),
	.eco-chip:global(.is-off) {
		opacity: 0;
	}
	.eco-alt-num {
		font-family: var(--font-display);
		font-size: 1.2rem;
		font-weight: 300;
		font-variant-numeric: tabular-nums;
		letter-spacing: -0.01em;
		text-shadow: 0 0 10px var(--eco-bg), 0 0 4px var(--eco-bg);
	}
	.eco-alt-unit {
		font-size: 0.72rem;
		color: color-mix(in srgb, var(--fg, #f1efe9) 58%, transparent);
		text-shadow: 0 0 8px var(--eco-bg);
	}
	/* Layar sempit: chip kecil di bawah navbar (kiri-bawah dipakai tombol ke atas). */
	.eco-chip {
		position: fixed;
		z-index: 20;
		right: 1rem;
		top: calc(var(--banner-h, 0px) + var(--nav-h) + 0.6rem);
		display: flex;
		align-items: baseline;
		gap: 0.35rem;
		padding: 0.45rem 0.9rem;
		border: 1px solid var(--eco-line);
		border-radius: 999px;
		background: color-mix(in srgb, var(--eco-bg) 82%, black);
		pointer-events: none;
		transition: opacity 0.25s ease;
	}
	.eco-chip .eco-alt-num {
		font-size: 1.05rem;
		text-shadow: none;
	}
	.eco-chip-band {
		margin-left: 0.4rem;
		font-size: 0.78rem;
		color: color-mix(in srgb, var(--fg, #f1efe9) 62%, transparent);
	}
	@media (min-width: 1100px) {
		.eco-read {
			display: block;
		}
		.eco-chip {
			display: none;
		}
	}
</style>
