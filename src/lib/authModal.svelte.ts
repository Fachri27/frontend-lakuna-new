/**
 * Status popup auth global. Dibuka dari mana pun butuh login (tombol Masuk,
 * requireAuth saat tambah keranjang/favorit, voucher, payment) — tanpa pindah
 * halaman, jadi konteks (keranjang, posisi gulir) tidak hilang.
 *
 * Rute /login tetap ada sebagai fallback (deep-link, no-JS): LoginPage memakai
 * AuthPanel yang sama dengan redirect dari query.
 */
export type AuthMode = "login" | "register";

const FALLBACK_REDIRECT = "/profile";

/**
 * Sanitasi tujuan redirect. Hanya path relatif internal yang diawali SATU `/`
 * (tolak `//`, backslash, skema seperti `javascript:`, dan karakter
 * kontrol/spasi yang bisa menipu parser URL). Selain itu → fallback.
 */
export function sanitizeRedirect(raw: string | null): string {
	if (!raw) return FALLBACK_REDIRECT;
	const v = raw.trim();
	if (v.length === 0 || v.length > 2048) return FALLBACK_REDIRECT;
	if (!v.startsWith("/") || v.startsWith("//")) return FALLBACK_REDIRECT;
	// eslint-disable-next-line no-control-regex
	if (/[\s\x00-\x1f\x7f\\]/.test(v)) return FALLBACK_REDIRECT;
	return v;
}

class AuthModalState {
	isOpen = $state(false);
	redirect = $state(FALLBACK_REDIRECT);
	mode = $state<AuthMode>("login");

	open(redirect: string | null = FALLBACK_REDIRECT, mode: AuthMode = "login") {
		this.redirect = sanitizeRedirect(redirect);
		this.mode = mode;
		this.isOpen = true;
	}

	close() {
		this.isOpen = false;
	}
}

export const authModal = new AuthModalState();
