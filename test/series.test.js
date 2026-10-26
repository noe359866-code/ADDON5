import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { collectStreams } from '../src/addon.js';
import { decodeParam } from '../src/streams.js';
import { pageCache } from '../src/cache.js';
import { installFetchStub, jsonRoute } from './helpers/stub-fetch.js';

/**
 * Fixtures reales de ver.verteleseriesonline.com (octubre de 2026). El
 * buscador del sitio contesta 403 con un desafío de Cloudflare, así que el
 * camino normal es: búsqueda bloqueada → slug directo → ficha → episodio.
 */
const fixture = (name) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8');
const SITE = 'https://ver.verteleseriesonline.com';

function seriesRoutes() {
  return {
    'https://v3-cinemeta.strem.io/meta/series/tt9140554.json': jsonRoute(JSON.parse(fixture('cinemeta-series.json'))),
    [`${SITE}/?s=`]: fixture('series-search.html'),
    [`${SITE}/serie/loki/`]: fixture('series-page.html'),
    [`${SITE}/loki-2x01-hd-online-temporada-2-episodio-1/`]: fixture('series-episode.html'),

    // Los dos primeros servidores que la cola abre de verdad.
    'https://streamtape.com/e/3obMlx69KkuXqx': fixture('streamtape.html'),
    'https://doodstream.com/e/tdeyzbfuc2zn': fixture('doodstream.html'),
    'https://doodstream.com/pass_md5/': 'https://dood.pm/landing123',
    'https://streamtape.com/get_video': { body: '', headers: { 'content-type': 'video/mp4' } },
    'https://dood.pm/landing123': { body: '', headers: { 'content-type': 'video/mp4' } }
  };
}

function mediaOf(streamUrl) {
  return decodeParam(new URL(streamUrl).searchParams.get('q') || new URL(streamUrl).searchParams.get('u'));
}

test('una serie se resuelve aunque el buscador esté bloqueado por Cloudflare', async (t) => {
  pageCache.clear();
  const stub = installFetchStub(seriesRoutes());
  t.after(() => stub.restore());

  const { streams, trace } = await collectStreams({
    type: 'series',
    id: 'tt9140554:2:1',
    baseUrl: 'https://addon.example.com'
  });

  assert.equal(trace.meta.name, 'Loki');
  assert.equal(trace.meta.season, 2);
  assert.equal(trace.meta.episode, 1);
  assert.match(trace.page.url, /loki-2x01-hd-online-temporada-2-episodio-1/);

  // La ficha del episodio es la plantilla nueva: 34 botones js-server.
  const gnula = trace.sources.find((source) => source.id === 'gnula');
  assert.equal(gnula.embeds, 34);
  assert.equal(gnula.error, '');

  assert.ok(streams.length >= 2, `streams: ${streams.length}`);
  assert.ok(streams.every((stream) => stream.name.startsWith('Gnula ·')));

  const languages = new Set(streams.map((stream) => stream.name));
  assert.ok([...languages].some((name) => name === 'Gnula · Latino'));
});

test('los streams del episodio conservan el idioma de su pestaña', async (t) => {
  pageCache.clear();
  const stub = installFetchStub(seriesRoutes());
  t.after(() => stub.restore());

  const { streams } = await collectStreams({
    type: 'series',
    id: 'tt9140554:2:1',
    baseUrl: 'https://addon.example.com'
  });

  const streamtape = streams.find((stream) => mediaOf(stream.url).startsWith('https://streamtape.com/get_video'));
  assert.ok(streamtape, 'el servidor de la pestaña Latino se resuelve');
  assert.equal(streamtape.name, 'Gnula · Latino');
  assert.match(streamtape.title, /· HLS ·|· MP4 ·/);
});

test('sin temporada ni episodio no se busca nada', async (t) => {
  pageCache.clear();
  const stub = installFetchStub(seriesRoutes());
  t.after(() => stub.restore());

  const { streams, trace } = await collectStreams({
    type: 'series',
    id: 'tt9140554',
    baseUrl: 'https://addon.example.com'
  });

  assert.deepEqual(streams, []);
  assert.ok(trace.errors.length > 0);
});

test('si el episodio no está listado se prueba la URL predecible', async (t) => {
  pageCache.clear();
  const stub = installFetchStub({
    ...seriesRoutes(),
    [`${SITE}/serie/loki/`]: '<div id="content"><h1>Loki</h1><p>sin episodios listados</p></div>'
  });
  t.after(() => stub.restore());

  const { streams, trace } = await collectStreams({
    type: 'series',
    id: 'tt9140554:2:1',
    baseUrl: 'https://addon.example.com'
  });

  assert.match(trace.page.url, /loki-2x01-hd-online-temporada-2-episodio-1/);
  assert.ok(streams.length >= 1);
});
