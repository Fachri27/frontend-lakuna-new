/**
 * Mode Buta Warna — color vision assist (ported from apps/web/src/lib/cvd.ts).
 *
 * Daltonisasi LMS penuh (Brettel-Viénot / SVG-Daltonizer):
 *   CVD = matriks simulasi Machado 2009 (severity 1.0, dichromat) di RGB
 *   Shift = redistribusi error dari kanal defisit ke 2 kanal yang masih terlihat
 *   D = (Shift + I) − Shift·CVD        ← koreksi penuh
 *   D_s = I + s·(D − I)               ← interpolasi kekuatan (s = 0..1)
 * Diterapkan via SVG feColorMatrix (linearRGB) ke elemen media.
 */

export type CvdType = "off" | "protanopia" | "deuteranopia" | "tritanopia" | "monokrom";

// Machado 2009 dichromat simulation matrices (severity 1.0), row-major 3×3.
const SIM: Record<Exclude<CvdType, "off" | "monokrom">, number[]> = {
  protanopia: [0.152286, 1.052583, -0.204868, 0.114503, 0.786281, 0.099216, -0.003882, -0.048116, 1.051998],
  deuteranopia: [0.367322, 0.860646, -0.227968, 0.280085, 0.672501, 0.047413, -0.01182, 0.04294, 0.968881],
  tritanopia: [1.255528, -0.076749, -0.178779, -0.078411, 0.930809, 0.147602, 0.004733, 0.691367, 0.3039],
};

const SHIFT = [0, 0, 0, 0.7, 1, 0, 0.7, 0, 1];
const I3 = [1, 0, 0, 0, 1, 0, 0, 0, 1];
const IDENT = "1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 1 0";

function mul(a: number[], b: number[]): number[] {
  const o = new Array(9);
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
    let sum = 0;
    for (let k = 0; k < 3; k++) sum += a[i * 3 + k] * b[k * 3 + j];
    o[i * 3 + j] = sum;
  }
  return o;
}
const add = (a: number[], b: number[]) => a.map((v, i) => v + b[i]);
const sub = (a: number[], b: number[]) => a.map((v, i) => v - b[i]);
const scale = (a: number[], k: number) => a.map((v) => v * k);

function correctionMatrix(type: Exclude<CvdType, "off" | "monokrom">, s: number): number[] {
  const cvd = SIM[type];
  const D = sub(add(SHIFT, I3), mul(SHIFT, cvd));
  return add(I3, scale(sub(D, I3), s));
}

/** Build a 4×5 feColorMatrix (20 values, space-separated). "off" → identity. */
export function cvdMatrix(type: CvdType, s: number): string {
  if (type === "off") return IDENT;
  if (type === "monokrom") {
    const c = 1 + s * 0.5;
    const off = 0.5 - 0.5 * c;
    const r = 0.299 * c, g = 0.587 * c, b = 0.114 * c;
    return [r, g, b, 0, off, r, g, b, 0, off, r, g, b, 0, off, 0, 0, 0, 1, 0].map((n) => +n.toFixed(6)).join(" ");
  }
  const d = correctionMatrix(type, s);
  const out: number[] = [];
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) out.push(d[i * 3 + j]);
    out.push(0, 0); // kolom alpha + offset — DI LUAR loop dalam (per baris)
  }
  out.push(0, 0, 0, 1, 0); // baris alpha
  return out.map((n) => +n.toFixed(6)).join(" ");
}