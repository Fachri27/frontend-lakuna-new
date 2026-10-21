export type ApiPhoto = {
  id: string;
  title: string;
  /** Dibuat dengan AI generatif (Studio → AI Generate) — label publik "Dibuat dengan AI". */
  aiGenerated?: boolean;
  /** Versi Inggris (opsional); kosong = situs memakai versi Indonesia. */
  titleEn?: string | null;
  description: string | null;
  descriptionEn?: string | null;
  photographer: string;
  location: string | null;
  /** Tanggal & waktu pengambilan (ISO, opsional); null = tidak diisi. */
  takenAt?: string | null;
  price: number;
  type: "FOTO" | "VIDEO" | "AUDIO";
  /** AUDIO (halaman Sounds): durasi detik, tempo, jenis, dan puncak waveform 0–100. */
  duration?: number | null;
  bpm?: number | null;
  audioKind?: "MUSIC" | "SFX" | null;
  waveform?: number[] | null;
  /** Foto eksklusif: tetap FOTO di semua filter/galeri. */
  isExclusive?: boolean | null;
  status: "APPROVED" | "PENDING" | "REJECTED";
  width: number;
  height: number;
  format: string;
  userId: string;
  originalKey: string;
  thumbKey: string;
  watermarkKey: string | null;
  thumbUrl: string;
  watermarkUrl: string | null;
  originalUrl: string | null;
  /** Klip kartu bersih (VIDEO, 8 dtk tanpa watermark); null bila belum dibuat. */
  clipUrl?: string | null;
  /** Klip kartu potret 3:4 (VIDEO) untuk rel "Collection of videos" di beranda; null bila belum dibuat. */
  cardClipUrl?: string | null;
  /** Versi kecil (600 × 800) untuk koneksi lambat. */
  cardClipSmUrl?: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  photoCategories: { category: { id: string; name: string; nameEn?: string | null } }[];
  photoKeywords: { keyword: { id: string; name: string; lang?: "id" | "en" } }[];
};

export type ApiPlan = {
  id: string;
  name: string;
  badge: string | null;
  description: string | null;
  quota: number;
  priceMonthly: number;
  priceAnnual: number;
  highlight: boolean;
  isActive: boolean;
};

export type ApiSubscription = {
  id?: string;
  planId?: string;
  plan?: string;
  quota: number;
  used: number;
  remaining: number;
  billing?: string;
  payOption?: string;
  price?: number;
  status: string;
  startedAt?: string;
  expiresAt?: string;
};

export type ApiUser = {
  id: string;
  username: string;
  email: string;
  realName: string | null;
  avatarKey: string | null;
  avatarUrl: string | null;
  newsletter: boolean;
  role: "USER" | "ADMIN" | "CONTRIBUTOR";
  createdAt: string;
  subscription: {
    quota: number;
    used: number;
    status: string;
    expiresAt: string | null;
  } | null;
};

export type ApiCartItem = {
  id: string;
  userId: string;
  photoId: string;
  license: string;
  createdAt: string;
  price: number;
  thumbUrl: string;
  photo: { id: string; title: string; titleEn?: string | null; thumbKey: string; price: number; type?: "FOTO" | "VIDEO" | "AUDIO" };
};

export type ApiFavorite = {
  id: string;
  userId: string;
  photoId: string;
  createdAt: string;
  photo: {
    id: string;
    title: string;
    titleEn?: string | null;
    thumbUrl: string;
    watermarkUrl: string | null;
    price: number;
    type: string;
    photographer: string;
  };
};

export type HeroVideoVariant = { id: string; url: string; w: number; h: number; portrait: boolean; bytes?: number | null };

export type HomepageSection = {
  key: "hero" | "manifesto" | "anjungan_1" | "mulai" | "journeys" | "orbit" | "arsip" | "video" | "harga" | "klip" | "banding" | "percaya" | "etalase" | "koridor_kiri" | "koridor_kanan";
  imageKey: string | null;
  imageUrl: string | null;
  /** Jenis media latar hero: "video" = klip autoplay bisu. */
  mediaType: "image" | "video" | null;
  /** Versi bertingkat video hero (l720…l2160 lanskap, p1080/p2160 potret ponsel); null = hanya imageUrl. */
  videoVariants?: HeroVideoVariant[] | null;
  /** Frame pertama video hero (JPEG). */
  posterUrl?: string | null;
  kicker: string | null;
  title: string | null;
  body: string | null;
  cta: string | null;
  /** id foto terpilih (section journeys/orbit). */
  photoIds: string[] | null;
  /** Objek foto ter-resolve (dengan thumbUrl) — section journeys/orbit. */
  photos: ApiPhoto[] | null;
  updatedAt: string | null;
};

export type ApiCreateOrderResult = {
  orderId: string;
  snapToken: string;
  redirectUrl: string;
  subtotal: number;
  discountAmount: number;
  discountSource: string | null;
  total: number;
};

export type ApiOrder = {
  id: string;
  userId: string;
  total: number;
  status: string;
  midtransOrderId: string | null;
  paidAt: string | null;
  discountAmount: number;
  createdAt: string;
  continuePaymentUrl: string | null;
  items: {
    id: string;
    photo: { id: string; title: string; titleEn?: string | null; thumbUrl: string };
    licenseType: string;
    price: number;
  }[];
};

export type ApiDownload = {
  id: string;
  userId: string;
  photoId: string;
  type: string;
  expiresAt: string;
  licenseKey: string;
  createdAt: string;
  photo: {
    id: string;
    title: string;
    titleEn?: string | null;
    thumbUrl: string;
    watermarkUrl: string | null;
  };
  order: { id: string; total: number; createdAt: string };
};

export type ApiCategory = {
  id: string;
  name: string;
  description: string | null;
  /** Versi Inggris dari CMS; kosong = pakai name/description. */
  nameEn?: string | null;
  descriptionEn?: string | null;
  imageKey: string | null;
  imageUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

/** Event diskon aktif (GET /api/events/active?photoId= | planId=). */
export type ApiEvent = {
  id: string;
  name: string;
  description: string | null;
  valueType: "PERCENT" | "NOMINAL";
  value: number;
  maxDiscount: number | null;
  targetType: "PHOTO" | "PLAN";
  startsAt: string;
  endsAt: string;
  isActive: boolean;
};

export type ApiResponse<T> = {
  success: boolean;
  data: T;
  meta?: { page: number; limit: number; total: number; totalPages: number };
  message?: string;
};

export type ApiError = {
  success: false;
  error: { code: string; message: string; details?: unknown[] };
};
