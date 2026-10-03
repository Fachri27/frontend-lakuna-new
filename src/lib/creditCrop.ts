/**
 * Pemotong pita kredit — tampilan situs tanpa pita putih.
 *
 * Thumbnail & pratinjau publik dari API membawa pita putih "lakunastock · ID"
 * di dasarnya (lihat apps/api/src/modules/photo/publicAssets.ts). Pita itu
 * SENGAJA hanya terlihat bila berkasnya dibuka langsung (tab Network, "Save
 * image as") — orang yang mengambil gambar gratis mendapat versi berlabel.
 * Di halaman, pita dipotong di sisi klien:
 *
 *   <img>             installCreditCrop() memantau seluruh dokumen; tiap
 *                     gambar ber-pita dipotong saat selesai dimuat.
 *   background-image  pemanggil memakai probeCredit() + coverBackground().
 *
 * Rumusnya harus sama dengan API: tinggi pita = max(18, round(0.05 × lebar)).
 * Video pratinjau tidak berpita, jadi hanya berkas gambar yang diproses.
 */

const CREDIT_RATIO = 0.05;
const CREDIT_MIN = 18;
const CREDITED = /\/(?:thumb|watermark)\/[^?#]+\.(?:jpe?g|png|webp)(?:[?#]|$)/i;

export type CreditDims = { w: number; h: number; bar: number };

export function isCreditedUrl(url: string | null | undefined): boolean {
	return !!url && CREDITED.test(url);
}

export function creditBarPx(naturalWidth: number): number {
	return Math.max(CREDIT_MIN, Math.round(naturalWidth * CREDIT_RATIO));
}

function dimsOf(w: number, h: number): CreditDims | null {
	if (!w || !h) return null;
	const bar = creditBarPx(w);
	// Gambar lebih pendek dari pitanya = bukan berkas ber-pita (mis. data lama).
	return bar < h * 0.5 ? { w, h, bar } : null;
}

// Kunci tanpa query: URL presigned berganti tanda tangan tiap fetch, tapi
// berkasnya sama.
const probes = new Map<string, Promise<CreditDims | null>>();

/** Ukuran asli + tinggi pita sebuah URL gambar (di-cache per path; kegagalan tidak). */
export function probeCredit(url: string): Promise<CreditDims | null> {
	if (!isCreditedUrl(url)) return Promise.resolve(null);
	const key = url.split("?")[0];
	let p = probes.get(key);
	if (!p) {
		p = new Promise<CreditDims | null>((resolve) => {
			const img = new Image();
			img.onload = () => resolve(dimsOf(img.naturalWidth, img.naturalHeight));
			img.onerror = () => resolve(null);
			img.src = url;
		}).then((d) => {
			// Gagal (tunnel lambat, URL basi, 429) JANGAN disimpan: dulu hasil
			// null menempel selamanya dan pita tak pernah dipotong di sesi itu.
			if (!d) probes.delete(key);
			return d;
		});
		probes.set(key, p);
	}
	return p;
}

/**
 * Ukuran & posisi background supaya gambar menutupi kotak boxW×boxH
 * (seperti `cover`) dengan hanya bagian foto — pita jatuh di luar kotak.
 */
export function coverBackground(boxW: number, boxH: number, d: CreditDims) {
	const s = Math.max(boxW / d.w, boxH / (d.h - d.bar));
	const bw = d.w * s;
	const bh = d.h * s;
	return { width: bw, height: bh, offsetX: (boxW - bw) / 2 };
}

let viewBoxOk: boolean | null = null;
function supportsViewBox(): boolean {
	if (viewBoxOk === null) {
		try {
			viewBoxOk = CSS.supports("object-view-box", "inset(0 0 1px 0)");
		} catch {
			viewBoxOk = false;
		}
	}
	return viewBoxOk;
}

const CROPPED = "creditCropped";

function cropImg(img: HTMLImageElement) {
	const src = img.currentSrc || img.src;
	if (!isCreditedUrl(src)) {
		if (img.dataset[CROPPED]) resetImg(img);
		return;
	}
	if (!img.complete || !img.naturalWidth) return;
	const d = dimsOf(img.naturalWidth, img.naturalHeight);
	if (!d) return;
	if (img.dataset[CROPPED] === src) return;
	img.dataset[CROPPED] = src;

	if (supportsViewBox()) {
		// Chrome/Edge: potong langsung di level berkas — ukuran intrinsik
		// ikut berubah, jadi object-fit apa pun & tinggi auto tetap benar.
		img.style.setProperty("object-view-box", `inset(0 0 ${d.bar}px 0)`);
		return;
	}
	// Cadangan (Safari/Firefox).
	const f = d.bar / d.h;
	if (getComputedStyle(img).objectFit === "cover") {
		// Kotak tetap: perpanjang elemen ke bawah sebesar porsi pita; induk
		// (overflow hidden) memotongnya, dan cover + rata-atas menjaga isi.
		img.style.height = `calc(100% / ${(1 - f).toFixed(5)})`;
		img.style.maxHeight = "none";
		img.style.objectPosition = "center top";
	} else {
		// Tinggi mengikuti gambar: rasio elemen = rasio foto tanpa pita,
		// cover + rata-atas membuang pita di dasar.
		img.style.aspectRatio = `${d.w} / ${d.h - d.bar}`;
		img.style.objectFit = "cover";
		img.style.objectPosition = "center top";
	}
}

function resetImg(img: HTMLImageElement) {
	delete img.dataset[CROPPED];
	for (const p of ["object-view-box", "height", "max-height", "aspect-ratio", "object-fit", "object-position"]) {
		img.style.removeProperty(p);
	}
}

/**
 * Pasang sekali di layout: semua <img> ber-pita (sekarang maupun yang
 * ditambahkan/diganti src-nya nanti) dipotong saat dimuat.
 */
export function installCreditCrop(root: Document = document): () => void {
	const onLoad = (e: Event) => {
		if (e.target instanceof HTMLImageElement) cropImg(e.target);
	};
	// `load` tidak menggelembung, tapi bisa ditangkap di fase capture.
	root.addEventListener("load", onLoad, true);
	root.querySelectorAll("img").forEach(cropImg);

	const mo = new MutationObserver((records) => {
		for (const r of records) {
			if (r.type === "attributes" && r.target instanceof HTMLImageElement) {
				cropImg(r.target);
				continue;
			}
			r.addedNodes.forEach((n) => {
				if (n instanceof HTMLImageElement) cropImg(n);
				else if (n instanceof Element) n.querySelectorAll("img").forEach(cropImg);
			});
		}
	});
	mo.observe(root.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ["src"] });

	return () => {
		root.removeEventListener("load", onLoad, true);
		mo.disconnect();
	};
}
