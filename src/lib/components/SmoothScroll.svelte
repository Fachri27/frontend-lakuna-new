<script lang="ts">
	import { page } from "$app/state";
	import Lenis from "lenis";
	import gsap from "gsap";
	import { ScrollTrigger } from "gsap/ScrollTrigger";
	import { setLenis } from "$lib/lenis";
	import { markScroll, calmRefresh } from "$lib/scrollCalm";

	gsap.registerPlugin(ScrollTrigger);

	/**
	 * Lenis inertial smooth-scroll, driven by the GSAP ticker so it stays in lock
	 * -step with ScrollTrigger scrubs (no double-rAF, no jitter). Skipped entirely
	 *  for reduced-motion / coarse-pointer users — they get native scroll.
	 *
	 * Hanya halaman home (`/`) yang memakai Lenis + ScrollTrigger — di situlah
	 * pin/scrub berat (IndonesiaMap, HorizontalGallery, dll.) hidup. Semua route
	 * lain memakai native scroll agar ringan. Setup effect hanya re-run saat
	 * boolean `home` berubah (masuk/keluar home), bukan tiap route change.
	 */
	const isHome = (p: string) => p === "/";

	// HP: jangan ukur ulang ScrollTrigger setiap URL-bar browser muncul/hilang
	// (resize viewport). Itulah sumber utama scroll terasa berat/patah-patah di
	// mobile — refresh bertubi-tubi di tengah gulir. Tinggi pin memakai svh yang
	// stabil, jadi aman diabaikan. Global, dipasang sekali.
	ScrollTrigger.config({ ignoreMobileResize: true });
	const pathname = $derived(page.url.pathname);
	const home = $derived(isHome(pathname));

	let lenis: Lenis | null = null;

	// Penanda gulir global untuk scrollCalm (sekali untuk semua route).
	$effect(() => {
		window.addEventListener("scroll", markScroll, { passive: true });
		return () => window.removeEventListener("scroll", markScroll);
	});

	// Setup / teardown Lenis saat masuk/keluar home
	$effect(() => {
		if (!home) return;
		if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

		// Cegah browser merestorasi posisi scroll saat refresh lalu berkelahi dengan
		// Lenis → lompatan di awal.
		if ("scrollRestoration" in history) history.scrollRestoration = "manual";

		const l = new Lenis({
			duration: 1.3,
			easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
			smoothWheel: true,
			touchMultiplier: 2,
			wheelMultiplier: 1.1
		});
		lenis = l;
		setLenis(l);
		l.on("scroll", ScrollTrigger.update);

		const tick = (time: number) => l.raf(time * 1000);
		gsap.ticker.add(tick);
		gsap.ticker.lagSmoothing(0);

		// Preloader dan dialog mengunci gulir lewat `overflow: hidden` di <html>
		// atau <body>. Lenis tidak membacanya sendiri, jadi ikut berhenti di sini.
		const syncLock = () => {
			const locked =
				document.documentElement.style.overflow === "hidden" || document.body.style.overflow === "hidden";
			if (locked) l.stop();
			else l.start();
		};
		const lockObserver = new MutationObserver(syncLock);
		lockObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["style"] });
		lockObserver.observe(document.body, { attributes: true, attributeFilter: ["style"] });
		syncLock();

		// Refresh diikat ke event nyata (bukan timer buta) supaya tidak ada lompatan
		// terlambat: rAF untuk flush awal, `load` setelah semua aset (gambar) selesai,
		// `fonts.ready` setelah font swap. Semuanya lewat calmRefresh agar tidak
		// menendang pin di tengah gulir.
		const r = requestAnimationFrame(() => calmRefresh());
		const onLoad = () => calmRefresh();
		const onFonts = () => calmRefresh();
		window.addEventListener("load", onLoad);
		if (document.fonts?.ready) document.fonts.ready.then(onFonts).catch(() => {});

		return () => {
			lockObserver.disconnect();
			gsap.ticker.remove(tick);
			cancelAnimationFrame(r);
			window.removeEventListener("load", onLoad);
			l.destroy();
			lenis = null;
			setLenis(null);
		};
	});

	// Reset scroll to top on route change
	$effect(() => {
		// depend on pathname only
		void pathname;

		if (!isHome(pathname)) {
			window.scrollTo(0, 0);
			document.documentElement.scrollTop = 0;
			document.body.scrollTop = 0;
			return;
		}

		// Reset Lenis internal scroll
		lenis?.scrollTo(0, { immediate: true });
		window.scrollTo(0, 0);
		document.documentElement.scrollTop = 0;
		document.body.scrollTop = 0;

		// Bunuh trigger yatim dari route sebelumnya (trigger-nya sudah lepas DOM)
		// — defense-in-depth bila ada komponen yang tak bersih saat unmount.
		ScrollTrigger.getAll().forEach((tr) => {
			const el = tr.trigger as Element | null;
			if (el && !el.isConnected) tr.kill();
		});

		// Refresh bertahap: raf untuk flush segera, 100ms untuk layout awal,
		// 600ms mengejar konten async. Lewat calmRefresh (sopan saat digulir).
		const r = requestAnimationFrame(() => calmRefresh());
		const t1 = setTimeout(() => calmRefresh(), 100);
		const t2 = setTimeout(() => calmRefresh(), 600);
		return () => {
			cancelAnimationFrame(r);
			clearTimeout(t1);
			clearTimeout(t2);
		};
	});
</script>