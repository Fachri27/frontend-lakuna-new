/**
 * Memulai langganan dari mana pun (popup harga di halaman detail). Jalurnya
 * sama dengan PricingPage.handleSubscribe: POST /api/subscription
 * (planId + billing + payOption), TIDAK lewat keranjang — backend tak mengenal
 * item plan di keranjang lokal.
 */
import { apiPost } from "$lib/api";
import type { ApiResponse } from "$lib/types";

export type Billing = "annual" | "monthly";

export type SubscribeResult =
	| { kind: "pay"; path: string } // halaman bayar milik Lakuna
	| { kind: "external"; url: string } // Snap Midtrans
	| { kind: "active" } // gratis (diskon 100%): langsung aktif
	| { kind: "badlink" }; // redirect tak lolos allowlist

/** Redirect pembayaran hanya boleh ke Snap Midtrans (allowlist ala PaymentPage). */
function isSnapRedirect(raw: string | null | undefined): raw is string {
	if (!raw) return false;
	let u: URL;
	try {
		u = new URL(raw.trim());
	} catch {
		return false;
	}
	if (u.protocol !== "https:") return false;
	const h = u.hostname.toLowerCase();
	return h === "app.midtrans.com" || h === "app.sandbox.midtrans.com";
}

/** Melempar ApiError bila gagal (401 = belum login). */
export async function startSubscription(planId: string, billing: Billing, voucherCode?: string): Promise<SubscribeResult> {
	const res = await apiPost<
		ApiResponse<{ snapToken: string | null; redirectUrl?: string; orderId?: string; payOrderId?: string }>
	>("/api/subscription", {
		planId,
		billing,
		payOption: billing === "annual" ? "upfront" : "monthly",
		voucherCode: voucherCode || undefined,
	});
	const d = res.data;
	if (d?.redirectUrl && d.payOrderId) return { kind: "pay", path: `/payment/pay/${encodeURIComponent(d.payOrderId)}` };
	if (d?.redirectUrl) return isSnapRedirect(d.redirectUrl) ? { kind: "external", url: d.redirectUrl } : { kind: "badlink" };
	return { kind: "active" };
}
