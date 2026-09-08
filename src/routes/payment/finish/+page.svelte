<script lang="ts">
	import { page } from "$app/state";
	import PaymentResult from "$lib/components/PaymentResult.svelte";

	const sp = page.url.searchParams;
	// order_id di-embed backend saat create invoice (ORDER-<uuid>) — sumber utama.
	// Fallback: Xendit `external_id` atau Midtrans `order_id`.
	const orderId = sp.get("order_id") ?? sp.get("external_id") ?? "";
	const transactionStatus = sp.get("status") ?? sp.get("transaction_status") ?? undefined;
</script>

<svelte:head>
	<title>Pembayaran selesai</title>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<PaymentResult {orderId} {transactionStatus} />
