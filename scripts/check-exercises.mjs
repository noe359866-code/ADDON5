/**
 * Comprueba que los generadores producen preguntas válidas en los 8 modos,
 * las 3 rutas, ambos idiomas, 3 dificultades y varios perfiles de apoyo.
 *
 * Uso: npm run check:content
 * No necesita dependencias extra: usa esbuild (ya incluido con Vite) para
 * cargar los módulos TypeScript directamente.
 */
import { build } from 'esbuild';

const result = await build({
  stdin: {
    contents: "export * from './src/exercises'; export * from './src/adaptations';",
    resolveDir: process.cwd(),
    loader: 'ts',
  },
  bundle: true,
  platform: 'node',
  format: 'esm',
  write: false,
  logLevel: 'error',
});
const code = result.outputFiles[0].text;
const mod = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
const { createGenState, pickExercise, adaptationsFor } = mod;

const routes = ['visual', 'auditivo', 'mixta'];
const presets = [null, ['cognitiva', 'dislexia'], ['tea', 'comunicacion'], ['tdah'], ['down']];
const problems = [];
let total = 0;

function check(ex, ctx, ad) {
  const at = `${ctx} modo=${ex.levelId} lang=${ex.lang} ${ex.kind}`;
  const ok = (cond, msg) => { if (!cond) problems.push(`${at}: ${msg}`); };
  ok(!!ex.prompt && !ex.prompt.includes('{'), 'prompt vacío o sin interpolar');
  ok(!ex.prompt.startsWith('cat') && !ex.prompt.includes('undefined'), 'clave de traducción no encontrada');
  ok(!!ex.eyebrow && !!ex.hint && !!ex.explanation, 'falta texto de apoyo');
  ok(!ex.explanation.includes('{'), 'explicación sin interpolar');
  ok(!!ex.display, 'sin bloque visual');
  if (ex.audio) ok(ex.audio.lang === ex.lang, 'audio en otro idioma');
  const minOptions = ad ? ad.optionCount : 3;
  if (ex.kind === 'choice' || ex.kind === 'story') {
    const opts = ex.options ?? [];
    ok(opts.length >= minOptions, 'menos opciones de las debidas');
    ok(opts.some((o) => o.id === ex.correctId), 'respuesta correcta ausente');
    ok(new Set(opts.map((o) => o.label)).size === opts.length, 'opciones repetidas');
    ok(opts.every((o) => o.label.length > 0), 'opción vacía');
  }
  if (ex.kind === 'action') {
    ok(!!ex.action && !!ex.action.emoji && !!ex.action.text, 'juego imperativo incompleto');
    ok(!ex.options, 'un juego imperativo no debería tener opciones');
  }
  if (ex.kind === 'tap') {
    ok((ex.chips ?? []).length >= 2, 'demasiado pocas piezas');
    ok((ex.chips ?? []).some((c) => c.id === ex.correctChip), 'pieza correcta ausente');
  }
  if (ex.kind === 'build') {
    ok((ex.tiles ?? []).length >= 2, 'demasiado pocas fichas');
    ok(ex.correctOrder?.length === ex.tiles?.length, 'orden incorrecto');
    ok(ex.correctOrder?.every((id) => ex.tiles.some((t) => t.id === id)), 'ficha inexistente en el orden');
    ok(!!ex.correctOrder?.every((id, i) => ex.correctOrder[i] === id), 'orden inconsistente');
  }
}

for (const preset of presets) {
  const ad = preset ? adaptationsFor(preset) : undefined;
  const label = preset ? preset.join('+') : 'estándar';
  for (let levelId = 1; levelId <= 8; levelId++) {
    for (const route of routes) {
      for (const learn of ['es', 'eu', 'both']) {
        const state = createGenState();
        for (let i = 0; i < 60; i++) {
          const lang = learn === 'both' ? (i % 2 ? 'eu' : 'es') : learn;
          const ex = pickExercise({
            levelId, lang, ui: i % 2 ? 'eu' : 'es', route,
            difficulty: (i % 3) + 1, slot: i, state, adaptations: ad,
          });
          check(ex, `${label}/${route}/${learn}`, ad);
          total++;
        }
      }
    }
  }
}

if (problems.length) {
  console.error(`❌ ${problems.length} problemas en ${total} ejercicios:`);
  console.error(problems.slice(0, 20).join('\n'));
  process.exit(1);
}
console.log(`✅ ${total} ejercicios válidos (8 modos × 3 rutas × 3 idiomas × 3 dificultades × ${presets.length} perfiles).`);
