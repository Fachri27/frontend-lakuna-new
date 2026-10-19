import { browser } from "$app/environment";
import { cleanApiBase } from "$lib/api";
import { ADDRESS_PARTS, COMPANY, CONTACT_EMAIL } from "$lib/contact";

/**
 * SEO & GEO (Generative Engine Optimization) — satu sumber untuk meta tag, data terstruktur schema.org (JSON-LD),
 * sitemap.xml, robots.txt, dan llms.txt.
 *
 * Mesin pencari & mesin jawab AI (ChatGPT, Claude, Perplexity, Gemini) kebanyakan TIDAK menjalankan JavaScript:
 * yang mereka baca hanya HTML hasil SSR. Karena data situs ini dimuat di klien, semua yang penting untuk ditemukan
 * (judul, deskripsi, gambar pratinjau, lisensi, lokasi) harus ikut di <head> lewat komponen Seo.svelte.
 */

/** Nama merek di judul, og:site_name, dan schema WebSite (logo: "lakunastock"). */
export const SITE_NAME = "Lakuna Stock";
export const SITE_ALT_NAMES = ["Lakuna", "lakunastock", "Lakuna Foto"];
export const SITE_TAGLINE = "Foto & Video Stok Indonesia";
export const DEFAULT_DESCRIPTION =
	"Foto dan video stok Indonesia yang dikurasi: alam, budaya, kota, dan ekowisata Nusantara dari fotografer lokal. Lisensi komersial jelas — beli satuan atau berlangganan.";
/** Gambar pratinjau tautan bawaan (1200×630) — halaman tanpa gambar sendiri. */
export const DEFAULT_OG_IMAGE = { path: "/og-default.jpg", width: 1200, height: 630, alt: "Lakuna Stock — foto & video stok Indonesia" };
export const LOGO = { path: "/icons/icon-512.png", width: 512, height: 512 };

/**
 * Alamat kanonis situs. VITE_SITE_URL (mis. https://lakuna.id) diisi begitu domain resmi aktif; selama kosong,
 * dipakai host yang sedang melayani — tak ada domain yang di-hardcode (dulu sitemap menunjuk lakuna.id yang belum ada).
 */
export function siteOrigin(url: URL): string {
	const env = (import.meta.env.VITE_SITE_URL ?? "").trim().replace(/\/+$/, "");
	return /^https?:\/\/[^/]+$/i.test(env) ? env : url.origin;
}

export function absUrl(origin: string, pathOrUrl: string): string {
	return /^https?:\/\//i.test(pathOrUrl) ? pathOrUrl : `${origin}${pathOrUrl.startsWith("/") ? "" : "/"}${pathOrUrl}`;
}

/**
 * Basis API untuk load SSR / endpoint server. Di server Docker dev, "localhost:3100" adalah container frontend
 * sendiri → API_INTERNAL_URL (http://api:3100). Di Vercel kosong → VITE_API_URL (alamat publik), sama dengan
 * yang dipakai browser, sehingga respons fetch SSR yang di-inline SvelteKit terpakai ulang saat hidrasi.
 */
export function apiBase(): string {
	if (browser) {
		const h = location.hostname;
		if (h === "localhost" || h === "127.0.0.1") return "http://localhost:3100";
	} else {
		const internal = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.API_INTERNAL_URL;
		if (internal) return cleanApiBase(internal);
	}
	return cleanApiBase(import.meta.env.VITE_API_URL) || "http://localhost:3100";
}

/** Rapikan spasi & potong di batas kata (meta description ±160 karakter sebelum dipotong Google). */
export function clip(text: string, max = 160): string {
	const t = text.replace(/\s+/g, " ").trim();
	if (t.length <= max) return t;
	const cut = t.slice(0, max - 1);
	const sp = cut.lastIndexOf(" ");
	return `${(sp > max * 0.6 ? cut.slice(0, sp) : cut).replace(/[\s,.;:—–-]+$/, "")}…`;
}

const stripEnd = (s: string) => s.trim().replace(/[\s.。!?]+$/, "");

/**
 * <script type="application/ld+json"> untuk {@html}. Escape `<`, `>`, `&`, dan pemisah baris Unicode: judul &
 * deskripsi berasal dari isian kontributor — "</script>" di judul tak boleh bisa menutup tag dan menyisipkan HTML.
 * (Blok data JSON-LD tidak dieksekusi, jadi tak perlu nonce CSP.)
 */
export function ldScript(...items: (Record<string, unknown> | null | undefined | false)[]): string {
	const graph = items.filter(Boolean);
	if (graph.length === 0) return "";
	const json = JSON.stringify({ "@context": "https://schema.org", "@graph": graph }, (_k, v) =>
		v === null || v === undefined || v === "" || (Array.isArray(v) && v.length === 0) ? undefined : v
	)
		.replace(/</g, "\\u003c")
		.replace(/>/g, "\\u003e")
		.replace(/&/g, "\\u0026")
		.replace(/\u2028/g, "\\u2028")
		.replace(/\u2029/g, "\\u2029");
	return `<script type="application/ld+json">${json}</script>`;
}

export const orgId = (origin: string) => `${origin}/#organization`;
export const websiteId = (origin: string) => `${origin}/#website`;

/** Entitas bisnis (Knowledge Panel, kutipan AI, SEO lokal Jakarta). */
export function organizationLd(origin: string): Record<string, unknown> {
	return {
		"@type": "Organization",
		"@id": orgId(origin),
		name: SITE_NAME,
		alternateName: SITE_ALT_NAMES,
		legalName: COMPANY,
		url: `${origin}/`,
		logo: { "@type": "ImageObject", url: absUrl(origin, LOGO.path), width: LOGO.width, height: LOGO.height },
		image: absUrl(origin, DEFAULT_OG_IMAGE.path),
		description: DEFAULT_DESCRIPTION,
		slogan: "Arsip visual Nusantara",
		email: CONTACT_EMAIL || undefined,
		address: { "@type": "PostalAddress", ...ADDRESS_PARTS },
		areaServed: [{ "@type": "Country", name: "Indonesia" }, "Worldwide"],
		knowsAbout: [
			"Foto stok Indonesia",
			"Video stok Indonesia",
			"Stock footage Indonesia",
			"Fotografi Nusantara",
			"Ekowisata Indonesia",
			"Lisensi gambar komersial",
		],
		contactPoint: {
			"@type": "ContactPoint",
			contactType: "customer service",
			url: `${origin}/customer-service`,
			email: CONTACT_EMAIL || undefined,
			availableLanguage: ["id", "en"],
			areaServed: "ID",
		},
	};
}

/** Situs + kotak pencarian (nama situs di hasil Google; aksi cari dibaca agen AI). */
export function websiteLd(origin: string): Record<string, unknown> {
	return {
		"@type": "WebSite",
		"@id": websiteId(origin),
		url: `${origin}/`,
		name: SITE_NAME,
		alternateName: SITE_ALT_NAMES,
		description: DEFAULT_DESCRIPTION,
		inLanguage: ["id-ID", "en"],
		publisher: { "@id": orgId(origin) },
		potentialAction: {
			"@type": "SearchAction",
			target: { "@type": "EntryPoint", urlTemplate: `${origin}/archives?q={search_term_string}` },
			"query-input": "required name=search_term_string",
		},
	};
}

export type Crumb = { name: string; path: string };
export function breadcrumbLd(origin: string, crumbs: Crumb[]): Record<string, unknown> {
	return {
		"@type": "BreadcrumbList",
		itemListElement: [{ name: "Beranda", path: "/" }, ...crumbs].map((c, i) => ({
			"@type": "ListItem",
			position: i + 1,
			name: c.name,
			item: absUrl(origin, c.path),
		})),
	};
}

/** Halaman koleksi (galeri, kategori, karya fotografer). */
export function collectionLd(origin: string, path: string, name: string, description: string): Record<string, unknown> {
	return {
		"@type": "CollectionPage",
		"@id": `${absUrl(origin, path)}#page`,
		url: absUrl(origin, path),
		name,
		description,
		isPartOf: { "@id": websiteId(origin) },
		publisher: { "@id": orgId(origin) },
		inLanguage: "id-ID",
	};
}

/* ───────────────────────── Aset (foto / video) ───────────────────────── */

export type AssetKind = "photo" | "video";
export type AssetSeo = {
	id: string;
	kind: AssetKind;
	title: string;
	titleEn: string | null;
	description: string | null;
	descriptionEn: string | null;
	photographer: string | null;
	price: number;
	width: number | null;
	height: number | null;
	location: string | null;
	takenAt: string | null;
	createdAt: string;
	updatedAt: string;
	categories: string[];
	keywords: string[];
};

type ApiAsset = {
	id: string;
	type?: "FOTO" | "VIDEO";
	title?: string;
	titleEn?: string | null;
	description?: string | null;
	descriptionEn?: string | null;
	photographer?: string | null;
	price?: number;
	width?: number | null;
	height?: number | null;
	location?: string | null;
	takenAt?: string | null;
	createdAt?: string;
	updatedAt?: string;
	photoCategories?: { category?: { name?: string } }[];
	photoKeywords?: { keyword?: { name?: string } }[];
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isAssetId = (id: string) => UUID_RE.test(id);

const uniq = (xs: (string | undefined | null)[]) => {
	const seen = new Set<string>();
	const out: string[] = [];
	for (const x of xs) {
		const v = x?.trim();
		if (v && !seen.has(v.toLowerCase())) {
			seen.add(v.toLowerCase());
			out.push(v);
		}
	}
	return out;
};

/**
 * Data SEO satu foto/video dari GET /api/photos/:id (endpoint yang juga dipakai halaman detail — ada di API lama
 * maupun baru). "missing" = API menjawab tidak ada (→ HTTP 404, bukan soft-404); null = API tak terjangkau
 * (halaman tetap tampil dengan meta umum).
 */
export async function loadAssetSeo(fetchFn: typeof fetch, id: string): Promise<AssetSeo | "missing" | null> {
	if (!isAssetId(id)) return "missing";
	try {
		const res = await fetchFn(`${apiBase()}/api/photos/${encodeURIComponent(id)}`, { signal: AbortSignal.timeout(4000) });
		if (res.status === 404 || res.status === 400) return "missing";
		if (!res.ok) return null;
		const json = (await res.json()) as { success?: boolean; data?: ApiAsset };
		const d = json?.data;
		if (!json?.success || !d?.id || !d.title) return null;
		return {
			id: d.id,
			kind: d.type === "VIDEO" ? "video" : "photo",
			title: d.title.trim(),
			titleEn: d.titleEn?.trim() || null,
			description: d.description?.trim() || null,
			descriptionEn: d.descriptionEn?.trim() || null,
			photographer: d.photographer?.trim() || null,
			price: Number(d.price) || 0,
			width: d.width ?? null,
			height: d.height ?? null,
			location: d.location?.trim() || null,
			takenAt: d.takenAt ?? null,
			createdAt: d.createdAt ?? new Date().toISOString(),
			updatedAt: d.updatedAt ?? d.createdAt ?? new Date().toISOString(),
			categories: uniq((d.photoCategories ?? []).map((c) => c.category?.name)),
			keywords: uniq((d.photoKeywords ?? []).map((k) => k.keyword?.name)),
		};
	} catch {
		return null;
	}
}

export const assetPath = (a: { id: string; kind: AssetKind }) => `/${a.kind === "video" ? "videos" : "photos"}/${a.id}`;
/** Gambar pratinjau tautan per aset — ber-watermark & tak teracak (lihat routes/og/[file]/+server.ts). */
export const assetImagePath = (id: string) => `/og/${id}.jpg`;

export function assetTitle(a: AssetSeo): string {
	return `${a.title} — ${a.kind === "video" ? "Video" : "Foto"} Stok${a.location ? ` ${a.location}` : ""}`;
}

export function assetDescription(a: AssetSeo): string {
	// Ekor (jenis, lokasi, lisensi) selalu utuh; yang dipendekkan deskripsinya.
	const tail = `${a.kind === "video" ? "Video" : "Foto"} stok ${a.location ?? "Indonesia"}, berlisensi komersial di ${SITE_NAME}.`;
	const en = a.titleEn && a.titleEn.toLowerCase() !== a.title.toLowerCase() ? ` (${stripEnd(a.titleEn)})` : "";
	const lead = clip(`${stripEnd(a.description || a.title)}${en}`, Math.max(60, 159 - tail.length));
	return `${/[.…]$/.test(lead) ? lead : `${lead}.`} ${tail}`;
}

/**
 * ImageObject / VideoObject lengkap dengan metadata lisensi — Google Images menampilkan lencana "Dapat
 * dilisensikan" dari license + acquireLicensePage + creditText + copyrightNotice + creator.
 */
export function assetLd(origin: string, a: AssetSeo): Record<string, unknown> {
	const page = absUrl(origin, assetPath(a));
	const image = absUrl(origin, assetImagePath(a.id));
	const isVideo = a.kind === "video";
	const owner = a.photographer || COMPANY;
	// Karya tim sendiri (fotografer = nama perusahaan) → Organization, bukan Person.
	const inHouse = !a.photographer || a.photographer.toLowerCase() === COMPANY.toLowerCase();
	const person = inHouse ? { "@id": orgId(origin) } : { "@type": "Person", name: a.photographer };
	const year = new Date(a.takenAt || a.createdAt).getFullYear();
	const description = [a.description, a.descriptionEn].filter(Boolean).join(" — ") || assetDescription(a);
	return {
		"@type": isVideo ? "VideoObject" : "ImageObject",
		"@id": `${page}#asset`,
		url: page,
		mainEntityOfPage: page,
		name: a.title,
		alternateName: a.titleEn && a.titleEn !== a.title ? a.titleEn : undefined,
		description,
		...(isVideo ? { thumbnailUrl: [image] } : { contentUrl: image, thumbnailUrl: image }),
		uploadDate: a.createdAt,
		datePublished: a.createdAt,
		dateModified: a.updatedAt,
		dateCreated: a.takenAt || undefined,
		contentLocation: a.location
			? { "@type": "Place", name: a.location, address: { "@type": "PostalAddress", addressCountry: "ID" } }
			: { "@type": "Country", name: "Indonesia" },
		locationCreated: a.location ? { "@type": "Place", name: `${a.location}, Indonesia` } : undefined,
		keywords: uniq([...a.categories, ...a.keywords, a.location]).join(", "),
		genre: a.categories,
		creator: person,
		creditText: inHouse ? SITE_NAME : `${a.photographer} / ${SITE_NAME}`,
		copyrightHolder: person,
		copyrightYear: Number.isFinite(year) ? year : undefined,
		copyrightNotice: `© ${Number.isFinite(year) ? `${year} ` : ""}${owner}. Lisensi melalui ${SITE_NAME}.`,
		license: absUrl(origin, "/license"),
		acquireLicensePage: page,
		isFamilyFriendly: true,
		inLanguage: "id-ID",
		isPartOf: { "@id": websiteId(origin) },
		publisher: { "@id": orgId(origin) },
		provider: { "@id": orgId(origin) },
		offers:
			a.price > 0
				? {
						"@type": "Offer",
						name: "Lisensi Standar",
						price: a.price,
						priceCurrency: "IDR",
						availability: "https://schema.org/InStock",
						url: page,
						seller: { "@id": orgId(origin) },
					}
				: undefined,
	};
}

/* ───────────────────────── Status hidrasi ───────────────────────── */

let hydrated = false;
/** Dipanggil root layout setelah hidrasi pertama. */
export function markHydrated() {
	hydrated = true;
}
/**
 * true = load sedang berjalan untuk navigasi di klien (bukan SSR / hidrasi pertama). Saat itu data SEO tak perlu
 * ditunggu: crawler selalu membuka halaman lewat SSR, jadi navigasi klien tak boleh tertahan menunggu API.
 */
export const isClientNavigation = () => browser && hydrated;

/* ───────────────────────── Load halaman detail ───────────────────────── */

export type AssetPageData = { seo: AssetSeo | null; seoLater?: Promise<AssetSeo | "missing" | null> };

/**
 * Load universal /photos/[id] & /videos/[id]. SSR (dan hidrasi — respons fetch-nya di-inline SvelteKit): data SEO
 * ditunggu supaya ada di HTML; aset tak ada → 404 sungguhan (bukan halaman kosong ber-status 200 yang dianggap
 * "soft 404"); jenis salah (video di /photos/…) → 301 ke URL kanonis. Navigasi klien: tak ditunggu (`seoLater`).
 */
export async function loadAssetPage(
	fetchFn: typeof fetch,
	id: string,
	kind: AssetKind,
	fail: (status: 404) => never,
	moved: (location: string) => never
): Promise<AssetPageData> {
	const job = loadAssetSeo(fetchFn, id);
	if (isClientNavigation()) return { seo: null, seoLater: job };
	const seo = await job;
	if (seo === "missing") {
		// Mode dummy (demo Vercel tanpa API) memakai id contoh yang tak dikenal API — biarkan halaman menanganinya.
		if (import.meta.env.VITE_USE_DUMMY_IMAGES !== "true") fail(404);
		return { seo: null };
	}
	if (seo && seo.kind !== kind) moved(assetPath(seo));
	return { seo };
}
