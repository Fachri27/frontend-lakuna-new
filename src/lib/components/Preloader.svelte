<script lang="ts">
	import { soundOn } from "$lib/sound.svelte";
	/**
	 * Preloader: lensa kamera yang membuka diafragmanya — port dari
	 * apps/front-lakuna/app/landing/preloader.tsx.
	 *
	 * Satu SVG selayar. Badan lensa digambar di ruang satuan (rumah diafragma
	 * berjari-jari 100) lalu diskalakan ke layar, jadi semua cincin, angka f, dan
	 * ukirannya tetap sebanding di ukuran layar apa pun:
	 *
	 *   140  badan luar          129–139  grip bergerigi
	 *   ≈120 skala diafragma     113      cincin depan berukir
	 *   100  rumah diafragma — 9 bilah logam melengkung
	 *
	 * Urutannya:
	 *   1. Selagi halaman dimuat, cincin skala berputar dari f/16 ke f/1.4 di bawah
	 *      penanda oranye — putaran itu sekaligus indikator progres.
	 *   2. Bilah membuka sambil memutar; beranda terlihat melalui lubangnya. Lubang
	 *      itu nyata: seluruh lensa dan latarnya dimasker oleh bentuk lubang yang
	 *      sama dengan tepi dalam bilah.
	 *   3. Kamera menukik masuk: lensa membesar sampai lubangnya melampaui layar.
	 *
	 * Kapan tampil — hanya di beranda, diputuskan oleh script kecil di <head>
	 * SEBELUM overlay dilukis:
	 *   - tampil  saat halaman di-refresh, atau dibuka langsung / dari situs lain;
	 *   - lewati  saat datang lewat tautan di dalam situs, Back/Forward, atau
	 *             pengguna meminta gerak minimal.
	 * Script itu hanya ikut di HTML hasil SSR, jadi navigasi sisi klien tidak
	 * pernah memicunya. Tandanya (`data-preload="play"` di <html>) dihapus begitu
	 * preloader selesai.
	 *
	 * Prop `heroReady`: lensa membuka ke foto hero beranda, jadi pembukaan
	 * menunggu gambar hero FINAL selesai dimuat (dilaporkan Home via ApiImage
	 * onload/onerror) — kalau tidak, lubang menghadap hero yang masih kosong.
	 * Selama prop ini dikirim, HANYA ia yang ditunggu — bukan event `load` halaman,
	 * yang bisa tertahan aset lain (font, gambar di bawah lipatan) tanpa ada
	 * hubungannya dengan hero. Tanpa prop, lensa menunggu `load` seperti biasa.
	 * MAX_WAIT_MS hanya pengaman untuk hero yang tak kunjung datang.
	 */
	let { heroReady }: { heroReady?: boolean } = $props();

	const BLADES = 9;
	const R = 100; // jari-jari rumah diafragma, dalam satuan lensa
	const LENS_OUTER = 140;
	const STEP = (Math.PI * 2) / BLADES;

	/** Jari-jari badan lensa relatif sisi terpendek layar (sisakan ruang readout). */
	const LENS_FILL = 0.43;
	const OPEN_R = 78; // lubang saat terbuka penuh, sebelum menukik
	const SWEEP_CLOSED = 1.25; // lengkung spiral bilah saat tertutup (radian)
	const SWEEP_OPEN = 0.45;

	const MIN_MS = 900; // selalu tampil sebentar, supaya bukan kedipan
	// Pengaman, bukan jadwal: 3,5 dtk dulu terlalu pendek untuk API dan gambar
	// lewat tunnel, sehingga lensa membuka ke hero yang masih hitam.
	const MAX_WAIT_MS = 12000;
	const OPEN_MS = 950;
	const ZOOM_DELAY_MS = 600; // menukik mulai sebelum bilah selesai membuka
	const ZOOM_MS = 800;

	const F_STOPS = ["16", "11", "8", "5.6", "4", "2.8", "2", "1.4"];
	const STOP_DEG = 16;
	/** Putaran cincin skala saat f/16 berada di bawah penanda. */
	const RING_START_DEG = STOP_DEG * (F_STOPS.length - 1);

	const EARLY_SCRIPT = `try{var n=performance.getEntriesByType&&performance.getEntriesByType("navigation")[0],t=n&&n.type||"navigate",i=false;try{i=!!document.referrer&&new URL(document.referrer).origin===location.origin}catch(e){}if(!matchMedia("(prefers-reduced-motion: reduce)").matches&&(t==="reload"||(t==="navigate"&&!i))){document.documentElement.dataset.preload="play"}}catch(e){}`;
	// Tag penutup dipecah supaya parser komponen tidak mengira blok script ini selesai.
	const EARLY_TAG = "<script>" + EARLY_SCRIPT + "</" + "script>";

	type Point = [number, number];

	const polar = (radius: number, angle: number): Point => [radius * Math.cos(angle), radius * Math.sin(angle)];
	const fmt = ([x, y]: Point) => `${x.toFixed(2)} ${y.toFixed(2)}`;

	/**
	 * Jalur 9 bilah dan lubang di antaranya.
	 *
	 * Bilah ke-i: tepi dalam berupa busur dari V_i ke V_{i+1} (lubangnya membulat,
	 * bukan segi sembilan tajam), sambungan melengkung ke badan di sudut yang
	 * digeser `sweep`, busur luar mundur, lalu sambungan kembali. Sambungan
	 * ke-(i+1) dipakai bersama bilah berikutnya, jadi bilah-bilahnya menutup
	 * cincin tanpa celah dan sambungannya membentuk spiral.
	 */
	function irisPaths(r: number, sweep: number, rotation: number) {
		const holeArc = Math.max(r * 1.35, 0.001);
		const mid = (r + R) / 2;
		let hole = "";
		const blades: string[] = [];

		for (let i = 0; i < BLADES; i += 1) {
			const a0 = rotation + i * STEP - Math.PI / 2;
			const a1 = a0 + STEP;
			const v0 = polar(r, a0);
			const v1 = polar(r, a1);
			const o0 = polar(R, a0 + sweep);
			const o1 = polar(R, a1 + sweep);
			const c0 = polar(mid, a0 + sweep * 0.45);
			const c1 = polar(mid, a1 + sweep * 0.45);

			hole += `${i === 0 ? `M ${fmt(v0)} ` : ""}A ${holeArc.toFixed(2)} ${holeArc.toFixed(2)} 0 0 1 ${fmt(v1)} `;
			blades.push(
				`M ${fmt(v0)} A ${holeArc.toFixed(2)} ${holeArc.toFixed(2)} 0 0 1 ${fmt(v1)} ` +
					`Q ${fmt(c1)} ${fmt(o1)} A ${R} ${R} 0 0 0 ${fmt(o0)} Q ${fmt(c0)} ${fmt(v0)} Z`
			);
		}

		return { hole: `${hole}Z`, blades };
	}

	const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
	const easeInCubic = (t: number) => t * t * t;
	const clamp01 = (t: number) => Math.min(1, Math.max(0, t));

	let rootEl = $state<HTMLDivElement>();
	/** true begitu JS menggambar lensa: latar tinta polos diganti SVG bermasker. */
	let live = $state(false);
	let svgEl = $state<SVGSVGElement>();
	let lensEl = $state<SVGGElement>();
	let maskGroupEl = $state<SVGGElement>();
	let holeEl = $state<SVGPathElement>();
	let bladesEl = $state<SVGGElement>();
	let ringEl = $state<SVGGElement>();
	let glassEl = $state<SVGGElement>();
	let decorEl = $state<SVGGElement>();
	let done = $state(false);

	// Bunyi lensa kebuka — static/sounds/lens-open.mp3, diputar saat diafragma
	// mulai membuka. Browser memblokir audio sebelum pengunjung berinteraksi, dan
	// preloader justru hanya jalan saat refresh/kunjungan langsung (lihat
	// EARLY_SCRIPT), jadi izinnya diperiksa diam-diam selagi lensa menunggu:
	//   - diizinkan → bunyi diputar otomatis saat membuka;
	//   - diblokir  → muncul "Ketuk untuk suara". Ketukan, klik, atau tombol apa
	//                 pun langsung membuka lensa sambil berbunyi; tanpa ketukan,
	//                 lensa tetap membuka sendiri tanpa suara.
	// Bunyi TIDAK diantrekan ke klik berikutnya: bunyi lensa yang tiba-tiba muncul
	// di tengah halaman yang sudah terbuka justru mengejutkan.
	const LENS_OPEN_SRC = "/sounds/lens-open.mp3";
	const LENS_VOLUME = 0.7;
	/** Bila petunjuk ketuk muncul, lensa menunggu lebih lama supaya sempat terbaca. */
	const HINT_MIN_MS = 2400;
	/** Pemeriksaan izin yang belum selesai selama ini dianggap diblokir. */
	const PROBE_TIMEOUT_MS = 1500;

	let hint = $state(false);

	/**
	 * Periksa apakah browser mengizinkan audio tanpa gerakan pengguna: putar
	 * berkasnya dengan volume 0, lalu hentikan. Volume 0 tetap dihitung audio
	 * bersuara, jadi hasilnya jujur. iOS mengabaikan `volume`, tapi iOS juga tidak
	 * pernah mengizinkan autoplay bersuara, jadi ditolak sebelum ada yang terdengar.
	 *
	 * `taken` = bunyi aslinya sudah diputar sementara pemeriksaan berjalan; kalau
	 * begitu elemennya dibiarkan, bukan dihentikan.
	 */
	function canAutoplay(el: HTMLAudioElement, taken: () => boolean): Promise<boolean> {
		return new Promise((resolve) => {
			let settled = false;
			const settle = (ok: boolean) => {
				if (settled) return;
				settled = true;
				resolve(ok);
			};
			const restore = () => {
				if (taken()) return;
				el.pause();
				try {
					el.currentTime = 0;
				} catch {
					/* metadata belum siap */
				}
				el.volume = LENS_VOLUME;
			};

			el.volume = 0;
			try {
				el.play().then(
					() => {
						restore();
						settle(true);
					},
					() => {
						if (!taken()) el.volume = LENS_VOLUME;
						settle(false);
					}
				);
			} catch {
				el.volume = LENS_VOLUME;
				settle(false);
			}
			window.setTimeout(() => settle(false), PROBE_TIMEOUT_MS);
		});
	}

	$effect(() => {
		const root = rootEl;
		const svg = svgEl;
		const lens = lensEl;
		const maskGroup = maskGroupEl;
		const hole = holeEl;
		const bladeGroup = bladesEl;
		const ring = ringEl;
		const glass = glassEl;
		const decor = decorEl;
		if (!root || !svg || !lens || !maskGroup || !hole || !bladeGroup || !ring || !glass || !decor) return;

		const html = document.documentElement;
		if (html.dataset.preload !== "play") {
			done = true;
			return;
		}

		const blades = Array.from(bladeGroup.querySelectorAll<SVGPathElement>("path"));
		live = true;

		const previousOverflow = html.style.overflow;
		html.style.overflow = "hidden";

		const state = {
			r: 0,
			sweep: SWEEP_CLOSED,
			rotation: 0,
			zoom: 1,
			ring: RING_START_DEG,
			glass: 1,
			decor: 1
		};

		const apply = () => {
			const w = window.innerWidth;
			const h = window.innerHeight;
			svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
			const scale = (Math.min(w, h) * LENS_FILL) / LENS_OUTER;
			const transform = `translate(${(w / 2).toFixed(1)} ${(h / 2).toFixed(1)}) scale(${(scale * state.zoom).toFixed(4)})`;
			lens.setAttribute("transform", transform);
			maskGroup.setAttribute("transform", transform);

			const paths = irisPaths(state.r, state.sweep, state.rotation);
			hole.setAttribute("d", paths.hole);
			blades.forEach((blade, i) => blade.setAttribute("d", paths.blades[i]));

			ring.setAttribute("transform", `rotate(${state.ring.toFixed(2)})`);
			glass.style.opacity = state.glass.toFixed(3);
			decor.style.opacity = state.decor.toFixed(3);
		};

		apply();
		window.addEventListener("resize", apply);

		let frame = 0;
		let cancelled = false;
		let loaded = document.readyState === "complete";
		const onLoad = () => {
			loaded = true;
		};
		window.addEventListener("load", onLoad);

		// Isi di balik lensa siap dilihat. Prop dibaca saat dipanggil, jadi nilainya
		// selalu yang terbaru.
		function contentReady() {
			return heroReady === undefined ? loaded : heroReady;
		}

		// Bunyi lensa dimuat sejak awal fase loading supaya tidak ada jeda jaringan
		// saat diafragma membuka.
		let lensAudio: HTMLAudioElement | null = null;
		try {
			lensAudio = new Audio(LENS_OPEN_SRC);
			lensAudio.preload = "auto";
			lensAudio.volume = LENS_VOLUME;
			lensAudio.addEventListener("error", () => {
				if (import.meta.env.DEV) console.warn("[lens] gagal memuat file audio:", LENS_OPEN_SRC);
			});
			lensAudio.load();
		} catch {
			lensAudio = null;
		}

		let sound: "checking" | "auto" | "blocked" = lensAudio ? "checking" : "blocked";
		let opening = false;
		let played = false;

		const playLensOpen = () => {
			if (!lensAudio || played || !soundOn()) return;
			played = true;
			lensAudio.volume = LENS_VOLUME;
			try {
				lensAudio.currentTime = 0;
			} catch {
				/* metadata belum siap — tetap coba putar */
			}
			void lensAudio.play().catch(() => {});
		};

		if (lensAudio) {
			void canAutoplay(lensAudio, () => played).then((ok) => {
				if (cancelled || opening) return;
				sound = ok ? "auto" : "blocked";
				hint = !ok;
			});
		}

		// Ketukan adalah gerakan pengguna yang membuka izin audio. Kalau hero
		// sudah tampil, bunyikan dan buka lensa saat itu juga; kalau belum,
		// tandai izinnya (lensa tetap menunggu hero di wait loop, lalu membuka
		// DENGAN bunyi) — jangan membuka ke lubang hitam.
		const onTap = () => {
			if (opening || !lensAudio || sound !== "blocked") return;
			sound = "auto";
			hint = false;
			if (!contentReady()) return;
			playLensOpen();
			open(performance.now());
		};
		const stopListening = () => {
			window.removeEventListener("pointerdown", onTap, true);
			window.removeEventListener("keydown", onTap, true);
		};
		window.addEventListener("pointerdown", onTap, true);
		window.addEventListener("keydown", onTap, true);

		const finish = () => {
			html.style.overflow = previousOverflow;
			// Kembali ke beranda lewat navigasi sisi klien tidak memutarnya lagi.
			delete html.dataset.preload;
			done = true;
		};

		const open = (t0: number) => {
			opening = true;
			hint = false;
			stopListening();
			// Aba-aba untuk beranda: riak air di seluruh hero.
			window.dispatchEvent(new Event("lakuna:lens-open"));
			// Blitz kamera kini menyala DI HERO (Home, .hero-flash), bukan di
			// atas lensa — lensa tak ikut tersiram putih.
			if (sound === "auto") playLensOpen();
			// Ketukan bisa datang sebelum cincin sampai di f/1.4: selesaikan putarannya
			// bersama bukaan, bukan melompat.
			const ringFrom = state.ring;
			// Lubang harus melampaui setengah diagonal layar agar tidak ada tepi tersisa.
			const zoomMax = () => {
				const w = window.innerWidth;
				const h = window.innerHeight;
				const scale = (Math.min(w, h) * LENS_FILL) / LENS_OUTER;
				return (Math.hypot(w, h) / 2 / (OPEN_R * Math.cos(Math.PI / BLADES) * scale)) * 1.08;
			};

			const step = (now: number) => {
				if (cancelled) return;
				const elapsed = now - t0;
				// Pengaman macet: di perangkat lambat rAF bisa seret hingga fase
				// menukik (busur raksasa) terlihat berlama-lama. Paksa selesai
				// setelah 5 detik dinding apa pun yang terjadi.
				if (performance.now() - t0 > 5000) {
					finish();
					return;
				}
				const o = easeInOutCubic(clamp01(elapsed / OPEN_MS));
				state.r = OPEN_R * o;
				state.sweep = SWEEP_CLOSED + (SWEEP_OPEN - SWEEP_CLOSED) * o;
				state.rotation = -0.25 * o;
				state.ring = ringFrom * (1 - o);
				state.glass = 1 - o;

				const zt = clamp01((elapsed - ZOOM_DELAY_MS) / ZOOM_MS);
				state.zoom = 1 + (zoomMax() - 1) * easeInCubic(zt);
				// Dekorasi (ring, angka, ukiran) hilang di sepertiga awal
				// menukik: kalau ikut membesar sampai akhir, yang tersisa di
				// layar hanya busur-busur raksasa tanpa konteks. Bilah + lubang
				// yang mengantar reveal, bukan cincinnya.
				state.decor = 1 - clamp01(zt * 3);

				apply();

				if (elapsed < ZOOM_DELAY_MS + ZOOM_MS) frame = requestAnimationFrame(step);
				else finish();
			};
			frame = requestAnimationFrame(step);
		};

		// Cincin skala berputar pelan menuju f/1.4 selagi memuat; begitu halaman
		// siap dan cincinnya sampai, diafragma membuka.
		const start = performance.now();
		let progress = 0;
		const wait = (now: number) => {
			if (cancelled || opening) return;
			const elapsed = now - start;
			// Jangan membuka ke lubang hitam — tunggu foto hero tampil.
			const ready = contentReady() && elapsed >= (sound === "blocked" ? HINT_MIN_MS : MIN_MS);
			const target = ready ? 1 : Math.min(0.85, elapsed / 1600);
			progress += (target - progress) * 0.1;
			state.ring = RING_START_DEG * (1 - progress);
			apply();

			if ((ready && progress > 0.99) || elapsed > MAX_WAIT_MS) {
				open(now);
				return;
			}
			frame = requestAnimationFrame(wait);
		};
		frame = requestAnimationFrame(wait);

		return () => {
			cancelled = true;
			cancelAnimationFrame(frame);
			window.removeEventListener("load", onLoad);
			window.removeEventListener("resize", apply);
			stopListening();
			html.style.overflow = previousOverflow;
			delete html.dataset.preload;
		};
	});
</script>

<svelte:head>
	{@html EARLY_TAG}
	<!-- Catatan: JANGAN tambah <link rel="preload" as="audio"> untuk bunyi lensa:
	     Chrome tidak menerima `audio` sebagai nilai `as` dan membanjiri console
	     dengan warning "unsupported as value". Fetch awal sudah ditangani
	     `lensAudio.load()` di effect (elemen Audio dibuat + load sejak fase
	     loading), jadi tidak ada yang hilang. -->
</svelte:head>

{#if !done}
	<div bind:this={rootEl} class="l-pre" class:is-live={live} aria-hidden="true">
		<svg bind:this={svgEl} class="l-pre__svg" preserveAspectRatio="none">
			<defs>
				<!-- Putih = tertutup overlay, hitam = lubang tempat beranda terlihat.
				     Wilayah mask sebesar layar saja: wilayah raksasa (±100000) diabaikan
				     Chrome, dan lubangnya jadi tidak tembus. -->
				<mask id="l-pre-hole" maskUnits="userSpaceOnUse" x="0" y="0" width="100%" height="100%">
					<rect x="0" y="0" width="100%" height="100%" fill="white" />
					<g bind:this={maskGroupEl}>
						<path bind:this={holeEl} fill="black" />
					</g>
				</mask>

				<!-- Bilah logam: kilap tegas di satu sisi, gelap di sisi lain —
				     dulu rentang #2c→#09 nyaris hilang di atas latar hitam. -->
				<linearGradient id="l-pre-metal" gradientTransform="rotate(35)">
					<stop offset="0" stop-color="#5a5a60" />
					<stop offset="0.22" stop-color="#2e2e33" />
					<stop offset="0.6" stop-color="#141417" />
					<stop offset="1" stop-color="#0a0a0c" />
				</linearGradient>
				<radialGradient id="l-pre-barrel" cx="0.35" cy="0.25" r="0.9">
					<stop offset="0" stop-color="#26262a" />
					<stop offset="0.7" stop-color="#121214" />
					<stop offset="1" stop-color="#0b0b0d" />
				</radialGradient>
				<radialGradient id="l-pre-vignette" cx="0.5" cy="0.5" r="0.75">
					<stop offset="0" stop-color="#15151a" />
					<stop offset="1" stop-color="#050506" />
				</radialGradient>

				<radialGradient id="l-pre-glass" cx="0.32" cy="0.28" r="0.8">
					<stop offset="0" stop-color="#ffffff" stop-opacity="0.16" />
					<stop offset="0.35" stop-color="#ffffff" stop-opacity="0.04" />
					<stop offset="1" stop-color="#ffffff" stop-opacity="0" />
				</radialGradient>

				<path id="l-pre-engrave" d="M -107 0 A 107 107 0 1 1 107 0 A 107 107 0 1 1 -107 0" />
			</defs>

			<g mask="url(#l-pre-hole)">
				<g bind:this={lensEl}>
					<rect class="l-pre__bg" x="-5000" y="-5000" width="10000" height="10000" />
					<circle r="420" fill="url(#l-pre-vignette)" />

					<g bind:this={decorEl}>
						<circle class="l-pre__barrel" r={LENS_OUTER} />
						<circle class="l-pre__grip" r="134" pathLength="360" />
						<circle class="l-pre__scale" r="124.5" />

						<g bind:this={ringEl}>
							{#each F_STOPS as stop, i (stop)}
								<text
									class="l-pre__stop"
									text-anchor="middle"
									transform={`rotate(${(i - (F_STOPS.length - 1)) * STOP_DEG}) translate(0 -117)`}
								>
									{stop}
								</text>
							{/each}
						</g>

						<polygon class="l-pre__index" points="0,-127 -2.6,-131.6 2.6,-131.6" />

						<circle class="l-pre__front" r="113" />
						<text class="l-pre__engrave" text-anchor="middle">
							<textPath href="#l-pre-engrave" startOffset="25%">
								ARSIP VISUAL NUSANTARA · 35mm 1:1.4 · ⌀58
							</textPath>
						</text>

						<circle class="l-pre__housing" r="102" />
					</g>

					<g bind:this={bladesEl}>
						{#each { length: BLADES } as _, i (i)}
							<path class="l-pre__blade" />
						{/each}
					</g>

					<g bind:this={glassEl} class="l-pre__glass">
						<circle r={R} fill="url(#l-pre-glass)" />
					</g>
				</g>
			</g>
		</svg>

		<p class="l-pre__hint" class:is-on={hint}>Ketuk untuk suara</p>
	</div>
{/if}

<style>
	/* Lensa selalu gelap, apa pun temanya. Di atas segalanya: HUD peta Nusantara
	   memakai z-index sampai 2000 dan galeri orbit 9999. Semua ukuran di bawah
	   dalam satuan lensa (rumah diafragma = 100), bukan piksel layar. */
	.l-pre {
		--pre-ink: #0a0a0a;
		--pre-paper: 243, 243, 243;
		position: fixed;
		inset: 0;
		z-index: 10000;
		display: none;
		/* Sebelum JS menggambar lensa, tinta polos yang menutup layar. */
		background: var(--pre-ink);
	}

	/* Tersembunyi kecuali script di <head> menandai <html> untuk memutar
	   preloader (refresh atau kunjungan langsung). */
	:global(html[data-preload="play"]) .l-pre {
		display: block;
	}

	/* Lewat class directive, bukan atribut `data-js` yang dipasang dari JS: Svelte
	   membuang selektor yang tidak cocok dengan template, jadi aturan atribut itu
	   hilang dari CSS dan latar tinta menutupi lubang lensa — halaman tak pernah
	   terlihat selama bilah membuka. */
	.l-pre.is-live {
		background: transparent;
	}

	.l-pre__svg {
		position: absolute;
		inset: 0;
		display: block;
		width: 100%;
		height: 100%;
	}

	/* HTML hasil SSR tampil sebelum JS hydrate: selama itu lensa belum punya
	   viewBox/transform dari apply(), jadi pusatnya di (0,0) — pojok kiri atas.
	   Sembunyikan sampai JS memosisikannya; yang terlihat hanya tinta polos. */
	.l-pre:not(.is-live) .l-pre__svg {
		visibility: hidden;
	}

	.l-pre__bg {
		fill: var(--pre-ink);
	}

	/* --- badan lensa (hanya penanda + ukiran yang tersisa) --- */

	.l-pre__bg {
		fill: #050506;
	}
	.l-pre__barrel {
		fill: url(#l-pre-barrel);
		stroke: rgba(var(--pre-paper), 0.16);
		stroke-width: 0.7;
	}

	/* pathLength 360: 0.55 + 0.45 = satu gerigi per derajat. */
	.l-pre__grip {
		fill: none;
		stroke: #2f2f34;
		stroke-width: 9;
		stroke-dasharray: 0.55 0.45;
	}

	.l-pre__scale {
		fill: #101010;
		stroke: rgba(var(--pre-paper), 0.06);
		stroke-width: 0.5;
	}

	.l-pre__stop {
		font-family: var(--font-mono);
		font-size: 7.4px;
		font-weight: 600;
		fill: rgba(var(--pre-paper), 0.82);
	}

	.l-pre__index {
		fill: var(--safelight-lamp);
	}

	.l-pre__front {
		fill: #0c0c0c;
		stroke: rgba(var(--pre-paper), 0.05);
		stroke-width: 0.5;
	}

	.l-pre__engrave {
		font-family: var(--font-mono);
		font-size: 4.8px;
		letter-spacing: 0.18em;
		fill: rgba(var(--pre-paper), 0.6);
	}

	.l-pre__housing {
		fill: #050505;
		stroke: rgba(var(--pre-paper), 0.08);
		stroke-width: 0.5;
	}

	/* --- diafragma --- */

	.l-pre__blade {
		fill: url(#l-pre-metal);
		stroke: rgba(var(--pre-paper), 0.26);
		stroke-width: 0.55;
		stroke-linejoin: round;
	}

	/* --- kaca --- */

	.l-pre__glass {
		pointer-events: none;
		mix-blend-mode: screen;
	}

	/* --- petunjuk suara --- */

	/* Di bawah lensa: tepi bawahnya ada di 50% + 0.42 × sisi terpendek layar. */
	.l-pre__hint {
		position: absolute;
		left: 50%;
		bottom: clamp(1.25rem, 3.2vh, 2.5rem);
		margin: 0;
		transform: translate(-50%, 6px);
		font-family: var(--font-mono);
		font-size: 0.75rem;
		letter-spacing: 0.08em;
		white-space: nowrap;
		color: rgba(var(--pre-paper), 0.72);
		opacity: 0;
		pointer-events: none;
		transition:
			opacity 0.4s ease,
			transform 0.4s ease;
	}

	.l-pre__hint.is-on {
		opacity: 1;
		transform: translate(-50%, 0);
	}

</style>
