<script lang="ts">
	/**
	 * Pemutar halaman Sounds — tiruan dekat pemutar coveomusic.com.
	 *  - Layar lebar: kartu kaca di tengah bawah (maks 620 px) berisi "Memutar pratinjau" + judul, piringan vinyl
	 *    (warna dari sampul, label = sampul) yang menyembul setengah dan berputar, waktu monospace, tombol bulat
	 *    berisi batang equalizer (berubah jadi ikon putar/jeda saat disorot). Pratinjau habis → "Suka pratinjaunya?"
	 *    + tombol lisensi menggantikan piringan.
	 *  - Ponsel: panel hitam 450 px di bawah dengan piringan besar, tombol kaca, waktu, dan tombol tutup bulat.
	 * Tetap hidup saat pindah antara /sounds dan /sounds/<id> (dipasang di routes/sounds/+layout.svelte).
	 */
	import { fly } from "svelte/transition";
	import { cubicOut } from "svelte/easing";
	import { i18n } from "$lib/i18n.svelte";
	import { player } from "$lib/soundPlayer.svelte";
	import ApiImage from "./ApiImage.svelte";

	const copy = {
		id: { region: "Pemutar audio", now: "Memutar pratinjau", play: "Putar", pause: "Jeda", close: "Tutup pemutar", upsell: "Suka pratinjaunya?", license: "Lisensikan", error: "Pratinjau tak bisa diputar" },
		en: { region: "Audio player", now: "Previewing", play: "Play", pause: "Pause", close: "Close player", upsell: "Enjoyed the preview?", license: "License it", error: "Preview can't be played" },
	};
	const lang = $derived(i18n.lang);
	const t = $derived(copy[lang]);
	const track = $derived(player.track);
	const total = $derived(player.duration || track?.duration || 0);
	const clock = (sec: number) => {
		const s = Math.max(0, Math.round(sec || 0));
		return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
	};

	// Spasi = putar/jeda, Esc = tutup (di luar kolom isian & tombol yang sedang difokus).
	function onKey(e: KeyboardEvent) {
		if (!track) return;
		const el = e.target as HTMLElement | null;
		if (e.key === "Escape") {
			player.close();
			return;
		}
		if (e.code !== "Space" || e.repeat) return;
		if (el?.closest("input, textarea, select, button, a, [contenteditable=true]")) return;
		e.preventDefault();
		player.toggle();
	}

	// Tombol mengambang (bantuan, ke atas) naik melewati pemutar.
	$effect(() => {
		const up = !!track;
		const mobile = window.matchMedia("(max-width: 768px)").matches;
		const els = [...document.querySelectorAll<HTMLElement>(".fab-mengambang")];
		for (const el of els) el.style.bottom = up ? (mobile ? "29.5rem" : "9.5rem") : "";
		return () => {
			for (const el of els) el.style.bottom = "";
		};
	});
</script>

<svelte:window onkeydown={onKey} />

{#if track}
	<div
		role="region"
		aria-label={t.region}
		class="cv-player"
		class:cv-player--paused={!player.playing}
		class:cv-player--upsell={player.ended}
		class:cv-player--loading={player.loading && player.playing}
		data-no-hover-sound
		data-no-click-sound
		transition:fly={{ y: 160, duration: 900, easing: cubicOut }}
	>
		<div class="cv-player__contents">
			<div class="cv-player__info">
				<p class="cv-player__label">{player.error ? t.error : t.now}</p>
				<a href={`/sounds/${track.id}`} class="cv-player__title">{track.title[lang]}</a>
			</div>

			<!-- Piringan -->
			<div class="cv-record-wrap">
				<a href={`/sounds/${track.id}`} class="cv-record-offset" tabindex="-1" aria-hidden="true">
					<span class="cv-record">
						{#if track.cover}
							<span class="cv-record__colour"><ApiImage src={track.cover} alt="" fill class="object-cover" /></span>
						{/if}
						<span class="cv-record__art">
							{#if track.cover}<ApiImage src={track.cover} alt="" fill class="object-cover object-top" />{/if}
						</span>
					</span>
				</a>
			</div>

			<!-- Tawaran lisensi saat pratinjau habis -->
			<div class="cv-upsell">
				<p>{t.upsell}</p>
				<a href={`/sounds/${track.id}`} class="cv-upsell__btn">{t.license}</a>
			</div>

			<div class="cv-player__controls">
				<p class="cv-mono cv-player__time">{clock(player.time)} / {clock(total)}</p>
				<button type="button" class="cv-audio-btn" onclick={() => player.toggle()} aria-label={player.playing ? t.pause : t.play}>
					<span class="cv-bars" aria-hidden="true"><i></i><i></i><i></i><i></i></span>
					<span class="cv-state" aria-hidden="true">
						{#if player.playing}
							<svg width="12" height="12" viewBox="0 0 12 12"><rect x="2" y="1" width="3" height="10" rx="0.6" /><rect x="7" y="1" width="3" height="10" rx="0.6" /></svg>
						{:else}
							<svg width="12" height="12" viewBox="0 0 12 12"><path d="M3 1.4v9.2a.6.6 0 0 0 .9.5l7.3-4.6a.6.6 0 0 0 0-1L3.9.9a.6.6 0 0 0-.9.5z" /></svg>
						{/if}
					</span>
				</button>
			</div>

			<button type="button" class="cv-close" onclick={() => player.close()} aria-label={t.close}>
				<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
			</button>
		</div>
	</div>
{/if}

<style>
	.cv-player {
		--recordSize: 220px;
		position: fixed;
		bottom: 24px;
		left: 50%;
		z-index: 60;
		width: 90%;
		max-width: 620px;
		transform: translateX(-50%);
		color: #1d1812;
		font-family: "Inter", sans-serif;
		font-size: 12px;
	}
	.cv-mono {
		font-family: ui-monospace, Menlo, Monaco, monospace;
	}
	.cv-player__contents {
		position: relative;
		display: grid;
		grid-template-columns: 1fr 1fr 1fr;
		align-items: center;
		width: 100%;
		padding: 18px 24px;
		border-radius: 8px;
		background:
			linear-gradient(0deg, rgba(255, 255, 255, 0.7), rgba(255, 255, 255, 0.7)),
			rgba(0, 0, 0, 0.15);
		box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.07);
		backdrop-filter: blur(24px);
		-webkit-backdrop-filter: blur(24px);
	}
	.cv-player__info {
		display: flex;
		min-width: 0;
		flex-direction: column;
		align-items: flex-start;
		gap: 0.2em;
		padding-right: 1em;
	}
	.cv-player__label {
		margin: 0;
		color: #524d46;
		font-size: 0.8em;
		font-weight: 600;
		text-transform: uppercase;
	}
	.cv-player__title {
		max-width: 100%;
		overflow: hidden;
		color: inherit;
		font-size: 1em;
		font-weight: 600;
		text-decoration: none;
		text-overflow: ellipsis;
		text-transform: uppercase;
		white-space: nowrap;
	}

	/* ── Piringan ── */
	.cv-record-wrap {
		position: absolute;
		bottom: 0;
		left: 50%;
		width: var(--recordSize);
		height: calc(var(--recordSize) / 2);
		transform: translateX(-50%);
		clip-path: inset(-20% 0 0 0);
		pointer-events: none;
	}
	.cv-record-offset {
		position: relative;
		display: block;
		width: var(--recordSize);
		height: var(--recordSize);
		transform: translateY(0);
		transition: transform 0.4s ease;
		pointer-events: auto;
	}
	.cv-record-wrap:hover .cv-record-offset {
		transform: translateY(-10%);
	}
	.cv-player--upsell .cv-record-offset,
	.cv-player--loading .cv-record-offset {
		transform: translateY(50%);
	}
	.cv-record {
		position: relative;
		display: flex;
		width: 100%;
		aspect-ratio: 1;
		align-items: center;
		justify-content: center;
		overflow: hidden;
		border-radius: 100%;
		background: #1d1812;
		animation: cv-spin 3s linear infinite;
	}
	.cv-player--paused .cv-record {
		animation-play-state: paused;
	}
	.cv-record__colour {
		position: absolute;
		inset: -20%;
		filter: blur(14px) saturate(1.3);
		opacity: 0.85;
	}
	/* Alur piringan + kilau. */
	.cv-record::before {
		content: "";
		position: absolute;
		inset: 0;
		z-index: 1;
		border-radius: 100%;
		background-image: repeating-radial-gradient(circle at 50% 50%, rgba(0, 0, 0, 0.1) 0 1px, rgba(252, 255, 255, 0.08) 1px 2.2px);
	}
	.cv-record::after {
		content: "";
		position: absolute;
		inset: 0;
		z-index: 1;
		border-radius: 100%;
		background-image: linear-gradient(135deg, rgba(255, 255, 255, 0) 20%, rgba(255, 255, 255, 0.12) 50%, rgba(255, 255, 255, 0) 80%);
	}
	.cv-record__art {
		position: relative;
		z-index: 2;
		width: 35%;
		aspect-ratio: 1;
		overflow: hidden;
		border-radius: 100%;
		background: #eeeeee;
	}
	.cv-record__art::before,
	.cv-record__art::after {
		content: "";
		position: absolute;
		top: 50%;
		left: 50%;
		z-index: 3;
		aspect-ratio: 1;
		border-radius: 100%;
		transform: translate(-50%, -50%);
	}
	.cv-record__art::before {
		width: 30%;
		background-image: linear-gradient(180deg, rgba(255, 255, 255, 0.5) 0%, rgba(255, 255, 255, 0.2) 100%);
	}
	.cv-record__art::after {
		width: 25%;
		background: #eeeeee;
	}
	@keyframes cv-spin {
		to {
			transform: rotate(360deg);
		}
	}

	/* ── Tawaran lisensi ── */
	.cv-upsell {
		grid-column: 2;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.6em;
		visibility: hidden;
	}
	.cv-player--upsell .cv-upsell {
		visibility: visible;
	}
	.cv-upsell p {
		margin: 0;
	}
	.cv-upsell__btn {
		padding: 0.8em 1.6em;
		border-radius: 40px;
		background: #1d1812;
		color: #eeeeee;
		font-weight: 600;
		text-decoration: none;
		text-transform: uppercase;
	}

	/* ── Kontrol ── */
	.cv-player__controls {
		grid-column: 3;
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: 0.6em;
	}
	.cv-player__time {
		margin: 0;
		color: #524d46;
	}
	.cv-audio-btn {
		position: relative;
		display: flex;
		height: 36px;
		width: 36px;
		align-items: center;
		justify-content: space-between;
		padding: 10px;
		border: 1px solid rgba(0, 0, 0, 0.07);
		border-radius: 100%;
		background: none;
		color: #1d1812;
		cursor: pointer;
		transition: border-color 0.4s ease;
	}
	.cv-audio-btn:hover,
	.cv-audio-btn:focus-visible {
		border-color: #1d1812;
		outline: none;
	}
	.cv-player--upsell .cv-audio-btn {
		display: none;
	}
	.cv-bars {
		display: flex;
		height: 100%;
		width: 100%;
		align-items: center;
		justify-content: space-between;
		transition:
			transform 0.2s ease,
			opacity 0.2s ease;
	}
	.cv-bars i {
		width: 1.5px;
		height: 10%;
		background: currentColor;
		animation: cv-bars 0.5s ease infinite alternate;
	}
	.cv-bars i:nth-child(1) {
		--min: 5%;
		--max: 75%;
		animation-delay: -0.5s;
	}
	.cv-bars i:nth-child(2) {
		--min: 35%;
		--max: 100%;
	}
	.cv-bars i:nth-child(3) {
		--min: 15%;
		--max: 50%;
		animation-delay: -0.8s;
	}
	.cv-bars i:nth-child(4) {
		--min: 40%;
		--max: 90%;
		animation-delay: -0.3s;
	}
	@keyframes cv-bars {
		from {
			height: var(--min);
		}
		to {
			height: var(--max);
		}
	}
	.cv-player--paused .cv-bars i {
		animation: none;
		height: 10%;
	}
	.cv-state {
		position: absolute;
		top: 50%;
		left: 50%;
		display: grid;
		opacity: 0;
		transform: translate(-50%, -50%) scale(1.2);
		transition:
			transform 0.4s ease,
			opacity 0.4s ease;
	}
	.cv-state svg {
		fill: currentColor;
	}
	.cv-audio-btn:hover .cv-bars,
	.cv-audio-btn:focus-visible .cv-bars,
	.cv-player--paused .cv-bars {
		transform: scale(0.5);
		opacity: 0;
	}
	.cv-audio-btn:hover .cv-state,
	.cv-audio-btn:focus-visible .cv-state,
	.cv-player--paused .cv-state {
		transform: translate(-50%, -50%) scale(1);
		opacity: 1;
	}
	.cv-player--loading .cv-player__contents::after {
		content: "";
		position: absolute;
		top: 50%;
		left: 50%;
		height: 18px;
		width: 18px;
		border: 2px solid rgba(0, 0, 0, 0.2);
		border-top-color: #000;
		border-radius: 100%;
		transform: translate(-50%, -50%);
		animation: cv-load 1s linear infinite;
	}
	@keyframes cv-load {
		to {
			transform: translate(-50%, -50%) rotate(360deg);
		}
	}
	.cv-close {
		display: none;
	}

	/* ── Ponsel: panel hitam ── */
	@media (max-width: 768px) {
		.cv-player {
			left: 0;
			bottom: 0;
			width: 100%;
			max-width: none;
			height: 450px;
			transform: none;
			background: #000000;
			color: #ffffff;
			overflow: hidden;
		}
		/* Tepi bawah halaman yang membulat di atas panel (acuan). */
		.cv-player::after {
			content: "";
			position: absolute;
			top: 0;
			left: 0;
			height: 24px;
			width: 100%;
			border-radius: 0 0 24px 24px;
			background: #eeeeee;
		}
		.cv-player__contents {
			height: 100%;
			grid-template-columns: unset;
			grid-template-rows: auto 1fr auto auto;
			justify-items: center;
			gap: 0.6em;
			padding: 52px 24px 24px;
			border-radius: 0;
			background: none;
			box-shadow: none;
			backdrop-filter: none;
			-webkit-backdrop-filter: none;
		}
		.cv-player__info {
			align-items: center;
			padding: 0;
		}
		.cv-player__label {
			color: #747474;
		}
		.cv-player__title {
			color: #ffffff;
		}
		.cv-record-wrap {
			position: relative;
			bottom: auto;
			left: auto;
			height: var(--recordSize);
			transform: none;
			clip-path: none;
		}
		.cv-record {
			background: #101010;
		}
		.cv-record__art::before {
			background-image: linear-gradient(180deg, rgba(0, 0, 0, 0.5) 0%, rgba(0, 0, 0, 0.2) 100%);
		}
		.cv-record__art::after {
			background: #000000;
		}
		.cv-player--upsell .cv-record-offset,
		.cv-player--loading .cv-record-offset {
			transform: translateY(200%);
		}
		.cv-upsell {
			position: absolute;
			top: 52px;
			bottom: 120px;
			left: 0;
			right: 0;
			color: #ffffff;
		}
		.cv-upsell__btn {
			background: #ffffff;
			color: #1d1812;
		}
		.cv-player__controls {
			grid-column: auto;
			justify-content: center;
		}
		.cv-player__time {
			color: #747474;
		}
		.cv-audio-btn {
			position: absolute;
			top: 30%;
			right: 22%;
			border-color: rgba(255, 255, 255, 0.2);
			background: rgba(255, 255, 255, 0.2);
			color: #ffffff;
			backdrop-filter: blur(10px);
			-webkit-backdrop-filter: blur(10px);
		}
		.cv-close {
			display: grid;
			height: 42px;
			width: 42px;
			place-items: center;
			border: 1px solid rgba(255, 255, 255, 0.3);
			border-radius: 100%;
			background: none;
			color: #ffffff;
			cursor: pointer;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.cv-record,
		.cv-bars i {
			animation: none;
		}
	}
</style>
