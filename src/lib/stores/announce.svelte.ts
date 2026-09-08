/**
 * Screen-reader live region — port dari components/LiveAnnouncer.tsx
 * (React Context) ke singleton runes store.
 */
class Announcer {
	polite = $state("");
	assertive = $state("");

	#politeTimer: ReturnType<typeof setTimeout> | null = null;
	#assertiveTimer: ReturnType<typeof setTimeout> | null = null;

	announce(message: string, priority: "polite" | "assertive" = "polite") {
		if (priority === "assertive") {
			if (this.#assertiveTimer) clearTimeout(this.#assertiveTimer);
			this.assertive = "";
			this.#assertiveTimer = setTimeout(() => (this.assertive = message), 50);
		} else {
			if (this.#politeTimer) clearTimeout(this.#politeTimer);
			this.polite = "";
			this.#politeTimer = setTimeout(() => (this.polite = message), 50);
		}
	}
}

export const announcer = new Announcer();