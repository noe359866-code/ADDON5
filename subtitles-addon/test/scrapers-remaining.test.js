'use strict';

// Tests de los PARSERS de YTS-Subs, Subscene (sub-scene.com) e IndexSubtitle
// con fixtures que reproducen la estructura verificada de cada web.
// Sin red: rápidos y deterministas.

const test = require('node:test');
const assert = require('node:assert/strict');

const ytsSubs = require('../src/providers/ytsSubs');
const subscene = require('../src/providers/subscene');
const indexSubtitle = require('../src/providers/indexSubtitle');
const { toIso6392 } = require('../src/utils/languages');

const yts = ytsSubs._test;
const scene = subscene._test;
const idx = indexSubtitle._test;

/* --------------------------------------------------------------- YTS-Subs */

const YTS_LISTING_HTML = `
<h2>The Shawshank Redemption (1994)</h2>
<a href="https://www.imdb.com/title/tt0111161">IMDB link</a>
<table>
  <tr><th>Rating</th><th>Language</th><th>Release</th><th>Uploader</th><th>Download</th></tr>
  <tr>
    <td>0</td><td><span class="sub-lang">Arabic</span></td>
    <td><a href="/subtitles/the-shawshank-redemption-1994-arabic-yify-125583"><span>subtitle</span> The.Shawshank.Redemption.1994.720p.BluRay.x264.[YTS.AG]</a></td>
    <td>sub</td>
    <td><a href="/subtitles/the-shawshank-redemption-1994-arabic-yify-125583">download</a></td>
  </tr>
  <tr>
    <td>3</td><td><span class="sub-lang">Arabic</span></td>
    <td><a href="/subtitles/the-shawshank-redemption-1994-arabic-yify-125590"><span>subtitle</span> The.Shawshank.Redemption.1994.720p.BluRay.x264.[YTS.AG]</a></td>
    <td>sub</td>
    <td><a href="/subtitles/the-shawshank-redemption-1994-arabic-yify-125590">download</a></td>
  </tr>
  <tr>
    <td>1</td><td><span class="sub-lang">Brazilian Portuguese</span></td>
    <td><a href="/subtitles/the-shawshank-redemption-1994-brazilian-portuguese-yify-125607"><span>subtitle</span> The.Shawshank.Redemption.1994.1080p.BluRay.x264.[YTS.AG]</a></td>
    <td>Harley29</td>
    <td><a href="/subtitles/the-shawshank-redemption-1994-brazilian-portuguese-yify-125607">download</a></td>
  </tr>
  <tr>
    <td>2</td><td><span class="sub-lang">Spanish</span></td>
    <td><a href="/subtitles/the-shawshank-redemption-1994-spanish-yify-125700"><span>subtitle</span> The.Shawshank.Redemption.1994.720p.BrRip.x264-YIFY</a></td>
    <td>sub</td>
    <td><a href="/subtitles/the-shawshank-redemption-1994-spanish-yify-125700">download</a></td>
  </tr>
  <tr>
    <td>0</td><td><span class="sub-lang">Farsi/Persian</span></td>
    <td><a href="/subtitles/the-shawshank-redemption-1994-farsi-persian-yify-125701"><span>subtitle</span> The.Shawshank.Redemption.1994.BluRay</a></td>
    <td>sub</td>
    <td><a href="/subtitles/the-shawshank-redemption-1994-farsi-persian-yify-125701">download</a></td>
  </tr>
</table>`;

test('YTS listado /movie-imdb/: dedupe por idioma+release (gana rating) y zip singular', () => {
  const items = yts.parseYtsListing(YTS_LISTING_HTML, 'https://www.yts-subs.com/movie-imdb/tt0111161');
  assert.equal(items.length, 4); // el árabe duplicado cuenta una sola vez
  const byLang = Object.fromEntries(items.map((i) => [i.lang, i]));
  assert.deepEqual(Object.keys(byLang).sort(), ['ara', 'per', 'por', 'spa']);
  assert.equal(byLang.ara.subtitleId, '125590'); // rating 3 gana al de rating 0
  assert.equal(byLang.ara.rating, 3);
  assert.equal(byLang.spa.release, 'The.Shawshank.Redemption.1994.720p.BrRip.x264-YIFY');
  // La peculiaridad YIFY: /subtitles/{slug} -> /subtitle/{slug}.zip
  assert.equal(
    byLang.spa.downloadUrl,
    'https://www.yts-subs.com/subtitle/the-shawshank-redemption-1994-spanish-yify-125700.zip'
  );
  assert.equal(
    yts.buildYtsZipUrl('/subtitles/rango-english-yify-1787', 'https://yifysubtitles.ch/movie-imdb/tt1192628'),
    'https://yifysubtitles.ch/subtitle/rango-english-yify-1787.zip'
  );
  // Orden: primero los idiomas deseados (spa), dentro por rating
  const ordered = yts.sortCandidates(items, ['spa', 'eng']);
  assert.equal(ordered[0].lang, 'spa');
});

test('YTS: buscador de reserva y ficha de detalle', () => {
  const searchHtml = `
    <a href="/movie-imdb/tt0111161"><h3>The Shawshank Redemption</h3></a>
    <a href="/movie-imdb/tt0111161">ver</a>
    <a href="/movie-imdb/tt0137523"><h3>Fight Club</h3></a>`;
  const hits = yts.parseYtsSearch(searchHtml, 'https://www.yts-subs.com/search/x');
  assert.deepEqual(hits.map((h) => h.imdbId), ['tt0111161', 'tt0137523']);

  const detailHtml = `
    <ul><li>Arabic Language:</li><li>sub Uploader:</li></ul>
    <p>The.Shawshank.Redemption.1994.720p.BluRay.x264.[YTS.AG]</p>
    <a href="/subtitle/the-shawshank-redemption-1994-arabic-yify-125583.zip">DOWNLOAD SUBTITLE</a>`;
  const detail = yts.parseYtsDetail(detailHtml, 'https://www.yts-subs.com/subtitles/the-shawshank-redemption-1994-arabic-yify-125583');
  assert.equal(detail.lang, 'ara');
  assert.match(detail.downloadUrl, /125583\.zip$/);
});

/* --------------------------------------------------------------- Subscene */

test('Subscene /suggest: parseo film+tv y elección por año/tipo', () => {
  const data = {
    film: [{ id: 111, name: 'Hope', year: 2019 }, { id: 222, name: 'Hope', year: 2026 }],
    tv: [{ id: 333, name: 'Hope - First Season', year: 2026 }]
  };
  const items = scene.parseSuggestResponse(data);
  assert.equal(items.length, 3);
  assert.equal(items[0].kind, 'film');

  const pick = scene.pickSuggestTitle(items, { type: 'movie', title: 'Hope', year: 2026 });
  assert.equal(pick.id, '222'); // el de 2026, no el de 2019
});

test('Subscene temporadas: "Title - Third Season" gana a la serie completa', () => {
  const items = [
    { id: '1', name: 'Game of Thrones', kind: 'tv' },
    { id: '2', name: 'Game of Thrones - Second Season', kind: 'tv' },
    { id: '3', name: 'Game of Thrones - Third Season', kind: 'tv' }
  ];
  assert.equal(scene.pickSeasonTitle(items, { title: 'Game of Thrones', season: 3 }).id, '3');
  // Títulos con paréntesis/acrónimos entre el nombre y la temporada
  const svu = [{ id: '9', name: 'Law & Order: Special Victims Unit (SVU) - Tenth Season', kind: 'tv' }];
  assert.equal(
    scene.pickSeasonTitle(svu, { title: 'Law & Order: Special Victims Unit', season: 10 }).id, '9');
  // Sin página de temporada: cae a la ficha general de la serie
  assert.equal(scene.pickSeasonTitle(items, { title: 'Game of Thrones', season: 7 }).id, '1');
});

const SUBSCENE_LISTING_HTML = `
<a href="https://www.imdb.com/title/tt20969586">Imdb</a>
<table>
  <tr>
    <td class="a1"><a href="/subtitle/3360217"><span class="l r positive-icon">Arabic</span> <span class="new">Thunderbolts.2025.WEB.H264-RBB</span></a></td>
    <td class="a3">1</td><td class="a4"><a href="/u/65510">Mandoz</a></td><td class="a5">AMZN</td>
  </tr>
  <tr>
    <td class="a1"><a href="/subtitle/3360217"><span class="l r positive-icon">Arabic</span> <span class="new">Thunderbolts.2025.720p.WEBRip.x264-YIFY</span></a></td>
    <td class="a3">1</td><td class="a4"><a href="/u/65510">Mandoz</a></td><td class="a5">AMZN</td>
  </tr>
  <tr>
    <td class="a1"><a href="/subtitle/3360227"><span class="l r positive-icon">English</span> <span class="new">Thunderbolts.2025.Multi.2160p.HDR.DV.WEB-DL.H265-Slay3R</span></a></td>
    <td class="a3">2</td><td class="a4"><a href="/u/37739">JabbaLsk</a></td><td class="a5"></td>
  </tr>
  <tr>
    <td class="a1"><a href="/subtitle/3363833"><span class="l">Chinese BG code</span> <span class="new">Thunderbolts.2025.HYBRID.720p.BluRay</span></a></td>
    <td class="a3">3</td><td class="a4"><a href="/u/70">Dr</a></td><td class="a5"></td>
  </tr>
</table>`;

test('Subscene listado td.a1: span.l + span.new, dedupe por id y /download/{id}', () => {
  const items = scene.parseSubsceneListing(SUBSCENE_LISTING_HTML, 'https://sub-scene.com/subscene/159141');
  assert.equal(items.length, 3); // 3360217 sale en 2 filas (dos releases)
  const ara = items.find((i) => i.subtitleId === '3360217');
  assert.equal(ara.lang, 'ara');
  assert.equal(ara.releases.length, 2);
  assert.equal(ara.downloadUrl, 'https://sub-scene.com/download/3360217');
  assert.equal(items.find((i) => i.subtitleId === '3360227').lang, 'eng');
  assert.equal(items.find((i) => i.subtitleId === '3363833').lang, 'chi'); // "Chinese BG code"
  assert.deepEqual([...scene.pageImdbIds(SUBSCENE_LISTING_HTML)], ['tt20969586']);
});

test('Subscene ficha: idioma del <title>, releases y enlace de descarga', () => {
  const detailHtml = `
    <html><head><title>Subscene - Thunderbolts (Thunderbolts*) - English subtitle</title></head>
    <body>
      <ul>
        <li>Thunderbolts.2025.Multi.2160p.HDR.DV.WEB-DL.H265-Slay3R</li>
        <li>Thunderbolts.2025.1080p.WEBRip.x264.AAC5.1-[YTS.MX]</li>
      </ul>
      <a href="https://sub-scene.com/download/3360227">Download English Subtitle</a>
    </body></html>`;
  const detail = scene.parseSubsceneDetail(detailHtml, 'https://sub-scene.com/subtitle/3360227');
  assert.equal(detail.downloadUrl, 'https://sub-scene.com/download/3360227');
  assert.equal(detail.lang, 'eng');
  assert.equal(detail.releases.length, 2);
  assert.equal(scene.classifyCandidate({ releases: ['Show.Season1.Complete'] }, 1, 3), 'pack');
  assert.equal(scene.classifyCandidate({ releases: ['Show.S01E03.720p'] }, 1, 3), 'episode');
});

/* ----------------------------------------------------------- IndexSubtitle */

const INDEX_PAGE_HTML = `
<html><head><title>Subtitles for: Hope (2026)</title></head>
<body>
<a href="https://www.imdb.com/title/tt27369017/">IMDB</a>
<script>
  var ttl = 987654321;
  $('#subs').DataTable({
    data: [{"title":"Hope.2026.AMZN.WEB-DL [YTS.MX] S01E02","language":"spanish_spain","url":"hope-2026/spanish_spain/555","author":{"name":"Alguien"},"comment":"ok"},{"title":"Hope.2026.1080p.WEBRip.x264-GRP","language":"english","url":"hope-2026/english/556","author":"Bob","comment":""}],
    columns: [{data:'title'},{data:'language'},{data:'author'}]
  });
</script>
</body></html>`;

test('IndexSubtitle: JSON embebido (con [ ] dentro de títulos) + ttl', () => {
  const { ttl, rows } = idx.parseIndexEmbedded(INDEX_PAGE_HTML);
  assert.equal(ttl, '987654321');
  assert.equal(rows.length, 2);
  assert.equal(rows[0].lang, 'spa'); // spanish_spain -> spa
  assert.equal(rows[0].subtitleId, '555');
  assert.equal(rows[0].siteLang, 'spanish_spain');
  assert.match(rows[0].release, /S01E02/);
  assert.equal(rows[1].author, 'Bob');

  // El zipName del JS del sitio: solo quita el PRIMER carácter no-\w
  assert.equal(idx.buildIndexZipName('hope-2026/english/556'), 'hope2026_english_556');
  assert.equal(
    idx.buildIndexDownloadUrl(rows[1], ttl, 'TOKEN123'),
    'https://indexsubtitle.cc/d/556/987654321/TOKEN123/hope2026_english_556.zip'
  );
  assert.deepEqual([...idx.pageImdbIds(INDEX_PAGE_HTML)], ['tt27369017']);
});

test('IndexSubtitle: /search, elección de temporada y slugs', () => {
  const results = idx.parseIndexSearchResults(
    '[{"title":"MobLand (2025)","url":"/subtitles/mobland-2025"},{"title":"MobLand - Season 2 (2025)","url":"/subtitles/mobland-2025/season-2"}]'
  );
  assert.equal(results.length, 2);
  assert.equal(results[0].year, 2025);
  const hit = idx.pickIndexSearchResult(results, { type: 'series', title: 'MobLand', year: 2025, season: 2 });
  assert.equal(hit.url, 'https://indexsubtitle.cc/subtitles/mobland-2025/season-2');

  assert.deepEqual(idx.parseIndexSearchResults(''), []); // cuerpo vacío = sin resultados
  assert.deepEqual(
    idx.indexSubtitleSlugCandidates({ type: 'movie', title: 'The Shawshank Redemption', year: 1994 }),
    ['the-shawshank-redemption-1994', 'the-shawshank-redemption']
  );
});

/* ------------------------------------------------- idiomas raros + API tt? */

test('idiomas peculiares de YTS/Subscene normalizan a ISO 639-2', () => {
  assert.equal(toIso6392('Brazilian Portuguese'), 'por');
  assert.equal(toIso6392('Brazillian Portuguese'), 'por'); // errata real del sitio
  assert.equal(toIso6392('Farsi/Persian'), 'per');
  assert.equal(toIso6392('Ukranian'), 'ukr'); // errata real del sitio
  assert.equal(toIso6392('Chinese BG code'), 'chi');
});

test('API independiente: IMDb ID inválido -> [] sin tocar la red; YTS no hace series', async () => {
  assert.deepEqual(await ytsSubs.getSubtitlesByImdb('no-valido', 'es'), []);
  assert.deepEqual(await subscene.getSubtitlesByImdb('no-valido', 'es'), []);
  assert.deepEqual(await indexSubtitle.getSubtitlesByImdb('', 'es'), []);
  assert.deepEqual(await ytsSubs.search({ type: 'series', imdbId: 'tt0944947' }), []);
});
