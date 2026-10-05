export type Lang = "id" | "en";

export type Copy = {
  nav: { tagline: string; photos: string; videos: string; categories: string; pricing: string; signin: string; langLabel: string; searchPlaceholder: string };
  hero: { kicker: string; titleA: string; titleEm: string; titleB: string; sub: string; cta: string; scroll: string; searchLabel: string; count: string };
  manifesto: { kicker: string; title: string; body: string; link: string };
  makers: {
    kicker: string;
    title: string;
    /** Jumlah orang perlu bentuk jamak yang berbeda antar bahasa. */
    people: (n: number) => string;
    frames: string;
    unplaced: string;
    viewWork: (name: string) => string;
  };
  lacuna: {
    kicker: string;
    /** Kalimat judul dirakit dari kata bilangan, bukan template angka —
     *  urutan katanya berbeda antar bahasa. */
    sentence: (filled: string, total: string) => string;
    provinces: string; filled: string; empty: string;
    frame: (n: number) => string;
    none: string; idle: string; seeAll: string;
  };
  journeys: { kicker: string; title: string; cta: string; open: string; close: string; prev: string; next: string; items: { title: string; desc: string; tag: string }[] };
  feature1: { kicker: string; title: string; body: string; link: string };
  feature2: { kicker: string; title: string; body: string; link: string };
  stats: { kicker: string; items: { v: number; suffix: string; l: string }[] };
  cats: { kicker: string; title: string; sub: string; items: string[]; explore: string; seeMore: string; seeLess: string; sheetRest: string; sheetEnd: string; unit: string; frame: string };
  pricing: { kicker: string; title: string; body: string; cta: string };
  closing: { kicker: string; title: string; titleEm: string; body: string; cta: string };
  access: {
    panelKicker: string; panelTitle: string; panelDesc: string; closeLabel: string;
    voucherKicker: string; voucherTitle: string; voucherCode: string; voucherDesc: string;
    voucherCta: string; copy: string; copied: string; expired: string; expiredDesc: string;
    voucherDefaultDesc: string;
    d: string; h: string; m: string; s: string;
    a11yKicker: string; a11yTitle: string;
    reduceMotion: string; reduceMotionDesc: string;
    highContrast: string; highContrastDesc: string;
    textSize: string; textSizeSm: string; textSizeMd: string; textSizeLg: string;
    cvdTitle: string; cvdDesc: string; cvdOff: string; cvdProtan: string; cvdDeuter: string; cvdTritan: string; cvdMono: string;
    cvdProtanDesc: string; cvdDeuterDesc: string; cvdTritanDesc: string; cvdMonoDesc: string;
    cvdStrength: string; cvdPreview: string; cvdOsHint: string;
    reset: string; previewLabel: string;
  };
  footer: {
    /* Dipecah tiga seperti hero (titleA/titleEm/titleB). Sebelumnya satu string
       yang dipecah runtime pada kata harfiah "across" — begitu diterjemahkan,
       split-nya gagal dan bagian keduanya tercetak sebagai "undefined". */
    taglineA: string; taglineEm: string; taglineB: string;
    company: string; companyItems: string[];
    legal: string; legalItems: string[];
    support: string; supportItems: string[];
    rights: string; made: string;
  };
};

export const dict: Record<Lang, Copy> = {
  id: {
    nav: { tagline: "Jelajahi Nusantara", photos: "Foto", videos: "Video", categories: "Kategori", pricing: "Harga", signin: "Masuk", langLabel: "ID", searchPlaceholder: "Cari gambar dan video" },
    hero: {
      kicker: "Lakuna — Arsip Visual Nusantara",
      titleA: "Perjalanan visual",
      titleEm: "menembus",
      titleB: "Nusantara",
      sub: "Ribuan koleksi foto dan video dari Sabang sampai Merauke. Menangkap realita melalui bermacam perspektif",
      cta: "Jelajahi koleksi",
      scroll: "Gulir",
      searchLabel: "Cari di arsip",
      count: "{n} bingkai dalam arsip",
    },
    manifesto: {
      kicker: "Manifesto",
      title: "Setiap bingkai adalah sebuah perjalanan",
      body: "Lakuna lahir dari keyakinan bahwa gambar terbaik tidak diambil, melainkan ditemukan — perlahan, dengan sabar, di antara cahaya dan waktu. Kami mengumpulkan karya para perajangga terbaik Indonesia agar setiap cerita punya rumah",
      link: "Pelajari cerita kami",
    },
    makers: {
      kicker: "Perajangga",
      title: "70% dari setiap penjualan kembali ke mereka",
      people: (n) => `${n} orang`,
      frames: "bingkai",
      unplaced: "Lokasi belum dicatat",
      viewWork: (name) => `Lihat karya ${name}`,
    },
    lacuna: {
      kicker: "Lakuna",
      sentence: (f, t) =>
        `${f.charAt(0).toUpperCase()}${f.slice(1)} dari ${t} provinsi sudah punya bingkai di sini`,
      provinces: "provinsi",
      filled: "terisi",
      empty: "belum",
      frame: () => "bingkai",
      none: "Belum ada bingkai dari sini",
      idle: "Arahkan ke provinsi mana pun untuk melihat isinya",
      seeAll: "Buka arsip",
    },
    journeys: {
      kicker: "Koleksi foto",
      title: "Jelajah khatulistiwa melalui lensa",
      cta: "Lihat semua bingkai",
      open: "Lihat bingkai",
      close: "Tutup",
      prev: "Sebelumnya",
      next: "Berikutnya",
      items: [
        { title: "Bawah permukaan", desc: "Biru laut Banda dan rahasia kapal kuno di dasar perairan timur", tag: "Laut" },
        { title: "Di atas awan", desc: "Pegunungan tinggi dan kabut Rinjani yang menahan napas saat fajar", tag: "Pegunungan" },
        { title: "Alun-alun kota", desc: "Detik-detik jalanan, neon, dan ritual urban yang berdenyut", tag: "Urban" },
      ],
    },
    feature1: {
      kicker: "Anjungan 01",
      title: "Bawah permukaan",
      body: "Sebuah perjalanan ke dasar laut Banda — tempat cahaya menyusut menjadi garis-garis tipis dan waktu berjalan lebih lambat dari biasanya",
      link: "Lihat anjungan",
    },
    feature2: {
      kicker: "Anjungan 02",
      title: "Di atas awan",
      body: "Dari punggung Rinjani menuju kabut fajar — bingkai-bingkai yang menahan napas sejenak sebelum matahari benar-benar muncul",
      link: "Lihat anjungan",
    },
    stats: {
      kicker: "Dalam angka",
      items: [
        { v: 12000, suffix: "+", l: "Bingkai terkurasi" },
        { v: 1700, suffix: "+", l: "Perajangga" },
        { v: 34, suffix: "", l: "Kategori" },
        { v: 4, suffix: "", l: "Video" },
      ],
    },
    cats: {
      sheetRest: "{n} lagi di lembar ini", sheetEnd: "Ujung lembar",
      kicker: "Koleksi video",
      title: "Setiap\nvisual\nmemiliki\ncerita",
      sub: "Cuplikan sinematik dari database — arahkan kursor untuk pratinjau gerak, klik untuk halaman detail",
      items: ["Alam", "Kota", "Orang", "Travel", "Bisnis", "Sinema"],
      explore: "Tonton",
      seeMore: "Lihat {n} video lain",
      seeLess: "Lihat lebih sedikit",
      unit: "klip",
      frame: "Klip",
    },
    pricing: {
      kicker: "Berlangganan",
      title: "Akses tanpa batas\npada seluruh koleksi",
      body: "Dapatkan ribuan aset dengan kualitas terbaik",
      cta: "Lihat paket",
    },
    closing: {
      kicker: "Mulai",
      title: "Mulai perjalananmu",
      titleEm: "hari ini",
      body: "Buat akun, simpan bingkai favorit, dan unduh karya pertamamu. Gerbang Nusantara terbuka",
      cta: "Buat akun",
    },
    access: {
      panelKicker: "Panel",
      panelTitle: "Aksesibilitas & Notifikasi",
      panelDesc: "Atur tampilan dan pantau voucher aktif di satu tempat",
      closeLabel: "Tutup",
      voucherKicker: "Voucher aktif",
      voucherTitle: "Nusantara25",
      voucherCode: "NUSANTARA25",
      voucherDesc: "Potongan 25% untuk seluruh koleksi foto & video",
      voucherDefaultDesc: "Gunakan kode ini saat checkout untuk potongan harga",
      voucherCta: "Pakai voucher",
      copy: "Salin kode",
      copied: "Tersalin",
      expired: "Voucher berakhir",
      expiredDesc: "Maaf, voucher ini sudah tidak berlaku. Pantau panel untuk voucher berikutnya",
      d: "hari", h: "jam", m: "mnt", s: "dtk",
      a11yKicker: "Aksesibilitas",
      a11yTitle: "Sesuaikan tampilan",
      reduceMotion: "Kurangi gerak",
      reduceMotionDesc: "Matikan animasi & transisi halus",
      highContrast: "Kontras tinggi",
      highContrastDesc: "Perkuat batas teks dan garis",
      textSize: "Ukuran teks",
      textSizeSm: "Kecil", textSizeMd: "Normal", textSizeLg: "Besar",
      cvdTitle: "Mode Buta Warna",
      cvdDesc: "Koreksi warna foto/video agar lebih mudah dibedakan",
      cvdOff: "Mati", cvdProtan: "Protanopia", cvdDeuter: "Deuteranopia", cvdTritan: "Tritanopia", cvdMono: "Monokrom",
      cvdProtanDesc: "Buta merah — merah menggelap ke arah hijau",
      cvdDeuterDesc: "Buta hijau — paling umum; merah & hijau membaur",
      cvdTritanDesc: "Buta biru — biru & kuning membaur",
      cvdMonoDesc: "Buta warna total — tingkatkan kontras",
      cvdStrength: "Kekuatan",
      cvdPreview: "Pratinjau — pilih yang paling jelas terlihat",
      cvdOsHint: "Untuk koreksi paling akurat, gunakan filter warna OS Anda (Windows: Color filters; macOS: Display → Color filters; iOS/Android: Aksesibilitas → Filter warna). Berlaku di seluruh sistem dan sudah terkalibrasi medis",
      reset: "Setel ulang",
      previewLabel: "Pratinjau",
    },
    footer: {
      taglineA: "Every frame ", taglineEm: "finds a home", taglineB: " in one archive",
      company: "Perusahaan", companyItems: ["Tentang kami", "Ekowisata", "Ulasan", "Kontributor"],
      legal: "Legal", legalItems: ["Ketentuan penggunaan", "Kebijakan privasi", "Preferensi cookie"],
      support: "Dukungan", supportItems: ["Bantuan", "FAQ", "Layanan pelanggan"],
      rights: "© 2026 Lakuna Nusantara Media. Hak cipta dilindungi",
      made: "Dirajut di Nusantara",
    },
  },
  en: {
    nav: { tagline: "Explore Nusantara", photos: "Photos", videos: "Videos", categories: "Categories", pricing: "Pricing", signin: "Sign in", langLabel: "EN", searchPlaceholder: "Search images and videos" },
    hero: {
      kicker: "Lakuna — The Visual Archive of Nusantara",
      titleA: "A visual journey",
      titleEm: "across",
      titleB: "Nusantara",
      sub: "Thousands of collections of photo and video from Sabang to Merauke. Capture a reality through the variety of perspective",
      cta: "Explore the collection",
      scroll: "Scroll",
      searchLabel: "Search the archive",
      count: "{n} frames in the archive",
    },
    manifesto: {
      kicker: "Manifesto",
      title: "Every frame is a journey",
      body: "Lakuna is born from the belief that the best images are not taken but found — slowly, patiently, between light and time. We gather the work of Indonesia's finest image-makers so every story has a home",
      link: "Read our story",
    },
    makers: {
      kicker: "Image-makers",
      title: "70% of every sale goes back to them",
      people: (n) => `${n} ${n === 1 ? "person" : "people"}`,
      frames: "frames",
      unplaced: "Location not recorded",
      viewWork: (name) => `See work by ${name}`,
    },
    lacuna: {
      kicker: "Lacuna",
      sentence: (f, t) =>
        `${f.charAt(0).toUpperCase()}${f.slice(1)} of ${t} provinces have frames here`,
      provinces: "provinces",
      filled: "filled",
      empty: "still empty",
      frame: (n) => (n === 1 ? "frame" : "frames"),
      none: "No frames from here yet",
      idle: "Point at any province to see what it holds",
      seeAll: "Open the archive",
    },
    journeys: {
      kicker: "Collection of photos",
      title: "Portraits that speak without words",
      cta: "See all frames",
      open: "View frame",
      close: "Close",
      prev: "Previous",
      next: "Next",
      items: [
        { title: "Beneath the surface", desc: "The blue of the Banda Sea and the secrets of ancient wrecks below", tag: "Sea" },
        { title: "Above the clouds", desc: "High peaks and the breath-held mist of Rinjani at dawn", tag: "Peaks" },
        { title: "City squares", desc: "The pulse of streets, neon, and the rituals of urban life", tag: "Urban" },
      ],
    },
    feature1: {
      kicker: "Pavilion 01",
      title: "Beneath the surface",
      body: "A descent to the floor of the Banda Sea — where light thins into faint lines and time moves slower than it should",
      link: "View pavilion",
    },
    feature2: {
      kicker: "Pavilion 02",
      title: "Above the clouds",
      body: "From the spine of Rinjani into the dawn mist — frames that hold the breath for a moment before the sun truly rises",
      link: "View pavilion",
    },
    stats: {
      kicker: "In numbers",
      items: [
        { v: 12000, suffix: "+", l: "Curated frames" },
        { v: 1700, suffix: "+", l: "Image-makers" },
        { v: 34, suffix: "", l: "Categories" },
        { v: 4, suffix: "", l: "Video" },
      ],
    },
    cats: {
      sheetRest: "{n} more on the sheet", sheetEnd: "End of sheet",
      kicker: "Collection of videos",
      title: "A moment\nin time,\na memory\nfor life",
      sub: "Cinematic clips from the database — hover for a motion preview, click for the detail page",
      items: ["Nature", "Urban", "People", "Travel", "Business", "Cinema"],
      explore: "Watch",
      seeMore: "Show {n} more",
      seeLess: "Show fewer",
      unit: "clips",
      frame: "Clip",
    },
    pricing: {
      kicker: "Subscription",
      title: "Limitless access\nto the archives",
      body: "Get a thousand of best quality frames from our archives",
      cta: "See plans",
    },
    closing: {
      kicker: "Begin",
      title: "Begin your journey",
      titleEm: "today",
      body: "Create an account, save your favourite frames, and download your first work. The gateway to Nusantara is open",
      cta: "Create account",
    },
    access: {
      panelKicker: "Panel",
      panelTitle: "Accessibility & Notices",
      panelDesc: "Adjust the view and track active vouchers in one place",
      closeLabel: "Close",
      voucherKicker: "Active voucher",
      voucherTitle: "Nusantara25",
      voucherCode: "NUSANTARA25",
      voucherDesc: "25% off the entire photo & video collection",
      voucherDefaultDesc: "Use this code at checkout for a discount",
      voucherCta: "Use voucher",
      copy: "Copy code",
      copied: "Copied",
      expired: "Voucher expired",
      expiredDesc: "Sorry, this voucher is no longer valid. Watch the panel for the next one",
      d: "days", h: "hrs", m: "min", s: "sec",
      a11yKicker: "Accessibility",
      a11yTitle: "Adjust the view",
      reduceMotion: "Reduce motion",
      reduceMotionDesc: "Turn off animations & smooth transitions",
      highContrast: "High contrast",
      highContrastDesc: "Strengthen text edges and lines",
      textSize: "Text size",
      textSizeSm: "Small", textSizeMd: "Default", textSizeLg: "Large",
      cvdTitle: "Color Vision Assist",
      cvdDesc: "Correct photo/video colour so hues are easier to tell apart",
      cvdOff: "Off", cvdProtan: "Protanopia", cvdDeuter: "Deuteranopia", cvdTritan: "Tritanopia", cvdMono: "Monochrome",
      cvdProtanDesc: "Red-blind — reds darken toward green",
      cvdDeuterDesc: "Green-blind — most common; red & green blend",
      cvdTritanDesc: "Blue-blind — blue & yellow blend",
      cvdMonoDesc: "Full colorblind — boost contrast",
      cvdStrength: "Strength",
      cvdPreview: "Preview — pick what looks clearest",
      cvdOsHint: "For the most accurate correction, use your OS color filter (Windows: Color filters; macOS: Display → Color filters; iOS/Android: Accessibility → Color filters). It applies system-wide and is medically calibrated",
      reset: "Reset",
      previewLabel: "Preview",
    },
    footer: {
      taglineA: "Every frame ", taglineEm: "finds a home", taglineB: " in one archive",
      company: "Company", companyItems: ["About us", "Ecotourism", "Reviews", "Contributor"],
      legal: "Legal", legalItems: ["Terms of use", "Privacy policy", "Cookie preferences"],
      support: "Support", supportItems: ["Help", "FAQ", "Customer service"],
      rights: "© 2026 Lakuna Nusantara Media. All rights reserved",
      made: "Crafted in Nusantara",
    },
  },
};
