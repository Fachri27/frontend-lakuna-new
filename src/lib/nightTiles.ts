/**
 * Ubin bumi siang-malam untuk globe hero.
 *
 * Protokol `night://{z}/{x}/{y}` menyusun satu ubin dari dua sumber: citra siang
 * Esri dan "Black Marble" NASA (lampu kota, VIIRS). Tiap piksel dicampur menurut
 * ketinggian matahari di titik itu, jadi garis terminator-nya halus (senja) dan
 * lampu kota hanya menyala di sisi malam.
 *
 * Matahari DIKUNCI di posisi tetap (bukan jam sungguhan) supaya komposisi hero
 * selalu sama: sisi barat bumi terang, sisi timur (Jepang, Tiongkok timur, Jawa)
 * malam. Hanya ubin zoom <= NIGHT_MAX_Z yang diolah. Lapisannya sendiri dipudarkan
 * oleh IndonesiaMap menurut zoom kamera: begitu mendarat di Nusantara
 * (zoom ±4.4) yang tampak citra siang apa adanya — fajar tiba bersamaan
 * dengan pendaratan.
 */
import type { RequestParameters } from "maplibre-gl";

const DAY = (z: number, x: number, y: number) =>
	`https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`;
const NIGHT = (z: number, x: number, y: number) =>
	`https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_Black_Marble/default/2016-01-01/GoogleMapsCompatible_Level8/${z}/${y}/${x}.png`;

export const NIGHT_MAX_Z = 6;
export const NIGHT_TILE_URL = "night://{z}/{x}/{y}";

/** Titik di bumi yang tepat di bawah matahari (derajat). */
const SUN_LNG = 33;
const SUN_LAT = 12;

const RAD = Math.PI / 180;
const smooth = (a: number, b: number, v: number) => {
	const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
	return t * t * (3 - 2 * t);
};

async function bytes(url: string, signal: AbortSignal): Promise<ArrayBuffer> {
	const r = await fetch(url, { signal });
	if (!r.ok) throw new Error(`tile ${r.status}`);
	return r.arrayBuffer();
}

async function bitmap(buf: ArrayBuffer, type: string): Promise<ImageBitmap> {
	return createImageBitmap(new Blob([buf], { type }));
}

export async function nightTile(params: RequestParameters, abort: AbortController): Promise<{ data: ArrayBuffer }> {
	const m = /night:\/\/(\d+)\/(\d+)\/(\d+)/.exec(params.url);
	if (!m) throw new Error("bad night url");
	const z = +m[1];
	const x = +m[2];
	const y = +m[3];
	const dayBuf = await bytes(DAY(z, x, y), abort.signal);
	if (z > NIGHT_MAX_Z) return { data: dayBuf };

	let nightBuf: ArrayBuffer;
	try {
		nightBuf = await bytes(NIGHT(z, x, y), abort.signal);
	} catch {
		// Ubin malam gagal dimuat: tampilkan siang saja, jangan bolongkan globe.
		return { data: dayBuf };
	}

	const S = 256;
	const [dayBmp, nightBmp] = await Promise.all([bitmap(dayBuf, "image/jpeg"), bitmap(nightBuf, "image/png")]);
	const cv = new OffscreenCanvas(S, S);
	const ctx = cv.getContext("2d", { willReadFrequently: true })!;
	ctx.drawImage(dayBmp, 0, 0, S, S);
	const d = ctx.getImageData(0, 0, S, S);
	ctx.clearRect(0, 0, S, S);
	ctx.drawImage(nightBmp, 0, 0, S, S);
	const n = ctx.getImageData(0, 0, S, S).data;
	const out = d.data;

	const sinLat0 = Math.sin(SUN_LAT * RAD);
	const cosLat0 = Math.cos(SUN_LAT * RAD);
	const tiles = 2 ** z;
	for (let py = 0; py < S; py++) {
		const lat = Math.atan(Math.sinh(Math.PI * (1 - (2 * (y + (py + 0.5) / S)) / tiles)));
		const sinLat = Math.sin(lat);
		const cosLat = Math.cos(lat);
		for (let px = 0; px < S; px++) {
			const lng = ((x + (px + 0.5) / S) / tiles) * 360 - 180;
			const sinElev = sinLat * sinLat0 + cosLat * cosLat0 * Math.cos((lng - SUN_LNG) * RAD);
			// 0 = siang, 1 = malam; senja lebar di sekitar terminator.
			const night = smooth(0.05, -0.13, sinElev);
			const i = (py * S + px) * 4;
			// Sisa siang di sisi malam: hanya garis pantai samar, kebiruan.
			const dim = 0.1;
			const glow = night * (1 - night) * 4; // puncak di tengah senja
			for (let c = 0; c < 3; c++) {
				const day = out[i + c] * (1 - night * (1 - dim) * (c === 2 ? 0.9 : 1));
				// Lampu kota: ditonjolkan dan dihangatkan (emas), biru dikurangi.
				const lamp = Math.min(255, n[i + c] * (c === 0 ? 3 : c === 1 ? 2.4 : 1.4));
				const dusk = glow * (c === 0 ? 26 : c === 1 ? 10 : 0);
				out[i + c] = Math.min(255, day + lamp * night + dusk);
			}
		}
	}
	ctx.putImageData(d, 0, 0);
	const blob = await cv.convertToBlob({ type: "image/jpeg", quality: 0.9 });
	return { data: await blob.arrayBuffer() };
}
