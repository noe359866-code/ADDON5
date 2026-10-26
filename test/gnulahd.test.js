import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { config } from '../src/config.js';
import {
  findEpisode,
  findMovie,
  parseCards,
  parseEpisodes,
  parseGnrdConfig,
  parseInlinePlayers,
  parseQuickFacts,
  playersFromJson,
  readPlayers,
  xorDecrypt,
  xorEncrypt
} from '../src/gnulahd.js';
import { Deadline } from '../src/http.js';
import { pageCache } from '../src/cache.js';
import { installFetchStub, jsonRoute } from './helpers/stub-fetch.js';

const fixture = (name) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8');
const SITE = 'https://ww3.gnulahd.nu';
const KEY = 'Z251bGFmaWxtZXMxMjM0'; // "gnulafilms1234"

function playerPayload() {
  const json = JSON.stringify({
    langs: [
      { label: 'Latino', servers: [{ src: 'https://filemoon.sx/e/gn1' }, { src: '//streamtape.com/e/gn2' }] },
      { label: 'Subtitulado', servers: [{ src: 'https://they.tube/e/abc123' }, { src: 'https://x.tv/aviso.mp4' }] }
    ]
  });
  return { p: xorEncrypt(json, KEY) };
}

function routes() {
  return {
    [`${SITE}/?s=`]: fixture('gnulahd-search.html'),
    [`${SITE}/ver/interestelar/`]: fixture('gnulahd-movie.html'),
    [`${SITE}/ver/los-simpson/`]: fixture('gnulahd-series.html'),
    [`${SITE}/ver/los-simpson/2x01/`]: fixture('gnulahd-episode.html'),
    [`${SITE}/wp-json/gnrd/v1/player?id=48213`]: jsonRoute(playerPayload()),
    [`${SITE}/wp-json/gnrd/v1/player?id=9001`]: jsonRoute(playerPayload()),
    [`${SITE}/panel/the-tube-resolve.php?code=abc123`]: jsonRoute({ master: 'https://cdn.thetube.tv/hls/master.m3u8' })
  };
}

test('las tarjetas de búsqueda se leen con su año real (no el del póster)', () => {
  const cards = parseCards(fixture('gnulahd-search.html'));
  assert.deepEqual(cards.map((card) => card.slug), ['interestelar', 'la-ciencia-de-interstellar', 'mi-perro-y-yo']);
  assert.equal(cards[0].title, 'Interestelar');
  assert.equal(cards[0].year, '2014', 'el 2026 de /uploads/2026/07/ no es el año de la película');
  assert.equal(cards[0].url, `${SITE}/ver/interestelar/`);
  assert.equal(cards[2].year, '2026');
});

test('las filas de la ficha dan año y calidad', () => {
  const facts = parseQuickFacts(fixture('gnulahd-movie.html'));
  assert.equal(facts['año'], '2014');
  assert.equal(facts.calidad, 'HD');
  assert.equal(facts.audio, 'Latino · Subtitulado');
});

test('window.GNRD se lee con su clave', () => {
  const gnrd = parseGnrdConfig(fixture('gnulahd-movie.html'));
  assert.deepEqual(gnrd, { pid: '48213', tok: 'a1b2c3d4', key: KEY });
  assert.equal(parseGnrdConfig('<html></html>'), null);
});

test('el payload cifrado se descifra y se convierte en reproductores', () => {
  const encrypted = playerPayload().p;
  const decrypted = xorDecrypt(encrypted, KEY);
  assert.match(decrypted, /"langs"/);

  const embeds = playersFromJson(JSON.parse(decrypted));
  assert.deepEqual(embeds.map((embed) => embed.url), [
    'https://filemoon.sx/e/gn1',
    'https://streamtape.com/e/gn2',
    'https://they.tube/e/abc123'
  ]);
  assert.deepEqual(embeds.map((embed) => embed.language), ['Latino', 'Latino', 'Subtitulado']);
  // El relleno publicitario del sitio nunca se devuelve.
  assert.equal(embeds.some((embed) => embed.url.endsWith('aviso.mp4')), false);

  // Con basura o sin clave no hay JSON válido: readPlayers lo trata como fallo.
  assert.throws(() => JSON.parse(xorDecrypt('no-es-base64', KEY)));
  assert.equal(xorDecrypt(encrypted, ''), '');
});

test('la variante antigua con _gnpv_ep_langs también se lee', () => {
  const inline = parseInlinePlayers(fixture('gnulahd-inline.html'));
  assert.ok(Array.isArray(inline));

  const embeds = playersFromJson(inline);
  assert.deepEqual(embeds.map((embed) => embed.url), [
    'https://voe.sx/e/gnlegacy',
    'https://streamtape.com/e/gnlegacy2'
  ]);
  assert.deepEqual(embeds.map((embed) => embed.language), ['Latino', 'Castellano']);
  assert.equal(embeds.some((embed) => /youtube/.test(embed.url)), false);
});

test('los episodios se leen con temporada y número', () => {
  const episodes = parseEpisodes(fixture('gnulahd-series.html'));
  assert.deepEqual(episodes.map((episode) => `${episode.season}x${episode.episode}`), ['1x1', '1x2', '2x1']);
  assert.equal(episodes[2].url, `${SITE}/ver/los-simpson/2x01/`);
});

test('readPlayers resuelve la API cifrada y los enlaces they.tube', async (t) => {
  const stub = installFetchStub(routes());
  t.after(() => stub.restore());

  const embeds = await readPlayers(
    fixture('gnulahd-movie.html'),
    `${SITE}/ver/interestelar/`,
    { deadline: new Deadline(5000) }
  );

  assert.deepEqual(embeds.map((embed) => embed.url), [
    'https://filemoon.sx/e/gn1',
    'https://streamtape.com/e/gn2',
    'https://cdn.thetube.tv/hls/master.m3u8'
  ]);
  assert.equal(embeds[2].kind, 'direct');
  assert.equal(embeds[1].language, 'Latino');
  assert.equal(embeds[2].language, 'Subtitulado');

  // La API se pidió con el Referer de la ficha y la cabecera del sitio.
  const api = stub.calls.find((call) => call.url.includes('/wp-json/gnrd/v1/player'));
  assert.equal(api.headers.Referer, `${SITE}/ver/interestelar/`);
  assert.equal(api.headers['X-Requested-With'], 'gnrd');

  const panel = stub.calls.find((call) => call.url.includes('the-tube-resolve.php'));
  assert.match(panel.url, /t=eece56848d3929ee78f5fe8e3a62de2d/);
});

test('findMovie devuelve la ficha de GnulaHD con sus reproductores', async (t) => {
  pageCache.clear();
  const stub = installFetchStub(routes());
  t.after(() => stub.restore());

  const page = await findMovie(
    { titles: ['Interstellar', 'Interestelar'], year: '2014' },
    { deadline: new Deadline(5000) }
  );

  assert.equal(page.pageUrl, `${SITE}/ver/interestelar/`);
  assert.equal(page.title, 'Interestelar');
  assert.equal(page.year, '2014');
  assert.equal(page.quality, 'HD');
  assert.equal(page.embeds.length, 3);
});

test('findEpisode busca la serie y abre el capítulo exacto', async (t) => {
  pageCache.clear();
  const stub = installFetchStub(routes());
  t.after(() => stub.restore());

  const page = await findEpisode(
    { titles: ['Los Simpson', 'The Simpsons'], year: '1989', season: 2, episode: 1 },
    { deadline: new Deadline(5000) }
  );

  assert.equal(page.pageUrl, `${SITE}/ver/los-simpson/2x01/`);
  assert.match(page.title, /^Los Simpson 2x01$/);
  assert.equal(page.quality, 'HD');
  assert.equal(page.embeds.length, 3);
});

test('sin coincidencias devuelve null', async (t) => {
  pageCache.clear();
  const stub = installFetchStub({ [`${SITE}/?s=`]: '<div class="gnrd-grid"></div>' });
  t.after(() => stub.restore());

  const page = await findMovie(
    { titles: ['No Existe Esta Pelicula'], year: '1999' },
    { deadline: new Deadline(5000) }
  );
  assert.equal(page, null);
});

test('la base de GnulaHD es configurable', () => {
  assert.equal(config.gnulahdBaseUrl, 'https://ww3.gnulahd.nu');
});
