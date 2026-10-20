'use strict';

// Tests de las piezas nuevas: IDs de anime, proxy firmado, descompresión de
// zip, conversión de formatos y deadline del handler. Sin red.

const test = require('node:test');
const assert = require('node:assert/strict');
const zlib = require('node:zlib');

const { parseMediaId } = require('../src/utils/mediaId');
const { signToken, verifyToken } = require('../src/utils/token');
const { isZip, extractZip } = require('../src/utils/zip');
const {
  decodeSubtitleBuffer, detectSubtitleFormat, assToSrt, vttToSrt,
  microDvdToSrt, toStremioSubtitleText, pickSubtitleEntry
} = require('../src/utils/subtitleText');
const { buildProxyUrl, canProxy, assertPublicUrl } = require('../src/proxy');
const config = require('../src/config');
const { settleWithDeadline } = require('../index');

/* ------------------------------------------------------------- utilidades */

function makeZip(files) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  for (const file of files) {
    const name = Buffer.from(file.name);
    const data = Buffer.isBuffer(file.data) ? file.data : Buffer.from(file.data || '');
    const deflate = Boolean(file.deflate);
    const payload = deflate ? zlib.deflateRawSync(data) : data;
    const method = deflate ? 8 : 0;

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 8);
    local.writeUInt16LE(method, 8);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt32LE(payload.length, 18);
    local.writeUInt16LE(name.length, 26);
    localParts.push(local, name, payload);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0, 8);
    central.writeUInt16LE(method, 10);
    central.writeUInt32LE(payload.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt32LE(offset, 42);
    centralParts.push(central, name);

    offset += local.length + name.length + payload.length;
  }

  const centralBuffer = Buffer.concat(centralParts);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralBuffer.length, 12);
  end.writeUInt32LE(offset, 16);

  return Buffer.concat([...localParts, centralBuffer, end]);
}

const SRT = '1\n00:00:01,000 --> 00:00:02,000\nHola\n\n';

/* ------------------------------------------------------------- mediaId */

test('parseMediaId: IMDb película y episodio', () => {
  assert.deepEqual(parseMediaId('tt0111161'), { namespace: 'tt', imdbId: 'tt0111161' });
  assert.deepEqual(parseMediaId('tt0944947:1:3'), {
    namespace: 'tt', imdbId: 'tt0944947', season: 1, episode: 3
  });
});

test('parseMediaId: IDs de anime de Stremio (kitsu/mal/anidb)', () => {
  assert.deepEqual(parseMediaId('kitsu:1234'), { namespace: 'kitsu', externalId: '1234' });
  assert.deepEqual(parseMediaId('kitsu:1234:5'), {
    namespace: 'kitsu', externalId: '1234', episode: 5
  });
  assert.deepEqual(parseMediaId('kitsu:1234:1:5'), {
    namespace: 'kitsu', externalId: '1234', season: 1, episode: 5
  });
  assert.deepEqual(parseMediaId('mal:21:3'), {
    namespace: 'mal', externalId: '21', episode: 3
  });
  assert.deepEqual(parseMediaId('anidb:23'), { namespace: 'anidb', externalId: '23' });
});

test('parseMediaId: IDs inválidos -> null', () => {
  assert.equal(parseMediaId(''), null);
  assert.equal(parseMediaId('12345'), null);
  assert.equal(parseMediaId('tt0111161:abc'), null);
  assert.equal(parseMediaId('kitsu:'), null);
  assert.equal(parseMediaId(null), null);
});

/* --------------------------------------------------------------- tokens */

test('tokens del proxy: firma válida, manipulación y caducidad', () => {
  const secret = 'secreto-de-pruebas-123456';
  const token = signToken({ u: 'https://example.org/a.zip', l: 'spa' }, secret, 60);
  const payload = verifyToken(token, secret);
  assert.equal(payload.u, 'https://example.org/a.zip');
  assert.equal(payload.l, 'spa');

  assert.equal(verifyToken(token, 'otro-secreto-distinto-1234'), null);
  assert.equal(verifyToken(`${token.slice(0, -2)}xx`, secret), null);
  assert.equal(verifyToken(signToken({ u: 'https://example.org/a.zip' }, secret, -10), secret), null);
  assert.equal(verifyToken('basura', secret), null);
  assert.throws(() => signToken({ u: 'file:///etc/passwd' }, secret));
});

/* ------------------------------------------------------------------ zip */

test('extractZip: entradas store y deflate, ignora directorios', () => {
  const zip = makeZip([
    { name: 'pelicula.eng.srt', data: SRT, deflate: true },
    { name: 'pelicula.spa.srt', data: SRT },
    { name: 'carpeta/' }
  ]);
  assert.ok(isZip(zip));
  const entries = extractZip(zip);
  assert.deepEqual(entries.map((e) => e.name), ['pelicula.eng.srt', 'pelicula.spa.srt']);
  assert.equal(entries[0].data.toString(), SRT);
  assert.equal(entries[1].data.toString(), SRT);
});

test('pickSubtitleEntry: prefiere el archivo del episodio pedido', () => {
  const entries = [
    { name: 'Serie.S01E02.720p.srt', data: Buffer.from(SRT) },
    { name: 'Serie.S01E03.720p.srt', data: Buffer.from(SRT) },
    { name: 'leeme.txt', data: Buffer.from('hola') }
  ];
  const picked = pickSubtitleEntry(entries, { season: 1, episode: 3 });
  assert.equal(picked.name, 'Serie.S01E03.720p.srt');
});

/* ------------------------------------------------------- formatos/texto */

test('decodifica Latin-1/CP1252 y UTF-8 con BOM', () => {
  const latin1 = Buffer.from([0x48, 0x6f, 0x6c, 0x61, 0x20, 0x63, 0x61, 0x6e, 0x63, 0x69, 0xf3, 0x6e]);
  assert.match(decodeSubtitleBuffer(latin1), /canción/);

  const utf8Bom = Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from('Hola ñ')]);
  assert.equal(decodeSubtitleBuffer(utf8Bom), 'Hola ñ');
});

test('ASS/SSA -> SRT', () => {
  const ass = [
    '[Script Info]', 'Title: prueba', '', '[Events]',
    'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text',
    'Dialogue: 0,0:00:01.00,0:00:03.50,Default,,0,0,0,,{\\an8}Hola\\Nmundo',
    'Dialogue: 0,0:00:04.00,0:00:06.00,Default,,0,0,0,,Segunda línea'
  ].join('\n');
  assert.equal(detectSubtitleFormat('x.ass', ass), 'ass');
  const srt = assToSrt(ass);
  assert.match(srt, /00:00:01,000 --> 00:00:03,500/);
  assert.match(srt, /Hola\nmundo/);
  assert.match(srt, /2\n00:00:04,000/);
});

test('WebVTT -> SRT y MicroDVD -> SRT', () => {
  const vtt = 'WEBVTT\n\n00:01.000 --> 00:02.500 align:start\nHola <b>mundo</b>\n';
  const srt = vttToSrt(vtt);
  assert.match(srt, /00:00:01,000 --> 00:00:02,500/);
  assert.match(srt, /Hola mundo/);

  const micro = '{0}{48}Primera|Segunda\n{48}{96}Tercera';
  const converted = microDvdToSrt(micro, 24);
  assert.match(converted, /00:00:00,000 --> 00:00:02,000/);
  assert.match(converted, /Primera\nSegunda/);
});

test('toStremioSubtitleText: convierte a SRT UTF-8 y descarta basura', () => {
  const result = toStremioSubtitleText(Buffer.from(SRT), 'a.srt');
  assert.equal(result.ext, 'srt');
  assert.equal(result.text, SRT.trim() + '\n');

  assert.equal(toStremioSubtitleText(Buffer.from('<html>error 403</html>'), 'a.srt'), null);
  assert.equal(toStremioSubtitleText(Buffer.alloc(0), 'a.srt'), null);
});

/* ---------------------------------------------------------------- proxy */

test('buildProxyUrl: sin URL pública devuelve el enlace original', () => {
  const original = config.publicBaseUrl;
  config.publicBaseUrl = '';
  assert.equal(canProxy(), false);
  assert.equal(
    buildProxyUrl({ url: 'https://dl.example.org/a.zip', lang: 'spa' }),
    'https://dl.example.org/a.zip'
  );
  config.publicBaseUrl = original;
});

test('buildProxyUrl: con URL pública firma un enlace /sub/ verificable', () => {
  const original = config.publicBaseUrl;
  config.publicBaseUrl = 'https://addon.test';
  const url = buildProxyUrl({ url: 'https://dl.example.org/a.zip', lang: 'spa', release: 'Movie.1080p' });
  config.publicBaseUrl = original;

  assert.match(url, /^https:\/\/addon\.test\/sub\/[A-Za-z0-9_.-]+\.srt$/);
  const token = url.split('/sub/')[1].replace(/\.srt$/, '');
  const payload = verifyToken(token, require('../src/proxy').getSecret());
  assert.equal(payload.u, 'https://dl.example.org/a.zip');
  assert.equal(payload.n, 'Movie.1080p');
});

test('assertPublicUrl bloquea protocolos y hosts privados', () => {
  assert.equal(assertPublicUrl('https://dl.subdl.com/x.zip'), 'https://dl.subdl.com/x.zip');
  assert.throws(() => assertPublicUrl('file:///etc/passwd'));
  assert.throws(() => assertPublicUrl('http://127.0.0.1:8080/x'));
  assert.throws(() => assertPublicUrl('http://localhost/x'));
  assert.throws(() => assertPublicUrl('http://192.168.1.10/x'));
  assert.throws(() => assertPublicUrl('http://[::1]/x'));
});

/* -------------------------------------------------------------- deadline */

test('settleWithDeadline: las promesas lentas no bloquean la respuesta', async () => {
  const started = Date.now();
  const settled = await settleWithDeadline([
    Promise.resolve(['rápido']),
    new Promise(() => {}), // nunca resuelve
    Promise.reject(new Error('fallo'))
  ], Date.now() + 120);
  const elapsed = Date.now() - started;

  assert.ok(elapsed < 1000, `tardó ${elapsed} ms`);
  assert.equal(settled[0].status, 'fulfilled');
  assert.deepEqual(settled[0].value, ['rápido']);
  assert.equal(settled[1].status, 'rejected');
  assert.match(settled[1].reason.message, /Tiempo agotado/);
  assert.equal(settled[2].status, 'rejected');
});

/* ------------------------------------------------------- endpoint /sub/… */

test('proxy /sub/: descarga un zip, extrae el SRT y responde con CORS', async (t) => {
  const axios = require('axios');
  const main = require('../index');
  const { getSecret } = require('../src/proxy');

  const originalGet = axios.get;
  axios.get = async () => ({
    status: 200,
    data: makeZip([
      { name: 'pelicula.eng.srt', data: SRT, deflate: true },
      { name: 'pelicula.spa.srt', data: Buffer.from(SRT, 'utf8') }
    ]),
    headers: { 'content-type': 'application/zip' }
  });
  t.after(() => { axios.get = originalGet; });

  const server = main.app.listen(0, '127.0.0.1');
  t.after(() => new Promise((resolve) => server.close(resolve)));
  await new Promise((resolve) => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;

  const token = signToken({ u: 'https://example.org/x.zip', l: 'spa' }, getSecret(), 60);
  const ok = await fetch(`${base}/sub/${token}.srt`);
  assert.equal(ok.status, 200);
  assert.equal(ok.headers.get('access-control-allow-origin'), '*');
  assert.match(ok.headers.get('content-type'), /text\/plain/);
  assert.match(await ok.text(), /Hola/);

  const bad = await fetch(`${base}/sub/esto-no-es-un-token.srt`);
  assert.equal(bad.status, 403);
});

/* ------------------------------------------------------------ agregador */

test('runProviders: proxifica, prioriza idiomas y corta al proveedor lento', async () => {
  const config = require('../src/config');
  const { runProviders } = require('../index');

  const previousBase = config.publicBaseUrl;
  config.publicBaseUrl = 'https://addon.test';

  const fakeProviders = [
    { name: 'a', search: async () => [{ id: '1', url: 'https://x.test/en.srt', lang: 'eng', release: 'R' }] },
    { name: 'b', search: async () => [{ id: '2', url: 'https://x.test/es.srt', lang: 'spa', release: 'R' }] },
    { name: 'lento', search: () => new Promise(() => {}) }
  ];

  try {
    const result = await runProviders(
      { type: 'movie', imdbId: 'tt0111161', title: 'X' },
      Date.now() + 150,
      { providers: fakeProviders, onlyPreferred: false }
    );

    assert.equal(result.subtitles.length, 2);
    assert.deepEqual(result.subtitles.map((s) => s.lang), ['spa', 'eng']);
    assert.deepEqual(Object.keys(result.subtitles[0]).sort(), ['id', 'lang', 'url']);
    assert.match(result.subtitles[0].url, /^https:\/\/addon\.test\/sub\/[A-Za-z0-9_.-]+\.srt$/);
    assert.equal(result.detailed.find((d) => d.name === 'lento').ok, false);
    assert.equal(result.detailed.find((d) => d.name === 'a').count, 1);
  } finally {
    config.publicBaseUrl = previousBase;
  }
});

/* ------------------------------------------------------------- subscene */

test('Subscene /suggest: el IMDb del JSON manda sobre el título', () => {
  const { _test } = require('../src/providers/subscene');
  const items = _test.parseSuggestResponse({
    film: [{ id: 1, name: 'Otra película', year: '2020', imdb: '0111161' }],
    tv: [
      { id: 2, name: 'Otra serie - First Season', year: '2011', imdb: '0944947' },
      { id: 3, name: 'La que buscamos - First Season', year: '2011', imdb: '9999999' }
    ]
  });

  assert.equal(items[0].imdbId, 'tt0111161');
  const movie = _test.pickSuggestTitle(items, { type: 'movie', title: 'La que buscamos', year: 2020, imdbId: 'tt0111161' });
  assert.equal(movie.id, '1');

  const season = _test.pickSeasonTitle(items.filter((i) => i.kind === 'tv'), {
    title: 'Otra serie', season: 1, imdbId: 'tt0944947'
  });
  assert.equal(season.id, '2');
});
