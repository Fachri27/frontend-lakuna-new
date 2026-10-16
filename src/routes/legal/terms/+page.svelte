<script lang="ts">
	// Alamat yang tercetak di sertifikat lisensi (…/legal/terms) → halaman Terms of Use.
	import { goto } from "$app/navigation";
	$effect(() => {
		void goto("/terms", { replaceState: true });
	});
</script>

<svelte:head><meta name="robots" content="noindex" /></svelte:head>
<div class="min-h-[60svh]"></div>
