import type { CvdType } from "./cvd";

export type TextScale = "sm" | "md" | "lg";

export type AccessSettings = {
	reduceMotion: boolean;
	highContrast: boolean;
	textScale: TextScale;
	cvdType: CvdType;
	cvdStrength: number;
};

const DEFAULTS: AccessSettings = {
	reduceMotion: false,
	highContrast: false,
	textScale: "md",
	cvdType: "off",
	cvdStrength: 0.6,
};

const KEY = "lakuna-access";

/**
 * Accessibility settings — port dari lib/access.tsx (React Context) ke
 * Svelte 5 runes. Persist ke localStorage + mirror ke data-attr <html>
 * (drives all CSS hooks).
 */
class Access {
	settings = $state<AccessSettings>(DEFAULTS);
	panelOpen = $state(false);

	#inited = false;

	hydrate() {
		if (this.#inited || typeof window === "undefined") return;
		this.#inited = true;
		try {
			const raw = localStorage.getItem(KEY);
			if (raw) this.settings = { ...DEFAULTS, ...JSON.parse(raw) };
		} catch {
			/* ignore */
		}
	}

	set<K extends keyof AccessSettings>(k: K, v: AccessSettings[K]) {
		this.settings = { ...this.settings, [k]: v };
	}

	reset() {
		this.settings = { ...DEFAULTS };
	}

	setPanelOpen(open: boolean) {
		this.panelOpen = open;
	}

	/** Mirror settings → localStorage + data-attr <html>. Panggil dari layout $effect. */
	sync() {
		if (typeof window === "undefined") return;
		try {
			localStorage.setItem(KEY, JSON.stringify(this.settings));
		} catch {
			/* ignore */
		}
		const h = document.documentElement;
		h.dataset.reduceMotion = String(this.settings.reduceMotion);
		h.dataset.contrast = this.settings.highContrast ? "high" : "normal";
		h.dataset.textSize = this.settings.textScale;
		if (this.settings.cvdType === "off") delete h.dataset.cvd;
		else h.dataset.cvd = this.settings.cvdType;
	}

	/** Lock body scroll while the panel is open. Panggil dari layout $effect. */
	syncPanelLock() {
		if (typeof window === "undefined") return;
		const prev = document.body.style.overflow;
		if (this.panelOpen) {
			document.body.style.overflow = "hidden";
			return () => {
				document.body.style.overflow = prev;
			};
		}
		return () => {};
	}
}

export const access = new Access();