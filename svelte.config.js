import adapter from "@sveltejs/adapter-vercel";

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
		version: { pollInterval: 60_000 }
	}
};

export default config;