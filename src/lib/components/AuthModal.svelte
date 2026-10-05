<script lang="ts">
	import { goto } from "$app/navigation";
	import { page } from "$app/state";
	import { authModal } from "$lib/authModal.svelte";
	import { i18n } from "$lib/i18n.svelte";
	import { fetchPhotos, imgFor, type Photo } from "$lib/data";
	import ApiImage from "./ApiImage.svelte";
	import AuthPanel from "./AuthPanel.svelte";

	/**
	 * Popup auth global — dibuka dari mana pun butuh login tanpa pindah
	 * halaman. Strukturnya mengikuti popup referensi: panel gambar + panel
	 * formulir, hanya saja panel kirinya bingkai nyata dari arsip Lakuna
	 * (bukan stok generik) dengan headline khas situs.
	 */
	const copy = {
		id: {
			sideTitle: "Buka arsip Nusantara",
			sideBody: "Satu akun untuk menyimpan bingkai favorit, mengunduh pratinjau, dan melisensikan karya dari Sabang sampai Merauke",
		},
		en: {
			sideTitle: "Open the Nusantara archive",
			sideBody: "One account to save favourite frames, download previews, and license works from Sabang to Merauke",
		},
	};
	const lang = $derived(i18n.lang);
	const t = $derived(copy[lang]);

	let dialogEl = $state<HTMLDivElement>();
	let closeEl = $state<HTMLButtonElement>();
	let frame = $state<Photo | null>(null);
	const frameSrc = $derived(
		frame ? imgFor(frame.seed, 900, 1100, frame.thumbUrl) : imgFor("auth-side", 900, 1100),
	);

	function done() {
		const to = authModal.redirect;
		authModal.close();
		// Tetap di halaman bila redirect-nya halaman ini sendiri (kasus umum:
		// requireAuth dari tambah keranjang/favorit) — tanpa reload.
		const cur = page.url.pathname + page.url.search;
		if (to !== cur) goto(to);
	}

	$effect(() => {
		if (!authModal.isOpen) return;
		let alive = true;
		fetchPhotos({ limit: 1 })
			.then((r) => {
				if (alive && r.photos.length > 0) frame = r.photos[0];
			})
			.catch(() => {});
		closeEl?.focus();
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				authModal.close();
				return;
			}
			if (e.key === "Tab" && dialogEl) {
				const focusable = dialogEl.querySelectorAll<HTMLElement>(
					"button, [href], input, [tabindex]:not([tabindex='-1'])",
				);
				if (focusable.length === 0) return;
				const first = focusable[0];
				const last = focusable[focusable.length - 1];
				if (e.shiftKey && document.activeElement === first) {
					e.preventDefault();
					last.focus();
				} else if (!e.shiftKey && document.activeElement === last) {
					e.preventDefault();
					first.focus();
				}
			}
		};
		window.addEventListener("keydown", onKey);
		const prev = document.body.style.overflow;
		document.body.style.overflow = "hidden";
		return () => {
			alive = false;
			window.removeEventListener("keydown", onKey);
			document.body.style.overflow = prev;
		};
	});
</script>

{#if authModal.isOpen}
	<div
		class="fixed inset-0 z-[90] grid place-items-center overflow-y-auto bg-ocean-deep/80 p-4 backdrop-blur-sm sm:p-6"
		onclick={() => authModal.close()}
	>
		<div
			bind:this={dialogEl}
			role="dialog"
			aria-modal="true"
			aria-label="Masuk"
			data-no-hover-sound
			data-no-click-sound
			class="relative grid w-full max-w-3xl overflow-hidden rounded-md bg-surface shadow-[0_50px_120px_-40px_rgba(0,0,0,0.6)] md:grid-cols-2"
			onclick={(e) => e.stopPropagation()}
		>
			<!-- Panel gambar: satu bingkai arsip + headline -->
			<div class="on-darkroom relative h-44 overflow-hidden bg-darkroom sm:h-52 md:h-auto md:min-h-[560px]">
				<ApiImage src={frameSrc} alt="" fill eager class="object-cover" />
				<div aria-hidden="true" class="pointer-events-none absolute inset-0 bg-gradient-to-t from-ocean-deep/85 via-ocean-deep/25 to-ocean-deep/35"></div>
				<div aria-hidden="true" class="grain pointer-events-none absolute inset-0 opacity-[0.14] mix-blend-soft-light"></div>
				<div class="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
					<p class="font-display text-[clamp(1.5rem,3.4vw,2.3rem)] font-medium leading-[1.1] tracking-[-0.01em] text-ivory">
						{t.sideTitle}
					</p>
					<p class="mt-4 max-w-[32ch] text-[0.92rem] leading-relaxed text-ivory/80">
						{t.sideBody}
					</p>
				</div>
			</div>
			<!-- Panel formulir -->
			<div class="relative bg-surface p-6 sm:p-8">
				<button
					bind:this={closeEl}
					type="button"
					onclick={() => authModal.close()}
					aria-label="Tutup"
					class="tap-expand absolute right-4 top-4 z-10 grid h-9 w-9 place-items-center rounded-full text-fg/40 transition-colors hover:bg-hair/40 hover:text-fg active:bg-hair/40 active:text-fg"
				>
					<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
						<path d="M6 6l12 12M18 6L6 18" />
					</svg>
				</button>
				{#key authModal.mode}
					<AuthPanel redirectTo={authModal.redirect} initialMode={authModal.mode} onDone={done} />
				{/key}
			</div>
		</div>
	</div>
{/if}
