'use strict';

// Tests del archivo principal (index.js) y de la unificación de resultados:
// sin red externa (los ids inválidos se cortan antes de llamar proveedores).

const test = require('node:test');
const assert = require('node:assert/strict');

const main = require('../index');
const { unifySettled, prioritizeSubtitles, preferredIsoList } = require('../src/providers');

test('priorización de idiomas: español, inglés y después el resto', () => {
  assert.deepEqual(preferredIsoList({ preferredLanguages: ['es', 'EN', 'spanish'] }), ['spa', 'eng']);

  const subs = [
    { id: 'a-1', url: 'https://x.test/1.srt', lang: 'fra' },
    { id: 'a-2', url: 'https://x.test/2.srt', lang: 'eng' },
    { id: 'a-3', url: 'https://x.test/3.srt', lang: 'spa' },
    { id: 'a-4', url: 'https://x.test/4.srt', lang: 'spa' },
    { id: 'a-5', url: 'https://x.test/5.srt', lang: 'por' }
  ];
  const ordered = prioritizeSubtitles(subs, { preferredLanguages: ['ES', 'EN'] });
  assert.deepEqual(ordered.map((s) => s.id), ['a-3', 'a-4', 'a-2', 'a-1', 'a-5']);

  // onlyPreferred: se descartan el resto de idiomas
  const only = prioritizeSubtitles(subs, {
    preferredLanguages: ['ES', 'EN'],
    onlyPreferred: true
  });
  assert.deepEqual(only.map((s) => s.lang), ['spa', 'spa', 'eng']);
});

test('unifySettled: un proveedor caído no tumba al resto; dedupe y formato exacto', () => {
  const fakeProviders = [{ name: 'fuente-a' }, { name: 'fuente-caida' }, { name: 'fuente-b' }];
  const settled = [
    {
      status: 'fulfilled',
      value: [
        { id: '1', url: 'https://x.test/en.srt', lang: 'eng', release: 'Movie.1080p' },
        { id: 'dup', url: 'https://x.test/en.srt', lang: 'eng' }, // misma URL -> fuera
        { id: '2', url: 'https://x.test/fr.srt', lang: 'fra' },
        { id: 'mal', url: 'notaurl', lang: 'spa' } // URL inválida -> fuera
      ]
    },
    { status: 'rejected', reason: new Error('timeout de ejemplo') },
    {
      status: 'fulfilled',
      value: [{ id: '3', url: 'https://x.test/es.srt', lang: 'spa', provider: 'fuente-b' }]
    }
  ];

  const out = unifySettled(settled, fakeProviders, { preferredLanguages: ['ES', 'EN'] });
  assert.deepEqual(out.map((s) => s.id), ['fuente-b-3', 'fuente-a-1', 'fuente-a-2']);
  // Exactamente { id, url, lang }: ni release ni provider llegan a Stremio
  assert.deepEqual(Object.keys(out[0]).sort(), ['id', 'lang', 'url']);
});

test('handler: id/tipo inválidos devuelven { subtitles: [] } sin tocar la red', async () => {
  assert.deepEqual(await main.handleSubtitlesRequest({ type: 'movie', id: 'no-valido' }), { subtitles: [] });
  assert.deepEqual(await main.handleSubtitlesRequest({ type: 'channel', id: 'tt0111161' }), { subtitles: [] });
  assert.deepEqual(await main.handleSubtitlesRequest({}), { subtitles: [] });
  assert.deepEqual(await main.handleSubtitlesRequest(), { subtitles: [] });
});

test('HTTP: /manifest.json, /health y /subtitles con id inválido', async (t) => {
  const server = main.app.listen(0, '127.0.0.1');
  t.after(() => new Promise((resolve) => server.close(resolve)));
  await new Promise((resolve) => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;

  const manifestRes = await fetch(`${base}/manifest.json`);
  assert.equal(manifestRes.status, 200);
  const manifest = await manifestRes.json();
  assert.equal(manifest.id, 'org.addon5.subtitles');
  assert.deepEqual(manifest.resources, ['subtitles']);
  assert.deepEqual(manifest.types, ['movie', 'series']);
  assert.deepEqual(manifest.idPrefixes, ['tt', 'kitsu', 'mal', 'anidb']);

  const health = await (await fetch(`${base}/health`)).json();
  assert.equal(health.status, 'ok');
  assert.deepEqual(
    health.providers,
    ['subdl', 'subsource', 'subscene', 'yts-subs', 'justsubtitles', 'indexsubtitle']
  );

  const subsRes = await fetch(`${base}/subtitles/movie/no-es-un-tt.json`);
  assert.equal(subsRes.status, 200);
  assert.deepEqual(await subsRes.json(), { subtitles: [] });
});
