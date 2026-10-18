<script lang="ts">
	/**
	 * Judul halaman detail foto/video: paling banyak dua baris, dipecah rapi.
	 *  - Ukuran huruf berjenjang menurut panjang judul, supaya judul panjang tetap muat dua baris;
	 *    judul yang nyaris muat satu baris dikecilkan sedikit (≤ 12%) agar tidak dipecah.
	 *  - Perlu dua baris → titik patah dipilih sendiri, bukan oleh browser (`text-wrap: balance` bisa
	 *    memecah di tengah nama dan berat di bawah — "Rain in Central / Kalimantan's Sakala Forest";
	 *    `pretty` menyisakan satu kata sendirian):
	 *      1. utamakan batas frasa — patah tepat sebelum kata depan/sambung ("Javan Rhino / at Ujung
	 *         Kulon National Park", "Bayi Gajah Sumatera / di Way Kambas") selama kedua baris tidak
	 *         terlalu timpang; yang paling seimbang menang;
	 *      2. tak ada → baris pertama sedikit lebih panjang dari baris kedua, selisih sekecil mungkin,
	 *         dan baris pertama tidak berakhir dengan kata sambung.
	 *  - Tak ada patahan dua baris yang muat (layar sangat sempit, mis. 280 px) → huruf dikecilkan (≤ 30%) sampai
	 *    patahan paling seimbang muat. Masih tidak muat → pemecahan browser, dipotong "…" di baris kedua (judul
	 *    lengkap di tooltip).
	 */
	let { text }: { text: string } = $props();

	/** Kata depan/sambung (EN & ID): baik untuk mengawali baris kedua, buruk untuk mengakhiri baris pertama. */
	const LINK_WORDS = new Set(
		"a an the of in on at to for and or by with from into near over under across & di ke dari dan yang untuk dengan pada oleh atau serta dalam sebagai menuju antara".split(" "),
	);
	const isLink = (w: string) => LINK_WORDS.has(w.toLowerCase());
	/** Perbandingan baris pendek : baris panjang paling kecil yang masih boleh untuk patah di batas frasa. */
	const MIN_PHRASE_RATIO = 0.3;
	/** Judul yang lebarnya ≤ 112% satu baris dikecilkan agar tetap satu baris. */
	const NEAR_FIT = 1.12;

	const words = $derived(text.trim().split(/\s+/));
	const SIZE = {
		lg: "text-[clamp(1.9rem,4.2vw,3.6rem)]",
		md: "text-[clamp(1.75rem,3.6vw,3.1rem)]",
		sm: "text-[clamp(1.6rem,3vw,2.6rem)]",
	};
	const size = $derived(text.length <= 22 ? SIZE.lg : text.length <= 34 ? SIZE.md : SIZE.sm);

	let el = $state<HTMLElement>();
	/** Jumlah kata di baris pertama; 0 = serahkan ke browser (muat satu baris, atau tak bisa dua baris). */
	let breakAt = $state(0);

	$effect(() => {
		const node = el;
		const ws = words;
		void size;
		if (!node) return;
		const probe = document.createElement("span");
		probe.style.cssText = "position:absolute;visibility:hidden;white-space:nowrap;left:-9999px;top:0";
		document.body.append(probe);
		let lastW = -1;

		const pick = () => {
			const maxW = node.clientWidth;
			if (!maxW || maxW === lastW) return;
			lastW = maxW;
			node.style.fontSize = "";
			const cs = getComputedStyle(node);
			// Per properti: `font` gabungan bisa kosong di getComputedStyle (Firefox).
			for (const k of ["fontFamily", "fontSize", "fontWeight", "fontStyle", "fontStretch", "letterSpacing"] as const)
				probe.style[k] = cs[k];
			const width = (s: string) => {
				probe.textContent = s;
				return probe.getBoundingClientRect().width;
			};
			const full = width(ws.join(" "));
			if (ws.length < 2 || full <= maxW) {
				breakAt = 0;
				return;
			}
			// Nyaris muat satu baris → kecilkan sedikit saja daripada dipecah dua.
			if (full <= maxW * NEAR_FIT) {
				node.style.fontSize = `${(parseFloat(cs.fontSize) * maxW * 0.99) / full}px`;
				breakAt = 0;
				return;
			}
			let phrase = 0;
			let phraseRatio = 0;
			let best = 0;
			let bestScore = Infinity;
			for (let k = 1; k < ws.length; k++) {
				const w1 = width(ws.slice(0, k).join(" "));
				const w2 = width(ws.slice(k).join(" "));
				if (w1 > maxW || w2 > maxW) continue;
				const endsLink = isLink(ws[k - 1]!);
				// 1. Batas frasa: baris kedua diawali kata depan, baris pertama tidak berakhir dengannya.
				//    Seri → yang berat di atas.
				const ratio = Math.min(w1, w2) / Math.max(w1, w2);
				if (isLink(ws[k]!) && !endsLink && ratio >= MIN_PHRASE_RATIO && (ratio > phraseRatio || (ratio === phraseRatio && w1 >= w2))) {
					phraseRatio = ratio;
					phrase = k;
				}
				// 2. Cadangan: berat di bawah dihukum dua kali; kata sambung di ujung baris pertama didenda.
				let score = w1 >= w2 ? w1 - w2 : (w2 - w1) * 2;
				if (endsLink) score += maxW * 0.3;
				if (score < bestScore) {
					bestScore = score;
					best = k;
				}
			}
			if (!phrase && !best) {
				let k0 = 1;
				let m0 = Infinity;
				for (let k = 1; k < ws.length; k++) {
					const m = Math.max(width(ws.slice(0, k).join(" ")), width(ws.slice(k).join(" ")));
					if (m < m0) {
						m0 = m;
						k0 = k;
					}
				}
				const scale = (maxW * 0.99) / m0;
				if (scale >= 0.7) {
					node.style.fontSize = `${parseFloat(cs.fontSize) * scale}px`;
					breakAt = k0;
					return;
				}
			}
			breakAt = phrase || best;
		};

		// Font judul bisa tiba belakangan (lebar kotak tak berubah, jadi ResizeObserver tak menangkapnya):
		// ukur ulang setiap kali ada font selesai dimuat.
		const repick = () => {
			lastW = -1;
			pick();
		};
		pick();
		void document.fonts?.ready.then(repick);
		document.fonts?.addEventListener("loadingdone", repick);
		const ro = new ResizeObserver(pick);
		ro.observe(node);
		return () => {
			ro.disconnect();
			document.fonts?.removeEventListener("loadingdone", repick);
			probe.remove();
		};
	});
</script>

<!-- line-clamp memotong apa pun di luar kotak: leading 1.08 menyisakan celah antara ekor huruf baris 2
	dan pucuk baris 3 (Poppins), pb 0.105em menaruh batas potong di tengah celah itu (-mb mengembalikan
	jaraknya). -->
<h1
	bind:this={el}
	title={text}
	class={`line-clamp-2 -mb-[0.105em] pb-[0.105em] text-balance font-display ${size} font-light leading-[1.08] tracking-[-0.02em] text-fg`}
>
	{#if breakAt > 0}{words.slice(0, breakAt).join(" ")}<br />{words.slice(breakAt).join(" ")}{:else}{text}{/if}
</h1>
