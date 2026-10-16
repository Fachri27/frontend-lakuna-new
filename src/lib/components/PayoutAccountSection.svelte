<script lang="ts">
	/**
	 * Rekening pencairan bagi hasil (kontributor/admin) di halaman profil.
	 *  - Tersimpan: kartu ala kartu bank — warna aksen penyedia, nomor tersamar (API tak pernah mengirim nomor
	 *    lengkap balik), nama pemilik.
	 *  - Ubah/tambah: pratinjau kartu hidup + pilihan penyedia berupa ubin, bukan dropdown.
	 *  - Simpan/hapus wajib kata sandi akun (lihat API payoutAccount.service.ts).
	 */
	import { i18n } from "$lib/i18n.svelte";
	import { api, apiGet, ApiError } from "$lib/api";
	import type { ApiResponse } from "$lib/types";

	let { defaultName = "" }: { defaultName?: string } = $props();

	const copy = {
		id: {
			title: "Rekening pencairan",
			body: "Ke rekening bank atau e-wallet ini bagi hasil karyamu dikirim. Pastikan nama pemilik sama persis dengan nama di rekening",
			bank: "Bank", ewallet: "E-wallet", pickBank: "Pilih bank", pickEw: "Pilih e-wallet",
		number: "No. rekening", numberEw: "No. HP terdaftar", name: "Nama pemilik", pw: "Kata sandi akun Lakuna",
		pwHint: "Masukkan kata sandi login Lakuna kamu untuk konfirmasi — bukan PIN bank / e-wallet / CVV",
		pwPh: "Kata sandi login Lakuna…",
			save: "Simpan rekening", edit: "Ganti rekening", cancel: "Batal", del: "Hapus rekening",
			delSure: "Masukkan kata sandi, lalu tekan sekali lagi untuk menghapus",
			ok: "Rekening pencairan tersimpan", deleted: "Rekening pencairan dihapus", fail: "Gagal menyimpan rekening. Coba lagi",
			emptyTitle: "Belum ada rekening", emptyBody: "Tambahkan rekening bank atau e-wallet supaya bagi hasil karyamu bisa dicairkan",
			add: "Tambah rekening", updated: "Diperbarui", holder: "Pemilik", preview: "Pratinjau", payTo: "Tujuan pencairan",
			pickFirst: "Pilih bank / e-wallet dulu",
		},
		en: {
			title: "Payout account",
			body: "Your revenue share is sent to this bank account or e-wallet. Make sure the holder name matches the account exactly",
			bank: "Bank", ewallet: "E-wallet", pickBank: "Choose a bank", pickEw: "Choose an e-wallet",
		number: "Account number", numberEw: "Registered phone no.", name: "Account holder", pw: "Lakuna account password",
		pwHint: "Enter your Lakuna login password to confirm — not your bank / e-wallet PIN or card CVV",
		pwPh: "Lakuna login password…",
			save: "Save account", edit: "Change account", cancel: "Cancel", del: "Remove account",
			delSure: "Enter your password, then press once more to remove it",
			ok: "Payout account saved", deleted: "Payout account removed", fail: "Couldn't save the account. Try again",
			emptyTitle: "No account yet", emptyBody: "Add a bank account or e-wallet so your revenue share can be paid out",
			add: "Add account", updated: "Updated", holder: "Holder", preview: "Preview", payTo: "Payout destination",
			pickFirst: "Choose a bank / e-wallet first",
		},
	};
	const lang = $derived(i18n.lang);
	const t = $derived(copy[lang]);

	type PayType = "BANK" | "EWALLET";
	type PayAccount = { type: PayType; provider: string; providerLabel: string; accountNumberMasked: string; accountName: string; updatedAt: string };
	/** Salinan daftar di API (payoutAccount.providers.ts) — ubah bersamaan. Warna = aksen kartu (bukan logo). */
	const PROVIDERS: Record<PayType, { code: string; label: string; color: string }[]> = {
		BANK: [
			{ code: "BCA", label: "BCA", color: "#0b63c5" },
			{ code: "MANDIRI", label: "Mandiri", color: "#f2b705" },
			{ code: "BNI", label: "BNI", color: "#f15a23" },
			{ code: "BRI", label: "BRI", color: "#1565c0" },
			{ code: "BSI", label: "BSI", color: "#00a39d" },
			{ code: "CIMB", label: "CIMB Niaga", color: "#c8102e" },
			{ code: "PERMATA", label: "PermataBank", color: "#2e9d47" },
			{ code: "DANAMON", label: "Danamon", color: "#f7941d" },
			{ code: "BTN", label: "BTN", color: "#1e5aa8" },
			{ code: "OCBC", label: "OCBC", color: "#e2231a" },
			{ code: "MAYBANK", label: "Maybank", color: "#ffc600" },
			{ code: "PANIN", label: "Panin", color: "#2b5aa7" },
			{ code: "JAGO", label: "Bank Jago", color: "#fdb813" },
			{ code: "SEABANK", label: "SeaBank", color: "#ff7a00" },
			{ code: "BLU", label: "blu by BCA Digital", color: "#18b7e6" },
		],
		EWALLET: [
			{ code: "GOPAY", label: "GoPay", color: "#00aed6" },
			{ code: "OVO", label: "OVO", color: "#6d3fc0" },
			{ code: "DANA", label: "DANA", color: "#118eea" },
			{ code: "SHOPEEPAY", label: "ShopeePay", color: "#ee4d2d" },
			{ code: "LINKAJA", label: "LinkAja", color: "#e82529" },
		],
	};
	const colorOf = (type: PayType, code: string) => PROVIDERS[type].find((p) => p.code === code)?.color ?? "#8b5cf6";
	const labelOf = (type: PayType, code: string) => PROVIDERS[type].find((p) => p.code === code)?.label ?? code;

	let acct = $state<PayAccount | null>(null);
	let loaded = $state(false);
	let editing = $state(false);
	let type = $state<PayType>("BANK");
	let provider = $state("");
	let number = $state("");
	let name = $state("");
	let pw = $state("");
	let busy = $state(false);
	let msg = $state("");
	let err = $state("");
	let delArmed = $state(false);

	$effect(() => {
		apiGet<ApiResponse<PayAccount | null>>("/api/payouts/account")
			.then((res) => (acct = res.data ?? null))
			.catch(() => {})
			.finally(() => (loaded = true));
	});

	function startEdit() {
		type = acct?.type ?? "BANK";
		provider = acct?.provider ?? "";
		number = "";
		name = acct?.accountName ?? defaultName ?? "";
		pw = "";
		msg = "";
		err = "";
		delArmed = false;
		editing = true;
	}

	function setType(v: PayType) {
		if (type === v) return;
		type = v;
		provider = "";
		err = "";
	}

	const fmtDate = (d: string) =>
		new Date(d).toLocaleDateString(lang === "id" ? "id-ID" : "en-US", { day: "2-digit", month: "short", year: "numeric" });

	/** Nomor yang sedang diketik, dikelompokkan 4-4-… untuk pratinjau. */
	const typedGroups = $derived(
		number.replace(/\D/g, "").replace(/(\d{4})(?=\d)/g, "$1 ") || (type === "BANK" ? "•••• •••• ••••" : "08•• •••• ••••"),
	);
	const preview = $derived(
		editing
			? {
					type,
					color: provider ? colorOf(type, provider) : "#8b5cf6",
					label: provider ? labelOf(type, provider) : t.pickFirst,
					number: typedGroups,
					name: name.trim() || "—",
					note: t.preview,
				}
			: acct
				? {
						type: acct.type,
						color: colorOf(acct.type, acct.provider),
						label: acct.providerLabel,
						number: `•••• •••• ${acct.accountNumberMasked.slice(-4)}`,
						name: acct.accountName,
						note: `${t.updated} ${fmtDate(acct.updatedAt)}`,
					}
				: null,
	);

	function errText(e: unknown): string {
		if (e instanceof ApiError) {
			// details = daftar galat validasi (VALIDATION_ERROR); galat lain menaruh objek error di sini.
			const d = (Array.isArray(e.details) ? e.details : []) as { message?: string }[];
			const msgs = d.map((x) => x?.message).filter(Boolean);
			if (msgs.length) return msgs.join(". ");
			if (e.message) return e.message;
		}
		return t.fail;
	}

	async function save(e: SubmitEvent) {
		e.preventDefault();
		if (busy) return;
		if (!provider) {
			err = t.pickFirst;
			return;
		}
		busy = true;
		msg = "";
		err = "";
		try {
			const res = await api<ApiResponse<PayAccount>>("/api/payouts/account", {
				method: "PUT",
				body: JSON.stringify({ type, provider, accountNumber: number, accountName: name, password: pw }),
			});
			acct = res.data;
			editing = false;
			msg = t.ok;
		} catch (e2) {
			err = errText(e2);
		} finally {
			pw = "";
			busy = false;
		}
	}

	async function remove() {
		if (busy) return;
		if (!delArmed || !pw) {
			delArmed = true;
			err = "";
			return;
		}
		busy = true;
		err = "";
		try {
			await api<ApiResponse<unknown>>("/api/payouts/account", { method: "DELETE", body: JSON.stringify({ password: pw }) });
			acct = null;
			editing = false;
			msg = t.deleted;
		} catch (e2) {
			err = errText(e2);
		} finally {
			pw = "";
			delArmed = false;
			busy = false;
		}
	}
</script>

{#snippet card(c: NonNullable<typeof preview>)}
	<div class="pa-card" style={`--pa-c:${c.color}`} aria-label={`${t.payTo}: ${c.label} ${c.number}, ${c.name}`}>
		<div class="pa-card-glow" aria-hidden="true"></div>
		<div class="relative flex items-start justify-between gap-3">
			<div class="min-w-0">
				<p class="pa-card-kicker">{c.type === "BANK" ? t.bank : t.ewallet}</p>
				<p class="pa-card-brand">{c.label}</p>
			</div>
			<!-- Chip kartu (dekoratif) -->
			<svg class="shrink-0 opacity-80" width="38" height="28" viewBox="0 0 38 28" aria-hidden="true">
				<rect x="0.5" y="0.5" width="37" height="27" rx="6" fill="rgba(255,255,255,0.14)" stroke="rgba(255,255,255,0.35)" />
				<path d="M13 1v26M25 1v26M1 10h12M25 10h12M1 18h12M25 18h12" stroke="rgba(255,255,255,0.35)" fill="none" />
			</svg>
		</div>
		<p class="pa-card-number relative">{c.number}</p>
		<div class="relative flex items-end justify-between gap-3">
			<div class="min-w-0">
				<p class="pa-card-kicker">{t.holder}</p>
				<p class="pa-card-name">{c.name}</p>
			</div>
			<p class="pa-card-note shrink-0">{c.note}</p>
		</div>
	</div>
{/snippet}

<section class="pa">
	<h3 class="pa-title">{t.title}</h3>
	<p class="mb-5 max-w-2xl text-sm leading-relaxed text-fg-muted">{t.body}</p>
	{#if msg}<p role="status" class="mb-4 rounded-[10px] bg-green-500/10 px-4 py-3 text-sm text-green-400">{msg}</p>{/if}

	{#if !loaded}
		<div class="pa-card pa-card--ghost animate-pulse" aria-hidden="true"></div>
	{:else if !editing}
		{#if acct && preview}
			<div class="flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-8">
				{@render card(preview)}
				<div class="flex flex-col items-start gap-3">
					<p class="text-sm text-fg-muted">{t.payTo}</p>
					<p class="text-fg">
						{acct.providerLabel} · <span class="font-mono tabular-nums">{acct.accountNumberMasked}</span>
					</p>
					<button type="button" class="pa-btn-ghost" onclick={startEdit}>{t.edit}</button>
				</div>
			</div>
		{:else}
			<button type="button" class="pa-empty" onclick={startEdit}>
				<span class="pa-empty-plus" aria-hidden="true">+</span>
				<span class="font-display text-lg font-light text-fg">{t.emptyTitle}</span>
				<span class="max-w-[17rem] text-center text-sm text-fg-muted">{t.emptyBody}</span>
				<span class="mt-1 text-sm font-medium text-safelight">{t.add} →</span>
			</button>
		{/if}
	{:else}
		<form class="pa-edit" onsubmit={save} oninput={() => (err = "")}>
			<div class="pa-edit-preview">
				{#if preview}{@render card(preview)}{/if}
			</div>

			<div class="min-w-0 flex-1">
				{#if err}<p role="alert" class="mb-4 rounded-[10px] bg-red-500/10 px-4 py-3 text-sm text-red-400">{err}</p>{/if}

				<!-- Jenis: Bank / E-wallet (segmen) -->
				<div class="pa-seg" role="radiogroup" aria-label={t.title}>
					<span class="pa-seg-thumb" class:pa-seg-thumb--r={type === "EWALLET"} aria-hidden="true"></span>
					{#each [["BANK", t.bank], ["EWALLET", t.ewallet]] as [v, label] (v)}
						<button type="button" role="radio" aria-checked={type === v} class="pa-seg-btn" onclick={() => setType(v as PayType)}>{label}</button>
					{/each}
				</div>

				<!-- Penyedia: ubin, bukan dropdown -->
				<p class="pa-label mt-6">{type === "BANK" ? t.pickBank : t.pickEw}</p>
				<div class="pa-grid" role="radiogroup" aria-label={type === "BANK" ? t.pickBank : t.pickEw}>
					{#each PROVIDERS[type] as p (p.code)}
						<button
							type="button"
							role="radio"
							aria-checked={provider === p.code}
							class="pa-tile"
							style={`--pa-c:${p.color}`}
							onclick={() => (provider = p.code)}
						>
							<span class="pa-dot" aria-hidden="true"></span>
							<span class="truncate">{p.label}</span>
						</button>
					{/each}
				</div>

				<div class="mt-6 grid gap-4 sm:grid-cols-2">
					<label class="block">
						<span class="pa-label">{type === "BANK" ? t.number : t.numberEw}</span>
						<input
							type="text"
							inputmode="numeric"
							bind:value={number}
							required
							maxlength={40}
							autocomplete="off"
							class="pa-input font-mono tabular-nums tracking-wider"
							placeholder={type === "BANK" ? "1234567890" : "081234567890"}
						/>
					</label>
					<label class="block">
						<span class="pa-label">{t.name}</span>
						<input type="text" bind:value={name} required minlength={3} maxlength={100} autocomplete="name" class="pa-input" placeholder="—" />
					</label>
				</div>

				<label class="mt-4 block">
					<span class="pa-label">{t.pw}</span>
					<input type="password" bind:value={pw} required autocomplete="current-password" class="pa-input" placeholder={t.pwPh} />
				</label>
				<p class="mt-2.5 flex items-center gap-2 text-xs text-fg-muted">
					<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
					{delArmed ? t.delSure : t.pwHint}
				</p>

				<div class="mt-6 flex flex-wrap items-center gap-3">
					<button type="submit" disabled={busy} class="press rounded-full bg-safelight px-7 py-3 text-sm font-medium text-ivory shadow-[0_14px_40px_-12px_var(--safelight-glow)] disabled:opacity-60">
						{busy ? "…" : t.save}
					</button>
					<button type="button" class="pa-btn-ghost" disabled={busy} onclick={() => (editing = false)}>{t.cancel}</button>
					{#if acct}
						<button type="button" class="pa-btn-ghost pa-btn-danger" disabled={busy} onclick={remove}>{t.del}</button>
					{/if}
				</div>
			</div>
		</form>
	{/if}
</section>

<style>
	.pa-title {
		margin: 0 0 0.6rem;
		font-family: var(--font-display);
		font-size: 1.4rem;
		font-weight: 300;
		color: var(--fg);
	}
	.pa-label {
		display: block;
		margin-bottom: 0.5rem;
		font-family: var(--font-mono, ui-monospace, monospace);
		font-size: 0.62rem;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: var(--fg-muted);
	}

	/* ── Kartu ── tetap gelap di tema terang (benda fisik), aksen = warna penyedia. */
	.pa-card {
		position: relative;
		overflow: hidden;
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		gap: 0.9rem;
		width: 100%;
		max-width: 22rem;
		aspect-ratio: 1.586;
		padding: 1.25rem 1.35rem;
		border-radius: 18px;
		color: #fff;
		background:
			radial-gradient(120% 140% at 0% 0%, color-mix(in srgb, var(--pa-c) 70%, transparent) 0%, transparent 60%),
			radial-gradient(90% 120% at 100% 100%, color-mix(in srgb, var(--pa-c) 35%, transparent) 0%, transparent 55%),
			linear-gradient(135deg, #1b1b24 0%, #0d0d12 100%);
		border: 1px solid rgba(255, 255, 255, 0.1);
		box-shadow:
			0 24px 60px -28px color-mix(in srgb, var(--pa-c) 80%, transparent),
			inset 0 1px 0 rgba(255, 255, 255, 0.12);
		transition: background 0.5s ease, box-shadow 0.5s ease;
		flex-shrink: 0;
	}
	.pa-card--ghost {
		background: color-mix(in srgb, var(--fg) 6%, transparent);
		box-shadow: none;
	}
	/* Kilau diagonal pelan. */
	.pa-card-glow {
		position: absolute;
		inset: -40%;
		background: linear-gradient(115deg, transparent 40%, rgba(255, 255, 255, 0.09) 50%, transparent 60%);
		transform: translateX(-30%);
		animation: pa-sheen 7s ease-in-out infinite;
		pointer-events: none;
	}
	@keyframes pa-sheen {
		0%, 55% { transform: translateX(-35%); }
		85%, 100% { transform: translateX(35%); }
	}
	@media (prefers-reduced-motion: reduce) {
		.pa-card-glow { animation: none; }
	}
	.pa-card-kicker {
		font-family: var(--font-mono, ui-monospace, monospace);
		font-size: 0.56rem;
		letter-spacing: 0.2em;
		text-transform: uppercase;
		color: rgba(255, 255, 255, 0.6);
	}
	.pa-card-brand {
		margin-top: 0.2rem;
		font-family: var(--font-display);
		font-size: 1.35rem;
		font-weight: 500;
		line-height: 1.1;
		letter-spacing: -0.01em;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.pa-card-number {
		font-family: var(--font-mono, ui-monospace, monospace);
		font-size: clamp(1.05rem, 2.6vw, 1.35rem);
		letter-spacing: 0.14em;
		font-variant-numeric: tabular-nums;
		text-shadow: 0 1px 0 rgba(0, 0, 0, 0.35);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.pa-card-name {
		margin-top: 0.15rem;
		font-size: 0.85rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.pa-card-note {
		font-size: 0.68rem;
		color: rgba(255, 255, 255, 0.6);
	}

	/* ── Kosong ── */
	.pa-empty {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.45rem;
		width: 100%;
		max-width: 22rem;
		aspect-ratio: 1.586;
		border: 1.5px dashed color-mix(in srgb, var(--fg-muted) 45%, transparent);
		border-radius: 18px;
		padding: 1.25rem;
		transition: border-color 0.25s ease, background 0.25s ease, transform 0.25s ease;
	}
	.pa-empty:hover,
	.pa-empty:focus-visible {
		border-color: var(--safelight);
		background: color-mix(in srgb, var(--safelight) 6%, transparent);
		transform: translateY(-2px);
	}
	.pa-empty-plus {
		display: grid;
		place-items: center;
		width: 2.6rem;
		height: 2.6rem;
		border-radius: 999px;
		background: color-mix(in srgb, var(--safelight) 16%, transparent);
		color: var(--safelight);
		font-size: 1.5rem;
		line-height: 1;
	}

	/* ── Form ── */
	.pa-edit {
		display: flex;
		flex-direction: column;
		gap: 1.75rem;
		padding: 1.5rem;
		border: 1px solid var(--hair);
		border-radius: 14px;
		background: var(--bg);
	}
	@media (min-width: 1024px) {
		.pa-edit {
			flex-direction: row;
			align-items: flex-start;
			gap: 2.25rem;
		}
		.pa-edit-preview {
			position: sticky;
			top: 6.5rem;
			width: 20rem;
			flex-shrink: 0;
		}
	}
	.pa-seg {
		position: relative;
		display: inline-grid;
		grid-template-columns: 1fr 1fr;
		padding: 4px;
		border: 1px solid var(--hair);
		border-radius: 999px;
		min-width: 15rem;
	}
	.pa-seg-thumb {
		position: absolute;
		top: 4px;
		bottom: 4px;
		left: 4px;
		width: calc(50% - 4px);
		border-radius: 999px;
		background: var(--safelight);
		transition: transform 0.35s cubic-bezier(0.3, 0.7, 0.2, 1);
	}
	.pa-seg-thumb--r {
		transform: translateX(100%);
	}
	@media (prefers-reduced-motion: reduce) {
		.pa-seg-thumb { transition: none; }
	}
	.pa-seg-btn {
		position: relative;
		padding: 0.55rem 1.1rem;
		border-radius: 999px;
		font-size: 0.85rem;
		font-weight: 500;
		color: var(--fg-muted);
		transition: color 0.25s ease;
	}
	.pa-seg-btn[aria-checked="true"] {
		color: #fff;
	}
	.pa-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.5rem;
	}
	@media (min-width: 640px) {
		.pa-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
	}
	.pa-tile {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		min-width: 0;
		padding: 0.7rem 0.85rem;
		border: 1px solid var(--hair);
		border-radius: 10px;
		font-size: 0.85rem;
		color: var(--fg);
		text-align: left;
		transition: border-color 0.2s ease, background 0.2s ease, transform 0.2s ease;
	}
	.pa-tile:hover {
		border-color: color-mix(in srgb, var(--pa-c) 60%, var(--hair));
		transform: translateY(-1px);
	}
	.pa-tile[aria-checked="true"] {
		border-color: var(--pa-c);
		background: color-mix(in srgb, var(--pa-c) 14%, transparent);
		box-shadow: 0 0 0 1px var(--pa-c) inset;
	}
	.pa-dot {
		width: 0.7rem;
		height: 0.7rem;
		flex-shrink: 0;
		border-radius: 999px;
		background: var(--pa-c);
		box-shadow: 0 0 0 3px color-mix(in srgb, var(--pa-c) 22%, transparent);
	}
	.pa-input {
		width: 100%;
		padding: 0.8rem 1rem;
		border: 1px solid var(--hair);
		border-radius: 10px;
		background: transparent;
		color: var(--fg);
		font-size: 0.95rem;
		outline: none;
		transition: border-color 0.2s ease;
	}
	.pa-input:focus {
		border-color: var(--safelight);
	}
	.pa-input::placeholder {
		color: color-mix(in srgb, var(--fg-muted) 55%, transparent);
	}
	.pa-btn-ghost {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 0.6rem 1.2rem;
		border-radius: 999px;
		border: 1px solid var(--hair);
		color: var(--fg);
		font-size: 0.85rem;
		font-weight: 500;
		transition: border-color 0.2s ease, color 0.2s ease;
	}
	.pa-btn-ghost:hover {
		border-color: var(--safelight);
		color: var(--safelight);
	}
	.pa-btn-danger {
		color: rgb(248 113 113);
		border-color: rgb(239 68 68 / 0.4);
	}
	.pa-btn-danger:hover {
		border-color: rgb(239 68 68);
		color: rgb(239 68 68);
	}
</style>
