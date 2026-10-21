import { fetchPhotoOriginal, type Sound } from "./data";

/**
 * Pemutar halaman Sounds — SATU elemen <audio> untuk seluruh situs: memutar lagu lain menghentikan yang sedang
 * jalan, dan bilah pemutar bawah (SoundPlayerBar) tetap hidup saat pindah antara /sounds dan /sounds/<id>.
 *
 * Yang diputar selalu PRATINJAU (MP3 128 kbps bertanda denting dari API); berkas asli hanya lewat unduhan
 * berlisensi. URL pratinjau presigned berumur 1 jam — bila gagal dimuat (kedaluwarsa), URL baru diminta sekali
 * lewat /api/photos/:id/view lalu diputar ulang dari posisi terakhir.
 */
class SoundPlayer {
	track = $state<Sound | null>(null);
	/** Urutan putar (daftar yang sedang tampil) — tombol maju/mundur & lanjut otomatis. */
	queue = $state<Sound[]>([]);
	playing = $state(false);
	/** Menunggu data (memuat / buffering). */
	loading = $state(false);
	time = $state(0);
	duration = $state(0);
	volume = $state(0.9);
	error = $state(false);

	#audio: HTMLAudioElement | null = null;
	#retried = new Set<string>();

	get progress() {
		const d = this.duration || this.track?.duration || 0;
		return d > 0 ? Math.min(1, this.time / d) : 0;
	}

	isCurrent(id: string) {
		return this.track?.id === id;
	}

	#el(): HTMLAudioElement | null {
		if (typeof window === "undefined") return null;
		if (this.#audio) return this.#audio;
		const a = new Audio();
		a.preload = "metadata";
		a.volume = this.volume;
		a.addEventListener("play", () => (this.playing = true));
		a.addEventListener("pause", () => (this.playing = false));
		a.addEventListener("waiting", () => (this.loading = true));
		a.addEventListener("seeking", () => (this.loading = true));
		a.addEventListener("playing", () => (this.loading = false));
		a.addEventListener("canplay", () => (this.loading = false));
		a.addEventListener("seeked", () => (this.loading = false));
		a.addEventListener("timeupdate", () => (this.time = a.currentTime));
		a.addEventListener("loadedmetadata", () => {
			if (Number.isFinite(a.duration) && a.duration > 0) this.duration = a.duration;
		});
		a.addEventListener("ended", () => {
			this.playing = false;
			this.next(true);
		});
		a.addEventListener("error", () => void this.#recover());
		this.#audio = a;
		return a;
	}

	/** URL pratinjau gagal (biasanya presigned kedaluwarsa) → minta URL baru sekali, lanjutkan dari posisi tadi. */
	async #recover() {
		const t = this.track;
		const a = this.#audio;
		if (!t || !a) return;
		if (this.#retried.has(t.id)) {
			this.loading = false;
			this.playing = false;
			this.error = true;
			return;
		}
		this.#retried.add(t.id);
		const at = a.currentTime || this.time;
		const fresh = await fetchPhotoOriginal(t.id).catch(() => null);
		if (!fresh || this.track?.id !== t.id) {
			this.error = true;
			this.loading = false;
			return;
		}
		t.previewUrl = fresh;
		a.src = fresh;
		a.currentTime = at;
		void a.play().catch(() => (this.loading = false));
	}

	/** Putar `track` (atau jeda/lanjutkan bila itu lagu yang sedang aktif). `queue` = daftar tempat ia berada. */
	play(track: Sound, queue?: Sound[]) {
		const a = this.#el();
		if (!a) return;
		if (queue?.length) this.queue = queue;
		if (this.track?.id === track.id) {
			this.toggle();
			return;
		}
		this.track = track;
		this.error = false;
		this.time = 0;
		this.duration = track.duration || 0;
		this.loading = true;
		if (!track.previewUrl) {
			// Tanpa URL di daftar (mis. kosong dari API) → langsung minta lewat /view.
			this.#retried.delete(track.id);
			void this.#recover();
			return;
		}
		a.src = track.previewUrl;
		void a.play().catch(() => (this.loading = false));
	}

	toggle() {
		const a = this.#audio;
		if (!a || !this.track) return;
		if (a.paused) void a.play().catch(() => {});
		else a.pause();
	}

	pause() {
		this.#audio?.pause();
	}

	/** Lompat ke posisi 0–1 dari durasi. */
	seek(ratio: number) {
		const a = this.#audio;
		const d = this.duration || this.track?.duration || 0;
		if (!a || !(d > 0)) return;
		const at = Math.max(0, Math.min(d - 0.05, ratio * d));
		a.currentTime = at;
		this.time = at;
	}

	/** Geser ±detik (tombol panah). */
	skip(sec: number) {
		const d = this.duration || this.track?.duration || 0;
		if (d > 0) this.seek((this.time + sec) / d);
	}

	#step(dir: 1 | -1, auto = false) {
		const list = this.queue;
		const i = list.findIndex((s) => s.id === this.track?.id);
		if (i < 0) return;
		const next = list[i + dir];
		if (next) this.play(next);
		else if (!auto && dir === -1) this.seek(0);
	}

	/** Lagu berikutnya; `auto` = dipanggil saat lagu selesai (berhenti di akhir daftar). */
	next(auto = false) {
		this.#step(1, auto);
	}

	/** Lebih dari 3 dtk berjalan → ulang dari awal; selain itu lagu sebelumnya. */
	prev() {
		if (this.time > 3) this.seek(0);
		else this.#step(-1);
	}

	setVolume(v: number) {
		this.volume = Math.max(0, Math.min(1, v));
		if (this.#audio) this.#audio.volume = this.volume;
	}

	/** Tutup bilah pemutar: hentikan & lepaskan lagu. */
	close() {
		const a = this.#audio;
		if (a) {
			a.pause();
			a.removeAttribute("src");
			a.load();
		}
		this.track = null;
		this.playing = false;
		this.loading = false;
		this.time = 0;
	}
}

export const player = new SoundPlayer();
