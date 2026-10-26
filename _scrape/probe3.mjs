import { request } from '../src/http.js';
import { parseSearchResults, rankCandidates } from '../src/gnula.js';
import { parseCards, cardsFromRest } from '../src/gnulahd.js';

const probe = async (label, url, headers = {}) => {
  const r = await request(url, { headers });
  console.log(`${label}\n   ${r.status} ${r.text.length} B err=${r.error || '-'}`);
  return r;
};

// 1) ¿La búsqueda de GnulaHD distingue mayúsculas?
const a = await probe('gnulahd ?s=Interstellar', 'https://ww3.gnulahd.nu/?s=Interstellar');
if (a.ok) console.log('   cards:', parseCards(a.text).slice(0, 4).map((c) => `${c.slug}(${c.year})`).join(' , '));
const b = await probe('gnulahd ?s=interstellar', 'https://ww3.gnulahd.nu/?s=interstellar');
if (b.ok) console.log('   cards:', parseCards(b.text).slice(0, 4).map((c) => `${c.slug}(${c.year})`).join(' , '));

// 2) REST de GnulaHD (la alternativa cuando ?s= se cuelga)
const c = await probe('gnulahd REST', 'https://ww3.gnulahd.nu/wp-json/wp/v2/search?search=Interstellar&per_page=10', { Accept: 'application/json' });
if (c.ok) console.log('   cards:', cardsFromRest(JSON.parse(c.text)).map((x) => x.slug).join(' , '));

// 3) ¿Cinemeta traduce el nombre?
const d = await probe('cinemeta es-ES', 'https://v3-cinemeta.strem.io/meta/movie/tt0816692.json', { 'Accept-Language': 'es-ES,es;q=0.9' });
if (d.ok) console.log('   name:', JSON.parse(d.text).meta.name);
const e = await probe('cinemeta ?lang=es', 'https://v3-cinemeta.strem.io/meta/movie/tt0816692.json?lang=es');
if (e.ok) console.log('   name:', JSON.parse(e.text).meta.name);

// 4) ¿Y el buscador de Gnula con la ficha en español?
const f = await probe('gnula ?s=Interestelar', 'https://www2.gnula.one/?s=Interestelar');
if (f.ok) {
  const cards = parseSearchResults(f.text);
  console.log('   cards:', cards.length, '| ranked:', rankCandidates(cards, ['Interstellar'], '2014').slice(0, 3).map((x) => `${x.slug}=${x.score.toFixed(2)}`).join(' , '));
}
