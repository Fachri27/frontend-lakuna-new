import { api, apiGet, apiPost, apiDelete, setAccessToken, setRefreshToken, getAccessToken, getRefreshToken, ApiError } from "./api";
import type { ApiResponse, ApiCartItem, ApiFavorite, ApiUser } from "./types";

export type CartItem = {
	id: string;
	kind: "photo" | "video" | "plan";
	title: string;
	price: number;
	meta?: string;
};

type User = { name: string; email: string; id: string; role: string } | null;

/**
 * Global app store — port 1:1 dari lib/store.tsx (React Context) ke Svelte 5
 * runes. Satu instance singleton, diimpor langsung dari komponen mana pun.
 */
class AppStore {
	cart = $state<CartItem[]>([]);
	favorites = $state<string[]>([]);
	user = $state<User>(null);
	loading = $state(true);

	#inited = false;

	get cartCount() {
		return this.cart.length;
	}

	get cartTotal() {
		return this.cart.reduce((s, i) => s + i.price, 0);
	}

	/** Hydrate auth state on first use (client only). */
	async init() {
		if (this.#inited || typeof window === "undefined") return;
		this.#inited = true;
		const token = getAccessToken();
		const refreshToken = getRefreshToken();
		if (token || refreshToken) {
			try {
				const res = await apiGet<ApiResponse<ApiUser>>("/api/users/me");
				if (res.success) {
					const u = res.data;
					this.user = { name: u.username, email: u.email, id: u.id, role: u.role };
				}
			} catch {
				setAccessToken(null);
				setRefreshToken(null);
			}
		}
		this.loading = false;
		await this.#fetchCart();
		await this.#fetchFavorites();
	}

	/** Fetch cart when logged in. */
	async #fetchCart() {
		if (!this.user) {
			this.cart = [];
			return;
		}
		try {
			const res = await apiGet<ApiResponse<ApiCartItem[]>>("/api/cart");
			if (res.success) {
				this.cart = res.data.map((item) => ({
					id: item.id,
					kind: "photo" as const,
					title: item.photo.title,
					price: item.price,
					meta: item.photoId,
				}));
			}
		} catch {
			/* keep existing cart */
		}
	}

	refreshCart() {
		return this.#fetchCart();
	}

	/** Fetch favorites when logged in. */
	async #fetchFavorites() {
		if (!this.user) {
			this.favorites = [];
			return;
		}
		try {
			const res = await apiGet<ApiResponse<ApiFavorite[]>>("/api/favorite");
			if (res.success) this.favorites = res.data.map((f) => f.photoId);
		} catch {
			/* ignore */
		}
	}

	/**
	 * Aksi keranjang & favorit butuh login. Bila belum login, arahkan ke halaman
	 * login dengan ?redirect kembali ke halaman saat ini (untuk foto/video detail).
	 */
	#requireAuth(): boolean {
		if (this.user) return true;
		if (typeof window !== "undefined") {
			const path = window.location.pathname + window.location.search;
			window.location.href = `/login?redirect=${encodeURIComponent(path)}`;
		}
		return false;
	}

	async addToCart(item: CartItem) {
		if (!this.#requireAuth()) return;
		try {
			if (item.kind === "photo" && item.meta) {
				await apiPost<ApiResponse<ApiCartItem>>("/api/cart", {
					photoId: item.meta,
					license: "STANDAR",
				});
			}
			this.#pushCart(item);
		} catch {
			// Optimistic update if API fails
			this.#pushCart(item);
		}
	}

	#pushCart(item: CartItem) {
		if (!this.cart.some((p) => p.id === item.id)) this.cart = [...this.cart, item];
	}

	async removeFromCart(id: string) {
		this.cart = this.cart.filter((p) => p.id !== id);
		try {
			await apiDelete(`/api/cart/${id}`);
		} catch {
			// already removed optimistically
		}
	}

	clearCart() {
		this.cart = [];
	}

	async toggleFavorite(id: string) {
		if (!this.#requireAuth()) return;
		const isFav = this.favorites.includes(id);
		// Optimistic update
		this.favorites = isFav ? this.favorites.filter((f) => f !== id) : [...this.favorites, id];
		try {
			if (isFav) {
				// Find the favorite ID to delete — need to fetch it
				const res = await apiGet<ApiResponse<ApiFavorite[]>>("/api/favorite");
				const fav = res.data.find((f) => f.photoId === id);
				if (fav) await apiDelete(`/api/favorite/${fav.id}`);
			} else {
				await apiPost<ApiResponse<unknown>>("/api/favorite", { photoId: id });
			}
		} catch {
			// Revert on error
			this.favorites = isFav ? [...this.favorites, id] : this.favorites.filter((f) => f !== id);
		}
	}

	isFavorite(id: string) {
		return this.favorites.includes(id);
	}

	async login(email: string, password: string) {
		const res = await api<{ success: boolean; data: { user: ApiUser; accessToken: string; refreshToken: string } }>(
			"/api/auth/login",
			{ method: "POST", body: JSON.stringify({ email, password }), noAuth: true }
		);
		setAccessToken(res.data.accessToken);
		setRefreshToken(res.data.refreshToken);
		const u = res.data.user;
		this.user = { name: u.username, email: u.email, id: u.id, role: u.role };
	}

	async googleLogin(idToken: string): Promise<{ registered: boolean; email?: string; name?: string }> {
		try {
			const res = await api<{ success: boolean; data: { user: ApiUser; accessToken: string; refreshToken: string } }>(
				"/api/auth/google",
				{ method: "POST", body: JSON.stringify({ idToken }), noAuth: true }
			);
			setAccessToken(res.data.accessToken);
			setRefreshToken(res.data.refreshToken);
			const u = res.data.user;
			this.user = { name: u.username, email: u.email, id: u.id, role: u.role };
			return { registered: true };
		} catch (err) {
			if (err instanceof ApiError && err.code === "EMAIL_NOT_REGISTERED") {
				const d = err.details as unknown as Record<string, string>;
				return { registered: false, email: d?.email, name: d?.name };
			}
			throw err;
		}
	}

	async register(username: string, email: string, password: string) {
		await apiPost<ApiResponse<unknown>>("/api/auth/register", { username, email, password });
	}

	async logout() {
		try {
			await apiPost("/api/auth/logout");
		} catch {
			/* ignore */
		}
		setAccessToken(null);
		setRefreshToken(null);
		this.user = null;
		this.cart = [];
		this.favorites = [];
	}
}

export const store = new AppStore();