<script lang="ts">
	import type { Snippet } from "svelte";

	/**
	 * Koridor gambar — port Svelte dari `ImageStreamHero` (React). Dua rel
	 * kartu melaju dari jauh di belakang layar ke arah penonton. Proyeksi
	 * perspektif sendiri yang membuat kartu membesar SEKALIGUS menyapu keluar
	 * dari titik hilang, karena posisi & ukuran diskalakan faktor yang sama.
	 *
	 *  1. Kedalaman ditulis sebagai UKURAN TAMPAK geometris: tiap kartu lebih
	 *     besar dengan rasio tetap dari yang di belakangnya → pita tak robek.
	 *  2. Rel membuka keras di awal lalu menahan (`fan` > 1): pita keluar dari
	 *     tengah sebagai pita datar, menekuk sekali, lalu lari diagonal.
	 *  3. Kedua ujung loop tak pernah di layar: kartu lahir MENYEBERANG sumbu
	 *     (`railBirth` negatif) sehingga tengah selalu tertutup, dan mati
	 *     setelah tepi dalamnya lewat 50cqw.
	 *
	 * Semua panjang dalam `cqw` (persen lebar wadah) → proporsi sama di ukuran
	 * apa pun. Nilai bawaan = nilai asli komponen rujukan.
	 */
	type Path = {
		perspective: number;
		cardWidth: number;
		cardHeight: number;
		cardRadius: number;
		birthHeight: number;
		exitHeight: number;
		railBirth: number;
		railExit: number;
		fan: number;
		turnBirth: number;
		turnExit: number;
		stops: number;
	};
	const PATH: Path = {
		perspective: 30,
		cardWidth: 18,
		cardHeight: 25,
		cardRadius: 0.4,
		birthHeight: 2.6,
		exitHeight: 46,
		railBirth: -11,
		railExit: 44,
		fan: 3.3,
		turnBirth: 6,
		turnExit: 28,
		stops: 24,
	};

	let {
		images,
		cards = 9,
		speed = 18,
		axis = 55,
		path = {},
		class: className = "",
		children,
	}: {
		images: string[];
		cards?: number;
		speed?: number;
		axis?: number;
		path?: Partial<Path>;
		class?: string;
		children?: Snippet;
	} = $props();

	const rawId = $props.id();
	const uid = rawId.replace(/[^a-zA-Z0-9]/g, "");
	const right = `ish-r-${uid}`;
	const left = `ish-l-${uid}`;
	const cardCls = `ish-c-${uid}`;
	const p = $derived({ ...PATH, ...path });

	/** Sampel lintasan sekali → keyframes CSS menelusuri kurva sebenarnya. */
	function keyframes(dir: 1 | -1, name: string, q: Path) {
		const steps: string[] = [];
		for (let s = 0; s <= q.stops; s++) {
			const u = s / q.stops;
			const scale = (q.birthHeight / q.cardHeight) * Math.pow(q.exitHeight / q.birthHeight, u);
			const z = q.perspective * (1 - 1 / scale);
			const rail = q.railExit - (q.railExit - q.railBirth) * Math.pow(1 - u, q.fan);
			const turn = q.turnBirth + (q.turnExit - q.turnBirth) * u;
			steps.push(
				`${(u * 100).toFixed(2)}%{transform:translate3d(${(dir * rail).toFixed(2)}cqw,0,${z.toFixed(2)}cqw) rotateY(${(-dir * turn).toFixed(2)}deg)}`,
			);
		}
		return `@keyframes ${name}{${steps.join("")}}`;
	}
	// Dijeda (bukan dimatikan) saat hemat gerak: tiap kartu sudah "dijatuhkan"
	// di tengah lintasan oleh delay negatif, jadi membeku sebagai foto utuh.
	const css = $derived(
		`${keyframes(1, right, p)}${keyframes(-1, left, p)}` +
			`@media(prefers-reduced-motion:reduce){.${cardCls}{animation-play-state:paused}}`,
	);
	const slots = $derived(Array.from({ length: cards }, (_, i) => i));
</script>

<svelte:head>
	{@html `<style>${css}</style>`}
</svelte:head>

<div class="ish {className}" style="container-type: inline-size">
	<div
		class="ish-view"
		aria-hidden="true"
		style={`perspective:${p.perspective}cqw;perspective-origin:50% ${axis}%`}
	>
		<div class="ish-world">
			{#each [right, left] as name (name)}
				{#each slots as i (i)}
					{@const src = images.length ? images[i % images.length] : ""}
					<div
						class="{cardCls} ish-card"
						style={`top:${axis}%;width:${p.cardWidth}cqw;height:${p.cardHeight}cqw;` +
							`margin-left:${-p.cardWidth / 2}cqw;margin-top:${-p.cardHeight / 2}cqw;` +
							`border-radius:${p.cardRadius}cqw;animation:${name} ${speed}s linear infinite;` +
							`animation-delay:${-(i * speed) / cards}s`}
					>
						{#if src}
							<img {src} alt="" loading="lazy" decoding="async" draggable="false" />
						{/if}
					</div>
				{/each}
			{/each}
		</div>
	</div>
	{@render children?.()}
</div>

<style>
	.ish {
		position: relative;
		overflow: hidden;
	}
	.ish-view {
		position: absolute;
		inset: 0;
		pointer-events: none;
	}
	.ish-world {
		position: absolute;
		inset: 0;
		transform-style: preserve-3d;
	}
	.ish-card {
		position: absolute;
		left: 50%;
		overflow: hidden;
		backface-visibility: hidden;
		background: #16171a;
	}
	.ish-card img {
		display: block;
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
</style>
