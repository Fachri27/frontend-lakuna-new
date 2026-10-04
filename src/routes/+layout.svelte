<script lang="ts">
	import "../app.css";
	import { page } from "$app/state";
	import { i18n } from "$lib/i18n.svelte";
	import { store } from "$lib/store.svelte";
	import { access } from "$lib/access.svelte";
	import Navbar from "$lib/components/Navbar.svelte";
	import Footer from "$lib/components/Footer.svelte";
	import SmoothScroll from "$lib/components/SmoothScroll.svelte";
	import ScrollProgress from "$lib/components/ScrollProgress.svelte";
	import ColorVisionFilter from "$lib/components/ColorVisionFilter.svelte";
	import AccessPanel from "$lib/components/AccessPanel.svelte";
	import VoucherBar from "$lib/components/VoucherBar.svelte";
	import ScrollToTop from "$lib/components/ScrollToTop.svelte";
	import LiveAnnouncer from "$lib/components/LiveAnnouncer.svelte";
	import SkipLink from "$lib/components/SkipLink.svelte";
	import Popup from "$lib/components/Popup.svelte";
	import AuthModal from "$lib/components/AuthModal.svelte";
	import SubscribeModal from "$lib/components/SubscribeModal.svelte";
	import type { Snippet } from "svelte";
	import { installCreditCrop } from "$lib/creditCrop";
	import { primeScrambleSound, playScrambleSound, playScrambleClick } from "$lib/scramble";

	let { children }: { children: Snippet } = $props();

	// Hydrate client-only state (localStorage → runes) sekali di sisi client.
	$effect(() => {
		// Console bersih di production: log/info/debug/warn (milik kita maupun
		// lib pihak ketiga) dibungkam supaya demo ke orang lain tidak ditemani
		// deretan console. `error` SENGAJA dibiarkan — kegagalan nyata harus
		// tetap terlihat saat debugging.
		if (import.meta.env.PROD) {
			for (const m of ["log", "info", "debug", "warn"] as const) {
				try {
					(console[m] as unknown) = () => {};
				} catch {
					/* console tak bisa ditulis — abaikan */
				}
			}
		}
		i18n.hydrate();
		access.hydrate();
		void store.init();
		// Daftarkan service worker minimal (static/sw.js) — syarat PWA
		// installability. App yang di-install diberi hak autoplay bersuara.
		// update() dipaksa tiap load: tab yang masih dipegang SW lama (fetch
		// handler-nya dulu mengintersepsi navigasi) langsung ditarik ke versi
		// baru yang mem-bypass navigasi — tanpa ini error console "FetchEvent
		// ... network error response" menempel sampai browser update sendiri.
		if ("serviceWorker" in navigator) {
			navigator.serviceWorker
				.register("/sw.js")
				.then((reg) => reg.update().catch(() => {}))
				.catch(() => {});
		}
	});

	// Pita kredit "lakunastock · ID" di dasar thumbnail/pratinjau hanya untuk
	// berkas yang diambil langsung (tab Network); di halaman dipotong.
	$effect(() => installCreditCrop());

	// Mirror access settings → localStorage + data-attr <html> (CSS hooks).
	$effect(() => {
		access.sync();
	});

	// Lock body scroll while the access panel is open.
	$effect(() => {
		return access.syncPanelLock();
	});

	// Kunci "Save image as…" / "Save video as…": menu klik-kanan dimatikan
	// hanya bila targetnya media (img/video/canvas) — di dalam input, form,
	// atau teks biasa, menu browser tetap berfungsi normal.
	// Listener native capture (bukan delegasi sintetis): berjalan paling dulu,
	// jadi tidak bisa digagalkan stopPropagation komponen anak mana pun.
	function guardMedia(e: Event) {
		const el = e.target as HTMLElement | null;
		if (e.type === "contextmenu") {
			if (el?.closest?.("img, video, canvas")) e.preventDefault();
		} else if (e.type === "dragstart") {
			if (el?.closest?.("img, video")) e.preventDefault();
		}
	}
	$effect(() => {
		document.addEventListener("contextmenu", guardMedia, { capture: true });
		document.addEventListener("dragstart", guardMedia, { capture: true });
		return () => {
			document.removeEventListener("contextmenu", guardMedia, { capture: true });
			document.removeEventListener("dragstart", guardMedia, { capture: true });
		};
	});

	// Bunyi hover & klik untuk semua tombol/tautan (delegasi global): satu
	// tempat, mencakup konten dinamis. Hover di-throttle di modul suara;
	// pindah di dalam tombol yang sama tidak bunyi ulang.
	// Halaman arsip & transaksional senyap total — sapuan melintasi
	// grid/kartu/form di sana terdengar berisik. Pola mencakup sub-rute
	// (/photos/:id, /videos/:id, ...).
	const SILENT_SOUND = /^\/(photos|videos|pricing|profile|license|checkout|ecotourism)(\/|$)/;
	function soundMuted(): boolean {
		try {
			return SILENT_SOUND.test(page.url.pathname);
		} catch {
			return false;
		}
	}
	function clickTarget(e: Event): Element | null {
		const el = e.target as Element | null;
		return el?.closest?.('button, a, [role="button"]') ?? null;
	}
	function onHover(e: MouseEvent) {
		if (soundMuted()) return;
		const el = clickTarget(e);
		if (!el) return;
		if (e.relatedTarget instanceof Element && el.contains(e.relatedTarget)) return;
		// Zona senyap (mis. papan harga): tanpa bunyi hover.
		if (el.closest("[data-no-hover-sound]")) return;
		// Tautan kartu media (membungkus img/video) diam saat hover —
		// sapuan melintasi grid foto tak berisik. Kliknya tetap bunyi.
		if (el.tagName === "A" && el.querySelector("img, video, canvas")) return;
		playScrambleSound();
	}
	function onClick(e: MouseEvent) {
		if (soundMuted()) return;
		// Klik kanan / tombol tengah bukan "klik" tombol.
		if (e.button !== 0) return;
		const el = clickTarget(e);
		if (!el) return;
		// Opt-out per zona/elemen (mis. tombol peta yang harus senyap total).
		if (el.closest("[data-no-click-sound]")) return;
		playScrambleClick();
	}
	$effect(() => {
		primeScrambleSound();
		document.addEventListener("mouseover", onHover);
		document.addEventListener("click", onClick);
		return () => {
			document.removeEventListener("mouseover", onHover);
			document.removeEventListener("click", onClick);
		};
	});
</script>

<svelte:window
	onkeydown={(e) => {
		if (e.key === "Escape") access.setPanelOpen(false);
	}}
/>

<SkipLink />
<ColorVisionFilter />
<SmoothScroll />
<ScrollProgress />
<LiveAnnouncer />
<VoucherBar />
<Navbar />
<main id="main-content">
	{@render children()}
</main>
<Footer />
<AccessPanel />
<ScrollToTop />
<Popup />
<AuthModal />
<SubscribeModal />