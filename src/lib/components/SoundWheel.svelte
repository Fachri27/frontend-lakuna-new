<script lang="ts">
	/**
	 * Hero halaman Sounds — roda sampul (acuan: coveomusic.com): sampul audio berbentuk kotak bersudut bulat,
	 * miring mengikuti lingkaran, mengelilingi piringan tengah. Roda berputar pelan mengikuti guliran; mengetuk
	 * sampul memutar pratinjaunya. Bahasa visual tetap Lakuna (tema gelap, safelight, huruf display situs).
	 */
	import { i18n } from "$lib/i18n.svelte";
	import { player } from "$lib/soundPlayer.svelte";
	import type { Sound } from "$lib/data";
	import ApiImage from "./ApiImage.svelte";

	let { sounds }: { sounds: Sound[] } = $props();

	const copy = {
		id: { title: "Lakuna Sounds", sub: "Arsip suara Nusantara", hint: "Ketuk sampul untuk memutar pratinjau", side: "Musik untuk para pejalan, pendengar sunyi, dan pencerita — latar bagi setiap momen Nusantara.", play: "Putar", pause: "Jeda", bg: "suara nusantara" },
		en: { title: "Lakuna Sounds", sub: "The archipelago's sound archive", hint: "Tap artwork to preview a sound", side: "Music for wanderers, quiet listeners, and storytellers — a backdrop for every moment of the archipelago.", play: "Play", pause: "Pause", bg: "sounds of nusantara" },
	};
	const lang = $derived(i18n.lang);
	const t = $derived(copy[lang]);

	let w = $state(1200);
	let h = $state(800);
	let rot = $state(0);
	const mobile = $derived(w < 640);
	// Selalu satu lingkaran penuh: sampul diulang bila audionya sedikit.
	const slots = $derived(mobile ? 14 : 20);
	const tile = $derived(Math.round(Math.max(58, Math.min(104, w * 0.07))));
	const rx = $derived(mobile ? w * 0.56 : Math.min(w * 0.4, 600));
	const ry = $derived(mobile ? h * 0.34 : Math.min(h * 0.36, 400));
	// Pusat sedikit di atas tengah: ruang untuk petunjuk di bawah.
	const cy = $derived(h * 0.47);

	// Jarak antar-sampul SAMA sepanjang keliling elips (bukan sama sudut — di elips lebar sampul menumpuk di sisi).
	const arc = $derived.by(() => {
		const N = 360;
		const cum = [0];
		let px = rx,
			py = 0,
			L = 0;
		for (let k = 1; k <= N; k++) {
			const th = (k / N) * Math.PI * 2;
			const x = rx * Math.cos(th),
				y = ry * Math.sin(th);
			L += Math.hypot(x - px, y - py);
			cum.push(L);
			px = x;
			py = y;
		}
		return { cum, L, N };
	});
	/** Sudut parameter elips untuk pecahan keliling 0–1. */
	function angleAt(frac: number): number {
		const { cum, L, N } = arc;
		const target = (((frac % 1) + 1) % 1) * L;
		let lo = 0,
			hi = N;
		while (lo < hi) {
			const mid = (lo + hi) >> 1;
			if (cum[mid]! < target) lo = mid + 1;
			else hi = mid;
		}
		const k = Math.max(1, lo);
		const seg = cum[k]! - cum[k - 1]! || 1;
		return ((k - 1 + (target - cum[k - 1]!) / seg) / N) * Math.PI * 2;
	}

	const ring = $derived(
		Array.from({ length: sounds.length ? slots : 0 }, (_, i) => {
			const s = sounds[i % sounds.length]!;
			// Mulai dari atas: 3/4 keliling (parameter 3π/2). JANGAN mengurangi π/2 dari parameternya — pada elips itu
			// membalik sebaran (rapat di sisi, renggang di atas-bawah).
			const th = angleAt(0.75 + i / slots + rot / 360);
			const ox = rx * Math.cos(th),
				oy = ry * Math.sin(th);
			return {
				key: i,
				s,
				x: w / 2 + ox - tile / 2,
				y: cy + oy - tile / 2,
				a: (Math.atan2(oy, ox) * 180) / Math.PI + 90,
			};
		})
	);

	// Putaran mengikuti guliran (dimatikan untuk pengguna yang memilih gerak minimal).
	$effect(() => {
		if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
		let raf = 0;
		const on = () => {
			cancelAnimationFrame(raf);
			raf = requestAnimationFrame(() => (rot = window.scrollY * 0.08));
		};
		on();
		window.addEventListener("scroll", on, { passive: true });
		return () => {
			cancelAnimationFrame(raf);
			window.removeEventListener("scroll", on);
		};
	});

	const current = $derived(player.track);
</script>

<section class="relative h-[max(40rem,100svh)] overflow-hidden">
	<!-- Bidang roda = di bawah navbar; titik tengahnya pusat roda. -->
	<div bind:clientWidth={w} bind:clientHeight={h} class="absolute inset-x-0 bottom-0 top-[calc(var(--banner-h,0px)+var(--nav-h))]">
	<!-- Teks besar samar di belakang roda. -->
	<p aria-hidden="true" class="pointer-events-none absolute left-1/2 top-[44%] -translate-x-1/2 -translate-y-1/2 -rotate-[8deg] select-none whitespace-nowrap font-display text-[clamp(4.5rem,15vw,14rem)] font-light italic leading-none tracking-[-0.04em] text-fg/[0.05]">
		{t.bg}
	</p>

	<!-- Teks tegak di sisi kiri (layar lebar). -->
	<p aria-hidden="true" class="pointer-events-none absolute bottom-24 left-6 hidden max-w-[22rem] origin-bottom-left -rotate-90 translate-x-4 text-[0.72rem] leading-relaxed text-fg-muted lg:block lg:left-10">
		{t.side}
	</p>

	<!-- Roda sampul -->
	<div class="absolute inset-0">
		{#each ring as r (r.key)}
			{@const on = current?.id === r.s.id}
			<button
				type="button"
				onclick={() => player.play(r.s, sounds)}
				aria-label={`${on && player.playing ? t.pause : t.play} — ${r.s.title[lang]}`}
				tabindex={r.key < sounds.length ? 0 : -1}
				class="group absolute left-0 top-0 will-change-transform focus-visible:outline-none"
				style:width={`${tile}px`}
				style:height={`${tile}px`}
				style:transform={`translate3d(${r.x}px, ${r.y}px, 0) rotate(${r.a}deg)`}
			>
				<span
					class={`relative block h-full w-full overflow-hidden rounded-[22%] bg-ocean shadow-[0_18px_40px_-18px_rgba(0,0,0,0.8)] transition-transform duration-500 ease-out group-hover:scale-[1.12] group-focus-visible:scale-[1.12] ${
						on ? "ring-2 ring-safelight ring-offset-2 ring-offset-bg" : ""
					}`}
				>
					{#if r.s.cover}
						<ApiImage src={r.s.cover} alt="" fill class="object-cover object-top" />
					{/if}
				</span>
			</button>
		{/each}
	</div>

	<!-- Piringan tengah -->
	<div class="pointer-events-none absolute inset-x-0 top-[47%] flex -translate-y-1/2 flex-col items-center px-6 text-center">
		<div
			class={`relative grid h-[clamp(6.5rem,11vw,9.5rem)] w-[clamp(6.5rem,11vw,9.5rem)] place-items-center overflow-hidden rounded-full bg-safelight shadow-[0_24px_70px_-20px_var(--safelight-glow)] ${
				current && player.playing ? "snd-spin" : ""
			}`}
		>
			{#if current?.cover}
				<ApiImage src={current.cover} alt="" fill class="object-cover object-top" />
				<span class="absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-bg ring-4 ring-bg/40"></span>
			{:else}
				<svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" class="text-ivory" aria-hidden="true"><path d="M3 10v4M7 7v10M11 4v16M15 8v8M19 11v2" /></svg>
			{/if}
		</div>
		<h1 class="mt-5 text-[0.95rem] font-semibold uppercase tracking-[0.08em] text-fg">{t.title}</h1>
		<p class="mt-1 text-[0.7rem] font-medium uppercase tracking-[0.12em] text-fg-muted">{t.sub}</p>
	</div>

	<p class="pointer-events-none absolute inset-x-0 bottom-5 text-center font-mono text-[0.72rem] tracking-[0.04em] text-fg-muted">{t.hint}</p>
	</div>
</section>

<style>
	.snd-spin {
		animation: snd-spin 9s linear infinite;
	}
	@keyframes snd-spin {
		to {
			transform: rotate(360deg);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.snd-spin {
			animation: none;
		}
	}
</style>
