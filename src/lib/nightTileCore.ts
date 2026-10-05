/**
 * Overlay malam untuk globe hero.
 *
 * Protokol `night://{z}/{x}/{y}?m=<mode>` membuat ubin RGBA transparan dari
 * "Black Marble" NASA (lampu kota, VIIRS): bayangan malam + lampu kota dengan
 * alpha, ditumpuk di atas citra siang Esri yang statis. Tiga mode, masing-masing
 * dihitung SEKALI (statis — tidak ada pembuatan ulang berkala):
 *
 *   full  malam menutupi seluruh bumi (lampu kota menyala di mana-mana)
 *   west  malam di sisi barat saja (matahari di timur: fajar)
 *   east  malam di sisi timur saja (matahari di barat: senja)
 *
 * Yang bergerak hanya OPASITAS ketiga lapisan, digerakkan jam siklus
 * siang–malam di MapDescent (`setNightMix`) — jadi seiring waktu bumi berganti
 * dari malam penuh → fajar → siang → senja → malam penuh, dengan satu jam
 * bersama untuk filter warna dan sisi malam.
 *
 * Citra siang TIDAK diunduh/dicampur ulang di sini: itulah yang membuat ini murah.
 * Lapisannya sendiri dipudarkan IndonesiaMap menurut zoom kamera: begitu
 * mendarat di Nusantara (zoom ±4.4) yang tampak citra siang apa adanya.
 */
import type { RequestParameters } from "maplibre-gl";

const NIGHT = (z: number, x: number, y: number) =>
	`https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_Black_Marble/default/2016-01-01/GoogleMapsCompatible_Level8/${z}/${y}/${x}.png`;

export type NightMode = "full" | "west" | "east";

/** Titik subsolar (derajat) per mode sebagian. Hero memandang ±105°BT. */
const SUN: Record<Exclude<NightMode, "full">, { lng: number; lat: number }> = {
	// Matahari di 190°BT: sisi lit = timur 100°BT; malam di barat (India, Asia Tengah).
	west: { lng: 190, lat: 8 },
	// Matahari di 20°BT: malam di timur ±125°BT ke atas (Jepang, Pasifik).
	east: { lng: 20, lat: 8 },
};

export const nightTileUrl = (mode: NightMode) => `night://{z}/{x}/{y}?m=${mode}`;

const RAD = Math.PI / 180;

const smooth = (a: number, b: number, v: number) => {
	const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
	return t * t * (3 - 2 * t);
};

// Cache byte ubin NASA (terkompres, kecil): tiga mode memakai ubin sumber yang
// sama, jadi cukup diunduh sekali.
const CACHE_MAX = 160;
const cache = new Map<string, ArrayBuffer>();
function cacheGet(k: string) {
	const v = cache.get(k);
	if (v) {
		cache.delete(k);
		cache.set(k, v); // segarkan urutan (LRU)
	}
	return v;
}
function cacheSet(k: string, v: ArrayBuffer) {
	cache.set(k, v);
	if (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value as string);
}

async function bytes(url: string, signal: AbortSignal): Promise<ArrayBuffer> {
	const hit = cacheGet(url);
	if (hit) return hit;
	const r = await fetch(url, { signal });
	if (!r.ok) throw new Error(`tile ${r.status}`);
	const buf = await r.arrayBuffer();
	cacheSet(url, buf);
	return buf;
}

/** Ubin transparan 256×256 (cadangan bila ubin NASA gagal dimuat: globe tetap utuh). */
async function transparentTile(): Promise<{ data: ArrayBuffer }> {
	const cv = new OffscreenCanvas(256, 256);
	const blob = await cv.convertToBlob({ type: "image/png" });
	return { data: await blob.arrayBuffer() };
}

export async function nightTile(params: RequestParameters, abort: AbortController): Promise<{ data: ArrayBuffer }> {
	const m = /night:\/\/(\d+)\/(\d+)\/(\d+)(?:\?(.*))?/.exec(params.url);
	if (!m) throw new Error("bad night url");
	const z = +m[1]!;
	const x = +m[2]!;
	const y = +m[3]!;
	const mode = (new URLSearchParams(m[4] ?? "").get("m") ?? "full") as NightMode;

	let nightBuf: ArrayBuffer;
	try {
		nightBuf = await bytes(NIGHT(z, x, y), abort.signal);
	} catch {
		return transparentTile();
	}

	const S = 256;
	const bmp = await createImageBitmap(new Blob([nightBuf], { type: "image/png" }));
	const cv = new OffscreenCanvas(S, S);
	const ctx = cv.getContext("2d", { willReadFrequently: true })!;
	ctx.drawImage(bmp, 0, 0, S, S);
	bmp.close();
	const img = ctx.getImageData(0, 0, S, S);
	const px4 = img.data; // masukan: lampu NASA; keluaran: overlay RGBA (ditimpa di tempat)

	// cos(λ-λs) = cosλ·cosλs + sinλ·sinλs → trig per KOLOM dan per BARIS
	// dihitung sekali; per piksel tinggal beberapa perkalian.
	const full = mode === "full";
	const tiles = 2 ** z;
	const sun = full ? SUN.west : SUN[mode];
	const sinD = Math.sin(sun.lat * RAD);
	const cosD = Math.cos(sun.lat * RAD);
	const cs = Math.cos(sun.lng * RAD);
	const sn = Math.sin(sun.lng * RAD);
	const colTerm = new Float32Array(S); // cosλ·cosλs + sinλ·sinλs
	if (!full) {
		for (let px = 0; px < S; px++) {
			const lng = (((x + (px + 0.5) / S) / tiles) * 360 - 180) * RAD;
			colTerm[px] = Math.cos(lng) * cs + Math.sin(lng) * sn;
		}
	}
	// Sisa siang di sisi malam: hanya garis pantai samar (10%), kebiruan.
	const DIM = 0.1;
	const inv = 1 / (1 - DIM);
	for (let py = 0; py < S; py++) {
		let a = 0;
		let b = 0;
		if (!full) {
			const lat = Math.atan(Math.sinh(Math.PI * (1 - (2 * (y + (py + 0.5) / S)) / tiles)));
			a = Math.sin(lat) * sinD;
			b = Math.cos(lat) * cosD;
		}
		for (let px = 0; px < S; px++) {
			const i = (py * S + px) * 4;
			// 0 = siang, 1 = malam; senja lebar di sekitar terminator. Malam penuh = 1.
			const night = full ? 1 : smooth(0.05, -0.13, a + b * colTerm[px]!);
			if (night <= 0.002) {
				px4[i + 3] = 0; // siang penuh: transparan, citra Esri apa adanya
				continue;
			}
			// Hasil akhir = siang·(1-α) + warna·α  dengan α = night·(1-DIM). Warna
			// overlay = (lampu + 4·(1-night)·senja) / (1-DIM): terbatas bahkan saat
			// α→0, dan senja hangat hanya muncul di zona peralihan.
			const k = 4 * (1 - night);
			const r = (Math.min(255, px4[i]! * 3) + k * 26) * inv;
			const g = (Math.min(255, px4[i + 1]! * 2.4) + k * 10) * inv;
			const bl = Math.min(255, px4[i + 2]! * 1.4) * inv;
			px4[i] = r > 255 ? 255 : r;
			px4[i + 1] = g > 255 ? 255 : g;
			px4[i + 2] = bl > 255 ? 255 : bl;
			px4[i + 3] = Math.round(night * (1 - DIM) * 255);
		}
	}
	ctx.putImageData(img, 0, 0);
	const blob = await cv.convertToBlob({ type: "image/png" });
	return { data: await blob.arrayBuffer() };
}
