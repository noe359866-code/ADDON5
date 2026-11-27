import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';

const bundle = await build({ entryPoints: ['src/progress.ts'], bundle: true, platform: 'node', format: 'esm', write: false });
const { defaultProgress, parseImportedProgress } = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
const backup = (progress) => JSON.stringify({ app: 'hitzbidaia', version: 1, progress });

test('las vidas son ilimitadas por defecto', () => assert.equal(defaultProgress.unlimitedHearts, true));
test('una copia válida conserva el progreso', () => {
  const restored = parseImportedProgress(backup({ ...defaultProgress, name: 'Ane', xp: 42 }));
  assert.equal(restored?.name, 'Ane');
  assert.equal(restored?.xp, 42);
});
test('rechaza archivos dañados, ajenos o incompletos', () => {
  for (const text of ['not json', '{}', backup({ xp: 2 }), backup({ ...defaultProgress, mistakes: [null] }), backup({ ...defaultProgress, xp: 'no' }), backup({ ...defaultProgress, uiLang: 'xx' })]) {
    assert.equal(parseImportedProgress(text), null);
  }
});
