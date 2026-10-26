import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { collectStreams, interleaveEmbeds } from '../src/addon.js';
import { config } from '../src/config.js';
import { SOURCES, sourceLabel } from '../src/sources.js';
import { decodeParam } from '../src/streams.js';
import { mediaCache, pageCache } from '../src/cache.js';
import { xorEncrypt } from '../src/gnulahd.js';
import { installFetchStub, jsonRoute } from './helpers/stub-fetch.js';

const fixture = (name) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8');
const SITE = 'https://ww3.gnulahd.nu';

/**
 * Fixtures reales (octubre de 2026). Gnula entrega uqload/viewsb/jawcloud y
 * GnulaHD entrega vidara/byse/voe/savefiles a través de su API cifrada.
 */
function routes() {
  const m3u8 = '#EXTM3U\n#EXT-X-VERSION:3\n#EXTINF:5.0,\nseg_000.ts\n';

  return {
    // --- Gnula (WordPress de pestañas) ---
    'https://v3-cinemeta.strem.io/meta/movie/tt0816692.json': jsonRoute(JSON.parse(fixture('cinemeta-movie.json'))),
    'https://www2.gnula.one/?s=': fixture('gnula-search.html'),
    'https://www2.gnula.one/movie/interestelar/': fixture('gnula-movie.html'),
    'https://uqload.com/embed-fqhl3m5h3zcn.html': fixture('uqload.html'),
    'https://viewsb.com/e/beypa68rqj3t.html': '<video><source src="https://cdn.example.org/interstellar-2014.mp4" type="video/mp4"></video>',
    'https://cdn.example.org/interstellar-2014.mp4': { body: '', headers: { 'content-type': 'video/mp4' } },
    // jawcloud está caído (404 en la web real): no se stubea y se descarta.

    // --- GnulaHD (API gnrd cifrada + resolvedor de vidara) ---
    [`${SITE}/?s=`]: fixture('gnulahd-search.html'),
    [`${SITE}/ver/interestelar/`]: fixture('gnulahd-movie.html'),
    [`${SITE}/wp-json/gnrd/v1/player?id=206802`]: jsonRoute(JSON.parse(fixture('gnulahd-player-encrypted.json'))),
    [`${SITE}/panel/vidara-resolve.php`]: { body: m3u8, headers: { 'content-type': 'application/vnd.apple.mpegurl' } },
    'https://voe.sx/e/': (url) => `<script>jwplayer("v").setup({sources:[{file:"https://cdn.voe.sx/hls/${url.split('/').pop()}/master.m3u8"}]});</script>`
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

  const ids = trace.sources.map((source) => source.id);
  assert.deepEqual(ids, ['gnula', 'gnulahd']);

  const gnula = trace.sources.find((source) => source.id === 'gnula');
  assert.equal(gnula.embeds, 3, 'uqload + viewsb + jawcloud');
  const hd = trace.sources.find((source) => source.id === 'gnulahd');
  assert.match(hd.page, /\/ver\/interestelar\/$/);
  assert.equal(hd.embeds, 8, '4 servidores × 2 idiomas');

  const names = new Set(streams.map((stream) => stream.name));
  assert.ok(names.has('Gnula · Latino'), `nombres: ${[...names]}`);
  assert.ok(names.has('GnulaHD · Latino'), `nombres: ${[...names]}`);
  assert.ok(names.has('GnulaHD · Subtitulado'), `nombres: ${[...names]}`);

  const media = streams.map((stream) => mediaOf(stream.url));
  assert.ok(media.some((url) => url.includes('strm7.uqload.vc') && url.includes('.m3u8')), 'uqload de Gnula');
  assert.ok(media.includes('https://cdn.example.org/interstellar-2014.mp4'), 'viewsb de Gnula');
  assert.ok(media.some((url) => url.includes('/panel/vidara-resolve.php?pl=1&code=3RSpbzKZgfoy8')), 'vidara de GnulaHD');
  assert.ok(media.includes('https://cdn.voe.sx/hls/rvnyarijf6gm/master.m3u8'), 'voe latino de GnulaHD');

  // El nombre visible del resolvedor es el del servidor, no el de la web.
  const vidara = streams.find((stream) => mediaOf(stream.url).includes('/panel/vidara-resolve.php'));
  assert.equal(vidara.name, 'GnulaHD · Latino');
  assert.equal(vidara.title, 'Vidara · HLS · HD');

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

  assert.equal(streams.length, 2, 'uqload (HLS) + viewsb (MP4)');
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

  assert.equal(streams.length, 4, 'vidara y voe, en los dos idiomas');
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

test('STREMIO_FORMATS decide qué se entrega: sin mp4 el MP4 se descarta', async (t) => {
  pageCache.clear();
  mediaCache.clear();
  const stub = installFetchStub(routes());
  t.after(() => stub.restore());

  const previous = config.stremioFormats;
  config.stremioFormats = ['hls'];
  t.after(() => { config.stremioFormats = previous; });

  const { streams, trace } = await collectStreams({
    type: 'movie',
    id: 'tt0816692',
    baseUrl: 'https://addon.example.com'
  });

  // Con el tope de 12 reproductores también entra el agregador de Cuevana.
  assert.equal(streams.length, 5, 'uqload + 2 vidara + 1 voe + 1 cuevana');
  assert.deepEqual(
    [...new Set(streams.map((stream) => stream.name))].sort(),
    ['Gnula · Latino', 'GnulaHD · Latino', 'GnulaHD · Subtitulado']
  );
  assert.equal(streams.some((stream) => mediaOf(stream.url).endsWith('.mp4')), false);

  // El MP4 directo sí se resolvió, pero se descarta por formato.
  const dropped = trace.resolved.find((item) => item.media.endsWith('.mp4'));
  assert.ok(dropped, 'el MP4 aparece en el diagnóstico');
  assert.equal(dropped.compatible, false);
  assert.match(dropped.reason, /mp4/);
});
