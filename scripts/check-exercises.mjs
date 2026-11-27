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
    contents: "export * from './src/exercises'; export * from './src/adaptations'; export * from './src/data';",
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
const { createGenState, pickExercise, makePairsExercise, adaptationsFor, words, colors, stories, specialSounds, wordSyllables } = mod;

const norm = (s) =>
  s
    .toLowerCase()
    .replace(/ñ/g, '\u0001')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\u0001/g, 'ñ');

const colorLabels = {
  es: new Set(colors.map((c) => norm(c.es))),
  eu: new Set(colors.map((c) => norm(c.eu))),
};
const wordByNorm = {
  es: new Map(words.map((w) => [norm(w.es), w])),
  eu: new Map(words.map((w) => [norm(w.eu), w])),
};

const routes = ['visual', 'auditivo', 'mixta'];
const presets = [null, ['cognitiva', 'dislexia'], ['tea', 'comunicacion'], ['tdah'], ['down'], ['daltonismo'], ['daltonismo', 'cognitiva']];
const bareColorCircles = new Set(['🔴', '🔵', '🟢', '🟡', '⚪', '⚫', '🟠', '🟣']);
const problems = [];
let total = 0;
const gameKinds = new Set();

// 0 · Integridad estática del banco de datos.
const seenEmojis = new Set();
for (const w of words) {
  if (w.sylEs.join('') !== w.es) problems.push(`data.words[${w.id}]: sylEs no reconstruye "${w.es}"`);
  if (w.sylEu.join('') !== w.eu) problems.push(`data.words[${w.id}]: sylEu no reconstruye "${w.eu}"`);
  if (seenEmojis.has(w.emoji)) problems.push(`data.words[${w.id}]: emoji repetido ${w.emoji}`);
  seenEmojis.add(w.emoji);
}
const seenPatterns = new Set();
const seenSymbols = new Set();
for (const col of colors) {
  if (!col.pattern || seenPatterns.has(col.pattern)) problems.push(`data.colors[${col.es}]: patrón ausente o repetido`);
  if (!col.symbol || seenSymbols.has(col.symbol)) problems.push(`data.colors[${col.es}]: símbolo ausente o repetido`);
  seenPatterns.add(col.pattern);
  seenSymbols.add(col.symbol);
}
for (const lang of ['es', 'eu']) {
  for (const token of specialSounds[lang]) {
    const hits = words.filter((w) => norm(w[lang]).includes(token));
    if (hits.length === 0) problems.push(`data.specialSounds.${lang}: "${token}" no aparece en ninguna palabra`);
  }
}
for (const st of stories) {
  for (const lang of ['es', 'eu']) {
    if (!st.shortText?.[lang]?.trim()) problems.push(`data.stories[${st.id}].shortText.${lang}: vacío`);
  }
}

function check(ex, ctx, ad) {
  const at = `${ctx} modo=${ex.levelId} lang=${ex.lang} ${ex.kind}`;
  const ok = (cond, msg) => { if (!cond) problems.push(`${at}: ${msg}`); };
  ok(!!ex.prompt && !ex.prompt.includes('{'), 'prompt vacío o sin interpolar');
  ok(!ex.prompt.startsWith('cat') && !ex.prompt.includes('undefined'), 'clave de traducción no encontrada');
  ok(!!ex.eyebrow && !!ex.hint && !!ex.explanation, 'falta texto de apoyo');
  ok(!ex.explanation.includes('{'), 'explicación sin interpolar');
  ok(!!ex.display, 'sin bloque visual');
  if (ad?.colorblind) {
    ok(ex.display.variant !== 'swatch', 'ejercicio de muestra pura de color en modo daltonismo');
    ok(!bareColorCircles.has(ex.display.emoji ?? ''), 'display con círculo de color sin contexto en modo daltonismo');
  }
  if (ex.audio) ok(ex.audio.lang === ex.lang, 'audio en otro idioma');
  const minOptions = ad ? ad.optionCount : 3;
  if (ex.kind === 'choice' || ex.kind === 'story') {
    const opts = ex.options ?? [];
    ok(opts.length >= minOptions, 'menos opciones de las debidas');
    ok(opts.some((o) => o.id === ex.correctId), 'respuesta correcta ausente');
    ok(new Set(opts.map((o) => o.label)).size === opts.length, 'opciones repetidas');
    ok(opts.every((o) => o.label.length > 0), 'opción vacía');

    // Las opciones de colores en modos 7 y 8 deben llevar siempre su muestra hex, patrón y símbolo.
    const allColorOpts = opts.length > 0 && opts.every((o) => colorLabels[ex.lang].has(norm(o.label)));
    if ((ex.levelId === 7 || ex.levelId === 8) && allColorOpts) {
      ok(opts.every((o) => typeof o.color === 'string' && /^#[0-9a-f]{6}$/i.test(o.color)), 'falta muestra de color (opt.color)');
      ok(opts.every((o) => typeof o.pattern === 'string' && o.pattern.length > 0), 'falta patrón accesible (opt.pattern)');
      ok(opts.every((o) => typeof o.symbol === 'string' && o.symbol.length > 0), 'falta símbolo geométrico (opt.symbol)');
    }

    // En perfil daltonismo, nunca usar círculos de color sin contexto como opción visual.
    if (ad?.colorblind) {
      ok(opts.every((o) => !bareColorCircles.has(o.emoji ?? '')), 'opción con círculo de color sin contexto en modo daltonismo');
    }

    // En sonido especial (mundo 4), solo la respuesta correcta puede contener el sonido pedido.
    if (ex.levelId === 4 && ex.display?.variant === 'word' && ex.display.text && specialSounds[ex.lang].includes(ex.display.text)) {
      const token = ex.display.text;
      const correctOpt = opts.find((o) => o.id === ex.correctId);
      ok(!!correctOpt && norm(correctOpt.label).includes(token), `la respuesta correcta no contiene el sonido "${token}"`);
      const badDistractor = opts.find((o) => o.id !== ex.correctId && norm(o.label).includes(token));
      ok(!badDistractor, `un distractor también contiene el sonido "${token}"`);
    }

    // En «¿Qué palabra empieza por X?» (mundo 2), ningún distractor puede empezar por la misma sílaba.
    if (ex.levelId === 2 && ex.display?.variant === 'word' && ex.display.text) {
      const target = ex.display.text;
      const badDistractor = opts.find((o) => {
        if (o.id === ex.correctId) return false;
        const w = wordByNorm[ex.lang].get(norm(o.label));
        return w && wordSyllables(w, ex.lang)[0] === target;
      });
      ok(!badDistractor, `un distractor también empieza por la sílaba "${target}"`);
    }

    // En categorías (mundo 3), ningún distractor puede pertenecer a la misma categoría.
    if (ex.levelId === 3 && ex.display?.variant === 'none' && !ex.audio) {
      const correctOpt = opts.find((o) => o.id === ex.correctId);
      const cw = correctOpt ? wordByNorm[ex.lang].get(norm(correctOpt.label)) : undefined;
      if (cw) {
        const badDistractor = opts.find((o) => {
          if (o.id === ex.correctId) return false;
          const dw = wordByNorm[ex.lang].get(norm(o.label));
          return dw && dw.cat === cw.cat;
        });
        ok(!badDistractor, `un distractor pertenece a la misma categoría "${cw.cat}"`);
      }
    }
  }
  if (ex.kind === 'story') {
    ok(!!ex.story && !!ex.story.text && !!ex.story.shortText, 'cuento incompleto');
    if (ad?.shortPrompts && ex.story) {
      ok(ex.story.text === ex.story.shortText, 'lectura fácil no usó shortText del cuento');
      ok(ex.audio?.text === ex.story.text, 'audio del cuento adaptado desalineado');
    }
  }
  if (ex.kind === 'action') {
    ok(!!ex.action && !!ex.action.emoji && !!ex.action.text, 'juego imperativo incompleto');
    ok(!ex.options, 'un juego imperativo no debería tener opciones');
    if (ex.action?.steps) {
      if (ex.lang === 'eu') ok(!ex.action.text.includes('Primero '), 'instrucción de dos pasos mezcló castellano en euskera');
      if (ex.lang === 'es') ok(!ex.action.text.includes('Lehenik '), 'instrucción de dos pasos mezcló euskera en castellano');
    }
    const game = ex.action?.game;
    if (game) {
      gameKinds.add(game.kind);
      if (game.kind === 'bubbles' || game.kind === 'count' || game.kind === 'breathe') {
        ok(Number.isInteger(game.target) && game.target >= 2 && game.target <= 5, 'objetivo de minijuego inválido');
        ok(!!game.label, 'etiqueta de minijuego vacía');
      }
      if (game.kind === 'count') ok(!!game.emoji, 'emoji de conteo vacío');
      if (game.kind === 'find') {
        ok(game.items.length >= Math.max(2, minOptions), 'muy pocos pictogramas en «toca algo»');
        ok(game.items.every((i) => !!i.id && !!i.emoji && !!i.label), 'pictograma incompleto');
        if (ad?.colorblind) ok(game.items.every((i) => !bareColorCircles.has(i.emoji)), 'círculo de color en «toca algo» con daltonismo');
        ok(new Set(game.items.map((i) => i.id)).size === game.items.length, 'pictogramas repetidos');
        ok(!!game.label, 'ayuda de «toca algo» vacía');
      }
    }
  }
  if (ex.kind === 'tap') {
    ok((ex.chips ?? []).length >= 2, 'demasiado pocas piezas');
    ok((ex.chips ?? []).some((c) => c.id === ex.correctChip), 'pieza correcta ausente');
    if (ex.levelId === 4 && ex.display?.highlight) {
      const correctChip = ex.chips?.find((c) => c.id === ex.correctChip);
      ok(!!correctChip && norm(correctChip.label).includes(ex.display.highlight), `la sílaba correcta no contiene "${ex.display.highlight}"`);
    }
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
          if (i % 15 === 0 && levelId !== 8) {
            const pEx = makePairsExercise({
              levelId, lang, learnLang: learn, ui: i % 2 ? 'eu' : 'es', state, adaptations: ad,
            });
            if (!pEx.pairs || pEx.pairs.length < 4 || pEx.pairs.length % 2 !== 0) {
              problems.push(`[pairs:${label}/${learn}] número inválido de cartas de pareja`);
            }
            const leftLabels = new Set(pEx.pairs.filter((c) => c.side === 'left').map((c) => c.label));
            const rightLabels = new Set(pEx.pairs.filter((c) => c.side === 'right').map((c) => c.label));
            if (leftLabels.size !== pEx.pairs.length / 2 || rightLabels.size !== pEx.pairs.length / 2) {
              problems.push(`[pairs:${label}/${learn}] etiquetas duplicadas en columna de parejas`);
            }
            total++;
          }
        }
      }
    }
  }
}

const expectedGames = ['bubbles', 'count', 'breathe', 'find', 'imitate'];
for (const kind of expectedGames) {
  if (!gameKinds.has(kind)) problems.push(`no se generó el minijuego «${kind}»`);
}

if (problems.length) {
  console.error(`❌ ${problems.length} problemas en ${total} ejercicios:`);
  console.error(problems.slice(0, 20).join('\n'));
  process.exit(1);
}
console.log(`✅ ${total} ejercicios válidos (8 modos × 3 rutas × 3 idiomas × 3 dificultades × ${presets.length} perfiles) · ${gameKinds.size} minijuegos de Pato Ventura.`);
