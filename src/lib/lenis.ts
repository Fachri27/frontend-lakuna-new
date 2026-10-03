import type Lenis from "lenis";

/**
 * Instans Lenis aktif (hanya ada di home, dan null untuk reduced-motion).
 * Diisi SmoothScroll; dibaca komponen yang perlu menggerakkan gulir secara
 * terprogram tanpa berkelahi dengan inersia Lenis (mis. MapDescent).
 */
let current: Lenis | null = null;

export function setLenis(l: Lenis | null) {
	current = l;
}

export function getLenis() {
	return current;
}
