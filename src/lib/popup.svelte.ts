/**
 * Popup — port 1:1 dari components/Popup.tsx (React Context + usePopup hook)
 * ke Svelte 5 runes singleton. UI-nya dirender oleh components/Popup.svelte
 * (dipasang sekali di +layout.svelte).
 *
 * ── EXPORTED API ─────────────────────────────────────────────────────────
 * type PopupData = {
 *   title: string;
 *   body?: string;
 *   icon?: string;          // ikon/emoji di atas judul
 *   confirmLabel?: string;  // default "OK"
 *   cancelLabel?: string;   // tombol kedua (batal), opsional
 *   onConfirm?: () => void; // dipanggil saat dikonfirmasi
 *   onCancel?: () => void;  // dipanggil saat dibatalkan/ditutup
 * };
 *
 * const popup = new Popup();           // singleton, `import { popup } from "$lib/popup.svelte"`
 * popup.data: PopupData | null         // $state — dialog aktif (jangan diubah manual)
 * popup.popup(data: PopupData): Promise<boolean>
 *   → tampilkan popup; Promise resolve `true` (confirm) atau `false`
 *     (cancel/dismiss/Escape/klik overlay).
 * popup.close(v: boolean): void        // internal — dipanggil Popup.svelte
 *                                      // setelah transisi keluar selesai.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Contoh:
 *   import { popup } from "$lib/popup.svelte";
 *   const ok = await popup.popup({ title: "Hapus foto?", confirmLabel: "Hapus", cancelLabel: "Batal" });
 */
export type PopupData = {
	title: string;
	body?: string;
	/** Ikon/emoji opsional yang ditampilkan di atas judul */
	icon?: string;
	/** Label tombol konfirmasi — default "OK" */
	confirmLabel?: string;
	/** Tombol kedua opsional (batal) */
	cancelLabel?: string;
	/** Dipanggil saat dikonfirmasi */
	onConfirm?: () => void;
	/** Dipanggil saat dibatalkan atau ditutup */
	onCancel?: () => void;
};

class Popup {
	/** Dialog aktif; null = tidak ada popup tampil. */
	data = $state<PopupData | null>(null);

	#resolve: (v: boolean) => void = () => {};

	/** Tampilkan popup; resolve `true` (confirm) / `false` (cancel/dismiss). */
	popup(d: PopupData): Promise<boolean> {
		return new Promise((resolve) => {
			this.#resolve = resolve;
			this.data = d;
		});
	}

	/** Selesaikan dialog (dipanggil Popup.svelte setelah animasi keluar). */
	close(v: boolean) {
		const d = this.data;
		if (v) d?.onConfirm?.();
		else d?.onCancel?.();
		this.#resolve(v);
		this.data = null;
	}
}

export const popup = new Popup();
