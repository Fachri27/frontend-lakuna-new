<script lang="ts">
	import { page } from "$app/state";
	import PaymentResult from "$lib/components/PaymentResult.svelte";

	const sp = page.url.searchParams;
	// order_id di-embed backend saat create invoice (ORDER-<uuid>) — sumber utama.
	// Fallback: Xendit `external_id` atau Midtrans `order_id`.
	// CATATAN KEAMANAN: hanya orderId yang diambil dari query param. Param
	// status / transaction_status sengaja DIABAIKAN — status LUNAS hanya boleh
	// berasal dari backend `/api/payment/check/{orderId}` (lihat PaymentResult).
	const orderId = sp.get("order_id") ?? sp.get("external_id") ?? "";
</script>

<svelte:head>
	<title>Pembayaran selesai</title>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<PaymentResult {orderId} />
