import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { config } from '../src/config.js';
import {
  decodePlayerPayload,
  findEpisode,
  findMovie,
  parseCards,
  parseEpisodes,
  parsePlayerConfig,
  parseQuickFacts,
  parseResolvers,
  playersFromJson,
  readPlayers,
  vidaraResolveUrl,
  xorDecrypt,
  xorEncrypt
} from '../src/gnulahd.js';
import { Deadline } from '../src/http.js';
import { pageCache } from '../src/cache.js';
import { installFetchStub, jsonRoute } from './helpers/stub-fetch.js';

/**
 * Fixtures recortados del HTML real de ww3.gnulahd.nu (octubre de 2026):
 * la ficha trae `_gnrdPid`/`_gnrdTok` y el desempaquetador con su clave, no
 * el `window.GNRD` de las versiones anteriores.
 */
const fixture = (name) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8');
const SITE = 'https://ww3.gnulahd.nu';
const KEY = Buffer.from([103, 78, 55, 100]); // "gN7d", la de gnrdUnpack

function routes() {
  return {
    [`${SITE}/?s=`]: fixture('gnulahd-search.html'),
    [`${SITE}/ver/interestelar/`]: fixture('gnulahd-movie.html'),
    [`${SITE}/ver/el-encargado/`]: fixture('gnulahd-series.html'),
    [`${SITE}/el-encargado-4x07/`]: fixture('gnulahd-episode.html'),
    [`${SITE}/wp-json/gnrd/v1/player?id=206802`]: jsonRoute(JSON.parse(fixture('gnulahd-player-encrypted.json'))),
    [`${SITE}/wp-json/gnrd/v1/player?id=513823`]: jsonRoute(JSON.parse(fixture('gnulahd-player-encrypted.json')))
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

test('las filas de la ficha dan año y calidad (clases qf-*, no gnrd-qf-*)', () => {
  const facts = parseQuickFacts(fixture('gnulahd-movie.html'));
  assert.equal(facts['año'], '2014');
  assert.equal(facts.calidad, 'HD');
  assert.equal(facts.audio, 'Latino · Subtitulado');
});

test('la configuración del reproductor sale de _gnrdPid/_gnrdTok y de gnrdUnpack', () => {
  const player = parsePlayerConfig(fixture('gnulahd-movie.html'));
  assert.equal(player.pid, '206802');
  assert.equal(player.tok, 'd234878290579f4c1b79aaf5605e3f12');
  assert.deepEqual(player.key, KEY);

  assert.equal(parsePlayerConfig('<html></html>'), null);
});

test('el payload cifrado real se descifra con la clave de la página', () => {
  const encrypted = JSON.parse(fixture('gnulahd-player-encrypted.json')).p;
  const key = parsePlayerConfig(fixture('gnulahd-movie.html')).key;
  const data = decodePlayerPayload(encrypted, key);

  assert.equal(data.t, 'Interestelar');
  assert.deepEqual(data.langs.map((lang) => lang.label), ['Latino', 'Subtitulado']);
  assert.equal(data.langs[0].servers.length, 4);
  assert.equal(data.langs[0].servers[0].src, 'https://vidaraa.cc/e/3RSpbzKZgfoy8');

  // Con la clave equivocada no se inventa nada.
  assert.equal(decodePlayerPayload(encrypted, Buffer.from('nada')), null);
  assert.equal(decodePlayerPayload('', key), null);
});

test('xorEncrypt/xorDecrypt son simétricos con clave de texto y de bytes', () => {
  const plain = JSON.stringify({ langs: [{ label: 'Latino', servers: [{ src: 'https://voe.sx/e/x' }] }] });
  assert.equal(xorDecrypt(xorEncrypt(plain, 'gN7d'), 'gN7d'), plain);
  assert.equal(xorDecrypt(xorEncrypt(plain, KEY), KEY), plain);
});

test('los resolvedores del sitio se leen con el token de la ficha', () => {
  const resolvers = parseResolvers(fixture('gnulahd-movie.html'));
  assert.equal(resolvers.vidara.path, '/panel/vidara-resolve.php');
  assert.equal(resolvers.vidara.token, '0acdc764c75b0f86e4c78b8cd8a4d11f');
  assert.equal(resolvers.vidara.on, true);
  assert.equal(resolvers.theTube.path, '/panel/the-tube-resolve.php?code=');
  assert.equal(resolvers.theTube.token, '21899757d131f11b0525bb26cd3f88a3');

  // Cada ficha trae su propio token: el del episodio no es el de la película.
  const episode = parseResolvers(fixture('gnulahd-episode.html'));
  assert.notEqual(episode.vidara.token, resolvers.vidara.token);
});

test('los enlaces de vidara se piden al resolvedor del sitio, no a vidara', () => {
  const resolvers = parseResolvers(fixture('gnulahd-movie.html'));
  const url = vidaraResolveUrl('https://vidaraa.cc/e/3RSpbzKZgfoy8', { resolvers });

  assert.equal(
    url,
    `${SITE}/panel/vidara-resolve.php?pl=1&code=3RSpbzKZgfoy8&host=vidaraa.cc&t=0acdc764c75b0f86e4c78b8cd8a4d11f`
  );
  assert.equal(vidaraResolveUrl('https://voe.sx/e/abc', { resolvers }), '');
  assert.equal(vidaraResolveUrl('https://vidaraa.cc/e/abc', { resolvers: null }), '');
});

test('el payload real se convierte en reproductores con su idioma', () => {
  const resolvers = parseResolvers(fixture('gnulahd-movie.html'));
  const data = JSON.parse(fixture('gnulahd-player.json'));
  const embeds = playersFromJson(data, { resolvers });

  assert.equal(embeds.length, 8);
  assert.equal(embeds[0].language, 'Latino');
  assert.match(embeds[0].url, /\/panel\/vidara-resolve\.php\?pl=1&code=3RSpbzKZgfoy8&host=vidaraa\.cc&t=/);
  assert.equal(embeds[1].url, 'https://byse.sx/e/ltd6r245u81w');
  assert.equal(embeds[2].url, 'https://voe.sx/e/rvnyarijf6gm');
  assert.equal(embeds[3].url, 'https://savefiles.com/e/j1zo9m2tgvcs');
  assert.equal(embeds[4].language, 'Subtitulado');
  assert.match(embeds[4].url, /code=dbSrlVQkCYGa6&host=vidara\.to/);

  // Los enlaces de descarga (dl) no son streams: no entran.
  assert.equal(embeds.some((embed) => /1fichier|megaup|gofile|multiup/i.test(embed.url)), false);
});

test('los episodios se leen con su temporada, su capítulo y su token', () => {
  const episodes = parseEpisodes(fixture('gnulahd-series.html'));
  const first = episodes[0];

  assert.equal(first.season, 4);
  assert.equal(first.episode, 7);
  assert.equal(first.url, `${SITE}/el-encargado-4x07/`);
  assert.equal(first.label, '4x07');
  assert.equal(first.playerId, '513823');
  assert.equal(first.playerToken, 'c7215f939c3e1b643a73942d296ce518');
});

test('readPlayers llama a la API gnrd y devuelve los embeds', async (t) => {
  const stub = installFetchStub(routes());
  t.after(() => stub.restore());

  const ctx = { deadline: new Deadline(5000) };
  const html = fixture('gnulahd-movie.html');
  const embeds = await readPlayers(html, `${SITE}/ver/interestelar/`, ctx);

  assert.equal(embeds.length, 8);
  assert.ok(embeds.every((embed) => embed.url.startsWith('http')));
  const api = stub.calls.find((call) => call.url.includes('/wp-json/gnrd/v1/player?id=206802'));
  assert.ok(api, 'se pidió la API con el id de la ficha');
  assert.equal(api.headers.Referer, `${SITE}/ver/interestelar/`);
});

test('findMovie resuelve la película completa desde la búsqueda', async (t) => {
  pageCache.clear();
  const stub = installFetchStub(routes());
  t.after(() => stub.restore());

  const page = await findMovie(
    { titles: ['Interestelar', 'Interstellar'], year: '2014' },
    { deadline: new Deadline(8000) }
  );

  assert.equal(page.pageUrl, `${SITE}/ver/interestelar/`);
  assert.equal(page.title, 'Interestelar');
  assert.equal(page.year, '2014');
  assert.equal(page.quality, 'HD');
  assert.equal(page.embeds.length, 8);
});

test('findEpisode baja la ficha de la serie y el capítulo pedido', async (t) => {
  pageCache.clear();
  const stub = installFetchStub(routes());
  t.after(() => stub.restore());

  const page = await findEpisode(
    { titles: ['El encargado'], year: '', season: 4, episode: 7 },
    { deadline: new Deadline(8000) }
  );

  assert.equal(page.pageUrl, `${SITE}/el-encargado-4x07/`);
  assert.match(page.title, /4x07/);
  assert.ok(page.embeds.length > 0);
  assert.ok(stub.calls.some((call) => call.url === `${SITE}/el-encargado-4x07/`));
});

test('sin la API el scraper no inventa reproductores', async (t) => {
  pageCache.clear();
  const stub = installFetchStub({
    [`${SITE}/?s=`]: fixture('gnulahd-search.html'),
    [`${SITE}/ver/interestelar/`]: '<div class="gnrd-fi-body"><h1 class="gnrd-fi-title">Interestelar</h1></div>'
  });
  t.after(() => stub.restore());

  const page = await findMovie(
    { titles: ['Interestelar'], year: '2014' },
    { deadline: new Deadline(5000) }
  );
  // Devuelve la ficha (para el diagnóstico) pero sin ningún reproductor.
  assert.equal(page.embeds.length, 0);
  assert.equal(config.gnulahdBaseUrl, SITE);
});
