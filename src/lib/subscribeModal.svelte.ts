/**
 * Popup harga langganan global. Dibuka dari halaman detail foto/video saat
 * pembeli memilih lisensi Premium: Premium itu langganan berkuota, bukan harga
 * satuan, jadi tombol utama membuka popup ini (bukan checkout).
 *
 * Paket dimuat sekali lalu diingat: halaman detail juga memakai `fromMonthly`
 * (paket termurah) untuk label harga di baris Premium.
 */
import { fetchPlans, type Plan } from "$lib/data";

class SubscribeModalState {
	isOpen = $state(false);
	plans = $state<Plan[]>([]);
	loading = $state(false);
	failed = $state(false);
	#inflight: Promise<void> | null = null;

	/** Harga bulanan terendah di antara paket; 0 = belum dimuat / tak ada. */
	get fromMonthly(): number {
		const prices = this.plans.map((p) => p.priceMonthly).filter((n) => n > 0);
		return prices.length ? Math.min(...prices) : 0;
	}

	/** Muat paket sekali; panggilan berikutnya memakai hasil yang sama. */
	load(): Promise<void> {
		if (this.plans.length) return Promise.resolve();
		if (this.#inflight) return this.#inflight;
		this.loading = true;
		this.failed = false;
		this.#inflight = fetchPlans()
			.then((p) => {
				this.plans = p;
				this.failed = p.length === 0;
			})
			.catch(() => {
				this.failed = true;
			})
			.finally(() => {
				this.loading = false;
				this.#inflight = null;
			});
		return this.#inflight;
	}

	open() {
		this.isOpen = true;
		void this.load();
	}

	close() {
		this.isOpen = false;
	}
}

export const subscribeModal = new SubscribeModalState();
