<script lang="ts">
	import mlWorkerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
	import gsap from "gsap";
	import { playShutter, primeShutter } from "$lib/shutter";
	import { playScrambleClick } from "$lib/scramble";
	import { ScrollTrigger } from "gsap/ScrollTrigger";
	// Stylesheet dasar MapLibre (kanvas, marker, kontrol atribusi). Override
	// tampilan ada di app.css (`.im-wrap .maplibregl-*`).
	import "maplibre-gl/dist/maplibre-gl.css";
	import type { Snippet } from "svelte";
	import { polarCapsLayer } from "$lib/polarCaps";
	import { nightTile, nightTileUrl, type NightMode } from "$lib/nightTiles";
	import { i18n } from "$lib/i18n.svelte";
	import { holdReady } from "$lib/ready.svelte";
	import { sinceScroll } from "$lib/scrollCalm";
	import { pauseOffscreen } from "$lib/pauseOffscreen";
	import { catLabel, fetchMapHotspots, fetchPhotoById, fetchPhotoOriginal, fullscreenWidth, imgFor, type MapHotspot } from "$lib/data";
	import { isScrambledUrl, loadScrambledCached, paintScrambled, scrambleKey, scrambled } from "$lib/photoScramble";
	import ApiImage from "./ApiImage.svelte";

	gsap.registerPlugin(ScrollTrigger);

	const copy = {
		id: {
			kicker: "PETA ARCHIPELAGO",
			title: "Dari Sabang\nsampai Merauke",
			sub: "Mulai menjelajah Nusantara lewat koleksi kami.\nSetiap provinsi memiliki kisahnya sendiri.",
			overview: "Ringkasan",
			points: "titik",
			frames: "bingkai",
			explore: "Geser untuk menjelajah · Cubit / Ctrl+gulir untuk zoom · Klik untuk membuka",
			zoomHint: "Klik untuk perbesar · Gerakkan tetikus untuk menggeser",
			zoomOutHint: "Klik untuk perkecil · Gerakkan tetikus untuk menggeser",
			fullscreen: "Layar penuh",
			exit: "Keluar dari layar penuh",
			zoomIn: "Perbesar peta",
			zoomOut: "Perkecil peta",
			panOn: "Nyalakan geser peta",
			panOff: "Kunci peta, lanjut gulir",
			panHint: "Cubit atau geser dengan dua jari untuk menjelajah — ketuk titik untuk membuka",
			close: "Tutup",
			prev: "Sebelumnya",
			next: "Berikutnya",
			detail: "Lihat detail foto",
			frame: "Bingkai",
			plate: "Galeri",
			pano: "Panorama",
			point: "Titik",
			category: "Kategori",
			coord: "Koordinat",
			open: "Buka titik",
		},
		en: {
			kicker: "ARCHIPELAGO MAP",
			title: "From Sabang\nto Merauke",
			sub: "Start to explore Nusantara through our collection.\nEach province has the different story.",
			overview: "Overview",
			points: "points",
			frames: "frames",
			explore: "Drag to explore · Pinch / Ctrl+scroll to zoom · Click to open",
			zoomHint: "Tap to zoom in · Move mouse to pan",
			zoomOutHint: "Tap to zoom out · Move mouse to pan",
			fullscreen: "Fullscreen",
			exit: "Exit fullscreen",
			zoomIn: "Zoom map in",
			zoomOut: "Zoom map out",
			panOn: "Enable map panning",
			panOff: "Lock map, keep scrolling",
			panHint: "Pinch or drag with two fingers to explore — tap a point to open",
			close: "Close",
			prev: "Previous",
			next: "Next",
			detail: "View photo detail",
			frame: "Frame",
			plate: "Gallery",
			pano: "Panorama",
			point: "Point",
			category: "Category",
			coord: "Coordinate",
			open: "Open point",
		},
	};

	type Hotspot = MapHotspot;

	/**
	 * Mode `bare`: dipakai saat peta ditanam di dalam stage lain (MapDescent)
	 * yang memiliki koreografi scroll-nya sendiri. Intro/exit scrub di sini
	 * dimatikan (HUD langsung tampil), blink marker dipicu event
	 * `lakuna:map-shown` saat pendaratan, bukan ScrollTrigger.
	 *
	 * Di mode ini peta MapLibre (proyeksi globe) SEKALIGUS adalah globe hero:
	 * kamera mulai jauh (bumi utuh, rendah di layar), lalu induk memanggil
	 * dive()/rise() untuk menukik ke bingkai Nusantara dan kembali. Satu
	 * kanvas, satu citra — tak ada pergantian komponen.
	 *
	 * `backdrop`: isi yang digambar DI BELAKANG kanvas peta (bintang, judul
	 * besar). Kanvas globe transparan di luar bumi, jadi isi itu terlihat di
	 * langit dan tertutup bumi di tempat keduanya bertumpuk.
	 */
	let { bare = false, backdrop }: { bare?: boolean; backdrop?: Snippet } = $props();

	const FALLBACK_HOTSPOTS: Hotspot[] = [
		{ name: "Sabang", lat: 5.9, lng: 95.3, cat: "nature",
			desc: { id: "Pulau paling barat Indonesia — titik nol Nusantara", en: "Indonesia's westernmost island — the zero point of the archipelago" },
			photos: [
				{ seed: "nus-sabang-1", caption: { id: "Titik nol Nusantara di Pulau Weh", en: "Zero kilometer of the archipelago on Weh Island" } },
				{ seed: "nus-sabang-2", caption: { id: "Terumbu karang di Selat Sabang", en: "Coral gardens in the Sabang Strait" } },
				{ seed: "nus-sabang-3", caption: { id: "Mercusuar tua menghadap Samudra Hindia", en: "An old lighthouse facing the Indian Ocean" } },
			] },
		{ name: "Danau Toba", lat: 2.6, lng: 98.8, cat: "nature",
			desc: { id: "Kaldera raksasa dengan pulau vulkanik di tengah Sumatra", en: "A giant caldera with a volcanic island at the heart of Sumatra" },
			photos: [
				{ seed: "nus-toba-1", caption: { id: "Kaldera raksasa dari ketinggian", en: "The giant caldera from above" } },
				{ seed: "nus-toba-2", caption: { id: "Pulau Samosir di tengah danau", en: "Samosir Island at the lake's heart" } },
				{ seed: "nus-toba-3", caption: { id: "Rumah Batak tradisional di tepi air", en: "Traditional Batak houses by the water" } },
			] },
		{ name: "Jakarta", lat: -6.2, lng: 106.8, cat: "urban",
			desc: { id: "Detak urban padat dan cahaya malam ibu kota", en: "The dense urban pulse and night lights of the capital" },
			photos: [
				{ seed: "nus-jakarta-1", caption: { id: "Bundaran HI saat senja", en: "Bundaran HI at dusk" } },
				{ seed: "nus-jakarta-2", caption: { id: "Gang sempit di kota padat", en: "A narrow alley in the dense city" } },
				{ seed: "nus-jakarta-3", caption: { id: "Pelabuhan tua Sunda Kelapa", en: "The old Sunda Kelapa harbor" } },
				{ seed: "nus-jakarta-4", caption: { id: "Hujan malam dan neon", en: "Night rain and neon" } },
			] },
		{ name: "Bali", lat: -8.4, lng: 115.2, cat: "travel",
			desc: { id: "Ladang berundak, puri, dan garis pantai yang dibingkai senja", en: "Terraced fields, temples, and coastlines framed by dusk" },
			photos: [
				{ seed: "nus-bali-1", caption: { id: "Ladang berundak Jatiluwih", en: "Jatiluwih terraced fields" } },
				{ seed: "nus-bali-2", caption: { id: "Pura di tepi tebing Uluwatu", en: "A temple on the Uluwatu cliffs" } },
				{ seed: "nus-bali-3", caption: { id: "Ombak Tanah Lot menjelang malam", en: "Waves at Tanah Lot before night" } },
			] },
		{ name: "Komodo", lat: -8.5, lng: 119.5, cat: "nature",
			desc: { id: "Pulau naga dengan perairan jernih dan tebing terjal", en: "Island of dragons with clear waters and steep cliffs" },
			photos: [
				{ seed: "nus-komodo-1", caption: { id: "Komodo di padang savana", en: "A dragon on the savanna" } },
				{ seed: "nus-komodo-2", caption: { id: "Pink Beach dari bukit", en: "Pink Beach from the hill" } },
				{ seed: "nus-komodo-3", caption: { id: "Perairan jernih Taman Nasional", en: "Clear waters of the national park" } },
			] },
		{ name: "Makassar", lat: -5.1, lng: 119.4, cat: "urban",
			desc: { id: "Pelabuhan dan perlintasan ramai Selat Makassar", en: "Harbors and the busy crossings of the Makassar Strait" },
			photos: [
				{ seed: "nus-makassar-1", caption: { id: "Pelabuhan Paotere saat fajar", en: "Paotere harbor at dawn" } },
				{ seed: "nus-makassar-2", caption: { id: "Jembatan dan lalu lintas Selat", en: "Bridges and strait traffic" } },
				{ seed: "nus-makassar-3", caption: { id: "Pasar tradisional yang ramai", en: "A bustling traditional market" } },
			] },
		{ name: "Manado", lat: 1.5, lng: 124.8, cat: "nature",
			desc: { id: "Bunaken dan dasar laut khatulistiwa di utara", en: "Bunaken and the equatorial seabeds of the north" },
			photos: [
				{ seed: "nus-manado-1", caption: { id: "Taman laut Bunaken", en: "The Bunaken marine park" } },
				{ seed: "nus-manado-2", caption: { id: "Tebing karang bawah laut", en: "Underwater coral walls" } },
				{ seed: "nus-manado-3", caption: { id: "Bukit Minahasa di pagi hari", en: "Minahasa hills in the morning" } },
			] },
		{ name: "Ternate", lat: 0.8, lng: 127.4, cat: "travel",
			desc: { id: "Gunung berapi berpuncak awan dan benteng rempah", en: "A cloud-capped volcano and an old spice fortress" },
			photos: [
				{ seed: "nus-ternate-1", caption: { id: "Gunung Gamalama berpuncak awan", en: "Cloud-capped Mount Gamalama" } },
				{ seed: "nus-ternate-2", caption: { id: "Benteng Tolukko peninggalan rempah", en: "Tolukko Fort, a spice-era relic" } },
				{ seed: "nus-ternate-3", caption: { id: "Pantai timur pulau vulkanik", en: "The eastern shore of the volcanic isle" } },
			] },
		{ name: "Raja Ampat", lat: -0.5, lng: 130.5, cat: "travel",
			desc: { id: "Karst hijau menjulang di atas laguna pirus", en: "Green karst towering over turquoise lagoons" },
			photos: [
				{ seed: "nus-rajaampat-1", caption: { id: "Karst Wayag dari udara", en: "The Wayag karst from above" } },
				{ seed: "nus-rajaampat-2", caption: { id: "Laguna pirus di antara pulau", en: "Turquoise lagoons between isles" } },
				{ seed: "nus-rajaampat-3", caption: { id: "Kampung di tepi karang", en: "A village on the reef's edge" } },
				{ seed: "nus-rajaampat-4", caption: { id: "Matahari tenggelam di Fam", en: "Sunset over the Fam islands" } },
			] },
		{ name: "Sorong", lat: -0.9, lng: 131.3, cat: "travel",
			desc: { id: "Gerbang barat menuju kepulauan Raja Ampat", en: "The western gateway to the Raja Ampat islands" },
			photos: [
				{ seed: "nus-sorong-1", caption: { id: "Gerbang pelabuhan menuju Raja Ampat", en: "The harbor gateway to Raja Ampat" } },
				{ seed: "nus-sorong-2", caption: { id: "Pasar ikan di pinggir kota", en: "A fish market on the town's edge" } },
				{ seed: "nus-sorong-3", caption: { id: "Matahari terbit di ujung barat", en: "Sunrise at the western edge" } },
			] },
		{ name: "Jayapura", lat: -2.6, lng: 140.7, cat: "urban",
			desc: { id: "Teluk dan perbukitan di ujung timur negeri", en: "A bay and hills at the eastern edge of the nation" },
			photos: [
				{ seed: "nus-jayapura-1", caption: { id: "Teluk Yos Sudarso dari bukit", en: "Yos Sudarso Bay from the hills" } },
				{ seed: "nus-jayapura-2", caption: { id: "Pasar Hamadi di pagi hari", en: "Hamadi market in the morning" } },
				{ seed: "nus-jayapura-3", caption: { id: "Perbukitan Danau Sentani", en: "The hills around Lake Sentani" } },
			] },
		{ name: "Merauke", lat: -8.5, lng: 139.4, cat: "nature",
			desc: { id: "Pantai selatan dan sabana timur — ujung Nusantara", en: "Southern coast and eastern savanna — the end of Nusantara" },
			photos: [
				{ seed: "nus-merauke-1", caption: { id: "Sabana Wasur di musim kemarau", en: "Wasur savanna in the dry season" } },
				{ seed: "nus-merauke-2", caption: { id: "Pantai selatan ujung Nusantara", en: "The southern coast at the end of Nusantara" } },
				{ seed: "nus-merauke-3", caption: { id: "Kanguru liar di padang", en: "Wild wallabies on the plain" } },
			] },
	];

	function shotOffsets(hotspots: Hotspot[]): number[] {
		const out: number[] = [];
		let acc = 0;
		for (const h of hotspots) {
			out.push(acc);
			acc += h.photos.length;
		}
		return out;
	}

	// Bingkai Nusantara: Sabang–Merauke (barat–timur), Miangas–Rote (utara–selatan).
	// Kamera ringkasan memaskan bingkai ini ke ukuran layar, bukan pusat + zoom
	// tetap — dulu Sumatra terpotong di desktop dan di HP cuma Kalimantan yang tampak.
	const NUSANTARA: [[number, number], [number, number]] = [[-11.2, 94.6], [6.4, 141.4]];
	// Zoom MapLibre = zoom Leaflet − 1 (ubin 512 vs 256 px) untuk skala yang sama.
	const FOCUS_Z = 6;
	/** Batas resolusi render peta (rasio piksel), lihat opsi `pixelRatio` pada pembuatan Map. */
	const MAP_MAX_DPR = 1.5;
	/** Wilayah & zoom ubin cadangan tajam (lapisan esri-near + unduh-awal sekali jalan). */
	const NEAR_BOUNDS: [number, number, number, number] = [90, -12, 146, 9];
	const NEAR_MAXZOOM = 7;
	/** Zoom peta tempat lapisan zoom-dalam (esri-hi + penambal esri-mid) mengambil alih, dan tingkat ubin
	    terendahnya (= tingkat ubin pada zoom itu). Lihat sumber esriHi. */
	const HI_MIN_ZOOM = 7;
	const HI_MIN_TILE = 8;
	/** Jarak minimum antar gambar ulang globe hero (ms): saat mengejar kursor ≈ 30 fps, saat gelinding awal
	    masih cepat ≈ 15 fps (geser < 1 px per frame), dan saat hanya siklus siang–malam / gelinding yang sudah
	    pelan ≈ 10 fps. */
	const HERO_FRAME_MS = 32;
	const HERO_ROLL_FRAME_MS = 66;
	const HERO_AMBIENT_MS = 100;
	/** Jarak minimum antar pembaruan sisi malam: tiap perubahan state style = DUA gambar ulang globe di MapLibre
	    (render + render susulan karena style "berubah"), jadi 10×/dtk = 20 gambar ulang. 5×/dtk dengan transisi
	    linear (langkah opasitas ≤ ±3,6%) tak terbedakan. */
	const NIGHT_STEP_MS = 200;
	/** Seberapa jauh peta boleh diperkecil dari tampilan ringkasan Nusantara (tingkat zoom). */
	const LANDED_ZOOM_OUT = 0.3;
	const CLUSTER_MAX_Z = 10;
	const FLY_DUR = 0.9;

	// Kamera hero (mode tanam): bumi utuh, pusatnya jauh di bawah layar, jadi
	// yang terlihat hanya tudung atasnya — Asia menghadap, Indonesia tepat di
	// bawah tepi layar. Selagi menunggu, bumi MENGGELINDING bawah → atas
	// (lintang tengah turun dari 30°LU ke 24°LU, melambat). Cukup jauh di
	// utara supaya putaran ke Indonesia saat membuka peta terasa panjang
	// (±28°). Kutub yang ikut terlihat aman: citranya asli (lihat polarCaps).
	const HERO_LNG = 118;
	const HERO_LAT_FROM = 30;
	const HERO_LAT_TO = 24;
	const HERO_ROLL_TAU = 9; // detik
	// Gestur kursor di hero: bumi berpaling mengikuti kursor sejauh ini (derajat)
	// di tepi layar, dihaluskan dengan konstanta waktu PTR_TAU.
	const PTR_LNG = 10;
	const PTR_LAT = 5;
	const PTR_TAU = 0.35; // detik
	const ease3 = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

	const IM_FALLBACK =
		"https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export?bbox=94,-11.5,142,7.5&bboxSR=4326&imageSR=4326&size=1200,600&format=jpg&f=image";

	function splitPlace(name: string): { place: string; region: string } {
		const i = name.indexOf(",");
		if (i < 0) return { place: name.trim(), region: "" };
		return { place: name.slice(0, i).trim(), region: name.slice(i + 1).trim() };
	}

	/** Ukuran plate marker; lebih kecil di layar sempit supaya tidak menutupi pulau. */
	function plateSize(): { w: number; h: number } {
		return window.matchMedia("(max-width: 640px)").matches ? { w: 58, h: 44 } : { w: 76, h: 58 };
	}

	/**
	 * Padding fitBounds untuk kamera ringkasan: sisakan ruang di atas untuk blok
	 * judul (kiri-atas) dan di bawah untuk petunjuk + atribusi ubin.
	 */
	function overviewFit(el: HTMLElement) {
		const w = el.clientWidth;
		const h = el.clientHeight;
		const narrow = w < 640;
		const side = Math.round(w * (narrow ? 0.05 : 0.04));
		return {
			top: Math.round(h * (narrow ? 0.3 : 0.26)),
			bottom: Math.round(h * (narrow ? 0.12 : 0.1)),
			left: side,
			right: side,
		};
	}

	const NO_PAD = { top: 0, bottom: 0, left: 0, right: 0 };


	/**
	 * Kamera hero untuk lintang tengah `lat`. Jari-jari cakram = 100vmin
	 * (maks 1000px), puncak cakram 66vmin di atas dasar layar. MapLibre
	 * memperbesar planet 1/cos(lintang) (lihat panduan globe), jadi zoom
	 * dikoreksi dengan cos(lat) supaya ukuran bumi tetap sama saat menggelinding.
	 * Pusat cakram jatuh di bawah layar lewat padding atas.
	 */
	function heroCamera(el: HTMLElement, lat: number, lift = 0) {
		const w = el.clientWidth;
		const h = el.clientHeight;
		const vmin = Math.min(w, h);
		const R = Math.min(vmin, 1000);
		const cy = h - 0.66 * vmin + R + lift;
		// Kursor ke kanan → permukaan ikut ke kanan (pusat bergeser ke barat);
		// kursor ke bawah → permukaan ikut turun (pusat bergeser ke utara).
		const cLat = lat + ptrY * PTR_LAT;
		const zoom = Math.log2((R * 2 * Math.PI * Math.cos((cLat * Math.PI) / 180)) / 512);
		return {
			center: [HERO_LNG - ptrX * PTR_LNG, cLat] as [number, number],
			zoom,
			bearing: 0,
			pitch: 0,
			padding: { top: Math.max(0, 2 * cy - h), bottom: 0, left: 0, right: 0 },
		};
	}

	const PLATE_BRACKETS = `<svg class="im-mk-br" width="100%" height="100%" viewBox="0 0 100 76" preserveAspectRatio="none" fill="none" aria-hidden="true"><path d="M0.5 13V0.5H14M86 0.5H99.5V13M99.5 63V75.5H86M14 75.5H0.5V63" stroke="currentColor" stroke-width="1" vector-effect="non-scaling-stroke"/></svg>`;

	const GLYPH_PANO = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 7.5c6.7-2 13.3-2 20 0v9c-6.7 2-13.3 2-20 0z"/><path d="M2 15l5.5-4.5L12 14l3.5-3 6.5 5"/></svg>`;
	const GLYPH_POINT = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="1.5"/><circle cx="12" cy="12" r="3.5"/></svg>`;
	const GLYPH_STACK = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="8" y="3" width="13" height="13" rx="1.5"/><path d="M16 21H4.5A1.5 1.5 0 0 1 3 19.5V8"/></svg>`;

	function escapeHtml(s: string): string {
		return s
			.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;")
			.replace(/"/g, "&quot;")
			.replace(/'/g, "&#39;");
	}

	/**
	 * Allowlist host gambar marker. Aktual: placeholder `picsum.photos`,
	 * tile/fallback Esri (`server.arcgisonline.com`), dan thumbUrl backend
	 * (presigned MinIO / API di localhost + VITE_API_URL). Skema wajib
	 * `https:` (kecuali `http:` localhost dev). URL yang tidak lolos TIDAK
	 * dirender — mencegah injeksi CSS/HTML lewat `thumbUrl` ke `L.divIcon`.
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

	function isSafeImgUrl(raw: string | null | undefined): raw is string {
		if (!raw) return false;
		const v = raw.trim();
		if (!v || v.length > 2048) return false;
		const lower = v.toLowerCase();
		if (
			lower.startsWith("javascript:") ||
			lower.startsWith("data:") ||
			lower.startsWith("vbscript:")
		) return false;
		let u: URL;
		try {
			u = new URL(v);
		} catch {
			return false;
		}
		if (u.protocol !== "https:") {
			const h = u.hostname.toLowerCase();
			if (!(u.protocol === "http:" && (h === "localhost" || h === "127.0.0.1"))) return false;
		}
		return imgHostAllowed(u.hostname);
	}

	/**
	 * URL aman untuk template `background-image:url('…')`.
	 * Divalidasi dulu, lalu dinormalisasi lewat parser URL + escape kutip; "" bila
	 * tidak valid (pemanggil mengosongkan style sehingga tidak ada gambar yang dirender).
	 * Jangan encodeURI(): URL presigned MinIO sudah ter-encode, `%3B` jadi `%253B`
	 * → signature tidak cocok (400) → gambar diblokir ORB.
	 */
	function safeMarkerBg(raw: string | null | undefined): string {
		if (!isSafeImgUrl(raw)) return "";
		return new URL(raw.trim()).href.replace(/'/g, "%27").replace(/"/g, "%22");
	}

	// ── Foto TERACAK di plate & filmstrip (lihat $lib/scramble) ─────────────
	// Thumbnail API adalah mozaik ubin teracak → ditampilkan lewat <canvas> yang disusun ulang, bukan <img>
	// (tab Network/Elements hanya memuat mozaik). Plate & thumbnail filmstrip cuma ±70 × 50 px, jadi tiap foto
	// disusun SEKALI ke kanvas penuh lalu diperkecil ke "bitmap kecil" yang menutupi kotak plate terbesar ×
	// DPR × cadangan perbesaran (denyut 1,2× · hover 1,03× · zoom panggung 1,15× ≈ 1,42×) — tetap ≥ piksel
	// layar, tak pernah diregang. Plate tunggal, plate gabungan, dan filmstrip tinggal menyalinnya: puluhan
	// plate tak perlu masing-masing memegang kanvas 800 px. Berkas dimuat tanpa crossOrigin → semua kanvas
	// ini "tainted" (toDataURL/getImageData dari konsol ditolak).
	const SMALL_BOX = { w: 76, h: 58 }; // = plateSize() desktop, kotak terbesar (filmstrip ≤ 62 × 48)
	const SMALL_OVERSCAN = 2;
	const smallBitmaps = new Map<string, Promise<HTMLCanvasElement>>();
	function smallBitmap(url: string): Promise<HTMLCanvasElement> {
		// Kunci tanpa query: tanda tangan presigned berganti tiap fetch, berkasnya sama.
		const id = url.split(/[?#]/)[0]!;
		let p = smallBitmaps.get(id);
		if (p) return p;
		const key = scrambleKey(url);
		if (!key) return Promise.reject(new Error("not scrambled"));
		p = loadScrambledCached(url).then((img) => {
			const full = document.createElement("canvas");
			paintScrambled(full, img, url, key);
			const s =
				Math.max(SMALL_BOX.w / full.width, SMALL_BOX.h / full.height) * (window.devicePixelRatio || 1) * SMALL_OVERSCAN;
			if (s >= 1) return full;
			const small = document.createElement("canvas");
			small.width = Math.max(1, Math.round(full.width * s));
			small.height = Math.max(1, Math.round(full.height * s));
			const ctx = small.getContext("2d", { alpha: false });
			if (!ctx) return full;
			ctx.imageSmoothingQuality = "high";
			ctx.drawImage(full, 0, 0, small.width, small.height);
			full.width = full.height = 0; // lepas memori kanvas penuh
			return small;
		});
		p.catch(() => smallBitmaps.delete(id));
		smallBitmaps.set(id, p);
		return p;
	}
	/** Salin bitmap kecil ke kanvas tampil (ukuran = bitmap → rasio foto; object-fit dari CSS seperti <img>). */
	function paintSmall(cv: HTMLCanvasElement, bmp: HTMLCanvasElement) {
		if (cv.width !== bmp.width) cv.width = bmp.width;
		if (cv.height !== bmp.height) cv.height = bmp.height;
		cv.getContext("2d", { alpha: false })?.drawImage(bmp, 0, 0);
		cv.dataset.scr = "ok";
	}
	/** `.im-mk-plate-img > img` di app.css, untuk kanvasnya (selektor itu hanya mengenai <img>). */
	const PLATE_CANVAS_STYLE =
		"position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center top;pointer-events:none;user-select:none";
	/**
	 * Action thumbnail filmstrip teracak: bitmap kecil, dimuat saat mendekati jendela strip (seperti
	 * loading="lazy" — strip bergulir mendatar, jadi akarnya strip itu sendiri).
	 */
	function smallScrambled(cv: HTMLCanvasElement, url: string) {
		let cur = url;
		let token = 0;
		let io: IntersectionObserver | null = null;
		const start = () => {
			io?.disconnect();
			const my = ++token;
			const load = () => {
				io?.disconnect();
				io = null;
				smallBitmap(cur).then((b) => my === token && paintSmall(cv, b), () => {});
			};
			if (typeof IntersectionObserver === "undefined") return load();
			io = new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && load(), {
				root: cv.closest<HTMLElement>(".im-dv-strip"),
				rootMargin: "0px 600px",
			});
			io.observe(cv);
		};
		start();
		return {
			update(next: string) {
				const same = next.split(/[?#]/)[0] === cur.split(/[?#]/)[0];
				cur = next;
				if (!same) start();
			},
			destroy() {
				token++;
				io?.disconnect();
			},
		};
	}

	/**
	 * URL plate pertama yang benar-benar bisa dimuat untuk satu titik; "" bila
	 * tidak ada. File yang hilang di storage (404) tidak lagi jadi plate kosong —
	 * foto berikutnya di titik yang sama dipakai.
	 */
	function resolvePlateUrl(h: Hotspot): Promise<string> {
		const candidates = h.photos
			.map((p) => safeMarkerBg(imgFor(p.seed, 200, 160, p.thumbUrl)))
			.filter(Boolean);
		return new Promise((resolve) => {
			const tryAt = (k: number) => {
				if (k >= candidates.length) return resolve("");
				const img = new Image();
				let settled = false;
				const next = (ok: boolean) => {
					if (settled) return;
					settled = true;
					clearTimeout(timer);
					if (ok) resolve(candidates[k]);
					else tryAt(k + 1);
				};
				const timer = setTimeout(() => next(false), 4000);
				if (isScrambledUrl(candidates[k])) {
					// Teracak: unduh + susun bitmap kecilnya sekarang — plate langsung tergambar saat dibuat.
					smallBitmap(candidates[k]).then(() => next(true), () => next(false));
					return;
				}
				img.onload = () => next(img.naturalWidth > 0);
				img.onerror = () => next(false);
				img.src = candidates[k];
			};
			tryAt(0);
		});
	}

	// ── Sisi malam globe hero (lihat $lib/nightTiles) ───────────────────────
	// Tiga overlay statis (malam penuh / malam barat / malam timur); hanya
	// opasitasnya yang digerakkan jam siklus siang–malam milik MapDescent lewat
	// `setNightMix`. Opasitas dibaca dari state global style — tak perlu
	// setPaintProperty tiap frame — dan dikalikan pemudaran menurut zoom supaya
	// hilang sebelum bingkai Nusantara (peta mendarat tetap siang seperti semula).
	// Ketiganya SATU nilai state (`night` = [penuh, barat, timur]): tiap perubahan state memicu pembaruan style +
	// gambar ulang globe, jadi tiga kunci terpisah = tiga kali kerja per langkah siklus.
	const NIGHT_MODES: { id: string; mode: NightMode }[] = [
		{ id: "nightFull", mode: "full" },
		{ id: "nightWest", mode: "west" },
		{ id: "nightEast", mode: "east" },
	];
	// "zoom" hanya boleh jadi masukan interpolate/step tingkat teratas, jadi state
	// global ada di NILAI keluarannya: sepenuhnya terlihat sampai zoom 3.7, memudar
	// ke 0 di zoom 4.3.
	const nightOpacityExpr = (i: number) =>
		[
			"interpolate",
			["linear"],
			["zoom"],
			3.7,
			["coalesce", ["at", i, ["array", "number", 3, ["global-state", "night"]]], 0],
			4.3,
			0,
		] as unknown as number;

	/**
	 * Esri menyajikan ubin citra yang SAMA dari dua host. Servernya hanya HTTP/1.1, jadi peramban membuka paling
	 * banyak 6 koneksi per host — `setMaxParallelImageRequests(32)` pun tetap antre di 6 jalur itu, dan pramuat
	 * ikut berebut. Dua host = 12 unduhan bersamaan: wilayah yang baru di-zoom/digeser terisi ±2× lebih cepat.
	 */
	const ESRI_TILES = ["server", "services"].map(
		(h) => `https://${h}.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}`,
	);
	/** Tingkat ubin 256 px yang diminta MapLibre pada zoom peta ini. Sumber raster MEMBULATKAN (roundZoom), bukan
	    membulatkan ke bawah: zoom 9,5 memakai ubin z11. Dulu pramuat memakai floor(zoom) + 1 → separuh waktu
	    (zoom pecahan ≥ 0,5) yang diunduh lebih dulu justru tingkat di bawah yang ditampilkan. */
	const tileLevel = (zoom: number) => Math.round(zoom + 1);
	/** URL ubin PERSIS seperti yang diminta MapLibre (host dipilih `(x + y) % jumlah host`), supaya ubin hasil
	    pramuat benar-benar terpakai dari cache HTTP. */
	const TILE_URL = (z: number, x: number, y: number) =>
		ESRI_TILES[(x + y) % ESRI_TILES.length]!.replace("{z}", String(z))
			.replace("{y}", String(y))
			.replace("{x}", String(x));

	function preloadTiles(
		bounds: [[number, number], [number, number]],
		zoom: number,
		buffer = 2,
	): HTMLImageElement[] {
		const n = Math.pow(2, zoom);
		const latToY = (lat: number) => {
			const r = (lat * Math.PI) / 180;
			return ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * n;
		};
		const lngToX = (lng: number) => ((lng + 180) / 360) * n;
		const s = Math.min(bounds[0][0], bounds[1][0]);
		const nn = Math.max(bounds[0][0], bounds[1][0]);
		const w = Math.min(bounds[0][1], bounds[1][1]);
		const e = Math.max(bounds[0][1], bounds[1][1]);
		const x0 = Math.floor(lngToX(w)) - buffer;
		const x1 = Math.floor(lngToX(e)) + buffer;
		const y0 = Math.floor(latToY(nn)) - buffer;
		const y1 = Math.floor(latToY(s)) + buffer;
		const imgs: HTMLImageElement[] = [];
		for (let x = x0; x <= x1; x++) {
			for (let y = y0; y <= y1; y++) {
				if (x < 0 || y < 0 || x >= n || y >= n) continue;
				const img = new Image();
				img.src = TILE_URL(zoom, x, y);
				imgs.push(img);
			}
		}
		return imgs;
	}

	const SCRAMBLE_GLYPHS = "!#%^*?/\\<>_-=+$&";

	/**
	 * Teks "mengetik" dengan satu huruf acak di ujungnya — huruf yang sudah
	 * pasti muncul dari kiri, huruf berikutnya masih berkedip acak sampai
	 * gilirannya (PA^OR → PANORA → PANORAMA). Teks asli disimpan di
	 * data-text supaya pemanggilan ulang tidak mengacak hasil acakan.
	 */
	function scrambleIn(el: HTMLElement, delay: number, duration = 0.7) {
		const text = (el.dataset.text ??= el.textContent ?? "");
		if (!text || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
			el.textContent = text;
			return;
		}
		el.textContent = "";
		const start = performance.now() + delay * 1000;
		const tick = (now: number) => {
			if (!el.isConnected) return;
			const p = (now - start) / (duration * 1000);
			if (p < 0) {
				requestAnimationFrame(tick);
				return;
			}
			if (p >= 1) {
				el.textContent = text;
				return;
			}
			const shown = Math.floor(p * text.length);
			const glyph = SCRAMBLE_GLYPHS[Math.floor(Math.random() * SCRAMBLE_GLYPHS.length)];
			el.textContent = text.slice(0, shown) + glyph;
			requestAnimationFrame(tick);
		};
		requestAnimationFrame(tick);
	}

	/**
	 * Kemunculan satu plate dengan bahasa kamera — fokus mengunci, rana
	 * membuka, lokasi berdenyut, lalu label mengetik:
	 *   1. bingkai sudut mulai 1.7× lalu MENGUNCI ke ukuran plate;
	 *   2. foto terbuka dari garis tengah ke atas-bawah (seperti rana) dengan
	 *      kilat terang sesaat;
	 *   3. cincin safelight melebar dari titiknya lalu padam;
	 *   4. nama & nomor mengetik (scrambleIn).
	 */
	function revealMarker(mk: HTMLElement, delay: number) {
		const reducedNow = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
		const labels = mk.querySelectorAll<HTMLElement>(".im-mk-name, .im-mk-num, .im-mk-count");
		if (reducedNow) {
			gsap.set(mk, { opacity: 1, scale: 1 });
			labels.forEach((el) => scrambleIn(el, 0));
			return;
		}
		const br = mk.querySelector<SVGElement>(".im-mk-br");
		const img = mk.querySelector<HTMLElement>(".im-mk-plate-img");
		const glyph = mk.querySelector<HTMLElement>(".im-mk-plate-glyph");

		const ping = document.createElement("span");
		ping.className = "im-mk-ping";
		ping.setAttribute("aria-hidden", "true");
		mk.appendChild(ping);

		const tl = gsap.timeline({ delay, onComplete: () => ping.remove() });
		tl.fromTo(mk, { opacity: 0, scale: 1 }, { opacity: 1, duration: 0.18, ease: "none" }, 0);
		if (br) {
			tl.fromTo(
				br,
				{ scale: 1.7, opacity: 0, transformOrigin: "50% 50%" },
				{ scale: 1, opacity: 1, duration: 0.5, ease: "expo.out" },
				0,
			);
		}
		if (img) {
			// Transisi CSS pada filter akan melawan tween; dimatikan sementara
			// lalu dikembalikan ke nilai stylesheet.
			tl.set(img, { transition: "none" }, 0);
			tl.fromTo(
				img,
				{ clipPath: "inset(50% 0% 50% 0%)", filter: "brightness(2.4) saturate(0.4)" },
				{ clipPath: "inset(0% 0% 0% 0%)", duration: 0.45, ease: "power3.inOut" },
				0.14,
			);
			tl.to(img, { filter: "brightness(1) saturate(0.85)", duration: 0.55, ease: "power2.out" }, 0.4);
			tl.set(img, { clearProps: "transition,filter,clipPath" });
		}
		if (glyph) tl.fromTo(glyph, { opacity: 0 }, { opacity: 1, duration: 0.25, ease: "power1.out" }, 0.45);
		tl.fromTo(
			ping,
			{ scale: 0.4, opacity: 0.9 },
			{ scale: 2.6, opacity: 0, duration: 0.9, ease: "power2.out" },
			0.12,
		);
		labels.forEach((el, k) => scrambleIn(el, delay + 0.5 + k * 0.12));
	}

	const lang = $derived(i18n.lang);
	const t = $derived(copy[lang]);

	let sectionEl = $state<HTMLElement>();
	let wrapEl = $state<HTMLDivElement>();
	let mapEl = $state<HTMLDivElement>();
	let stageEl = $state<HTMLDivElement>();
	let dvStage = $state<HTMLDivElement>();
	let dvImgWrap = $state<HTMLDivElement>();
	let dvStrip = $state<HTMLDivElement>();
	let dvCloseEl = $state<HTMLButtonElement>();
	let dvRoot = $state<HTMLDivElement>();
	let hdLoaded = $state("");

	let ready = $state(false);
	let reduced = $state(false);
	let focus = $state(0);
	let dragged = $state(false);
	// Sentuh: peta TIDAK langsung bisa digeser. Kalau bisa, seluruh layar jadi
	// area geser peta dan halaman tak bisa digulir sama sekali — pengguna
	// terjebak di section ini. Ketukan (penanda) tetap jalan; geser dinyalakan
	// lewat tombol.
	let touchDevice = $state(false);
	let panOn = $state(false);
	let viewing = $state<number | null>(null);
	let frame = $state(0);
	let hotspots = $state<Hotspot[]>([]);
	let zoomed = $state(false);

	let focusRef = 0;
	let viewingRef: number | null = null;
	let frameRef = 0;
	let map: import("maplibre-gl").Map | null = null;
	let markers: import("maplibre-gl").Marker[] = [];
	let markerOn: boolean[] = [];
	let clusterMarkers: import("maplibre-gl").Marker[] = [];
	// Mode tanam: "hero" = kamera globe menunggu; "landed" = peta interaktif.
	// Nilai sebenarnya dipasang saat peta dibuat (bergantung prop `bare`).
	let phase: "hero" | "diving" | "landed" | "rising" = "hero";
	let heroLat = HERO_LAT_FROM;
	let heroLift = 0;
	let rollOn = true;
	let rollT = 0;
	// Posisi kursor ternormalisasi (−0.5..0.5): target dan nilai yang dihaluskan.
	let ptrAimX = 0;
	let ptrAimY = 0;
	let ptrX = 0;
	let ptrY = 0;
	let reclusterRef: (() => void) | null = null;
	let preloads: HTMLImageElement[] = [];
	let shotOffset = shotOffsets([]);
	let panX: ((v: number) => void) | null = null;
	let panY: ((v: number) => void) | null = null;

	$effect(() => {
		if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) reduced = true;
		// Bunyi rana dimuat lebih dulu supaya klik pertama langsung berbunyi.
		primeShutter();
	});

	$effect(() => {
		let alive = true;
		(async () => {
			try {
				const hs = await fetchMapHotspots();
				if (!alive) return;
				hotspots = hs.length ? hs : FALLBACK_HOTSPOTS;
			} catch {
				if (alive) hotspots = FALLBACK_HOTSPOTS;
			}
		})();
		return () => { alive = false; };
	});

	$effect(() => {
		shotOffset = shotOffsets(hotspots);
	});

	$effect(() => {
		if (!hotspots.length) return;
		let disposed = false;
		let m: import("maplibre-gl").Map | null = null;
		let ro: ResizeObserver | null = null;
		let raf = 0;
		/** Loop globe hero sedang "tidur jarang": menunggu jadwal gambar berikutnya lewat timer, bukan rAF tiap frame. */
		let rollTimer = 0;
		let sparseTick = false;
		let nearIo: IntersectionObserver | null = null;
		let visIo: IntersectionObserver | null = null;
		ready = false;
		(async () => {
			// Peta (±800 KB JS, WebGL, ubin satelit, pramuat ubin) baru dibuat saat
			// bagiannya mendekat (±3 layar lagi), BUKAN saat halaman dibuka — globe
			// ada jauh di bawah hero, dan memuatnya di awal berebut CPU/GPU/jaringan
			// dengan video hero dan scroll pertama.
			await new Promise<void>((res) => {
				const el = sectionEl;
				if (!el || typeof IntersectionObserver === "undefined") return res();
				// Tata letak halaman masih bergeser saat konten awal dimuat (bagian ini bisa
				// sesaat berada di posisi 2.000 lalu pindah ke 6.600): hanya dianggap
				// "dekat" bila TETAP dalam jangkauan selama 0,6 dtk.
				let settle = 0;
				nearIo = new IntersectionObserver(
					(es) => {
						clearTimeout(settle);
						if (!es.at(-1)?.isIntersecting) return;
						settle = window.setTimeout(() => {
							nearIo?.disconnect();
							res();
						}, 600);
					},
					{ rootMargin: "300% 0px" },
				);
				nearIo.observe(el);
				// Atau lebih awal: pengunjung diam di bagian atas (tak menggulir ≥1,5 dtk, ≥3 dtk setelah halaman
				// siap) → peta dibuat di waktu senggang itu, bukan di tengah guliran menuju globe.
				const t0 = performance.now();
				const idlePoll = window.setInterval(() => {
					if (disposed) return window.clearInterval(idlePoll);
					if (performance.now() - t0 < 3000 || document.hidden || sinceScroll() < 1500) return;
					window.clearInterval(idlePoll);
					nearIo?.disconnect();
					res();
				}, 500);
			});
			if (disposed) return;
			const mlLoad = import("maplibre-gl");
			// Pembuatan peta (konteks WebGL + gaya + worker, puluhan ms di thread utama) ditunda sampai gulir
			// tenang sejenak — maks 0,8 dtk supaya globe tak terlambat siap.
			await new Promise<void>((res) => {
				const start = performance.now();
				const check = () => {
					if (disposed || sinceScroll() >= 250 || performance.now() - start > 800) return res();
					window.setTimeout(check, 80);
				};
				check();
			});
			const ml = await mlLoad;
			// MapLibre 6 mencari worker lewat nama berkas dinamis — bundler tak
			// bisa mengikutkannya, jadi di build produksi peta gagal ("Worker
			// failed to load"). Worker diimpor eksplisit lewat ?worker&url (Vite
			// membundel beserta dependensinya), berlaku di dev & produksi.
			ml.setWorkerUrl(mlWorkerUrl);
			// Peta digeser/di-zoom cepat meminta puluhan ubin sekaligus; antrean 16 (bawaan) membuat wilayah baru lama
			// terisi, dan selama itu tampil ubin induk beda-zoom (warna laut Esri berbeda antar zoom → petak persegi).
			ml.setMaxParallelImageRequests(32);
			// Ubin siang-malam (lampu kota di sisi gelap globe) — lihat $lib/nightTiles.
			try {
				ml.addProtocol("night", nightTile);
			} catch {
				// Sudah terdaftar (remount): abaikan.
			}
			const el = mapEl;
			if (disposed || !el) return;
			const coarse = window.matchMedia("(pointer: coarse)").matches;
			touchDevice = coarse;
			panOn = !coarse;
			if (liteBySpec()) enterLite();

			const mm = new ml.Map({
				container: el,
				// Resolusi render globe dibatasi: di layar retina (DPR 2) globe layar penuh dirender 4× piksel
				// (2880×1800), padahal citra satelit/ubin malamnya tak mendapat apa-apa dari itu; 1,5× memangkas
				// piksel ±44% dan tetap tajam. Marker/HUD adalah DOM, tak terpengaruh.
				pixelRatio: (restPR = lite ? 1 : Math.min(window.devicePixelRatio || 1, MAP_MAX_DPR)),
				// Ubin yang pernah dimuat disimpan lebih lama (bawaan 5 tingkat zoom): menggeser kembali ke wilayah yang
				// baru dilihat tak mengunduh ulang, dan ubin induk untuk zoom-out tetap tersedia.
				maxTileCacheZoomLevels: 8,
				// Peta ini tanpa label simbol, tapi fade simbol bawaan (300 ms) tetap membuat MapLibre menggambar ulang
				// SETIAP frame selama 300 ms sesudah tiap perubahan zoom. Gelinding globe hero mengubah zoom sedikit
				// tiap langkah → globe dirender ±53×/dtk tanpa henti (trace: GPU ±45% saat diam). Fade ubin raster
				// diatur terpisah lewat `raster-fade-duration`, tak terpengaruh.
				fadeDuration: 0,
				style: {
					version: 8,
					projection: { type: "globe" },
					// Kekuatan overlay malam [penuh, barat, timur] (diatur lewat setNightMix); 0 = siang.
					state: {
						night: { default: [0, 0, 0] },
					},
					sources: {
						esri: {
							type: "raster",
							tiles: ESRI_TILES,
							// 256 = ukuran asli ubin Esri. Pernah dicoba 128 (minta satu
							// level lebih tinggi supaya lebih tajam), tapi ubin jadi ±4×
							// lebih banyak: sebagian telat/gagal dimuat dan MapLibre
							// menambalnya dengan ubin level di bawahnya — warnanya beda,
							// jadi peta BELANG berupa pita tegak, dan tudung kutub tak lagi
							// cocok dengan sekitarnya.
							tileSize: 256,
							maxzoom: 16,
							attribution: "",
						},
						// Cadangan beresolusi rendah: sumber yang sama tapi berhenti di zoom 3 (MapLibre meregangkan ubinnya
						// di zoom lebih tinggi). Hanya segelintir ubin besar, jadi cepat tiba; tampil di bawah lapisan utama
						// sehingga wilayah yang ubin tajamnya belum datang (peta digeser/di-zoom cepat) kasar, bukan hitam.
						esriBase: {
							type: "raster",
							tiles: ESRI_TILES,
							tileSize: 256,
							maxzoom: 3,
							attribution: "",
						},
						// Cadangan tajam khusus Nusantara: ubin sampai zoom 7 (diregang paling banyak 2× pada zoom peta biasa),
						// dibatasi wilayah Indonesia. Ubinnya diunduh lebih dulu sekali setelah mendarat (warmRegion), jadi saat
						// peta dilempar jauh, area baru langsung tampil agak lembut alih-alih blok cat dari ubin zoom 3.
						esriNear: {
							type: "raster",
							tiles: ESRI_TILES,
							tileSize: 256,
							maxzoom: NEAR_MAXZOOM,
							bounds: NEAR_BOUNDS,
							attribution: "",
						},
						// ── Zoom dalam (peta ≥ 7): tiga sumber terpisah dari `esri` ────────────────────────────────
						// Laut di citra Esri makin GELAP tiap tingkat zoom (Laut Jawa: z6 rgb 49,102,100 → z8 27,65,80 →
						// z10 15,36,50). Ubin yang belum tiba ditambal MapLibre dengan induk termuat terdekat dari sumber
						// yang sama — sering z5/z6 dari bingkai Nusantara: terang & buram → petak kotak di laut saat peta
						// digeser. Di zoom dalam: esriHi (HD, induk paling rendah z8) di atas dua penambal yang warnanya
						// hampir sama. URUTAN DEKLARASI PENTING: MapLibre meminta ubin per sumber sesuai urutan ini, jadi
						// penambal (sedikit ubin) masuk antrean jaringan SEBELUM ±35 ubin HD — tiba lebih dulu.
						//
						// Penambal terakhir sebelum cadangan terang: DUA tingkat di bawah (ubin digambar 1024 px). 16× lebih
						// sedikit ubin dan tiap ubin jauh melewati tepi layar, jadi saat peta dilempar hampir selalu sudah ada.
						esriLo: {
							type: "raster",
							tiles: ESRI_TILES,
							tileSize: 1024,
							minzoom: HI_MIN_TILE,
							maxzoom: 14,
							attribution: "",
						},
						// SATU tingkat di bawah yang tampil (ubin 256 px digambar 512 px): warnanya hampir sama dengan HD.
						esriMid: {
							type: "raster",
							tiles: ESRI_TILES,
							tileSize: 512,
							minzoom: HI_MIN_TILE,
							maxzoom: 15,
							attribution: "",
						},
						esriHi: {
							type: "raster",
							tiles: ESRI_TILES,
							tileSize: 256,
							minzoom: HI_MIN_TILE,
							maxzoom: 16,
							attribution: "",
						},
						// Overlay malam (lampu kota NASA) — tiga mode statis, lihat $lib/nightTiles.
						nightFull: {
							type: "raster",
							tiles: [nightTileUrl("full")],
							// Overlay lampu/bayangan halus: ubin 512 px pada zoom 3 (jauh lebih
							// sedikit ubin daripada 256 px pada zoom 4).
							tileSize: 512,
							maxzoom: 3,
							attribution: "",
						},
						nightWest: {
							type: "raster",
							tiles: [nightTileUrl("west")],
							// Overlay lampu/bayangan halus: ubin 512 px pada zoom 3 (jauh lebih
							// sedikit ubin daripada 256 px pada zoom 4).
							tileSize: 512,
							maxzoom: 3,
							attribution: "",
						},
						nightEast: {
							type: "raster",
							tiles: [nightTileUrl("east")],
							// Overlay lampu/bayangan halus: ubin 512 px pada zoom 3 (jauh lebih
							// sedikit ubin daripada 256 px pada zoom 4).
							tileSize: 512,
							maxzoom: 3,
							attribution: "",
						},
					},
					layers: [
						{
							id: "esri-base",
							type: "raster",
							source: "esriBase",
							// Tanpa fade: begitu ubin dasar tiba langsung menutup lubang hitam.
							paint: {
								"raster-fade-duration": 0,
								"raster-contrast": ["interpolate", ["linear"], ["zoom"], 2, 0.28, 3.6, 0.2, 4.2, 0],
								"raster-saturation": ["interpolate", ["linear"], ["zoom"], 2, 0.15, 3.6, 0.1, 4.2, 0],
							},
						},
						{
							id: "esri-near",
							type: "raster",
							source: "esriNear",
							// Hanya saat tingkat ubin utama melampaui z7 (zoom peta ≥ 6,5). Di bawah itu esriNear meminta ubin
							// yang PERSIS sama dengan `esri` — dulu bingkai Nusantara & tiap geseran menggambar ±50 ubin dua
							// kali (312 → 211 draw call per frame tanpanya), tanpa manfaat apa pun sebagai cadangan.
							minzoom: 6.5,
							paint: { "raster-fade-duration": 0 },
						},
						{
							id: "esri-lo",
							type: "raster",
							source: "esriLo",
							minzoom: HI_MIN_ZOOM,
							paint: { "raster-fade-duration": 0 },
						},
						{
							id: "esri-mid",
							type: "raster",
							source: "esriMid",
							minzoom: HI_MIN_ZOOM,
							paint: { "raster-fade-duration": 0 },
						},
						{
							id: "esri",
							type: "raster",
							source: "esri",
							// Zoom dalam diambil alih esri-hi (tumpang tindih ½ tingkat supaya pergantian tak berkedip).
							maxzoom: HI_MIN_ZOOM + 0.5,
							// Transisi antar-level lebih cepat: ubin tajam cepat menggantikan
							// ubin kasar yang sementara ditampilkan.
							paint: {
								// Ubin tajam menggantikan ubin kasar/induk lewat crossfade ±0,4 dtk, bukan tepi keras: warna laut
								// Esri berbeda antar tingkat zoom, jadi pergantian tiba-tiba terlihat sebagai petak persegi.
								"raster-fade-duration": 400,
								// Di kamera globe (zoom rendah) citra dekat kutub diregang
								// Mercator dan tampak rata; kontras + saturasi menonjolkan
								// tekstur yang ada. Memudar ke 0 sebelum bingkai Nusantara
								// (zoom ±4.4), jadi warna peta mendarat tak berubah.
								"raster-contrast": ["interpolate", ["linear"], ["zoom"], 2, 0.28, 3.6, 0.2, 4.2, 0],
								"raster-saturation": ["interpolate", ["linear"], ["zoom"], 2, 0.15, 3.6, 0.1, 4.2, 0],
							},
						},
						{
							id: "esri-hi",
							type: "raster",
							source: "esriHi",
							minzoom: HI_MIN_ZOOM,
							paint: { "raster-fade-duration": 400 },
						},
						...NIGHT_MODES.map((m, i) => ({
							id: m.id,
							type: "raster" as const,
							source: m.id,
							// Tersembunyi (tak memuat ubin) sampai hero pertama kali terlihat.
							layout: { visibility: "none" as const },
							maxzoom: 4.4,
							paint: {
								// Ubin malam yang tiba belakangan (kamera bergulir) muncul memudar pelan, bukan "menyala" mendadak.
								"raster-fade-duration": 700,
								"raster-opacity": nightOpacityExpr(i),
								// Tanpa transisi bawaan (300 ms): opasitas sudah diperbarui sedikit demi sedikit tiap 100 ms oleh
								// siklus siang–malam. Dengan transisi, tiap pembaruan memulai transisi baru yang tak pernah
								// selesai → MapLibre menggambar ulang globe 60×/dtk terus-menerus (±40% CPU saat diam).
								"raster-opacity-transition": { duration: 0, delay: 0 },
							},
						})),
					],
					// Halo atmosfer di tepi bumi saat jauh; hilang begitu mendekat.
					sky: {
						"atmosphere-blend": ["interpolate", ["linear"], ["zoom"], 0, 1, 4, 0.9, 6, 0],
					},
				},
				center: [HERO_LNG, HERO_LAT_FROM],
				zoom: 3,
			// Kontrol atribusi bawaan disembunyikan.
			attributionControl: false,
				renderWorldCopies: false,
				maxZoom: 15,
				// Interaksi dinyalakan per fase (lihat setInteractiveRef).
				// cooperativeGestures: scroll halaman tidak terbajak — zoom
				// roda-tetikus butuh Ctrl (overlay bawaan yang mengajari),
				// cubit dua jari di sentuh tetap langsung bisa.
				cooperativeGestures: true,
				scrollZoom: false,
				boxZoom: false,
				dragRotate: false,
				pitchWithRotate: false,
				keyboard: false,
				doubleClickZoom: false,
				dragPan: false,
				touchZoomRotate: false,
				touchPitch: false,
			});
			m = mm;
			if (!lite && gpuClass(mm) !== "ok") enterLite(mm);
			phase = bare ? "hero" : "landed";
			// Kutub bercitra asli (lihat $lib/polarCaps): menutup celah di atas
			// ±85° tempat citra dunia berhenti, jadi bumi bisa dijelajahi utuh.
			mm.on("load", () => {
				// Satu tingkat zoom ubin untuk seluruh layar. Di proyeksi globe MapLibre menurunkan zoom ubin ke arah tepi
				// layar (z8 di tengah, z7/z6 di sisi), padahal warna laut citra Esri berbeda drastis antar zoom → pita tegak
				// berbeda warna di laut, juga setelah semua ubin termuat. Tanpa pengaruh di kamera hero (jumlah ubin sama).
				try {
					mm.setSourceTileLodParams(1, 1, "esri");
					mm.setSourceTileLodParams(1, 1, "esriBase");
					mm.setSourceTileLodParams(1, 1, "esriNear");
					mm.setSourceTileLodParams(1, 1, "esriHi");
					mm.setSourceTileLodParams(1, 1, "esriMid");
					mm.setSourceTileLodParams(1, 1, "esriLo");
				} catch (e) {
					if (import.meta.env.DEV) console.warn("[tile-lod]", e);
				}
				try {
					mm.addLayer(polarCapsLayer());
				} catch (e) {
					if (import.meta.env.DEV) console.warn("[polar-caps]", e);
				}
			});
			// Lensa preloader menunggu ubin tampilan awal selesai (tak ada
			// peta hitam). Idle pertama = render awal + ubinnya termuat.
			{
				const release = holdReady("map");
				let settled = false;
				const done = () => {
					if (settled) return;
					settled = true;
					release();
				};
				mm.once("idle", done);
				// Pengaman: bila idle tak datang (WebGL mati/ubin diblokir),
				// jangan mengunci lensa — batas keras preloader tetap berlaku.
				window.setTimeout(done, 9000);
			}

			// Proyeksi globe baru terpasang saat style selesai dimuat (±1 frame setelah peta dibuat); sebelum itu
			// transform masih Mercator. Kamera ringkasan yang dihitung terlalu awal ikut Mercator — zoom 4,31, bukan
			// 4,51 (1440×900). Itu yang terjadi saat Back langsung ke peta mendarat: bingkainya lebih jauh daripada
			// pendaratan biasa, batas zoom-out ikut turun, dan titik dikelompokkan di posisi yang keliru (label
			// bertabrakan). Jadi semua kamera dihitung setelah style dimuat.
			if (!mm.getProjection()) await new Promise<void>((res) => mm.once("style.load", () => res()));
			if (disposed) return;

			const [[latS, lngW], [latN, lngE]] = NUSANTARA;
			/** cameraForBounds dengan padding bingkai `padding`, tanpa terpengaruh padding kamera yang aktif. */
			const fitCamera = (b: [[number, number], [number, number]], padding: ReturnType<typeof overviewFit>) => {
				// cameraForBounds ikut menghitung padding kamera yang AKTIF. Di
				// kamera hero padding atasnya lebih besar dari layar (pusat bumi di
				// bawah layar), jadi sisa ruangnya negatif dan hitungannya gagal.
				// Nol-kan sebentar, hitung, kembalikan — sinkron, tak ada frame
				// yang tergambar di antaranya.
				const prevPad = mm.getPadding();
				const padded = prevPad.top || prevPad.bottom || prevPad.left || prevPad.right;
				if (padded) mm.setPadding(NO_PAD);
				const cam = mm.cameraForBounds(b, { padding });
				if (padded) mm.setPadding(prevPad);
				return cam ? { center: cam.center as import("maplibre-gl").LngLatLike, zoom: cam.zoom ?? 4 } : null;
			};
			/** Zoom yang memaskan SELURUH Nusantara (Sabang–Merauke) ke layar — dasar batas zoom-out peta. */
			const nusantaraZoom = () => fitCamera([[lngW, latS], [lngE, latN]], overviewFit(el))?.zoom ?? 4;

			const overviewCamera = () => {
				const pad = overviewFit(el);
				const full = fitCamera([[lngW, latS], [lngE, latN]], pad);
				const cam = { center: full?.center ?? ([118, -2.4] as [number, number]), zoom: full?.zoom ?? 4 };
				// Layar tegak sempit (ponsel): Sabang–Merauke selebar layar = zoom ±2,5 — bumi nyaris utuh, pendaratan
				// hampir tak mendekat dari globe, dan semua titik tergabung jadi satu plate yang tak bisa diurai. Di
				// sana bingkai mengikuti TINGGI: lintang Nusantara mengisi ±¾ ruang (zoom ±3,6 di 390×844), berpusat
				// di titik-titik koleksi; Sabang/Merauke dijangkau dengan geser atau perkecil.
				const tall = fitCamera([[117.99, latS], [118.01, latN]], pad);
				if (full && tall && tall.zoom - full.zoom >= 0.5) {
					let zoom = tall.zoom - 0.4;
					let lng = (lngW + lngE) / 2;
					if (hotspots.length) {
						const lngs = hotspots.map((h) => h.lng);
						const lo = Math.min(...lngs) - 1.5;
						const hi = Math.max(...lngs) + 1.5;
						zoom = Math.min(zoom, fitCamera([[lo, latS], [hi, latN]], pad)?.zoom ?? zoom);
						lng = (lo + hi) / 2;
					}
					zoom = Math.max(full.zoom, zoom);
					// Lebar bingkai pada zoom itu, dalam derajat; tepinya tak melewati Sabang / Merauke.
					const span = Math.min(lngE - lngW, ((el.clientWidth - pad.left - pad.right) * 360) / (512 * 2 ** zoom));
					lng = Math.min(lngE - span / 2, Math.max(lngW + span / 2, lng));
					const narrow = fitCamera([[lng - span / 2, latS], [lng + span / 2, latN]], pad);
					if (narrow) Object.assign(cam, narrow);
				}
				return { ...cam, bearing: 0, pitch: 0, padding: NO_PAD };
			};

			if (bare && !pendingLanded) mm.jumpTo(heroCamera(el, heroLat, heroLift));
			else {
				mm.jumpTo(overviewCamera());
				phase = "landed";
			}

			// Batas zoom-out peta: hanya ±0,3 tingkat di luar bingkai Nusantara (tepi bumi baru mulai tampak,
			// bukan globe utuh). Relatif terhadap tampilan ringkasan supaya sama di semua ukuran layar.
			// Hanya berlaku di fase peta: kamera hero (globe di landing) dan selam/naik memakai zoom yang di
			// layar kecil bisa lebih rendah, jadi tak boleh ikut terjepit.
			// Dasarnya zoom yang benar-benar dipakai saat mendarat (dicatat sekali), BUKAN overviewCamera() yang
			// dihitung ulang: hasilnya bisa berbeda dari kamera pendaratan (panel judul memengaruhi bingkai) dan
			// batasnya jadi lebih tinggi dari zoom peta. Dikosongkan saat keluar dari fase peta.
			// Di ponsel pendaratan lebih dekat dari bingkai penuh (lihat overviewCamera): batasnya dari bingkai penuh,
			// supaya Sabang–Merauke tetap bisa dilihat utuh dengan memperkecil.
			let zoomBase = 0;
			const landedMinZoom = () => {
				if (!zoomBase) zoomBase = Math.min(mm.getZoom(), nusantaraZoom());
				return Math.max(0, zoomBase - LANDED_ZOOM_OUT);
			};

			setInteractiveRef = (on: boolean) => {
				if (!on) zoomBase = 0;
				mm.setMinZoom(on ? landedMinZoom() : 0);
				// Desktop: mengikuti tombol geser (panOn). Layar sentuh: cubit dan
				// geser DUA jari menyala begitu mendarat, tanpa menekan tombol —
				// cooperativeGestures menjaga satu jari tetap menggulir halaman,
				// jadi pengguna tak terjebak di section ini.
				const pan = on && (panOn || touchDevice);
				if (pan) {
					// Mode geser peta: semua gestur zoom yang mulus menyala —
					// cubit dua jari, Ctrl+roda (tak membajak scroll), seret.
					// Di luar mode ini peta terkunci penuh: scroll apapun
					// milik halaman, bukan peta.
					mm.dragPan.enable();
					mm.touchZoomRotate.enable();
					mm.touchZoomRotate.disableRotation();
					mm.scrollZoom.enable();
				} else {
					mm.dragPan.disable();
					mm.touchZoomRotate.disable();
					mm.scrollZoom.disable();
				}
				if (on) {
					mm.doubleClickZoom.enable();
					mm.keyboard.enable();
				} else {
					mm.doubleClickZoom.disable();
					mm.keyboard.disable();
				}
			};
			setInteractiveRef(phase === "landed");

			// Safari (Mac) mengirim cubit trackpad sebagai event `gesture*` khusus
			// WebKit, bukan roda+Ctrl seperti Chrome/Edge/Firefox — MapLibre tak
			// menanganinya, jadi cubit memperbesar HALAMAN, bukan peta. Terjemahkan
			// di sini: skala cubit → zoom peta di sekitar kursor. Hanya di perangkat
			// penunjuk halus (touch memakai penangan sentuh MapLibre) dan hanya saat
			// peta sudah mendarat dan geser menyala.
			const gestureOn = () => phase === "landed" && panOn && !touchDevice;
			let gestureZoom0 = 0;
			const onGestureStart = (e: Event) => {
				if (!gestureOn()) return;
				e.preventDefault();
				gestureZoom0 = mm.getZoom();
			};
			const onGestureChange = (e: Event) => {
				if (!gestureOn()) return;
				e.preventDefault();
				const g = e as Event & { scale: number; clientX: number; clientY: number };
				if (!(g.scale > 0)) return;
				const r = el.getBoundingClientRect();
				const z = Math.min(15, Math.max(1, gestureZoom0 + Math.log2(g.scale)));
				mm.easeTo({ zoom: z, duration: 0, around: mm.unproject([g.clientX - r.left, g.clientY - r.top]) });
			};
			const onGestureEnd = (e: Event) => {
				if (gestureOn()) e.preventDefault();
			};
			if ("GestureEvent" in window) {
				el.addEventListener("gesturestart", onGestureStart, { passive: false });
				el.addEventListener("gesturechange", onGestureChange, { passive: false });
				el.addEventListener("gestureend", onGestureEnd, { passive: false });
				gestureCleanup = () => {
					el.removeEventListener("gesturestart", onGestureStart);
					el.removeEventListener("gesturechange", onGestureChange);
					el.removeEventListener("gestureend", onGestureEnd);
				};
			}

			// ── Kamera hero: gelinding bawah → atas yang melambat ────────────
			let last = performance.now();
			// Globe hanya digambar ulang tiap frame bila bagian peta dekat layar. Dulu loop ini memanggil
			// mm.jumpTo SETIAP frame sejak peta dibuat — globe layar penuh terus dirender saat pengunjung
			// melihat hero video, contact sheet, atau footer, dan itu sumber utama gulir berat di landing
			// (uji A/B: tanpa kanvas peta median frame 33 → 17 ms, frame >50 ms 42 → 5).
			let onScreen = true;
			if (sectionEl && typeof IntersectionObserver !== "undefined") {
				visIo = new IntersectionObserver(
					(es) => {
						onScreen = !!es.at(-1)?.isIntersecting;
						if (onScreen) startRoll();
					},
					{ rootMargin: "40% 0px" },
				);
				visIo.observe(sectionEl);
			}
			let lastJump = 0;
			let lastCamSig = "";
			let stillFrames = 0;
			// Loop globe hero BERHENTI TOTAL di luar fase hero / di luar layar / tab tersembunyi (dulu tetap
			// berdetak 60×/dtk dan hanya keluar lebih awal — browser tetap menyiapkan frame terus, CPU & GPU
			// tak pernah istirahat). Dinyalakan lagi oleh: section terlihat, tab kembali, naik kembali ke hero.
			let nightAppliedAt = 0;
			let frameEma = 16.7;
			let slowSince = 0;
			// Frame globe lambat terus (>28 ms rata-rata selama 1,5 dtk, di hero atau saat menyelam) = perangkat
			// kewalahan → mode hemat.
			const watchFrames = (now: number, gap: number) => {
				if (lite) return;
				frameEma = frameEma * 0.92 + Math.min(100, gap) * 0.08;
				if (frameEma <= 28) slowSince = 0;
				else if (!slowSince) slowSince = now;
				else if (now - slowSince > 1500) enterLite(mm);
			};
			startRoll = (soft = false) => {
				if (disposed || !bare) return;
				// Sedang tidur jarang → bangun ke rAF SEKARANG: kursor / lift ditanggapi di frame berikutnya, sama seperti
				// dulu. `last` tidak direset — jeda tidur tetap terhitung di jam gelinding (tick ini ber-dt panjang).
				// `soft` (sisi malam baru): tak perlu bangun — sisi malam memang hanya diterapkan di tick terjadwal.
				if (rollTimer) {
					if (soft) return;
					window.clearTimeout(rollTimer);
					rollTimer = 0;
					sparseTick = true;
					raf = requestAnimationFrame(roll);
					return;
				}
				if (raf) return;
				stillFrames = 0;
				frameEma = 16.7;
				slowSince = 0;
				last = performance.now();
				raf = requestAnimationFrame(roll);
			};
			const onVisibility = () => {
				if (!document.hidden) startRoll();
			};
			document.addEventListener("visibilitychange", onVisibility);
			rollCleanup = () => document.removeEventListener("visibilitychange", onVisibility);
			const roll = (now: number) => {
				if (phase !== "hero" || document.hidden || !onScreen) {
					raf = 0;
					return;
				}
				raf = requestAnimationFrame(roll);
				// Tick sesudah tidur jarang: jaraknya dari tick sebelumnya = jadwal, bukan frame lambat → tak diumpankan
				// ke pengawas frame, dan batas dt dilonggarkan supaya jam gelinding tetap utuh.
				const afterSleep = sparseTick;
				sparseTick = false;
				if (!afterSleep) watchFrames(now, now - last);
				const dt = Math.min(afterSleep ? 0.25 : 0.1, (now - last) / 1000);
				last = now;
				if (rollOn && !reduced) {
					rollT += dt;
					heroLat = HERO_LAT_TO + (HERO_LAT_FROM - HERO_LAT_TO) * Math.exp(-rollT / HERO_ROLL_TAU);
				}
				// Bumi mengejar kursor dengan kelembaman — terasa berat, bukan
				// menempel.
				const k = 1 - Math.exp(-dt / PTR_TAU);
				ptrX += (ptrAimX - ptrX) * k;
				ptrY += (ptrAimY - ptrY) * k;
				// Gambar ulang globe hero ±30 fps hanya selagi bumi mengejar kursor. Gerak sendiri (gelinding yang
				// melambat, siklus siang–malam) cukup ±15 → ±10 fps: perubahannya kurang dari satu piksel per frame,
				// sedangkan tiap gambar ulang globe layar penuh mahal — ±6–11 ms kerja GPU bahkan di M4 (trace).
				const chasing = Math.abs(ptrAimX - ptrX) > 0.002 || Math.abs(ptrAimY - ptrY) > 0.002;
				const rollSpeed = ((HERO_LAT_FROM - HERO_LAT_TO) / HERO_ROLL_TAU) * Math.exp(-rollT / HERO_ROLL_TAU);
				const minGap = chasing
					? HERO_FRAME_MS * (lite ? 1.6 : 1)
					: rollOn && rollSpeed > 0.25
						? (lite ? HERO_AMBIENT_MS : HERO_ROLL_FRAME_MS)
						: HERO_AMBIENT_MS * (lite ? 1.5 : 1);
				// Tak mengejar kursor = antar-frame tak ada yang berubah selain jam → tidur sampai jadwal gambar
				// berikutnya (timer), bukan rAF tiap frame yang hanya keluar lebih awal. rAF tiap frame membuat thread
				// utama menyiapkan frame 60×/dtk walau globe diam (bersama tick Lenis & loop ScrollTrigger: 45–55%
				// satu inti CPU 4× lambat). Tempo gambar tak berubah — jadwalnya tetap lastJump + minGap.
				const sleepUntil = (at: number) => {
					cancelAnimationFrame(raf);
					raf = 0;
					rollTimer = window.setTimeout(
						() => {
							rollTimer = 0;
							sparseTick = true;
							raf = requestAnimationFrame(roll);
						},
						Math.max(0, at - now),
					);
				};
				if (now - lastJump < minGap) {
					if (!chasing) sleepUntil(lastJump + minGap);
					return;
				}
				// Gambar ulang HANYA bila kamera benar-benar bergeser atau sisi malam berubah. Gelinding sudah habis
				// & kursor diam → kamera tetap; dulu jumpTo tetap dipanggil 30×/dtk dan globe layar penuh dirender
				// ulang terus (±25% CPU saat diam). Beberapa frame tanpa perubahan → loop berhenti; kursor / lift /
				// siklus malam menyalakannya lagi.
				const cam = heroCamera(el, heroLat, heroLift);
				// Presisi 0,01° ≈ 0,17 px di globe hero: perubahan lebih kecil tak terlihat, jadi tak perlu dirender.
				const sig = `${cam.center[0].toFixed(2)}|${cam.center[1].toFixed(2)}|${cam.zoom.toFixed(3)}|${Math.round(cam.padding.top)}`;
				const nightDue = !!nightPending && now - nightAppliedAt >= NIGHT_STEP_MS;
				if (sig === lastCamSig && !nightDue) {
					// Kamera diam, sisi malam baru menunggu jedanya: tidur sampai jatuh tempo, bukan berputar per frame.
					if (nightPending && !chasing) {
						sleepUntil(nightAppliedAt + NIGHT_STEP_MS);
						return;
					}
					if (++stillFrames > 6) {
						cancelAnimationFrame(raf);
						raf = 0;
					}
					return;
				}
				stillFrames = 0;
				lastJump = now;
				// Sisi malam & kamera berubah di frame yang SAMA → tak ada gambar ulang tambahan.
				if (nightDue) {
					applyNight(mm);
					nightAppliedAt = now;
				}
				if (sig !== lastCamSig) {
					lastCamSig = sig;
					mm.jumpTo(cam);
				}
				if (!chasing) sleepUntil(now + minGap);
			};
			startRoll();

			diveRef = (ms: number) => {
				phase = "diving";
				mm.stop();
				setInteractiveRef?.(false);
				// Padding hero (pusat bumi di bawah layar) mengecil ke nol sambil
				// zoom naik: bumi TERBIT ke tengah layar dan membesar sampai
				// Nusantara mengisi bingkai — satu gerak kamera, satu kanvas.
				const cam = overviewCamera();
				if (ms <= 0) {
					mm.jumpTo(cam);
					phase = "landed";
					return;
				}
				// Membuka = KEBALIKAN WAKTU persis dari menutup (riseRef). easeTo
				// globe MapLibre mempercepat pusat kamera dengan faktor
				// k·base^(1−k): saat zoom MASUK base = 2, jadi pusat (putaran)
				// habis di awal dan sisanya terasa "langsung zoom"; saat zoom
				// KELUAR base = 0.5, kamera menjauh dulu lalu bumi berputar utuh —
				// yang terasa bagus. Maka gerak menutup direplikasi (rumus
				// handleEaseTo globe) dan diputar mundur.
				const hero = heroCamera(el, heroLat, heroLift);
				const O = ml.LngLat.convert(cam.center);
				const H = { lng: hero.center[0], lat: hero.center[1] };
				const toEq = (lat: number) => Math.log2(1 / Math.cos((lat * Math.PI) / 180));
				const zO = cam.zoom - toEq(O.lat); // zoom setara-khatulistiwa
				const zH = hero.zoom - toEq(H.lat);
				const dLng = ((H.lng - O.lng + 540) % 360) - 180;
				const dLat = H.lat - O.lat;
				const padH = hero.padding.top;
				motionRes(mm, true);
				const t0 = performance.now();
				const seq = ++diveSeq;
				let lastStep = 0;
				let lastFrame = performance.now();
				frameEma = 16.7;
				slowSince = 0;
				const step = (now: number) => {
					if (seq !== diveSeq || phase !== "diving") return;
					watchFrames(now, now - lastFrame);
					lastFrame = now;
					// Mode hemat: ±30 fps — perangkat lemah tak sanggup 60 gambar ulang globe per detik; ritme yang
					// rata terasa lebih mulus daripada 60 fps yang tersendat-sendat.
					if (lite && now - lastStep < 30 && now - t0 < ms) {
						requestAnimationFrame(step);
						return;
					}
					lastStep = now;
					const u = Math.min(1, (now - t0) / ms);
					// Waktu menutup yang setara (t = 1 − u), tapi kurvanya bukan
					// ease3 simetris: menutup berakhir dengan putaran panjang yang
					// MELAMBAT; dibalik, ease3 membuat putaran mulai pelan lalu
					// ngebut — terasa "langsung zoom". Di sini awal geraknya rata
					// (putaran langsung jalan), akhirnya tetap mengendap.
					// Bumi TERUS berputar sepanjang durasi (sinus, rata) sementara
					// kamera pelan-pelan mendekat (smoothstep) — "muter, lama-lama
					// mendekat ke Indonesia". Dulu putaran menumpuk di awal
					// (faktor base^(1−k) dari rumus easeTo) lalu sisanya tinggal
					// zoom.
					const r = (1 - Math.cos(Math.PI * u)) / 2; // 0 → 1
					const zp = u * u * (3 - 2 * u); // 0 → 1
					const k = 1 - r; // sisa jarak ke hero (1 = di hero)
					const lat = O.lat + dLat * k;
					mm.jumpTo({
						center: [O.lng + dLng * k, lat],
						zoom: zO + (zH - zO) * (1 - zp) + toEq(lat),
						bearing: 0,
						pitch: 0,
						padding: { top: padH * k, bottom: 0, left: 0, right: 0 },
					});
					if (u < 1) requestAnimationFrame(step);
					else {
						mm.jumpTo(cam);
						phase = "landed";
						motionRes(mm, false);
					}
				};
				requestAnimationFrame(step);
			};
			riseRef = (ms: number) => {
				phase = "rising";
				diveSeq++;
				mm.stop();
				setInteractiveRef?.(false);
				dragged = false;
				const cam = heroCamera(el, heroLat, heroLift);
				if (ms <= 0) {
					mm.jumpTo(cam);
					phase = "hero";
					motionRes(mm, false);
					startRoll();
					return;
				}
				motionRes(mm, true);
				mm.easeTo({ ...cam, duration: ms, easing: ease3, essential: true });
				mm.once("moveend", () => {
					if (phase === "rising") phase = "hero";
					motionRes(mm, false);
					startRoll();
				});
			};

			// Level ubin bingkai Nusantara: zoom kamera ±4.4 + 1 (tileSize 256).
			preloads = preloadTiles([[-11, 90], [8, 144]], 5);

			const plateUrls = await Promise.all(hotspots.map(resolvePlateUrl));
			if (disposed) return;

			const plate = plateSize();
			const plateEl = (url: string, glyph: string, label: string, title: string, extraClass = "") => {
				const d = document.createElement("div");
				d.className = "im-mk-wrap";
				d.style.width = `${plate.w}px`;
				d.style.height = `${plate.h}px`;
				d.title = title;
				// Thumbnail teracak → <canvas> berisi salinan bitmap kecilnya (sudah siap: resolvePlateUrl menunggunya).
				const scr = !!url && isScrambledUrl(url);
				const photo = !url
					? ""
					: scr
						? `<canvas aria-hidden="true" style="${PLATE_CANVAS_STYLE}"></canvas>`
						: `<img src="${url}" alt="" decoding="async" draggable="false" />`;
				d.innerHTML = `<span class="im-mk im-mk-plate ${extraClass}">
						<span class="im-mk-plate-inner">
							<span class="im-mk-plate-img ${url ? "" : "is-empty"}">${photo}</span>
							<span class="im-mk-plate-glyph">${glyph}</span>
							${PLATE_BRACKETS}
						</span>
						${label}
					</span>`;
				const cv = scr ? d.querySelector("canvas") : null;
				if (cv) smallBitmap(url).then((b) => paintSmall(cv, b), () => {});
				return d;
			};

			hotspots.forEach((h, i) => {
				const count = h.photos.length;
				// Plate = bingkai pertama yang termuat. Jenis isi dibaca dari glyph:
				// tumpukan = galeri, panorama = beberapa bingkai, bingkai = titik tunggal.
				const glyph = count >= 4 ? GLYPH_STACK : count >= 2 ? GLYPH_PANO : GLYPH_POINT;
				const num = String(i + 1).padStart(2, "0");
				const label = `<span class="im-mk-label"><span class="im-mk-name">${escapeHtml(splitPlace(h.name).place)}</span><span class="im-mk-num">${num}</span></span>`;
				const node = plateEl(plateUrls[i], glyph, label, h.name);
				node.addEventListener("click", (e) => {
					e.stopPropagation();
					openViewer(i);
				});
				// opacityWhenCovered 0: bawaan MapLibre meredupkan (0.2), bukan
				// menyembunyikan, marker di sisi belakang globe — frame foto tampak
				// "terbawa" samar di tengah laut saat globe diputar.
				markers[i] = new ml.Marker({ element: node, anchor: "center", opacityWhenCovered: "0" }).setLngLat([h.lng, h.lat]).addTo(mm);
				markerOn[i] = true;
			});

			// Titik yang bertumpuk di layar (mis. sepuluh kota Jawa Barat pada zoom
			// ringkasan) digabung jadi satu plate bertanda jumlah. Klik → kamera
			// mendekat ke anggotanya sampai mereka terurai sendiri. Hanya dihitung
			// setelah mendarat — di kamera globe semua titik bertumpuk jadi satu.
			let lastSig = "";
			// Label nama ada di KANAN plate. Penggabungan di bawah hanya menjaga PLATE tak bertumpuk, jadi label bisa
			// menimpa plate atau label lain (mis. "2 titik · 3 bingkai" di Bali tertutup plate Nusa Tenggara Timur).
			// Label yang menabrak dipindah ke kiri plate; bila di kiri pun menabrak, disembunyikan (muncul saat plate
			// disorot). Dihitung ulang tiap kamera berhenti.
			const placeLabels = () => {
				const box = el.getBoundingClientRect();
				const gap = 0.6 * (parseFloat(getComputedStyle(document.documentElement).fontSize) || 16);
				const items = [
					...markers.filter((_, i) => markerOn[i]).map((mk) => mk.getElement()),
					...clusterMarkers.map((mk) => mk.getElement()),
				]
					.filter((e) => e.isConnected)
					.map((e) => ({ r: e.getBoundingClientRect(), lb: e.querySelector<HTMLElement>(".im-mk-label") }))
					.sort((a, b) => a.r.left - b.r.left || a.r.top - b.r.top);
				type Box = { l: number; r: number; t: number; b: number };
				const hit = (a: Box, b: Box) => a.l < b.r && b.l < a.r && a.t < b.b && b.t < a.b;
				const plates = items.map(({ r }) => ({ l: r.left - 2, r: r.right + 2, t: r.top - 2, b: r.bottom + 2 }));
				const taken: Box[] = [];
				items.forEach(({ r, lb }, i) => {
					if (!lb) return;
					lb.classList.remove("is-left", "is-hidden");
					// Lebar dengan teks LENGKAP: label bisa sedang "mengetik" huruf demi huruf (scrambleIn).
					const parts = [...lb.children] as HTMLElement[];
					const shown = parts.map((c) => c.textContent);
					parts.forEach((c) => c.dataset.text && (c.textContent = c.dataset.text));
					const w = lb.offsetWidth;
					const h = lb.offsetHeight;
					parts.forEach((c, k) => (c.textContent = shown[k]));
					const cy = r.top + r.height / 2;
					const right = { l: r.right + gap, r: r.right + gap + w, t: cy - h / 2, b: cy + h / 2 };
					const left = { l: r.left - gap - w, r: r.left - gap, t: right.t, b: right.b };
					const free = (c: Box) =>
						c.l >= box.left + 4 &&
						c.r <= box.right - 4 &&
						!taken.some((o) => hit(c, o)) &&
						!plates.some((o, k) => k !== i && hit(c, o));
					if (free(right)) taken.push(right);
					else if (free(left)) {
						lb.classList.add("is-left");
						taken.push(left);
					} else lb.classList.add("is-hidden");
				});
			};
			const recluster = () => {
				if (disposed || phase !== "landed") return;
				const pts = hotspots.map((h) => mm.project([h.lng, h.lat]));
				const bw = plate.w + 28;
				const bh = plate.h + 18;
				const centre = (g: number[]) => ({
					x: g.reduce((sum, k) => sum + pts[k].x, 0) / g.length,
					y: g.reduce((sum, k) => sum + pts[k].y, 0) / g.length,
				});
				const groups = hotspots.map((_, k) => [k]);
				for (let merged = true; merged; ) {
					merged = false;
					outer: for (let a = 0; a < groups.length; a++) {
						for (let b = a + 1; b < groups.length; b++) {
							const ca = centre(groups[a]);
							const cb = centre(groups[b]);
							if (Math.abs(ca.x - cb.x) < bw && Math.abs(ca.y - cb.y) < bh) {
								groups[a] = [...groups[a], ...groups[b]];
								groups.splice(b, 1);
								merged = true;
								break outer;
							}
						}
					}
				}

				// Pusat kelompok dalam lat/lng tidak bergantung zoom, jadi elemen
				// cukup dibangun ulang bila keanggotaan (atau bahasa) berubah.
				const sig =
					groups.map((g) => [...g].sort((a, b) => a - b).join("+")).sort().join("|") + `@${t.frames}`;
				if (sig === lastSig) {
					placeLabels();
					return;
				}
				lastSig = sig;

				clusterMarkers.forEach((c) => c.remove());
				clusterMarkers = [];
				for (const g of groups) {
					if (g.length === 1) {
						if (!markerOn[g[0]]) {
							markers[g[0]].addTo(mm);
							markerOn[g[0]] = true;
						}
						continue;
					}
					g.forEach((k) => {
						markers[k].remove();
						markerOn[k] = false;
					});
					const c = centre(g);
					const lead = g.find((k) => plateUrls[k]) ?? g[0];
					const frames = g.reduce((sum, k) => sum + hotspots[k].photos.length, 0);
					const regions = new Set(g.map((k) => splitPlace(hotspots[k].name).region).filter(Boolean));
					const name = regions.size === 1 ? [...regions][0] : `${g.length} ${t.points}`;
					const label = `<span class="im-mk-label"><span class="im-mk-name">${escapeHtml(name)}</span><span class="im-mk-num">${frames} ${escapeHtml(t.frames)}</span></span>`;
					const node = plateEl(
						plateUrls[lead],
						`<span class="im-mk-count">${g.length}</span>`,
						label,
						g.map((k) => splitPlace(hotspots[k].name).place).join(", "),
						"im-mk-cluster",
					);
					node.addEventListener("click", (e) => {
						e.stopPropagation();
						const lats = g.map((k) => hotspots[k].lat);
						const lngs = g.map((k) => hotspots[k].lng);
						const same = Math.min(...lats) === Math.max(...lats) && Math.min(...lngs) === Math.max(...lngs);
						// Anggota berkoordinat sama tidak akan pernah terurai oleh zoom —
						// langsung buka titik pertamanya.
						if (same) openViewer(g[0]);
						else {
							// Area aman sama dengan kamera ringkasan (blok judul di kiri-atas,
							// petunjuk di bawah) + ruang untuk plate dan labelnya. Di layar sempit
							// ruang itu menelan lebih dari separuh lebar (ponsel: kelompok diketuk,
							// zoom 2,47 → 2,57 — tak terurai), jadi disisakan minimal 45% lebar &
							// tinggi, dan kamera selalu mendekat paling sedikit 1,25 tingkat.
							const fit = overviewFit(el);
							const squeeze = (a: number, b: number, total: number) => {
								const k = Math.min(1, (total * 0.55) / Math.max(1, a + b));
								return [a * k, b * k] as const;
							};
							const [left, right] = squeeze(fit.left + plate.w, fit.right + plate.w * 2.5, el.clientWidth);
							const [top, bottom] = squeeze(fit.top + plate.h, fit.bottom + plate.h, el.clientHeight);
							const cam = mm.cameraForBounds(
								[
									[Math.min(...lngs), Math.min(...lats)],
									[Math.max(...lngs), Math.max(...lats)],
								],
								{ padding: { top, left, bottom, right }, maxZoom: CLUSTER_MAX_Z },
							);
							if (cam?.center) {
								mm.flyTo({
									center: cam.center,
									zoom: Math.min(CLUSTER_MAX_Z, Math.max(cam.zoom ?? 0, mm.getZoom() + 1.25)),
									duration: FLY_DUR * 1000,
									essential: true,
								});
							}
						}
					});
					clusterMarkers.push(
						new ml.Marker({ element: node, anchor: "center", opacityWhenCovered: "0" }).setLngLat(mm.unproject([c.x, c.y])).addTo(mm),
					);
				}
				applyFocusClasses();
				placeLabels();
			};
			// moveend, bukan zoomend: geser / lompat kamera tanpa ganti zoom (pemulihan kamera saat Back, ubah ukuran
			// jendela) juga mengubah posisi label terhadap tepi layar.
			mm.on("moveend", recluster);
			reclusterRef = () => {
				lastSig = "";
				recluster();
			};
			recluster();

			const syncFocus = () => {
				const c = mm.getCenter();
				let best = 0;
				let bd = Infinity;
				for (let i = 0; i < hotspots.length; i++) {
					const dLat = hotspots[i].lat - c.lat;
					const dLng = hotspots[i].lng - c.lng;
					const d = dLat * dLat + dLng * dLng;
					if (d < bd) {
						bd = d;
						best = i;
					}
				}
				if (best !== focusRef) {
					focusRef = best;
					focus = best;
				}
			};
			mm.on("move", () => {
				if (phase === "landed") syncFocus();
			});
			mm.on("dragstart", () => (dragged = true));
			// Resolusi dinamis untuk gerak di fase peta: hanya bila gerak berlangsung > 0,12 dtk (klik / sentuhan
			// pendek tak mengubah resolusi); kembali penuh di moveend.
			let motionT = 0;
			mm.on("movestart", () => {
				if (phase !== "landed" || inMotion) return;
				window.clearTimeout(motionT);
				motionT = window.setTimeout(() => {
					if (phase === "landed" && mm.isMoving()) motionRes(mm, true);
				}, 120);
			});
			mm.on("moveend", () => {
				window.clearTimeout(motionT);
				if (phase === "landed" && inMotion && !mm.isMoving()) motionRes(mm, false);
			});
			// Kamera peta diingat saat meninggalkan landing dan dipulihkan saat Back, supaya peta tak kembali ke bingkai
			// Nusantara. Semua yang dipilih pengunjung ikut: geser, zoom, klik kluster (fitBounds), tombol +/−. Bila penampil
			// foto sedang terbuka, yang disimpan kamera SEBELUM penampil terbuka (bukan hasil terbangnya).
			const CAM_KEY = "lakuna:map-cam";
			type SavedCam = {
				center: [number, number];
				zoom: number;
				bearing: number;
				pitch: number;
				padding: { top: number; bottom: number; left: number; right: number };
			};
			let pendingCam: SavedCam | null = null;
			const onLeaving = () => {
				try {
					if (phase === "landed") {
						const c = mm.getCenter();
						const cam = camBeforeView ?? {
							center: [c.lng, c.lat] as [number, number],
							zoom: mm.getZoom(),
							bearing: mm.getBearing(),
							pitch: mm.getPitch(),
						};
						sessionStorage.setItem(CAM_KEY, JSON.stringify({ ...cam, padding: mm.getPadding() }));
					} else sessionStorage.removeItem(CAM_KEY);
				} catch {
					/* penyimpanan diblokir — abaikan */
				}
			};
			// Hanya setelah mendarat DAN batas zoom terpasang (kalau lebih awal, zoom tersimpan jadi dasar batas zoom-out).
			applyCamRef = () => {
				if (!pendingCam || phase !== "landed" || mm.getMinZoom() <= 0) return;
				const c = pendingCam;
				pendingCam = null;
				mm.stop();
				// Hanya bila berbeda dari bingkai ringkasan: tandai "sudah diubah" supaya ukuran jendela tak menimpanya.
				const differs = Math.abs(mm.getZoom() - c.zoom) > 0.05 || Math.abs(mm.getCenter().lng - c.center[0]) > 0.05;
				mm.jumpTo(c);
				if (differs) dragged = true;
				reclusterRef?.();
			};
			const loadCam = () => {
				try {
					const raw = sessionStorage.getItem(CAM_KEY);
					sessionStorage.removeItem(CAM_KEY);
					// Dipanggil dua kali pada Back (saat peta siap & saat home-restored): panggilan kedua menemukan kunci
					// sudah kosong dan TIDAK boleh menimpa kamera yang sudah terbaca.
					if (raw) pendingCam = JSON.parse(raw) as SavedCam;
				} catch {
					/* data rusak — abaikan */
				}
			};
			const onHomeRestored = () => {
				loadCam();
				applyCamRef?.();
			};
			// Peta dibuat asinkron: bisa lebih lambat dari event home-restored. homeScroll menandai Back lewat dataset.
			if (document.documentElement.dataset.homeBack === "1") {
				loadCam();
				// Peta yang langsung dibuat dalam keadaan mendarat tak lagi memanggil landed(): terapkan sekarang.
				applyCamRef?.();
			}
			window.addEventListener("lakuna:home-leaving", onLeaving);
			window.addEventListener("lakuna:home-restored", onHomeRestored);
			camCleanup = () => {
				window.removeEventListener("lakuna:home-leaving", onLeaving);
				window.removeEventListener("lakuna:home-restored", onHomeRestored);
			};
			// ── Unduh-awal ubin di sekeliling layar ──────────────────────────────────────────────────────────
			// MapLibre hanya meminta ubin yang SEDANG terlihat: menggeser/zoom menyingkap tepi yang ubinnya baru mulai
			// diunduh, jadi petak kasar/beda warna (ubin induk) tampak dulu. Di jaringan lambat itu terlihat jelas.
			// Di sini ubin di sekitar layar (cincin 2 ubin), satu tingkat zoom di atasnya (zoom-in) dan di bawahnya
			// (zoom-out) diunduh lebih dulu ke cache browser lewat fetch berprioritas rendah, sehingga saat peta
			// memintanya jawabannya sudah ada. Tak ada pemakaian memori: tubuh respons dibuang, hanya cache HTTP.
			const fetched = new Set<string>();
			/** Unduh daftar ubin ke cache HTTP browser (tubuh respons dibuang), `workers` permintaan sekaligus. */
			const warm = (urls: string[], workers: number, alive: () => boolean = () => true, onDone?: () => void) => {
				let next = 0;
				let running = workers;
				const worker = async () => {
					while (next < urls.length && alive() && !disposed) {
						const u = urls[next++]!;
						if (fetched.has(u)) continue;
						fetched.add(u);
						try {
							const r = await fetch(u, { mode: "cors", priority: "low" } as RequestInit);
							await r.arrayBuffer();
						} catch {
							fetched.delete(u); // gagal: boleh dicoba lagi lain kali
						}
					}
					// Semua pekerja selesai DAN antrean habis (bukan dihentikan) → selesai.
					if (--running === 0 && next >= urls.length && alive()) onDone?.();
				};
				for (let i = 0; i < workers; i++) void worker();
			};
			// ── Seluruh Nusantara HD untuk tingkat zoom yang sedang dipakai ─────────────────────────────────────
			// "Langsung HD" saat peta dilempar ke mana pun hanya mungkin bila ubinnya sudah ada di perangkat. Begitu
			// peta diam di suatu tingkat zoom, SEMUA ubin wilayah Indonesia di tingkat itu diunduh ke cache browser
			// (Esri mengizinkan cache 24 jam), dimulai dari yang terdekat dengan posisi sekarang. Ukuran: ubin z5–7
			// ±245 ubin/±2 MB (sekali, untuk cadangan esri-near), z8 (peta zoom 7.x) ±640 ubin/±4,4 MB, z9 (zoom 8.x)
			// ±2.480 ubin/±16 MB. Lebih dekat dari itu jumlahnya ×4 per tingkat → hanya cincin di sekitar layar.
			// Dilewati pada mode hemat data / koneksi lambat.
			const REGION_MAX_Z = 9;
			const slowNet = () => {
				const c = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } })
					.connection;
				return !!c?.saveData || /(^|-)(2g|3g)$/.test(c?.effectiveType ?? "");
			};
			const regionTiles = (z: number, from: { lng: number; lat: number }) => {
				const [w, sLat, e, nLat] = NEAR_BOUNDS;
				const n = 2 ** z;
				const mercY = (lat: number) => {
					const r = (lat * Math.PI) / 180;
					return (1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2;
				};
				const cx = ((from.lng + 180) / 360) * n;
				const cy = mercY(from.lat) * n;
				const list: { u: string; d: number }[] = [];
				for (let y = Math.floor(mercY(nLat) * n); y <= Math.floor(mercY(sLat) * n); y++) {
					for (let x = Math.floor(((w + 180) / 360) * n); x <= Math.floor(((e + 180) / 360) * n); x++) {
						list.push({ u: TILE_URL(z, x, y), d: Math.hypot(x + 0.5 - cx, y + 0.5 - cy) });
					}
				}
				return list.sort((a, b) => a.d - b.d).map((t) => t.u);
			};
			const doneLevels = new Set<number>();
			let regionGen = 0;
			let regionHead = -1; // tingkat zoom yang sedang diunduh paling dulu
			const warmRegion = () => {
				if (disposed || phase !== "landed" || document.hidden || slowNet() || lite) return;
				if (import.meta.env.DEV && (window as unknown as { __noPrefetch?: boolean }).__noPrefetch) return;
				const base = tileLevel(mm.getZoom());
				// Tingkat yang sedang dipakai lebih dulu, lalu cadangan z7 → z5.
				const levels = [base, 7, 6, 5].filter(
					(z, i, arr) => z <= REGION_MAX_Z && arr.indexOf(z) === i && !doneLevels.has(z),
				);
				if (!levels.length) return;
				// `idle` terpicu berkali-kali: antrean yang sudah mendahulukan tingkat ini dibiarkan berjalan.
				if (levels[0] === regionHead) return;
				const gen = ++regionGen;
				regionHead = levels[0]!;
				const c = mm.getCenter();
				const run = (i: number) => {
					const z = levels[i];
					if (z === undefined || gen !== regionGen) {
						if (gen === regionGen) regionHead = -1;
						return;
					}
					// Ubin yang sudah terunduh dilewati warm(), jadi melanjutkan tingkat yang pernah terputus itu murah.
					warm(regionTiles(z, c), 6, () => gen === regionGen, () => {
						doneLevels.add(z);
						run(i + 1);
					});
				};
				run(0);
			};
			let pfGen = 0;
			let pfTimer = 0;
			let lastC: { lng: number; lat: number; t: number } | null = null;
			let lastZ: { z: number; t: number } | null = null;
			/** Titik pusat zoom terakhir (px layar) + arah (1 = masuk): roda+Ctrl/⌘ atau pinch trackpad (keduanya
			    event wheel ber-ctrlKey), atau tengah dua jari di layar sentuh. */
			let zoomAnchor: { cx: number; cy: number; t: number; dir: number } | null = null;
			let pinchDist = 0;
			const onAnchorWheel = (e: WheelEvent) => {
				if (!(e.ctrlKey || e.metaKey) || !e.deltaY) return;
				zoomAnchor = { cx: e.clientX, cy: e.clientY, t: performance.now(), dir: e.deltaY < 0 ? 1 : -1 };
			};
			const onAnchorTouch = (e: TouchEvent) => {
				if (e.touches.length !== 2) {
					pinchDist = 0;
					return;
				}
				const [p, q] = [e.touches[0]!, e.touches[1]!];
				const d = Math.hypot(p.clientX - q.clientX, p.clientY - q.clientY);
				if (pinchDist && Math.abs(d - pinchDist) > 2) {
					zoomAnchor = {
						cx: (p.clientX + q.clientX) / 2,
						cy: (p.clientY + q.clientY) / 2,
						t: performance.now(),
						dir: d > pinchDist ? 1 : -1,
					};
				}
				pinchDist = d;
			};
			el.addEventListener("wheel", onAnchorWheel, { passive: true, capture: true });
			el.addEventListener("touchmove", onAnchorTouch, { passive: true, capture: true });
			anchorCleanup = () => {
				el.removeEventListener("wheel", onAnchorWheel, { capture: true });
				el.removeEventListener("touchmove", onAnchorTouch, { capture: true });
			};
			const prefetchOnce = () => {
				pfTimer = 0;
				if (disposed || phase !== "landed" || document.hidden) return;
				if ((navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData) return;
				if (import.meta.env.DEV && (window as unknown as { __noPrefetch?: boolean }).__noPrefetch) return;
				const rect = el.getBoundingClientRect();
				if (rect.bottom < 0 || rect.top > window.innerHeight) return; // peta di luar layar
				const zoom = mm.getZoom();
				const base = tileLevel(zoom);
				const c = mm.getCenter();
				const world = 512 * 2 ** zoom; // piksel dunia pada zoom peta
				const mercY = (lat: number) => {
					const r = (lat * Math.PI) / 180;
					return (1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2;
				};
				// Arah & kecepatan geseran (derajat/dtk, dari dua panggilan terakhir) → cincin kedua digeser ±1 dtk ke depan.
				const now = performance.now();
				let ahead: { lng: number; lat: number } | null = null;
				if (lastC && now - lastC.t < 1500 && now - lastC.t > 30) {
					const dt = (now - lastC.t) / 1000;
					const vx = (c.lng - lastC.lng) / dt;
					const vy = (c.lat - lastC.lat) / dt;
					if (Math.hypot(vx, vy) > 0.05) ahead = { lng: c.lng + vx, lat: Math.max(-80, Math.min(80, c.lat + vy)) };
				}
				lastC = { lng: c.lng, lat: c.lat, t: now };
				// Arah zoom (tingkat/dtk) dari dua panggilan terakhir.
				const dz = lastZ && now - lastZ.t < 1500 && now - lastZ.t > 30 ? (zoom - lastZ.z) / ((now - lastZ.t) / 1000) : 0;
				lastZ = { z: zoom, t: now };
				const wants: { z: number; x: number; y: number; d: number }[] = [];
				/** Ubin tingkat `z` yang menutupi layar berpusat di `at` saat kamera di zoom `viewZoom` (+ `margin` ubin). */
				const ring = (z: number, margin: number, at: { lng: number; lat: number }, bias = 0, viewZoom = zoom) => {
					if (z < 2 || z > 15) return;
					const n = 2 ** z;
					const tilePx = (512 * 2 ** viewZoom) / n;
					const cx = ((at.lng + 180) / 360) * n;
					const cy = mercY(at.lat) * n;
					const rx = el.clientWidth / 2 / tilePx + margin;
					const ry = el.clientHeight / 2 / tilePx + margin;
					for (let x = Math.floor(cx - rx); x <= Math.floor(cx + rx); x++) {
						for (let y = Math.floor(cy - ry); y <= Math.floor(cy + ry); y++) {
							if (x < 0 || y < 0 || x >= n || y >= n) continue;
							wants.push({ z, x, y, d: Math.hypot(x + 0.5 - cx, y + 0.5 - cy) / n + bias });
						}
					}
				};
				ring(base, 2, c);
				if (ahead) {
					// Tepi tujuan geseran didahulukan — penambal satu tingkat di bawah (esri-mid, 4× lebih sedikit ubin)
					// paling dulu, supaya wilayah baru langsung tertutup warna yang sama walau HD-nya belum tiba.
					ring(base - 2, 1, ahead, -0.002);
					ring(base - 1, 1.5, ahead, -0.0015);
					ring(base, 1.5, ahead, -0.001);
				}
				ring(base - 2, 1, c, -0.0005); // esri-lo: segelintir ubin, menutup wilayah luas
				// Sedang zoom MASUK: tingkat 1–2 di depan diunduh lebih dulu dari apa pun, di bingkai yang AKAN terlihat —
				// zoom berpusat di kursor / titik cubit, bukan di tengah layar. Dulu hanya +1 tingkat di tengah layar,
				// sehingga zoom cepat tiba di wilayah yang ubinnya belum ada: induk diregang (buram, petak beda warna).
				const zoomingIn = dz > 0.25 || (zoomAnchor !== null && now - zoomAnchor.t < 700 && zoomAnchor.dir > 0);
				if (zoomingIn) {
					const w = el.clientWidth;
					const h = el.clientHeight;
					const a =
						zoomAnchor && now - zoomAnchor.t < 700
							? { x: zoomAnchor.cx - rect.left, y: zoomAnchor.cy - rect.top }
							: { x: w / 2, y: h / 2 };
					for (const k of [1, 2]) {
						const s = 2 ** k;
						const at = mm.unproject([a.x + (w / 2 - a.x) / s, a.y + (h / 2 - a.y) / s]);
						ring(base + k, 0.5, at, -0.01 + (k - 1) * 0.002, zoom + k);
					}
				} else {
					ring(base + 1, 0.5, c, 0.5 / 2 ** base);
				}
				ring(base - 1, 1.5, c); // penambal esri-mid: setara jaraknya dengan cincin HD
				if (dz < -0.25) ring(base - 2, 1, c, 0.2 / 2 ** base, zoom - 2); // zoom keluar cepat
				const urls = wants
					.sort((a, b) => a.d - b.d)
					.map((t) => TILE_URL(t.z, t.x, t.y))
					.filter((u) => !fetched.has(u))
					.slice(0, 120);
				if (!urls.length) return;
				if (fetched.size > 4000) fetched.clear();
				const gen = ++pfGen; // tampilan baru membatalkan antrean lama yang belum mulai
				// 8 sekaligus: dua host × 6 koneksi = 12, jadi ubin yang sedang diminta peta selalu punya jalur.
				warm(urls, 8, () => gen === pfGen);
			};
			const schedulePrefetch = (delay: number) => {
				if (pfTimer) window.clearTimeout(pfTimer);
				pfTimer = window.setTimeout(prefetchOnce, delay);
			};
			let pfThrottle = 0;
			mm.on("move", () => {
				// Selama menggeser: perbarui cincin paling sering ~6×/dtk, tanpa menumpuk kerja.
				if (phase !== "landed" || pfThrottle) return;
				pfThrottle = window.setTimeout(() => {
					pfThrottle = 0;
					schedulePrefetch(0);
				}, 150);
			});
			mm.on("moveend", () => schedulePrefetch(80));
			mm.on("idle", () => {
				if (phase !== "landed") return;
				schedulePrefetch(400);
				warmRegion();
			});
			// Kotak foto memudar selama kamera bergerak (drag/fly/zoom),
			// muncul lagi saat berhenti — seperti marker di referensi.
			mm.on("movestart", () => {
				if (phase === "landed") el.classList.add("is-moving");
			});
			mm.on("moveend", () => {
				el.classList.remove("is-moving");
				if (phase === "landed") syncFocus();
			});
			// Peta selesai memuat ubin & menggambar (hanya di fase peta): tanda untuk penutup Back (homeScroll),
			// supaya peta yang masih hitam / setengah termuat tidak sempat terlihat.
			mm.on("idle", () => {
				if (phase !== "landed") return;
				document.documentElement.dataset.mapIdle = "1";
				window.dispatchEvent(new Event("lakuna:map-idle"));
			});

			// Rotasi HP / jendela diubah ukurannya: kamera ikut dipaskan ulang —
			// hero ke posisi bumi, peta ke bingkai Nusantara (selama pengunjung
			// belum menggeser sendiri).
			let lastW = el.clientWidth;
			let lastH = el.clientHeight;
			ro = new ResizeObserver(() => {
				if (disposed || (el.clientWidth === lastW && el.clientHeight === lastH)) return;
				lastW = el.clientWidth;
				lastH = el.clientHeight;
				mm.resize();
				if (phase === "hero") mm.jumpTo(heroCamera(el, heroLat, heroLift));
				else if (phase === "landed") {
					// Ukuran berubah → bingkai Nusantara berubah → batas zoom-out ikut dihitung ulang
					// (tanpa ini batas lama bisa menjepit tampilan ringkasan di layar yang lebih kecil).
					mm.setMinZoom(0);
					const cam = overviewCamera();
					if (!dragged) mm.jumpTo(cam);
					zoomBase = Math.min(cam.zoom, nusantaraZoom());
					mm.setMinZoom(Math.max(0, zoomBase - LANDED_ZOOM_OUT));
					recluster();
				}
			});
			ro.observe(el);

			resetRef = () => mm.easeTo({ ...overviewCamera(), duration: 1100, easing: ease3 });
			// Pendaratan selesai (dipanggil induk): hitung penggabungan titik
			// di bingkai akhir.
			landedRef = () => {
				phase = "landed";
				syncFocus();
				reclusterRef?.();
			};

			map = mm;
			ready = true;
			if (import.meta.env.DEV) {
				(window as unknown as { __im?: unknown }).__im = {
					map: mm,
					state: () => ({ phase, zoom: mm.getZoom(), center: mm.getCenter() }),
					dive: (ms: number) => diveRef?.(ms),
				};
			}
		})();

		return () => {
			disposed = true;
			delete document.documentElement.dataset.mapIdle;
			delete document.documentElement.dataset.mapLite;
			lite = false;
			nearIo?.disconnect();
			visIo?.disconnect();
			cancelAnimationFrame(raf);
			window.clearTimeout(rollTimer);
			ro?.disconnect();
			reclusterRef = null;
			diveRef = null;
			riseRef = null;
			setInteractiveRef = null;
			resetRef = null;
			landedRef = null;
			gestureCleanup?.();
			gestureCleanup = null;
			rollCleanup?.();
			rollCleanup = null;
			camCleanup?.();
			camCleanup = null;
			anchorCleanup?.();
			anchorCleanup = null;
			applyCamRef = null;
			if (m) m.remove();
			map = null;
			markers = [];
			markerOn = [];
			clusterMarkers = [];
			preloads = [];
		};
	});

	// ── API untuk induk (MapDescent) ─────────────────────────────────────────
	let diveRef: ((ms: number) => void) | null = null;
	// Penanda urutan animasi menukik: gerak baru membatalkan yang lama.
	let diveSeq = 0;
	let riseRef: ((ms: number) => void) | null = null;
	let setInteractiveRef: ((on: boolean) => void) | null = null;
	let resetRef: (() => void) | null = null;
	let landedRef: (() => void) | null = null;
	let gestureCleanup: (() => void) | null = null;
	let startRoll: (soft?: boolean) => void = () => {};
	let rollCleanup: (() => void) | null = null;
	let applyCamRef: (() => void) | null = null;
	let camCleanup: (() => void) | null = null;
	let anchorCleanup: (() => void) | null = null;

	// ── Mode hemat (perangkat lemah) ─────────────────────────────────────────
	// Dikenali dari spesifikasi (≤4 inti CPU, ≤4 GB memori, hemat data) atau dari frame globe hero yang ternyata
	// lambat terus. Globe lalu dirender lebih hemat: resolusi 1× (bukan 1,5×), gambar ulang hero lebih jarang,
	// menyelam ±30 fps, bintang tak berkelip (MapDescent), tanpa unduh-awal ubin seluruh Nusantara. Perangkat kuat
	// tak berubah.
	let lite = false;
	function liteBySpec(): boolean {
		const n = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
		return (
			!!n.connection?.saveData ||
			(typeof n.deviceMemory === "number" && n.deviceMemory <= 4) ||
			(n.hardwareConcurrency || 8) <= 4
		);
	}
	/**
	 * Kelas GPU dari renderer WebGL peta sendiri (tanpa konteks tambahan). Satu render globe ±6–8 ms GPU bahkan di
	 * Apple M4; GPU terintegrasi Intel (HD/UHD/Iris, termasuk Iris Xe ±½ M4), GPU ponsel kelas bawah, dan render
	 * perangkat lunak (akselerasi grafis mati → SwiftShader dsb., semua di CPU) jenuh lebih dulu — dulu mode hemat
	 * baru menyala setelah frame terbukti lambat 1,5 dtk, jadi laptop seperti ini sempat tersendat dulu.
	 * Safari/Firefox menyamarkan nama GPU ("Apple GPU", generik) → tak cocok → tetap diawasi watchFrames.
	 */
	function gpuClass(mm: import("maplibre-gl").Map): "soft" | "weak" | "ok" {
		try {
			const cv = mm.getCanvas();
			const gl = (cv.getContext("webgl2") ?? cv.getContext("webgl")) as WebGLRenderingContext | null;
			if (!gl) return "ok";
			const ext = gl.getExtension("WEBGL_debug_renderer_info");
			const r = String(gl.getParameter(ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER) ?? "");
			if (/swiftshader|llvmpipe|softpipe|software|basic render/i.test(r)) return "soft";
			if (/intel(?!.*\barc\b).*(hd|uhd|iris)|mali|adreno \(tm\) [2-5]\d\d|powervr|videocore/i.test(r)) return "weak";
		} catch {
			/* abaikan — anggap biasa */
		}
		return "ok";
	}
	function enterLite(mm?: import("maplibre-gl").Map | null) {
		if (lite) return;
		lite = true;
		restPR = 1;
		document.documentElement.dataset.mapLite = "1";
		mm?.setPixelRatio(1);
	}
	// ── Resolusi dinamis ─────────────────────────────────────────────────────
	// Selama kamera BERGERAK (menyelam, naik ke globe, peta digeser / terbang ke kelompok) peta dirender 1×, lalu
	// kembali ke resolusi penuh begitu diam. Gerak menyamarkan beda ketajaman, sedangkan isian piksel turun ±55%:
	// kerja GPU median saat menyelam 42 → 32%, saat menggeser 42 → 34% (layar retina). Saat diam tetap tajam penuh.
	/** Rasio piksel render saat diam (1 di mode hemat). */
	let restPR = 1;
	const MOTION_PR = 1;
	let inMotion = false;
	let prWant = 0;
	let prRaf = 0;
	function motionRes(mm: import("maplibre-gl").Map, on: boolean) {
		inMotion = on;
		prWant = on ? Math.min(restPR, MOTION_PR) : restPR;
		// Diterapkan di callback rAF tersendiri, BUKAN langsung: moveend (dari seretan / easeTo) dipicu DI DALAM
		// render MapLibre; mengubah ukuran kanvas + menggambar ulang di sana = render bersarang yang membatalkan
		// frame berikutnya → peta tertinggal kosong sampai ada gerak lagi.
		if (prRaf) return;
		prRaf = requestAnimationFrame(() => {
			prRaf = 0;
			const want = prWant;
			if (!map || Math.abs(mm.getPixelRatio() - want) <= 0.01) return;
			// setPixelRatio() → resize() MapLibre memanggil stop() — MEMUTUS seretan pengguna yang sedang berjalan —
			// dan memicu movestart/moveend. _resizeInternal() (yang juga dipakai resize()) hanya mengubah ukuran kanvas &
			// painter, tanpa keduanya. Internal → dijaga: versi MapLibre tanpa fungsi itu memakai jalur publik, dan hanya
			// saat tak ada gerak yang bisa terputus.
			const m = mm as unknown as { _overridePixelRatio?: number | null; _resizeInternal?: (constrain?: boolean) => void };
			if (typeof m._resizeInternal === "function") {
				m._overridePixelRatio = want;
				m._resizeInternal();
				// Mengubah ukuran kanvas WebGL mengosongkan isinya; gambar ulang SINKRON supaya kompositor tak sempat
				// menampilkan frame kosong (globe / peta berkedip hitam).
				mm.redraw();
			} else if (!mm.isMoving()) mm.setPixelRatio(want);
		});
	}

	// Panggilan yang datang sebelum peta selesai dibuat (mis. reduced-motion
	// langsung mendarat) disimpan dan diterapkan begitu peta siap.
	let pendingLanded = false;

	/** Menukik dari kamera globe ke bingkai Nusantara dalam `ms` milidetik. */
	export function dive(ms: number) {
		if (diveRef) diveRef(ms);
		else pendingLanded = true;
	}
	/** Kembali ke kamera globe hero dalam `ms` milidetik. */
	export function rise(ms: number) {
		if (riseRef) riseRef(ms);
		// Peta belum selesai dibuat: batalkan pendaratan yang tertunda (dive/landed sebelumnya). Dulu perintah naik
		// diabaikan tapi pendaratan tetap tersimpan → peta yang baru jadi dibuat MENDARAT sementara antarmuka sudah
		// kembali ke globe (judul globe di atas peta). Terjadi saat landing dibuka sebagai dokumen baru di posisi
		// peta: Back dari situs luar / setelah muat ulang halaman lain.
		else pendingLanded = false;
	}
	/** Pendaratan selesai: peta interaktif, titik digabung di bingkai akhir. */
	export function landed() {
		if (!landedRef) {
			pendingLanded = true;
			return;
		}
		landedRef();
		setInteractiveRef?.(true);
		applyCamRef?.();
	}
	/** Fase kamera peta saat ini — dipakai induk untuk memastikan kamera sejalan dengan antarmukanya. */
	export function cameraPhase(): "hero" | "diving" | "landed" | "rising" | null {
		return map ? phase : null;
	}
	/** Jeda/lanjutkan gelinding bumi di kamera hero. */
	export function setSpin(on: boolean) {
		rollOn = on;
	}
	/** Posisi kursor di hero, ternormalisasi −0.5..0.5 (0 = tengah layar). */
	export function setPointer(nx: number, ny: number) {
		ptrAimX = reduced ? 0 : nx;
		ptrAimY = reduced ? 0 : ny;
		startRoll();
	}
	/** Turunkan bumi hero (px, positif = lebih rendah) untuk animasi masuk. */
	export function setHeroLift(px: number) {
		heroLift = px;
		startRoll();
	}
	/**
	 * Lingkaran siluet bumi di layar (px CSS, relatif kanvas peta; w×h = ukuran kanvas) menurut kamera MapLibre
	 * yang sebenarnya — untuk menempelkan atmosfer (MapDescent) tepat di tepi bumi. Caranya: untuk titik layar
	 * di LUAR bola, `unproject` mengembalikan titik di lingkar horizon bumi; `project` titik itu = titik di tepi
	 * siluet. Tiga titik jauh di atas layar → lingkaran melalui ketiganya. Null bila peta belum siap / bukan globe.
	 */
	export function globeDisc(w: number, h: number): { cx: number; cy: number; r: number } | null {
		const mm = map;
		if (!mm || !w || !h) return null;
		const probes: [number, number][] = [
			[-w, -2 * h],
			[w / 2, -2 * h],
			[2 * w, -2 * h],
		];
		const pts: [number, number][] = [];
		for (const [x, y] of probes) {
			const q = mm.project(mm.unproject([x, y]));
			// Titik uji ternyata DI bola (bumi menutupi atas layar): bukan titik tepi.
			if (!Number.isFinite(q.x) || Math.hypot(q.x - x, q.y - y) < 1) return null;
			pts.push([q.x, q.y]);
		}
		const [[ax, ay], [bx, by], [cx, cy]] = pts;
		const d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));
		if (Math.abs(d) < 1e-6) return null;
		const a2 = ax * ax + ay * ay;
		const b2 = bx * bx + by * by;
		const c2 = cx * cx + cy * cy;
		const ux = (a2 * (by - cy) + b2 * (cy - ay) + c2 * (ay - by)) / d;
		const uy = (a2 * (cx - bx) + b2 * (ax - cx) + c2 * (bx - ax)) / d;
		return { cx: ux, cy: uy, r: Math.hypot(ax - ux, ay - uy) };
	}
	/**
	 * Kekuatan overlay malam (0..1): penuh / sisi barat / sisi timur. Dipanggil
	 * jam siklus siang–malam di MapDescent. Panggilan pertama menampakkan lapisan
	 * (ubin baru mulai dimuat), jadi baru dipanggil ketika hero terlihat.
	 */
	let nightReveal = false;
	let nightLast = "";
	// Ubin malam dimuat dulu, baru dinaikkan opasitasnya. Siklus siang–malam dimulai dari malam penuh, sedangkan
	// ubin malam baru mulai diunduh saat lapisan dinampakkan dan tiba SATU PER SATU: tanpa penahan ini tiap ubin
	// yang tiba langsung tampil gelap pada opasitas penuh (kotak hitam muncul satu-satu di globe). Sekarang opasitas
	// ditahan 0 sampai semua ubin malam di bingkai selesai (maks 6 dtk), lalu dinaikkan mulus dalam NIGHT_RAMP_MS.
	const NIGHT_RAMP_MS = 1400;
	const NIGHT_LOAD_MAX_MS = 6000;
	const NIGHT_LOAD_MIN_MS = 500;
	let nightRevealAt = 0;
	let nightReadyAt = 0;
	/** Nilai sisi malam yang belum digambar; diterapkan loop globe hero bersamaan dengan gerak kamera. */
	let nightPending: number[] | null = null;
	/** Lapisan malam yang sedang disembunyikan karena opasitasnya 0 (lihat applyNight). */
	const nightHidden = [false, false, false];
	function applyNight(mm: import("maplibre-gl").Map) {
		if (!nightPending) return;
		const v = nightPending;
		nightPending = null;
		// MapLibre tetap menggambar lapisan raster beropasitas 0: tiga lapisan malam = 72 draw call per frame globe
		// hero (±30%) walau sedang siang. Lapisan bernilai 0 disembunyikan — baru setelah ubinnya termuat (nightReadyAt);
		// ubin tetap di cache MapLibre, jadi saat tampil lagi langsung utuh (tanpa kotak hitam satu-satu).
		if (nightReadyAt) {
			NIGHT_MODES.forEach((m, i) => {
				const hide = v[i]! <= 0;
				if (hide !== nightHidden[i]) {
					nightHidden[i] = hide;
					mm.setLayoutProperty(m.id, "visibility", hide ? "none" : "visible");
				}
			});
		}
		mm.setGlobalStateProperty("night", v);
	}
	export function setNightMix(full: number, west: number, east: number) {
		const mm = map;
		if (!mm || !mm.getLayer("nightFull")) return;
		const now = performance.now();
		if (!nightReveal) {
			nightReveal = true;
			nightRevealAt = now;
			for (const m of NIGHT_MODES) mm.setLayoutProperty(m.id, "visibility", "visible");
		}
		if (!nightReadyAt) {
			// isSourceLoaded bisa true sesaat sebelum permintaan ubin dikirim: beri waktu minimum dulu.
			const loaded =
				now - nightRevealAt > NIGHT_LOAD_MIN_MS &&
				NIGHT_MODES.every((m) => {
					try {
						return mm.isSourceLoaded(m.id);
					} catch {
						return false;
					}
				});
			if (loaded || now - nightRevealAt > NIGHT_LOAD_MAX_MS) nightReadyAt = now;
		}
		const ramp = nightReadyAt ? Math.min(1, (now - nightReadyAt) / NIGHT_RAMP_MS) : 0;
		// Dibulatkan 0,01 (setara tanda perubahan di bawah): nilai sisa seperti 0,004 dianggap 0, jadi lapisannya
		// benar-benar disembunyikan applyNight, bukan digambar transparan.
		const v = [full, west, east].map((n) => Math.round(Math.min(1, Math.max(0, n)) * ramp * 100) / 100);
		const sig = v.map((n) => n.toFixed(2)).join("|");
		if (sig === nightLast) return;
		nightLast = sig;
		// Digambar oleh loop globe hero (satu gambar ulang bersama gerak kamera, dibatasi ±11 fps). Di luar fase
		// hero loop itu tak berjalan; sisi malam sudah memudar habis di zoom peta, jadi langsung diterapkan.
		nightPending = v;
		if (phase === "hero") startRoll(true);
		else applyNight(mm);
	}

	$effect(() => {
		const el = sectionEl;
		if (!el || typeof IntersectionObserver === "undefined") return;
		const html = document.documentElement;
		let pinned = false;
		const io = new IntersectionObserver(
			(entries) => {
				const r = entries[0].intersectionRatio;
				if (r >= 0.9 && !pinned) {
					pinned = true;
					html.dataset.mapPinned = "true";
				} else if (r < 0.6 && pinned) {
					pinned = false;
					delete html.dataset.mapPinned;
				}
			},
			{ threshold: [0, 0.6, 0.9] },
		);
		io.observe(el);
		return () => {
			io.disconnect();
			delete html.dataset.mapPinned;
		};
	});

	function applyFocusClasses() {
		markers.forEach((mk, i) => {
			mk.getElement()?.querySelector(".im-mk")?.classList.toggle("is-focus", i === focusRef);
		});
	}

	$effect(() => {
		void focus;
		void ready;
		applyFocusClasses();
	});

	// Label plate gabungan ("3 titik · 5 bingkai") ikut bahasa aktif.
	$effect(() => {
		void lang;
		reclusterRef?.();
	});

	$effect(() => {
		const ctx = sectionEl;
		if (!ctx) return;
		const q = (sel: string) => ctx.querySelectorAll(sel);
		if (bare) {
			// Koreografi milik induk (MapDescent): semua elemen HUD langsung
			// dalam keadaan akhir, tanpa tween scrub yang berebut stage.
			const stage = stageEl;
			// TANPA filter (bukan blur(0px)): filter apa pun — walau tak terlihat — membuat Chrome menggambar seluruh
			// panggung (globe + 6 lapis bintang) ke permukaan perantara di SETIAP frame. Biaya kompositor per frame
			// globe ±2× (M4 retina: ±2,7 → ±1,4 ms), dan berlipat di GPU laptop terintegrasi.
			if (stage) {
				gsap.set(stage, { scale: 1, opacity: 1 });
				stage.style.filter = "";
			}
			gsap.set(q(".im-cluster,.im-slate,.im-hint,.im-coord"), {
				opacity: 1,
				y: 0,
			});
			return;
		}
		if (reduced) {
			q(".im-reveal").forEach((el) => gsap.set(el, { opacity: 1, y: 0 }));
			return;
		}
		const stage = stageEl;
		//
		// SATU timeline untuk seluruh umur peta — masuk, jeda, surut — dengan
		// SATU trigger ("top bottom" → "bottom 5%", 195vh scroll; 1 unit = 1vh).
		// Dulu masuk dan surut dipecah jadi dua tween scrub terpisah yang
		// menulis `scale`/`filter`/`opacity` stage yang sama. `gsap.to` merekam
		// titik awalnya saat render PERTAMA — yakni saat refresh awal, ketika
		// stage masih di state awal masuk (scale 1.35, blur 4px). Akibatnya di
		// zona surut stage melompat balik ke besar-kabur dulu, baru mengecil —
		// peta "muncul lagi"; dan dengan scrub masuk yang telat ±1s, scroll
		// cepat membuat dua tween menulis bergantian per tick → kedip. Sekarang
		// tiap properti cuma punya satu penulis dan batas fasenya eksplisit
		// lewat fromTo — scrub maju maupun mundur kontinu, tanpa lompatan.
		//
		//   0–100   masuk  (eks-"top bottom" → "top top")
		// 100–145   jeda layar penuh
		// 145–195   surut  (eks-"bottom 55%" → "bottom 5%")
		//
		// Rentang surut tetap DIHITUNG dari penerima: orbit galeri
		// (GsapGallery) baru mengirim foto pertama saat tepi atasnya menyentuh
		// 30% viewport — dan karena section peta nempel langsung di atasnya,
		// itu = tepi bawah peta di 30% = unit 165 di timeline ini. Jadi paruh
		// akhir surut (165 → 195) jatuh PERSIS di jendela datangnya foto
		// pertama: peta meredup sementara foto menyala. Ada serah terima, bukan
		// potongan.
		const tl = gsap.timeline({
			scrollTrigger: { trigger: ctx, start: "top bottom", end: "bottom 5%", scrub: 1 },
		});
		if (stage)
			tl.fromTo(
				stage,
				{ scale: 1.15, filter: "blur(3px)" },
				{ scale: 1, filter: "blur(0px)", duration: 100, ease: "power3.out" },
				0,
			);
		tl.fromTo(q(".im-cluster"), { opacity: 0, y: -12 }, { opacity: 1, y: 0, duration: 35 }, 41);
		tl.fromTo(q(".im-slate"), { opacity: 0, y: -10 }, { opacity: 1, y: 0, duration: 35 }, 44);
		tl.fromTo(q(".im-hint"), { opacity: 0 }, { opacity: 1, duration: 35 }, 47);
		tl.fromTo(q(".im-coord"), { opacity: 0 }, { opacity: 1, duration: 35 }, 65);
		if (stage)
			tl.fromTo(
				[stage, ...Array.from(q(".im-hud"))],
				// Titik awal eksplisit = keadaan akhir fase masuk, supaya batas
				// fasenya beku dan tidak ikut terekam dari state yang sedang
				// berjalan (sumber lompatan yang dulu).
				{ scale: 1, filter: "blur(0px)", opacity: 1 },
				{ scale: 1.1, filter: "blur(4px)", opacity: 0.22, duration: 50, ease: "none" },
				145,
			);

		return () => {
			tl.scrollTrigger?.kill();
			tl.kill();
		};
	});

	$effect(() => {
		const ctx = sectionEl;
		if (!ctx || !ready) return;
		const mks = gsap.utils.toArray<HTMLElement>(".im-mk", ctx);
		if (!mks.length) return;
		if (bare) {
			// Mode tanam: marker muncul satu-satu saat kamera mendarat, lalu
			// labelnya MENGETIK dengan huruf acak di ujung (seperti referensi
			// "21hrs on the Moon"). Anti-race: status dibaca dari flag
			// (pendaratan bisa terjadi sebelum peta siap), bukan cuma
			// mengandalkan event sesaat.
			gsap.set(mks, { opacity: 0, scale: 0.85 });
			let shown = false;
			const maybeShow = () => {
				const landedNow = document.documentElement.dataset.maplanded === "1";
				if (landedNow && !shown) {
					shown = true;
					// Marker yang ADA sekarang (termasuk plate gabungan hasil
					// penggabungan di bingkai akhir), urut barat → timur: terbaca
					// seperti pindaian dari Sabang ke Merauke.
					const live = gsap.utils
						.toArray<HTMLElement>(".im-mk", ctx)
						.filter((el) => el.isConnected)
						.sort((a, b) => a.getBoundingClientRect().left - b.getBoundingClientRect().left);
					live.forEach((mk, i) => revealMarker(mk, i * 0.14));
				} else if (!landedNow) {
					shown = false;
				}
			};
			maybeShow();
			window.addEventListener("lakuna:map-shown", maybeShow);
			return () => window.removeEventListener("lakuna:map-shown", maybeShow);
		}
		if (reduced) {
			gsap.set(mks, { opacity: 1, scale: 1 });
			return;
		}
		gsap.set(mks, { opacity: 0, scale: 0.5 });
		const blink = gsap.timeline({
			scrollTrigger: { trigger: ctx, start: "top 55%", once: true },
		});
		blink.to(mks, {
			keyframes: [
				{ opacity: 0, scale: 0.5 },
				{ opacity: 1, scale: 1.2 },
				{ opacity: 0.45, scale: 0.94 },
				{ opacity: 1, scale: 1 },
			],
			duration: 0.65,
			ease: "power2.out",
			stagger: { each: 0.06, from: "start" },
		});
		return () => {
			blink.scrollTrigger?.kill();
			blink.kill();
		};
	});

	// Induk (MapDescent) memberi tahu saat lapisan peta selesai dinampakkan —
	// Leaflet menghitung ulang ukuran agar ubinnya pas bingkai.
	$effect(() => {
		const inv = () => map?.resize();
		window.addEventListener("lakuna:map-shown", inv);
		return () => window.removeEventListener("lakuna:map-shown", inv);
	});

	function togglePan() {
		if (!map) return;
		panOn = !panOn;
		setInteractiveRef?.(phase === "landed");
	}

	/** Geser zoom satu tingkat, dijepit ke batas peta (batas zoom-out fase peta – 15). */
	function zoomStep(d: number) {
		const m = map;
		if (!m) return;
		m.zoomTo(Math.min(15, Math.max(m.getMinZoom(), Math.round(m.getZoom() + d))), { duration: 350 });
	}

	function flyTo(i: number, zoom = FOCUS_Z) {
		const h = hotspots[i];
		if (!h) return;
		map?.flyTo({ center: [h.lng, h.lat], zoom, duration: FLY_DUR * 1000, essential: true });
	}
	// ── Transisi "terbakar" ────────────────────────────────────────────
	// Dari rekaman rujukan: dalam ±0,25 dtk gambar lama OVEREXPOSE — terang
	// meledak putih, gelap jadi hitam pekat, semuanya ter-smear horizontal
	// (seperti film yang terbakar di proyektor) — lalu CUT ke gambar baru
	// yang pulih dari keadaan terbakar ke normal. Dipakai dua arah:
	// peta → foto (buka) dan foto → peta (tutup).
	let smearEl = $state<SVGFEGaussianBlurElement>();
	let splitREl = $state<SVGFEOffsetElement>();
	let splitBEl = $state<SVGFEOffsetElement>();
	let linesEl = $state<HTMLDivElement>();
	/**
	 * Tulis keadaan terbakar ke elemen. k 0 = normal, 1 = puncak.
	 * t = waktu berjalan (dtk) — dipakai untuk kedip negatif yang selang-
	 * seling seperti frame film yang meloncat.
	 */
	function paintBurn(el: HTMLElement | null | undefined, k: number, t = 0) {
		if (!el) return;
		if (k <= 0.001) {
			el.style.filter = "";
			el.style.scale = "";
			if (linesEl) linesEl.style.opacity = "0";
			return;
		}
		// Versi tenang: kilasan terang lembut dengan smear tipis. Kedip
		// negatif, hentakan zoom & garis scan dilepas (terlalu heboh).
		const e = k * k;
		smearEl?.setAttribute("stdDeviation", `${(e * 7).toFixed(2)} ${(e * 0.6).toFixed(2)}`);
		splitREl?.setAttribute("dx", (e * 2.5).toFixed(2));
		splitBEl?.setAttribute("dx", (-e * 2.5).toFixed(2));
		el.style.filter =
			`url(#im-burn-smear) grayscale(${(k * 0.55).toFixed(3)}) ` +
			`contrast(${(1 + e * 0.9).toFixed(3)}) brightness(${(1 + e * 1.1).toFixed(3)})`;
		el.style.scale = "";
		if (linesEl) linesEl.style.opacity = "0";
	}
	/**
	 * Tween k pada elemen: from → to, dengan jam untuk kedip negatif.
	 * hold = lama bertahan di puncak (k = 1) sebelum selesai — di sini
	 * negatif & positif berkedip selang-seling, seperti rujukan.
	 */
	function burn(el: HTMLElement | null | undefined, from: number, to: number, duration: number, ease: string, hold = 0) {
		const st = { k: from, t: 0 };
		paintBurn(el, from, 0);
		const tl = gsap.timeline();
		tl.to(st, { k: to, duration, ease, onUpdate: () => paintBurn(el, st.k, st.t) }, 0);
		tl.to(st, { t: duration + hold, duration: duration + hold, ease: "none", onUpdate: () => paintBurn(el, st.k, st.t) }, 0);
		tl.call(() => paintBurn(el, to, st.t));
		return tl;
	}
	const BURN_OUT_S = 0.4;
	/** Tahan di puncak: kedip negatif/positif sebelum cut. */
	const BURN_HOLD_S = 0;
	const BURN_IN_S = 0.8;
	/** Foto yang baru dibuka mulai dari keadaan terbakar (dibaca efek buka). */
	let openFromBurn = false;
	let opening = false;
	/**
	 * Kamera peta saat penampil foto dibuka. Di dalam penampil, memilih thumbnail di strip memanggil
	 * flyTo() yang menerbangkan peta (di balik penampil) ke zoom lokasi itu — dulu peta tertinggal di
	 * situ begitu penampil ditutup, tidak kembali ke tampilan semula. Dipulihkan di finishClose().
	 */
	let camBeforeView: { center: [number, number]; zoom: number; bearing: number; pitch: number } | null = null;
	function rememberCamera() {
		const m = map;
		if (!m || camBeforeView) return;
		const c = m.getCenter();
		camBeforeView = { center: [c.lng, c.lat], zoom: m.getZoom(), bearing: m.getBearing(), pitch: m.getPitch() };
	}
	function restoreCamera() {
		const m = map;
		const cam = camBeforeView;
		camBeforeView = null;
		if (!m || !cam) return;
		// Hentikan terbangan yang masih berjalan, lalu kembali PERSIS ke kamera semula. Peta sedang
		// tertutup efek "terbakar" saat ini, jadi lompatan langsung tak terlihat.
		m.stop();
		m.jumpTo(cam);
	}

	function openViewer(i: number) {
		if (opening || viewing != null) return;
		rememberCamera();
		// Membuka bingkai = menekan tombol rana. Dipasang di sini, bukan di
		// handler marker, supaya jalur lain menuju bukaan yang sama juga berbunyi.
		playShutter();
		const show = () => {
			opening = false;
			openFromBurn = !reduced;
			viewing = i;
			frame = 0;
			viewingRef = i;
			frameRef = 0;
		};
		if (reduced || !stageEl) {
			show();
			return;
		}
		opening = true;
		// File asli diunduh & didekode SELAMA peta terbakar, supaya foto tampil sudah beresolusi penuh (bukan
		// thumbnail 800 px yang diregang lalu menajam belakangan). Menunggu paling lama 3 dtk.
		const original = preloadOriginal(hotspots[i]?.photos[0]?.id, 3000);
		// Peta terbakar dulu, lalu CUT ke foto (peta dipulihkan di balik layar).
		Promise.all([burn(stageEl, 0, 1, BURN_OUT_S, "power2.in", BURN_HOLD_S), original]).then(() => {
			show();
			// Pulihkan peta di balik foto — filter saja, garis scan tetap
			// milik foto yang sedang pulih.
			requestAnimationFrame(() => {
				if (stageEl) {
					stageEl.style.filter = "";
					stageEl.style.scale = "";
				}
			});
		});
	}
	/** Kotak berkeliling panggung foto (keterangan, tombol, petunjuk). */
	const DV_CHROME = ".im-dv-meta, .im-dv-cap, .im-dv-info, .im-dv-hint, .im-dv-close, .im-dv-veil, .im-dv-strip-wrap";
	// Tutup: keterangan pergi, foto terbakar (±0,25 dtk), CUT ke peta yang
	// pulih dari terbakar ke normal.
	let closing = false;
	function closeViewer() {
		const root = dvRoot;
		if (closing) return;
		if (!root || reduced) {
			finishClose();
			return;
		}
		closing = true;
		const stage = root.querySelector<HTMLElement>(".im-dv-stage");
		const chrome = root.querySelectorAll<HTMLElement>(DV_CHROME);
		gsap.killTweensOf([stage, dvImgWrap, root].filter(Boolean));
		gsap.to(chrome, { opacity: 0, duration: 0.18, ease: "power2.in" });
		burn(stage, 0, 1, BURN_OUT_S, "power2.in", BURN_HOLD_S).then(() => {
			closing = false;
			finishClose();
			if (stageEl) burn(stageEl, 1, 0, BURN_IN_S, "power2.out");
		});
	}
	function finishClose() {
		viewing = null;
		viewingRef = null;
		restoreCamera();
		wrapEl?.classList.remove("is-viewing");
		// Label marker kembali "mengetik" setelah peta muncul lagi.
		if (!reduced) {
			requestAnimationFrame(() => {
				const labels = wrapEl?.querySelectorAll<HTMLElement>(".im-mk-name, .im-mk-num, .im-mk-count") ?? [];
				labels.forEach((el, k) => scrambleIn(el, 0.05 + Math.min(k, 12) * 0.05, 0.6));
			});
		}
		// Tutup selalu dari keadaan pas. Dulu zoom yang tertinggal dari sesi
		// sebelumnya nyasar ke bukaan berikutnya — petunjuknya bilang "perkecil"
		// padahal gambarnya belum diperbesar.
		zoomed = false;
	}
	function viewStep(d: number) {
		const curV = viewingRef;
		if (curV == null || !hotspots.length) return;
		// Navigasi bingkai hanya di dalam daerah yang sedang dibuka —
		// tidak loncat ke daerah lain.
		const n = hotspots[curV].photos.length;
		const f = Math.min(n - 1, Math.max(0, frameRef + d));
		frameRef = f;
		frame = f;
	}
	function gotoShot(v: number, f: number) {
		viewingRef = v;
		frameRef = f;
		viewing = v;
		frame = f;
		flyTo(v);
	}
	function resetOverview() {
		resetRef?.();
	}

	$effect(() => {
		if (viewing == null) return;
		const html = document.documentElement;
		const prev = html.style.overflow;
		html.style.overflow = "hidden";
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") closeViewer();
			else if (e.key === "ArrowRight") viewStep(1);
			else if (e.key === "ArrowLeft") viewStep(-1);
		};
		window.addEventListener("keydown", onKey);
		return () => {
			html.style.overflow = prev;
			window.removeEventListener("keydown", onKey);
		};
	});

	// Fokus dialog: begitu viewer buka, fokus pindah ke tombol tutup supaya
	// pengguna keyboard langsung "di dalam" dialog (Escape sudah ditangani
	// efek di atas); begitu tutup, fokus pulih ke elemen pemicunya — tidak
	// ditinggal menggantung di <body>.
	$effect(() => {
		if (viewing == null) return;
		const prev = document.activeElement as HTMLElement | null;
		dvCloseEl?.focus();
		return () => {
			if (prev?.isConnected) prev.focus();
		};
	});

	// Buka: foto muncul dalam keadaan terbakar (lanjutan dari peta yang
	// terbakar) lalu eksposurnya pulih ke normal; keterangan menyusul.
	$effect(() => {
		const root = dvRoot;
		if (!root) return;
		wrapEl?.classList.add("is-viewing");
		if (reduced) return;
		const stage = root.querySelector<HTMLElement>(".im-dv-stage");
		const img = dvImgWrap;
		const chrome = root.querySelectorAll<HTMLElement>(DV_CHROME);
		gsap.set(root, { backgroundColor: "#07090a" });
		gsap.set(chrome, { opacity: 0 });
		const fromBurn = openFromBurn;
		openFromBurn = false;
		const recover = fromBurn ? burn(stage, 1, 0, BURN_IN_S, "power2.out") : null;
		const tl = gsap.timeline();
		tl.fromTo(img ?? [], { scale: 1.14 }, { scale: 1.08, duration: 1.2, ease: "expo.out" }, 0).to(
			chrome,
			{ opacity: 1, duration: 0.45, ease: "power1.out", stagger: 0.04 },
			0.35,
		);
		return () => {
			tl.kill();
			recover?.kill();
		};
	});

	$effect(() => {
		const el = dvImgWrap;
		if (!el || reduced) return;
		panX = gsap.quickTo(el, "xPercent", { duration: 0.8, ease: "power3.out" });
		panY = gsap.quickTo(el, "yPercent", { duration: 0.8, ease: "power3.out" });
		return () => {
			panX = null;
			panY = null;
			gsap.set(el, { xPercent: 0, yPercent: 0 });
		};
	});

	// Skala bingkai foto viewer saat diam — tingkat ukuran HD dipilih untuk skala ini (fullscreenWidth overscan),
	// supaya foto tak tampil melebihi pikselnya. (Zoom 2,1× = kaca pembesar: melampaui file 5120 pun.)
	const DV_REST_SCALE = 1.08;
	$effect(() => {
		const el = dvImgWrap;
		if (!el) return;
		const scale = zoomed ? 2.1 : DV_REST_SCALE;
		if (reduced) gsap.set(el, { scale });
		else gsap.to(el, { scale, duration: 1.1, ease: "power3.out" });
	});

	$effect(() => {
		void viewing;
		void frame;
		zoomed = false;
	});

	$effect(() => {
		void viewing;
		void frame;
		const strip = dvStrip;
		const active = strip?.querySelector<HTMLElement>(".im-dv-thumb.is-active");
		if (!strip || !active) return;
		strip.scrollTo({
			left: active.offsetLeft - strip.clientWidth / 2 + active.clientWidth / 2,
			behavior: reduced ? "auto" : "smooth",
		});
	});

	function onMove(e: MouseEvent) {
		const el = dvStage;
		if (!el || reduced) return;
		const r = el.getBoundingClientRect();
		const nx = (e.clientX - r.left) / r.width - 0.5;
		const ny = (e.clientY - r.top) / r.height - 0.5;
		const room = zoomed ? 24 : 3;
		panX?.(-nx * room * 2);
		panY?.(-ny * room * 2);
	}

	const stats = $derived({
		points: hotspots.length,
		frames: hotspots.reduce((sum, h) => sum + h.photos.length, 0),
	});
	const hot = $derived(viewing != null ? hotspots[viewing] : null);
	const shot = $derived(hot ? hot.photos[Math.min(frame, hot.photos.length - 1)] : null);
	// Viewer layar penuh memakai file ASLI (tanpa watermark), diminta per foto
	// saat dibuka; selagi menunggu / bila gagal, pratinjau ber-watermark.
	// "" = sudah dicoba tapi tak tersedia.
	let originals = $state<Record<string, string>>({});
	/** URL file asli yang SUDAH selesai diunduh & didekode: tampil langsung (tanpa fade dari thumbnail buram). */
	const decodedUrls = new Set<string>();
	/**
	 * Unduh + dekode file asli foto lebih dulu. `maxMs` membatasi berapa lama pemanggil rela menunggu (jaringan
	 * lambat tak boleh menggantung tampilan); unduhan tetap berlanjut di latar dan tampil begitu siap.
	 */
	function preloadOriginal(id: string | undefined, maxMs: number): Promise<void> {
		if (!id) return Promise.resolve();
		return new Promise((resolve) => {
			const timer = maxMs > 0 ? window.setTimeout(resolve, maxMs) : 0;
			const done = () => {
				window.clearTimeout(timer);
				resolve();
			};
			if (maxMs <= 0) resolve();
			fetchPhotoOriginal(id, fullscreenWidth(DV_REST_SCALE))
				.then(async (url) => {
					if (url && !decodedUrls.has(url)) {
						try {
							// Teracak: berkas mozaik diunduh + didekode lewat cache penyusun — kanvas HD memakai hasil yang sama.
							if (isScrambledUrl(url)) await loadScrambledCached(url);
							else {
								const img = new Image();
								img.src = url;
								await img.decode();
							}
							decodedUrls.add(url);
						} catch {
							/* gagal dekode: pakai jalur biasa (fade dari thumbnail) */
						}
					}
					originals[id] = url ?? "";
				})
				.catch(() => {})
				.finally(done);
		});
	}
	// Bingkai di sebelahnya diunduh di latar, supaya berpindah foto pun langsung tajam.
	$effect(() => {
		if (viewing == null || !hot) return;
		const n = hot.photos.length;
		for (const f of [frame + 1, frame - 1]) {
			if (f >= 0 && f < n) void preloadOriginal(hot.photos[f]?.id, 0);
		}
	});
	// Meta foto untuk blok keterangan (judul + deskripsi + tombol detail).
	let shotMeta = $state<{ id: string; title: string; desc: string } | null>(null);
	$effect(() => {
		const id = viewing != null ? shot?.id : undefined;
		if (!id) {
			shotMeta = null;
			return;
		}
		let alive = true;
		shotMeta = null;
		void fetchPhotoById(id)
			.then((p) => {
				if (!alive || !p) return;
				shotMeta = { id: p.id, title: p.title[lang] || "", desc: p.desc?.[lang] || "" };
			})
			.catch(() => {});
		return () => {
			alive = false;
		};
	});
	$effect(() => {
		const id = viewing != null ? shot?.id : undefined;
		if (!id || id in originals) return;
		void fetchPhotoOriginal(id, fullscreenWidth(DV_REST_SCALE)).then((url) => {
			originals[id] = url ?? "";
		});
	});
	// Tunggu jawaban file asli dulu (jangan kedipkan versi watermark di
	// antaranya); baru jatuh ke pratinjau bila memang tak tersedia.
	const shotHd = $derived.by(() => {
		if (!shot) return undefined;
		if (!shot.id) return shot.hdUrl;
		const o = originals[shot.id];
		return o === undefined ? undefined : o || shot.hdUrl;
	});
</script>

<!-- Smear horizontal untuk transisi "terbakar" (lihat paintBurn). -->
<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false">
	<filter id="im-burn-smear" x="-8%" y="-8%" width="116%" height="116%" color-interpolation-filters="sRGB">
		<!-- Smear horizontal, lalu kanal merah & biru digeser berlawanan
			(pecahan warna di tepi objek, seperti film yang meloncat). -->
		<feGaussianBlur bind:this={smearEl} in="SourceGraphic" stdDeviation="0 0" result="blur" />
		<feColorMatrix in="blur" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="r" />
		<feOffset bind:this={splitREl} in="r" dx="0" dy="0" result="ro" />
		<feColorMatrix in="blur" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="g" />
		<feColorMatrix in="blur" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="b" />
		<feOffset bind:this={splitBEl} in="b" dx="0" dy="0" result="bo" />
		<feBlend in="ro" in2="g" mode="screen" result="rg" />
		<feBlend in="rg" in2="bo" mode="screen" />
	</filter>
</svg>
<!-- Garis scan vertikal di atas segalanya selama transisi terbakar. -->
<div bind:this={linesEl} class="im-burn-lines" aria-hidden="true"></div>
<section bind:this={sectionEl} id="peta" class="on-darkroom relative">
	<div
		bind:this={wrapEl}
		class="im-wrap relative h-[100svh] min-h-[560px] w-full overflow-hidden"
	>
		<div bind:this={stageEl} class="im-stage">
			{#if bare}
				{@render backdrop?.()}
			{:else}
				<div
					aria-hidden="true"
					class="im-fallback"
					style="background-image: url('{IM_FALLBACK}');"
				></div>
			{/if}
			<div bind:this={mapEl} class="im-canvas"></div>
		</div>

		<div class="im-vignette" aria-hidden="true"></div>
		<div class="im-grain" aria-hidden="true"></div>

		<div class="im-hud">

			<div class="im-cluster im-reveal" data-no-hover-sound data-no-click-sound>
				{#if touchDevice}
					<button
						type="button"
						onclick={togglePan}
						aria-pressed={panOn}
						aria-label={panOn ? t.panOff : t.panOn}
						title={panOn ? t.panOff : t.panOn}
						class="im-round {panOn ? "is-on" : ""}"
					>
						{#if panOn}
							<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
								<rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" />
							</svg>
						{:else}
							<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
								<path d="M12 3v18M3 12h18M12 3l-3 3M12 3l3 3M12 21l-3-3M12 21l3-3M3 12l3-3M3 12l3 3M21 12l-3-3M21 12l-3 3" />
							</svg>
						{/if}
					</button>
				{/if}
			<button
				type="button"
				onclick={() => zoomStep(1)}
				aria-label={t.zoomIn}
				title={t.zoomIn}
				class="im-round"
			>
				<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
			</button>
			<button
				type="button"
				onclick={() => zoomStep(-1)}
				aria-label={t.zoomOut}
				title={t.zoomOut}
				class="im-round"
			>
				<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><path d="M5 12h14" /></svg>
			</button>
			<button
				type="button"
				onclick={resetOverview}
				aria-label={t.overview}
				title={t.overview}
				class="im-round"
			>
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
						<circle cx="12" cy="12" r="9" /><path d="M12 3c3 3.5 3 14 0 18M12 3c-3 3.5-3 14 0 18M3 12h18" />
					</svg>
			</button>
		</div>

			<div class="im-slate im-reveal" {@attach pauseOffscreen()}>
				<p class="im-mono im-slate-kicker"><span class="im-live-dot"></span>{t.kicker}</p>
				<h2 class="im-title">{t.title}</h2>
				<p class="im-lede">{t.sub}</p>
				{#if stats.points}
					<p class="im-mono im-slate-stats">{stats.points} {t.points} · {stats.frames} {t.frames}</p>
				{/if}
			</div>

			<p class="im-hint im-mono im-reveal {dragged ? "is-done" : ""}">
				{touchDevice && !panOn ? t.panHint : t.explore}
			</p>
		</div>

		{#if viewing != null && hot && shot}
			<div bind:this={dvRoot} class="im-dv" role="dialog" aria-modal="true" aria-label={hot.name} data-no-hover-sound data-no-click-sound>
				<div
					bind:this={dvStage}
					class="im-dv-stage {zoomed ? "is-zoomed" : ""}"
					onmousemove={onMove}
					onclick={() => (zoomed = !zoomed)}
				>
					<div bind:this={dvImgWrap} class="im-dv-imgwrap">
						<!-- Thumbnail tampil seketika; file HD menyusul di atasnya
							begitu termuat (memudar masuk). -->
						<ApiImage
							src={imgFor(shot.seed, 2000, 1400, shot.thumbUrl)}
							alt={shot.caption[lang]}
							fill
							eager
							class="object-cover"
						/>
						{#if shotHd}
							{#key shotHd}
								{#if isScrambledUrl(shotHd)}
									<!-- File HD teracak → disusun ke kanvas seukuran tier-nya (event load sesudah tersusun). -->
									<canvas
										use:scrambled={{ src: shotHd, eager: true, priority: "high" }}
										aria-hidden="true"
										class="im-dv-hd"
										class:is-ready={hdLoaded === shotHd || (!!shotHd && decodedUrls.has(shotHd))}
										onload={() => (hdLoaded = shotHd ?? "")}
									></canvas>
								{:else}
									<img
										src={shotHd}
										alt=""
										aria-hidden="true"
										decoding="async"
										class="im-dv-hd"
										class:is-ready={hdLoaded === shotHd || (!!shotHd && decodedUrls.has(shotHd))}
										onload={() => (hdLoaded = shotHd ?? "")}
									/>
								{/if}
							{/key}
						{/if}
					</div>
				</div>

				<div class="im-dv-veil" aria-hidden="true"></div>

				<p class="im-hint im-mono im-dv-hint">{zoomed ? t.zoomOutHint : t.zoomHint}</p>

				<button
					type="button"
					bind:this={dvCloseEl}
					onclick={() => {
						// Penampil ditandai data-no-click-sound (peta senyap), tapi tombol tutup sengaja berbunyi.
						playScrambleClick();
						closeViewer();
					}}
					data-no-hover-sound
					class="im-round im-dv-close"
					aria-label={t.close}
				>
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true">
						<path d="M6 6l12 12M18 6L6 18" />
					</svg>
				</button>


				<div class="im-dv-info">
				<div class="im-dv-meta im-mono">
					<span class="im-dv-meta-name">{splitPlace(hot.name).place}</span>
					{#if splitPlace(hot.name).region}
						<span class="im-dv-meta-sep">/</span>
						<span>{splitPlace(hot.name).region}</span>
					{/if}
					<span class="im-dv-meta-sep">/</span>
					<span>
						{t.frame} {String(frame + 1).padStart(2, "0")}/
						{String(hot.photos.length).padStart(2, "0")}
					</span>
					<span class="im-dv-meta-sep">/</span>
					<span>{catLabel[hot.cat][lang]}</span>
				</div>

				<div class="im-dv-cap">
					{#if shotMeta?.id}
						<a href={`/photos/${shotMeta.id}`} class="im-dv-caption im-dv-caption--link">
							{shotMeta.title || shot.caption[lang]}
						</a>
					{:else}
						<p class="im-dv-caption">{shot.caption[lang]}</p>
					{/if}
					{#if shotMeta?.desc}
						<p class="im-dv-desc">{shotMeta.desc}</p>
					{/if}
				</div>
				</div>

				<div class="im-dv-strip-wrap" data-no-hover-sound data-no-click-sound>
					<div bind:this={dvStrip} class="im-dv-strip">
						{#if hot}
							<div class="im-dv-group">
								<p class="im-dv-grouplabel im-mono">{splitPlace(hot.name).place}</p>
								<div class="im-dv-thumbs">
									{#each hot.photos as s, si (`${viewing}-${si}`)}
										{@const thumb = imgFor(s.seed, 160, 120, s.thumbUrl)}
										<button
											type="button"
											onclick={() => viewing != null && gotoShot(viewing, si)}
											class="im-dv-thumb {si === frame ? "is-active" : ""}"
											aria-label={s.caption[lang]}
											aria-current={si === frame ? "true" : undefined}
										>
											{#if isScrambledUrl(thumb)}
												<!-- Gaya = `.im-dv-thumb img` di app.css (selektor itu hanya mengenai <img>). -->
												<canvas
													use:smallScrambled={thumb}
													aria-hidden="true"
													style="width: 100%; height: 100%; object-fit: cover;"
												></canvas>
											{:else}
												<img src={thumb} alt="" loading="lazy" />
											{/if}
										</button>
									{/each}
								</div>
							</div>
						{/if}
					</div>
				</div>
			</div>
		{/if}
	</div>
</section>
