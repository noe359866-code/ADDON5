import test from 'node:test';
import assert from 'node:assert/strict';
import { config } from '../src/config.js';
import { lookupTitle, parseSpanishTitlesFromWikitext, parseStremioId, tmdbEnabled } from '../src/titles.js';
import { Deadline } from '../src/http.js';
import { metaCache } from '../src/cache.js';
import { installFetchStub, jsonRoute } from './helpers/stub-fetch.js';

const cinemetaMovie = {
  meta: { id: 'tt0816692', type: 'movie', name: 'Interstellar', originalName: 'Interstellar', year: '2014' }
};

const tmdbMovieSpanish = {
  id: 157336,
  title: 'Interestelar',
  original_title: 'Interstellar',
  release_date: '2014-11-05'
};

/** Aplica config temporal y la restaura al terminar (aunque falle). */
async function withEnv(patch, run) {
  const previous = {};
  for (const key of Object.keys(patch)) previous[key] = config[key];
  Object.assign(config, patch);
  try {
    return await run();
  } finally {
    Object.assign(config, previous);
  }
}

function deadline() {
  return new Deadline(5000);
}

test('parseStremioId entiende IMDb, TMDB y temporadas', () => {
  assert.deepEqual(parseStremioId('tt0816692'), { kind: 'imdb', imdbId: 'tt0816692', tmdbId: null, season: null, episode: null });
  assert.deepEqual(parseStremioId('tt0944947:2:1'), { kind: 'imdb', imdbId: 'tt0944947', tmdbId: null, season: 2, episode: 1 });
  assert.deepEqual(parseStremioId('tmdb:157336'), { kind: 'tmdb', imdbId: null, tmdbId: '157336', season: null, episode: null });
  assert.deepEqual(parseStremioId('tmdb:1399:1:3'), { kind: 'tmdb', imdbId: null, tmdbId: '1399', season: 1, episode: 3 });
  assert.equal(parseStremioId('kitsu:1234'), null);
  assert.equal(parseStremioId(''), null);
});

test('sin TMDB configurado solo se usa Cinemeta', async (t) => {
  metaCache.clear();
  const stub = installFetchStub({
    'https://v3-cinemeta.strem.io/meta/movie/tt0816692.json': jsonRoute(cinemetaMovie)
  });
  t.after(() => stub.restore());

  await withEnv({ tmdbApiKey: '' }, async () => {
    assert.equal(tmdbEnabled(), false);
    const info = await lookupTitle('movie', 'tt0816692', { deadline: deadline() });

    assert.ok(info);
    assert.equal(info.name, 'Interstellar');
    assert.equal(info.year, '2014');
    assert.deepEqual(info.titles, ['Interstellar']);
    assert.deepEqual(info.sources, ['cinemeta']);
    // No se consultó TMDB ni el buscador de IMDb.
    assert.equal(stub.calls.some((call) => call.url.includes('themoviedb')), false);
  });
});

test('con TMDB se añade el título en español para buscar en el sitio', async (t) => {
  metaCache.clear();
  const stub = installFetchStub({
    'https://v3-cinemeta.strem.io/meta/movie/tt0816692.json': jsonRoute(cinemetaMovie),
    'https://api.themoviedb.org/3/find/tt0816692': jsonRoute({ movie_results: [tmdbMovieSpanish], tv_results: [] })
  });
  t.after(() => stub.restore());

  await withEnv({ tmdbApiKey: 'clave-de-prueba', tmdbLanguage: 'es-MX' }, async () => {
    const info = await lookupTitle('movie', 'tt0816692', { deadline: deadline() });

    assert.ok(info);
    // El español va primero: es el idioma de Gnula/GnulaHD.
    assert.deepEqual(info.titles, ['Interestelar', 'Interstellar']);
    assert.equal(info.year, '2014');
    assert.deepEqual(info.sources, ['cinemeta', 'tmdb']);

    const call = stub.calls.find((item) => item.url.includes('/find/tt0816692'));
    assert.match(call.url, /external_source=imdb_id/);
    assert.match(call.url, /language=es-MX/);
    assert.match(call.url, /api_key=clave-de-prueba/);
  });
});

test('un ID de TMDB se traduce con su clave (y admite clave v4)', async (t) => {
  metaCache.clear();
  const stub = installFetchStub({
    'https://api.themoviedb.org/3/movie/157336': jsonRoute(tmdbMovieSpanish)
  });
  t.after(() => stub.restore());

  await withEnv({ tmdbApiKey: 'eyJhbGciOiJIUzI1NiJ9.cuerpo.firma' }, async () => {
    const info = await lookupTitle('movie', 'tmdb:157336', { deadline: deadline() });

    assert.ok(info);
    assert.equal(info.tmdbId, '157336');
    assert.deepEqual(info.titles, ['Interestelar', 'Interstellar']);
    assert.equal(info.year, '2014');

    const call = stub.calls.find((item) => item.url.includes('/movie/157336'));
    assert.equal(call.headers.Authorization, `Bearer ${config.tmdbApiKey}`);
    assert.doesNotMatch(call.url, /api_key=/);
  });
});

test('un ID de TMDB sin clave no se resuelve', async (t) => {
  metaCache.clear();
  const stub = installFetchStub({});
  t.after(() => stub.restore());

  await withEnv({ tmdbApiKey: '' }, async () => {
    assert.equal(await lookupTitle('movie', 'tmdb:157336', { deadline: deadline() }), null);
    assert.equal(stub.calls.length, 0);
  });
});

test('si Cinemeta falla se usa el buscador público de IMDb', async (t) => {
  metaCache.clear();
  const stub = installFetchStub({
    'https://v3-cinemeta.strem.io/meta/series/tt0944947.json': { body: 'no encontrado', status: 404 },
    'https://v2.sg.media-imdb.com/suggestion/t/tt0944947.json': jsonRoute({
      d: [{ id: 'tt0944947', l: 'Game of Thrones', y: 2011, q: 'TV series' }]
    })
  });
  t.after(() => stub.restore());

  await withEnv({ tmdbApiKey: '' }, async () => {
    const info = await lookupTitle('series', 'tt0944947:2:1', { deadline: deadline() });

    assert.ok(info);
    assert.equal(info.name, 'Game of Thrones');
    assert.equal(info.year, '2011');
    assert.deepEqual(info.sources, ['imdb']);
    assert.equal(info.season, 2);
    assert.equal(info.episode, 1);
  });
});

test('sin ninguna fuente que responda se devuelve null', async (t) => {
  metaCache.clear();
  const stub = installFetchStub({});
  t.after(() => stub.restore());

  await withEnv({ tmdbApiKey: '' }, async () => {
    assert.equal(await lookupTitle('movie', 'tt0000000', { deadline: deadline() }), null);
  });
});

test('el resultado se cachea por ID', async (t) => {
  metaCache.clear();
  const stub = installFetchStub({
    'https://v3-cinemeta.strem.io/meta/movie/tt0816692.json': jsonRoute(cinemetaMovie)
  });
  t.after(() => stub.restore());

  await withEnv({ tmdbApiKey: '' }, async () => {
    await lookupTitle('movie', 'tt0816692', { deadline: deadline() });
    const callsAfterFirst = stub.calls.length;

    const again = await lookupTitle('movie', 'tt0816692:0:0', { deadline: deadline() });
    assert.equal(stub.calls.length, callsAfterFirst, 'no debe repetir la petición');
    assert.equal(again.name, 'Interstellar');
  });
});

const interstellarWikitext = `{{Ficha de película
| título original = Interstellar
| título = ''Interestelar'' ([[Hispanoamérica]])
| dirección = Christopher Nolan
| estreno = 2014
}}`;

const wikidataRoutes = (qid = 'Q13417189', article = 'Interstellar') => ({
  'https://www.wikidata.org/w/api.php?action=query&list=search': jsonRoute({
    query: { search: [{ title: qid }] }
  }),
  'https://www.wikidata.org/w/api.php?action=wbgetentities': jsonRoute({
    entities: { [qid]: { id: qid, sitelinks: { eswiki: { site: 'eswiki', title: article } } } }
  })
});

test('de la ficha de Wikipedia se lee el título latino, no el original', () => {
  assert.deepEqual(parseSpanishTitlesFromWikitext(interstellarWikitext), ['Interestelar']);
});

test('se leen todas las variantes por país de la ficha', () => {
  // Caso real de «The Shawshank Redemption»: España, Argentina y el resto.
  const wikitext = "{{Ficha de película\n| título original = ''The Shawshank Redemption''\n"
    + "| título = '''''Cadena perpetua''''' ([[España]])'''''Sueños de libertad''''''''''Escape a la libertad''''' ([[Argentina]])'''''Sueño de fuga''''' (resto de [[Hispanoamérica]])\n}}";
  assert.deepEqual(
    parseSpanishTitlesFromWikitext(wikitext),
    ['Cadena perpetua', 'Sueños de libertad', 'Escape a la libertad', 'Sueño de fuga']
  );

  // Plantilla escrita en una sola línea y campo por país.
  const inline = "{{Ficha de película |título = ''Buscando a Nemo'' |título original = Finding Nemo |estreno = 2003}}";
  assert.deepEqual(parseSpanishTitlesFromWikitext(inline), ['Buscando a Nemo']);

  // Sin ficha (un artículo cualquiera) no se inventa nada.
  assert.deepEqual(parseSpanishTitlesFromWikitext('Interstellar es una película de 2014.'), []);
});

test('sin TMDB, Wikidata+Wikipedia dan el nombre en español con el que buscan las webs', async (t) => {
  metaCache.clear();
  const stub = installFetchStub({
    'https://v3-cinemeta.strem.io/meta/movie/tt0816692.json': jsonRoute(cinemetaMovie),
    ...wikidataRoutes(),
    'https://es.wikipedia.org/w/api.php': jsonRoute({ parse: { title: 'Interstellar', wikitext: interstellarWikitext } })
  });
  t.after(() => stub.restore());

  await withEnv({ tmdbApiKey: '' }, async () => {
    const info = await lookupTitle('movie', 'tt0816692', { deadline: deadline() });

    assert.ok(info);
    // El título español va primero: es el que existe en la ficha de la web.
    assert.deepEqual(info.titles, ['Interestelar', 'Interstellar']);
    assert.deepEqual(info.sources, ['cinemeta', 'wikipedia']);
    // El artículo se busca por ID de IMDb, nunca por nombre (homónimos).
    const search = stub.calls.find((call) => call.url.includes('haswbstatement'));
    assert.ok(search);
    assert.match(decodeURIComponent(search.url), /haswbstatement:P345=tt0816692/);
  });
});

test('si Wikidata no conoce el ID no se adivina el artículo', async (t) => {
  metaCache.clear();
  const stub = installFetchStub({
    'https://v3-cinemeta.strem.io/meta/movie/tt0816692.json': jsonRoute(cinemetaMovie),
    'https://www.wikidata.org/w/api.php?action=query&list=search': jsonRoute({ query: { search: [] } })
  });
  t.after(() => stub.restore());

  await withEnv({ tmdbApiKey: '' }, async () => {
    const info = await lookupTitle('movie', 'tt0816692', { deadline: deadline() });
    assert.deepEqual(info.titles, ['Interstellar']);
    assert.deepEqual(info.sources, ['cinemeta']);
    assert.equal(stub.calls.some((call) => call.url.startsWith('https://es.wikipedia.org')), false);
  });
});

test('con clave de TMDB, su título es-MX va antes que las variantes de Wikipedia', async (t) => {
  metaCache.clear();
  const stub = installFetchStub({
    'https://v3-cinemeta.strem.io/meta/movie/tt0816692.json': jsonRoute(cinemetaMovie),
    'https://api.themoviedb.org/3/find/tt0816692': jsonRoute({
      movie_results: [{ id: 157336, title: 'Interestelar', original_title: 'Interstellar', release_date: '2014-11-05' }],
      tv_results: []
    }),
    ...wikidataRoutes(),
    'https://es.wikipedia.org/w/api.php': jsonRoute({
      parse: {
        title: 'Interstellar',
        // TMDB y la ficha coinciden en «Interestelar»; «Estelar» solo está en Wikipedia.
        wikitext: "{{Ficha de película\n| título = ''Interestelar'' ([[Hispanoamérica]])\n| nombre España = ''Estelar''\n}}"
      }
    })
  });
  t.after(() => stub.restore());

  await withEnv({ tmdbApiKey: 'clave-de-prueba' }, async () => {
    const info = await lookupTitle('movie', 'tt0816692', { deadline: deadline() });

    assert.deepEqual(info.titles, ['Interestelar', 'Estelar', 'Interstellar']);
    assert.deepEqual(info.sources, ['cinemeta', 'tmdb', 'wikipedia']);
  });
});
