import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';

const bundle = await build({ entryPoints: ['src/progress.ts'], bundle: true, platform: 'node', format: 'esm', write: false });
const { awardReadingXp, defaultProgress, parseImportedProgress, sanitizeProgress, todayString } = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
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

test('una lectura terminada suma XP, gemas y racha sin tocar estrellas', () => {
  const patch = awardReadingXp(
    { ...defaultProgress, xp: 10, gems: 100, streak: 2, lastPlayed: todayString(-1) },
    12,
    5,
  );
  assert.equal(patch.xp, 22);
  assert.equal(patch.gems, 105);
  assert.equal(patch.dailyLessons, defaultProgress.dailyLessons + 1);
  assert.equal(patch.streak, 3);
  assert.equal(patch.stars, undefined);
  assert.equal(patch.badges, undefined);
});

test('una lectura no rompe la racha si se deja pasar un día, pero tampoco la inventa', () => {
  const patch = awardReadingXp({ ...defaultProgress, streak: 2, lastPlayed: '2000-01-01' }, 10, 5);
  assert.equal(patch.streak, 2);
  const first = awardReadingXp({ ...defaultProgress, streak: 0, lastPlayed: '' }, 10, 5);
  assert.equal(first.streak, 1);
});

test('el nivel por color es el verde por defecto y los datos antiguos se migran', () => {
  assert.equal(defaultProgress.schoolStage, 'prim12');
  assert.equal(sanitizeProgress({ schoolStage: 'general' }).schoolStage, 'prim12');
  assert.equal(sanitizeProgress({ schoolStage: 'prim34' }).schoolStage, 'prim34');
  assert.equal(sanitizeProgress({ schoolStage: 'inventado' }).schoolStage, 'prim12');
});
