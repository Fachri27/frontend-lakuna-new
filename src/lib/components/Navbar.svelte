<script lang="ts">
	/**
	 * Navbar — port 1:1 dari components/Navbar.tsx. Header fixed di bawah
	 * banner voucher (--banner-h), mega-menu kategori dari API, dan sheet
	 * mobile dengan focus trap. Tanpa kolom search — pencarian hanya hidup
	 * di hero beranda.
	 */
import { i18n } from "$lib/i18n.svelte";
	import { store } from "$lib/store.svelte";
	import { announcer } from "$lib/stores/announce.svelte";
	import { fetchCategories, type ApiCatItem } from "$lib/data";
	import { authModal } from "$lib/authModal.svelte";
	import ApiImage from "./ApiImage.svelte";
	import { scrambleMute, toggleScramble } from "$lib/sound.svelte";
	import { access } from "$lib/access.svelte";

	let scrolled = $state(false);
	let mega = $state(false);
	let open = $state(false);
	let categories = $state<ApiCatItem[]>([]);
	let megaRef = $state<HTMLDivElement>();
	let megaBtnRef = $state<HTMLButtonElement>();
	let mobileBtnRef = $state<HTMLButtonElement>();
	let mobileMenuRef = $state<HTMLDivElement>();
	let prevCartCount = 0;

	$effect(() => {
		const onScroll = () => (scrolled = window.scrollY > 24);
		onScroll();
		window.addEventListener("scroll", onScroll, { passive: true });
		return () => window.removeEventListener("scroll", onScroll);
	});

	// Daftar kategori dari API (nama asli, mis. "Nature", "Urban") — dipakai mega-menu.
	$effect(() => {
		fetchCategories()
			.then((cats) => (categories = cats))
			.catch(() => {});
	});

	// Announce cart count changes
	$effect(() => {
		if (store.cartCount > prevCartCount) {
			announcer.announce(`Cart updated: ${store.cartCount} ${store.cartCount === 1 ? "item" : "items"}`);
		}
		prevCartCount = store.cartCount;
	});

	// Close mega menu on Escape
	$effect(() => {
		if (!mega) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				mega = false;
				megaBtnRef?.focus();
			}
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	});

	// Close mobile menu on Escape
	$effect(() => {
		if (!open) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				open = false;
				mobileBtnRef?.focus();
			}
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	});

	// Trap focus in mobile menu
	function onMobileKeyDown(e: KeyboardEvent) {
		if (e.key !== "Tab" || !mobileMenuRef) return;
		const focusable = mobileMenuRef.querySelectorAll<HTMLElement>("a[href], button, input, [tabindex]:not([tabindex='-1'])");
		if (focusable.length === 0) return;
		const first = focusable[0];
		const last = focusable[focusable.length - 1];
		if (e.shiftKey && document.activeElement === first) {
			e.preventDefault();
			last.focus();
		} else if (!e.shiftKey && document.activeElement === last) {
			e.preventDefault();
			first.focus();
		}
	}

	const solid = $derived(scrolled || mega || open);
	const over = $derived(!solid);
	const muted = $derived(over ? "text-ivory/80" : "text-fg/85");
	const icon = $derived(over ? "text-ivory/85" : "text-fg/80");
	const line = $derived(over ? "border-ivory/25" : "border-hair");
	const bar = $derived(over ? "bg-ivory/90" : "bg-fg");
	const logoFilter = $derived(
		over
			? "[filter:brightness(0)_invert(1)]"
			: "[filter:brightness(0)] dark:[filter:brightness(0)_invert(1)]"
	);
</script>

{#snippet NavLink(href: string, mainCls: string, label: string)}
	<a
		{href}
		class={`group relative py-2 text-[0.82rem] font-medium tracking-wide transition-colors duration-500 hover:text-safelight ${mainCls}`}
	>
		{label}
		<span class="absolute -bottom-0.5 left-0 h-px w-0 bg-safelight transition-all duration-300 group-hover:w-full"></span>
	</a>
{/snippet}

<header
	data-topbar
	class="fixed inset-x-0 z-50 transition-[top] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
	style="top: var(--banner-h, 0px)"
>
	<div
		class={`pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-ocean-deep/55 to-transparent transition-opacity duration-500 ${
			solid ? "opacity-0" : "opacity-100"
		}`}
	></div>
	<div
		class={`relative transition-colors duration-500 ${
			solid ? "bg-bg/85 backdrop-blur-md sm:backdrop-blur-xl" : "bg-transparent"
		}`}
	>
		<nav class="relative mx-auto flex h-[var(--nav-h)] max-w-[1500px] items-center justify-between px-6 lg:px-10">
			<a
				href="/"
				data-no-hover-sound
				data-no-click-sound
				class="group relative z-10 md:absolute md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2"
				aria-label="Lakuna"
			>
				<!-- logo1.png sudah di-crop ke glyph (simetris), jadi tidak perlu
					koreksi optik margin/translate lagi. -->
				<ApiImage
					src="/logo1.png"
					alt="Lakuna"
					width={200}
					height={36}
					eager
					class={`no-cvd h-6 w-auto max-w-[44vw] transition-[filter] duration-500 sm:h-7 sm:max-w-none md:h-8 lg:h-8 ${logoFilter}`}
				/>
			</a>

			<!-- Left: nav links (desktop) -->
			<div data-no-hover-sound data-no-click-sound class="hidden items-center gap-9 md:flex">
				{@render NavLink("/photos", muted, i18n.c.nav.photos)}
				{@render NavLink("/videos", muted, i18n.c.nav.videos)}

				<!-- Categories: mega-menu dibuka via KLIK (bukan hover) — hover
					tak sengaja membuka di desktop dan mustahil di sentuh. -->
				<div
					class="relative"
					bind:this={megaRef}
				>
					<button
						bind:this={megaBtnRef}
						type="button"
						aria-expanded={mega}
						aria-haspopup="true"
						aria-controls="mega-menu-categories"
						class={`group relative z-50 inline-flex items-center gap-1.5 py-2 text-[0.82rem] font-medium tracking-wide transition-colors duration-500 hover:text-safelight ${muted}`}
						onclick={() => (mega = !mega)}
					>
						{i18n.c.nav.categories}
						<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" class={`transition-transform duration-300 ${mega ? "rotate-180" : ""}`}>
							<path d="M6 9l6 6 6-6" />
						</svg>
					</button>

					{#if mega}
						<!-- Klik di luar menu menutupnya. -->
						<button
							type="button"
							tabindex="-1"
							aria-hidden="true"
							onclick={() => (mega = false)}
							class="fixed inset-0 z-40 cursor-default bg-transparent"
						></button>
						<div
							id="mega-menu-categories"
							role="menu"
							class="absolute left-1/2 top-full z-50 w-[34rem] -translate-x-1/2 pt-4"
						>
							<div class="grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-hair bg-surface shadow-[0_30px_70px_-30px_rgba(11,31,42,0.4)]">
								{#each categories as cat, i (cat.id)}
									<a
										role="menuitem"
										href={`/photos?cat=${encodeURIComponent(cat.name)}`}
										onclick={() => (mega = false)}
										class="group flex flex-col gap-1 bg-bg p-5 transition-colors hover:bg-surface-2"
									>
										<span class="kicker text-safelight/80">0{i + 1}</span>
										<span class="font-display text-lg font-medium tracking-[-0.01em] text-fg">
											{cat.name}
										</span>
										<span class="arrow-link mt-1 text-[0.72rem] text-fg-muted">
											<span class="text-safelight arr">→</span>
										</span>
									</a>
								{/each}
							</div>
						</div>
					{/if}
				</div>

				{@render NavLink("/pricing", muted, i18n.c.nav.pricing)}
			</div>

			<!-- Right cluster: di bawah md hanya DUA tombol jempol 44px
				(keranjang + burger). Ikon akun dilepas — aksinya sudah punya
				baris sendiri di lembar menu, dan tiga lingkaran + wordmark
				membuat logo berdempetan tanpa jarak di layar 390px. -->
			<div class="flex items-center gap-1.5 sm:gap-2 lg:gap-3">
				<div data-no-hover-sound data-no-click-sound class="contents">
					<button
						type="button"
						onclick={() => i18n.setLang(i18n.lang === "id" ? "en" : "id")}
						class={`kicker hidden h-9 rounded-full border px-3 transition-colors duration-500 hover:text-safelight md:block ${line} ${icon}`}
						aria-label="Switch language"
					>
						{i18n.lang.toUpperCase()}
					</button>
				</div>
				<!-- Saklar wajah (Arsip/Ungu/Merah) dilepas dari navbar — situs
					menetap di wajah arsip. Modul $lib/skin.svelte.ts dibiarkan. -->
				<!-- Saklar suara UI scramble: kotak bersudut cekung (bentuk rujukan) dengan
					gelombang yang bergerak saat bersuara, rebah jadi garis datar saat
					dibisukan. HANYA membisukan suara UI (hover/klik tombol) — suara
					lain seperti audio video hero punya saklarnya sendiri. -->
				<button
					type="button"
					data-no-hover-sound
					class={`nav-sound press grid h-11 w-11 place-items-center rounded-full border transition-colors duration-500 hover:text-safelight active:border-safelight active:text-safelight md:h-9 md:w-9 ${line} ${icon}`}
					class:is-muted={scrambleMute.muted}
					onclick={toggleScramble}
					aria-pressed={!scrambleMute.muted}
					aria-label={scrambleMute.muted
						? (i18n.lang === "id" ? "Nyalakan suara tombol" : "Turn button sound on")
						: (i18n.lang === "id" ? "Bisukan suara tombol" : "Mute button sound")}
					title={scrambleMute.muted
						? (i18n.lang === "id" ? "Suara tombol mati" : "Button sound off")
						: (i18n.lang === "id" ? "Suara tombol nyala" : "Button sound on")}
				>
					<svg width="22" height="12" viewBox="0 0 44 24" fill="none" aria-hidden="true">
						<path class="nav-sound-wave" d="M2 12 C 8 12, 8 3, 14 3 S 20 21, 26 21 S 32 3, 38 3 S 42 12, 42 12" />
						<path class="nav-sound-flat" d="M2 12 H 42" />
					</svg>
				</button>
				<!-- Aksesibilitas (dulu tombol mengambang di pojok kanan-bawah): lingkaran
					yang sama dengan tombol suara & keranjang. Di bawah md navbar sudah
					penuh, jadi aksinya ada di lembar menu. -->
				<button
					type="button"
					data-no-hover-sound
					data-no-click-sound
					onclick={() => access.setPanelOpen(true)}
					aria-label={i18n.c.access.panelTitle}
					aria-haspopup="dialog"
					title={i18n.c.access.panelTitle}
					class={`press hidden h-9 w-9 cursor-pointer place-items-center rounded-full border bg-transparent p-0 transition-colors duration-500 hover:text-safelight active:border-safelight active:text-safelight md:grid ${line} ${icon}`}
				>
					<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
						<circle cx="12" cy="4.2" r="1.6" />
						<path d="M4.5 8.2c2.4 1.1 5 1.7 7.5 1.7s5.1-.6 7.5-1.7" />
						<path d="M12 9.9v6" />
						<path d="M12 15.9l-3.6 5.1M12 15.9l3.6 5.1" />
					</svg>
				</button>
				<div data-no-hover-sound data-no-click-sound class="contents">
					<a
						href="/checkout"
					class={`press relative grid h-11 w-11 place-items-center rounded-full border transition-colors duration-500 hover:text-safelight active:border-safelight active:text-safelight md:h-9 md:w-9 ${line} ${icon}`}
					aria-label={`Cart, ${store.cartCount} items`}
				>
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
						<path d="M3 3h2l2.4 12.5a2 2 0 0 0 2 1.5h7.2a2 2 0 0 0 2-1.5L21 7H6" />
						<circle cx="9" cy="20" r="1.3" /><circle cx="18" cy="20" r="1.3" />
					</svg>
					{#if store.cartCount > 0}
						<span class="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-safelight px-1 text-[0.6rem] font-semibold text-ivory">
							{store.cartCount}
						</span>
					{/if}
				</a>
				{#if store.user}
					<a
						href="/profile"
						class={`press hidden! h-9 items-center rounded-full border px-4 text-[0.82rem] font-medium transition-colors duration-500 hover:text-safelight active:border-safelight active:text-safelight md:inline-flex! ${line} ${icon}`}
					>
						{store.user.name.split(" ")[0]}
					</a>
				{:else}
					<button
						type="button"
						onclick={() => authModal.open("/profile")}
						class={`press hidden! h-9 cursor-pointer items-center rounded-full border px-4 text-[0.82rem] font-medium transition-colors duration-500 hover:text-safelight active:border-safelight active:text-safelight md:inline-flex! ${line} ${icon}`}
					>
						{i18n.c.nav.signin}
					</button>
				{/if}

				<!-- Burger 44px sejajar trio: ring yang sama dengan tombol
					sebelahnya, garis dipertegas. -->
				<button
					bind:this={mobileBtnRef}
					type="button"
					class={`grid h-11 w-11 place-items-center rounded-full border transition-colors active:border-safelight md:hidden ${line}`}
					aria-label={open ? "Close menu" : "Menu"}
					aria-expanded={open}
					aria-controls="mobile-menu"
					onclick={() => (open = !open)}
				>
					<span class="relative block h-3 w-[18px]">
						<span class={`absolute left-0 block h-[1.5px] w-[18px] rounded-full transition-all ${bar} ${open ? "top-1.5 rotate-45" : "top-0"}`}></span>
						<span class={`absolute left-0 top-1.5 block h-[1.5px] w-[18px] rounded-full transition-all ${bar} ${open ? "opacity-0" : "opacity-100"}`}></span>
						<span class={`absolute left-0 block h-[1.5px] w-[18px] rounded-full transition-all ${bar} ${open ? "top-1.5 -rotate-45" : "top-3"}`}></span>
					</span>
				</button>
				</div>
			</div>

		</nav>

		<!-- Lembar mobile: tiap baris setinggi jempol (48px), aksi masuk
			jadi tombol penuh selebar layar — pola yang sama dengan rel
			lisensi di halaman detail. -->
		{#if open}
			<div
				id="mobile-menu"
				data-no-hover-sound
				data-no-click-sound
				bind:this={mobileMenuRef}
				role="dialog"
				aria-label="Navigation menu"
				onkeydown={onMobileKeyDown}
				class="border-t border-hair bg-bg px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-6 shadow-[0_30px_60px_-20px_rgba(0,0,0,0.45)] md:hidden"
			>
				<div class="flex flex-col gap-1">
					<a href="/photos" class="flex min-h-[48px] items-center font-display text-[1.4rem] text-fg transition-colors active:text-safelight" onclick={() => (open = false)}>{i18n.c.nav.photos}</a>
					<a href="/videos" class="flex min-h-[48px] items-center font-display text-[1.4rem] text-fg transition-colors active:text-safelight" onclick={() => (open = false)}>{i18n.c.nav.videos}</a>
					<a href="/photos" class="flex min-h-[48px] items-center font-display text-[1.4rem] text-fg transition-colors active:text-safelight" onclick={() => (open = false)}>{i18n.c.nav.categories}</a>
					<a href="/pricing" class="flex min-h-[48px] items-center font-display text-[1.4rem] text-fg transition-colors active:text-safelight" onclick={() => (open = false)}>{i18n.c.nav.pricing}</a>
					<div class="my-3 border-t border-hair"></div>
					<div class="flex items-center gap-3">
						<button
							type="button"
							onclick={() => i18n.setLang(i18n.lang === "id" ? "en" : "id")}
							class="kicker min-h-[44px] rounded-full border border-hair px-4 text-fg/80 transition-colors active:text-safelight"
							aria-label="Switch language"
						>
							{i18n.lang.toUpperCase()}
						</button>
						<button
							type="button"
							onclick={() => {
								open = false;
								access.setPanelOpen(true);
							}}
							class="press inline-flex min-h-[44px] items-center gap-2 rounded-full border border-hair px-4 text-[0.9rem] text-fg/80 transition-colors active:text-safelight"
						>
							<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
						<circle cx="12" cy="4.2" r="1.6" />
						<path d="M4.5 8.2c2.4 1.1 5 1.7 7.5 1.7s5.1-.6 7.5-1.7" />
						<path d="M12 9.9v6" />
						<path d="M12 15.9l-3.6 5.1M12 15.9l3.6 5.1" />
					</svg>
							{i18n.c.access.panelTitle}
						</button>
					</div>
					{#if store.user}
						<a
							href="/profile"
							class="press mt-4 flex min-h-[52px] items-center justify-center gap-2 rounded-full border border-hair text-sm font-medium text-fg/80 transition-colors active:text-safelight"
							onclick={() => (open = false)}
						>
							{store.user.name.split(" ")[0]}
						</a>
					{:else}
						<button
							type="button"
							onclick={() => {
								open = false;
								authModal.open("/profile");
							}}
							class="press mt-4 flex min-h-[52px] w-full items-center justify-center gap-2 rounded-full border border-hair text-sm font-medium text-fg/80 transition-colors active:text-safelight"
						>
							{i18n.c.nav.signin}
						</button>
					{/if}
				</div>
			</div>
		{/if}

	</div>
</header>


<style>
	/* Saklar suara: lingkaran bergaris sama dengan tombol EN & keranjang;
	   warna/garis dari kelas utilitas yang sama. */
	.nav-sound {
		padding: 0;
		background: transparent;
		cursor: pointer;
	}
	.nav-sound:focus-visible {
		outline: 2px solid var(--safelight);
		outline-offset: 3px;
	}
	.nav-sound svg path {
		stroke: currentColor;
		stroke-width: 3.2;
		stroke-linecap: round;
		stroke-linejoin: round;
		transition: opacity 0.3s ease;
	}
	/* Bersuara: gelombang mengalir pelan. Dibisukan: rebah jadi garis datar. */
	.nav-sound-wave {
		stroke-dasharray: 60 12;
		animation: ns-flow 1.6s linear infinite;
	}
	.nav-sound-flat {
		opacity: 0;
	}
	.nav-sound.is-muted {
		opacity: 0.6;
	}
	.nav-sound.is-muted .nav-sound-wave {
		opacity: 0;
		animation: none;
	}
	.nav-sound.is-muted .nav-sound-flat {
		opacity: 1;
	}
	@keyframes ns-flow {
		to { stroke-dashoffset: -72; }
	}
	@media (prefers-reduced-motion: reduce) {
		.nav-sound-wave { animation: none; stroke-dasharray: none; }
	}
</style>
