import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';

const bundle = await build({ entryPoints: ['src/reading.ts'], bundle: true, platform: 'node', format: 'esm', write: false });
const reading = await import(
  `data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`
);
const { READING_PASSAGES, READING_PASSAGES: passages, alignManual, alignReading, normalizeReadingWord, passagesForLevel, readingStars, readingXp, readingWordsMatch, spokenWords, tokenizeReading } = reading;

test('cada color tiene al menos dos textos y los tres idiomas completos', () => {
  assert.deepEqual([...new Set(passages.map((p) => p.level))].sort(), ['infantil', 'prim12', 'prim34', 'prim56']);
  for (const level of ['infantil', 'prim12', 'prim34', 'prim56']) {
    const list = passagesForLevel(level);
    assert.ok(list.length >= 2, `Faltan textos para ${level}`);
    for (const passage of list) {
      for (const lang of ['es', 'eu', 'en']) {
        const text = passage.text[lang];
        assert.ok(text && text.trim().length > 5, `Texto vacío ${passage.id}.${lang}`);
        assert.ok(tokenizeReading(text).length >= 3, `Texto demasiado corto ${passage.id}.${lang}`);
      }
    }
  }
});

test('el texto se divide en palabras sin puntuación para comparar', () => {
  const tokens = tokenizeReading('Mi gato, ¿es pequeño? ¡Sí!');
  assert.deepEqual(tokens.map((t) => t.text), ['Mi', 'gato,', '¿es', 'pequeño?', '¡Sí!']);
  assert.deepEqual(tokens.map((t) => t.clean), ['mi', 'gato', 'es', 'pequeno', 'si']);
  assert.equal(normalizeReadingWord('ÁRBOL'), 'arbol');
});

test('seguimiento: leer todo marca todas las palabras como leídas', () => {
  const tokens = tokenizeReading('El gato duerme en casa');
  const heard = spokenWords('el gato duerme en casa');
  const alignment = alignReading(tokens, heard);
  assert.deepEqual(alignment.states, ['read', 'read', 'read', 'read', 'read']);
  assert.equal(alignment.matched, 5);
  assert.equal(alignment.ratio, 1);
  assert.equal(alignment.lastRead, 4);
});

test('seguimiento: una palabra saltada se marca y la lectura continúa', () => {
  const tokens = tokenizeReading('El gato negro duerme');
  const alignment = alignReading(tokens, spokenWords('el gato duerme'));
  assert.deepEqual(alignment.states, ['read', 'read', 'skipped', 'read']);
  assert.equal(alignment.matched, 3);
});

test('seguimiento: la siguiente palabra pendiente es la actual', () => {
  const tokens = tokenizeReading('El gato duerme en casa');
  const alignment = alignReading(tokens, spokenWords('el gato'));
  assert.deepEqual(alignment.states, ['read', 'read', 'current', 'pending', 'pending']);
});

test('seguimiento: tolera tildes, mayúsculas y palabras a medio reconocer', () => {
  assert.equal(readingWordsMatch('ARBOL', 'árbol'), true);
  assert.equal(readingWordsMatch('pequeno', 'pequeño'), true);
  assert.equal(readingWordsMatch('katu', 'katua'), true);
  assert.equal(readingWordsMatch('cas', 'casa'), true);
  assert.equal(readingWordsMatch('casas', 'casa'), true);
  assert.equal(readingWordsMatch('perro', 'gato'), false);
  assert.equal(readingWordsMatch('', 'gato'), false);
});

test('seguimiento sin micrófono: las palabras tocadas cuentan como leídas', () => {
  const tokens = tokenizeReading('sol luna pan');
  const alignment = alignManual(tokens, [0, 2]);
  assert.deepEqual(alignment.states, ['read', 'current', 'read']);
  assert.equal(alignment.matched, 2);
});

test('las estrellas premian la lectura completa sin castigar los fallos', () => {
  assert.equal(readingStars(10, 10), 3);
  assert.equal(readingStars(7, 10), 2);
  assert.equal(readingStars(2, 10), 1);
  assert.equal(readingStars(0, 0), 1);
  assert.equal(readingXp(0, 1), 7);
  assert.ok(readingXp(50, 3) <= 36, 'el XP de una lectura debe tener un tope');
});

test('no hay textos repetidos y todos tienen título', () => {
  const ids = new Set(READING_PASSAGES.map((p) => p.id));
  assert.equal(ids.size, READING_PASSAGES.length);
  for (const passage of READING_PASSAGES) {
    assert.ok(passage.title.es && passage.title.eu && passage.title.en, `Título incompleto en ${passage.id}`);
    assert.ok(passage.emoji, `Falta emoji en ${passage.id}`);
  }
});
