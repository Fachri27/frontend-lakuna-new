import type { ApiPhoto, ApiPlan, ApiCategory, ApiEvent, ApiResponse, HomepageSection } from "./types";
export type { HomepageSection, ApiEvent };
import { apiGet } from "./api";
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
  cat: Cat;
  seed: string;
  w: number;
  h: number;
  price: number;
  categories: string[];
  keywords: string[];
  tags: string[];
  desc: Localized;
  featured?: boolean;
  thumbUrl?: string;
  watermarkUrl?: string;
};

export type Video = {
  id: string;
  title: Localized;
  author: string;
  cat: Cat;
  seed: string;
  duration: string;
  price: number;
  desc: Localized;
  thumbUrl?: string;
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

export function adaptPhoto(api: ApiPhoto): Photo {
  const cats = (api.photoCategories ?? []).map((pc) => pc.category.name);
  const keywords = (api.photoKeywords ?? []).map((pk) => pk.keyword.name);
  const cat = apiCatToCat(cats);
  return {
    id: api.id,
    title: { id: api.title, en: api.title },
    author: api.photographer || "Unknown",
    location: api.location || undefined,
    cat,
    seed: api.id,
    w: api.width || 1600,
    h: api.height || 1200,
    price: api.price,
    // Nama kategori & keyword asli dari API — dipakai PhotoDetail (kategori dari
    // API, bukan catLabel; keywords menggantikan field "Lokasi").
    categories: [...new Set(cats.filter(Boolean))],
    keywords: [...new Set(keywords.filter(Boolean))],
    tags: api.tags ?? [],
    desc: { id: api.description || api.title, en: api.description || api.title },
    thumbUrl: api.thumbUrl,
    watermarkUrl: api.watermarkUrl ?? undefined,
  };
}

export function adaptVideo(api: ApiPhoto): Video {
  return {
    id: api.id,
    title: { id: api.title, en: api.title },
    author: api.photographer || "Unknown",
    cat: "cinema",
    seed: api.id,
    duration: "02:00",
    price: api.price,
    desc: { id: api.description || api.title, en: api.description || api.title },
    thumbUrl: api.thumbUrl,
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
  page?: number;
  limit?: number;
}): Promise<{ photos: Photo[]; total: number; totalPages: number }> {
  const params = new URLSearchParams();
  if (opts?.cat) params.set("categoryId", opts.cat);
  if (opts?.search) params.set("search", opts.search);
  if (opts?.type) params.set("type", opts.type);
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

export async function fetchPhotoById(id: string): Promise<Photo | null> {
  try {
    const res = await apiGet<ApiResponse<ApiPhoto>>(`/api/photos/${id}`);
    if (!res.success || !res.data) return dummyPhotoById(id);
    return adaptPhoto(res.data);
  } catch {
    return dummyPhotoById(id);
  }
}

export async function fetchRelatedPhotos(id: string, limit = 4): Promise<Photo[]> {
  try {
    const res = await apiGet<ApiResponse<ApiPhoto[]>>(`/api/photos/${id}/related?limit=${limit}`);
    if (USE_DUMMY_IMAGES && res.data.length === 0) return dummyRelated(id, limit);
    return res.data.map(adaptPhoto);
  } catch {
    return dummyRelated(id, limit);
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
export async function fetchHomepage(): Promise<Record<string, HomepageSection>> {
  try {
    const res = await apiGet<ApiResponse<HomepageSection[]>>("/api/homepage");
    const map: Record<string, HomepageSection> = {};
    for (const s of res.data) map[s.key] = s;
    return map;
  } catch {
    return {};
  }
}

// ─── Peta Nusantara: titik-titik dari API ───────────────────────────────
// Foto di backend hanya punya field `location` (string bebas, mis. "Danau
// Toba", "Raja Ampat") — tanpa koordinat. Untuk menempatkan titik di peta,
// nama tempat di-geocode lewat tabel lookup statis berikut (alias Indonesia
// → lat/lng). Foto dengan location tidak dikenali dilewati.
export type MapShot = {
  seed: string;
  thumbUrl?: string;
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
  // Cocokkan alias sebagai substring (mis. "Danau Toba saat fajar" → "toba").
  for (const g of GEOCODE) {
    for (const a of g.aliases) {
      const an = normalizeLoc(a);
      if (!an) continue;
      if (norm === an || norm.includes(an)) return { lat: g.lat, lng: g.lng };
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
export async function fetchMapHotspots(): Promise<MapHotspot[]> {
  // Ambil halaman besar sekali jalan — peta butuh sebanyak mungkin titik.
  const { photos } = await fetchPhotos({ type: "FOTO", limit: 200 });

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
        seed: s.seed,
        thumbUrl: s.thumbUrl,
        caption: s.title,
      })),
    });
  }
  // Urut west → east (busur Sabang → Merauke).
  hotspots.sort((a, b) => a.lng - b.lng);
  return hotspots;
}

/**
 * Sementara: seluruh gambar frontend dipaksa memakai placeholder, URL asli dari
 * API (thumbUrl/watermarkUrl/imageUrl) diabaikan. Set `false` bila aset asli
 * sudah siap dan mau dipakai lagi — tidak ada perubahan lain yang dibutuhkan
 * karena semua sumber gambar lewat `imgFor()`.
 */
export const USE_DUMMY_IMAGES = true;

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