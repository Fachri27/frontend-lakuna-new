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
	};

	let {
		src,
		alt = "",
		fill = false,
		eager = false,
		class: cls = "",
		style = "",
		width,
		height
	}: ApiImageProps = $props();
</script>

<img
	{src}
	{alt}
	loading={eager ? "eager" : "lazy"}
	decoding="async"
	{width}
	{height}
	class={fill ? `absolute inset-0 h-full w-full ${cls}` : cls}
	style={fill ? `object-fit: cover;${style}` : style}
/>