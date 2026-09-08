<script lang="ts">
	import gsap from "gsap";
	import { ScrollTrigger } from "gsap/ScrollTrigger";
	import { imgFor, type Photo } from "$lib/data";

	gsap.registerPlugin(ScrollTrigger);

	/**
	 * GsapGallery — port harfiah dari apps/web/src/lib/components/GsapGallery.svelte.
	 * Foto mengorbit silinder 3D sambil pull-quote Fraunces terungkap kata demi kata.
	 *
	 * PENGGANDENGAN via CSS sticky (bukan GSAP pin): section diberi tinggi eksplisit
	 * (200vh), pinEl `sticky top-0 h-screen` nempel di viewport selama orbit lalu
	 * lepas otomatis. Pola sama dengan hero sticky di Home.
	 *
	 * Ekor 100vh di bawah pinEl dulu dihabiskan oleh FilmStripSeam yang menyusul;
	 * komponen itu sudah dicopot, jadi sekarang section Kategori di Home yang
	 * ditarik naik (-mt) menutupi ekor itu. Latar keduanya var(--darkroom) yang di
	 * mode gelap sama dengan latar halaman, jadi tumpang tindihnya tak berjejak.
	 *
	 * ScrollTrigger hanya dipakai untuk progress (trigger section, start "top top",
	 * end "bottom bottom"), tanpa `pin` — jadi tidak ada race pin-spacer ganda saat
	 * pin peta (IndonesiaMap) dibuat terlambat oleh fetch async. Effect + deps
	 * [count] + gsap.context revert me-reinit orbit bersih saat foto async
	 * tiba (count 0 → N).
	 */
	const MAX_IMG = 8;
	const SLICES = 10;

	const WORDS = [
		{ text: "Setiap", accent: false },
		{ text: "foto", accent: false },
		{ text: "adalah", accent: false },
		{ text: "cerita", accent: true },
		{ text: "yang", accent: false },
		{ text: "tak", accent: false },
		{ text: "terlupakan", accent: false }
	];

	function thumbUrl(p: Partial<Photo>, i: number): string {
		return imgFor(`lf${p.id ?? i}`, 400, 300, p.thumbUrl);
	}

	let { photos }: { photos: Photo[] } = $props();

	let sectionEl: HTMLElement | undefined = $state();
	let pinEl: HTMLDivElement | undefined = $state();
	const wraps = $state<(HTMLDivElement | null)[]>(Array.from({ length: MAX_IMG }, () => null));
	const wordEls = $state<(HTMLSpanElement | null)[]>(Array.from({ length: WORDS.length }, () => null));

	const count = $derived(Math.min(photos.length, MAX_IMG));

	$effect(() => {
		const sectionNode = sectionEl;
		const pinNode = pinEl;
		if (!sectionNode || !pinNode) return;
		// deps [count]: foto frontend datang async (latest fetch), tidak seperti web
		// yang sinkron. Tanpa dep, effect jalan sekali saat mount saat count=0
		// (section belum render) lalu tak pernah re-run → orbit kosong. gsap.context
		// me-revert context lama (kill ST lama) sebelum callback baru jalan —
		// re-init bersih. Tanpa GSAP pin → tidak ada pin-spacer yang bisa numpuk
		// atau berlomba dengan pin peta saat refresh.
		void count;

		const ctx = gsap.context(() => {
			const vw = window.innerWidth;

			// ── Mobile: kolase cetakan, bukan orbit ───────────────────────
			// Kedalaman 3D butuh lebar. Di 390px orbitnya cuma melewatkan satu-dua
			// foto kecil sekaligus sepanjang dua layar. Di ponsel section ini
			// berganti bentuk: delapan cetakan ditata bertumpuk miring seperti di
			// atas meja, semuanya terlihat sekaligus, kalimatnya di tengah. Tidak
			// bergantung timing scroll sama sekali.
			if (vw < 640) {
				const LAY = [
					{ l: 3, t: 2, w: 45, r: -3.5 },
					{ l: 53, t: 8, w: 41, r: 2.5 },
					{ l: 9, t: 23, w: 42, r: 2 },
					{ l: 51, t: 30, w: 45, r: -2 },
					{ l: 2, t: 58, w: 44, r: -2.5 },
					{ l: 54, t: 63, w: 41, r: 3 },
					{ l: 13, t: 79, w: 43, r: 2 },
					{ l: 52, t: 85, w: 40, r: -3 }
				];
				wraps.forEach((wrap, wi) => {
					if (!wrap) return;
					const spec = LAY[wi % LAY.length];
					wrap.innerHTML = "";
					wrap.className = "cvd-target";
					wrap.style.cssText = `
						position:absolute;
						left:${spec.l}%;
						top:${spec.t}%;
						width:${spec.w}%;
						aspect-ratio:3/2;
						background-image:url(${thumbUrl(photos[wi] ?? {}, wi)});
						background-size:cover;
						background-position:center;
						transform:rotate(${spec.r}deg);
						box-shadow:0 20px 44px -20px rgba(0,0,0,0.85);
						opacity:1;
					`;
				});
				return;
			}

			// ── Dimensi orbit ─────────────────────────────────────────────
			const rx = vw * 0.34;
			const rz = 500;
			const tiltY = 180;
			const offX = vw * 0.85;

			// Di layar sempit rumus desktop memberi 120px (vw*0.14 = 55px, lalu
			// dijepit ke minimum 120) — terbaca sebagai serpihan, bukan foto.
			// 42% lebar layar memberi 164px di 390px; dengan perspektif, saat foto
			// berada paling dekat ia merender ~370px, hampir selebar layar.
			const imgW =
				vw < 640
					? Math.min(Math.round(vw * 0.42), 200)
					: Math.min(Math.max(120, vw * 0.14), 210);
			const imgH = (imgW * 2) / 3;
			const orbitR = (vw * 0.34 + 500) / 2;
			const bendRad = imgW / orbitR;
			const cylR = orbitR;
			const sliceW = imgW / SLICES;
			const totalBendDeg = (bendRad * 180) / Math.PI;
			const stepDeg = totalBendDeg / SLICES;

			wraps.forEach((wrap, wi) => {
				if (!wrap) return;
				const src = thumbUrl(photos[wi] ?? {}, wi);
				wrap.innerHTML = "";
				wrap.style.cssText = `
					position:absolute;
					width:${imgW}px;
					height:${imgH}px;
					transform-style:preserve-3d;
					will-change:transform,opacity;
					opacity:0;
				`;
				for (let s = 0; s < SLICES; s++) {
					const sl = document.createElement("div");
					sl.className = "cvd-target";
					const displayW = sliceW + 1.5;
					const angle = (s - (SLICES - 1) / 2) * stepDeg;
					sl.style.cssText = `
						position:absolute;
						top:0;
						height:100%;
						width:${displayW.toFixed(1)}px;
						left:50%;
						margin-left:${(-displayW / 2).toFixed(1)}px;
						background-image:url(${src});
						background-size:${imgW.toFixed(1)}px ${imgH.toFixed(1)}px;
						background-position:${(-s * sliceW).toFixed(1)}px 0;
						transform-origin:50% 50% ${(-cylR).toFixed(1)}px;
						transform:rotateY(${angle.toFixed(2)}deg);
						backface-visibility:hidden;
						filter:saturate(0.92);
					`;
					wrap.appendChild(sl);
				}
			});

			wordEls.forEach((el) => {
				if (!el) return;
				gsap.set(el, { opacity: 0, filter: "blur(8px)" });
			});

			const entryAngle = Math.PI / 2;
			const stagger = 0.09;
			const totalRange = 1 + stagger * (count - 1);

			function getPos(t: number) {
				if (t <= 0.12) {
					const p = t / 0.12;
					return { x: -offX * (1 - p), y: tiltY, z: rz * p, rotY: 0 };
				}
				if (t <= 0.88) {
					const p = (t - 0.12) / 0.76;
					const angle = entryAngle - p * Math.PI * 2;
					return {
						x: Math.cos(angle) * rx,
						y: (Math.sin(angle) / 1) * tiltY * 0.5 + tiltY * 0.5,
						z: Math.sin(angle) * rz,
						rotY: p * Math.PI * 2
					};
				}
				const p = (t - 0.88) / 0.12;
				return { x: offX * p, y: tiltY, z: rz * (1 - p), rotY: Math.PI * 2 };
			}

			ScrollTrigger.create({
				trigger: sectionNode,
				// Dulu "top top": orbit baru mulai saat pin menempel di puncak
				// viewport. Padahal section ini sudah masuk layar satu layar penuh
				// sebelum itu — dan selama satu layar itu semua wrap ber-opacity 0.
				// Hasilnya jurang: peta naik, layar kosong gelap, baru fotonya
				// datang. Dimajukan supaya foto pertama sudah terbang masuk saat
				// peta masih pamit.
				start: "top 30%",
				end: "bottom bottom",
				onUpdate: (self) => {
					const progress = self.progress;

					// ── Foto ──────────────────────────────────────────────
					wraps.forEach((img, i) => {
						if (!img) return;
						const imgT = progress * totalRange - i * stagger;

						if (imgT <= 0 || imgT >= 1) {
							img.style.opacity = "0";
							return;
						}

						let alpha = 1;
						if (imgT < 0.06) alpha = imgT / 0.06;
						else if (imgT > 0.94) alpha = (1 - imgT) / 0.06;

						const pos = getPos(imgT);
						const rotDeg = ((pos.rotY * 180) / Math.PI).toFixed(1);

						img.style.transform = `translate3d(${pos.x.toFixed(1)}px,${pos.y.toFixed(1)}px,${pos.z.toFixed(1)}px) rotateY(${rotDeg}deg)`;
						img.style.opacity = String(alpha);
						img.style.zIndex = String(Math.round(pos.z + 600));
					});

					// ── Phrase ────────────────────────────────────────────
					const phraseStart = 0.25;
					const phraseEnd = 0.75;
					const phraseEl = pinNode.querySelector<HTMLElement>(".cg-phrase");

					if (phraseEl) {
						if (progress < phraseStart || progress > phraseEnd) {
							phraseEl.style.opacity = "0";
						} else {
							const globalP = (progress - phraseStart) / (phraseEnd - phraseStart);
							const travelY = 200;
							const yOffset = travelY * (0.5 - globalP);
							phraseEl.style.transform = `translateY(${yOffset.toFixed(1)}px)`;

							const revealEnd = 0.4;
							wordEls.forEach((w, wi) => {
								if (!w) return;
								if (globalP < revealEnd) {
									const revealP = globalP / revealEnd;
									const wordT = revealP * (wordEls.length + 4) - wi;
									const wP = Math.max(0, Math.min(1, wordT / 3));
									w.style.opacity = String(wP);
									w.style.filter = `blur(${(8 * (1 - wP)).toFixed(1)}px)`;
								} else {
									w.style.opacity = "1";
									w.style.filter = "blur(0px)";
								}
							});

							let alpha = 1;
							if (globalP < 0.1) alpha = globalP / 0.1;
							else if (globalP > 0.75) alpha = (1 - globalP) / 0.25;
							phraseEl.style.opacity = String(alpha);
						}
					}
				},
			});
		});

		return () => {
			ctx?.revert();
		};
	});
</script>

<svelte:head>
	<style>
		.cg-section {
			position: relative;
			min-height: 200vh;
			/* --bg, bukan --darkroom: --darkroom sengaja tetap gelap di kedua
			   tema, jadi di mode terang section ini jadi pelat hitam di tengah
			   halaman kertas. --bg adalah nada dasar halaman. */
			background: var(--bg);
		}
		.cg-pin {
			position: sticky;
			top: 0;
			width: 100%;
			height: 100vh;
			display: flex;
			align-items: center;
			justify-content: center;
			overflow: hidden;
		}
		.cg-stage {
			position: relative;
			width: 100%;
			height: 100%;
			display: flex;
			align-items: center;
			justify-content: center;
			perspective: 900px;
			perspective-origin: 50% 50%;
			transform-style: preserve-3d;
		}
		.cg-phrase {
			position: relative;
			z-index: 9999;
			transform: translateZ(600px);
			will-change: transform;
			pointer-events: none;
			text-align: center;
			/* Hanya identitas hurufnya yang disamakan dengan judul section lain;
			   font-size dan max-width DIBIARKAN seperti semula. Frasa ini duduk di
			   translateZ(600px) dengan perspective 900px, jadi semuanya diperbesar
			   900/(900−600) = 3×: max-width 620px saja sudah merender 1860px dan
			   meluber dari viewport 1710px. Angka di sini bukan ukuran layar. */
			font-family: var(--font-display);
			font-size: clamp(18px, 3vw, 32px);
			font-weight: 300;
			letter-spacing: -0.02em;
			color: var(--fg);
			line-height: 1.15;
			max-width: 600px;
			padding: 0 2rem;
			margin: 0;
			opacity: 0;
			/* Halo bernada halaman, bukan hitam pekat: frasa ini melayang di atas
			   foto-foto yang berterbangan, jadi ia butuh pemisah — tapi glow hitam
			   hanya benar kalau teksnya putih di atas latar gelap. */
			text-shadow:
				0 0 10px var(--bg),
				0 2px 26px var(--bg);
		}
		.word {
			display: inline-block;
			margin: 0 0.15em;
		}
		/* Sama dengan .serif-em di app.css: display italic 400, warna safelight. */
		/* ── Mobile ──────────────────────────────────────────────────────
		   Kedalaman 3D butuh lebar. Di 390px foto-fotonya jadi serpihan yang
		   tercecer dan frasanya terpotong di tengah kalimat — frasa duduk di
		   translateZ(600px) dengan perspective 900px, jadi kotak 600px merender
		   1800px, jauh melebihi layar. Ditambah ~2 layar hitam kosong karena
		   min-height 200vh.

		   Di mobile karusel 3D-nya disembunyikan dan frasanya berdiri sendiri
		   sebagai satu kalimat penuh. `transform: none` pakai !important karena
		   handler scroll menulis transform inline. */
		/* ── Mobile ──────────────────────────────────────────────────────
		   Tanpa orbit, section ini tidak butuh jarak scroll lagi: tingginya
		   satu layar, dan kolasenya ditata di dalam pin. Frasanya dibuat
		   terlihat permanen (di desktop opacity-nya digerakkan handler scroll
		   yang di mobile sudah tidak jalan) dan diberi alas radial supaya
		   terbaca di atas cetakan-cetakan di belakangnya. */
		@media (max-width: 639px) {
			.cg-section {
				min-height: 100svh;
			}
			.cg-phrase {
				opacity: 1 !important;
				transform: none !important;
				font-size: clamp(21px, 6.2vw, 28px);
				max-width: 17ch;
				padding: 0 1.25rem;
			}
			.cg-phrase::before {
				content: "";
				position: absolute;
				inset: -3rem -1.5rem;
				z-index: -1;
				border-radius: 50%;
				background: radial-gradient(58% 54% at 50% 50%, var(--bg) 46%, transparent 76%);
			}
		}
		.cg-accent-wrap .word {
			color: var(--color-safelight);
			font-style: italic;
			font-weight: 400;
		}
	</style>
</svelte:head>

<section bind:this={sectionEl} class="cg-section" id="circle-gallery">
	<div bind:this={pinEl} class="cg-pin">
		<div class="cg-stage">
			{#each photos.slice(0, MAX_IMG) as _, i}
				<div bind:this={wraps[i]}></div>
			{/each}

			<p class="cg-phrase">
				{#each WORDS as w, i}
					{#if w.accent}
						<span class="cg-accent-wrap">
							<span bind:this={wordEls[i]} class="word">{w.text}</span>
						</span>
					{:else}
						<span bind:this={wordEls[i]} class="word">{w.text}</span>
					{/if}
				{/each}
			</p>
		</div>
	</div>
</section>
