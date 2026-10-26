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
