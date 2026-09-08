<script lang="ts">
	/**
	 * Navbar — port 1:1 dari components/Navbar.tsx. Header fixed di bawah
	 * banner voucher (--banner-h), mega-menu kategori dari API, search, dan
	 * sheet mobile dengan focus trap.
	 */
	import { goto } from "$app/navigation";
	import { i18n } from "$lib/i18n.svelte";
	import { store } from "$lib/store.svelte";
	import { announcer } from "$lib/stores/announce.svelte";
	import { fetchCategories, type ApiCatItem } from "$lib/data";
	import ThemeToggle from "./ThemeToggle.svelte";
	import ApiImage from "./ApiImage.svelte";

	let scrolled = $state(false);
	let mega = $state(false);
	let open = $state(false);
	let q = $state("");
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
	const main = $derived(over ? "text-ivory" : "text-fg");
	const muted = $derived(over ? "text-ivory/80" : "text-fg/85");
	const icon = $derived(over ? "text-ivory/85" : "text-fg/80");
	const line = $derived(over ? "border-ivory/25" : "border-hair");
	const bar = $derived(over ? "bg-ivory/90" : "bg-fg");
	const logoFilter = $derived(
		over
			? "[filter:brightness(0)_invert(1)]"
			: "[filter:brightness(0)] dark:[filter:brightness(0)_invert(1)]"
	);

	function onSearch(e: SubmitEvent) {
		e.preventDefault();
		const v = q.trim();
		if (!v) return;
		goto(`/photos?q=${encodeURIComponent(v)}`);
		open = false;
	}
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
			solid ? "bg-bg/85 backdrop-blur-xl border-b border-hair" : "bg-transparent"
		}`}
	>
		<nav class="relative mx-auto flex h-[4.6rem] max-w-[1500px] items-center justify-between px-6 lg:px-10">
			<a
				href="/"
				class="group relative z-10 md:absolute md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2"
				aria-label="Lakuna"
			>
				<ApiImage
					src="/logo1.png"
					alt="Lakuna"
					width={220}
					height={116}
					eager
					class={`no-cvd h-14 w-auto transition-[filter] duration-500 sm:h-16 md:h-[4.5rem] lg:h-[5.5rem] ${logoFilter}`}
				/>
			</a>

			<!-- Left: nav links (desktop) -->
			<div class="hidden items-center gap-9 md:flex">
				{@render NavLink("/photos", muted, i18n.c.nav.photos)}
				{@render NavLink("/videos", muted, i18n.c.nav.videos)}

				<!-- Categories w/ mega-menu -->
				<div
					class="relative"
					bind:this={megaRef}
					onmouseenter={() => (mega = true)}
					onmouseleave={() => (mega = false)}
				>
					<button
						bind:this={megaBtnRef}
						type="button"
						aria-expanded={mega}
						aria-haspopup="true"
						aria-controls="mega-menu-categories"
						class={`group inline-flex items-center gap-1.5 py-2 text-[0.82rem] font-medium tracking-wide transition-colors duration-500 hover:text-safelight ${muted}`}
						onclick={() => (mega = !mega)}
					>
						{i18n.c.nav.categories}
						<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" class={`transition-transform duration-300 ${mega ? "rotate-180" : ""}`}>
							<path d="M6 9l6 6 6-6" />
						</svg>
					</button>

					{#if mega}
						<div
							id="mega-menu-categories"
							role="menu"
							class="absolute left-1/2 top-full w-[34rem] -translate-x-1/2 pt-4"
							onmouseenter={() => (mega = true)}
						>
							<div class="grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-hair bg-surface shadow-[0_30px_70px_-30px_rgba(11,31,42,0.4)]">
								{#each categories as cat, i (cat.id)}
									<a
										role="menuitem"
										href={`/photos?cat=${encodeURIComponent(cat.name)}`}
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

			<!-- Right cluster -->
			<div class="flex items-center gap-2 sm:gap-3">
				<!-- Search (desktop, underline style) -->
				<form role="search" onsubmit={onSearch} class="hidden lg:block">
					<div class="relative w-52">
						<svg
							class={`pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 ${icon}`}
							width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
						>
							<circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" />
						</svg>
						<input
							type="text"
							bind:value={q}
							placeholder={i18n.c.nav.searchPlaceholder}
							aria-label={i18n.c.nav.searchPlaceholder}
							class={`w-full border-b bg-transparent py-1.5 pl-6 pr-1 text-[0.78rem] outline-none transition-colors duration-500 placeholder:text-current placeholder:opacity-50 focus:border-safelight ${line} ${main}`}
						/>
					</div>
				</form>
				<button
					type="button"
					onclick={() => i18n.setLang(i18n.lang === "id" ? "en" : "id")}
					class={`kicker hidden h-9 rounded-full border px-3 transition-colors duration-500 hover:text-safelight sm:block ${line} ${icon}`}
					aria-label="Switch language"
				>
					{i18n.lang.toUpperCase()}
				</button>
				<div class="hidden sm:block"><ThemeToggle {line} {icon} /></div>
				<a
					href={store.user ? "/profile" : "/login"}
					class={`arrow-link hidden text-[0.82rem] font-medium transition-colors duration-500 hover:text-safelight sm:inline-flex ${muted}`}
				>
					{store.user ? store.user.name.split(" ")[0] : i18n.c.nav.signin}
					<span class="arr text-safelight">→</span>
				</a>
				<a
					href="/checkout"
					class={`relative grid h-9 w-9 place-items-center rounded-full border transition-colors duration-500 hover:text-safelight ${line} ${icon}`}
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

				<!-- Mobile burger -->
				<button
					bind:this={mobileBtnRef}
					type="button"
					class="grid h-9 w-9 place-items-center md:hidden"
					aria-label={open ? "Close menu" : "Menu"}
					aria-expanded={open}
					aria-controls="mobile-menu"
					onclick={() => (open = !open)}
				>
					<span class="relative block h-3 w-5">
						<span class={`absolute left-0 block h-px w-5 transition-all ${bar} ${open ? "top-1.5 rotate-45" : "top-0"}`}></span>
						<span class={`absolute left-0 top-1.5 block h-px w-5 transition-all ${bar} ${open ? "opacity-0" : "opacity-100"}`}></span>
						<span class={`absolute left-0 block h-px w-5 transition-all ${bar} ${open ? "top-1.5 -rotate-45" : "top-3"}`}></span>
					</span>
				</button>
			</div>

		</nav>

		<!-- Mobile sheet -->
		{#if open}
			<div
				id="mobile-menu"
				bind:this={mobileMenuRef}
				role="dialog"
				aria-label="Navigation menu"
				onkeydown={onMobileKeyDown}
				class="border-t border-hair bg-bg px-6 py-6 md:hidden"
			>
				<div class="flex flex-col gap-5">
					<form role="search" onsubmit={onSearch} class="mb-1">
						<div class="relative">
							<svg class="pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 text-fg-muted" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
								<circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" />
							</svg>
							<input
								type="text"
								bind:value={q}
								placeholder={i18n.c.nav.searchPlaceholder}
								aria-label={i18n.c.nav.searchPlaceholder}
								class="w-full border-b border-hair bg-transparent py-2.5 pl-7 pr-1 text-[0.95rem] outline-none focus:border-safelight"
							/>
						</div>
					</form>
					<a href="/photos" class="font-display text-[1.4rem] text-fg transition-colors hover:text-safelight" onclick={() => (open = false)}>{i18n.c.nav.photos}</a>
					<a href="/videos" class="font-display text-[1.4rem] text-fg transition-colors hover:text-safelight" onclick={() => (open = false)}>{i18n.c.nav.videos}</a>
					<a href="/photos" class="font-display text-[1.4rem] text-fg transition-colors hover:text-safelight" onclick={() => (open = false)}>{i18n.c.nav.categories}</a>
					<a href="/pricing" class="font-display text-[1.4rem] text-fg transition-colors hover:text-safelight" onclick={() => (open = false)}>{i18n.c.nav.pricing}</a>
					<div class="my-1 border-t border-hair"></div>
					<div class="flex items-center gap-3">
						<button
							type="button"
							onclick={() => i18n.setLang(i18n.lang === "id" ? "en" : "id")}
							class="kicker h-9 rounded-full border border-hair px-3 text-fg/80 transition-colors hover:text-safelight"
							aria-label="Switch language"
						>
							{i18n.lang.toUpperCase()}
						</button>
						<ThemeToggle line="border-hair" icon="text-fg/80" />
					</div>
					<a href="/login" class="arrow-link text-safelight" onclick={() => (open = false)}>
						{i18n.c.nav.signin} <span class="arr">→</span>
					</a>
				</div>
			</div>
		{/if}

	</div>
</header>

