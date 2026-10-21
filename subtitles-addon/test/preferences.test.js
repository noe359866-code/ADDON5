'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { context, parsePreferences } = require('../src/preferences');
const config = require('../src/config');
const { runProviders, app } = require('../index');

test('preferences validate, deduplicate and preserve priority', () => {
  assert.deepEqual(parsePreferences('languages=fr,ES,FR&only=true'), { languages: ['FR', 'ES'], languagesOnly: true });
  for (const value of ['', 'languages=XX&only=true', 'languages=ES&only=yes', 'languages=&only=false', 'languages=ES&only=false&unknown=1', 'languages=ES&languages=EN&only=true']) {
    assert.throws(() => parsePreferences(value));
  }
});

test('concurrent user language contexts reach providers and filter independently', async () => {
  const original = config.languages;
  const provider = { name: 'fixture', async search() {
    const before = config.languages;
    await new Promise(resolve => setTimeout(resolve, 15));
    assert.deepEqual(config.languages, before);
    return [{ id: 'es', url: 'https://example.org/es.srt', lang: 'spa' }, { id: 'fr', url: 'https://example.org/fr.srt', lang: 'fre' }];
  }};
  const results = await Promise.all(['ES', 'FR'].map(lang => context.run(parsePreferences(`languages=${lang}&only=true`), () => runProviders({ type: 'movie', imdbId: 'tt0111161' }, Date.now() + 2000, { providers: [provider] }))));
  assert.deepEqual(results.map(r => r.subtitles.map(s => s.lang)), [['spa'], ['fre']]);
  assert.deepEqual(config.languages, original);
});

test('HTTP configuration page, configured manifest and subtitles routes', async t => {
  const server = app.listen(0, '127.0.0.1');
  t.after(() => new Promise(resolve => server.close(resolve)));
  await new Promise(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const prefix = encodeURIComponent('languages=FR,ES&only=true');
  const page = await fetch(`${base}/${prefix}/configure`);
  assert.equal(page.status, 200);
  assert.match(await page.text(), /Idiomas de los subtítulos/);
  const metadata = await (await fetch(`${base}/api/languages`)).json();
  assert.equal(metadata.languages.FR, 'Francés');
  const manifest = await (await fetch(`${base}/${prefix}/manifest.json`)).json();
  assert.equal(manifest.behaviorHints.configurable, true);
  assert.deepEqual(manifest.resources, ['subtitles']);
  const response = await fetch(`${base}/${prefix}/subtitles/movie/invalid.json`);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('access-control-allow-origin'), '*');
  assert.deepEqual(await response.json(), { subtitles: [] });
  const extra = await fetch(`${base}/${prefix}/subtitles/series/invalid/filename=test.mkv.json`);
  assert.deepEqual(await extra.json(), { subtitles: [] });
  assert.equal((await fetch(`${base}/languages=XX&only=true/manifest.json`)).status, 400);
});
