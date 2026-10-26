import { readFileSync } from 'node:fs';
import { parseSearchResults, rankCandidates } from '../src/gnula.js';
import { parseCards, parseDetailTitle, parseQuickFacts, parseEpisodes, parsePlayerConfig, parseResolvers, parseQuality } from '../src/gnulahd.js';

const file = (name) => readFileSync(new URL(`./${name}`, import.meta.url), 'utf8');
const line = (label, value) => console.log(`${label.padEnd(28)} ${value}`);

console.log('===== GNULA =====');
for (const [name, term] of [['gnula-search.html', 'Interestelar'], ['gnula-search-jk.html', 'Jay Kelly']]) {
  const html = file(name);
  const cards = parseSearchResults(html);
  const ranked = rankCandidates(cards, [term], '');
  console.log(`\n-- ${name} → ${cards.length} tarjetas, ${ranked.length} rankeadas`);
  for (const card of cards.slice(0, 4)) console.log(`   · ${card.title} (${card.year || 's/año'}) → ${card.slug}`);
  console.log('   top:', ranked.slice(0, 3).map((c) => `${c.title}=${c.score.toFixed(2)}`).join(' | ') || '(vacío)');
}

for (const name of ['gnula-movie-int.html', 'gnula-movie-jk.html']) {
  const html = file(name);
  const tabs = [...html.matchAll(/id=["']tab(\d+)["']/gi)].map((m) => m[1]);
  const iframes = [...html.matchAll(/<iframe\b[^>]*>/gi)].map((m) => m[0]);
  const langs = [...html.matchAll(/opci[oó]n\s*\d+[^<]{0,60}/gi)].map((m) => m[0]);
  const direct = [...html.matchAll(/https?:\/\/[^"'\s<>]+\.(?:m3u8|mp4)[^"'\s<>]*/gi)].map((m) => m[0]);
  console.log(`\n-- ${name}: tabs=${tabs.length} [${tabs.join(',')}] iframes=${iframes.length} hls/mp4=${direct.length}`);
  console.log('   opciones:', langs.slice(0, 6).join(' ; '));
  iframes.slice(0, 8).forEach((tag) => console.log('   iframe:', tag.slice(0, 150)));
}

console.log('\n===== GNULA HD =====');
const movie = file('gnulahd-movie.html');
line('h1 ficha', JSON.stringify(parseDetailTitle(movie)));
line('quick facts', JSON.stringify(parseQuickFacts(movie)));
line('calidad', parseQuality(movie));
line('episodios', parseEpisodes(movie).length);
line('player config', JSON.stringify(parsePlayerConfig(movie) && { pid: parsePlayerConfig(movie).pid, tok: String(parsePlayerConfig(movie).tok).slice(0, 12) + '…', key: [...parsePlayerConfig(movie).key] }));
line('resolvers', JSON.stringify(parseResolvers(movie)));
line('_gnrdPid en crudo', (movie.match(/_gnrdPid\s*=\s*[^;]{0,40}/) || [''])[0]);
line('gnrdUnpack key', (movie.match(/gnrdUnpack[\s\S]{0,600}?\bk\s*=\s*\[[^\]]*\]/) || [''])[0].replace(/\s+/g, ' ').slice(0, 120));

const serie = file('gnulahd-serie.html');
const eps = parseEpisodes(serie);
console.log(`\n-- gnulahd-serie.html: ${eps.length} episodios`);
eps.slice(0, 5).forEach((e) => console.log(`   · ${e.season}x${e.episode} ${e.label} → ${e.url} (pid ${e.playerId || '-'})`));

const ep = file('gnulahd-episode.html');
line('episodio h1', JSON.stringify(parseDetailTitle(ep)));
line('episodio pid', JSON.stringify(parsePlayerConfig(ep) && parsePlayerConfig(ep).pid));
line('episodio calidad', parseQuality(ep));

const search = file('gnulahd-search.html');
const cards = parseCards(search);
console.log(`\n-- gnulahd-search.html: ${cards.length} tarjetas gnrd-card`);
cards.slice(0, 6).forEach((c) => console.log(`   · ${c.title} (${c.year}) [${c.type}] → ${c.slug}`));
