<script lang="ts">
	/**
	 * Pengganti next/image — di Svelte Kit semua gambar dirender sebagai <img>
	 * biasa (tidak ada image optimizer), jadi wrapper ini tinggal memusatkan
	 * perilaku lazy/eager dan mode fill (absolute, object-fit: cover).
	 */
	type ApiImageProps = {
		src: string;
		alt?: string;
		fill?: boolean;
		eager?: boolean;
		class?: string;
		style?: string;
		width?: number | string;
		height?: number | string;
		/** Dipanggil saat gambar selesai dimuat ATAU gagal (agar pemanggil tidak menunggu selamanya). */
		onload?: () => void;
		onerror?: () => void;
	};

	let {
		src,
		alt = "",
		fill = false,
		eager = false,
		class: cls = "",
		style = "",
		width,
		height,
		onload,
		onerror
	}: ApiImageProps = $props();

	let imgEl = $state<HTMLImageElement>();

	// Gambar dari cache bisa sudah complete sebelum handler onload terpasang
	// (tidak ada event load kedua) — laporkan langsung supaya tidak digantung.
	$effect(() => {
		const el = imgEl;
		if (el && el.complete && el.naturalWidth > 0) onload?.();
	});
</script>

<img
	bind:this={imgEl}
	{src}
	{alt}
	loading={eager ? "eager" : "lazy"}
	decoding="async"
	draggable={false}
	{width}
	{height}
	onload={() => onload?.()}
	onerror={() => onerror?.()}
	class={fill ? `absolute inset-0 h-full w-full ${cls}` : cls}
	style={fill ? `object-fit: cover;${style}` : style}
/>