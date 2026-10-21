<script lang="ts">
	import { backNav } from "$lib/backNav";
	import { goto } from "$app/navigation";
	import ApiImage from "./ApiImage.svelte";
	import gsap from "gsap";
	import { i18n } from "$lib/i18n.svelte";
	import { store } from "$lib/store.svelte";
	import { catLabel, fmtIDR, fmtTakenAt, imgFor, fetchPhotoById, fetchPhotoOriginal, fetchRelatedPhotos, fetchVideos, fetchContributorWorks, pickVideoPreview, type Video, type Photo } from "$lib/data";
	import Reveal from "./Reveal.svelte";
	import { subscribeModal } from "$lib/subscribeModal.svelte";
	import { authModal } from "$lib/authModal.svelte";
	import { page } from "$app/state";
	import PhotoCard from "./PhotoCard.svelte";
	import VideoCard from "./VideoCard.svelte";
	import DetailTitle from "./DetailTitle.svelte";
	import { isScrambledUrl, scrambled } from "$lib/photoScramble";

	let { videoId }: { videoId: string } = $props();

	const copy = {
		id: {
			back: "Kembali", by: "oleh", cat: "Kategori", duration: "Durasi", resolution: "Resolusi", taken: "Diambil", ai: "Dibuat dengan AI", aiHint: "Karya ini dibuat dengan AI generatif lalu dikurasi tim Lakuna.",
			format: "Format", tags: "Kata kunci", license: "Lisensi", personal: "Standar", commercial: "Premium", subscribe: "Berlangganan", fromPrice: "mulai", perMonth: "/bulan",
			personalDesc: "Pakai pribadi & media sosial", commercialDesc: "Kuota unduhan bulanan",
			addToCart: "Tambah ke keranjang", added: "Ditambahkan", buyNow: "Beli sekarang",
			save: "Simpan", saved: "Tersimpan", noClip: "Pratinjau klip belum tersedia",
			slip: "Lembar lisensi", usage: "Jenis pakai", fee: "Biaya lisensi",
			youGet: "Yang kamu terima",
			previewNote: "Pratinjau diputar pada resolusi asli dengan watermark. File master tanpa watermark bisa diunduh setelah pembelian",
			relPhoto: "Arsip foto", relVideo: "Arsip video", byArtist: "Dari perajangga yang sama",
			relPhotos: "Foto terkait", relVideos: "Video terkait",
			contrib: "Arsip profil", contribSub: "Karya lain dari",
			seeAll: "Lihat semua",
			fmtValue: "File master asli"
		},
		en: {
			back: "Back", by: "by", cat: "Category", duration: "Duration", resolution: "Resolution", taken: "Taken", ai: "Made with AI", aiHint: "This work was created with generative AI and curated by the Lakuna team.",
			format: "Format", tags: "Keywords", license: "License", personal: "Standard", commercial: "Premium", subscribe: "Subscribe", fromPrice: "from", perMonth: "/month",
			personalDesc: "Personal & social media use", commercialDesc: "Monthly download quota",
			addToCart: "Add to cart", added: "Added", buyNow: "Buy now",
			save: "Save", saved: "Saved", noClip: "No preview clip available yet",
			slip: "Licence slip", usage: "Usage", fee: "Licence fee",
			youGet: "What you get",
			previewNote: "The preview plays at full resolution with a watermark. The clean master file is available to download after purchase",
			relPhoto: "Photo archives", relVideo: "Video archives", byArtist: "From the same image-maker",
			relPhotos: "Related photos", relVideos: "Related videos",
			contrib: "Profile archives", contribSub: "More works from",
			seeAll: "See all",
			fmtValue: "Original master file"
		}
	};

	const lang = $derived(i18n.lang);
	const t = $derived(copy[lang]);
	const back = backNav("/videos");

	let license = $state<"personal" | "commercial">("personal");
	let added = $state(false);
	let playing = $state(false);
	let video = $state<Video | null>(null);
	// Kata kunci mengikuti bahasa; bila versi Inggris belum diisi, tampilkan yang Indonesia.
	const kws = $derived(
		lang === "en" && video?.keywordsEn?.length ? video.keywordsEn : (video?.keywords ?? []),
	);
	// Tanggal & waktu pengambilan (opsional), tampil di bawah nama perajangga; "" = barisnya disembunyikan.
	const takenText = $derived(fmtTakenAt(video?.takenAt, lang));
	let related = $state<Photo[]>([]);
	let relVideos = $state<Video[]>([]);
	let contrib = $state<Photo[]>([]);
	// URL klip disimpan terpisah: field-nya ada di Photo (sumber dari API),
	// bukan di tipe Video. Versi H.264 hasil transcode dipakai lebih dulu —
	// lebih ringan dan pasti terputar di browser; master hanya cadangan.
	let clipUrl = $state<string | null>(null);
	/** Cadangan bila berkas asli gagal diputar. */
	let fallbackUrl: string | null = null;
	/** Frame pertama siap → gambar pengganti poster disembunyikan. */
	let clipReady = $state(false);
	/** Menunggu unduhan/stream: spinner di atas poster/pemutar supaya
		pengguna tahu videonya sedang dimuat, bukan macet. File asli bisa
		puluhan MB — di koneksi lambat butuh belasan detik buffering. */
	let buffering = $state(true);

	let rootEl: HTMLDivElement | undefined = $state();

	// Rel lisensi mobile — pola yang sama dengan PhotoDetail: rel baru
	// muncul setelah tombol aslinya lewat ke atas, dan tombol
	// mengambang ikut naik supaya tidak tertutup.
	let ctaPassed = $state(false);
	let ctaEl: HTMLButtonElement | undefined = $state();

	$effect(() => {
		const el = ctaEl;
		if (!el) return;
		const update = () => (ctaPassed = el.getBoundingClientRect().bottom < 0);
		update();
		window.addEventListener("scroll", update, { passive: true });
		window.addEventListener("resize", update);
		return () => {
			window.removeEventListener("scroll", update);
			window.removeEventListener("resize", update);
		};
	});

	$effect(() => {
		const naik = ctaPassed && window.innerWidth < 640;
		const els = [...document.querySelectorAll<HTMLElement>(".fab-mengambang")];
		for (const el of els) el.style.bottom = naik ? "6.25rem" : "";
		return () => {
			for (const el of els) el.style.bottom = "";
		};
	});

	$effect(() => {
		// URL pemutar diminta PARALEL dengan detail (bukan serial di dalam .then):
		// pratinjau resolusi asli bisa puluhan MB — tiap RTT yang dihemat berarti
		// pemutar dapat src lebih cepat dan mulai buffering lebih awal.
		const originalPromise = fetchPhotoOriginal(videoId).catch(() => null);
		fetchPhotoById(videoId).then((p) => {
			// Tautan ke /videos/<id foto>: halaman detail foto yang benar.
			if (p?.assetType === "FOTO" || p?.assetType === "AUDIO") {
				void goto(`/${p.assetType === "AUDIO" ? "sounds" : "photos"}/${p.id}`, { replaceState: true });
				return;
			}
			if (p) {
				video = { ...p, duration: "02:00", desc: p.desc };
				// Pemutar memakai pratinjau RESOLUSI ASLI ber-watermark, diminta
				// per video lewat /view (file master hanya lewat unduhan berlisensi).
				// Pratinjau 640 px hanya cadangan: bila /view gagal atau browser
				// tak bisa memutarnya (onerror di <video>).
				const preview = pickVideoPreview(p.clipUrl, p.watermarkUrl);
				fallbackUrl = pickVideoPreview(p.watermarkUrl, p.clipUrl);
				originalPromise.then((url) => (clipUrl = url ?? preview));
				fetchContributorWorks(p.author, p.id, 8)
					.then((c) => (contrib = c))
					.catch(() => {});
			}
		});
		fetchRelatedPhotos(videoId, 4, "FOTO").then((r) => (related = r)).catch(() => {});
		fetchVideos(7)
			.then((r) => {
				relVideos = r.videos.filter((v) => v.id !== videoId).slice(0, 4);
			})
			.catch(() => {});
	});

	const fav = $derived(video ? store.isFavorite(video.id) : false);
	// Durasi & resolusi SUNGGUHAN (dulu tertulis mati "02:00 · 4K UHD" untuk semua klip): durasi dari metadata
	// pemutar (pratinjau sama panjang dengan aslinya), resolusi dari ukuran asli berkas (API).
	let durSec = $state(0);
	// Batas tampil pemutar = ukuran asli berkas dalam px CSS (video 1080p di kotak 1.028 px CSS retina tak
	// direntangkan 1,07×; tampil 1:1 di tengah latar hitam). Layar penuh tetap mengikuti browser.
	let dpr = $state(typeof window === "undefined" ? 1 : window.devicePixelRatio || 1);
	$effect(() => {
		const upd = () => (dpr = window.devicePixelRatio || 1);
		window.addEventListener("resize", upd);
		return () => window.removeEventListener("resize", upd);
	});
	const playerMax = $derived(
		video?.nativeW && video?.nativeH ? { w: video.nativeW / dpr, h: video.nativeH / dpr } : null,
	);
	const durText = $derived.by(() => {
		if (!(durSec > 0)) return "";
		const s = Math.round(durSec);
		const two = (n: number) => String(n).padStart(2, "0");
		return s >= 3600 ? `${Math.floor(s / 3600)}:${two(Math.floor((s % 3600) / 60))}:${two(s % 60)}` : `${two(Math.floor(s / 60))}:${two(s % 60)}`;
	});
	const resLabel = $derived.by(() => {
		const w = video?.nativeW;
		const h = video?.nativeH;
		if (!w || !h) return "";
		const long = Math.max(w, h);
		return long >= 7680 ? "8K" : long >= 3840 ? "4K UHD" : long >= 2560 ? "QHD" : long >= 1920 ? "Full HD" : long >= 1280 ? "HD" : `${w}×${h}`;
	});
	const price = $derived(video ? (license === "personal" ? video.price : video.price * 2) : 0);
	// Nomor katalog untuk dibaca manusia — enam digit terakhir id sudah cukup
	// menyebut satu klip; id penuhnya tetap hidup di URL dan keranjang.
	const frameNo = $derived(video ? video.id.slice(-6).toUpperCase() : "");

	// Animasi plate (masuk) sekali video tersedia.
	$effect(() => {
		if (!video) return;
		if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
		const plate = rootEl?.querySelector<HTMLElement>("[data-plate]");
		if (plate) gsap.fromTo(plate, { y: 28, opacity: 0 }, { y: 0, opacity: 1, duration: 1.1, ease: "power3.out" });
	});

	function handleAdd() {
		if (!video) return;
		store.addToCart({
			id: `${video.id}-${license}`,
			kind: "video",
			title: `${video.title[lang]} — ${license === "personal" ? t.personal : t.commercial}`,
			price,
			meta: video.id
		});
		added = true;
		setTimeout(() => (added = false), 1800);
	}

	// Aksi utama = beli langsung: masuk keranjang lalu ke checkout.
	// Belum masuk: buka login dan TETAP di halaman ini (jangan ke checkout).
	function handleBuyNow() {
		if (!store.user) {
			authModal.open(page.url.pathname + page.url.search);
			return;
		}
		handleAdd();
		goto("/checkout");
	}

	// Premium = langganan berkuota, bukan harga satuan ×2: tombol utama membuka
	// popup harga langganan (bukan checkout), dan angka yang tampil adalah paket
	// termurah per bulan.
	const isPremium = $derived(license === "commercial");
	const premiumFrom = $derived(subscribeModal.fromMonthly);
	const premiumRowLabel = $derived(premiumFrom ? `${fmtIDR(premiumFrom)}${t.perMonth}` : "…");
	const premiumLabel = $derived(premiumFrom ? `${t.fromPrice} ${fmtIDR(premiumFrom)}${t.perMonth}` : "…");
	function handlePrimary() {
		if (isPremium) subscribeModal.open();
		else handleBuyNow();
	}
	$effect(() => {
		void subscribeModal.load();
	});
</script>

{#snippet meta(label: string, value: string)}
	<div class="flex items-baseline justify-between gap-6 border-b border-hair py-3.5 sm:block sm:border-0 sm:py-0">
		<p class="kicker shrink-0 text-fg-muted">{label}</p>
		<p class="text-right text-sm text-fg sm:mt-1.5 sm:text-left">{value}</p>
	</div>
{/snippet}

{#snippet licenseRow(active: boolean, onpick: () => void, title: string, desc: string, optPrice: number, priceLabel = "")}
	<button
		type="button"
		role="radio"
		aria-checked={active}
		onclick={onpick}
		class="group/row flex w-full items-start justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-fg/[0.03] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-safelight"
	>
		<span class="flex items-start gap-3">
			<span
				class={`mt-[3px] grid h-3.5 w-3.5 shrink-0 place-items-center rounded-full border transition-colors ${
					active ? "border-safelight" : "border-fg-muted/50 group-hover/row:border-fg-muted"
				}`}
			>
				<span class={`h-1.5 w-1.5 rounded-full transition-colors ${active ? "bg-safelight" : "bg-transparent"}`}></span>
			</span>
			<span>
				<span class={`block text-sm ${active ? "text-fg" : "text-fg/80"}`}>{title}</span>
				<span class="mt-0.5 block text-xs leading-relaxed text-fg-muted">{desc}</span>
			</span>
		</span>
		<span class="shrink-0 pt-px text-right font-mono text-[0.82rem] tabular-nums">{priceLabel || fmtIDR(optPrice)}</span>
	</button>
{/snippet}

{#if !video}
	<div class="min-h-screen pt-[calc(var(--banner-h,0px)+var(--nav-h)+1.15rem)] sm:pt-28"></div>
{:else}
	<div bind:this={rootEl} class="min-h-screen pt-[calc(var(--banner-h,0px)+var(--nav-h)+1.15rem)] sm:pt-28">
		<!-- Top strip -->
		<div class="mx-auto flex max-w-[1500px] items-center px-6 pb-6 lg:px-10">
			<a href={back.href} onclick={back.onclick} class="arrow-link text-sm text-fg-muted hover:text-safelight">
				<span class="arr">←</span> {t.back}
			</a>
		</div>

		<div class="mx-auto flex max-w-[1500px] flex-col gap-8 px-6 pb-20 lg:grid lg:grid-cols-[1fr_22rem] lg:gap-10 lg:px-10">
			<!-- ───────── Plate ───────── -->
			<div class="lg:col-start-1 lg:row-start-1">
				<figure
					data-plate
					class="group relative overflow-hidden"
				>
					<div class="pointer-events-none absolute -inset-10 bg-[radial-gradient(circle_at_50%_40%,color-mix(in_srgb,var(--safelight)_18%,transparent),transparent_60%)] blur-2xl"></div>
					<!-- Latar hitam penuh: video yang aslinya lebih kecil dari kotak tampil 1:1 di tengahnya. -->
					<div class="relative aspect-video w-full overflow-hidden bg-black">
						<!-- Pemutar sungguhan. Sebelumnya di sini hanya gambar diam,
							tombol play yang mengubah state, dan bilah progres palsu
							yang bergerak lewat transisi CSS — klipnya tidak pernah
							benar-benar diputar. -->
						{#if clipUrl}
							<!-- Pengganti atribut poster: <img> ikut dipotong pita
								kreditnya oleh creditCrop; poster <video> tidak. Thumbnail API
								teracak → <canvas> yang disusun ulang (sudah tanpa pita). -->
							{#if !clipReady}
								{#if isScrambledUrl(imgFor(video.seed, 1600, 900, video.thumbUrl))}
									<canvas
										use:scrambled={{ src: imgFor(video.seed, 1600, 900, video.thumbUrl), eager: true }}
										aria-hidden="true"
										class="pointer-events-none absolute inset-0 z-[1] h-full w-full bg-black object-contain"
									></canvas>
								{:else}
									<img
										src={imgFor(video.seed, 1600, 900, video.thumbUrl)}
										alt=""
										aria-hidden="true"
										class="pointer-events-none absolute inset-0 z-[1] h-full w-full bg-black object-contain"
									/>
								{/if}
							{/if}
							<!-- Menu ⋮ bawaan peramban dihilangkan: tanpa unduh, kecepatan, PiP, dan cast, isinya kosong
								sehingga tombolnya tak ditampilkan. -->
							<!-- svelte-ignore a11y_media_has_caption -->
							<video
								src={clipUrl}
								onloadeddata={() => (clipReady = true)}
								onloadedmetadata={(e) => {
									const d = e.currentTarget.duration;
									if (Number.isFinite(d) && d > 0) durSec = d;
								}}
								onplay={() => (clipReady = true)}
								onwaiting={() => (buffering = true)}
								onseeking={() => (buffering = true)}
								onplaying={() => (buffering = false)}
								oncanplay={() => (buffering = false)}
								controls
								controlslist="nodownload noplaybackrate noremoteplayback"
								disablepictureinpicture
								disableremoteplayback
								playsinline
								preload="auto"
								onerror={() => {
									if (fallbackUrl && clipUrl !== fallbackUrl) clipUrl = fallbackUrl;
								}}
								style:max-width={playerMax ? `${playerMax.w}px` : undefined}
								style:max-height={playerMax ? `${playerMax.h}px` : undefined}
								class="absolute inset-0 m-auto h-full w-full bg-black object-contain"
							></video>
							{#if buffering}
								<div
									class="pointer-events-none absolute inset-0 z-[2] grid place-items-center"
									aria-hidden="true"
								>
									<span
										class="h-10 w-10 animate-spin rounded-full border-2 border-ivory/25 border-t-ivory"
									></span>
								</div>
							{/if}
						{:else}
							<ApiImage
								src={imgFor(video.seed, 1600, 900, video.thumbUrl)}
								alt={video.title[lang]}
								fill
								eager
								class="object-cover opacity-90"
							/>
							<div class="grain pointer-events-none absolute inset-0 opacity-[0.1] mix-blend-soft-light"></div>
							<p class="absolute inset-0 grid place-items-center px-6 text-center text-sm text-ivory/70">
								{t.noClip}
							</p>
						{/if}
						<div class="grain pointer-events-none absolute inset-0 opacity-[0.12] mix-blend-soft-light"></div>
						<div class="pointer-events-none absolute inset-0 opacity-0 shadow-[inset_0_0_120px_rgba(0,0,0,0.45)] transition-opacity duration-500 [.dark_&]:opacity-100"></div>

						{#each ["tl", "tr", "bl", "br"] as c (c)}
							<span
								class={`pointer-events-none absolute h-6 w-6 border-ivory/70 ${
									c === "tl" ? "left-3 top-3 border-l border-t"
									: c === "tr" ? "right-3 top-3 border-r border-t"
									: c === "bl" ? "bottom-3 left-3 border-b border-l"
									: "bottom-3 right-3 border-b border-r"
								}`}
							></span>
						{/each}
					</div>
				</figure>

				<!-- Strip bukti: nomor bingkai + durasi -->
				<div class="mt-3 flex items-center justify-between gap-4">
					<p class="kicker text-fg-muted">
						No. {frameNo}{#if durText}<span class="hidden sm:inline"> — {durText}</span>{/if}
					</p>
					<span class="kicker text-fg-muted">{catLabel[video.cat][lang]}</span>
				</div>

				<!-- Keterangan: judul dan perajangga menempel pada klip,
					bukan pada lembar lisensi. -->
				<!-- Judul paling banyak dua baris, selebar kolom klip (lihat DetailTitle). -->
				<div class="mt-8">
					<DetailTitle text={video.title[lang]} />
					<p class="mt-3 kicker text-fg-muted">
						{t.by} <a href={`/archive/${encodeURIComponent(video.author)}`} class="text-safelight underline-offset-4 transition-colors hover:text-fg hover:underline">{video.author}</a>
						<!-- Karya AI diberi label jelas (juga digitalSourceType di JSON-LD, lihat seo.ts). -->
						{#if video.aiGenerated}
							<span title={t.aiHint} class="ml-2 inline-flex items-center rounded-full border border-hair px-2 py-0.5 align-middle text-[10px] tracking-[0.12em] text-fg">{t.ai}</span>
						{/if}
					</p>
					<!-- Tanggal & waktu pengambilan: baris sekunder tepat di bawah perajangga. -->
					{#if takenText}
						<p class="mt-1.5 kicker tabular-nums text-fg-muted/70">
							{t.taken} <time datetime={video.takenAt}>{takenText}</time>
						</p>
					{/if}
				</div>
			</div>

			<!-- ───────── Lembar lisensi ─────────
				Dokumen yang sama dengan halaman foto: garis rambut antar-baris,
				sudut siku, satu aksi utama. -->
			<aside class="lg:sticky lg:top-28 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-start">
				<div class="proof-slip border border-hair">
					<div class="flex items-baseline justify-between gap-4 border-b border-hair px-5 py-4">
						<span class="kicker text-fg-muted">{t.slip}</span>
						<span class="font-mono text-[0.7rem] tracking-[0.14em] text-fg-muted">{frameNo}</span>
					</div>

					<div class="px-5 pt-4">
						<span class="kicker text-fg-muted">{t.usage}</span>
					</div>
					<div role="radiogroup" aria-label={t.usage} class="mt-1 divide-y divide-hair border-b border-hair">
						{@render licenseRow(license === "personal", () => (license = "personal"), t.personal, t.personalDesc, video.price)}
						{@render licenseRow(license === "commercial", () => (license = "commercial"), t.commercial, t.commercialDesc, video.price * 2, premiumRowLabel)}
					</div>

					<!-- Satu-satunya angka berukuran penuh di panel ini, dan ia milik
						pilihan yang aktif. -->
					<div class="border-b border-hair px-5 py-5">
						<span class="kicker text-fg-muted">{t.fee}</span>
						<p class="mt-2 font-display text-[2.1rem] font-light leading-none tracking-[-0.02em] text-fg">
							{#if isPremium}
								<span class="mr-2 font-body text-base text-fg-muted">{t.fromPrice}</span>{premiumFrom ? fmtIDR(premiumFrom) : "…"}<span class="ml-1 font-body text-base text-fg-muted">{t.perMonth}</span>
							{:else}
								{fmtIDR(price)}
							{/if}
						</p>
					</div>

					<!-- Satu aksi utama. "Beli lisensi" dan "Simpan" turun jadi teks
						tenang di satu baris. -->
					<div class="px-5 py-5">
						<button
							bind:this={ctaEl}
							type="button"
							onclick={handlePrimary}
							class="press w-full rounded-full bg-safelight py-3.5 text-sm font-medium text-ivory shadow-[0_14px_40px_-12px_var(--safelight-glow)] transition-transform hover:scale-[1.02] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-safelight"
						>
							{isPremium ? t.subscribe : t.buyNow}
						</button>
						<div class="mt-3.5 flex items-center justify-between text-sm">
							{#if !isPremium}
							<button
								type="button"
								onclick={handleAdd}
								class="inline-flex items-center gap-2 text-fg-muted transition-colors hover:text-safelight"
							>
								<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
									<path d="M3 3h2l2.4 12.5a2 2 0 0 0 2 1.5h7.2a2 2 0 0 0 2-1.5L21 7H6" />
									<circle cx="9" cy="20" r="1.3" /><circle cx="18" cy="20" r="1.3" />
								</svg>
								{added ? `✓ ${t.added}` : t.addToCart}
							</button>
							{/if}
							<button
								type="button"
								onclick={() => store.toggleFavorite(video!.id)}
								class="ml-auto text-fg-muted transition-colors hover:text-safelight"
							>
								{fav ? `♥ ${t.saved}` : `♡ ${t.save}`}
							</button>
						</div>
					</div>

					<!-- Spesifikasi kiriman untuk klip. -->
					<div class="border-t border-hair px-5 py-4">
						<span class="kicker text-fg-muted">{t.youGet}</span>
						<p class="mt-2 font-mono text-[0.76rem] tabular-nums text-fg">
							{[durText, resLabel, t.fmtValue].filter(Boolean).join(" · ")}
						</p>
						<p class="mt-2 text-xs leading-relaxed text-fg-muted">{t.previewNote}</p>
					</div>
				</div>
			</aside>

			<!-- Deskripsi dan data klip. Di mobile ini duduk SETELAH lembar
				lisensi: yang dicari orang di layar sempit adalah harga dan tombol,
				bukan paragraf. Di lg ia kembali ke kolom kiri, baris kedua. -->
			<div class="max-w-2xl lg:col-start-1 lg:row-start-2 lg:-mt-4">
				<!-- Tanpa deskripsi, API mengisi desc = judul; jangan ulang judulnya. -->
				{#if video.desc[lang] && video.desc[lang] !== video.title[lang]}
					<p class="text-[1.02rem] leading-relaxed text-fg-muted">{video.desc[lang]}</p>
				{/if}

				<!-- Data klip. Di mobile jadi baris-baris bergaris rambut —
					bahasa yang sama dengan lembar lisensi. -->
				<div class="mt-8 border-t border-hair pt-2 sm:grid sm:grid-cols-3 sm:gap-x-8 sm:gap-y-5 sm:pt-8">
					{@render meta(t.cat, (lang === "en" && video.categoriesEn?.length ? video.categoriesEn : video.categories).join(", ") || catLabel[video.cat][lang])}
					{@render meta(t.duration, durText || "—")}
					<div class="flex items-baseline justify-between gap-6 border-b border-hair py-3.5 sm:block sm:border-0 sm:py-0">
						<p class="kicker shrink-0 text-fg-muted">{t.tags}</p>
						<div class="flex flex-wrap justify-end gap-1.5 sm:mt-2 sm:justify-start">
							{#if kws.length}
								{#each kws as kw (kw)}
									<a href={`/archives?q=${encodeURIComponent(kw)}`} class="press kicker rounded-full border border-hair px-3 py-1.5 text-fg-muted transition-colors hover:border-safelight hover:text-safelight">
										#{kw}
									</a>
								{/each}
							{:else}
								<span class="text-sm text-fg/40">—</span>
							{/if}
						</div>
					</div>
				</div>
			</div>
		</div>

		<!-- ───────── Video terkait (di atas foto terkait) ───────── -->
		{#if relVideos.length > 0}
			<section class="mx-auto max-w-[1500px] px-6 pb-20 lg:px-10">
				<!-- < 360 px: judul (kata terpanjang ±120 px) + tombol "Lihat semua" (±116 px) tak muat berdampingan — tombol turun baris. -->
				<Reveal class="mb-8 flex items-end justify-between gap-x-6 gap-y-4 max-[360px]:flex-wrap">
					<div>
						<p data-reveal class="kicker text-safelight">{t.relVideo}</p>
						<h2 data-reveal class="mt-4 font-display text-2xl font-light tracking-[-0.02em] text-fg">{t.relVideos}</h2>
					</div>
					<a data-reveal href="/videos" class="shrink-0 rounded-full border border-hair px-5 py-2.5 text-xs font-medium text-fg transition-colors hover:border-safelight hover:text-safelight">
						{t.seeAll}
					</a>
				</Reveal>
				<!-- < 400 px: rel geser (kartu 86% + intip kartu berikutnya). Dua kolom di sana hanya ±130 px per kartu —
					judul terpotong di baris kedua, nama fotografer terpotong, tombol hati menimpa judul. -->
				<Reveal stagger={0.08} class="grid grid-flow-col auto-cols-[86%] gap-3 overflow-x-auto snap-x snap-mandatory -mx-6 px-6 scroll-px-6 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden min-[400px]:mx-0 min-[400px]:grid-flow-row min-[400px]:grid-cols-2 min-[400px]:gap-4 min-[400px]:overflow-visible min-[400px]:px-0 min-[400px]:pb-0 md:grid-cols-4">
					{#each relVideos as v (v.id)}
						<div data-reveal class="snap-start">
							<VideoCard video={v} />
						</div>
					{/each}
				</Reveal>
			</section>
		{/if}

		<!-- ───────── Foto terkait ───────── -->
		{#if related.length > 0}
			<section class="mx-auto max-w-[1500px] px-6 pb-20 lg:px-10">
				<Reveal class="mb-8 flex items-end justify-between gap-x-6 gap-y-4 max-[360px]:flex-wrap">
					<div>
						<p data-reveal class="kicker text-safelight">{t.relPhoto}</p>
						<h2 data-reveal class="mt-4 font-display text-2xl font-light tracking-[-0.02em] text-fg">{t.relPhotos}</h2>
					</div>
					<a data-reveal href="/photos" class="shrink-0 rounded-full border border-hair px-5 py-2.5 text-xs font-medium text-fg transition-colors hover:border-safelight hover:text-safelight">
						{t.seeAll}
					</a>
				</Reveal>
				<Reveal stagger={0.08} class="grid grid-flow-col auto-cols-[86%] gap-3 overflow-x-auto snap-x snap-mandatory -mx-6 px-6 scroll-px-6 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden min-[400px]:mx-0 min-[400px]:grid-flow-row min-[400px]:grid-cols-2 min-[400px]:gap-4 min-[400px]:overflow-visible min-[400px]:px-0 min-[400px]:pb-0 md:grid-cols-4">
					{#each related as v (v.id)}
						<div data-reveal class="snap-start">
							<PhotoCard photo={v} landscape />
						</div>
					{/each}
				</Reveal>
			</section>
		{/if}

		<!-- ───────── Galeri kontributor ───────── -->
		{#if contrib.length > 0 && video}
			<section class="mx-auto max-w-[1500px] px-6 pb-28 lg:px-10">
				<Reveal class="mb-8 flex items-end justify-between gap-x-6 gap-y-4 max-[360px]:flex-wrap">
					<div>
						<p data-reveal class="kicker text-safelight">{t.contrib}</p>
						<h2 data-reveal class="mt-4 font-display text-2xl font-light tracking-[-0.02em] text-fg">
							{t.contribSub} <a href={`/archive/${encodeURIComponent(video.author)}`} class="text-safelight underline-offset-4 transition-colors hover:text-fg hover:underline">{video.author}</a>
						</h2>
					</div>
					<a data-reveal href={`/archive/${encodeURIComponent(video.author)}`} class="shrink-0 rounded-full border border-hair px-5 py-2.5 text-xs font-medium text-fg transition-colors hover:border-safelight hover:text-safelight">
						{t.seeAll}
					</a>
				</Reveal>
				<Reveal stagger={0.08} class="grid grid-flow-col auto-cols-[86%] gap-3 overflow-x-auto snap-x snap-mandatory -mx-6 px-6 scroll-px-6 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden min-[400px]:mx-0 min-[400px]:grid-flow-row min-[400px]:grid-cols-2 min-[400px]:gap-4 min-[400px]:overflow-visible min-[400px]:px-0 min-[400px]:pb-0 md:grid-cols-4">
					{#each contrib as v (v.id)}
						<div data-reveal class="snap-start">
							<PhotoCard photo={v} landscape />
						</div>
					{/each}
				</Reveal>
			</section>
		{/if}

		<!-- ───────── Rel lisensi (mobile) ───────── -->
		<div
			inert={!ctaPassed}
			aria-hidden={!ctaPassed}
			class={`fixed inset-x-0 bottom-0 z-40 border-t border-hair bg-bg/95 backdrop-blur-md transition-transform duration-300 ease-out motion-reduce:transition-none sm:hidden ${
				ctaPassed ? "translate-y-0" : "translate-y-full"
			}`}
		>
			<div class="flex items-center gap-4 px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
				<div class="min-w-0">
					<p class="kicker truncate text-fg-muted">{license === "personal" ? t.personal : t.commercial}</p>
					<p class="mt-1 font-mono text-[0.95rem] tabular-nums text-fg">{isPremium ? premiumLabel : fmtIDR(price)}</p>
				</div>
				<button
					type="button"
					onclick={handlePrimary}
					class="press ml-auto shrink-0 rounded-full bg-safelight px-6 py-3 text-sm font-medium text-ivory focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-safelight"
				>
					{isPremium ? t.subscribe : t.buyNow}
				</button>
			</div>
		</div>
	</div>
{/if}

