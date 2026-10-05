<script lang="ts">
	import { i18n, type Lang } from "$lib/i18n.svelte";
	import { REVIEWS } from "$lib/content/reviews";
	import PageShell from "./PageShell.svelte";

	const copy: Record<Lang, {
		title: string; sub: string; emptyTitle: string; emptyBody: string; share: string; browse: string;
	}> = {
		id: {
			title: "Ulasan",
			sub: "Kata para pemegang lisensi dan perajangga tentang bekerja dengan Lakuna",
			emptyTitle: "Belum ada ulasan yang dipublikasikan",
			emptyBody: "Kami hanya menayangkan ulasan asli dari pelanggan dan perajangga, dengan izin mereka. Ulasan pertama akan muncul di sini",
			share: "Ceritakan pengalamanmu",
			browse: "Jelajahi arsip",
		},
		en: {
			title: "Reviews",
			sub: "What licensees and image-makers say about working with Lakuna",
			emptyTitle: "No reviews have been published yet",
			emptyBody: "We only publish real reviews from customers and image-makers, with their permission. The first ones will appear here",
			share: "Share your experience",
			browse: "Browse the archive",
		},
	};

	const lang = $derived<Lang>(i18n.lang);
	const t = $derived(copy[lang]);
	const fmt = $derived(new Intl.DateTimeFormat(lang === "id" ? "id-ID" : "en-US", { year: "numeric", month: "long" }));
</script>

<PageShell title={t.title} sub={t.sub}>
	{#if REVIEWS.length}
		<ul class="rv-list">
			{#each REVIEWS as r (r.name + r.quote.en)}
				<li class="rv-item pg-rule">
					<blockquote class="rv-quote">{r.quote[lang]}</blockquote>
					<p class="rv-by">
						<span class="rv-name">{r.name}</span>
						<span>{r.role[lang]}</span>
						{#if r.date}<span>{fmt.format(new Date(r.date))}</span>{/if}
					</p>
				</li>
			{/each}
		</ul>
	{:else}
		<section class="pg-rule">
			<div class="rv-empty">
				<h2 class="rv-empty__title">{t.emptyTitle}</h2>
				<p class="pg-p">{t.emptyBody}</p>
				<p class="rv-links">
					<a href="/customer-service" class="pg-link">{t.share}</a>
					<a href="/photos" class="pg-link">{t.browse}</a>
				</p>
			</div>
		</section>
	{/if}
</PageShell>

<style>
	.rv-list {
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.rv-quote {
		max-width: 28ch;
		margin: 0;
		font-family: var(--font-display);
		font-size: clamp(1.7rem, 3.4vw, 3rem);
		font-weight: 300;
		line-height: 1.15;
		letter-spacing: -0.02em;
		text-wrap: balance;
		color: var(--fg);
	}
	.rv-by {
		display: flex;
		flex-wrap: wrap;
		gap: 0.2rem 1.25rem;
		margin-top: 1.25rem;
		font-size: 0.92rem;
		color: var(--fg-muted);
	}
	.rv-name {
		color: var(--fg);
	}
	.rv-empty {
		max-width: 52ch;
	}
	.rv-empty__title {
		font-family: var(--font-display);
		font-size: clamp(1.6rem, 3vw, 2.4rem);
		font-weight: 300;
		line-height: 1.15;
		letter-spacing: -0.02em;
		text-wrap: balance;
		color: var(--fg);
	}
	.rv-empty :global(.pg-p) {
		margin-top: 0.9rem;
	}
	.rv-links {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem 1.75rem;
		margin-top: 1.5rem;
	}
</style>
