<script lang="ts">
	import { i18n } from "$lib/i18n.svelte";

	const c = $derived(i18n.c);
</script>

<footer class="border-t border-hair bg-bg">
	<div class="mx-auto max-w-[1500px] px-6 py-20 lg:px-10">
		<!-- Big tagline -->
		<div class="max-w-4xl">
			<p class="kicker text-safelight">{c.nav.tagline}</p>
			<h2 class="mt-5 font-display text-[clamp(2.4rem,6vw,5.5rem)] font-light leading-[0.98] tracking-[-0.02em] text-fg">
				{c.footer.taglineA}<span class="serif-em text-safelight">{c.footer.taglineEm}</span>{c.footer.taglineB}
			</h2>
		</div>

		<div class="rule mt-14"></div>

		<!-- Columns -->
		<div class="mt-12 grid grid-cols-2 gap-10 md:grid-cols-4">
			<div class="col-span-2 md:col-span-1">
				<span class="font-display text-2xl font-medium tracking-[-0.02em] text-fg">Lakuna</span>
				<p class="mt-3 max-w-xs text-sm leading-relaxed text-fg-muted">
					{c.manifesto.title}
				</p>
			</div>

			{#each [{ title: c.footer.about, items: c.footer.aboutItems }, { title: c.footer.services, items: c.footer.servicesItems }, { title: c.footer.contact, items: c.footer.contactItems }] as col (col.title)}
				<div>
					<p class="kicker text-fg-muted">{col.title}</p>
					<ul class="mt-5 space-y-3">
						{#each col.items as it (it)}
							<li>
								<a href="#" class="arrow-link text-[0.92rem] text-fg/80 transition-colors hover:text-safelight">
									{it}
								</a>
							</li>
						{/each}
					</ul>
				</div>
			{/each}
		</div>

		<div class="rule mt-16"></div>

		<div class="mt-6 flex flex-col items-start justify-between gap-3 text-xs text-fg-muted sm:flex-row sm:items-center">
			<p class="kicker">{c.footer.rights}</p>
			<p class="kicker text-safelight/80">{c.footer.made}</p>
		</div>
	</div>
</footer>