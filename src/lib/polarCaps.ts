/**
 * Tudung kutub bercitra asli untuk peta MapLibre berproyeksi globe.
 *
 * Citra dunia Esri (Web Mercator) berhenti di ±85.05°; di atasnya MapLibre
 * meregangkan piksel tepi ubin ke titik kutub — garis-garis memancar
 * ("pecah"). Lapisan ini menggambar tudung bola 83°–90° di kedua kutub
 * dengan citra dari layanan kutub Esri sendiri (Arctic Imagery EPSG:5936,
 * Antarctic Imagery EPSG:3031 — keduanya stereografik kutub, jadi titik
 * kutubnya ada di tengah gambar dan utuh).
 *
 * Posisi dihitung dengan cara yang sama persis seperti shader globe MapLibre
 * (bola satuan, matriks utama, bidang potong cakrawala), jadi tudungnya
 * menempel di bola yang sama. Tepinya dilebur ke citra dunia di 83–84.6°,
 * dan warna laut Arktik (lebih biru tua di sumbernya) disamakan dengan citra
 * dunia di pita yang sama (diukur: gain per kanal).
 */
import type { CustomLayerInterface, CustomRenderMethodInput, Map as MlMap } from "maplibre-gl";

const A = 6378137; // jari-jari WGS84 (m) — untuk rumus stereografik
const HALF = 850000; // setengah sisi kotak ekspor (m) → cakupan sampai ±82.3°
const SIZE = 2048;

const ARCTIC_URL =
	"https://services.arcgisonline.com/arcgis/rest/services/Polar/Arctic_Imagery/MapServer/export" +
	`?bbox=${2e6 - HALF},${2e6 - HALF},${2e6 + HALF},${2e6 + HALF}&bboxSR=5936&imageSR=5936` +
	`&size=${SIZE},${SIZE}&format=jpg&f=image`;
const ANTARCTIC_URL =
	"https://services.arcgisonline.com/arcgis/rest/services/Polar/Antarctic_Imagery/MapServer/export" +
	`?bbox=${-HALF},${-HALF},${HALF},${HALF}&bboxSR=3031&imageSR=3031` +
	`&size=${SIZE},${SIZE}&format=jpg&f=image`;

const VERT = `#version 300 es
in vec3 a_pos;
uniform mat4 u_matrix;
uniform vec4 u_clip;
out vec3 v_pos;
void main() {
  vec4 g = u_matrix * vec4(a_pos, 1.0);
  // Sama dengan globeComputeClippingZ MapLibre: sisi di balik cakrawala dibuang.
  g.z = (1.0 - (dot(a_pos, u_clip.xyz) + u_clip.w)) * g.w;
  gl_Position = g;
  v_pos = a_pos;
}`;

const FRAG = `#version 300 es
precision highp float;
in vec3 v_pos;
uniform sampler2D u_tex;
uniform float u_south;   // 0 = kutub utara, 1 = selatan
uniform float u_k0;      // faktor skala proyeksi
uniform vec3 u_gain;     // penyelaras warna ke citra dunia
out vec4 fragColor;
const float A = ${A.toFixed(1)};
const float HALF = ${HALF.toFixed(1)};
const float PI = 3.141592653589793;
void main() {
  vec3 p = normalize(v_pos);
  float lat = asin(clamp(p.y, -1.0, 1.0));
  float lng = atan(p.x, p.z);
  float latDeg = abs(lat) * 180.0 / PI;
  float colat = PI * 0.5 - abs(lat);
  float rho = 2.0 * A * u_k0 * tan(colat * 0.5);
  vec2 uv;
  if (u_south < 0.5) {
    // EPSG:5936 — meridian tengah −150°, sumbu N terbalik.
    float th = lng + 150.0 * PI / 180.0;
    uv = vec2(rho * sin(th) + HALF, rho * cos(th) + HALF) / (2.0 * HALF);
  } else {
    // EPSG:3031 — meridian tengah 0°.
    float th = lng;
    uv = vec2(rho * sin(th) + HALF, HALF - rho * cos(th)) / (2.0 * HALF);
  }
  vec3 c = min(texture(u_tex, uv).rgb * u_gain, vec3(1.0));
  float a = smoothstep(83.0, 84.6, latDeg);
  fragColor = vec4(c * a, a);
}`;

type Cap = { south: boolean; k0: number; gain: [number, number, number]; url: string; tex: WebGLTexture | null; count: number; vbo: WebGLBuffer | null; ibo: WebGLBuffer | null };

function capMesh(south: boolean) {
	const LAT0 = 82.6;
	const RINGS = 24;
	const SEGS = 180;
	const pos: number[] = [];
	const idx: number[] = [];
	for (let r = 0; r <= RINGS; r++) {
		const latDeg = LAT0 + ((90 - LAT0) * r) / RINGS;
		const lat = ((south ? -latDeg : latDeg) * Math.PI) / 180;
		for (let s = 0; s <= SEGS; s++) {
			const lng = -Math.PI + (2 * Math.PI * s) / SEGS;
			const c = Math.cos(lat);
			pos.push(Math.sin(lng) * c, Math.sin(lat), Math.cos(lng) * c);
		}
	}
	for (let r = 0; r < RINGS; r++) {
		for (let s = 0; s < SEGS; s++) {
			const a = r * (SEGS + 1) + s;
			const b = a + SEGS + 1;
			idx.push(a, b, a + 1, b, b + 1, a + 1);
		}
	}
	return { pos: new Float32Array(pos), idx: new Uint16Array(idx) };
}

export function polarCapsLayer(): CustomLayerInterface {
	let prog: WebGLProgram | null = null;
	let map: MlMap | null = null;
	let uMatrix: WebGLUniformLocation | null = null;
	let uClip: WebGLUniformLocation | null = null;
	let uTex: WebGLUniformLocation | null = null;
	let uSouth: WebGLUniformLocation | null = null;
	let uK0: WebGLUniformLocation | null = null;
	let uGain: WebGLUniformLocation | null = null;
	let aPos = -1;
	const caps: Cap[] = [
		{ south: false, k0: 0.994, gain: [3.14, 2.13, 1.12], url: ARCTIC_URL, tex: null, count: 0, vbo: null, ibo: null },
		{ south: true, k0: 0.9728, gain: [1.07, 1.07, 1.04], url: ANTARCTIC_URL, tex: null, count: 0, vbo: null, ibo: null },
	];

	return {
		id: "polar-caps",
		type: "custom",
		renderingMode: "2d",
		onAdd(m, glAny) {
			map = m;
			const gl = glAny as WebGL2RenderingContext;
			const sh = (type: number, src: string) => {
				const s = gl.createShader(type)!;
				gl.shaderSource(s, src);
				gl.compileShader(s);
				if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? "shader");
				return s;
			};
			try {
				const p = gl.createProgram()!;
				gl.attachShader(p, sh(gl.VERTEX_SHADER, VERT));
				gl.attachShader(p, sh(gl.FRAGMENT_SHADER, FRAG));
				gl.linkProgram(p);
				if (!gl.getProgramParameter(p, gl.LINK_STATUS)) return;
				prog = p;
			} catch (e) {
				if (import.meta.env.DEV) console.warn("[polar-caps]", e);
				return;
			}
			uMatrix = gl.getUniformLocation(prog, "u_matrix");
			uClip = gl.getUniformLocation(prog, "u_clip");
			uTex = gl.getUniformLocation(prog, "u_tex");
			uSouth = gl.getUniformLocation(prog, "u_south");
			uK0 = gl.getUniformLocation(prog, "u_k0");
			uGain = gl.getUniformLocation(prog, "u_gain");
			aPos = gl.getAttribLocation(prog, "a_pos");

			for (const cap of caps) {
				const mesh = capMesh(cap.south);
				cap.vbo = gl.createBuffer();
				gl.bindBuffer(gl.ARRAY_BUFFER, cap.vbo);
				gl.bufferData(gl.ARRAY_BUFFER, mesh.pos, gl.STATIC_DRAW);
				cap.ibo = gl.createBuffer();
				gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cap.ibo);
				gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.idx, gl.STATIC_DRAW);
				cap.count = mesh.idx.length;

				const img = new Image();
				img.crossOrigin = "anonymous";
				img.onload = () => {
					const tex = gl.createTexture();
					gl.bindTexture(gl.TEXTURE_2D, tex);
					gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
					gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
					gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
					gl.generateMipmap(gl.TEXTURE_2D);
					gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
					gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
					gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
					gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
					cap.tex = tex;
					map?.triggerRepaint();
				};
				img.src = cap.url;
			}
		},
		render(glAny, args: CustomRenderMethodInput) {
			const gl = glAny as WebGL2RenderingContext;
			const pd = args.defaultProjectionData;
			// Hanya di proyeksi globe penuh (zoom sangat dekat MapLibre beralih
			// ke mercator — kutub tak mungkin terlihat di sana).
			if (!prog || !pd || pd.projectionTransition < 0.999) return;
			gl.useProgram(prog);
			gl.uniformMatrix4fv(uMatrix, false, new Float32Array(pd.mainMatrix as ArrayLike<number>));
			const cp = pd.clippingPlane as ArrayLike<number>;
			gl.uniform4f(uClip, cp[0], cp[1], cp[2], cp[3]);
			gl.uniform1i(uTex, 0);
			gl.enable(gl.BLEND);
			gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
			gl.disable(gl.DEPTH_TEST);
			gl.disable(gl.CULL_FACE);
			gl.disable(gl.STENCIL_TEST);
			for (const cap of caps) {
				if (!cap.tex || !cap.vbo || !cap.ibo) continue;
				gl.activeTexture(gl.TEXTURE0);
				gl.bindTexture(gl.TEXTURE_2D, cap.tex);
				gl.uniform1f(uSouth, cap.south ? 1 : 0);
				gl.uniform1f(uK0, cap.k0);
				gl.uniform3f(uGain, cap.gain[0], cap.gain[1], cap.gain[2]);
				gl.bindBuffer(gl.ARRAY_BUFFER, cap.vbo);
				gl.enableVertexAttribArray(aPos);
				gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 0, 0);
				gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cap.ibo);
				gl.drawElements(gl.TRIANGLES, cap.count, gl.UNSIGNED_SHORT, 0);
			}
		},
		onRemove(_m, glAny) {
			const gl = glAny as WebGL2RenderingContext;
			for (const cap of caps) {
				if (cap.tex) gl.deleteTexture(cap.tex);
				if (cap.vbo) gl.deleteBuffer(cap.vbo);
				if (cap.ibo) gl.deleteBuffer(cap.ibo);
			}
			if (prog) gl.deleteProgram(prog);
		},
	};
}
