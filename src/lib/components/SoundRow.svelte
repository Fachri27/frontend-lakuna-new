<script lang="ts">
	/**
	 * Satu baris katalog Sounds — tiruan dekat baris rilis coveomusic.com: garis titik-titik, nomor monospace,
	 * sampul 72 px bersudut 12 px, judul kapital tebal, detail redup (tanggal · jenis · durasi panjang) di kanan,
	 * dan pil "Pratinjau" kaca buram. Arahkan kursor → baris sedikit membesar dengan latar abu lembut.
	 * Seluruh baris menuju halaman detail (lisensi & pembelian ada di sana); pil memutar pratinjau.
	 */
	import { i18n } from "$lib/i18n.svelte";
	import { player } from "$lib/soundPlayer.svelte";
	import type { Sound } from "$lib/data";
	import ApiImage from "./ApiImage.svelte";

	let { sound, queue, index }: { sound: Sound; queue: Sound[]; index?: number } = $props();

	const copy = {
		id: { preview: "Pratinjau", pause: "Jeda", music: "Musik", sfx: "Efek suara", min: "menit", sec: "detik" },
		en: { preview: "Preview", pause: "Pause", music: "Music", sfx: "Sound effect", min: "minutes", sec: "seconds" },
	};
	const lang = $derived(i18n.lang);
	const t = $derived(copy[lang]);

	const playingNow = $derived(player.isCurrent(sound.id) && player.playing);
	const title = $derived(sound.title[lang]);
	const no = $derived(index !== undefined ? String(index + 1).padStart(3, "0") : "");
	const date = $derived(
		sound.createdAt
			? new Intl.DateTimeFormat(lang === "en" ? "en-US" : "id-ID", { month: "long", year: "numeric" }).format(new Date(sound.createdAt))
			: ""
	);
	const kindText = $derived(`${sound.kind === "SFX" ? t.sfx : t.music}${sound.bpm ? `, ${sound.bpm} bpm` : ""}`);
	// "3 menit 19 detik" — durasi panjang seperti acuan.
	const longDur = $derived.by(() => {
		const s = Math.max(0, Math.round(sound.duration));
		const m = Math.floor(s / 60);
		return m ? `${m} ${t.min} ${s % 60} ${t.sec}` : `${s} ${t.sec}`;
	});
</script>

<li class="cv-release">
	<div class="cv-release__container">
		<a href={`/sounds/${sound.id}`} class="cv-release__link">
			<div class="cv-release__info">
				{#if no}<p class="cv-mono cv-muted cv-index">{no}</p>{/if}
				<span class="cv-art">
					{#if sound.cover}<ApiImage src={sound.cover} alt="" fill class="object-cover object-top" />{/if}
				</span>
				<div class="cv-release__title">
					<p class="cv-title">{title}</p>
					<div class="cv-details">
						{#if date}<p>{date}</p>{/if}
						<p>{kindText}</p>
						<p>{longDur}</p>
					</div>
				</div>
			</div>
		</a>
		<div class="cv-ctas">
			<button
				type="button"
				class="cv-btn"
				aria-pressed={playingNow}
				aria-label={`${playingNow ? t.pause : t.preview} — ${title}`}
				onclick={() => player.play(sound, queue)}
			>
				{#if playingNow}
					<svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2" /><path d="M10 8.5v7M14 8.5v7" stroke="currentColor" stroke-width="2" stroke-linecap="round" /></svg>
				{:else}
					<svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" /><polygon points="10 8 16 12 10 16 10 8" fill="currentColor" /></svg>
				{/if}
				{playingNow ? t.pause : t.preview}
			</button>
		</div>
	</div>
</li>

<style>
	.cv-release {
		position: relative;
		z-index: 2;
		list-style: none;
		border-bottom: 1px dotted rgba(0, 0, 0, 0.07);
		transform: scale(1);
		transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
		color: #1d1812;
		font-family: "Inter", sans-serif;
		font-size: 12px;
	}
	.cv-release:first-of-type {
		border-top: 1px dotted rgba(0, 0, 0, 0.07);
	}
	.cv-release::after {
		content: "";
		position: absolute;
		inset: 0;
		z-index: 1;
		border-radius: 8px;
		background: rgba(0, 0, 0, 0.05);
		opacity: 0;
		transform: scale(0.98);
		transition:
			transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1),
			opacity 0.2s ease;
		pointer-events: none;
	}
	.cv-release:hover {
		transform: scale(1.01);
		border-color: transparent;
	}
	.cv-release:hover::after {
		transform: scale(1);
		opacity: 1;
	}
	.cv-release__container {
		display: flex;
		align-items: center;
		gap: 2em;
		padding-right: 1em;
	}
	.cv-release__link {
		position: relative;
		z-index: 2;
		display: flex;
		flex: 1;
		min-width: 0;
		align-items: center;
		padding: 1em 0 1em 1em;
		color: inherit;
		text-decoration: none;
	}
	.cv-release__info {
		display: flex;
		flex: 1;
		min-width: 0;
		align-items: center;
		gap: 2em;
		font-weight: 600;
	}
	.cv-index {
		margin: 0;
		font-weight: 400;
		font-size: 0.85em;
	}
	.cv-art {
		position: relative;
		flex-shrink: 0;
		height: 72px;
		width: 72px;
		overflow: hidden;
		border-radius: 12px;
		background: #dddddd;
	}
	.cv-release__title {
		display: flex;
		flex: 1;
		min-width: 0;
		align-items: center;
		justify-content: space-between;
		gap: 2em;
	}
	.cv-title {
		margin: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		text-transform: uppercase;
	}
	.cv-details {
		display: flex;
		flex-shrink: 0;
		gap: 2em;
		color: #524d46;
		font-size: 0.85em;
		font-weight: 500;
		text-transform: uppercase;
		white-space: nowrap;
	}
	.cv-details p {
		margin: 0;
	}
	.cv-ctas {
		position: relative;
		z-index: 2;
	}
	.cv-btn {
		display: flex;
		align-items: center;
		gap: 2em;
		padding: 1em 1.8em;
		border: 0;
		border-radius: 40px;
		background: rgba(0, 0, 0, 0.1);
		color: #1d1812;
		font-family: ui-monospace, Menlo, Monaco, monospace;
		font-size: 0.85em;
		text-transform: uppercase;
		cursor: pointer;
		backdrop-filter: blur(10px);
		-webkit-backdrop-filter: blur(10px);
		transition: background 0.4s ease;
		white-space: nowrap;
	}
	.cv-btn:hover {
		background: rgba(0, 0, 0, 0.2);
	}
	.cv-btn[aria-pressed="true"] {
		background: #1d1812;
		color: #eeeeee;
	}
	.cv-btn svg {
		height: 18px;
		width: 18px;
	}
	.cv-btn:focus-visible,
	.cv-release__link:focus-visible {
		outline: 2px solid #1d1812;
		outline-offset: 2px;
	}
	.cv-mono {
		font-family: ui-monospace, Menlo, Monaco, monospace;
	}
	.cv-muted {
		color: #524d46;
	}

	@media (max-width: 768px) {
		.cv-release__container {
			gap: 1em;
		}
		.cv-index {
			display: none;
		}
		.cv-release__info {
			gap: 1em;
		}
		.cv-art {
			height: 48px;
			width: 48px;
			border-radius: 8px;
		}
		.cv-release__title {
			flex-direction: column;
			align-items: flex-start;
			justify-content: flex-start;
			gap: 0.5em;
		}
		.cv-title {
			max-width: 100%;
		}
		.cv-details p:nth-of-type(n + 2) {
			display: none;
		}
		.cv-btn svg {
			display: none;
		}
		.cv-btn {
			padding: 1em 1.4em;
		}
	}
</style>
