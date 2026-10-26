import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  contentRegion,
  hostLabel,
  parseCardTitle,
  parsePlayerEmbeds,
  parseQuality,
  parseSearchResults,
  rankCandidates,
  scoreCandidate,
  selectEmbedsForResolution
} from '../src/gnula.js';

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

test('los resultados de búsqueda ignoran portada y comentarios', () => {
  const html = fixture('gnula-search.html');
  const region = contentRegion(html);
  const results = parseSearchResults(region);

  assert.deepEqual(results.map((item) => item.slug), [
    'interstellar',
    'interstellar-el-otro',
    'interestelar-2'
  ]);
  assert.equal(results[0].title, 'Interstellar');
  assert.equal(results[0].year, '2014');
  assert.equal(results[0].url, 'https://www2.gnula.one/movie/interstellar/');
  // La portada sigue en el HTML completo, pero no en la región de resultados.
  assert.equal(parseSearchResults(html).some((item) => item.slug === 'jay-kelly'), true);
  assert.equal(results.some((item) => item.slug === 'jay-kelly'), false);
});

test('rankCandidates elige la ficha correcta y descarta parecidos', () => {
  const results = parseSearchResults(contentRegion(fixture('gnula-search.html')));
  const ranked = rankCandidates(results, ['Interstellar'], '2014');

  assert.equal(ranked[0].slug, 'interstellar');
  assert.ok(ranked[0].score > 0.9);
  assert.ok(scoreCandidate(results[1], ['Interstellar'], '2014') < scoreCandidate(results[0], ['Interstellar'], '2014'));
});

test('la ficha de película da reproductores con su idioma', () => {
  const html = fixture('gnula-movie.html');
  const embeds = parsePlayerEmbeds(html);

  const byHost = new Map(embeds.map((embed) => [new URL(embed.url).hostname + new URL(embed.url).pathname, embed]));

  assert.equal(embeds.length, 6);
  assert.equal(byHost.get('filemoon.sx/e/abc123').language, 'Latino');
  assert.equal(byHost.get('voe.sx/e/def456').language, 'Latino');
  assert.equal(byHost.get('cdn.example.org/interstellar-2014.mp4').language, 'Latino');
  assert.equal(byHost.get('streamtape.com/e/ghi789').language, 'Subtitulado');
  assert.equal(byHost.get('doodstream.com/e/jkl012').language, 'Subtitulado');
  assert.equal(byHost.get('player.cuevana.ac/e/pqr345').language, 'Castellano');

  // El tráiler de YouTube y los banners de publicidad nunca son opciones.
  assert.equal(embeds.some((embed) => /youtube/i.test(embed.url)), false);
  assert.equal(embeds.some((embed) => /ads\.example\.net/.test(embed.url)), false);
});

test('los reproductores directos van antes que los agregadores', () => {
  const embeds = parsePlayerEmbeds(fixture('gnula-movie.html'));
  const cuevanaIndex = embeds.findIndex((embed) => embed.url.includes('cuevana'));
  const voeIndex = embeds.findIndex((embed) => embed.url.includes('voe.sx'));
  assert.ok(voeIndex < cuevanaIndex);
});

test('calidad de la ficha', () => {
  assert.equal(parseQuality(fixture('gnula-movie.html')), 'HD');
  assert.equal(parseQuality('<p>sin calidad</p>'), '');
});

test('el episodio de serie asigna los idiomas por orden de grupo', () => {
  const embeds = parsePlayerEmbeds(fixture('series-episode.html'));
  assert.equal(embeds.length, 4);
  const languageOf = (path) => embeds.find((embed) => embed.url.includes(path))?.language;
  assert.equal(languageOf('links.cuevana.ac/e/cue1'), 'Latino');
  assert.equal(languageOf('streamtape.com/e/st2'), 'Latino');
  assert.equal(languageOf('voe.sx/e/voe3'), 'Castellano');
  assert.equal(languageOf('filemoon.sx/e/fm4'), 'Sub Español');
});

test('hostLabel da un nombre legible al servidor', () => {
  assert.equal(hostLabel('https://voe.sx/e/abc'), 'Voe');
  assert.equal(hostLabel('https://player.cuevana.ac/e/abc'), 'Cuevana');
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
