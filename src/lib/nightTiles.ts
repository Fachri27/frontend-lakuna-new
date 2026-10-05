/**
 * Pintu masuk overlay malam untuk globe hero (lihat nightTileCore.ts untuk
 * penjelasan lengkap). Pembuatan ubin (unduh PNG NASA, dekode, ±65 ribu piksel
 * per ubin, enkode PNG) dikerjakan di Web Worker agar thread utama — tempat
 * scroll, animasi, dan peta berjalan — tidak tersendat saat ubin dibuat.
 * Tanpa Worker/OffscreenCanvas (peramban lama) jatuh ke thread utama.
 */
import type { RequestParameters } from "maplibre-gl";
import { nightTile as renderOnMain, nightTileUrl, type NightMode } from "./nightTileCore";

export { nightTileUrl };
export type { NightMode };

type Reply = { id: number; data?: ArrayBuffer; error?: string };

let worker: Worker | null = null;
let workerFailed = false;
let seq = 0;
const pending = new Map<number, { ok: (d: { data: ArrayBuffer }) => void; fail: (e: Error) => void }>();

function getWorker(): Worker | null {
	if (workerFailed || typeof Worker === "undefined" || typeof OffscreenCanvas === "undefined") return null;
	if (worker) return worker;
	try {
		const w = new Worker(new URL("./nightTiles.worker.ts", import.meta.url), { type: "module" });
		w.onmessage = (e: MessageEvent<Reply>) => {
			const p = pending.get(e.data.id);
			if (!p) return;
			pending.delete(e.data.id);
			if (e.data.data) p.ok({ data: e.data.data });
			else p.fail(new Error(e.data.error ?? "night tile failed"));
		};
		// Worker gagal dimuat (CSP, bundler): semua yang menunggu dikerjakan di thread utama.
		w.onerror = () => {
			workerFailed = true;
			worker = null;
			w.terminate();
			for (const [, p] of pending) p.fail(new Error("night worker error"));
			pending.clear();
		};
		worker = w;
		return w;
	} catch {
		workerFailed = true;
		return null;
	}
}

export async function nightTile(params: RequestParameters, abort: AbortController): Promise<{ data: ArrayBuffer }> {
	const w = getWorker();
	if (!w) return renderOnMain(params, abort);
	const id = ++seq;
	try {
		return await new Promise<{ data: ArrayBuffer }>((ok, fail) => {
			pending.set(id, { ok, fail });
			abort.signal.addEventListener(
				"abort",
				() => {
					if (pending.delete(id)) {
						w.postMessage({ cancel: id });
						fail(new DOMException("aborted", "AbortError"));
					}
				},
				{ once: true },
			);
			w.postMessage({ id, url: params.url });
		});
	} catch (err) {
		if ((err as Error).name === "AbortError") throw err;
		// Worker mati di tengah jalan → coba sekali di thread utama.
		return renderOnMain(params, abort);
	}
}
