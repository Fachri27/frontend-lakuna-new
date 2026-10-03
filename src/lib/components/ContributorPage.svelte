<script lang="ts">
	import { i18n, type Lang } from "$lib/i18n.svelte";
	import { mailto } from "$lib/contact";
	import { store } from "$lib/store.svelte";
	import { authModal } from "$lib/authModal.svelte";
	import { loadLacuna, type ThinCategory } from "$lib/lacuna";
	import { fetchPhotos, fetchVideos, imgFor, stripPicsumPhotos, type Photo, type Video } from "$lib/data";
	import { PROVINCES, MAP_W, MAP_H } from "$lib/provinces";

	type Step = { title: string; body: string };
	type QA = { q: string; a: string; link?: { href: string; label: string } };
	type Way = { title: string; body: string };
	type Who = { title: string; body: string };
	type Opp = { key: string; title: string; body: string; subject: string; d?: string; vb?: string; img?: string | null };

	const copy: Record<Lang, {
		title: string; intro: string; notice: string; waysTitle: string; waysBody: string; ways: Way[];
		whoTitle: string; who: Who[]; start: string;
		oppTitle: string; oppBody: string; oppProvince: (name: string) => string; oppCategory: (n: number, name: string) => string;
		interested: string; prev: string; next: string; goPage: (n: number) => string; subjectFor: (what: string) => string;
		ctaPrimary: string; ctaAccount: string; ctaProfile: string; subject: string;
		mapTitle: string; mapBody: string; mapAlt: string; emptyCount: (n: number, total: number) => string;
		allFilled: string; idle: string; noFrames: string; hasFrames: (n: number) => string; stillEmpty: string;
		earnSay: string; earnBody: string;
		uploadTitle: string; photosH: string; photosBody: string; videosH: string; videosBody: string; tagNote: string;
		howTitle: string; steps: Step[];
		faqTitle: string; faq: QA[];
		closeTitle: string; closeBody: string;
	}> = {
		id: {
			title: "Isi celah-celah Nusantara.",
			intro: "Potret atau rekam yang belum pernah dilihat arsip ini. Setiap karya yang disetujui dilisensikan kepada orang yang membutuhkannya, dan 70% dari setiap penjualan kembali ke kamu.",
			notice: "Unggahan untuk kontributor segera hadir. Beri tahu kami bila kamu berminat.",
			waysTitle: "Cara karyamu menghasilkan",
			waysBody: "Foto dan video yang disetujui dilisensikan dengan dua cara, dan keduanya menghasilkan untukmu.",
			ways: [
				{ title: "Lisensi Standar", body: "Pembeli membayar sekali untuk satu bingkai. Kamu mendapat 70% dari setiap penjualan." },
				{ title: "Unduhan langganan", body: "Pelanggan mengunduh dari kuota bulanan. Karyamu bisa menghasilkan lewat jalur ini juga, bukan hanya lewat penjualan satuan." },
				{ title: "Foto dan video", body: "Jual keduanya. Kirim foto sebagai JPG, PNG, atau WebP dan video sebagai MP4, WebM, atau QuickTime, maksimal 2 GB per berkas." },
			],
			whoTitle: "Siapa yang bisa menjual di Lakuna?",
			who: [
				{ title: "Fotografer", body: "Kirim foto tempat, orang, dan momen di seluruh Nusantara, terutama dari provinsi yang belum terjangkau arsip ini." },
				{ title: "Videografer", body: "Kirim klip video. Pembeli melihat pratinjau gerak klipmu saat mengarahkan kursor ke kartunya." },
			],
			start: "Mulai",
			oppTitle: "Contoh peluang",
			oppBody: "Mulailah di bagian yang paling tipis di arsip: provinsi yang belum punya bingkai, dan tema yang bingkainya baru segelintir.",
			oppProvince: (name) => `Belum ada bingkai dari ${name}. Potret atau rekam di mana pun di provinsi ini.`,
			oppCategory: (n, name) => `${n <= 10 ? "Baru " : ""}${n} bingkai sejauh ini. Tambahkan sudut pandang baru di ${name}.`,
			interested: "Saya berminat",
			prev: "Sebelumnya",
			next: "Berikutnya",
			goPage: (n) => `Ke halaman ${n}`,
			subjectFor: (what) => `Minat berkontribusi: ${what}`,
			ctaPrimary: "Beri tahu kami kamu ingin berkontribusi",
			ctaAccount: "Buat akun",
			ctaProfile: "Buka profilmu",
			subject: "Minat menjadi kontributor Lakuna",
			mapTitle: "Di mana arsip ini membutuhkanmu",
			mapBody: "Provinsi bergaris ungu belum punya satu bingkai pun.",
			mapAlt: "Peta provinsi Indonesia; provinsi yang belum punya bingkai di arsip ditandai garis ungu.",
			emptyCount: (n, t) => `${n} dari ${t} provinsi belum punya bingkai.`,
			allFilled: "Setiap provinsi sudah punya bingkai. Tambahkan sudut pandangmu.",
			idle: "Arahkan ke provinsi mana pun untuk melihat isinya.",
			noFrames: "belum ada bingkai",
			hasFrames: (n) => `${n} bingkai`,
			stillEmpty: "Provinsi yang masih kosong",
			earnSay: "70% dari setiap penjualan kembali ke kamu.",
			earnBody: "Kamu mendapat penghasilan setiap kali karyamu dilisensikan, dan bisa memantau penghasilan serta pembayarannya di dasbor kontributor.",
			uploadTitle: "Yang bisa kamu kirim",
			photosH: "Foto",
			photosBody: "Berkas JPG, PNG, atau WebP, maksimal 2 GB per berkas.",
			videosH: "Video",
			videosBody: "Berkas MP4 (WebM dan QuickTime juga diterima), maksimal 2 GB per berkas.",
			tagNote: "Beri setiap karya minimal 5 kategori dan 5 kata kunci supaya pembeli bisa menemukannya.",
			howTitle: "Cara kerjanya",
			steps: [
				{ title: "Dapatkan akses kontributor", body: "Buat akun dan beri tahu kami kamu ingin berkontribusi. Tim kami mengubah akunmu menjadi akun kontributor." },
				{ title: "Unggah karyamu", body: "Tambahkan foto atau video beserta judul, lokasi, minimal 5 kategori, dan minimal 5 kata kunci." },
				{ title: "Kami meninjaunya", body: "Setiap bingkai ditinjau dulu. Karya yang disetujui tayang di arsip; bila ditolak, kamu melihat alasannya dan bisa mengunggah ulang." },
				{ title: "Dapat penghasilan saat terjual", body: "70% dari setiap penjualan kembali ke kamu. Pantau penghasilan dan pembayarannya di dasbor kontributor." },
			],
			faqTitle: "Pertanyaan kontributor",
			faq: [
				{ q: "Apa yang bisa saya unggah?", a: "Foto (JPG, PNG, WebP) dan video (MP4, WebM, QuickTime), maksimal 2 GB per berkas." },
				{ q: "Apakah semua unggahan langsung tayang?", a: "Tidak. Setiap bingkai ditinjau dulu, dan hanya karya yang disetujui yang masuk arsip." },
				{ q: "Berapa yang saya dapat?", a: "70% dari setiap penjualan kembali ke perajangga." },
				{ q: "Apakah pembeli memiliki foto saya?", a: "Tidak. Lisensi memberi pembeli hak pakai, bukan kepemilikan.", link: { href: "/license", label: "Baca perjanjian lisensi" } },
				{ q: "Kapan saya bisa mulai mengunggah?", a: "Unggahan untuk kontributor segera hadir. Beri tahu kami bila kamu berminat." },
			],
			closeTitle: "Ada sudut Nusantara yang belum terlihat?",
			closeBody: "Beri tahu kami, dan kami hubungi begitu unggahan dibuka.",
		},
		en: {
			title: "Fill the gaps in Nusantara.",
			intro: "Photograph or film what this archive hasn't seen yet. Every approved frame is licensed to people who need it, and 70% of each sale comes back to you.",
			notice: "Contributor uploads are coming soon. Tell us if you're interested.",
			waysTitle: "How your work earns",
			waysBody: "Approved photos and videos are licensed in two ways, and both earn for you.",
			ways: [
				{ title: "Standard licenses", body: "Buyers pay once for a single frame. You earn 70% of every sale." },
				{ title: "Subscription downloads", body: "Subscribers download from a monthly quota. Your work can earn this way too, not only through single sales." },
				{ title: "Photos and videos", body: "Sell both. Send photos as JPG, PNG, or WebP and videos as MP4, WebM, or QuickTime, up to 2 GB per file." },
			],
			whoTitle: "Who can sell on Lakuna?",
			who: [
				{ title: "Photographers", body: "Send photos of places, people, and moments across Nusantara, especially from provinces the archive hasn't reached yet." },
				{ title: "Videographers", body: "Send video clips. Buyers see a motion preview of your clip when they hover over its card." },
			],
			start: "Start",
			oppTitle: "Example opportunities",
			oppBody: "Start where the archive is thinnest: provinces with no frames yet, and themes with only a handful.",
			oppProvince: (name) => `No frames from ${name} yet. Photograph or film anywhere in the province.`,
			oppCategory: (n, name) => `${n <= 10 ? "Only " : ""}${n} ${n === 1 ? "frame" : "frames"} so far. Add a new angle on ${name}.`,
			interested: "I'm interested",
			prev: "Previous",
			next: "Next",
			goPage: (n) => `Go to page ${n}`,
			subjectFor: (what) => `Interested in contributing: ${what}`,
			ctaPrimary: "Tell us you want to contribute",
			ctaAccount: "Create an account",
			ctaProfile: "Open your profile",
			subject: "Interested in contributing to Lakuna",
			mapTitle: "Where the archive needs you",
			mapBody: "Provinces outlined in purple don't have a single frame yet.",
			mapAlt: "Map of Indonesia's provinces; provinces with no frames in the archive yet are outlined in purple.",
			emptyCount: (n, t) => `${n} of ${t} provinces have no frames yet.`,
			allFilled: "Every province has frames. Add your own point of view.",
			idle: "Point at any province to see what it holds.",
			noFrames: "no frames yet",
			hasFrames: (n) => `${n} ${n === 1 ? "frame" : "frames"}`,
			stillEmpty: "Provinces still empty",
			earnSay: "70% of every sale goes back to you.",
			earnBody: "You earn each time your work is licensed, and you can follow your earnings and payouts in the contributor dashboard.",
			uploadTitle: "What you can send",
			photosH: "Photos",
			photosBody: "JPG, PNG, or WebP files, up to 2 GB each.",
			videosH: "Videos",
			videosBody: "MP4 files (WebM and QuickTime are accepted too), up to 2 GB each.",
			tagNote: "Give every upload at least 5 categories and 5 keywords so buyers can find it.",
			howTitle: "How it works",
			steps: [
				{ title: "Get contributor access", body: "Create an account and tell us you want to contribute. Our team switches your account to a contributor account." },
				{ title: "Upload your work", body: "Add photos or videos with a title, location, at least 5 categories, and at least 5 keywords." },
				{ title: "We review it", body: "Every frame is reviewed first. Approved frames go live in the archive; if one is declined, you see the reason and can upload again." },
				{ title: "Earn when it sells", body: "70% of every sale goes back to you. Follow your earnings and payouts in the contributor dashboard." },
			],
			faqTitle: "Contributor questions",
			faq: [
				{ q: "What can I upload?", a: "Photos (JPG, PNG, WebP) and videos (MP4, WebM, QuickTime), up to 2 GB per file." },
				{ q: "Is every upload published right away?", a: "No. Every frame is reviewed first, and only approved frames reach the archive." },
				{ q: "How much do I earn?", a: "70% of every sale goes back to the image-maker." },
				{ q: "Do buyers own my photo?", a: "No. A license gives buyers usage rights, not ownership.", link: { href: "/license", label: "Read the license agreement" } },
				{ q: "When can I start uploading?", a: "Contributor uploads are coming soon. Tell us if you're interested." },
			],
			closeTitle: "A corner of Nusantara the archive hasn't seen?",
			closeBody: "Tell us, and we'll reach out as soon as uploads open.",
		},
	};

	const lang = $derived<Lang>(i18n.lang);
	const t = $derived(copy[lang]);

	// ── Peta terbalik: yang MENYALA adalah provinsi yang belum punya bingkai ──
	let counts = $state<Record<string, number>>({});
	let cats = $state<ThinCategory[]>([]);
	let loaded = $state(false);
	$effect(() => {
		let alive = true;
		loadLacuna().then((r) => {
			if (!alive) return;
			counts = r.counts;
			cats = r.categories;
			loaded = Object.keys(r.counts).length > 0;
		});
		return () => {
			alive = false;
		};
	});
	const empty = $derived(loaded ? PROVINCES.filter((p) => !(counts[p.name] ?? 0)) : []);

	// Kotak pas (viewBox) di sekeliling siluet sebuah provinsi, dari koordinat jalurnya.
	function bbox(d: string): string {
		const n = (d.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
		let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
		for (let i = 0; i + 1 < n.length; i += 2) {
			x0 = Math.min(x0, n[i]); x1 = Math.max(x1, n[i]);
			y0 = Math.min(y0, n[i + 1]); y1 = Math.max(y1, n[i + 1]);
		}
		const w = x1 - x0, h = y1 - y0, pad = Math.max(w, h) * 0.12;
		return `${(x0 - pad).toFixed(1)} ${(y0 - pad).toFixed(1)} ${(w + pad * 2).toFixed(1)} ${(h + pad * 2).toFixed(1)}`;
	}

	// Contoh peluang NYATA dari data arsip: provinsi kosong dulu, lalu tiga tema paling tipis.
	const opps = $derived.by<Opp[]>(() => {
		const out: Opp[] = empty.map((p) => ({
			key: `p-${p.name}`,
			title: p.name,
			body: t.oppProvince(p.name),
			subject: t.subjectFor(p.name),
			d: p.d,
			vb: bbox(p.d),
		}));
		for (const c of cats.slice(0, 3)) {
			out.push({
				key: `c-${c.name}`,
				title: c.name,
				body: t.oppCategory(c.n, c.name),
				subject: t.subjectFor(c.name),
				img: c.photo?.thumbUrl ? imgFor(c.photo.seed, 800, 600, c.photo.thumbUrl) : null,
			});
		}
		return out;
	});

	// Karusel: gulir asli + snap; panah dan titik halaman hanya mengendalikan scrollLeft.
	let trackEl: HTMLDivElement | undefined = $state();
	let page = $state(0);
	let pages = $state(1);
	function measure() {
		const el = trackEl;
		if (!el || !el.clientWidth) return;
		pages = Math.max(1, Math.ceil((el.scrollWidth - 4) / el.clientWidth));
		const max = el.scrollWidth - el.clientWidth;
		// Halaman terakhir sering lebih pendek dari satu lebar penuh: di ujung gulir = halaman terakhir.
		page = el.scrollLeft >= max - 4 ? pages - 1 : Math.min(pages - 1, Math.max(0, Math.round(el.scrollLeft / el.clientWidth)));
	}
	function go(i: number) {
		const el = trackEl;
		if (!el) return;
		const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
		const target = Math.max(0, Math.min(pages - 1, i));
		const left = target >= pages - 1 ? el.scrollWidth - el.clientWidth : target * el.clientWidth;
		el.scrollTo({ left, behavior: reduce ? "auto" : "smooth" });
	}
	$effect(() => {
		void opps.length;
		const el = trackEl;
		if (!el) return;
		measure();
		el.addEventListener("scroll", measure, { passive: true });
		const ro = new ResizeObserver(measure);
		ro.observe(el);
		return () => {
			el.removeEventListener("scroll", measure);
			ro.disconnect();
		};
	});

	let active = $state<string | null>(null);
	const readout = $derived.by(() => {
		if (!active) return t.idle;
		const n = counts[active] ?? 0;
		return n > 0 ? `${active}: ${t.hasFrames(n)}` : `${active}: ${t.noFrames}`;
	});

	// Foto hero: satu bingkai nyata dari arsip. Tanpa data, hero tampil tanpa foto
	// (tak pernah diganti foto dummy).
	let hero = $state<Photo | null>(null);
	let whoPhoto = $state<Photo | null>(null);
	let whoVideo = $state<Video | null>(null);
	$effect(() => {
		let alive = true;
		fetchPhotos({ type: "FOTO", limit: 8 })
			.then((r) => {
				if (!alive) return;
				const rows = stripPicsumPhotos(r.photos);
				hero = rows[0] ?? null;
				// Kartu "Fotografer" memakai foto lain dari hero bila ada.
				whoPhoto = rows[1] ?? rows[0] ?? null;
			})
			.catch(() => {});
		fetchVideos(8)
			.then((r) => {
				if (alive) whoVideo = r.videos.find((v) => v.thumbUrl && !v.thumbUrl.includes("picsum.photos")) ?? null;
			})
			.catch(() => {});
		return () => {
			alive = false;
		};
	});
	const whoImgs = $derived([
		whoPhoto?.thumbUrl ? imgFor(whoPhoto.seed, 900, 700, whoPhoto.thumbUrl) : null,
		whoVideo?.thumbUrl ? imgFor(whoVideo.seed, 900, 700, whoVideo.thumbUrl) : null,
	]);

	const primaryHref = $derived(mailto(t.subject));
	const signedIn = $derived(!!store.user);
	function account() {
		if (signedIn) location.assign("/profile");
		else authModal.open("/contributor", "register");
	}
</script>

<div class="ct bg-bg text-fg">
	<!-- Pembuka: foto bergaya irisan (lingkaran + dua serpih) menempel ke tepi
		kiri layar, teks di kanan. -->
	<svg width="0" height="0" aria-hidden="true" focusable="false" class="ct-defs">
		<defs>
			<clipPath id="ct-slice" clipPathUnits="objectBoundingBox">
				<ellipse cx="0.355" cy="0.5" rx="0.4" ry="0.53" />
				<path d="M 0.765 0.09 C 0.865 0.15 0.935 0.32 0.935 0.5 C 0.935 0.68 0.865 0.85 0.765 0.91 C 0.745 0.8 0.745 0.2 0.765 0.09 Z" />
				<path d="M 0.945 0.17 C 0.985 0.23 1 0.37 1 0.5 C 1 0.63 0.985 0.77 0.945 0.83 C 0.935 0.7 0.935 0.3 0.945 0.17 Z" />
			</clipPath>
		</defs>
	</svg>
	<section class="ct-hero" class:no-art={!hero}>
		{#if hero}
			<div class="ct-art" aria-hidden="true">
				<div class="ct-art__img">
					<img src={imgFor(hero.seed, 1200, 900, hero.thumbUrl)} alt="" decoding="async" fetchpriority="high" />
				</div>
			</div>
		{/if}
		<div class="ct-hero__text">
			<h1 class="ct-title">{t.title}</h1>
			<p class="ct-intro">{t.intro}</p>
			<p class="ct-notice">{t.notice}</p>
			<p class="ct-cta">
				<a href={primaryHref} class="ct-btn ct-btn--primary">
					{t.ctaPrimary}
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
				</a>
				<button type="button" onclick={account} class="ct-btn">{signedIn ? t.ctaProfile : t.ctaAccount}</button>
			</p>
		</div>
	</section>

	<div class="ct-wrap">
		<!-- Cara karyamu menghasilkan: tiga kartu. -->
		<section class="ct-ways" aria-labelledby="ct-ways-h">
			<h2 id="ct-ways-h" class="ct-ways__h">{t.waysTitle}</h2>
			<p class="ct-ways__p">{t.waysBody}</p>
			<div class="ct-ways__grid">
				{#each t.ways as w (w.title)}
					<article class="ct-way">
						<h3>{w.title}</h3>
						<p>{w.body}</p>
					</article>
				{/each}
			</div>
		</section>

		<!-- Siapa yang bisa menjual: dua jenis konten yang memang diterima. -->
		<section class="ct-who" aria-labelledby="ct-who-h">
			<h2 id="ct-who-h" class="ct-ways__h">{t.whoTitle}</h2>
			<div class="ct-who__grid">
				{#each t.who as w, i (w.title)}
					<article class="ct-who__card" class:no-img={!whoImgs[i]}>
						{#if whoImgs[i]}
							<div class="ct-who__img" aria-hidden="true">
								<img src={whoImgs[i]} alt="" loading="lazy" decoding="async" />
							</div>
						{/if}
						<div class="ct-who__body">
							<h3>{w.title}</h3>
							<p>{w.body}</p>
							<a href={primaryHref} class="ct-who__link">{t.start}</a>
						</div>
					</article>
				{/each}
			</div>
		</section>

		<!-- Peta terbalik: provinsi yang belum punya bingkai ditandai ungu. -->
		<section class="ct-map" aria-labelledby="ct-map-h">
			<div class="ct-map__head">
				<h2 id="ct-map-h" class="ct-h2">{t.mapTitle}</h2>
				<p class="ct-p">{t.mapBody}</p>
			</div>
			<figure class="ct-map__fig">
				<svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} role="img" aria-label={t.mapAlt} preserveAspectRatio="xMidYMid meet">
					{#each PROVINCES as p (p.name)}
						{@const n = counts[p.name] ?? 0}
						<path
							d={p.d}
							class="ct-prov"
							class:is-empty={loaded && n === 0}
							class:is-filled={loaded && n > 0}
							class:is-active={active === p.name}
							role="img"
							aria-label={`${p.name}: ${n > 0 ? t.hasFrames(n) : t.noFrames}`}
							onmouseenter={() => (active = p.name)}
							onmouseleave={() => (active = null)}
						/>
					{/each}
				</svg>
				<figcaption>
					<span>{loaded ? (empty.length ? t.emptyCount(empty.length, PROVINCES.length) : t.allFilled) : ""}</span>
					<span class="ct-map__read" aria-live="polite">{readout}</span>
				</figcaption>
			</figure>
		</section>

		{#if opps.length}
			<section class="ct-opp" aria-labelledby="ct-opp-h">
				<h2 id="ct-opp-h" class="ct-ways__h">{t.oppTitle}</h2>
				<p class="ct-ways__p">{t.oppBody}</p>
				<div class="ct-car" role="group" aria-roledescription="carousel" aria-label={t.oppTitle}>
					<div bind:this={trackEl} class="ct-car__track">
						{#each opps as o (o.key)}
							<article class="ct-card">
								<div class="ct-card__art" aria-hidden="true">
									{#if o.d && o.vb}
										<svg viewBox={o.vb} preserveAspectRatio="xMidYMid meet"><path d={o.d} /></svg>
									{:else if o.img}
										<img src={o.img} alt="" loading="lazy" decoding="async" />
									{/if}
								</div>
								<h3>{o.title}</h3>
								<p>{o.body}</p>
								<a href={mailto(o.subject)} class="ct-card__btn">{t.interested}</a>
							</article>
						{/each}
					</div>
					{#if pages > 1}
						<button type="button" class="ct-car__arrow ct-car__arrow--prev" onclick={() => go(page - 1)} disabled={page === 0} aria-label={t.prev}>
							<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
						</button>
						<button type="button" class="ct-car__arrow ct-car__arrow--next" onclick={() => go(page + 1)} disabled={page >= pages - 1} aria-label={t.next}>
							<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
						</button>
					{/if}
				</div>
				{#if pages > 1}
					<div class="ct-dots">
						{#each Array.from({ length: pages }, (_, i) => i) as i (i)}
							<button type="button" class="ct-dot" class:is-on={i === page} onclick={() => go(i)} aria-label={t.goPage(i + 1)} aria-current={i === page ? "true" : undefined}></button>
						{/each}
					</div>
				{/if}
			</section>
		{/if}

		<section class="ct-row">
			<p class="ct-say">{t.earnSay}</p>
			<p class="ct-p ct-row__side">{t.earnBody}</p>
		</section>

		<section class="ct-row" aria-labelledby="ct-up-h">
			<h2 id="ct-up-h" class="ct-h2">{t.uploadTitle}</h2>
			<div class="ct-row__side">
				<div class="ct-two">
					<div>
						<h3 class="ct-h3">{t.photosH}</h3>
						<p class="ct-p">{t.photosBody}</p>
					</div>
					<div>
						<h3 class="ct-h3">{t.videosH}</h3>
						<p class="ct-p">{t.videosBody}</p>
					</div>
				</div>
				<p class="ct-p ct-note">{t.tagNote}</p>
			</div>
		</section>

		<section class="ct-row" aria-labelledby="ct-how-h">
			<h2 id="ct-how-h" class="ct-h2">{t.howTitle}</h2>
			<ol class="ct-steps ct-row__side">
				{#each t.steps as s (s.title)}
					<li>
						<h3 class="ct-h3">{s.title}</h3>
						<p class="ct-p">{s.body}</p>
					</li>
				{/each}
			</ol>
		</section>

		{#if empty.length}
			<section class="ct-row" aria-labelledby="ct-empty-h">
				<h2 id="ct-empty-h" class="ct-h2">{t.stillEmpty}</h2>
				<p class="ct-p ct-row__side ct-empty">{empty.map((p) => p.name).join(", ")}.</p>
			</section>
		{/if}

		<section class="ct-row" aria-labelledby="ct-faq-h">
			<h2 id="ct-faq-h" class="ct-h2">{t.faqTitle}</h2>
			<div class="ct-row__side ct-faq">
				{#each t.faq as it (it.q)}
					<details class="ct-qa">
						<summary>
							<span>{it.q}</span>
							<svg class="ct-ico" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
						</summary>
						<div class="ct-qa__a">
							<p>{it.a}</p>
							{#if it.link}<a href={it.link.href} class="ct-link">{it.link.label}</a>{/if}
						</div>
					</details>
				{/each}
			</div>
		</section>

		<footer class="ct-close">
			<h2 class="ct-close__say">{t.closeTitle}</h2>
			<div class="ct-close__side">
				<p class="ct-p">{t.closeBody}</p>
				<p class="ct-cta">
					<a href={primaryHref} class="ct-btn ct-btn--primary">{t.ctaPrimary}</a>
				</p>
			</div>
		</footer>
	</div>
</div>

<style>
	.ct {
		min-height: 100vh;
	}
	.ct-defs {
		position: absolute;
	}
	.ct-wrap {
		max-width: 1400px;
		margin: 0 auto;
		padding: clamp(3.5rem, 8vw, 6.5rem) clamp(1.25rem, 4vw, 4rem) 7rem;
	}

	/* ── Pembuka: foto irisan di kiri (sampai tepi layar), teks di kanan ── */
	.ct-hero {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		align-items: center;
		padding-top: calc(var(--banner-h, 0px) + var(--nav-h));
	}
	@media (min-width: 900px) {
		.ct-hero {
			grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
			min-height: min(88svh, 760px);
			padding-bottom: 2rem;
		}
		.ct-hero.no-art {
			grid-template-columns: minmax(0, 1fr);
		}
	}
	.ct-art {
		width: 100%;
	}
	/* Rasio tetap: klip memakai satuan bounding-box, jadi lingkarannya tetap bulat. */
	.ct-art__img {
		position: relative;
		width: 100%;
		aspect-ratio: 1.315 / 1;
		clip-path: url(#ct-slice);
		background: var(--surface);
	}
	.ct-art__img img {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
		object-position: center top;
		/* Thumbnail memuat pita kredit di dasarnya: diperbesar dari tepi atas. */
		transform: scale(1.1);
		transform-origin: top center;
	}
	.ct-hero__text {
		max-width: 36rem;
		padding: 2.5rem clamp(1.25rem, 4vw, 4rem) 3rem;
	}
	@media (min-width: 900px) {
		.ct-hero__text {
			padding-left: clamp(1rem, 3vw, 3rem);
			padding-right: clamp(1.5rem, 5vw, 5rem);
		}
		.ct-hero.no-art .ct-hero__text {
			max-width: 44rem;
			margin: 0 auto;
		}
	}
	.ct-title {
		font-family: var(--font-display);
		font-size: clamp(2.2rem, 3.9vw, 3.5rem);
		font-weight: 700;
		line-height: 1.08;
		letter-spacing: -0.025em;
		text-wrap: balance;
		color: var(--fg);
	}
	.ct-intro {
		margin-top: 1.25rem;
		max-width: 44ch;
		font-size: clamp(1rem, 1.25vw, 1.12rem);
		line-height: 1.7;
		color: var(--fg-muted);
	}
	.ct-notice {
		margin-top: 0.9rem;
		max-width: 44ch;
		font-size: 0.95rem;
		line-height: 1.6;
		color: var(--fg);
	}
	.ct-cta {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
		margin-top: 1.75rem;
	}
	.ct-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.6rem;
		padding: 0.85rem 1.4rem;
		border: 1px solid var(--hair);
		border-radius: 10px;
		font-size: 0.92rem;
		font-weight: 600;
		color: var(--fg);
		transition: border-color 0.2s ease, color 0.2s ease, transform 0.2s ease;
	}
	.ct-btn:hover {
		border-color: var(--safelight);
		color: var(--safelight);
	}
	.ct-btn--primary {
		border-color: var(--safelight);
		background: var(--safelight);
		color: var(--ivory, #fff);
	}
	.ct-btn--primary:hover {
		color: var(--ivory, #fff);
		transform: translateY(-1px);
	}

	/* ── Cara karyamu menghasilkan: tiga kartu ───────────────────── */
	.ct-ways__h {
		font-family: var(--font-display);
		font-size: clamp(1.7rem, 3vw, 2.4rem);
		font-weight: 700;
		letter-spacing: -0.02em;
		color: var(--fg);
	}
	.ct-ways__p {
		margin-top: 0.6rem;
		max-width: 70ch;
		font-size: 1.05rem;
		line-height: 1.65;
		color: var(--fg-muted);
	}
	.ct-ways__grid {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: 1rem;
		margin-top: 2rem;
	}
	@media (min-width: 860px) {
		.ct-ways__grid {
			grid-template-columns: repeat(3, minmax(0, 1fr));
			gap: 1.25rem;
		}
	}
	.ct-way {
		padding: clamp(1.4rem, 2.4vw, 2rem);
		border: 1px solid var(--hair);
		border-radius: 14px;
		background: var(--surface);
	}
	.ct-way h3 {
		font-family: var(--font-display);
		font-size: 1.3rem;
		font-weight: 700;
		letter-spacing: -0.01em;
		color: var(--fg);
	}
	.ct-way p {
		margin-top: 0.6rem;
		font-size: 1rem;
		line-height: 1.65;
		color: var(--fg-muted);
	}

	/* ── Siapa yang bisa menjual ─────────────────────────────────── */
	.ct-who {
		margin-top: clamp(4rem, 9vw, 7rem);
	}
	.ct-who__grid {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: 1.25rem;
		margin-top: 1.75rem;
	}
	@media (min-width: 900px) {
		.ct-who__grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}
	.ct-who__card {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		overflow: hidden;
		border: 1px solid var(--hair);
		border-radius: 14px;
		background: var(--surface);
	}
	@media (min-width: 560px) {
		.ct-who__card:not(.no-img) {
			grid-template-columns: minmax(0, 5fr) minmax(0, 6fr);
		}
	}
	.ct-who__img {
		position: relative;
		min-height: 220px;
		overflow: hidden;
	}
	.ct-who__img img {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
		object-position: center top;
		/* Thumbnail memuat pita kredit di dasarnya: diperbesar dari tepi atas. */
		transform: scale(1.1);
		transform-origin: top center;
	}
	.ct-who__body {
		align-self: center;
		padding: clamp(1.4rem, 2.6vw, 2.2rem);
	}
	.ct-who__body h3 {
		font-family: var(--font-display);
		font-size: 1.45rem;
		font-weight: 700;
		letter-spacing: -0.01em;
		color: var(--fg);
	}
	.ct-who__body p {
		margin-top: 0.6rem;
		font-size: 1rem;
		line-height: 1.65;
		color: var(--fg-muted);
	}
	.ct-who__link {
		display: inline-block;
		margin-top: 1rem;
		color: var(--fg);
		text-decoration: underline;
		text-decoration-color: color-mix(in srgb, var(--fg) 35%, transparent);
		text-underline-offset: 0.35em;
		transition: color 0.2s ease, text-decoration-color 0.2s ease;
	}
	.ct-who__link:hover {
		color: var(--safelight);
		text-decoration-color: var(--safelight);
	}

	/* ── Contoh peluang: karusel ─────────────────────────────────── */
	.ct-opp {
		margin-top: clamp(4rem, 9vw, 7rem);
	}
	.ct-car {
		position: relative;
		margin-top: 1.75rem;
	}
	.ct-car__track {
		display: flex;
		gap: 1rem;
		overflow-x: auto;
		scroll-snap-type: x mandatory;
		scrollbar-width: none;
		overscroll-behavior-x: contain;
		padding-bottom: 2px;
	}
	.ct-car__track::-webkit-scrollbar {
		display: none;
	}
	.ct-card {
		flex: 0 0 calc((100% - 3rem) / 4);
		display: flex;
		flex-direction: column;
		min-width: 0;
		overflow: hidden;
		border: 1px solid var(--hair);
		border-radius: 14px;
		background: var(--surface);
		scroll-snap-align: start;
	}
	@media (max-width: 1100px) {
		.ct-card {
			flex-basis: calc((100% - 2rem) / 3);
		}
	}
	@media (max-width: 760px) {
		.ct-card {
			flex-basis: calc((100% - 1rem) / 1.35);
		}
	}
	.ct-card__art {
		position: relative;
		aspect-ratio: 4 / 3;
		display: grid;
		place-items: center;
		overflow: hidden;
		background: color-mix(in srgb, var(--safelight) 8%, var(--surface));
	}
	.ct-card__art svg {
		width: 78%;
		height: 78%;
	}
	.ct-card__art path {
		fill: color-mix(in srgb, var(--safelight) 14%, transparent);
		stroke: var(--safelight);
		stroke-width: 1.6;
		stroke-linejoin: round;
		vector-effect: non-scaling-stroke;
	}
	.ct-card__art img {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
		object-position: center top;
		/* Thumbnail memuat pita kredit di dasarnya: diperbesar dari tepi atas. */
		transform: scale(1.1);
		transform-origin: top center;
	}
	.ct-card h3 {
		margin: 1.1rem 1.25rem 0;
		font-family: var(--font-display);
		font-size: 1.2rem;
		font-weight: 700;
		letter-spacing: -0.01em;
		color: var(--fg);
	}
	.ct-card p {
		flex: 1;
		margin: 0.5rem 1.25rem 0;
		font-size: 0.95rem;
		line-height: 1.6;
		color: var(--fg-muted);
	}
	.ct-card__btn {
		align-self: flex-start;
		margin: 1.25rem 1.25rem 1.25rem;
		padding: 0.65rem 1.1rem;
		border: 1px solid var(--hair);
		border-radius: 10px;
		font-size: 0.9rem;
		font-weight: 600;
		color: var(--fg);
		transition: border-color 0.2s ease, color 0.2s ease;
	}
	.ct-card__btn:hover {
		border-color: var(--safelight);
		color: var(--safelight);
	}
	.ct-car__arrow {
		position: absolute;
		top: 38%;
		display: grid;
		place-items: center;
		width: 2.6rem;
		height: 2.6rem;
		border: 1px solid var(--hair);
		border-radius: 10px;
		background: color-mix(in srgb, var(--bg) 88%, transparent);
		backdrop-filter: blur(8px);
		color: var(--fg);
		transition: opacity 0.2s ease, border-color 0.2s ease;
	}
	.ct-car__arrow:hover:not(:disabled) {
		border-color: var(--safelight);
	}
	.ct-car__arrow:disabled {
		opacity: 0;
		pointer-events: none;
	}
	.ct-car__arrow--prev {
		left: -0.9rem;
	}
	.ct-car__arrow--next {
		right: -0.9rem;
	}
	@media (max-width: 760px) {
		.ct-car__arrow {
			display: none;
		}
	}
	@media (max-width: 760px) {
		.ct-dots {
			display: none !important;
		}
	}
	.ct-dots {
		display: flex;
		justify-content: center;
		gap: 1rem;
		margin-top: 1.5rem;
	}
	.ct-dot {
		width: 0.8rem;
		height: 0.8rem;
		border: 1.5px solid var(--fg-muted);
		border-radius: 999px;
		background: transparent;
		transition: background-color 0.2s ease, border-color 0.2s ease;
	}
	.ct-dot.is-on {
		border-color: var(--fg);
		background: var(--fg);
	}

	/* ── Peta terbalik ───────────────────────────────────────────── */
	.ct-map {
		margin-top: clamp(4rem, 9vw, 7rem);
		padding-top: 2rem;
		border-top: 1px solid var(--hair);
	}
	.ct-map__head {
		max-width: 56ch;
	}
	.ct-map__fig {
		margin: clamp(1.5rem, 3vw, 2.5rem) 0 0;
	}
	.ct-map__fig svg {
		display: block;
		width: 100%;
		height: auto;
		overflow: visible;
	}
	.ct-prov {
		fill: transparent;
		stroke: color-mix(in srgb, var(--fg) 14%, transparent);
		stroke-width: 0.8;
		stroke-linejoin: round;
		cursor: default;
		transition: fill 0.25s ease, stroke 0.25s ease;
	}
	/* Sudah punya bingkai: diredam, bukan yang dicari. */
	.ct-prov.is-filled {
		fill: color-mix(in srgb, var(--fg) 7%, transparent);
	}
	/* Belum punya bingkai: inilah celahnya. */
	.ct-prov.is-empty {
		stroke: var(--safelight);
		stroke-width: 1.3;
		fill: color-mix(in srgb, var(--safelight) 12%, transparent);
	}
	.ct-prov.is-active {
		stroke: var(--fg);
		stroke-width: 1.6;
	}
	.ct-map__fig figcaption {
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
	.ct-map__read {
		color: var(--fg);
	}

	/* ── Baris isi ───────────────────────────────────────────────── */
	.ct-row {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: 1.25rem;
		margin-top: clamp(3.5rem, 8vw, 6.5rem);
		padding-top: 2rem;
		border-top: 1px solid var(--hair);
	}
	@media (min-width: 960px) {
		.ct-row {
			grid-template-columns: minmax(0, 5fr) minmax(0, 6fr);
			column-gap: clamp(3rem, 7vw, 8rem);
		}
	}
	.ct-row__side {
		max-width: 56ch;
	}
	.ct-h2 {
		font-family: var(--font-display);
		font-size: clamp(1.3rem, 2vw, 1.7rem);
		font-weight: 700;
		letter-spacing: -0.015em;
		color: var(--fg);
	}
	.ct-h3 {
		font-family: var(--font-display);
		font-size: 1.05rem;
		font-weight: 500;
		color: var(--fg);
	}
	.ct-p {
		margin-top: 0.4rem;
		font-size: 1rem;
		line-height: 1.7;
		color: var(--fg-muted);
	}
	.ct-map__head .ct-p {
		margin-top: 0.6rem;
	}
	.ct-say {
		max-width: 20ch;
		font-family: var(--font-display);
		font-size: clamp(1.9rem, 3.8vw, 3.3rem);
		font-weight: 300;
		line-height: 1.1;
		letter-spacing: -0.02em;
		text-wrap: balance;
		color: var(--fg);
	}
	.ct-two {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: 1.5rem;
	}
	@media (min-width: 640px) {
		.ct-two {
			grid-template-columns: repeat(2, minmax(0, 1fr));
			gap: 2.5rem;
		}
	}
	.ct-note {
		margin-top: 1.75rem;
		color: var(--fg);
	}
	.ct-empty {
		margin-top: 0;
		line-height: 1.9;
	}

	/* Langkah berurutan: nomor memang bermakna di sini. */
	.ct-steps {
		margin: 0;
		padding: 0;
		list-style: none;
		counter-reset: step;
	}
	.ct-steps li {
		position: relative;
		padding-left: 2.6rem;
		counter-increment: step;
	}
	.ct-steps li + li {
		margin-top: 1.75rem;
	}
	.ct-steps li::before {
		content: counter(step);
		position: absolute;
		left: 0;
		top: 0.05rem;
		display: grid;
		place-items: center;
		width: 1.7rem;
		height: 1.7rem;
		border: 1px solid var(--hair);
		border-radius: 999px;
		font-size: 0.8rem;
		font-variant-numeric: tabular-nums;
		color: var(--fg-muted);
	}

	/* ── FAQ ─────────────────────────────────────────────────────── */
	.ct-faq {
		max-width: 52rem;
		border-top: 1px solid var(--hair);
	}
	.ct-qa {
		border-bottom: 1px solid var(--hair);
	}
	.ct-qa summary {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 1.5rem;
		padding: 1.1rem 0;
		font-size: 1.05rem;
		line-height: 1.45;
		color: var(--fg);
		cursor: pointer;
		list-style: none;
	}
	.ct-qa summary::-webkit-details-marker {
		display: none;
	}
	.ct-ico {
		flex: none;
		align-self: center;
		color: var(--fg-muted);
		transition: transform 0.25s ease, color 0.2s ease;
	}
	.ct-qa[open] .ct-ico {
		transform: rotate(45deg);
		color: var(--safelight);
	}
	.ct-qa__a {
		max-width: 60ch;
		padding: 0 2.5rem 1.3rem 0;
	}
	.ct-qa__a p {
		font-size: 1rem;
		line-height: 1.7;
		color: var(--fg-muted);
	}
	.ct-qa__a .ct-link {
		display: inline-block;
		margin-top: 0.7rem;
	}
	.ct-link {
		color: var(--fg);
		text-decoration: underline;
		text-decoration-color: color-mix(in srgb, var(--fg) 35%, transparent);
		text-underline-offset: 0.35em;
		transition: color 0.2s ease, text-decoration-color 0.2s ease;
	}
	.ct-link:hover {
		color: var(--safelight);
		text-decoration-color: var(--safelight);
	}

	/* ── Penutup ─────────────────────────────────────────────────── */
	.ct-close {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: 2rem;
		margin-top: clamp(4rem, 9vw, 8rem);
		padding-top: 2.5rem;
		border-top: 1px solid var(--hair);
	}
	@media (min-width: 960px) {
		.ct-close {
			grid-template-columns: minmax(0, 7fr) minmax(0, 4fr);
			column-gap: clamp(3rem, 7vw, 8rem);
			align-items: end;
		}
	}
	.ct-close__say {
		max-width: 16ch;
		font-family: var(--font-display);
		font-size: clamp(2rem, 4.6vw, 3.8rem);
		font-weight: 300;
		line-height: 1.06;
		letter-spacing: -0.025em;
		text-wrap: balance;
		color: var(--fg);
	}
	.ct-close__side .ct-p {
		margin-top: 0;
	}

	.ct a:focus-visible,
	.ct button:focus-visible,
	.ct summary:focus-visible {
		outline: 2px solid var(--safelight);
		outline-offset: 3px;
		border-radius: 4px;
	}
	@media (prefers-reduced-motion: reduce) {
		.ct-ico,
		.ct-btn {
			transition: none;
		}
	}
</style>
