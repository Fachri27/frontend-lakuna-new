<script lang="ts" module>
	/**
	 * Penanda "sudah tampil di load ini" — flag level-modul (bukan sessionStorage).
	 * Modul dievaluasi ulang hanya saat full reload, jadi flag ini otomatis reset
	 * tiap refresh (→ preloader tampil lagi), tapi tetap true sepanjang satu load
	 * (→ soft-nav balik ke home tidak memunculkannya dua kali).
	 */
	let didShowThisLoad = false;
</script>

<script lang="ts">
	/**
	 * Darkroom preloader — iris pembuka lensa, tanpa badan lensa.
	 *
	 * Tekstur bilahnya mengisi bingkai sampai ke tepi: tidak ada barel, bibir
	 * kaca, atau batas lingkaran apa pun. Yang mengungkap halaman cuma lubang
	 * segi-9 yang membesar di tengah.
	 *
	 * Yang menentukan ini kebaca sebagai bilah aperture atau cuma bidang hitam
	 * bersudut adalah SKALA MEKANISMENYA terhadap layar — bukan ada tidaknya
	 * lingkaran. Versi paling awal memakai poros r=900 unit di SVG 105vmax, jadi
	 * layar cuma melihat 61% jari-jari mekanisme: tiap bilah jadi bidang raksasa
	 * tanpa struktur. Di sini porosnya r=505 unit dan SVG-nya diukur mengikuti
	 * diagonal layar (lihat --pl-span di app.css), jadi layar melihat ~85% jari-
	 * jari mekanisme di rasio mana pun — cukup untuk melihat kesembilan pelatnya
	 * saling tumpang tindih.
	 *
	 * Geometri (viewBox 1000×1000, pusat 500,500): tepi depan tiap bilah adalah
	 * garis lewat porosnya, jadi memutar sebesar φ menggeser garis itu sejauh
	 * 505·sin(φ) dari pusat → lubang segi-9 dengan inradius itu. Tepinya
	 * dilengkungkan (BOW) supaya lubangnya membulat; puncak lengkungnya ~58 unit,
	 * jadi tutup rapat baru terjadi di bawah −6.7° dan φ awalnya dipasang −9°.
	 * Diukur di browser: rapat sampai −6°, bocor mulai −5°.
	 */
	import ApiImage from "./ApiImage.svelte";

	// ── Timeline (ms) — harus seirama dengan delay di app.css ──
	// Tahan-gelapnya tetap 450ms — bagian itu memang tidak boleh lama. Yang
	// dipanjangkan bukaannya (0.9s → 1.4s), karena di 0.9s mekanismenya lewat
	// terlalu cepat untuk sempat terbaca.
	const UNLOCK_AT = 1600; // lubang sudah melewati tepi layar
	const SHOW_MS = 1950; // unmount setelah bilah bersih dari bingkai
	// Meter harus SELESAI sebelum chrome mulai luruh (950ms), bukan sesudahnya —
	// kalau tidak, bar-nya kepotong di tengah hitungan.
	const METER_MS = 900; // durasi bar + hitungan f-stop

	// Deret f-stop nyata; dibaca mundur seiring aperture membuka.
	const STOPS = ["16", "11", "8", "5.6", "4", "2.8", "2", "1.4"];

	let show = $state(false);
	let stopIdx = $state(0);

	// ── Bilah aperture ──
	// Bilah dibatasi kotak, bukan setengah-bidang: cukup untuk menutupi seluruh
	// bagian layar yang ada di sisi tertutupnya, tapi jauh lebih murah di-paint.
	// Batasnya diturunkan dari jangkauan koordinat lokal titik on-screen sepanjang
	// rentang rotasi (−13°…58°). Titik terjauh di layar ada 460 unit dari pusat
	// (kasus terburuk viewport persegi), sehingga x ∈ [−193, 952] dan y ∈ [0, 573].
	const R = 505; // radius lingkaran poros — selalu di luar sudut layar
	const BX0 = -300; // sisi luar (melewati poros)
	const BX1 = 1080; // sisi dalam (melewati pusat)
	const BY = 700; // kedalaman bilah dari tepi depan
	const BOW = 78; // tinggi titik kendali lengkung tepi (puncak ≈ 0.75·BOW)

	// Tepi depan: kubik yang membusur ke arah badan bilah. Titik kendalinya
	// ditaruh supaya puncak lengkung jatuh di x lokal ~390 — tengah rentang
	// 505·cos(φ) selama animasi, yaitu tempat tepi ini membentuk lubang.
	const edgePath = `M ${BX1},0 C 620,${BOW} 160,${BOW} ${BX0},0`;
	const bladePath = `${edgePath} L ${BX0},${BY} L ${BX1},${BY} Z`;

	// Cahaya tepi: alpha 0 di kedua ujung + spreadMethod pad-lah yang memotong
	// tepi, bukan panjang path-nya.
	//
	// Rentangnya sengaja PENDEK. Sebelumnya 100…820 — 720 unit ≈ 1640 px di
	// layar, jadi kesembilan seam membentang dari tepi ke tepi dan saling
	// menyilang jauh dari pusat: bukan iris, melainkan jaring laba-laba. Pada
	// iris sungguhan, tepi bilah hanya terbaca terang di dekat bibir lubang lalu
	// meredup ke luar.
	//
	// Rentangnya juga TIDAK simetris terhadap pusat, dan itu yang menentukan.
	// Pusat layar ada di x lokal 505 (poros berjarak 505 dari pusat, sumbu x
	// lokal mengarah ke sana). Rentang yang menaungi pusat di tengah-tengahnya
	// membuat tiap tepi menyala di KEDUA sisi lubang — jadilah sembilan tali yang
	// saling menyilang: bintang, bukan iris. Pada iris sungguhan tiap seam hanya
	// terlihat dari bibir lubang MENJAUH ke luar, dan sembilannya tidak pernah
	// bersilangan. Maka rentangnya berhenti tepat setelah pusat (540) dan
	// memanjang ke luar (140).
	//
	// Puncak terangnya ditaruh di ~472, bukan 505: selama membuka, titik tepi
	// yang terdekat ke pusat bergeser dari x 505 (tertutup) ke 268 (φ=58°), jadi
	// 472 melayani keadaan tertutup sekaligus paruh pertama bukaan.
	const EDGE_A = 215;
	const EDGE_B = 540;

	// Pencahayaan per bilah: bilah yang menghadap sumber cahaya sedikit lebih
	// terang, jadi tumpukan pelatnya kebaca punya bahan — bukan sembilan siluet
	// hitam yang sama persis.
	const LIGHT_DEG = 292;
	const shade = (t: number) => {
		// Rentangnya diturunkan drastis. Sebelumnya pelat paling terang #22262f
		// menutupi 85–100% layar (diukur), jadi keadaan tertutup terbaca sebagai
		// kabut biru-abu, bukan logam gelap. Sekarang pelatnya nyaris hitam dan
		// yang memikul strukturnya adalah seam-nya, bukan luminansi bidangnya.
		const lo = [4, 5, 7];
		const hi = [19, 22, 27];
		return `#${lo
			.map((v, i) => Math.round(v + (hi[i] - v) * t).toString(16).padStart(2, "0"))
			.join("")}`;
	};

	const blades = Array.from({ length: 9 }, (_, i) => {
		const deg = (i * 360) / 9;
		const rad = (deg * Math.PI) / 180;
		// Normal muka bilah mengarah ke deg + 270 (lihat catatan geometri).
		const lum = 0.5 + 0.5 * Math.cos(((deg + 270 - LIGHT_DEG) * Math.PI) / 180);
		return {
			i,
			key: String(i),
			px: 500 + R * Math.cos(rad),
			py: 500 + R * Math.sin(rad),
			// Sumbu x lokal bilah harus mengarah ke pusat → putar balik 180°.
			base: deg + 180,
			fill: shade(lum),
		};
	});

	// Bilah 0 digambar dua kali — sekali di awal, sekali lagi di akhir. Ekor tepi
	// tiap bilah ditutup badan bilah *berikutnya*, jadi dengan urutan 0…8 bilah
	// terakhir tidak punya penutup dan ekornya terlihat memanjang. Salinan bilah 0
	// di paling atas membuat tumpang tindihnya melingkar penuh, seperti iris asli.
	const bladeOrder = [...blades, { ...blades[0], key: "0-wrap" }];

	// Ghost flare berbentuk segi-9 — pantulan antar-elemen yang bentuknya
	// mengikuti aperture. Penanda "lensa" yang paling langsung kebaca, dan satu-
	// satunya bagian yang boleh keluar dari lingkaran kaca.
	const nonagon = Array.from({ length: 9 }, (_, i) => {
		const a = ((i * 40 - 90) * Math.PI) / 180;
		return `${(50 + 50 * Math.cos(a)).toFixed(1)}% ${(50 + 50 * Math.sin(a)).toFixed(1)}%`;
	}).join(", ");
	const ghosts = [
		{ x: -26, y: 17, size: 11, bg: "rgba(120,170,255,0.13)" },
		{ x: 17, y: -11, size: 6.5, bg: "rgba(255,77,18,0.16)" },
		{ x: 31, y: -20, size: 17, bg: "rgba(255,120,60,0.075)" },
	];

	// Keputusan tampil — sekali per load.
	$effect(() => {
		if (didShowThisLoad) return;
		didShowThisLoad = true;
		if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
		show = true;
	});

	// f/16 → f/1.4 seirama bukaan iris.
	$effect(() => {
		if (!show) return;
		let raf = 0;
		const start = performance.now();
		const tick = (now: number) => {
			const p = Math.min(1, (now - start) / METER_MS);
			stopIdx = Math.min(STOPS.length - 1, Math.floor(p * STOPS.length));
			if (p < 1) raf = requestAnimationFrame(tick);
		};
		raf = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(raf);
	});

	// Kunci scroll, lalu lepas begitu lubangnya melewati tepi layar — halaman
	// sudah terungkap sebelum overlay-nya di-unmount.
	$effect(() => {
		if (!show) return;
		const prev = document.body.style.overflow;
		document.body.style.overflow = "hidden";
		const t = setTimeout(() => {
			document.body.style.overflow = prev;
		}, UNLOCK_AT);
		return () => {
			clearTimeout(t);
			document.body.style.overflow = prev;
		};
	});

	// Unmount setelah animasi keluar selesai.
	$effect(() => {
		if (!show) return;
		const t = setTimeout(() => (show = false), SHOW_MS);
		return () => clearTimeout(t);
	});
</script>

{#if show}
	<div class="pl-preloader" role="status" aria-live="polite" aria-label="Memuat Lakuna">
		<svg class="pl-iris" viewBox="0 0 1000 1000" aria-hidden="true">
			<defs>
				<linearGradient id="pl-edge-g" gradientUnits="userSpaceOnUse" x1={EDGE_A} y1="0" x2={EDGE_B} y2="0">
					<stop offset="0" stop-color="rgba(241,239,233,0)" />
					<stop offset="0.5" stop-color="rgba(241,239,233,0.14)" />
					<stop offset="0.83" stop-color="rgba(241,239,233,0.34)" />
					<stop offset="1" stop-color="rgba(241,239,233,0)" />
				</linearGradient>
				<!-- Garis gelap tepat di dalam tepi terang → bevel, bikin pelatnya
				     punya tebal. -->
				<linearGradient id="pl-bevel-g" gradientUnits="userSpaceOnUse" x1={EDGE_A} y1="0" x2={EDGE_B} y2="0">
					<stop offset="0" stop-color="rgba(0,0,0,0)" />
					<stop offset="0.5" stop-color="rgba(0,0,0,0.6)" />
					<stop offset="1" stop-color="rgba(0,0,0,0)" />
				</linearGradient>
				<radialGradient id="pl-bloom-g" cx="0.5" cy="0.5" r="0.5">
					<stop offset="0" stop-color="rgba(255,255,255,0.5)" />
					<stop offset="0.36" stop-color="rgba(255,77,18,0.3)" />
					<stop offset="1" stop-color="rgba(255,77,18,0)" />
				</radialGradient>
			</defs>

			<!-- Lapis 1 — BADAN bilah. Tugasnya cuma satu: menutup bingkai rapat.
			     Tetap memakai bladeOrder (dengan salinan bilah 0) supaya tumpang
			     tindihnya melingkar penuh dan tidak ada celah. -->
			{#each bladeOrder as b (b.key)}
				<!-- Rotasi CSS harus di elemen terpisah dari atribut transform:
				     properti CSS `transform` menimpa atribut, bukan menyusul. -->
				<g class="pl-blade" style={`transform-origin:${b.px}px ${b.py}px; --pl-d:${b.i * 8}ms`}>
					<g transform={`translate(${b.px} ${b.py}) rotate(${b.base})`}>
						<path d={bladePath} fill={b.fill} />
					</g>
				</g>
			{/each}

			<!-- Lapis 2 — TEPI, digambar di atas seluruh badan.
			     Ini inti perbaikannya. Sebelumnya tepi tiap bilah digambar bersama
			     badannya, lalu tertimbun badan bilah berikutnya: diukur, tiap bilah
			     menutupi 85–100% layar pada keadaan tertutup, jadi delapan seam
			     terkubur dan yang tersisa cuma beberapa garis nyasar di satu sudut —
			     terbaca sebagai cakrawala, bukan iris.
			     Digambar terpisah, kesembilan seam terlihat penuh dan membentuk
			     bintang yang berpusat tepat di tengah layar, tempat tanda bidik
			     berada. Ini juga yang benar secara fisik: pada iris sungguhan, tepi
			     tiap bilah memang terlihat dari bibir lubang sampai ke luar. -->
			{#each blades as b (b.key)}
				<g class="pl-blade" style={`transform-origin:${b.px}px ${b.py}px; --pl-d:${b.i * 8}ms`}>
					<g transform={`translate(${b.px} ${b.py}) rotate(${b.base})`}>
						<path d={edgePath} transform="translate(0 3)" fill="none" stroke="url(#pl-bevel-g)" stroke-width="2.4" />
						<path d={edgePath} fill="none" stroke="url(#pl-edge-g)" stroke-opacity="0.085" stroke-width="11" />
						<path d={edgePath} fill="none" stroke="url(#pl-edge-g)" stroke-width="1.4" />
					</g>
				</g>
			{/each}

			<circle class="pl-bloom" cx="500" cy="500" r="380" fill="url(#pl-bloom-g)" />
		</svg>

		<!-- Semburat coating + vignette, sekarang selebar bingkai karena tidak ada
		     lingkaran kaca yang membatasinya. -->
		<div class="pl-coat" aria-hidden="true"></div>

		<!-- Tanda bidik kecil di titik lensa. -->
		<div class="pl-reticle" aria-hidden="true">
			<span class="pl-ch pl-ch-h"></span>
			<span class="pl-ch pl-ch-v"></span>
			<span class="pl-dot"></span>
		</div>

		<!-- Ghost flare — satu-satunya bagian yang keluar dari lingkaran kaca. -->
		<div class="pl-ghosts" aria-hidden="true">
			{#each ghosts as g, i (i)}
				<span
					style={`--gx:${g.x}vmin; --gy:${g.y}vmin; --gs:${g.size}vmin; background:${g.bg}; clip-path:polygon(${nonagon})`}
				></span>
			{/each}
		</div>

		<div class="pl-flash" aria-hidden="true"></div>

		<div class="pl-chrome" aria-hidden="true">
			<div class="pl-film pl-film-top"></div>
			<div class="pl-film pl-film-bottom"></div>

			<span class="pl-label pl-label-tl">Darkroom</span>
			<span class="pl-label pl-label-tr">ISO 400 · 1/125</span>

			<div class="pl-meta">
				<ApiImage src="/logo1.png" alt="Lakuna" width={220} height={116} eager class="pl-logo no-cvd" />
				<div class="pl-bar">
					<span class="pl-bar-fill"></span>
				</div>
				<div class="pl-metarow">
					<span>Membuka</span>
					<span class="pl-frame">f/{STOPS[stopIdx]}</span>
				</div>
			</div>
		</div>
	</div>
{/if}
