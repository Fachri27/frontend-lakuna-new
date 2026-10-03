/**
 * Tiga wajah untuk situs yang sama.
 *
 *  • `ungu`  — BAWAAN: Poppins untuk judul dan teks, aksen ungu.
 *  • `arsip` — wajah asli: Fraunces/Postoni + Hanken Grotesk, aksen safelight
 *    (merah lampu kamar gelap).
 *  • `merah` — Archivo (judul dilebarkan, teks lebar normal), aksen merah
 *    #BC0202.
 *
 * Yang ditukar hanya token: keluarga huruf dan warna aksen. Nada netral
 * (kertas, arang, abu) sengaja TIDAK ikut berubah — halaman ini isinya foto,
 * dan latar berona akan menempelkan warna ke setiap bingkai.
 *
 * Pilihannya disimpan di localStorage dan dipasang ke <html data-skin> oleh
 * skrip kecil di app.html sebelum halaman dilukis, supaya tidak berkedip.
 */
export type Skin = "arsip" | "ungu" | "merah";

export const SKINS: Skin[] = ["arsip", "ungu", "merah"];
export const SKIN_LABEL: Record<Skin, string> = { arsip: "Arsip", ungu: "Ungu", merah: "Merah" };

const KEY = "lakuna-skin";
/** Wajah bagi pengunjung yang belum pernah memilih (juga di app.html). */
export const DEFAULT_SKIN: Skin = "ungu";

function read(): Skin {
	if (typeof document === "undefined") return DEFAULT_SKIN;
	const attr = document.documentElement.dataset.skin;
	return SKINS.includes(attr as Skin) ? (attr as Skin) : DEFAULT_SKIN;
}

class SkinStore {
	current = $state<Skin>(DEFAULT_SKIN);

	constructor() {
		if (typeof document !== "undefined") this.current = read();
	}

	set(next: Skin) {
		this.current = next;
		if (typeof document === "undefined") return;
		document.documentElement.dataset.skin = next;
		try {
			localStorage.setItem(KEY, next);
		} catch {
			/* mode privat / penyimpanan ditolak — pilihan tetap berlaku sesi ini */
		}
	}

	/** Berputar ke wajah berikutnya: Arsip → Ungu → Merah → Arsip. */
	toggle() {
		this.set(this.nextSkin);
	}

	get nextSkin(): Skin {
		return SKINS[(SKINS.indexOf(this.current) + 1) % SKINS.length];
	}
}

export const skin = new SkinStore();
