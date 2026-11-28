import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';

const bundle = await build({ entryPoints: ['src/dictionary.ts'], bundle: true, platform: 'node', format: 'esm', write: false });
const { DICTIONARY_CATEGORIES, DICTIONARY_CATEGORY_LABEL, normalizeSearch, searchDictionary, stageWords } = await import(
  `data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`
);

test('la búsqueda ignora mayúsculas, tildes y signos', () => {
  assert.equal(normalizeSearch('  ÁRBOL '), 'arbol');
  assert.equal(normalizeSearch('¿Pájaro?'), 'pajaro');
});

test('encuentra una palabra escrita con o sin tilde', () => {
  for (const query of ['arbol', 'ÁRBOL', 'árbol']) {
    const hits = searchDictionary(query);
    assert.ok(hits.length > 0, `Sin resultados para ${query}`);
    assert.equal(hits[0].word.id, 'arbol');
    assert.equal(hits[0].exact, true);
  }
});

test('encuentra palabras por su traducción al euskera y al inglés', () => {
  assert.equal(searchDictionary('katu')[0].word.id, 'gato');
  assert.equal(searchDictionary('butterfly')[0].word.id, 'mariposa');
  assert.equal(searchDictionary('ilargi')[0].word.id, 'luna');
});

test('no devuelve nada para una búsqueda inventada', () => {
  assert.deepEqual(searchDictionary('zxqwv'), []);
});

test('el filtro por categoría se respeta', () => {
  const hits = searchDictionary('', { category: 'animales', limit: 50 });
  assert.ok(hits.length > 0);
  assert.ok(hits.every((h) => h.word.cat === 'animales'));
});

test('el límite de resultados funciona y no se repiten palabras', () => {
  const hits = searchDictionary('a', { limit: 5 });
  assert.ok(hits.length <= 5);
  assert.equal(new Set(hits.map((h) => h.word.id)).size, hits.length);
});

test('el idioma de aprendizaje prioriza las coincidencias', () => {
  const hits = searchDictionary('sol', { learnLang: 'eu' });
  assert.ok(hits.some((h) => h.word.id === 'sol'));
  assert.ok(hits[0].matched.includes('eu') || hits[0].matched.includes('es'));
});

test('las palabras de tu color salen primero cuando no hay búsqueda', () => {
  const hits = searchDictionary('', { stage: 'infantil', limit: 12 });
  assert.ok(hits.length > 0);
});

test('cada categoría tiene nombre en castellano y euskera', () => {
  for (const cat of DICTIONARY_CATEGORIES) {
    assert.ok(DICTIONARY_CATEGORY_LABEL[cat]?.es, `Falta nombre en castellano para ${cat}`);
    assert.ok(DICTIONARY_CATEGORY_LABEL[cat]?.eu, `Falta nombre en euskera para ${cat}`);
  }
});

test('el banco filtrado por nivel nunca se queda vacío', () => {
  for (const stage of ['general', 'infantil', 'prim12', 'prim34', 'prim56']) {
    assert.ok(stageWords(stage).length > 10, `Banco vacío para ${stage}`);
  }
});
