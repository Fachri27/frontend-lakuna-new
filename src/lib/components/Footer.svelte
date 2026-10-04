<script lang="ts">
	import { page } from "$app/state";
	import { i18n } from "$lib/i18n.svelte";
	import SliceHeadline from "./SliceHeadline.svelte";
	import ImageStream from "./ImageStream.svelte";
	import ApiImage from "./ApiImage.svelte";
	import { fetchPhotos, imgFor } from "$lib/data";

	const c = $derived(i18n.c);

	// Identitas di kolom kiri footer. Isi `href` akun resmi; selama kosong,
	// ikonnya tetap tampil tapi belum mengarah ke mana pun.
	const ADDRESS = "Jl. Ayub No. 28 RT 11 / RW 01, Pejaten Barat, Pasar Minggu, Kota Jakarta Selatan, 12510";
	const SOCIAL: { name: string; href: string }[] = [
		{ name: "Facebook", href: "" },
		{ name: "X", href: "" },
		{ name: "Instagram", href: "" },
	];
	// Tujuan tautan footer. "Terms of use" menuju perjanjian lisensi — satu-satunya
	// halaman ketentuan yang ada. Sisanya belum punya halaman (tetap "#").
	const LINKS: Record<string, string> = {
		"About us": "/about",
		Ecotourism: "/ecotourism",
		Ekowisata: "/ecotourism",
		"Tentang kami": "/about",
		Contributor: "/contributor",
		Kontributor: "/contributor",
		Reviews: "/reviews",
		Ulasan: "/reviews",
		"Privacy policy": "/privacy",
		"Kebijakan privasi": "/privacy",
		"Cookie preferences": "/privacy#cookies",
		"Preferensi cookie": "/privacy#cookie",
		Help: "/help",
		Bantuan: "/help",
		FAQ: "/faq",
		"Customer service": "/customer-service",
		"Layanan pelanggan": "/customer-service",
		"Terms of use": "/license",
		"Ketentuan penggunaan": "/license",
	};
	// Koridor foto + tagline hanya milik landing — di halaman lain footer
	// langsung ke kolom.
	const isLanding = $derived(page.url.pathname === "/");

	// Koridor foto di balik tagline: foto arsip terbaru (thumbnail cukup —
	// kartu kecil di kejauhan, besar hanya sesaat sebelum keluar layar).
	let streamImages = $state<string[]>([]);
	$effect(() => {
		if (!isLanding) return;
		let alive = true;
		fetchPhotos({ type: "FOTO", limit: 12 })
			.then((r) => {
				if (alive) streamImages = r.photos.map((ph) => imgFor(ph.seed, 600, 800, ph.thumbUrl));
			})
			.catch(() => {});
		return () => {
			alive = false;
		};
	});
</script>

<!-- Tanpa garis atas: section di atas (etalase) larut ke --bg yang sama.
	Seluruh footer zona senyap: tak ada bunyi hover/klik di tautan mana pun. -->
<footer class="bg-bg" data-no-hover-sound data-no-click-sound>
	<div class="mx-auto max-w-[1500px] px-6 pb-6 pt-20 lg:px-10">
		<!-- Tagline besar di tengah koridor foto (khusus landing): dua rel foto
			arsip melaju dari titik hilang ke arah penonton, tagline (animasi
			huruf bergulirnya tetap) duduk di atasnya. -->
		{#if isLanding}
		<ImageStream images={streamImages} class="ft-stream">
			<div class="ft-stream-copy">
				<p class="font-display text-[1.05rem] font-bold uppercase leading-none tracking-[0.02em] text-safelight">{c.nav.tagline}</p>
				<div class="mt-3">
					<SliceHeadline
						lineA={c.footer.taglineA}
						smallA={c.footer.taglineEm}
						smallB={c.footer.taglineB.trim().split(/\s+/)[0] ?? ""}
						lineB={c.footer.taglineB.trim().split(/\s+/).slice(1).join(" ")}
					/>
				</div>
			</div>
		</ImageStream>
		{/if}

		<div class="rule mt-14"></div>

		<!-- Columns -->
		<div class="mt-12 grid grid-cols-2 gap-10 md:grid-cols-4">
			<div class="col-span-2 md:col-span-1">
				<ApiImage
					src="/logo1.png"
					alt="Lakuna"
					width={200}
					height={36}
					eager
					class="no-cvd h-7 w-auto max-w-[44vw] [filter:brightness(0)_invert(1)] sm:max-w-none"
				/>
				<address class="mt-5 max-w-[22rem] text-sm not-italic leading-relaxed text-fg-muted">{ADDRESS}</address>
				<ul class="mt-5 flex items-center gap-5" aria-label="Social media">
					{#each SOCIAL as s (s.name)}
						<li>
							<a
								href={s.href || "#"}
								aria-label={s.name}
								target={s.href ? "_blank" : undefined}
								rel={s.href ? "noopener noreferrer" : undefined}
								class="grid h-6 w-6 place-items-center text-fg-muted transition-colors hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-safelight"
							>
								{#if s.name === "Facebook"}
									<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M13.5 21v-8h2.7l.4-3.2h-3.1V7.8c0-.9.3-1.5 1.6-1.5h1.7V3.4c-.3 0-1.3-.1-2.4-.1-2.4 0-4 1.5-4 4.1v2.4H7.7V13h2.7v8h3.1Z" /></svg>
								{:else if s.name === "X"}
									<svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.8 3h3.1l-6.8 7.7L22 21h-6.2l-4.9-6.3L5.3 21H2.2l7.3-8.3L2 3h6.4l4.4 5.8L17.8 3Zm-1.1 16.2h1.7L7.4 4.7H5.5l11.2 14.5Z" /></svg>
								{:else}
									<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3.5" y="3.5" width="17" height="17" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.2" cy="6.8" r="0.9" fill="currentColor" stroke="none" /></svg>
								{/if}
							</a>
						</li>
					{/each}
				</ul>
			</div>

			{#each [{ title: c.footer.company, items: c.footer.companyItems }, { title: c.footer.legal, items: c.footer.legalItems }, { title: c.footer.support, items: c.footer.supportItems }] as col (col.title)}
				<div>
					<p class="ft-head">{col.title}</p>
					<ul class="mt-6 space-y-3">
						{#each col.items as it (it)}
							<li>
								<!-- Hover: panah ↗ tumbuh dari kiri & mendorong teks
									(rujukan). Lebar slot panah dianimasikan, bukan
									translate — teks ikut bergeser secara alami. -->
								<a href={LINKS[it] ?? "#"} class="ft-link text-[0.92rem] text-fg/80 transition-colors hover:text-safelight">
									<span class="ft-arr" aria-hidden="true">
										<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17 17 7M8 7h9v9" /></svg>
									</span>{it}
								</a>
							</li>
						{/each}
					</ul>
				</div>
			{/each}
		</div>

		<div class="rule mt-16"></div>

		<div class="mt-6 flex flex-col items-center justify-center gap-3 text-xs text-fg-muted">
			<p class="kicker text-center">{c.footer.rights}</p>
		</div>
	</div>
</footer>
<style>
	/* Koridor selebar layar (keluar dari padding kontainer), setinggi layar. */
	:global(.ft-stream) {
		/* Ringkas: koridor + kolom + baris hak cipta muat satu layar. */
		height: clamp(320px, 50svh, 540px);
		margin: 0 calc(50% - 50vw);
		width: 100vw;
		/* Pinggir larut ke latar footer supaya kartu yang keluar tak terpotong
		   garis keras di tepi section. */
		-webkit-mask-image: linear-gradient(to bottom, transparent, #000 12%, #000 88%, transparent);
		mask-image: linear-gradient(to bottom, transparent, #000 12%, #000 88%, transparent);
	}
	.ft-stream-copy {
		position: relative;
		z-index: 2;
		height: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: flex-start;
		text-align: center;
		/* Atas ditekan melewati zona fade topeng koridor (12%): kicker tidak
		   lagi redup/ketiban bayangan. */
		padding: clamp(3.5rem, 13svh, 7rem) 1.5rem 0;
	}
	/* Tagline di koridor lebih kecil dari ukuran bawaan SliceHeadline
	   (9,4vw) supaya kartu di kiri-kanan tetap terbaca sebagai koridor. */
	.ft-stream-copy :global(.sl) {
		font-size: clamp(1.8rem, 5vw, 4.5rem);
	}
	/* Genangan gelap lembut di belakang tagline: kartu yang lewat di tengah
	   tak pernah menabrak keterbacaan huruf. */
	.ft-stream-copy::before {
		content: "";
		position: absolute;
		inset: 18% 8%;
		z-index: -1;
		background: radial-gradient(ellipse at center, color-mix(in srgb, var(--bg) 92%, transparent) 0%, color-mix(in srgb, var(--bg) 70%, transparent) 45%, transparent 72%);
		pointer-events: none;
	}

	/* Kepala kolom: lebih besar dari kicker biasa supaya kolom punya jangkar. */
	.ft-head {
		margin: 0;
		font-family: var(--font-mono);
		font-size: clamp(0.85rem, 1.05vw, 1rem);
		font-weight: 600;
		letter-spacing: 0.22em;
		text-transform: uppercase;
		color: var(--fg-muted);
	}
	.ft-link {
		display: inline-flex;
		align-items: center;
	}
	/* Slot panah: lebar 0 saat diam; hover → melebar, panah muncul dari
	   kiri-bawah seperti rujukan, teks terdorong ke kanan. */
	.ft-arr {
		display: inline-flex;
		align-items: center;
		width: 0;
		overflow: hidden;
		flex-shrink: 0;
		transition: width 0.35s cubic-bezier(0.22, 1, 0.36, 1);
	}
	.ft-arr svg {
		flex-shrink: 0;
		opacity: 0;
		transform: translate(-6px, 6px) scale(0.6);
		transition:
			opacity 0.25s ease,
			transform 0.35s cubic-bezier(0.22, 1, 0.36, 1);
	}
	.ft-link:hover .ft-arr,
	.ft-link:focus-visible .ft-arr {
		width: 1.05em;
	}
	.ft-link:hover .ft-arr svg,
	.ft-link:focus-visible .ft-arr svg {
		opacity: 1;
		transform: none;
	}
	@media (prefers-reduced-motion: reduce) {
		.ft-arr,
		.ft-arr svg {
			transition: none;
		}
	}
</style>
