<script lang="ts">
	import { goto } from "$app/navigation";
	import gsap from "gsap";
	import { ScrollTrigger } from "gsap/ScrollTrigger";
	import { i18n } from "$lib/i18n.svelte";
	import { store } from "$lib/store.svelte";
	import { fetchPhotos, fetchPhotoOriginal, fetchVideos, fetchHomepage, refreshHomepage, fetchPlans, adaptPhoto, adaptVideo, imgFor, USE_DUMMY_IMAGES, fmtIDR, loadHomeSnapshot, saveHomeSnapshot, stripPicsumPhotos, homepageHasPicsum, mergeMediaById, mergeHomepage, type Photo, type Video, type Plan, type HomepageSection } from "$lib/data";
	import { apiGet } from "$lib/api";
	import { calmRefresh } from "$lib/scrollCalm";
	import { getLenis } from "$lib/lenis";
	import { soundOn } from "$lib/sound.svelte";
	import type { ApiResponse } from "$lib/types";
	import Reveal from "./Reveal.svelte";
	import Parallax from "./Parallax.svelte";
	import ParallaxImage from "./ParallaxImage.svelte";
	import GsapGallery from "./GsapGallery.svelte";
	import RevealText from "./RevealText.svelte";
	import ArchiveStrip from "./ArchiveStrip.svelte";
	import Magnetic from "./Magnetic.svelte";
	import FeaturedShowcase from "./FeaturedShowcase.svelte";
	import Preloader from "./Preloader.svelte";
	import MapDescent from "./MapDescent.svelte";
	import ApiImage from "./ApiImage.svelte";
	import { rippleOnce } from "$lib/heroRipple";
	import { access } from "$lib/access.svelte";
	import { mailto } from "$lib/contact";
	import { scrambleHover } from "$lib/scramble";
	import LogoCloud from "./LogoCloud.svelte";
	import Seam from "./Seam.svelte";
	import { authModal } from "$lib/authModal.svelte";

	gsap.registerPlugin(ScrollTrigger);


	const secCopy = {
		id: {
			latestKicker: "Baru", latestTitle: "Bingkai terbaru", latestCta: "Lihat semua",
			rulerTitle: "Jelajahi per tema",
			rulerOpen: "Lihat foto {label}",
			rulerPrev: "Tema sebelumnya",
			rulerNext: "Tema berikutnya",
			rulerCount: "{i} dari {n}",
		standar: "Standard",
		standarDesc: "Beli satuan foto atau video. Tanpa komitmen.",
		standarStrip: "Contoh bingkai dari arsip",
		standarDescVideo: "Beli satuan foto atau video. Tanpa komitmen.",
		typeLabel: "Jenis aset",
		planLabel: "Paket",
		typeFoto: "Foto",
		typeVideo: "Video",
		perClip: "/klip",
		subscribe: "Premium",
		subscribeDesc: "Kuota per bulan untuk seluruh aset.\n24 jam support system.",
			subscribeCta: "Pilih paket",
			custom: "Custom",
			customDesc: "Volume besar, lisensi tim, atau kebutuhan lain.\nCeritakan, kami kirim penawarannya.",
			customPrice: "Custom",
			customCta: "Hubungi kami",
			customSubject: "Permintaan harga custom",
			subscribeTag: "Paling hemat",
			quotaUnit: "unduhan / bulan",
			compareTitle: "The benefits",
			compareRes: "This is the sample of the asset you will get in Standard or Premium subscription",
			comparePreview: "Pratinjau",
			compareClean: "Unduhan",
			compareSlider: "Geser untuk membandingkan pratinjau dan unduhan",
		standarWhen: "Ambil satu bingkai untuk satu kebutuhan. Bayar sekali, tanpa langganan berjalan.",
		subscribeWhen: "Kuota unduhan tiap bulan. Lebih murah per bingkai kalau kamu memakai arsip secara rutin.",
		standarBenefits: [
			"Access all HD assets",
			"Premium license",
			"Single user account",
			"24 hours customer service",
		],
		subscribeBenefits: [
			"All access to HD assets",
			"Premium license",
			"Single user account",
			"24 hours customer service",
			"30 downloads / month",
		],
		standarBenefitsVideo: [
			"Access all HD assets",
			"Premium license",
			"Single user account",
			"24 hours customer service",
		],
		subscribeBenefitsVideo: [
			"All access to HD assets",
			"Premium license",
			"Single user account",
			"24 hours customer service",
			"30 downloads / month",
		],
		trustEyebrow: "Dipercaya tim di",
		archiveLine: "{n} foto and {m} video siap diunduh.",
			from: "mulai",
			perItem: "/bingkai",
			perMonth: "/bulan",
			closingAuthed: {
				kicker: "Akunmu",
				title: "Darkroommu menunggu,",
				body: "Cek pesanan, bukti bayar, dan bingkai yang kamu simpan — semua di satu tempat.",
				cta: "Buka darkroom",
			},
		},
		en: {
			latestKicker: "Fresh", latestTitle: "Latest frames", latestCta: "See all",
			rulerTitle: "Browse by theme",
			rulerOpen: "See {label} photos",
			rulerPrev: "Previous theme",
			rulerNext: "Next theme",
			rulerCount: "{i} of {n}",
		standar: "Standard",
		standarDesc: "Pay per photo or videos. No commitment.",
		standarStrip: "Sample frames from the archive",
		standarDescVideo: "Pay per photo or videos. No commitment.",
		typeLabel: "Asset type",
		planLabel: "Plan",
		typeFoto: "Photos",
		typeVideo: "Video",
		perClip: "/clip",
		subscribe: "Premium",
		subscribeDesc: "Monthly quota for the archives.\n24 hours customer service.",
			subscribeCta: "Choose a plan",
			custom: "Custom",
			customDesc: "Large volume, team licence, or other needs.\nTell us and we will send a quote.",
			customPrice: "Custom",
			customCta: "Contact us",
			customSubject: "Custom pricing request",
			subscribeTag: "Best value",
			quotaUnit: "downloads / month",
			compareTitle: "The benefits",
			compareRes: "This is the sample of the asset you will get in Standard or Premium subscription",
			comparePreview: "Preview",
			compareClean: "Download",
			compareSlider: "Drag to compare the preview and the download",
		standarWhen: "Take one frame for one job. Pay once, no running subscription.",
		subscribeWhen: "A download quota every month. Cheaper per frame if you use the archive regularly.",
		standarBenefits: [
			"Access all HD assets",
			"Premium license",
			"Single user account",
			"24 hours customer service",
		],
		subscribeBenefits: [
			"All access to HD assets",
			"Premium license",
			"Single user account",
			"24 hours customer service",
			"30 downloads / month",
		],
		standarBenefitsVideo: [
			"Access all HD assets",
			"Premium license",
			"Single user account",
			"24 hours customer service",
		],
		subscribeBenefitsVideo: [
			"All access to HD assets",
			"Premium license",
			"Single user account",
			"24 hours customer service",
			"30 downloads / month",
		],
		trustEyebrow: "Trusted by teams at",
		archiveLine: "{n} photos and {m} videos ready to download",
			from: "from",
			perItem: "/frame",
			perMonth: "/month",
			closingAuthed: {
				kicker: "Your account",
				title: "Your darkroom awaits,",
				body: "Check orders, payment proofs, and your saved frames — all in one place.",
				cta: "Open darkroom",
			},
		},
	};

	const c = $derived(i18n.c);
	const lang = $derived(i18n.lang);
	const user = $derived(store.user);
	const s = $derived(secCopy[lang]);
	const firstName = $derived(user?.name?.split(" ")[0] ?? "");

	let heroSection = $state<HTMLElement>();
	let q = $state("");
	// State mulai KOSONG seperti SSR (tanpa snapshot): render hidrasi pertama
	// harus sama persis dengan HTML server supaya tak ada mismatch
	// `hydration_attribute_changed` (Svelte mempertahankan nilai server yang
	// salah — picsum — dan menempelkannya). Snapshot diterapkan sekali di
	// $effect mount di bawah (sudah lewat hidrasi, aman), lalu fetch segar
	// menimpa begitu tiba.
	let horizontal = $state<Photo[]>([]);
	let latest = $state<Photo[]>([]);
	let archiveTotal = $state(0);
	let videos = $state<Video[]>([]);
	let videoTotal = $state(0);
	let hp = $state<Record<string, HomepageSection>>({});
	// Teaser daftar harga: harga asli dari API agar seirama halaman /pricing.
	let plans = $state<Plan[]>([]);
	let standarPrice = $state(500000);
	// Harga satuan berbeda antara foto dan klip, jadi baris Standar punya
	// pilihan jenis aset. Angkanya harga termurah yang benar-benar ada di
	// arsip (API mengurutkan; klien tak perlu menarik seluruh katalog).
	let standarType = $state<"FOTO" | "VIDEO">("FOTO");
	// Pilihan paket pada blok benefits: hanya daftar paket terpilih yang tampil.
	let benefitPlan = $state<"STANDARD" | "PREMIUM">("STANDARD");
	let fotoFrom = $state<number | null>(null);
	let videoFrom = $state<number | null>(null);
	const standarShown = $derived(
		standarType === "VIDEO" ? videoFrom : (fotoFrom ?? standarPrice),
	);
	const subscribeFrom = $derived(
		plans.length > 0 ? Math.min(...plans.map((p) => p.priceMonthly)) : null,
	);

	// Kurasi CMS (section `klip`): hanya video terpilih yang tampil di contact
	// sheet, sesuai urutan pilih. Kosong = video terbaru otomatis.
	const klipVids = $derived(
		hp["klip"]?.photos?.length ? hp["klip"].photos.map(adaptVideo) : null,
	);
	const shownVids = $derived(klipVids ?? videos);
	const shownTotal = $derived(klipVids ? klipVids.length : videoTotal);

	// ── Strip drone: teks kiri + rel kanan digeser GULIR vertikal ──
	// Tanpa baki hitam. Section di-pin satu layar; gulir vertikal
	// menggeser rel portrait (scrub 1:1, eased). Tengah viewport berwarna,
	// sisi grayscale + redup. Mobile / reduce-motion: tanpa pin, rel jadi
	// geser manual biasa.
	let railEl = $state<HTMLDivElement | null>(null);
	let railGliding = false;
	function reduceMotion() {
		return (
			typeof window !== "undefined" &&
			(window.matchMedia("(prefers-reduced-motion: reduce)").matches || access.settings.reduceMotion)
		);
	}
	let dronePinEl = $state<HTMLElement | null>(null);
	let dragViewEl = $state<HTMLDivElement | null>(null);
	let reelLgEl = $state<HTMLDivElement | null>(null);
	let droneH = $state(0);
	/** Cukup kartu supaya strip terasa penuh; daftar pendek diulang sekali. */
	const droneItems = $derived.by(() => {
		const v = shownVids;
		if (!v.length) return [] as typeof v;
		if (v.length >= 6) return v;
		const out: typeof v = [];
		while (out.length < 6) out.push(...v);
		return out.slice(0, 6);
	});
	let dragActive = $state(0);
	// Dua fase dalam satu pin (ala rujukan): (1) bidang rel melebar ke kiri
	// sampai memenuhi layar sambil mendorong teks keluar, (2) rel digeser
	// horizontal. Sebelum pin, bidang masuk sedikit tertinggal dari teks.
	$effect(() => {
		const pin = dronePinEl;
		const view = dragViewEl;
		const track = reelLgEl;
		void droneItems.length;
		if (!pin || !view || !track) return;
		const split = pin.querySelector<HTMLElement>(".drone-split");
		const copy = pin.querySelector<HTMLElement>(".drone-copy");
		const clear = () => {
			track.style.transform = "";
			view.style.marginInline = "";
			view.style.clipPath = "";
			view.style.transform = "";
			track.querySelectorAll<HTMLElement>(".dg-card > img, .dg-card > video").forEach((el) => (el.style.objectPosition = ""));
			if (copy) {
				copy.style.transform = "";
				copy.style.opacity = "";
			}
		};
		if (!split || !copy || reduceMotion() || window.innerWidth < 900) {
			droneH = 0;
			clear();
			return;
		}
		// Lenis sudah menghaluskan gulir; di sini cukup kurva ringan. Fase geser
		// LINEAR supaya kecepatan rel = kecepatan gulir (tanpa melambat di ujung).
		const ease = (p: number) => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2);
		const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
		let expandLen = 1;
		let panLen = 1;
		let padL = 0; // jarak tepi kiri bidang ke tepi kiri layar
		let padR = 0;
		let copyOut = 0; // jarak geser teks sampai lepas dari layar
		let fullW = 0;
		let ready = false;
		let centers: number[] = [];
		let plxEls: HTMLElement[][] = [];
		let activeIdx = -1;
		const maxShift = () => Math.max(0, track.scrollWidth - fullW);
		const measure = () => {
			// Bidang dibuat selebar layar SEKALI; melebar = membuka clip-path, jadi
			// tidak ada layout ulang per frame (margin/width) saat gulir.
			view.style.marginInline = "";
			const sr = split.getBoundingClientRect();
			const vr = view.getBoundingClientRect();
			// Layout belum siap (mis. section belum tergambar saat refresh /
			// kembali dari halaman lain): jangan simpan ukuran nol yang merusak
			// tampilan; kembalikan ke keadaan bersih dan tunggu refresh berikutnya.
			if (sr.width < 10 || vr.width < 10 || !track.querySelector(".dg-card")) {
				ready = false;
				clear();
				return;
			}
			ready = true;
			padL = Math.max(0, vr.left - sr.left);
			padR = Math.max(0, sr.right - vr.right);
			fullW = vr.width + padL + padR;
			view.style.marginInline = `${-padL}px ${-padR}px`;
			// offsetLeft/offsetWidth, BUKAN getBoundingClientRect: yang terakhir ikut
			// menghitung translate teks saat ini, jadi tiap refresh di tengah gulir
			// mengukur jarak keluar yang makin kecil (teks tidak lagi lepas dari layar).
			copyOut = copy.offsetLeft + copy.offsetWidth + 24;
			const cardEls = Array.from(track.querySelectorAll<HTMLElement>(".dg-card"));
			centers = cardEls.map((el) => el.offsetLeft + el.offsetWidth / 2);
			// Parallax isi kartu lewat object-position: foto tetap memenuhi kartu
			// (tanpa transform, jadi tepi kartu TIDAK mungkin terbuka); yang
			// bergeser hanya jendela crop-nya. Sumber yang lebih lebar dari kartu
			// (16:9) punya ruang geser; yang portrait diam saja.
			plxEls = cardEls.map((el) => Array.from(el.querySelectorAll<HTMLElement>(":scope > img, :scope > video")));
			expandLen = Math.round(window.innerHeight * 0.9);
			panLen = Math.round(maxShift() + window.innerHeight * 0.6);
			droneH = window.innerHeight + expandLen + panLen;
		};
		const apply = (scrolled: number) => {
			if (!ready) return;
			const e = ease(clamp01(scrolled / expandLen));
			const pan = clamp01((scrolled - expandLen) / panLen);
			const shift = pan * maxShift();
			const gapL = (1 - e) * padL;
			const gapR = (1 - e) * padR;
			view.style.clipPath = `inset(0 ${gapR.toFixed(1)}px 0 ${gapL.toFixed(1)}px)`;
			copy.style.transform = `translate3d(${(-e * copyOut).toFixed(1)}px, 0, 0)`;
			copy.style.opacity = String(1 - clamp01(e * 1.25));
			const tx = gapL - shift;
			track.style.transform = `translate3d(${tx.toFixed(1)}px, 0, 0)`;
			// Parallax: isi kartu bergerak LEBIH LAMBAT dari kartunya. Kartu di kiri
			// tengah → isi tergeser ke kanan (dan sebaliknya), 0 di tengah.
			const viewMid = (gapL + (fullW - gapR)) / 2;
			const half = Math.max(1, (fullW - gapL - gapR) / 2);
			for (let i = 0; i < plxEls.length; i++) {
				const raw = (viewMid - (centers[i] + tx)) / half;
				if (Math.abs(raw) > 1.6) continue; // jauh di luar layar
				const rel = Math.max(-1, Math.min(1, raw));
				const pos = `${(50 - rel * 40).toFixed(1)}% 50%`;
				for (const el of plxEls[i]) el.style.objectPosition = pos;
			}
			// Kartu aktif: "penanda" bergerak dari kartu pertama ke terakhir sesuai
			// progres geser, jadi kartu paling ujung pun sempat menyala di akhir.
			if (centers.length) {
				const mid = centers[0] + pan * (centers[centers.length - 1] - centers[0]);
				let best = 0;
				let bestD = Infinity;
				for (let i = 0; i < centers.length; i++) {
					const d = Math.abs(centers[i] - mid);
					if (d < bestD) {
						bestD = d;
						best = i;
					}
				}
				if (best !== activeIdx) {
					activeIdx = best;
					dragActive = best;
					const list = track.querySelectorAll<HTMLElement>(".dg-card");
					list.forEach((el, i) => el.toggleAttribute("data-active", i === best));
				}
			}
		};
		measure();
		apply(0);
		// Rel mentok (progres 1) lalu gulir sekali lagi ke bawah = langsung
		// menempel ke globe, tanpa melintasi celah Seam pelan-pelan.
		let globeSnapped = false;
		const st = ScrollTrigger.create({
			trigger: pin,
			start: "top top",
			end: () => `+=${Math.max(1, expandLen + panLen)}`,
			invalidateOnRefresh: true,
			onUpdate: (self) => {
				apply(self.progress * (expandLen + panLen));
				if (self.progress < 0.9) globeSnapped = false;
				else if (self.progress >= 0.995 && self.direction === 1 && !globeSnapped) {
					globeSnapped = true;
					const globe = document.querySelector("[data-globe]");
					if (globe) {
						const lenis = getLenis();
						if (lenis) lenis.scrollTo(globe as HTMLElement, { duration: 1.1 });
						else globe.scrollIntoView({ behavior: "smooth", block: "start" });
					}
					setTimeout(() => (globeSnapped = false), 2000);
				}
			},
			onRefresh: (self) => {
				measure();
				apply(self.progress * (expandLen + panLen));
			},
		});
		// Masuk: bidang naik dari bawah, tertinggal dari teks.
		const enter = ScrollTrigger.create({
			trigger: pin,
			start: "top bottom",
			end: "top top",
			onUpdate: (self) => {
				view.style.transform = `translate3d(0, ${((1 - self.progress) * window.innerHeight * 0.05).toFixed(1)}px, 0)`;
			},
			onLeave: () => {
				view.style.transform = "";
			},
		});
		// Keadaan awal bidang sesuai posisi gulir saat ini (refresh di tengah
		// halaman / kembali dari halaman lain), tanpa menunggu gulir pertama.
		enter.vars.onUpdate?.call(enter, enter);
		const ro = new ResizeObserver(() => {
			measure();
			apply(st.progress * (expandLen + panLen));
			calmRefresh();
		});
		ro.observe(track);
		ro.observe(split);
		ro.observe(copy);
		// Tombol kembali / bfcache: halaman dipulihkan apa adanya, ukur ulang.
		const onShow = (ev: PageTransitionEvent) => {
			if (!ev.persisted) return;
			measure();
			calmRefresh(0);
		};
		window.addEventListener("pageshow", onShow);
		// Font web yang telat datang mengubah pembungkusan teks & lebar kolom.
		void document.fonts?.ready.then(() => {
			measure();
			apply(st.progress * (expandLen + panLen));
		}).catch(() => {});
		return () => {
			window.removeEventListener("pageshow", onShow);
			ro.disconnect();
			st.kill();
			enter.kill();
			clear();
		};
	});




	const hero = $derived(hp["hero"]);
	const mulai = $derived(hp["mulai"]);
	// Section landing yang bisa dioverride CMS — kosong = fallback kamus/i18n.
	const anjungan = $derived(hp["anjungan_1"]);
	const arsipSec = $derived(hp["arsip"]);
	const videoSec = $derived(hp["video"]);
	const hargaSec = $derived(hp["harga"]);
	const trustSec = $derived(hp["percaya"]);
	const etalaseSec = $derived(hp["etalase"]);
	// Logo pelanggan dari CMS: tiap foto terpilih (thumb 800px, bersih) jadi
	// satu logo. Kosong = wordmark dummy di LogoCloud.
	const trustLogos = $derived(
		trustSec?.photos?.length
			? trustSec.photos.map((p) => ({ name: p.title, src: p.thumbUrl ?? "" })).filter((l) => l.src)
			: null,
	);
	// Kurasi foto CMS (journeys → strip arsip, orbit → galeri 3D). Kosong =
	// perilaku lama (foto terbaru dari API).
	const journeyPhotos = $derived(
		hp["journeys"]?.photos?.length ? hp["journeys"].photos.map(adaptPhoto) : null,
	);
	const orbitPhotos = $derived(
		hp["orbit"]?.photos?.length ? hp["orbit"].photos.map(adaptPhoto) : null,
	);
	// Kurasi foto CMS (etalase → showcase ekowisata). Kosong = perilaku lama
	// (unggulan dulu, lalu terbaru).
	const etalasePhotos = $derived(
		etalaseSec?.photos?.length ? etalaseSec.photos.map(adaptPhoto) : null,
	);
	// Ketahanan hero: URL CMS adalah presigned yang kedaluwarsa 1 jam dan mati
	// saat tunnel storage restart — dua-duanya pernah bikin hero "berubah-ubah"
	// antara gambar asli, default, dan rusak. Saat URL CMS gagal: buang cache
	// + fetch ulang sekali (dapat URL segar); masih gagal → default picsum.
	// heroDead juga membuka kunci preloader supaya tak menggantung.
	const HERO_FALLBACK = USE_DUMMY_IMAGES ? imgFor("nusantara-hero", 2400, 1600) : null;
	let heroRetried = $state(false);
	let heroDead = $state(false);
	// Hero bisa berupa klip video (CMS → mediaType "video"): autoplay bisu +
	// loop sebagai latar. Fallback ke tebakan ekstensi untuk snapshot lama.
	const heroMediaVideo = $derived(
		(hero?.mediaType ??
			(hero?.imageKey && /\.(mp4|webm|mov|m4v)(\?|$)/i.test(hero.imageKey) ? "video" : "image")) === "video",
	);
	const heroVideoUrl = $derived(hero?.imageUrl ?? null);
	// Hero TIDAK PERNAH memakai foto dummy (picsum) kecuali mode dummy Vercel
	// (VITE_USE_DUMMY_IMAGES). Data belum tiba / gagal / hanya picsum = latar
	// gelap polos, bukan foto palsu yang lalu berganti. Hero berupa video
	// tidak punya gambar diam (URL-nya mp4, bukan untuk <img>).
	const heroImg = $derived(
		USE_DUMMY_IMAGES
			? imgFor("nusantara-hero", 2400, 1600, hero?.imageUrl)
			: hero?.imageUrl && !hero.imageUrl.includes("picsum.photos") && !heroMediaVideo
				? hero.imageUrl
				: null,
	);
	const motionOk = $derived(
		!access.settings.reduceMotion &&
			(typeof window === "undefined" || !window.matchMedia("(prefers-reduced-motion: reduce)").matches),
	);
	const heroIsVideo = $derived(!!heroVideoUrl && heroMediaVideo && motionOk && !heroDead);
	let heroVideoOk = $state(false);
	// ── Suara video hero ────────────────────────────────────────────────
	let heroVideoEl = $state<HTMLVideoElement | null>(null);
	/** Yang terdengar sekarang (video.muted). */
	let heroMuted = $state(true);
	/** Pilihan pengguna: "off" = sengaja dimatikan lewat tombol (diingat). */
	const SOUND_KEY = "lakuna-hero-sound";
	function soundPref(): "on" | "off" {
		try {
			return localStorage.getItem(SOUND_KEY) === "off" ? "off" : "on";
		} catch {
			return "on";
		}
	}
	let heroInView = true;
	const HERO_VOL = 0.8;
	function fadeHeroVolume(to: number, dur = 0.6) {
		const v = heroVideoEl;
		if (!v) return;
		gsap.to(v, { volume: to, duration: dur, ease: "power1.out", overwrite: true });
	}
	/** Coba nyalakan suara; kembalikan false bila browser menolak. */
	async function unmuteHero(): Promise<boolean> {
		const v = heroVideoEl;
		if (!v || soundPref() === "off" || !soundOn()) return false;
		v.volume = 0;
		v.muted = false;
		try {
			await v.play();
		} catch {
			v.muted = true;
			void v.play().catch(() => {});
			return false;
		}
		heroMuted = false;
		fadeHeroVolume(heroInView ? HERO_VOL : 0, 1.2);
		return true;
	}
	function toggleHeroSound() {
		const v = heroVideoEl;
		if (!v) return;
		if (heroMuted) {
			// Menyalakan suara video = preferensi hero sendiri; tidak
			// menyentuh saklar suara UI navbar (keduanya independen).
			try { localStorage.setItem(SOUND_KEY, "on"); } catch { /* abaikan */ }
			void unmuteHero();
		} else {
			try { localStorage.setItem(SOUND_KEY, "off"); } catch { /* abaikan */ }
			v.muted = true;
			heroMuted = true;
		}
	}
	// Lensa membuka → coba bersuara; ditolak → tunggu interaksi pertama.
	$effect(() => {
		const v = heroVideoEl;
		if (!v || !heroVideoOk) return;
		let done = false;
		const onGesture = () => {
			if (done) return;
			void unmuteHero().then((ok) => {
				if (ok) {
					done = true;
					cleanup();
				}
			});
		};
		const events = ["pointerdown", "keydown", "touchstart"] as const;
		const cleanup = () => events.forEach((e) => window.removeEventListener(e, onGesture, true));
		events.forEach((e) => window.addEventListener(e, onGesture, { capture: true, passive: true }));
		const onLens = () => void unmuteHero().then((ok) => { if (ok) { done = true; cleanup(); } });
		window.addEventListener("lakuna:lens-open", onLens);
		// Preloader sudah lewat (kunjungan ulang) → coba sekarang.
		void unmuteHero().then((ok) => { if (ok) { done = true; cleanup(); } });
		return () => {
			cleanup();
			window.removeEventListener("lakuna:lens-open", onLens);
		};
	});
	// Saklar suara situs (navbar) dimatikan → video hero ikut bisu.
	$effect(() => {
		const onSound = (e: Event) => {
			const muted = (e as CustomEvent<{ muted: boolean }>).detail?.muted;
			const v = heroVideoEl;
			if (!v) return;
			if (muted) {
				v.muted = true;
				heroMuted = true;
			} else if (soundPref() !== "off") {
				void unmuteHero();
			}
		};
		window.addEventListener("lakuna:sound", onSound);
		return () => window.removeEventListener("lakuna:sound", onSound);
	});
	// Hero keluar layar → suara memudar; kembali → naik lagi.
	$effect(() => {
		const sec = heroSection;
		if (!sec) return;
		const io = new IntersectionObserver(
			([e]) => {
				heroInView = !!e?.isIntersecting && (e?.intersectionRatio ?? 0) > 0.25;
				if (!heroMuted) fadeHeroVolume(heroInView ? HERO_VOL : 0, 0.8);
			},
			{ threshold: [0, 0.25, 0.5] },
		);
		io.observe(sec);
		return () => io.disconnect();
	});

	// URL video baru (ganti CMS) = mulai lagi dari belum-siap.
	$effect(() => {
		void heroVideoUrl;
		heroVideoOk = false;
	});
	const heroSrc = $derived(heroDead ? HERO_FALLBACK : heroImg);
	async function onHeroError() {
		if (heroDead || heroSrc === HERO_FALLBACK) {
			heroDead = true;
			return;
		}
		if (!heroRetried) {
			heroRetried = true;
			try {
				const fresh = await refreshHomepage();
				if (Object.keys(fresh).length && !homepageHasPicsum(fresh)) {
					hp = mergeHomepage(hp, fresh);
					saveHomeSnapshot({ hp });
				}
				return;
			} catch {
				/* jatuh ke default di bawah */
			}
		}
		heroDead = true;
	}
	const mulaiImg = $derived(imgFor("closing-fjord", 2400, 1400, mulai?.imageUrl));
	// Etalase penutup: kurasi CMS menang bila diisi; kosong = foto yang
	// ditandai unggulan dulu, lalu terbaru; unik per id.
	const featuredPhotos = $derived.by(() => {
		if (etalasePhotos?.length) return etalasePhotos.slice(0, 4);
		const seen = new Set<string>();
		const pool = [...horizontal, ...latest].filter((p) => {
			if (seen.has(p.id) || p.assetType === "VIDEO") return false;
			seen.add(p.id);
			return true;
		});
		return [...pool.filter((p) => p.featured), ...pool.filter((p) => !p.featured)].slice(0, 4);
	});
	// Latar papan tarif: foto dari section `harga`, jatuh ke `manifesto`,
	// terakhir ke dummy bila API kosong.
	// Harga custom: email dari konfigurasi kontak bersama ($lib/contact). Selama
	// belum diisi, tombol menuju halaman Customer service.
	const customHref = $derived(mailto(s.customSubject));
	const rateImg = $derived(imgFor("rate-sheet", 2400, 1400, hargaSec?.imageUrl || hp["manifesto"]?.imageUrl));
	// Tangga kuota langganan — angka asli dari API, tiga tingkat teratas.
	const quotaLadder = $derived([...new Set(plans.map((p) => p.quota))].sort((a, b) => a - b).slice(0, 3));
	// Tiga bingkai contoh: yang dibayar per bingkai memang isi arsip ini.
	const rateFrames = $derived(
		standarType === "VIDEO"
			? shownVids.slice(0, 3).map((v) => ({ id: v.id, thumbUrl: v.thumbUrl }))
			: latest.filter((p) => p.assetType !== "VIDEO").slice(0, 3).map((p) => ({ id: p.id, thumbUrl: p.thumbUrl })),
	);
	// Bingkai contoh untuk perbandingan pratinjau vs unduhan: butuh pratinjau
	// ber-watermark DAN resolusi asli. File asli tak ikut di daftar publik —
	// diminta terpisah lewat fetchPhotoOriginal (lihat compareOrig).
	const compareShot = $derived(
		latest.find(
			(p) =>
				p.assetType === "FOTO" &&
				!!p.watermarkUrl &&
				// Lebar/tinggi asli; kalau API tak mengirimnya, adaptPhoto memakai
				// nilai cadangan 1600×1200 — jangan ditampilkan sebagai resolusi.
				p.w > 1600 &&
				p.h > 0,
		) ?? null,
	);
	let comparePos = $state(52);
	// URL file asli untuk sisi "unduhan"; null = tak tersedia → section disembunyikan.
	let compareOrig = $state<Record<string, string | null>>({});
	$effect(() => {
		const id = compareShot?.id;
		if (!id || id in compareOrig) return;
		void fetchPhotoOriginal(id).then((url) => {
			compareOrig[id] = url;
		});
	});
	const compareOrigUrl = $derived(compareShot ? (compareOrig[compareShot.id] ?? null) : null);

	// Lensa preloader membuka ke foto hero, jadi ia menunggu gambar hero yang
	// FINAL: data homepage sudah dijawab (berhasil atau gagal) DAN src yang sedang
	// dipasang sudah selesai dimuat (atau gagal — jangan menahan selamanya).
	//
	// Kesiapan diturunkan dari src yang terakhir dimuat, bukan flag yang di-reset
	// lewat $effect. Efek anak berjalan sebelum efek induk: ApiImage melaporkan
	// gambar dari cache yang sudah complete, lalu reset di sini menimpanya — dan
	// karena event load tidak datang lagi, lensa tertahan sampai batas tunggu.
	let hpSettled = $state(false);
	let heroLoadedSrc = $state("");
	const heroReady = $derived(
		hpSettled && (heroLoadedSrc === heroSrc || heroVideoOk || heroDead || (!heroSrc && !heroIsVideo)),
	);

	// Lensa preloader membuka → foto hero "tercetak" ala 21hrs on the Moon
	// (sama dengan bukaan foto di peta): lingkaran bertepi lembut melebar dari
	// tengah, foto masuk terbakar terang lalu eksposurnya mengendap. Dulu:
	// riak air (heroRipple, masih tersedia lewat __ripple di dev).
	$effect(() => {
		const onOpen = () => {
			const section = heroSection;
			if (!section) return;
			if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
			const layer = section.querySelector<HTMLElement>(".hero-img-anim");
			// Gambar DI DALAM .hero-img-scrub: scrub parallax sudah memakai
			// `scale` wrapper itu — dua tween di satu elemen saling berebut.
			const img = section.querySelector<HTMLElement>(".hero-img-scrub img") ?? section.querySelector<HTMLElement>(".hero-img-scrub > *");
			if (!layer || !img) return;
			// Blitz kamera menerangi adegan: lensa membuka ke hero yang masih
			// gelap, lalu flash menyala (putih hangat, serangan ±60 ms) dan
			// menyiram foto/video — cahayanya mereda, eksposur kembali normal.
			// Judul hero baru masuk setelah lensa menukik.
			const flash = section.querySelector<HTMLElement>(".hero-flash");
			// Eksposur dianimasikan lewat objek bantu lalu ditulis ke style tiap
			// frame — tween `filter` langsung pada elemen video tertahan di nilai
			// awalnya (adegan tetap gelap padahal blitz sudah menyala).
			const ex = { b: 0.18, s: 0.5 };
			const paint = () => {
				img.style.filter = `brightness(${ex.b.toFixed(3)}) saturate(${ex.s.toFixed(3)})`;
			};
			paint();
			gsap.set(img, { scale: 1.14 });
			if (flash) gsap.set(flash, { opacity: 0 });
			gsap.fromTo(
				section.querySelectorAll(".hero-anim"),
				{ opacity: 0, y: 22 },
				{ opacity: 1, y: 0, duration: 1.1, ease: "power3.out", stagger: 0.1, delay: 1.5, overwrite: true },
			);
			// Kilatan layar penuh DI ATAS segalanya (termasuk lensa preloader):
			// blitz sungguhan menyiram seluruh bingkai sepersekian detik.
			const burst = document.createElement("div");
			burst.setAttribute("aria-hidden", "true");
			burst.style.cssText =
				"position:fixed;inset:0;z-index:10001;pointer-events:none;opacity:0;" +
				"background:radial-gradient(ellipse at 50% 45%,#fff 0%,#fffaf2 45%,#ffeedd 100%)";
			document.body.appendChild(burst);
			const FLASH_AT = 0.42;
			gsap.timeline({
				onComplete: () => {
					img.style.filter = "";
					gsap.set(img, { clearProps: "scale,transform" });
					burst.remove();
				},
			})
				// Serangan ±30 ms, ditahan sekejap, lalu mereda (xenon).
				.to(burst, { opacity: 1, duration: 0.03, ease: "none" }, FLASH_AT)
				.to(burst, { opacity: 0, duration: 0.55, ease: "expo.out" }, FLASH_AT + 0.1)
				.to(flash ?? [], { opacity: 1, duration: 0.03, ease: "none" }, FLASH_AT)
				.to(ex, { b: 4.2, s: 0.2, duration: 0.03, ease: "none", onUpdate: paint }, FLASH_AT)
				// Mereda seperti blitz xenon: cepat di awal, ekor panjang.
				.to(flash ?? [], { opacity: 0, duration: 1.3, ease: "expo.out" }, FLASH_AT + 0.12)
				.to(ex, { b: 1.2, s: 0.85, duration: 1.2, ease: "expo.out", onUpdate: paint }, FLASH_AT + 0.12)
				.to(ex, { b: 1, s: 1, duration: 1.4, ease: "power2.out", onUpdate: paint }, 1.6)
				.to(img, { scale: 1, duration: 3.4, ease: "power3.out" }, 0);
		};
		window.addEventListener("lakuna:lens-open", onOpen);
		if (import.meta.env.DEV) {
			(window as unknown as { __ripple?: (t: number) => void }).__ripple = (t: number) => {
				if (heroSection) rippleOnce(heroSection, { freezeAt: t });
			};
		}
		return () => window.removeEventListener("lakuna:lens-open", onOpen);
	});

	// Gambar di bawah peta (strip tarif + perbandingan pratinjau/unduhan) dulu
	// lazy: baru diminta saat hampir terlihat, tepat ketika jaringan sedang
	// penuh ubin peta dan tekstur globe — jadi selalu telat muncul. Sekarang
	// dipanaskan lebih awal: begitu hero tampil (tak berebut dengan hero dan
	// lensa preloader), atau paling lambat 4 dtk sebagai pengaman.
	let warmBelow = $state(false);
	$effect(() => {
		if (warmBelow) return;
		const id = window.setTimeout(() => (warmBelow = true), heroReady ? 400 : 4000);
		return () => window.clearTimeout(id);
	});
	// File asli sisi "unduhan" bisa berukuran MB; selagi dimuat, sisi itu
	// gelap (thumbnail publik kini ber-watermark, jadi tak bisa jadi pengisi).
	let cmpOrigLoaded = $state("");

	$effect(() => {
		let alive = true;
		// Terapkan snapshot DULU (sinkron, sebelum fetch segar tiba): cat
		// instan tanpa merusak hidrasi — lihat komentar di deklarasi state.
		const snap = loadHomeSnapshot();
		if (snap) {
			if (snap.horizontal.length) horizontal = snap.horizontal;
			if (snap.latest.length) { latest = snap.latest; archiveTotal = snap.archiveTotal; }
			if (snap.videos.length) { videos = snap.videos; videoTotal = snap.videoTotal; }
			if (Object.keys(snap.hp).length) { hp = snap.hp; hpSettled = true; }
			if (snap.plans.length) plans = snap.plans;
		}
		// Setelah SEMUA data async rampung (atau gagal), ukur ulang
		// ScrollTrigger: section yang baru mount (grid video, strip arsip,
		// foto orbit, baris tarif) menggeser pin di bawahnya (peta, orbit).
		// Refresh kebetulan (rAF/600ms) sering kalah dari latensi tunnel →
		// section bertumpuk/blank saat refresh atau datang dari halaman lain.
		const settleRefresh = () => {
			if (!alive) return;
			// Lewat calmRefresh: tunda sampai gulir tenang supaya ukur ulang
			// tidak menendang posisi pin di tengah guliran pertama.
			calmRefresh();
			window.setTimeout(() => {
				if (alive) calmRefresh();
			}, 800);
		};
		const jobs = [
			fetchPhotos({ limit: 6 }).then((r) => { const rows = mergeMediaById(horizontal, stripPicsumPhotos(r.photos)); if (alive && rows.length) { horizontal = rows; saveHomeSnapshot({ horizontal: rows }); } }).catch(() => {}),
			fetchPhotos({ limit: 12 })
				.then((r) => {
					const rows = mergeMediaById(latest, stripPicsumPhotos(r.photos));
					if (!alive || !rows.length) return;
					latest = rows;
					archiveTotal = r.total;
					saveHomeSnapshot({ latest: rows, archiveTotal: r.total });
				})
				.catch(() => {}),
			fetchVideos(12)
				.then((r) => {
					const vids = mergeMediaById(videos, stripPicsumPhotos(r.videos));
					if (!alive || !vids.length) return;
					videos = vids;
					videoTotal = r.total;
					saveHomeSnapshot({ videos: vids, videoTotal: r.total });
				})
				.catch(() => {}),
			(async () => {
				// Hero ditentukan data ini. Jawaban kosong / berisi picsum (API lambat,
				// presign storage gagal) dicoba lagi beberapa kali, bukan dibiarkan
				// jadi hero kosong atau dummy. Preloader tidak menunggu retry: ia
				// dibuka setelah percobaan PERTAMA (berhasil atau tidak); sisanya
				// jalan di latar dan hero muncul begitu datanya valid.
				for (let attempt = 0; attempt < 4 && alive; attempt++) {
					try {
						const r = attempt === 0 ? await fetchHomepage() : await refreshHomepage();
						if (Object.keys(r).length && !homepageHasPicsum(r)) {
							if (!alive) return;
							const merged = mergeHomepage(hp, r);
							hp = merged;
							saveHomeSnapshot({ hp: merged });
							return;
						}
					} catch {
						/* coba lagi */
					} finally {
						if (alive && attempt === 0) hpSettled = true;
					}
					await new Promise((res) => window.setTimeout(res, 1500 * (attempt + 1)));
				}
			})().finally(() => { if (alive) hpSettled = true; }),
			fetchPlans().then((p) => { if (alive && p.length) { plans = p; saveHomeSnapshot({ plans: p }); } }).catch(() => {}),
			fetchPhotos({ type: "FOTO", sort: "price_asc", limit: 1 })
				.then((r) => { if (alive && r.photos[0]) fotoFrom = r.photos[0].price; })
				.catch(() => {}),
			fetchPhotos({ type: "VIDEO", sort: "price_asc", limit: 1 })
				.then((r) => { if (alive && r.photos[0]) videoFrom = r.photos[0].price; })
				.catch(() => {}),
			apiGet<ApiResponse<{ key: string; value: string }>>("/api/settings/standar_plan_price")
				.then((res) => { if (alive && res.data?.value) standarPrice = Number(res.data.value); })
				.catch(() => {}),
		];
		void Promise.allSettled(jobs).then(settleRefresh);
		return () => { alive = false; };
	});

	// Font display (Postoni/Fraunces) datang belakangan dan mengubah tinggi
	// judul — ukur ulang sekali saat siap (sopan: tunda bila sedang digulir).
	$effect(() => {
		let cancelled = false;
		try {
			void document.fonts?.ready.then(() => {
				if (!cancelled) calmRefresh();
			});
		} catch {
			/* fonts API tak tersedia — abaikan */
		}
		return () => { cancelled = true; };
	});

	$effect(() => {
		calmRefresh();
		const t = window.setTimeout(() => calmRefresh(), 600);
		return () => {
			window.clearTimeout(t);
		};
	});

	$effect(() => {
		const section = heroSection;
		if (!section) return;
		const ctx = gsap.context(() => {
			const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
			if (reduce) {
				gsap.set(".hero-anim", { opacity: 1, y: 0 });
				gsap.set(".hero-img-anim", { scale: 1, yPercent: 0 });
				gsap.set(".hero-img-scrub", { scale: 1, yPercent: 0 });
				return;
			}
			const isMobile = window.innerWidth < 640;
			const tl = gsap.timeline({ delay: 0.2 });
			tl.to(".hero-img-anim", { scale: 1, duration: 2.2, ease: "power2.out" }, 0)
				.to(".hero-anim", { opacity: 1, y: 0, duration: 1.15, ease: "power3.out", stagger: 0.12 }, 0.15);
			// Scrub parallax di wrapper DALAM (.hero-img-scrub), bukan di
			// .hero-img-anim: entrance di atas juga menulis `scale` elemen luar
			// selama 2,2 detik — dua tween berebut satu properti = kedutan
			// pada guliran pertama. Elemen berbeda = tidak pernah berkelahi.
			gsap.to(".hero-img-scrub", {
				yPercent: isMobile ? 4 : 8,
				scale: isMobile ? 1.06 : 1.12,
				ease: "none",
				scrollTrigger: { trigger: section, start: "top top", end: "bottom top", scrub: 0.6 },
			});
			gsap.to(".hero-content", {
				yPercent: isMobile ? -10 : -16,
				opacity: isMobile ? 0.45 : 0.55,
				ease: "none",
				scrollTrigger: { trigger: section, start: "top top", end: "bottom top", scrub: 0.6 },
			});
		});
		return () => ctx.revert();
	});

	function onHeroSearch(e: SubmitEvent) {
		e.preventDefault();
		const v = q.trim();
		goto(v ? `/photos?q=${encodeURIComponent(v)}` : "/photos");
	}

	// Hover-preview video drone: mainkan mp4 asli (originalUrl API) saat
	// kartu di-hover/fokus, jeda + reset saat keluar. Poster = ParallaxImage
	// di bawahnya, jadi tanpa previewUrl kelakuannya tetap seperti semula.
	/** Rel sedang meluncur (panah): kartu lewat di bawah kursor yang diam
	    jangan memicu preview — decoder video menyala di tengah geseran = patah. */
	/** Gulir vertikal halaman sedang berjalan: decoder video yang menyala
		atau mulai di tengah geseran = geser patah. Selama true: preview
		dijeda + yang baru ditolak; dimatikan 160 ms setelah gulir berhenti. */
	let pageScrolling = $state(false);
	let scrollSettleT = 0;
	function pauseSheetVideos() {
		document.querySelectorAll<HTMLVideoElement>("video[data-preview]").forEach((v) => {
			// Kartu aktif di strip drone memang autoplay: jangan dijeda gulir.
			if (v.closest("[data-active]")) return;
			if (!v.paused) v.pause();
			v.closest("a")?.removeAttribute("data-playing");
		});
	}
	$effect(() => {
		const onScroll = () => {
			if (!pageScrolling) {
				pageScrolling = true;
				pauseSheetVideos();
			}
			window.clearTimeout(scrollSettleT);
			scrollSettleT = window.setTimeout(() => {
				pageScrolling = false;
			}, 160);
		};
		window.addEventListener("scroll", onScroll, { passive: true });
		return () => {
			window.removeEventListener("scroll", onScroll);
			window.clearTimeout(scrollSettleT);
		};
	});
	// Entransi ubin rel: muncul berjenjang sekali saat rel terlihat.
	// Penanda `is-in` dipasang di WADAH rel, bukan per ubin — saat data video
	// segar tiba ubin dibuat ulang tanpa kelas itu → seluruh rel tetap
	// opacity 0 (kotak abu kosong).
	// Pengaman: paksa tampil setelah 2,5 dtk bila observer tak menyala.
	$effect(() => {
		const el = railEl;
		if (!el) return;
		const show = () => el.classList.add("is-in");
		if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
			show();
			return;
		}
		const io = new IntersectionObserver(
			(entries) => {
				if (entries.some((en) => en.isIntersecting)) {
					show();
					io.disconnect();
				}
			},
			{ threshold: 0.12 },
		);
		io.observe(el);
		const fallback = window.setTimeout(show, 2500);
		return () => {
			io.disconnect();
			window.clearTimeout(fallback);
		};
	});
	function playPreview(e: Event) {
		if (railGliding || pageScrolling) return;
		if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
		const card = e.currentTarget as HTMLElement | null;
		const vid = card?.querySelector<HTMLVideoElement>("video[data-preview]");
		if (!vid) return;
		if (!vid.src) return;
		document.querySelectorAll<HTMLVideoElement>("video[data-preview]").forEach((o) => {
			if (o !== vid && !o.paused && !o.closest("[data-active]")) o.pause();
		});
		// Video baru dimunculkan saat BENAR-BENAR diputar. Dulu langsung saat
		// hover (plus poster = thumbnail): selagi klip dimuat, yang tampil
		// poster lengkap dengan pita "lakunastock · ID" di bawahnya.
		vid.addEventListener("playing", () => {
			if (!vid.paused) card?.setAttribute("data-playing", "");
		}, { once: true });
		void vid.play().catch(() => {});
	}

	function stopPreview(e: Event) {
		const card = e.currentTarget as HTMLElement | null;
		// Kartu aktif terus berputar (autoplay), meski kursor keluar.
		if (card?.hasAttribute("data-active") && window.innerWidth >= 900) return;
		const vid = card?.querySelector<HTMLVideoElement>("video[data-preview]");
		if (!vid) return;
		vid.pause();
		card?.removeAttribute("data-playing");
		try {
			vid.currentTime = 0;
		} catch {
			/* abaikan — video belum termuat */
		}
	}

	// Strip drone (desktop): klip yang sedang menyala warna langsung diputar
	// sendiri; yang lain berhenti. Tetangganya dimuat lebih awal supaya saat
	// jadi aktif tak menunggu unduh. Video preview 640 px jauh lebih tajam
	// daripada thumbnail 400 px yang diperbesar.
	$effect(() => {
		const a = dragActive;
		void droneItems.length;
		const track = reelLgEl;
		if (!track || reduceMotion() || window.innerWidth < 900) return;
		track.querySelectorAll<HTMLElement>(".dg-card").forEach((card, i) => {
			const vid = card.querySelector<HTMLVideoElement>("video[data-preview]");
			if (!vid) return;
			if (i === a) {
				if (!vid.src) return;
				vid.preload = "auto";
				const mark = () => {
					if (!vid.paused && card.hasAttribute("data-active")) card.setAttribute("data-playing", "");
				};
				if (vid.paused) vid.addEventListener("playing", mark, { once: true });
				else mark();
				void vid.play().catch(() => {});
			} else {
				if (Math.abs(i - a) === 1) vid.preload = "auto";
				if (!vid.paused) vid.pause();
				card.removeAttribute("data-playing");
			}
		});
	});

	// Mobile (layar sentuh sempit): tidak ada hover, jadi klip contact sheet
	// autoplay sendiri saat masuk viewport dan berhenti saat keluar. Diukur
	// per-kartu via IntersectionObserver supaya yang tidak terlihat tidak
	// ikut memutar — hemat baterai & kuota. Desktop tidak tersentuh.
	// Satu klip saja yang berbunyi... (muted) dalam satu waktu: kartu kolom
	// tunggal sering dua-duanya >35% terlihat, dan dua decoder sekaligus
	// yang bikin scroll terasa berat di HP.
	let mobileVid: HTMLVideoElement | null = null;
	$effect(() => {
		void shownVids;
		if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
		if (!window.matchMedia("(pointer: coarse) and (max-width: 639px)").matches) return;
		const vids = [...document.querySelectorAll<HTMLVideoElement>("video[data-preview]")];
		if (!vids.length) return;
		const io = new IntersectionObserver(
			(entries) => {
				for (const en of entries) {
					const vid = en.target as HTMLVideoElement;
					const card = vid.closest("a");
					if (en.isIntersecting) {
						if (!vid.src) continue;
						if (mobileVid && mobileVid !== vid && !mobileVid.paused) {
							mobileVid.pause();
							mobileVid.closest("a")?.removeAttribute("data-playing");
						}
						mobileVid = vid;
						card?.setAttribute("data-playing", "");
						void vid.play().catch(() => {});
					} else if (!vid.paused) {
						// Jeda saja tanpa reset: masuk lagi = lanjut, bukan
						// unduh ulang dari awal (hemat kuota; test menunjukkan
						// puluhan abort saat reset+putar berulang).
						vid.pause();
						card?.removeAttribute("data-playing");
					}
				}
			},
			{ threshold: 0.35 },
		);
		vids.forEach((v) => io.observe(v));
		return () => {
			io.disconnect();
			mobileVid = null;
		};
	});
</script>

<div>
	<Preloader heroReady={heroReady} />
	<div class="hero-cover relative">
		<section
			bind:this={heroSection}
			class="group/hero on-darkroom sticky top-0 z-0 h-[100svh] min-h-[580px] w-full overflow-hidden"
		>
			<div class="hero-img-anim absolute inset-0 will-change-transform transition-[filter,opacity] duration-700 ease-out group-has-[form[role=search]:focus-within]/hero:blur-[22px] group-has-[form[role=search]:focus-within]/hero:brightness-[0.55] group-has-[form[role=search]:focus-within]/hero:opacity-60">
				<!-- Lapisan scrub parallax (dalam) — terpisah dari entrance scale
					di lapisan luar supaya tidak berebut properti. Kelebihan
					tinggi untuk headroom parallax ditaruh DI SINI (dalam),
					bukan di luar: entrance scale di lapisan luar yang seukuran
					bingkai persis jadi terbaca penuh di empat sisi, bukan
					hanya kiri-kanan. -->
				<div class="hero-img-scrub absolute inset-x-0 -top-[6%] h-[112%] will-change-transform sm:-top-[12%] sm:h-[124%]">
				<!-- alt kosong: ini foto latar yang bisa diganti lewat CMS jadi apa
					saja, sementara pesannya sudah dipikul judul di sebelahnya.
					Deskripsi yang di-hardcode ("Pemandangan Nusantara") akan salah
					begitu gambarnya diganti — dan deskripsi yang salah lebih buruk
					daripada tidak ada. Bila CMS memasang klip video + gerakan
					diizinkan, latarnya video autoplay bisu (menyeluruh, bukan
					kotak video): bungkus parallax/entrance tetap sama. -->
				{#if heroIsVideo && heroVideoUrl}
					{#key heroVideoUrl}
						<video
							bind:this={heroVideoEl}
							src={heroVideoUrl}
							autoplay
							muted
							loop
							playsinline
							preload="auto"
							poster={HERO_FALLBACK ?? undefined}
							aria-hidden="true"
							tabindex="-1"
							class="h-full w-full object-cover object-center"
							oncanplaythrough={() => (heroVideoOk = true)}
							onloadeddata={() => {
								// Lensa membuka hanya bila video sudah bisa diputar lancar
								// (tanpa poster, buffering = hero hitam). Pengaman: 2,5 dtk.
								window.setTimeout(() => (heroVideoOk = true), 2500);
							}}
							onerror={onHeroError}
						></video>
					{/key}
				{:else if heroSrc}
					<ApiImage src={heroSrc} alt="" fill eager class="object-cover object-center" onload={() => (heroLoadedSrc = heroSrc)} onerror={onHeroError} />
				{/if}
				</div>
			</div>

			<!-- Scrim hero. Nilainya di app.css (.hero-scrim) karena mobile dan
				desktop butuh bentuk yang berbeda, dan media query tidak bisa ditulis
				di atribut style. -->
			<!-- Blitz kamera saat lensa preloader membuka (lihat onOpen). -->
			<div aria-hidden="true" class="hero-flash pointer-events-none absolute inset-0"></div>
			<div aria-hidden="true" class="hero-scrim pointer-events-none absolute inset-0"></div>
			<div class="grain absolute inset-0 opacity-[0.18] mix-blend-soft-light"></div>

			<!-- Konten hero diakhir di atas tepi bawah (penanda gulir sudah dilepas). -->
			<div class="hero-content relative z-10 mx-auto flex h-full max-w-[1500px] flex-col justify-end px-5 pb-[15vh] sm:px-6 sm:pb-[17vh] lg:px-10">
				<h1 class="hero-focus-dim hero-title mt-3 text-[clamp(2.1rem,6.4vw,6.25rem)] text-ivory sm:mt-6">
					{#if hero?.title}
						<span class="hero-anim block">{hero.title}</span>
					{:else}
						<span class="hero-anim block">{c.hero.titleA}</span>
						<span class="hero-anim block">{c.hero.titleEm} <span class="serif-em text-safelight">{c.hero.titleB}</span></span>
					{/if}
				</h1>
				<p class="hero-anim hero-focus-dim mt-4 max-w-[52ch] text-[0.92rem] leading-relaxed text-ivory/75 sm:mt-8 sm:text-[1.02rem]">
					{hero?.body || c.hero.sub}
				</p>

				<!-- Rel bawah: hanya pencarian, tanpa garis datum maupun CTA
					pendamping — hero murni tesis + satu aksi. -->
				<div class="hero-anim mt-7 flex items-center gap-3 sm:mt-14 sm:gap-5 sm:justify-between">
					<form role="search" onsubmit={onHeroSearch} class="min-w-0 flex-1 sm:max-w-[34rem] sm:flex-none sm:w-[34rem]">
						<div class="group flex items-center gap-3 border-b border-ivory/22 pb-3.5 transition-colors sm:pb-3 duration-500 focus-within:border-safelight">
							<svg
								width="18"
								height="18"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="1.6"
								stroke-linecap="round"
								stroke-linejoin="round"
								class="shrink-0 text-ivory/45 transition-colors duration-500 group-focus-within:text-safelight"
								aria-hidden="true"
							>
								<circle cx="11" cy="11" r="7" />
								<path d="m20 20-3.5-3.5" />
							</svg>
							<input
								type="search"
								bind:value={q}
								placeholder={c.nav.searchPlaceholder}
								aria-label={c.hero.searchLabel}
								class="flex-1 bg-transparent text-[0.95rem] text-ivory outline-none placeholder:text-ivory/40 sm:text-[1.05rem]"
							/>
						</div>
					</form>
						{#if heroIsVideo}
							<button
								type="button"
								class="hero-sound"
								aria-pressed={!heroMuted}
								aria-label={heroMuted ? (lang === "id" ? "Nyalakan suara video" : "Turn video sound on") : (lang === "id" ? "Matikan suara video" : "Mute video")}
								onclick={toggleHeroSound}
							>
								<span class="hs-bars" class:is-on={!heroMuted} aria-hidden="true">
									<i></i><i></i><i></i><i></i><i></i>
								</span>
								<span class="hs-label">
									<span class="hs-k">{lang === "id" ? "Suara" : "Sound"}</span>
									<span class="hs-v">{heroMuted ? (lang === "id" ? "Mati" : "Off") : (lang === "id" ? "Nyala" : "On")}</span>
								</span>
							</button>
						{/if}
				</div>
			</div>


		</section>

		<div class="relative z-10">
			<!-- Hero itu lapisan sticky: sambungan ini lewat DI ATASNYA, jadi tepi
				atasnya harus transparan. Kalau legam, ia memotong foto dan judul
				hero di tengah huruf. -->
			<Seam
				from="transparent"
				to="wash"
				height="clamp(180px, 30vh, 340px)"
				rule={false}
				darkOnly
			/>
			<!-- Penggaris tema, tepat di bawah hero. Beralas --wash seperti ArchiveStrip
				di bawahnya (satu baki), dan wajib berlatar: wadah ini menumpang di atas
				hero yang sticky, jadi tanpa latar fotonya tembus ke belakang teks. -->
			<!-- {#if rulerItems.length}
				<section aria-labelledby="cat-ruler-title" class="relative bg-wash pt-[clamp(3.5rem,9vh,6rem)]">
					<div class="mx-auto mb-[clamp(1.5rem,4vh,2.75rem)] max-w-[1500px] px-6 lg:px-10">
						<h2
							id="cat-ruler-title"
							class="font-display text-[clamp(1.7rem,3.6vw,2.9rem)] font-light leading-[1.12] tracking-[-0.02em] text-fg"
						>
							{s.rulerTitle}
						</h2>
					</div>
					<RulerCarousel
						items={rulerItems}
						label={s.rulerTitle}
						openLabel={s.rulerOpen}
						prevLabel={s.rulerPrev}
						nextLabel={s.rulerNext}
						counterLabel={s.rulerCount}
					/>
				</section>
			{/if} -->
			<ArchiveStrip curated={journeyPhotos} kicker={arsipSec?.kicker} title={arsipSec?.title} />
			<!-- Strip beralas --wash, contact sheet beralas --bg: basuhan
				pendek di antaranya, tanpa penanda. -->
			<Seam from="wash" to="bg" height="clamp(88px, 13vh, 150px)" rule={false} />
		</div>
	</div>

	<section
		bind:this={dronePinEl}
		class="drone-section relative z-10"
		class:is-scrolling={pageScrolling}
		style={droneH ? `height: ${droneH}px` : undefined}
	>
		<!-- Split seperti tadi: teks kiri, strip kanan digeser GULIR. -->
		<div class="drone-split">
			<div class="drone-copy">
				<Reveal>
					<p data-reveal class="kicker text-safelight">{videoSec?.kicker || c.cats.kicker}</p>
					<h2 data-reveal use:scrambleHover class="mt-3 whitespace-pre-line font-display text-[clamp(2rem,3.6vw,3.4rem)] font-light leading-[1.04] tracking-[-0.025em] text-fg">{videoSec?.title || c.cats.title}</h2>
				</Reveal>
			</div>

		{#if droneItems.length > 0}
			<div bind:this={dragViewEl} class="dg-view" role="region" aria-label="Contact sheet">
				<div bind:this={reelLgEl} class="dg-track">
					{#each droneItems as v, i (v.id + "-" + i)}
								<a
								href={`/videos/${v.id}`}
								class="dg-card group"
								data-active={i === dragActive ? "" : undefined}
								onmouseenter={playPreview}
								onmouseleave={stopPreview}
								onfocus={playPreview}
								onblur={stopPreview}
							>
								<img
									src={imgFor(v.seed, 600, 800, v.thumbUrl)}
									alt={v.title[lang]}
									loading="eager"
									decoding="async"
									draggable="false"
								/>
								{#if v.previewUrl}
									<video
										data-preview
										src={v.previewUrl}
										muted
										loop
										playsinline
										preload="metadata"
										aria-hidden="true"
										tabindex="-1"
										class="pointer-events-none absolute inset-0 z-[1] h-full w-full object-cover opacity-0 transition-opacity duration-500 group-data-[playing]:opacity-100"
									></video>
								{/if}
								<span class="dg-cap">
									<span class="dg-title">{v.title[lang]}</span>
								</span>
							</a>
					{/each}
				</div>
			</div>
		{/if}
		</div>
	</section>

	<!-- Contact sheet beralas --bg, peta di bawahnya --darkroom. -->
	<!-- Tema gelap: peta beralas --bg juga, jadi sambungan ini transparan
		(lihat .md-seam-in di MapDescent). Tema terang: basuhan panjang dari
		kertas ke gelap supaya tidak terbaca sebagai pita. -->
	<Seam from="bg" to="darkroom" height="clamp(120px, 18vh, 220px)" rule={false} class="md-seam-in" />

	<div data-globe>
		<MapDescent
		eyebrow={anjungan?.kicker}
		title={anjungan?.title}
		sub={anjungan?.body}
	/>
	</div>
	<!-- Tanpa Seam di sini: vignette peta sendiri sudah memudar ke --bg
		(app.css .im-vignette), dan jarak tambahan hanya menunda orbit galeri —
		layar kosong di antara peta dan foto yang mulai terbang. -->

	<div class="relative z-10 bg-bg">

	<GsapGallery photos={orbitPhotos ?? latest} />

	<!-- pt: foto galeri tenggelam di tepi atas section ini; tanpa jarak, label
		Membership menempel tepat di garis potongnya. -->
	<!-- bg-bg + relative: section ini menumpang ekor pin galeri (margin
		negatif di GsapGallery), jadi harus menutupi sisa orbit di belakangnya. -->
	<div class="relative bg-bg">
	<section class="relative mx-auto max-w-[1500px] px-6 pb-28 pt-[clamp(2rem,5vh,4rem)] lg:px-10 lg:pb-40">
		<!-- Teaser daftar harga sebagai papan tarif lab cetak: dua baris pada satu
			lembar, harga disejajarkan di satu kolom supaya bisa dibandingkan
			sekilas. Opsi unggulan ditandai sekali saja (garis safelight di kiri),
			bukan lewat kartu bercahaya. Tiap baris menuju tujuannya sendiri. -->
		<!-- start 97%: section ini naik menumpang ekor galeri orbit; dengan
			ambang bawaan (88%) judulnya masih kosong selama ±1/10 layar. -->
		<Reveal start="top 97%" class="relative z-10 grid gap-x-10 gap-y-6 lg:grid-cols-12 lg:items-end">
			<div class="lg:col-span-7">
				<p data-reveal class="kicker text-safelight">{hargaSec?.kicker || c.pricing.kicker}</p>
				<div use:scrambleHover>
					<RevealText
						as="h2"
						text={hargaSec?.title || c.pricing.title}
						class="mt-6 font-display text-[clamp(2.2rem,5vw,4.2rem)] font-light leading-[1.02] tracking-[-0.02em] text-fg"
					/>
				</div>
			</div>
		</Reveal>

		<div class="rate-sheet relative z-10 mt-14" data-no-hover-sound data-no-click-sound>
			<ParallaxImage
				src={rateImg}
				alt=""
				sizes="100vw"
				class="pointer-events-none absolute inset-0"
				amount={16}
				imgClassName="rate-img"
			/>
			<div aria-hidden="true" class="rate-scrim"></div>
			<Reveal stagger={0.08} class="relative z-10">
			<div data-reveal class="rate-row group">
				<div class="rate-name">
					<h3 class="font-display text-[1.6rem] leading-tight text-fg">{s.standar}</h3>
					<p class="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-fg-muted">
						{standarType === "VIDEO" ? s.standarDescVideo : s.standarDesc}
					</p>
					<!-- Foto dan klip dihargai berbeda, jadi jenisnya dipilih di sini
						— bukan disembunyikan di balik satu angka rata-rata. -->
					<div class="rate-toggle" role="group" aria-label={s.typeLabel}>
						<button
							type="button"
							aria-pressed={standarType === "FOTO"}
							onclick={() => (standarType = "FOTO")}
							class="rate-toggle-btn"
						>
							{s.typeFoto}
						</button>
						<button
							type="button"
							aria-pressed={standarType === "VIDEO"}
							onclick={() => (standarType = "VIDEO")}
							class="rate-toggle-btn"
						>
							{s.typeVideo}
						</button>
					</div>
				</div>
				{#if rateFrames.length}
					<span class="rate-strip" aria-label={s.standarStrip}>
						{#each rateFrames as f, fi (f.id + "-" + fi)}
							<span class="rate-frame"><ApiImage src={f.thumbUrl ?? ""} alt="" fill eager={warmBelow} class="object-cover" /></span>
						{/each}
					</span>
				{:else}
					<span aria-hidden="true" class="rate-lead"></span>
				{/if}
				<p class="rate-price">
					{#if standarShown != null}
						<span class="rate-from">{s.from}</span><span class="rate-num">{fmtIDR(standarShown)}</span><span class="rate-unit">{standarType === "VIDEO" ? s.perClip : s.perItem}</span>
					{:else}
						<span class="rate-num text-fg-muted">…</span>
					{/if}
				</p>
				<a
					class="rate-cta"
					href="/pricing"
				>
					{s.subscribeCta}
				</a>
			</div>

			<a data-reveal href="/pricing" class="rate-row rate-row--pick group">
				<div class="rate-name">
					<h3 class="font-display text-[1.6rem] leading-tight text-fg">
						{s.subscribe}
						<span class="rate-tag">{s.subscribeTag}</span>
					</h3>
					<p class="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-fg-muted">{s.subscribeDesc}</p>
				</div>
				{#if quotaLadder.length}
					<span class="rate-ladder">
						{#each quotaLadder as q, qi (q + "-" + qi)}
							<span class="rate-chip">{q}</span>
						{/each}
						<span class="rate-chip-unit">{s.quotaUnit}</span>
					</span>
				{:else}
					<span aria-hidden="true" class="rate-lead"></span>
				{/if}
				<p class="rate-price">
					{#if subscribeFrom != null}
						<span class="rate-from">{s.from}</span><span class="rate-num">{fmtIDR(subscribeFrom)}</span><span class="rate-unit">{s.perMonth}</span>
					{:else}
						<span class="rate-num text-fg-muted">…</span>
					{/if}
				</p>
				<span class="rate-cta">{s.subscribeCta}</span>
			</a>

			<!-- Harga custom: tak ada angka tetap, jadi barisnya menjawab
				"hubungi kami", bukan "pilih paket". -->
			<a data-reveal href={customHref} class="rate-row group">
				<div class="rate-name">
					<h3 class="font-display text-[1.6rem] leading-tight text-fg">{s.custom}</h3>
					<p class="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-fg-muted">{s.customDesc}</p>
				</div>
				<span aria-hidden="true" class="rate-lead"></span>
				<p class="rate-price"><span class="rate-num">{s.customPrice}</span></p>
				<span class="rate-cta">{s.customCta}</span>
			</a>
			</Reveal>
		</div>

		{#if compareShot && compareOrigUrl}
			<!-- Perbandingan pratinjau vs unduhan: pertanyaan pertama pembeli stok
				adalah "watermark-nya hilang tidak?", jadi dijawab dengan file
				sungguhan, bukan kalimat. Digeser sendiri oleh pembaca — gerak yang
				menjawab aksi, bukan animasi yang jalan sendiri. -->
			<Reveal class="relative z-10 mt-12 grid gap-8 lg:mt-16 lg:grid-cols-12 lg:gap-12">
				<figure data-reveal class="cmp @container lg:col-span-7">
					<div class="cmp-stage">
						<img class="cmp-img" src={compareShot.watermarkUrl} alt="" loading={warmBelow ? "eager" : "lazy"} fetchpriority="low" decoding="async" />
						<div class="cmp-clean" style={`clip-path: inset(0 0 0 ${comparePos}%)`}>
							<img
								class="cmp-img cmp-orig"
								class:is-ready={cmpOrigLoaded === compareOrigUrl}
								src={compareOrigUrl}
								alt=""
								loading={warmBelow ? "eager" : "lazy"}
								fetchpriority="low"
								decoding="async"
								onload={() => (cmpOrigLoaded = compareOrigUrl ?? "")}
							/>
						</div>
						<span class="cmp-line" style={`left: ${comparePos}%`} aria-hidden="true"></span>
						<span class="cmp-tag cmp-tag-left" style={`opacity: ${(comparePos / 100).toFixed(2)}`}>{s.comparePreview}</span>
						<span class="cmp-tag cmp-tag-right" style={`opacity: ${(1 - comparePos / 100).toFixed(2)}`}>{s.compareClean}</span>
						<input
							class="cmp-range"
							type="range"
							min="0"
							max="100"
							bind:value={comparePos}
							aria-label={s.compareSlider}
						/>
					</div>
					<figcaption class="mt-3 overflow-hidden text-ellipsis whitespace-nowrap text-[min(0.78rem,2.3cqi)] leading-relaxed text-fg-muted/80">{s.compareRes}</figcaption>
				</figure>

				<div data-reveal data-no-hover-sound data-no-click-sound class="flex flex-col lg:col-span-5">
					<h3 class="font-display text-[clamp(1.5rem,2.6vw,2.1rem)] font-light leading-tight tracking-[-0.01em] text-fg">
						{s.compareTitle}
					</h3>
					<!-- Pilihan Standard / Premium — hanya daftar paket yang dipilih
						yang tampil. -->
					<div class="rate-toggle mt-6 self-start" role="group" aria-label={s.planLabel}>
						<button
							type="button"
							aria-pressed={benefitPlan === "STANDARD"}
							onclick={() => (benefitPlan = "STANDARD")}
							class="rate-toggle-btn"
						>
							{s.standar}
						</button>
						<button
							type="button"
							aria-pressed={benefitPlan === "PREMIUM"}
							onclick={() => (benefitPlan = "PREMIUM")}
							class="rate-toggle-btn"
						>
							{s.subscribe}
						</button>
					</div>

					<!-- Panel mengisi sisa tinggi kolom (sejajar dengan gambar
						perbandingan): deskripsi, harga, manfaat, lalu tombol di dasar. -->
					<div class="ben-panel">
						<p class="ben-when">{benefitPlan === "PREMIUM" ? s.subscribeWhen : s.standarWhen}</p>
						<p class="ben-price">
							{#if (benefitPlan === "PREMIUM" ? subscribeFrom : standarShown) != null}
								<span class="rate-from">{s.from}</span><span class="ben-num">{fmtIDR((benefitPlan === "PREMIUM" ? subscribeFrom : standarShown) ?? 0)}</span><span class="rate-unit">{benefitPlan === "PREMIUM" ? s.perMonth : standarType === "VIDEO" ? s.perClip : s.perItem}</span>
							{:else}
								<span class="ben-num text-fg-muted">…</span>
							{/if}
						</p>
						<ul class="ben-list">
							{#each (benefitPlan === "PREMIUM" ? s.subscribeBenefits : s.standarBenefits) as b, bi (b + "-" + bi)}
								<li>{b}</li>
							{/each}
						</ul>
						<a href="/pricing" class="rate-cta ben-cta">{s.subscribeCta}</a>
					</div>
				</div>
			</Reveal>
		{/if}

		<!-- Dinding logo pelanggan: kurasi CMS (section `percaya`) menang bila
			diisi — tiap foto terpilih jadi satu logo; kosong = wordmark dummy. -->
		<Reveal class="mt-16 lg:mt-24">
			<LogoCloud eyebrow={trustSec?.kicker || s.trustEyebrow} items={trustLogos} />
		</Reveal>
	</section>
	</div>

	</div>

	<!-- Penutup: etalase bingkai pilihan (menggantikan ajakan "darkroom"). -->
	<FeaturedShowcase
		photos={featuredPhotos}
		copy={{ kicker: etalaseSec?.kicker, title: etalaseSec?.title, cta: etalaseSec?.cta }}
	/>
</div>

<style>
	/* Tombol suara video hero: pil kaca yang selalu terlihat (bukan cuma
		saat hover). Equalizer menari saat menyala, rebah saat dibisukan. */
	.hero-sound {
		display: inline-flex;
		align-items: center;
		gap: 0.7rem;
		height: 2.75rem;
		padding: 0 1rem 0 0.9rem;
		margin-top: 1.25rem;
		border-radius: 999px;
		border: 1px solid rgba(255, 255, 255, 0.18);
		background-color: rgba(10, 11, 14, 0.42);
		box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.12), 0 8px 24px -10px rgba(0, 0, 0, 0.6);
		color: #fff;
		backdrop-filter: blur(12px) saturate(1.3);
		-webkit-backdrop-filter: blur(12px) saturate(1.3);
		cursor: pointer;
		transition: border-color 0.25s, background-color 0.25s, box-shadow 0.25s;
	}
	.hero-sound:hover,
	.hero-sound:focus-visible {
		border-color: color-mix(in srgb, var(--safelight) 70%, transparent);
	}
	.hero-sound:focus-visible {
		outline: 2px solid var(--safelight);
		outline-offset: 3px;
	}
	.hs-bars {
		display: inline-flex;
		align-items: flex-end;
		gap: 2px;
		height: 12px;
	}
	.hs-bars i {
		width: 2px;
		height: 100%;
		border-radius: 1px;
		background: var(--safelight);
		transform: scaleY(0.25);
		transform-origin: bottom;
	}
	.hs-bars.is-on i {
		animation: hs-eq 0.9s ease-in-out infinite;
	}
	.hs-bars.is-on i:nth-child(2) { animation-delay: -0.18s; }
	.hs-bars.is-on i:nth-child(3) { animation-delay: -0.36s; }
	.hs-bars.is-on i:nth-child(4) { animation-delay: -0.54s; }
	.hs-bars.is-on i:nth-child(5) { animation-delay: -0.72s; }
	@keyframes hs-eq {
		0%, 100% { transform: scaleY(0.3); }
		50% { transform: scaleY(1); }
	}
	.hs-label {
		display: inline-flex;
		align-items: baseline;
		gap: 0.45rem;
		font-size: 0.82rem;
	}
	.hs-k {
		color: rgba(255, 255, 255, 0.65);
	}
	.hs-v {
		color: #fff;
		font-weight: 500;
	}
	@media (prefers-reduced-motion: reduce) {
		.hs-bars.is-on i {
			animation: none;
			transform: scaleY(0.7);
		}
	}
	/* Daftar manfaat paket terpilih: butir bertanda strip (bukan titik). */
	.ben-panel {
		display: flex;
		flex: 1;
		flex-direction: column;
		margin-top: 1.75rem;
		padding: clamp(1.4rem, 2.4vw, 2.2rem);
		border: 1px solid var(--hair);
		border-radius: 1.25rem;
		background: color-mix(in srgb, var(--paper) 55%, transparent);
	}
	.ben-when {
		max-width: 44ch;
		font-size: 0.95rem;
		line-height: 1.6;
		color: var(--fg-muted);
	}
	.ben-price {
		display: flex;
		align-items: baseline;
		gap: 0.5rem;
		margin-top: 1.4rem;
		padding-bottom: 1.4rem;
		border-bottom: 1px solid var(--hair);
	}
	.ben-num {
		font-family: var(--font-display);
		font-size: clamp(1.9rem, 3vw, 2.6rem);
		font-weight: 300;
		line-height: 1;
		color: var(--fg);
	}
	.ben-cta.rate-cta {
		margin-top: auto;
		align-self: flex-start;
		padding: 0.75rem 1.6rem;
		border-radius: 999px;
		background: var(--safelight);
		color: #fff;
		font-weight: 500;
		text-decoration: none;
		box-shadow: 0 12px 30px -14px var(--safelight-glow);
		transition: transform 0.25s ease, background 0.25s ease;
	}
	.ben-cta.rate-cta:hover,
	.ben-cta.rate-cta:focus-visible {
		color: #fff;
		background: var(--safelight-lamp, var(--safelight));
		transform: translateY(-2px);
	}
	.ben-list {
		margin-top: 1.4rem;
		margin-bottom: 2rem;
		max-width: 52ch;
		list-style: none;
		padding: 0;
		font-size: 0.95rem;
		line-height: 1.6;
		color: var(--fg-muted);
	}
	.ben-list li {
		position: relative;
		padding-left: 1.6rem;
	}
	.ben-list li + li {
		margin-top: 0.4rem;
	}
	.ben-list li::before {
		content: "";
		position: absolute;
		left: 0.2rem;
		top: 0.38em;
		width: 0.42rem;
		height: 0.78rem;
		border: solid var(--safelight);
		border-width: 0 2px 2px 0;
		transform: rotate(45deg);
	}
	/* Pilihan jenis aset di baris Standar. */
	.rate-toggle {
		display: inline-flex;
		margin-top: 0.9rem;
		border: 1px solid var(--hair);
		border-radius: 9999px;
		overflow: hidden;
	}
	.rate-toggle-btn {
		padding: 0.38rem 0.95rem;
		font-family: var(--font-body);
		font-size: 0.82rem;
		color: var(--fg-muted);
		background: transparent;
		cursor: pointer;
		transition: color 0.3s ease, background-color 0.3s ease;
	}
	.rate-toggle-btn:hover {
		color: var(--fg);
	}
	.rate-toggle-btn[aria-pressed="true"] {
		background: color-mix(in srgb, var(--fg) 10%, transparent);
		color: var(--fg);
	}
	.rate-toggle-btn:focus-visible {
		outline: 2px solid var(--safelight);
		outline-offset: -2px;
	}

	/* Perbandingan pratinjau vs unduhan. Dua lapis gambar yang sama; lapis
	   bersih dipotong clip-path mengikuti posisi penggeser. Penggesernya
	   input[type=range] sungguhan supaya bisa dipakai lewat keyboard. */
	.cmp-stage {
		position: relative;
		overflow: hidden;
		aspect-ratio: 3 / 2;
		border: 1px solid var(--hair);
		background: var(--surface);
	}
	/* Di layar sempit, panggungnya keluar dari margin halaman sampai mentok
	   tepi layar: bidang bandingnya jadi selebar mungkin, dan garis geser
	   punya ruang gerak yang cukup untuk jempol. Keterangan di bawahnya
	   tetap di dalam margin. */
	@media (max-width: 899px) {
		.cmp-stage {
			margin-inline: calc(50% - 50vw);
			border-left: 0;
			border-right: 0;
			aspect-ratio: 4 / 3;
		}
	}
	.cmp-img {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
		/* Sedikit diperbesar: yang dibandingkan detailnya, dan bingkai penuh
		   versi bersih tak perlu terpampang utuh di beranda. */
		transform: scale(1.35);
	}
	/* File asli muncul di atas thumbnail begitu selesai dimuat. */
	.cmp-orig {
		opacity: 0;
		transition: opacity 0.5s ease;
	}
	.cmp-orig.is-ready {
		opacity: 1;
	}
	/* ── Strip drone: split sticky, rel digeser gulir (tanpa baki) ───── */
	/* Ruang kosong di atas kartu (padding nav + pemusatan dalam 100svh) ±100px
	   ditambah Seam di atasnya membuat jeda dari strip arsip terlalu jauh.
	   Section ditarik naik: area kosong itu tumpang tindih dengan jeda di
	   atasnya (transparan, tak menutupi apa pun), sedangkan posisi kartu saat
	   pin tidak berubah. */
	.drone-section {
		margin-top: calc(-1 * clamp(64px, 15svh, 180px));
		/* Tumpang tindih dengan strip arsip di atasnya: area kosong section tak
		   boleh menelan klik; hanya teks dan bidang kartu yang interaktif. */
		pointer-events: none;
	}
	.drone-section :is(.drone-copy, .dg-view) {
		pointer-events: auto;
	}
	.drone-split {
		position: sticky;
		top: 0;
		min-height: 100svh;
		display: grid;
		grid-template-columns: minmax(260px, 5fr) 8fr;
		gap: clamp(1.5rem, 3vw, 3rem);
		align-items: center;
		/* Selebar layar (bukan max-width) supaya bidang bisa melebar sampai
		   tepi; lebar konten 1500px dijaga lewat padding inline.
		   Padding atas pas setinggi navbar + sedikit napas: konten tetap
		   di tengah vertikal, jadi tiap px padding atas = px ruang hitam
		   sebelum panel saat section masuk layar. */
		padding: calc(var(--nav-h, 72px) + 0.25rem) max(clamp(1.5rem, 3vw, 2.5rem), calc((100% - 1500px) / 2)) 1rem;
		overflow: hidden;
	}
	.drone-copy {
		min-width: 0;
		will-change: transform, opacity;
	}
	.dg-view {
		will-change: clip-path;
		position: relative;
		min-width: 0;
		overflow: hidden;
		overscroll-behavior-x: contain;
	}
	.dg-view:focus-visible {
		outline: 2px solid var(--safelight);
		outline-offset: -2px;
	}
	.dg-track {
		display: flex;
		gap: 0;
		width: max-content;
		padding-right: 0;
		position: relative;
		align-items: stretch;
		will-change: transform;
	}
	/* Panel full-bleed ala rujukan: tanpa radius, tanpa gap, selalu berwarna.
	   Judul muncul saat hover/fokus (atau saat kartu di tengah di layar sentuh). */
	.dg-card {
		position: relative;
		flex: 0 0 auto;
		height: clamp(420px, 84svh, 800px);
		aspect-ratio: 3 / 4;
		overflow: hidden;
		border-radius: 0;
		background: #1a1b1f;
		isolation: isolate;
	}
	.dg-card img,
	.dg-card video {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
		pointer-events: none;
	}
	.dg-cap {
		position: absolute;
		inset: auto 0 0;
		z-index: 2;
		padding: 2.4rem 1rem 1rem;
		background: linear-gradient(to top, rgba(0, 0, 0, 0.72), transparent);
		color: #fff;
		opacity: 0;
		transition: opacity 0.4s ease;
		pointer-events: none;
	}
	.dg-card:hover .dg-cap,
	.dg-card:focus-visible .dg-cap,
	.dg-card[data-active] .dg-cap {
		opacity: 1;
	}
	.dg-title {
		display: block;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-family: var(--font-display);
		font-size: 1rem;
		font-weight: 500;
	}
	/* Hover = satu garis ungu di tepi bawah yang memanjang dari kiri — sama dengan
	   kartu foto di /photos (Masonry), bukan bingkai penuh. Fokus keyboard tetap
	   mendapat kontur supaya terlihat jelas. */
	.dg-card::after {
		content: "";
		position: absolute;
		left: 0;
		bottom: 0;
		z-index: 3;
		width: 100%;
		height: 2px;
		background: var(--safelight);
		transform: scaleX(0);
		transform-origin: left;
		transition: transform 0.5s ease-out;
		pointer-events: none;
	}
	.dg-card:hover::after,
	.dg-card:focus-visible::after {
		transform: scaleX(1);
	}
	.dg-card:focus-visible {
		outline: 2px solid var(--safelight);
		outline-offset: -2px;
	}
	/* Penanda DRAG ala rujukan: mengikuti tengah viewport, hilang saat
	   berinteraksi keyboard / reduce-motion. */
	.dg-hint {
		position: sticky;
		left: 50%;
		display: inline-flex;
		margin: -38% 0 1rem -1.4rem;
		padding: 0.3rem 0.55rem;
		border: 1px solid rgba(255, 255, 255, 0.6);
		border-radius: 4px;
		font-family: var(--font-mono);
		font-size: 0.62rem;
		letter-spacing: 0.12em;
		color: #fff;
		pointer-events: none;
		mix-blend-mode: difference;
	}
	@media (max-width: 900px) {
		.drone-split {
			position: static;
			min-height: 0;
			grid-template-columns: 1fr;
			gap: 1.25rem;
			padding-top: clamp(2.5rem, 6vh, 4rem);
		}
		.dg-view {
			overflow-x: auto;
			scrollbar-width: none;
		}
		.dg-view::-webkit-scrollbar {
			display: none;
		}
		.dg-track {
			transform: none !important;
		}
		.dg-card {
			height: min(62svh, 520px);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.drone-split {
			position: static;
			min-height: 0;
		}
		.dg-view {
			overflow-x: auto;
		}
		.dg-track {
			transform: none !important;
		}
		.dg-cap,
		.dg-card::after {
			transition: none;
		}
		.dg-hint {
			display: none;
		}
	}
	.cmp-clean {
		position: absolute;
		inset: 0;
		overflow: hidden;
		/* Sebelum sisi bersih terlukis, jangan biarkan watermark di bawahnya
		   mengintip — tampilkan gelap saja. */
		background: var(--base);
	}
	.cmp-line {
		position: absolute;
		top: 0;
		bottom: 0;
		width: 1px;
		background: var(--safelight);
		pointer-events: none;
		/* Saat mentok di 0% atau 100%, garisnya tepat di tepi panggung —
		   digeser setengah lebarnya supaya tidak separuh terpotong. */
		transform: translateX(-0.5px);
	}
	.cmp-line::after {
		content: "";
		position: absolute;
		top: 50%;
		left: 50%;
		width: 34px;
		height: 34px;
		transform: translate(-50%, -50%);
		border: 1px solid var(--safelight);
		border-radius: 9999px;
		background: color-mix(in srgb, var(--color-ocean-deep) 55%, transparent);
		backdrop-filter: blur(3px);
	}
	.cmp-tag {
		position: absolute;
		bottom: 0.75rem;
		padding: 0.25rem 0.6rem;
		font-family: var(--font-mono);
		font-size: 0.68rem;
		letter-spacing: 0.08em;
		color: #f1efe9;
		background: color-mix(in srgb, var(--color-ocean-deep) 62%, transparent);
		backdrop-filter: blur(4px);
		pointer-events: none;
		/* Memudar mengikuti posisi slider (inline opacity): geser ke sisi
		   Download → label Preview hilang, dan sebaliknya. */
		transition: opacity 0.3s ease;
	}
	.cmp-tag-left { left: 0.75rem; }
	.cmp-tag-right { right: 0.75rem; }
	/* Penggeser menutupi seluruh bidang; thumb-nya dibuat tak terlihat karena
	   penanda visualnya sudah berupa garis + lingkaran di atas. */
	.cmp-range {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		margin: 0;
		opacity: 0;
		cursor: ew-resize;
		appearance: none;
		background: transparent;
	}
	.cmp-range:focus-visible {
		opacity: 1;
		outline: 2px solid var(--safelight);
		outline-offset: -2px;
	}

	/* Papan tarif: baris-baris pada satu lembar, harga sejajar di satu kolom.
	   Lembarnya duduk di atas satu bingkai arsip yang hanyut parallax, diredam
	   scrim supaya angka tetap kontras. */
	.rate-sheet {
		position: relative;
		overflow: hidden;
		border-top: 1px solid var(--hair);
		border-bottom: 1px solid var(--hair);
	}
	/* Kelasnya menempel di <img> dalam komponen anak → butuh :global,
	   tetap dibatasi ke dalam papan tarif. */
	.rate-sheet :global(.rate-img) {
		object-fit: cover;
		/* Pelat di bawah kaca: warnanya diredam supaya angka tetap yang dibaca. */
		filter: grayscale(0.55) contrast(0.92) blur(1.5px);
		transform: scale(1.04);
	}
	.rate-scrim {
		position: absolute;
		inset: 0;
		pointer-events: none;
		background:
			/* pekat di kolom nama (kiri) dan di belakang angka (kanan) */
			linear-gradient(
				100deg,
				color-mix(in srgb, var(--bg) 97%, transparent) 38%,
				color-mix(in srgb, var(--bg) 74%, transparent) 60%,
				color-mix(in srgb, var(--bg) 93%, transparent) 100%
			);
	}
	.rate-row {
		position: relative;
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		row-gap: 1rem;
		padding: 1.25rem 1rem;
		transition: background-color 0.4s ease;
	}
	.rate-row + .rate-row {
		border-top: 1px solid var(--hair);
	}
	.rate-row:hover {
		background: color-mix(in srgb, var(--fg) 3%, transparent);
	}
	.rate-row:focus-visible {
		outline: 2px solid var(--safelight);
		outline-offset: -2px;
	}
	/* Opsi unggulan: satu tanda saja — garis safelight dan rona tipis. */
	/* Opsi unggulan: rona safelight yang memudar ke kanan, bukan pelat penuh. */
	.rate-row--pick {
		background: linear-gradient(
			90deg,
			color-mix(in srgb, var(--safelight) 9%, transparent),
			transparent 70%
		);
	}
	.rate-row--pick:hover {
		background: linear-gradient(
			90deg,
			color-mix(in srgb, var(--safelight) 14%, transparent),
			transparent 74%
		);
	}
	.rate-row--pick::before {
		content: "";
		position: absolute;
		left: 0;
		top: -1px;
		bottom: -1px;
		width: 2px;
		background: var(--safelight);
	}
	.rate-tag {
		display: inline-block;
		margin-left: 0.6rem;
		padding: 0.2rem 0.6rem;
		border: 1px solid color-mix(in srgb, var(--safelight) 45%, transparent);
		border-radius: 999px;
		vertical-align: middle;
		font-family: var(--font-body);
		font-size: 0.75rem;
		line-height: 1.2;
		color: var(--safelight);
	}
	.rate-price {
		margin: 0;
		white-space: nowrap;
		font-family: var(--font-display);
		font-weight: 300;
		font-size: clamp(2rem, 4vw, 3rem);
		line-height: 1;
		letter-spacing: -0.02em;
		font-variant-numeric: tabular-nums;
		color: var(--fg);
	}
	.rate-from,
	.rate-unit {
		font-family: var(--font-body);
		font-size: 0.95rem;
		letter-spacing: 0;
		color: var(--fg-muted);
	}
	.rate-from {
		margin-right: 0.5rem;
	}
	.rate-unit {
		margin-left: 0.35rem;
	}
	.rate-cta {
		font-size: 0.95rem;
		color: var(--fg);
		text-decoration: underline;
		text-decoration-color: color-mix(in srgb, var(--fg) 30%, transparent);
		text-underline-offset: 0.35em;
		transition: color 0.3s ease, text-decoration-color 0.3s ease;
	}
	.rate-row:hover .rate-cta,
	.rate-row:focus-visible .rate-cta {
		color: var(--safelight);
		text-decoration-color: var(--safelight);
	}
	/* Isi kolom tengah tiap baris berbeda karena isinya memang beda:
	   Standar menunjukkan bingkainya, Subscribe menunjukkan tangga kuotanya. */
	.rate-strip {
		display: none;
	}
	.rate-frame {
		position: relative;
		display: block;
		width: 5.6rem;
		aspect-ratio: 3 / 2;
		overflow: hidden;
		border: 1px solid color-mix(in srgb, var(--fg) 22%, transparent);
		filter: grayscale(0.3);
		transition: filter 0.4s ease, transform 0.4s ease;
	}
	.rate-row:hover .rate-frame {
		filter: grayscale(0);
	}
	.rate-row:hover .rate-frame:nth-child(2) {
		transform: translateY(-3px);
	}
	.rate-ladder {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.45rem;
	}
	.rate-chip {
		min-width: 2.6rem;
		padding: 0.3rem 0.5rem;
		border: 1px solid color-mix(in srgb, var(--safelight) 38%, transparent);
		border-radius: 4px;
		text-align: center;
		font-family: var(--font-mono);
		font-size: 0.8rem;
		letter-spacing: 0.04em;
		color: color-mix(in srgb, var(--fg) 88%, transparent);
	}
	.rate-chip-unit {
		font-family: var(--font-mono);
		font-size: 0.72rem;
		letter-spacing: 0.06em;
		color: var(--fg-muted);
	}

	/* Garis titik pengikat nama → harga: membaca baris jadi satu kesatuan,
	   kebiasaan papan tarif lab cetak. */
	.rate-lead {
		display: none;
	}
	@media (min-width: 768px) {
		.rate-strip {
			display: flex;
			align-items: center;
			gap: 0.55rem;
			justify-self: center;
		}
		.rate-ladder {
			justify-self: center;
		}
		.rate-lead {
			display: block;
			align-self: center;
			height: 1px;
			background-image: linear-gradient(
				90deg,
				color-mix(in srgb, var(--fg) 26%, transparent) 0 2px,
				transparent 2px 9px
			);
			background-size: 9px 1px;
			opacity: 0.55;
		}
		.rate-row {
			grid-template-columns: minmax(0, 1fr) minmax(2rem, 1fr) auto 11rem;
			/* Tengah vertikal (bukan baseline): sejak kedua kotak disamakan
			   tingginya, baseline menempelkan isi ke atas dan menyisakan
			   ruang kosong di bawah. */
			align-items: center;
			column-gap: 4rem;
			padding: 1.5rem 2rem;
			/* Samakan tinggi kedua kotak: konten boleh lebih tinggi, tapi
			   tidak boleh lebih pendek dari ini. */
			min-height: 10rem;
		}
		.rate-price {
			text-align: right;
		}
		.rate-cta {
			justify-self: end;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.rate-row,
		.rate-cta {
			transition: none;
		}
	}
</style>
