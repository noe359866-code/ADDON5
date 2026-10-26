import { request } from '../src/http.js';
import { parseCards } from '../src/gnulahd.js';
import { parseSearchResults } from '../src/gnula.js';

async function time(url, ms = 60000) {
  const t0 = Date.now();
  const r = await request(url, { timeoutMs: ms });
  const ms2 = Date.now() - t0;
  return { r, ms: ms2 };
}

// ¿Se puede buscar por IMDb?
for (const url of ['https://www2.gnula.one/?s=tt0816692', 'https://ww3.gnulahd.nu/?s=tt0816692']) {
  const { r, ms } = await time(url);
  const n = (r.text.match(/\/movie\/|gnrd-card/g) || []).length;
  console.log('[imdb-search]', r.status, r.text.length, ms + 'ms', url, '| coincidencias:', n);
  if (url.includes('gnulahd')) {
    console.log('   tarjetas:', parseCards(r.text).map((c) => c.slug).slice(0, 5).join(', '));
  } else {
    console.log('   resultados:', parseSearchResults(r.text).map((c) => c.slug).slice(0, 5).join(', '));
  }
  await new Promise((res) => setTimeout(res, 1500));
}

// Cuánto tarda de verdad la búsqueda de GnulaHD.
const hd = await time('https://ww3.gnulahd.nu/?s=interestelar');
console.log('[gnulahd-timing]', hd.r.status, hd.r.text.length, hd.ms + 'ms', '| error:', hd.r.error || '-');
console.log('   tarjetas:', parseCards(hd.r.text).map((c) => `${c.slug}:${c.year}`).join(', '));
