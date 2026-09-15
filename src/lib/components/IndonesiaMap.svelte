<script lang="ts">
	import gsap from "gsap";
	import { playShutter, primeShutter } from "$lib/shutter";
	import { ScrollTrigger } from "gsap/ScrollTrigger";
	// Stylesheet dasar Leaflet. Wajib: tanpa ini pane dan tile tetap
	// `position: static`, jadi ubinnya menumpuk memanjang ke bawah alih-alih
	// menyusun peta — petanya tampak hitam dengan satu ubin nyasar di tengah.
	// Override tampilan ada di app.css (`.im-wrap .leaflet-*`), spesifisitasnya
	// lebih tinggi jadi tetap menang berapa pun urutan muatnya.
	import "leaflet/dist/leaflet.css";
	import { i18n } from "$lib/i18n.svelte";
	import { catLabel, fetchMapHotspots, imgFor, type MapHotspot } from "$lib/data";
	import ApiImage from "./ApiImage.svelte";

	gsap.registerPlugin(ScrollTrigger);

	const copy = {
		id: {
			kicker: "Kartu Nusantara",
			title: "Dari Sabang ke Merauke",
			sub: "Tiap titik adalah bingkai dari arsip Lakuna. Geser peta, lalu buka satu titik untuk melihat fotonya.",
			overview: "Ringkasan",
			points: "titik",
			frames: "bingkai",
			explore: "Geser untuk menjelajah · klik titik untuk membuka",
			zoomHint: "Klik untuk perbesar · Gerakkan tetikus untuk menggeser",
			zoomOutHint: "Klik untuk perkecil · Gerakkan tetikus untuk menggeser",
			fullscreen: "Layar penuh",
			exit: "Keluar dari layar penuh",
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
			kicker: "Archipelago map",
			title: "From Sabang to Merauke",
			sub: "Every point is a frame from the Lakuna archive. Drag the map, then open a point to see its photos.",
			overview: "Overview",
			points: "points",
			frames: "frames",
			explore: "Drag to explore · click a point to open",
			zoomHint: "Tap to zoom in · Move mouse to pan",
			zoomOutHint: "Tap to zoom out · Move mouse to pan",
			fullscreen: "Fullscreen",
			exit: "Exit fullscreen",
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

	const FALLBACK_HOTSPOTS: Hotspot[] = [
		{ name: "Sabang", lat: 5.9, lng: 95.3, cat: "nature",
			desc: { id: "Pulau paling barat Indonesia — titik nol Nusantara.", en: "Indonesia's westernmost island — the zero point of the archipelago." },
			photos: [
				{ seed: "nus-sabang-1", caption: { id: "Titik nol Nusantara di Pulau Weh.", en: "Zero kilometer of the archipelago on Weh Island." } },
				{ seed: "nus-sabang-2", caption: { id: "Terumbu karang di Selat Sabang.", en: "Coral gardens in the Sabang Strait." } },
				{ seed: "nus-sabang-3", caption: { id: "Mercusuar tua menghadap Samudra Hindia.", en: "An old lighthouse facing the Indian Ocean." } },
			] },
		{ name: "Danau Toba", lat: 2.6, lng: 98.8, cat: "nature",
			desc: { id: "Kaldera raksasa dengan pulau vulkanik di tengah Sumatra.", en: "A giant caldera with a volcanic island at the heart of Sumatra." },
			photos: [
				{ seed: "nus-toba-1", caption: { id: "Kaldera raksasa dari ketinggian.", en: "The giant caldera from above." } },
				{ seed: "nus-toba-2", caption: { id: "Pulau Samosir di tengah danau.", en: "Samosir Island at the lake's heart." } },
				{ seed: "nus-toba-3", caption: { id: "Rumah Batak tradisional di tepi air.", en: "Traditional Batak houses by the water." } },
			] },
		{ name: "Jakarta", lat: -6.2, lng: 106.8, cat: "urban",
			desc: { id: "Detak urban padat dan cahaya malam ibu kota.", en: "The dense urban pulse and night lights of the capital." },
			photos: [
				{ seed: "nus-jakarta-1", caption: { id: "Bundaran HI saat senja.", en: "Bundaran HI at dusk." } },
				{ seed: "nus-jakarta-2", caption: { id: "Gang sempit di kota padat.", en: "A narrow alley in the dense city." } },
				{ seed: "nus-jakarta-3", caption: { id: "Pelabuhan tua Sunda Kelapa.", en: "The old Sunda Kelapa harbor." } },
				{ seed: "nus-jakarta-4", caption: { id: "Hujan malam dan neon.", en: "Night rain and neon." } },
			] },
		{ name: "Bali", lat: -8.4, lng: 115.2, cat: "travel",
			desc: { id: "Ladang berundak, puri, dan garis pantai yang dibingkai senja.", en: "Terraced fields, temples, and coastlines framed by dusk." },
			photos: [
				{ seed: "nus-bali-1", caption: { id: "Ladang berundak Jatiluwih.", en: "Jatiluwih terraced fields." } },
				{ seed: "nus-bali-2", caption: { id: "Pura di tepi tebing Uluwatu.", en: "A temple on the Uluwatu cliffs." } },
				{ seed: "nus-bali-3", caption: { id: "Ombak Tanah Lot menjelang malam.", en: "Waves at Tanah Lot before night." } },
			] },
		{ name: "Komodo", lat: -8.5, lng: 119.5, cat: "nature",
			desc: { id: "Pulau naga dengan perairan jernih dan tebing terjal.", en: "Island of dragons with clear waters and steep cliffs." },
			photos: [
				{ seed: "nus-komodo-1", caption: { id: "Komodo di padang savana.", en: "A dragon on the savanna." } },
				{ seed: "nus-komodo-2", caption: { id: "Pink Beach dari bukit.", en: "Pink Beach from the hill." } },
				{ seed: "nus-komodo-3", caption: { id: "Perairan jernih Taman Nasional.", en: "Clear waters of the national park." } },
			] },
		{ name: "Makassar", lat: -5.1, lng: 119.4, cat: "urban",
			desc: { id: "Pelabuhan dan perlintasan ramai Selat Makassar.", en: "Harbors and the busy crossings of the Makassar Strait." },
			photos: [
				{ seed: "nus-makassar-1", caption: { id: "Pelabuhan Paotere saat fajar.", en: "Paotere harbor at dawn." } },
				{ seed: "nus-makassar-2", caption: { id: "Jembatan dan lalu lintas Selat.", en: "Bridges and strait traffic." } },
				{ seed: "nus-makassar-3", caption: { id: "Pasar tradisional yang ramai.", en: "A bustling traditional market." } },
			] },
		{ name: "Manado", lat: 1.5, lng: 124.8, cat: "nature",
			desc: { id: "Bunaken dan dasar laut khatulistiwa di utara.", en: "Bunaken and the equatorial seabeds of the north." },
			photos: [
				{ seed: "nus-manado-1", caption: { id: "Taman laut Bunaken.", en: "The Bunaken marine park." } },
				{ seed: "nus-manado-2", caption: { id: "Tebing karang bawah laut.", en: "Underwater coral walls." } },
				{ seed: "nus-manado-3", caption: { id: "Bukit Minahasa di pagi hari.", en: "Minahasa hills in the morning." } },
			] },
		{ name: "Ternate", lat: 0.8, lng: 127.4, cat: "travel",
			desc: { id: "Gunung berapi berpuncak awan dan benteng rempah.", en: "A cloud-capped volcano and an old spice fortress." },
			photos: [
				{ seed: "nus-ternate-1", caption: { id: "Gunung Gamalama berpuncak awan.", en: "Cloud-capped Mount Gamalama." } },
				{ seed: "nus-ternate-2", caption: { id: "Benteng Tolukko peninggalan rempah.", en: "Tolukko Fort, a spice-era relic." } },
				{ seed: "nus-ternate-3", caption: { id: "Pantai timur pulau vulkanik.", en: "The eastern shore of the volcanic isle." } },
			] },
		{ name: "Raja Ampat", lat: -0.5, lng: 130.5, cat: "travel",
			desc: { id: "Karst hijau menjulang di atas laguna pirus.", en: "Green karst towering over turquoise lagoons." },
			photos: [
				{ seed: "nus-rajaampat-1", caption: { id: "Karst Wayag dari udara.", en: "The Wayag karst from above." } },
				{ seed: "nus-rajaampat-2", caption: { id: "Laguna pirus di antara pulau.", en: "Turquoise lagoons between isles." } },
				{ seed: "nus-rajaampat-3", caption: { id: "Kampung di tepi karang.", en: "A village on the reef's edge." } },
				{ seed: "nus-rajaampat-4", caption: { id: "Matahari tenggelam di Fam.", en: "Sunset over the Fam islands." } },
			] },
		{ name: "Sorong", lat: -0.9, lng: 131.3, cat: "travel",
			desc: { id: "Gerbang barat menuju kepulauan Raja Ampat.", en: "The western gateway to the Raja Ampat islands." },
			photos: [
				{ seed: "nus-sorong-1", caption: { id: "Gerbang pelabuhan menuju Raja Ampat.", en: "The harbor gateway to Raja Ampat." } },
				{ seed: "nus-sorong-2", caption: { id: "Pasar ikan di pinggir kota.", en: "A fish market on the town's edge." } },
				{ seed: "nus-sorong-3", caption: { id: "Matahari terbit di ujung barat.", en: "Sunrise at the western edge." } },
			] },
		{ name: "Jayapura", lat: -2.6, lng: 140.7, cat: "urban",
			desc: { id: "Teluk dan perbukitan di ujung timur negeri.", en: "A bay and hills at the eastern edge of the nation." },
			photos: [
				{ seed: "nus-jayapura-1", caption: { id: "Teluk Yos Sudarso dari bukit.", en: "Yos Sudarso Bay from the hills." } },
				{ seed: "nus-jayapura-2", caption: { id: "Pasar Hamadi di pagi hari.", en: "Hamadi market in the morning." } },
				{ seed: "nus-jayapura-3", caption: { id: "Perbukitan Danau Sentani.", en: "The hills around Lake Sentani." } },
			] },
		{ name: "Merauke", lat: -8.5, lng: 139.4, cat: "nature",
			desc: { id: "Pantai selatan dan sabana timur — ujung Nusantara.", en: "Southern coast and eastern savanna — the end of Nusantara." },
			photos: [
				{ seed: "nus-merauke-1", caption: { id: "Sabana Wasur di musim kemarau.", en: "Wasur savanna in the dry season." } },
				{ seed: "nus-merauke-2", caption: { id: "Pantai selatan ujung Nusantara.", en: "The southern coast at the end of Nusantara." } },
				{ seed: "nus-merauke-3", caption: { id: "Kanguru liar di padang.", en: "Wild wallabies on the plain." } },
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
	const FOCUS_Z = 7;
	const FLY_DUR = 0.9;

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
			paddingTopLeft: [side, Math.round(h * (narrow ? 0.3 : 0.26))] as [number, number],
			paddingBottomRight: [side, Math.round(h * (narrow ? 0.12 : 0.1))] as [number, number],
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
		try {
			const base = new URL(import.meta.env.VITE_API_URL || "http://localhost:3000");
			if (h === base.hostname.toLowerCase()) return true;
		} catch {
			/* abaikan — allowlist statis di atas tetap berlaku */
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

	function timecode(i: number): string {
		const t = 102 + i * 437;
		const h = Math.floor(t / 3600);
		const m = Math.floor((t % 3600) / 60);
		const s = t % 60;
		return `T+${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
	}

	function fmtCoord(lat: number, lng: number): string {
		const la = `${Math.abs(lat).toFixed(2)}°${lat >= 0 ? "N" : "S"}`;
		const lo = `${Math.abs(lng).toFixed(2)}°${lng >= 0 ? "E" : "W"}`;
		return `${la} · ${lo}`;
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

	let ready = $state(false);
	let isFs = $state(false);
	let reduced = $state(false);
	let focus = $state(0);
	let dragged = $state(false);
	let viewing = $state<number | null>(null);
	let frame = $state(0);
	let hotspots = $state<Hotspot[]>([]);
	let zoomed = $state(false);

	let focusRef = 0;
	let viewingRef: number | null = null;
	let frameRef = 0;
	let map: import("leaflet").Map | null = null;
	let markers: import("leaflet").Marker[] = [];
	let clusterMarkers: import("leaflet").Marker[] = [];
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
		let m: import("leaflet").Map | null = null;
		let ro: ResizeObserver | null = null;
		ready = false;
		(async () => {
			const L = await import("leaflet");
			const el = mapEl;
			if (disposed || !el) return;
			const mm = L.map(el, {
				zoomControl: false,
				attributionControl: true,
				scrollWheelZoom: false,
				doubleClickZoom: true,
				dragging: true,
				inertia: true,
				inertiaDeceleration: 2400,
				touchZoom: true,
				keyboard: true,
				// Cukup rendah supaya HP tegak tetap bisa memuat Sabang → Merauke utuh.
				minZoom: 3,
				maxZoom: 16,
				zoomSnap: 0,
				zoomDelta: 0.25,
				maxBounds: L.latLngBounds([-34, 66], [32, 174]),
				maxBoundsViscosity: 0.35,
				worldCopyJump: false,
			});
			m = mm;
			mm.fitBounds(NUSANTARA, overviewFit(el));

			L.tileLayer(
				"https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
				{
					attribution: "Imagery &copy; Esri, Maxar, Earthstar Geographics",
					maxZoom: 16,
					keepBuffer: 4,
				},
			).addTo(mm);

			preloads = preloadTiles([[-11, 90], [8, 144]], Math.max(3, Math.floor(mm.getZoom())));

			const plateUrls = await Promise.all(hotspots.map(resolvePlateUrl));
			if (disposed) return;

			const plate = plateSize();
			const plateIcon = (url: string, glyph: string, label: string, extraClass = "") =>
				L.divIcon({
					className: "im-mk-wrap",
					html: `<span class="im-mk im-mk-plate ${extraClass}">
						<span class="im-mk-plate-inner">
							<span class="im-mk-plate-img ${url ? "" : "is-empty"}" style="${url ? `background-image:url('${url}')` : ""}"></span>
							<span class="im-mk-plate-glyph">${glyph}</span>
							${PLATE_BRACKETS}
						</span>
						${label}
					</span>`,
					iconSize: [plate.w, plate.h],
					iconAnchor: [plate.w / 2, plate.h / 2],
				});

			hotspots.forEach((h, i) => {
				const count = h.photos.length;
				// Plate = bingkai pertama yang termuat. Jenis isi dibaca dari glyph:
				// tumpukan = galeri, panorama = beberapa bingkai, bingkai = titik tunggal.
				const glyph = count >= 4 ? GLYPH_STACK : count >= 2 ? GLYPH_PANO : GLYPH_POINT;
				const num = String(i + 1).padStart(2, "0");
				const label = `<span class="im-mk-label"><span class="im-mk-name">${escapeHtml(splitPlace(h.name).place)}</span><span class="im-mk-num">${num}</span></span>`;
				const mk = L.marker([h.lat, h.lng], {
					icon: plateIcon(plateUrls[i], glyph, label),
					title: h.name,
					riseOnHover: true,
					keyboard: false,
				}).addTo(mm);
				mk.on("click", () => openViewer(i));
				markers[i] = mk;
			});

			// Titik yang bertumpuk di layar (mis. sepuluh kota Jawa Barat pada zoom
			// ringkasan) digabung jadi satu plate bertanda jumlah. Klik → kamera
			// mendekat ke anggotanya sampai mereka terurai sendiri.
			let lastSig = "";
			const recluster = () => {
				if (disposed) return;
				const z = mm.getZoom();
				const pts = hotspots.map((h) => mm.project([h.lat, h.lng], z));
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
						if (!mm.hasLayer(markers[g[0]])) markers[g[0]].addTo(mm);
						continue;
					}
					g.forEach((k) => markers[k].remove());
					const c = centre(g);
					const lead = g.find((k) => plateUrls[k]) ?? g[0];
					const frames = g.reduce((sum, k) => sum + hotspots[k].photos.length, 0);
					const regions = new Set(g.map((k) => splitPlace(hotspots[k].name).region).filter(Boolean));
					const name = regions.size === 1 ? [...regions][0] : `${g.length} ${t.points}`;
					const label = `<span class="im-mk-label"><span class="im-mk-name">${escapeHtml(name)}</span><span class="im-mk-num">${frames} ${escapeHtml(t.frames)}</span></span>`;
					const cm = L.marker(mm.unproject(L.point(c.x, c.y), z), {
						icon: plateIcon(plateUrls[lead], `<span class="im-mk-count">${g.length}</span>`, label, "im-mk-cluster"),
						title: g.map((k) => splitPlace(hotspots[k].name).place).join(", "),
						riseOnHover: true,
						keyboard: false,
					}).addTo(mm);
					cm.on("click", () => {
						const bounds = L.latLngBounds(g.map((k) => [hotspots[k].lat, hotspots[k].lng] as [number, number]));
						// Anggota berkoordinat sama tidak akan pernah terurai oleh zoom —
						// langsung buka titik pertamanya.
						if (bounds.getNorthEast().equals(bounds.getSouthWest())) openViewer(g[0]);
						else {
							// Area aman sama dengan kamera ringkasan (blok judul di kiri-atas,
							// petunjuk di bawah) + ruang untuk plate dan labelnya.
							const fit = overviewFit(el);
							mm.flyToBounds(bounds, {
								paddingTopLeft: [fit.paddingTopLeft[0] + plate.w, fit.paddingTopLeft[1] + plate.h],
								paddingBottomRight: [fit.paddingBottomRight[0] + plate.w * 2.5, fit.paddingBottomRight[1] + plate.h],
								maxZoom: 11,
								duration: FLY_DUR,
							});
						}
					});
					clusterMarkers.push(cm);
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
			mm.on("move", syncFocus);
			mm.on("zoom", syncFocus);
			mm.on("dragstart", () => (dragged = true));
			syncFocus();

			// Rotasi HP / jendela diubah ukurannya: selama pengunjung belum menggeser
			// sendiri, kamera ikut dipaskan ulang ke bingkai Nusantara.
			let lastW = el.clientWidth;
			let lastH = el.clientHeight;
			ro = new ResizeObserver(() => {
				if (disposed || (el.clientWidth === lastW && el.clientHeight === lastH)) return;
				lastW = el.clientWidth;
				lastH = el.clientHeight;
				mm.invalidateSize();
				if (!dragged) mm.fitBounds(NUSANTARA, overviewFit(el));
			});
			ro.observe(el);

			map = mm;
			ready = true;
			setTimeout(() => {
				mm?.invalidateSize();
				syncFocus();
			}, 60);
		})();

		return () => {
			disposed = true;
			ro?.disconnect();
			reclusterRef = null;
			if (m) m.remove();
			map = null;
			markers = [];
			clusterMarkers = [];
			preloads = [];
		};
	});

	$effect(() => {
		const onFs = () => {
			const el = document as Document & { webkitFullscreenElement?: Element | null };
			isFs = !!(document.fullscreenElement || el.webkitFullscreenElement);
			setTimeout(() => map?.invalidateSize(), 80);
		};
		document.addEventListener("fullscreenchange", onFs);
		document.addEventListener("webkitfullscreenchange", onFs);
		return () => {
			document.removeEventListener("fullscreenchange", onFs);
			document.removeEventListener("webkitfullscreenchange", onFs);
		};
	});

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
		tl.fromTo(q(".im-bracket"), { opacity: 0 }, { opacity: 1, duration: 40, ease: "power2.out" }, 30);
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

	function flyTo(i: number, zoom = FOCUS_Z) {
		const h = hotspots[i];
		if (!h) return;
		map?.flyTo([h.lat, h.lng], zoom, { duration: FLY_DUR });
	}
	function openViewer(i: number) {
		// Membuka bingkai = menekan tombol rana. Dipasang di sini, bukan di
		// handler marker, supaya jalur lain menuju bukaan yang sama juga berbunyi.
		playShutter();
		viewing = i;
		frame = 0;
		viewingRef = i;
		frameRef = 0;
	}
	function closeViewer() {
		viewing = null;
		viewingRef = null;
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
		if (map && mapEl) map.flyToBounds(NUSANTARA, { ...overviewFit(mapEl), duration: 1.1 });
	}
	function toggleFullscreen() {
		const el = wrapEl as
			| (HTMLDivElement & { webkitRequestFullscreen?: () => Promise<void> })
			| null;
		if (!el) return;
		const doc = document as Document & {
			webkitExitFullscreen?: () => Promise<void>;
			webkitFullscreenElement?: Element | null;
		};
		const active = document.fullscreenElement || doc.webkitFullscreenElement;
		if (!active) {
			(el.requestFullscreen?.bind(el) ?? el.webkitRequestFullscreen?.bind(el))?.();
		} else {
			(document.exitFullscreen?.bind(document) ?? doc.webkitExitFullscreen?.bind(document))?.();
		}
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
	const focused = $derived(hotspots[focus] ?? null);
	const hot = $derived(viewing != null ? hotspots[viewing] : null);
	const shot = $derived(hot ? hot.photos[Math.min(frame, hot.photos.length - 1)] : null);
	const globalFrame = $derived(
		viewing != null && hot ? shotOffset[viewing] + Math.min(frame, hot.photos.length - 1) : 0,
	);
</script>

<section bind:this={sectionEl} class="on-darkroom relative">
	<div
		bind:this={wrapEl}
		class="im-wrap relative h-[100svh] min-h-[560px] w-full overflow-hidden"
	>
		<div bind:this={stageEl} class="im-stage">
			<div
				aria-hidden="true"
				class="im-fallback"
				style="background-image: url('{IM_FALLBACK}');"
			></div>
			<div bind:this={mapEl} class="im-canvas"></div>
		</div>

		<div class="im-vignette" aria-hidden="true"></div>
		<div class="im-grain" aria-hidden="true"></div>

		<div class="im-hud">
			<div class="im-bracket im-reveal" aria-hidden="true">
				<span class="im-bracket-tl"></span>
				<span class="im-bracket-tr"></span>
				<span class="im-bracket-bl"></span>
				<span class="im-bracket-br"></span>
				<span class="im-bracket-rail-l"></span>
				<span class="im-bracket-rail-r"></span>
			</div>

			<div class="im-cluster im-reveal">
				<button
					type="button"
					onclick={resetOverview}
					aria-label={t.overview}
					title={t.overview}
					class="im-round"
				>
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
						<path d="M3 6h18M3 12h18M3 18h18" />
					</svg>
				</button>
				<button
					type="button"
					onclick={toggleFullscreen}
					aria-label={isFs ? t.exit : t.fullscreen}
					title={isFs ? t.exit : t.fullscreen}
					class="im-round"
				>
					{#if isFs}
						<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
							<path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" />
						</svg>
					{:else}
						<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
							<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
						</svg>
					{/if}
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

			<p class="im-hint im-mono im-reveal {dragged ? "is-done" : ""}">{t.explore}</p>

			<p class="im-coord im-mono im-reveal">
				{focused ? fmtCoord(focused.lat, focused.lng) : ""}
			</p>
		</div>

		{#if viewing != null && hot && shot}
			<div class="im-dv" role="dialog" aria-modal="true" aria-label={hot.name}>
				<div
					bind:this={dvStage}
					class="im-dv-stage {zoomed ? "is-zoomed" : ""}"
					onmousemove={onMove}
					onclick={() => (zoomed = !zoomed)}
				>
					<div bind:this={dvImgWrap} class="im-dv-imgwrap">
						<ApiImage
							src={imgFor(shot.seed, 2000, 1400, shot.thumbUrl)}
							alt={shot.caption[lang]}
							fill
							eager
							class="object-cover"
						/>
					</div>
				</div>

				<div class="im-dv-veil" aria-hidden="true"></div>

				<div class="im-bracket" aria-hidden="true">
					<span class="im-bracket-tl"></span>
					<span class="im-bracket-tr"></span>
					<span class="im-bracket-rail-l"></span>
					<span class="im-bracket-rail-r"></span>
				</div>

				<p class="im-hint im-mono im-dv-hint">{zoomed ? t.zoomOutHint : t.zoomHint}</p>

				<button
					type="button"
					bind:this={dvCloseEl}
					onclick={closeViewer}
					class="im-round im-dv-close"
					aria-label={t.close}
				>
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true">
						<path d="M6 6l12 12M18 6L6 18" />
					</svg>
				</button>

				<svg class="im-dv-reticle" viewBox="0 0 80 80" fill="none" aria-hidden="true">
					<path d="M40 4v22M40 54v22M4 40h22M54 40h22" stroke="currentColor" stroke-width="1" />
					<path d="M31 40h18" stroke="currentColor" stroke-width="1" opacity="0.5" />
				</svg>

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
					<span class="im-dv-meta-sep">/</span>
					<span>{fmtCoord(hot.lat, hot.lng)}</span>
					<span class="im-dv-meta-clock">{timecode(globalFrame)}</span>
				</div>

				<p class="im-dv-caption">{shot.caption[lang]}</p>

				<div class="im-dv-strip-wrap">
					<div class="im-dv-compass" aria-hidden="true">
						<svg viewBox="0 0 100 100" fill="none">
							<path d="M50 6v88M6 50h88" stroke="currentColor" stroke-width="0.75" opacity="0.45" />
							<path d="M50 14 55 50 50 86 45 50Z" fill="currentColor" opacity="0.16" />
							<path d="M50 14 55 50 45 50Z" fill="#ff4d12" />
							<circle cx="50" cy="50" r="3" fill="currentColor" opacity="0.6" />
							<path d="M22 22l8 8M78 22l-8 8M22 78l8-8M78 78l-8-8" stroke="currentColor" stroke-width="0.75" opacity="0.3" />
						</svg>
						<span class="im-dv-compass-n">N</span>
						<span class="im-dv-compass-e">E</span>
						<span class="im-dv-compass-s">S</span>
						<span class="im-dv-compass-w">W</span>
					</div>
					<button
						type="button"
						class="im-dv-step im-dv-step-prev"
						onclick={() => viewStep(-1)}
						aria-label={t.prev}
					>
						←
					</button>
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
					<button
						type="button"
						class="im-dv-step im-dv-step-next"
						onclick={() => viewStep(1)}
						aria-label={t.next}
					>
						→
					</button>
				</div>
			</div>
		{/if}
	</div>
</section>
