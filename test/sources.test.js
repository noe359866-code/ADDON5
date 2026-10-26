import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { collectStreams, interleaveEmbeds } from '../src/addon.js';
import { config } from '../src/config.js';
import { SOURCES, sourceLabel } from '../src/sources.js';
import { decodeParam } from '../src/streams.js';
import { pageCache } from '../src/cache.js';
import { xorEncrypt } from '../src/gnulahd.js';
import { installFetchStub, jsonRoute } from './helpers/stub-fetch.js';

const fixture = (name) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8');
const SITE = 'https://ww3.gnulahd.nu';
const KEY = 'Z251bGFmaWxtZXMxMjM0';

function gnulahdPayload() {
  return {
    p: xorEncrypt(JSON.stringify({
      langs: [
        { label: 'Latino', servers: [{ src: 'https://filemoon.sx/e/gnhd1' }, { src: '//streamtape.com/e/gnhd2' }] },
        { label: 'Subtitulado', servers: [{ src: 'https://they.tube/e/abc123' }] }
      ]
    }), KEY)
  };
}

function routes() {
  return {
    // --- Gnula (wordpress de pestañas) ---
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

    // --- GnulaHD (API gnrd cifrada) ---
    [`${SITE}/?s=`]: fixture('gnulahd-search.html'),
    [`${SITE}/ver/interestelar/`]: fixture('gnulahd-movie.html'),
    [`${SITE}/wp-json/gnrd/v1/player?id=48213`]: jsonRoute(gnulahdPayload()),
    [`${SITE}/panel/the-tube-resolve.php?code=abc123`]: jsonRoute({ master: 'https://cdn.thetube.tv/hls/master.m3u8' }),
    'https://filemoon.sx/e/gnhd1': fixture('filemoon-packed-hd.html'),
    'https://streamtape.com/e/gnhd2': '<div id="robotlink">//streamtape.com/get_video?id=gnhd2&expires=1&ip=2&token=</div><script>document.getElementById("robotlink").innerHTML += "AA";</script>'
  };
}

function mediaOf(streamUrl) {
  return decodeParam(new URL(streamUrl).searchParams.get('u'));
}

test('se consultan las dos webs hermanas', () => {
  assert.deepEqual(SOURCES.map((source) => source.id), ['gnula', 'gnulahd']);
  assert.deepEqual(SOURCES.map((source) => source.label), ['Gnula', 'GnulaHD']);
  assert.equal(sourceLabel('gnulahd'), 'GnulaHD');
  assert.equal(sourceLabel('otra'), 'Gnula');
});

test('interleaveEmbeds alterna las fuentes sin perder ninguna', () => {
  const merged = interleaveEmbeds([
    [{ id: 'g1' }, { id: 'g2' }, { id: 'g3' }],
    [{ id: 'h1' }]
  ]);
  assert.deepEqual(merged.map((embed) => embed.id), ['g1', 'h1', 'g2', 'g3']);
});

test('los streams de Gnula y GnulaHD se mezclan en la misma respuesta', async (t) => {
  pageCache.clear();
  const stub = installFetchStub(routes());
  t.after(() => stub.restore());

  const { streams, trace } = await collectStreams({
    type: 'movie',
    id: 'tt0816692',
    baseUrl: 'https://addon.example.com'
  });

  // Las dos fuentes aparecen en el diagnóstico...
  const ids = trace.sources.map((source) => source.id);
  assert.deepEqual(ids, ['gnula', 'gnulahd']);
  const hd = trace.sources.find((source) => source.id === 'gnulahd');
  assert.match(hd.page, /\/ver\/interestelar\/$/);
  assert.equal(hd.embeds, 3);

  // ...y en la lista de streams.
  const names = new Set(streams.map((stream) => stream.name));
  assert.ok([...names].some((name) => name.startsWith('Gnula ·')), `nombres: ${[...names]}`);
  assert.ok([...names].some((name) => name.startsWith('GnulaHD ·')), `nombres: ${[...names]}`);

  const media = streams.map((stream) => mediaOf(stream.url));
  assert.ok(media.includes('https://cdn.example.net/v/master.m3u8'), 'filemoon de GnulaHD');
  assert.ok(media.includes('https://cdn.thetube.tv/hls/master.m3u8'), 'they.tube resuelto por GnulaHD');
  assert.ok(media.includes('https://cdn.example.com/master.m3u8'), 'filemoon de Gnula');
  assert.ok(media.includes('https://cdn.voe.sx/hls/abc123/master.m3u8'), 'voe de Gnula');

  const fromHd = streams.find((stream) => mediaOf(stream.url) === 'https://cdn.example.net/v/master.m3u8');
  assert.equal(fromHd.name, 'GnulaHD · Latino');
  assert.equal(fromHd.title, 'Filemoon · HD');

  const theTube = streams.find((stream) => mediaOf(stream.url) === 'https://cdn.thetube.tv/hls/master.m3u8');
  assert.equal(theTube.name, 'GnulaHD · Subtitulado');

  // Cada reproductor que se abrió queda registrado con su fuente.
  const resolvedSources = new Set(trace.resolved.map((item) => item.source));
  assert.deepEqual([...resolvedSources].sort(), ['gnula', 'gnulahd']);
});

test('si GnulaHD no responde, Gnula sigue sirviendo streams', async (t) => {
  pageCache.clear();
  const all = routes();
  const onlyGnula = Object.fromEntries(
    Object.entries(all).filter(([url]) => !url.startsWith(SITE))
  );
  const stub = installFetchStub(onlyGnula);
  t.after(() => stub.restore());

  const { streams, trace } = await collectStreams({
    type: 'movie',
    id: 'tt0816692',
    baseUrl: 'https://addon.example.com'
  });

  assert.ok(streams.length >= 4);
  assert.ok(streams.every((stream) => stream.name.startsWith('Gnula')));
  assert.ok(trace.errors.some((error) => error.startsWith('GnulaHD:')));
});

test('si Gnula no responde, GnulaHD sigue sirviendo streams', async (t) => {
  pageCache.clear();
  const all = routes();
  const onlyHd = Object.fromEntries(
    Object.entries(all).filter(([url]) => !url.includes('gnula.one') && !url.includes('cinemeta'))
  );
  onlyHd['https://v3-cinemeta.strem.io/meta/movie/tt0816692.json'] = all['https://v3-cinemeta.strem.io/meta/movie/tt0816692.json'];

  const stub = installFetchStub(onlyHd);
  t.after(() => stub.restore());

  const { streams, trace } = await collectStreams({
    type: 'movie',
    id: 'tt0816692',
    baseUrl: 'https://addon.example.com'
  });

  assert.ok(streams.length >= 2);
  assert.ok(streams.every((stream) => stream.name.startsWith('GnulaHD')));
  assert.ok(trace.errors.some((error) => error.startsWith('Gnula:')));
});

test('si ninguna fuente tiene ficha, se responde lista vacía', async (t) => {
  pageCache.clear();
  const stub = installFetchStub({
    'https://v3-cinemeta.strem.io/meta/movie/tt9999999.json': jsonRoute({
      meta: { id: 'tt9999999', type: 'movie', name: 'Pelicula Inexistente', year: '2024' }
    }),
    'https://www2.gnula.one/?s=': '<div id="content"></div>',
    [`${SITE}/?s=`]: '<div class="gnrd-grid"></div>'
  });
  t.after(() => stub.restore());

  const { streams } = await collectStreams({
    type: 'movie',
    id: 'tt9999999',
    baseUrl: 'https://addon.example.com'
  });
  assert.deepEqual(streams, []);
});

test('con ONLY_HLS solo quedan las listas .m3u8', async (t) => {
  pageCache.clear();
  const stub = installFetchStub(routes());
  t.after(() => stub.restore());

  const previous = config.onlyHls;
  config.onlyHls = true;
  t.after(() => { config.onlyHls = previous; });

  const { streams } = await collectStreams({
    type: 'movie',
    id: 'tt0816692',
    baseUrl: 'https://addon.example.com'
  });

  assert.ok(streams.length >= 3);
  assert.ok(streams.every((stream) => /\.m3u8(\?|#|$)/i.test(mediaOf(stream.url))), 'solo HLS');
  assert.equal(streams.some((stream) => mediaOf(stream.url).endsWith('.mp4')), false);
});
