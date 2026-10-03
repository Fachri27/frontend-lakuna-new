<script lang="ts">
	import { page } from "$app/state";
	import PayPage from "$lib/components/PayPage.svelte";

	// Halaman bayar milik Lakuna (Midtrans Core API) — pengganti redirect ke
	// halaman Snap. orderId = order_id dasar (ORDER-/SUB-/STD-/INST-).
	const orderId = $derived(page.params.orderId ?? "");
</script>

<svelte:head>
	<title>Payment · Lakuna</title>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

{#key orderId}
	<PayPage {orderId} />
{/key}
