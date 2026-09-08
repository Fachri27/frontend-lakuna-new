<script lang="ts">
	import "../app.css";
	import { i18n } from "$lib/i18n.svelte";
	import { store } from "$lib/store.svelte";
	import { access } from "$lib/access.svelte";
	import Navbar from "$lib/components/Navbar.svelte";
	import Footer from "$lib/components/Footer.svelte";
	import SmoothScroll from "$lib/components/SmoothScroll.svelte";
	import Cursor from "$lib/components/Cursor.svelte";
	import ScrollProgress from "$lib/components/ScrollProgress.svelte";
	import ColorVisionFilter from "$lib/components/ColorVisionFilter.svelte";
	import AccessPanel from "$lib/components/AccessPanel.svelte";
	import VoucherBar from "$lib/components/VoucherBar.svelte";
	import FloatingAccessBtn from "$lib/components/FloatingAccessBtn.svelte";
	import ScrollToTop from "$lib/components/ScrollToTop.svelte";
	import LiveAnnouncer from "$lib/components/LiveAnnouncer.svelte";
	import SkipLink from "$lib/components/SkipLink.svelte";
	import Popup from "$lib/components/Popup.svelte";
	import type { Snippet } from "svelte";

	let { children }: { children: Snippet } = $props();

	// Hydrate client-only state (localStorage → runes) sekali di sisi client.
	$effect(() => {
		i18n.hydrate();
		access.hydrate();
		void store.init();
	});

	// Mirror access settings → localStorage + data-attr <html> (CSS hooks).
	$effect(() => {
		access.sync();
	});

	// Lock body scroll while the access panel is open.
	$effect(() => {
		return access.syncPanelLock();
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
<Cursor />
<ScrollProgress />
<LiveAnnouncer />
<VoucherBar />
<Navbar />
<main id="main-content">
	{@render children()}
</main>
<Footer />
<AccessPanel />
<FloatingAccessBtn />
<ScrollToTop />
<Popup />