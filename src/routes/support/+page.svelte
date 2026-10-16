<script lang="ts">
	// Alamat yang tercetak di sertifikat lisensi (…/support) → halaman Customer service.
	import { goto } from "$app/navigation";
	$effect(() => {
		void goto("/customer-service", { replaceState: true });
	});
</script>

<svelte:head><meta name="robots" content="noindex" /></svelte:head>
<div class="min-h-[60svh]"></div>
