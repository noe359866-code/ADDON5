import { request } from '../src/http.js';
import { parseCards } from '../src/gnulahd.js';

async function hd(url) {
  const r = await request(url, { timeoutMs: 25000 });
  const cards = parseCards(r.text);
  console.log('[gnulahd]', r.status, r.text.length, url, '| error:', r.error || '-');
  console.log('   tarjetas:', cards.length, cards.slice(0, 4).map((c) => `${c.slug}:${c.year}`).join(', '));
}

await hd('https://ww3.gnulahd.nu/?s=Interstellar');
await new Promise((r) => setTimeout(r, 2000));
await hd('https://ww3.gnulahd.nu/?s=interestelar');
await new Promise((r) => setTimeout(r, 2000));

// ¿Cinemeta devuelve el título localizado?
for (const extra of [{}, { 'Accept-Language': 'es-ES,es;q=0.9' }, { 'Accept-Language': 'es-MX' }]) {
  const r = await request('https://v3-cinemeta.strem.io/meta/movie/tt0816692.json', {
    timeoutMs: 15000, headers: extra
  });
  let name = '';
  try { name = JSON.parse(r.text).meta.name; } catch {}
  console.log('[cinemeta]', JSON.stringify(extra), '->', r.status, name);
}
const lang = await request('https://v3-cinemeta.strem.io/meta/movie/tt0816692.json?lang=es', { timeoutMs: 15000 });
let langName = '';
try { langName = JSON.parse(lang.text).meta.name; } catch {}
console.log('[cinemeta ?lang=es]', lang.status, langName);
