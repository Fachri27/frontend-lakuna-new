<script lang="ts">
	/**
	 * Kolom pencarian arsip — dipakai halaman Foto & Video supaya keduanya
	 * benar-benar sama, bukan dua salinan yang pelan-pelan berbeda.
	 *
	 * Bahasanya mengikuti rel pencarian di hero: garis bawah tipis, bukan
	 * kotak. Mengetik menyaring langsung (jeda diatur pemanggil); Enter
	 * menuliskan kata kuncinya ke URL lewat `onsubmit` supaya hasilnya bisa
	 * dibagikan.
	 */
	let {
		value = $bindable(""),
		placeholder,
		label,
		clearLabel,
		submitLabel,
		onsubmit,
		onclear,
		class: className = "",
	}: {
		value?: string;
		placeholder: string;
		label: string;
		clearLabel: string;
		submitLabel: string;
		onsubmit?: (e: SubmitEvent) => void;
		onclear?: () => void;
		class?: string;
	} = $props();

	function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		onsubmit?.(e);
	}

	function handleClear() {
		value = "";
		onclear?.();
	}
</script>

<form role="search" onsubmit={handleSubmit} class={`w-full max-w-[34rem] ${className}`}>
	<div
		class="group flex items-center gap-3 border-b border-hair pb-3 transition-colors duration-500 focus-within:border-safelight"
	>
		<svg
			width="17"
			height="17"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="1.7"
			stroke-linecap="round"
			stroke-linejoin="round"
			class="pointer-events-none shrink-0 text-fg-muted transition-colors duration-500 group-focus-within:text-safelight"
			aria-hidden="true"
		>
			<circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
		</svg>
		<input
			type="search"
			bind:value
			{placeholder}
			aria-label={label}
			class="min-w-0 flex-1 bg-transparent text-[0.98rem] text-fg outline-none placeholder:text-fg-muted/70"
		/>
		{#if value}
			<button
				type="button"
				onclick={handleClear}
				aria-label={clearLabel}
				data-no-hover-sound
				data-no-click-sound
				class="tap-expand grid h-7 w-7 shrink-0 place-items-center rounded-full text-fg-muted transition-colors duration-500 hover:text-safelight focus-visible:text-safelight focus-visible:outline-none"
			>
				<svg
					width="13"
					height="13"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					aria-hidden="true"
				>
					<path d="M6 6l12 12M18 6L6 18" />
				</svg>
			</button>
		{/if}
		<button
			type="submit"
			aria-label={submitLabel}
			data-no-hover-sound
			data-no-click-sound
			class="kicker shrink-0 text-fg-muted transition-colors duration-500 hover:text-safelight focus-visible:text-safelight focus-visible:outline-none"
		>
			<span class="arr">→</span>
		</button>
	</div>
</form>

<style>
	/* Tombol × bawaan browser (input type=search) disembunyikan: komponen
	   sudah punya tombol hapus sendiri — tanpa ini × tampil ganda. */
	input[type="search"]::-webkit-search-cancel-button {
		display: none;
	}
</style>
