<script lang="ts">
	import { untrack } from "svelte";
	import { SvelteMap } from "svelte/reactivity";
	import { ecoHrefFor } from "$lib/ecoBands";
	import gsap from "gsap";
	import { imgFor, fetchPhotoOriginal, fullscreenWidth, type Photo } from "$lib/data";
	import { i18n } from "$lib/i18n.svelte";
	import { scrambleHover } from "$lib/scramble";
	import { isScrambledUrl, loadScrambledCached, paintScrambled, scrambleKey, scrambled } from "$lib/photoScramble";

	/**
	 * Etalase bingkai pilihan — penutup beranda. Satu foto memenuhi layar,
	 * berganti otomatis dengan sapuan kanan → kiri. Kanan bawah: tumpukan
	 * kartu; diam hanya kartu aktif yang terlihat, disentuh kursor tumpukan
	 * mekar ke atas jadi daftar. Pola dari rujukan "Featured" (lxl creative),
	 * diterjemahkan ke kamar gelap Lakuna: aksen safelight, kartu kertas foto.
	 */
	let { photos, copy: copyOverride }: {
		photos: Photo[];
		/** Kurasi CMS (section `etalase`) menang bila diisi — kosong = default. */
		copy?: { kicker?: string | null; title?: string | null; cta?: string | null } | null;
	} = $props();

	const MAX = 4;
	const HOLD_MS = 6500;
	const lang = $derived(i18n.lang);
	const items = $derived(photos.slice(0, MAX));

	let active = $state(0);
	let prev = $state<number | null>(null);
	let open = $state(false);
	let paused = $state(false);
	let rootEl = $state<HTMLElement | null>(null);
	let inView = $state(false);
	/** Kemajuan jeda aktif 0..1 yang TERSIMPAN (saat dijeda / pindah foto) — selagi berputar bilah indikator
	    digerakkan animasi kompositor, bukan nilai ini. */
	let tick = $state(0);
	/** Naik tiap kali `tick` di-reset (foto berganti) → jeda berikutnya dimulai ulang dari 0. */
	let cycle = $state(0);
	/** Salinan biasa (non-reaktif) dari `cycle` untuk cleanup efek: di Svelte 5 cleanup membaca nilai state
	    LAMA, jadi `cycle` di sana masih menunjuk siklus yang baru saja diganti. */
	let cycleNow = 0;
	function resetTick() {
		tick = 0;
		cycle = ++cycleNow;
	}
	let barFillEl = $state<HTMLElement | null>(null);
	/** Cache id → URL versi tajam (file asli diperkecil ke 3200 px — layar penuh retina tanpa men-decode 20 MP;
	 *  layar yang lebih besar dari itu mendapat file asli, lihat fullscreenWidth).
	 *  SvelteMap: Map biasa di dalam $state TIDAK reaktif terhadap set() — slide yang sedang tampil dulu
	 *  tertinggal thumbnail 800 px (buram) walau versi tajamnya sudah termuat. */
	const originals = new SvelteMap<string, string>();
	/** Janji pemuatan per id (hindari fetch ganda bersamaan). */
	const originalPending = new Map<string, Promise<string | null>>();

	const reduced = () =>
		typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

	function big(p: Photo) {
		return originals.get(p.id) ?? imgFor(p.seed, 2400, 1400, p.thumbUrl);
	}
	function thumb(p: Photo) {
		return imgFor(p.seed, 240, 240, p.thumbUrl);
	}

	/** Pastikan file asli termuat (fetch + decode) lalu simpan ke cache.
		Resolve null bila gagal — pemanggil tetap jalan dengan thumbnail. */
	function ensureOriginal(p: Photo): Promise<string | null> {
		const hit = originals.get(p.id);
		if (hit) return Promise.resolve(hit);
		let pending = originalPending.get(p.id);
		if (!pending) {
			// Foto panggung tampil ±1,12× layar (zoom/parallax) → kebutuhan pikselnya ikut diperbesar.
			pending = fetchPhotoOriginal(p.id, fullscreenWidth(1.15)).then(
				(url) =>
					new Promise<string | null>((resolve) => {
						if (!url) {
							resolve(null);
							return;
						}
						// Berkas teracak (lib/photoScramble.ts): dimuat + di-decode lewat cache bersama — kanvas panggung
						// menyusunnya dari objek yang sama, tanpa unduh/decode kedua.
						if (isScrambledUrl(url)) {
							loadScrambledCached(url).then(
								() => {
									if (!originals.has(p.id)) originals.set(p.id, url);
									resolve(url);
								},
								() => resolve(null),
							);
							return;
						}
						// decode(): foto panggung 5120 px (±17 MP) di-decode di luar main thread SEBELUM ditukar —
						// onload saja membuat decode terjadi saat lukis pertama (long task ±60 ms, kedutan sapuan).
						const im = new Image();
						im.decoding = "async";
						im.src = url;
						im.decode().then(
							() => {
								if (!originals.has(p.id)) originals.set(p.id, url);
								resolve(url);
							},
							() => resolve(null),
						);
					}),
			);
			originalPending.set(p.id, pending);
			void pending.finally(() => {
				if (originalPending.get(p.id) === pending) originalPending.delete(p.id);
			});
		}
		return pending;
	}

	/**
	 * Foto panggung teracak disusun dari ImageBitmap, bukan langsung dari <img> hasil loadScrambledCached:
	 * menggambar <img> 5120 px ke kanvas men-decode JPEG-nya SINKRON di main thread (diukur 105–135 ms, tepat
	 * saat sapuan mulai — dulu <img> di-decode di thread raster). createImageBitmap men-decode di luar main
	 * thread (±85 ms di latar), penyusunannya tinggal ±10 ms. Bitmap = memori terkunci, jadi yang disimpan hanya
	 * foto aktif, lapisan lama selama sapuan, dan slide berikutnya (disiapkan selama jeda) — lihat efek di bawah.
	 */
	const fileOf = (url: string) => url.split(/[?#]/)[0]!;
	type StageBitmap = { p: Promise<ImageBitmap | null>; bmp: ImageBitmap | null };
	const bitmaps = new Map<string, StageBitmap>();
	function stageBitmap(url: string): Promise<ImageBitmap | null> {
		const id = fileOf(url);
		const hit = bitmaps.get(id);
		if (hit) return hit.p;
		const entry: StageBitmap = { p: Promise.resolve(null), bmp: null };
		entry.p = loadScrambledCached(url)
			.then((img) => createImageBitmap(img))
			.then((bmp) => {
				// Sudah dilepas selagi di-decode → jangan ditahan.
				if (bitmaps.get(id) !== entry) {
					bmp.close();
					return null;
				}
				entry.bmp = bmp;
				return bmp;
			})
			.catch(() => {
				if (bitmaps.get(id) === entry) bitmaps.delete(id);
				return null;
			});
		bitmaps.set(id, entry);
		return entry.p;
	}
	const bitmapReady = (url: string | undefined) => !url || !isScrambledUrl(url) || !!bitmaps.get(fileOf(url))?.bmp;

	/**
	 * Action <canvas class="fs-img"> untuk foto teracak: seperti `scrambled` (data-scr="ok", event load/error —
	 * pemeriksaan kesiapan sapuan berlaku sama), tapi disusun dari bitmap panggung. Bitmap yang sudah siap dipakai
	 * SINKRON saat dipasang, jadi lapisan baru/lama tak pernah kosong satu frame pun. Kanvas yang belum berisi dan
	 * bitmapnya belum siap (mis. thumbnail slide pertama) disusun dari <img>-nya begitu termuat, supaya tak kosong.
	 */
	type StageParams = { src: string; priority?: "high" };
	function stagePhoto(canvas: HTMLCanvasElement, params: StageParams) {
		let cur = params.src;
		let priority = params.priority;
		let token = 0;
		let painted = "";
		const run = () => {
			const url = cur;
			const id = fileOf(url);
			const key = scrambleKey(url);
			const my = ++token;
			if (!key) {
				canvas.dispatchEvent(new Event("error"));
				return;
			}
			const paint = (source: CanvasImageSource) => {
				paintScrambled(canvas, source, url, key);
				painted = id;
				canvas.dataset.scr = "ok";
				canvas.dispatchEvent(new Event("load"));
			};
			const ready = bitmaps.get(id)?.bmp;
			if (ready) return paint(ready);
			if (canvas.dataset.scr !== "ok") {
				loadScrambledCached(url, priority).then(
					(img) => {
						if (my === token && canvas.dataset.scr !== "ok") paint(img);
					},
					() => {
						if (my === token && canvas.dataset.scr !== "ok") canvas.dispatchEvent(new Event("error"));
					},
				);
			}
			void stageBitmap(url).then((bmp) => {
				if (my === token && bmp && painted !== id) paint(bmp);
			});
		};
		run();
		return {
			update(nextParams: StageParams) {
				const next = nextParams.src;
				priority = nextParams.priority;
				if (next === cur) return;
				const sameFile = fileOf(next) === fileOf(cur);
				cur = next;
				// URL presigned diperbarui (berkas sama) → isi kanvas sudah benar.
				if (sameFile && canvas.dataset.scr === "ok") return;
				run();
			},
			destroy() {
				token++;
			},
		};
	}

	let wipeEl = $state<HTMLDivElement | null>(null);
	let busy = false;
	/** Gagal tampil per indeks slide — setelah 2x, slide dilewati. */
	const failCount = new Map<number, number>();
	/** Tunggu file asli target (maks 2,5 dtk) supaya sapuan membuka foto yang
		sudah HD, bukan thumbnail buram yang menajam belakangan. Timeout =
		proceed dengan thumbnail; autoplay tak pernah macet. */
	const READY_TIMEOUT_MS = 2500;
	async function go(i: number) {
		const n = items.length;
		if (!n || busy) return;
		const next = ((i % n) + n) % n;
		if (next === active) return;
		resetTick();
		if (reduced()) {
			active = next;
			return;
		}
		const target = items[next];
		// …dan bitmap panggungnya (foto teracak): sapuan tak boleh menunggu decode di main thread.
		if (target && (!originals.has(target.id) || !bitmapReady(originals.get(target.id)))) {
			try {
				await Promise.race([
					ensureOriginal(target).then((url) => (url && isScrambledUrl(url) ? stageBitmap(url) : null)),
					new Promise<null>((resolve) => setTimeout(() => resolve(null), READY_TIMEOUT_MS)),
				]);
			} catch {
				/* lanjut dengan thumbnail */
			}
			if (busy) return;
			if (next === active) return;
		}
		prev = active;
		active = next;
		busy = true;
		// Lapisan baru di atas, disapu masuk dari kanan (clip-path) sambil
		// sedikit menyusut dari zoom — foto lama tetap diam di bawahnya.
		// Sapuan BARU dimulai setelah bitmap lapisan valid (complete DAN
		// naturalWidth > 0): `complete` saja true juga untuk gambar RUSAK —
		// tanpa cek ini, sapuan membuka ke lapisan transparan = pita hitam.
		// Bitmap tak kunjung valid → lewati slide ini (jangan tampilkan hitam),
		// maksimal 2x percobaan lalu loncat ke berikut.
		requestAnimationFrame(() => {
			const layer = wipeEl;
			if (!layer) {
				busy = false;
				prev = null;
				return;
			}
			// Foto teracak = <canvas> (lib/photoScramble.ts): "selesai & valid" = sudah tersusun (data-scr="ok");
			// gagal → event `error`, sama seperti <img>.
			const img = layer.querySelector<HTMLImageElement | HTMLCanvasElement>(".fs-img");
			const done = () => !img || (img instanceof HTMLCanvasElement ? img.dataset.scr === "ok" : img.complete);
			const broken = () =>
				!img || (img instanceof HTMLCanvasElement ? img.dataset.scr !== "ok" : !img.complete || img.naturalWidth === 0);
			const abort = (skip: boolean) => {
				if (!busy) return;
				if (skip) {
					failCount.set(next, (failCount.get(next) ?? 0) + 1);
					const skipTo = next + 1;
					prev = null;
					busy = false;
					resetTick();
					void go(skipTo);
				} else {
					active = prev ?? active;
					prev = null;
					busy = false;
				}
			};
			const begin = () => {
				if (!busy) return;
				failCount.delete(next);
				gsap.fromTo(
					layer,
					{ clipPath: "inset(0% 0% 0% 100%)" },
					{
						clipPath: "inset(0% 0% 0% 0%)",
						duration: 1.05,
						ease: "power3.inOut",
						onComplete: () => {
							prev = null;
							busy = false;
						},
					},
				);
				if (img) gsap.fromTo(img, { scale: 1.12, xPercent: 4 }, { scale: 1, xPercent: 0, duration: 1.6, ease: "power3.out" });
				// Blur-up menyatu: lapisan masuk sedikit kabur-gelap lalu
				// menajam — potongan terasa lebur, bukan tempel mentah.
				// clearProps: nilai akhir `blur(0px) brightness(1)` = tanpa filter secara visual, tapi bila dibiarkan
				// menempel di foto selayar ia tetap jadi lapisan filter (saveLayer) tiap kali foto dirasterisasi.
				if (img)
					gsap.fromTo(
						img,
						{ filter: "blur(14px) brightness(0.72)" },
						{ filter: "blur(0px) brightness(1)", duration: 1.05, ease: "power2.out", overwrite: "auto", clearProps: "filter" },
					);
			};
			if (done()) {
				if (broken()) {
					// complete tapi rusak (naturalWidth 0): coba tunggu sebentar,
					// lalu lewati bila tetap rusak.
					let started = false;
					const kick = () => {
						if (started || !busy) return;
						started = true;
						if (broken()) abort((failCount.get(next) ?? 0) >= 1);
						else begin();
					};
					img?.addEventListener("load", kick, { once: true });
					img?.addEventListener("error", kick, { once: true });
					setTimeout(kick, 1500);
				} else {
					begin();
				}
				return;
			}
			let started = false;
			const kick = () => {
				if (started || !busy) return;
				started = true;
				if (broken()) abort((failCount.get(next) ?? 0) >= 1);
				else begin();
			};
			img?.addEventListener("load", kick, { once: true });
			img?.addEventListener("error", kick, { once: true });
			// Pengaman: jangan tahan slideshow bila load macet.
			setTimeout(kick, 1500);
		});
	}

	// Putar otomatis selama terlihat & tidak sedang dijelajah.
	$effect(() => {
		if (!inView || paused || open || items.length < 2 || reduced()) return;
		// Slide pertama jangan jalan sebelum HD-nya siap (maks 3 dtk): yang
		// dilihat pertama kali harus langsung tajam, bukan thumbnail buram.
		if (!firstReady) return;
		const myCycle = cycle;
		// Dulu loop rAF menulis `tick` tiap frame → lebar bilah berubah 60×/dtk → layout + paint ulang seluruh
		// panel teks di atas foto selayar (± setengah kerja halaman saat section ini terlihat). Kini: satu timer
		// untuk ganti foto, bilah digeser animasi transform di kompositor (tanpa layout/paint).
		const from = untrack(() => tick);
		const remaining = Math.max(0, (1 - from) * HOLD_MS);
		const t0 = performance.now();
		const anim = barFillEl?.animate(
			[{ transform: `translateX(${((from - 1) * 100).toFixed(2)}%)` }, { transform: "translateX(0%)" }],
			{ duration: remaining, easing: "linear", fill: "forwards" },
		);
		let timer = 0;
		const advance = () => {
			tick = 1;
			void go(active + 1);
			// go() menolak selagi sapuan sebelumnya berjalan (busy) → coba lagi sebentar lagi.
			if (cycleNow === myCycle) timer = window.setTimeout(advance, 250);
		};
		timer = window.setTimeout(advance, remaining);
		return () => {
			window.clearTimeout(timer);
			anim?.cancel();
			// Dijeda (hover / keluar layar) pada foto yang sama → simpan kemajuan supaya lanjut dari titik itu.
			// cycleNow, bukan `cycle`: lihat catatannya di atas.
			if (cycleNow !== myCycle) return;
			const t = Math.min(1, from + (performance.now() - t0) / HOLD_MS);
			if (t < 1) tick = t;
		};
	});

	$effect(() => {
		const el = rootEl;
		if (!el) return;
		const io = new IntersectionObserver(([e]) => (inView = !!e?.isIntersecting), { threshold: 0.35 });
		io.observe(el);
		return () => io.disconnect();
	});

	// Prefetch SEMUA file asli di latar (bukan cuma aktif + berikut): setelah
	// pemuatan awal selesai, tiap slide langsung HD tanpa menunggu. Gagal →
	// tetap thumbnail, diam.
	// Gerbang slide pertama: tandai siap begitu HD aktif tiba (atau 3 dtk).
	let firstReady = $state(false);
	// Etalase ada di dekat dasar beranda: versi tajamnya (±1 MB per slide) baru diunduh saat etalase tinggal
	// ±2 layar lagi — dulu ikut diunduh begitu beranda dibuka, berebut jaringan dengan video hero & peta.
	let near = $state(false);
	$effect(() => {
		const el = rootEl;
		if (!el || near) return;
		if (typeof IntersectionObserver === "undefined") {
			near = true;
			return;
		}
		const io = new IntersectionObserver(
			([e]) => {
				if (e?.isIntersecting) near = true;
			},
			{ rootMargin: "200% 0px" },
		);
		io.observe(el);
		return () => io.disconnect();
	});
	$effect(() => {
		const list = items;
		if (!list.length || !near) return;
		// untrack: membaca `originals` (reaktif) di sini akan menjalankan ulang efek tiap berkas tiba.
		untrack(() => {
			for (const p of list) {
				if (!p || originals.has(p.id)) continue;
				void ensureOriginal(p).catch(() => {});
			}
		});
		if (firstReady) return;
		const first = list[0];
		if (!first || untrack(() => originals.has(first.id))) {
			firstReady = true;
			return;
		}
		let cancelled = false;
		const timer = setTimeout(() => {
			if (!cancelled) firstReady = true;
		}, 3000);
		void ensureOriginal(first)
			.then(() => {
				if (!cancelled) firstReady = true;
			})
			.catch(() => {
				if (!cancelled) firstReady = true;
			});
		return () => {
			cancelled = true;
			clearTimeout(timer);
		};
	});

	// Bitmap panggung (lihat stageBitmap): simpan hanya foto aktif, lapisan lama selama sapuan, dan slide
	// berikutnya — yang terakhir disiapkan di latar selama jeda (setelah etalase mendekat), jadi sapuan
	// berikutnya langsung jalan. Sisanya dilepas; kanvas yang tampil tetap memegang pikselnya sendiri.
	$effect(() => {
		const n = items.length;
		if (!n) return;
		const nextP = items[(active + 1) % n];
		const keep = new Set<string>();
		for (const i of [active, (active + 1) % n, prev]) {
			const p = i === null ? undefined : items[i];
			if (p) keep.add(fileOf(big(p)));
		}
		// Selama sapuan (prev terisi) jangan: createImageBitmap dari <img> tetap men-decode di main thread —
		// disiapkan sesudah sapuan selesai, saat main thread menganggur (jeda foto 6,5 dtk).
		const nextSrc = nextP && near && prev === null ? big(nextP) : null;
		const cancel = untrack(() => {
			for (const [id, e] of bitmaps) {
				if (keep.has(id)) continue;
				e.bmp?.close();
				bitmaps.delete(id);
			}
			if (!nextSrc || !isScrambledUrl(nextSrc) || bitmaps.has(fileOf(nextSrc))) return null;
			// Sekalian "panaskan" unggahan ke GPU: satu piksel digambar 1:1 (skala penuh) ke kanvas kecil lalu
			// di-snapshot supaya langsung dieksekusi. Tanpa ini unggahan bitmap 5120 px (±90 ms main thread)
			// terjadi saat kanvas lapisan baru pertama kali dilukis — tepat di awal sapuan.
			const prep = () =>
				void stageBitmap(nextSrc).then(async (bmp) => {
					if (!bmp) return;
					const w = document.createElement("canvas");
					w.width = w.height = 1;
					w.getContext("2d")?.drawImage(bmp, 0, 0, 1, 1, 0, 0, 1, 1);
					await createImageBitmap(w).then((b) => b.close(), () => {});
					w.width = w.height = 0;
				});
			// Decode ±100 ms itu juga tak boleh jatuh di tengah gulir: tunggu gulir berhenti (≥300 ms) + idle.
			let off = false;
			const later = () => {
				if (off) return;
				const wait = 300 - (performance.now() - lastScroll);
				if (wait > 0) return void window.setTimeout(later, wait + 20);
				if (typeof requestIdleCallback !== "function") return void window.setTimeout(prep, 800);
				requestIdleCallback(() => !off && (performance.now() - lastScroll < 300 ? later() : prep()), { timeout: 2500 });
			};
			later();
			return () => {
				off = true;
			};
		});
		return () => cancel?.();
	});
	let lastScroll = 0;
	$effect(() => {
		const on = () => (lastScroll = performance.now());
		const opt = { passive: true, capture: true };
		window.addEventListener("scroll", on, opt);
		window.addEventListener("wheel", on, opt);
		window.addEventListener("touchmove", on, opt);
		return () => {
			window.removeEventListener("scroll", on, opt);
			window.removeEventListener("wheel", on, opt);
			window.removeEventListener("touchmove", on, opt);
		};
	});
	$effect(() => () => {
		for (const e of bitmaps.values()) e.bmp?.close();
		bitmaps.clear();
	});

	const fine = () => typeof window !== "undefined" && window.matchMedia("(hover: hover) and (pointer: fine)").matches;
	/** Tutup berjedah: kursor yang melintas batas sesaat tidak menutup. */
	let leaveT = 0;
	function onStackEnter() {
		if (fine()) {
			window.clearTimeout(leaveT);
			open = true;
		}
	}
	function onStackLeave() {
		if (!fine()) return;
		window.clearTimeout(leaveT);
		leaveT = window.setTimeout(() => {
			open = false;
		}, 280);
	}
	/** Sentuh: ketuk pertama membuka tumpukan, ketuk berikutnya membuka bingkai. */
	function onCardClick(e: MouseEvent) {
		if (!open) {
			e.preventDefault();
			open = true;
		}
	}
	function onKey(e: KeyboardEvent) {
		if (e.key === "Escape") open = false;
	}

	const fallback = $derived(
		lang === "id"
			? { kicker: "Ekowisata", title: "Muali berlibur\nbersama keluarga,\nmenyatu dengan alam", cta: "Cek lokasi", label: "Ekowisata" }
			: { kicker: "Ecotourism", title: "Travel to natural areas\nthat conserves\nthe environment", cta: "Check all destination", label: "Ecotourism" },
	);
	const copy = $derived({
		kicker: copyOverride?.kicker?.trim() || fallback.kicker,
		title: copyOverride?.title?.trim() || fallback.title,
		cta: copyOverride?.cta?.trim() || fallback.cta,
		label: copyOverride?.kicker?.trim() || fallback.label,
	});
</script>

{#if items.length}
	<section
		bind:this={rootEl}
		class="fs on-darkroom"
		aria-roledescription="carousel"
		aria-label={copy.label}
	>
		<!-- Latar: foto aktif; saat berganti, foto baru disapu masuk di atasnya. -->
		<div class="fs-bg" aria-hidden="true">
			<!-- Foto dari API datang teracak (lib/photoScramble.ts) → <canvas> yang disusun ulang, kelas & object-fit sama. -->
			{#if prev !== null && items[prev]}
				{@const prevSrc = big(items[prev])}
				{#if isScrambledUrl(prevSrc)}
					<canvas class="fs-img" use:stagePhoto={{ src: prevSrc }}></canvas>
				{:else}
					<img class="fs-img" src={prevSrc} alt="" decoding="async" />
				{/if}
			{/if}
			{#key active}
				{@const activeSrc = big(items[active])}
				<!-- Clip awal inline: tanpa ini lapisan baru tampil utuh satu frame
					sebelum tween dimulai (kedip). -->
				<div bind:this={wipeEl} class="fs-layer" style={prev !== null ? "clip-path: inset(0% 0% 0% 100%)" : undefined}>
					{#if isScrambledUrl(activeSrc)}
						<canvas class="fs-img" use:stagePhoto={{ src: activeSrc, priority: "high" }}></canvas>
					{:else}
						<img class="fs-img" src={activeSrc} alt="" fetchpriority="high" decoding="async" />
					{/if}
				</div>
			{/key}
		</div>
		<div class="fs-shade" aria-hidden="true"></div>
		<div class="grain absolute inset-0 opacity-[0.14] mix-blend-soft-light" aria-hidden="true"></div>

		<div class="fs-ui">
			<div class="fs-copy">
				<p class="fs-kicker serif-em">{copy.kicker}</p>
				<h2 class="fs-title">{copy.title}</h2>
				<a href="/ecotourism" class="fs-cta" data-sound>
					<span use:scrambleHover>{copy.cta}</span>
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
				</a>
			</div>

			<div class="fs-side">
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<div
					class="fs-stack"
					class:is-open={open}
					style={`--n: ${items.length}`}
					onmouseenter={onStackEnter}
					onmouseleave={onStackLeave}
					onfocusin={() => (open = true)}
					onfocusout={(e) => {
						if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) open = false;
					}}
					onkeydown={onKey}
				>
					{#each items as p, i (p.id + "-" + i)}
						<a
							href={ecoHrefFor(p)}
							class="fs-card"
							class:is-active={i === active}
							style={`--i: ${i}; --from-end: ${items.length - 1 - i}`}
							aria-current={i === active ? "true" : undefined}
							onclick={onCardClick}
							onmouseenter={() => (paused = true)}
							onmouseleave={() => (paused = false)}
						>
							{#if isScrambledUrl(thumb(p))}
								<canvas class="fs-thumb" use:scrambled={thumb(p)} aria-hidden="true"></canvas>
							{:else}
								<img class="fs-thumb" src={thumb(p)} alt="" loading="lazy" decoding="async" />
							{/if}
							<span class="fs-name" class:solo={!p.location}>{p.title[lang]}</span>
							{#if p.location}<span class="fs-meta">{p.location}</span>{/if}
							<svg class="fs-arrow" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
						</a>
					{/each}
				</div>

				{#if items.length > 1}
					<div
						class="fs-bar"
						role="progressbar"
						aria-label={copy.label}
						aria-valuemin={0}
						aria-valuemax={100}
						aria-valuenow={Math.round(tick * 100)}
					>
						<div bind:this={barFillEl} class="fs-bar-fill" style={`transform: translateX(${((tick - 1) * 100).toFixed(2)}%)`}></div>
					</div>
				{/if}
			</div>
		</div>
	</section>
{/if}

<style>
	.fs {
		--card-h: 4.5rem;
		--gap: 0.5rem;
		position: relative;
		width: 100%;
		max-width: none;
		margin: 0;
		height: 100svh;
		height: 100dvh;
		/* Jangan pernah lebih tinggi dari viewport: di layar pendek
		   (ponsel landscape) min 560px memaksa section meluber dan
		   CTA + kartu kepotong di lipatan. */
		min-height: min(560px, 100svh);
		overflow: hidden;
		/* Sama dengan latar halaman: tepi atas menyatu dengan section di atas. */
		background: var(--bg);
		color: #fff;
	}
	/* Mode gelap: hitam section = hitam halaman (--bg). Tiga hitam beda
		(section, halaman, veil) bertemu = garis step permanen yang tak bisa
		ditutup gradient. Samakan dulu, baru lebur foto ke dalamnya. */
	:global(.dark) .fs {
		background: var(--bg);
	}
	.fs-bg,
	.fs-layer {
		position: absolute;
		inset: 0;
	}
	/* Lebur foto ke bg section di TEPI ATAS + BAWAH. Topeng dipasang di
	   WADAH (.fs-bg), bukan per foto: foto yang baru masuk dizoom 112% →
	   topeng per foto ikut membesar, bagian gelapnya terdorong keluar layar
	   dan baru "menyusul" setelah zoom selesai (shading telat). Di wadah,
	   bayangan diam di tempat untuk semua foto (lama + lapisan sapu). */
	.fs-bg {
		overflow: hidden;
		-webkit-mask-image: linear-gradient(to bottom, transparent 0, rgba(0, 0, 0, 0.35) 9%, #000 26%, #000 93%, transparent 100%);
		mask-image: linear-gradient(to bottom, transparent 0, rgba(0, 0, 0, 0.35) 9%, #000 26%, #000 93%, transparent 100%);
	}
	.fs-layer {
		will-change: clip-path;
	}
	.fs-img {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
	/* Redaman bawah untuk alas teks & kartu. Atas: WARNA LATAR HALAMAN itu
		sendiri, pekat penuh di tepi lalu memudar panjang — dulu rgb(5,6,8) 0,9
		(lebih gelap dari --bg) meninggalkan pita gelap bertepi tegas di
		pertemuan dengan section di atas. */
	.fs-shade {
		position: absolute;
		inset: 0;
		pointer-events: none;
		background:
			/* Bawah: larut ke WARNA LATAR HALAMAN (= latar footer), bukan hitam
			   lain — dulu rgb(5,6,8) lebih gelap dari --bg → pita/garis di
			   pertemuan dengan footer. */
			linear-gradient(
				to top,
				var(--bg) 0%,
				color-mix(in srgb, var(--bg) 88%, transparent) 10%,
				color-mix(in srgb, var(--bg) 55%, transparent) 30%,
				color-mix(in srgb, var(--bg) 18%, transparent) 50%,
				transparent 64%
			),
			linear-gradient(
				to bottom,
				var(--bg) 0%,
				color-mix(in srgb, var(--bg) 78%, transparent) 10%,
				color-mix(in srgb, var(--bg) 42%, transparent) 22%,
				color-mix(in srgb, var(--bg) 14%, transparent) 34%,
				transparent 46%
			);
	}
	.fs-ui {
		position: absolute;
		inset: auto 0 0 0;
		z-index: 2;
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
		gap: 2rem;
		max-width: 1500px;
		margin: 0 auto;
		/* Bawah menyisakan ruang tombol melayang situs (kembali ke atas &
		   aksesibilitas) supaya tidak menimpa tombol & indikator. */
		padding: 0 clamp(1.25rem, 3vw, 2.5rem) clamp(5.25rem, 10vh, 6.5rem);
	}

	/* ── Kiri bawah ─────────────────────────────────────────────── */
	.fs-copy {
		max-width: 26rem;
	}
	.fs-kicker {
		/* Meniban baris judul di bawahnya: margin negatif menarik judul naik,
		   z-index menaruh skrip di atas huruf putih. */
		position: relative;
		z-index: 1;
		margin: 0 0 -0.12em;
		font-family: "Adelia", cursive;
		font-style: normal;
		/* Ujung kanan skrip disejajarkan dengan kata "to" pada baris judul:
		   lebar skrip ≈ lebar "Travel to" (±0.44× kolom), rata kiri tetap. */
		font-size: clamp(1.3rem, 2.3vw, 1.85rem);
		line-height: 1.15;
		color: var(--safelight-lamp, var(--safelight));
		/* Kontur gelap tipis mengelilingi huruf skrip, plus bayangan KERAS ke
		   kiri-bawah ala rujukan. Bayangannya BERLAPIS (langkah kecil dari huruf
		   sampai jarak penuh), jadi menyatu dengan huruf seperti ketebalan —
		   satu bayangan bergeser akan terbaca sebagai salinan terpisah, dengan
		   celah di bagian huruf yang tipis. Satuan em: proporsi tetap di semua
		   ukuran layar. */
		-webkit-text-stroke: 1px rgba(24, 12, 38, 0.85);
		paint-order: stroke fill;
		text-shadow:
			-0.01em 0.01em 0 rgba(10, 6, 2, 0.92),
			-0.02em 0.02em 0 rgba(10, 6, 2, 0.92),
			-0.03em 0.03em 0 rgba(10, 6, 2, 0.92),
			-0.04em 0.04em 0 rgba(10, 6, 2, 0.92),
			-0.05em 0.05em 0 rgba(10, 6, 2, 0.92),
			-0.06em 0.06em 0 rgba(10, 6, 2, 0.92);
	}
	.fs-title {
		margin: 0.2rem 0 0;
		font-family: var(--font-display);
		font-weight: 400;
		font-size: clamp(1.6rem, 3.4vw, 2.9rem);
		line-height: 1.08;
		letter-spacing: -0.01em;
		white-space: pre-line;
		text-wrap: balance;
		/* Bayangan keras berlapis ke kiri-bawah (menyatu dengan huruf), sama
		   dengan skrip di atasnya. */
		text-shadow:
			-0.0075em 0.0075em 0 rgba(10, 6, 2, 0.92),
			-0.015em 0.015em 0 rgba(10, 6, 2, 0.92),
			-0.0225em 0.0225em 0 rgba(10, 6, 2, 0.92),
			-0.03em 0.03em 0 rgba(10, 6, 2, 0.92),
			-0.0375em 0.0375em 0 rgba(10, 6, 2, 0.92),
			-0.045em 0.045em 0 rgba(10, 6, 2, 0.92);
	}
	.fs-cta {
		margin-top: 1.25rem;
		display: inline-flex;
		align-items: center;
		gap: 0.55rem;
		padding: 0.6rem 1.1rem;
		border-radius: 999px;
		background: var(--safelight);
		color: #fff;
		font-size: 0.88rem;
		font-weight: 500;
		transition: filter 0.25s ease, transform 0.25s ease;
	}
	.fs-cta:hover {
		filter: brightness(1.12);
	}
	.fs-cta:hover svg {
		transform: translateX(3px);
	}
	.fs-cta svg {
		transition: transform 0.25s ease;
	}
	.fs-cta:focus-visible {
		outline: 2px solid #fff;
		outline-offset: 3px;
	}

	/* ── Tumpukan kartu kanan bawah ─────────────────────────────── */
	.fs-side {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.9rem;
		width: min(21rem, 42vw);
	}
	.fs-stack {
		position: relative;
		width: 100%;
		height: var(--card-h);
	}
	/* Kartu mekar ke ATAS keluar dari kotak stack: tanpa ini, kursor yang
		bergerak ke kartu atas dianggap meninggalkan stack lalu menutup lagi.
		Saat terbuka, cadangkan ruang hover tepat setinggi kipasannya. */
	.fs-stack.is-open {
		padding-top: calc((var(--n, 1) - 1) * (var(--card-h) + var(--gap)));
		margin-top: calc((var(--n, 1) - 1) * (var(--card-h) + var(--gap)) * -1);
	}
	.fs-card {
		position: absolute;
		left: 0;
		right: 0;
		bottom: 0;
		height: var(--card-h);
		display: grid;
		grid-template-columns: auto 1fr auto;
		grid-template-rows: auto auto;
		align-items: center;
		column-gap: 0.85rem;
		padding: 0.55rem 0.9rem 0.55rem 0.55rem;
		border-radius: 0.7rem;
		background: #f4f1ea;
		color: #111214;
		box-shadow: 0 10px 28px -12px rgba(0, 0, 0, 0.65);
		/* Diam: kartu non-aktif menumpuk di belakang, satu mengintip tipis. */
		opacity: 0;
		transform: translateY(0.55rem) scale(0.93);
		transform-origin: 50% 100%;
		pointer-events: none;
		transition:
			transform 0.55s cubic-bezier(0.22, 1, 0.36, 1),
			opacity 0.35s ease,
			box-shadow 0.3s ease;
	}
	.fs-card.is-active {
		z-index: 2;
		opacity: 1;
		transform: none;
		pointer-events: auto;
	}
	/* Hover: cahaya ungu di bawah kartu, seperti kartu /photos. */
	.fs-card:hover {
		box-shadow: 0 10px 28px -12px rgba(0, 0, 0, 0.65), 0 14px 40px -12px var(--safelight-glow);
	}
	/* Kartu tepat di belakang yang aktif mengintip sebagai "tab" tipis. */
	.fs-stack:not(.is-open) .fs-card:not(.is-active) {
		opacity: 0.55;
	}
	/* Mekar: daftar urut atas → bawah, dengan jeda berjenjang dari bawah. */
	.fs-stack.is-open .fs-card {
		opacity: 1;
		pointer-events: auto;
		transform: translateY(calc(var(--from-end) * -1 * (var(--card-h) + var(--gap))));
		transition-delay: calc(var(--from-end) * 45ms);
	}
	.fs-stack.is-open .fs-card:hover,
	.fs-stack.is-open .fs-card:focus-visible {
		box-shadow: 0 0 0 2px var(--safelight), 0 12px 30px -12px rgba(0, 0, 0, 0.7);
		outline: none;
	}
	.fs-thumb {
		grid-row: 1 / span 2;
		width: calc(var(--card-h) - 1.1rem);
		height: calc(var(--card-h) - 1.1rem);
		border-radius: 0.4rem;
		object-fit: cover;
	}
	.fs-name {
		align-self: end;
		font-family: var(--font-display);
		font-weight: 600;
		font-size: 0.92rem;
		line-height: 1.15;
		overflow: hidden;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
	}
	.fs-name.solo {
		grid-row: 1 / span 2;
		align-self: center;
	}
	.fs-meta {
		grid-column: 2;
		align-self: start;
		font-size: 0.74rem;
		color: rgba(17, 18, 20, 0.55);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.fs-arrow {
		grid-column: 3;
		grid-row: 1 / span 2;
		color: var(--safelight);
		transition: transform 0.25s ease;
	}
	.fs-card:hover .fs-arrow {
		transform: translateX(3px);
	}

	/* ── Indikator: satu bilah progres kontinu ──────────────────── */
	/* Satu garis loading per foto: penuh → ganti foto → mulai lagi, loop.
		`tick` 0..1 per foto aktif (di-reset tiap pindah). */
	.fs-bar {
		width: 34%;
		min-width: 5.5rem;
		margin: 0.55rem auto 0;
		height: 0.25rem;
		border-radius: 999px;
		background: rgba(255, 255, 255, 0.25);
		overflow: hidden;
	}
	.fs-bar-fill {
		display: block;
		height: 100%;
		border-radius: inherit;
		background: var(--safelight);
	}

	@media (max-width: 639px) {
		.fs-ui {
			flex-direction: column;
			align-items: stretch;
			gap: 1.25rem;
			padding-bottom: 4.5rem;
		}
		.fs-side {
			width: 100%;
		}
	}
	/* Layar pendek: rapatkan agar CTA + kartu muat dalam satu layar. */
	@media (max-height: 700px) {
		.fs-ui {
			gap: 1.25rem;
			padding-bottom: 4.25rem;
		}
		.fs-title {
			/* min(…, 7.5vw): layar pendek DAN sempit (320×568) — 6vh saja (34 px) lebih besar dari ukuran bawaan
			   ponsel, judul jadi empat baris dan tertimpa tombol melayang. */
			font-size: clamp(1.5rem, min(6vh, 7.5vw), 2.2rem);
		}
		.fs-cta {
			margin-top: 0.9rem;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.fs-card {
			transition: none;
		}
	}
</style>
