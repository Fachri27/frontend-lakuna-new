// Script dini Preloader (disuntik inline lewat {@html} sebelum halaman dilukis). Disimpan di sini, bukan di
// komponen, supaya svelte.config.js bisa menghitung hash CSP-nya dari teks yang persis sama — ubah teks ini
// bebas, hash ikut berubah otomatis.
export const EARLY_SCRIPT = `try{var n=performance.getEntriesByType&&performance.getEntriesByType("navigation")[0],t=n&&n.type||"navigate",i=false;try{i=!!document.referrer&&new URL(document.referrer).origin===location.origin}catch(e){}if(!matchMedia("(prefers-reduced-motion: reduce)").matches&&(t==="reload"||(t==="navigate"&&!i))){document.documentElement.dataset.preload="play"}}catch(e){}`;
