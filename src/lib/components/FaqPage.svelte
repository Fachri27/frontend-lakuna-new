<script lang="ts">
	import { i18n, type Lang } from "$lib/i18n.svelte";
	import PageShell from "./PageShell.svelte";

	import { FAQ as copy, type QA, type Group } from "$lib/faq";

	const lang = $derived<Lang>(i18n.lang);
	const t = $derived(copy[lang]);

	let query = $state("");
	const q = $derived(query.trim().toLowerCase());
	const groups = $derived(
		t.groups
			.map((g) => ({
				...g,
				items: q ? g.items.filter((it) => `${it.q} ${it.a}`.toLowerCase().includes(q)) : g.items,
			}))
			.filter((g) => g.items.length),
	);
</script>

<PageShell title={t.title} sub={t.sub}>
	<div class="faq-tools">
		<label class="faq-search">
			<span class="sr-only">{t.search}</span>
			<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
			<input type="search" bind:value={query} placeholder={t.search} autocomplete="off" />
		</label>
	</div>

	<div class="faq-groups" aria-live="polite">
		{#each groups as g (g.title)}
			<section class="faq-group">
				<h2 class="faq-group__title">{g.title}</h2>
				<div class="faq-list">
					{#each g.items as it (it.q)}
						<details class="faq-item" open={!!q}>
							<summary>
								<span>{it.q}</span>
								<svg class="faq-ico" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
							</summary>
							<div class="faq-a">
								<p>{it.a}</p>
								{#if it.link}<a href={it.link.href} class="pg-link">{it.link.label}</a>{/if}
							</div>
						</details>
					{/each}
				</div>
			</section>
		{:else}
			<p class="faq-none">
				{t.none} “{query}”. <a href="/customer-service" class="pg-link">{t.noneCta}</a>
			</p>
		{/each}
	</div>

	<section class="pg-rule faq-still">
		<h2 class="pg-h2">{t.stillTitle}</h2>
		<p class="pg-p">{t.stillBody}</p>
		<a href="/customer-service" class="pg-link faq-still__cta">{t.stillCta}</a>
	</section>
</PageShell>

<style>
	.faq-tools {
		margin-top: clamp(2rem, 5vw, 3.5rem);
		max-width: 38rem;
	}
	.faq-search {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding-bottom: 0.8rem;
		border-bottom: 1px solid var(--hair);
		color: var(--fg-muted);
		transition: border-color 0.2s ease;
	}
	.faq-search:focus-within {
		border-bottom-color: var(--safelight);
	}
	.faq-search input {
		flex: 1;
		min-width: 0;
		background: transparent;
		border: 0;
		outline: none;
		font-size: 1.05rem;
		color: var(--fg);
	}
	.faq-search input::placeholder {
		color: var(--fg-muted);
	}
	.faq-groups {
		margin-top: clamp(2.5rem, 6vw, 4.5rem);
	}
	.faq-group {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: 1rem;
	}
	.faq-group + .faq-group {
		margin-top: clamp(2.5rem, 6vw, 4.5rem);
	}
	@media (min-width: 960px) {
		.faq-group {
			grid-template-columns: minmax(0, 4fr) minmax(0, 8fr);
			column-gap: clamp(3rem, 7vw, 8rem);
		}
	}
	.faq-group__title {
		font-family: var(--font-display);
		font-size: clamp(1.3rem, 2vw, 1.7rem);
		font-weight: 300;
		letter-spacing: -0.015em;
		color: var(--fg);
	}
	.faq-list {
		max-width: 52rem;
		border-top: 1px solid var(--hair);
	}
	.faq-item {
		border-bottom: 1px solid var(--hair);
	}
	.faq-item summary {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 1.5rem;
		padding: 1.15rem 0;
		font-size: 1.08rem;
		line-height: 1.45;
		color: var(--fg);
		cursor: pointer;
		list-style: none;
	}
	.faq-item summary::-webkit-details-marker {
		display: none;
	}
	.faq-ico {
		flex: none;
		align-self: center;
		color: var(--fg-muted);
		transition: transform 0.25s ease, color 0.2s ease;
	}
	.faq-item summary:hover .faq-ico {
		color: var(--fg);
	}
	.faq-item[open] .faq-ico {
		transform: rotate(45deg);
		color: var(--safelight);
	}
	.faq-a {
		max-width: 60ch;
		padding: 0 2.5rem 1.4rem 0;
	}
	.faq-a p {
		font-size: 1rem;
		line-height: 1.7;
		color: var(--fg-muted);
	}
	.faq-a :global(a) {
		display: inline-block;
		margin-top: 0.75rem;
	}
	.faq-none {
		font-size: 1.05rem;
		color: var(--fg-muted);
	}
	.faq-still__cta {
		display: inline-block;
		margin-top: 1rem;
	}
	.faq-still :global(.pg-p) {
		margin-top: 0.5rem;
		max-width: 52ch;
	}
	@media (prefers-reduced-motion: reduce) {
		.faq-ico {
			transition: none;
		}
	}
</style>
