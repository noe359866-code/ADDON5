/**
 * Comprueba que los generadores producen preguntas válidas en los 8 modos,
 * las 3 rutas, los 4 modos lingüísticos (es, eu, en y both=es+eu), los 3 niveles
 * (Bajo=1, Medio=2, Alto=3), la fonética muda de la H en euskera y los perfiles de apoyo.
 *
 * Uso: npm run check:content
 * No necesita dependencias extra: usa esbuild (ya incluido con Vite) para
 * cargar los módulos TypeScript directamente.
 */
import { build } from 'esbuild';

const result = await build({
  stdin: {
    contents:
      "export * from './src/exercises'; export * from './src/adaptations'; export * from './src/data'; export * from './src/sound'; export * from './src/i18n';",
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
const {
  createGenState,
  pickExercise,
  makePairsExercise,
  adaptationsFor,
  words,
  colors,
  stories,
  specialSounds,
  wordSyllables,
  phoneticBasqueText,
  prepareSpeechText,
  t,
} = mod;

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
  en: new Set(colors.map((c) => norm(c.en))),
};
const wordByNorm = {
  es: new Map(words.map((w) => [norm(w.es), w])),
  eu: new Map(words.map((w) => [norm(w.eu), w])),
  en: new Map(words.map((w) => [norm(w.en), w])),
};

const routes = ['visual', 'auditivo', 'mixta'];
const readingPhases = [null, 'fonologica', 'logográfica', 'alfabética', 'ortográfica'];
const bareColorCircles = new Set(['🔴', '🔵', '🟢', '🟡', '⚪', '⚫', '🟠', '🟣']);
const problems = [];
let total = 0;
const gameKinds = new Set();

// 0a · Integridad fonética de la H muda en euskera.
const basqueHChecks = [
  ['hiru', 'iru'],
  ['hori', 'ori'],
  ['haur', 'aur'],
  ['handi', 'andi'],
  ['harri', 'arri'],
  ['haize', 'aize'],
  ['mahai', 'maai'],
  ['leiho', 'leio'],
  ['bihotz', 'biotz'],
  ['ahate', 'aate'],
  ['behi', 'bei'],
  ['ohe', 'oe'],
  ['zuhaitz', 'zuaitz'],
  ['Hiru ahate handi', 'iru aate andi'],
];
for (const [raw, expected] of basqueHChecks) {
  const actual = phoneticBasqueText(raw).toLowerCase();
  if (actual !== expected) {
    problems.push(`phoneticBasqueText("${raw}") = "${actual}", se esperaba "${expected}"`);
  }
}
for (const w of words) {
  if (/h/i.test(w.eu)) {
    const spoken = prepareSpeechText(w.eu, 'eu');
    if (/h/i.test(spoken)) {
      problems.push(`prepareSpeechText("${w.eu}", "eu") conservó una H sonora: "${spoken}"`);
    }
  }
  // En inglés la H sí se pronuncia: nunca debe eliminarse.
  if (/h/i.test(w.en)) {
    const spokenEn = prepareSpeechText(w.en, 'en');
    if (spokenEn !== w.en) {
      problems.push(`prepareSpeechText("${w.en}", "en") alteró el inglés: "${spokenEn}"`);
    }
  }
}

// 0b · Integridad estática del banco de datos en ES, EU y EN.
const seenEmojis = new Set();
for (const w of words) {
  if (w.sylEs.join('') !== w.es) problems.push(`data.words[${w.id}]: sylEs no reconstruye "${w.es}"`);
  if (w.sylEu.join('') !== w.eu) problems.push(`data.words[${w.id}]: sylEu no reconstruye "${w.eu}"`);
  if (w.sylEn.join('') !== w.en) problems.push(`data.words[${w.id}]: sylEn no reconstruye "${w.en}"`);
  if (seenEmojis.has(w.emoji)) problems.push(`data.words[${w.id}]: emoji repetido ${w.emoji}`);
  seenEmojis.add(w.emoji);
}
// 0c · Categorías funcionales y etiquetas de interfaz nuevas (emociones, días, meses, ropa, cole).
const requiredCategories = ['emociones', 'dias', 'meses', 'ropa', 'cole'];
for (const cat of requiredCategories) {
  const items = words.filter((w) => w.cat === cat);
  if (items.length < 5) problems.push(`data.words: categoría "${cat}" tiene solo ${items.length} palabras (mínimo 5)`);
  for (const w of items) {
    for (const lang of ['es', 'eu', 'en']) {
      if (!w[lang]?.trim()) problems.push(`data.words[${w.id}]: categoría "${cat}" sin traducción ${lang}`);
    }
    const labelKey = `cat${cat[0].toUpperCase()}${cat.slice(1)}`;
    for (const lang of ['es', 'eu']) {
      if (t(labelKey, lang) === labelKey) problems.push(`i18n: falta la clave "${labelKey}" para ${lang}`);
    }
  }
}
// Las nuevas etiquetas de interfaz deben existir en ES y EU.
for (const key of [
  'stageLabel',
  'stageColorsLabel',
  'stageLegend',
  'stageColorAria',
  'navReading',
  'navDictionary',
  'readingTitle',
  'readingSub',
  'readingUnsupported',
  'readingDenied',
  'readingTapHint',
  'readingDoneTitle',
  'readingClaim',
  'dictTitle',
  'dictSub',
  'dictPlaceholder',
  'dictSearchLabel',
  'dictEmptyTitle',
  'dictHomeHint',
  'audioSpeedLabel',
  'audioSpeedSlowHint',
  'audioSpeedNormalHint',
  'audioSpeedMarkedBadge',
  'micRepeatBtn',
  'micListening',
  'micSuccess',
  'micTryAgain',
  'micEmpty',
  'micDenied',
  'micUnsupported',
  'musicQuickOn',
  'musicQuickOff',
  'eyebrowLetters',
  'promptOrderLetters',
  'hintOrderLetters',
  'eyebrowDictation',
  'promptDictationWord',
  'promptDictationSentence',
  'dictationPlaceholderWord',
  'dictationPlaceholderSentence',
  'dictationHelperBank',
  'hintDictation',
]) {
  for (const lang of ['es', 'eu']) {
    if (t(key, lang) === key) problems.push(`i18n: falta la clave "${key}" para ${lang}`);
  }
}

const seenPatterns = new Set();
const seenSymbols = new Set();
for (const col of colors) {
  if (!col.pattern || seenPatterns.has(col.pattern)) problems.push(`data.colors[${col.es}]: patrón ausente o repetido`);
  if (!col.symbol || seenSymbols.has(col.symbol)) problems.push(`data.colors[${col.es}]: símbolo ausente o repetido`);
  if (!col.en) problems.push(`data.colors[${col.es}]: falta traducción en inglés`);
  seenPatterns.add(col.pattern);
  seenSymbols.add(col.symbol);
}
for (const lang of ['es', 'eu', 'en']) {
  for (const token of specialSounds[lang]) {
    const hits = words.filter((w) => norm(w[lang]).includes(token));
    if (hits.length === 0) problems.push(`data.specialSounds.${lang}: "${token}" no aparece en ninguna palabra`);
  }
}
for (const st of stories) {
  for (const lang of ['es', 'eu', 'en']) {
    if (!st.title?.[lang]?.trim()) problems.push(`data.stories[${st.id}].title.${lang}: vacío`);
    if (!st.text?.[lang]?.trim()) problems.push(`data.stories[${st.id}].text.${lang}: vacío`);
    if (!st.shortText?.[lang]?.trim()) problems.push(`data.stories[${st.id}].shortText.${lang}: vacío`);
    if (!st.question?.[lang]?.trim()) problems.push(`data.stories[${st.id}].question.${lang}: vacío`);
  }
}

function check(ex, ctx, ad, learnMode) {
  const at = `${ctx} modo=${ex.levelId} lang=${ex.lang} ${ex.kind}`;
  const ok = (cond, msg) => {
    if (!cond) problems.push(`${at}: ${msg}`);
  };
  if (learnMode === 'both') {
    ok(ex.lang === 'es' || ex.lang === 'eu', `el modo combinado both generó "${ex.lang}" en vez de solo ES/EU`);
  }
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

    const allColorOpts = opts.length > 0 && opts.every((o) => colorLabels[ex.lang].has(norm(o.label)));
    if ((ex.levelId === 7 || ex.levelId === 8) && allColorOpts) {
      ok(opts.every((o) => typeof o.color === 'string' && /^#[0-9a-f]{6}$/i.test(o.color)), 'falta muestra de color (opt.color)');
      ok(opts.every((o) => typeof o.pattern === 'string' && o.pattern.length > 0), 'falta patrón accesible (opt.pattern)');
      ok(opts.every((o) => typeof o.symbol === 'string' && o.symbol.length > 0), 'falta símbolo geométrico (opt.symbol)');
    }

    if (ad?.colorblind) {
      ok(opts.every((o) => !bareColorCircles.has(o.emoji ?? '')), 'opción con círculo de color sin contexto en modo daltonismo');
    }

    if (ex.levelId === 4 && ex.display?.variant === 'word' && ex.display.text && specialSounds[ex.lang].includes(ex.display.text)) {
      const token = ex.display.text;
      const correctOpt = opts.find((o) => o.id === ex.correctId);
      ok(!!correctOpt && norm(correctOpt.label).includes(token), `la respuesta correcta no contiene el sonido "${token}"`);
      const badDistractor = opts.find((o) => o.id !== ex.correctId && norm(o.label).includes(token));
      ok(!badDistractor, `un distractor también contiene el sonido "${token}"`);
    }

    if (ex.levelId === 2 && ex.display?.variant === 'word' && ex.display.text) {
      const target = ex.display.text;
      const badDistractor = opts.find((o) => {
        if (o.id === ex.correctId) return false;
        const w = wordByNorm[ex.lang].get(norm(o.label));
        return w && wordSyllables(w, ex.lang)[0] === target;
      });
      ok(!badDistractor, `un distractor también empieza por la sílaba "${target}"`);
    }

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
      if (ex.lang === 'eu') ok(!ex.action.text.includes('Primero ') && !ex.action.text.includes('First '), 'instrucción de dos pasos mezcló otro idioma en euskera');
      if (ex.lang === 'es') ok(!ex.action.text.includes('Lehenik ') && !ex.action.text.includes('First '), 'instrucción de dos pasos mezcló otro idioma en castellano');
      if (ex.lang === 'en') ok(ex.action.text.startsWith('First '), 'instrucción de dos pasos en inglés no usó formato inglés');
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
    if (ex.unit === 'letter') {
      // Ordenar letras: las fichas reconstruyen la palabra funcional que se escucha.
      const rebuilt = ex.correctOrder
        .map((id) => (ex.tiles ?? []).find((t) => t.id === id)?.label ?? '')
        .join('');
      ok(rebuilt.length >= 3, `palabra de ordenar letras inválida: "${rebuilt}"`);
      ok(rebuilt === ex.audio?.text, `ordenar letras reconstruye "${rebuilt}" y no "${ex.audio?.text}"`);
      ok(!!ex.audio, 'ordenar letras sin audio');
      ok(!!ex.audio?.syllables && ex.audio.syllables.length > 0, 'ordenar letras sin sílabas marcadas');
    }
  }
  if (ex.kind === 'dictation') {
    ok(!!ex.dictationTarget && ex.dictationTarget.length > 0, 'dictado sin texto objetivo');
    ok(!!ex.audio && ex.audio.lang === ex.lang, 'dictado sin audio o en idioma distinto');
    ok(!!ex.dictationPlaceholder, 'dictado sin placeholder');
    if (ex.audio?.syllables) {
      ok(ex.audio.syllables.join('') === ex.audio.text, `sílabas del dictado no reconstruyen "${ex.audio.text}"`);
    }
    if (ex.tiles) {
      ok(ex.tiles.length >= 2, 'banco de letras del dictado muy corto');
    }
  }
  if (ex.kind === 'pairs') {
    ok((ex.pairs ?? []).length >= 4 && (ex.pairs?.length ?? 0) % 2 === 0, 'parejas inválidas');
  }
}

const schoolStages = ['general', 'infantil', 'prim12', 'prim34', 'prim56'];
const stageLabels = { general: 'todas', infantil: 'infantil', prim12: 'p12', prim34: 'p34', prim56: 'p56' };

for (const readingPhase of readingPhases) {
  const ad = undefined;
  const label = readingPhase ?? 'estándar';
  for (let levelId = 1; levelId <= 8; levelId++) {
    for (const route of routes) {
      for (const learn of ['es', 'eu', 'en', 'both']) {
        for (const schoolStage of schoolStages) {
          const state = createGenState();
          const stageLabel = `${stageLabels[schoolStage]}`;
          for (let i = 0; i < 45; i++) {
            // 'both' alterna exclusivamente ES y EU
            const lang = learn === 'both' ? (i % 2 ? 'eu' : 'es') : learn;
            const ex = pickExercise({
              levelId,
              lang,
              learnLang: learn,
              ui: i % 2 ? 'eu' : 'es',
              route,
              difficulty: (i % 3) + 1,
              slot: i,
              state,
              adaptations: ad,
              schoolStage,
              readingPhase,
            });
            check(ex, `${label}/${route}/${learn}/${stageLabel}`, ad, learn);
            total++;
            if (i % 15 === 0 && levelId !== 8) {
              const pEx = makePairsExercise({
                levelId,
                lang,
                learnLang: learn,
                ui: i % 2 ? 'eu' : 'es',
                state,
                adaptations: ad,
                schoolStage,
              });
            if (!pEx.pairs || pEx.pairs.length < 4 || pEx.pairs.length % 2 !== 0) {
              problems.push(`[pairs:${label}/${learn}] número inválido de cartas de pareja`);
            }
            if (learn === 'both') {
              const badLangCard = pEx.pairs.find((c) => c.lang && c.lang !== 'es' && c.lang !== 'eu');
              if (badLangCard) problems.push(`[pairs:${label}/both] apareció idioma distinto de ES/EU: ${badLangCard.lang}`);
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
console.log(
  `✅ ${total} ejercicios válidos (8 modos × 3 rutas × ES/EU/EN/ES+EU × Bajo/Medio/Alto × ${schoolStages.length} etapas × ${readingPhases.length} fases de lectura) · H muda vasca verificada · ${gameKinds.size} minijuegos de Pato Ventura · categorías funcionales y niveles por color verificados.`,
);
