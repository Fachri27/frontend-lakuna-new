<script lang="ts">
	import { onMount } from "svelte";
	import { i18n, type Lang } from "$lib/i18n.svelte";
	import { fetchPhotos, imgFor, type Photo } from "$lib/data";
	import ApiImage from "./ApiImage.svelte";

	/**
	 * Ekowisata sebagai SATU garis turun: puncak → karang. Lima zona; altimeter
	 * di kiri dan warna latar mengikuti posisi gulir (satu-satunya gerak di
	 * halaman ini). Isi tiap zona diambil dari arsip menurut kata kunci.
	 */
	type Band = {
		id: "mountain" | "forest" | "water" | "coast" | "reef";
		from: number; // ketinggian (m dpl; negatif = di bawah laut) di awal zona
		to: number; // dan di akhir zona
		tone: [number, number, number]; // warna latar
		terms: string[]; // kata kunci pencarian arsip (id + en)
		name: Record<Lang, string>;
		note: Record<Lang, string>;
	};

	const BANDS: Band[] = [
		{
			id: "mountain", from: 3200, to: 1500, tone: [20, 27, 40], terms: ["gunung", "mountain"],
			name: { id: "Pegunungan", en: "Mountains" },
			note: {
				id: "Kawah, savana di ketinggian, dan jalur pendakian yang kuotanya dibatasi supaya tanahnya sempat pulih.",
				en: "Craters, high savannah, and climbing routes with visitor quotas, so the ground has time to recover.",
			},
		},
		{
			id: "forest", from: 1500, to: 200, tone: [12, 28, 21], terms: ["hutan", "forest"],
			name: { id: "Hutan hujan", en: "Rainforest" },
			note: {
				id: "Rumah orangutan, harimau, dan burung rangkong. Jalan setapaknya dipandu warga desa yang menjaganya.",
				en: "Home to orangutans, tigers, and hornbills. The trails are guided by the villagers who look after them.",
			},
		},
		{
			id: "water", from: 200, to: 0, tone: [10, 30, 36], terms: ["danau", "lake", "sungai", "river"],
			name: { id: "Danau dan sungai", en: "Lakes and rivers" },
			note: {
				id: "Perahu tanpa mesin, kampung di atas air, dan sungai yang masih menjadi jalan utama.",
				en: "Boats without engines, villages on stilts, and rivers that are still the main road.",
			},
		},
		{
			id: "coast", from: 0, to: -5, tone: [31, 26, 17], terms: ["pantai", "beach", "mangrove"],
			name: { id: "Pantai dan mangrove", en: "Beaches and mangroves" },
			note: {
				id: "Penyu bertelur, bakau yang menahan gelombang, dan kampung nelayan yang menjual hasil lautnya langsung.",
				en: "Turtles nesting, mangroves holding back the waves, and fishing villages that sell their catch directly.",
			},
		},
		{
			id: "reef", from: -5, to: -30, tone: [5, 22, 40], terms: ["karang", "reef", "laut"],
			name: { id: "Terumbu karang", en: "Coral reefs" },
			note: {
				id: "Dari Raja Ampat sampai Wakatobi: penyelaman di zona lindung, dengan tambat jangkar supaya karang tak patah.",
				en: "From Raja Ampat to Wakatobi: diving in protected zones, with mooring buoys so the coral isn't broken.",
			},
		},
	];

	const copy: Record<Lang, {
		title: string; lede: string; metaFrames: (n: number) => string; empty: string; emptyCta: string;
		seeAll: string; principlesTitle: string; principles: { say: string; body: string }[];
		ctaTitle: string; ctaBody: string; contribute: string; browse: string;
		unitAbove: string; unitBelow: string; altimeter: string;
	}> = {
		id: {
			title: "Ekowisata, dari puncak ke karang",
			lede: "Ekowisata berarti bepergian ke alam tanpa meninggalkan luka, dan membuat warga setempat ikut menikmati hasilnya. Halaman ini mengikuti satu garis turun: lima ekosistem, dari puncak gunung sampai dasar terumbu.",
			metaFrames: (n) => `${n} bingkai di zona ini`,
			empty: "Belum ada bingkai untuk zona ini.",
			emptyCta: "Kirim bingkai pertamamu",
			seeAll: "Lihat di arsip",
			principlesTitle: "Yang kami minta dari setiap bingkai",
			principles: [
				{ say: "Lokasi ditulis jelas.", body: "Pembaca perlu tahu persis apa yang mereka lihat dan di mana, supaya bisa menjaganya." },
				{ say: "Aturan kawasan dihormati.", body: "Tanpa drone di zona terlarang, tanpa menyentuh satwa atau karang, tanpa mengubah tempat demi gambar." },
				{ say: "Warga ikut terlihat.", body: "Pemandu, nelayan, dan pengelola setempat adalah bagian dari cerita, dan sebagian penghasilan tetap berpulang ke perajangga." },
			],
			ctaTitle: "Punya bingkai ekowisata?",
			ctaBody: "Kirim fotomu dan dapatkan 70% dari setiap lisensi.",
			contribute: "Jadi kontributor",
			browse: "Jelajahi arsip",
			unitAbove: "m dpl",
			unitBelow: "m di bawah laut",
			altimeter: "Altimeter: posisimu di garis turun",
		},
		en: {
			title: "Ecotourism, from summit to reef",
			lede: "Ecotourism means travelling in nature without leaving a scar, and letting local people share in the benefit. This page follows one descent: five ecosystems, from a mountain summit to the floor of a reef.",
			metaFrames: (n) => `${n} ${n === 1 ? "frame" : "frames"} in this zone`,
			empty: "No frames for this zone yet.",
			emptyCta: "Send the first frame",
			seeAll: "See in the archive",
			principlesTitle: "What we ask of every frame",
			principles: [
				{ say: "The location is written clearly.", body: "Readers need to know exactly what they're looking at and where, so they can look after it." },
				{ say: "Area rules are respected.", body: "No drones in restricted zones, no touching wildlife or coral, no changing a place for a picture." },
				{ say: "Local people are in the picture.", body: "Guides, fishers, and local managers are part of the story, and part of the income still goes back to the image-maker." },
			],
			ctaTitle: "Have ecotourism frames?",
			ctaBody: "Send your photos and earn 70% of every license.",
			contribute: "Become a contributor",
			browse: "Browse the archive",
			unitAbove: "m above sea level",
			unitBelow: "m below sea level",
			altimeter: "Altimeter: your position on the descent",
		},
	};

	const lang = $derived(i18n.lang);
	const t = $derived(copy[lang]);

	// ── Isi zona dari arsip ───────────────────────────────────────────────
	let byBand = $state<Record<string, { photos: Photo[]; total: number; done: boolean }>>({});

	onMount(() => {
		let alive = true;
		for (const b of BANDS) {
			byBand[b.id] = { photos: [], total: 0, done: false };
			Promise.all(b.terms.map((q) => fetchPhotos({ search: q, limit: 5 }).catch(() => ({ photos: [] as Photo[], total: 0, totalPages: 0 }))))
				.then((rs) => {
					if (!alive) return;
					const seen = new Set<string>();
					const merged: Photo[] = [];
					for (const r of rs) for (const p of r.photos) if (!seen.has(p.id)) (seen.add(p.id), merged.push(p));
					byBand[b.id] = { photos: merged.slice(0, 5), total: merged.length, done: true };
				});
		}
		return () => (alive = false);
	});

	const hrefOf = (p: Photo) => (p.assetType === "VIDEO" ? `/videos/${p.id}` : `/photos/${p.id}`);

	// ── Altimeter + warna latar mengikuti posisi gulir ───────────────────────
	let pageEl: HTMLElement;
	let bandEls: HTMLElement[] = $state([]);
	let elevation = $state(BANDS[0]!.from);
	let activeIdx = $state(0);
	let progress = $state(0); // 0..1 sepanjang lima zona
	// Altimeter hanya selama halaman ini mengisi layar (bukan di atas footer).
	let altOn = $state(true);

	const fmtM = (m: number) => `${m < 0 ? "−" : ""}${Math.abs(Math.round(m)).toLocaleString(lang === "id" ? "id-ID" : "en-US")}`;
	const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
	const ease = (k: number) => k * k * (3 - 2 * k);

	onMount(() => {
		const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
		let raf = 0;
		const update = () => {
			raf = 0;
			if (!bandEls.length || !pageEl) return;
			const line = innerHeight * 0.45;
			altOn = pageEl.getBoundingClientRect().bottom > innerHeight * 0.92;
			const first = bandEls[0]!.getBoundingClientRect();
			const last = bandEls[bandEls.length - 1]!.getBoundingClientRect();
			// Di atas zona pertama: tetap di puncak; di bawah zona terakhir: tetap di dasar.
			let i = 0;
			let u = 0;
			if (line <= first.top) {
				i = 0;
				u = 0;
			} else if (line >= last.bottom) {
				i = BANDS.length - 1;
				u = 1;
			} else {
				for (let k = 0; k < bandEls.length; k++) {
					const r = bandEls[k]!.getBoundingClientRect();
					if (line >= r.top && line < r.bottom) {
						i = k;
						u = (line - r.top) / r.height;
						break;
					}
				}
			}
			const b = BANDS[i]!;
			elevation = lerp(b.from, b.to, u);
			activeIdx = i;
			progress = (i + u) / BANDS.length;
			// Warna latar: berpindah halus ke zona berikutnya sepanjang zona ini.
			const nx = BANDS[Math.min(i + 1, BANDS.length - 1)]!;
			const k = reduced ? 0 : ease(u);
			const c = [0, 1, 2].map((j) => Math.round(lerp(b.tone[j]!, nx.tone[j]!, k)));
			pageEl.style.setProperty("--eco-bg", `rgb(${c[0]}, ${c[1]}, ${c[2]})`);
		};
		const onScroll = () => {
			if (!raf) raf = requestAnimationFrame(update);
		};
		update();
		addEventListener("scroll", onScroll, { passive: true });
		addEventListener("resize", onScroll, { passive: true });
		return () => {
			removeEventListener("scroll", onScroll);
			removeEventListener("resize", onScroll);
			if (raf) cancelAnimationFrame(raf);
		};
	});

	const unit = (m: number) => (m < 0 ? t.unitBelow : t.unitAbove);
	const total = $derived(Object.values(byBand).reduce((n, b) => n + b.total, 0));
</script>

{#snippet contour(kind: Band["id"])}
	<svg class="eco-contour" viewBox="0 0 400 300" fill="none" stroke="currentColor" stroke-width="1" aria-hidden="true">
		{#if kind === "mountain"}
			{#each [0, 1, 2, 3, 4, 5, 6] as k}
				<ellipse cx="210" cy="150" rx={30 + k * 26} ry={16 + k * 17} transform={`rotate(${-14 + k * 3} 210 150)`} />
			{/each}
		{:else if kind === "forest"}
			{#each [[60,70,26],[140,50,34],[230,80,28],[320,60,36],[90,150,32],[190,140,40],[290,160,30],[360,140,24],[50,230,28],[150,240,34],[250,230,30],[340,240,38]] as c}
				<circle cx={c[0]} cy={c[1]} r={c[2]} />
				<circle cx={c[0]} cy={c[1]} r={(c[2] ?? 0) * 0.55} />
			{/each}
		{:else if kind === "water"}
			{#each [0, 1, 2, 3, 4, 5, 6, 7] as k}
				<path d={`M0 ${40 + k * 32} C 70 ${22 + k * 32}, 130 ${58 + k * 32}, 200 ${40 + k * 32} S 330 ${24 + k * 32}, 400 ${40 + k * 32}`} />
			{/each}
		{:else if kind === "coast"}
			{#each [0, 1, 2, 3, 4] as k}
				<path d={`M0 ${70 + k * 22} C 80 ${40 + k * 22}, 130 ${100 + k * 22}, 210 ${64 + k * 22} S 340 ${50 + k * 22}, 400 ${80 + k * 22}`} />
			{/each}
			<path d="M0 230 C 90 205, 150 250, 240 222 S 360 210, 400 226 L400 300 L0 300 Z" />
		{:else}
			{#each [0, 1, 2, 3, 4, 5] as row}
				{#each [0, 1, 2, 3, 4, 5, 6, 7, 8] as col}
					<path d={`M${col * 48 + (row % 2) * 24} ${50 + row * 40} a 24 24 0 0 1 48 0`} />
				{/each}
			{/each}
		{/if}
	</svg>
{/snippet}

<div bind:this={pageEl} class="eco" style="--eco-bg: rgb(20, 27, 40)">
	<!-- Altimeter: posisi di garis turun. Hanya desktop; di layar sempit jadi chip kecil. -->
	<aside class="eco-alt" class:is-off={!altOn} aria-label={t.altimeter}>
		<div class="eco-alt-rule" aria-hidden="true">
			{#each BANDS as b, i (b.id)}
				<span class="eco-alt-tick" class:is-on={i <= activeIdx} style={`top: ${(i / BANDS.length) * 100}%`}></span>
			{/each}
			<span class="eco-alt-dot" style={`top: ${progress * 100}%`}></span>
		</div>
		<p class="eco-alt-read" style={`top: calc(${progress * 100}% - 0.9rem)`} aria-live="off">
			<span class="eco-alt-num">{fmtM(elevation)}</span>
			<span class="eco-alt-unit">{unit(elevation)}</span>
		</p>
	</aside>
	<p class="eco-chip" class:is-off={!altOn} aria-hidden="true">
		<span class="eco-alt-num">{fmtM(elevation)}</span> <span class="eco-alt-unit">m</span>
		<span class="eco-chip-band">{BANDS[activeIdx]!.name[lang]}</span>
	</p>

	<header class="eco-hero">
		<h1 class="eco-title">{t.title}</h1>
		<p class="eco-lede">{t.lede}</p>
	</header>

	{#each BANDS as b, i (b.id)}
		{@const d = byBand[b.id]}
		<section bind:this={bandEls[i]} class="eco-band" aria-labelledby={`eco-${b.id}`}>
			<div class="eco-band-bg">{@render contour(b.id)}</div>
			<div class="eco-band-head">
				<h2 id={`eco-${b.id}`} class="eco-band-name">{b.name[lang]}</h2>
				<p class="eco-band-range">{fmtM(b.from)} → {fmtM(b.to)} m</p>
				<p class="eco-band-note">{b.note[lang]}</p>
			</div>

			{#if d && d.photos.length}
				<div class="eco-frames" class:is-few={d.photos.length < 3}>
					{#each d.photos as p, k (p.id)}
						<a href={hrefOf(p)} class={`eco-frame ${k === 0 ? "is-lead" : ""}`}>
							<span class="eco-frame-img">
								<ApiImage
									src={imgFor(p.seed, k === 0 ? 1200 : 700, k === 0 ? 800 : 700, p.thumbUrl)}
									alt={p.title[lang]}
									fill
									class="object-cover"
								/>
							</span>
							<span class="eco-frame-cap">
								<span class="eco-frame-title">{p.title[lang]}</span>
								{#if p.location}<span class="eco-frame-loc">{p.location}</span>{/if}
							</span>
						</a>
					{/each}
				</div>
				<a href={`/photos?q=${encodeURIComponent(b.terms[0] ?? "")}`} class="eco-link">{t.seeAll}</a>
			{:else if d?.done}
				<div class="eco-empty">
					<p>{t.empty}</p>
					<a href="/contributor" class="eco-link">{t.emptyCta}</a>
				</div>
			{/if}
		</section>
	{/each}

	<section class="eco-close">
		<h2 class="eco-close-title">{t.principlesTitle}</h2>
		<ul class="eco-principles">
			{#each t.principles as p (p.say)}
				<li>
					<p class="eco-p-say">{p.say}</p>
					<p class="eco-p-body">{p.body}</p>
				</li>
			{/each}
		</ul>
		<div class="eco-cta">
			<div>
				<h3 class="eco-cta-title">{t.ctaTitle}</h3>
				<p class="eco-cta-body">{t.ctaBody}</p>
			</div>
			<div class="eco-cta-actions">
				<a href="/contributor" class="eco-btn eco-btn--solid">{t.contribute}</a>
				<a href="/photos" class="eco-btn">{t.browse}</a>
			</div>
		</div>
	</section>
</div>

<style>
	.eco {
		--eco-line: rgba(241, 239, 233, 0.16);
		position: relative;
		min-height: 100vh;
		background: var(--eco-bg);
		color: var(--fg, #f1efe9);
		padding-bottom: 6rem;
	}
	.eco-hero,
	.eco-band,
	.eco-close {
		max-width: 1180px;
		margin-inline: auto;
		padding-inline: clamp(1.25rem, 4vw, 4rem);
	}
	/* Rel altimeter menyisakan lajur di kiri pada desktop. */
	@media (min-width: 1100px) {
		.eco-hero,
		.eco-band,
		.eco-close {
			padding-left: clamp(9rem, 12vw, 12rem);
			max-width: 1400px;
		}
	}
	.eco-hero {
		padding-top: calc(var(--banner-h, 0px) + var(--nav-h) + clamp(3rem, 9vh, 7rem));
		padding-bottom: clamp(4rem, 12vh, 9rem);
	}
	.eco-title {
		max-width: 14ch;
		font-family: var(--font-display);
		font-size: clamp(2.8rem, 7.6vw, 6.4rem);
		font-weight: 300;
		line-height: 0.98;
		letter-spacing: -0.03em;
	}
	.eco-lede {
		max-width: 54ch;
		margin-top: 1.8rem;
		font-size: clamp(1rem, 1.3vw, 1.18rem);
		line-height: 1.7;
		color: color-mix(in srgb, var(--fg, #f1efe9) 72%, transparent);
	}

	/* ── Zona ─────────────────────────────────────────────────────────── */
	.eco-band {
		position: relative;
		padding-top: clamp(4rem, 10vh, 7rem);
		padding-bottom: clamp(4rem, 10vh, 7rem);
		border-top: 1px solid var(--eco-line);
	}
	.eco-band-bg {
		position: absolute;
		inset: 0;
		display: flex;
		justify-content: flex-end;
		align-items: flex-start;
		overflow: hidden;
		color: rgba(241, 239, 233, 0.11);
		pointer-events: none;
	}
	.eco-contour {
		width: min(52vw, 640px);
		margin-top: clamp(2rem, 6vh, 4rem);
	}
	.eco-band-head {
		position: relative;
		max-width: 46ch;
	}
	.eco-band-name {
		font-family: var(--font-display);
		font-size: clamp(2.2rem, 5vw, 4.4rem);
		font-weight: 300;
		line-height: 1.02;
		letter-spacing: -0.025em;
	}
	.eco-band-range {
		margin-top: 0.9rem;
		font-variant-numeric: tabular-nums;
		font-size: 0.95rem;
		color: color-mix(in srgb, var(--fg, #f1efe9) 60%, transparent);
	}
	.eco-band-note {
		margin-top: 1.2rem;
		font-size: 1.02rem;
		line-height: 1.7;
		color: color-mix(in srgb, var(--fg, #f1efe9) 78%, transparent);
	}

	/* ── Bingkai ─────────────────────────────────────────────────────── */
	.eco-frames {
		position: relative;
		display: grid;
		grid-template-columns: repeat(12, 1fr);
		gap: clamp(0.75rem, 1.6vw, 1.5rem);
		margin-top: clamp(2.5rem, 6vh, 4rem);
	}
	.eco-frame {
		grid-column: span 6;
		display: block;
		color: inherit;
		text-decoration: none;
	}
	.eco-frame.is-lead {
		grid-column: span 12;
	}
	@media (min-width: 900px) {
		.eco-frame {
			grid-column: span 3;
		}
		.eco-frame.is-lead {
			grid-column: span 6;
			grid-row: span 2;
		}
		.eco-frames.is-few .eco-frame {
			grid-column: span 4;
		}
		.eco-frames.is-few .eco-frame.is-lead {
			grid-column: span 8;
			grid-row: auto;
		}
	}
	.eco-frame-img {
		position: relative;
		display: block;
		aspect-ratio: 4 / 3;
		overflow: hidden;
		background: rgba(241, 239, 233, 0.06);
	}
	.eco-frame.is-lead .eco-frame-img {
		aspect-ratio: 3 / 2;
	}
	.eco-frame-cap {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
		padding-top: 0.7rem;
	}
	.eco-frame-title {
		font-size: 0.95rem;
		line-height: 1.35;
	}
	.eco-frame-loc {
		font-size: 0.82rem;
		color: color-mix(in srgb, var(--fg, #f1efe9) 58%, transparent);
	}
	.eco-frame:hover .eco-frame-title,
	.eco-frame:focus-visible .eco-frame-title {
		color: var(--safelight);
	}
	.eco-frame:focus-visible {
		outline: 2px solid var(--safelight);
		outline-offset: 4px;
	}
	.eco-link {
		position: relative;
		display: inline-block;
		margin-top: 1.8rem;
		font-size: 0.95rem;
		color: var(--fg, #f1efe9);
		text-decoration: underline;
		text-decoration-color: color-mix(in srgb, var(--fg, #f1efe9) 30%, transparent);
		text-underline-offset: 0.35em;
	}
	.eco-link:hover,
	.eco-link:focus-visible {
		color: var(--safelight);
		text-decoration-color: var(--safelight);
	}
	.eco-empty {
		position: relative;
		margin-top: clamp(2rem, 5vh, 3rem);
		max-width: 46ch;
		font-size: 0.98rem;
		color: color-mix(in srgb, var(--fg, #f1efe9) 66%, transparent);
	}

	/* ── Penutup ─────────────────────────────────────────────────────── */
	.eco-close {
		padding-top: clamp(4rem, 10vh, 7rem);
		border-top: 1px solid var(--eco-line);
	}
	.eco-close-title {
		max-width: 24ch;
		font-family: var(--font-display);
		font-size: clamp(1.8rem, 3.6vw, 3rem);
		font-weight: 300;
		line-height: 1.1;
		letter-spacing: -0.02em;
	}
	.eco-principles {
		display: grid;
		gap: 2rem;
		margin-top: clamp(2rem, 5vh, 3.5rem);
		list-style: none;
		padding: 0;
	}
	@media (min-width: 900px) {
		.eco-principles {
			grid-template-columns: repeat(3, 1fr);
			gap: clamp(1.5rem, 3vw, 3rem);
		}
	}
	.eco-p-say {
		font-size: 1.05rem;
		font-weight: 500;
		line-height: 1.4;
	}
	.eco-p-body {
		margin-top: 0.5rem;
		font-size: 0.95rem;
		line-height: 1.65;
		color: color-mix(in srgb, var(--fg, #f1efe9) 68%, transparent);
	}
	.eco-cta {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-end;
		justify-content: space-between;
		gap: 1.5rem;
		margin-top: clamp(3rem, 8vh, 5rem);
		padding-top: 2rem;
		border-top: 1px solid var(--eco-line);
	}
	.eco-cta-title {
		font-family: var(--font-display);
		font-size: clamp(1.5rem, 2.8vw, 2.2rem);
		font-weight: 300;
	}
	.eco-cta-body {
		margin-top: 0.4rem;
		color: color-mix(in srgb, var(--fg, #f1efe9) 68%, transparent);
	}
	.eco-cta-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.8rem;
	}
	.eco-btn {
		display: inline-flex;
		align-items: center;
		min-height: 48px;
		padding: 0 1.5rem;
		border: 1px solid var(--eco-line);
		border-radius: 999px;
		font-size: 0.95rem;
		color: var(--fg, #f1efe9);
		text-decoration: none;
		transition: border-color 0.2s ease, color 0.2s ease, background 0.2s ease;
	}
	.eco-btn:hover,
	.eco-btn:focus-visible {
		border-color: var(--safelight);
		color: var(--safelight);
	}
	.eco-btn--solid {
		background: var(--safelight);
		border-color: var(--safelight);
		color: #fff;
	}
	.eco-btn--solid:hover,
	.eco-btn--solid:focus-visible {
		background: var(--safelight-lamp, var(--safelight));
		color: #fff;
	}

	/* ── Altimeter ───────────────────────────────────────────────────── */
	.eco-alt {
		display: none;
		transition: opacity 0.25s ease;
	}
	.eco-alt.is-off,
	.eco-chip.is-off {
		opacity: 0;
	}
	/* Layar sempit: chip kecil di bawah navbar (kiri-bawah dipakai tombol ke atas). */
	.eco-chip {
		position: fixed;
		z-index: 20;
		left: 1rem;
		top: calc(var(--banner-h, 0px) + var(--nav-h) + 0.6rem);
		display: flex;
		align-items: baseline;
		gap: 0.35rem;
		padding: 0.45rem 0.9rem;
		border: 1px solid var(--eco-line);
		border-radius: 999px;
		background: color-mix(in srgb, var(--eco-bg) 82%, black);
		pointer-events: none;
		transition: opacity 0.25s ease;
	}
	.eco-chip .eco-alt-num {
		font-size: 1.05rem;
	}
	.eco-chip-band {
		margin-left: 0.4rem;
		font-size: 0.78rem;
		color: color-mix(in srgb, var(--fg, #f1efe9) 62%, transparent);
	}
	@media (min-width: 1100px) {
		.eco-alt {
			display: block;
			position: fixed;
			z-index: 20;
			left: clamp(1.25rem, 3vw, 3rem);
			top: 18vh;
			bottom: 14vh;
			width: 7.5rem;
			pointer-events: none;
		}
		.eco-chip {
			display: none;
		}
	}
	.eco-alt-rule {
		position: absolute;
		left: 0.2rem;
		top: 0;
		bottom: 0;
		width: 1px;
		background: var(--eco-line);
	}
	.eco-alt-tick {
		position: absolute;
		left: -4px;
		width: 9px;
		height: 1px;
		background: var(--eco-line);
	}
	.eco-alt-tick.is-on {
		background: color-mix(in srgb, var(--fg, #f1efe9) 55%, transparent);
	}
	.eco-alt-dot {
		position: absolute;
		left: calc(0.5px - 5px);
		width: 11px;
		height: 11px;
		margin-top: -5px;
		border-radius: 50%;
		background: var(--safelight);
		box-shadow: 0 0 0 4px color-mix(in srgb, var(--safelight) 25%, transparent);
	}
	.eco-alt-read {
		position: absolute;
		left: 1.3rem;
		display: flex;
		flex-direction: column;
		line-height: 1.15;
	}
	.eco-alt-num {
		font-family: var(--font-display);
		font-size: 1.35rem;
		font-weight: 300;
		font-variant-numeric: tabular-nums;
		letter-spacing: -0.01em;
	}
	.eco-alt-unit {
		font-size: 0.72rem;
		color: color-mix(in srgb, var(--fg, #f1efe9) 55%, transparent);
	}
</style>
