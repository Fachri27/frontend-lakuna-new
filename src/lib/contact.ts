/**
 * Kontak resmi Lakuna — satu tempat untuk semua halaman (Customer service,
 * Kebijakan Privasi, harga Custom di beranda). Isi di sini; yang kosong tidak
 * ditampilkan dan tombolnya jatuh ke halaman Customer service.
 */
export const COMPANY = "Lakuna Nusantara Media";
export const ADDRESS = "Jl. Ayub No. 28 RT 11 / RW 01, Pejaten Barat, Pasar Minggu, Kota Jakarta Selatan, 12510";
/** Alamat yang sama dalam bagian-bagian (schema.org PostalAddress untuk mesin pencari) — ubah bersamaan. */
export const ADDRESS_PARTS = {
	streetAddress: "Jl. Ayub No. 28 RT 11 / RW 01, Pejaten Barat, Pasar Minggu",
	addressLocality: "Jakarta Selatan",
	addressRegion: "DKI Jakarta",
	postalCode: "12510",
	addressCountry: "ID",
} as const;

/** Email layanan pelanggan, mis. "cs@domain.id". Kosong = belum diumumkan. */
export const CONTACT_EMAIL = "";

export function mailto(subject: string): string {
	return CONTACT_EMAIL ? `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}` : "/customer-service";
}
