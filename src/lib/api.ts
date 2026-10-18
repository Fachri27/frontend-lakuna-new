/// <reference types="vite/client" />

/**
 * Basis API dinamis: dibuka dari localhost → langsung ke API lokal (tidak
 * tergantung tunnel yang bisa mati); dibuka dari link publik → ke tunnel.
 */
function resolveBase(): string {
	if (typeof window !== "undefined") {
		const h = window.location.hostname;
		if (h === "localhost" || h === "127.0.0.1") return "http://localhost:3100";
	}
	return cleanApiBase(import.meta.env.VITE_API_URL) || "http://localhost:3000";
}

/**
 * VITE_API_URL harus alamat saja ("https://host"); setiap panggilan sudah
 * memakai awalan "/api/…". Bila terisi "https://host/api" (mudah tertukar dengan
 * PUBLIC_API_URL milik CMS) hasilnya "/api/api/…" → 404 & diblokir CSP.
 * Garis miring dan akhiran "/api" dibuang di sini.
 */
export function cleanApiBase(v: string | undefined): string {
	return (v ?? "").trim().replace(/\/+$/, "").replace(/\/api$/i, "").replace(/\/+$/, "");
}

const BASE = resolveBase();

export class ApiError extends Error {
	status: number;
	code: string;
	details?: unknown[];

	constructor(status: number, code: string, message: string, details?: unknown[]) {
		super(message);
		this.name = "ApiError";
		this.status = status;
		this.code = code;
		this.details = details;
	}
}

export function getAccessToken(): string | null {
	if (typeof window === "undefined") return null;
	return localStorage.getItem("lakuna-access-token");
}

export function setAccessToken(token: string | null) {
	if (typeof window === "undefined") return;
	if (token) localStorage.setItem("lakuna-access-token", token);
	else localStorage.removeItem("lakuna-access-token");
}

export function getRefreshToken(): string | null {
	if (typeof window === "undefined") return null;
	return localStorage.getItem("lakuna-refresh-token");
}

export function setRefreshToken(token: string | null) {
	if (typeof window === "undefined") return;
	if (token) localStorage.setItem("lakuna-refresh-token", token);
	else localStorage.removeItem("lakuna-refresh-token");
}

async function tryRefreshToken(): Promise<boolean> {
	const refreshToken = getRefreshToken();
	if (!refreshToken) return false;
	try {
		const res = await fetch(`${BASE}/api/auth/refresh`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ refreshToken }),
		});
		if (!res.ok) return false;
		const json = await res.json();
		if (json.success && json.data?.newToken) {
			setAccessToken(json.data.newToken);
			// Refresh token dirotasi server: yang lama tak berlaku lagi.
			if (json.data.refreshToken) setRefreshToken(json.data.refreshToken);
			return true;
		}
		return false;
	} catch {
		return false;
	}
}

export async function api<T>(
	path: string,
	options: RequestInit & { noAuth?: boolean } = {}
): Promise<T> {
	const { noAuth, ...init } = options;
	// Segmen "." / ".." (mentah atau %2e) dari parameter URL (mis. /photos/..%2Fdownloads%2Fx) bisa
	// membelokkan request bertoken ke endpoint lain — tolak sebelum dikirim.
	if (/(^|\/)(\.|%2e){1,2}(\/|$)/i.test(path.split(/[?#]/)[0])) {
		throw new ApiError(400, "BAD_PATH", "Path tidak valid");
	}
	const headers = new Headers(init.headers);

	if (!headers.has("Content-Type") && !(init.body instanceof FormData)) {
		headers.set("Content-Type", "application/json");
	}

	if (!noAuth) {
		const token = getAccessToken();
		if (token) headers.set("Authorization", `Bearer ${token}`);
	}

	let res = await fetch(`${BASE}${path}`, { ...init, headers });

	// If 401, try refresh token once
	if (res.status === 401 && !noAuth) {
		const refreshed = await tryRefreshToken();
		if (refreshed) {
			const newToken = getAccessToken();
			if (newToken) headers.set("Authorization", `Bearer ${newToken}`);
			res = await fetch(`${BASE}${path}`, { ...init, headers });
		}
	}

	const json = await res.json();

	if (!json.success) {
		throw new ApiError(
			res.status,
			json.error?.code || "UNKNOWN",
			json.error?.message || "Terjadi kesalahan",
			json.error?.details ?? json.error
		);
	}

	return json as T;
}

// Convenience helpers
export const apiGet = <T>(path: string) => api<T>(path);
export const apiPost = <T>(path: string, body?: unknown) =>
	api<T>(path, { method: "POST", body: body instanceof FormData ? body : JSON.stringify(body) });

/** UUID v4; crypto.randomUUID hanya ada di konteks aman (https/localhost) — uji lewat IP LAN http tetap jalan. */
function randomKey(): string {
	if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
	const b = crypto.getRandomValues(new Uint8Array(16));
	b[6] = (b[6]! & 0x0f) | 0x40;
	b[8] = (b[8]! & 0x3f) | 0x80;
	const h = [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
	return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

const pendingIdemKeys = new Map<string, string>();

/**
 * POST yang membuat tagihan / menggerakkan uang (order, langganan, Standar, tagih, cicilan) dengan header
 * `Idempotency-Key` (lihat API middlewares/idempotency.ts). Satu kunci per AKSI yang sedang berjalan:
 *  - klik ganda selagi permintaan pertama berjalan → kunci sama → server menolak 409, tak ada tagihan kedua;
 *  - jaringan putus tanpa jawaban → kunci dipertahankan → coba lagi = server memutar ulang hasil pertama;
 *  - sudah ada jawaban (sukses/gagal) → kunci dilepas, aksi berikutnya (mis. kirim ulang OVO) tidak diputar ulang.
 */
export async function apiPostOnce<T>(path: string, body: unknown): Promise<T> {
	const id = `${path}|${JSON.stringify(body ?? null)}`;
	let key = pendingIdemKeys.get(id);
	if (!key) {
		key = randomKey();
		pendingIdemKeys.set(id, key);
	}
	try {
		const res = await api<T>(path, { method: "POST", body: JSON.stringify(body), headers: { "Idempotency-Key": key } });
		pendingIdemKeys.delete(id);
		return res;
	} catch (err) {
		if (err instanceof ApiError && err.code !== "IDEMPOTENCY_IN_PROGRESS") pendingIdemKeys.delete(id);
		throw err;
	}
}

export const apiPatch = <T>(path: string, body?: unknown) =>
	api<T>(path, { method: "PATCH", body: JSON.stringify(body) });
export const apiDelete = <T>(path: string) => api<T>(path, { method: "DELETE" });
