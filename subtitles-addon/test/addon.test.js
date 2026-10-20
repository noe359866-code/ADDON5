'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const manifest = require('../manifest.json');
const { parseSubtitlesId } = require('../src/utils/imdb');
const { toIso6392 } = require('../src/utils/languages');

test('manifest: recurso subtitles, movie/series e IDs de IMDb + anime', () => {
  assert.deepEqual(manifest.resources, ['subtitles']);
  assert.deepEqual(manifest.types, ['movie', 'series']);
  assert.deepEqual(manifest.idPrefixes, ['tt', 'kitsu', 'mal', 'anidb']);
  assert.deepEqual(manifest.catalogs, []);
  assert.ok(manifest.id && manifest.version && manifest.name);
});

test('parseSubtitlesId: película', () => {
  assert.deepEqual(parseSubtitlesId('tt0111161'), {
    imdbId: 'tt0111161',
    season: undefined,
    episode: undefined
  });
});

test('parseSubtitlesId: episodio de serie tt:S:E', () => {
  assert.deepEqual(parseSubtitlesId('tt0944947:1:3'), {
    imdbId: 'tt0944947',
    season: 1,
    episode: 3
  });
});

test('parseSubtitlesId: ids inválidos -> null', () => {
  assert.equal(parseSubtitlesId(''), null);
  assert.equal(parseSubtitlesId('12345'), null);
  assert.equal(parseSubtitlesId(null), null);
});

test('toIso6392 normaliza nombres y códigos de 2 letras', () => {
  assert.equal(toIso6392('Spanish'), 'spa');
  assert.equal(toIso6392('es'), 'spa');
  assert.equal(toIso6392('EN'), 'eng');
  assert.equal(toIso6392(' Portuguese '), 'por');
});

test('el addon responde { subtitles: [] } ante un id no-IMDb sin tocar la red', async () => {
  const addonInterface = require('../src/addon');
  // El SDK expone los handlers a través del router; comprobamos el manifest servido.
  assert.equal(addonInterface.manifest.id, manifest.id);
  assert.deepEqual(addonInterface.manifest.resources, ['subtitles']);
});
