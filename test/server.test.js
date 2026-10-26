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
    'https://www2.gnula.one/movie/interstellar/': fixture('gnula-movie.html'),
    'https://filemoon.sx/e/abc123': fixture('filemoon-packed.html'),
    'https://voe.sx/e/def456': fixture('voe-redirect.html'),
    'https://voe.sx/e/xyz789': fixture('voe-player.html'),
    'https://streamtape.com/e/ghi789': fixture('streamtape.html'),
    'https://doodstream.com/e/jkl012': fixture('doodstream.html'),
    'https://doodstream.com/pass_md5/': 'https://dood.pm/landing123',
    'https://player.cuevana.ac/e/pqr345': fixture('cuevana-links.html'),
    'https://voe.sx/e/chain789': fixture('voe-player.html'),
    'https://streamtape.com/e/chain456': fixture('streamtape.html'),
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
    assert.ok(streams.length >= 5, `se esperaban al menos 5 streams, llegaron ${streams.length}`);

    const byMedia = new Map(streams.map((stream) => [proxyParams(stream.url).media, stream]));

    assert.ok(byMedia.has('https://cdn.voe.sx/hls/abc123/master.m3u8'));
    assert.ok(byMedia.has('https://cdn.example.com/master.m3u8'));
    assert.ok(byMedia.has('https://cdn.example.org/interstellar-2014.mp4'));
    assert.ok(byMedia.has('https://streamtape.com/get_video?id=ghi789abc&expires=1767225600&ip=203.0.113.9&token=Zz9Qq'));
    assert.ok([...byMedia.keys()].some((media) => media.startsWith('https://dood.pm/landing123')));

    const filemoon = byMedia.get('https://cdn.example.com/master.m3u8');
    assert.equal(filemoon.name, 'Gnula · Latino');
    assert.equal(filemoon.title, 'Filemoon · HD');
    assert.equal(proxyParams(filemoon.url).referer, 'https://filemoon.sx/e/abc123');

    // El agregador de Cuevana revela el mismo Voe de la ficha: no se duplica.
    const voe = byMedia.get('https://cdn.voe.sx/hls/abc123/master.m3u8');
    assert.equal(voe.name, 'Gnula · Latino');
    assert.equal(proxyParams(voe.url).referer, 'https://voe.sx/e/xyz789');
    assert.equal(streams.filter((stream) => proxyParams(stream.url).media === 'https://cdn.voe.sx/hls/abc123/master.m3u8').length, 1);

    const direct = byMedia.get('https://cdn.example.org/interstellar-2014.mp4');
    assert.equal(direct.title, 'Enlace directo · HD');
    assert.equal(streams.length, 5);

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

test('una ficha sin reproductores ofrece abrirla en el navegador', async (t) => {
  pageCache.clear();
  mediaCache.clear();

  const stub = installFetchStub({
    'https://v3-cinemeta.strem.io/meta/movie/tt0816692.json': jsonRoute(JSON.parse(fixture('cinemeta-movie.json'))),
    'https://www2.gnula.one/?s=': fixture('gnula-search.html'),
    'https://www2.gnula.one/movie/interstellar/': '<div id="content"><h1>Interstellar</h1><p>sin reproductores</p></div>'
  });
  t.after(() => stub.restore());

  await withServer(async (base) => {
    const response = await stub.fetch(`${base}/stream/movie/tt0816692.json`);
    assert.equal(response.status, 200);

    const { streams } = await response.json();
    assert.equal(streams.length, 1);
    assert.match(streams[0].externalUrl, /\/movie\/interstellar\/$/);
    assert.equal(streams[0].behaviorHints.notWebReady, true);
    assert.match(streams[0].title, /abrir la ficha/);
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
    assert.match(payload.trace.page.url, /\/movie\/interstellar\/$/);
    assert.equal(payload.trace.page.embeds, 6);
    assert.ok(payload.trace.resolved.some((item) => item.media.includes('master.m3u8')));
    assert.ok(payload.streams.length >= 5);
  });
});
