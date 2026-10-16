import { apiPost, ApiError } from "./api";
import type { ApiResponse } from "./types";

const KEY = "lakuna-voucher-deadline";

/** Hasil cek kode voucher untuk UI. */
export type VoucherCheck =
	| { ok: true; code: string; amount: number }
	| { ok: false; reason: "invalid" | "login" | "error"; message?: string };

/**
 * Cek kode voucher ke POST /api/vouchers/validate. Nominal potongan SELALU diambil dari `discountAmount` API —
 * di sana ada pembulatan, batas maxDiscount, dan batas harga yang sama dengan yang ditagih. Dulu dihitung ulang
 * di tiap komponen (Math.round, tanpa maxDiscount) sehingga potongan yang tampil bisa lebih besar dari tagihan.
 */
export async function checkVoucher(
	code: string,
	scope: "ORDER" | "SUBSCRIPTION",
	amount: number,
): Promise<VoucherCheck> {
	try {
		const res = await apiPost<
			ApiResponse<{ valid: boolean; reason?: string; voucher?: { code: string }; discountAmount: number }>
		>("/api/vouchers/validate", { code, scope, amount });
		if (!res.data?.valid || !res.data.voucher) return { ok: false, reason: "invalid", message: res.data?.reason };
		return { ok: true, code: res.data.voucher.code, amount: res.data.discountAmount };
	} catch (err) {
		if (err instanceof ApiError && err.status === 401) return { ok: false, reason: "login" };
		return { ok: false, reason: "error", message: err instanceof ApiError ? err.message : undefined };
	}
}

/** Voucher aktif dari GET /api/vouchers/active. */
export type ActiveVoucher = {
	code: string;
	description: string | null;
	valueType: "PERCENT" | "NOMINAL";
	value: number;
	maxDiscount: number | null;
	endsAt: string;
} | null;

/** Label potongan harga (e.g. "25% off" / "Rp50.000 off"). */
export function discountLabel(v: ActiveVoucher): string {
	if (!v) return "";
	if (v.valueType === "PERCENT") return `${v.value}% off`;
	return `Rp${v.value.toLocaleString("id-ID")} off`;
}

export type Countdown = {
	expired: boolean;
	days: number;
	hours: number;
	minutes: number;
	seconds: number;
	remaining: number;
	total: number;
};

/**
 * Countdown to a target date (from API `endsAt`).
 * Seeds deadline into localStorage per voucher code so it survives reloads
 * even if the API is slow. Keyed by code so switching vouchers doesn't reuse
 * a stale deadline from a previous voucher.
 *
 * Port dari hook React `useVoucherCountdown` ke pola runes:
 * state deadline/now di-parse ulang tiap tick; pemanggil membaca `cd` getter.
 */
class VoucherCountdown {
	#deadline = $state<number | null>(null);
	#startedAt = $state(0);
	now = $state(0);

	/** `cd` — hasil countdown; null kalau belum ada deadline. */
	get cd(): Countdown | null {
		if (this.#deadline == null) return null;
		const now = this.now || Date.now();
		const rem = Math.max(0, this.#deadline - now);
		const s = Math.floor(rem / 1000);
		const total = Math.max(1, Math.floor((this.#deadline - this.#startedAt) / 1000));
		return {
			expired: rem <= 0,
			days: Math.floor(s / 86400),
			hours: Math.floor((s % 86400) / 3600),
			minutes: Math.floor((s % 3600) / 60),
			seconds: s % 60,
			remaining: s,
			total,
		};
	}

	seed(endsAt: string | null, code?: string | null) {
		if (typeof window === "undefined") return;
		this.now = Date.now();
		if (!endsAt) return;
		const target = new Date(endsAt).getTime();
		if (isNaN(target) || target <= 0) return;
		const k = code ? `${KEY}:${code}` : KEY;
		try {
			const raw = localStorage.getItem(k);
			if (raw) {
				const parts = raw.split("|");
				const storedDeadline = Number(parts[0]);
				const storedStart = parts[1] ? Number(parts[1]) : storedDeadline - 2 * 86400 * 1000;
				// Use the later of stored or API target so admin extending deadline works
				const d = Math.max(storedDeadline, target);
				localStorage.setItem(k, `${d}|${storedStart}`);
				this.#deadline = d;
				this.#startedAt = storedStart;
			} else {
				const d = target;
				const s = Date.now();
				localStorage.setItem(k, `${d}|${s}`);
				this.#deadline = d;
				this.#startedAt = s;
			}
		} catch {
			this.#deadline = target;
			this.#startedAt = Date.now();
		}
	}

	tick() {
		this.now = Date.now();
	}
}

export const voucherCountdown = new VoucherCountdown();

export function pad(n: number) {
	return String(n).padStart(2, "0");
}