import type { ApiPhoto, ApiPlan, ApiCategory, ApiEvent, ApiResponse, HomepageSection } from "./types";
export type { HomepageSection, ApiEvent };
import { apiGet, cleanApiBase } from "./api";
import { DUMMY_API_PHOTOS, DUMMY_CATEGORIES } from "./dummy";

export type Cat = "nature" | "urban" | "people" | "travel" | "business" | "cinema";

export const CATS: Cat[] = ["nature", "urban", "people", "travel", "business", "cinema"];

export const catLabel: Record<Cat, { id: string; en: string }> = {
  nature: { id: "Alam", en: "Nature" },
  urban: { id: "Kota", en: "Urban" },
  people: { id: "Orang", en: "People" },
  travel: { id: "Travel", en: "Travel" },
  business: { id: "Bisnis", en: "Business" },
  cinema: { id: "Sinema", en: "Cinema" },
};

export type Localized = { id: string; en: string };

export type Photo = {
  id: string;
  title: Localized;
  author: string;
  location?: string;
  /** Tipe aset dari API — beranda perlu memisahkan foto dari video. */
  assetType?: "FOTO" | "VIDEO";
  cat: Cat;
  seed: string;
  w: number;
  h: number;
  price: number;
  categories: string[];
  keywords: string[];
  /** Kata kunci berbahasa Inggris (keywords = Indonesia). Kosong = tampilkan keywords. */
  keywordsEn?: string[];
  tags: string[];
  desc: Localized;
  featured?: boolean;
  thumbUrl?: string;
  watermarkUrl?: string;
  /** Presigned file asli dari API (untuk VIDEO = mp4, dipakai hover-preview). */
  originalUrl?: string | null;
  /** Klip kartu bersih (VIDEO): diputar saat hover di grid/contact sheet. */
  clipUrl?: string | null;
};

export type Video = {
  id: string;
  title: Localized;
  author: string;
  cat: Cat;
  seed: string;
  duration: string;
  /** Lokasi & kategori asli dari API — dipakai meta di grid beranda. */
  location?: string;
  category?: string;
  price: number;
  desc: Localized;
  thumbUrl?: string;
  /** Kata kunci & kategori asli dari API — pil meta di halaman detail. */
  keywords: string[];
  keywordsEn?: string[];
  categories: string[];
  /** URL mp4 preview (dipetakan dari ApiPhoto.originalUrl). */
  previewUrl?: string | null;
};

export type Plan = {
  id: string;
  badge: Localized;
  name: Localized;
  priceMonthly: number;
  priceAnnual: number;
  quota: number;
  perks: Localized[];
  highlight?: boolean;
};

export type Collection = {
  id: string;
  title: Localized;
  desc: Localized;
  seed: string;
  count: number;
  cat: Cat;
};

const CATEGORY_MAP: Record<string, Cat> = {
  Landscape: "nature",
  Nature: "nature",
  Urban: "urban",
  City: "urban",
  Portrait: "people",
  People: "people",
  Travel: "travel",
  Business: "business",
  Cinema: "cinema",
};

const CAT_REVERSE: Record<Cat, string> = {
  nature: "Nature",
  urban: "Urban",
  people: "Portrait",
  travel: "Travel",
  business: "Business",
  cinema: "Cinema",
};

function apiCatToCat(categoryNames: string[]): Cat {
  for (const name of categoryNames) {
    const mapped = CATEGORY_MAP[name];
    if (mapped) return mapped;
  }
  return "nature";
}

// Ingatan URL per foto: setiap ronde fetch menandatangani ulang semua
// presigned URL, jadi tanpa ini SETIAP komponen yang fetch sendiri
// (ArchiveStrip, orbit, halaman foto/video, terkait) menukar puluhan URL
// tiap mount — gambar dimuat ulang dan marquee restart. Diingat per id,
// dipakai ulang selama masih berlaku & host sama (diurus pickStableUrl);
// metadata lain selalu yang segar. Seluruh aplikasi stabil otomatis.
type RememberedUrls = {
  thumbUrl?: string | null;
  watermarkUrl?: string | null;
  originalUrl?: string | null;
  previewUrl?: string | null;
  clipUrl?: string | null;
};
const urlMemory = new Map<string, RememberedUrls>();
// v2: aset publik diregenerasi (kecil + watermark + pita kredit) — URL lama
// yang diingat menunjuk berkas versi lama di cache browser.
const URLMEM_KEY = "lakuna:url-mem:v5";
let urlMemSaveTimer: ReturnType<typeof setTimeout> | null = null;

// Ingatan URL persisten (localStorage): modul JS lahir ulang tiap reload,
// jadi ingatan memori saja tidak menstabilkan refresh. Disimpan debounce 2
// detik; kedaluwarsa dinilai per pakai (pickStableUrl), jadi entri basi tak
// pernah dipakai. Dibatasi 500 foto terbaru.
try {
  const raw = localStorage.getItem(URLMEM_KEY);
  if (raw) {
    const parsed = JSON.parse(raw) as Record<string, RememberedUrls>;
    for (const [id, urls] of Object.entries(parsed)) urlMemory.set(id, urls);
  }
} catch {
  /* abaikan */
}

function persistUrlMemory() {
  if (urlMemSaveTimer) return;
  urlMemSaveTimer = setTimeout(() => {
    urlMemSaveTimer = null;
    try {
      const entries = [...urlMemory.entries()].slice(-500);
      localStorage.setItem(URLMEM_KEY, JSON.stringify(Object.fromEntries(entries)));
    } catch {
      /* storage penuh — abaikan */
    }
  }, 2000);
}

function stableUrls(id: string, urls: RememberedUrls): RememberedUrls {
  const prev = urlMemory.get(id);
  const pick = (o?: string | null, n?: string | null) =>
    n ? pickStableUrl(o, n) : (n ?? o ?? null);
  const out: RememberedUrls = {
    thumbUrl: pick(prev?.thumbUrl, urls.thumbUrl),
    watermarkUrl: pick(prev?.watermarkUrl, urls.watermarkUrl),
    originalUrl: pick(prev?.originalUrl, urls.originalUrl),
    previewUrl: pick(prev?.previewUrl, urls.previewUrl),
    clipUrl: pick(prev?.clipUrl, urls.clipUrl),
  };
  urlMemory.set(id, out);
  persistUrlMemory();
  return out;
}

/** Judul sesuai bahasa untuk data mentah API (keranjang, pesanan, favorit, unduhan): Inggris bila ada. */
export function pickTitle(title: string, titleEn: string | null | undefined, lang: "id" | "en"): string {
  return (lang === "en" && titleEn?.trim()) || title;
}

/** Judul/deskripsi dua bahasa; versi Inggris yang kosong jatuh ke versi Indonesia. */
function titleOf(api: ApiPhoto): Localized {
  return { id: api.title, en: api.titleEn?.trim() || api.title };
}
function descOf(api: ApiPhoto): Localized {
  const id = api.description || api.title;
  return { id, en: api.descriptionEn?.trim() || id };
}
/** Kata kunci per bahasa; yang lama tanpa `lang` dianggap Indonesia. */
function splitKeywords(api: ApiPhoto): { id: string[]; en: string[] } {
  const id: string[] = [];
  const en: string[] = [];
  for (const pk of api.photoKeywords ?? []) (pk.keyword.lang === "en" ? en : id).push(pk.keyword.name);
  return { id, en };
}

export function adaptPhoto(api: ApiPhoto): Photo {
  const cats = (api.photoCategories ?? []).map((pc) => pc.category.name);
  const { id: keywords, en: keywordsEn } = splitKeywords(api);
  const cat = apiCatToCat(cats);
  const urls = stableUrls(api.id, {
    thumbUrl: api.thumbUrl,
    watermarkUrl: api.watermarkUrl ?? undefined,
    originalUrl: api.originalUrl ?? undefined,
    clipUrl: api.clipUrl ?? undefined,
  });
  return {
    id: api.id,
    title: titleOf(api),
    author: api.photographer || "Unknown",
    location: api.location || undefined,
    assetType: api.type === "VIDEO" ? "VIDEO" : "FOTO",
    cat,
    seed: api.id,
    w: api.width || 1600,
    h: api.height || 1200,
    price: api.price,
    // Nama kategori & keyword asli dari API — dipakai PhotoDetail (kategori dari
    // API, bukan catLabel; keywords menggantikan field "Lokasi").
    categories: [...new Set(cats.filter(Boolean))],
    keywords: [...new Set(keywords.filter(Boolean))],
    keywordsEn: [...new Set(keywordsEn.filter(Boolean))],
    tags: api.tags ?? [],
    desc: descOf(api),
    thumbUrl: urls.thumbUrl ?? undefined,
    watermarkUrl: urls.watermarkUrl ?? undefined,
    originalUrl: urls.originalUrl ?? null,
    clipUrl: urls.clipUrl ?? null,
  };
}

/**
 * URL preview video yang layak dipasang di <video>: hanya file asli (atau
 * transcode H.264 di watermarkUrl untuk tipe VIDEO). Fallback picsum backend
 * adalah GAMBAR jpg — dipasang sebagai src video ia gagal diputar DAN memicu
 * error CSP media-src. Tolak di sini, kartu menampilkan poster diam.
 */
/**
 * Pratinjau utama (klip kartu) → pratinjau cadangan (transcode ringan). Bila klip rusak/404/tak
 * bisa didekode, pendengar `error` global di +layout.svelte memutar cadangannya, bukan membeku.
 */
export const previewFallback = new Map<string, string>();

export function pickVideoPreview(
  originalUrl?: string | null,
  watermarkUrl?: string | null,
): string | null {
  const usable = (u?: string | null): u is string => !!u && !u.includes("picsum.photos");
  const first = usable(originalUrl) ? originalUrl : null;
  const second = usable(watermarkUrl) ? watermarkUrl : null;
  if (first && second && first !== second) previewFallback.set(first, second);
  return first ?? second;
}

export function adaptVideo(api: ApiPhoto): Video {
  const cats = (api.photoCategories ?? []).map((pc) => pc.category.name);
  const { id: keywords, en: keywordsEn } = splitKeywords(api);
  const urls = stableUrls(api.id, {
    thumbUrl: api.thumbUrl,
    watermarkUrl: api.watermarkUrl ?? undefined,
    originalUrl: api.originalUrl ?? undefined,
    clipUrl: api.clipUrl ?? undefined,
  });
  return {
    id: api.id,
    title: titleOf(api),
    author: api.photographer || "Unknown",
    cat: "cinema",
    seed: api.id,
    duration: "02:00",
    location: api.location || undefined,
    category: (api.photoCategories ?? [])[0]?.category?.name,
    price: api.price,
    desc: descOf(api),
    thumbUrl: urls.thumbUrl ?? undefined,
    keywords: [...new Set(keywords.filter(Boolean))],
    keywordsEn: [...new Set(keywordsEn.filter(Boolean))],
    categories: [...new Set(cats.filter(Boolean))],
    // Kartu: klip bersih dulu; pratinjau ber-watermark bila klip belum ada.
    previewUrl: pickVideoPreview(urls.clipUrl, urls.watermarkUrl),
  };
}

export function adaptPlan(api: ApiPlan): Plan {
  return {
    id: api.id as Plan["id"],
    badge: { id: api.badge || "Paket", en: api.badge || "Plan" },
    name: { id: api.name, en: api.name },
    priceMonthly: api.priceMonthly,
    priceAnnual: api.priceAnnual,
    highlight: api.highlight,
    quota: api.quota,
    perks: [
      { id: `${api.quota} foto/video per bulan`, en: `${api.quota} photos/videos per month` },
      ...(api.description ? [{ id: api.description, en: api.description }] : []),
    ],
  };
}

// API fetch helpers
export async function fetchPhotos(opts?: {
  /** Nama kategori asli dari API (mis. "Nature", "Urban") — backend menyaring berdasar category.name. */
  cat?: string;
  search?: string;
  type?: "FOTO" | "VIDEO";
  /** Urutan hasil; default terbaru. */
  sort?: "newest" | "oldest" | "popular" | "price_asc" | "price_desc";
  /** Hanya yang diunggah dalam rentang ini; kosong = semua waktu. */
  period?: "day" | "week" | "month" | "year";
  page?: number;
  limit?: number;
}): Promise<{ photos: Photo[]; total: number; totalPages: number }> {
  // Mode dummy khusus Vercel (VITE_USE_DUMMY_IMAGES=true): langsung pakai
  // dataset lokal tanpa fetch API supaya cepat dan tidak error localhost.
  if (USE_DUMMY_IMAGES) return dummyPhotoPage(opts);

  const params = new URLSearchParams();
  if (opts?.cat) params.set("categoryId", opts.cat);
  if (opts?.search) params.set("search", opts.search);
  if (opts?.type) params.set("type", opts.type);
  if (opts?.sort) params.set("sort", opts.sort);
  if (opts?.period) params.set("period", opts.period);
  params.set("page", String(opts?.page ?? 1));
  params.set("limit", String(opts?.limit ?? 24));

  try {
    const res = await apiGet<ApiResponse<ApiPhoto[]>>(`/api/photos?${params}`);
    if (USE_DUMMY_IMAGES && res.data.length === 0) return dummyPhotoPage(opts);
    return {
      photos: res.data.map(adaptPhoto),
      total: res.meta?.total ?? 0,
      totalPages: res.meta?.totalPages ?? 0,
    };
  } catch (err) {
    if (USE_DUMMY_IMAGES) return dummyPhotoPage(opts);
    throw err;
  }
}

/**
 * Halaman foto dari dataset dummy — meniru penyaringan backend (type, kategori,
 * pencarian) supaya semua section tetap terisi saat API belum siap. `type` yang
 * tidak diisi diperlakukan sebagai "FOTO": pemanggil tanpa type (beranda) semua
 * menampilkan grid foto, bukan video.
 */
function dummyPhotoPage(opts?: {
  cat?: string;
  search?: string;
  type?: "FOTO" | "VIDEO";
  page?: number;
  limit?: number;
}): { photos: Photo[]; total: number; totalPages: number } {
  let rows = DUMMY_API_PHOTOS.filter((p) => p.type === (opts?.type ?? "FOTO"));

  const cat = opts?.cat?.toLowerCase();
  if (cat) {
    rows = rows.filter((p) =>
      p.photoCategories.some(
        (pc) => pc.category.name.toLowerCase() === cat || pc.category.id.toLowerCase() === cat,
      ),
    );
  }

  const q = opts?.search?.trim().toLowerCase();
  if (q) {
    rows = rows.filter((p) =>
      [p.title, p.description ?? "", p.location ?? "", p.photographer, ...p.tags]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }

  const limit = opts?.limit ?? 24;
  const page = opts?.page ?? 1;
  return {
    photos: rows.slice((page - 1) * limit, page * limit).map(adaptPhoto),
    total: rows.length,
    totalPages: Math.max(1, Math.ceil(rows.length / limit)),
  };
}

function dummyPhotoById(id: string): Photo | null {
  if (!USE_DUMMY_IMAGES) return null;
  const row = DUMMY_API_PHOTOS.find((p) => p.id === id);
  return row ? adaptPhoto(row) : null;
}

/** Terkait = kategori sama & tipe sama dulu, sisanya diisi item lain. */
function dummyRelated(id: string, limit: number): Photo[] {
  if (!USE_DUMMY_IMAGES) return [];
  const self = DUMMY_API_PHOTOS.find((p) => p.id === id);
  const cats = new Set((self?.photoCategories ?? []).map((pc) => pc.category.name));
  const pool = DUMMY_API_PHOTOS.filter((p) => p.id !== id && p.type === (self?.type ?? "FOTO"));
  const same = pool.filter((p) => p.photoCategories.some((pc) => cats.has(pc.category.name)));
  const rest = pool.filter((p) => !same.includes(p));
  return [...same, ...rest].slice(0, limit).map(adaptPhoto);
}

/**
 * Semua item bertipe VIDEO dari database (atau dataset dummy saat
 * VITE_USE_DUMMY_IMAGES=true) — dipakai section video drone beranda.
 */
export async function fetchVideos(limit = 12): Promise<{ videos: Video[]; total: number }> {
  const r = await fetchPhotos({ type: "VIDEO", limit });
  return {
    videos: r.photos.map((p) => ({
      id: p.id,
      title: p.title,
      author: p.author,
      cat: "cinema" as const,
      seed: p.seed,
      duration: "02:00",
      location: p.location,
      category: p.categories?.[0],
      price: p.price,
      desc: p.desc,
      thumbUrl: p.thumbUrl,
      keywords: p.keywords,
      keywordsEn: p.keywordsEn,
      categories: p.categories,
      previewUrl: pickVideoPreview(p.clipUrl, p.watermarkUrl),
    })),
    total: r.total,
  };
}

const originalViewCache = new Map<string, Promise<string | null>>();

/**
 * URL file asli (tanpa watermark) satu foto untuk viewer layar penuh.
 * Diminta hanya saat viewer dibuka; null bila tak tersedia (dummy, video,
 * belum approved) — pemanggil kembali ke pratinjau ber-watermark.
 */
export function fetchPhotoOriginal(id: string): Promise<string | null> {
  let p = originalViewCache.get(id);
  if (!p) {
    p = apiGet<ApiResponse<{ url: string }>>(`/api/photos/${encodeURIComponent(id)}/view`)
      .then((r) => r.data?.url ?? null)
      .catch(() => null);
    originalViewCache.set(id, p);
    // URL presigned berlaku 10 menit — buang dari cache sebelum basi.
    setTimeout(() => originalViewCache.delete(id), 8 * 60 * 1000);
  }
  return p;
}

export async function fetchPhotoById(id: string): Promise<Photo | null> {
  // Mode dummy: cek dataset lokal dulu, hemat 1x fetch yang pasti gagal di Vercel.
  if (USE_DUMMY_IMAGES) {
    const d = dummyPhotoById(id);
    if (d) return d;
  }
  try {
    const res = await apiGet<ApiResponse<ApiPhoto>>(`/api/photos/${id}`);
    if (!res.success || !res.data) return dummyPhotoById(id);
    return adaptPhoto(res.data);
  } catch {
    return dummyPhotoById(id);
  }
}

export async function fetchRelatedPhotos(id: string, limit = 4): Promise<Photo[]> {
  if (USE_DUMMY_IMAGES) {
    const d = dummyRelated(id, limit);
    if (d.length > 0) return d;
  }
  try {
    const res = await apiGet<ApiResponse<ApiPhoto[]> & { photos?: ApiPhoto[] }>(
      `/api/photos/${id}/related?limit=${limit}`,
    );
    // Backend mengembalikan { success, photos: [...] } (bukan ApiResponse.data).
    const rows = Array.isArray(res.data) ? res.data : (res.photos ?? []);
    if (USE_DUMMY_IMAGES && rows.length === 0) return dummyRelated(id, limit);
    return rows.map(adaptPhoto);
  } catch {
    return dummyRelated(id, limit);
  }
}

/**
 * Karya lain dari kontributor yang sama (galeri kontributor di halaman
 * detail). Backend `search` mencakup kolom photographer, tapi disaring lagi
 * di klien berdasarkan nama persis — search juga kena judul/kategori.
 */
export async function fetchContributorWorks(
  author: string,
  excludeId: string,
  limit = 8,
): Promise<Photo[]> {
  const name = author.trim();
  if (!name) return [];
  try {
    const r = await fetchPhotos({ search: name, limit: limit + 8 });
    return r.photos.filter((p) => p.author === name && p.id !== excludeId).slice(0, limit);
  } catch {
    return [];
  }
}

export async function fetchPlans(): Promise<Plan[]> {
  try {
    const res = await apiGet<ApiResponse<ApiPlan[]>>("/api/plans");
    return res.data.map(adaptPlan);
  } catch {
    return [];
  }
}

export type ApiCatItem = { id: string; name: string; description: string | null; imageUrl: string | null };

export async function fetchCategories(): Promise<ApiCatItem[]> {
  if (USE_DUMMY_IMAGES) return DUMMY_CATEGORIES;
  try {
    const res = await apiGet<ApiResponse<ApiCategory[]>>("/api/categories?limit=50");
    if (USE_DUMMY_IMAGES && res.data.length === 0) return DUMMY_CATEGORIES;
    return res.data;
  } catch {
    return USE_DUMMY_IMAGES ? DUMMY_CATEGORIES : [];
  }
}

/**
 * Event diskon aktif untuk foto/plan tertentu (GET /api/events/active).
 * Backend mengembalikan baris EventDiscount aktif, diurutkan desc berdasar value.
 */
export async function fetchActiveEvents(opts: { photoId?: string; planId?: string }): Promise<ApiEvent[]> {
  const params = new URLSearchParams();
  if (opts.photoId) params.set("photoId", opts.photoId);
  if (opts.planId) params.set("planId", opts.planId);
  try {
    const res = await apiGet<ApiResponse<ApiEvent[]>>(`/api/events/active?${params.toString()}`);
    return res.data ?? [];
  } catch {
    return [];
  }
}

/**
 * Nominal diskon dari sebuah event terhadap harga tertentu —
 * meniru computeDiscountAmount backend (PERCENT: persen × harga, capped maxDiscount;
 * NOMINAL: min(value, harga)). Tidak ditumpuk dengan voucher (aturan take-largest).
 */
export function eventAmount(ev: ApiEvent, price: number): number {
  if (price <= 0) return 0;
  let cut: number;
  if (ev.valueType === "PERCENT") {
    cut = Math.floor((price * ev.value) / 100);
    if (ev.maxDiscount != null && cut > ev.maxDiscount) cut = ev.maxDiscount;
  } else {
    cut = Math.min(ev.value, price);
  }
  return Math.max(0, cut);
}

/** Ambil event dengan diskon nominal terbesar (kandidat take-largest). */
export function bestEvent(events: ApiEvent[], price: number): ApiEvent | null {
  if (!events.length) return null;
  let best: ApiEvent | null = null;
  let bestAmt = 0;
  for (const ev of events) {
    const amt = eventAmount(ev, price);
    if (amt > bestAmt) { best = ev; bestAmt = amt; }
  }
  return best && bestAmt > 0 ? best : null;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Total diskon event untuk item cart foto (preview). Ambil event per-foto (hanya
 * item photo dengan meta=photoId UUID & price>0). Frontend hanya menampilkan
 * perkiraan; backend `computeOrderDiscount` yang otoritatif saat buat order.
 */
export async function fetchCartEventDiscounts(
  items: { id: string; kind: string; meta?: string; price: number }[],
): Promise<{ perItem: Record<string, { name: string; amount: number }>; total: number }> {
  const perItem: Record<string, { name: string; amount: number }> = {};
  let total = 0;
  const photoItems = items.filter(
    (i) => i.kind === "photo" && !!i.meta && UUID_RE.test(i.meta) && i.price > 0,
  );
  await Promise.all(
    photoItems.map(async (it) => {
      const evs = await fetchActiveEvents({ photoId: it.meta! });
      const best = bestEvent(evs, it.price);
      if (!best) return;
      const amt = eventAmount(best, it.price);
      if (amt <= 0) return;
      perItem[it.id] = { name: best.name, amount: amt };
      total += amt;
    }),
  );
  return { perItem, total };
}

/** Konten beranda yang dikelola CMS (hero/manifesto/anjungan_1/mulai). */
let homepageCache: Record<string, HomepageSection> | null = null;
let homepageCacheAt = 0;
/** Umur cache homepage per sesi. Lebih lama = kembali ke home terasa instan, tapi
 *  perubahan dari CMS (hero, kurasi) terlambat muncul tanpa muat ulang. */
const HOMEPAGE_TTL = 30_000;

/** Buang cache lalu fetch ulang — untuk memulihkan URL presigned yang
 *  kedaluwarsa (1 jam) atau mati saat tunnel storage restart, tanpa refresh
 *  halaman. Dipakai hero beranda saat gambar CMS gagal dimuat. */
export async function refreshHomepage(): Promise<Record<string, HomepageSection>> {
	homepageCache = null;
	homepageCacheAt = 0;
	return fetchHomepage();
}

export async function fetchHomepage(): Promise<Record<string, HomepageSection>> {
	// Cache sesi: kembali ke home dari halaman lain langsung memakai URL gambar
	// asli tanpa fetch ulang — tanpa ini hero sempat memakai dummy picsum.
	if (homepageCache && Date.now() - homepageCacheAt < HOMEPAGE_TTL) return homepageCache;
	try {
		const res = await apiGet<ApiResponse<HomepageSection[]>>("/api/homepage");
		const map: Record<string, HomepageSection> = {};
		for (const s of res.data) map[s.key] = s;
		homepageCache = map;
		homepageCacheAt = Date.now();
		return map;
	} catch {
		return homepageCache ?? {};
	}
}

/**
 * Snapshot beranda — cat instan saat mount, segarkan di latar.
 *
 * Keluhan "landing telat menampilkan gambar asli": tiap buka (apalagi refresh)
 * semua list difetch ulang, dan gambar asli baru mulai diunduh setelah
 * presigned URL datang dari API. Dengan snapshot, mount langsung melukis data
 * terakhir (memori untuk kembali dari halaman lain, sessionStorage untuk
 * refresh), sementara fetch segar berjalan di belakang dan menimpa begitu tiba.
 *
 * Batas 45 menit di bawah masa berlaku presigned MinIO (1 jam; penggabungan
 * per-id membuang URL yang tersisa <5 menit), dan
 * snapshot dibuang bila VITE_API_URL berubah (ganti tunnel) — URL basi tak
 * pernah dipakai. Kegagalan baca/tulis storage diabaikan diam-diam.
 */
export type HomeSnapshot = {
	at: number;
	apiBase: string;
	horizontal: Photo[];
	latest: Photo[];
	archiveTotal: number;
	videos: Video[];
	videoTotal: number;
	plans: Plan[];
	hp: Record<string, HomepageSection>;
};

const SNAP_TTL = 45 * 60 * 1000;
// v3: snapshot basi yang sempat menyimpan URL picsum (era backend menjawab
// picsum saat presign MinIO gagal) dibuang paksa — jangan turunkan versi ini
// tanpa alasan.
const SNAP_KEY = "lakuna:home-snap:v9";
let snapMem: HomeSnapshot | null = null;

function snapshotApiBase(): string {
	try {
		return cleanApiBase(import.meta.env.VITE_API_URL) || "http://localhost:3000";
	} catch {
		return "";
	}
}

/**
 * Backend berbohong dengan sopan: saat presign MinIO gagal (tunnel storage
 * mati), thumbUrl/watermarkUrl diisi `https://picsum.photos/seed/{id}/...`
 * sebagai fallback. Di browser itu tampil sebagai "foto dummy", dan karena
 * tak kosong, saringan snapshot meloloskannya — dummy menempel sampai cache
 * kedaluwarsa. Saring baris beracun itu di sini: sisakan yang URL-nya asli.
 */
export function stripPicsumPhotos<T extends { thumbUrl?: string | null }>(rows: T[]): T[] {
	return rows.filter((r) => !r.thumbUrl?.includes("picsum.photos"));
}

/** True bila payload homepage mengandung URL picsum (presign gagal massal). */
export function homepageHasPicsum(hp: Record<string, HomepageSection>): boolean {
	try {
		return JSON.stringify(hp).includes("picsum.photos");
	} catch {
		return false;
	}
}

/**
 * URL media anti-goyang: ronde fetch segar menandatangani ulang SEMUA
 * presigned URL (signature per-request), sehingga tanpa penggabungan ini
 * setiap revalidasi menukar 80+ URL → seluruh gambar dimuat ulang, strip
 * marquee restart, compare bertukar. Audit membuktikan 82/84 URL berubah
 * tiap refresh. Aturannya: URL lama dipertahankan selama masih berlaku
 * (>5 menit sebelum kedaluwarsa) dan host-nya sama; URL picsum (presign
 * gagal) tidak pernah menimpa URL asli, dan URL asli selalu menimpa picsum.
 */
function presignedFresh(url: string, marginMs = 5 * 60 * 1000): boolean {
	try {
		const u = new URL(url);
		const d = u.searchParams.get("X-Amz-Date");
		const e = Number(u.searchParams.get("X-Amz-Expires") ?? "0");
		// Bukan presigned (dummy/lokal/eksternal) — tak ada kedaluwarsa.
		if (!d || !e) return true;
		const t = Date.parse(d.replace(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/, "$1-$2-$3T$4:$5:$6Z"));
		if (Number.isNaN(t)) return true;
		return Date.now() < t + e * 1000 - marginMs;
	} catch {
		return true;
	}
}

function sameHost(a: string, b: string): boolean {
	try {
		return new URL(a).host === new URL(b).host;
	} catch {
		return false;
	}
}

export function pickStableUrl(oldU?: string | null, newU?: string | null): string | null {
	if (!newU) return oldU ?? null;
	if (newU.includes("picsum.photos")) {
		return oldU && !oldU.includes("picsum.photos") ? oldU : newU;
	}
	if (!oldU || oldU.includes("picsum.photos")) return newU;
	// Host beda = ganti tunnel: URL lama pasti mati.
	if (!sameHost(oldU, newU)) return newU;
	// File beda (path/key storage berubah, mis. foto diganti lewat CMS — tiap
	// upload memakai key UUID baru): URL lama menunjuk file LAMA. Dulu tetap
	// dipertahankan selama belum kedaluwarsa, jadi foto yang diedit di CMS
	// tak berubah di situs sampai ±1 jam. Hanya tanda tangan yang beda = file
	// sama → URL lama dipertahankan agar gambar tak dimuat ulang.
	if (!samePath(oldU, newU)) return newU;
	return presignedFresh(oldU) ? oldU : newU;
}

function samePath(a: string, b: string): boolean {
	try {
		return new URL(a).pathname === new URL(b).pathname;
	} catch {
		return false;
	}
}

type MediaRow = {
	id: string;
	thumbUrl?: string | null;
	watermarkUrl?: string | null;
	originalUrl?: string | null;
	imageUrl?: string | null;
	previewUrl?: string | null;
};

/** Gabung list segar ke list lama per id: metadata baru, URL lama yang masih berlaku. */
export function mergeMediaById<T extends MediaRow>(oldList: T[], fresh: T[]): T[] {
	if (!oldList.length) return fresh;
	const prev = new Map(oldList.map((p) => [p.id, p]));
	let changed = false;
	const out = fresh.map((p) => {
		const o = prev.get(p.id);
		if (!o) return p;
		const merged = {
			...p,
			thumbUrl: pickStableUrl(o.thumbUrl, p.thumbUrl),
			watermarkUrl: pickStableUrl(o.watermarkUrl ?? null, p.watermarkUrl ?? null),
			originalUrl: pickStableUrl(o.originalUrl ?? null, p.originalUrl ?? null),
			imageUrl: pickStableUrl(o.imageUrl ?? null, p.imageUrl ?? null),
			previewUrl: pickStableUrl(o.previewUrl ?? null, p.previewUrl ?? null),
		};
		if (
			merged.thumbUrl !== p.thumbUrl || merged.watermarkUrl !== p.watermarkUrl ||
			merged.originalUrl !== p.originalUrl || merged.imageUrl !== p.imageUrl ||
			merged.previewUrl !== p.previewUrl
		) changed = true;
		return { ...merged, id: p.id } as T;
	});
	// Kembalikan referensi lama bila tak ada yang berubah — turunan
	// $derived tak dihitung ulang, animasi (marquee) tak restart.
	return changed ? out : (oldList.length === fresh.length && fresh.every((p, i) => oldList[i]?.id === p.id) ? oldList : out);
}

/** Gabung homepage segar ke lama: imageUrl section + foto kurasi per id. */
export function mergeHomepage(
	oldHp: Record<string, HomepageSection>,
	freshHp: Record<string, HomepageSection>,
): Record<string, HomepageSection> {
	const out: Record<string, HomepageSection> = {};
	for (const [key, sec] of Object.entries(freshHp)) {
		const prev = oldHp[key];
		if (!prev) {
			out[key] = sec;
			continue;
		}
		// URL lama hanya dipertahankan bila menunjuk BERKAS YANG SAMA (path
		// tanpa query tanda tangan). Dulu dipertahankan selama belum kedaluwarsa
		// — gambar/video hero yang diganti di CMS tak muncul sampai ±1 jam.
		const samePath = (a?: string | null, b?: string | null) => {
			try {
				return !!a && !!b && new URL(a).pathname === new URL(b).pathname;
			} catch {
				return false;
			}
		};
		out[key] = {
			...sec,
			imageUrl: samePath(prev.imageUrl, sec.imageUrl) ? pickStableUrl(prev.imageUrl, sec.imageUrl) : sec.imageUrl,
			photos: sec.photos && prev.photos ? (mergeMediaById(prev.photos, sec.photos) as ApiPhoto[]) : sec.photos,
		};
	}
	return out;
}

function snapshotFresh(s: HomeSnapshot | null): s is HomeSnapshot {
	return !!s && Date.now() - s.at < SNAP_TTL && s.apiBase === snapshotApiBase();
}

export function loadHomeSnapshot(): HomeSnapshot | null {
	if (snapshotFresh(snapMem)) return snapMem;
	// localStorage (45 mnt, di bawah umur presigned 60 mnt): reload dalam
	// sejam memakai URL yang SAMA persis — audit: 82/84 URL berubah tiap
	// refresh karena signature per-request. sessionStorage hanya cadangan
	// bila localStorage tak bisa ditulis (mode privat).
	try {
		const raw = localStorage.getItem(SNAP_KEY) ?? sessionStorage.getItem(SNAP_KEY);
		if (!raw) return null;
		const parsed = JSON.parse(raw) as HomeSnapshot;
		if (!snapshotFresh(parsed)) return null;
		snapMem = parsed;
		return parsed;
	} catch {
		return null;
	}
}

export function saveHomeSnapshot(patch: Partial<Omit<HomeSnapshot, "at" | "apiBase">>): void {
	try {
		// Jangan pernah meracuni cache dengan data rusak: list kosong atau hp
		// tanpa kunci berarti ronde fetch yang gagal/degradasi — bukan sesuatu
		// yang boleh dilukis saat mount berikutnya. Tanpa saringan ini, sekali
		// saja API menjawab kosong, semua bingkai jadi dummy picsum dan
		// menempel selamanya karena ronde gagal berikutnya mempertahankan
		// snapshot basi itu (catch tidak menimpa).
		const clean: Partial<Omit<HomeSnapshot, "at" | "apiBase">> = {};
		for (const [k, v] of Object.entries(patch)) {
			let val: unknown = v;
			// Baris ber-URL-picsum = presign MinIO sedang gagal: buang barisnya.
			// Habis semua = ronde rusak, jangan simpan sama sekali.
			if (Array.isArray(val) && val.length > 0 && typeof val[0] === "object" && val[0] !== null && "thumbUrl" in val[0]) {
				val = stripPicsumPhotos(val as { thumbUrl?: string | null }[]);
			}
			if (k === "hp" && homepageHasPicsum((val ?? {}) as Record<string, HomepageSection>)) continue;
			if (Array.isArray(val) && val.length === 0) continue;
			if (k === "hp" && Object.keys((v ?? {}) as object).length === 0) continue;
			if (k === "archiveTotal" || k === "videoTotal") {
				if (typeof v !== "number" || v <= 0) continue;
			}
			(clean as Record<string, unknown>)[k] = val;
		}
		if (Object.keys(clean).length === 0) return;
		const prev: HomeSnapshot = snapMem ?? loadHomeSnapshot() ?? {
			at: 0,
			apiBase: snapshotApiBase(),
			horizontal: [],
			latest: [],
			archiveTotal: 0,
			videos: [],
			videoTotal: 0,
			plans: [],
			hp: {},
		};
		snapMem = { ...prev, ...clean, at: Date.now(), apiBase: snapshotApiBase() };
		try {
			localStorage.setItem(SNAP_KEY, JSON.stringify(snapMem));
		} catch {
			try {
				sessionStorage.setItem(SNAP_KEY, JSON.stringify(snapMem));
			} catch {
				/* storage penuh/mode privat — abaikan, fetch segar tetap jalan */
			}
		}
	} catch {
		/* storage penuh/mode privat — abaikan, fetch segar tetap jalan */
	}
}

// ─── Peta Nusantara: titik-titik dari API ───────────────────────────────
// Foto di backend hanya punya field `location` (string bebas, mis. "Danau
// Toba", "Raja Ampat") — tanpa koordinat. Untuk menempatkan titik di peta,
// nama tempat di-geocode lewat tabel lookup statis berikut (alias Indonesia
// → lat/lng). Foto dengan location tidak dikenali dilewati.
export type MapShot = {
  /** Id foto di API (untuk meminta file asli saat viewer dibuka). */
  id?: string;
  seed: string;
  thumbUrl?: string;
  /** Pratinjau besar untuk viewer (1000 px ber-watermark). */
  hdUrl?: string;
  caption: Localized;
};

export type MapHotspot = {
  name: string;
  lat: number;
  lng: number;
  cat: Cat;
  desc: Localized;
  photos: MapShot[];
};

type GeoEntry = { lat: number; lng: number; aliases: string[] };

// Urutan entries tidak penting — titik diurutkan ulang west→east (lng asc)
// supaya busur perjalanan Sabang→Merauke tetap rapi. Alias dibandingkan
// case-insensitive, tanpa diakritik, terhadap `location` foto.
const GEOCODE: GeoEntry[] = [
  { lat: 5.9, lng: 95.3, aliases: ["sabang", "pulau weh", "weh", "kilometer nol", "titik nol"] },
  { lat: 5.55, lng: 95.32, aliases: ["banda aceh", "aceh"] },
  { lat: 2.6, lng: 98.8, aliases: ["danau toba", "toba", "samosir", "sumatra utara", "sumatera utara"] },
  { lat: 3.6, lng: 98.7, aliases: ["medan", "brastagi", "berastagi"] },
  { lat: -0.31, lng: 100.37, aliases: ["bukittinggi", "padang", "minangkabau", "rumah gadang", "harau"] },
  { lat: -0.94, lng: 100.35, aliases: ["kawah harau"] },
  { lat: -2.55, lng: 140.75, aliases: ["sentani", "jayapura"] },
  { lat: 0.59, lng: 124.84, aliases: ["manado", "bunaken", "minahasa"] },
  { lat: 1.49, lng: 124.84, aliases: ["tomohon"] },
  { lat: 0.8, lng: 127.4, aliases: ["ternate", "gamalama", "tolukko", "halmahera"] },
  { lat: -0.79, lng: 123.5, aliases: ["morowali", "luwuk"] },
  { lat: -1.27, lng: 116.84, aliases: ["balikpapan", "derawan", "kakaban", "sangalaki"] },
  { lat: -3.32, lng: 114.59, aliases: ["banjarmasin", "pasar terapung", "loksado", "meratus"] },
  { lat: -2.95, lng: 104.76, aliases: ["sumatra selatan", "sumatera selatan", "palembang", "musi", "ampera"] },
  { lat: -5.1, lng: 119.4, aliases: ["makassar", "paotere", "sungai makassar", "fort rotterdam"] },
  { lat: -8.5, lng: 119.5, aliases: ["komodo", "pink beach", "labuan bajo", "padar", "rinca"] },
  { lat: -8.41, lng: 116.45, aliases: ["lombok", "rinjani", "gili", "senggigi", "mataram", "kuta lombok"] },
  { lat: -8.65, lng: 115.22, aliases: ["nusa penida", "lempuyang", "sidemen"] },
  { lat: -8.4, lng: 115.2, aliases: ["bali", "jatiluwih", "uluwatu", "tanah lot", "ubud", "canggu", "kuta bali", "denpasar", "bedugul", "mount agung", "gunung agung"] },
  { lat: -7.6, lng: 110.2, aliases: ["yogyakarta", "jogja", "borobudur", "prambanan", "merapi", "gunung merapi", "parangtritis", "kalibiru"] },
  { lat: -7.94, lng: 112.62, aliases: ["bromo", "gunung bromo", "semeru", "ijen", "kawah ijen", "tumpak sewu", "kaliklatak"] },
  { lat: -7.25, lng: 112.75, aliases: ["surabaya", "kenjeran", "tugu pahlawan"] },
  { lat: -6.91, lng: 107.61, aliases: ["bandung", "tangkuban perahu", "kawah putih", "ciwidey", "lembang"] },
  { lat: -6.2, lng: 106.8, aliases: ["jakarta", "bundaran hi", "sunda kelapa", "kota tua", "monas", "kemang"] },
  { lat: -6.97, lng: 110.42, aliases: ["jepara", "karimunjawa", "muria"] },
  { lat: -7.7, lng: 110.0, aliases: ["dieng", "sikunir", "telaga warna"] },
  { lat: -7.81, lng: 109.97, aliases: ["pengilon"] },
  { lat: 0.47, lng: 101.44, aliases: ["riau", "pekanbaru", "siak", "bukit tiga puluh"] },
  { lat: -2.99, lng: 104.76, aliases: ["lampung", "kalianda", "krakatau", "anak krakatau"] },
  { lat: 1.13, lng: 104.05, aliases: ["lingga", "singkep", "batam", "bintan", "riau islands"] },
  { lat: -0.5, lng: 130.5, aliases: ["raja ampat", "wayag", "fam", "piaynemo", "arborek", "waisai"] },
  { lat: -0.9, lng: 131.3, aliases: ["sorong", "maladumkata"] },
  { lat: -8.5, lng: 139.4, aliases: ["merauke", "wasur", "sabana maro"] },
  { lat: -4.0, lng: 138.95, aliases: ["wamena", "baliem", "kurima"] },
  { lat: -3.65, lng: 138.7, aliases: ["dimba"] },
  { lat: -2.05, lng: 133.55, aliases: ["teluk cui", "fakfak", "kaimana", "triton"] },
  { lat: -3.7, lng: 128.2, aliases: ["banda neira", "banda", "gunung api banda", "hatta"] },
  { lat: -3.23, lng: 129.6, aliases: ["kei", "kei besar", "ngurtafur", "ohoidertawun"] },
  { lat: -8.26, lng: 122.7, aliases: ["sumba", "waikabubak", "wairinding", "ratenggaro"] },
  { lat: -8.66, lng: 121.2, aliases: ["flores", "wae rebo", "kelimutu", "ende", "moni", "ranamese"] },
  { lat: -10.18, lng: 123.6, aliases: ["rote", "roti", "ndeo", "solor", "lewoleba", "adingara"] },
  { lat: -8.41, lng: 118.7, aliases: ["sumbawa", "moyo", "tambora", "badas"] },
  { lat: 1.05, lng: 109.4, aliases: ["pontianak", "kapuas", "sintang", "paloh"] },
  { lat: -1.4, lng: 121.9, aliases: ["palu", "lore lindu", "napu", "bada"] },
  { lat: -5.42, lng: 105.35, aliases: ["kiluan", "pahmungan"] },
  // Jabodetabek & Jawa Barat
  { lat: -6.4, lng: 106.82, aliases: ["depok"] },
  { lat: -6.6, lng: 106.8, aliases: ["bogor"] },
  { lat: -6.92, lng: 106.93, aliases: ["sukabumi", "pelabuhan ratu", "palabuhanratu", "ujung genteng"] },
  { lat: -6.82, lng: 107.14, aliases: ["cianjur"] },
  { lat: -7.05, lng: 107.75, aliases: ["majalaya"] },
  { lat: -6.86, lng: 107.92, aliases: ["sumedang"] },
  { lat: -7.21, lng: 107.91, aliases: ["garut", "papandayan"] },
  { lat: -6.33, lng: 108.32, aliases: ["indramayu"] },
  { lat: -6.71, lng: 108.56, aliases: ["cirebon"] },
  // Kalimantan
  { lat: -2.21, lng: 113.92, aliases: ["palangkaraya", "palangka raya"] },
  { lat: 3.3, lng: 117.63, aliases: ["tarakan"] },
];

function normalizeLoc(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Geocode string `location` → koordinat, atau null bila tidak dikenali. */
export function geocodeLocation(location: string): { lat: number; lng: number } | null {
  const norm = normalizeLoc(location);
  if (!norm) return null;
  // Cocokkan alias sebagai kata/frasa utuh (mis. "Danau Toba saat fajar" → "toba").
  // Harus berbatas kata: substring polos membuat "Sumedang" cocok dengan
  // "medan" sehingga titiknya jatuh di Sumatra Utara.
  const hay = ` ${norm} `;
  for (const g of GEOCODE) {
    for (const a of g.aliases) {
      const an = normalizeLoc(a);
      if (!an) continue;
      if (hay.includes(` ${an} `)) return { lat: g.lat, lng: g.lng };
    }
  }
  return null;
}

/**
 * Ambil foto dari /api/photos, kelompokkan per `location` yang ter-geocode,
 * dan bangun titik-titik peta (MapHotspot[]). Foto tanpa lokasi / lokasi
 * tidak dikenali dilewati. Titik diurutkan west→east (lng asc) supaya busur
 * perjalanan Sabang→Merauke tetap rapi. Mengembalikan [] bila fetch gagal
 * atau tak ada lokasi yang cocok (pemanggil boleh pakai fallback statis).
 */
/**
 * Foto yang dipilih admin (CMS › Beranda › Foto penanda peta) untuk ditampilkan di titik petanya,
 * berurutan; yang pertama jadi penanda. Gagal/kosong → [] (semua titik memakai semua fotonya).
 */
async function fetchPlatePhotoIds(): Promise<string[]> {
  if (USE_DUMMY_MAP) return [];
  try {
    const res = await apiGet<ApiResponse<{ value?: string } | null>>("/api/settings/map_plate_photos");
    const arr: unknown = JSON.parse(res.data?.value ?? "[]");
    return Array.isArray(arr) ? arr.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export async function fetchMapHotspots(): Promise<MapHotspot[]> {
  const platePhotoIds = await fetchPlatePhotoIds();
  // Ambil halaman besar sekali jalan — peta butuh sebanyak mungkin titik.
  // Selama USE_DUMMY_MAP, titiknya dari dataset dummy (tanpa thumbUrl, jadi
  // gambarnya placeholder lewat imgFor) — sama dengan peta di front-lakuna.
  let photos: Photo[];
  if (USE_DUMMY_MAP) {
    photos = DUMMY_API_PHOTOS.filter((p) => p.type === "FOTO").map(adaptPhoto);
  } else {
    // API membatasi satu halaman ≤ 100 foto (permintaan limit=200 dulu hanya mengembalikan 100):
    // lokasi dengan foto lama tersingkir dari peta begitu ada lokasi yang fotonya banyak. Ambil
    // halaman berikutnya bila ada (paralel, maks 10 halaman); katalog kecil tak menambah permintaan.
    const first = await fetchPhotos({ type: "FOTO", limit: 100, page: 1 });
    photos = [...first.photos];
    const more = Math.min(first.totalPages, 10) - 1;
    if (more > 0) {
      const rest = await Promise.all(
        Array.from({ length: more }, (_, i) =>
          fetchPhotos({ type: "FOTO", limit: 100, page: i + 2 }).catch(() => ({ photos: [] as Photo[] })),
        ),
      );
      for (const r of rest) photos.push(...r.photos);
    }
  }

  // Peta hanya mengambil 200 foto terbaru; foto pilihan admin yang lebih lama tak boleh hilang
  // diam-diam → ambil per id (maks 80 permintaan paralel, yang gagal dilewati).
  if (platePhotoIds.length && !USE_DUMMY_MAP) {
    const have = new Set(photos.map((p) => p.id));
    const missing = platePhotoIds.filter((id) => !have.has(id)).slice(0, 80);
    const extra = await Promise.all(missing.map((id) => fetchPhotoById(id).catch(() => null)));
    for (const p of extra) if (p && p.assetType !== "VIDEO") photos.push(p);
  }

  // Group key = location ternormalisasi (lowercase) supaya "Danau Toba" dan
  // "danau toba" menyatu jadi satu titik; nama tampil = casing asli pertama.
  const byKey = new Map<string, { name: string; coord: { lat: number; lng: number }; shots: Photo[] }>();
  for (const p of photos) {
    const loc = (p.location ?? "").trim();
    if (!loc) continue;
    const c = geocodeLocation(loc);
    if (!c) continue;
    const key = normalizeLoc(loc);
    const entry = byKey.get(key);
    if (entry) entry.shots.push(p);
    else byKey.set(key, { name: loc, coord: c, shots: [p] });
  }

  const hotspots: MapHotspot[] = [];
  for (const { name, coord, shots } of byKey.values()) {
    hotspots.push({
      name,
      lat: coord.lat,
      lng: coord.lng,
      cat: shots[0].cat,
      desc: { id: name, en: name },
      photos: shots.map((s) => ({
        id: s.id,
        seed: s.seed,
        thumbUrl: s.thumbUrl,
        // Pratinjau 1000 px ber-watermark — file asli tidak pernah dikirim ke publik.
        hdUrl: s.watermarkUrl ?? undefined,
        caption: s.title,
      })),
    });
  }
  // Satu tempat, satu titik: nama lokasi yang berbeda ("DKI Jakarta" dan
  // "Jakarta", "DI Yogyakarta" dan "Yogyakarta") sering dipetakan ke koordinat
  // yang sama atau nyaris sama. Dibiarkan terpisah, keduanya digambar sebagai
  // kluster "2 titik" yang TAK PERNAH terurai saat di-zoom — terbaca seolah ada
  // dua wilayah padahal cuma satu. Titik yang lebih dekat dari NEAR_KM (di
  // bawah jarak yang masih bisa dipisahkan zoom maksimum kluster) digabung:
  // bingkainya disatukan, namanya ikut yang bingkainya lebih banyak. Kluster
  // di peta jadi hanya untuk tempat BERBEDA yang bertumpuk di layar.
  const NEAR_KM = 6;
  const km = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
    const r = Math.PI / 180;
    const dLat = (b.lat - a.lat) * r;
    const dLng = (b.lng - a.lng) * r;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLng / 2) ** 2;
    return 2 * 6371 * Math.asin(Math.sqrt(h));
  };
  const merged: MapHotspot[] = [];
  for (const h of hotspots) {
    const m = merged.find((x) => km(x, h) <= NEAR_KM);
    if (!m) {
      merged.push({ ...h, photos: [...h.photos] });
      continue;
    }
    if (h.photos.length > m.photos.length) {
      m.name = h.name;
      m.desc = h.desc;
      m.cat = h.cat;
      m.lat = h.lat;
      m.lng = h.lng;
    }
    m.photos = [...m.photos, ...h.photos];
  }
  // Pilihan admin: bila sebuah titik punya foto yang dipilih, HANYA foto itu yang tampil (urutan
  // sesuai pilihan; yang pertama jadi penanda & pertama dibuka). Titik yang belum dipilih tetap
  // menampilkan semua fotonya. Dilakukan setelah penggabungan titik berdekatan, supaya pilihan
  // dari kedua nama lokasi ikut dan tak hilang saat titik digabung.
  if (platePhotoIds.length) {
    const rank = new Map(platePhotoIds.map((id, i) => [id, i] as const));
    for (const h of merged) {
      const picked = h.photos.filter((p) => rank.has(p.id ?? ""));
      if (picked.length) h.photos = picked.sort((a, b) => (rank.get(a.id ?? "") ?? 0) - (rank.get(b.id ?? "") ?? 0));
    }
  }
  // Urut west → east (busur Sabang → Merauke).
  merged.sort((a, b) => a.lng - b.lng);
  return merged;
}

/**
 * `false`: peta Nusantara memakai foto database (/api/photos). Set
 * `VITE_USE_DUMMY_MAP=true` bila butuh dataset dummy (tanpa backend).
 */
export const USE_DUMMY_MAP = import.meta.env.VITE_USE_DUMMY_MAP
	? import.meta.env.VITE_USE_DUMMY_MAP !== "false"
	: false;

/**
 * `false`: gambar memakai URL asli dari API (thumbUrl/watermarkUrl/imageUrl,
 * disajikan MinIO); placeholder hanya dipakai bila URL asli kosong. Set `true`
 * untuk memaksa seluruh gambar memakai placeholder — tidak ada perubahan lain
 * yang dibutuhkan karena semua sumber gambar lewat `imgFor()`.
 * Bisa dioverride via env `VITE_USE_DUMMY_IMAGES=true` (untuk Vercel).
 */
export const USE_DUMMY_IMAGES = import.meta.env.VITE_USE_DUMMY_IMAGES === "true";

/** URL placeholder deterministik: seed yang sama selalu memberi gambar sama. */
export function dummyImg(seed: string, w: number, h: number) {
  return `https://picsum.photos/seed/lakuna-${seed}/${w}/${h}`;
}

export function imgFor(seed: string, w: number, h: number, thumbUrl?: string | null) {
  if (!USE_DUMMY_IMAGES && thumbUrl) return thumbUrl;
  return dummyImg(seed, w, h);
}

export function fmtIDR(n: number): string {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
}

export const COLLECTIONS: Collection[] = [
  { id: "laut-timur", title: { id: "Laut Timur", en: "Eastern Sea" }, desc: { id: "Bingkai-bingkai dari kepulauan rempah hingga Raja Ampat.", en: "Frames from the spice islands to Raja Ampat." }, seed: "col-laut-timur", count: 48, cat: "travel" },
  { id: "punggung-nusantara", title: { id: "Punggung Nusantara", en: "Spine of Nusantara" }, desc: { id: "Pegunungan dan gunung berapi dari Sabang hingga Papua.", en: "Mountains and volcanoes from Sabang to Papua." }, seed: "col-punggung", count: 62, cat: "nature" },
  { id: "kota-yang-tak-tidur", title: { id: "Kota yang Tak Tidur", en: "The Sleepless City" }, desc: { id: "Detak urban Jakarta, Surabaya, dan Bandung.", en: "The urban pulse of Jakarta, Surabaya, and Bandung." }, seed: "col-kota", count: 37, cat: "urban" },
  { id: "wajah-nusantara", title: { id: "Wajah Nusantara", en: "Faces of Nusantara" }, desc: { id: "Potret dan ritual dari ujung barat hingga timur.", en: "Portraits and rituals from west to east." }, seed: "col-wajah", count: 54, cat: "people" },
  { id: "sinema-malam", title: { id: "Sinema Malam", en: "Night Cinema" }, desc: { id: "Cahaya rendah, neon, dan bayang malam.", en: "Low light, neon, and the shadows of night." }, seed: "col-sinema", count: 29, cat: "cinema" },
  { id: "garis-bisnis", title: { id: "Garis Bisnis", en: "Business Lines" }, desc: { id: "Visual korporat yang bersih dan minimal.", en: "Clean, minimal corporate visuals." }, seed: "col-bisnis", count: 22, cat: "business" },
];