import type { Attachment } from "svelte/attachments";

/**
 * Jeda semua animasi CSS di dalam elemen selama elemen itu di luar layar (`data-offscreen` + aturan global di
 * app.css). Animasi tanpa henti (strip foto, slider, titik "live") dulu terus berjalan di seluruh halaman —
 * browser menyiapkan frame 60×/dtk walau tak ada yang terlihat bergerak. Pemakaian: `{@attach pauseOffscreen()}`.
 */
export function pauseOffscreen(margin = "120px"): Attachment<HTMLElement> {
	return (el) => {
		if (typeof IntersectionObserver === "undefined") return;
		const io = new IntersectionObserver(([e]) => el.toggleAttribute("data-offscreen", !e?.isIntersecting), {
			rootMargin: `${margin} 0px`,
		});
		io.observe(el);
		return () => io.disconnect();
	};
}
