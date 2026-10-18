/**
 * Memulai langganan dari mana pun (popup harga di halaman detail). Jalurnya
 * sama dengan PricingPage.handleSubscribe: POST /api/subscription
 * (planId + billing + payOption), TIDAK lewat keranjang — backend tak mengenal
 * item plan di keranjang lokal.
 */
import { apiPostOnce } from "$lib/api";
import type { ApiResponse } from "$lib/types";

export type Billing = "annual" | "monthly";

export type SubscribeResult =
	| { kind: "pay"; path: string } // halaman bayar milik Lakuna
	| { kind: "external"; url: string } // halaman bayar DOKU langsung (cadangan)
	| { kind: "active" } // gratis (diskon 100%): langsung aktif
	| { kind: "badlink" }; // redirect tak lolos allowlist

/** Redirect pembayaran hanya boleh ke halaman bayar DOKU (https, *.doku.com). */
function isPaymentRedirect(raw: string | null | undefined): raw is string {
	if (!raw) return false;
	let u: URL;
	try {
		u = new URL(raw.trim());
	} catch {
		return false;
	}
	if (u.protocol !== "https:") return false;
	const h = u.hostname.toLowerCase();
	return h === "doku.com" || h.endsWith(".doku.com");
}

/** Melempar ApiError bila gagal (401 = belum login). */
export async function startSubscription(planId: string, billing: Billing, voucherCode?: string): Promise<SubscribeResult> {
	const res = await apiPostOnce<
		ApiResponse<{ redirectUrl?: string | null; orderId?: string; payOrderId?: string; requiresPayment?: boolean }>
	>("/api/subscription", {
		planId,
		billing,
		payOption: billing === "annual" ? "upfront" : "monthly",
		voucherCode: voucherCode || undefined,
	});
	const d = res.data;
	// Tagihan berbayar → halaman bayar Lakuna (→ DOKU). Dulu ditentukan dari redirectUrl Snap; kini backend tak
	// membuat sesi pembayaran saat tagihan dibuat, jadi penandanya requiresPayment (false = gratis, sudah aktif).
	if (d?.payOrderId && d.requiresPayment !== false) return { kind: "pay", path: `/payment/pay/${encodeURIComponent(d.payOrderId)}` };
	if (d?.redirectUrl) return isPaymentRedirect(d.redirectUrl) ? { kind: "external", url: d.redirectUrl } : { kind: "badlink" };
	return { kind: "active" };
}
