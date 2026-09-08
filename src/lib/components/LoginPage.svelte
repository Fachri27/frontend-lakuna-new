<script lang="ts">
	import { goto } from "$app/navigation";
	import { page } from "$app/state";
	import { i18n } from "$lib/i18n.svelte";
	import { store } from "$lib/store.svelte";
	import Reveal from "./Reveal.svelte";

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
			kicker: "Masuk", loginTitle: "Selamat datang kembali", registerTitle: "Buat akun baru",
			email: "Email", password: "Password", username: "Nama pengguna", usernameHint: "Minimal 3 karakter",
			passwordHint: "Minimal 6 karakter", loginBtn: "Masuk", registerBtn: "Daftar", processing: "Memproses…",
			noAccount: "Belum punya akun?", hasAccount: "Sudah punya akun?", or: "atau",
			google: "Lanjut dengan Google", tabLogin: "Masuk", tabRegister: "Daftar",
			error: "Terjadi kesalahan", success: "Pendaftaran berhasil! Silakan masuk.",
			googleNotRegistered: "Email belum terdaftar. Silakan daftar terlebih dahulu.",
		},
		en: {
			kicker: "Sign in", loginTitle: "Welcome back", registerTitle: "Create a new account",
			email: "Email", password: "Password", username: "Username", usernameHint: "Minimum 3 characters",
			passwordHint: "Minimum 6 characters", loginBtn: "Sign in", registerBtn: "Sign up", processing: "Processing…",
			noAccount: "Don't have an account?", hasAccount: "Already have an account?", or: "or",
			google: "Continue with Google", tabLogin: "Sign in", tabRegister: "Sign up",
			error: "An error occurred", success: "Registration successful! Please sign in.",
			googleNotRegistered: "Email not registered. Please sign up first.",
		},
	};

	const lang = $derived(i18n.lang);
	const t = $derived(copy[lang]);

	const redirectTo = $derived(page.url.searchParams.get("redirect") || "/profile");

	let mode = $state<"login" | "register">("login");
	let email = $state("");
	let name = $state("");
	let password = $state("");
	let loading = $state(false);
	let error = $state("");
	let success = $state("");

	async function handleGoogleCredential(response: { credential: string }) {
		error = "";
		try {
			const result = await store.googleLogin(response.credential);
			if (result.registered) {
				goto(redirectTo);
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

	// Inisialisasi GSI: poll sampai window.google siap, lalu render tombol.
	$effect(() => {
		if (!GOOGLE_CLIENT_ID) return;
		const interval = setInterval(() => {
			const g = gsi();
			if (g) {
				g.initialize({
					client_id: GOOGLE_CLIENT_ID,
					callback: handleGoogleCredential,
					cancel_on_tap_outside: true,
				});
				const container = document.getElementById("google-signin-btn");
				if (container) {
					g.renderButton(container, {
						theme: "outline",
						size: "large",
						width: container.offsetWidth || 360,
						text: "continue_with",
					});
				}
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
				goto(redirectTo);
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

<section class="mx-auto flex min-h-[80svh] max-w-md flex-col justify-center px-6 pt-36 pb-20 lg:pt-44">
	<Reveal>
		<p data-reveal class="kicker text-safelight">{t.kicker}</p>
		<h1 data-reveal class="mt-5 font-display text-[clamp(2rem,5vw,3.4rem)] font-light leading-[1.02] tracking-[-0.02em] text-fg">
			{mode === "login" ? t.loginTitle : t.registerTitle}
		</h1>

		<!-- Tabs -->
		<div data-reveal role="tablist" aria-label="Login mode" class="mt-8 inline-flex w-full rounded-full border border-hair p-1">
			<button type="button" role="tab" aria-selected={mode === "login"} onclick={() => (mode = "login")} class={`kicker flex-1 rounded-full py-2.5 transition-colors ${mode === "login" ? "bg-fg text-bg" : "text-fg-muted"}`}>{t.tabLogin}</button>
			<button type="button" role="tab" aria-selected={mode === "register"} onclick={() => (mode = "register")} class={`kicker flex-1 rounded-full py-2.5 transition-colors ${mode === "register" ? "bg-fg text-bg" : "text-fg-muted"}`}>{t.tabRegister}</button>
		</div>

		<form data-reveal onsubmit={submit} class="mt-6 space-y-4">
			{#if error}<p class="rounded-md bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</p>{/if}
			{#if success}<p class="rounded-md bg-green-500/10 px-4 py-3 text-sm text-green-400">{success}</p>{/if}

			{#if mode === "register"}
				<label class="block">
					<span class="kicker text-fg-muted">{t.username}</span>
					<input
						type="text"
						bind:value={name}
						required
						class="mt-2 w-full rounded-md border border-hair bg-surface px-4 py-3 text-sm text-fg outline-none transition-colors focus:border-safelight"
					/>
					<span class="mt-1.5 block text-xs text-fg-muted">{t.usernameHint}</span>
				</label>
			{/if}
			<label class="block">
				<span class="kicker text-fg-muted">{t.email}</span>
				<input
					type="email"
					bind:value={email}
					required
					class="mt-2 w-full rounded-md border border-hair bg-surface px-4 py-3 text-sm text-fg outline-none transition-colors focus:border-safelight"
				/>
			</label>
			<label class="block">
				<span class="kicker text-fg-muted">{t.password}</span>
				<input
					type="password"
					bind:value={password}
					required
					class="mt-2 w-full rounded-md border border-hair bg-surface px-4 py-3 text-sm text-fg outline-none transition-colors focus:border-safelight"
				/>
				<span class="mt-1.5 block text-xs text-fg-muted">{t.passwordHint}</span>
			</label>

			<button type="submit" disabled={loading} class="w-full rounded-full bg-safelight py-3.5 text-sm font-medium text-ivory shadow-[0_14px_40px_-12px_var(--safelight-glow)] transition-transform hover:scale-[1.02] disabled:opacity-60">
				{loading ? t.processing : mode === "login" ? t.loginBtn : t.registerBtn}
			</button>
		</form>

		<div data-reveal class="my-5 flex items-center gap-4">
			<span class="rule flex-1"></span>
			<span class="kicker text-fg-muted">{t.or}</span>
			<span class="rule flex-1"></span>
		</div>

		<div data-reveal class="flex justify-center">
			<div id="google-signin-btn" class="w-full [&>div]:w-full [&>div]:mx-auto">
				{#if !GOOGLE_CLIENT_ID}
					<button type="button" disabled class="w-full rounded-full border border-hair py-3.5 text-sm font-medium text-fg opacity-40 cursor-not-allowed">
						{t.google}
					</button>
				{/if}
			</div>
		</div>

		<p data-reveal class="mt-6 text-center text-sm text-fg-muted">
			{mode === "login" ? t.noAccount : t.hasAccount}
			{" "}
			<button type="button" onclick={() => (mode = mode === "login" ? "register" : "login")} class="text-safelight underline-offset-4 hover:underline">
				{mode === "login" ? t.tabRegister : t.tabLogin}
			</button>
		</p>
	</Reveal>
</section>
