<script lang="ts">
	import { page } from "$app/state";
	import PaymentResult from "$lib/components/PaymentResult.svelte";

	const sp = page.url.searchParams;
	// order_id di-embed backend saat create invoice (ORDER-<uuid>) — sumber utama.
	// DOKU mengembalikan ke sini dengan `order_id` (lihat callback_url di API); Xendit lama: `external_id`.
	// CATATAN KEAMANAN: hanya orderId yang diambil dari query param. Param
	// status / transaction_status sengaja DIABAIKAN — status LUNAS hanya boleh
	// berasal dari backend `/api/payment/check/{orderId}` (lihat PaymentResult).
	const orderId = sp.get("order_id") ?? sp.get("external_id") ?? "";
</script>

<svelte:head>
	<title>Pembayaran gagal</title>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<PaymentResult {orderId} />
