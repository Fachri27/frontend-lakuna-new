<script lang="ts">
	import Reveal from "./Reveal.svelte";

	let { kicker, title, sub }: { kicker: string; title: string; sub?: string } = $props();
</script>

<section class="mx-auto max-w-[1500px] px-6 pb-12 pt-36 lg:px-10 lg:pb-16 lg:pt-44">
	<Reveal>
		<p data-reveal class="kicker text-safelight">
			{kicker}
		</p>
		<h1 data-reveal class="mt-5 font-display text-[clamp(2.4rem,6vw,5rem)] font-light leading-[0.98] tracking-[-0.03em] text-fg">
			{title}
		</h1>
		{#if sub}
			<p data-reveal class="mt-6 max-w-xl text-[1.02rem] leading-relaxed text-fg-muted">
				{sub}
			</p>
		{/if}
	</Reveal>
</section>