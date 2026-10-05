/// <reference lib="webworker" />
// Worker pembuat ubin malam — logikanya di nightTileCore.ts (dipakai juga sebagai
// cadangan di thread utama).
import type { RequestParameters } from "maplibre-gl";
import { nightTile } from "./nightTileCore";

const controllers = new Map<number, AbortController>();

self.onmessage = async (e: MessageEvent<{ id?: number; url?: string; cancel?: number }>) => {
	const { id, url, cancel } = e.data;
	if (cancel != null) {
		controllers.get(cancel)?.abort();
		controllers.delete(cancel);
		return;
	}
	if (id == null || !url) return;
	const ac = new AbortController();
	controllers.set(id, ac);
	try {
		const { data } = await nightTile({ url } as RequestParameters, ac);
		(self as unknown as Worker).postMessage({ id, data }, [data]);
	} catch (err) {
		(self as unknown as Worker).postMessage({ id, error: (err as Error).message });
	} finally {
		controllers.delete(id);
	}
};
