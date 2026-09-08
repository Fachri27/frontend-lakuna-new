import type { ApiPhoto, ApiCategory } from "./types";

/**
 * Dataset placeholder untuk mode `USE_DUMMY_IMAGES` (lihat `data.ts`).
 *
 * Dipakai sebagai fallback ketika backend belum jalan / belum ada isinya, supaya
 * setiap section di frontend (archive strip, peta Nusantara, galeri, grid
 * kategori, halaman foto & video) tetap punya konten dan gambar untuk dirender.
 * Bentuknya sengaja `ApiPhoto`/`ApiCategory` mentah supaya bisa lewat
 * `adaptPhoto()`/`adaptVideo()` yang sama dengan data asli — tidak ada jalur
 * render terpisah yang harus dirawat.
 *
 * `thumbUrl` sengaja kosong: URL gambar dibangkitkan `imgFor(seed, w, h)` dari
 * id, jadi satu item selalu dapat gambar yang sama di semua halaman.
 */

type Row = {
  id: string;
  title: string;
  desc: string;
  photographer: string;
  /** Harus cocok dengan alias GEOCODE di data.ts supaya muncul di peta. */
  location: string;
  category: string;
  keywords: string[];
  price: number;
  w: number;
  h: number;
  type?: "FOTO" | "VIDEO";
};

// Lokasi dipilih menyebar Sabang → Merauke supaya busur peta Nusantara terisi.
const ROWS: Row[] = [
  { id: "dummy-01", title: "Titik Nol Sabang", desc: "Ombak pertama di ujung barat Nusantara.", photographer: "Rangga Wisesa", location: "Sabang", category: "Landscape", keywords: ["laut", "pantai", "senja"], price: 145000, w: 1600, h: 1067 },
  { id: "dummy-02", title: "Kabut Danau Toba", desc: "Pagi yang belum selesai di atas kaldera.", photographer: "Rangga Wisesa", location: "Danau Toba", category: "Landscape", keywords: ["danau", "kabut", "gunung"], price: 165000, w: 1600, h: 1000 },
  { id: "dummy-03", title: "Rumah Gadang", desc: "Atap bergonjong menahan cahaya sore.", photographer: "Sekar Ayu", location: "Bukittinggi", category: "Travel", keywords: ["arsitektur", "budaya", "minang"], price: 130000, w: 1200, h: 1600 },
  { id: "dummy-04", title: "Musi Sebelum Terang", desc: "Perahu-perahu di bawah Ampera.", photographer: "Bayu Pradana", location: "Palembang", category: "Urban", keywords: ["sungai", "jembatan", "biru"], price: 120000, w: 1600, h: 1067 },
  { id: "dummy-05", title: "Monas Jam Lima", desc: "Denyut ibu kota sebelum lampu menyala.", photographer: "Bayu Pradana", location: "Jakarta", category: "Urban", keywords: ["kota", "gedung", "malam"], price: 155000, w: 1600, h: 900 },
  { id: "dummy-06", title: "Kawah Putih", desc: "Belerang, kabut, dan warna yang tak percaya diri.", photographer: "Sekar Ayu", location: "Bandung", category: "Nature", keywords: ["kawah", "kabut", "pastel"], price: 140000, w: 1600, h: 1067 },
  { id: "dummy-07", title: "Borobudur Sunyi", desc: "Stupa pertama yang kena matahari.", photographer: "Ilham Nurcahyo", location: "Yogyakarta", category: "Travel", keywords: ["candi", "sejarah", "fajar"], price: 175000, w: 1600, h: 1067 },
  { id: "dummy-08", title: "Punggung Bromo", desc: "Lautan pasir dari bibir kaldera.", photographer: "Ilham Nurcahyo", location: "Bromo", category: "Landscape", keywords: ["gunung", "vulkanik", "fajar"], price: 185000, w: 1600, h: 1000 },
  { id: "dummy-09", title: "Telaga Warna Dieng", desc: "Hijau yang berubah tiap jam.", photographer: "Sekar Ayu", location: "Dieng", category: "Nature", keywords: ["telaga", "dataran tinggi", "hijau"], price: 135000, w: 1600, h: 1067 },
  { id: "dummy-10", title: "Sawah Jatiluwih", desc: "Terasering yang dirawat subak sejak lama.", photographer: "Made Suparta", location: "Bali", category: "Nature", keywords: ["sawah", "terasering", "hijau"], price: 150000, w: 1600, h: 900 },
  { id: "dummy-11", title: "Penari Legong", desc: "Jeda satu detik sebelum gerak berikutnya.", photographer: "Made Suparta", location: "Ubud", category: "Portrait", keywords: ["tari", "budaya", "potret"], price: 195000, w: 1200, h: 1600 },
  { id: "dummy-12", title: "Bukit Wairinding", desc: "Punggung bukit Sumba yang berulang.", photographer: "Yosia Rambu", location: "Sumba", category: "Landscape", keywords: ["bukit", "savana", "sore"], price: 160000, w: 1600, h: 1000 },
  { id: "dummy-13", title: "Wae Rebo Pagi", desc: "Tujuh rumah kerucut di atas awan.", photographer: "Yosia Rambu", location: "Flores", category: "Travel", keywords: ["kampung", "adat", "kabut"], price: 205000, w: 1600, h: 1067 },
  { id: "dummy-14", title: "Padar dari Puncak", desc: "Tiga teluk, tiga warna pasir.", photographer: "Yosia Rambu", location: "Labuan Bajo", category: "Landscape", keywords: ["pulau", "teluk", "laut"], price: 210000, w: 1600, h: 900 },
  { id: "dummy-15", title: "Pasar Paotere", desc: "Bongkar muat yang tak pernah pelan.", photographer: "Andi Mappe", location: "Makassar", category: "People", keywords: ["pasar", "pelaut", "aktivitas"], price: 125000, w: 1600, h: 1067 },
  { id: "dummy-16", title: "Bunaken Biru", desc: "Dinding karang yang jatuh ke gelap.", photographer: "Andi Mappe", location: "Manado", category: "Nature", keywords: ["laut", "karang", "selam"], price: 190000, w: 1600, h: 1067 },
  { id: "dummy-17", title: "Gamalama Menjaga", desc: "Ternate dan gunungnya yang selalu hadir.", photographer: "Fahmi Latuconsina", location: "Ternate", category: "Landscape", keywords: ["gunung", "pulau", "rempah"], price: 145000, w: 1600, h: 1000 },
  { id: "dummy-18", title: "Banda Neira", desc: "Benteng, pala, dan air yang tenang.", photographer: "Fahmi Latuconsina", location: "Banda Neira", category: "Travel", keywords: ["sejarah", "pulau", "kolonial"], price: 170000, w: 1600, h: 1067 },
  { id: "dummy-19", title: "Piaynemo", desc: "Karst Raja Ampat dari ketinggian.", photographer: "Fahmi Latuconsina", location: "Raja Ampat", category: "Landscape", keywords: ["karst", "laguna", "papua"], price: 245000, w: 1600, h: 900 },
  { id: "dummy-20", title: "Lembah Baliem", desc: "Kabut turun ke ladang pagi.", photographer: "Yakob Wenda", location: "Wamena", category: "People", keywords: ["lembah", "adat", "papua"], price: 200000, w: 1600, h: 1067 },
  { id: "dummy-21", title: "Sabana Wasur", desc: "Ujung timur yang datar dan panjang.", photographer: "Yakob Wenda", location: "Merauke", category: "Nature", keywords: ["sabana", "rawa", "timur"], price: 155000, w: 1600, h: 1000 },
  { id: "dummy-22", title: "Ruang Rapat Sudirman", desc: "Kaca, garis, dan jam kerja.", photographer: "Bayu Pradana", location: "Jakarta", category: "Business", keywords: ["korporat", "kantor", "minimal"], price: 115000, w: 1600, h: 1067 },
  { id: "dummy-23", title: "Neon Kemang", desc: "Warna yang hanya ada setelah gelap.", photographer: "Bayu Pradana", location: "Kemang", category: "Cinema", keywords: ["neon", "malam", "sinematik"], price: 135000, w: 1600, h: 900 },
  { id: "dummy-24", title: "Kopi Toraja Sore", desc: "Uap tipis dan tangan yang sabar.", photographer: "Andi Mappe", location: "Makassar", category: "Business", keywords: ["kopi", "produk", "hangat"], price: 110000, w: 1200, h: 1600 },

  // Video
  { id: "dummy-v1", title: "Sabang ke Merauke", desc: "Rangkuman perjalanan lintas Nusantara.", photographer: "Rangga Wisesa", location: "Sabang", category: "Cinema", keywords: ["perjalanan", "sinematik"], price: 450000, w: 1920, h: 1080, type: "VIDEO" },
  { id: "dummy-v2", title: "Pagi di Bromo", desc: "Kaldera dari gelap sampai terang.", photographer: "Ilham Nurcahyo", location: "Bromo", category: "Cinema", keywords: ["timelapse", "gunung"], price: 380000, w: 1920, h: 1080, type: "VIDEO" },
  { id: "dummy-v3", title: "Arus Raja Ampat", desc: "Gerak air di atas karang.", photographer: "Fahmi Latuconsina", location: "Raja Ampat", category: "Cinema", keywords: ["bawah air", "laut"], price: 520000, w: 1920, h: 1080, type: "VIDEO" },
  { id: "dummy-v4", title: "Denyut Jakarta", desc: "Dua belas jam dipadatkan jadi satu menit.", photographer: "Bayu Pradana", location: "Jakarta", category: "Cinema", keywords: ["kota", "timelapse"], price: 410000, w: 1920, h: 1080, type: "VIDEO" },
  { id: "dummy-v5", title: "Tenun Sumba", desc: "Tangan, benang, dan waktu.", photographer: "Yosia Rambu", location: "Sumba", category: "Cinema", keywords: ["kriya", "budaya"], price: 360000, w: 1920, h: 1080, type: "VIDEO" },
  { id: "dummy-v6", title: "Pasar Terapung", desc: "Perahu jukung sebelum matahari penuh.", photographer: "Andi Mappe", location: "Banjarmasin", category: "Cinema", keywords: ["sungai", "pasar"], price: 395000, w: 1920, h: 1080, type: "VIDEO" },
];

const NOW = "2026-01-01T00:00:00.000Z";

function toApiPhoto(r: Row): ApiPhoto {
  return {
    id: r.id,
    title: r.title,
    description: r.desc,
    photographer: r.photographer,
    location: r.location,
    price: r.price,
    type: r.type ?? "FOTO",
    status: "APPROVED",
    width: r.w,
    height: r.h,
    format: r.type === "VIDEO" ? "mp4" : "jpg",
    userId: "dummy-user",
    originalKey: `${r.id}/original`,
    thumbKey: `${r.id}/thumb`,
    watermarkKey: null,
    // Dikosongkan supaya `imgFor()` yang membangkitkan URL placeholder.
    thumbUrl: "",
    watermarkUrl: null,
    originalUrl: null,
    tags: r.keywords,
    createdAt: NOW,
    updatedAt: NOW,
    photoCategories: [{ category: { id: `cat-${r.category.toLowerCase()}`, name: r.category } }],
    photoKeywords: r.keywords.map((k) => ({ keyword: { id: `kw-${k}`, name: k } })),
  };
}

export const DUMMY_API_PHOTOS: ApiPhoto[] = ROWS.map(toApiPhoto);

export const DUMMY_CATEGORIES: ApiCategory[] = [
  { id: "cat-landscape", name: "Landscape", description: "Bentang alam dari pesisir sampai kaldera." },
  { id: "cat-nature", name: "Nature", description: "Hutan, laut, dan yang tumbuh di antaranya." },
  { id: "cat-urban", name: "Urban", description: "Kota, garis, dan jam sibuknya." },
  { id: "cat-portrait", name: "Portrait", description: "Wajah dan cerita yang dibawanya." },
  { id: "cat-travel", name: "Travel", description: "Jejak perjalanan lintas Nusantara." },
  { id: "cat-people", name: "People", description: "Aktivitas sehari-hari yang jujur." },
  { id: "cat-business", name: "Business", description: "Visual korporat yang bersih." },
  { id: "cat-cinema", name: "Cinema", description: "Cahaya rendah dan warna malam." },
].map((c) => ({ ...c, imageKey: null, imageUrl: null, createdAt: NOW, updatedAt: NOW }));
