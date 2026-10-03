<script lang="ts">
	import { page } from "$app/state";
	import { onMount } from "svelte";

	// Port Svelte dari komponen 404 (page-not-found.tsx di front-lakuna):
	// lingkaran putih memenuhi layar, tokoh garis berlari lewat, lalu pesan muncul.
	// SVG disimpan lokal di static/404 — CSP situs memblokir CDN luar.
	const FIG = (id: string) => `/404/${id.slice(0, 8)}.svg`;
	const A = FIG("54f366bdbf75b7a2d3b9f2264c3ada12aefcaf6e6a467bcecc856ffcd686e52e");
	const FIGURES: { top?: string; bottom?: string; src: string; transform?: string; speedX: number; spin?: number }[] = [
		{ top: "0%", src: A, transform: "rotateZ(-90deg)", speedX: 1500 },
		{ top: "10%", src: FIG("7e48603d6fd3fac9720b25b4b6a06d107feea2d21ef8fa0720921808b9808514"), speedX: 3000, spin: 2000 },
		{ top: "20%", src: FIG("4fd3a604a36cc8811c341ef3221010ed11e2563d4add29901922d7464c28c186"), speedX: 5000, spin: 1000 },
		{ top: "25%", src: A, speedX: 2500, spin: 1500 },
		{ top: "35%", src: A, speedX: 2000, spin: 300 },
		{ bottom: "5%", src: FIG("668d66f4c4d1dbc5c421692b4e5ad644c0f11f0327da214bcae21f78816c6b2f"), speedX: 0 },
	];

	const is404 = $derived(page.status === 404);
	const title = $derived(is404 ? "Page Not Found" : "Something went wrong");
	const code = $derived(String(page.status || 500));
	const body = $derived(
		is404
			? "The page you are looking for might have been removed, had its name changed, or is temporarily unavailable."
			: (page.error?.message ?? "An unexpected error occurred. Please try again."),
	);

	let canvas: HTMLCanvasElement;
	let chars: HTMLDivElement;
	let visible = $state(false);

	onMount(() => {
		const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
		if (reduced) {
			visible = true;
			return;
		}
		const timer = setTimeout(() => (visible = true), 1200);

		FIGURES.forEach((f, i) => {
			const img = document.createElement("img");
			img.alt = "";
			img.src = f.src;
			Object.assign(img.style, { position: "absolute", width: "18%", height: "18%", filter: "hue-rotate(265deg) saturate(0.9)" });
			if (f.top) img.style.top = f.top;
			if (f.bottom) img.style.bottom = f.bottom;
			if (f.transform) img.style.transform = f.transform;
			chars.appendChild(img);
			if (i === 5) return;
			img.animate([{ left: "100%" }, { left: "-20%" }], { duration: f.speedX, easing: "linear", fill: "forwards" });
			if (i === 0 || !f.spin) return;
			img.animate([{ transform: "rotate(0deg)" }, { transform: "rotate(-360deg)" }], {
				duration: f.spin,
				iterations: Infinity,
				easing: "linear",
			});
		});

		// Warna lingkaran dibaca dari token tema (permukaan --paper).
		const fill = getComputedStyle(document.documentElement).getPropertyValue("--paper").trim() || "#16181c";
		let circles: { x: number; y: number; r: number }[] = [];
		let tick = 0;
		let raf = 0;
		const init = () => {
			circles = Array.from({ length: 300 }, () => ({
				x: Math.random() * canvas.width * 1.3 + canvas.width * 0.9,
				y: Math.random() * canvas.height * 1.2 - canvas.height * 0.2,
				r: canvas.width / 1000,
			}));
		};
		const draw = () => {
			const ctx = canvas.getContext("2d");
			if (!ctx) return;
			tick++;
			const dx = canvas.width / 80;
			const g = canvas.width / 1000;
			ctx.clearRect(0, 0, canvas.width, canvas.height);
			ctx.fillStyle = fill;
			for (const c of circles) {
				ctx.beginPath();
				if (tick < 65) {
					c.x -= dx;
					c.r += g;
				} else if (tick < 500) {
					c.x -= dx * 0.02;
					c.r += g * 0.2;
				}
				ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
				ctx.fill();
			}
			if (tick <= 500) raf = requestAnimationFrame(draw);
		};
		const start = () => {
			cancelAnimationFrame(raf);
			canvas.width = innerWidth;
			canvas.height = innerHeight;
			tick = 0;
			init();
			draw();
		};
		start();
		addEventListener("resize", start);
		return () => {
			clearTimeout(timer);
			cancelAnimationFrame(raf);
			removeEventListener("resize", start);
		};
	});
</script>

<svelte:head>
	<title>{code} — {title} | Lakuna</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="nf" class:is-static={!visible}>
	<canvas bind:this={canvas} class="nf-canvas"></canvas>
	<div bind:this={chars} class="nf-chars" aria-hidden="true"></div>
	<div class="nf-msg">
		<div class="nf-in" class:on={visible}>
			<h1 class="nf-title">{title}</h1>
			<p class="nf-code">{code}</p>
			<p class="nf-body">{body}</p>
			<div class="nf-actions">
				<button type="button" class="nf-btn nf-btn--ghost" onclick={() => history.back()}>
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m12 19-7-7 7-7" /><path d="M19 12H5" /></svg>
					Go Back
				</button>
				<a href="/" class="nf-btn nf-btn--solid">
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
					Go Home
				</a>
			</div>
		</div>
	</div>
</div>

<style>
	.nf {
		position: fixed;
		inset: 0;
		z-index: 300;
		background: var(--bg, #0c0d0f);
		overflow: hidden;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	/* Gerak dikurangi: latar putih langsung, tanpa animasi. */
	@media (prefers-reduced-motion: reduce) {
		.nf { background: var(--paper, #16181c); }
		.nf-canvas, .nf-chars { display: none; }
	}
	.nf-canvas { width: 100%; height: 100%; }
	.nf-chars { position: absolute; width: 99%; height: 95%; pointer-events: none; }
	.nf-msg {
		position: absolute;
		width: 90%;
		height: 90%;
		z-index: 2;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.nf-in { display: flex; flex-direction: column; align-items: center; opacity: 0; transition: opacity 0.5s; color: var(--fg, #f1efe9); text-align: center; }
	.nf-in.on { opacity: 1; }
	.nf-title { font-size: 35px; font-weight: 600; margin: 1%; }
	.nf-code { font-size: 80px; font-weight: 700; line-height: 1.1; margin: 1%; color: var(--safelight); text-shadow: 0 0 40px var(--safelight-glow-soft); }
	.nf-body { font-size: 15px; max-width: 34rem; margin: 1%; color: var(--fg-muted, #9aa0a6); }
	.nf-actions { display: flex; gap: 1.5rem; margin-top: 2rem; flex-wrap: wrap; justify-content: center; }
	.nf-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 1.5rem;
		font-size: 1rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.3s ease-in-out;
	}
	.nf-btn:hover { transform: scale(1.05); }
	.nf-btn:focus-visible { outline: 2px solid var(--safelight); outline-offset: 3px; }
	.nf-btn--ghost { color: var(--fg); border: 2px solid var(--hair, rgba(241,239,233,0.3)); background: transparent; }
	.nf-btn--ghost:hover { border-color: var(--safelight); color: var(--safelight); }
	.nf-btn--solid { background: var(--safelight); color: #fff; border: 2px solid var(--safelight); box-shadow: 0 10px 30px -10px var(--safelight-glow); }
	.nf-btn--solid:hover { background: var(--safelight-lamp, var(--safelight)); border-color: var(--safelight-lamp, var(--safelight)); }
	@media (max-width: 640px) {
		.nf-title { font-size: 26px; }
		.nf-code { font-size: 60px; }
	}
</style>
