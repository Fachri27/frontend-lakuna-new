<script lang="ts">
import { probeCredit, coverBackground } from "$lib/creditCrop";
import { primePageTurn, playPageTurn, PAGE_TURN_VOLUME, PAGE_TURN_EXIT_VOLUME } from "$lib/pageTurn";
import gsap from "gsap";
	import { ScrollTrigger } from "gsap/ScrollTrigger";
	import { imgFor, type Photo } from "$lib/data";
	import { i18n } from "$lib/i18n.svelte";

	gsap.registerPlugin(ScrollTrigger);

	/**
	 * GsapGallery — port harfiah dari apps/web/src/lib/components/GsapGallery.svelte.
	 * Foto mengorbit silinder 3D sambil pull-quote Fraunces terungkap kata demi kata.
	 *
	 * PENGGANDENGAN via CSS sticky (bukan GSAP pin): section diberi tinggi eksplisit
	 * (160vh), pinEl `sticky top-0 h-screen` nempel di viewport selama orbit lalu
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

	// Kalimat orbit SELALU Inggris di kedua bahasa (permintaan pemilik).
	// Jumlah item kedua bahasa SAMA (10, termasuk jeda baris "\n") karena
	// wordEls dialokasikan sekali.
	// Aksen (>1) menandai kata ungu sesuai referensi.
	const PHRASE = {
		id: ["The", "earth", "is", "an", "art,", "\n", "we're", "only", "a", "witness"],
		en: ["The", "earth", "is", "an", "art,", "\n", "we're", "only", "a", "witness"],
	};
	const ACCENT = { id: [4, 8, 9], en: [4, 8, 9] };
	const WORDS = $derived(
		PHRASE[i18n.lang].map((text, i) => ({ text, br: text === "\n", accent: ACCENT[i18n.lang].includes(i) })),
	);

	function thumbUrl(p: Partial<Photo>, i: number): string {
		return imgFor(`lf${p.id ?? i}`, 400, 300, p.thumbUrl);
	}

	/**
	 * Validasi URL gambar sebelum masuk `style.cssText` (`background-image`).
	 * Allowlist: `picsum.photos` (placeholder), thumbUrl backend/presigned
	 * MinIO (localhost + host VITE_API_URL). Skema wajib `https:`
	 * (kecuali `http:` localhost dev). Escape kutip/backslash, bungkus
	 * `url("…")`; kembalikan `none` bila tidak valid sehingga tidak dirender.
	 */
	const IMG_HOSTS = ["picsum.photos", "server.arcgisonline.com"];

	function imgHostAllowed(host: string): boolean {
		const h = host.toLowerCase();
		if ((IMG_HOSTS as string[]).includes(h)) return true;
		if (h === "localhost" || h === "127.0.0.1") return true;
		// Backend asli + MinIO publik (keduanya bisa berupa tunnel saat share).
		for (const raw of [
			import.meta.env.VITE_API_URL,
			import.meta.env.VITE_MINIO_PUBLIC_URL,
			import.meta.env.MINIO_PUBLIC_URL,
		]) {
			try {
				if (!raw) continue;
				if (h === new URL(raw).hostname.toLowerCase()) return true;
			} catch {
				/* abaikan — allowlist statis di atas tetap berlaku */
			}
		}
		return false;
	}

	function safeBg(raw: string | null | undefined): string {
		if (!raw) return "none";
		const v = raw.trim();
		if (!v || v.length > 2048) return "none";
		const lower = v.toLowerCase();
		if (
			lower.startsWith("javascript:") ||
			lower.startsWith("data:") ||
			lower.startsWith("vbscript:")
		) return "none";
		let u: URL;
		try {
			u = new URL(v);
		} catch {
			return "none";
		}
		if (u.protocol !== "https:") {
			const h = u.hostname.toLowerCase();
			if (!(u.protocol === "http:" && (h === "localhost" || h === "127.0.0.1"))) return "none";
		}
		if (!imgHostAllowed(u.hostname)) return "none";
		// `u.href` sudah ter-encode oleh parser URL. Jangan encodeURI() lagi: `%3B` di
		// query presigned MinIO jadi `%253B` → signature tidak cocok (400) → ORB block.
		const esc = u.href.replace(/"/g, "%22").replace(/\\/g, "");
		if (/[\r\n]/.test(esc)) return "none";
		return `url("${esc}")`;
	}

	let { photos }: { photos: Photo[] } = $props();

	let sectionEl: HTMLElement | undefined = $state();
	let pinEl: HTMLDivElement | undefined = $state();
	const wraps = $state<(HTMLDivElement | null)[]>(Array.from({ length: MAX_IMG }, () => null));
	const wordEls = $state<(HTMLSpanElement | null)[]>(Array.from({ length: PHRASE.en.length }, () => null));

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

		// Bunyi balik halaman per foto yang tiba di depan orbit: preload sekali di sini.
		primePageTurn();
		// Keadaan tiap foto pada pembaruan sebelumnya: -1 belum masuk, 0 di
		// orbit, 1 sudah keluar. null = belum dicatat (refresh di tengah
		// section tidak boleh berbunyi tanpa gerakan).
		let photoState: number[] | null = null;

		const stageEl = pinNode.querySelector<HTMLElement>(".cg-stage");
		const ctx = gsap.context(() => {
			const vw = window.innerWidth;
			const vh = window.innerHeight;
			// Layar sempit (ponsel sampai tablet kecil) memakai foto yang relatif
			// lebih besar terhadap layarnya; di atas itu barulah proporsi desktop.
			const narrow = vw < 900;

			// ── Dimensi orbit ─────────────────────────────────────────────
			// Semua ukuran diturunkan dari lebar & tinggi layar, bukan dari satu
			// ambang mobile/desktop. Dulu di lebar 640–900 orbit memakai angka
			// desktop (radius 0.34×lebar, foto 120px): kartunya terpotong tepi
			// layar dan menabrak kalimat di tengah.
			const imgW = Math.round(Math.min(Math.max(96, vw * (narrow ? 0.26 : 0.14)), 210));
			// Radius mendatar dibatasi supaya kartu terjauh tetap utuh di layar.
			const rxMax = vw / 2 - imgW / 2 - 16;
			const rx = Math.min(vw * (narrow ? 0.3 : 0.34), rxMax);
			// Kedalaman ditahan di layar sempit: makin besar rz, makin besar pula
			// kartu terdepan diperbesar perspektif (900/(900−rz)) sampai menutupi
			// separuh layar.
			const rz = Math.round(Math.min(Math.max(210, vw * (narrow ? 0.42 : 0.55)), 500));
			// Ayunan vertikal mengikuti tinggi layar: di layar pendek orbitnya
			// ikut memendek, jadi kartu tidak keluar atas-bawah.
			const tiltY = Math.round(Math.min(Math.max(90, vh * 0.16), 180));
			const offX = vw * 0.85;
			const imgH = Math.round((imgW * 2) / 3);
			// Di layar sempit orbitnya diturunkan ke bawah kalimat, jadi foto
			// melintas di bawah teks alih-alih menabraknya di tengah.
			const yOffset = narrow ? Math.round(imgH * 0.7 + 12) : 0;
			const orbitR = (rx + rz) / 2;
			const bendRad = imgW / orbitR;
			const cylR = orbitR;
			const sliceW = imgW / SLICES;
			const totalBendDeg = (bendRad * 180) / Math.PI;
			const stepDeg = totalBendDeg / SLICES;

			wraps.forEach((wrap, wi) => {
				if (!wrap) return;
				const src = safeBg(thumbUrl(photos[wi] ?? {}, wi));
				wrap.innerHTML = "";
				wrap.style.cssText = `
					position:absolute;
					width:${imgW}px;
					height:${imgH}px;
					transform-style:preserve-3d;
					will-change:transform,opacity;
					opacity:0;
				`;
				const slices: HTMLElement[] = [];
				for (let s = 0; s < SLICES; s++) {
					const sl = document.createElement("div");
					slices.push(sl);
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
						background-image:${src};
						/* Lebar saja (tinggi auto) + tanpa ulang: pita kredit di
						   dasar thumbnail jatuh di bawah irisan, tak terlihat. */
						background-size:${imgW.toFixed(1)}px auto;
						background-repeat:no-repeat;
						background-position:${(-s * sliceW).toFixed(1)}px 0;
						transform-origin:50% 50% ${(-cylR).toFixed(1)}px;
						transform:rotateY(${angle.toFixed(2)}deg);
						backface-visibility:hidden;
						filter:saturate(0.92);
					`;
					wrap.appendChild(sl);
				}
				// Pita kredit di dasar thumbnail: setelah ukuran aslinya diketahui,
				// skala background seperti `cover` terhadap bagian foto saja.
				// Probe gagal (jaringan) dicoba ulang beberapa kali; selama itu
				// irisan belum diberi ukuran final.
				const rawSrc = thumbUrl(photos[wi] ?? {}, wi);
				const applyCrop = (attempt: number) => {
					void probeCredit(rawSrc).then((d) => {
						if (!slices[0]?.isConnected) return; // sudah dibangun ulang
						if (!d) {
							if (attempt < 4) window.setTimeout(() => applyCrop(attempt + 1), 1200 * (attempt + 1));
							return;
						}
						const c = coverBackground(imgW, imgH, d);
						slices.forEach((sl, s) => {
							sl.style.backgroundSize = `${c.width.toFixed(1)}px ${c.height.toFixed(1)}px`;
							sl.style.backgroundPosition = `${(c.offsetX - s * sliceW).toFixed(1)}px 0px`;
						});
					});
				};
				applyCrop(0);
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
					return { x: -offX * (1 - p), y: tiltY + yOffset, z: rz * p, rotY: 0 };
				}
				if (t <= 0.88) {
					const p = (t - 0.12) / 0.76;
					const angle = entryAngle - p * Math.PI * 2;
					return {
						x: Math.cos(angle) * rx,
						y: (Math.sin(angle) / 1) * tiltY * 0.5 + tiltY * 0.5 + yOffset,
						z: Math.sin(angle) * rz,
						rotY: p * Math.PI * 2
					};
				}
				const p = (t - 0.88) / 0.12;
				return { x: offX * p, y: tiltY + yOffset, z: rz * (1 - p), rotY: Math.PI * 2 };
			}

			ScrollTrigger.create({
				trigger: sectionNode,
				// Dulu "top top": orbit baru mulai saat pin menempel di puncak
				// viewport. Padahal section ini sudah masuk layar satu layar penuh
				// sebelum itu — dan selama satu layar itu semua wrap ber-opacity 0.
				// Hasilnya jurang: peta naik, layar kosong gelap, baru fotonya
				// datang. Dimajukan supaya foto pertama sudah terbang masuk saat
				// peta masih pamit. Selama pin belum menempel, panggung diangkat
				// (lihat `lift`) supaya orbit sudah berpusat di tengah layar —
				// jadi foto muncul dari balik tepi peta, bukan menumpuk di bawah.
				start: "top 60%",
				// Selesai TEPAT saat section berikutnya mulai masuk layar. Section
				// ini memakai margin-bottom negatif setinggi pin (lihat CSS), jadi
				// section berikutnya naik menutupi pin yang sudah kosong — tanpa
				// layar kosong di antaranya. Dulu:
				//  • "bottom top": orbit masih jalan saat Membership sudah tampil;
				//  • "bottom bottom" tanpa tumpang: pin kosong setinggi satu layar
				//    masih harus digulir.
				//
				// Ekor orbit (kalimat sudah pergi, tinggal 1–3 foto di tepi)
				// terasa kosong ±½ layar, jadi section berikutnya ditumpangkan
				// lebih jauh lagi (35vh ekstra, lihat margin-bottom di CSS) dan
				// masuk selama ekor itu dan menutupi sisa foto dari bawah — tak
				// pernah tampil bersama orbit yang masih ramai.
				end: () => `bottom bottom+=${pinNode.offsetHeight}`,
			onUpdate: (self) => {
				const progress = self.progress;

				// ── Bunyi balik halaman ───────────────────────────────
				// Tiap foto berbunyi saat MUNCUL (imgT melewati 0) dan, lebih
				// pelan, saat HILANG (melewati 1) — dua arah gulir, sampai
				// foto terakhir keluar. Dulu hanya saat "foto terdepan"
				// berganti: di ekor orbit terdepan tak berganti lagi, jadi
				// foto-foto yang keluar sampai section tertutup diam saja.
				// Ambang bunyi mengikuti yang TERLIHAT, bukan t = 0 / 1: di t ≈ 0 foto masih
				// jauh di luar layar kiri dan transparan (alpha baru penuh di t = 0,06), jadi
				// bunyinya mendahului gambar. Diukur: semua bunyi masuk berbunyi saat foto 0%
				// di dalam layar. Kini bunyi masuk saat foto sudah tampil penuh di layar, dan
				// bunyi keluar saat foto mulai meninggalkan layar (bukan sesudah hilang).
				const SOUND_ENTER_T = 0.08;
				const SOUND_EXIT_T = 0.95;
				const now = Array.from({ length: count }, (_, i) => {
					const t = progress * totalRange - i * stagger;
					return t <= SOUND_ENTER_T ? -1 : t >= SOUND_EXIT_T ? 1 : 0;
				});
				// Pembaruan pertama tepat di awal section (masuk dari atas):
				// anggap semua foto belum masuk, supaya foto pertama yang sudah
				// mulai terbang ikut berbunyi. Di tengah section (refresh) tetap
				// hanya dicatat — tanpa gerakan, tanpa bunyi.
				if (!photoState && progress < 0.04) photoState = now.map(() => -1);
				if (photoState) {
					// Dihitung PER FOTO: beberapa foto yang berganti keadaan dalam
					// satu pembaruan (gulir cepat) masing-masing tetap berbunyi,
					// berurutan dengan jeda pendek — bukan dilebur jadi satu.
					const queue: number[] = [];
					for (let i = 0; i < count; i++) {
						const was = photoState[i];
						const is = now[i];
						if (was === is) continue;
						if (is === 0) queue.unshift(PAGE_TURN_VOLUME); // masuk orbit
						else if (was === 0) queue.push(PAGE_TURN_EXIT_VOLUME); // keluar orbit
					}
					queue.forEach((vol, k) => {
						if (k === 0) playPageTurn(vol);
						else window.setTimeout(() => playPageTurn(vol), k * 110);
					});
				}
				photoState = now;

					// ── Angkat panggung ───────────────────────────────────
					// Pin baru menempel saat puncak section tiba di puncak layar;
					// sebelum itu pusat orbit = puncak section + ½ layar, yang di
					// awal masih jauh di bawah — foto menumpuk di sepertiga bawah
					// dan sisanya kosong. Geser panggung ke atas sejauh puncak
					// section dari puncak layar: pusat orbit tetap di tengah layar.
					// Bagian yang naik melewati puncak section terpotong
					// overflow pin, jadi foto tampak muncul dari balik tepi peta.
					if (stageEl) {
						const r = sectionNode.getBoundingClientRect();
						const vh = window.innerHeight;
						// Hanya saat masuk; saat keluar orbit sudah selesai.
						const shift = r.top > 0 ? -r.top : 0;
						stageEl.style.transform = shift ? `translateY(${shift.toFixed(1)}px)` : "";
						// Keluar: foto TIDAK diredupkan — section berikutnya (berlatar,
						// menumpang ekor pin) naik dan menutupinya dari bawah.
					}

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
			/* 375vh = 240vh jarak gulir orbit + 100vh ekor pin + 35vh
			   ekstra. Ekor + 35vh itu ditumpangi section
			   berikutnya lewat margin-bottom negatif: ia masuk selagi ekor orbit
			   yang tinggal beberapa foto masih berjalan dan menutupinya dari
			   bawah, tanpa layar kosong. */
			min-height: 375vh;
			margin-bottom: -135vh;
			/* --bg, bukan --darkroom: --darkroom sengaja tetap gelap di kedua
			   tema, jadi di mode terang section ini jadi pelat hitam di tengah
			   halaman kertas. --bg adalah nada dasar halaman. */
			background: var(--bg);
		}
		.cg-pin {
			position: sticky;
			top: 0;
			/* Kurung z-index foto orbit (600+) di dalam pin: section berikutnya
			   menumpang ekor pin (margin negatif) dan harus selalu di atasnya. */
			isolation: isolate;
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
			font-size: clamp(24px, 4vw, 46px);
			font-weight: 300;
			letter-spacing: -0.02em;
			color: var(--fg);
			line-height: 1.15;
			max-width: 660px;
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
		   Tetap ngorbit seperti desktop, hanya lingkarannya yang dikecilkan
		   (lihat dimensi orbit di effect). Yang disesuaikan di sini hanya
		   tipografi frasa + jarak scroll: frasa lebih kecil dan kalimat penuh
		   (max 17ch), tapi opacity/transform-nya tetap digerakkan handler
		   scroll — tanpa override !important. */
		@media (max-width: 899px) {
			.cg-section {
				min-height: 375svh;
				margin-bottom: -135svh;
			}
			.cg-pin {
				height: 100svh;
			}
			.cg-phrase {
				font-size: clamp(21px, 5vw, 30px);
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
					{#if w.br}
						<br />
					{:else if w.accent}
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
