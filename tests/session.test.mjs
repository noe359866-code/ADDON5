import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';

// Empaqueta los módulos TS de src/ para probar la lógica sin React ni DOM.
const progressBundle = await build({ entryPoints: ['src/progress.ts'], bundle: true, platform: 'node', format: 'esm', write: false });
const { defaultProgress } = await import(`data:text/javascript;base64,${Buffer.from(progressBundle.outputFiles[0].text).toString('base64')}`);
const sessionBundle = await build({ entryPoints: ['src/session.ts'], bundle: true, platform: 'node', format: 'esm', write: false });
const { applySessionResult } = await import(`data:text/javascript;base64,${Buffer.from(sessionBundle.outputFiles[0].text).toString('base64')}`);

const TODAY = '2026-11-27';
const YESTERDAY = '2026-11-26';

const base = (patch = {}) => ({ ...defaultProgress, dailyDate: TODAY, ...patch });
const result = (patch = {}) => ({
  mode: 'level',
  levelId: 1,
  nodeKey: undefined,
  total: 10,
  correct: 8,
  xp: 30,
  gemsEarned: 5,
  durationSec: 60,
  stars: 2,
  maxStreak: 3,
  visualStreak: 2,
  audioStreak: 1,
  langsUsed: ['es'],
  perfect: false,
  ...patch,
});

test('suma xp, gemas y corazones (con tope de 5)', () => {
  const next = applySessionResult(base({ xp: 10, gems: 100, hearts: 4 }), result({ xp: 30, gemsEarned: 7, heartsRestored: 3 }), [], TODAY, YESTERDAY);
  assert.equal(next.xp, 40);
  assert.equal(next.gems, 107);
  assert.equal(next.hearts, 5);
  assert.equal(next.sessions, defaultProgress.sessions + 1);
  assert.equal(next.correctTotal, 8);
  assert.equal(next.perfectSessions, 0);
});

test('una sesión perfecta suma 1 a perfectSessions', () => {
  const next = applySessionResult(base(), result({ perfect: true, correct: 10 }), [], TODAY, YESTERDAY);
  assert.equal(next.perfectSessions, 1);
});

test('las estrellas guardan el máximo histórico', () => {
  const prev = base({ stars: { 1: 3 } });
  const next = applySessionResult(prev, result({ stars: 1 }), [], TODAY, YESTERDAY);
  assert.equal(next.stars[1], 3);
});

test('racha: mismo día no cambia; ayer suma 1; hueco reinicia a 1', () => {
  const sameDay = applySessionResult(base({ streak: 4, lastPlayed: TODAY }), result(), [], TODAY, YESTERDAY);
  assert.equal(sameDay.streak, 4);
  const consecutive = applySessionResult(base({ streak: 4, lastPlayed: YESTERDAY }), result(), [], TODAY, YESTERDAY);
  assert.equal(consecutive.streak, 5);
  assert.equal(consecutive.bestStreak, 5);
  const gap = applySessionResult(base({ streak: 9, bestStreak: 9, lastPlayed: '2026-11-20' }), result(), [], TODAY, YESTERDAY);
  assert.equal(gap.streak, 1);
  assert.equal(gap.bestStreak, 9);
});

test('nivel normal sin nodeKey marca el mundo como completado', () => {
  const next = applySessionResult(base(), result({ levelId: 3 }), [], TODAY, YESTERDAY);
  assert.equal(next.completed[3], true);
});

test('mundo 2 (sílabas) exige completar sus nodos para marcarlo completo', () => {
  const partial = applySessionResult(base(), result({ levelId: 2, nodeKey: 'u2-n0' }), [], TODAY, YESTERDAY);
  assert.equal(partial.completed[2], undefined);
  const finishedNode = applySessionResult(base(), result({ levelId: 2, nodeKey: 'u2-n5' }), [], TODAY, YESTERDAY);
  assert.equal(finishedNode.completed[2], true);
  const allNodes = applySessionResult(base({ nodeProgress: { 'u2-n0': 1, 'u2-n1': 1, 'u2-n3': 1 } }), result({ levelId: 2, nodeKey: 'u2-n0' }), [], TODAY, YESTERDAY);
  assert.equal(allNodes.completed[2], true);
});

test('nivel legendario con 2+ estrellas lo marca legendario y completado', () => {
  const next = applySessionResult(base(), result({ mode: 'legendary', levelId: 4, stars: 2, nodeKey: 'u4-n2' }), [], TODAY, YESTERDAY);
  assert.equal(next.legendary[4], true);
  assert.equal(next.completed[4], true);
});

test('los nodos completados se acumulan en nodeProgress', () => {
  const next = applySessionResult(base({ nodeProgress: { 'u1-n0': 2 } }), result({ nodeKey: 'u1-n0' }), [], TODAY, YESTERDAY);
  assert.equal(next.nodeProgress['u1-n0'], 3);
});

test('las insignias no se duplican', () => {
  const next = applySessionResult(base({ badges: ['first'] }), result(), ['first', 'eye'], TODAY, YESTERDAY);
  assert.deepEqual(next.badges, ['first', 'eye']);
});

test('los contadores diarios se reinician si cambia el día', () => {
  const prev = base({ dailyDate: '2026-11-26', dailyXp: 80, dailyLessons: 3, dailyHighAcc: 90 });
  const next = applySessionResult(prev, result({ xp: 20, correct: 7, total: 10 }), [], TODAY, YESTERDAY);
  assert.equal(next.xpHistory[TODAY], 20);
  assert.equal(next.dailyXp, 20);
  assert.equal(next.dailyLessons, 1);
  assert.equal(next.dailyHighAcc, 70);
  assert.equal(next.dailyDate, TODAY);
});

test('los contadores diarios se acumulan el mismo día', () => {
  const prev = base({ dailyXp: 40, dailyLessons: 2, dailyHighAcc: 60, xpHistory: { [TODAY]: 40 } });
  const next = applySessionResult(prev, result({ xp: 20, correct: 9, total: 10 }), [], TODAY, YESTERDAY);
  assert.equal(next.dailyXp, 60);
  assert.equal(next.dailyLessons, 3);
  assert.equal(next.dailyHighAcc, 90);
  assert.equal(next.xpHistory[TODAY], 60);
});

test('una sesión sin preguntas correctas cuenta precisión 100 solo si no hubo total; con total cuenta 0', () => {
  const zero = applySessionResult(base(), result({ correct: 0, total: 10 }), [], TODAY, YESTERDAY);
  assert.equal(zero.dailyHighAcc, 0);
  const empty = applySessionResult(base({ dailyHighAcc: 55 }), result({ correct: 0, total: 0 }), [], TODAY, YESTERDAY);
  assert.equal(empty.dailyHighAcc, 100);
});
