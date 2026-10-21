import { FAQ } from "$lib/faq";
import { ADDRESS, COMPANY, CONTACT_EMAIL } from "$lib/contact";
import { DEFAULT_DESCRIPTION, SITE_ALT_NAMES, SITE_NAME, absUrl, assetPath, isAssetId, kindOfType } from "$lib/seo";
import { idr, loadCatalog, loadCategories, loadEcoDestinations, loadPlans } from "./seoData";

/**
 * llms.txt (https://llmstxt.org) — ringkasan situs dalam Markdown untuk model bahasa & mesin jawab AI (GEO).
 * Fakta diambil dari sumber yang sama dengan halaman situs (FAQ, paket harga & kategori dari API), jadi tak basi.
 * `full` (llms-full.txt): + FAQ lengkap dua bahasa + daftar aset terbaru.
 */
/** Teks isian kontributor (judul, lokasi) → satu baris tanpa sintaks Markdown/HTML: tak bisa menyisipkan tautan,
 *  judul bagian, atau "instruksi" palsu ke berkas yang dibaca model bahasa. */
const plain = (s: string | null | undefined) =>
	(s ?? "").replace(/[\r\n\t]+/g, " ").replace(/[[\]()<>`*_#|\\]/g, "").replace(/\s{2,}/g, " ").trim().slice(0, 140);

export async function buildLlms(origin: string, fetchFn: typeof fetch, full: boolean): Promise<string> {
	const [catalog, cats, plans, ecos] = await Promise.all([loadCatalog(fetchFn), loadCategories(fetchFn), loadPlans(fetchFn), loadEcoDestinations(fetchFn)]);
	const u = (p: string) => absUrl(origin, p);
	const videos = catalog.filter((a) => a.type === "VIDEO").length;
	const sounds = catalog.filter((a) => a.type === "AUDIO").length;
	const photos = catalog.length - videos - sounds;
	const L: string[] = [];

	L.push(`# ${SITE_NAME}`, "");
	L.push(
		`> ${SITE_NAME} (juga dikenal sebagai ${SITE_ALT_NAMES.join(", ")}) adalah arsip dan marketplace foto & video stok Indonesia yang dikurasi: alam, budaya, kota, dan ekowisata Nusantara dari fotografer dan videografer lokal ("perajangga"), dengan lisensi komersial yang jelas. Dikelola ${COMPANY}, Jakarta Selatan, Indonesia.`,
		""
	);

	L.push("Fakta kunci:");
	// Angka koleksi baru disebut setelah cukup besar — "10 foto" dikutip mesin jawab justru merugikan.
	L.push(
		catalog.length >= 100
			? `- Koleksi saat ini: ${photos} foto, ${videos} video${sounds ? `, dan ${sounds} audio (musik & efek suara)` : ""} yang sudah dikurasi (bertambah terus; setiap karya ditinjau sebelum tayang).`
			: "- Koleksi foto & video terus bertambah; setiap karya ditinjau dan dikurasi sebelum tayang."
	);
	L.push(
		"- Lisensi Standar: bayar sekali per berkas, berlaku selamanya, untuk satu pengguna.",
		"- Lisensi Subscription: paket berlangganan bulanan atau tahunan dengan kuota unduhan; lisensi mengikuti masa langganan aktif.",
		"- Boleh untuk keperluan komersial: iklan, situs web, media sosial, kemasan, presentasi, dan pekerjaan klien.",
		"- Tidak boleh: menjual kembali/membagikan ulang berkas sebagai produk mandiri, membagikan berkas mentah, memakai untuk merek dagang/logo, atau menjadikannya data latih model AI.",
		"- Hak cipta tetap pada fotografer dan/atau Lakuna; setiap unduhan disertai sertifikat lisensi PDF.",
		"- Pratinjau di situs berresolusi rendah dan ber-watermark; setelah dibayar pembeli mendapat berkas penuh tanpa watermark.",
		"- Pembayaran lewat penyedia pembayaran: pilihannya mencakup transfer bank, QRIS, GoPay, dan kartu kredit (metode yang tersedia ditampilkan saat membayar). Harga dalam Rupiah (IDR), sudah termasuk pajak.",
		"- Kontributor (perajangga) menerima 70% dari setiap penjualan.",
		"- Bahasa situs: Indonesia dan Inggris. Masuk dengan email atau akun Google."
	);
	if (plans.length) {
		L.push("- Paket langganan:");
		for (const p of plans) {
			L.push(`  - ${plain(p.name)}: ${p.quota} unduhan per bulan — ${idr(p.priceMonthly)}/bulan atau ${idr(p.priceAnnual)}/tahun${p.description ? ` (${plain(p.description)})` : ""}.`);
		}
	}
	L.push("");

	L.push("## Koleksi", "");
	L.push(
		`- [Galeri foto](${u("/photos")}): foto stok Indonesia — alam, kota, orang, travel, bisnis, sinema.`,
		`- [Galeri video](${u("/videos")}): video & stock footage Indonesia.`,
		`- [Sounds](${u("/sounds")}): musik & efek suara bebas royalti — suasana alam, budaya, dan kota Indonesia.`,
		`- [Cari arsip](${u("/archives")}): pencarian kata kunci, mis. ${u("/archives?q=bali")} (parameter \`q\`).`,
		`- [Ekowisata Nusantara](${u("/ecotourism")}): pegunungan, hutan hujan, danau, pantai, dan terumbu karang Indonesia.`
	);
	if (ecos.length) {
		L.push("- Destinasi ekowisata:");
		for (const d of ecos) L.push(`  - [${plain(d.name)}](${u(`/ecotourism/${d.slug}`)}) — ${plain(d.region)}: ${plain(d.summary)}`);
	}
	if (cats.length) {
		L.push(`- Kategori: ${cats.map((c) => `[${plain(c.nameEn && c.nameEn.toLowerCase() !== c.name.toLowerCase() ? `${c.name} / ${c.nameEn}` : c.name)}](${u(`/categories/${encodeURIComponent(c.name)}`)})`).join(", ")}.`);
	}
	L.push("");

	L.push("## Lisensi & harga", "");
	L.push(
		`- [Harga & paket](${u("/pricing")}): lisensi Standar per berkas dan paket Subscription.`,
		`- [Perjanjian lisensi](${u("/license")}): hak, batasan, dan kepemilikan.`,
		`- [Pertanyaan umum](${u("/faq")}): lisensi, pembelian, langganan, kontributor.`,
		""
	);

	L.push("## Kontributor & bantuan", "");
	L.push(
		`- [Jadi kontributor](${u("/contributor")}): kirim foto & video Nusantara; 70% dari setiap penjualan untuk perajangga.`,
		`- [Panduan](${u("/help")}): membeli, berlangganan, mengunduh, memakai voucher.`,
		`- [Layanan pelanggan](${u("/customer-service")})${CONTACT_EMAIL ? ` — ${CONTACT_EMAIL}` : ""}. Alamat: ${ADDRESS}.`,
		""
	);

	L.push("## English summary", "");
	L.push(
		`${SITE_NAME} is a curated Indonesian stock photo and stock footage archive covering the Indonesian archipelago (Nusantara) with clear commercial licensing: a Standard license (one-time payment per file, perpetual, single user) or a monthly/annual Subscription with a download quota. Previews are watermarked; licensed downloads are full-resolution without watermark and include a PDF license certificate. Contributors earn 70% of every sale. Prices are in Indonesian Rupiah (IDR).`,
		""
	);

	if (full) {
		for (const [lang, heading] of [
			["id", "Pertanyaan umum (Bahasa Indonesia)"],
			["en", "Frequently asked questions (English)"],
		] as const) {
			L.push(`## ${heading}`, "");
			for (const g of FAQ[lang].groups) {
				L.push(`### ${g.title}`, "");
				for (const it of g.items) {
					L.push(`**${it.q}**`, "", `${it.a}.${it.link ? ` [${it.link.label}](${u(it.link.href)})` : ""}`, "");
				}
			}
		}
		if (catalog.length) {
			L.push("## Karya terbaru", "");
			for (const a of catalog.slice(0, 300)) {
				const title = plain(a.title);
				if (!title || !isAssetId(a.id)) continue;
				const titleEn = plain(a.titleEn);
				const en = titleEn && titleEn !== title ? ` / ${titleEn}` : "";
				const where = plain(a.location);
				const kind = kindOfType(a.type);
				L.push(`- [${title}${en}](${u(assetPath({ id: a.id, kind }))}) — ${kind === "video" ? "video" : kind === "sound" ? "audio" : "foto"}${where ? `, ${where}` : ""}`);
			}
			L.push("");
		}
	} else {
		L.push("## Optional", "");
		L.push(
			`- [llms-full.txt](${u("/llms-full.txt")}): FAQ lengkap (Indonesia & Inggris) dan daftar karya terbaru.`,
			`- [Tentang Lakuna](${u("/about")})`,
			`- [Ulasan](${u("/reviews")})`,
			`- [Rubrik](${u("/rubrik")}): artikel & cerita di balik lensa.`,
			`- [Kebijakan privasi](${u("/privacy")})`,
			`- [Sitemap](${u("/sitemap.xml")})`,
			""
		);
	}

	L.push(`_${DEFAULT_DESCRIPTION}_`, "");
	return L.join("\n");
}
