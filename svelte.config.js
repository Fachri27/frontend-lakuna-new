import adapter from "@sveltejs/adapter-vercel";
import { createHash } from "node:crypto";
import { EARLY_SCRIPT } from "./src/lib/preloadEarly.js";

const sha256 = (text) => `sha256-${createHash("sha256").update(text).digest("base64")}`;

/** @type {import('@sveltejs/kit').Config} */
const config = {
	compilerOptions: {
		// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
		runes: ({ filename }) => (filename.split(/[/\\]/).includes("node_modules") ? undefined : true)
	},
	kit: {
		adapter: adapter({ runtime: "nodejs22.x" }),
		// Tab yang terbuka saat ada deploy baru memuat file lama yang sudah dihapus
		// ("Failed to fetch dynamically imported module"). SvelteKit memeriksa
		// /_app/version.json tiap menit; begitu versi berubah, navigasi berikutnya
		// memuat ulang halaman penuh alih-alih gagal.
		version: { pollInterval: 60_000 },
		// Kebijakan CSP KEDUA khusus script (yang lengkap dipasang hooks.server.ts; browser menegakkan keduanya):
		// tanpa 'unsafe-inline' — script inline hanya jalan bila ber-nonce (bootstrap SvelteKit, app.html) atau
		// hash-nya cocok (script dini Preloader, handler `this.__e=event` buatan Svelte untuk load/error <img>
		// sebelum hidrasi). Script sisipan XSS tidak punya keduanya → diblokir.
		csp: {
			mode: "auto",
			directives: {
				"script-src": ["self", "https://accounts.google.com", "unsafe-hashes", sha256("this.__e=event"), sha256(EARLY_SCRIPT)]
			}
		}
	}
};

export default config;