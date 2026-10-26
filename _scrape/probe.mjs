import { request } from '../src/http.js';
import { parseSearchResults, rankCandidates } from '../src/gnula.js';
import { parseCards } from '../src/gnulahd.js';

async function probeGnula(url) {
  const r = await request(url, { timeoutMs: 20000 });
  const list = parseSearchResults(r.text);
  const ranked = rankCandidates(list, ['Interstellar'], '2014');
  console.log('[gnula]', r.status, r.text.length, url);
  console.log('   resultados:', list.length, list.slice(0, 6).map((x) => `${x.slug}:${x.year}`).join(', '));
  console.log('   ranked:', ranked.map((x) => `${x.slug}:${x.score.toFixed(2)}`).join(', ') || '(vacío)');
  const i = r.text.indexOf('Busqueda:');
  console.log('   Busqueda@', i, '| #tab:', (r.text.match(/id="tab\d+"/g) || []).length);
}

async function probeHd(url) {
  const r = await request(url, { timeoutMs: 20000 });
  const cards = parseCards(r.text);
  const ranked = rankCandidates(cards, ['Interstellar'], '2014');
  console.log('[gnulahd]', r.status, r.text.length, url);
  console.log('   tarjetas:', cards.length, cards.slice(0, 4).map((c) => `${c.slug}:${c.year}`).join(', '));
  console.log('   ranked:', ranked.map((c) => `${c.slug}:${c.score.toFixed(2)}`).join(', ') || '(vacío)');
}

await probeGnula('https://www2.gnula.one/?s=Interstellar');
await probeGnula('https://www2.gnula.one/?s=Interestelar');
await probeHd('https://ww3.gnulahd.nu/?s=Interstellar');
await probeHd('https://ww3.gnulahd.nu/?s=Interestelar');
