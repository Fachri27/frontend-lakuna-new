<script lang="ts">
	import { goto } from "$app/navigation";
	import { store } from "$lib/store.svelte";
	import { i18n } from "$lib/i18n.svelte";
	import type { AuthMode } from "$lib/authModal.svelte";

	/**
	 * Panel formulir auth reusable — dipakai halaman /login DAN popup global.
	 * Strukturnya mengikuti pola popup referensi: judul "Masuk atau Daftar",
	 * kolom email + kata sandi (intip), tombol utama, divider "atau", Google,
	 * lalu alih mode lewat tombol "Buat akun" / "Masuk" — tanpa tab.
	 */
	let {
		redirectTo,
		initialMode = "login",
		onDone,
	}: {
		redirectTo: string;
		initialMode?: AuthMode;
		onDone?: () => void;
	} = $props();

	// Client ID Google Identity Services (GSI script sudah dimuat di app.html).
	const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

	/** Tipe API accounts.id dari GSI (mirip deklarasi global di LoginPage.tsx legacy). */
	type GoogleId = {
		initialize: (config: {
			client_id: string;
			callback: (response: { credential: string }) => void;
			cancel_on_tap_outside?: boolean;
		}) => void;
		prompt?: (callback?: (notification: { isNotDisplayed: () => boolean; isSkippedMoment: () => boolean }) => void) => void;
		renderButton: (container: HTMLElement, config: { theme?: string; size?: string; width?: number; text?: string }) => void;
	};
	const gsi = (): GoogleId | undefined =>
		(window as unknown as { google?: { accounts: { id?: GoogleId } } }).google?.accounts?.id;

	const copy = {
		id: {
			title: "Masuk atau Daftar",
			emailLabel: "Email", emailPlaceholder: "nama@email.com",
			passwordLabel: "Kata sandi", passwordPlaceholder: "Kata sandi",
			showPw: "Tampilkan kata sandi", hidePw: "Sembunyikan kata sandi",
			username: "Nama pengguna", usernameHint: "Minimal 3 karakter",
			passwordHint: "Minimal 6 karakter",
			loginBtn: "Masuk", registerBtn: "Daftar", processing: "Memproses…",
			or: "atau", google: "Lanjutkan dengan Google",
			noAccountFree: "Belum punya akun gratis?", createAccount: "Buat akun",
			hasAccountQ: "Sudah punya akun?", backToLogin: "Masuk",
			error: "Terjadi kesalahan", success: "Pendaftaran berhasil! Silakan masuk",
			googleNotRegistered: "Email belum terdaftar. Silakan daftar terlebih dahulu",
		},
		en: {
			title: "Sign in or Register",
			emailLabel: "Email", emailPlaceholder: "name@email.com",
			passwordLabel: "Password", passwordPlaceholder: "Password",
			showPw: "Show password", hidePw: "Hide password",
			username: "Username", usernameHint: "Minimum 3 characters",
			passwordHint: "Minimum 6 characters",
			loginBtn: "Sign in", registerBtn: "Sign up", processing: "Processing…",
			or: "or", google: "Continue with Google",
			noAccountFree: "Don't have a free account yet?", createAccount: "Create account",
			hasAccountQ: "Already have an account?", backToLogin: "Sign in",
			error: "An error occurred", success: "Registration successful! Please sign in",
			googleNotRegistered: "Email not registered. Please sign up first",
		},
	};

	const lang = $derived(i18n.lang);
	const t = $derived(copy[lang]);

	let mode = $state<AuthMode>(initialMode);
	let email = $state("");
	let name = $state("");
	let password = $state("");
	let showPw = $state(false);
	let loading = $state(false);
	let error = $state("");
	let success = $state("");
	let gsiBox = $state<HTMLDivElement>();

	function finish() {
		if (onDone) onDone();
		else goto(redirectTo);
	}

	async function handleGoogleCredential(response: { credential: string }) {
		error = "";
		try {
			const result = await store.googleLogin(response.credential);
			if (result.registered) {
				finish();
			} else {
				error = t.googleNotRegistered;
				email = result.email || "";
				name = result.name || "";
				mode = "register";
			}
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : t.error;
			error = msg;
		}
	}

	// Inisialisasi GSI: poll sampai window.google siap, lalu render tombol ke
	// kotak milik panel ini (bind:this, bukan id — halaman dan popup bisa
	// hidup bersamaan tanpa tabrakan).
	$effect(() => {
		if (!GOOGLE_CLIENT_ID) return;
		const box = gsiBox;
		if (!box) return;
		const interval = setInterval(() => {
			const g = gsi();
			if (g) {
				g.initialize({
					client_id: GOOGLE_CLIENT_ID,
					callback: handleGoogleCredential,
					cancel_on_tap_outside: true,
				});
				g.renderButton(box, {
					theme: "outline",
					size: "large",
					width: box.offsetWidth || 360,
					text: "continue_with",
				});
				clearInterval(interval);
			}
		}, 100);
		return () => clearInterval(interval);
	});

	async function submit(e: SubmitEvent) {
		e.preventDefault();
		loading = true;
		error = "";
		success = "";
		try {
			if (mode === "login") {
				await store.login(email, password);
				finish();
			} else {
				await store.register(name, email, password);
				success = t.success;
				mode = "login";
			}
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : t.error;
			error = msg;
		} finally {
			loading = false;
		}
	}
</script>

<h2 class="text-center font-display text-[clamp(1.6rem,3.4vw,2.2rem)] font-medium tracking-[-0.01em] text-fg">
	{t.title}
</h2>

<form onsubmit={submit} class="mt-7 space-y-4">
	{#if error}<p role="alert" class="rounded-[10px] bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</p>{/if}
	{#if success}<p role="status" class="rounded-[10px] bg-green-500/10 px-4 py-3 text-sm text-green-400">{success}</p>{/if}

	{#if mode === "register"}
		<label class="block">
			<span class="text-sm font-medium text-fg">{t.username}</span>
			<input
				type="text"
				bind:value={name}
				required
				autocomplete="username"
				placeholder={t.username}
				class="mt-1.5 w-full rounded-[10px] border border-hair bg-surface px-4 py-3 text-sm text-fg outline-none transition-colors placeholder:text-fg-muted/60 focus:border-safelight"
			/>
			<span class="mt-1.5 block text-xs text-fg-muted">{t.usernameHint}</span>
		</label>
	{/if}
	<label class="block">
		<span class="text-sm font-medium text-fg">{t.emailLabel}</span>
		<input
			type="email"
			bind:value={email}
			required
			autocomplete="email"
			placeholder={t.emailPlaceholder}
			class="mt-1.5 w-full rounded-[10px] border border-hair bg-surface px-4 py-3 text-sm text-fg outline-none transition-colors placeholder:text-fg-muted/60 focus:border-safelight"
		/>
	</label>
	<label class="block">
		<span class="text-sm font-medium text-fg">{t.passwordLabel}</span>
		<span class="relative mt-1.5 block">
			<input
				type={showPw ? "text" : "password"}
				bind:value={password}
				required
				autocomplete={mode === "login" ? "current-password" : "new-password"}
				placeholder={t.passwordPlaceholder}
				class="w-full rounded-[10px] border border-hair bg-surface py-3 pl-4 pr-12 text-sm text-fg outline-none transition-colors placeholder:text-fg-muted/60 focus:border-safelight"
			/>
			<button
				type="button"
				onclick={() => (showPw = !showPw)}
				aria-label={showPw ? t.hidePw : t.showPw}
				aria-pressed={showPw}
				class="tap-expand absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full text-fg-muted transition-colors hover:text-fg"
			>
				{#if showPw}
					<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></svg>
				{:else}
					<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.6 10.6 0 0 1 12 19c-6.5 0-10-7-10-7a17.6 17.6 0 0 1 4.06-4.94M9.9 4.24A10.4 10.4 0 0 1 12 5c6.5 0 10 7 10 7a17.7 17.7 0 0 1-2.16 3.19M14.12 14.12A3 3 0 1 1 9.88 9.88" /><path d="M2 2l20 20" /></svg>
				{/if}
			</button>
		</span>
		{#if mode === "register"}
			<span class="mt-1.5 block text-xs text-fg-muted">{t.passwordHint}</span>
		{/if}
	</label>

	<button type="submit" disabled={loading} class="press w-full rounded-[10px] bg-safelight py-3.5 text-sm font-semibold text-ivory shadow-[0_14px_40px_-12px_var(--safelight-glow)] transition-transform hover:scale-[1.01] disabled:opacity-60">
		{loading ? t.processing : mode === "login" ? t.loginBtn : t.registerBtn}
	</button>
</form>

<div class="my-5 flex items-center gap-4">
	<span class="rule flex-1"></span>
	<span class="text-sm text-fg-muted">{t.or}</span>
	<span class="rule flex-1"></span>
</div>

<div class="flex justify-center">
	<div bind:this={gsiBox} class="w-full [&>div]:w-full [&>div]:mx-auto">
		{#if !GOOGLE_CLIENT_ID}
			<button type="button" disabled class="w-full cursor-not-allowed rounded-[10px] border border-hair py-3 text-sm font-medium text-fg opacity-40">
				{t.google}
			</button>
		{/if}
	</div>
</div>

{#if mode === "login"}
	<p class="mt-6 text-[0.95rem] text-fg-muted">{t.noAccountFree}</p>
	<button
		type="button"
		onclick={() => (mode = "register")}
		class="press mt-3 w-full rounded-[10px] border border-hair py-3 text-sm font-semibold text-fg transition-colors hover:border-safelight hover:text-safelight active:border-safelight active:text-safelight"
	>
		{t.createAccount}
	</button>
{:else}
	<p class="mt-6 text-[0.95rem] text-fg-muted">{t.hasAccountQ}</p>
	<button
		type="button"
		onclick={() => (mode = "login")}
		class="press mt-3 w-full rounded-[10px] border border-hair py-3 text-sm font-semibold text-fg transition-colors hover:border-safelight hover:text-safelight active:border-safelight active:text-safelight"
	>
		{t.backToLogin}
	</button>
{/if}
