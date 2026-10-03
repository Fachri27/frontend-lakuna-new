<script lang="ts">
	import type { Snippet } from "svelte";

	/** Satu bagian dokumen: `body` = paragraf, `steps` = langkah berurutan (bernomor). */
	export type Clause = { id?: string; title: string; body?: string[]; steps?: string[] };

	let {
		title,
		sub,
		meta,
		clauses,
		railLabel,
		numbered = true,
		after,
	}: {
		title: string;
		sub?: string;
		meta?: string;
		clauses: Clause[];
		railLabel: string;
		/** Beri nomor pada judul bagian (untuk dokumen hukum yang dirujuk silang). */
		numbered?: boolean;
		/** Penutup di bawah bagian terakhir. */
		after?: Snippet;
	} = $props();

	const anchor = (c: Clause, i: number) => c.id ?? `bagian-${i + 1}`;

	let active = $state(0);
	let bodyEl: HTMLElement | undefined = $state();

	// Penanda bagian yang sedang dibaca: satu-satunya gerak, menjawab aksi menggulir.
	$effect(() => {
		const root = bodyEl;
		if (!root) return;
		const sections = Array.from(root.querySelectorAll<HTMLElement>("[data-clause]"));
		if (!sections.length) return;
		const io = new IntersectionObserver(
			(entries) => {
				for (const e of entries) {
					if (e.isIntersecting) active = Number((e.target as HTMLElement).dataset.clause);
				}
			},
			{ rootMargin: "-25% 0px -60% 0px" },
		);
		sections.forEach((s) => io.observe(s));
		return () => io.disconnect();
	});
</script>

<div class="cd bg-bg text-fg">
	<div class="cd-wrap">
		<aside class="cd-rail" aria-label={railLabel}>
			<nav>
				<p class="cd-rail__label">{railLabel}</p>
				<ol>
					{#each clauses as c, i (c.title)}
						<li>
							<a href={`#${anchor(c, i)}`} class="cd-rail__link" aria-current={active === i ? "location" : undefined}>
								{#if numbered}<span class="cd-rail__num">{i + 1}</span>{/if}{c.title}
							</a>
						</li>
					{/each}
				</ol>
			</nav>
		</aside>

		<div class="cd-main">
			<header>
				<h1 class="cd-title">{title}</h1>
				{#if sub}<p class="cd-sub">{sub}</p>{/if}
				{#if meta}<p class="cd-meta">{meta}</p>{/if}
			</header>

			<div bind:this={bodyEl} class="cd-clauses">
				{#each clauses as c, i (c.title)}
					<section data-clause={i} id={anchor(c, i)} class="cd-clause" aria-labelledby={`${anchor(c, i)}-h`}>
						<h2 id={`${anchor(c, i)}-h`} class="cd-h2">
							{#if numbered}<span class="cd-clause__num">{i + 1}.</span>{/if}{c.title}
						</h2>
						<div class="cd-body">
							{#each c.body ?? [] as p (p)}
								<p>{p}</p>
							{/each}
							{#if c.steps}
								<ol class="cd-steps">
									{#each c.steps as st (st)}
										<li>{st}</li>
									{/each}
								</ol>
							{/if}
						</div>
					</section>
				{/each}
			</div>

			{#if after}{@render after()}{/if}
		</div>
	</div>
</div>

<style>
	.cd {
		min-height: 100vh;
	}
	.cd-wrap {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		max-width: 1400px;
		margin: 0 auto;
		padding: calc(var(--banner-h, 0px) + var(--nav-h) + 2.5rem) clamp(1.25rem, 4vw, 4rem) 7rem;
	}
	@media (min-width: 1024px) {
		.cd-wrap {
			grid-template-columns: 15rem minmax(0, 1fr);
			column-gap: clamp(4rem, 8vw, 9rem);
			padding-top: calc(var(--banner-h, 0px) + var(--nav-h) + 4rem);
		}
	}

	/* ── Daftar isi ───────────────────────────────────────────────── */
	.cd-rail {
		display: none;
	}
	@media (min-width: 1024px) {
		.cd-rail {
			display: block;
		}
		.cd-rail nav {
			position: sticky;
			top: calc(var(--banner-h, 0px) + var(--nav-h) + 2rem);
		}
	}
	.cd-rail__label {
		margin-bottom: 0.9rem;
		font-size: 0.8rem;
		color: var(--fg-muted);
	}
	.cd-rail ol {
		margin: 0;
		padding: 0;
		list-style: none;
		border-left: 1px solid var(--hair);
	}
	.cd-rail__link {
		display: flex;
		gap: 0.7rem;
		padding: 0.4rem 0 0.4rem 0.9rem;
		margin-left: -1px;
		border-left: 2px solid transparent;
		font-size: 0.88rem;
		line-height: 1.4;
		color: var(--fg-muted);
		transition: color 0.2s ease, border-color 0.2s ease;
	}
	.cd-rail__num {
		min-width: 0.9rem;
		font-variant-numeric: tabular-nums;
		opacity: 0.7;
	}
	.cd-rail__link:hover {
		color: var(--fg);
	}
	.cd-rail__link[aria-current="location"] {
		color: var(--fg);
		border-left-color: var(--safelight);
	}

	/* ── Kepala ───────────────────────────────────────────────────── */
	.cd-title {
		max-width: 22ch;
		font-family: var(--font-display);
		font-size: clamp(2.2rem, 4.6vw, 4rem);
		font-weight: 300;
		line-height: 1.08;
		letter-spacing: -0.02em;
		text-wrap: balance;
		color: var(--fg);
	}
	.cd-sub {
		margin-top: 1.25rem;
		max-width: 60ch;
		font-size: 1.15rem;
		line-height: 1.65;
		color: var(--fg-muted);
	}
	.cd-meta {
		margin-top: 0.9rem;
		font-size: 0.85rem;
		color: var(--fg-muted);
		opacity: 0.8;
	}

	/* ── Bagian ───────────────────────────────────────────────────── */
	.cd-clauses {
		margin-top: 1rem;
	}
	.cd-clause {
		padding-top: 2.25rem;
		margin-top: 2.25rem;
		border-top: 1px solid var(--hair);
		scroll-margin-top: calc(var(--banner-h, 0px) + var(--nav-h) + 1.5rem);
	}
	.cd-clauses .cd-clause:first-child {
		margin-top: 3rem;
	}
	.cd-h2 {
		font-family: var(--font-display);
		font-size: 1.3rem;
		font-weight: 500;
		line-height: 1.3;
		color: var(--fg);
	}
	.cd-clause__num {
		display: inline-block;
		min-width: 1.9rem;
		font-variant-numeric: tabular-nums;
		color: var(--fg-muted);
	}
	.cd-body {
		margin-top: 0.9rem;
		max-width: 64ch;
	}
	.cd-body :global(p) {
		font-size: 1.02rem;
		line-height: 1.75;
		color: color-mix(in srgb, var(--fg) 80%, transparent);
	}
	.cd-body :global(p + p) {
		margin-top: 0.8rem;
	}
	/* Langkah berurutan: nomor memang bermakna di sini. */
	.cd-steps {
		margin: 0;
		padding: 0;
		list-style: none;
		counter-reset: step;
	}
	.cd-steps li {
		position: relative;
		padding-left: 2.2rem;
		font-size: 1.02rem;
		line-height: 1.7;
		color: color-mix(in srgb, var(--fg) 80%, transparent);
		counter-increment: step;
	}
	.cd-steps li + li {
		margin-top: 0.7rem;
	}
	.cd-steps li::before {
		content: counter(step);
		position: absolute;
		left: 0;
		top: 0.05rem;
		display: grid;
		place-items: center;
		width: 1.45rem;
		height: 1.45rem;
		border: 1px solid var(--hair);
		border-radius: 999px;
		font-size: 0.75rem;
		font-variant-numeric: tabular-nums;
		color: var(--fg-muted);
	}
	.cd :global(.cd-link) {
		color: var(--fg);
		text-decoration: underline;
		text-decoration-color: color-mix(in srgb, var(--fg) 35%, transparent);
		text-underline-offset: 0.35em;
		transition: color 0.2s ease, text-decoration-color 0.2s ease;
	}
	.cd :global(.cd-link:hover) {
		color: var(--safelight);
		text-decoration-color: var(--safelight);
	}
	.cd :global(a:focus-visible) {
		outline: 2px solid var(--safelight);
		outline-offset: 3px;
		border-radius: 2px;
	}
</style>
