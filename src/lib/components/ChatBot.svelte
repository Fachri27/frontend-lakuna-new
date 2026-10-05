<script lang="ts">
	import { tick } from "svelte";
	import { page } from "$app/state";
	import { i18n, type Lang } from "$lib/i18n.svelte";
	import { FAQ, type QA } from "$lib/faq";
	import { CONTACT_EMAIL } from "$lib/contact";

	/**
	 * Asisten bantuan (kiri-bawah, pasangan tombol "ke atas" di kanan). BUKAN
	 * manusia dan BUKAN AI generatif: ia mencocokkan pertanyaan pengguna dengan
	 * daftar Pertanyaan Umum (/faq) dan menjawab dari sana; bila tak ketemu, ia
	 * mengarahkan ke layanan pelanggan. Diberi label begitu di panelnya.
	 */
	type Link = { href: string; label: string };
	type Msg = { id: number; from: "bot" | "user"; text: string; link?: Link; links?: Link[]; chips?: QA[]; chipsLabel?: string };

	const copy: Record<Lang, {
		open: string; close: string; title: string; auto: string; hello: string; helloMore: string; placeholder: string; send: string;
		pick: string; noMatch: string; related: string; seeFaq: string; contact: string; contactBody: string; contactEmail: (e: string) => string;
		greet: string; log: string; faqLink: string; label: string; popular: string; more: string; status: string;
	}> = {
		id: {
			open: "Buka bantuan", close: "Tutup bantuan", title: "Bantuan Lakuna",
			auto: "Menjawab dari Pertanyaan Umum",
			hello: "Halo! Aku bisa membantu soal lisensi, pembelian, langganan, dan karya perajangga. Pilih pertanyaan di bawah atau tulis sendiri",
			helloMore: "",
			placeholder: "Tulis pertanyaanmu", send: "Kirim",
			pick: "Mungkin ini yang kamu cari:",
			noMatch: "Aku belum menemukan jawabannya di Pertanyaan Umum. Tim layanan pelanggan kami (tersedia 24 jam) bisa membantu langsung",
			related: "Pertanyaan terkait:", seeFaq: "Lihat semua pertanyaan", contact: "Hubungi layanan pelanggan",
			contactBody: "Layanan pelanggan tersedia 24 jam. Sertakan email akun dan ID pesananmu supaya cepat dibantu",
			contactEmail: (e) => `Atau tulis ke ${e}`,
			greet: "Halo! Ada yang bisa kubantu?", log: "Percakapan bantuan", faqLink: "Pertanyaan umum",
			label: "Bantuan", popular: "Pertanyaan populer", more: "Pertanyaan terkait", status: "Asisten otomatis",
		},
		en: {
			open: "Open help", close: "Close help", title: "Lakuna Help",
			auto: "Answers from the FAQ",
			hello: "Hi! I can help with licenses, purchases, subscriptions, and contributor questions. Pick a question below or type your own",
			helloMore: "",
			placeholder: "Type your question", send: "Send",
			pick: "Maybe this is what you're looking for:",
			noMatch: "I couldn't find that in the FAQ. Our customer service team (available 24 hours) can help you directly",
			related: "Related questions:", seeFaq: "See all questions", contact: "Contact customer service",
			contactBody: "Customer service is available 24 hours. Include your account email and order ID so we can help faster",
			contactEmail: (e) => `Or write to ${e}`,
			greet: "Hi! How can I help?", log: "Help conversation", faqLink: "FAQ",
			label: "Help", popular: "Popular questions", more: "Related questions", status: "Automated assistant",
		},
	};

	const lang = $derived<Lang>(i18n.lang);
	const t = $derived(copy[lang]);
	const faq = $derived(FAQ[lang]);
	const allQA = $derived(faq.groups.flatMap((g) => g.items));
	// Teks pencarian dari KEDUA bahasa (FAQ id & en paralel per urutan): orang
	// Indonesia sering menulis dalam bahasa Indonesia walau antarmukanya Inggris.
	// Jawaban tetap ditampilkan dalam bahasa antarmuka.
	const searchText = $derived.by(() => {
		const a = FAQ.id.groups.flatMap((g) => g.items);
		const b = FAQ.en.groups.flatMap((g) => g.items);
		const parallel = a.length === b.length;
		return allQA.map((_, i) => {
			const x = a[i];
			const y = parallel ? b[i] : undefined;
			return { q: `${x?.q ?? ""} ${y?.q ?? ""}`, a: `${x?.a ?? ""} ${y?.a ?? ""}` };
		});
	});
	// Pertanyaan awal: satu dari tiap topik utama (indeks sama di kedua bahasa).
	const starters = $derived(
		[[0, 0], [1, 1], [1, 2], [3, 0]]
			.map(([g, i]) => faq.groups[g!]?.items[i!])
			.filter((x): x is QA => !!x),
	);

	// ── Pencocokan ─────────────────────────────────────────────────────
	const STOP = new Set(
		"apa yang dan atau di ke dari untuk dengan bisa bisakah apakah bagaimana gimana cara aku saya kamu ini itu ada tidak bukan boleh kenapa mengapa the an is are can how does did you your was what why for and with not".split(" "),
	);
	const fold = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
	const words = (s: string) => fold(s).split(/[^a-z0-9]+/).filter((w) => w.length >= 3 && !STOP.has(w));
	/** Bentuk dasar kasar (awalan/akhiran umum bahasa Indonesia) agar "pembayaran" ≈ "bayar". */
	function variants(w: string): string[] {
		const out = new Set([w]);
		const pre = w.replace(/^(meng|meny|mem|men|me|peng|peny|pem|pen|pe|ber|ter|di|ke|se)/, "");
		const suf = (x: string) => x.replace(/(kan|an|i|nya|lah)$/, "");
		for (const x of [pre, suf(w), suf(pre)]) if (x.length >= 4) out.add(x);
		return [...out];
	}
	function rank(query: string): { qa: QA; score: number }[] {
		const toks = words(query);
		if (!toks.length) return [];
		return allQA
			.map((qa, i) => {
				const hq = fold(searchText[i]?.q ?? qa.q);
				const ha = fold(searchText[i]?.a ?? qa.a);
				let score = 0;
				let inQ = 0;
				for (const tk of toks) {
					const v = variants(tk);
					if (v.some((x) => hq.includes(x))) {
						score += 3;
						inQ++;
					} else if (v.some((x) => ha.includes(x))) score += 1;
				}
				return { qa, score: inQ > 0 || score >= 2 ? score : 0 };
			})
			.filter((r) => r.score >= 3)
			.sort((a, b) => b.score - a.score);
	}
	const wantsHuman = (q: string) => /\b(cs|customer service|layanan pelanggan|manusia|operator|petugas|agen|agent|human|support|staf|staff|telepon|hubungi|contact)\b/i.test(q);
	const isGreeting = (q: string) => /^\s*(hai|halo|hallo|hi|hello|hey|pagi|siang|sore|malam|selamat)\b/i.test(q) && q.trim().split(/\s+/).length <= 3;

	// ── Percakapan ─────────────────────────────────────────────────────
	let open = $state(false);
	let nid = 0;
	let msgs = $state<Msg[]>([]);
	let draft = $state("");
	let logEl: HTMLElement | undefined = $state();
	let inputEl: HTMLInputElement | undefined = $state();
	let launcherEl: HTMLButtonElement | undefined = $state();

	function push(m: Omit<Msg, "id">) {
		msgs.push({ id: ++nid, ...m });
		void tick().then(() => logEl?.scrollTo({ top: logEl.scrollHeight, behavior: "smooth" }));
	}
	function seed() {
		if (msgs.length) return;
		push({ from: "bot", text: t.hello, chips: starters, chipsLabel: t.popular });
	}
	const contactLinks = (): Link[] => [{ href: "/customer-service", label: t.contact }];

	let typing = $state(false);
	const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
	/** Jeda singkat + titik "mengetik" supaya jawaban terasa bergantian, bukan muncul tiba-tiba. */
	function reply(fn: () => void) {
		typing = true;
		void tick().then(() => logEl?.scrollTo({ top: logEl.scrollHeight, behavior: "smooth" }));
		setTimeout(() => {
			typing = false;
			fn();
		}, reduced() ? 0 : 520);
	}

	function answerFor(query: string) {
		if (wantsHuman(query)) {
			push({ from: "bot", text: `${t.contactBody}${CONTACT_EMAIL ? " " + t.contactEmail(CONTACT_EMAIL) : ""}`, links: contactLinks() });
			return;
		}
		if (isGreeting(query)) {
			push({ from: "bot", text: t.greet, chips: starters, chipsLabel: t.popular });
			return;
		}
		const hits = rank(query);
		const best = hits[0];
		if (!best) {
			push({ from: "bot", text: t.noMatch, links: [...contactLinks(), { href: "/faq", label: t.seeFaq }] });
			return;
		}
		const more = hits.slice(1, 3).map((h) => h.qa);
		push({ from: "bot", text: best.qa.a, link: best.qa.link, chips: more.length ? more : undefined, chipsLabel: t.more });
	}
	function ask(text: string) {
		const q = text.trim();
		if (!q) return;
		push({ from: "user", text: q });
		reply(() => answerFor(q));
	}
	function submit(e: Event) {
		e.preventDefault();
		const q = draft;
		draft = "";
		ask(q);
	}
	function pick(qa: QA) {
		push({ from: "user", text: qa.q });
		reply(() => push({ from: "bot", text: qa.a, link: qa.link }));
	}

	async function toggle(next = !open) {
		open = next;
		if (open) {
			seed();
			await tick();
			inputEl?.focus();
		} else {
			launcherEl?.focus();
			// Panel menghilang → kursor mendadak berada di atas elemen halaman di
			// bawahnya dan memicu bunyi hover; itu terdengar seperti bunyi asisten.
			// Redam sebentar.
			const root = document.documentElement;
			root.setAttribute("data-no-hover-sound", "");
			setTimeout(() => root.removeAttribute("data-no-hover-sound"), 700);
		}
	}
	function onKey(e: KeyboardEvent) {
		if (e.key === "Escape" && open) {
			e.stopPropagation();
			void toggle(false);
		}
	}

	// Disembunyikan selama hero (beranda) atau globe terlihat — keduanya layar
	// penuh yang sengaja bersih. Panel yang sudah dibuka tetap tampil.
	// Ringan by design: tanpa membaca layout saat scroll (hero = posisi scroll,
	// globe = IntersectionObserver), dibatasi satu kali per frame, dan elemen
	// dicari ulang hanya saat pindah halaman — BUKAN lewat MutationObserver di
	// seluruh body (peta/kartu mengubah DOM terus-menerus; itu dulu memanggil
	// handler ini ratusan kali per detik).
	let heroOn = $state(false);
	let globeOn = $state(false);
	const covered = $derived(heroOn || globeOn);
	$effect(() => {
		void page.url.pathname; // cari ulang elemen tiap pindah halaman
		let hero: Element | null = null;
		let io: IntersectionObserver | null = null;
		let raf = 0;
		const calc = () => {
			raf = 0;
			heroOn = !!hero && scrollY < innerHeight * 0.9;
		};
		const onScroll = () => {
			if (!raf) raf = requestAnimationFrame(calc);
		};
		const find = () => {
			hero = document.querySelector("[data-hero]");
			const globe = document.querySelector("[data-globe]");
			io?.disconnect();
			io = null;
			if (globe && typeof IntersectionObserver !== "undefined") {
				io = new IntersectionObserver(([e]) => (globeOn = !!e?.isIntersecting), { threshold: 0 });
				io.observe(globe);
			} else globeOn = false;
			calc();
		};
		// Halaman beranda memasang hero setelah datanya tiba: coba beberapa kali.
		find();
		const retries = [250, 900, 2200].map((ms) => setTimeout(find, ms));
		addEventListener("scroll", onScroll, { passive: true });
		addEventListener("resize", onScroll);
		return () => {
			retries.forEach(clearTimeout);
			removeEventListener("scroll", onScroll);
			removeEventListener("resize", onScroll);
			if (raf) cancelAnimationFrame(raf);
			io?.disconnect();
		};
	});
	const showLauncher = $derived(open || !covered);
</script>

<svelte:window onkeydown={onKey} />

<div data-no-hover-sound data-no-click-sound class="cb">
	{#if open}
		<div class="cb-panel" role="dialog" aria-label={t.title} aria-modal="false">
			<header class="cb-head">
				<span class="cb-mark" aria-hidden="true">
					<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8a2.5 2.5 0 0 1-2.5 2.5H11l-4.2 3.6a.4.4 0 0 1-.66-.3V16H6.5A2.5 2.5 0 0 1 4 13.5z" /></svg>
				</span>
				<div class="cb-headtext">
					<p class="cb-title" title={t.auto}>{t.title}</p>
					<p class="cb-auto"><span class="cb-dot" aria-hidden="true"></span>{t.status}</p>
				</div>
				<!-- stopPropagation: tombol ini ikut hilang dari DOM saat panel menutup, sehingga
				     pendengar klik global (suara) tak lagi menemukan penanda data-no-click-sound di leluhurnya. -->
				<button type="button" class="cb-x" onclick={(e) => { e.stopPropagation(); void toggle(false); }} aria-label={t.close}>
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
				</button>
			</header>

			<div bind:this={logEl} class="cb-log" role="log" aria-live="polite" aria-label={t.log}>
				{#each msgs as m (m.id)}
					<div class={`cb-row ${m.from === "user" ? "is-user" : ""}`}>
						<div class={`cb-bubble ${m.from === "user" ? "cb-bubble--user" : ""}`}>
							<p>{m.text}</p>
							{#if m.link}<a href={m.link.href} class="cb-link">{m.link.label}</a>{/if}
							{#if m.links}
								<p class="cb-links">
									{#each m.links as l (l.href)}<a href={l.href} class="cb-link">{l.label}</a>{/each}
								</p>
							{/if}
						</div>
						{#if m.chips?.length}
							<div class="cb-list">
								{#if m.chipsLabel}<p class="cb-listlabel">{m.chipsLabel}</p>{/if}
								<ul>
									{#each m.chips as c (c.q)}
										<li>
											<button type="button" class="cb-chip" onclick={() => pick(c)}>
												<span>{c.q}</span>
												<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
											</button>
										</li>
									{/each}
								</ul>
							</div>
						{/if}
					</div>
				{/each}
				{#if typing}
					<div class="cb-row" aria-hidden="true">
						<div class="cb-bubble cb-typing"><i></i><i></i><i></i></div>
					</div>
				{/if}
			</div>

			<form class="cb-form" onsubmit={submit}>
				<input
					bind:this={inputEl}
					bind:value={draft}
					type="text"
					class="cb-input"
					placeholder={t.placeholder}
					aria-label={t.placeholder}
					autocomplete="off"
					enterkeyhint="send"
				/>
				<button type="submit" class="cb-send" aria-label={t.send} disabled={!draft.trim()}>
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5M6 11l6-6 6 6" /></svg>
				</button>
			</form>
			<p class="cb-foot">
				<a href="/faq" class="cb-flink">{t.faqLink}</a>
				<span aria-hidden="true">/</span>
				<a href="/customer-service" class="cb-flink">{t.contact}</a>
			</p>
		</div>
	{/if}

	<button
		bind:this={launcherEl}
		type="button"
		class={`cb-launch press fab-mengambang ${showLauncher ? "" : "is-hidden"}`}
		onclick={() => toggle()}
		aria-label={open ? t.close : t.open}
		aria-expanded={open}
		title={open ? t.close : t.open}
	>
		{#if open}
			<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
		{:else}
			<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
				<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8a2.5 2.5 0 0 1-2.5 2.5H11l-4.2 3.6a.4.4 0 0 1-.66-.3V16H6.5A2.5 2.5 0 0 1 4 13.5z" />
				<path d="M8.5 8.5h7M8.5 11.5h4.5" />
			</svg>
		{/if}
		<span class="cb-launchlabel">{open ? t.close.replace(/ .*/, "") : t.label}</span>
	</button>
</div>

<style>
	/* Pemicu: lingkaran di layar kecil (sepasang dengan tombol ke atas), pil
	   berlabel di layar lebar supaya mudah ditemukan. */
	.cb-launch {
		position: fixed;
		z-index: 50;
		left: 1.5rem;
		bottom: max(1.5rem, env(safe-area-inset-bottom));
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.55rem;
		height: 2.75rem;
		min-width: 2.75rem;
		padding: 0;
		border: 1px solid var(--hair);
		border-radius: 999px;
		background: color-mix(in srgb, var(--bg) 82%, transparent);
		color: var(--fg);
		font-size: 0.88rem;
		backdrop-filter: blur(12px);
		box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.6);
		cursor: pointer;
		transition: opacity 0.3s ease, transform 0.3s ease, color 0.2s ease, border-color 0.2s ease;
	}
	.cb-launchlabel {
		display: none;
	}
	@media (min-width: 768px) {
		.cb-launch {
			padding: 0 1.1rem 0 0.95rem;
		}
		.cb-launchlabel {
			display: inline;
		}
	}
	.cb-launch:hover,
	.cb-launch:focus-visible {
		color: var(--safelight);
		border-color: var(--safelight);
	}
	.cb-launch.is-hidden {
		opacity: 0;
		transform: translateY(1rem);
		pointer-events: none;
	}

	.cb-panel {
		position: fixed;
		z-index: 50;
		left: 1.5rem;
		bottom: calc(max(1.5rem, env(safe-area-inset-bottom)) + 3.6rem);
		display: flex;
		flex-direction: column;
		width: min(372px, calc(100vw - 3rem));
		max-height: min(580px, calc(100svh - 8.5rem));
		overflow: hidden;
		border: 1px solid var(--hair);
		border-radius: 1.25rem;
		background: color-mix(in srgb, var(--fg) 3.5%, var(--bg));
		color: var(--fg);
		box-shadow: 0 30px 80px -20px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(0, 0, 0, 0.25);
		transform-origin: bottom left;
		animation: cb-in 0.24s cubic-bezier(0.2, 0.8, 0.2, 1) both;
	}
	@keyframes cb-in {
		from { opacity: 0; transform: translateY(12px) scale(0.97); }
		to { opacity: 1; transform: none; }
	}

	.cb-head {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.9rem 0.8rem 0.9rem 1rem;
		border-bottom: 1px solid var(--hair);
	}
	.cb-mark {
		display: grid;
		place-items: center;
		flex: none;
		width: 2.2rem;
		height: 2.2rem;
		border-radius: 50%;
		background: color-mix(in srgb, var(--safelight) 16%, transparent);
		color: var(--safelight);
	}
	.cb-headtext {
		flex: 1;
		min-width: 0;
	}
	.cb-title {
		font-family: var(--font-display);
		font-size: 0.98rem;
		font-weight: 500;
		line-height: 1.2;
	}
	.cb-auto {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		margin-top: 0.2rem;
		overflow: hidden;
		font-size: 0.72rem;
		line-height: 1.2;
		white-space: nowrap;
		text-overflow: ellipsis;
		color: var(--fg-muted);
	}
	.cb-dot {
		flex: none;
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: var(--safelight);
	}
	.cb-x {
		display: grid;
		place-items: center;
		flex: none;
		width: 2rem;
		height: 2rem;
		border: 0;
		border-radius: 50%;
		background: transparent;
		color: var(--fg-muted);
		cursor: pointer;
		transition: color 0.2s ease, background 0.2s ease;
	}
	.cb-x:hover,
	.cb-x:focus-visible {
		color: var(--fg);
		background: color-mix(in srgb, var(--fg) 8%, transparent);
	}

	.cb-log {
		display: flex;
		flex: 1;
		flex-direction: column;
		gap: 0.9rem;
		min-height: 150px;
		overflow-y: auto;
		padding: 1.1rem 1rem 0.9rem;
		scrollbar-width: thin;
		scrollbar-color: color-mix(in srgb, var(--fg) 22%, transparent) transparent;
		overscroll-behavior: contain;
	}
	.cb-row {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 0.6rem;
		animation: cb-pop 0.25s ease-out both;
	}
	@keyframes cb-pop {
		from { opacity: 0; transform: translateY(6px); }
		to { opacity: 1; transform: none; }
	}
	.cb-row.is-user {
		align-items: flex-end;
	}
	.cb-bubble {
		max-width: 90%;
		padding: 0.6rem 0.85rem;
		border-radius: 1rem 1rem 1rem 0.35rem;
		background: color-mix(in srgb, var(--fg) 7%, transparent);
		font-size: 0.875rem;
		line-height: 1.55;
	}
	.cb-bubble--user {
		border-radius: 1rem 1rem 0.35rem 1rem;
		background: var(--safelight);
		color: #fff;
	}
	.cb-typing {
		display: flex;
		gap: 4px;
		padding: 0.85rem 0.95rem;
	}
	.cb-typing i {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: var(--fg-muted);
		animation: cb-bounce 1s ease-in-out infinite;
	}
	.cb-typing i:nth-child(2) { animation-delay: 0.15s; }
	.cb-typing i:nth-child(3) { animation-delay: 0.3s; }
	@keyframes cb-bounce {
		0%, 60%, 100% { opacity: 0.35; transform: translateY(0); }
		30% { opacity: 1; transform: translateY(-3px); }
	}
	.cb-link {
		display: inline-block;
		margin-top: 0.45rem;
		margin-right: 0.9rem;
		font-size: 0.82rem;
		color: var(--fg);
		text-decoration: underline;
		text-decoration-color: color-mix(in srgb, var(--fg) 35%, transparent);
		text-underline-offset: 0.3em;
	}
	.cb-link:hover,
	.cb-link:focus-visible {
		color: var(--safelight);
		text-decoration-color: var(--safelight);
	}
	.cb-links {
		display: flex;
		flex-wrap: wrap;
	}

	/* Saran: daftar berbaris dengan garis tipis (bukan pil berserakan). */
	.cb-list {
		align-self: stretch;
	}
	.cb-listlabel {
		margin-bottom: 0.15rem;
		font-size: 0.74rem;
		color: var(--fg-muted);
	}
	.cb-list ul {
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.cb-list li + li {
		border-top: 1px solid var(--hair);
	}
	.cb-chip {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		width: 100%;
		padding: 0.6rem 0.1rem;
		border: 0;
		background: transparent;
		color: var(--fg);
		font: inherit;
		font-size: 0.85rem;
		line-height: 1.35;
		text-align: left;
		cursor: pointer;
		transition: color 0.2s ease;
	}
	.cb-chip svg {
		flex: none;
		color: var(--fg-muted);
		transition: transform 0.25s ease, color 0.2s ease;
	}
	.cb-chip:hover,
	.cb-chip:focus-visible {
		color: var(--safelight);
	}
	.cb-chip:hover svg,
	.cb-chip:focus-visible svg {
		color: var(--safelight);
		transform: translateX(3px);
	}

	/* Kolom ketik + tombol kirim dalam satu pil; cincin fokus tipis. */
	.cb-form {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		margin: 0 0.8rem;
		padding: 0.3rem 0.3rem 0.3rem 1rem;
		border: 1px solid var(--hair);
		border-radius: 999px;
		background: color-mix(in srgb, var(--bg) 70%, transparent);
		transition: border-color 0.2s ease;
	}
	.cb-form:focus-within {
		border-color: color-mix(in srgb, var(--safelight) 70%, transparent);
	}
	.cb-input {
		flex: 1;
		min-width: 0;
		height: 2.2rem;
		padding: 0;
		border: 0;
		outline: 0;
		background: transparent;
		color: var(--fg);
		font: inherit;
		font-size: 16px; /* mencegah iOS memperbesar halaman saat fokus */
	}
	.cb-input::placeholder {
		color: var(--fg-muted);
	}
	.cb-send {
		display: grid;
		place-items: center;
		flex: none;
		width: 2.2rem;
		height: 2.2rem;
		border: 0;
		border-radius: 50%;
		background: var(--safelight);
		color: #fff;
		cursor: pointer;
		transition: opacity 0.2s ease, transform 0.2s ease;
	}
	.cb-send:disabled {
		opacity: 0.3;
		cursor: default;
	}
	.cb-send:not(:disabled):hover,
	.cb-send:not(:disabled):focus-visible {
		transform: scale(1.06);
	}
	.cb-foot {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.6rem;
		padding: 0.6rem 1rem 0.8rem;
		font-size: 0.75rem;
		color: var(--fg-muted);
	}
	.cb-flink {
		color: var(--fg-muted);
		text-decoration: none;
		transition: color 0.2s ease;
	}
	.cb-flink:hover,
	.cb-flink:focus-visible {
		color: var(--safelight);
	}
	@media (max-width: 480px) {
		.cb-panel {
			left: 0.75rem;
			width: calc(100vw - 1.5rem);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.cb-panel,
		.cb-row {
			animation: none;
		}
		.cb-typing i {
			animation: none;
			opacity: 0.7;
		}
		.cb-launch,
		.cb-chip svg {
			transition: none;
		}
	}
</style>
