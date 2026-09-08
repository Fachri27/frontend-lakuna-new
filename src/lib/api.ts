/// <reference types="vite/client" />

const BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";

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
export const apiPatch = <T>(path: string, body?: unknown) =>
	api<T>(path, { method: "PATCH", body: JSON.stringify(body) });
export const apiDelete = <T>(path: string) => api<T>(path, { method: "DELETE" });
