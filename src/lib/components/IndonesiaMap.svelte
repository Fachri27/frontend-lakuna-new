<script lang="ts">
	import mlWorkerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
	import gsap from "gsap";
	import { playShutter, primeShutter } from "$lib/shutter";
	import { ScrollTrigger } from "gsap/ScrollTrigger";
	// Stylesheet dasar MapLibre (kanvas, marker, kontrol atribusi). Override
	// tampilan ada di app.css (`.im-wrap .maplibregl-*`).
	import "maplibre-gl/dist/maplibre-gl.css";
	import type { Snippet } from "svelte";
	import { polarCapsLayer } from "$lib/polarCaps";
	import { nightTile, nightTileUrl, type NightMode } from "$lib/nightTiles";
	import { i18n } from "$lib/i18n.svelte";
	import { catLabel, fetchMapHotspots, fetchPhotoOriginal, imgFor, type MapHotspot } from "$lib/data";
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
	const NIGHT_MODES: { id: string; mode: NightMode; key: string }[] = [
		{ id: "nightFull", mode: "full", key: "nightFull" },
		{ id: "nightWest", mode: "west", key: "nightWest" },
		{ id: "nightEast", mode: "east", key: "nightEast" },
	];
	// "zoom" hanya boleh jadi masukan interpolate/step tingkat teratas, jadi state
	// global ada di NILAI keluarannya: sepenuhnya terlihat sampai zoom 3.7, memudar
	// ke 0 di zoom 4.3.
	const nightOpacityExpr = (key: string) =>
		[
			"interpolate",
			["linear"],
			["zoom"],
			3.7,
			["coalesce", ["global-state", key], 0],
			4.3,
			0,
		] as unknown as number;

	const TILE_URL = (z: number, x: number, y: number) =>
		`https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`;

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
		let nearIo: IntersectionObserver | null = null;
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
			});
			if (disposed) return;
			const ml = await import("maplibre-gl");
			// MapLibre 6 mencari worker lewat nama berkas dinamis — bundler tak
			// bisa mengikutkannya, jadi di build produksi peta gagal ("Worker
			// failed to load"). Worker diimpor eksplisit lewat ?worker&url (Vite
			// membundel beserta dependensinya), berlaku di dev & produksi.
			ml.setWorkerUrl(mlWorkerUrl);
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

			const mm = new ml.Map({
				container: el,
				style: {
					version: 8,
					projection: { type: "globe" },
					// Kekuatan overlay malam (diatur lewat setNightMix); 0 = siang.
					state: {
						nightFull: { default: 0 },
						nightWest: { default: 0 },
						nightEast: { default: 0 },
					},
					sources: {
						esri: {
							type: "raster",
							tiles: [
								"https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
							],
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
							id: "esri",
							type: "raster",
							source: "esri",
							// Transisi antar-level lebih cepat: ubin tajam cepat menggantikan
							// ubin kasar yang sementara ditampilkan.
							paint: {
								"raster-fade-duration": 150,
								// Di kamera globe (zoom rendah) citra dekat kutub diregang
								// Mercator dan tampak rata; kontras + saturasi menonjolkan
								// tekstur yang ada. Memudar ke 0 sebelum bingkai Nusantara
								// (zoom ±4.4), jadi warna peta mendarat tak berubah.
								"raster-contrast": ["interpolate", ["linear"], ["zoom"], 2, 0.28, 3.6, 0.2, 4.2, 0],
								"raster-saturation": ["interpolate", ["linear"], ["zoom"], 2, 0.15, 3.6, 0.1, 4.2, 0],
							},
						},
						...NIGHT_MODES.map((m) => ({
							id: m.id,
							type: "raster" as const,
							source: m.id,
							// Tersembunyi (tak memuat ubin) sampai hero pertama kali terlihat.
							layout: { visibility: "none" as const },
							maxzoom: 4.4,
							paint: {
								"raster-fade-duration": 150,
								"raster-opacity": nightOpacityExpr(m.key),
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
			phase = bare ? "hero" : "landed";
			// Kutub bercitra asli (lihat $lib/polarCaps): menutup celah di atas
			// ±85° tempat citra dunia berhenti, jadi bumi bisa dijelajahi utuh.
			mm.on("load", () => {
				try {
					mm.addLayer(polarCapsLayer());
				} catch (e) {
					if (import.meta.env.DEV) console.warn("[polar-caps]", e);
				}
			});


			const overviewCamera = () => {
				// cameraForBounds ikut menghitung padding kamera yang AKTIF. Di
				// kamera hero padding atasnya lebih besar dari layar (pusat bumi di
				// bawah layar), jadi sisa ruangnya negatif dan hitungannya gagal.
				// Nol-kan sebentar, hitung, kembalikan — sinkron, tak ada frame
				// yang tergambar di antaranya.
				const prevPad = mm.getPadding();
				const padded = prevPad.top || prevPad.bottom || prevPad.left || prevPad.right;
				if (padded) mm.setPadding(NO_PAD);
				const cam = mm.cameraForBounds(
					[
						[NUSANTARA[0][1], NUSANTARA[0][0]],
						[NUSANTARA[1][1], NUSANTARA[1][0]],
					],
					{ padding: overviewFit(el) },
				);
				if (padded) mm.setPadding(prevPad);
				return {
					center: cam?.center ?? ([118, -2.4] as [number, number]),
					zoom: cam?.zoom ?? 4,
					bearing: 0,
					pitch: 0,
					padding: NO_PAD,
				};
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
			let zoomBase = 0;
			const landedMinZoom = () => {
				if (!zoomBase) zoomBase = mm.getZoom();
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
			const roll = (now: number) => {
				raf = requestAnimationFrame(roll);
				const dt = Math.min(0.1, (now - last) / 1000);
				last = now;
				if (phase !== "hero" || document.hidden) return;
				if (rollOn && !reduced) {
					rollT += dt;
					heroLat = HERO_LAT_TO + (HERO_LAT_FROM - HERO_LAT_TO) * Math.exp(-rollT / HERO_ROLL_TAU);
				}
				// Bumi mengejar kursor dengan kelembaman — terasa berat, bukan
				// menempel.
				const k = 1 - Math.exp(-dt / PTR_TAU);
				ptrX += (ptrAimX - ptrX) * k;
				ptrY += (ptrAimY - ptrY) * k;
				mm.jumpTo(heroCamera(el, heroLat, heroLift));
			};
			if (bare) raf = requestAnimationFrame(roll);

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
				const t0 = performance.now();
				const seq = ++diveSeq;
				const step = (now: number) => {
					if (seq !== diveSeq || phase !== "diving") return;
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
					return;
				}
				mm.easeTo({ ...cam, duration: ms, easing: ease3, essential: true });
				mm.once("moveend", () => {
					if (phase === "rising") phase = "hero";
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
				d.innerHTML = `<span class="im-mk im-mk-plate ${extraClass}">
						<span class="im-mk-plate-inner">
							<span class="im-mk-plate-img ${url ? "" : "is-empty"}">${url ? `<img src="${url}" alt="" decoding="async" draggable="false" />` : ""}</span>
							<span class="im-mk-plate-glyph">${glyph}</span>
							${PLATE_BRACKETS}
						</span>
						${label}
					</span>`;
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
				if (sig === lastSig) return;
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
							// petunjuk di bawah) + ruang untuk plate dan labelnya.
							const fit = overviewFit(el);
							mm.fitBounds(
								[
									[Math.min(...lngs), Math.min(...lats)],
									[Math.max(...lngs), Math.max(...lats)],
								],
								{
									padding: {
										top: fit.top + plate.h,
										left: fit.left + plate.w,
										bottom: fit.bottom + plate.h,
										right: fit.right + plate.w * 2.5,
									},
									maxZoom: CLUSTER_MAX_Z,
									duration: FLY_DUR * 1000,
								},
							);
						}
					});
					clusterMarkers.push(
						new ml.Marker({ element: node, anchor: "center", opacityWhenCovered: "0" }).setLngLat(mm.unproject([c.x, c.y])).addTo(mm),
					);
				}
				applyFocusClasses();
			};
			mm.on("zoomend", recluster);
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
			// Kotak foto memudar selama kamera bergerak (drag/fly/zoom),
			// muncul lagi saat berhenti — seperti marker di referensi.
			mm.on("movestart", () => {
				if (phase === "landed") el.classList.add("is-moving");
			});
			mm.on("moveend", () => {
				el.classList.remove("is-moving");
				if (phase === "landed") syncFocus();
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
					zoomBase = cam.zoom;
					mm.setMinZoom(Math.max(0, zoomBase - LANDED_ZOOM_OUT));
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
			nearIo?.disconnect();
			cancelAnimationFrame(raf);
			ro?.disconnect();
			reclusterRef = null;
			diveRef = null;
			riseRef = null;
			setInteractiveRef = null;
			resetRef = null;
			landedRef = null;
			gestureCleanup?.();
			gestureCleanup = null;
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
		riseRef?.(ms);
	}
	/** Pendaratan selesai: peta interaktif, titik digabung di bingkai akhir. */
	export function landed() {
		if (!landedRef) {
			pendingLanded = true;
			return;
		}
		landedRef();
		setInteractiveRef?.(true);
	}
	/** Jeda/lanjutkan gelinding bumi di kamera hero. */
	export function setSpin(on: boolean) {
		rollOn = on;
	}
	/** Posisi kursor di hero, ternormalisasi −0.5..0.5 (0 = tengah layar). */
	export function setPointer(nx: number, ny: number) {
		ptrAimX = reduced ? 0 : nx;
		ptrAimY = reduced ? 0 : ny;
	}
	/** Turunkan bumi hero (px, positif = lebih rendah) untuk animasi masuk. */
	export function setHeroLift(px: number) {
		heroLift = px;
	}
	/**
	 * Kekuatan overlay malam (0..1): penuh / sisi barat / sisi timur. Dipanggil
	 * jam siklus siang–malam di MapDescent. Panggilan pertama menampakkan lapisan
	 * (ubin baru mulai dimuat), jadi baru dipanggil ketika hero terlihat.
	 */
	let nightReveal = false;
	let nightLast = "";
	export function setNightMix(full: number, west: number, east: number) {
		const mm = map;
		if (!mm || !mm.getLayer("nightFull")) return;
		if (!nightReveal) {
			nightReveal = true;
			for (const m of NIGHT_MODES) mm.setLayoutProperty(m.id, "visibility", "visible");
		}
		const v = [full, west, east].map((n) => Math.min(1, Math.max(0, n)));
		const sig = v.map((n) => n.toFixed(2)).join("|");
		if (sig === nightLast) return;
		nightLast = sig;
		NIGHT_MODES.forEach((m, i) => (mm as unknown as { setGlobalStateProperty: (k: string, v: unknown) => void }).setGlobalStateProperty(m.key, v[i]));
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
			if (stage) gsap.set(stage, { scale: 1, filter: "blur(0px)", opacity: 1 });
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
		// Peta terbakar dulu, lalu CUT ke foto (peta dipulihkan di balik layar).
		burn(stageEl, 0, 1, BURN_OUT_S, "power2.in", BURN_HOLD_S).then(() => {
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
	const DV_CHROME = ".im-dv-meta, .im-dv-caption, .im-dv-hint, .im-dv-close, .im-dv-veil, .im-dv-strip-wrap";
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

	$effect(() => {
		const el = dvImgWrap;
		if (!el) return;
		const scale = zoomed ? 2.1 : 1.08;
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
	$effect(() => {
		const id = viewing != null ? shot?.id : undefined;
		if (!id || id in originals) return;
		void fetchPhotoOriginal(id).then((url) => {
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

			<div class="im-cluster im-reveal">
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

			<div class="im-slate im-reveal">
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
			<div bind:this={dvRoot} class="im-dv" role="dialog" aria-modal="true" aria-label={hot.name}>
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
								<img
									src={shotHd}
									alt=""
									aria-hidden="true"
									decoding="async"
									class="im-dv-hd"
									class:is-ready={hdLoaded === shotHd}
									onload={() => (hdLoaded = shotHd ?? "")}
								/>
							{/key}
						{/if}
					</div>
				</div>

				<div class="im-dv-veil" aria-hidden="true"></div>

				<p class="im-hint im-mono im-dv-hint">{zoomed ? t.zoomOutHint : t.zoomHint}</p>

				<button
					type="button"
					bind:this={dvCloseEl}
					onclick={closeViewer}
					data-no-hover-sound
					class="im-round im-dv-close"
					aria-label={t.close}
				>
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true">
						<path d="M6 6l12 12M18 6L6 18" />
					</svg>
				</button>


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

				<p class="im-dv-caption">{shot.caption[lang]}</p>

				<div class="im-dv-strip-wrap" data-no-hover-sound data-no-click-sound>
					<div bind:this={dvStrip} class="im-dv-strip">
						{#if hot}
							<div class="im-dv-group">
								<p class="im-dv-grouplabel im-mono">{splitPlace(hot.name).place}</p>
								<div class="im-dv-thumbs">
									{#each hot.photos as s, si (`${viewing}-${si}`)}
										<button
											type="button"
											onclick={() => viewing != null && gotoShot(viewing, si)}
											class="im-dv-thumb {si === frame ? "is-active" : ""}"
											aria-label={s.caption[lang]}
											aria-current={si === frame ? "true" : undefined}
										>
											<img src={imgFor(s.seed, 160, 120, s.thumbUrl)} alt="" loading="lazy" />
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
