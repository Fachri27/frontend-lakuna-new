<script lang="ts">
	import { i18n, type Lang } from "$lib/i18n.svelte";
	import type { Clause } from "./ClauseDoc.svelte";

	const copy: Record<Lang, { title: string; sub: string; searchPh: string; clear: string; topics: string; clauses: Clause[]; stuck: string; faq: string; service: string; or: string; noHit: string; unit: string }> = {
		id: {
			title: "Bantuan",
			sub: "Panduan langkah demi langkah untuk hal yang paling sering ditanyakan.",
			searchPh: "Cari panduan…",
			clear: "Hapus",
			topics: "Topik populer",
			clauses: [
				{
					id: "beli-satu",
					title: "Membeli satu bingkai",
					steps: [
						"Buka foto atau video yang kamu mau.",
						"Di bagian Jenis pakai, pilih Standar.",
						"Pilih Beli sekarang.",
						"Pilih metode pembayaran dan bayar.",
						"Setelah lunas, berkas dan sertifikat lisensinya ada di profilmu, di Unduhan Saya.",
					],
				},
				{
					id: "langganan",
					title: "Berlangganan kuota bulanan",
					steps: [
						"Buka foto mana pun lalu pilih Premium, atau buka halaman Harga.",
						"Pilih Tahunan atau Bulanan, lalu pilih paket.",
						"Pilih Berlangganan dan bayar.",
						"Begitu pembayaran terkonfirmasi, langgananmu aktif dan kuota unduhan bulanan bisa dipakai.",
					],
				},
				{
					id: "unduh",
					title: "Mengunduh berkas dan sertifikat lisensi",
					steps: [
						"Masuk ke akunmu.",
						"Buka profilmu dan pilih Unduhan Saya.",
						"Pilih Unduh penuh untuk berkas tanpa watermark, atau Lisensi PDF untuk sertifikat lisensinya.",
					],
				},
				{
					id: "voucher",
					title: "Memakai kode voucher",
					steps: [
						"Buka halaman Harga dan pilih paket yang kamu mau.",
						"Isi kode di kolom Kode voucher, lalu pilih Pakai.",
						"Diskon terbesar antara diskon event dan voucher dipakai otomatis. Untuk langganan, voucher berlaku saat kamu bayar di muka (Tahunan).",
					],
				},
				{
					id: "tampilan",
					title: "Mengubah bahasa dan aksesibilitas",
					steps: [
						"Ganti bahasa lewat tombol EN/ID di bilah atas.",
						"Buka tombol aksesibilitas di pojok kanan bawah untuk mengatur ukuran teks, kontras, gerakan, dan mode warna.",
					],
				},
			],
			stuck: "Belum ketemu jawabannya?",
			faq: "Lihat pertanyaan umum",
			service: "hubungi layanan pelanggan",
			or: "atau",
			noHit: "Tidak ada panduan yang cocok. Coba kata lain.",
			unit: "langkah",
		},
		en: {
			title: "Help",
			sub: "Step-by-step guides for the things people ask about most.",
			searchPh: "Search guides…",
			clear: "Clear",
			topics: "Popular topics",
			clauses: [
				{
					id: "buy-one",
					title: "Buy a single frame",
					steps: [
						"Open the photo or video you want.",
						"Under Usage, choose Standard.",
						"Select Buy now.",
						"Pick a payment method and pay.",
						"Once paid, the file and its license certificate are in your profile under My Downloads.",
					],
				},
				{
					id: "subscribe",
					title: "Subscribe for a monthly quota",
					steps: [
						"Open any photo and choose Premium, or open the Pricing page.",
						"Choose Annual or Monthly, then pick a plan.",
						"Select Subscribe and pay.",
						"As soon as the payment is confirmed, your subscription is active and your monthly download quota is ready to use.",
					],
				},
				{
					id: "download",
					title: "Download your files and license certificate",
					steps: [
						"Sign in to your account.",
						"Open your profile and choose My Downloads.",
						"Select Download full for the watermark-free file, or License PDF for the license certificate.",
					],
				},
				{
					id: "voucher",
					title: "Use a voucher code",
					steps: [
						"Open the Pricing page and pick the plan you want.",
						"Enter the code in the Voucher code field, then select Apply.",
						"The larger of the event discount and the voucher is applied automatically. For subscriptions, a voucher applies when you pay upfront (Annual).",
					],
				},
				{
					id: "display",
					title: "Change language and accessibility",
					steps: [
						"Switch language with the EN/ID button in the top bar.",
						"Open the accessibility button at the bottom right to adjust text size, contrast, motion, and color vision.",
					],
				},
			],
			stuck: "Didn't find the answer?",
			faq: "See the FAQ",
			service: "contact customer service",
			or: "or",
			noHit: "No matching guides. Try another keyword.",
			unit: "steps",
		},
	};

	const lang = $derived<Lang>(i18n.lang);
	const t = $derived(copy[lang]);

	// Ikon garis per topik — urutan mengikuti clauses.
	const ICONS = [
		'<path d="M3 3h2l2.4 12.5a2 2 0 0 0 2 1.5h7.2a2 2 0 0 0 2-1.5L21 7H6" /><circle cx="9" cy="20" r="1.3" /><circle cx="18" cy="20" r="1.3" />',
		'<path d="M21 12a9 9 0 1 1-2.6-6.4" /><path d="M21 3v6h-6" />',
		'<path d="M12 4v12M7 11l5 5 5-5M4 20h16" />',
		'<path d="M3 9V7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2.5 2.5 0 0 0 0 5v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2.5 2.5 0 0 0 0-5z" /><path d="M14 5v2M14 11v2M14 17v2" />',
		'<circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="3" />',
	];

	let q = $state("");
	/** Satu artikel terbuka dalam satu waktu, ala pusat bantuan. */
	let openId = $state<string | null>(null);

	const norm = (c: Clause, i: number) => ({
		id: c.id ?? `topik-${i + 1}`,
		title: c.title,
		steps: c.steps ?? [],
	});

	const hits = $derived.by(() => {
		const list = t.clauses.map(norm);
		const n = q.trim().toLowerCase();
		if (!n) return list;
		return list.filter((c) =>
			c.title.toLowerCase().includes(n) || c.steps.some((s) => s.toLowerCase().includes(n)),
		);
	});

	// Tautan dalam (#id-panduan) membuka artikelnya langsung.
	$effect(() => {
		const id = location.hash.replace("#", "");
		if (id && t.clauses.some((c) => c.id === id)) openId = id;
	});

	function pick(id: string) {
		openId = openId === id ? null : id;
		if (openId) {
			history.replaceState(null, "", `#${id}`);
			requestAnimationFrame(() =>
				document.getElementById(`help-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" }),
			);
		} else {
			history.replaceState(null, "", location.pathname);
		}
	}
</script>

<div class="hp mx-auto w-full max-w-[1100px] px-6 pb-24 pt-[calc(var(--banner-h,0px)+var(--nav-h)+2rem)] lg:px-10">
	<!-- Hero search ala pusat bantuan: satu pertanyaan, satu kolom cari. -->
	<div class="mx-auto max-w-2xl text-center">
		<h1 class="font-display text-[clamp(2.2rem,5vw,3.6rem)] font-light leading-[1.02] tracking-[-0.02em] text-fg">{t.title}</h1>
		<p class="mx-auto mt-4 max-w-[52ch] text-[1.02rem] leading-relaxed text-fg-muted">{t.sub}</p>
		<div class="hp-search mt-8" role="search">
			<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
			<input
				type="search"
				bind:value={q}
				placeholder={t.searchPh}
				aria-label={t.searchPh}
				class="hp-search__input"
			/>
			{#if q}
				<button type="button" onclick={() => (q = "")} class="hp-search__clear" aria-label={t.clear}>×</button>
			{/if}
		</div>
	</div>

	<!-- Kartu topik populer: pintu masuk tiap panduan. -->
	<h2 class="hp-h mt-16">{t.topics}</h2>
	<div class="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
		{#each hits as c, i (c.id)}
			<button
				type="button"
				onclick={() => pick(c.id)}
				aria-expanded={openId === c.id}
				aria-controls={`help-${c.id}`}
				class="hp-card {openId === c.id ? "is-open" : ""}"
			>
				<span class="hp-card__icon" aria-hidden="true">
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">{@html ICONS[i % ICONS.length]}</svg>
				</span>
				<span class="hp-card__title">{c.title}</span>
				<span class="hp-card__meta">{c.steps.length} {t.unit}</span>
				<span class="hp-card__plus" aria-hidden="true">{openId === c.id ? "−" : "+"}</span>
			</button>
		{:else}
			<p class="col-span-full py-8 text-center text-sm text-fg-muted">{t.noHit}</p>
		{/each}
	</div>

	<!-- Artikel terbuka: langkah bernomor di bawah kartu pilihannya. -->
	{#if openId && hits.some((c) => c.id === openId)}
		{@const c = hits.find((x) => x.id === openId)!}
		<article id={`help-${c.id}`} class="hp-article" aria-label={c.title}>
			<h3 class="font-display text-2xl font-light tracking-[-0.01em] text-fg">{c.title}</h3>
			<ol class="hp-steps">
				{#each c.steps as s, i (i)}
					<li><span class="hp-steps__num">{i + 1}</span><span>{s}</span></li>
				{/each}
			</ol>
		</article>
	{/if}

	<p class="help-foot">
		{t.stuck}
		<a href="/faq" class="cd-link">{t.faq}</a> {t.or} <a href="/customer-service" class="cd-link">{t.service}</a>.
	</p>
</div>

<style>
	.hp-h {
		font-family: var(--font-mono);
		font-size: 0.72rem;
		letter-spacing: 0.22em;
		text-transform: uppercase;
		color: var(--safelight);
	}
	/* Kolom cari besar — pil bergaris, ikon + tombol hapus di dalam. */
	.hp-search {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0 1.25rem;
		height: 3.5rem;
		border-radius: 999px;
		border: 1px solid var(--hair);
		background: color-mix(in srgb, var(--fg) 4%, transparent);
		color: var(--fg-muted);
		transition: border-color 0.25s;
	}
	.hp-search:focus-within {
		border-color: var(--safelight);
		color: var(--safelight);
	}
	.hp-search__input {
		flex: 1;
		min-width: 0;
		background: transparent;
		border: 0;
		outline: none;
		color: var(--fg);
		font-size: 1rem;
	}
	.hp-search__input::placeholder {
		color: var(--fg-muted);
		opacity: 0.7;
	}
	.hp-search__input::-webkit-search-cancel-button {
		display: none;
	}
	.hp-search__clear {
		display: grid;
		place-items: center;
		width: 1.75rem;
		height: 1.75rem;
		border-radius: 999px;
		font-size: 1.1rem;
		line-height: 1;
		color: var(--fg-muted);
	}
	.hp-search__clear:hover {
		color: var(--safelight);
	}
	/* Kartu topik: ikon + judul + jumlah langkah + penanda buka. */
	.hp-card {
		position: relative;
		display: grid;
		grid-template-columns: auto 1fr auto;
		grid-template-areas: "icon title plus" "icon meta plus";
		column-gap: 0.9rem;
		align-items: center;
		text-align: left;
		padding: 1.1rem 1.15rem;
		border: 1px solid var(--hair);
		border-radius: 1rem;
		background: transparent;
		transition: border-color 0.25s, background-color 0.25s;
		cursor: pointer;
	}
	.hp-card:hover {
		border-color: var(--safelight);
	}
	.hp-card.is-open {
		border-color: var(--safelight);
		background: color-mix(in srgb, var(--safelight) 7%, transparent);
	}
	.hp-card__icon {
		grid-area: icon;
		display: grid;
		place-items: center;
		width: 2.5rem;
		height: 2.5rem;
		border-radius: 999px;
		border: 1px solid var(--hair);
		color: var(--safelight);
	}
	.hp-card__title {
		grid-area: title;
		font-weight: 500;
		font-size: 0.98rem;
		color: var(--fg);
	}
	.hp-card__meta {
		grid-area: meta;
		font-size: 0.78rem;
		color: var(--fg-muted);
	}
	.hp-card__plus {
		grid-area: plus;
		font-size: 1.3rem;
		font-weight: 300;
		color: var(--fg-muted);
	}
	.hp-card.is-open .hp-card__plus {
		color: var(--safelight);
	}
	/* Artikel: langkah bernomor dengan angka safelight. */
	.hp-article {
		margin-top: 1.5rem;
		border: 1px solid var(--hair);
		border-radius: 1rem;
		padding: 1.75rem clamp(1.25rem, 3vw, 2.25rem);
		scroll-margin-top: calc(var(--nav-h) + 1rem);
	}
	.hp-steps {
		margin-top: 1.25rem;
		display: flex;
		flex-direction: column;
	}
	.hp-steps li {
		display: flex;
		gap: 1rem;
		align-items: baseline;
		padding: 0.85rem 0;
		border-top: 1px solid var(--hair);
		font-size: 0.95rem;
		line-height: 1.6;
		color: var(--fg);
	}
	.hp-steps__num {
		flex-shrink: 0;
		display: grid;
		place-items: center;
		width: 1.6rem;
		height: 1.6rem;
		border-radius: 999px;
		background: var(--safelight);
		color: #fff;
		font-size: 0.78rem;
		font-weight: 600;
		translate: 0 0.25rem;
	}
	.help-foot {
		margin-top: 3.5rem;
		padding-top: 1.75rem;
		border-top: 1px solid var(--hair);
		font-size: 0.95rem;
		color: var(--fg-muted);
	}
</style>
