<script lang="ts">
	import { goto } from "$app/navigation";
	import gsap from "gsap";
	import { ScrollTrigger } from "gsap/ScrollTrigger";
	import { i18n } from "$lib/i18n.svelte";
	import { store } from "$lib/store.svelte";
	import { fetchPhotos, fetchCategories, fetchHomepage, imgFor, type Photo, type ApiCatItem, type HomepageSection } from "$lib/data";
	import Reveal from "./Reveal.svelte";
	import Parallax from "./Parallax.svelte";
	import ParallaxImage from "./ParallaxImage.svelte";
	import GsapGallery from "./GsapGallery.svelte";
	import RevealText from "./RevealText.svelte";
	import ArchiveStrip from "./ArchiveStrip.svelte";
	import Magnetic from "./Magnetic.svelte";
	import Preloader from "./Preloader.svelte";
	import IndonesiaMap from "./IndonesiaMap.svelte";
	import ApiImage from "./ApiImage.svelte";
	import Seam from "./Seam.svelte";

	gsap.registerPlugin(ScrollTrigger);


	const secCopy = {
		id: {
			latestKicker: "Baru", latestTitle: "Bingkai terbaru", latestCta: "Lihat semua",
			closingAuthed: {
				kicker: "Akunmu",
				title: "Darkroommu menunggu,",
				body: "Cek pesanan, bukti bayar, dan bingkai yang kamu simpan — semua di satu tempat.",
				cta: "Buka darkroom",
			},
		},
		en: {
			latestKicker: "Fresh", latestTitle: "Latest frames", latestCta: "See all",
			closingAuthed: {
				kicker: "Your account",
				title: "Your darkroom awaits,",
				body: "Check orders, payment proofs, and your saved frames — all in one place.",
				cta: "Open darkroom",
			},
		},
	};

	const c = $derived(i18n.c);
	const lang = $derived(i18n.lang);
	const user = $derived(store.user);
	const s = $derived(secCopy[lang]);
	const firstName = $derived(user?.name?.split(" ")[0] ?? "");

	let heroSection = $state<HTMLElement>();
	let q = $state("");
	let horizontal = $state<Photo[]>([]);
	let latest = $state<Photo[]>([]);
	let archiveTotal = $state(0);
	let categories = $state<ApiCatItem[]>([]);
	let showAllCats = $state(false);
	let hp = $state<Record<string, HomepageSection>>({});

	const visibleCats = $derived(showAllCats ? categories : categories.slice(0, 6));
	const hiddenCats = $derived(Math.max(0, categories.length - 6));

	// Garis datum di hero membawa skala arsipnya sendiri. Dirender hanya kalau
	// API-nya menjawab — "0 bingkai" lebih buruk daripada garis polos.
	const archiveCount = $derived(
		archiveTotal > 0
			? c.hero.count.replace("{n}", new Intl.NumberFormat(lang === "id" ? "id-ID" : "en-US").format(archiveTotal))
			: "",
	);

	const hero = $derived(hp["hero"]);
	const mulai = $derived(hp["mulai"]);
	const heroImg = $derived(imgFor("nusantara-hero", 2400, 1600, hero?.imageUrl));
	const mulaiImg = $derived(imgFor("closing-fjord", 2400, 1400, mulai?.imageUrl));

	$effect(() => {
		let alive = true;
		fetchPhotos({ limit: 6 }).then((r) => { if (alive) horizontal = r.photos; }).catch(() => {});
		fetchPhotos({ limit: 12 })
			.then((r) => {
				if (!alive) return;
				latest = r.photos;
				archiveTotal = r.total;
			})
			.catch(() => {});
		fetchCategories().then((r) => { if (alive) categories = r; }).catch(() => {});
		fetchHomepage().then((r) => { if (alive) hp = r; }).catch(() => {});
		return () => { alive = false; };
	});

	$effect(() => {
		const r = requestAnimationFrame(() => ScrollTrigger.refresh());
		const t = window.setTimeout(() => ScrollTrigger.refresh(), 600);
		return () => {
			cancelAnimationFrame(r);
			window.clearTimeout(t);
		};
	});

	$effect(() => {
		const section = heroSection;
		if (!section) return;
		const ctx = gsap.context(() => {
			const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
			if (reduce) {
				gsap.set(".hero-anim", { opacity: 1, y: 0 });
				gsap.set(".hero-img-anim", { scale: 1, yPercent: 0 });
				return;
			}
			const isMobile = window.innerWidth < 640;
			const tl = gsap.timeline({ delay: 0.2 });
			tl.to(".hero-img-anim", { scale: 1, duration: 2.2, ease: "power2.out" }, 0)
				.to(".hero-anim", { opacity: 1, y: 0, duration: 1.15, ease: "power3.out", stagger: 0.12 }, 0.15);
			gsap.to(".hero-img-anim", {
				yPercent: isMobile ? 4 : 8,
				scale: isMobile ? 1.06 : 1.12,
				ease: "none",
				scrollTrigger: { trigger: section, start: "top top", end: "bottom top", scrub: 0.6 },
			});
			gsap.to(".hero-content", {
				yPercent: isMobile ? -10 : -16,
				opacity: isMobile ? 0.45 : 0.55,
				ease: "none",
				scrollTrigger: { trigger: section, start: "top top", end: "bottom top", scrub: 0.6 },
			});
			gsap.to(".hero-scroll", {
				opacity: 0,
				ease: "none",
				scrollTrigger: { trigger: section, start: "top top", end: "20% top", scrub: 0.3 },
			});
		});
		return () => ctx.revert();
	});

	function onHeroSearch(e: SubmitEvent) {
		e.preventDefault();
		const v = q.trim();
		goto(v ? `/photos?q=${encodeURIComponent(v)}` : "/photos");
	}
</script>

<div>
	<Preloader />
	<div class="hero-cover relative">
		<section
			bind:this={heroSection}
			class="on-darkroom sticky top-0 z-0 h-[100svh] min-h-[580px] w-full overflow-hidden"
		>
			<div class="hero-img-anim absolute inset-x-0 top-0 h-full will-change-transform sm:-top-[12%] sm:h-[124%]">
				<!-- alt kosong: ini foto latar yang bisa diganti lewat CMS jadi apa
					saja, sementara pesannya sudah dipikul judul di sebelahnya.
					Deskripsi yang di-hardcode ("Pemandangan Nusantara") akan salah
					begitu gambarnya diganti — dan deskripsi yang salah lebih buruk
					daripada tidak ada. -->
				<ApiImage src={heroImg} alt="" fill eager class="object-cover object-center" />
			</div>

			<!-- Scrim hero. Nilainya di app.css (.hero-scrim) karena mobile dan
				desktop butuh bentuk yang berbeda, dan media query tidak bisa ditulis
				di atribut style. -->
			<div aria-hidden="true" class="hero-scrim pointer-events-none absolute inset-0"></div>
			<div class="grain absolute inset-0 opacity-[0.18] mix-blend-soft-light"></div>

			<!-- Padding bawahnya harus menyisakan ruang untuk .hero-scroll yang
				diposisikan absolut di tepi bawah; dengan pb-20 dasar rel dan puncak
				penanda gulir bertumpuk 4px. -->
			<div class="hero-content relative z-10 mx-auto flex h-full max-w-[1500px] flex-col justify-end px-5 pb-14 sm:px-6 sm:pb-28 lg:px-10 lg:pb-32">
				<p class="hero-anim kicker absolute left-5 top-[5.25rem] text-safelight sm:static sm:left-auto sm:top-auto">{hero?.kicker || c.hero.kicker}</p>
				<h1 class="mt-0 font-display text-[clamp(2.35rem,8vw,8rem)] font-light leading-[0.92] tracking-[-0.03em] text-ivory sm:mt-6">
					{#if hero?.title}
						<span class="hero-anim block">{hero.title}</span>
					{:else}
						<span class="hero-anim inline-block sm:block">{c.hero.titleA}</span>
						<span class="hero-anim serif-em inline-block text-safelight sm:block">{c.hero.titleEm}</span>
						<span class="hero-anim inline-block sm:block">{c.hero.titleB}</span>
					{/if}
				</h1>
				<p class="hero-anim mt-4 max-w-[52ch] text-[0.92rem] leading-relaxed text-ivory/75 sm:mt-8 sm:text-[1.02rem]">
					{hero?.body || c.hero.sub}
				</p>

				<!-- Rel bawah: satu garis datum selebar kontainer memikul pencarian
					(aksi utama sebuah arsip) di kiri dan jelajah sebagai pendamping di
					kanan, pada satu garis alas. Garisnya membawa jumlah bingkai, jadi
					ia struktur, bukan hiasan. -->
				<div class="hero-anim mt-7 sm:mt-14">
					<div class="flex items-center gap-4">
						{#if archiveCount}
							<span class="kicker shrink-0 text-ivory/55">{archiveCount}</span>
						{/if}
						<span class="h-px flex-1 bg-ivory/20"></span>
					</div>

					<div class="mt-4 flex flex-col gap-5 sm:mt-6 sm:flex-row sm:items-end sm:justify-between sm:gap-12">
						<form role="search" onsubmit={onHeroSearch} class="w-full sm:max-w-[34rem]">
							<div class="group flex items-center gap-3 border-b border-ivory/22 pb-3.5 transition-colors sm:pb-3 duration-500 focus-within:border-safelight">
								<svg
									width="18"
									height="18"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="1.6"
									stroke-linecap="round"
									stroke-linejoin="round"
									class="shrink-0 text-ivory/45 transition-colors duration-500 group-focus-within:text-safelight"
									aria-hidden="true"
								>
									<circle cx="11" cy="11" r="7" />
									<path d="m20 20-3.5-3.5" />
								</svg>
								<input
									type="search"
									bind:value={q}
									placeholder={c.nav.searchPlaceholder}
									aria-label={c.hero.searchLabel}
									class="flex-1 bg-transparent text-[0.95rem] text-ivory outline-none placeholder:text-ivory/40 sm:text-[1.05rem]"
								/>
								<button
									type="submit"
									class="kicker shrink-0 text-ivory/55 max-sm:-my-2 max-sm:px-1 max-sm:py-2 transition-colors duration-500 hover:text-safelight focus-visible:text-safelight focus-visible:outline-none"
								>
									<span class="arr">→</span>
								</button>
							</div>
						</form>

						<span class="inline-flex shrink-0 sm:pb-1">
							<Magnetic strength={0.45}>
								<a href="/photos" class="arrow-link group items-center gap-3 text-ivory">
									<span class="grid h-11 w-11 place-items-center rounded-full border border-ivory/40 transition-colors duration-500 group-hover:border-safelight group-hover:bg-safelight sm:h-12 sm:w-12">
										<span class="arr text-ivory">→</span>
									</span>
									<span class="kicker text-ivory/80">{hero?.cta || c.hero.cta}</span>
								</a>
							</Magnetic>
						</span>
					</div>
				</div>
			</div>

			<div class="hero-scroll absolute bottom-5 left-1/2 z-10 hidden -translate-x-1/2 sm:bottom-7 sm:block">
				<span class="hero-anim kicker flex flex-col items-center gap-2 text-ivory/55">
					{c.hero.scroll}
					<span class="block h-8 w-px animate-pulse bg-ivory/40"></span>
				</span>
			</div>
		</section>

		<div class="relative z-10">
			<!-- Hero itu lapisan sticky: sambungan ini lewat DI ATASNYA, jadi tepi
				atasnya harus transparan. Kalau legam, ia memotong foto dan judul
				hero di tengah huruf. -->
			<Seam
				from="transparent"
				to="wash"
				height="clamp(180px, 30vh, 340px)"
				rule={false}
				darkOnly
			/>
			<ArchiveStrip />
			<Seam from="wash" to="darkroom" />
		</div>
	</div>

	<IndonesiaMap />

	<GsapGallery photos={latest} />

	<div class="relative z-10 bg-bg sm:-mt-[42vh]">
		<!-- Galeri di atasnya sekarang bernada --bg juga, jadi tidak ada lagi
			perpindahan nada di sini; basuhannya rata dan yang tersisa cuma penanda
			batas section. Sebelumnya "darkroom" → "bg", yang di mode terang
			memunculkan pita arang di tengah halaman kertas. -->
		<Seam from="bg" to="bg" />

	<section class="relative z-10 mx-auto max-w-[1500px] px-6 pb-28 pt-12 lg:px-10 lg:pb-40">
		<Parallax fromPercent={4} toPercent={-4} scrub={1}>
			<Reveal class="mb-10 max-w-2xl">
				<p data-reveal class="kicker text-safelight">{c.cats.kicker}</p>
				<RevealText
					as="h2"
					text={c.cats.title}
					class="mt-5 font-display text-[clamp(1.9rem,4vw,3.2rem)] font-light tracking-[-0.02em] text-fg"
				/>
				<p data-reveal class="mt-5 text-fg-muted">{c.cats.sub}</p>
			</Reveal>
		</Parallax>

		<Reveal class="mb-px flex items-center justify-between border-t border-hair pt-3">
			<span data-reveal class="kicker text-fg-muted">Contact sheet</span>
			<span data-reveal class="kicker text-fg-muted">
				{String(visibleCats.length).padStart(2, "0")} / {String(categories.length).padStart(2, "0")} frames
			</span>
		</Reveal>

		<Parallax fromPercent={2} toPercent={-2} scrub={1}>
			<Reveal stagger={0.05} class="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-hair bg-hair sm:grid-cols-3">
				{#each visibleCats as cat, i (cat.id)}
					<a
						href={`/photos?cat=${encodeURIComponent(cat.name)}`}
						data-reveal
						class="on-darkroom group relative flex aspect-[3/4] flex-col justify-between overflow-hidden bg-plate p-4 sm:aspect-[5/4] sm:p-5"
					>
						<ParallaxImage
							src={imgFor(`cat-${cat.id}`, 800, 640, cat.imageUrl)}
							alt={cat.name}
							sizes="(max-width: 640px) 50vw, 33vw"
							class="absolute inset-0"
							amount={16}
							imgClassName="opacity-90 saturate-[0.88] transition-all duration-[800ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:opacity-100 group-hover:saturate-100"
						/>
						<div class="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,color-mix(in_srgb,var(--safelight)_18%,transparent),transparent_55%)] opacity-50 transition-opacity duration-700 group-hover:opacity-100"></div>
						<div class="pointer-events-none absolute inset-0 bg-gradient-to-t from-ocean-deep/90 via-ocean-deep/35 to-ocean-deep/10 transition-opacity duration-700 group-hover:opacity-80"></div>
						<div class="grain pointer-events-none absolute inset-0 opacity-[0.14] mix-blend-soft-light"></div>

						<div class="pointer-events-none absolute inset-0 border border-ivory/12 transition-colors duration-500 group-hover:border-safelight/55"></div>
						{#each ["tl", "tr", "bl", "br"] as cn (cn)}
							<span
								class="pointer-events-none absolute h-4 w-4 border-ivory/45 transition-colors duration-500 group-hover:border-safelight {cn === "tl" ? "left-2 top-2 border-l border-t"
									: cn === "tr" ? "right-2 top-2 border-r border-t"
									: cn === "bl" ? "bottom-2 left-2 border-b border-l"
									: "bottom-2 right-2 border-b border-r"}"></span>
						{/each}

						<div class="relative z-10 flex items-center justify-between">
							<span class="kicker text-ivory/60">Frame</span>
							<span class="kicker text-safelight">{String(i + 1).padStart(2, "0")}</span>
						</div>

						<div class="relative z-10">
							<h3 class="font-display text-xl font-light leading-tight tracking-[-0.01em] text-ivory sm:text-2xl">
								{cat.name}
							</h3>
							{#if cat.description}
								<p class="mt-1 line-clamp-2 text-xs text-ivory/55">{cat.description}</p>
							{/if}
							<span class="arrow-link mt-3 inline-flex text-[0.7rem] text-ivory/65 transition-colors duration-500 group-hover:text-safelight">
								{c.cats.explore}
								<span class="arr text-safelight">→</span>
							</span>
							<span class="mt-2 block h-px w-0 bg-safelight transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:w-full"></span>
						</div>
					</a>
				{/each}
			</Reveal>
		</Parallax>

		{#if hiddenCats > 0}
			<Reveal class="mt-px flex items-center justify-between border-t border-hair pt-4">
				<span data-reveal class="kicker text-fg-muted">
					{showAllCats ? c.cats.sheetEnd : c.cats.sheetRest.replace("{n}", String(hiddenCats))}
				</span>
				<button
					data-reveal
					type="button"
					onclick={() => (showAllCats = !showAllCats)}
					aria-expanded={showAllCats}
					class="group inline-flex items-center gap-2.5 text-sm font-medium text-fg transition-colors duration-500 hover:text-safelight"
				>
					{showAllCats
						? c.cats.seeLess
						: c.cats.seeMore.replace("{n}", String(hiddenCats))}
					<span
						class="inline-block text-safelight transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] {showAllCats ? "group-hover:-translate-y-0.5" : "group-hover:translate-y-0.5"}"
					>
						{showAllCats ? "↑" : "↓"}
					</span>
				</button>
			</Reveal>
		{/if}
	</section>

	<section class="relative mx-auto max-w-[1500px] overflow-hidden px-6 pb-28 lg:px-10 lg:pb-40">
		<div class="pointer-events-none absolute inset-x-0 top-1/2 -z-0 -translate-y-1/2 select-none text-center">
			<Parallax fromPercent={-12} toPercent={12} class="block">
				<span class="font-display text-[28vw] font-light leading-none tracking-[-0.04em] text-fg/[0.07]">
					NUSANTARA
				</span>
			</Parallax>
		</div>

		<Parallax fromPercent={3} toPercent={-3} scrub={1}>
			<Reveal class="relative z-10 mx-auto max-w-2xl rounded-md border border-hair bg-surface/70 px-8 py-20 text-center backdrop-blur-xl lg:px-16">
				<div class="grain absolute inset-0 opacity-10"></div>
				<div class="relative">
					<p data-reveal class="kicker text-safelight">{c.pricing.kicker}</p>
					<RevealText
						as="h2"
						text={c.pricing.title}
						class="mx-auto mt-6 max-w-2xl font-display text-[clamp(2rem,4.4vw,3.6rem)] font-light leading-[1.05] tracking-[-0.02em] text-fg"
					/>
					<p data-reveal class="mx-auto mt-6 max-w-xl text-fg-muted">{c.pricing.body}</p>
					<span data-reveal class="relative mt-10 inline-flex">
						<Magnetic strength={0.4}>
							<a
								href="/pricing"
								class="arrow-link inline-flex items-center gap-3 rounded-full bg-safelight px-7 py-3.5 text-sm font-medium text-ivory shadow-[0_14px_40px_-12px_var(--safelight-glow)] transition-transform duration-500 hover:scale-[1.03]"
							>
								{c.pricing.cta}
								<span class="arr">→</span>
							</a>
						</Magnetic>
					</span>
				</div>
			</Reveal>
		</Parallax>
	</section>

	</div>

	<section class="on-darkroom relative h-[80svh] min-h-[520px] w-full overflow-hidden bg-bg">
		<ParallaxImage
			src={mulaiImg}
			alt="Horizon Nusantara"
			sizes="100vw"
			class="absolute inset-0"
			amount={10}
			priority
		/>
		<div class="absolute inset-0 bg-ocean-deep/72"></div>
		<!-- Feather ke var(--bg) hanya masuk akal di mode gelap: di sana --bg
			mendekati hitam, jadi fotonya larut ke kamar gelap. Di mode terang
			--bg krem, dan pudarannya jadi kabut putih yang memakan 15vh dari
			atas dan 18vh dari bawah foto. Di mode terang tepi fotonya dibiarkan
			tegas — pelat foto dengan tepi bersih, bukan foto yang mengabut. -->
		<div
			aria-hidden="true"
			class="pointer-events-none absolute inset-x-0 -top-px hidden h-[15vh] dark:block"
			style="background: linear-gradient(to bottom, var(--bg), color-mix(in srgb, var(--bg) 45%, transparent) 45%, transparent);"
		></div>
		<div
			aria-hidden="true"
			class="pointer-events-none absolute inset-x-0 bottom-0 hidden h-[18vh] dark:block"
			style="background: linear-gradient(to top, var(--bg), transparent);"
		></div>
		<div class="grain absolute inset-0 opacity-[0.16] mix-blend-soft-light"></div>
		<Reveal class="relative z-10 mx-auto flex h-full max-w-[1500px] flex-col items-center justify-center px-6 text-center [text-shadow:0_2px_30px_rgba(5,6,8,0.85)]">
			{#if user}
				<p data-reveal class="kicker text-safelight">{s.closingAuthed.kicker}</p>
				<h2 data-reveal class="mt-6 font-display text-[clamp(2.4rem,6vw,5.5rem)] font-light leading-[0.98] tracking-[-0.02em] text-ivory">
					{s.closingAuthed.title} <span class="serif-em text-safelight">{firstName}</span>
				</h2>
				<p data-reveal class="mt-7 max-w-lg text-ivory/75">{s.closingAuthed.body}</p>
				<span data-reveal class="mt-10 inline-flex">
					<Magnetic strength={0.4}>
						<a
							href="/profile"
							class="arrow-link inline-flex items-center gap-3 rounded-full border border-ivory/40 px-7 py-3.5 text-sm font-medium text-ivory transition-colors duration-500 hover:border-safelight hover:bg-safelight"
						>
							{s.closingAuthed.cta}
							<span class="arr">→</span>
						</a>
					</Magnetic>
				</span>
			{:else}
				<p data-reveal class="kicker text-safelight">{mulai?.kicker || c.closing.kicker}</p>
				<h2 data-reveal class="mt-6 font-display text-[clamp(2.4rem,6vw,5.5rem)] font-light leading-[0.98] tracking-[-0.02em] text-ivory">
					{#if mulai?.title}
						{mulai.title}
					{:else}
						{c.closing.title} <span class="serif-em text-safelight">{c.closing.titleEm}</span>
					{/if}
				</h2>
				<p data-reveal class="mt-7 max-w-lg text-ivory/75">{mulai?.body || c.closing.body}</p>
				<span data-reveal class="mt-10 inline-flex">
					<Magnetic strength={0.4}>
						<a
							href="/login"
							class="arrow-link inline-flex items-center gap-3 rounded-full border border-ivory/40 px-7 py-3.5 text-sm font-medium text-ivory transition-colors duration-500 hover:border-safelight hover:bg-safelight"
						>
							{mulai?.cta || c.closing.cta}
							<span class="arr">→</span>
						</a>
					</Magnetic>
				</span>
			{/if}
		</Reveal>
	</section>
</div>
