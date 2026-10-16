import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import type { Plugin } from "vite";

/**
 * ScrollTrigger memasang loop rAF kosong abadi (`_rafBugFix`, "supaya repaint Firefox konsisten") sejak
 * plugin didaftarkan — di SETIAP halaman. Akibatnya thread utama menjalankan frame 60×/dtk walau halaman diam
 * (jejak 1366×768, CPU 4× lambat: 16–19% sibuk saat diam di footer). Di Chromium loop itu tak berguna: frame
 * tetap dijadwalkan saat ada gulir/animasi. Panggilan awalnya dibatasi ke non-Chromium (Firefox/Safari tetap
 * seperti aslinya). Hanya build produksi — dev memakai deps pra-bundel.
 */
function gsapRafKeepAliveOff(): Plugin {
	return {
		name: "lakuna:gsap-raf-keepalive-off",
		apply: "build",
		transform(code, id) {
			if (!/[\\/]node_modules[\\/]gsap[\\/]ScrollTrigger\.js$/.test(id.split("?")[0])) return null;
			const calls = code.match(/(?<![\w.])_rafBugFix\(\);/g)?.length ?? 0;
			if (calls !== 1) {
				this.warn(`_rafBugFix(): ${calls} panggilan (diharapkan 1) — ScrollTrigger dibiarkan apa adanya`);
				return null;
			}
			return {
				code: code.replace(
					/(?<![\w.])_rafBugFix\(\);/,
					'(typeof navigator === "undefined" || !/\\bChrome\\//.test(navigator.userAgent)) && _rafBugFix();'
				),
				map: null
			};
		}
	};
}

export default defineConfig({
	plugins: [gsapRafKeepAliveOff(), sveltekit(), tailwindcss()],
	server: {
		// Hanya host tunnel (cloudflared/ngrok) untuk share demo — bukan `true`: itu mematikan proteksi
		// DNS-rebinding Vite (situs lain bisa membaca kode sumber dev). localhost & IP selalu diizinkan.
		allowedHosts: [".trycloudflare.com", ".ngrok-free.app", ".ngrok.app"],
		hmr: {
			overlay: false,
			timeout: 60000
		}
	},
	optimizeDeps: {
		// MapLibre 6 (ESM) memuat worker lewat new URL("./maplibre-gl-worker.mjs",
		// import.meta.url). Bila di-prebundle ke .vite/deps, berkas worker tak
		// ikut disalin → 404 "Worker failed to load" dan peta kosong.
		exclude: ["maplibre-gl"]
	},
	ssr: {
		// gsap adalah CJS; tanpa ini, Node serverless (Vercel) gagal named-import
		// "gsap/ScrollTrigger" saat SSR. Bundle gsap langsung ke output server.
		noExternal: ["gsap"]
	}
});