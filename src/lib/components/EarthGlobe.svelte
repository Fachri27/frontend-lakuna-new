<script lang="ts">
	import { onMount } from "svelte";

	/**
	 * EarthGlobe — bumi ala Google Earth: bola WebGL bertekstur Blue Marble
	 * 4K (self-hosted) dengan mipmapping + terminator + rim atmosfer fresnel.
	 * Jauh lebih tajam dari renderer iris 2D sebelumnya (yang memotret tekstur
	 * per potongan kasar hingga tampak berpiksel), dan lebih ringan: satu
	 * draw call di GPU per frame, bukan ribuan drawImage di CPU.
	 *
	 * Hotspot/penanda pendaratan/busur safelight digambar di kanvas overlay 2D
	 * dengan proyeksi ortografik yang sama. API ke induk tidak berubah: props
	 * spinning/focusLon + setFocus(amount) imperatif tiap tick scrub.
	 * Tanpa WebGL → fallback lingkaran tekstur 2D statis (tetap tajam).
	 */

	let glCanvas = $state<HTMLCanvasElement>();
	let markCanvas = $state<HTMLCanvasElement>();

	/**
	 * `spinning` false = putaran dijeda (tetap me-render satu frame terakhir).
	 * `startLon` = bujur yang menghadap kamera saat pertama tampil (bawaan = START_LON).
	 * `axis` = arah putaran:
	 *   - "lon": berputar ke samping pada porosnya (bawaan);
	 *   - "lat": bujur tetap `startLon`, bola MENGGELINDING dari bawah ke atas
	 *     (seperti bulan di "21hrs on the Moon"); fokus meneruskan gelindingan
	 *     ke depan sampai lintang LAND_LAT tepat di tengah.
	 */
	let {
		spinning = true,
		focusLon = null,
		startLon = 70,
		axis = "lon",
		decal = null,
	}: {
		spinning?: boolean;
		focusLon?: number | null;
		startLon?: number;
		axis?: "lon" | "lat";
		/**
		 * Citra yang ditempel di atas Blue Marble untuk satu kotak bujur/lintang
		 * (equirectangular, utara di atas). Dipakai untuk menempelkan citra
		 * PETA yang sama persis di wilayah pendaratan, supaya saat globe
		 * disilangkan ke peta tak ada gambar lain yang "muncul". Kekuatannya
		 * mengikuti fokus (0 di hero, penuh saat mendarat).
		 */
		decal?: { url: string; box: [w: number, s: number, e: number, n: number] } | null;
	} = $props();

	// Jumlah fokus 0..1 — ditulis IMPERATIF oleh induk via setFocus()
	// (bukan prop reaktif) supaya scrub scroll selalu tersalur.
	let focusAmt = 0;

	/** Dipanggil induk setiap tick scrub: kunci ke wilayah target. */
	export function setFocus(amt: number) {
		focusAmt = Math.min(1, Math.max(0, amt));
	}

	// Mode "lat": kemiringan akhir yang menaruh LAND_LAT tepat di tengah layar.
	let landTilt = 0;
	// Cermin keadaan gelinding dari loop render, untuk remainingTilt().
	let tiltNow = 0;
	let tiltFrom: number | null = null;

	/**
	 * Sisa gelinding (derajat) sampai lintang pendaratan tepat di tengah —
	 * positif = target masih di BAWAH tengah. Induk memakainya untuk menggeser
	 * peta datar di bawah globe supaya titik tengah keduanya selalu sama.
	 */
	export function remainingTilt() {
		if (axis !== "lat") return 0;
		return tiltFrom != null ? (landTilt - tiltFrom) * (1 - focusAmt) : landTilt - tiltNow;
	}

	/**
	 * Mode "lat" — dipanggil induk tepat sebelum menukik. `dy` = jarak tengah
	 * LAYAR dari tengah cakram pada posisi AKHIR penyelaman, dalam satuan
	 * setengah-lebar kanvas (positif = tengah layar di ATAS tengah cakram).
	 * Tengah cakram jarang pas di tengah layar (terutama layar portrait), jadi
	 * sudut yang tampil di tengah layar dicari lewat proyeksi yang sama dengan
	 * shader, lalu kemiringan dikoreksi supaya Indonesia yang jatuh di sana.
	 */
	export function aim(dy: number, lat: number = LAND_LAT) {
		const screenAt = (deg: number) => {
			const a = (deg * Math.PI) / 180;
			return (PROJ * Math.sin(a)) / (DIST - Math.cos(a));
		};
		let lo = -75;
		let hi = 75;
		const target = Math.max(screenAt(lo), Math.min(screenAt(hi), dy));
		for (let i = 0; i < 40; i++) {
			const mid = (lo + hi) / 2;
			if (screenAt(mid) < target) lo = mid;
			else hi = mid;
		}
		// Lintang di tengah layar = lintang tengah cakram + sudut itu.
		landTilt = (lo + hi) / 2 - lat;
	}

	/**
	 * Piksel per derajat di TENGAH cakram, per piksel setengah-lebar kanvas.
	 * Turunan proyeksi shader di sudut 0: PROJ / (DIST − 1), dalam radian.
	 * Dipakai induk untuk menyamakan skala globe dengan peta datar di bawahnya.
	 */
	export function centerGain() {
		return (PROJ / (DIST - 1)) * (Math.PI / 180);
	}

	const ROT_SPEED = 6; // derajat per detik — pelan tapi terlihat hidup
	const START_LON = 70; // Samudra Hindia timur — dekat Indonesia
	// Titik pendaratan: Indonesia.
	const LAND_LON = 118;
	const LAND_LAT = -2;
	// Mode "lat": kemiringan (derajat) = −lintang di tengah cakram.
	// Selagi menunggu, globe menggelinding bawah → atas dari ~25°LU dan
	// MELAMBAT menuju ~14°LU (Asia tetap di tudung yang terlihat) — tidak pernah
	// melewati Indonesia, jadi penyelaman selalu maju sedikit lalu pas mendarat.
	// Putaran tanpa henti dulu melewati Indonesia setelah ±11 dtk dan pendaratan
	// meleset.
	const TILT_IDLE_FROM = -25;
	const TILT_IDLE_TO = -14;
	const TILT_IDLE_TAU = 9; // detik — konstanta waktu perlambatan

	const VERT = `
attribute vec3 aPos;
attribute vec3 aNormal;
attribute vec2 aUv;
uniform float uRot;   /* radian — memusatkan bujur -(uRot) */
uniform float uTilt;  /* radian — gelinding pada sumbu X; naik = permukaan bergerak ke atas */
uniform float uProj;  /* skala proyeksi perspektif */
uniform float uDist;  /* jarak kamera (satuan radius) */
varying vec2 vUv;
varying vec3 vN;
void main() {
  float c = cos(uRot), s = sin(uRot);
  vec3 p = vec3(aPos.x * c + aPos.z * s, aPos.y, -aPos.x * s + aPos.z * c);
  vec3 n = vec3(aNormal.x * c + aNormal.z * s, aNormal.y, -aNormal.x * s + aNormal.z * c);
  float tc = cos(uTilt), ts = sin(uTilt);
  p = vec3(p.x, p.y * tc + p.z * ts, -p.y * ts + p.z * tc);
  n = vec3(n.x, n.y * tc + n.z * ts, -n.y * ts + n.z * tc);
  vUv = aUv;
  vN = n;
  float depth = uDist - p.z;
  gl_Position = vec4(p.x * uProj / depth, p.y * uProj / depth, (depth - 0.1) / 9.9 * 2.0 - 1.0, 1.0);
}
`;

	const FRAG = `
precision mediump float;
uniform sampler2D uTex;
uniform sampler2D uDecal;
uniform vec4 uBox;       /* w, s, e, n — derajat */
uniform float uDecalOn;  /* 0..1 */
uniform vec3 uSun;
uniform float uDay; /* 0..1 — siang penuh di wilayah target saat mendarat */
varying vec2 vUv;
varying vec3 vN;
void main() {
  vec3 n = normalize(vN);
  vec3 tex = texture2D(uTex, vUv).rgb;
  float dif = dot(n, uSun);
  float term = smoothstep(-0.12, 0.3, dif);
  /* Grading ke palet peta satelit Esri di bawahnya, supaya globe dan peta
     terbaca satu citra (sampel diukur dari keduanya):
       laut dangkal  Blue Marble #1A4780 → peta #2E737F
       laut dalam    #05102A → #063546
       daratan hijau #162309 → #2E441A
     Air dikenali dari kanal biru yang jauh di atas merah & hijau. */
  float water = smoothstep(0.03, 0.09, tex.b - max(tex.r, tex.g));
  /* pow 1.6: laut dalam tetap pekat, hanya dangkalan yang menyala teal. */
  float depth = pow(clamp((tex.b - 0.16) / 0.34, 0.0, 1.0), 1.6);
  vec3 sea = mix(vec3(0.024, 0.208, 0.275), vec3(0.180, 0.451, 0.498), depth);
  /* Darat: dicerahkan, lalu saturasinya diredam (gurun Blue Marble terlalu
     oranye dibanding citra Esri) dan puncaknya dibatasi (salju tak menyilaukan). */
  vec3 land = pow(tex, vec3(0.8)) * 1.1;
  float lum = dot(land, vec3(0.3, 0.59, 0.11));
  land = min(mix(vec3(lum), land, 0.85), vec3(0.72));
  vec3 dayCol = mix(land, sea, water);
  /* Tempelan citra peta: tepinya dilunakkan supaya tak ada garis kotak. */
  if (uDecalOn > 0.0) {
    vec2 ll = vec2(vUv.x * 360.0 - 180.0, vUv.y * 180.0 - 90.0);
    vec2 d = (ll - uBox.xy) / (uBox.zw - uBox.xy);
    float m = smoothstep(0.0, 0.07, min(d.x, 1.0 - d.x)) * smoothstep(0.0, 0.1, min(d.y, 1.0 - d.y));
    vec3 dec = texture2D(uDecal, clamp(d, 0.0, 1.0)).rgb;
    dayCol = mix(dayCol, dec, m * uDecalOn);
  }
  vec3 nightCol = dayCol * vec3(0.10, 0.15, 0.20) + vec3(0.006, 0.016, 0.022);
  vec3 col = mix(nightCol, dayCol, term);
  /* Saat mendarat siang penuh: warna tempelan harus sama dengan peta. */
  col = mix(col, dayCol, uDay);
  /* Rim atmosfer fresnel — terang di sisi siang. */
  vec3 vdir = vec3(0.0, 0.0, 1.0);
  float fres = pow(1.0 - max(dot(n, vdir), 0.0), 2.5);
  col += vec3(0.30, 0.62, 0.72) * fres * (0.25 + 0.75 * term);
  gl_FragColor = vec4(col, 1.0);
}
`;

	type GL = {
		gl: WebGLRenderingContext;
		prog: WebGLProgram;
		uRot: WebGLUniformLocation | null;
		uTilt: WebGLUniformLocation | null;
		uProj: WebGLUniformLocation | null;
		uDist: WebGLUniformLocation | null;
		uSun: WebGLUniformLocation | null;
		uDay: WebGLUniformLocation | null;
		uBox: WebGLUniformLocation | null;
		uDecalOn: WebGLUniformLocation | null;
		decalTex: WebGLTexture | null;
		n: number;
	};

	function buildSphere(gl: WebGLRenderingContext, latBands: number, lonBands: number) {
		const pos: number[] = [];
		const nor: number[] = [];
		const uv: number[] = [];
		const idx: number[] = [];
		for (let iy = 0; iy <= latBands; iy++) {
			const v = iy / latBands;
			const lat = ((90 - v * 180) * Math.PI) / 180;
			const c = Math.cos(lat);
			const y = Math.sin(lat);
			for (let ix = 0; ix <= lonBands; ix++) {
				const u = ix / lonBands;
				const lon = ((u * 360 - 180) * Math.PI) / 180;
				const x = c * Math.sin(lon);
				const z = c * Math.cos(lon);
				pos.push(x, y, z);
				nor.push(x, y, z);
				uv.push(u, 1 - v);
			}
		}
		for (let iy = 0; iy < latBands; iy++) {
			for (let ix = 0; ix < lonBands; ix++) {
				const a = iy * (lonBands + 1) + ix;
				const b = a + lonBands + 1;
				idx.push(a, b, a + 1, b, b + 1, a + 1);
			}
		}
		return { pos, nor, uv, idx };
	}

	function compile(gl: WebGLRenderingContext, type: number, src: string) {
		const sh = gl.createShader(type)!;
		gl.shaderSource(sh, src);
		gl.compileShader(sh);
		if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
			throw new Error("shader: " + gl.getShaderInfoLog(sh));
		}
		return sh;
	}

	function setupGL(gl: WebGLRenderingContext, img: HTMLImageElement): GL | null {
		try {
			const prog = gl.createProgram()!;
			gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT));
			gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG));
			gl.linkProgram(prog);
			if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
			gl.useProgram(prog);

			const { pos, nor, uv, idx } = buildSphere(gl, 48, 96);
			const buf = (data: number[], target: number, size: number, loc: number) => {
				const b = gl.createBuffer();
				gl.bindBuffer(target, b);
				if (target === gl.ELEMENT_ARRAY_BUFFER) gl.bufferData(target, new Uint16Array(data), gl.STATIC_DRAW);
				else {
					gl.bufferData(target, new Float32Array(data), gl.STATIC_DRAW);
					gl.enableVertexAttribArray(loc);
					gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
				}
			};
			buf(pos, gl.ARRAY_BUFFER, 3, gl.getAttribLocation(prog, "aPos"));
			buf(nor, gl.ARRAY_BUFFER, 3, gl.getAttribLocation(prog, "aNormal"));
			buf(uv, gl.ARRAY_BUFFER, 2, gl.getAttribLocation(prog, "aUv"));
			buf(idx, gl.ELEMENT_ARRAY_BUFFER, 0, 0);

			const tex = gl.createTexture();
			gl.bindTexture(gl.TEXTURE_2D, tex);
			gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
			gl.generateMipmap(gl.TEXTURE_2D);
			// Anisotropi: di tepi bola tekstur terlihat paling miring, dan di
			// situlah mipmap biasa paling kabur (daratan jadi bubur).
			const aniso =
				gl.getExtension("EXT_texture_filter_anisotropic") ||
				gl.getExtension("WEBKIT_EXT_texture_filter_anisotropic") ||
				gl.getExtension("MOZ_EXT_texture_filter_anisotropic");
			if (aniso) {
				const max = gl.getParameter(aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT);
				gl.texParameterf(gl.TEXTURE_2D, aniso.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(8, max));
			}

			gl.uniform1i(gl.getUniformLocation(prog, "uTex"), 0);
			gl.uniform1i(gl.getUniformLocation(prog, "uDecal"), 1);

			gl.enable(gl.DEPTH_TEST);
			gl.clearColor(0, 0, 0, 0);
			return {
				gl,
				prog,
				uRot: gl.getUniformLocation(prog, "uRot"),
				uTilt: gl.getUniformLocation(prog, "uTilt"),
				uProj: gl.getUniformLocation(prog, "uProj"),
				uDist: gl.getUniformLocation(prog, "uDist"),
				uSun: gl.getUniformLocation(prog, "uSun"),
				uDay: gl.getUniformLocation(prog, "uDay"),
				uBox: gl.getUniformLocation(prog, "uBox"),
				uDecalOn: gl.getUniformLocation(prog, "uDecalOn"),
				decalTex: null,
				n: idx.length,
			};
		} catch {
			return null;
		}
	}

	const DIST = 3.0;
	// Skala proyeksi dihitung dari geometri siluet, bukan dikira-kira.
	// Titik siluet bola radius 1 dari jarak DIST ada di z = 1/DIST, dengan
	// jari-jari sqrt(1 - z²); setelah pembagian perspektif jari-jarinya
	// menjadi PROJ·r/(DIST − z). Rumus lama (0.96 · DIST) menghasilkan 1.018 —
	// di atas batas kanvas (1.0) — sehingga kutub atas, bawah, kiri, dan kanan
	// bola terpotong rata. FILL = seberapa penuh cakram mengisi kanvas.
	const FILL = 0.96;
	const PROJ = (FILL * (DIST - 1 / DIST)) / Math.sqrt(1 - 1 / (DIST * DIST));

	/** Unggah citra tempelan ke unit tekstur 1 (NPOT: clamp + linear, tanpa mipmap). */
	function uploadDecal(g: GL, img: HTMLImageElement) {
		const { gl } = g;
		const tex = gl.createTexture();
		gl.activeTexture(gl.TEXTURE1);
		gl.bindTexture(gl.TEXTURE_2D, tex);
		gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		gl.activeTexture(gl.TEXTURE0);
		g.decalTex = tex;
	}

	function drawGlobe(g: GL, S: number, centeredLon: number, tiltDeg: number, day: number) {
		const { gl } = g;
		const on = g.decalTex && decal ? day : 0;
		gl.uniform1f(g.uDecalOn, on);
		if (decal) gl.uniform4f(g.uBox, decal.box[0], decal.box[1], decal.box[2], decal.box[3]);
		gl.viewport(0, 0, S, S);
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
		gl.uniform1f(g.uRot, (-centeredLon * Math.PI) / 180);
		gl.uniform1f(g.uTilt, (tiltDeg * Math.PI) / 180);
		gl.uniform1f(g.uProj, PROJ);
		gl.uniform1f(g.uDist, DIST);
		gl.uniform3f(g.uSun, -0.55, 0.45, 0.7);
		gl.uniform1f(g.uDay, day);
		gl.drawElements(gl.TRIANGLES, g.n, gl.UNSIGNED_SHORT, 0);
	}

	onMount(() => {
		const cv = glCanvas;
		const mk = markCanvas;
		if (!cv || !mk) return;
		const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
		const img = new Image();
		// Blue Marble 8K di layar besar, 4K di layar kecil & koneksi hemat.
		// Keduanya kelipatan dua (8192×4096 / 4096×2048): WebGL 1 hanya membuat
		// mipmap dan mengulang tekstur untuk ukuran power-of-two — di luar itu
		// bolanya jadi hitam.
		const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
		const wantBig = window.innerWidth >= 900 && !saveData;
		img.src = wantBig ? "/textures/earth-day-8k.jpg" : "/textures/earth-day.jpg";

		// Citra tempelan (lintas-origin → butuh CORS agar boleh jadi tekstur).
		let decalImg: HTMLImageElement | null = null;
		let decalDirty = false;
		if (decal) {
			const di = new Image();
			di.crossOrigin = "anonymous";
			di.decoding = "async";
			di.onload = () => {
				decalImg = di;
				decalDirty = true;
			};
			di.src = decal.url;
		}

		let gl: WebGLRenderingContext | null = null;
		let g: GL | null = null;
		try {
			gl = cv.getContext("webgl", { antialias: true, alpha: true });
		} catch {
			gl = null;
		}

		let rot = startLon;
		let tilt = TILT_IDLE_FROM;
		let idleT = 0;
		let raf = 0;
		let last = performance.now();
		let visible = true;
		let dead = false;
		let settled = false;
		let lastSize = 0;
		let lastRot = Infinity;
		let lastTilt = Infinity;
		let lastDay = -1;
		let lost = false;
		// Jangkar rotasi saat fokus dimulai — supaya scrub maju/mundur simetris.
		let focusFrom: number | null = null;

		const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting), {
			threshold: 0,
		});
		io.observe(cv);

		const onLost = (e: Event) => {
			e.preventDefault();
			lost = true;
			g = null;
		};
		const onRestored = () => {
			lost = false;
			if (gl && img.naturalWidth) g = setupGL(gl, img);
			if (decalImg) decalDirty = true;
		};
		cv.addEventListener("webglcontextlost", onLost);
		cv.addEventListener("webglcontextrestored", onRestored);

		const size = () => {
			const r = cv.getBoundingClientRect();
			const dpr = Math.min(2, window.devicePixelRatio || 1);
			const s = Math.min(2400, Math.max(320, Math.round(r.width * dpr)));
			for (const c of [cv, mk]) {
				if (c.width !== s) {
					c.width = s;
					c.height = s;
				}
			}
			return s;
		};

		const loop = (now: number) => {
			if (dead) return;
			raf = requestAnimationFrame(loop);
			if (document.hidden || !visible || lost || !img.complete || !img.naturalWidth) return;
			if (!g && gl) {
				g = setupGL(gl, img);
				if (decalImg) decalDirty = true;
			}
			let forceDraw = false;
			if (g && decalDirty && decalImg) {
				try {
					uploadDecal(g, decalImg);
				} catch {
					/* CORS ditolak — globe tetap jalan tanpa tempelan */
				}
				decalDirty = false;
				forceDraw = true;
			}
			const dt = Math.min(0.1, (now - last) / 1000);
			last = now;
			const animate = spinning && !reduced;
			// Fokus wilayah: putar ke bujur target lewat jalur terpendek,
			// proporsional dengan amount (0..1) yang di-scrub induk.
			let effRot = rot;
			let effTilt = axis === "lat" ? tilt : 0;
			if (axis === "lat") {
				if (focusAmt > 0) {
					if (focusFrom == null) focusFrom = tilt;
					tiltFrom = focusFrom;
					// Maju (bawah → atas) sampai Indonesia di tengah layar.
					effTilt = focusFrom + (landTilt - focusFrom) * focusAmt;
				} else {
					focusFrom = null;
					if (animate) {
						idleT += dt;
						tilt = TILT_IDLE_TO + (TILT_IDLE_FROM - TILT_IDLE_TO) * Math.exp(-idleT / TILT_IDLE_TAU);
						effTilt = tilt;
						settled = false;
					}
					tiltFrom = null;
				}
				tiltNow = effTilt;
			} else if (focusLon != null && focusAmt > 0) {
				if (focusFrom == null) focusFrom = rot;
				// Jalur TERPENDEK saja (tanpa putaran penuh): gerakannya selalu
				// jelas menuju Indonesia, tak pernah singgah di benua lain.
				const d = ((((focusLon - focusFrom) % 360) + 540) % 360) - 180;
				effRot = focusFrom + d * focusAmt;
			} else {
				focusFrom = null;
				if (animate) {
					rot = (rot + dt * ROT_SPEED) % 360;
					effRot = rot;
					settled = false;
				}
			}
			const s = size();
			const day = Math.min(1, Math.max(0, focusAmt));
			// Lewati frame yang identik (rot dibulatkan): hemat baterai/CPU.
			const rq = Math.round(effRot * 200) / 200;
			const tq = Math.round(effTilt * 200) / 200;
			if (!animate && focusAmt <= 0) {
				if (settled && s === lastSize && !forceDraw) return;
				settled = true;
				lastSize = s;
			} else if (!forceDraw && s === lastSize && rq === lastRot && tq === lastTilt && day === lastDay) {
				return;
			}
			lastRot = rq;
			lastTilt = tq;
			lastDay = day;
			if (g) {
				drawGlobe(g, s, effRot, effTilt, day);
			} else {
				// Fallback tanpa WebGL: cakram tekstur statis di kanvas marka
				// (kanvas WebGL tak bisa diambil alih konteks 2D) — tetap tajam,
				// satu drawImage, bukan iris per potongan.
				const fctx = mk.getContext("2d");
				if (fctx) {
					fctx.clearRect(0, 0, s, s);
					fctx.save();
					fctx.beginPath();
					fctx.arc(s / 2, s / 2, s / 2 - 1, 0, 7);
					fctx.clip();
					fctx.drawImage(img, 0, 0, s, s);
					fctx.restore();
				}
			}
			// Titik penanda di permukaan globe dihapus; kanvas ini hanya dipakai
			// sebagai cadangan saat WebGL tak tersedia (lihat di atas).
			if (reduced) cancelAnimationFrame(raf);
		};

		if (img.complete && img.naturalWidth) {
			size();
			raf = requestAnimationFrame(loop);
		} else {
			img.onload = () => {
				if (dead) return;
				size();
				raf = requestAnimationFrame(loop);
			};
		}
		const onResize = () => size();
		window.addEventListener("resize", onResize);
		return () => {
			dead = true;
			cancelAnimationFrame(raf);
			io.disconnect();
			cv.removeEventListener("webglcontextlost", onLost);
			cv.removeEventListener("webglcontextrestored", onRestored);
			window.removeEventListener("resize", onResize);
		};
	});
</script>

<div class="earth" aria-hidden="true">
	<canvas bind:this={glCanvas} class="earth-gl"></canvas>
	<canvas bind:this={markCanvas} class="earth-gl"></canvas>
</div>

<style>
	.earth {
		position: relative;
		width: 100%;
		aspect-ratio: 1;
		display: block;
	}
	.earth-gl {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		display: block;
	}
</style>
