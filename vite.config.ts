import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
	plugins: [sveltekit(), tailwindcss()],
	server: {
		// Izinkan host tunnel (cloudflared/ngrok) untuk share demo ke orang lain.
		allowedHosts: true,
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