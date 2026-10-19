import { apiBase, isClientNavigation } from "$lib/seo";
import type { PageLoad } from "./$types";

export type PlanSeo = { name: string; quota: number; priceMonthly: number; priceAnnual: number };

/** Paket langganan untuk schema Offer di <head> (SSR saja; tampilan harga tetap dimuat PricingPage sendiri). */
export const load: PageLoad = async ({ fetch }) => {
	if (isClientNavigation()) return { plans: [] as PlanSeo[] };
	try {
		const r = await fetch(`${apiBase()}/api/plans`, { signal: AbortSignal.timeout(4000) });
		const json = r.ok ? ((await r.json()) as { data?: (PlanSeo & { isActive?: boolean })[] }) : null;
		const plans = (json?.data ?? [])
			.filter((p) => p?.name && p.isActive !== false)
			.map(({ name, quota, priceMonthly, priceAnnual }) => ({ name, quota, priceMonthly, priceAnnual }));
		return { plans };
	} catch {
		return { plans: [] as PlanSeo[] };
	}
};
