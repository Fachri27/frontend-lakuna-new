<script lang="ts">
	import { ecoHrefFor } from "$lib/ecoBands";
	import gsap from "gsap";
	import { imgFor, fetchPhotoOriginal, type Photo } from "$lib/data";
	import { i18n } from "$lib/i18n.svelte";
	import { scrambleHover } from "$lib/scramble";

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
	/** Kemajuan jeda aktif 0..1 — mengisi pil indikator. */
	let tick = $state(0);
	/** Cache id → URL file asli (full-res via fetchPhotoOriginal). */
	let originals = $state(new Map<string, string>());
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
			pending = fetchPhotoOriginal(p.id).then(
				(url) =>
					new Promise<string | null>((resolve) => {
						if (!url) {
							resolve(null);
							return;
						}
						const im = new Image();
						im.onload = () => {
							if (!originals.has(p.id)) originals.set(p.id, url);
							resolve(url);
						};
						im.onerror = () => resolve(null);
						im.src = url;
					}),
			);
			originalPending.set(p.id, pending);
			void pending.finally(() => {
				if (originalPending.get(p.id) === pending) originalPending.delete(p.id);
			});
		}
		return pending;
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
		tick = 0;
		if (reduced()) {
			active = next;
			return;
		}
		const target = items[next];
		if (target && !originals.has(target.id)) {
			try {
				await Promise.race([
					ensureOriginal(target),
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
			const img = layer.querySelector("img") as HTMLImageElement | null;
			const broken = () => !img || !img.complete || img.naturalWidth === 0;
			const abort = (skip: boolean) => {
				if (!busy) return;
				if (skip) {
					failCount.set(next, (failCount.get(next) ?? 0) + 1);
					const skipTo = next + 1;
					prev = null;
					busy = false;
					tick = 0;
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
				if (img)
					gsap.fromTo(
						img,
						{ filter: "blur(14px) brightness(0.72)" },
						{ filter: "blur(0px) brightness(1)", duration: 1.05, ease: "power2.out", overwrite: "auto" },
					);
			};
			if (!img || (img as HTMLImageElement).complete) {
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
			(img as HTMLImageElement).addEventListener("load", kick, { once: true });
			(img as HTMLImageElement).addEventListener("error", kick, { once: true });
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
		let raf = 0;
		let last = performance.now();
		const loop = (now: number) => {
			tick = Math.min(1, tick + (now - last) / HOLD_MS);
			last = now;
			if (tick >= 1) go(active + 1);
			raf = requestAnimationFrame(loop);
		};
		raf = requestAnimationFrame(loop);
		return () => cancelAnimationFrame(raf);
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
	$effect(() => {
		const list = items;
		if (!list.length) return;
		for (const p of list) {
			if (!p || originals.has(p.id)) continue;
			void ensureOriginal(p).catch(() => {});
		}
		if (firstReady) return;
		const first = list[0];
		if (!first || originals.has(first.id)) {
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
			{#if prev !== null && items[prev]}
				<img class="fs-img" src={big(items[prev])} alt="" />
			{/if}
			{#key active}
				<!-- Clip awal inline: tanpa ini lapisan baru tampil utuh satu frame
					sebelum tween dimulai (kedip). -->
				<div bind:this={wipeEl} class="fs-layer" style={prev !== null ? "clip-path: inset(0% 0% 0% 100%)" : undefined}>
					<img class="fs-img" src={big(items[active])} alt="" fetchpriority="high" />
				</div>
			{/key}
		</div>
		<div class="fs-shade" aria-hidden="true"></div>
		<div class="grain absolute inset-0 opacity-[0.14] mix-blend-soft-light" aria-hidden="true"></div>

		<div class="fs-ui">
			<div class="fs-copy">
				<p class="fs-kicker serif-em">{copy.kicker}</p>
				<h2 class="fs-title">{copy.title}</h2>
				<a href="/ecotourism" class="fs-cta">
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
							<img class="fs-thumb" src={thumb(p)} alt="" loading="lazy" decoding="async" />
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
						<div class="fs-bar-fill" style={`width: ${tick * 100}%`}></div>
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
			font-size: clamp(1.5rem, 6vh, 2.2rem);
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
