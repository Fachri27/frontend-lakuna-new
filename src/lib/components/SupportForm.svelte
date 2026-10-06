<script lang="ts">
	import { i18n, type Lang } from "$lib/i18n.svelte";
	import { store } from "$lib/store.svelte";
	import { api, ApiError } from "$lib/api";

	type TopicKey = "pesanan" | "unduhan" | "langganan" | "lisensi" | "lainnya";
	type Field = "name" | "email" | "topic" | "message";

	const TOPICS: TopicKey[] = ["pesanan", "unduhan", "langganan", "lisensi", "lainnya"];
	/** Topik yang biasanya menyangkut satu pesanan, jadi kolom ID pesanan ditawarkan. */
	const WITH_ORDER = new Set<TopicKey>(["pesanan", "unduhan", "langganan"]);
	const MAX = 2000;

	const copy: Record<Lang, {
		name: string; email: string; topic: string; orderId: string; optional: string; message: string;
		topics: Record<TopicKey, string>;
		send: string; sending: string;
		doneTitle: string; doneBody: string; again: string; refLabel: string;
		eName: string; eEmail: string; eTopic: string; eMessage: string; eFail: string; eMany: string;
	}> = {
		id: {
			name: "Nama",
			email: "Email",
			topic: "Soal apa?",
			orderId: "ID pesanan",
			optional: "boleh dikosongkan",
			message: "Pesanmu",
			topics: { pesanan: "Pesanan", unduhan: "Unduhan", langganan: "Langganan", lisensi: "Lisensi", lainnya: "Lainnya" },
			send: "Kirim pesan",
			sending: "Mengirim",
			doneTitle: "Pesanmu terkirim",
			doneBody: "Kami membalas lewat email. Simpan kode ini bila perlu menulis lagi",
			again: "Kirim pesan lain",
			refLabel: "Kode pesan",
			eName: "Isi namamu, minimal 2 huruf",
			eEmail: "Periksa penulisan emailmu",
			eTopic: "Pilih salah satu topik",
			eMessage: "Ceritakan sedikit lebih rinci, minimal 10 karakter",
			eFail: "Pesan belum terkirim. Periksa koneksimu lalu coba lagi",
			eMany: "Terlalu banyak pesan dari jaringan ini. Coba lagi dalam 1 jam",
		},
		en: {
			name: "Name",
			email: "Email",
			topic: "What is it about?",
			orderId: "Order ID",
			optional: "optional",
			message: "Your message",
			topics: { pesanan: "Order", unduhan: "Download", langganan: "Subscription", lisensi: "License", lainnya: "Other" },
			send: "Send message",
			sending: "Sending",
			doneTitle: "Message sent",
			doneBody: "We reply by email. Keep this code if you need to write again",
			again: "Send another message",
			refLabel: "Message code",
			eName: "Enter your name, at least 2 letters",
			eEmail: "Check how your email is written",
			eTopic: "Pick one topic",
			eMessage: "Add a little more detail, at least 10 characters",
			eFail: "Your message was not sent. Check your connection and try again",
			eMany: "Too many messages from this network. Try again in 1 hour",
		},
	};

	const lang = $derived<Lang>(i18n.lang);
	const t = $derived(copy[lang]);

	let name = $state("");
	let email = $state("");
	let topic = $state<TopicKey | "">("");
	let orderId = $state("");
	let message = $state("");
	let website = $state(""); // jebakan bot — manusia tak melihatnya
	let status = $state<"idle" | "sending" | "sent">("idle");
	let errors = $state<Partial<Record<Field, string>>>({});
	let failure = $state("");
	let ref = $state("");
	let msgEl = $state<HTMLTextAreaElement | null>(null);

	// Isi nama & email dari akun yang sedang masuk, sekali, selama kolomnya masih kosong.
	let prefilled = false;
	$effect(() => {
		const u = store.user;
		if (!u || prefilled) return;
		prefilled = true;
		if (!name) name = u.name ?? "";
		if (!email) email = u.email ?? "";
	});

	const showOrder = $derived(topic !== "" && WITH_ORDER.has(topic));

	function validate(): boolean {
		const e: Partial<Record<Field, string>> = {};
		if (name.trim().length < 2) e.name = t.eName;
		if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) e.email = t.eEmail;
		if (!topic) e.topic = t.eTopic;
		if (message.trim().length < 10) e.message = t.eMessage;
		errors = e;
		return Object.keys(e).length === 0;
	}

	function clear(f: Field) {
		if (errors[f]) errors = { ...errors, [f]: undefined };
	}

	function grow() {
		if (!msgEl) return;
		msgEl.style.height = "auto";
		msgEl.style.height = `${Math.min(msgEl.scrollHeight, 420)}px`;
	}

	async function submit(ev: SubmitEvent) {
		ev.preventDefault();
		failure = "";
		if (status === "sending" || !validate()) {
			// Fokus ke kolom pertama yang salah supaya pembaca layar & keyboard langsung sampai.
			queueMicrotask(() => document.querySelector<HTMLElement>('.sf [aria-invalid="true"], .sf [data-invalid] input')?.focus());
			return;
		}
		status = "sending";
		try {
			const res = await api<{ success: boolean; data: { ref: string } }>("/api/support", {
				method: "POST",
				noAuth: true,
				body: JSON.stringify({
					name: name.trim(),
					email: email.trim(),
					topic,
					orderId: showOrder ? orderId.trim() : "",
					message: message.trim(),
					website,
				}),
			});
			ref = res.data.ref;
			status = "sent";
		} catch (err) {
			status = "idle";
			if (err instanceof ApiError) {
				if (err.code === "TOO_MANY_REQUESTS") failure = t.eMany;
				else if (err.code === "VALIDATION_ERROR" && Array.isArray(err.details)) {
					const e: Partial<Record<Field, string>> = {};
					for (const d of err.details as { field: string; message: string }[]) {
						if (d.field === "name" || d.field === "email" || d.field === "topic" || d.field === "message") e[d.field] = d.message;
					}
					errors = e;
					if (!Object.keys(e).length) failure = t.eFail;
				} else failure = t.eFail;
			} else failure = t.eFail;
		}
	}

	function again() {
		message = "";
		orderId = "";
		topic = "";
		errors = {};
		failure = "";
		ref = "";
		status = "idle";
	}
</script>

<div class="sf">
	{#if status === "sent"}
		<div class="sf-done" role="status" aria-live="polite">
			<p class="sf-done-title">{t.doneTitle}</p>
			<p class="sf-ref" aria-label={`${t.refLabel} ${ref}`}>{ref}</p>
			<p class="sf-done-body">{t.doneBody}</p>
			<button type="button" class="sf-again" onclick={again}>{t.again}</button>
		</div>
	{:else}
		<form onsubmit={submit} novalidate>
			<div class="sf-field">
				<label for="sf-name">{t.name}</label>
				<input
					id="sf-name"
					type="text"
					bind:value={name}
					oninput={() => clear("name")}
					autocomplete="name"
					maxlength="100"
					aria-invalid={errors.name ? "true" : undefined}
					aria-describedby={errors.name ? "sf-name-e" : undefined}
				/>
				{#if errors.name}<p id="sf-name-e" class="sf-err">{errors.name}</p>{/if}
			</div>

			<div class="sf-field">
				<label for="sf-email">{t.email}</label>
				<input
					id="sf-email"
					type="email"
					bind:value={email}
					oninput={() => clear("email")}
					autocomplete="email"
					maxlength="191"
					aria-invalid={errors.email ? "true" : undefined}
					aria-describedby={errors.email ? "sf-email-e" : undefined}
				/>
				{#if errors.email}<p id="sf-email-e" class="sf-err">{errors.email}</p>{/if}
			</div>

			<fieldset class="sf-field sf-topics" data-invalid={errors.topic ? "" : undefined} aria-describedby={errors.topic ? "sf-topic-e" : undefined}>
				<legend>{t.topic}</legend>
				<div class="sf-choices">
					{#each TOPICS as k (k)}
						<label class="sf-choice" data-on={topic === k ? "" : undefined}>
							<input
								type="radio"
								name="sf-topic"
								value={k}
								bind:group={topic}
								onchange={() => clear("topic")}
							/>
							<span>{t.topics[k]}</span>
						</label>
					{/each}
				</div>
				{#if errors.topic}<p id="sf-topic-e" class="sf-err">{errors.topic}</p>{/if}
			</fieldset>

			{#if showOrder}
				<div class="sf-field">
					<label for="sf-order">{t.orderId} <span class="sf-opt">{t.optional}</span></label>
					<input id="sf-order" type="text" bind:value={orderId} autocomplete="off" maxlength="64" />
				</div>
			{/if}

			<div class="sf-field">
				<label for="sf-msg">{t.message}</label>
				<textarea
					id="sf-msg"
					bind:this={msgEl}
					bind:value={message}
					oninput={() => {
						clear("message");
						grow();
					}}
					rows="4"
					maxlength={MAX}
					aria-invalid={errors.message ? "true" : undefined}
					aria-describedby={errors.message ? "sf-msg-e" : undefined}
				></textarea>
				<div class="sf-foot">
					{#if errors.message}<p id="sf-msg-e" class="sf-err">{errors.message}</p>{:else}<span></span>{/if}
					<span class="sf-count" aria-hidden="true">{message.length}/{MAX}</span>
				</div>
			</div>

			<!-- Jebakan bot: tersembunyi dari manusia & pembaca layar; bot yang mengisinya diabaikan server. -->
			<div class="sf-trap" aria-hidden="true">
				<label>Website <input type="text" name="website" tabindex="-1" autocomplete="off" bind:value={website} /></label>
			</div>

			{#if failure}<p class="sf-fail" role="alert">{failure}</p>{/if}

			<button type="submit" class="sf-send" disabled={status === "sending"}>
				{status === "sending" ? t.sending : t.send}
			</button>
		</form>
	{/if}
</div>

<style>
	.sf form {
		display: grid;
		gap: 1.9rem;
	}
	.sf-field {
		display: block;
		margin: 0;
		padding: 0;
		border: 0;
		min-width: 0;
	}
	.sf-field > label,
	.sf-field > legend {
		display: block;
		padding: 0;
		margin-bottom: 0.45rem;
		font-size: 0.88rem;
		color: var(--fg-muted);
	}
	.sf-opt {
		margin-left: 0.4rem;
		opacity: 0.7;
	}
	.sf input[type="text"],
	.sf input[type="email"],
	.sf textarea {
		display: block;
		width: 100%;
		padding: 0.55rem 0;
		border: 0;
		border-bottom: 1px solid var(--hair);
		border-radius: 0;
		background: transparent;
		color: var(--fg);
		font: inherit;
		font-size: 1.05rem;
		line-height: 1.5;
		transition: border-color 0.2s ease;
	}
	.sf textarea {
		resize: none;
		min-height: 6.6rem;
	}
	.sf input[type="text"]:hover,
	.sf input[type="email"]:hover,
	.sf textarea:hover {
		border-bottom-color: color-mix(in srgb, var(--fg) 35%, transparent);
	}
	.sf input[type="text"]:focus-visible,
	.sf input[type="email"]:focus-visible,
	.sf textarea:focus-visible {
		outline: 2px solid var(--safelight);
		outline-offset: 3px;
		border-bottom-color: var(--safelight);
	}
	.sf [aria-invalid="true"] {
		border-bottom-color: #e5484d !important;
	}

	/* Topik: pilihan teks, bukan dropdown — semuanya terlihat sekaligus. */
	.sf-choices {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem 1.6rem;
	}
	.sf-choice {
		position: relative;
		cursor: pointer;
		padding: 0.3rem 0;
		font-size: 1.05rem;
		color: var(--fg-muted);
		border-bottom: 2px solid transparent;
		transition: color 0.2s ease, border-color 0.2s ease;
	}
	.sf-choice:hover {
		color: var(--fg);
	}
	.sf-choice[data-on] {
		color: var(--fg);
		border-bottom-color: var(--safelight);
	}
	.sf-choice input {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		margin: 0;
		opacity: 0;
		cursor: pointer;
	}
	.sf-choice:has(input:focus-visible) {
		outline: 2px solid var(--safelight);
		outline-offset: 3px;
		border-radius: 2px;
	}

	.sf-foot {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		margin-top: 0.4rem;
	}
	.sf-count {
		font-size: 0.8rem;
		color: var(--fg-muted);
		opacity: 0.7;
		font-variant-numeric: tabular-nums;
	}
	.sf-err {
		margin-top: 0.4rem;
		font-size: 0.88rem;
		line-height: 1.45;
		color: #ff7a7f;
	}
	.sf-foot .sf-err {
		margin-top: 0;
	}
	.sf-fail {
		padding-left: 0.9rem;
		border-left: 2px solid #e5484d;
		font-size: 0.95rem;
		line-height: 1.55;
		color: var(--fg);
	}

	.sf-trap {
		position: absolute;
		left: -9999px;
		width: 1px;
		height: 1px;
		overflow: hidden;
	}

	.sf-send {
		justify-self: start;
		padding: 0.85rem 2.1rem;
		border: 1px solid var(--fg);
		border-radius: 999px;
		background: transparent;
		color: var(--fg);
		font: inherit;
		font-size: 0.98rem;
		cursor: pointer;
		transition: background-color 0.2s ease, color 0.2s ease, opacity 0.2s ease;
	}
	.sf-send:hover:not(:disabled) {
		background: var(--fg);
		color: var(--bg);
	}
	.sf-send:disabled {
		opacity: 0.55;
		cursor: progress;
	}

	/* Keadaan terkirim: satu-satunya gerak di form — garis tergambar, lalu kode muncul. */
	.sf-done {
		position: relative;
		padding-top: 1.6rem;
	}
	.sf-done::before {
		content: "";
		position: absolute;
		top: 0;
		left: 0;
		height: 1px;
		width: 100%;
		background: var(--safelight);
		transform-origin: left;
		animation: sf-rule 0.9s cubic-bezier(0.22, 1, 0.36, 1) both;
	}
	.sf-done-title {
		font-size: 1rem;
		color: var(--fg-muted);
		animation: sf-in 0.5s ease 0.25s both;
	}
	.sf-ref {
		margin-top: 0.5rem;
		font-family: var(--font-display);
		font-size: clamp(2rem, 5.2vw, 3.4rem);
		font-weight: 300;
		letter-spacing: -0.02em;
		line-height: 1.1;
		color: var(--fg);
		font-variant-numeric: tabular-nums;
		user-select: all;
		animation: sf-in 0.6s ease 0.4s both;
	}
	.sf-done-body {
		margin-top: 1rem;
		max-width: 46ch;
		line-height: 1.65;
		color: var(--fg-muted);
		animation: sf-in 0.5s ease 0.6s both;
	}
	.sf-again {
		margin-top: 1.75rem;
		padding: 0;
		border: 0;
		background: none;
		font: inherit;
		color: var(--fg);
		text-decoration: underline;
		text-decoration-color: color-mix(in srgb, var(--fg) 35%, transparent);
		text-underline-offset: 0.35em;
		cursor: pointer;
		transition: color 0.2s ease, text-decoration-color 0.2s ease;
		animation: sf-in 0.5s ease 0.75s both;
	}
	.sf-again:hover {
		color: var(--safelight);
		text-decoration-color: var(--safelight);
	}
	@keyframes sf-rule {
		from {
			transform: scaleX(0);
		}
		to {
			transform: scaleX(1);
		}
	}
	@keyframes sf-in {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.sf-done::before,
		.sf-done-title,
		.sf-ref,
		.sf-done-body,
		.sf-again {
			animation: none;
		}
	}
</style>
