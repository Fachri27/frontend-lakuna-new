/**
 * Kontak resmi Lakuna — satu tempat untuk semua halaman (Customer service,
 * Kebijakan Privasi, harga Custom di beranda). Isi di sini; yang kosong tidak
 * ditampilkan dan tombolnya jatuh ke halaman Customer service.
 */
export const COMPANY = "Lakuna Nusantara Media";
export const ADDRESS = "Jl. Ayub No. 28 RT 11 / RW 01, Pejaten Barat, Pasar Minggu, Kota Jakarta Selatan, 12510";

/** Email layanan pelanggan, mis. "cs@domain.id". Kosong = belum diumumkan. */
export const CONTACT_EMAIL = "";

export function mailto(subject: string): string {
	return CONTACT_EMAIL ? `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}` : "/customer-service";
}
