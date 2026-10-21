<script lang="ts">
	import { i18n, type Lang } from "$lib/i18n.svelte";
	import { imgFor, type EcoDestination, type EcoDestinationFull, type Photo } from "$lib/data";
	import { ECO_ORDER, ECO_ZONE } from "$lib/ecoBands";
	import ApiImage from "./ApiImage.svelte";

	/**
	 * Halaman satu destinasi ekowisata (/ecotourism/<slug>, isi dari CMS Studio › Ekowisata). Satu bahasa visual
	 * dengan halaman Ekowisata: warna latar zonanya, judul display tipis, garis rambut. Yang khas: altimeter —
	 * posisi destinasi pada garis turun yang sama (puncak → karang), lima zona sama tinggi.
	 */
	let { dest }: { dest: EcoDestinationFull } = $props();

	const copy: Record<Lang, {
		crumb: string; story: string; activities: string; rules: string; access: string; facts: string;
		height: string; aboveSea: string; belowSea: string; seaLevel: string; bestTime: string; coords: string;
		openMap: string; manager: string; website: string; gallery: (n: number) => string; galleryNote: string; license: string;
		related: (zone: string) => string; back: string; altimeter: string; photoBy: string; video: string;
	}> = {
		id: {
			crumb: "Ekowisata",
			story: "Cerita",
			activities: "Yang bisa dilakukan",
			rules: "Saat berkunjung",
			access: "Cara ke sana",
			facts: "Ringkasan kunjungan",
			height: "Ketinggian",
			aboveSea: "m dpl",
			belowSea: "m di bawah laut",
			seaLevel: "Permukaan laut",
			bestTime: "Waktu terbaik",
			coords: "Koordinat",
			openMap: "Buka di peta",
			manager: "Pengelola",
			website: "Situs resmi",
			gallery: (n) => `${n} bingkai lain dari arsip`,
			license: "Lihat & lisensikan",
			galleryNote: "Semua foto & video di sini bisa dilisensikan — klik untuk melihat detail dan harganya.",
			related: (z) => `Destinasi lain di ${z.toLowerCase()}`,
			back: "Semua destinasi ekowisata",
			altimeter: "Posisi destinasi pada garis turun dari puncak ke karang",
			photoBy: "oleh",
			video: "Video",
		},
		en: {
			crumb: "Ecotourism",
			story: "The story",
			activities: "What to do",
			rules: "When you visit",
			access: "Getting there",
			facts: "Visit at a glance",
			height: "Elevation",
			aboveSea: "m above sea level",
			belowSea: "m below sea level",
			seaLevel: "Sea level",
			bestTime: "Best time",
			coords: "Coordinates",
			openMap: "Open in maps",
			manager: "Managed by",
			website: "Official site",
			gallery: (n) => `${n} more ${n === 1 ? "frame" : "frames"} from the archive`,
			license: "View & license",
			galleryNote: "Every photo and video here can be licensed — open one to see its details and price.",
			related: (z) => `More in ${z.toLowerCase()}`,
			back: "All ecotourism destinations",
			altimeter: "Where this destination sits on the descent from summit to reef",
			photoBy: "by",
			video: "Video",
		},
	};
	const lang = $derived(i18n.lang);
	const t = $derived(copy[lang]);
	const zone = $derived(ECO_ZONE[dest.zone]);
	const tone = $derived(zone.tone.join(", "));

	const nf = $derived(new Intl.NumberFormat(lang === "id" ? "id-ID" : "en-US"));
	const fmtElev = (e: number) =>
		e === 0 ? t.seaLevel : `${nf.format(Math.abs(e))} ${e > 0 ? t.aboveSea : t.belowSea}`;

	const paras = (s: string) => s.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
	const story = $derived(paras(dest.story[lang]));
	const access = $derived(dest.access ? paras(dest.access[lang]) : []);
	const activities = $derived(dest.activities[lang]);
	const rules = $derived(dest.rules[lang]);

	/**
	 * Posisi 0–1 pada altimeter: lima zona sama tinggi (seperti pita halaman Ekowisata), di dalam zona linear
	 * menurut ketinggian. Penanda selalu di zona destinasi itu sendiri — danau pegunungan (Buyan ±1.200 m) tetap
	 * di pita "Danau dan sungai" — jadi ketinggian di luar rentang zona dijepit ke tepinya. Tanpa ketinggian = tengah.
	 */
	function altPos(d: EcoDestination): number {
		const i = ECO_ORDER.indexOf(d.zone);
		const z = ECO_ZONE[d.zone];
		const inZone = d.elevation === null ? 0.5 : Math.min(0.94, Math.max(0.06, (z.from - d.elevation) / (z.from - z.to)));
		return (i + inZone) / ECO_ORDER.length;
	}
	const pos = $derived(altPos(dest));

	const hrefOf = (p: Photo) => (p.assetType === "VIDEO" ? `/videos/${p.id}` : `/photos/${p.id}`);
	const mapHref = $derived(
		dest.latitude !== null && dest.longitude !== null
			? `https://www.google.com/maps/search/?api=1&query=${dest.latitude},${dest.longitude}`
			: null
	);
	const coordText = $derived(
		dest.latitude !== null && dest.longitude !== null
			? `${Math.abs(dest.latitude).toFixed(3)}° ${dest.latitude < 0 ? (lang === "id" ? "LS" : "S") : lang === "id" ? "LU" : "N"}, ${Math.abs(dest.longitude).toFixed(3)}° ${dest.longitude < 0 ? (lang === "id" ? "BB" : "W") : lang === "id" ? "BT" : "E"}`
			: null
	);
	const siteHost = $derived.by(() => {
		if (!dest.website) return null;
		try {
			return new URL(dest.website).hostname.replace(/^www\./, "");
		} catch {
			return null;
		}
	});
	const gallery = $derived(dest.photos.filter((p) => p.id !== dest.cover?.id));
</script>

<div class="ecd" style={`--eco-bg: rgb(${tone})`}>
	<nav class="ecd-crumbs" aria-label="Breadcrumb">
		<a href="/ecotourism">{t.crumb}</a>
		<span aria-hidden="true">/</span>
		<a href={`/ecotourism#eco-${dest.zone}`}>{zone.name[lang]}</a>
	</nav>

	<header class="ecd-hero">
		<h1 class="ecd-title">{dest.name[lang]}</h1>
		<p class="ecd-place">{dest.area ? `${dest.area}, ` : ""}{dest.region}</p>
		<p class="ecd-lede">{dest.summary[lang]}</p>
	</header>

	{#if dest.cover}
		<figure class="ecd-cover">
			<a href={hrefOf(dest.cover)} class="ecd-cover-img">
				<ApiImage
					src={imgFor(dest.cover.seed, 1600, 1000, dest.cover.thumbUrl)}
					alt={dest.cover.title[lang]}
					fill
					eager
					priority="high"
					photoId={dest.cover.assetType === "VIDEO" ? undefined : dest.cover.id}
					class="object-cover"
				/>
			</a>
			<figcaption class="ecd-cap">
				{dest.cover.title[lang]} <span>{t.photoBy} {dest.cover.author}</span>
				<a href={hrefOf(dest.cover)} class="ecd-link ecd-cap-link">{t.license}</a>
			</figcaption>
		</figure>
	{/if}

	<div class="ecd-body">
		<!-- Fakta + altimeter: kolom samping di layar lebar, di atas cerita di ponsel. -->
		<aside class="ecd-side" aria-label={t.facts}>
			<div class="ecd-alt" role="img" aria-label={`${t.altimeter}: ${dest.elevation !== null ? fmtElev(dest.elevation) : zone.name[lang]}`}>
				<ol class="ecd-alt-scale" aria-hidden="true">
					{#each ECO_ORDER as z (z)}
						<li class:is-here={z === dest.zone}><span>{ECO_ZONE[z].name[lang]}</span></li>
					{/each}
				</ol>
				<span class="ecd-alt-mark" style={`top: ${(pos * 100).toFixed(2)}%`} aria-hidden="true"></span>
			</div>
			<dl class="ecd-facts">
				{#if dest.elevation !== null}
					<div><dt>{t.height}</dt><dd>{fmtElev(dest.elevation)}</dd></div>
				{/if}
				{#if dest.bestTime}
					<div><dt>{t.bestTime}</dt><dd>{dest.bestTime[lang]}</dd></div>
				{/if}
				{#if coordText && mapHref}
					<div>
						<dt>{t.coords}</dt>
						<dd>{coordText}<a href={mapHref} target="_blank" rel="noopener noreferrer" class="ecd-link ecd-link--sm">{t.openMap}</a></dd>
					</div>
				{/if}
				{#if dest.manager}
					<div><dt>{t.manager}</dt><dd>{dest.manager}</dd></div>
				{/if}
				{#if dest.website && siteHost}
					<div><dt>{t.website}</dt><dd><a href={dest.website} target="_blank" rel="noopener noreferrer nofollow" class="ecd-link">{siteHost}</a></dd></div>
				{/if}
			</dl>
		</aside>

		<div class="ecd-main">
			<section aria-labelledby="ecd-story">
				<h2 id="ecd-story" class="ecd-h2">{t.story}</h2>
				{#each story as p, i (i)}<p class="ecd-p">{p}</p>{/each}
			</section>

			{#if activities.length || rules.length}
				<div class="ecd-lists">
					{#if activities.length}
						<section aria-labelledby="ecd-act">
							<h2 id="ecd-act" class="ecd-h3">{t.activities}</h2>
							<ul class="ecd-ul">{#each activities as a, i (i)}<li>{a}</li>{/each}</ul>
						</section>
					{/if}
					{#if rules.length}
						<section aria-labelledby="ecd-rules">
							<h2 id="ecd-rules" class="ecd-h3">{t.rules}</h2>
							<ul class="ecd-ul">{#each rules as r, i (i)}<li>{r}</li>{/each}</ul>
						</section>
					{/if}
				</div>
			{/if}

			{#if access.length}
				<section aria-labelledby="ecd-access">
					<h2 id="ecd-access" class="ecd-h2">{t.access}</h2>
					{#each access as p, i (i)}<p class="ecd-p">{p}</p>{/each}
				</section>
			{/if}
		</div>
	</div>

	{#if gallery.length}
		<section class="ecd-gallery" aria-labelledby="ecd-gal">
			<div class="ecd-gal-head">
				<h2 id="ecd-gal" class="ecd-h2">{t.gallery(gallery.length)}</h2>
				<p class="ecd-note">{t.galleryNote}</p>
			</div>
			<div class="ecd-frames">
				{#each gallery as p (p.id)}
					<a href={hrefOf(p)} class="ecd-frame">
						<span class="ecd-frame-img">
							<ApiImage
								src={imgFor(p.seed, 900, 700, p.thumbUrl)}
								alt={p.title[lang]}
								fill
								photoId={p.assetType === "VIDEO" ? undefined : p.id}
								class="object-cover"
							/>
							{#if p.assetType === "VIDEO"}<span class="ecd-badge">{t.video}</span>{/if}
						</span>
						<span class="ecd-frame-title">{p.title[lang]}</span>
						<span class="ecd-frame-by">{p.author}</span>
					</a>
				{/each}
			</div>
		</section>
	{/if}

	{#if dest.related.length}
		<section class="ecd-related" aria-labelledby="ecd-rel">
			<h2 id="ecd-rel" class="ecd-h2">{t.related(zone.name[lang])}</h2>
			<ul class="ecd-cards">
				{#each dest.related as r (r.id)}
					<li>
						<a href={`/ecotourism/${r.slug}`} class="ecd-card">
							<span class="ecd-card-img">
								{#if r.cover}
									<ApiImage src={imgFor(r.cover.seed, 800, 560, r.cover.thumbUrl)} alt="" fill photoId={r.cover.assetType === "VIDEO" ? undefined : r.cover.id} class="object-cover" />
								{/if}
							</span>
							<span class="ecd-card-name">{r.name[lang]}</span>
							<span class="ecd-card-meta">{r.region}{r.elevation !== null ? ` · ${fmtElev(r.elevation)}` : ""}</span>
						</a>
					</li>
				{/each}
			</ul>
		</section>
	{/if}

	<p class="ecd-back"><a href="/ecotourism" class="ecd-link">← {t.back}</a></p>
</div>

<style>
	.ecd {
		--eco-line: rgba(241, 239, 233, 0.16);
		min-height: 100vh;
		padding: calc(var(--banner-h, 0px) + var(--nav-h) + clamp(1.5rem, 4vh, 3rem)) clamp(1.25rem, 4vw, 4rem) 6rem;
		background: var(--eco-bg);
		color: var(--fg, #f1efe9);
	}
	.ecd > * {
		max-width: 1180px;
		margin-inline: auto;
	}
	.ecd-crumbs {
		display: flex;
		gap: 0.6rem;
		font-size: 0.85rem;
		color: color-mix(in srgb, var(--fg, #f1efe9) 62%, transparent);
	}
	.ecd-crumbs a {
		color: inherit;
		text-decoration: none;
	}
	.ecd-crumbs a:hover,
	.ecd-crumbs a:focus-visible {
		color: var(--safelight);
	}
	.ecd-hero {
		margin-top: clamp(1.5rem, 4vh, 2.75rem);
	}
	.ecd-title {
		max-width: 16ch;
		font-family: var(--font-display);
		font-size: clamp(2.6rem, 7vw, 6rem);
		font-weight: 300;
		line-height: 0.98;
		letter-spacing: -0.03em;
		text-wrap: balance;
	}
	.ecd-place {
		margin-top: 1.1rem;
		font-size: 1rem;
		color: color-mix(in srgb, var(--fg, #f1efe9) 70%, transparent);
	}
	.ecd-lede {
		max-width: 52ch;
		margin-top: 1.4rem;
		font-size: clamp(1.05rem, 1.6vw, 1.3rem);
		line-height: 1.55;
	}
	.ecd-cover {
		margin-top: clamp(2.5rem, 6vh, 4rem);
	}
	.ecd-cover-img {
		position: relative;
		display: block;
		aspect-ratio: 16 / 9;
		overflow: hidden;
		border-radius: 3px;
		background: rgba(0, 0, 0, 0.25);
	}
	.ecd-cap {
		margin-top: 0.75rem;
		font-size: 0.85rem;
		color: color-mix(in srgb, var(--fg, #f1efe9) 75%, transparent);
	}
	.ecd-cap-link {
		margin-left: 0.75rem;
		font-size: 0.85rem;
	}
	.ecd-cap span {
		color: color-mix(in srgb, var(--fg, #f1efe9) 50%, transparent);
	}

	.ecd-body {
		display: grid;
		gap: clamp(2.5rem, 5vw, 4rem);
		margin-top: clamp(3rem, 7vh, 5rem);
		padding-top: clamp(2.5rem, 5vh, 3.5rem);
		border-top: 1px solid var(--eco-line);
	}
	@media (min-width: 960px) {
		.ecd-body {
			grid-template-columns: minmax(0, 1fr) 17rem;
		}
		.ecd-side {
			grid-column: 2;
			grid-row: 1;
			position: sticky;
			top: calc(var(--banner-h, 0px) + var(--nav-h) + 1.5rem);
			align-self: start;
		}
		.ecd-main {
			grid-column: 1;
			grid-row: 1;
		}
	}
	.ecd-side {
		display: grid;
		grid-template-columns: 8rem minmax(0, 1fr);
		gap: 1.5rem;
		align-items: start;
	}
	@media (min-width: 960px) {
		.ecd-side {
			grid-template-columns: minmax(0, 1fr);
			gap: 2rem;
		}
		.ecd-alt {
			height: 12rem;
		}
	}
	/* Altimeter: lima zona sama tinggi, penanda di posisi destinasi. */
	.ecd-alt {
		position: relative;
		width: 100%;
		max-width: 12rem;
		height: 14rem;
		border-left: 1px solid var(--eco-line);
	}
	.ecd-alt-scale {
		display: grid;
		grid-template-rows: repeat(5, 1fr);
		height: 100%;
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.ecd-alt-scale li {
		position: relative;
		padding: 0.2rem 0 0 0.85rem;
		font-size: 0.75rem;
		line-height: 1.2;
		color: color-mix(in srgb, var(--fg, #f1efe9) 45%, transparent);
	}
	.ecd-alt-scale li::before {
		content: "";
		position: absolute;
		left: 0;
		top: 0;
		width: 0.5rem;
		border-top: 1px solid var(--eco-line);
	}
	.ecd-alt-scale li.is-here {
		color: var(--fg, #f1efe9);
	}
	.ecd-alt-mark {
		position: absolute;
		left: -0.4rem;
		width: 0.8rem;
		height: 0.8rem;
		margin-top: -0.4rem;
		border-radius: 50%;
		background: var(--safelight);
		box-shadow: 0 0 0 4px color-mix(in srgb, var(--safelight) 25%, transparent);
	}
	.ecd-facts {
		display: grid;
		gap: 1.1rem;
		margin: 0;
	}
	.ecd-facts dt {
		font-size: 0.78rem;
		color: color-mix(in srgb, var(--fg, #f1efe9) 55%, transparent);
	}
	.ecd-facts dd {
		margin: 0.2rem 0 0;
		font-size: 0.98rem;
		line-height: 1.45;
	}

	.ecd-h2 {
		font-family: var(--font-display);
		font-size: clamp(1.6rem, 3vw, 2.3rem);
		font-weight: 300;
		line-height: 1.1;
		letter-spacing: -0.02em;
	}
	.ecd-h3 {
		font-family: var(--font-display);
		font-size: 1.3rem;
		font-weight: 300;
	}
	.ecd-main > section + *,
	.ecd-main > * + section {
		margin-top: clamp(2.5rem, 6vh, 3.5rem);
	}
	.ecd-p {
		max-width: 66ch;
		margin-top: 1.1rem;
		font-size: 1.05rem;
		line-height: 1.75;
		color: color-mix(in srgb, var(--fg, #f1efe9) 88%, transparent);
	}
	.ecd-lists {
		display: grid;
		gap: 2rem;
	}
	@media (min-width: 640px) {
		.ecd-lists {
			grid-template-columns: 1fr 1fr;
		}
	}
	.ecd-ul {
		margin: 1rem 0 0;
		padding: 0;
		list-style: none;
	}
	.ecd-ul li {
		padding: 0.7rem 0;
		border-top: 1px solid var(--eco-line);
		font-size: 0.98rem;
		line-height: 1.5;
	}
	.ecd-ul li:last-child {
		border-bottom: 1px solid var(--eco-line);
	}

	.ecd-gallery,
	.ecd-related {
		margin-top: clamp(4rem, 10vh, 6rem);
		padding-top: clamp(2.5rem, 5vh, 3.5rem);
		border-top: 1px solid var(--eco-line);
	}
	.ecd-gal-head {
		display: grid;
		gap: 0.75rem;
	}
	@media (min-width: 960px) {
		.ecd-gal-head {
			grid-template-columns: 1fr auto;
			align-items: end;
		}
	}
	.ecd-note {
		max-width: 44ch;
		font-size: 0.92rem;
		color: color-mix(in srgb, var(--fg, #f1efe9) 62%, transparent);
	}
	.ecd-frames {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: clamp(0.75rem, 1.6vw, 1.5rem);
		margin-top: 2rem;
	}
	@media (min-width: 900px) {
		.ecd-frames {
			grid-template-columns: repeat(3, minmax(0, 1fr));
		}
	}
	.ecd-frame,
	.ecd-card {
		display: block;
		color: inherit;
		text-decoration: none;
	}
	.ecd-frame-img,
	.ecd-card-img {
		position: relative;
		display: block;
		aspect-ratio: 4 / 3;
		overflow: hidden;
		border-radius: 3px;
		background: rgba(0, 0, 0, 0.25);
	}
	.ecd-frame-img :global(img),
	.ecd-frame-img :global(canvas),
	.ecd-card-img :global(img),
	.ecd-card-img :global(canvas) {
		transition: transform 0.6s cubic-bezier(0.2, 0.7, 0.2, 1);
	}
	@media (hover: hover) {
		.ecd-frame:hover .ecd-frame-img :global(img),
		.ecd-frame:hover .ecd-frame-img :global(canvas),
		.ecd-card:hover .ecd-card-img :global(img),
		.ecd-card:hover .ecd-card-img :global(canvas) {
			transform: scale(1.04);
		}
	}
	.ecd-frame:focus-visible,
	.ecd-card:focus-visible {
		outline: 2px solid var(--safelight);
		outline-offset: 4px;
	}
	.ecd-badge {
		position: absolute;
		left: 0.6rem;
		top: 0.6rem;
		padding: 0.2rem 0.5rem;
		border-radius: 2px;
		background: rgba(0, 0, 0, 0.6);
		font-size: 0.72rem;
	}
	.ecd-frame-title,
	.ecd-card-name {
		display: block;
		margin-top: 0.7rem;
		font-size: 0.98rem;
		line-height: 1.35;
	}
	.ecd-card-name {
		font-family: var(--font-display);
		font-size: 1.25rem;
		font-weight: 300;
	}
	.ecd-frame-by,
	.ecd-card-meta {
		display: block;
		margin-top: 0.2rem;
		font-size: 0.82rem;
		color: color-mix(in srgb, var(--fg, #f1efe9) 55%, transparent);
	}
	.ecd-cards {
		display: grid;
		gap: clamp(1rem, 2vw, 1.75rem);
		margin: 2rem 0 0;
		padding: 0;
		list-style: none;
	}
	@media (min-width: 720px) {
		.ecd-cards {
			grid-template-columns: repeat(3, minmax(0, 1fr));
		}
	}
	.ecd-link {
		color: var(--fg, #f1efe9);
		text-decoration: underline;
		text-decoration-color: color-mix(in srgb, var(--fg, #f1efe9) 30%, transparent);
		text-underline-offset: 0.3em;
		transition: color 0.25s ease, text-decoration-color 0.25s ease;
	}
	.ecd-link:hover,
	.ecd-link:focus-visible {
		color: var(--safelight);
		text-decoration-color: var(--safelight);
	}
	.ecd-link--sm {
		display: block;
		margin-top: 0.25rem;
		font-size: 0.85rem;
	}
	.ecd-back {
		margin-top: clamp(4rem, 10vh, 6rem);
		font-size: 0.95rem;
	}
	@media (prefers-reduced-motion: reduce) {
		.ecd-frame-img :global(img),
		.ecd-frame-img :global(canvas),
		.ecd-card-img :global(img),
		.ecd-card-img :global(canvas) {
			transition: none;
		}
	}
</style>
