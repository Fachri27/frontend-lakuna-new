import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
	plugins: [sveltekit(), tailwindcss()],
	server: {
		hmr: {
			overlay: false,
			timeout: 60000
		}
	},
	ssr: {
		// gsap adalah CJS; tanpa ini, Node serverless (Vercel) gagal named-import
		// "gsap/ScrollTrigger" saat SSR. Bundle gsap langsung ke output server.
		noExternal: ["gsap"]
	}
});