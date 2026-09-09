import { access } from "./access.svelte";

/**
 * Bunyi rana — "cekrek" — disintesis lewat Web Audio, bukan berkas audio.
 *
 * Katanya sendiri yang memberi bentuknya, dan itu petunjuk paling jelas yang
 * saya dapat: "cekrek" itu DUA hentakan pendek, bukan satu. "Cek" tajam dan
 * tinggi, jeda sekejap, lalu "krek" yang lebih rendah dan lebih berderak.
 * Seluruhnya selesai di bawah 110 md.
 *
 * Versi-versi sebelumnya gagal justru pada bentuk ini:
 *   v1  dua klik tipis, tanpa badan       → "tik-tik"
 *   v2  benturan cermin, bas 26%          → "duk", bedug
 *   v3  sapuan mengembang 58 md           → "shhh", bukan memotret
 *   v4  40 ketukan sepanjang 145 md       → "rrrt", gemeretak, bukan cekrek
 *
 * Yang dipertahankan dari pengukuran rujukan (21hrs.space) hanyalah warnanya,
 * karena bagian itu memang cocok: energi di bawah 500 Hz hampir nol (2–3%) dan
 * pusat spektral di sekitar 4,5 kHz. Bas sedikit saja masuk, "cekrek" langsung
 * berubah jadi "duk".
 *
 * Tiap hentakan bukan satu klik tunggal, melainkan 3–6 butiran derau yang sangat
 * rapat (2–5 md). Itu yang membedakan "krek" yang berderak dari "tik" yang
 * bersih — dan klik tunggal selalu terdengar seperti antarmuka, bukan mekanisme.
 */

let ctx: AudioContext | null = null;
let noise: AudioBuffer | null = null;

/** Derau putih 0,6 dtk — bahan semua butiran dan ekornya. Dibuat sekali. */
function noiseBuffer(ac: AudioContext): AudioBuffer {
	if (noise) return noise;
	const len = Math.floor(ac.sampleRate * 0.6);
	const buf = ac.createBuffer(1, len, ac.sampleRate);
	const d = buf.getChannelData(0);
	for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
	noise = buf;
	return buf;
}

/** Satu butiran: derau sangat pendek lewat pita, jadi satu ketukan kecil. */
function grain(ac: AudioContext, out: AudioNode, at: number, gain: number, hz: number, q: number, decay: number) {
	const src = ac.createBufferSource();
	src.buffer = noiseBuffer(ac);

	const bp = ac.createBiquadFilter();
	bp.type = "bandpass";
	// Q rendah: pita sempit berbunyi "ping" bernada, yang dicari ketukan.
	bp.Q.value = q;
	bp.frequency.value = hz;

	// Bas dipangkas keras. Inilah yang menjaga "cekrek" tetap cekrek: begitu ada
	// energi di bawah ~700 Hz, telinga membacanya sebagai benda berat terbentur.
	const hp = ac.createBiquadFilter();
	hp.type = "highpass";
	hp.frequency.value = 700;

	const env = ac.createGain();
	env.gain.setValueAtTime(0.0001, at);
	env.gain.linearRampToValueAtTime(gain, at + 0.0005);
	env.gain.exponentialRampToValueAtTime(0.0001, at + decay);

	src.connect(bp).connect(hp).connect(env).connect(out);
	src.start(at, Math.random() * 0.5);
	src.stop(at + decay + 0.01);
}

/**
 * Satu hentakan: sekumpulan butiran yang sangat rapat sehingga terdengar sebagai
 * SATU bunyi berderak, bukan beberapa klik terpisah.
 */
function snap(
	ac: AudioContext,
	out: AudioNode,
	at: number,
	o: { n: number; spread: number; gain: number; hz: [number, number]; decay: [number, number] },
) {
	for (let i = 0; i < o.n; i++) {
		// Butiran pertama tepat di awal (itu sisi tajamnya); sisanya tersebar acak
		// di belakangnya dan makin melemah — sisa derak yang meluruh.
		const u = i === 0 ? 0 : Math.random();
		const g = o.gain * (i === 0 ? 1 : 0.75 - u * 0.45) * (0.8 + Math.random() * 0.4);
		grain(
			ac,
			out,
			at + u * o.spread,
			Math.max(0.02, g),
			o.hz[0] + Math.random() * (o.hz[1] - o.hz[0]),
			1.1 + Math.random() * 1.5,
			o.decay[0] + Math.random() * (o.decay[1] - o.decay[0]),
		);
	}
}

/**
 * Bunyikan rana. Aman dipanggil kapan saja: kalau Web Audio tidak ada, atau
 * pengguna sedang memilih mode hemat gerak, ia diam saja.
 *
 * Mode hemat gerak dipakai sebagai saklar senyap karena orang yang mematikan
 * animasi umumnya juga tidak ingin dikejutkan bunyi — dan saklar itu sudah ada
 * di panel aksesibilitas, jadi tidak perlu tombol baru yang harus dicari.
 */
export function playShutter() {
	if (typeof window === "undefined") return;
	if (access.settings.reduceMotion) return;
	if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

	try {
		const AC =
			window.AudioContext ??
			(window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
		if (!AC) return;
		ctx ??= new AC();
		// Sebagian browser menahan konteks sampai ada gerakan pengguna; klik yang
		// memanggil fungsi ini adalah gerakan itu.
		if (ctx.state === "suspended") void ctx.resume();

		const master = ctx.createGain();
		master.gain.value = 0.55;
		master.connect(ctx.destination);

		const t = ctx.currentTime + 0.001;
		// Jeda antar-hentakan diacak tipis (68–80 md). Jeda yang selalu sama persis
		// terdengar seperti rekaman yang diputar ulang; mekanisme sungguhan tidak
		// pernah dua kali sama.
		const gap = 0.068 + Math.random() * 0.012;

		// "CEK" — pendek, tinggi, bersih. Tiga butiran dalam 6 md.
		snap(ctx, master, t, {
			n: 3,
			spread: 0.006,
			gain: 0.5,
			hz: [4600, 9000],
			decay: [0.004, 0.007],
		});

		// "KREK" — lebih rendah, lebih berderak, sedikit lebih panjang dan lebih
		// keras: di rana sungguhan, bunyi penutup memang yang paling terdengar.
		snap(ctx, master, t + gap, {
			n: 6,
			spread: 0.019,
			gain: 0.62,
			hz: [2300, 6200],
			decay: [0.006, 0.012],
		});

		// Ekor tipis — hanya sekelumit udara supaya bunyinya tidak terpotong mati.
		// Sengaja pendek (±260 md): ekor panjang membuatnya terdengar seperti ruang
		// bergema, dan "cekrek" itu bunyi benda di tangan, bukan bunyi ruangan.
		const tail = ctx.createBufferSource();
		tail.buffer = noiseBuffer(ctx);
		const tbp = ctx.createBiquadFilter();
		tbp.type = "bandpass";
		tbp.Q.value = 0.9;
		tbp.frequency.setValueAtTime(4200, t + gap);
		tbp.frequency.exponentialRampToValueAtTime(6200, t + gap + 0.26);
		const thp = ctx.createBiquadFilter();
		thp.type = "highpass";
		thp.frequency.value = 900;
		const tg = ctx.createGain();
		tg.gain.setValueAtTime(0.0001, t + gap);
		tg.gain.exponentialRampToValueAtTime(0.05, t + gap + 0.012);
		tg.gain.exponentialRampToValueAtTime(0.0001, t + gap + 0.26);
		tail.connect(tbp).connect(thp).connect(tg).connect(master);
		tail.start(t + gap, Math.random() * 0.3);
		tail.stop(t + gap + 0.28);
	} catch {
		/* audio tidak tersedia — bukan alasan untuk menggagalkan klik */
	}
}
