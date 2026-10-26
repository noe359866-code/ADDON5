import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { diceSimilarity, titleSimilarity } from '../src/utils/text.js';
import {
  hostLabel,
  parseCardTitle,
  parsePlayerEmbeds,
  parseQuality,
  parseSearchResults,
  parseServerButtons,
  rankCandidates,
  scoreCandidate,
  searchTerms,
  selectEmbedsForResolution,
  shortLanguage
} from '../src/gnula.js';

/**
 * Los fixtures son copias recortadas del HTML real de octubre de 2026
 * (www2.gnula.one y ver.verteleseriesonline.com), no maquetas inventadas:
 * si la web cambia, estas pruebas fallan igual que el addon.
 */
const fixture = (name) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8');

test('parseCardTitle limpia el texto de la tarjeta y saca el año', () => {
  assert.deepEqual(
    parseCardTitle('Interstellar (2014)  - Ciencia ficción [HD]'),
    { title: 'Interstellar', year: '2014' }
  );
  assert.deepEqual(
    parseCardTitle('Ver Jay Kelly (2025) online'),
    { title: 'Jay Kelly', year: '2025' }
  );
  assert.deepEqual(
    parseCardTitle('Interestelar 2'),
    { title: 'Interestelar 2', year: '' }
  );
  assert.deepEqual(parseCardTitle(''), { title: '', year: '' });
});

test('la búsqueda real se lee entera y trae el título con su año', () => {
  const results = parseSearchResults(fixture('gnula-search.html'));

  // El buscador devuelve el resultado y, alrededor, el listado del tema.
  assert.equal(results.length, 45);
  const interestelar = results.find((item) => item.slug === 'interestelar');
  assert.ok(interestelar, 'la ficha de Interestelar está en los resultados');
  assert.equal(interestelar.title, 'Interestelar');
  assert.equal(interestelar.year, '2014');
  assert.equal(interestelar.url, 'https://www2.gnula.one/movie/interestelar/');
});

test('rankCandidates elige la ficha correcta entre el ruido del listado', () => {
  const results = parseSearchResults(fixture('gnula-search.html'));
  const ranked = rankCandidates(results, ['Interestelar', 'Interstellar'], '2014');

  assert.equal(ranked[0].slug, 'interestelar');
  assert.ok(ranked[0].score > 0.9, `score: ${ranked[0].score}`);
  // «Batman vs Superman» o «La batalla de los mundos» no pasan el corte.
  assert.equal(ranked.some((item) => item.slug === 'batman-vs-superman-el-origen-de-la-justicia'), false);
  const ruido = results.find((item) => item.slug === 'la-batalla-de-los-mundos');
  assert.ok(ruido, 'el listado lateral está en el fixture');
  assert.ok(scoreCandidate(ruido, ['Interestelar'], '2014') < 0.9);
});

test('la ficha de película da los tres reproductores reales con su idioma', () => {
  const embeds = parsePlayerEmbeds(fixture('gnula-movie.html'));
  const hosts = embeds.map((embed) => new URL(embed.url).hostname);

  assert.deepEqual(hosts, ['uqload.com', 'viewsb.com', 'jawcloud.co']);
  assert.ok(embeds.every((embed) => embed.language === 'Latino'));
  assert.ok(embeds.every((embed) => embed.url.startsWith('https://')));

  // El botón de Facebook y el póster nunca cuentan como reproductor.
  assert.equal(embeds.some((embed) => /facebook/i.test(embed.url)), false);
});

test('los reproductores salen ordenados: primero los que se resuelven solos', () => {
  const embeds = parsePlayerEmbeds(fixture('gnula-movie.html'));
  assert.equal(embeds[0].url.includes('uqload'), true, 'uqload va antes que el resto');
});

test('calidad de la ficha', () => {
  assert.equal(parseQuality(fixture('gnula-movie.html')), 'HD');
  assert.equal(parseQuality('<p>sin calidad</p>'), '');
});

test('la ficha de serie usa botones js-server, no iframes', () => {
  const html = fixture('series-episode.html');
  assert.equal(html.includes('<iframe'), false, 'la plantilla nueva no usa iframes');

  const embeds = parsePlayerEmbeds(html);
  assert.equal(embeds.length, 34);
  assert.deepEqual([...new Set(embeds.map((embed) => embed.language))], ['Latino', 'Castellano', 'Sub Español']);

  const languages = new Map(embeds.map((embed) => [embed.url, embed.language]));
  assert.equal(languages.get('https://streamtape.com/e/3obMlx69KkuXqx'), 'Latino');
  assert.equal(languages.get('https://mixdrop.ch/e/kn4868p8c31zvmw'), 'Castellano');
  assert.equal(languages.get('https://doodstream.com/e/sw7vtde38zqn'), 'Sub Español');
  assert.equal(languages.get('https://links.cuevana.ac/play/L0ZTVGJ2YVo0STBEYkYyaC9LY3FPZz09.html'), 'Latino');
});

test('parseServerButtons entiende los códigos de idioma de la barra', () => {
  const embeds = parseServerButtons(`
    <div class="seg">
      <button class="seg-btn js-lang" data-lang="lat">Latino <span class="seg-count">8</span></button>
      <button class="seg-btn js-lang" data-lang="cas">Castellano <span class="seg-count">18</span></button>
      <button class="seg-btn js-lang" data-lang="sub">Sub Español <span class="seg-count">8</span></button>
    </div>
    <div class="servers" data-lang="cas">
      <button class="server js-server" data-src="https://streamtape.com/e/uno"><span class="server-name">streamtape.com</span></button>
    </div>
    <div class="servers" data-lang="sub">
      <button class="server js-server" data-src="https://voe.sx/e/dos"><span class="server-name">voe.sx</span></button>
    </div>
  `);

  assert.deepEqual(embeds, [
    { url: 'https://streamtape.com/e/uno', language: 'Castellano', kind: 'iframe' },
    { url: 'https://voe.sx/e/dos', language: 'Sub Español', kind: 'iframe' }
  ]);
  assert.equal(shortLanguage('lat'), 'Latino');
  assert.equal(shortLanguage('desconocido', 'Latino'), 'Latino');
});

test('hostLabel da un nombre legible a los servidores reales', () => {
  assert.equal(hostLabel('https://voe.sx/e/abc'), 'Voe');
  assert.equal(hostLabel('https://uqload.com/embed-abc.html'), 'Uqload');
  assert.equal(hostLabel('https://viewsb.com/e/abc.html'), 'ViewSB');
  assert.equal(hostLabel('https://jawcloud.co/embed-abc.html'), 'Jawcloud');
  assert.equal(hostLabel('https://vidaraa.cc/e/abc'), 'Vidara');
  assert.equal(hostLabel('https://cdn.raro.tv/x.m3u8'), 'Cdn');
});

test('las tarjetas sin imagen también se leen', () => {
  const html = '<div id="content"><a href="https://www2.gnula.one/movie/duna-parte-dos/" title="Ver Duna: Parte dos (2024) online">Duna: Parte dos</a></div>';
  const results = parseSearchResults(html);
  assert.equal(results.length, 1);
  assert.equal(results[0].title, 'Duna: Parte dos');
  assert.equal(results[0].year, '2024');
});

test('la cola de resolución prueba servidores distintos antes de repetir host', () => {
  const embeds = [
    { url: 'https://voe.sx/e/1', language: 'Latino' },
    { url: 'https://voe.sx/e/2', language: 'Latino' },
    { url: 'https://voe.sx/e/3', language: 'Subtitulado' },
    { url: 'https://filemoon.sx/e/4', language: 'Latino' },
    { url: 'https://streamtape.com/e/5', language: 'Subtitulado' }
  ];

  const selected = selectEmbedsForResolution(embeds, 3);
  assert.deepEqual(selected.map((embed) => embed.url), [
    'https://voe.sx/e/1',
    'https://filemoon.sx/e/4',
    'https://streamtape.com/e/5'
  ]);

  const all = selectEmbedsForResolution(embeds, 10);
  assert.equal(all.length, 5);
  assert.deepEqual(all.slice(0, 3).map((embed) => embed.url), selected.map((embed) => embed.url));
});

test('un título traducido gana a uno que solo lo contiene', () => {
  const interestelar = titleSimilarity('Interstellar', 'Interestelar');
  const documental = titleSimilarity('Interstellar', 'La ciencia de Interstellar');
  const otra = titleSimilarity('Interstellar', 'Mi perro y yo');

  assert.ok(interestelar > 0.75, `Interestelar: ${interestelar}`);
  assert.ok(interestelar > documental, `${interestelar} > ${documental}`);
  assert.ok(documental > otra);
  assert.ok(diceSimilarity('Interestelar', 'Interstellar') > 0.7);
  assert.equal(titleSimilarity('Interstellar', 'Interstellar'), 1);
});

test('searchTerms prueba los títulos completos y luego variantes cortas', () => {
  assert.deepEqual(
    searchTerms(['Interestelar', 'Interstellar']),
    ['Interestelar', 'Interstellar', 'intere', 'inters']
  );

  // El buscador de las webs va por LIKE: «Interstellar» no encuentra
  // «Interestelar», pero el principio de la palabra sí. Va al final.
  assert.deepEqual(searchTerms(['Interstellar']), ['Interstellar', 'inters']);
  assert.deepEqual(searchTerms(['Loki']), ['Loki']);

  assert.deepEqual(
    searchTerms(['Spider-Man: No Way Home']),
    ['Spider-Man: No Way Home', 'Spider-Man', 'spider']
  );

  const terms = searchTerms(['The Lord of the Rings: The Fellowship of the Ring']);
  assert.equal(terms[0], 'The Lord of the Rings: The Fellowship of the Ring');
  assert.ok(terms.includes('The Lord of the Rings'));
  assert.ok(terms.includes('Lord of the Rings: The Fellowship of the Ring'));
  assert.ok(terms.length <= 4);
});
