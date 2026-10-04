<script lang="ts">
	import { tick } from "svelte";
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
	type Msg = { id: number; from: "bot" | "user"; text: string; link?: Link; links?: Link[]; chips?: QA[] };

	const copy: Record<Lang, {
		open: string; close: string; title: string; auto: string; hello: string; helloMore: string; placeholder: string; send: string;
		pick: string; noMatch: string; related: string; seeFaq: string; contact: string; contactBody: string; contactEmail: (e: string) => string;
		greet: string; log: string; faqLink: string;
	}> = {
		id: {
			open: "Buka bantuan", close: "Tutup bantuan", title: "Bantuan Lakuna",
			auto: "Asisten otomatis. Jawaban diambil dari Pertanyaan Umum.",
			hello: "Halo! Aku bisa membantu soal lisensi, pembelian, langganan, dan karya perajangga.",
			helloMore: "Pilih pertanyaan di bawah atau tulis pertanyaanmu.",
			placeholder: "Tulis pertanyaanmu", send: "Kirim",
			pick: "Mungkin ini yang kamu cari:",
			noMatch: "Aku belum menemukan jawabannya di Pertanyaan Umum. Tim layanan pelanggan kami (tersedia 24 jam) bisa membantu langsung.",
			related: "Pertanyaan terkait:", seeFaq: "Lihat semua pertanyaan", contact: "Hubungi layanan pelanggan",
			contactBody: "Layanan pelanggan tersedia 24 jam. Sertakan email akun dan ID pesananmu supaya cepat dibantu.",
			contactEmail: (e) => `Atau tulis ke ${e}.`,
			greet: "Halo! Ada yang bisa kubantu?", log: "Percakapan bantuan", faqLink: "Pertanyaan umum",
		},
		en: {
			open: "Open help", close: "Close help", title: "Lakuna Help",
			auto: "Automated assistant. Answers come from the FAQ.",
			hello: "Hi! I can help with licenses, purchases, subscriptions, and contributor questions.",
			helloMore: "Pick a question below or type your own.",
			placeholder: "Type your question", send: "Send",
			pick: "Maybe this is what you're looking for:",
			noMatch: "I couldn't find that in the FAQ. Our customer service team (available 24 hours) can help you directly.",
			related: "Related questions:", seeFaq: "See all questions", contact: "Contact customer service",
			contactBody: "Customer service is available 24 hours. Include your account email and order ID so we can help faster.",
			contactEmail: (e) => `Or write to ${e}.`,
			greet: "Hi! How can I help?", log: "Help conversation", faqLink: "FAQ",
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
		push({ from: "bot", text: t.hello });
		push({ from: "bot", text: t.helloMore, chips: starters });
	}
	const contactLinks = (): Link[] => [{ href: "/customer-service", label: t.contact }];

	function answerFor(query: string) {
		if (wantsHuman(query)) {
			push({ from: "bot", text: `${t.contactBody}${CONTACT_EMAIL ? " " + t.contactEmail(CONTACT_EMAIL) : ""}`, links: contactLinks() });
			return;
		}
		if (isGreeting(query)) {
			push({ from: "bot", text: t.greet, chips: starters });
			return;
		}
		const hits = rank(query);
		const best = hits[0];
		if (!best) {
			push({ from: "bot", text: t.noMatch, links: [...contactLinks(), { href: "/faq", label: t.seeFaq }] });
			return;
		}
		const more = hits.slice(1, 3).map((h) => h.qa);
		push({ from: "bot", text: best.qa.a, link: best.qa.link, chips: more.length ? more : undefined });
	}
	function ask(text: string) {
		const q = text.trim();
		if (!q) return;
		push({ from: "user", text: q });
		answerFor(q);
	}
	function submit(e: Event) {
		e.preventDefault();
		const q = draft;
		draft = "";
		ask(q);
	}
	function pick(qa: QA) {
		push({ from: "user", text: qa.q });
		push({ from: "bot", text: qa.a, link: qa.link });
	}

	async function toggle(next = !open) {
		open = next;
		if (open) {
			seed();
			await tick();
			inputEl?.focus();
		} else launcherEl?.focus();
	}
	function onKey(e: KeyboardEvent) {
		if (e.key === "Escape" && open) {
			e.stopPropagation();
			void toggle(false);
		}
	}

	// Disembunyikan selama globe terlihat (menutupi visual), kecuali panel sedang terbuka.
	let inGlobe = $state(false);
	$effect(() => {
		let globe: HTMLElement | null = null;
		const onScroll = () => {
			if (!globe || !globe.isConnected) globe = document.querySelector("[data-globe]");
			if (!globe) return void (inGlobe = false);
			const r = globe.getBoundingClientRect();
			inGlobe = r.top < innerHeight && r.bottom > 0;
		};
		onScroll();
		addEventListener("scroll", onScroll, { passive: true });
		return () => removeEventListener("scroll", onScroll);
	});
	const showLauncher = $derived(open || !inGlobe);
</script>

<svelte:window onkeydown={onKey} />

<div data-no-hover-sound data-no-click-sound class="cb">
	{#if open}
		<div class="cb-panel" role="dialog" aria-label={t.title} aria-modal="false">
			<header class="cb-head">
				<div>
					<p class="cb-title">{t.title}</p>
					<p class="cb-auto">{t.auto}</p>
				</div>
				<button type="button" class="cb-x" onclick={() => toggle(false)} aria-label={t.close}>
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
							<ul class="cb-chips">
								{#each m.chips as c (c.q)}
									<li><button type="button" class="cb-chip" onclick={() => pick(c)}>{c.q}</button></li>
								{/each}
							</ul>
						{/if}
					</div>
				{/each}
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
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
				</button>
			</form>
			<p class="cb-foot">
				<a href="/faq" class="cb-link">{t.faqLink}</a>
				<a href="/customer-service" class="cb-link">{t.contact}</a>
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
			<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
		{:else}
			<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
				<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8a2.5 2.5 0 0 1-2.5 2.5H11l-4.2 3.6a.4.4 0 0 1-.66-.3V16H6.5A2.5 2.5 0 0 1 4 13.5z" />
				<path d="M8.5 8.5h7M8.5 11.5h4.5" />
			</svg>
		{/if}
	</button>
</div>

<style>
	.cb-launch {
		position: fixed;
		z-index: 50;
		left: 1.5rem;
		bottom: max(1.5rem, env(safe-area-inset-bottom));
		display: grid;
		place-items: center;
		width: 2.75rem;
		height: 2.75rem;
		border: 1px solid var(--hair);
		border-radius: 50%;
		background: color-mix(in srgb, var(--bg) 80%, transparent);
		color: var(--fg);
		backdrop-filter: blur(12px);
		box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.6);
		cursor: pointer;
		transition: opacity 0.3s ease, transform 0.3s ease, color 0.2s ease, border-color 0.2s ease;
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
		bottom: calc(max(1.5rem, env(safe-area-inset-bottom)) + 3.5rem);
		display: flex;
		flex-direction: column;
		width: min(380px, calc(100vw - 3rem));
		max-height: min(560px, calc(100svh - 8.5rem));
		overflow: hidden;
		border: 1px solid var(--hair);
		border-radius: 1.1rem;
		background: var(--bg);
		color: var(--fg);
		box-shadow: 0 30px 80px -20px rgba(0, 0, 0, 0.75);
		animation: cb-in 0.22s ease-out both;
	}
	@keyframes cb-in {
		from { opacity: 0; transform: translateY(10px) scale(0.98); }
		to { opacity: 1; transform: none; }
	}
	.cb-head {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 0.75rem;
		padding: 1rem 1rem 0.85rem 1.1rem;
		border-bottom: 1px solid var(--hair);
	}
	.cb-title {
		font-family: var(--font-display);
		font-size: 1.05rem;
		font-weight: 500;
	}
	.cb-auto {
		margin-top: 0.15rem;
		font-size: 0.78rem;
		line-height: 1.4;
		color: var(--fg-muted);
	}
	.cb-x {
		display: grid;
		place-items: center;
		width: 2rem;
		height: 2rem;
		flex: none;
		border: 0;
		border-radius: 50%;
		background: transparent;
		color: var(--fg-muted);
		cursor: pointer;
	}
	.cb-x:hover,
	.cb-x:focus-visible {
		color: var(--safelight);
	}
	.cb-log {
		display: flex;
		flex: 1;
		flex-direction: column;
		gap: 0.7rem;
		min-height: 140px;
		overflow-y: auto;
		padding: 1rem;
		overscroll-behavior: contain;
	}
	.cb-row {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 0.5rem;
	}
	.cb-row.is-user {
		align-items: flex-end;
	}
	.cb-bubble {
		max-width: 88%;
		padding: 0.65rem 0.9rem;
		border: 1px solid var(--hair);
		border-radius: 1rem 1rem 1rem 0.3rem;
		background: color-mix(in srgb, var(--fg) 5%, transparent);
		font-size: 0.92rem;
		line-height: 1.5;
	}
	.cb-bubble--user {
		border-color: var(--safelight);
		border-radius: 1rem 1rem 0.3rem 1rem;
		background: var(--safelight);
		color: #fff;
	}
	.cb-link {
		display: inline-block;
		margin-top: 0.5rem;
		margin-right: 0.9rem;
		font-size: 0.88rem;
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
	.cb-chips {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.cb-chip {
		padding: 0.5rem 0.85rem;
		border: 1px solid var(--hair);
		border-radius: 999px;
		background: transparent;
		color: var(--fg);
		font: inherit;
		font-size: 0.85rem;
		line-height: 1.35;
		text-align: left;
		cursor: pointer;
		transition: border-color 0.2s ease, color 0.2s ease;
	}
	.cb-chip:hover,
	.cb-chip:focus-visible {
		border-color: var(--safelight);
		color: var(--safelight);
	}
	.cb-form {
		display: flex;
		gap: 0.5rem;
		padding: 0.75rem 0.9rem 0.5rem;
		border-top: 1px solid var(--hair);
	}
	.cb-input {
		flex: 1;
		min-width: 0;
		height: 2.6rem;
		padding: 0 0.95rem;
		border: 1px solid var(--hair);
		border-radius: 999px;
		background: transparent;
		color: var(--fg);
		font: inherit;
		font-size: 16px; /* mencegah iOS memperbesar halaman saat fokus */
	}
	.cb-input::placeholder {
		color: var(--fg-muted);
	}
	.cb-input:focus-visible {
		outline: 2px solid var(--safelight);
		outline-offset: 1px;
	}
	.cb-send {
		display: grid;
		place-items: center;
		width: 2.6rem;
		height: 2.6rem;
		flex: none;
		border: 0;
		border-radius: 50%;
		background: var(--safelight);
		color: #fff;
		cursor: pointer;
		transition: opacity 0.2s ease, background 0.2s ease;
	}
	.cb-send:disabled {
		opacity: 0.35;
		cursor: default;
	}
	.cb-send:not(:disabled):hover,
	.cb-send:not(:disabled):focus-visible {
		background: var(--safelight-lamp, var(--safelight));
	}
	.cb-foot {
		display: flex;
		gap: 0.2rem 1.2rem;
		flex-wrap: wrap;
		padding: 0 1rem 0.8rem;
	}
	.cb-foot .cb-link {
		margin-top: 0;
		font-size: 0.8rem;
		color: var(--fg-muted);
	}
	@media (max-width: 480px) {
		.cb-panel {
			left: 0.75rem;
			width: calc(100vw - 1.5rem);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.cb-panel {
			animation: none;
		}
		.cb-launch {
			transition: none;
		}
	}
</style>
