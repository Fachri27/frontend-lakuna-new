<script lang="ts">
	import { access } from "$lib/access.svelte";
	import { cvdMatrix } from "$lib/cvd";

	/**
	 * Hidden SVG holding the CVD correction filter. The feColorMatrix `values` are
	 * driven directly from the live access settings so they stay in sync on every
	 * render (no ref/effect to drift out of step). app.css applies
	 * `filter: url(#cvd-filter)` to img/video when [data-cvd] != "off".
	 */
	const values = $derived(cvdMatrix(access.settings.cvdType, access.settings.cvdStrength));
</script>

<svg aria-hidden="true" width="0" height="0" style="position: absolute; pointer-events: none">
	<defs>
		<filter id="cvd-filter" color-interpolation-filters="linearRGB">
			<feColorMatrix type="matrix" {values} />
		</filter>
	</defs>
</svg>