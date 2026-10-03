<script lang="ts">
	import type { Snippet } from "svelte";

	/**
	 * Kerangka halaman informasi (FAQ, Customer service, Reviews): satu judul,
	 * satu kalimat penjelasan, lalu isi. Gayanya sama dengan /license dan /about
	 * — rata kiri, tanpa kartu, tanpa animasi masuk.
	 */
	let {
		title,
		sub,
		meta,
		children,
	}: { title: string; sub?: string; meta?: string; children: Snippet } = $props();
</script>

<div class="pg bg-bg text-fg">
	<div class="pg-wrap">
		<header class="pg-head">
			<h1 class="pg-title">{title}</h1>
			{#if sub}<p class="pg-sub">{sub}</p>{/if}
			{#if meta}<p class="pg-meta">{meta}</p>{/if}
		</header>
		{@render children()}
	</div>
</div>

<style>
	.pg {
		min-height: 100vh;
	}
	.pg-wrap {
		max-width: 1400px;
		margin: 0 auto;
		padding: calc(var(--banner-h, 0px) + var(--nav-h) + 3rem) clamp(1.25rem, 4vw, 4rem) 7rem;
	}
	.pg-title {
		max-width: 20ch;
		font-family: var(--font-display);
		font-size: clamp(2.6rem, 6.4vw, 5.2rem);
		font-weight: 300;
		line-height: 1.02;
		letter-spacing: -0.03em;
		text-wrap: balance;
		color: var(--fg);
	}
	.pg-sub {
		margin-top: 1.5rem;
		max-width: 56ch;
		font-size: clamp(1.02rem, 1.4vw, 1.2rem);
		line-height: 1.65;
		color: var(--fg-muted);
	}
	.pg-meta {
		margin-top: 0.9rem;
		font-size: 0.85rem;
		color: var(--fg-muted);
		opacity: 0.8;
	}

	/* Kelas bersama untuk isi halaman (dipakai komponen anak). */
	.pg :global(.pg-rule) {
		margin-top: clamp(3rem, 7vw, 5.5rem);
		padding-top: 2rem;
		border-top: 1px solid var(--hair);
	}
	.pg :global(.pg-h2) {
		font-family: var(--font-display);
		font-size: clamp(1.3rem, 2vw, 1.7rem);
		font-weight: 300;
		letter-spacing: -0.015em;
		color: var(--fg);
	}
	.pg :global(.pg-h3) {
		font-family: var(--font-display);
		font-size: 1.05rem;
		font-weight: 500;
		color: var(--fg);
	}
	.pg :global(.pg-p) {
		font-size: 1rem;
		line-height: 1.7;
		color: var(--fg-muted);
	}
	.pg :global(.pg-link) {
		color: var(--fg);
		text-decoration: underline;
		text-decoration-color: color-mix(in srgb, var(--fg) 35%, transparent);
		text-underline-offset: 0.35em;
		transition: color 0.2s ease, text-decoration-color 0.2s ease;
	}
	.pg :global(.pg-link:hover) {
		color: var(--safelight);
		text-decoration-color: var(--safelight);
	}
	.pg :global(a:focus-visible),
	.pg :global(button:focus-visible),
	.pg :global(summary:focus-visible),
	.pg :global(input:focus-visible) {
		outline: 2px solid var(--safelight);
		outline-offset: 3px;
		border-radius: 2px;
	}
</style>
