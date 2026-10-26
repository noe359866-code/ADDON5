import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createServerInstance } from '../src/server.js';
import { mediaCache, pageCache } from '../src/cache.js';
import { decodeParam, encodeParam } from '../src/streams.js';
import { installFetchStub, jsonRoute } from './helpers/stub-fetch.js';

const fixture = (name) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8');

async function withServer(run) {
  const server = createServerInstance({ log: false });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  try {
    return await run(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

function gnulaRoutes() {
  return {
    'https://v3-cinemeta.strem.io/meta/movie/tt0816692.json': jsonRoute(JSON.parse(fixture('cinemeta-movie.json'))),
    'https://www2.gnula.one/?s=': fixture('gnula-search.html'),
    'https://www2.gnula.one/movie/interestelar/': fixture('gnula-movie.html'),
    // uqload esconde el master en un JS empaquetado; viewsb, un MP4 directo.
    'https://uqload.com/embed-fqhl3m5h3zcn.html': fixture('uqload.html'),
    'https://viewsb.com/e/beypa68rqj3t.html': '<video><source src="https://cdn.example.org/interstellar-2014.mp4" type="video/mp4"></video>',
    'https://cdn.example.org/interstellar-2014.mp4': { body: '', headers: { 'content-type': 'video/mp4' } },
    'https://cdn.example.org/hls/master.m3u8': {
      body: fixture('hls-playlist.m3u8'),
      headers: { 'content-type': 'application/vnd.apple.mpegurl' }
    }
  };
}

function proxyParams(streamUrl) {
  const params = new URL(streamUrl).searchParams;
  return { media: decodeParam(params.get('u')), referer: decodeParam(params.get('r')) };
}

test('GET /manifest.json declara solo el recurso stream', async () => {
  await withServer(async (base) => {
    const response = await fetch(`${base}/manifest.json`);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('access-control-allow-origin'), '*');

    const manifest = await response.json();
    assert.equal(manifest.id, 'org.addon5.gnula');
    assert.deepEqual(manifest.resources, ['stream']);
    assert.deepEqual(manifest.catalogs, []);
    assert.deepEqual(manifest.types, ['movie', 'series']);
    assert.deepEqual(manifest.idPrefixes, ['tt']);
    assert.equal(manifest.resources.includes('subtitles'), false);
  });
});

test('la página de inicio ofrece el enlace de instalación', async () => {
  await withServer(async (base) => {
    const response = await fetch(`${base}/`);
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.match(html, /Instalar en Stremio/);
    assert.match(html, /stremio:\/\/127\.0\.0\.1:\d+\/manifest\.json/);
    assert.match(html, /Gnula Streams/);
    assert.doesNotMatch(html, /subt[ií]tulos/i);
  });
});

test('GET /health responde ok', async () => {
  await withServer(async (base) => {
    const response = await fetch(`${base}/health`);
    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.equal(payload.status, 'ok');
    assert.equal(payload.version, '1.0.0');
  });
});

test('GET /stream/movie/{id}.json devuelve los streams de Gnula', async (t) => {
  const stub = installFetchStub(gnulaRoutes());
  t.after(() => stub.restore());

  await withServer(async (base) => {
    const response = await stub.fetch(`${base}/stream/movie/tt0816692.json`);
    assert.equal(response.status, 200);

    const { streams } = await response.json();
    assert.ok(Array.isArray(streams));
    assert.equal(streams.length, 2, 'uqload (HLS) y viewsb (MP4)');

    const byMedia = new Map(streams.map((stream) => [proxyParams(stream.url).media, stream]));
    const uqload = [...byMedia.keys()].find((media) => media.includes('strm7.uqload.vc'));
    assert.ok(uqload, 'el master de uqload sale del JS empaquetado');
    assert.match(uqload, /\.m3u8\?/);

    const hls = byMedia.get(uqload);
    assert.equal(hls.name, 'Gnula · Latino');
    assert.equal(hls.title, 'Uqload · HLS · HD');
    assert.equal(proxyParams(hls.url).referer, 'https://uqload.com/embed-fqhl3m5h3zcn.html');

    const direct = byMedia.get('https://cdn.example.org/interstellar-2014.mp4');
    assert.equal(direct.title, 'ViewSB · MP4 · HD');

    // Todos los streams apuntan al proxy del addon (el CDN exige Referer).
    for (const stream of streams) {
      assert.match(stream.url, new RegExp(`^${base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/proxy\\?`));
    }
  });
});

test('el proxy reescribe la lista HLS con las cabeceras del reproductor', async (t) => {
  const stub = installFetchStub(gnulaRoutes());
  t.after(() => stub.restore());

  await withServer(async (base) => {
    const media = 'https://cdn.example.org/hls/master.m3u8';
    const referer = 'https://filemoon.sx/e/abc123';
    const response = await stub.fetch(`${base}/proxy?u=${encodeParam(media)}&r=${encodeParam(referer)}`);

    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type'), /mpegurl/);

    const playlist = await response.text();
    assert.match(playlist, /^#EXTM3U/);
    assert.match(playlist, /#EXT-X-VERSION:3/);

    const segment = playlist.split('\n').find((line) => line.includes('/proxy?u=') && !line.startsWith('#'));
    assert.ok(segment, 'los segmentos deben pasar por el proxy');
    assert.deepEqual(proxyParams(segment), {
      media: 'https://cdn.example.org/hls/segment-001.ts',
      referer
    });

    // La petición al CDN llevó el Referer del reproductor.
    const upstreamCall = stub.calls.find((call) => call.url === media);
    assert.ok(upstreamCall);
    assert.equal(upstreamCall.headers.Referer, referer);
  });
});

test('el proxy rechaza destinos privados', async () => {
  await withServer(async (base) => {
    const response = await fetch(`${base}/proxy?u=${encodeParam('http://127.0.0.1:7000/manifest.json')}`);
    assert.equal(response.status, 400);
  });
});

test('un ID no soportado devuelve lista vacía y no rompe', async () => {
  await withServer(async (base) => {
    const response = await fetch(`${base}/stream/movie/tmdb%3A123.json`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { streams: [] });

    const series = await fetch(`${base}/stream/series/tt0944947.json`);
    assert.equal(series.status, 200);
    assert.deepEqual(await series.json(), { streams: [] });
  });
});

test('sin resultados de Gnula se responde 200 con streams vacíos', async (t) => {
  const stub = installFetchStub({
    'https://v3-cinemeta.strem.io/meta/movie/tt9999999.json': jsonRoute({
      meta: { id: 'tt9999999', type: 'movie', name: 'Pelicula Inexistente', year: '2024' }
    }),
    'https://www2.gnula.one/?s=': '<div id="content"></div>'
  });
  t.after(() => stub.restore());

  await withServer(async (base) => {
    const response = await stub.fetch(`${base}/stream/movie/tt9999999.json`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { streams: [] });
  });
});

test('sin video reproducible se responde vacío', async (t) => {
  pageCache.clear();
  mediaCache.clear();

  const stub = installFetchStub({
    'https://v3-cinemeta.strem.io/meta/movie/tt0816692.json': jsonRoute(JSON.parse(fixture('cinemeta-movie.json'))),
    'https://www2.gnula.one/?s=': fixture('gnula-search.html'),
    'https://www2.gnula.one/movie/interestelar/': '<div id="content"><h1>Interestelar</h1><p>sin reproductores</p></div>'
  });
  t.after(() => stub.restore());

  await withServer(async (base) => {
    const response = await stub.fetch(`${base}/stream/movie/tt0816692.json`);
    assert.equal(response.status, 200);

    // Por defecto no se inventan entradas: si no hay HLS/MP4, lista vacía.
    const { streams } = await response.json();
    assert.deepEqual(streams, []);
  });
});

test('/selftest explica qué pasó paso a paso', async (t) => {
  const stub = installFetchStub(gnulaRoutes());
  t.after(() => stub.restore());

  await withServer(async (base) => {
    const response = await stub.fetch(`${base}/selftest?id=tt0816692&type=movie`);
    assert.equal(response.status, 200);
    const payload = await response.json();

    assert.equal(payload.ok, true);
    assert.equal(payload.trace.meta.name, 'Interstellar');
    assert.match(payload.trace.page.url, /\/movie\/interestelar\/$/);
    assert.equal(payload.trace.page.embeds, 3);
    assert.ok(payload.trace.resolved.some((item) => item.media.includes('master.m3u8')));
    assert.equal(payload.streams.length, 2);
  });
});
