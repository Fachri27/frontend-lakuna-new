<script lang="ts">
	import gsap from "gsap";
	import { ScrollTrigger } from "gsap/ScrollTrigger";
	import { ScrollToPlugin } from "gsap/ScrollToPlugin";
	import { getLenis } from "$lib/lenis";
	import { calmRefresh } from "$lib/scrollCalm";
	import { i18n } from "$lib/i18n.svelte";
	import { fetchMapHotspots } from "$lib/data";
	import { scrambleHover } from "$lib/scramble";
	import IndonesiaMap from "./IndonesiaMap.svelte";

	gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);

	/**
	 * MapDescent — SATU section untuk seluruh adegan peta, tanpa jeda.
	 *
	 * Bumi dan peta adalah SATU kanvas: IndonesiaMap (MapLibre, proyeksi
	 * globe). Di hero kameranya jauh — bumi utuh, rendah di layar, judul dan
	 * bintang di belakangnya. Gulir ke bawah MEMICU penyelaman berbasis
	 * waktu: kamera turun ke bingkai Nusantara; gulir ke atas dari peta
	 * membawanya kembali. Tak ada komponen kedua yang disilangkan, jadi tak
	 * ada kedip atau kesan pindah halaman. Selama transisi input gulir ditelan
	 * dan posisi gulir dibawa ke ujung track, jadi geraknya selalu utuh.
	 *
	 * Interaksi peta aktif setelah mendarat; penanda pop dipicu event
	 * `lakuna:map-shown` yang didengar IndonesiaMap.
	 */

	const copy = {
		id: {
			eyebrow: "Mulai menjelajah",
			title: "Nusantara",
			sub: "Setiap titik merupakan potret dari koleksi Lakunastock. Menangkap berbagai peristiwa penting",
			frames: "Bingkai",
			points: "Titik",
			land: "Mendarat",
		},
		en: {
			eyebrow: "Start exploring",
			title: "Nusantara",
			sub: "Each point is a frame from the Lakunastock archive. Deep dive the hidden depths",
			frames: "Frames",
			points: "Points",
			land: "Landing",
		},
	};

	const lang = $derived(i18n.lang);
	const t = $derived(copy[lang]);

	// Override CMS (section `anjungan_1`): header adegan peta bisa diganti dari
	// dashboard; kosong = kamus bawaan.
	let {
		eyebrow = null,
		title = null,
		sub = null,
	}: {
		eyebrow?: string | null;
		title?: string | null;
		sub?: string | null;
	} = $props();

	let wrapEl = $state<HTMLElement>();
	let stageEl = $state<HTMLDivElement>();
	let overlayEl = $state<HTMLDivElement>();
	let mapLayer = $state<HTMLDivElement>();
	let starsFarEl = $state<HTMLDivElement>();
	let starsNearEl = $state<HTMLDivElement>();
	let reduced = $state(false);
	let points = $state(0);
	let frames = $state(0);
	let spin = $state(true);
	let landed = false;
	// Peta MapLibre (proyeksi globe) yang SEKALIGUS jadi globe hero; kamera
	// digerakkan lewat API-nya — satu kanvas dari bumi utuh sampai Nusantara.
	let mapRef = $state<{
		dive: (ms: number) => void;
		rise: (ms: number) => void;
		landed: () => void;
		setSpin: (on: boolean) => void;
		setPointer: (nx: number, ny: number) => void;
		setHeroLift: (px: number) => void;
		setNightMix: (full: number, west: number, east: number) => void;
	} | null>(null);
	// Lama kamera menukik (ms) dari bumi utuh ke bingkai Nusantara.
	// Menutup (diukur dari rekaman) ±1.9 dtk: zoom keluar 0–0.8 dtk lalu
	// putaran panjang yang melambat. Membuka = jalurnya dibalik, sedikit
	// lebih panjang supaya putaran di awal terasa.
	const DIVE_MS = 3000;

	$effect(() => {
		if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) reduced = true;
	});

	$effect(() => {
		mapRef?.setSpin(spin);
	});

	// Langit bintang — dibuat di klien agar SSR/hydration identik. Dua lapis
	// kedalaman: bintang kecil (jauh) dan besar (dekat) bergeser beda jauh
	// saat kursor bergerak, jadi langitnya terasa punya ruang.
	$effect(() => {
		const far = starsFarEl;
		const near = starsNearEl;
		if (!far || !near || far.childElementCount) return;
		// Langit padat: ±950 bintang. Kebanyakan debu 1px redup (lapis jauh),
		// sebagian 1,5–2px, dan segelintir bintang terang bercahaya yang
		// berkilau lebih kuat (lapis dekat). Fragment → satu kali sisip DOM.
		const farFrag = document.createDocumentFragment();
		const nearFrag = document.createDocumentFragment();
		const COUNT = window.innerWidth < 640 ? 420 : 950;
		for (let i = 0; i < COUNT; i++) {
			const s = document.createElement("span");
			const r = Math.random();
			const size = r < 0.78 ? 1 : r < 0.95 ? 1.5 : r < 0.985 ? 2 : 2.6;
			s.className = size >= 2.6 ? "md-star is-bright" : "md-star";
			s.style.left = `${(Math.random() * 100).toFixed(2)}%`;
			s.style.top = `${(Math.random() * 100).toFixed(2)}%`;
			s.style.width = s.style.height = `${size}px`;
			s.style.animationDelay = `${(Math.random() * 6).toFixed(2)}s`;
			s.style.animationDuration = `${(3 + Math.random() * 5).toFixed(2)}s`;
			(size <= 1 ? farFrag : nearFrag).appendChild(s);
		}
		far.appendChild(farFrag);
		near.appendChild(nearFrag);
	});

	$effect(() => {
		let alive = true;
		fetchMapHotspots()
			.then((hs) => {
				if (!alive) return;
				points = hs.length;
				frames = hs.reduce((sum, h) => sum + h.photos.length, 0);
			})
			.catch(() => {});
		return () => {
			alive = false;
		};
	});

	$effect(() => {
		const track = wrapEl;
		const stage = stageEl;
		const overlay = overlayEl;
		const map = mapLayer;
		const cam = mapRef;
		if (!track || !stage || !overlay || !map || !cam) return;

		// Isi hero ada di dua lapisan: overlay (eyebrow, sub, statistik, tombol)
		// di atas peta, dan backdrop (bintang, judul besar) DI BELAKANG kanvas
		// peta — keduanya dicari dari seluruh panggung.
		const q = (sel: string) => stage.querySelectorAll(sel);
		const hud = map.querySelectorAll(".im-cluster, .im-slate, .im-hint, .im-coord");
		const vignette = map.querySelector<HTMLElement>(".im-vignette");

		if (reduced) {
			// Tanpa gerak: langsung keadaan mendarat.
			cam.dive(0);
			cam.landed();
			overlay.style.display = "none";
			q(".md-backdrop").forEach((el) => ((el as HTMLElement).style.display = "none"));
			stage.classList.add("is-landed");
			window.dispatchEvent(new Event("lakuna:map-shown"));
			return;
		}

		// Di kamera globe, HUD dan vignette peta belum ada: layar ini masih
		// hero. Keduanya masuk selagi kamera menukik.
		//
		// `is-hero` di panggung adalah penjaga KERAS: CSS memberi visibility
		// hidden pada HUD, vignette, dan marker peta selama kelas ini ada.
		// Opacity inline dari tween bisa tertimpa (IndonesiaMap mode tanam
		// memasang HUD ke 1, atau keadaan tertinggal setelah lompat-mendarat
		// lalu naik); visibility tidak ikut campur dengan opacity, jadi HUD
		// peta tak pernah muncul di atas bumi hero.
		stage.classList.add("is-hero");
		gsap.set(hud, { opacity: 0, y: 12 });
		if (vignette) gsap.set(vignette, { opacity: 0 });

		// Penyelaman TIDAK di-scrub. Gulir hanya MEMICU; kamera MapLibre dan
		// timeline antarmuka berjalan berbasis waktu dengan durasi yang sama,
		// sementara posisi gulir dibawa ke ujung track dengan input terkunci —
		// sticky stage membuat perpindahan gulir itu tak terlihat.
		//
		// Kamera sendiri tidak ada di timeline ini: dive()/rise() memanggil
		// easeTo MapLibre. Timeline hanya mengurus teks, HUD, dan vignette.
		const tl = gsap.timeline({
			paused: true,
			onComplete: markLanded,
			onReverseComplete: () => {
				mode = "hero";
				stage.classList.add("is-hero");
				playReveal();
				// Kembali dari peta: siklus siang–malam menyala lagi pelan-pelan.
				// Kembali dari peta: jam siklus lanjut dari titik beku, atmosfer
				// menyala lagi pelan-pelan.
				if (frozenAt !== null) {
					clockShift += performance.now() - frozenAt;
					frozenAt = null;
				}
				gsap.to(rimWeight, { w: 1, duration: 1.4, ease: "power2.inOut", overwrite: true });
			},
		});
		// 1 — undangan memudar; judul tetap di tempat (bumi yang naik
		// menutupinya dari bawah, karena judul ada di belakang kanvas).
		// Teks pergi BERURUTAN dari atas ke bawah: eyebrow → judul → sub →
		// statistik → tombol (diputar mundur saat naik = muncul bawah → atas).
		const fadeOrder = [".md-eyebrow", ".md-title", ".md-sub", ".md-meta", ".md-cta, .md-tools"];
		fadeOrder.forEach((sel, k) => {
			// Cepat & nyaris serentak: teks hero tak boleh tersisa saat kamera sudah menukik ke peta.
			tl.to(q(sel), { opacity: 0, duration: 0.18, ease: "power2.in" }, k * 0.03);
		});
		tl.to(q(".md-stars"), { opacity: 0, duration: 0.8, ease: "power1.in" }, 0.2);
		// 2 — tepi gelap peta tumbuh PELAN selagi kamera masih bergerak.
		if (vignette) {
			tl.fromTo(vignette, { opacity: 0 }, { opacity: 1, duration: 1.0, ease: "power1.inOut", immediateRender: false }, 1.6);
		}
		// 3 — kamera tiba: marker pop (IndonesiaMap mendengar map-shown) dan
		// HUD bertahap.
		const ARRIVE = DIVE_MS / 1000 - 0.15;
		tl.call(announceLanded, [], ARRIVE);
		if (hud.length) {
			tl.fromTo(
				hud,
				{ opacity: 0, y: 12 },
				{ opacity: 1, y: 0, duration: 0.45, ease: "power2.out", stagger: 0.08, immediateRender: false },
				ARRIVE,
			);
		}

		// ── Kemunculan section ────────────────────────────────────────────
		// Diukur dari rekaman "21hrs on the Moon", bukan dikira-kira:
		//  • bulan naik ke tempatnya dalam ~1,4 dtk (cepat di awal, mengendap);
		//  • judulnya TIDAK bergerak dan tidak buram — ia MENYALA dari gelap ke
		//    terang mulai ~0,9 dtk setelah bulan bergerak;
		//  • teks pendukung menyala bersama judul, bukan muncul belakangan.
		//  • judul NAIK pelan dari balik bulan (±7% tinggi layar) sambil menyala
		//    dari gelap, jadi seolah terbit bersama bulan;
		//  • eyebrow & subjudul menyala menyusul; garis atas & bawah baru
		//    TERGAMBAR dari tengah ke luar setelah judul terang;
		//  • label statistik kiri/kanan dan tombol muncul paling akhir.
		const eyebrowEl = q(".md-eyebrow");
		const subEl = q(".md-sub");
		const metaEl = q(".md-meta");
		const metaBlocks = q(".md-meta-block");
		const tailEls = q(".md-cta");
		// Sebelum muncul: benar-benar tak terlihat (dulu 4% — tampak seperti
		// teks hantu selagi section digulir masuk).
		gsap.set([...eyebrowEl, ...subEl, ...tailEls], { opacity: 0 });
		gsap.set(metaEl, { opacity: 1 });
		gsap.set(metaBlocks, { opacity: 0, y: 6 });
		// Garis dilukis lewat variabel CSS (pseudo-element tak bisa di-tween).
		const rule = { s: 0 };
		const paintRule = () => overlay.style.setProperty("--md-rule", rule.s.toFixed(4));
		paintRule();
		// Judul memakai gradien yang di-clip ke huruf; kecerahannya digerakkan
		// lewat filter brightness supaya gradiennya tetap utuh.
		const titleRise = Math.round(window.innerHeight * 0.16);
		gsap.set(q(".md-title"), { opacity: 0, y: titleRise, filter: "brightness(0.35)" });
		// Bintang sudah ada sejak awal (di rekaman rujukan langit tak ikut menyala).
		gsap.set(q(".md-stars"), { opacity: 0.55 });
		// Bumi terbit: kanvasnya digeser turun lalu naik ke tempatnya. (Dulu
		// lewat padding kamera — nilainya melewati batas tinggi layar sehingga
		// dipotong MapLibre dan bumi tak terlihat bergerak.)
		// Kanvas MapLibre dibuat belakangan (peta dimuat lazy) → dicari saat
		// melukis, bukan sekali di awal.
		let globeCanvas: HTMLCanvasElement | null = null;
		const lift = { px: window.innerHeight * 0.55 };
		const paintLift = () => {
			globeCanvas ??= map.querySelector<HTMLCanvasElement>("canvas.maplibregl-canvas, canvas");
			if (globeCanvas) globeCanvas.style.transform = lift.px > 0.5 ? `translate3d(0, ${lift.px.toFixed(1)}px, 0)` : "";
		};
		// Kanvas muncul sebelum kemunculan diputar → pasang posisi awalnya.
		const liftWatch = new MutationObserver(() => {
			if (!globeCanvas && intro.progress() === 0) paintLift();
			if (globeCanvas) liftWatch.disconnect();
		});
		liftWatch.observe(map, { childList: true, subtree: true });
		paintLift();

		const intro = gsap.timeline({ paused: true });
		// Urutan: garis tergambar DULUAN (pendek → panjang dari tengah) bersama
		// eyebrow, baru judul besar terbit dari balik bumi, lalu sisanya.
		intro.to(lift, { px: 0, duration: 2.3, ease: "power2.out", onUpdate: paintLift }, 0);
		intro.to(q(".md-stars"), { opacity: 1, duration: 1.2, ease: "power1.out" }, 0.2);
		intro.to(rule, { s: 1, duration: 1.3, ease: "power3.inOut", onUpdate: paintRule }, 0.15);
		intro.to(eyebrowEl, { opacity: 1, duration: 0.8, ease: "power1.out" }, 0.35);
		intro.to(q(".md-title"), { y: 0, duration: 2.0, ease: "power3.out" }, 1.0);
		intro.to(q(".md-title"), { opacity: 1, duration: 0.9, ease: "power1.out" }, 1.0);
		intro.to(q(".md-title"), { filter: "brightness(1)", duration: 1.7, ease: "power1.inOut" }, 1.05);
		intro.to(subEl, { opacity: 1, duration: 0.9, ease: "power1.out" }, 1.8);
		intro.to(metaBlocks, { opacity: 1, y: 0, duration: 0.8, ease: "power2.out", stagger: 0.08 }, 2.1);
		intro.to(tailEls, { opacity: 1, duration: 0.8, ease: "power1.out", stagger: 0.06 }, 2.3);

		// ── Muncul lagi saat kembali ──────────────────────────────────────
		// Kembali dari peta: teks tidak ikut diputar mundur (urutannya jadi
		// terbalik — judul duluan). Selama kamera naik teks disembunyikan
		// lewat visibility inline (tak bentrok dengan opacity milik timeline),
		// lalu diputar ulang dari ATAS ke BAWAH: garis + eyebrow,
		// judul, subjudul, statistik, tombol.
		const textEls = [...eyebrowEl, ...q(".md-title"), ...subEl, ...metaBlocks, ...tailEls];
		let reveal: gsap.core.Timeline | null = null;
		const holdText = () => {
			reveal?.kill();
			gsap.set(textEls, { visibility: "hidden" });
			rule.s = 0;
			paintRule();
		};
		function playReveal() {
			reveal?.kill();
			gsap.set(textEls, { opacity: 0 });
			gsap.set(q(".md-title"), { y: titleRise * 0.5, filter: "brightness(0.35)" });
			gsap.set(metaBlocks, { y: 6 });
			gsap.set(textEls, { visibility: "visible" });
			rule.s = 0;
			paintRule();
			reveal = gsap.timeline();
			// Bintang lahir kembali: tiap bintang meletup dari nol dengan
			// jeda acak (bukan fade merata) — langit terasa menyala saat
			// kembali dari peta. Hanya transform scale: opacity milik animasi
			// CSS twinkle, jangan direbut. Diam bila hemat gerak.
			if (!reduced && starsFarEl && starsNearEl) {
				const births = [
					...Array.from(starsFarEl.children),
					...Array.from(starsNearEl.children),
				];
				if (births.length) {
					reveal.fromTo(
						births,
						{ scale: 0 },
						{
							scale: 1,
							duration: 0.7,
							ease: "back.out(2.2)",
							stagger: { each: 0.0012, from: "random" },
							overwrite: "auto",
							clearProps: "scale",
						},
						0.1,
					);
				}
			}
			reveal.to(rule, { s: 1, duration: 1.1, ease: "power3.inOut", onUpdate: paintRule }, 0);
			reveal.to(eyebrowEl, { opacity: 1, duration: 0.7, ease: "power1.out" }, 0.15);
			reveal.to(q(".md-title"), { opacity: 1, y: 0, duration: 1.4, ease: "power3.out" }, 0.5);
			reveal.to(q(".md-title"), { filter: "brightness(1)", duration: 1.2, ease: "power1.inOut" }, 0.55);
			reveal.to(subEl, { opacity: 1, duration: 0.7, ease: "power1.out" }, 1.0);
			reveal.to(metaBlocks, { opacity: 1, y: 0, duration: 0.7, ease: "power2.out", stagger: 0.08 }, 1.25);
			reveal.to(tailEls, { opacity: 1, duration: 0.7, ease: "power1.out", stagger: 0.06 }, 1.45);
		}
		// ── Siklus siang–malam bumi (hero saja) ───────────────────────────
		// Seperti rujukan: bumi perlahan berganti "waktu" tiap beberapa detik —
		// malam gelap kebiruan → fajar kehijauan → siang biru terang → senja
		// hangat → malam lagi. Dilukis sebagai filter warna pada kanvas globe,
		// DAN sisi malamnya mengikuti jam yang sama (overlay lampu kota di
		// IndonesiaMap, lewat setNightMix): malam menutupi seluruh bumi, surut ke
		// barat saat fajar, hilang di siang hari, lalu datang dari timur saat senja.
		// Hanya selama mode hero & section terlihat; saat menyelam ke peta
		// bobotnya memudar ke 0 (warna asli), jadi peta tak pernah berfilter.
		// b = kecerahan filter: SENGAJA ~1 di semua fase — gelapnya malam kini
		// dilukis overlay (yang juga menyalakan lampu kota); filter kecerahan
		// menggelapkan dua kali dan meredupkan lampu. d = "terangnya hari" (asal
		// kecerahan lama) khusus untuk atmosfer tepi bumi. n = bobot overlay malam
		// [penuh, barat, timur] pada fase itu.
		type Tone = { b: number; d: number; s: number; c: number; h: number; sep: number; n: [number, number, number] };
		const TONES: Tone[] = [
			{ b: 0.96, d: 0.42, s: 0.8, c: 1.1, h: 12, sep: 0, n: [1, 0, 0] }, // malam penuh
			{ b: 1.0, d: 0.72, s: 0.9, c: 1.05, h: -18, sep: 0.12, n: [0, 1, 0] }, // fajar (kehijauan), sisa malam di barat
			{ b: 1.06, d: 1.06, s: 1.12, c: 1.02, h: 0, sep: 0, n: [0, 0, 0] }, // siang
			{ b: 1.0, d: 1.0, s: 1.05, c: 1.0, h: 4, sep: 0, n: [0, 0, 0] }, // siang (tahan)
			{ b: 1.0, d: 0.78, s: 0.95, c: 1.06, h: -6, sep: 0.28, n: [0, 0, 1] }, // senja hangat, malam datang dari timur
		];
		const PHASE_S = 5.5; // tiap fase ±5,5 dtk → satu putaran ±27 dtk
		// toneWeight = kekuatan warna "waktu" di kanvas (tetap 1 — warna ikut
		// terbawa ke peta). rimWeight = atmosfer tepi bumi (hanya di hero).
		const toneWeight = { w: 1 };
		const rimWeight = { w: 1 };
		// Jam siklus DIBEKUKAN saat menyelam: peta memakai warna yang sedang
		// tampil di globe saat itu, tidak terus berganti. Kembali ke globe →
		// jam lanjut dari titik beku (tanpa loncatan).
		let frozenAt: number | null = null;
		let clockShift = 0;
		let toneRaf = 0;
		let toneVisible = true;
		const mix = (a: number, b: number, t: number) => a + (b - a) * t;
		const smooth = (t: number) => t * t * (3 - 2 * t);
		const rim = stage.querySelector<HTMLElement>(".md-rim");
		// Satu fase berlangsung ±5,5 dtk, jadi ~20 pembaruan/dtk sudah tak terbedakan
		// dari 60 — tapi tiap pembaruan menulis filter CSS lima lapis ke kanvas WebGL
		// layar penuh dan state global peta (MapLibre menilai ulang style & menggambar
		// ulang), yang mahal di GPU lemah. Tulis hanya bila nilainya berubah.
		const TONE_STEP_MS = 48;
		let lastToneAt = -1e9;
		let lastFilter = "";
		let toneCv: HTMLCanvasElement | null = null;
		let rimShown = false;
		let lastRimTf = "";
		let cvW = 0;
		let cvH = 0;
		let sizeAt = -1e9;
		const paintTone = (now: number) => {
			toneRaf = requestAnimationFrame(paintTone);
			if (now - lastToneAt < TONE_STEP_MS) {
				// Cincin atmosfer menempel pada kanvas yang bergeser mengikuti kursor:
				// salin transform tiap frame (hanya tulis, tanpa membaca layout).
				if (rim && rimShown && toneCv) {
					const tf = toneCv.style.transform || "";
					if (tf !== lastRimTf) {
						lastRimTf = tf;
						rim.style.transform = tf;
					}
				}
				return;
			}
			lastToneAt = now;
			const cv = (toneCv && toneCv.isConnected ? toneCv : (toneCv = map.querySelector<HTMLCanvasElement>("canvas")));
			if (!cv) return;
			// Bobot dipudarkan oleh dive()/kembali ke hero — bukan dipotong
			// langsung oleh `mode`, supaya warna tak meloncat saat menyelam.
			const w = reduced ? 0 : toneWeight.w;
			const clock = (frozenAt ?? now) - clockShift;
			const f = (clock / 1000 / PHASE_S) % TONES.length;
			const i = Math.floor(f);
			const t = smooth(f - i);
			const A = TONES[i];
			const B = TONES[(i + 1) % TONES.length];
			// Atmosfer: bulatan globe hero = pusat (w/2, cy), jari-jari R
			// (rumus sama dengan heroCamera di IndonesiaMap), ikut geser terbit.
			if (rim) {
				if (!toneVisible || rimWeight.w <= 0.001) {
					rim.style.opacity = "0";
					rimShown = false;
				} else {
					rimShown = true;
					// clientWidth/Height memaksa layout; ukuran kanvas jarang berubah → baca 2×/dtk.
					if (now - sizeAt > 500) {
						sizeAt = now;
						cvW = cv.clientWidth;
						cvH = cv.clientHeight;
					}
					const W = cvW;
					const H = cvH;
					const vmin = Math.min(W, H);
					// Jari-jari bulatan yang BENAR-BENAR tergambar ≈ 0,657·R (diukur
					// dari tepi globe di layar; proyeksi globe MapLibre lebih kecil
					// dari R nominal heroCamera). Tepi bawah tetap h − 0,66·vmin.
					const R = Math.min(vmin, 1000) * 0.657;
					const cy = H - 0.66 * vmin + R;
					rim.style.width = rim.style.height = `${(R * 2).toFixed(1)}px`;
					rim.style.left = `${(W / 2 - R).toFixed(1)}px`;
					rim.style.top = `${(cy - R).toFixed(1)}px`;
					lastRimTf = cv.style.transform || "";
					rim.style.transform = lastRimTf;
					// Siang = atmosfer paling terang; malam tetap ada garis tipis.
					const day = Math.min(1, Math.max(0, (mix(A.d, B.d, t) - 0.4) / 0.66));
					rim.style.opacity = ((0.45 + day * 0.55) * rimWeight.w).toFixed(3);
				}
			}
			// Sisi malam mengikuti jam yang sama; hanya saat section terlihat (panggilan
			// pertama menampakkan lapisan sehingga ubin baru mulai dimuat).
			if (toneVisible) {
				const nm = (j: number) => mix(A.n[j] as number, B.n[j] as number, t) * w;
				cam.setNightMix(nm(0), nm(1), nm(2));
			}
			if (w <= 0.001 || !toneVisible) {
				if (cv.style.filter) cv.style.filter = "";
				lastFilter = "";
				return;
			}
			const k = (key: Exclude<keyof Tone, "n">, neutral: number) => mix(neutral, mix(A[key], B[key], t), w);
			const filter =
				`brightness(${k("b", 1).toFixed(3)}) saturate(${k("s", 1).toFixed(3)}) ` +
				`contrast(${k("c", 1).toFixed(3)}) hue-rotate(${k("h", 0).toFixed(1)}deg) sepia(${k("sep", 0).toFixed(3)})`;
			if (filter !== lastFilter) {
				lastFilter = filter;
				cv.style.filter = filter;
			}
		};
		toneRaf = requestAnimationFrame(paintTone);
		// Di luar layar: jangan melukis ulang tiap frame.
		const toneIo = new IntersectionObserver(([e]) => (toneVisible = !!e?.isIntersecting), { threshold: 0 });
		toneIo.observe(track);

		// ── Gestur kursor (hero saja) ─────────────────────────────────────
		// Bumi berpaling mengikuti kursor (dihaluskan di IndonesiaMap) dan
		// dua lapis bintang bergeser berlawanan arah dengan jarak berbeda.
		// Mati di layar sentuh — tak ada kursor untuk diikuti.
		const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
		const farX = gsap.quickTo(q(".md-stars-far"), "x", { duration: 1.2, ease: "power3.out" });
		const farY = gsap.quickTo(q(".md-stars-far"), "y", { duration: 1.2, ease: "power3.out" });
		const nearX = gsap.quickTo(q(".md-stars-near"), "x", { duration: 1.2, ease: "power3.out" });
		const nearY = gsap.quickTo(q(".md-stars-near"), "y", { duration: 1.2, ease: "power3.out" });
		const aimPointer = (nx: number, ny: number) => {
			cam.setPointer(nx, ny);
			farX(-nx * 16);
			farY(-ny * 10);
			nearX(-nx * 40);
			nearY(-ny * 26);
		};
		const onPointer = (e: PointerEvent) => {
			if (mode !== "hero" || e.pointerType !== "mouse") return;
			aimPointer(e.clientX / window.innerWidth - 0.5, e.clientY / window.innerHeight - 0.5);
		};
		// Kursor keluar jendela: kembali ke tengah pelan-pelan.
		const onLeave = (e: MouseEvent) => {
			if (!e.relatedTarget) aimPointer(0, 0);
		};
		if (finePointer) {
			window.addEventListener("pointermove", onPointer, { passive: true });
			document.addEventListener("mouseout", onLeave);
		}

		// Kemunculan hanya untuk pengunjung yang MENGGULIR masuk. Setelah
		// refresh (browser memulihkan posisi gulir), lewat anchor, atau saat
		// section sudah terlihat ketika halaman dimuat, isinya langsung tampil
		// dalam keadaan akhir — dulu judul & teks tertahan gelap ±2 dtk
		// menunggu "nyala" padahal section sudah di depan mata.
		//
		// Dulu satu ScrollTrigger `once` + satu cek saat pasang. Setelah refresh
		// keduanya bisa meleset: posisi gulir dipulihkan browser & pin di atas
		// diukur ulang SESUDAH efek ini jalan, jadi trigger kadang tak pernah
		// terpicu dan judul tertinggal gelap. Sekarang dicek di tiap gulir,
		// refresh ScrollTrigger, dan beberapa titik waktu awal sampai jalan.
		let introStarted = false;
		/** Garis + judul sudah terbit saat kunci lepas; sisanya menyusul. */
		const INTRO_LOCK_MS = 1900;
		let introLockUntil = 0;
		const ensureIntro = () => {
			if (introStarted) return;
			const top = track.getBoundingClientRect().top;
			const vh = window.innerHeight;
			// Dipicu saat section sudah separuh layar; gulir lalu dirapatkan ke
			// awal section (lihat di bawah), jadi kemunculan tetap terlihat utuh
			// tanpa fase kosong yang lama selagi section digulir masuk.
			// Luncuran dari contact sheet (data-globe-glide) memicu LEBIH AWAL:
			// dulu section meluncur masuk ±1 dtk dalam keadaan "belum muncul"
			// (teks tersembunyi, bumi di bawah) → pita hitam kosong lalu isinya
			// meloncat masuk. Kini bumi terbit & garis tergambar selagi meluncur.
			const gliding = !!document.documentElement.dataset.globeGlide;
			if (top >= vh * (gliding ? 1.05 : 0.45)) return;
			introStarted = true;
			window.removeEventListener("scroll", ensureIntro);
			// Lompatan/pemulihan yang mendarat jauh melewati awal section →
			// langsung keadaan akhir.
			if (top < -vh * 0.6) intro.progress(1).pause();
			else {
				intro.play();
				// Inersia gulir dari section atas dulu terbawa melewati awal
				// track → penyelaman langsung terpicu dan kemunculan dipaksa
				// loncat ke akhir (glitch). Kini gulir dirapatkan ke awal
				// section dan input ditahan selama bagian utama kemunculan.
				introLockUntil = performance.now() + INTRO_LOCK_MS;
				// Contact sheet sedang meluncur ke sini (data-globe-glide) →
				// biarkan kurvanya selesai; menimpanya bikin gerak patah.
				if (!document.documentElement.dataset.globeGlide) {
					scrollToY(track.getBoundingClientRect().top + window.scrollY, 0.55);
				}
			}
		};
		const introST = ScrollTrigger.create({
			trigger: track,
			start: "top 45%",
			onEnter: ensureIntro,
			onEnterBack: ensureIntro,
			onRefresh: ensureIntro,
		});
		window.addEventListener("scroll", ensureIntro, { passive: true });
		ensureIntro();
		const introChecks = [0, 300, 1000, 2500].map((ms) => window.setTimeout(ensureIntro, ms));

		type Mode = "hero" | "landing" | "landed" | "rising";
		let mode: Mode = "hero";
		const RISE_SPEED = 1.3;

		// Kembali dari ATAS (section sempat keluar layar ke bawah): kemunculan
		// penuh diputar ulang, termasuk bumi terbit — sama seperti saat refresh.
		const replayST = ScrollTrigger.create({
			trigger: track,
			start: "top bottom",
			onLeaveBack: () => {
				if (!introStarted || mode !== "hero") return;
				reveal?.kill();
				gsap.set(textEls, { visibility: "visible" });
				// pause(0) menekan callback onUpdate → posisi bumi (geser kanvas)
				// & garis TIDAK digambar ulang: bumi tetap di posisi akhir lalu
				// meloncat turun saat kemunculan mulai, garis tertinggal penuh.
				// Lukis keadaan awal secara eksplisit.
				intro.pause(0, false);
				paintLift();
				paintRule();
				introStarted = false;
				window.addEventListener("scroll", ensureIntro, { passive: true });
			},
		});


		function announceLanded() {
			// tl.call juga terpicu saat timeline diputar balik — abaikan itu.
			if (mode === "rising") return;
			// Flag untuk peta (anti-race: dibaca peta saat ia siap).
			document.documentElement.dataset.maplanded = "1";
			if (!landed) {
				landed = true;
				window.dispatchEvent(new Event("lakuna:map-shown"));
			}
		}

		function markLanded() {
			mode = "landed";
			stage!.classList.add("is-landed");
			overlay!.style.display = "none";
			cam!.landed();
			announceLanded();
		}

		const trackStart = () => track.getBoundingClientRect().top + window.scrollY;
		const trackEnd = () => trackStart() + track.offsetHeight - window.innerHeight;

		// Sentuh memakai koreografi yang sama, hanya sedikit lebih cepat karena
		// jari menunggu lebih tidak sabar daripada roda tetikus.
		const isTouch = window.matchMedia("(pointer: coarse)").matches;
		const TOUCH_SPEED = 1.35;
		let lastRiseAt = 0;
		// Penunda perapat posisi sebelum kamera bergerak (lihat dive()).
		let alignT: ReturnType<typeof setTimeout> | undefined;

		function scrollToY(y: number, duration: number) {
			const l = getLenis();
			if (l) {
				l.scrollTo(y, { duration, lock: true, force: true, easing: (t) => 1 - Math.pow(1 - t, 3) });
			} else {
				// Tanpa Lenis (mis. sentuh/reduced-motion), gulir digerakkan GSAP
				// dengan durasi yang sama supaya posisi dan kamera tiba bersamaan.
				gsap.to(window, { scrollTo: y, duration, ease: "power3.out", overwrite: true });
			}
		}

		function dive() {
			if (mode === "landing" || mode === "landed") return;
			mode = "landing";
			// Bintang kembali ke tempatnya selagi memudar.
			if (finePointer) aimPointer(0, 0);
			// Warna "waktu" bumi pulih ke asli selagi kamera menyelam.
			// Warna "waktu" yang sedang tampil DIBAWA ke peta (jam dibekukan);
			// hanya atmosfer tepi bumi yang memudar.
			frozenAt = performance.now();
			gsap.to(rimWeight, { w: 0, duration: 0.9, ease: "power2.out", overwrite: true });
			stage!.classList.remove("is-hero");
			// Gulir sebelum kemunculan selesai: bekukan di tempat (dulu dilompat
			// ke akhir → judul & bumi meloncat). Yang tersisa ikut dipudarkan
			// timeline penyelaman dari nilainya sekarang; hanya geser kanvas
			// yang dinolkan karena kamera kini dipegang dive().
			if (intro.progress() < 1) {
				intro.pause();
				lift.px = 0;
				paintLift();
			}
			overlay!.style.display = "";
			const speed = isTouch ? TOUCH_SPEED : 1;
			const play = () => {
				cam!.dive(DIVE_MS / speed);
				tl.timeScale(speed).play();
				scrollToY(trackEnd(), (tl.duration() - tl.time()) / speed);
			};
			// Panggung ini sticky dengan overflow:hidden. Selama section belum
			// menempel di puncak viewport, rapatkan dulu section ke puncak, baru
			// kameranya bergerak.
			if (trackStart() - window.scrollY > 2) {
				scrollToY(trackStart(), 0.28);
				alignT = setTimeout(play, 300);
			} else {
				play();
			}
		}

		function rise() {
			if (mode === "rising" || mode === "hero") return;
			mode = "rising";
			lastRiseAt = performance.now();
			holdText();
			stage!.classList.remove("is-landed");
			delete document.documentElement.dataset.maplanded;
			overlay!.style.display = "";
			const speed = isTouch ? RISE_SPEED * TOUCH_SPEED : RISE_SPEED;
			// Kamera kembali selama sisa timeline yang diputar mundur.
			cam!.rise((tl.time() / speed) * 1000);
			tl.timeScale(speed).reverse();
			scrollToY(trackStart(), tl.time() / speed);
		}
		diveFn = dive;

		// Mendarat tanpa animasi (lompatan jauh / datang dari bawah).
		function jumpLanded() {
			if (frozenAt === null) frozenAt = performance.now();
			gsap.set(rimWeight, { w: 0 });
			stage!.classList.remove("is-hero");
			tl.progress(1);
			cam!.dive(0);
			markLanded();
		}

		// Selama transisi, gulir pengguna ditelan supaya tak melawan kamera.
		const busy = () => mode === "landing" || mode === "rising" || performance.now() < introLockUntil;
		const swallow = (e: Event) => {
			if (!busy()) return;
			e.preventDefault();
			// preventDefault saja tidak menghentikan Lenis (ia tetap membaca
			// roda) → gulir tetap merayap selama kunci. Hentikan penyebarannya.
			e.stopPropagation();
		};
		const SCROLL_KEYS = new Set(["ArrowDown", "ArrowUp", "PageDown", "PageUp", " ", "Home", "End"]);
		const swallowKey = (e: KeyboardEvent) => {
			if (busy() && SCROLL_KEYS.has(e.key)) e.preventDefault();
		};
		window.addEventListener("wheel", swallow, { passive: false, capture: true });
		// Sentuh ikut ditelan supaya section benar-benar menempel; pengaman
		// loop-nya ada di onUpdate (syarat p > 0.5 + jeda setelah rise).
		window.addEventListener("touchmove", swallow, { passive: false, capture: true });
		window.addEventListener("keydown", swallowKey, { capture: true });

		const st = ScrollTrigger.create({
			trigger: track,
			start: "top top",
			end: "bottom bottom",
			onUpdate: (self) => {
				const p = self.progress;
				if (self.direction === 1 && mode === "hero") {
					// Lompatan jauh (End, anchor) melewati track: langsung mendarat
					// tanpa menarik gulir kembali ke atas.
					if (p >= 1 && !self.isActive) jumpLanded();
					// Pengaman loop: bounce/momentum tepat setelah rise() selesai
					// (p kecil, arah balik) tidak boleh langsung menyelam lagi.
					else if (p > 0.02 && performance.now() - lastRiseAt > 900 && performance.now() >= introLockUntil) dive();
				} else if (self.direction === -1) {
					// Datang dari bawah tanpa pernah menyelam (mis. lompat lewat
					// anchor): anggap sudah mendarat, lalu naik — HANYA bila
					// posisinya benar-benar dalam di track (p > 0.5), supaya gulir
					// ke atas setelah rise() tidak memicu pendaratan lagi.
					if (mode === "hero" && tl.progress() === 0 && p > 0.5 && performance.now() - lastRiseAt > 900) {
						jumpLanded();
					}
					if (mode === "landed" && p < 0.999) rise();
				}
			},
		});
		// Ukur ulang yang sopan: tunda sampai gulir tenang supaya tidak
		// menendang posisi pin di tengah guliran pertama.
		const refresh = () => calmRefresh();
		window.addEventListener("load", refresh);
		// Konten async DI ATAS track (foto arsip) mengubah tinggi dokumen
		// setelah trigger diukur → progress dive meleset. Sembuhkan otomatis
		// tiap tinggi berubah.
		let lastH = document.documentElement.scrollHeight;
		let rt: ReturnType<typeof setTimeout>;
		const ro = new ResizeObserver(() => {
			const h = document.documentElement.scrollHeight;
			if (h === lastH) return;
			lastH = h;
			clearTimeout(rt);
			rt = setTimeout(refresh, 150);
		});
		ro.observe(document.documentElement);
		return () => {
			window.removeEventListener("load", refresh);
			ro.disconnect();
			clearTimeout(rt);
			clearTimeout(alignT);
			window.removeEventListener("wheel", swallow, { capture: true });
			window.removeEventListener("touchmove", swallow, { capture: true });
			window.removeEventListener("keydown", swallowKey, { capture: true });
			window.removeEventListener("pointermove", onPointer);
			document.removeEventListener("mouseout", onLeave);
			diveFn = null;
			st.kill();
			introST.kill();
			replayST.kill();
			reveal?.kill();
			window.removeEventListener("scroll", ensureIntro);
			introChecks.forEach((t) => window.clearTimeout(t));
			intro.kill();
			liftWatch.disconnect();
			if (globeCanvas) globeCanvas.style.transform = "";
			cancelAnimationFrame(toneRaf);
			toneIo.disconnect();
			gsap.killTweensOf(rimWeight);
			const cvEnd = map.querySelector<HTMLCanvasElement>("canvas");
			if (cvEnd) cvEnd.style.filter = "";
			tl.kill();
		};
	});

	// Diisi effect timeline; tombol "Gulir untuk mendarat" memicu penyelaman
	// yang sama dengan gulir.
	let diveFn: (() => void) | null = null;

	function land() {
		diveFn?.();
	}

</script>

<svelte:head>
	<style>
		/* Alas adegan peta: --darkroom (selalu gelap) di tema terang; di tema
		   gelap sama dengan latar halaman (--bg) supaya menyatu mulus dengan
		   section di atasnya — dulu dua hitam berbeda (#0c0d0f vs #050608)
		   terbaca sebagai pita. */
		.md-track {
			--md-ground: var(--darkroom);
			position: relative;
			height: 200svh;
			background: var(--md-ground);
		}
		.dark .md-track {
			--md-ground: var(--bg);
		}
		/* Tema gelap: contact sheet & peta sama-sama beralas --bg, sambungan
		   tak diperlukan — dulu hanya dibuat transparan, jadi tetap menyisakan
		   120–220px ruang kosong. Lipat habis. */
		.dark .md-seam-in {
			height: 0 !important;
			opacity: 0;
		}
		/* Tema terang di HP: basuhan kertas → gelap cukup pendek. */
		@media (max-width: 639px) {
			.md-seam-in {
				height: 56px !important;
			}
		}
		.md-sticky {
			position: sticky;
			top: 0;
			height: 100svh;
			min-height: 560px;
			overflow: hidden;
		}
		.md-map {
			position: absolute;
			inset: 0;
			z-index: 1;
			pointer-events: none;
		}
		.md-sticky.is-landed .md-map { pointer-events: auto; }
		/* Atmosfer: cincin tipis kebiruan di tepi bumi (inset) + pendar lembut
		   ke luar + kilau cahaya di sisi atas-kiri. Diletakkan tepat di atas
		   bulatan globe oleh JS (left/top/width/height), ikut geser saat bumi
		   terbit, dan redup/terang mengikuti siang–malam. */
		.md-rim {
			position: absolute;
			left: 0;
			top: 0;
			width: 0;
			height: 0;
			border-radius: 50%;
			pointer-events: none;
			opacity: 0;
			mix-blend-mode: screen;
			will-change: transform, opacity;
			box-shadow:
				inset 0 0 6px 1px rgba(210, 232, 255, 0.85),
				inset 0 0 26px 4px rgba(120, 180, 255, 0.55),
				inset 0 0 80px 14px rgba(70, 130, 255, 0.22),
				0 0 10px 2px rgba(170, 215, 255, 0.7),
				0 0 46px 10px rgba(90, 150, 255, 0.35),
				0 0 140px 40px rgba(60, 110, 255, 0.14);
			background:
				radial-gradient(ellipse 60% 38% at 32% 14%, rgba(255, 255, 255, 0.22), transparent 70%),
				radial-gradient(circle at 50% 50%, transparent 62%, rgba(110, 170, 255, 0.12) 90%, rgba(170, 215, 255, 0.28) 100%);
		}
		.md-globe-stage {
			position: absolute;
			inset: 0;
			z-index: 2;
			/* Transparan: bumi di bawahnya adalah peta itu sendiri. */
			display: flex;
			align-items: center;
			justify-content: center;
			pointer-events: none;
		}
		.md-globe-stage .md-cta { pointer-events: auto; }
		.md-backdrop,
		.md-stars {
			position: absolute;
			inset: 0;
			pointer-events: none;
		}
		.md-backdrop {
			background: var(--md-ground);
		}
		/* Hero (kamera globe): antarmuka peta disembunyikan KERAS — lihat
		   `is-hero` di effect. Visibility, bukan opacity, supaya tak bentrok
		   dengan tween yang memudarkannya masuk. */
		.md-sticky.is-hero .im-hud,
		.md-sticky.is-hero .im-vignette,
		.md-sticky.is-hero .im-grain {
			visibility: hidden;
		}
		/* Marker hanya ada di peta yang sudah mendarat — juga selama menukik,
		   supaya tiap penyelaman sama dengan yang pertama. */
		.md-sticky:not(.is-landed) .maplibregl-marker {
			visibility: hidden;
		}
		/* Lebih lebar dari layar: tepi lapisan tak terlihat saat bergeser. */
		.md-stars-far,
		.md-stars-near {
			inset: -48px;
			will-change: transform;
		}
		/* Judul di backdrop: satu lapis dengan kanvas peta (z-index 0) dan
		   datang lebih dulu di DOM, jadi bumi tergambar DI ATAS-nya. */
		.im-stage .md-title {
			z-index: 0;
		}
		.md-star {
			position: absolute;
			border-radius: 9999px;
			background: #cdd8e6;
			opacity: 0.5;
			animation: md-twinkle 4s ease-in-out infinite;
		}
		.md-star.is-bright {
			background: #f2f6ff;
			box-shadow: 0 0 6px 1px rgba(210, 225, 255, 0.55);
			animation-name: md-twinkle-bright;
		}
		@keyframes md-twinkle-bright {
			0%, 100% { opacity: 0.45; }
			50% { opacity: 1; }
		}
		@keyframes md-twinkle {
			0%, 100% { opacity: 0.12; }
			50% { opacity: 0.65; }
		}
		/* Satu lebar untuk garis eyebrow (atas) dan garis statistik (bawah):
		   ujung kiri-kanan keduanya sejajar. */
		.md-globe-stage {
			--md-rule-w: min(1400px, 88vw);
		}
		.md-eyebrow {
			position: absolute;
			top: 10svh;
			left: 50%;
			transform: translateX(-50%);
			width: var(--md-rule-w);
			display: flex;
			align-items: center;
			justify-content: center;
			gap: 1.5rem;
			z-index: 3;
			margin: 0;
			font-family: var(--font-body);
			font-weight: 800;
			font-size: clamp(0.85rem, 1.8vw, 1.3rem);
			letter-spacing: 0.12em;
			text-transform: uppercase;
			color: #fff;
		}
		.md-eyebrow::before,
		.md-eyebrow::after {
			content: "";
			flex: 1;
			height: 1px;
			background: rgba(255, 255, 255, 0.55);
			/* Dilukis dari sisi teks ke luar saat kemunculan (--md-rule 0→1). */
			transform: scaleX(var(--md-rule, 1));
		}
		.md-eyebrow::before { transform-origin: right center; }
		.md-eyebrow::after { transform-origin: left center; }
		.md-title {
			position: absolute;
			z-index: 1;
			top: 11.5svh;
			left: 0;
			right: 0;
			margin: 0;
			text-align: center;
			font-family: "Postoni Wide", var(--font-display);
			font-style: normal;
			font-synthesis: none;
			text-transform: uppercase;
			line-height: 0.98;
			letter-spacing: -0.04em;
			font-size: clamp(4rem, 15vw, 17rem);
			white-space: nowrap;
			background: linear-gradient(to bottom, #ffffff 42%, #c9ced4 62%, #6d737b 80%, #3a3e44);
			-webkit-background-clip: text;
			background-clip: text;
			color: transparent;
			pointer-events: none;
			user-select: none;
		}
		.md-sub {
			position: absolute;
			z-index: 3;
			top: 35.5svh;
			left: 50%;
			transform: translateX(-50%);
			margin: 0;
			width: max-content;
			max-width: min(60rem, 94vw);
			padding: 0 1.5rem;
			text-align: center;
			font-family: var(--font-body);
			font-weight: 700;
			font-size: clamp(0.95rem, 1.6vw, 1.15rem);
			line-height: 1.55;
			color: #fff;
			text-shadow: 0 1px 18px rgba(0, 0, 0, 0.6);
		}
		.md-meta {
			position: absolute;
			z-index: 3;
			left: 50%;
			transform: translateX(-50%);
			top: 50svh;
			width: var(--md-rule-w);
			display: flex;
			justify-content: space-between;
			align-items: flex-end;
			margin: 0;
			padding-bottom: 1.1rem;
		}
		/* Sama dengan garis eyebrow: 1px putih 55%, dilukis dari tengah. */
		.md-meta::after {
			content: "";
			position: absolute;
			left: 0;
			right: 0;
			bottom: 0;
			height: 1px;
			background: rgba(255, 255, 255, 0.55);
			transform: scaleX(var(--md-rule, 1));
			transform-origin: center;
		}
		.md-meta-block { display: flex; flex-direction: column; gap: 0.25rem; }
		.md-meta-block .kicker { opacity: 0.55; }
		.md-meta-block.right { text-align: right; }
		.md-meta-num {
			font-family: "Postoni Wide", var(--font-display);
			font-size: clamp(1.05rem, 2vw, 1.5rem);
			color: #fff;
			line-height: 1.1;
			letter-spacing: -0.01em;
		}
		.md-cta {
			position: absolute;
			z-index: 4;
			bottom: 14svh;
			left: 50%;
			transform: translateX(-50%);
		}
		.md-cta-box { position: relative; display: inline-block; padding: 7px; }
		.md-cta-box i {
			position: absolute;
			width: 15px;
			height: 15px;
			border: 0 solid color-mix(in srgb, var(--fg) 75%, transparent);
			pointer-events: none;
		}
		.md-cta-box .tl { top: 0; left: 0; border-top-width: 1px; border-left-width: 1px; }
		.md-cta-box .tr { top: 0; right: 0; border-top-width: 1px; border-right-width: 1px; }
		.md-cta-box .bl { bottom: 0; left: 0; border-bottom-width: 1px; border-left-width: 1px; }
		.md-cta-box .br { bottom: 0; right: 0; border-bottom-width: 1px; border-right-width: 1px; }
		.md-cta button {
			display: block;
			border: 1px solid color-mix(in srgb, #fff 40%, transparent);
			border-radius: 6px;
			background: rgba(18, 20, 25, 0.55);
			backdrop-filter: blur(8px);
			color: #fff;
			font-family: var(--font-mono, monospace);
			font-size: 0.72rem;
			letter-spacing: 0.18em;
			text-transform: uppercase;
			padding: 0.95rem 1.8rem;
			cursor: pointer;
			transition: border-color 0.4s, background 0.4s;
		}
		.md-cta button:hover {
			border-color: var(--safelight);
			background: color-mix(in srgb, var(--safelight) 16%, transparent);
		}
		@media (max-width: 639px) {
			.md-track { height: 180svh; }
			/* Vertikal disusun ulang supaya tidak saling tindih: eyebrow 7svh,
			   judul 10.5svh, sub 27svh, statistik 24svh & CTA 12svh dari bawah.
			   Sebelumnya judul & eyebrow sama-sama di 24svh, dan garis statistik
			   jatuh tepat di atas tombol CTA. */
			.md-eyebrow { top: 7svh; gap: 0.75rem; font-size: 0.72rem; }

			.md-title {
				top: 10.5svh;
				font-size: clamp(2.8rem, 14.5vw, 4.2rem);
			}
			.md-sub { top: 27svh; font-size: 0.92rem; line-height: 1.6; }
			.md-meta {
				top: auto;
				bottom: 24svh;
				padding-bottom: 0.8rem;
			}
			.md-cta { bottom: 12svh; }
			.md-cta button {
				white-space: nowrap;
				font-size: 0.66rem;
				padding: 0.85rem 1.4rem;
			}
		}
		@media (prefers-reduced-motion: reduce) {
			.md-track { height: auto; }
			.md-sticky { position: relative; height: 100svh; }
			.md-star { animation: none; }
		}
	</style>
</svelte:head>

<section bind:this={wrapEl} class="md-track">
	<div bind:this={stageEl} class="md-sticky">
		<div bind:this={mapLayer} class="md-map">
			<IndonesiaMap bare bind:this={mapRef}>
				{#snippet backdrop()}
					<!-- Di BELAKANG kanvas globe: langit dan judul besar terlihat di
						sekitar bumi dan tertutup bumi yang naik di atasnya. -->
					<div class="md-backdrop" aria-hidden="true">
						<div bind:this={starsFarEl} class="md-stars md-stars-far"></div>
						<div bind:this={starsNearEl} class="md-stars md-stars-near"></div>
					</div>
					<h2 class="md-title">{title || t.title}</h2>
				{/snippet}
			</IndonesiaMap>
			<!-- Atmosfer bumi: cincin cahaya & kilau di tepi globe hero
				(posisi/ukuran/kecerahan diatur siklus siang–malam). -->
			<div class="md-rim" aria-hidden="true"></div>
		</div>

		<div bind:this={overlayEl} class="md-globe-stage">
			<p class="md-eyebrow">{eyebrow || t.eyebrow}</p>

			<p class="md-sub">{sub || t.sub}</p>

			<!-- Satu node stabil (bukan {#if}) supaya target tween scrub selalu
				ada sejak timeline dibuat; isi angkanya menyusul async. -->
			<div class="md-meta" aria-hidden={!points}>
				<div class="md-meta-block">
					<span class="kicker">{t.frames}</span>
					<span class="md-meta-num">{points ? `${frames} ${t.frames}` : "···"}</span>
				</div>
				<div class="md-meta-block right">
					<span class="kicker">{t.points}</span>
					<span class="md-meta-num">{points ? `${points} ${t.points}` : "···"}</span>
				</div>
			</div>

			<div class="md-cta">
				<span class="md-cta-box">
					<button type="button" use:scrambleHover onclick={land}>{t.land}</button><i class="tl" aria-hidden="true"></i><i class="tr" aria-hidden="true"></i><i class="bl" aria-hidden="true"></i><i class="br" aria-hidden="true"></i>
				</span>
			</div>
		</div>
	</div>

</section>
