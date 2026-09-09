<script lang="ts">
	import ApiImage from "./ApiImage.svelte";
	import gsap from "gsap";
	import "glightbox/dist/css/glightbox.min.css";
	import { i18n } from "$lib/i18n.svelte";
	import { store } from "$lib/store.svelte";
	import { catLabel, fmtIDR, imgFor, USE_DUMMY_IMAGES, fetchPhotoById, fetchRelatedPhotos, fetchActiveEvents, eventAmount, bestEvent, type Photo, type ApiEvent } from "$lib/data";
	import Reveal from "./Reveal.svelte";
	import PhotoCard from "./PhotoCard.svelte";

	let { photoId }: { photoId: string } = $props();

	const copy = {
		id: {
			back: "Kembali", by: "oleh", cat: "Kategori", tags: "Kata kunci",
			zoom: "Perbesar",
			dims: "Dimensi", license: "Lisensi", personal: "Personal", commercial: "Komersial",
			personalDesc: "Pakai pribadi & media sosial", commercialDesc: "Pakai komersial & cetak",
			addToCart: "Tambah ke keranjang", added: "Ditambahkan", buyNow: "Beli sekarang",
			save: "Simpan", saved: "Tersimpan", download: "Unduh pratinjau",
			slip: "Lembar lisensi", usage: "Jenis pakai", fee: "Biaya lisensi",
			youGet: "Yang kamu terima", noWatermark: "tanpa tanda air",
			related: "Bingkai terkait", byArtist: "Dari perajangga yang sama"
		},
		en: {
			back: "Back", by: "by", cat: "Category", tags: "Keywords",
			zoom: "Enlarge",
			dims: "Dimensions", license: "License", personal: "Personal", commercial: "Commercial",
			personalDesc: "Personal & social media use", commercialDesc: "Commercial & print use",
			addToCart: "Add to cart", added: "Added", buyNow: "Buy now",
			save: "Save", saved: "Saved", download: "Download preview",
			slip: "Licence slip", usage: "Usage", fee: "Licence fee",
			youGet: "What you get", noWatermark: "no watermark",
			related: "Related frames", byArtist: "From the same image-maker"
		}
	};

	const lang = $derived(i18n.lang);
	const t = $derived(copy[lang]);

	let license = $state<"personal" | "commercial">("personal");
	let added = $state(false);
	let photo = $state<Photo | null>(null);
	let related = $state<Photo[]>([]);
	let events = $state<ApiEvent[]>([]);
	let downloading = $state(false);

	let rootEl: HTMLDivElement | undefined = $state();
	// Tombol asli di lembar lisensi. Rel bawah mobile hanya hadir saat tombol ini
	// sudah tergulung keluar layar — supaya tidak pernah ada dua tombol yang
	// sama terlihat bersamaan.
	let ctaEl: HTMLButtonElement | undefined = $state();
	let ctaPassed = $state(false);
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let lightbox = $state<any>(null);

	$effect(() => {
		fetchPhotoById(photoId).then((p) => (photo = p));
		fetchRelatedPhotos(photoId).then((r) => (related = r)).catch(() => {});
		// Event diskon aktif khusus foto ini (targetType PHOTO).
		fetchActiveEvents({ photoId }).then((e) => (events = e)).catch(() => (events = []));
	});

	// Lightbox — GLightbox di-import dinamis di client (modulnya akses `window`
	// saat dievaluasi, jadi tidak boleh di-import top-level di komponen yang di-SSR).
	$effect(() => {
		if (!photo) return;
		let cancelled = false;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		let lb: any = null;
		void import("glightbox").then(({ default: GLightbox }) => {
			if (cancelled) return;
			const src = imgFor(photo!.seed, 1600, 2000, photo!.thumbUrl || photo!.watermarkUrl);
			lb = GLightbox({
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				elements: [{ href: src, type: "image" }] as any,
				skin: "clean",
				openEffect: "zoom",
				closeEffect: "fade"
			});
			lightbox = lb;
		});
		return () => {
			cancelled = true;
			lb?.close();
			lightbox = null;
		};
	});

	// Aturannya arah, bukan sekadar "tidak terlihat": rel baru muncul setelah
	// tombolnya lewat KE ATAS. "Tidak terlihat" juga benar saat pembaca masih di
	// puncak halaman — di situ rel cuma menawarkan harga untuk foto yang belum
	// sempat dilihat.
	$effect(() => {
		const el = ctaEl;
		if (!el) return;
		const update = () => (ctaPassed = el.getBoundingClientRect().bottom < 0);
		update();
		window.addEventListener("scroll", update, { passive: true });
		window.addEventListener("resize", update);
		return () => {
			window.removeEventListener("scroll", update);
			window.removeEventListener("resize", update);
		};
	});

	// Tombol "ke atas" dan panel aksesibilitas mengambang di bottom-6 — persis di
	// belakang rel. Selama rel terangkat, keduanya ikut naik.
	//
	// Diangkat lewat style inline, bukan aturan CSS: kedua tombol itu memakai
	// utility bottom-6 dari Tailwind, dan aturan buatan sendiri di @layer
	// utilities tidak memenangkannya di sini. Style inline selalu menang, dan
	// dilepas lagi begitu rel turun atau halaman ditinggalkan.
	$effect(() => {
		const naik = ctaPassed && window.innerWidth < 640;
		const els = [...document.querySelectorAll<HTMLElement>(".fab-mengambang")];
		for (const el of els) el.style.bottom = naik ? "6.25rem" : "";
		return () => {
			for (const el of els) el.style.bottom = "";
		};
	});

	const fav = $derived(photo ? store.isFavorite(photo.id) : false);
	// Nomor katalog untuk dibaca manusia. Id-nya UUID: di 390px, 36 karakter
	// ber-tracking lebar membungkus jadi tiga baris dan menabrak tombol
	// Perbesar. Enam digit terakhir cukup untuk menyebut satu bingkai; id
	// penuhnya tetap hidup di URL dan di keranjang.
	const frameNo = $derived(photo ? photo.id.slice(-6).toUpperCase() : "");
	const price = $derived(photo ? (license === "personal" ? photo.price : photo.price * 2) : 0);
	// Event diskon terbaik untuk harga lisensi saat ini (take-largest bersama voucher
	// di pembayaran; di sini sekadar menampilkan info perkiraan).
	const activeEvent = $derived(photo ? bestEvent(events, price) : null);
	const eventAmt = $derived(activeEvent ? eventAmount(activeEvent, price) : 0);
	const finalPrice = $derived(Math.max(0, price - eventAmt));

	// Animasi plate (masuk) sekali foto tersedia.
	$effect(() => {
		if (!photo) return;
		if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
		const plate = rootEl?.querySelector<HTMLElement>("[data-plate]");
		if (plate) gsap.fromTo(plate, { y: 28, opacity: 0 }, { y: 0, opacity: 1, duration: 1.1, ease: "power3.out" });
	});

	function handleAdd() {
		if (!photo) return;
		store.addToCart({
			id: `${photo.id}-${license}`,
			kind: "photo",
			title: `${photo.title[lang]} — ${license === "personal" ? t.personal : t.commercial}`,
			price: finalPrice,
			meta: photo.id
		});
		added = true;
		setTimeout(() => (added = false), 1800);
	}

	// Unduh pratinjau bertanda air (versi ber-resolusi rendah). File penuh tanpa
	// tanda air hanya tersedia setelah pembelian (lihat modul download backend).
	async function handleDownloadPreview() {
		if (!photo || downloading) return;
		const src = imgFor(photo.seed, 1600, 2000, photo.watermarkUrl || photo.thumbUrl);
		if (!src) return;
		downloading = true;
		const filename = `lakuna-${photo.seed || photo.id}-pratinjau.jpg`;
		try {
			const res = await fetch(src, { mode: "cors" });
			if (!res.ok) throw new Error("fetch failed");
			const blob = await res.blob();
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = filename;
			document.body.appendChild(a);
			a.click();
			a.remove();
			URL.revokeObjectURL(url);
		} catch {
			// Fallback: bila fetch blob diblokir CORS, buka pratinjau di tab baru.
			window.open(src, "_blank", "noopener,noreferrer");
		} finally {
			downloading = false;
		}
	}
</script>

{#snippet meta(label: string, value: string)}
	<div class="flex items-baseline justify-between gap-6 border-b border-hair py-3.5 sm:block sm:border-0 sm:py-0">
		<p class="kicker shrink-0 text-fg-muted">{label}</p>
		<p class="text-right text-sm text-fg sm:mt-1.5 sm:text-left">{value}</p>
	</div>
{/snippet}

{#snippet licenseRow(active: boolean, onpick: () => void, title: string, desc: string, optPrice: number, discount = 0)}
	{@const finalP = Math.max(0, optPrice - discount)}
	<button
		type="button"
		role="radio"
		aria-checked={active}
		onclick={onpick}
		class="group/row flex w-full items-start justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-fg/[0.03] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-safelight"
	>
		<span class="flex items-start gap-3">
			<!-- Cakram kecil, bukan kotak berbingkai: barisnya sendiri sudah jadi
				wadah, jadi tidak ada kartu di dalam kartu. -->
			<span
				class={`mt-[3px] grid h-3.5 w-3.5 shrink-0 place-items-center rounded-full border transition-colors ${
					active ? "border-safelight" : "border-fg-muted/50 group-hover/row:border-fg-muted"
				}`}
			>
				<span class={`h-1.5 w-1.5 rounded-full transition-colors ${active ? "bg-safelight" : "bg-transparent"}`}></span>
			</span>
			<span>
				<span class={`block text-sm ${active ? "text-fg" : "text-fg/80"}`}>{title}</span>
				<span class="mt-0.5 block text-xs leading-relaxed text-fg-muted">{desc}</span>
			</span>
		</span>
		<span class="shrink-0 pt-px text-right font-mono text-[0.82rem] tabular-nums">
			{#if discount > 0}
				<span class="block text-[0.72rem] text-fg-muted line-through opacity-50">{fmtIDR(optPrice)}</span>
				<span class={active ? "text-fg" : "text-fg-muted"}>{fmtIDR(finalP)}</span>
			{:else}
				<span class={active ? "text-fg" : "text-fg-muted"}>{fmtIDR(optPrice)}</span>
			{/if}
		</span>
	</button>
{/snippet}

{#if !photo}
	<div class="min-h-screen pt-20 sm:pt-28"></div>
{:else}
	<div bind:this={rootEl} class="min-h-screen pt-20 sm:pt-28">
		<!-- Top strip -->
		<!-- Nomor bingkai sempat muncul tiga kali di satu layar: di sini, di kaki
			pelat, dan di kepala lembar lisensi. Yang di sini murni pengulangan —
			dua sisanya masing-masing punya tugas (kaki pelat = keterangan cetakan,
			kepala slip = identitas dokumen). -->
		<div class="mx-auto flex max-w-[1500px] items-center px-6 pb-6 lg:px-10">
			<a href="/photos" class="arrow-link text-sm text-fg-muted hover:text-safelight">
				<span class="arr">←</span> {t.back}
			</a>
		</div>

		<div class="mx-auto flex max-w-[1500px] flex-col gap-8 px-6 pb-20 lg:grid lg:grid-cols-[1fr_22rem] lg:gap-10 lg:px-10">
			<!-- ───────── Plate ───────── -->
			<div class="lg:col-start-1 lg:row-start-1">
				<!-- Tanpa paspartu. Sebelumnya figure ini punya p-4 berlatar #0c0d0f —
					papan alas yang di mode gelap warnanya sama persis dengan latar
					halaman, jadi tak terlihat. Yang tampak hanya foto yang masuk 16px
					ke dalam kotak tak kasatmata, dan itu kebaca sebagai salah rata
					terhadap lembar lisensi (padahal kotaknya sendiri sudah sejajar).
					Paspartu setipis 16px pada cetakan selebar 1030px memang tidak
					pernah kebaca sebagai paspartu. Sekarang tepi fotonya sendiri yang
					jadi perata, dan sudutnya siku menyamai lembar lisensi. -->
				<figure
					data-plate
					class="group relative cursor-zoom-in overflow-hidden"
					onclick={() => lightbox?.open()}
				>
					<div class="pointer-events-none absolute -inset-10 bg-[radial-gradient(circle_at_50%_40%,color-mix(in_srgb,var(--safelight)_18%,transparent),transparent_60%)] blur-2xl"></div>
					<div
						class="relative aspect-[var(--plate-ar)] max-h-[76svh] w-full overflow-hidden sm:aspect-[3/2] sm:max-h-none"
						style={`--plate-ar: ${photo.w} / ${photo.h}`}
					>
						<ApiImage
							src={imgFor(photo.seed, 1600, 2000, photo.thumbUrl || photo.watermarkUrl)}
							alt={photo.title[lang]}
							fill
							eager
							class="object-cover transition-transform duration-[1400ms] ease-out group-hover:scale-[1.02]"
						/>
						<div class="grain pointer-events-none absolute inset-0 opacity-[0.12] mix-blend-soft-light"></div>
						<div class="pointer-events-none absolute inset-0 opacity-0 shadow-[inset_0_0_120px_rgba(0,0,0,0.45)] transition-opacity duration-500 [.dark_&]:opacity-100"></div>
					</div>
					{#each ["tl", "tr", "bl", "br"] as c (c)}
						<span
							class={`pointer-events-none absolute h-6 w-6 border-ivory/70 ${
								c === "tl" ? "left-3 top-3 border-l border-t"
								: c === "tr" ? "right-3 top-3 border-r border-t"
								: c === "bl" ? "bottom-3 left-3 border-b border-l"
								: "bottom-3 right-3 border-b border-r"
							}`}
						></span>
					{/each}
				</figure>

				<!-- Strip bukti: nomor bingkai + dimensi + perbesar -->
				<div class="mt-3 flex items-center justify-between gap-4">
					<p class="kicker text-fg-muted">
						No. {frameNo}<span class="hidden sm:inline"> — {photo.w} × {photo.h} px</span>
					</p>
					<button
						type="button"
						onclick={() => lightbox?.open()}
						class="kicker rounded-full border border-hair px-3 py-1.5 text-fg-muted transition-colors hover:border-safelight hover:text-safelight focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-safelight"
					>
						{t.zoom} ⤢
					</button>
				</div>

				<!-- Keterangan cetakan: judul dan perajangga menempel pada foto,
					bukan pada lembar lisensi — keduanya menjawab "ini foto apa",
					sementara slip menjawab "berapa dan dapat apa". -->
				<div class="mt-8 max-w-2xl">
					<h1 class="font-display text-[clamp(2.2rem,4.2vw,3.6rem)] font-light leading-[1.02] tracking-[-0.02em] text-fg">
						{photo.title[lang]}
					</h1>
					<p class="mt-3 kicker text-fg-muted">
						{t.by} <span class="text-safelight">{photo.author}</span>
					</p>
				</div>
			</div>

			<!-- ───────── Lembar lisensi ─────────
				Bukan kartu produk. Ini paruh depan dari dokumen yang sama yang
				nanti kembali distempel lunas di PaymentResult — keduanya memakai
				.proof-slip, jadi dua ujung alur pembelian adalah satu benda.
				Sudutnya siku dan tanpa bayangan: dokumen, bukan kartu. Struktur
				dipikul garis rambut antar-baris, bukan kotak bersarang. -->
			<aside class="lg:sticky lg:top-28 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-start">
				<div class="proof-slip border border-hair">
					<div class="flex items-baseline justify-between gap-4 border-b border-hair px-5 py-4">
						<span class="kicker text-fg-muted">{t.slip}</span>
						<span class="font-mono text-[0.7rem] tracking-[0.14em] text-fg-muted">{frameNo}</span>
					</div>

					{#if activeEvent && eventAmt > 0}
						<div class="flex items-baseline justify-between gap-4 border-b border-hair bg-safelight/[0.07] px-5 py-3">
							<span class="kicker text-safelight">{activeEvent.name}</span>
							<span class="font-mono text-[0.8rem] tabular-nums text-safelight">−{fmtIDR(eventAmt)}</span>
						</div>
					{/if}

					<div class="px-5 pt-4">
						<span class="kicker text-fg-muted">{t.usage}</span>
					</div>
					<div role="radiogroup" aria-label={t.usage} class="mt-1 divide-y divide-hair border-b border-hair">
						{@render licenseRow(license === "personal", () => (license = "personal"), t.personal, t.personalDesc, photo.price, activeEvent ? eventAmount(activeEvent, photo.price) : 0)}
						{@render licenseRow(license === "commercial", () => (license = "commercial"), t.commercial, t.commercialDesc, photo.price * 2, activeEvent ? eventAmount(activeEvent, photo.price * 2) : 0)}
					</div>

					<!-- Satu-satunya angka berukuran penuh di panel ini, dan ia milik
						pilihan yang aktif. Sebelumnya harga muncul dua kali: besar di
						atas, lalu diulang di baris Personal. -->
					<div class="border-b border-hair px-5 py-5">
						<span class="kicker text-fg-muted">{t.fee}</span>
						<p class="mt-2 font-display text-[2.1rem] font-light leading-none tracking-[-0.02em] text-fg">
							{fmtIDR(finalPrice)}
						</p>
						{#if eventAmt > 0}
							<p class="mt-2 font-mono text-[0.72rem] tabular-nums text-fg-muted line-through opacity-60">{fmtIDR(price)}</p>
						{/if}
					</div>

					<!-- Satu aksi utama. "Beli sekarang" dan "Simpan" turun jadi teks
						tenang di satu baris — sebelumnya keduanya pil berukuran sama
						sehingga tidak ada yang memimpin. -->
					<div class="px-5 py-5">
						<button
							bind:this={ctaEl}
							type="button"
							onclick={handleAdd}
							class="w-full rounded-full bg-safelight py-3.5 text-sm font-medium text-ivory shadow-[0_14px_40px_-12px_var(--safelight-glow)] transition-transform hover:scale-[1.02] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-safelight"
						>
							{added ? `✓ ${t.added}` : t.addToCart}
						</button>
						<div class="mt-3.5 flex items-center justify-between text-sm">
							<a href="/checkout" class="text-fg-muted transition-colors hover:text-safelight">{t.buyNow}</a>
							<button
								type="button"
								onclick={() => store.toggleFavorite(photo!.id)}
								class="text-fg-muted transition-colors hover:text-safelight"
							>
								{fav ? `♥ ${t.saved}` : `♡ ${t.save}`}
							</button>
						</div>
					</div>

					<!-- Spesifikasi kiriman, bukan kalimat samar. Sebelumnya:
						"Pratinjau tanda air. Unduhan penuh setelah pembelian." -->
					<div class="border-t border-hair px-5 py-4">
						<span class="kicker text-fg-muted">{t.youGet}</span>
						<p class="mt-2 font-mono text-[0.76rem] tabular-nums text-fg">
							{photo.w} × {photo.h} px · JPEG · {t.noWatermark}
						</p>
						<button
							type="button"
							onclick={handleDownloadPreview}
							disabled={downloading || (!USE_DUMMY_IMAGES && !photo?.watermarkUrl && !photo?.thumbUrl)}
							class="mt-3 text-sm text-fg-muted transition-colors hover:text-safelight disabled:opacity-50"
						>
							{downloading ? "…" : t.download}
						</button>
					</div>
				</div>
			</aside>

			<!-- Deskripsi dan data cetakan. Di mobile ini duduk SETELAH lembar
				lisensi: yang dicari orang di layar sempit adalah harga dan tombol,
				bukan paragraf. Di lg ia kembali ke kolom kiri, baris kedua. -->
			<div class="max-w-2xl lg:col-start-1 lg:row-start-2 lg:-mt-4">
				<p class="text-[1.02rem] leading-relaxed text-fg-muted">{photo.desc[lang]}</p>

				<!-- Data cetakan. Di mobile jadi baris-baris bergaris rambut —
					bahasa yang sama dengan lembar lisensi — bukan grid dua kolom
					yang ragged karena nilainya panjang-pendek. -->
				<div class="mt-8 border-t border-hair pt-2 sm:grid sm:grid-cols-3 sm:gap-x-8 sm:gap-y-5 sm:pt-8">
					{@render meta(t.cat, photo.categories.join(", ") || catLabel[photo.cat][lang])}
					{@render meta(t.dims, `${photo.w} × ${photo.h} px`)}
					<div class="flex items-baseline justify-between gap-6 border-b border-hair py-3.5 sm:block sm:border-0 sm:py-0">
						<p class="kicker shrink-0 text-fg-muted">{t.tags}</p>
						<div class="flex flex-wrap justify-end gap-1.5 sm:mt-2 sm:justify-start">
							{#if photo.keywords.length}
								{#each photo.keywords as kw (kw)}
									<span class="kicker rounded-full border border-hair px-3 py-1.5 text-fg-muted">
										#{kw}
									</span>
								{/each}
							{:else}
								<span class="text-sm text-fg/40">—</span>
							{/if}
						</div>
					</div>
				</div>
			</div>
		</div>

		<!-- ───────── Related ───────── -->
		<section class="mx-auto max-w-[1500px] px-6 pb-28 lg:px-10">
			<Reveal class="mb-8">
				<p data-reveal class="kicker text-safelight">{t.related}</p>
				<h2 data-reveal class="mt-4 font-display text-2xl font-light tracking-[-0.02em] text-fg">{photo.author}</h2>
			</Reveal>
			<Reveal stagger={0.08} class="grid grid-cols-2 gap-4 md:grid-cols-4">
				{#each related as p (p.id)}
					<div data-reveal>
						<PhotoCard photo={p} />
					</div>
				{/each}
			</Reveal>
		</section>

		<!-- ───────── Rel lisensi (mobile) ─────────
			Di layar sempit, harga dan tombolnya berada satu setengah layar di
			bawah tepi atas. Rel ini membawa keduanya kembali ke jempol, dan baru
			muncul setelah tombol asli lewat — jadi tidak pernah ada dua tombol
			yang sama sekaligus. Bahasanya lembar lisensi: garis rambut di atas,
			angka mono, satu tombol safelight yang sama bentuknya. -->
		<div
			inert={!ctaPassed}
			aria-hidden={!ctaPassed}
			class={`fixed inset-x-0 bottom-0 z-40 border-t border-hair bg-bg/95 backdrop-blur-md transition-transform duration-300 ease-out motion-reduce:transition-none sm:hidden ${
				ctaPassed ? "translate-y-0" : "translate-y-full"
			}`}
		>
			<div class="flex items-center gap-4 px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
				<div class="min-w-0">
					<p class="kicker truncate text-fg-muted">{license === "personal" ? t.personal : t.commercial}</p>
					<p class="mt-1 font-mono text-[0.95rem] tabular-nums text-fg">{fmtIDR(finalPrice)}</p>
				</div>
				<button
					type="button"
					onclick={handleAdd}
					class="ml-auto shrink-0 rounded-full bg-safelight px-6 py-3 text-sm font-medium text-ivory transition-transform active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-safelight"
				>
					{added ? `✓ ${t.added}` : t.addToCart}
				</button>
			</div>
		</div>
	</div>
{/if}

