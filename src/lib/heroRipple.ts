/**
 * Riak di foto hero saat lensa preloader membuka — cahaya yang masuk lewat
 * diafragma jatuh ke permukaan air: rangkaian gelombang konsentris yang
 * mengisi seluruh lingkaran, membesar dari tengah sampai menutup SELURUH
 * elemen (tengah, kiri, kanan beriak bersamaan) lalu mereda.
 *
 * Dibuat dengan filter SVG `feDisplacementMap` pada elemen HTML, bukan WebGL:
 * WebGL butuh foto hero yang boleh dibaca lintas-origin (CORS), sedangkan
 * foto dari MinIO/tunnel belum tentu mengirim header itu. Filter SVG pada DOM
 * tidak pernah "mencemari" apa pun.
 *
 * Peta perpindahan (cincin gelombang) digambar SEKALI di kanvas; tiap frame
 * cincinnya hanya diperbesar (merambat keluar) dan kekuatannya diturunkan
 * (mereda). Peramban yang tak mendukung filter ini cukup menampilkan foto apa
 * adanya.
 */

const FILTER_ID = "lakuna-hero-ripple";
const SVG_NS = "http://www.w3.org/2000/svg";
/** Muka gelombang terluar di dalam peta (0..1 dari setengah sisi). */
const RING_AT = 0.92;
/** Panjang gelombang di peta (satuan setengah sisi) — ±4–5 gelombang landai. */
const WAVE = 0.21;

let mapUrl: string | null = null;

const smooth = (a: number, b: number, x: number) => {
	const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
	return t * t * (3 - 2 * t);
};

/** Cincin gelombang: vektor radial (R = dx, G = dy, 128 = diam). */
function ringMap(size = 1024): string {
	if (mapUrl) return mapUrl;
	const c = document.createElement("canvas");
	c.width = c.height = size;
	const ctx = c.getContext("2d");
	if (!ctx) return "";
	const img = ctx.createImageData(size, size);
	const d = img.data;
	for (let y = 0; y < size; y++) {
		for (let x = 0; x < size; x++) {
			const nx = (x / (size - 1)) * 2 - 1;
			const ny = (y / (size - 1)) * 2 - 1;
			const r = Math.hypot(nx, ny);
			let dx = 0;
			let dy = 0;
			if (r > 1e-3 && r < 1) {
				// Rangkaian gelombang dari pusat sampai tepi; selubung meredam
				// pusat persis (tak ada titik singular) dan tepi (tak ada garis
				// kotak peta).
				const env = smooth(0, 0.1, r) * (1 - smooth(0.82, 0.99, r));
				const p = Math.sin((r / WAVE) * Math.PI * 2) * env;
				dx = (nx / r) * p;
				dy = (ny / r) * p;
			}
			const i = (y * size + x) * 4;
			d[i] = Math.round(128 + 127 * dx);
			d[i + 1] = Math.round(128 + 127 * dy);
			d[i + 2] = 128;
			d[i + 3] = 255;
		}
	}
	ctx.putImageData(img, 0, 0);
	mapUrl = c.toDataURL("image/png");
	return mapUrl;
}

type Parts = {
	image: SVGFEImageElement;
	blur: SVGFEGaussianBlurElement;
	disp: SVGFEDisplacementMapElement;
};
let parts: Parts | null = null;

function ensureFilter(): Parts | null {
	if (parts) return parts;
	const url = ringMap();
	if (!url) return null;
	const svg = document.createElementNS(SVG_NS, "svg");
	svg.setAttribute("aria-hidden", "true");
	svg.setAttribute("width", "0");
	svg.setAttribute("height", "0");
	svg.style.position = "absolute";
	svg.style.pointerEvents = "none";
	svg.innerHTML = `<filter id="${FILTER_ID}" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">
		<feFlood flood-color="rgb(128,128,128)" result="neutral" />
		<feImage preserveAspectRatio="none" result="ring" />
		<feComposite in="ring" in2="neutral" operator="over" result="raw" />
		<!-- Peta 512px diperbesar ke layar penuh: tanpa pelunakan, tepi riak
		     tampak bergerigi/bergaris. -->
		<feGaussianBlur in="raw" stdDeviation="3" result="map" />
		<feDisplacementMap in="SourceGraphic" in2="map" scale="0" xChannelSelector="R" yChannelSelector="G" />
	</filter>`;
	document.body.appendChild(svg);
	const image = svg.querySelector("feImage") as SVGFEImageElement;
	const disp = svg.querySelector("feDisplacementMap") as SVGFEDisplacementMapElement;
	const blur = svg.querySelector("feGaussianBlur") as SVGFEGaussianBlurElement;
	image.setAttribute("href", url);
	parts = { image, blur, disp };
	return parts;
}

/**
 * Jalankan satu riak di `el`. Aman dipanggil berulang: riak yang sedang
 * berjalan di elemen yang sama dibatalkan dulu.
 */
export function rippleOnce(
	el: HTMLElement,
	{ delay = 0, duration = 1.7, freezeAt }: { delay?: number; duration?: number; freezeAt?: number } = {},
) {
	if (typeof window === "undefined") return;
	if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
	const f = ensureFilter();
	if (!f) return;

	const w = el.offsetWidth;
	const h = el.offsetHeight;
	if (!w || !h) return;
	const cx = w / 2;
	const cy = h / 2;
	// Lingkaran riak akhirnya melewati pojok elemen: seluruh area beriak.
	const maxR = (Math.hypot(w, h) / 2) * 1.12;

	// Kilau cincin yang ikut merambat: pantulan cahaya di puncak riak. Ia
	// ikut terdistorsi filter (anak dari elemen yang sama), jadi menyatu
	// dengan gelombangnya. Distorsi sendiri dibatasi (lihat scale) supaya
	// tak pecah; kilau inilah yang membuat riak terbaca jelas.
	//
	// Rona hangat safelight (bukan putih): cahaya yang masuk lewat lensa di
	// kegelapan bernada hangat — kilau putih penuh terlihat seperti blitz
	// murahan di atas foto gelap. Puncak opacity juga ditahan di 0.32.
	const GLOW = "255,168,84";
	const GLOW_PEAK = 0.32;
	const glint = document.createElement("span");
	glint.setAttribute("aria-hidden", "true");
	const G = maxR * 2;
	Object.assign(glint.style, {
		position: "absolute",
		left: `${cx - G / 2}px`,
		top: `${cy - G / 2}px`,
		width: `${G}px`,
		height: `${G}px`,
		borderRadius: "50%",
		pointerEvents: "none",
		mixBlendMode: "overlay",
		// Kilau di muka gelombang terluar (tepi lingkaran yang membesar),
		// dibuat landai: puncak rendah + ekor panjang supaya tidak terlihat
		// seperti cincin sabun yang mengembang.
		background: `radial-gradient(circle, transparent ${((RING_AT - WAVE * 1.1) * 100).toFixed(1)}%, rgba(${GLOW},${(GLOW_PEAK * 0.5).toFixed(2)}) ${((RING_AT - WAVE * 0.4) * 100).toFixed(1)}%, rgba(${GLOW},${GLOW_PEAK}) ${((RING_AT - WAVE * 0.1) * 100).toFixed(1)}%, rgba(${GLOW},0.06) ${(RING_AT * 100).toFixed(1)}%, transparent ${(Math.min(0.995, RING_AT + WAVE * 0.6) * 100).toFixed(1)}%)`,
		willChange: "transform, opacity",
		zIndex: "1",
	});
	el.appendChild(glint);

	const token = Symbol("ripple");
	(el as HTMLElement & { __ripple?: symbol }).__ripple = token;
	const alive = () => (el as HTMLElement & { __ripple?: symbol }).__ripple === token;

	const setFrame = (t: number) => {
		// Riak air merambat hampir tetap lajunya, sedikit melambat di ujung.
		const grow = 1 - Math.pow(1 - t, 1.6);
		const R = 0.1 * maxR + grow * 0.9 * maxR;
		const side = R * 2;
		f.image.setAttribute("x", String(cx - side / 2));
		f.image.setAttribute("y", String(cy - side / 2));
		f.image.setAttribute("width", String(side));
		f.image.setAttribute("height", String(side));
		// Satu piksel peta (512) = side/512 px di layar; pelunakan sekitar dua
		// piksel peta menghapus undakan tanpa meratakan puncak riak.
		f.blur.setAttribute("stdDeviation", String(Math.max(6, side / 130)));
		// Kekuatan mengikuti panjang gelombang (λ di layar = WAVE · side/2):
		// pergeseran puncak ±λ/4 — cukup terbaca di foto yang ramai. Tanpa
		// pelunakan peta, nilai sebesar ini pecah jadi undakan bergaris;
		// feGaussianBlur di atas yang meredamnya.
		const lambda = (WAVE * side) / 2;
		// Naik bertahap (±12% awal), lalu mereda dengan smoothstep — kecepatan
		// meredanya ikut melambat ke nol, jadi riak berhenti tanpa terasa
		// terputus (dulu pangkat masih curam menjelang habis).
		const rampIn = smooth(0, 0.12, t);
		const fade = 1 - smooth(0.12, 1, t);
		f.disp.setAttribute("scale", String(lambda * 0.26 * rampIn * fade));
		glint.style.transform = `scale(${(R / maxR).toFixed(4)})`;
		glint.style.opacity = String(Math.min(1, t * 6) * fade);
	};

	// Pemeriksaan (dev): bekukan satu frame di t tertentu, tanpa animasi.
	if (freezeAt != null) {
		el.style.filter = `url(#${FILTER_ID})`;
		setFrame(Math.min(0.999, Math.max(0, freezeAt)));
		return;
	}

	const start = performance.now() + delay * 1000;
	const tick = (now: number) => {
		if (!alive()) {
			glint.remove();
			return;
		}
		const t = (now - start) / (duration * 1000);
		if (t < 0) {
			requestAnimationFrame(tick);
			return;
		}
		if (t >= 1) {
			glint.remove();
			el.style.filter = "";
			f.disp.setAttribute("scale", "0");
			return;
		}
		if (!el.style.filter) el.style.filter = `url(#${FILTER_ID})`;
		setFrame(t);
		requestAnimationFrame(tick);
	};
	setFrame(0);
	requestAnimationFrame(tick);
}
