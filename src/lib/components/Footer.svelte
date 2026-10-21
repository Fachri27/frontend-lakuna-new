<script lang="ts">
	import { page } from "$app/state";
	import { i18n } from "$lib/i18n.svelte";
	import SliceHeadline from "./SliceHeadline.svelte";
	import ImageStream from "./ImageStream.svelte";
	import ApiImage from "./ApiImage.svelte";
	import { untrack } from "svelte";
	import { SvelteMap } from "svelte/reactivity";
	import { fetchPhotos, fetchHomepage, fetchPhotoOriginal, adaptPhoto, imgFor, type Photo } from "$lib/data";
	import type { HomepageSection } from "$lib/types";
	import { isScrambledUrl, loadScrambledCached } from "$lib/photoScramble";

	const c = $derived(i18n.c);

	// Identitas di kolom kiri footer. Isi `href` akun resmi; selama kosong,
	// ikonnya tetap tampil tapi belum mengarah ke mana pun.
	const ADDRESS = "Jl. Ayub No. 28 RT 11 / RW 01, Pejaten Barat, Pasar Minggu, Kota Jakarta Selatan, 12510";
	const SOCIAL: { name: string; href: string }[] = [
		{ name: "Facebook", href: "" },
		{ name: "X", href: "" },
		{ name: "Instagram", href: "" },
	];
	// Tujuan tautan footer. Kolom Legal: tiga halaman sendiri — /terms (ketentuan
	// penggunaan), /privacy, dan /cookies. Perjanjian lisensi karya tetap di /license.
	const LINKS: Record<string, string> = {
		"About us": "/about",
		Ecotourism: "/ecotourism",
		Ekowisata: "/ecotourism",
		"Tentang kami": "/about",
		Contributor: "/contributor",
		Kontributor: "/contributor",
		Reviews: "/reviews",
		Ulasan: "/reviews",
		"Privacy policy": "/privacy",
		"Kebijakan privasi": "/privacy",
		"Cookie preferences": "/cookies",
		"Preferensi cookie": "/cookies",
		Help: "/help",
		Bantuan: "/help",
		FAQ: "/faq",
		"Customer service": "/customer-service",
		"Layanan pelanggan": "/customer-service",
		"Terms of use": "/terms",
		"Ketentuan penggunaan": "/terms",
	};
	// Koridor foto + tagline hanya milik landing — di halaman lain footer
	// langsung ke kolom.
	const isLanding = $derived(page.url.pathname === "/");

	// Koridor foto di balik tagline: kurasi CMS (section koridor_kanan /
	// koridor_kiri) menang bila diisi; kosong = arsip terbaru DIBAGI DUA
	// (kanan dan kiri selalu beda foto). Thumbnail cukup — kartu kecil di
	// kejauhan, besar hanya sesaat sebelum keluar layar.
	let curated = $state<{ right: Photo[]; left: Photo[] } | null>(null);
	/** Arsip terbaru (cadangan bila kurasi kosong) — dipilih lagi per layar, lihat `streamPick`. */
	let latestPool = $state<Photo[]>([]);
	// Foto di rel membesar sampai ±61% lebar layar saat mendekati penonton — thumbnail 800 px jadi buram. Begitu
	// footer mendekati layar, tiap foto diganti versi turunan file asli: 3200 px di laptop, 5120 px di layar
	// 4K/5K. 5120 di semua layar membuat 12 foto ±17 MP dirasterisasi sekaligus saat footer masuk (frame ±50 ms),
	// jadi puncak kartu (exitHeight) yang dibatasi: kartu terdekat tak pernah lebih besar dari piksel fotonya.
	const sharpUrl = new SvelteMap<string, string>();
	let vw = $state(typeof window === "undefined" ? 1440 : window.innerWidth);
	let dpr = $state(typeof window === "undefined" ? 2 : window.devicePixelRatio || 1);
	$effect(() => {
		const upd = () => {
			vw = window.innerWidth;
			dpr = window.devicePixelRatio || 1;
		};
		window.addEventListener("resize", upd);
		return () => window.removeEventListener("resize", upd);
	});
	const streamTier = $derived(vw * dpr > 3600 ? 5120 : 3200);
	/** Tinggi tampak kartu terdekat yang masih terlihat ≈ 61% lebar wadah pada exitHeight bawaan (46 cqw). */
	const STREAM_EXIT = 46;
	const STREAM_PEAK = 0.61;
	const streamExit = $derived.by(() => {
		// Potongan cover di kartu tegak memakai TINGGI foto: tinggi piksel terkecil di rel yang menentukan —
		// turunan selebar streamTier, atau file aslinya bila lebih kecil (turunan tak pernah diperbesar).
		const heights = [...streamPhotos, ...streamPhotosAlt]
			.filter((ph) => ph.nativeW && ph.nativeH)
			.map((ph) => (Math.min(streamTier, ph.nativeW!) * ph.nativeH!) / ph.nativeW!);
		const natH = heights.length ? Math.min(...heights) : (streamTier * 9) / 16;
		const fit = natH / (STREAM_PEAK * vw * dpr);
		return Math.min(STREAM_EXIT, STREAM_EXIT * fit * 0.97);
	});
	/** Tinggi piksel yang bisa dipakai kartu dari sebuah foto: turunan selebar streamTier, atau aslinya bila lebih kecil. */
	const usableH = (ph: Photo) => (ph.nativeW && ph.nativeH ? (Math.min(streamTier, ph.nativeW) * ph.nativeH) / ph.nativeW : null);
	const STREAM_MIN = 8;
	// Cadangan arsip terbaru: foto yang terlalu kecil untuk layar ini dilewati selama masih ada ≥ STREAM_MIN foto lain.
	// Puncak kartu (streamExit) mengikuti foto TERKECIL di rel, jadi satu foto kecil (mis. hasil AI 936×624) dulu
	// memangkas seluruh koridor sampai kartunya tak lagi mencapai tepi layar — terutama di layar retina. Bila foto
	// tajam kurang, diambil STREAM_MIN foto beresolusi tertinggi (urutan terbaru tetap). Kurasi CMS dipakai apa adanya.
	const streamPick = $derived.by(() => {
		if (curated) return curated;
		const need = (STREAM_PEAK * vw * dpr) / 0.97;
		const sharp = latestPool.filter((ph) => (usableH(ph) ?? need) >= need);
		let pool = sharp;
		if (sharp.length < STREAM_MIN) {
			const best = new Set([...latestPool].sort((a, b) => (usableH(b) ?? 0) - (usableH(a) ?? 0)).slice(0, STREAM_MIN));
			pool = latestPool.filter((ph) => best.has(ph));
		}
		const half = Math.max(1, Math.ceil(pool.length / 2));
		return { right: pool.slice(0, half), left: pool.slice(half) };
	});
	const streamPhotos = $derived(streamPick.right);
	const streamPhotosAlt = $derived(streamPick.left);
	// Ponsel (< 640 px): koridor dipendekkan (CSS .ft-stream: 160px + 50vw) dan sumbunya diturunkan supaya pita kartu
	// (±25cqw di sekitar sumbu) duduk tepat di bawah tagline (±150 px) — dulu sumbu 55% dari 50svh menyisakan ±100 px
	// kosong di bawah kartu sebelum kolom footer.
	const streamAxis = $derived(vw < 640 ? Math.round((100 * (150 + 0.25 * vw)) / (160 + 0.5 * vw)) : 55);
	const toUrls = (list: Photo[]) => list.map((ph) => sharpUrl.get(ph.id) ?? imgFor(ph.seed, 600, 800, ph.thumbUrl ?? ""));
	const streamImages = $derived(toUrls(streamPhotos));
	const streamImagesAlt = $derived(toUrls(streamPhotosAlt));
	let footerEl = $state<HTMLElement>();
	$effect(() => {
		const el = footerEl;
		const list = [...streamPhotos, ...streamPhotosAlt];
		if (!el || !list.length || typeof IntersectionObserver === "undefined") return;
		const io = new IntersectionObserver(
			([e]) => {
				if (!e?.isIntersecting) return;
				io.disconnect();
				for (const ph of list) {
					if (ph.assetType === "VIDEO" || untrack(() => sharpUrl.has(ph.id))) continue;
					void fetchPhotoOriginal(ph.id, untrack(() => streamTier)).then((url) => {
						if (!url) return;
						// Berkas teracak: dimuat + di-decode lewat cache bersama — kanvas kartu menyusunnya dari objek yang sama.
						if (isScrambledUrl(url)) {
							loadScrambledCached(url).then(() => sharpUrl.set(ph.id, url), () => {});
							return;
						}
						const im = new Image();
						im.src = url;
						im.decode()
							.then(() => sharpUrl.set(ph.id, url))
							.catch(() => {});
					});
				}
			},
			{ rootMargin: "1500px 0px" },
		);
		io.observe(el);
		return () => io.disconnect();
	});
	$effect(() => {
		if (!isLanding) return;
		let alive = true;
		Promise.all([
			fetchHomepage().catch(() => ({})),
			// 24, bukan 12: ada ruang memilih foto yang cukup tajam (lihat streamPick); hanya JSON, gambar dimuat
			// untuk foto yang terpilih saja.
			fetchPhotos({ type: "FOTO", limit: 24 }).catch(() => null),
		])
			.then(([hp, latest]) => {
				if (!alive) return;
				const rk = (hp as Record<string, HomepageSection>)["koridor_kanan"]?.photos;
				const lk = (hp as Record<string, HomepageSection>)["koridor_kiri"]?.photos;
				if (rk?.length && lk?.length) curated = { right: rk.map(adaptPhoto), left: lk.map(adaptPhoto) };
				else if (latest) latestPool = latest.photos;
			})
			.catch(() => {});
		return () => {
			alive = false;
		};
	});
</script>

<!-- Tanpa garis atas: section di atas (etalase) larut ke --bg yang sama.
	Seluruh footer zona senyap: tak ada bunyi hover/klik di tautan mana pun. -->
<footer bind:this={footerEl} class="bg-bg" data-no-hover-sound data-no-click-sound>
	<!-- pb-24 di ponsel: tombol Help (kiri) dan panah ke atas (kanan) melayang di dasar layar dan menimpa baris
		hak cipta; ruang ekstra membuat baris itu bisa digulir ke atas mereka. -->
	<div class="mx-auto max-w-[1500px] px-6 pb-24 pt-10 md:pb-6 md:pt-20 lg:px-10">
		<!-- Tagline besar di tengah koridor foto (khusus landing): dua rel foto
			arsip melaju dari titik hilang ke arah penonton, tagline duduk di
			atasnya. Label + judul memudar masuk/keluar bersama mengikuti gulir
			(satu-satunya gerak mereka), lihat SliceHeadline. -->
		{#if isLanding}
		<ImageStream images={streamImages} imagesAlt={streamImagesAlt} path={{ exitHeight: streamExit }} axis={streamAxis} class="ft-stream">
			<div class="ft-stream-copy">
				<SliceHeadline
					kicker={c.nav.tagline}
					lineA={c.footer.taglineA}
					smallA={c.footer.taglineEm}
					smallB={c.footer.taglineB.trim().split(/\s+/)[0] ?? ""}
					lineB={c.footer.taglineB.trim().split(/\s+/).slice(1).join(" ")}
				/>
			</div>
		</ImageStream>
		{/if}

		<div class="rule mt-8 md:mt-14"></div>

		<!-- Columns -->
		<div class="mt-8 grid grid-cols-2 gap-10 md:mt-12 md:grid-cols-4">
			<div class="col-span-2 md:col-span-1">
				<ApiImage
					src="/logo1-sm.png"
					alt="Lakuna"
					width={200}
					height={36}
					eager
					class="no-cvd h-7 w-auto max-w-[44vw] [filter:brightness(0)_invert(1)] sm:max-w-none"
				/>
				<address class="mt-5 max-w-[22rem] text-sm not-italic leading-relaxed text-fg-muted">{ADDRESS}</address>
				<ul class="mt-5 flex items-center gap-5" aria-label="Social media">
					{#each SOCIAL as s (s.name)}
						<li>
							<a
								href={s.href || "#"}
								aria-label={s.name}
								target={s.href ? "_blank" : undefined}
								rel={s.href ? "noopener noreferrer" : undefined}
								class="grid h-6 w-6 place-items-center text-fg-muted transition-colors hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-safelight"
							>
								{#if s.name === "Facebook"}
									<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M13.5 21v-8h2.7l.4-3.2h-3.1V7.8c0-.9.3-1.5 1.6-1.5h1.7V3.4c-.3 0-1.3-.1-2.4-.1-2.4 0-4 1.5-4 4.1v2.4H7.7V13h2.7v8h3.1Z" /></svg>
								{:else if s.name === "X"}
									<svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.8 3h3.1l-6.8 7.7L22 21h-6.2l-4.9-6.3L5.3 21H2.2l7.3-8.3L2 3h6.4l4.4 5.8L17.8 3Zm-1.1 16.2h1.7L7.4 4.7H5.5l11.2 14.5Z" /></svg>
								{:else}
									<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3.5" y="3.5" width="17" height="17" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.2" cy="6.8" r="0.9" fill="currentColor" stroke="none" /></svg>
								{/if}
							</a>
						</li>
					{/each}
				</ul>
			</div>

			{#each [{ title: c.footer.company, items: c.footer.companyItems }, { title: c.footer.legal, items: c.footer.legalItems }, { title: c.footer.support, items: c.footer.supportItems }] as col (col.title)}
				<div>
					<p class="ft-head">{col.title}</p>
					<ul class="mt-6 space-y-3">
						{#each col.items as it (it)}
							<li>
								<!-- Hover: panah ↗ tumbuh dari kiri & mendorong teks
									(rujukan). Lebar slot panah dianimasikan, bukan
									translate — teks ikut bergeser secara alami. -->
								<a href={LINKS[it] ?? "#"} class="ft-link text-[0.92rem] text-fg/80 transition-colors hover:text-safelight">
									<span class="ft-arr" aria-hidden="true">
										<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17 17 7M8 7h9v9" /></svg>
									</span>{it}
								</a>
							</li>
						{/each}
					</ul>
				</div>
			{/each}
		</div>

		<div class="rule mt-16"></div>

		<div class="mt-6 flex flex-col items-center justify-center gap-3 text-xs text-fg-muted">
			<p class="kicker text-center">{c.footer.rights}</p>
		</div>
	</div>
</footer>
<style>
	/* Koridor selebar layar (keluar dari padding kontainer), setinggi layar. */
	:global(.ft-stream) {
		/* Ringkas: koridor + kolom + baris hak cipta muat satu layar. */
		height: clamp(320px, 50svh, 540px);
		margin: 0 calc(50% - 50vw);
		width: 100vw;
		/* Konteks tumpuk sendiri (dulu efek samping mask-image): z-index tagline & pelapis tetap terkurung di sini. */
		isolation: isolate;
	}
	/* Pinggir larut ke latar footer supaya kartu yang keluar tak terpotong garis keras di tepi section.
	   Dulu mask-image (transparan → hitam 5% … 88% → transparan) pada koridor: karena isinya 18 kartu yang
	   beranimasi di kompositor, topeng itu memaksa satu lapisan offscreen selebar layar × tinggi koridor
	   digambar ulang + ditopengi TIAP frame selama koridor terlihat. Kini dua pelapis berwarna latar
	   (--bg, sama dengan latar footer yang pejal) yang memudar ke transparan dengan rentang yang sama — secara
	   matematis hasilnya identik (isi × a + latar × (1 − a)), tapi berupa tekstur diam tanpa lapisan offscreen. */
	:global(.ft-stream)::before,
	:global(.ft-stream)::after {
		content: "";
		position: absolute;
		left: 0;
		right: 0;
		/* Di atas kartu DAN tagline (.ft-stream-copy z-index 2) — topeng dulu juga memudarkan keduanya. */
		z-index: 3;
		pointer-events: none;
	}
	:global(.ft-stream)::before {
		top: 0;
		height: 5%;
		background: linear-gradient(to bottom, var(--bg), transparent);
	}
	:global(.ft-stream)::after {
		bottom: 0;
		height: 12%;
		background: linear-gradient(to top, var(--bg), transparent);
	}
	/* Mode warna paksa (high contrast): latar footer diganti warna sistem, pelapis --bg tak lagi cocok —
	   kembali ke topeng aslinya. */
	@media (forced-colors: active) {
		:global(.ft-stream) {
			-webkit-mask-image: linear-gradient(to bottom, transparent, #000 5%, #000 88%, transparent);
			mask-image: linear-gradient(to bottom, transparent, #000 5%, #000 88%, transparent);
		}
		:global(.ft-stream)::before,
		:global(.ft-stream)::after {
			content: none;
		}
	}
	.ft-stream-copy {
		position: relative;
		z-index: 2;
		height: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: flex-start;
		text-align: center;
		/* Teks dinaikkan (permintaan): rapat ke atas koridor. Zona pudar topeng di atas
		   dipersempit (5%) agar kicker tetap terang. */
		padding: clamp(0.5rem, 2svh, 1.25rem) 1.5rem 0;
	}
	/* Tagline di koridor lebih kecil dari ukuran bawaan SliceHeadline
	   (9,4vw) supaya kartu di kiri-kanan tetap terbaca sebagai koridor. */
	.ft-stream-copy :global(.sl) {
		font-size: clamp(1.8rem, 5vw, 4.5rem);
	}
	/* Ponsel: 5vw hanya ±20px/28px — tagline jadi kecil sekali di layar 390px. Dibesarkan agar terbaca
	   (±41px), sedangkan kartu koridor tetap terlihat di kiri-kanan. */
	@media (max-width: 639px) {
		.ft-stream-copy :global(.sl) {
			font-size: clamp(2.2rem, 10.5vw, 2.9rem);
		}
		/* Tagline (±150 px) + pita kartu (±50cqw) + napas — pasangannya streamAxis di skrip. */
		:global(.ft-stream) {
			height: calc(160px + 50vw);
		}
	}
	/* Genangan gelap lembut di belakang tagline: kartu yang lewat di tengah
	   tak pernah menabrak keterbacaan huruf. */
	.ft-stream-copy::before {
		content: "";
		position: absolute;
		inset: 18% 8%;
		z-index: -1;
		background: radial-gradient(ellipse at center, color-mix(in srgb, var(--bg) 92%, transparent) 0%, color-mix(in srgb, var(--bg) 70%, transparent) 45%, transparent 72%);
		pointer-events: none;
	}

	/* Kepala kolom: lebih besar dari kicker biasa supaya kolom punya jangkar. */
	.ft-head {
		margin: 0;
		font-family: var(--font-mono);
		font-size: clamp(0.85rem, 1.05vw, 1rem);
		font-weight: 600;
		letter-spacing: 0.22em;
		text-transform: uppercase;
		color: var(--fg-muted);
	}
	.ft-link {
		display: inline-flex;
		align-items: center;
	}
	/* Slot panah: lebar 0 saat diam; hover → melebar, panah muncul dari
	   kiri-bawah seperti rujukan, teks terdorong ke kanan. */
	.ft-arr {
		display: inline-flex;
		align-items: center;
		width: 0;
		overflow: hidden;
		flex-shrink: 0;
		transition: width 0.35s cubic-bezier(0.22, 1, 0.36, 1);
	}
	.ft-arr svg {
		flex-shrink: 0;
		opacity: 0;
		transform: translate(-6px, 6px) scale(0.6);
		transition:
			opacity 0.25s ease,
			transform 0.35s cubic-bezier(0.22, 1, 0.36, 1);
	}
	.ft-link:hover .ft-arr,
	.ft-link:focus-visible .ft-arr {
		width: 1.05em;
	}
	.ft-link:hover .ft-arr svg,
	.ft-link:focus-visible .ft-arr svg {
		opacity: 1;
		transform: none;
	}
	@media (prefers-reduced-motion: reduce) {
		.ft-arr,
		.ft-arr svg {
			transition: none;
		}
	}
</style>
