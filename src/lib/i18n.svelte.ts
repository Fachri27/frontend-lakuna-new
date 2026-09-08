import { dict, type Copy, type Lang } from "./i18n-dict";

/**
 * i18n — port dari lib/i18n.tsx (React Context) ke Svelte 5 runes.
 * Satu singleton; `hydrate()` dipanggil sekali dari root layout di sisi client.
 */
class I18n {
	lang = $state<Lang>("id");

	/** Kamus terjemahan bahasa aktif. */
	get c(): Copy {
		return dict[this.lang];
	}

	setLang(l: Lang) {
		this.lang = l;
		if (typeof window === "undefined") return;
		try {
			localStorage.setItem("lakuna-lang", l);
		} catch {
			/* ignore */
		}
		document.documentElement.lang = l;
	}

	hydrate() {
		if (typeof window === "undefined") return;
		try {
			const stored = localStorage.getItem("lakuna-lang");
			if (stored === "en" || stored === "id") this.lang = stored;
		} catch {
			/* ignore */
		}
		document.documentElement.lang = this.lang;
	}
}

export const i18n = new I18n();
export type { Lang, Copy };