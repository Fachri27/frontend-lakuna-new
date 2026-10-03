<script lang="ts">
	import { i18n, type Lang } from "$lib/i18n.svelte";
	import { fetchPhotos } from "$lib/data";
	import { PROVINCES, MAP_W, MAP_H, normalizeProvince } from "$lib/provinces";

	type Statement = { say: string; body: string; link?: { href: string; label: string } };

	const copy: Record<Lang, {
		title: string; intro: string; statements: Statement[];
		frameWord: (n: number) => string; mapLabel: string;
		address: string; company: string; browse: string; pricing: string;
	}> = {
		id: {
			title: "Lakuna berarti celah.",
			intro: "Nusantara terlalu luas untuk dilihat habis oleh satu arsip. Di peta ini, setiap provinsi tanpa bingkai adalah celah. Setiap bingkai yang ditambahkan perajangga mengisi satu.",
			statements: [
				{
					say: "Setiap bingkai ditinjau sebelum tayang.",
					body: "Perajangga mengunggah karyanya, tim kami menyetujuinya. Hanya karya yang disetujui yang masuk arsip.",
				},
				{
					say: "70% dari setiap penjualan kembali ke perajangga.",
					body: "Fotografer dan videografer mendapat penghasilan setiap kali karyanya dilisensikan.",
				},
				{
					say: "Satu lisensi, dalam bahasa yang jelas.",
					body: "Standar untuk satu bingkai, Subscription untuk kuota bulanan. Setiap unduhan disertai sertifikat lisensi dalam PDF.",
					link: { href: "/license", label: "Baca perjanjian lisensi" },
				},
			],
			frameWord: (n) => `${n} bingkai`,
			mapLabel: "Peta provinsi Indonesia; provinsi yang sudah punya bingkai di arsip ditandai ungu.",
			address: "Alamat",
			company: "Lakuna Nusantara Media",
			browse: "Jelajahi arsip",
			pricing: "Lihat harga",
		},
		en: {
			title: "Lakuna means a gap.",
			intro: "Nusantara is too large for one archive to have seen all of it. On this map, every province without a frame is a gap. Each frame an image-maker adds fills one in.",
			statements: [
				{
					say: "Every frame is reviewed before it goes live.",
					body: "Image-makers upload their work and our team approves it. Only approved frames reach the archive.",
				},
				{
					say: "70% of every sale goes back to the image-maker.",
					body: "Photographers and videographers earn each time their work is licensed.",
				},
				{
					say: "One license, written in plain language.",
					body: "Standard for a single frame, Subscription for a monthly quota. Every download comes with a PDF license certificate.",
					link: { href: "/license", label: "Read the license agreement" },
				},
			],
			frameWord: (n) => `${n} ${n === 1 ? "frame" : "frames"}`,
			mapLabel: "Map of Indonesia's provinces; provinces that already have frames in the archive are marked purple.",
			address: "Address",
			company: "Lakuna Nusantara Media",
			browse: "Browse the archive",
			pricing: "See pricing",
		},
	};

	const ADDRESS = "Jl. Ayub No. 28 RT 11 / RW 01, Pejaten Barat, Pasar Minggu, Kota Jakarta Selatan, 12510";

	const lang = $derived<Lang>(i18n.lang);
	const t = $derived(copy[lang]);
	const c = $derived(i18n.c);

	// ── Data: bingkai per provinsi (nyata, dari API) ───────────────────────
	// `location` memuat nama provinsi (kadang kota, yang dilewati: lebih baik
	// provinsi tak menyala daripada menyala salah — lihat normalizeProvince).
	let counts = $state<Record<string, number>>({});
	let ready = $state(false);

	function provinceOf(location?: string): string | null {
		if (!location) return null;
		for (const part of location.split(",")) {
			const p = normalizeProvince(part);
			if (p) return p;
		}
		return null;
	}

	$effect(() => {
		let alive = true;
		(async () => {
			try {
				const first = await fetchPhotos({ limit: 100, page: 1 });
				let rows = first.photos;
				if (first.totalPages > 1) {
					const rest = await Promise.all(
						Array.from({ length: Math.min(first.totalPages, 10) - 1 }, (_, i) => fetchPhotos({ limit: 100, page: i + 2 })),
					);
					for (const r of rest) rows = rows.concat(r.photos);
				}
				if (!alive) return;
				const next: Record<string, number> = {};
				for (const p of rows) {
					const prov = provinceOf(p.location);
					if (prov) next[prov] = (next[prov] ?? 0) + 1;
				}
				counts = next;
				// Provinsi menyala berurutan sekali, setelah data tiba.
				requestAnimationFrame(() => {
					if (alive) ready = true;
				});
			} catch {
				/* peta tetap tampil, semua provinsi kosong */
			}
		})();
		return () => {
			alive = false;
		};
	});

	const lit = $derived(PROVINCES.filter((p) => (counts[p.name] ?? 0) > 0));
	const maxCount = $derived(Math.max(1, ...Object.values(counts)));
	const order = $derived(new Map(lit.map((p, i) => [p.name, i])));

	let active = $state<string | null>(null);
	const readout = $derived.by(() => {
		if (!active) return c.lacuna.idle;
		const n = counts[active] ?? 0;
		return n > 0 ? `${active}: ${t.frameWord(n)}` : `${active}: ${c.lacuna.none.replace(/\.$/, "").toLowerCase()}`;
	});
	const summary = $derived(lit.length ? c.lacuna.sentence(String(lit.length), String(PROVINCES.length)) : "");
</script>

<div class="ab bg-bg text-fg">
	<div class="ab-wrap">
		<header class="ab-hero">
			<h1 class="ab-title">{t.title}</h1>
			<p class="ab-intro">{t.intro}</p>
		</header>

		<!-- Peta: provinsi yang punya bingkai menyala (makin pekat = makin banyak),
			sisanya tetap garis kosong — celah yang belum terisi. -->
		<figure class="ab-map" class:is-ready={ready}>
			<svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} role="img" aria-label={t.mapLabel} preserveAspectRatio="xMidYMid meet">
				{#each PROVINCES as p (p.name)}
					{@const n = counts[p.name] ?? 0}
					<path
						d={p.d}
						class="ab-prov"
						class:is-lit={n > 0}
						class:is-active={active === p.name}
						style={n > 0 ? `--a:${(0.3 + 0.55 * (n / maxCount)).toFixed(2)};--i:${order.get(p.name) ?? 0}` : undefined}
						role="img"
						aria-label={`${p.name}: ${n > 0 ? t.frameWord(n) : c.lacuna.none}`}
						onmouseenter={() => (active = p.name)}
						onmouseleave={() => (active = null)}
					/>
				{/each}
			</svg>
			<figcaption>
				<span class="ab-map__sum">{summary}</span>
				<span class="ab-map__read" aria-live="polite">{readout}</span>
			</figcaption>
		</figure>

		<section class="ab-states" aria-label="Lakuna">
			{#each t.statements as s (s.say)}
				<div class="ab-state">
					<p class="ab-state__say">{s.say}</p>
					<div class="ab-state__body">
						<p>{s.body}</p>
						{#if s.link}
							<a href={s.link.href} class="ab-link">{s.link.label}</a>
						{/if}
					</div>
				</div>
			{/each}
		</section>

		<footer class="ab-close">
			<p class="ab-close__say">{c.manifesto.title}</p>
			<div class="ab-close__info">
				<p class="ab-close__co">{t.company}</p>
				<address>{ADDRESS}</address>
				<p class="ab-links">
					<a href="/photos" class="ab-link">{t.browse}</a>
					<a href="/pricing" class="ab-link">{t.pricing}</a>
				</p>
			</div>
		</footer>
	</div>
</div>

<style>
	.ab {
		min-height: 100vh;
	}
	.ab-wrap {
		max-width: 1400px;
		margin: 0 auto;
		padding: calc(var(--banner-h, 0px) + var(--nav-h) + 3rem) clamp(1.25rem, 4vw, 4rem) 7rem;
	}

	/* ── Pembuka ─────────────────────────────────────────────────── */
	.ab-hero {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: 2rem;
		align-items: end;
	}
	@media (min-width: 960px) {
		.ab-hero {
			grid-template-columns: minmax(0, 7fr) minmax(0, 4fr);
			gap: clamp(3rem, 7vw, 8rem);
		}
	}
	.ab-title {
		font-family: var(--font-display);
		font-size: clamp(2.8rem, 6.6vw, 6.2rem);
		font-weight: 300;
		line-height: 0.98;
		letter-spacing: -0.03em;
		text-wrap: balance;
		color: var(--fg);
	}
	.ab-intro {
		max-width: 44ch;
		font-size: clamp(1rem, 1.25vw, 1.15rem);
		line-height: 1.7;
		color: var(--fg-muted);
	}

	/* ── Peta ────────────────────────────────────────────────────── */
	.ab-map {
		margin: clamp(2.5rem, 6vw, 5rem) 0 0;
	}
	.ab-map svg {
		display: block;
		width: 100%;
		height: auto;
		overflow: visible;
	}
	.ab-prov {
		fill: transparent;
		stroke: color-mix(in srgb, var(--fg) 22%, transparent);
		stroke-width: 0.8;
		stroke-linejoin: round;
		outline: none;
		cursor: default;
		transition: fill 0.25s ease, stroke 0.25s ease;
	}
	/* Provinsi terisi: menyala berurutan sekali setelah data tiba. */
	.ab-prov.is-lit {
		stroke: color-mix(in srgb, var(--safelight) 80%, transparent);
	}
	.ab-map.is-ready .ab-prov.is-lit {
		fill: color-mix(in srgb, var(--safelight) calc(var(--a) * 100%), transparent);
	}
	@media (prefers-reduced-motion: no-preference) {
		.ab-prov.is-lit {
			transition: fill 0.9s ease calc(var(--i) * 55ms), stroke 0.25s ease;
		}
	}
	.ab-prov.is-active {
		stroke: var(--fg);
		stroke-width: 1.4;
	}
	.ab-map figcaption {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		gap: 0.4rem 2rem;
		margin-top: 1.25rem;
		padding-top: 1rem;
		border-top: 1px solid var(--hair);
		font-size: 0.92rem;
		color: var(--fg-muted);
	}
	.ab-map__read {
		color: var(--fg);
	}

	/* ── Pernyataan ──────────────────────────────────────────────── */
	.ab-states {
		margin-top: clamp(4rem, 9vw, 8rem);
	}
	.ab-state {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: 1rem;
		padding: clamp(1.75rem, 3.5vw, 2.75rem) 0;
		border-top: 1px solid var(--hair);
	}
	.ab-state:last-child {
		border-bottom: 1px solid var(--hair);
	}
	@media (min-width: 960px) {
		.ab-state {
			grid-template-columns: minmax(0, 7fr) minmax(0, 4fr);
			column-gap: clamp(3rem, 7vw, 8rem);
			align-items: start;
		}
	}
	.ab-state__say {
		max-width: 24ch;
		font-family: var(--font-display);
		font-size: clamp(1.7rem, 3.4vw, 3rem);
		font-weight: 300;
		line-height: 1.12;
		letter-spacing: -0.02em;
		text-wrap: balance;
		color: var(--fg);
	}
	.ab-state__body {
		max-width: 44ch;
		padding-top: 0.4rem;
	}
	.ab-state__body p {
		font-size: 1rem;
		line-height: 1.7;
		color: var(--fg-muted);
	}

	/* ── Penutup ─────────────────────────────────────────────────── */
	.ab-close {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: 2.5rem;
		margin-top: clamp(4rem, 9vw, 8rem);
	}
	@media (min-width: 960px) {
		.ab-close {
			grid-template-columns: minmax(0, 7fr) minmax(0, 4fr);
			column-gap: clamp(3rem, 7vw, 8rem);
			align-items: end;
		}
	}
	.ab-close__say {
		max-width: 12ch;
		font-family: var(--font-display);
		font-size: clamp(2.2rem, 5vw, 4.2rem);
		font-weight: 300;
		line-height: 1.04;
		letter-spacing: -0.025em;
		text-wrap: balance;
		color: var(--fg);
	}
	.ab-close__co {
		font-family: var(--font-display);
		font-size: 1.05rem;
		font-weight: 500;
		color: var(--fg);
	}
	.ab-close__info address {
		margin-top: 0.5rem;
		max-width: 36ch;
		font-size: 0.97rem;
		font-style: normal;
		line-height: 1.7;
		color: var(--fg-muted);
	}
	.ab-links {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem 1.75rem;
	}
	.ab-link {
		display: inline-block;
		margin-top: 1rem;
		color: var(--fg);
		text-decoration: underline;
		text-decoration-color: color-mix(in srgb, var(--fg) 35%, transparent);
		text-underline-offset: 0.35em;
		transition: color 0.2s ease, text-decoration-color 0.2s ease;
	}
	.ab-link:hover {
		color: var(--safelight);
		text-decoration-color: var(--safelight);
	}
	.ab-link:focus-visible {
		outline: 2px solid var(--safelight);
		outline-offset: 3px;
		border-radius: 2px;
	}
</style>
