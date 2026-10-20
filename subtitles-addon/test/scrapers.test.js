'use strict';

// Tests de los PARSERS (funciones puras HTML/JSON -> objetos) con fixtures
// que reproducen la estructura verificada de subdl.com y subsource.net.
// Nada de red: rápidos y deterministas.

const test = require('node:test');
const assert = require('node:assert/strict');

const subdl = require('../src/providers/subdl');
const subsource = require('../src/providers/subsource');
const { normalizeItem } = require('../src/providers/index');
const { parseSeasonEpisode, classifyRelease, slugifyTitle } = require('../src/utils/release');
const { code2ToSlug, isLanguageSlug, slugToIso6392 } = require('../src/utils/languages');
const { parseCinemetaMeta } = require('../src/utils/cinemeta');

const sd = subdl._test;
const ss = subsource._test;

/* ---------------------------------------------------------------- SubDL */

const SUBDL_SEARCH_HTML = `
<div>
  <a href="/subtitle/sd9929/the-shawshank-redemption">
    <img alt="The Shawshank Redemption"> <b>The Shawshank Redemption (1994)</b> movie 366 subtitles
  </a>
  <a href="/subtitle/sd1300025/game-of-thrones">
    <b>Game of Thrones (2011)</b> tv 1010 subtitles
  </a>
  <a href="/sc/the-shawshank-redemption">The Shawshank Redemption (1994) movie 373 subtitles</a>
</div>`;

test('SubDL search: tarjetas con título/año/tipo y sin enlaces de la sección /sc/', () => {
  const cards = sd.parseSubdlSearch(SUBDL_SEARCH_HTML, 'https://subdl.com/search/x');
  assert.equal(cards.length, 2);
  assert.deepEqual(
    cards.map((c) => [c.title, c.year, c.mediaType]),
    [['The Shawshank Redemption', 1994, 'movie'], ['Game of Thrones', 2011, 'tv']]
  );
  assert.equal(cards[0].url, 'https://subdl.com/subtitle/sd9929/the-shawshank-redemption');

  // Stremio pide movie/series: debe elegir la tarjeta del tipo correcto.
  const pick = sd.pickBestTitle(cards, { type: 'series', title: 'Game of Thrones', year: 2011 });
  assert.equal(pick.sdId, 'sd1300025');
  const pickMovie = sd.pickBestTitle(cards, { type: 'movie', title: 'The Shawshank Redemption', year: 1994 });
  assert.equal(pickMovie.sdId, 'sd9929');
});

const SUBDL_LISTING_HTML = `
<a href="/subtitle/sd6642/blitz/english">EN <b>English</b></a>
<h3>Bluray</h3>
<ul>
  <li>
    <a href="/s/info/eRQVjM7emv/blitz"><b>Blitz.2011.1080p.BluRay.x264.VPPV ONLY</b></a>
    <a href="/u/joseph">(joseph bloe)</a>
    <a href="https://dl.subdl.com/subtitle/186635-1276737.zip">Quick Download</a>
  </li>
  <li>
    <a href="/s/info/GKwAtKtl7h/blitz"><b>Blitz.2011.720p.BrRip.x264.YIFY</b></a>
    <a href="https://dl.subdl.com/subtitle/186639-826006.zip">Quick Download</a>
  </li>
</ul>
<a href="/subtitle/sd6642/blitz/spanish">ES <b>Spanish</b></a>
<ul>
  <li>
    <a href="/s/info/AbCdEfGh12/blitz"><b>Blitz.2011.720p.BluRay.x264-GRP</b></a>
    <a href="https://dl.subdl.com/subtitle/186700-463268.zip">Quick Download</a>
  </li>
</ul>`;

test('SubDL listado: idioma por grupo, release y Quick Download emparejados', () => {
  const items = sd.parseSubdlListing(SUBDL_LISTING_HTML, 'https://subdl.com/subtitle/sd6642/blitz');
  assert.equal(items.length, 3);
  assert.deepEqual(items.map((i) => i.lang), ['eng', 'eng', 'spa']);
  assert.equal(items[0].release, 'Blitz.2011.1080p.BluRay.x264.VPPV ONLY');
  assert.equal(items[0].infoCode, 'eRQVjM7emv');
  assert.equal(items[0].downloadUrl, 'https://dl.subdl.com/subtitle/186635-1276737.zip');
  assert.equal(items[0].isArchive, true);
  assert.equal(items[2].release, 'Blitz.2011.720p.BluRay.x264-GRP');
});

const SUBDL_INFO_HTML = `
<html><head><title>Download English Subtitles for In vitro (2026) - Season 1</title></head>
<body>
  <h3>Release info</h3>
  <p>In Vitro S01E01 Hope 1080p AMZN WEB-DL DDP5 1 H 264-RAWR [eng]</p>
  <p>A Commentary by shine021</p>
  <h3>Tags</h3><p>webdl</p>
  <a href="https://dl.subdl.com/subtitle/bXz7REj5wN/w12UfMjK1m">Download English Subtitle for Mobile</a>
  <a href="https://dl.subdl.com/subtitle/3732205-8653867">Download English Subtitle</a>
</body></html>`;

test('SubDL ficha /s/info/: prefiere el archivo individual al .zip y extrae idioma/release', () => {
  const info = sd.parseSubdlInfoPage(SUBDL_INFO_HTML, 'https://subdl.com/s/info/bXz7REj5wN/in-vitro');
  assert.equal(info.downloadUrl, 'https://dl.subdl.com/subtitle/bXz7REj5wN/w12UfMjK1m');
  assert.equal(info.isArchive, false);
  assert.equal(info.lang, 'eng');
  assert.match(info.release, /S01E01/);
});

test('SubDL temporadas: slugs ordinales y localización en la ficha de la serie', () => {
  assert.equal(sd.seasonSlug(0), 'specials-season');
  assert.equal(sd.seasonSlug(1), 'first-season');
  assert.equal(sd.seasonSlug(8), 'eighth-season');
  assert.equal(sd.seasonSlug(21), 'twenty-first-season');

  const html = `
    <a href="/subtitle/sd1300025/game-of-thrones/specials-season"><b>Specials</b> Specials Season</a>
    <a href="/subtitle/sd1300025/game-of-thrones/first-season"><b>Season 1</b> First Season</a>
    <a href="/subtitle/sd1300025/game-of-thrones/second-season"><b>Season 2</b> Second Season</a>`;
  const url = sd.findSubdlSeasonUrl(html, 'https://subdl.com/subtitle/sd1300025/game-of-thrones', 2);
  assert.equal(url, 'https://subdl.com/subtitle/sd1300025/game-of-thrones/second-season');
});

test('SubDL API (reserva): parsea la forma real {results, subtitles} y prefiere unpack_files', () => {
  const data = {
    status: true,
    results: [{ imdb_id: 'tt1375666', sd_id: 123456, name: 'Inception', year: 2010 }],
    subtitles: [
      { release_name: 'Inception.2010.1080p.BluRay.x264', name: 'x.zip', lang: 'english', url: '/subtitle/3197651-3213944.zip', season: 0, episode: 0 },
      {
        release_name: 'Show.S01E01.1080p.WEB', language: 'ES', url: '/subtitle/111-222.zip', season: 1, episode: 1,
        unpack_files: [{ file_n_id: 'file123', name: 'Episode.One.srt', release_name: 'Show.S01E01.720p.WEB', season: 1, episode: 1, language: 'ES', format: 'srt', url: '/subtitle/111/file123' }]
      }
    ]
  };
  const movie = sd.parseSubdlApiResponse(data, {});
  assert.equal(movie[0].url, 'https://dl.subdl.com/subtitle/3197651-3213944.zip');
  assert.equal(movie[0].lang, 'eng');
  assert.equal(movie[0].release, 'Inception.2010.1080p.BluRay.x264');
  // El archivo suelto de unpack gana al .zip del pack
  assert.equal(movie[1].url, 'https://dl.subdl.com/subtitle/111/file123');
  assert.equal(movie[1].lang, 'spa');
  assert.equal(movie[1].archive, false);
  // Pidiendo el episodio 2, el subtítulo del episodio 1 queda descartado
  const ep2 = sd.parseSubdlApiResponse(data, { season: 1, episode: 2 });
  assert.equal(ep2.some((s) => s.url.includes('file123')), false);
});

/* ------------------------------------------------------------ SubSource */

const SS_LISTING_HTML = `
<a href="https://www.imdb.com/title/tt27369017/">IMDb 7/10</a>
<table>
  <tr><th></th><th>Language</th><th>Release Name</th><th>H.I.</th><th>Type</th><th>Owner</th><th>Caption</th></tr>
  <tr>
    <td></td>
    <td><a href="/subtitle/hope-2026/arabic/10269188">Arabic</a></td>
    <td><a href="/subtitle/hope-2026/arabic/10269188">Hope.2026.1080p.AMZN.WEB-DL.DDP5.1.x265-R415</a></td>
    <td></td>
    <td><a href="/subtitle/hope-2026/arabic/10269188">WEB</a></td>
    <td><a href="/u/1326734">Fuadkhafajy</a></td>
    <td><a href="/subtitle/hope-2026/arabic/10269188">WEB Team caption text here</a></td>
  </tr>
  <tr>
    <td></td>
    <td><a href="/subtitle/hope-2026/arabic/10269188">Arabic</a></td>
    <td><a href="/subtitle/hope-2026/arabic/10269188">Hopeu.2026.720p.WEBRip.x264-YIFY</a></td>
    <td></td>
    <td><a href="/subtitle/hope-2026/arabic/10269188">WEB</a></td>
    <td><a href="/u/1326734">Fuadkhafajy</a></td>
    <td><a href="/subtitle/hope-2026/arabic/10269188">WEB Team caption text here</a></td>
  </tr>
  <tr>
    <td></td>
    <td><a href="/subtitle/hope-2026/spanish_spain/10270001">Spanish (Spain)</a></td>
    <td><a href="/subtitle/hope-2026/spanish_spain/10270001">Hope.2026.2160p.AMZN.WEB-DL.DDP5.1.H.265-GRP</a></td>
    <td></td>
    <td><a href="/subtitle/hope-2026/spanish_spain/10270001">WEB</a></td>
    <td><a href="/u/999">Alguien</a></td>
    <td><a href="/subtitle/hope-2026/spanish_spain/10270001">2h 37m 01s</a></td>
  </tr>
</table>`;

test('SubSource listado: dedupe por id (varios releases), idioma ISO y release correcto', () => {
  const items = ss.parseSubsourceListing(SS_LISTING_HTML, 'https://subsource.net/subtitles/hope-2026');
  assert.equal(items.length, 2); // el árabe salía en 2 filas con el mismo id
  assert.equal(items[0].subtitleId, '10269188');
  assert.equal(items[0].lang, 'ara');
  assert.equal(items[0].releases.length, 2);
  assert.match(items[0].release, /1080p\.AMZN/);
  assert.equal(items[0].detailUrl, 'https://subsource.net/subtitle/hope-2026/arabic/10269188');
  assert.equal(items[1].lang, 'spa'); // spanish_spain -> spa (¡sin confundirlo con el caption "2h 37m 01s"!)
  assert.match(items[1].release, /2160p/);

  // La página referencia su tt...: así verificamos slugs adivinados.
  assert.deepEqual([...ss.pageImdbIds(SS_LISTING_HTML)], ['tt27369017']);
});

const SS_DETAIL_HTML = `
<html><head><title>Hope (2026) - English Subtitle | SubSource</title></head>
<body>
  <p>Release Info: Copy all Hopeu.2026.1080p.AMZN.WEB-DL.DD+5.1.H.264-playWEB</p>
  <p>A Commentary By: RetailSub</p>
  <a href="https://api.subsource.net/v1/subtitle/download/2be69cee4d8eb343111c8c331e5de960296e9540fe1c41b153555c0bb38ee2f2">Download English Subtitle</a>
  <p>Subtitle Details Files: 1 (86,961 Bytes)</p>
</body></html>`;

test('SubSource ficha: token de descarga, release e idioma', () => {
  const detail = ss.parseSubsourceDetail(SS_DETAIL_HTML, 'https://subsource.net/subtitle/hope-2026/english/10269141');
  assert.equal(
    detail.downloadUrl,
    'https://api.subsource.net/v1/subtitle/download/2be69cee4d8eb343111c8c331e5de960296e9540fe1c41b153555c0bb38ee2f2'
  );
  assert.equal(detail.lang, 'eng');
  assert.match(detail.release, /playWEB/);
});

test('SubSource slugs: película con año, serie con y sin año', () => {
  assert.deepEqual(
    ss.subsourceSlugCandidates({ type: 'movie', title: 'The Shawshank Redemption', year: 1994 }),
    ['the-shawshank-redemption-1994', 'the-shawshank-redemption']
  );
  assert.deepEqual(
    ss.subsourceSlugCandidates({ type: 'series', title: 'Game of Thrones', year: 2011, season: 1 }),
    ['game-of-thrones/season-1', 'game-of-thrones-2011/season-1']
  );
  // Episodios: el pack de temporada NO es el episodio, y otro E es mismatch.
  assert.equal(ss.classifyCandidate({ releases: ['Game.of.Thrones.Season1.720p.BluRay.x264'] }, 1, 3), 'pack');
  assert.equal(ss.classifyCandidate({ releases: ['Game Of Thrones S01E03 Lord Snow'] }, 1, 3), 'episode');
  assert.equal(ss.classifyCandidate({ releases: ['Game Of Thrones S01E04 Whatever'] }, 1, 3), 'mismatch');
});

/* ------------------------------------------------------------- utilidades */

test('release: parseo SxxExx / NxNN y clasificación frente al episodio pedido', () => {
  assert.deepEqual(parseSeasonEpisode('Show.S01E05.1080p'), { season: 1, episode: 5 });
  assert.deepEqual(parseSeasonEpisode('Show.2x07.HDTV'), { season: 2, episode: 7 });
  assert.equal(classifyRelease('Show.S01.Complete.720p', 1, 5), 'pack');
  assert.equal(classifyRelease('Show.S01E04.720p', 1, 5), 'mismatch');
  assert.equal(slugifyTitle("Marvel's Agents of S.H.I.E.L.D."), 'marvels-agents-of-s-h-i-e-l-d');
});

test('idiomas: slugs de SubDL/SubSource e ISO 639-2', () => {
  assert.equal(code2ToSlug('ES'), 'spanish');
  assert.equal(code2ToSlug('en'), 'english');
  assert.equal(isLanguageSlug('english'), true);
  assert.equal(isLanguageSlug('first-season'), false);
  assert.equal(slugToIso6392('spanish_spain'), 'spa');
  assert.equal(slugToIso6392('portuguese_brazil'), 'por');
  assert.equal(slugToIso6392('albanian'), 'alb');
});

test('cinemeta: extrae título y primer año de releaseInfo', () => {
  assert.deepEqual(
    parseCinemetaMeta({ meta: { name: 'Game of Thrones', releaseInfo: '2011-2019' } }),
    { title: 'Game of Thrones', year: 2011 }
  );
  assert.equal(parseCinemetaMeta({ meta: {} }), null);
  assert.equal(parseCinemetaMeta(null), null);
});

test('normalización Stremio {id, url, lang}: id de proveedor prefijado, extras fuera', () => {
  const item = normalizeItem('subsource', {
    id: 10269141,
    url: 'https://api.subsource.net/v1/subtitle/download/abc',
    lang: 'eng',
    release: 'Hopeu.2026.1080p...',
    provider: 'subsource'
  });
  assert.deepEqual(item, {
    id: 'subsource-10269141',
    url: 'https://api.subsource.net/v1/subtitle/download/abc',
    lang: 'eng'
  });
  assert.equal(normalizeItem('subdl', { url: 'notaurl', lang: 'spa' }), null);
  const hashed = normalizeItem('subdl', { url: 'https://dl.subdl.com/subtitle/x.zip', lang: 'spa' });
  assert.match(hashed.id, /^subdl-[0-9a-f]{10}$/);
});

test('robustez: sin título ni IMDb, los proveedores devuelven [] sin lanzar ni tocar la red', async () => {
  if (process.env.SUBDL_API_KEY || process.env.SUBSOURCE_API_KEY) return; // con claves sí habría llamada de reserva
  assert.deepEqual(await subdl.search({ type: 'movie' }), []);
  assert.deepEqual(await subsource.search({ type: 'movie' }), []);
});
