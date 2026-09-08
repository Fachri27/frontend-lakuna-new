<script lang="ts">
	import { goto } from "$app/navigation";
	import { i18n } from "$lib/i18n.svelte";
	import { store } from "$lib/store.svelte";
	import { fmtIDR, imgFor, type Photo } from "$lib/data";
	import { apiGet } from "$lib/api";
	import type { ApiResponse, ApiFavorite, ApiDownload, ApiOrder, ApiSubscription } from "$lib/types";
	import Reveal from "./Reveal.svelte";
	import PhotoCard from "./PhotoCard.svelte";

	const copy = {
		id: {
			kicker: "Profil", needLogin: "Masuk untuk melihat profil", needLoginBody: "Simpan favorit, lihat unduhan, dan kelola langgananmu di satu tempat.",
			goLogin: "Masuk", favorites: "Favorit", downloads: "Unduhan", orders: "Pesanan", subscription: "Langganan",
			noFav: "Belum ada favorit", noFavCta: "Cari bingkai favoritmu", logout: "Keluar",
			plan: "Paket", planName: "Populer · Bulanan", quota: "Kuota", quotaUsed: "12 dari 30 terpakai",
			active: "Aktif", renew: "Diperbarui setiap bulan", downloadsEmpty: "Unduhanmu akan muncul di sini setelah pembelian.", manage: "Kelola langganan",
			subEmpty: "Kamu belum berlangganan.", subEmptyCta: "Lihat paket", billing: "Penagihan", billingMonthly: "Bulanan", billingAnnual: "Tahunan",
			subStarted: "Mulai", subExpires: "Berakhir", subStatusActive: "Aktif", subStatusExpired: "Kedaluwarsa", subStatusCancelled: "Dibatalkan", subStatusInactive: "Nonaktif",
			frames: "bingkai", perMonth: "/ bulan", usedOf: "terpakai",
			ordersEmpty: "Belum ada pesanan.", orderTotal: "Total", orderItems: "item", orderDate: "Tanggal",
			paid: "Selesai", pending: "Menunggu bayar", cancelled: "Dibatalkan", otherStatus: "Proses",
			continuePay: "Lanjut bayar", recheck: "Cek status",
			downloadFull: "Unduh penuh", downloadLicense: "Lisensi PDF", preparing: "Menyiapkan…",
		},
		en: {
			kicker: "Profile", needLogin: "Sign in to view your profile", needLoginBody: "Save favourites, view downloads, and manage your membership in one place.",
			goLogin: "Sign in", favorites: "Favourites", downloads: "Downloads", orders: "Orders", subscription: "Membership",
			noFav: "No favourites yet", noFavCta: "Find your favourite frames", logout: "Sign out",
			plan: "Plan", planName: "Popular · Monthly", quota: "Quota", quotaUsed: "12 of 30 used",
			active: "Active", renew: "Renews monthly", downloadsEmpty: "Your downloads will appear here after purchase.", manage: "Manage membership",
			subEmpty: "You don't have a subscription yet.", subEmptyCta: "See plans", billing: "Billing", billingMonthly: "Monthly", billingAnnual: "Annual",
			subStarted: "Started", subExpires: "Expires", subStatusActive: "Active", subStatusExpired: "Expired", subStatusCancelled: "Cancelled", subStatusInactive: "Inactive",
			frames: "frames", perMonth: "/ mo", usedOf: "used",
			ordersEmpty: "No orders yet.", orderTotal: "Total", orderItems: "items", orderDate: "Date",
			paid: "Completed", pending: "Awaiting payment", cancelled: "Cancelled", otherStatus: "Processing",
			continuePay: "Continue payment", recheck: "Check status",
			downloadFull: "Download full", downloadLicense: "License PDF", preparing: "Preparing…",
		},
	};

	type Tab = "favorites" | "downloads" | "orders" | "subscription";

	type OrderCopy = { paid: string; pending: string; cancelled: string; otherStatus: string };

	function orderStatusLabel(status: string, t: OrderCopy) {
		if (status === "PAID") return t.paid;
		if (status === "PENDING") return t.pending;
		if (status === "CANCELLED") return t.cancelled;
		return t.otherStatus;
	}

	function orderStatusClass(status: string) {
		if (status === "PAID") return "bg-safelight/10 text-safelight";
		if (status === "CANCELLED") return "bg-fg-muted/10 text-fg-muted";
		return "bg-safelight/5 text-safelight/80";
	}

	const lang = $derived(i18n.lang);
	const t = $derived(copy[lang]);

	const user = $derived(store.user);

	let tab = $state<Tab>("favorites");
	let favPhotos = $state<Photo[]>([]);
	let downloads = $state<ApiDownload[]>([]);

	// Unduh dari URL presigned (cross-origin MinIO). Coba fetch blob dulu agar
	// browser memaksa save; bila diblokir CORS, fallback buka di tab baru.
	async function downloadFromUrl(src: string, filename: string) {
		try {
			const r = await fetch(src, { mode: "cors" });
			if (!r.ok) throw new Error("fetch failed");
			const blob = await r.blob();
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = filename;
			document.body.appendChild(a);
			a.click();
			a.remove();
			URL.revokeObjectURL(url);
		} catch {
			window.open(src, "_blank", "noopener,noreferrer");
		}
	}

	// Unduh file penuh (tanpa tanda air) lewat backend yang presign originalKey.
	// Backend validasi lisensi STANDAR / subscription aktif sebelum memberi URL.
	async function handleDownloadFull(d: ApiDownload) {
		if (preparingId) return;
		preparingId = d.id;
		try {
			const res = await apiGet<ApiResponse<{ downloadUrl: string }>>(`/api/downloads/${d.photoId}`);
			if (!res.success || !res.data?.downloadUrl) throw new Error("no url");
			await downloadFromUrl(res.data.downloadUrl, `lakuna-${d.photoId}-penuh.jpg`);
		} catch {
			goto(`/photos/${d.photoId}`);
		} finally {
			preparingId = null;
		}
	}

	// Unduh sertifikat lisensi (PDF) lewat backend yang generate/presign PDF.
	async function handleDownloadLicense(d: ApiDownload) {
		if (preparingId) return;
		preparingId = `lic-${d.id}`;
		try {
			const res = await apiGet<ApiResponse<{ downloadUrl: string }>>(`/api/downloads/license/${d.id}`);
			if (!res.success || !res.data?.downloadUrl) throw new Error("no url");
			await downloadFromUrl(res.data.downloadUrl, `lakuna-lisensi-${d.id}.pdf`);
		} catch {
			/* silent */
		} finally {
			preparingId = null;
		}
	}

	// Pesanan yang sudah lunas disembunyikan dari daftar (unduhannya ada di tab Unduhan).
	// Catatan: semua order ditampilkan — yang sudah dibayar berlabel "Selesai".
	$effect(() => {
		if (!user) return;
		// Fetch favorite photos
		apiGet<ApiResponse<ApiFavorite[]>>("/api/favorite").then((res) => {
			if (res.success) {
				const photos = res.data.map((f) => {
					const p = f.photo;
					return {
						id: p.id,
						title: { id: p.title, en: p.title },
						author: "Unknown",
						cat: "nature" as const,
						seed: p.id,
						w: 1600,
						h: 1200,
						price: p.price,
						categories: [],
						keywords: [],
						tags: [],
						desc: { id: p.title, en: p.title },
						thumbUrl: p.thumbUrl,
					};
				});
				favPhotos = photos;
			}
		}).catch(() => {});
		// Fetch downloads
		apiGet<ApiResponse<ApiDownload[]>>("/api/downloads").then((res) => {
			if (res.success) downloads = res.data;
		}).catch(() => {});
		// Fetch orders
		apiGet<ApiResponse<ApiOrder[]>>("/api/order").then((res) => {
			if (res.success) orders = res.data;
		}).catch(() => {});
		// Fetch subscription
		apiGet<ApiResponse<ApiSubscription>>("/api/subscription").then((res) => {
			if (res.success && res.data) subscription = res.data;
		}).catch(() => {});
	});

	let orders = $state<ApiOrder[]>([]);
	let subscription = $state<ApiSubscription | null>(null);
	let preparingId = $state<string | null>(null);

	const sub = $derived(subscription);
	const hasSub = $derived(!!sub && sub.status !== "INACTIVE" && sub.plan !== "FREE" && !!sub.id);

	function fmtDate(d?: string) {
		return d
			? new Date(d).toLocaleDateString(lang === "id" ? "id-ID" : "en-US", { day: "2-digit", month: "short", year: "numeric" })
			: "—";
	}
</script>

{#snippet emptyState(title: string, cta: string, href = "/photos")}
	<div class="flex flex-col items-center justify-center rounded-md border border-dashed border-hair py-24 text-center">
		<p class="font-display text-2xl font-light text-fg">{title}</p>
		<a href={href} class="arrow-link mt-5 text-sm text-safelight">{cta} <span class="arr">→</span></a>
	</div>
{/snippet}

{#if !user}
	<section class="mx-auto flex min-h-[70svh] max-w-xl flex-col items-center justify-center px-6 pt-36 text-center lg:pt-44">
		<p class="kicker text-safelight">{t.kicker}</p>
		<h1 class="mt-5 font-display text-[clamp(2rem,5vw,3.4rem)] font-light tracking-[-0.02em] text-fg">{t.needLogin}</h1>
		<p class="mt-4 text-fg-muted">{t.needLoginBody}</p>
		<a href="/login" class="arrow-link mt-8 rounded-full bg-safelight px-7 py-3.5 text-sm font-medium text-ivory">
			{t.goLogin} <span class="arr">→</span>
		</a>
	</section>
{:else}
	<section class="mx-auto max-w-[1500px] px-6 pb-28 pt-36 lg:px-10 lg:pt-44">
		<Reveal class="flex flex-wrap items-end justify-between gap-6">
			<div>
				<p data-reveal class="kicker text-safelight">{t.kicker}</p>
				<h1 data-reveal class="mt-4 font-display text-[clamp(2.2rem,5vw,3.6rem)] font-light tracking-[-0.02em] text-fg">{user.name}</h1>
				<p data-reveal class="mt-2 text-sm text-fg-muted">{user.email}</p>
			</div>
			<button data-reveal type="button" onclick={() => { void store.logout(); goto("/"); }} class="rounded-full border border-hair px-5 py-2.5 text-sm text-fg-muted transition-colors hover:border-safelight hover:text-safelight">
				{t.logout}
			</button>
		</Reveal>

		<!-- Tabs -->
		<div role="tablist" aria-label="Profile sections" class="mt-10 flex gap-2 border-b border-hair">
			{#each (["favorites", "downloads", "orders", "subscription"] as Tab[]) as tb (tb)}
				<button type="button" role="tab" aria-selected={tab === tb} aria-controls={`panel-${tb}`} onclick={() => (tab = tb)} class={`kicker relative px-4 py-3 transition-colors ${tab === tb ? "text-safelight" : "text-fg-muted hover:text-fg"}`}>
					{t[tb]}
					{#if tab === tb}<span class="absolute inset-x-0 -bottom-px h-0.5 bg-safelight"></span>{/if}
				</button>
			{/each}
		</div>

		<div class="mt-10">
			{#if tab === "favorites"}
				<div id="panel-favorites" role="tabpanel">
					{#if favPhotos.length}
						<Reveal stagger={0.06} class="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
							{#each favPhotos as p (p.id)}
								<div data-reveal><PhotoCard photo={p} /></div>
							{/each}
						</Reveal>
					{:else}
						{@render emptyState(t.noFav, t.noFavCta)}
					{/if}
				</div>
			{/if}

			{#if tab === "downloads"}
				<div id="panel-downloads" role="tabpanel">
					{#if downloads.length}
						<Reveal stagger={0.06} class="space-y-3">
							{#each downloads as d (d.id)}
								<div data-reveal class="flex items-center gap-4 rounded-md border border-hair bg-surface p-4">
									<div class="min-w-0 flex-1">
										<p class="truncate font-display text-lg font-light text-fg">{d.photo.title}</p>
										<p class="mt-1 text-xs text-fg-muted">{new Date(d.createdAt).toLocaleDateString()} · {d.type}</p>
									</div>
									<span class="kicker hidden rounded-full bg-safelight/10 px-3 py-1 text-safelight sm:inline-block">{d.licenseKey}</span>
									<div class="flex shrink-0 flex-col gap-2 sm:flex-row">
										<button
											type="button"
											onclick={() => handleDownloadLicense(d)}
											disabled={preparingId === `lic-${d.id}`}
											class="rounded-full border border-hair px-4 py-2.5 text-sm font-medium text-fg transition-colors hover:border-safelight hover:text-safelight disabled:opacity-60"
										>
											{preparingId === `lic-${d.id}` ? t.preparing : t.downloadLicense}
										</button>
										<button
											type="button"
											onclick={() => handleDownloadFull(d)}
											disabled={preparingId === d.id}
											class="rounded-full bg-safelight px-5 py-2.5 text-sm font-medium text-ivory transition-transform hover:scale-[1.02] disabled:opacity-60"
										>
											{preparingId === d.id ? t.preparing : t.downloadFull}
										</button>
									</div>
								</div>
							{/each}
						</Reveal>
					{:else}
						{@render emptyState(t.downloadsEmpty, t.noFavCta)}
					{/if}
				</div>
			{/if}

			{#if tab === "orders"}
				<div id="panel-orders" role="tabpanel">
					{#if orders.length}
						<Reveal stagger={0.06} class="space-y-3">
							{#each orders as o (o.id)}
								<div data-reveal class="rounded-md border border-hair bg-surface p-4 sm:p-5">
									<div class="flex flex-wrap items-start justify-between gap-3">
										<div class="min-w-0">
											<div class="flex items-center gap-3">
												<span class="font-mono text-xs text-fg-muted">{o.midtransOrderId || `ORDER-${o.id}`}</span>
												<span class={`kicker rounded-full px-3 py-1 ${orderStatusClass(o.status)}`}>{orderStatusLabel(o.status, t)}</span>
											</div>
											<p class="mt-1 text-xs text-fg-muted">{t.orderDate}: {new Date(o.createdAt).toLocaleDateString()}</p>
										</div>
										<div class="text-right">
											<p class="kicker text-fg-muted">{t.orderTotal}</p>
											<p class="mt-1 font-display text-lg font-light text-fg">{fmtIDR(o.total)}</p>
										</div>
									</div>

									{#if o.items.length > 0}
										<div class="mt-4 flex flex-wrap gap-4 border-t border-hair pt-4">
											{#each o.items as it (it.id)}
												<div class="flex items-center gap-3">
													<!-- eslint-disable-next-line @next/next/no-img-element -->
													<img src={imgFor(it.photo.id, 160, 120, it.photo.thumbUrl)} alt={it.photo.title} class="h-10 w-14 rounded-sm object-cover" />
													<div class="min-w-0">
														<p class="truncate text-sm text-fg">{it.photo.title}</p>
														<p class="text-xs text-fg-muted">{it.licenseType} · {fmtIDR(it.price)}</p>
													</div>
												</div>
											{/each}
										</div>
									{/if}

									{#if o.status === "PENDING" && o.continuePaymentUrl}
										<div class="mt-4 flex flex-wrap gap-3">
											<a href={o.continuePaymentUrl} class="rounded-full bg-safelight px-5 py-2.5 text-sm font-medium text-ivory transition-transform hover:scale-[1.02]">
												{t.continuePay} →
											</a>
										</div>
									{/if}
								</div>
							{/each}
						</Reveal>
					{:else}
						{@render emptyState(t.ordersEmpty, t.noFavCta)}
					{/if}
				</div>
			{/if}

			{#if tab === "subscription"}
				<div id="panel-subscription" role="tabpanel">
					{#if !hasSub || !sub}
						{@render emptyState(t.subEmpty, t.subEmptyCta, "/pricing")}
					{:else}
						{@const billingLabel = sub.billing === "annual" ? t.billingAnnual : t.billingMonthly}
						{@const statusLabel =
							sub.status === "ACTIVE" ? t.subStatusActive
							: sub.status === "EXPIRED" ? t.subStatusExpired
							: sub.status === "CANCELLED" ? t.subStatusCancelled
							: t.subStatusInactive}
						{@const statusClass =
							sub.status === "ACTIVE" ? "bg-safelight/10 text-safelight"
							: "bg-fg-muted/10 text-fg-muted"}
						{@const quota = sub.quota || 0}
						{@const used = Math.min(sub.used || 0, quota)}
						{@const pct = quota > 0 ? Math.round((used / quota) * 100) : 0}
						<Reveal class="max-w-lg">
							<div data-reveal class="rounded-md border border-hair bg-surface p-7">
								<div class="flex items-center justify-between">
									<span class="kicker text-safelight">{t.plan}</span>
									<span class={`kicker rounded-full px-3 py-1 ${statusClass}`}>{statusLabel}</span>
								</div>
								<h2 class="mt-4 font-display text-3xl font-light tracking-[-0.02em] text-fg">
									{quota} <span class="text-fg-muted">{t.frames}</span>
								</h2>
								<p class="mt-2 text-sm text-fg-muted">
									{billingLabel}{#if sub.price} · {fmtIDR(sub.price)}{#if sub.billing === "monthly"} {t.perMonth}{/if}{/if}
								</p>

								<div class="mt-6 border-t border-hair pt-5">
									<div class="flex justify-between text-sm">
										<span class="text-fg-muted">{t.quota}</span>
										<span class="text-fg">{used} / {quota} {t.usedOf}</span>
									</div>
									<div class="mt-3 h-1.5 overflow-hidden rounded-full bg-hair">
										<div class="h-full rounded-full bg-safelight transition-[width] duration-700" style={`width: ${pct}%`}></div>
									</div>
								</div>

								<div class="mt-5 grid grid-cols-2 gap-4 border-t border-hair pt-5 text-sm">
									<div>
										<p class="kicker text-fg-muted">{t.subStarted}</p>
										<p class="mt-1.5 text-fg">{fmtDate(sub.startedAt)}</p>
									</div>
									<div>
										<p class="kicker text-fg-muted">{t.subExpires}</p>
										<p class="mt-1.5 text-fg">{fmtDate(sub.expiresAt)}</p>
									</div>
								</div>

								<a href="/pricing" class="arrow-link mt-6 text-sm text-safelight">
									{t.manage} <span class="arr">→</span>
								</a>
							</div>
						</Reveal>
					{/if}
				</div>
			{/if}
		</div>
	</section>
{/if}

