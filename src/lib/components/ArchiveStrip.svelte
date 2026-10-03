<script lang="ts">
	import { i18n } from "$lib/i18n.svelte";
	import { fetchPhotos, imgFor, type Photo } from "$lib/data";
	import { scrambleHover } from "$lib/scramble";
	import RevealText from "./RevealText.svelte";
	import Reveal from "./Reveal.svelte";
	import ImageAutoSlider from "./ui/ImageAutoSlider.svelte";

	/**
	 * Arsip — dua baris poster yang berjalan berlawanan arah: atas ke kiri, bawah
	 * ke kanan. Tiap kartu potret seragam dan merupakan tautan ke halaman
	 * bingkainya; baris berhenti saat disentuh supaya tautannya bisa dikenai kursor.
	 *
	 * Foto dibagi bergantian ke dua baris, jadi bingkai yang sama tidak pernah
	 * muncul bertumpuk di atas dan bawah.
	 *
	 * Props opsional dari CMS (section `journeys`/`arsip`): bila `curated`
	 * diisi, kurasi CMS yang dipakai dan fetch terbaru dilewati; header
	 * memakai override bila ada, kalau tidak fallback kamus i18n.
	 */
	let {
		curated = null,
		kicker = null,
		title = null,
	}: {
		curated?: Photo[] | null;
		kicker?: string | null;
		title?: string | null;
	} = $props();
	const MAX_FRAMES = 24;
	/** Gambar yang belum menjawab selama ini dianggap lambat, bukan rusak — tetap dipakai. */
	const PROBE_TIMEOUT_MS = 5000;

	const lang = $derived(i18n.lang);
	const t = $derived(i18n.c.journeys);
	let fetched = $state<Photo[]>([]);

	$effect(() => {
		if (curated) return;
		let alive = true;
		fetchPhotos({ type: "FOTO", limit: 60 })
			.then((r) => {
				if (alive) fetched = r.photos;
			})
			.catch(() => {});
		return () => {
			alive = false;
		};
	});

	const photos = $derived(curated ?? fetched);

	const candidates = $derived(
		photos.slice(0, MAX_FRAMES).map((p) => ({
			// Rasio potret, sama dengan kartunya: placeholder tidak perlu di-crop berat.
			src: imgFor(p.seed, 600, 800, p.thumbUrl),
			alt: p.title[lang],
			href: `/photos/${p.id}`
		}))
	);

	// Foto yang gambarnya tidak bisa dimuat (mis. thumbnail yang hilang di storage)
	// disaring SEBELUM strip dirender. Membuangnya belakangan menggeser seluruh
	// baris di tengah animasi; membiarkannya menyisakan kartu kosong berulang
	// di sepanjang track.
	let usable = $state<string[] | null>(null);
	$effect(() => {
		const list = candidates;
		if (!list.length) return;
		let alive = true;
		const checks = list.map(
			(img) =>
				new Promise<string | null>((resolve) => {
					const probe = new Image();
					const timer = window.setTimeout(() => resolve(img.src), PROBE_TIMEOUT_MS);
					probe.onload = () => {
						window.clearTimeout(timer);
						resolve(probe.naturalWidth > 0 ? img.src : null);
					};
					probe.onerror = () => {
						window.clearTimeout(timer);
						resolve(null);
					};
					probe.src = img.src;
				})
		);
		void Promise.all(checks).then((ok) => {
			if (!alive) return;
			const good = ok.filter((src): src is string => src !== null);
			// Bila SEMUA probe gagal (jaringan flaky saat refresh), jangan
			// kosongkan strip — seluruh section (termasuk judul) hilang dan
			// pin di bawahnya bergeser. Tampilkan semua kandidat; bingkai yang
			// rusak tertutup placeholder-nya sendiri.
			usable = good.length > 0 ? good : list.map((img) => img.src);
		});
		return () => {
			alive = false;
		};
	});

	const images = $derived.by(() => {
		const ok = usable;
		return ok ? candidates.filter((c) => ok.includes(c.src)) : [];
	});

	const rows = $derived.by(() => {
		if (images.length < 2) return [images, images];
		// Genap: kedua baris selalu sama panjang. Durasi dihitung per kartu,
		// jadi jumlah sama = kecepatan gerak atas dan bawah identik persis,
		// dan restart (saat data segar tiba) selalu simetris.
		const even = images.length % 2 === 0 ? images : images.slice(0, -1);
		return [even.filter((_, i) => i % 2 === 0), even.filter((_, i) => i % 2 === 1)];
	});
	/** Satu konstanta untuk dua baris — kecepatan tak bisa divergen. */
	const SLIDER_SPEED = 3.4;
</script>

{#if images.length}
	<section class="as">
		<div class="as-inner">
			<Reveal class="as-head">
				<p data-reveal class="kicker text-safelight">{kicker || t.kicker}</p>
				<div use:scrambleHover>
					<RevealText as="h2" text={title || t.title} class="as-title" />
				</div>
			</Reveal>
		</div>
		<div class="as-rows" data-no-click-sound>
			<ImageAutoSlider images={rows[0]} direction="left" secondsPerCard={SLIDER_SPEED} />
			<ImageAutoSlider images={rows[1]} direction="right" secondsPerCard={SLIDER_SPEED} />
		</div>
	</section>
{/if}
