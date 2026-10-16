import type { HeroVideoVariant } from "./types";

/**
 * Pilih versi video hero untuk perangkat ini (versi dibuat API, lihat heroVariants.ts):
 *  - `starter`: versi kecil yang langsung diputar (mulai < 1 dtk di koneksi biasa);
 *  - `ladder`: versi lebih tajam yang dinaikkan satu per satu — HANYA setelah versi itu siap diputar
 *    sampai habis (crossfade, tanpa jeda), sampai `ladder` habis = versi yang dibutuhkan layar;
 *  - `native`: ukuran acuan tata letak (versi terbesar kelompoknya) — bingkai hero tak berubah saat versi
 *    berganti.
 * Batas kemampuan: perangkat lemah / hemat data / koneksi lambat berhenti di versi yang sanggup diputar
 * mulus — lebih baik sedikit kurang tajam daripada patah-patah.
 */
export type HeroPlan = {
	starter: HeroVideoVariant;
	ladder: HeroVideoVariant[];
	/** Semua versi kelompok ini, kecil → besar (untuk turun versi bila perangkat membuang frame). */
	pool: HeroVideoVariant[];
	/** Versi tertinggi yang dituju (kebutuhan layar ∧ kemampuan perangkat). */
	best: HeroVideoVariant;
	native: { w: number; h: number };
};

/** Tangga naik dari `starter` sampai `plan.best`. */
export function ladderFrom(plan: HeroPlan, starter: HeroVideoVariant): HeroVideoVariant[] {
	return plan.pool.filter((v) => px(v) > px(starter) && px(v) <= px(plan.best));
}

type Env = { vw: number; vh: number; dpr: number; cores: number; mem: number | null; saveData: boolean; slowNet: boolean; downlink: number | null };

export function heroEnv(): Env {
	const n = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean; effectiveType?: string; downlink?: number } };
	return {
		vw: window.innerWidth,
		vh: window.innerHeight,
		dpr: window.devicePixelRatio || 1,
		cores: n.hardwareConcurrency || 4,
		mem: typeof n.deviceMemory === "number" ? n.deviceMemory : null,
		saveData: !!n.connection?.saveData,
		slowNet: /(^|-)2g|3g/.test(n.connection?.effectiveType ?? ""),
		downlink: typeof n.connection?.downlink === "number" && n.connection.downlink > 0 ? n.connection.downlink : null,
	};
}

const px = (v: { w: number; h: number }) => v.w * v.h;

export function pickHeroRungs(variants: HeroVideoVariant[] | null | undefined, env: Env = heroEnv()): HeroPlan | null {
	if (!variants?.length) return null;
	const portraitAll = variants.filter((v) => v.portrait).sort((a, b) => px(a) - px(b));
	const landAll = variants.filter((v) => !v.portrait).sort((a, b) => px(a) - px(b));
	// Ponsel tegak: hanya bagian tengah video yang tampak → potongan tegak (setajam, jauh lebih ringan).
	const maxPortraitW = portraitAll.at(-1)?.w ?? 0;
	const portrait = portraitAll.length > 0 && env.vw / env.vh < 0.8 && env.vw * env.dpr <= maxPortraitW * 1.05;
	const pool = portrait ? portraitAll : landAll.length ? landAll : portraitAll;
	if (!pool.length) return null;
	const top = pool.at(-1)!;

	// Kebutuhan piksel layar (cadangan parallax hero ±9% tinggi, video 16:9 menutup layar).
	const target = portrait
		? (pool.find((v) => v.h >= Math.min(env.vh * env.dpr * 1.05, top.h)) ?? top)
		: (pool.find((v) => v.w >= Math.min(Math.max(env.vw * env.dpr, env.vh * env.dpr * 1.09 * (16 / 9)), top.w)) ?? top);

	// Batas kemampuan dekode (piksel per frame).
	let cap = Infinity;
	if ((env.mem !== null && env.mem <= 2) || env.cores <= 2) cap = 1280 * 720;
	else if ((env.mem !== null && env.mem <= 4) || env.cores <= 4) cap = 2.7e6; // ±1216×2160 / 1920×1080
	else if (env.cores < 8) cap = 2560 * 1440;
	const reachable = pool.filter((v) => px(v) <= Math.max(cap, px(pool[0]!)) && px(v) <= px(target));
	const best = reachable.at(-1) ?? pool[0]!;

	// Versi pembuka: 1080p (atau potongan tegak 1080) — kecil tapi sudah layak; koneksi lambat/hemat data:
	// yang terkecil, dan tak naik lagi.
	const lowest = pool[0]!;
	let starter = pool.find((v) => (portrait ? v.h >= 1080 : v.w >= 1920)) ?? lowest;
	if (env.saveData || env.slowNet) starter = lowest;
	// Perkiraan koneksi < 6 Mbps (Chrome): pembuka terkecil — tetap bisa naik bila ternyata sanggup.
	else if (env.downlink !== null && env.downlink < 6) starter = lowest;
	if (px(starter) > px(best)) starter = best;
	const ladder = env.saveData || env.slowNet ? [] : pool.filter((v) => px(v) > px(starter) && px(v) <= px(best));
	return { starter, ladder, pool, best, native: { w: top.w, h: top.h } };
}
