<script lang="ts">
	import { i18n, type Lang } from "$lib/i18n.svelte";

	type Clause = { title: string; body: string[] };
	type LicenseType = { name: string; term: string; points: string[] };

	const copy: Record<Lang, {
		title: string; sub: string; version: string;
		typesTitle: string; typesNote: string; types: LicenseType[];
		clauses: Clause[]; railLabel: string; cta: string; ctaSub: string;
	}> = {
		id: {
			title: "Perjanjian Lisensi Konten Gambar",
			sub: "Ketentuan pemakaian setiap gambar yang kamu unduh dari Lakuna.",
			version: "Versi 2026.09, berlaku sejak 27 September 2026",
			typesTitle: "Jenis lisensi",
			typesNote: "Dipilih saat membayar dan dicetak di sertifikat PDF setiap unduhan.",
			types: [
				{ name: "Standar", term: "Sekali bayar", points: ["Berlaku selamanya, tanpa kedaluwarsa", "Satu foto, unduhan penuh tanpa watermark", "Untuk komersial & editorial, satu kursi pengguna"] },
				{ name: "Subscription", term: "Kuota bulanan", points: ["Unduh sebanyak kuota tiap bulan aktif", "Lisensi ikut masa langganan yang aktif", "Berhenti langganan, unduhan baru ikut berhenti"] },
			],
			clauses: [
				{ title: "Pemberian hak", body: ["Lakuna memberimu lisensi non-eksklusif dan tidak dapat dipindahtangankan untuk memakai aset sesuai jenis lisensi yang kamu bayar.", "Lisensi bukan jual-beli hak cipta: kamu membeli hak pakai, bukan kepemilikan foto."] },
				{ title: "Yang boleh", body: ["Iklan, situs, media sosial, kemasan, presentasi, dan pekerjaan klien — untuk Standar, selamanya; untuk Subscription, selama langganan aktif.", "Mengubah ukuran, memotong, dan mengolah warna untuk kebutuhan desainmu."] },
				{ title: "Yang dilarang", body: ["Menjual kembali atau membagikan ulang berkas sebagai produk mandiri (mis. dijual lagi sebagai stok foto).", "Membagikan berkas mentah ke pihak lain atau memindahkan lisensi tanpa izin tertulis.", "Memakai foto untuk merek dagang, logo, atau hal yang melanggar hukum dan mencemarkan nama.", "Menjadikan foto sebagai data latih model machine learning / AI generatif."] },
				{ title: "Kepemilikan", body: ["Hak cipta tetap sepenuhnya milik fotografer dan/atau Lakuna Foto.", "Kredit fotografer dihargai bila memungkinkan, terutama untuk pemakaian editorial."] },
				{ title: "Wilayah & masa berlaku", body: ["Berlaku di seluruh dunia.", "Standar: selamanya sejak pembayaran lunas. Subscription: mengikuti masa aktif langgananmu."] },
				{ title: "Jaminan & batas tanggung jawab", body: ["Aset diberikan apa adanya; Lakuna menjamin hak yang diberikan sah untuk dipakai.", "Tanggung jawab Lakuna terbatas pada nilai yang kamu bayarkan untuk aset tersebut."] },
				{ title: "Pengakhiran", body: ["Pelanggaran ketentuan menghentikan lisensimu; hapus berkas dan turunannya.", "Lisensi Standar yang sudah lunas tidak dapat ditarik kembali selama dipakai sesuai aturan."] },
				{ title: "Hukum yang berlaku", body: ["Perjanjian ini tunduk pada hukum Indonesia.", "Pertanyaan soal lisensi: hubungi kami sebelum memakai untuk kebutuhan khusus."] },
			],
			railLabel: "Daftar isi",
			cta: "Lihat paket",
			ctaSub: "Lisensi diterbitkan otomatis sebagai sertifikat PDF di setiap unduhan.",
		},
		en: {
			title: "Images Content License Agreement",
			sub: "The terms for using any image you download from Lakuna.",
			version: "Version 2026.09, effective September 27, 2026",
			typesTitle: "License types",
			typesNote: "Chosen at checkout and printed on the PDF certificate of every download.",
			types: [
				{ name: "Standard", term: "One-time payment", points: ["Perpetual, never expires", "One photo, full watermark-free download", "Commercial & editorial use, single seat"] },
				{ name: "Subscription", term: "Monthly quota", points: ["Download up to your quota each active month", "Licenses follow your active subscription", "Pause the plan, new downloads pause too"] },
			],
			clauses: [
				{ title: "Grant of rights", body: ["Lakuna grants you a non-exclusive, non-transferable license to use assets under the license type you paid for.", "A license is not a copyright sale: you buy usage rights, not ownership of the photo."] },
				{ title: "Permitted uses", body: ["Ads, websites, social, packaging, decks, and client work — forever for Standard, while subscribed for Subscription.", "Resizing, cropping, and color work to fit your design."] },
				{ title: "Prohibited uses", body: ["Reselling or redistributing files as standalone products (e.g. resold as stock).", "Sharing raw files with others or transferring the license without written permission.", "Trademark, logo, unlawful, or defamatory use.", "Using photos as training data for machine learning / generative AI models."] },
				{ title: "Ownership", body: ["Copyright stays fully with the photographer and/or Lakuna Foto.", "Photographer credit is appreciated where possible, especially editorial use."] },
				{ title: "Territory & term", body: ["Worldwide.", "Standard: perpetual once settled. Subscription: follows your active subscription term."] },
				{ title: "Warranty & liability", body: ["Assets are provided as-is; Lakuna warrants the granted rights are valid for use.", "Lakuna's liability is limited to what you paid for the asset."] },
				{ title: "Termination", body: ["Breach ends your license; delete the files and derivatives.", "A settled Standard license cannot be revoked while used within these terms."] },
				{ title: "Governing law", body: ["This agreement is governed by the laws of Indonesia.", "Unsure about a special use? Ask us before you publish."] },
			],
			railLabel: "Contents",
			cta: "View plans",
			ctaSub: "Licenses are issued automatically as PDF certificates on every download.",
		},
	};

	const lang = $derived<Lang>(i18n.lang);
	const t = $derived(copy[lang]);

	let active = $state(1);
	let bodyEl: HTMLElement | undefined = $state();

	// Penanda pasal yang sedang dibaca di daftar isi: satu-satunya gerak di halaman,
	// dan ia menjawab aksi membaca (menggulir).
	$effect(() => {
		const root = bodyEl;
		if (!root) return;
		const sections = Array.from(root.querySelectorAll<HTMLElement>("[data-clause]"));
		if (!sections.length) return;
		const io = new IntersectionObserver(
			(entries) => {
				for (const e of entries) {
					if (e.isIntersecting) active = Number((e.target as HTMLElement).dataset.clause) || active;
				}
			},
			{ rootMargin: "-25% 0px -60% 0px" },
		);
		sections.forEach((s) => io.observe(s));
		return () => io.disconnect();
	});
</script>

<div class="lic bg-bg text-fg">
	<div class="lic-wrap">
		<!-- Daftar isi: menempel di kiri sejak judul; hanya ada di layar lebar. -->
		<aside class="lic-rail" aria-label={t.railLabel}>
			<nav>
				<p class="lic-rail__label">{t.railLabel}</p>
				<ol>
					{#each t.clauses as c, i (c.title)}
						<li>
							<a href={`#pasal-${i + 1}`} class="lic-rail__link" aria-current={active === i + 1 ? "location" : undefined}>
								<span class="lic-rail__num">{i + 1}</span>{c.title}
							</a>
						</li>
					{/each}
				</ol>
			</nav>
		</aside>

		<div class="lic-main">
			<header>
				<h1 class="lic-title">{t.title}</h1>
				<p class="lic-sub">{t.sub}</p>
				<p class="lic-version">{t.version}</p>
			</header>

			<!-- Dua jenis lisensi: perbandingan dua kolom, bukan kartu. -->
			<section class="lic-types" aria-labelledby="lic-types-h">
				<h2 id="lic-types-h" class="lic-h2">{t.typesTitle}</h2>
				<p class="lic-note">{t.typesNote}</p>
				<div class="lic-types__grid">
					{#each t.types as ty (ty.name)}
						<div class="lic-type">
							<div class="lic-type__head">
								<h3>{ty.name}</h3>
								<span>{ty.term}</span>
							</div>
							<ul>
								{#each ty.points as pt (pt)}
									<li>{pt}</li>
								{/each}
							</ul>
						</div>
					{/each}
				</div>
			</section>

			<div bind:this={bodyEl} class="lic-clauses">
				{#each t.clauses as c, i (c.title)}
					<section data-clause={i + 1} id={`pasal-${i + 1}`} class="lic-clause" aria-labelledby={`pasal-${i + 1}-h`}>
						<h2 id={`pasal-${i + 1}-h`} class="lic-h2"><span class="lic-clause__num">{i + 1}.</span>{c.title}</h2>
						<div class="lic-clause__body">
							{#each c.body as p (p)}
								<p>{p}</p>
							{/each}
						</div>
					</section>
				{/each}
			</div>

			<footer class="lic-foot">
				<p>{t.ctaSub}</p>
				<a href="/pricing" class="lic-foot__link">{t.cta}</a>
			</footer>
		</div>
	</div>
</div>

<style>
	.lic {
		min-height: 100vh;
	}
	.lic-wrap {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		max-width: 1400px;
		margin: 0 auto;
		padding: calc(var(--banner-h, 0px) + var(--nav-h) + 2.5rem) clamp(1.25rem, 4vw, 4rem) 7rem;
	}
	@media (min-width: 1024px) {
		.lic-wrap {
			grid-template-columns: 15rem minmax(0, 1fr);
			column-gap: clamp(4rem, 8vw, 9rem);
			padding-top: calc(var(--banner-h, 0px) + var(--nav-h) + 4rem);
		}
	}

	/* ── Daftar isi ───────────────────────────────────────────────── */
	.lic-rail {
		display: none;
	}
	@media (min-width: 1024px) {
		.lic-rail {
			display: block;
		}
		.lic-rail nav {
			position: sticky;
			top: calc(var(--banner-h, 0px) + var(--nav-h) + 2rem);
		}
	}
	.lic-rail__label {
		margin-bottom: 0.9rem;
		font-size: 0.8rem;
		color: var(--fg-muted);
	}
	.lic-rail ol {
		margin: 0;
		padding: 0;
		list-style: none;
		border-left: 1px solid var(--hair);
	}
	.lic-rail__link {
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
	.lic-rail__num {
		min-width: 0.9rem;
		font-variant-numeric: tabular-nums;
		opacity: 0.7;
	}
	.lic-rail__link:hover {
		color: var(--fg);
	}
	.lic-rail__link[aria-current="location"] {
		color: var(--fg);
		border-left-color: var(--safelight);
	}
	.lic-rail__link:focus-visible,
	.lic-foot__link:focus-visible {
		outline: 2px solid var(--safelight);
		outline-offset: 3px;
		border-radius: 2px;
	}

	/* ── Kepala dokumen ───────────────────────────────────────────── */
	.lic-title {
		max-width: 26ch;
		text-wrap: balance;
		font-family: var(--font-display);
		font-size: clamp(2.2rem, 4.6vw, 4rem);
		font-weight: 300;
		line-height: 1.08;
		letter-spacing: -0.02em;
		color: var(--fg);
	}
	.lic-sub {
		margin-top: 1.25rem;
		max-width: 60ch;
		font-size: 1.15rem;
		line-height: 1.65;
		color: var(--fg-muted);
	}
	.lic-version {
		margin-top: 0.9rem;
		font-size: 0.85rem;
		color: var(--fg-muted);
		opacity: 0.8;
	}

	/* ── Jenis lisensi ────────────────────────────────────────────── */
	.lic-types {
		margin-top: 3.5rem;
		padding-top: 2rem;
		border-top: 1px solid var(--hair);
	}
	.lic-h2 {
		font-family: var(--font-display);
		font-size: 1.3rem;
		font-weight: 500;
		line-height: 1.3;
		color: var(--fg);
	}
	.lic-note {
		margin-top: 0.4rem;
		max-width: 70ch;
		font-size: 0.97rem;
		line-height: 1.6;
		color: var(--fg-muted);
	}
	.lic-types__grid {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		margin-top: 1.75rem;
		border-top: 1px solid var(--hair);
	}
	@media (min-width: 640px) {
		.lic-types__grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
		.lic-type + .lic-type {
			padding-left: 2.5rem;
			border-left: 1px solid var(--hair);
		}
		.lic-type:first-child {
			padding-right: 2.5rem;
		}
	}
	.lic-type {
		padding: 1.5rem 0;
	}
	.lic-type__head {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		justify-content: space-between;
		gap: 0.25rem 1rem;
	}
	.lic-type__head h3 {
		font-family: var(--font-display);
		font-size: 1.1rem;
		font-weight: 500;
		color: var(--fg);
	}
	.lic-type__head span {
		font-size: 0.85rem;
		color: var(--fg-muted);
	}
	.lic-type ul {
		margin: 1rem 0 0;
		padding: 0;
		list-style: none;
	}
	.lic-type li {
		position: relative;
		padding-left: 1.2rem;
		font-size: 1rem;
		line-height: 1.6;
		color: color-mix(in srgb, var(--fg) 82%, transparent);
	}
	.lic-type li + li {
		margin-top: 0.5rem;
	}
	.lic-type li::before {
		content: "–";
		position: absolute;
		left: 0;
		color: var(--fg-muted);
	}

	/* ── Pasal ────────────────────────────────────────────────────── */
	.lic-clauses {
		margin-top: 1rem;
	}
	.lic-clause {
		padding-top: 2.25rem;
		margin-top: 2.25rem;
		border-top: 1px solid var(--hair);
		scroll-margin-top: calc(var(--banner-h, 0px) + var(--nav-h) + 1.5rem);
	}
	.lic-clause__num {
		display: inline-block;
		min-width: 1.9rem;
		font-variant-numeric: tabular-nums;
		color: var(--fg-muted);
	}
	.lic-clause__body {
		margin-top: 0.9rem;
		max-width: 64ch;
	}
	.lic-clause__body p {
		font-size: 1.02rem;
		line-height: 1.75;
		color: color-mix(in srgb, var(--fg) 80%, transparent);
	}
	.lic-clause__body p + p {
		margin-top: 0.8rem;
	}

	/* ── Penutup ──────────────────────────────────────────────────── */
	.lic-foot {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		justify-content: space-between;
		gap: 0.75rem 2rem;
		margin-top: 3.5rem;
		padding-top: 1.75rem;
		border-top: 1px solid var(--hair);
		font-size: 0.92rem;
		color: var(--fg-muted);
	}
	.lic-foot__link {
		color: var(--fg);
		text-decoration: underline;
		text-decoration-color: color-mix(in srgb, var(--fg) 35%, transparent);
		text-underline-offset: 0.35em;
		transition: text-decoration-color 0.2s ease, color 0.2s ease;
	}
	.lic-foot__link:hover {
		color: var(--safelight);
		text-decoration-color: var(--safelight);
	}
</style>
