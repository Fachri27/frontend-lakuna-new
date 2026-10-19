import type { RequestHandler } from "./$types";
import { siteOrigin } from "$lib/seo";

/**
 * robots.txt — semua mesin pencari & mesin jawab AI dipersilakan membaca halaman publik (GEO: supaya Lakuna bisa
 * dikutip ChatGPT, Claude, Perplexity, Gemini, Copilot). Yang ditutup hanya halaman transaksi & akun.
 *
 * Crawler yang punya grup sendiri MENGABAIKAN grup `*`, jadi daftar Disallow diulang di grup AI. Ingin menolak
 * crawler pelatihan model tertentu (mis. GPTBot, Google-Extended, CCBot) tanpa kehilangan kutipan di pencarian AI?
 * Pindahkan namanya ke BLOCKED_AI — bot pencarian/kutipan (OAI-SearchBot, Claude-SearchBot, PerplexityBot) tetap boleh.
 */

// Halaman lain yang tak diindeks (/p/…, /support, /legal/…) memakai meta noindex, BUKAN Disallow: halaman yang
// diblokir robots.txt tak bisa dibaca noindex-nya, lalu tetap bisa muncul sebagai URL kosong bila ditautkan.
const PRIVATE = ["/checkout", "/payment", "/profile", "/login"];

/** Bot mesin jawab AI & pelatihan model — eksplisit diizinkan. */
const AI_BOTS = [
	"OAI-SearchBot",
	"ChatGPT-User",
	"GPTBot",
	"Claude-SearchBot",
	"Claude-User",
	"ClaudeBot",
	"PerplexityBot",
	"Perplexity-User",
	"Google-Extended",
	"Applebot",
	"Applebot-Extended",
	"Bingbot",
	"DuckAssistBot",
	"Amazonbot",
	"meta-externalagent",
	"MistralAI-User",
	"CCBot",
];
/** Bot yang ditolak seluruhnya (kosong: semua boleh). */
const BLOCKED_AI: string[] = [];

export const GET: RequestHandler = ({ url }) => {
	const origin = siteOrigin(url);
	const disallow = PRIVATE.map((p) => `Disallow: ${p}`).join("\n");
	const body = [
		"# Lakuna Stock — foto & video stok Indonesia",
		"# Ringkasan untuk model bahasa: " + `${origin}/llms.txt`,
		"",
		"User-agent: *",
		"Allow: /",
		disallow,
		"",
		"# Mesin jawab AI (GEO): dipersilakan membaca & mengutip halaman publik.",
		...AI_BOTS.filter((b) => !BLOCKED_AI.includes(b)).map((b) => `User-agent: ${b}`),
		"Allow: /",
		disallow,
		"",
		...(BLOCKED_AI.length ? [...BLOCKED_AI.map((b) => `User-agent: ${b}`), "Disallow: /", ""] : []),
		`Sitemap: ${origin}/sitemap.xml`,
		"",
	].join("\n");

	return new Response(body, {
		headers: {
			"Content-Type": "text/plain; charset=utf-8",
			"Cache-Control": "public, max-age=3600",
		},
	});
};
