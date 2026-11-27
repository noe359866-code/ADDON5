import {
  INVERSE_MIRROR_PAIRS,
  SYLLABLE_BANKS,
  blanks,
  classifySyllable,
  colorById,
  colors,
  colorObjects,
  countingEmojis,
  digraphs,
  imperatives,
  levels,
  minimalPairs,
  numbers,
  rhymes,
  sentences,
  specialSounds,
  stories,
  wordById,
  wordSyllableStage,
  wordSyllables,
  wordText,
  words,
  wordsForSyllableStage,
} from './data';
import type { ColorItem, Word } from './data';
import { applyAdaptations, defaultAdaptations } from './adaptations';
import type { Adaptations } from './adaptations';
import { t, tf } from './i18n';
import type {
  ActionGame,
  Exercise,
  ExerciseKind,
  Lang,
  LearnLang,
  Modality,
  Option,
  PairCard,
  ReadingPhase,
  Route,
  SchoolStage,
  SyllableStage,
  Tile,
  UiLang,
} from './types';

export interface GenState {
  used: Set<string>;
  lastFactory: string;
  seq: number;
}

export function createGenState(): GenState {
  return { used: new Set<string>(), lastFactory: '', seq: 0 };
}

interface Ctx {
  lang: Lang;
  learnLang: LearnLang;
  ui: UiLang;
  difficulty: number;
  schoolStage: SchoolStage;
  readingPhase: ReadingPhase;
  syllableStage: SyllableStage;
  state: GenState;
  colorblind: boolean;
  simpleOnly: boolean;
}

interface Factory {
  id: string;
  modality: Modality;
  make: (c: Ctx) => Exercise;
}

/* ------------------------------------------------------------------ */
/* Utilidades                                                          */
/* ------------------------------------------------------------------ */

function shuffle<T>(input: T[]): T[] {
  const a = [...input];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

function rnd<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/ñ/g, '\u0001')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\u0001/g, 'ñ');
}

function pickFresh<T>(arr: T[], key: (item: T) => string, prefix: string, state: GenState): T {
  const mixed = shuffle(arr);
  const found = mixed.find((item) => !state.used.has(`${prefix}:${key(item)}`));
  const chosen = found ?? mixed[0]!;
  state.used.add(`${prefix}:${key(chosen)}`);
  return chosen;
}

function similarity(a: string, b: string): number {
  const na = normalize(a);
  const nb = normalize(b);
  let score = 0;
  if (na[0] === nb[0]) score += 2;
  if (na.slice(-1) === nb.slice(-1)) score += 1;
  if (Math.abs(na.length - nb.length) <= 1) score += 1;
  if (na.slice(0, 2) === nb.slice(0, 2)) score += 2;
  return score;
}

function distract(pool: string[], correct: string, n: number, difficulty: number, fallback: string[] = []): string[] {
  const nc = normalize(correct);
  const pickFrom = (arr: string[], count: number) => {
    let list = shuffle(arr);
    if (difficulty >= 3) list = list.sort((a, b) => similarity(b, correct) - similarity(a, correct));
    return list.slice(0, count);
  };
  const primary = Array.from(new Set(pool.filter((x) => x && normalize(x) !== nc)));
  const chosen = pickFrom(primary, n);
  if (chosen.length >= n || !fallback.length) return chosen;
  const used = new Set([nc, ...chosen.map(normalize)]);
  const extra = Array.from(new Set(fallback.filter((x) => x && !used.has(normalize(x)))));
  return [...chosen, ...pickFrom(extra, n - chosen.length)];
}

/** Filtra palabras según la etapa escolar (Infantil / ciclos de Primaria) manteniendo banco suficiente. */
function stageWords(c: Ctx, list: Word[] = words): Word[] {
  if (c.schoolStage === 'general') return list;
  const tagged = list.filter((w) => {
    if (w.stages) return w.stages.includes(c.schoolStage as Exclude<SchoolStage, 'general'>);
    const len = wordText(w, c.lang).length;
    if (c.schoolStage === 'infantil') return len <= 6;
    if (c.schoolStage === 'prim12') return len <= 8;
    return true;
  });
  return tagged.length >= 6 ? tagged : list;
}

/** Frases cotidianas filtradas por etapa escolar. */
function stageSentences(c: Ctx) {
  if (c.schoolStage === 'general') return sentences;
  const order: Exclude<SchoolStage, 'general'>[] = ['infantil', 'prim12', 'prim34', 'prim56'];
  const idx = order.indexOf(c.schoolStage as Exclude<SchoolStage, 'general'>);
  const exact = sentences.filter((s) => s.stage === c.schoolStage);
  if (exact.length >= 4) return exact;
  const nearby = sentences.filter((s) => !s.stage || Math.abs(order.indexOf(s.stage) - idx) <= 1);
  return nearby.length >= 4 ? nearby : sentences;
}

/** Huecos de frases funcionales filtrados por etapa escolar. */
function stageBlanks(c: Ctx) {
  if (c.schoolStage === 'general') return blanks;
  const order: Exclude<SchoolStage, 'general'>[] = ['infantil', 'prim12', 'prim34', 'prim56'];
  const idx = order.indexOf(c.schoolStage as Exclude<SchoolStage, 'general'>);
  const nearby = blanks.filter((b) => !b.stage || Math.abs(order.indexOf(b.stage) - idx) <= 1);
  return nearby.length >= 3 ? nearby : blanks;
}

/** Audio de una palabra con sus sílabas marcadas para la barra de velocidad lenta. */
function wordAudio(w: Word, lang: Lang) {
  return { text: wordText(w, lang), lang, syllables: wordSyllables(w, lang) };
}

/** Palabras con dibujo inequívoco: en daltonismo se evitan los círculos de solo color (🔴🟢🟠). */
function visualWords(c: Ctx, list: Word[] = words): Word[] {
  const base = stageWords(c, list);
  return c.colorblind ? base.filter((w) => w.cat !== 'colores') : base;
}

/** Palabras filtradas por la etapa silábica actual (1: Directas, 2: Inversas, 3: Trabadas). */
function stageVisualWords(c: Ctx, minSyl = 1): Word[] {
  const base = visualWords(c);
  const byStage = wordsForSyllableStage(c.syllableStage, c.lang, base).filter(
    (w) => wordSyllables(w, c.lang).length >= minSyl,
  );
  if (byStage.length >= 4) return byStage;
  return base.filter((w) => wordSyllables(w, c.lang).length >= minSyl);
}

/** Elige dentro de una palabra el índice de la sílaba que ejemplifica la etapa actual. */
function pickStageSyllableIndex(syl: string[], stage: SyllableStage): number {
  const wanted = stage === 3 ? 'trabada' : stage === 2 ? 'inversa' : 'directa';
  const matches = syl
    .map((s, idx) => ({ s, idx }))
    .filter(({ s }) => classifySyllable(s) === wanted);
  if (matches.length > 0) return rnd(matches).idx;
  return Math.floor(Math.random() * syl.length);
}

function stageHint(c: Ctx): string {
  if (c.syllableStage === 2) return t('hintInverse', c.ui);
  if (c.syllableStage === 3) return t('hintTrabada', c.ui);
  return t('hintSyllables', c.ui);
}

interface OptionInput {
  label: string;
  emoji?: string;
  sub?: string;
  color?: string;
  pattern?: string;
  symbol?: string;
}

function optionSet(items: OptionInput[], correctIndex: number): { options: Option[]; correctId: string } {
  if (!items.length) {
    return { options: [{ id: 'o0', label: '' }], correctId: 'o0' };
  }
  const safeIndex = correctIndex >= 0 && correctIndex < items.length ? correctIndex : 0;
  const tagged = items.map((it, i) => ({ ...it, id: `o${i}`, ok: i === safeIndex }));
  const mixed = shuffle(tagged);
  const correctId = mixed.find((x) => x.ok)!.id;
  const options: Option[] = mixed.map((x) => ({
    id: x.id,
    label: x.label,
    ...(x.emoji ? { emoji: x.emoji } : {}),
    ...(x.sub ? { sub: x.sub } : {}),
    ...(x.color ? { color: x.color } : {}),
    ...(x.pattern ? { pattern: x.pattern } : {}),
    ...(x.symbol ? { symbol: x.symbol } : {}),
  }));
  return { options, correctId };
}

function nOpts(c: Ctx): number {
  return c.difficulty >= 3 ? 4 : 3;
}

function allInitials(lang: Lang): string[] {
  return Array.from(new Set(words.map((w) => initialToken(wordText(w, lang), lang))));
}

function allSyllables(lang: Lang): string[] {
  return Array.from(new Set(words.flatMap((w) => wordSyllables(w, lang))));
}

function initialToken(text: string, lang: Lang): string {
  const low = normalize(text);
  const ds = [...digraphs[lang]].sort((a, b) => b.length - a.length);
  for (const d of ds) if (low.startsWith(d)) return d;
  return low[0] ?? '';
}

function splitGraphemes(text: string, lang: Lang): string[] {
  const ds = [...digraphs[lang]].sort((a, b) => b.length - a.length);
  const out: string[] = [];
  let i = 0;
  while (i < text.length) {
    const rest = normalize(text.slice(i));
    const d = ds.find((x) => rest.startsWith(x));
    if (d) {
      out.push(text.slice(i, i + d.length));
      i += d.length;
    } else {
      out.push(text.slice(i, i + 1));
      i += 1;
    }
  }
  return out;
}

function makeEx(
  c: Ctx,
  levelId: number,
  modality: Modality,
  kind: ExerciseKind,
  fields: Pick<Exercise, 'eyebrow' | 'prompt' | 'hint' | 'explanation'> & Partial<Exercise>,
): Exercise {
  return {
    id: `ex-${c.state.seq++}`,
    kind,
    modality,
    levelId,
    lang: c.lang,
    autoAudio: modality === 'auditivo',
    ...fields,
  };
}

function answerExplanation(c: Ctx, answer: string, kind: 'read' | 'written' | 'answer' = 'answer'): string {
  const key = kind === 'read' ? 'explanationRead' : kind === 'written' ? 'explanationWritten' : 'explanationAnswer';
  return tf(key, c.ui, { answer });
}

function wordOptions(c: Ctx, correct: Word, others: Word[], withEmoji = false): { options: Option[]; correctId: string } {
  const n = nOpts(c);
  const pool = others.filter((w) => w.id !== correct.id);
  const chosen = distract(
    pool.map((w) => wordText(w, c.lang)),
    wordText(correct, c.lang),
    n - 1,
    c.difficulty,
    words.map((w) => wordText(w, c.lang)),
  );
  const texts = [wordText(correct, c.lang), ...chosen];
  const items: OptionInput[] = texts.map((label) => {
    const w = words.find((x) => normalize(wordText(x, c.lang)) === normalize(label));
    if (withEmoji && w && !(c.colorblind && w.cat === 'colores')) return { label, emoji: w.emoji };
    return { label };
  });
  return optionSet(items, 0);
}

/* ------------------------------------------------------------------ */
/* Generadores reutilizables                                           */
/* ------------------------------------------------------------------ */

function makeBuild(c: Ctx, levelId: number, modality: Modality, minSyllables: number): Exercise {
  const pool =
    levelId === 2
      ? stageVisualWords(c, minSyllables)
      : visualWords(c).filter((w) => wordSyllables(w, c.lang).length >= minSyllables && wordSyllableStage(w, c.lang) <= c.syllableStage);
  const effectivePool = pool.length ? pool : visualWords(c).filter((w) => wordSyllables(w, c.lang).length >= minSyllables);
  const w = pickFresh(effectivePool, (x) => x.id, `build-${levelId}-s${c.syllableStage}`, c.state);
  const syl = wordSyllables(w, c.lang);
  let tiles: Tile[] = shuffle(syl.map((s, i) => ({ id: `t${i}`, label: s })));
  if (tiles.every((tile, i) => tile.id === `t${i}`)) tiles = [...tiles.slice(1), tiles[0]!];
  const text = wordText(w, c.lang);
  return makeEx(c, levelId, modality, 'build', {
    eyebrow: t('eyebrowBuild', c.ui),
    prompt: t('promptBuildWord', c.ui),
    display: { variant: 'emoji', emoji: w.emoji },
    audio: wordAudio(w, c.lang),
    tiles,
    correctOrder: syl.map((_, i) => `t${i}`),
    unit: 'syllable',
    hint: levelId === 2 ? stageHint(c) : t('hintSyllables', c.ui),
    explanation: answerExplanation(c, text, 'written'),
    ...(levelId === 2 ? { syllableStage: c.syllableStage } : {}),
  });
}

/**
 * Ordenar letras: reordenar los grafemas de una palabra funcional corta.
 * Las palabras más largas se reservan para Primaria alta; Infantil usa palabras de 3-5 grafemas.
 */
function makeLetterOrder(c: Ctx, levelId: number, modality: Modality): Exercise {
  const stagePool = visualWords(c).filter((w) => {
    const gs = splitGraphemes(wordText(w, c.lang), c.lang);
    if (gs.length < 3) return false;
    if (c.schoolStage === 'infantil' || c.schoolStage === 'prim12') return gs.length <= 5;
    if (c.schoolStage === 'prim34') return gs.length >= 4 && gs.length <= 8;
    return gs.length >= 5 && gs.length <= 10;
  });
  const pool = stagePool.length ? stagePool : visualWords(c);
  const w = pickFresh(pool, (x) => x.id, `letters-${levelId}`, c.state);
  const gs = splitGraphemes(wordText(w, c.lang), c.lang);
  let tiles: Tile[] = shuffle(gs.map((g, i) => ({ id: `t${i}`, label: g })));
  if (tiles.every((tile, i) => tile.id === `t${i}`)) tiles = [...tiles.slice(1), tiles[0]!];
  const text = wordText(w, c.lang);
  return makeEx(c, levelId, modality, 'build', {
    eyebrow: t('eyebrowLetters', c.ui),
    prompt: t('promptOrderLetters', c.ui),
    display: { variant: 'emoji', emoji: w.emoji },
    audio: wordAudio(w, c.lang),
    tiles,
    correctOrder: gs.map((_, i) => `t${i}`),
    unit: 'letter',
    hint: t('hintOrderLetters', c.ui),
    explanation: answerExplanation(c, text, 'written'),
  });
}

/**
 * Dictado con audio: escuchar una palabra o frase funcional y escribirla.
 * Incluye sílabas marcadas y, para Infantil / Primaria baja, banco de letras y ayuda.
 */
function makeDictation(c: Ctx, levelId: number): Exercise {
  const wantsSentence = levelId >= 5 || (c.difficulty >= 3 && c.schoolStage !== 'infantil');
  const entry = wantsSentence
    ? pickFresh(stageSentences(c), (x) => x.id, `dict-${levelId}`, c.state)
    : pickFresh(stageWords(c), (x) => x.id, `dict-${levelId}`, c.state);
  let target: string;
  let emoji: string | undefined;
  let tiles: Tile[] | undefined;
  if (wantsSentence) {
    const s = entry as (typeof sentences)[number];
    target = sentenceTokens(s, c.lang).join(' ');
    const bareCircle = ['🔴', '🔵', '🟢', '🟡', '⚪', '⚫', '🟠', '🟣'].includes(s.emoji);
    emoji = c.colorblind && bareCircle ? undefined : s.emoji;
  } else {
    const w = entry as Word;
    target = wordText(w, c.lang);
    const bareCircle = ['🔴', '🔵', '🟢', '🟡', '⚪', '⚫', '🟠', '🟣'].includes(w.emoji);
    emoji = c.colorblind && bareCircle ? undefined : w.emoji;
    const showTiles = c.schoolStage === 'infantil' || c.schoolStage === 'prim12' || c.simpleOnly;
    if (showTiles) {
      tiles = shuffle(splitGraphemes(target, c.lang).map((g, i) => ({ id: `l${i}`, label: g })));
    }
  }
  const isWord = !wantsSentence;
  return makeEx(c, levelId, 'auditivo', 'dictation', {
    eyebrow: t('eyebrowDictation', c.ui),
    prompt: isWord ? t('promptDictationWord', c.ui) : t('promptDictationSentence', c.ui),
    display: { variant: 'none', ...(emoji ? { emoji } : {}) },
    audio: {
      text: target,
      lang: c.lang,
      syllables: isWord ? wordSyllables(entry as Word, c.lang) : undefined,
    },
    tiles,
    dictationTarget: target,
    dictationPlaceholder: isWord ? t('dictationPlaceholderWord', c.ui) : t('dictationPlaceholderSentence', c.ui),
    hint: t('hintDictation', c.ui),
    explanation: answerExplanation(c, target, 'written'),
  });
}

/** Parejas de emparejar dentro de una fase de clase, reutilizando el generador clásico. */
function makePhasePairs(c: Ctx, levelId: number): Exercise {
  const ad = defaultAdaptations;
  const count = ad.optionCount <= 2 ? 3 : 4;
  const sourcePool = levelId === 2 ? stageVisualWords(c, 1) : visualWords(c);
  const pool = shuffle(sourcePool).slice(0, count);
  const bilingual = c.learnLang === 'both' && !c.simpleOnly;
  const leftCards: PairCard[] = shuffle(
    pool.map((w, idx) =>
      bilingual
        ? { id: `pl-${idx}`, pairId: w.id, side: 'left', label: w.es, emoji: w.emoji, lang: 'es' }
        : { id: `pl-${idx}`, pairId: w.id, side: 'left', label: w.emoji, emoji: w.emoji },
    ),
  );
  const rightCards: PairCard[] = shuffle(
    pool.map((w, idx) =>
      bilingual
        ? { id: `pr-${idx}`, pairId: w.id, side: 'right', label: w.eu, lang: 'eu' }
        : { id: `pr-${idx}`, pairId: w.id, side: 'right', label: wordText(w, c.lang), lang: c.lang },
    ),
  );
  return makeEx(c, levelId, 'visual', 'pairs', {
    eyebrow: t('eyebrowPairs', c.ui),
    prompt: bilingual ? t('promptMatchBilingual', c.ui) : t('promptMatchPairs', c.ui),
    display: { variant: 'none' },
    pairs: [...leftCards, ...rightCards],
    hint: t('hintPairs', c.ui),
    explanation: t('wellDone', c.ui),
    ...(levelId === 2 ? { syllableStage: c.syllableStage } : {}),
  });
}

function sentenceTokens(s: (typeof sentences)[number], lang: Lang): string[] {
  if (lang === 'en') return s.en;
  return lang === 'es' ? s.es : s.eu;
}

function makeOrder(c: Ctx, levelId: number, modality: Modality): Exercise {
  const s = pickFresh(stageSentences(c), (x) => x.id, `order-${levelId}`, c.state);
  const tokens = sentenceTokens(s, c.lang);
  let tiles: Tile[] = shuffle(tokens.map((word, i) => ({ id: `t${i}`, label: word })));
  if (tiles.every((tile, i) => tile.id === `t${i}`)) tiles = [...tiles.slice(1), tiles[0]!];
  const text = tokens.join(' ');
  return makeEx(c, levelId, modality, 'build', {
    eyebrow: t('eyebrowOrder', c.ui),
    prompt: t('promptOrderSentence', c.ui),
    display: { variant: 'emoji', emoji: s.emoji },
    audio: { text, lang: c.lang },
    tiles,
    correctOrder: tokens.map((_, i) => `t${i}`),
    unit: 'word',
    hint: t('hintSentence', c.ui),
    explanation: answerExplanation(c, text, 'written'),
  });
}

function makeBlank(c: Ctx, levelId: number, modality: Modality): Exercise {
  const b = pickFresh(stageBlanks(c), (x) => x.id, `blank-${levelId}`, c.state);
  const parts = c.lang === 'en' ? b.en : c.lang === 'es' ? b.es : b.eu;
  const answer = wordById[b.answer]!;
  const answerText = wordText(answer, c.lang);
  const shown = `${parts.before} ＿ ${parts.after}`.trim().replace(/\s+/g, ' ');
  const others = b.distractors.map((id) => wordById[id]!).filter(Boolean);
  const { options, correctId } = wordOptions(c, answer, others);
  const full = `${parts.before} ${answerText} ${parts.after}`.trim().replace(/\s+/g, ' ');
  return makeEx(c, levelId, modality, 'choice', {
    eyebrow: t('eyebrowComplete', c.ui),
    prompt: t('promptCompleteSentence', c.ui),
    display: { variant: 'blank', text: shown, emoji: b.emoji },
    audio: { text: full, lang: c.lang },
    options,
    correctId,
    hint: modality === 'auditivo' ? t('hintListen', c.ui) : t('hintSentence', c.ui),
    explanation: answerExplanation(c, answerText),
  });
}

function makeHearSentence(c: Ctx, levelId: number, modality: Modality): Exercise {
  const bank = stageSentences(c);
  const s = pickFresh(bank, (x) => x.id, `hearsent-${levelId}`, c.state);
  const tokens = sentenceTokens(s, c.lang);
  const correct = tokens.join(' ');
  const other = pickFresh(bank.filter((x) => x.id !== s.id), (x) => x.id, `hearsent-other-${levelId}`, c.state);
  const otherTokens = sentenceTokens(other, c.lang);
  const replacement = rnd(stageWords(c).map((w) => wordText(w, c.lang)));
  const variant1 = [...tokens.slice(0, -1), replacement].join(' ');
  const variant2 = otherTokens.join(' ');
  const variant3 = [tokens[0]!, ...shuffle(tokens.slice(1))].join(' ');
  const variant4 = [tokens[tokens.length - 1]!, ...tokens.slice(0, -1)].join(' ');
  const otherSentences = bank.filter((x) => x.id !== s.id).map((x) => sentenceTokens(x, c.lang).join(' '));
  const rest = distract([variant1, variant2, variant3, variant4, ...otherSentences], correct, nOpts(c) - 1, c.difficulty);
  const { options, correctId } = optionSet([correct, ...rest].map((label) => ({ label })), 0);
  return makeEx(c, levelId, modality, 'choice', {
    eyebrow: t('eyebrowListen', c.ui),
    prompt: t('promptHearSentence', c.ui),
    display: { variant: 'none' },
    audio: { text: correct, lang: c.lang },
    options,
    correctId,
    hint: t('hintListen', c.ui),
    explanation: answerExplanation(c, correct, 'written'),
  });
}

function makeStory(c: Ctx, levelId: number, modality: Modality, mode: 'question' | 'theme'): Exercise {
  const s = pickFresh(stories, (x) => x.id, `story-${mode}-${levelId}`, c.state);
  const block = { title: s.title[c.lang], text: s.text[c.lang], shortText: s.shortText[c.lang], emoji: s.emoji };
  let items: OptionInput[];
  let correctIndex = 0;
  let prompt: string;
  if (mode === 'question') {
    items = s.options.map((o) => ({ label: o[c.lang] }));
    correctIndex = s.correct;
    prompt = s.question[c.lang];
  } else {
    const others = distract(
      stories.filter((x) => x.id !== s.id).map((x) => x.theme[c.lang]),
      s.theme[c.lang],
      nOpts(c) - 1,
      c.difficulty,
    );
    items = [s.theme[c.lang], ...others].map((label) => ({ label }));
    prompt = t('promptStoryTheme', c.ui);
  }
  const { options, correctId } = optionSet(items, correctIndex);
  return makeEx(c, levelId, modality, 'story', {
    eyebrow: t('eyebrowStory', c.ui),
    prompt,
    hint: t('hintStory', c.ui),
    explanation: answerExplanation(c, items[correctIndex]!.label),
    display: { variant: 'none' },
    audio: { text: s.text[c.lang], lang: c.lang },
    story: block,
    options,
    correctId,
  });
}

/* ------------------------------------------------------------------ */
/* Generadores de las 4 fases de la lectura × 3 niveles                */
/* ------------------------------------------------------------------ */

/** Sílabas por fase y nivel: Bajo usa sílabas sencillas, Alto combina sílabas trabadas. */
function phaseSyllables(c: Ctx): string[] {
  const bank = SYLLABLE_BANKS[c.lang];
  if (c.difficulty <= 1) return [...bank[1], ...bank[2]];
  if (c.difficulty === 2) return [...bank[1], ...bank[2], ...bank[3]];
  return [...bank[2], ...bank[3]];
}

/** Genera una pseudopalabra (palabra inventada) uniendo sílabas de la fase. */
function makePseudoword(c: Ctx): string {
  const pool = phaseSyllables(c);
  const count = c.difficulty <= 1 ? 2 : c.difficulty === 2 ? 3 : 4;
  const parts: string[] = [];
  for (let i = 0; i < count; i++) parts.push(pool[Math.floor(Math.random() * pool.length)]!);
  return parts.join('');
}

/** Genera pseudopalabras distintas para opciones sin repetir. */
function makePseudowordSet(c: Ctx, n: number): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  let attempts = 0;
  while (out.length < n && attempts < 2000) {
    attempts++;
    const w = makePseudoword(c);
    if (!seen.has(w)) {
      seen.add(w);
      out.push(w);
    }
  }
  return out;
}

/** Asegura que `others` tenga al menos `n` elementos distintos de `target`. */
function padPseudowords(others: string[], target: string, n: number, c: Ctx): string[] {
  const out = [...others];
  const used = new Set([normalize(target), ...out.map(normalize)]);
  let extras = makePseudowordSet(c, n + 2);
  for (const w of extras) {
    if (out.length >= n) break;
    const nw = normalize(w);
    if (w && nw && !used.has(nw)) {
      used.add(nw);
      out.push(w);
    }
  }
  return out;
}

/** Palabras frecuentes para la fase ortográfica (según nivel: más complejas en Alto). */
function frequentWords(c: Ctx): Word[] {
  const lenLimit = c.difficulty <= 1 ? 5 : c.difficulty === 2 ? 7 : 10;
  return words.filter((w) => wordText(w, c.lang).length <= lenLimit && wordSyllables(w, c.lang).length >= 2);
}

/** Asegura que `rest` tenga al menos `n` elementos distintos de `correct`. */
function padDistractors(rest: string[], correct: string, n: number, fallback: string[]): string[] {
  const nc = normalize(correct);
  const out = [...rest];
  const used = new Set([nc, ...out.map(normalize)]);
  for (const item of fallback) {
    if (out.length >= n) break;
    const ni = normalize(item);
    if (item && ni && !used.has(ni)) {
      used.add(ni);
      out.push(item);
    }
  }
  return out;
}

/** Fase 1 · Conciencia fonológica: rimas, palmadas por sílabas, sonido inicial. */
function makePhonological(c: Ctx, levelId: number, mode: 'rhyme' | 'syllables' | 'initial'): Exercise {
  if (mode === 'rhyme') {
    const r = pickFresh(rhymes[c.lang], (x) => x.a, `fon-rhyme-${levelId}`, c.state);
    const pool = [...r.distractors, ...rhymes[c.lang].filter((x) => x.a !== r.a).map((x) => x.b)];
    const rest = padDistractors(distract(pool, r.b, nOpts(c) - 1, c.difficulty, allSyllables(c.lang)), r.b, nOpts(c) - 1, allSyllables(c.lang));
    const { options, correctId } = optionSet([r.b, ...rest].map((label) => ({ label })), 0);
    return makeEx(c, levelId, 'any', 'choice', {
      eyebrow: t('eyebrowRhyme', c.ui),
      prompt: tf('promptRhyme', c.ui, { word: r.a }),
      display: { variant: 'word', text: r.a },
      audio: { text: r.a, lang: c.lang },
      options,
      correctId,
      hint: t('hintRhyme', c.ui),
      explanation: answerExplanation(c, r.b),
    });
  }
  if (mode === 'syllables') {
    const w = pickFresh(stageWords(c), (x) => x.id, `fon-syl-${levelId}`, c.state);
    const syl = wordSyllables(w, c.lang);
    const correct = String(syl.length);
    const nums = Array.from(
      new Set(
        [
          String(syl.length - 2),
          String(syl.length - 1),
          correct,
          String(syl.length + 1),
          String(syl.length + 2),
          String(syl.length + 3),
        ].filter((n) => n !== '' && Number(n) >= 0),
      ),
    );
    const { options, correctId } = optionSet(nums.map((label) => ({ label })), nums.indexOf(correct));
    return makeEx(c, levelId, 'any', 'choice', {
      eyebrow: t('eyebrowCount', c.ui),
      prompt: tf('promptCountSyllables', c.ui, { word: wordText(w, c.lang) }),
      display: { variant: 'chunks', chunks: syl, emoji: w.emoji },
      audio: wordAudio(w, c.lang),
      options,
      correctId,
      hint: t('hintSyllables', c.ui),
      explanation: answerExplanation(c, correct),
    });
  }
  // initial sound
  const w = pickFresh(stageWords(c), (x) => x.id, `fon-init-${levelId}`, c.state);
  const token = initialToken(wordText(w, c.lang), c.lang);
  const rest = padDistractors(distract(allInitials(c.lang), token, nOpts(c) - 1, c.difficulty), token, nOpts(c) - 1, words.map((x) => wordText(x, c.lang)));
  const { options, correctId } = optionSet([token, ...rest].map((label) => ({ label })), 0);
  return makeEx(c, levelId, 'auditivo', 'choice', {
    eyebrow: t('eyebrowListen', c.ui),
    prompt: t('promptStartSound', c.ui),
    display: { variant: 'emoji', emoji: w.emoji },
    audio: wordAudio(w, c.lang),
    options,
    correctId,
    hint: `${t('hintFirst', c.ui)} ${t('hintListen', c.ui)}`,
    explanation: answerExplanation(c, token),
  });
}

/** Fase 2 · Fase logográfica: lectura visual de palabras memorizadas (forma global). */
function makeLogographic(c: Ctx, levelId: number, mode: 'word-image' | 'image-word'): Exercise {
  const w = pickFresh(stageWords(c), (x) => x.id, `log-${mode}-${levelId}`, c.state);
  const text = wordText(w, c.lang);
  if (mode === 'word-image') {
    const pool = stageWords(c).filter((x) => x.id !== w.id);
    const chosen = distract(
      pool.map((x) => x.emoji),
      w.emoji,
      nOpts(c) - 1,
      c.difficulty,
      stageWords(c).map((x) => x.emoji),
    );
    const items: OptionInput[] = [w.emoji, ...chosen].map((emoji) => ({ label: emoji, emoji }));
    const { options, correctId } = optionSet(items, 0);
    return makeEx(c, levelId, 'visual', 'choice', {
      eyebrow: t('eyebrowRead', c.ui),
      prompt: tf('promptWhichImage', c.ui, { word: text }),
      display: { variant: 'word', text },
      audio: wordAudio(w, c.lang),
      options,
      correctId,
      hint: t('hintVisual', c.ui),
      explanation: answerExplanation(c, text, 'read'),
    });
  }
  const pool = stageWords(c).filter((x) => x.id !== w.id);
  const { options, correctId } = wordOptions(c, w, pool, true);
  return makeEx(c, levelId, 'visual', 'choice', {
    eyebrow: t('eyebrowLook', c.ui),
    prompt: t('promptHowWrite', c.ui),
    display: { variant: 'emoji', emoji: w.emoji },
    audio: wordAudio(w, c.lang),
    options,
    correctId,
    hint: t('hintVisual', c.ui),
    explanation: answerExplanation(c, text, 'written'),
  });
}

/** Fase 3 · Fase alfabética: decodificación, letra-sonido y pseudopalabras. */
function makeAlphabetic(c: Ctx, levelId: number, mode: 'pseudoword' | 'letter-order' | 'dictation'): Exercise {
  if (mode === 'pseudoword') {
    const target = makePseudoword(c);
    const others = padPseudowords(makePseudowordSet(c, Math.max(1, nOpts(c) - 1)).filter((o) => o !== target), target, nOpts(c) - 1, c);
    const all = [target, ...others];
    const { options, correctId } = optionSet(all.map((label) => ({ label })), 0);
    return makeEx(c, levelId, 'auditivo', 'choice', {
      eyebrow: t('eyebrowAlphabetic', c.ui),
      prompt: t('promptPseudoword', c.ui),
      display: { variant: 'none' },
      audio: { text: target, lang: c.lang },
      options,
      correctId,
      hint: t('hintAlphabetic', c.ui),
      explanation: answerExplanation(c, target, 'written'),
    });
  }
  if (mode === 'letter-order') {
    return makeLetterOrder(c, levelId, 'visual');
  }
  return makeDictation(c, levelId);
}

/** Fase 4 · Fase ortográfica: fluidez, automatización y comprensión de textos. */
function makeOrthographic(c: Ctx, levelId: number, mode: 'frequency' | 'sentence' | 'story'): Exercise {
  if (mode === 'frequency') {
    const w = pickFresh(frequentWords(c), (x) => x.id, `orto-freq-${levelId}`, c.state);
    const text = wordText(w, c.lang);
    const pool = frequentWords(c).filter((x) => x.id !== w.id);
    const { options, correctId } = wordOptions(c, w, pool, true);
    return makeEx(c, levelId, 'visual', 'choice', {
      eyebrow: t('eyebrowOrthographic', c.ui),
      prompt: t('promptFrequencyWord', c.ui),
      display: { variant: 'emoji', emoji: w.emoji },
      audio: wordAudio(w, c.lang),
      options,
      correctId,
      hint: t('hintOrthographic', c.ui),
      explanation: answerExplanation(c, text, 'written'),
    });
  }
  if (mode === 'sentence') {
    return makeOrder(c, levelId, 'visual');
  }
  return makeStory(c, levelId, 'any', 'question');
}

/** Dispatcher: genera un ejercicio propio de la fase de lectura (4 fases × 3 niveles). */
function makePhaseExercise(c: Ctx, phase: ReadingPhase): Exercise | null {
  switch (phase) {
    case 'fonologica': {
      const modes: Array<'rhyme' | 'syllables' | 'initial'> = ['rhyme', 'syllables', 'initial'];
      return makePhonological(c, c.state.seq % 6, modes[Math.floor(Math.random() * modes.length)]!);
    }
    case 'logográfica': {
      const modes: Array<'word-image' | 'image-word'> = ['word-image', 'image-word'];
      return makeLogographic(c, c.state.seq % 6, modes[Math.floor(Math.random() * modes.length)]!);
    }
    case 'alfabética': {
      const modes: Array<'pseudoword' | 'letter-order' | 'dictation'> = ['pseudoword', 'letter-order', 'dictation'];
      return makeAlphabetic(c, c.state.seq % 6, modes[Math.floor(Math.random() * modes.length)]!);
    }
    case 'ortográfica': {
      const modes: Array<'frequency' | 'sentence' | 'story'> = ['frequency', 'sentence', 'story'];
      return makeOrthographic(c, c.state.seq % 6, modes[Math.floor(Math.random() * modes.length)]!);
    }
  }
}

/* ------------------------------------------------------------------ */
/* Generadores de los modos de apoyo                                   */
/* ------------------------------------------------------------------ */

function colorOptions(c: Ctx, correct: ColorItem): { options: Option[]; correctId: string } {
  const pool = colors.filter((x) => x.id !== correct.id);
  const labels = distract(pool.map((x) => x[c.lang]), correct[c.lang], Math.max(1, nOpts(c) - 1), c.difficulty);
  const picked = labels.map((label) => colors.find((x) => x[c.lang] === label)!).filter(Boolean);
  const items: OptionInput[] = [correct, ...picked].map((x) => ({
    label: x[c.lang],
    color: x.hex,
    pattern: x.pattern,
    symbol: x.symbol,
  }));
  return optionSet(items, 0);
}

function numeralOptions(correctN: number): { options: Option[]; correctId: string } {
  const all = numbers.map((n) => String(n.n));
  const { options, correctId } = optionSet(all.map((label) => ({ label })), all.indexOf(String(correctN)));
  return { options, correctId };
}

/** Juego imperativo: sin respuestas incorrectas y a ritmo libre. */
function makeAction(c: Ctx, levelId: number, twoSteps = false): Exercise {
  const first = pickFresh(imperatives, (x) => x.id, `action-${levelId}`, c.state);
  const firstText = first[c.lang];
  let prompt = firstText;
  let steps: string[] | undefined;
  let emoji = first.emoji;
  if (twoSteps) {
    const second = pickFresh(
      imperatives.filter((x) => x.id !== first.id),
      (x) => x.id,
      `action2-${levelId}`,
      c.state,
    );
    steps = [firstText, second[c.lang]];
    prompt = tf('promptTwoSteps', c.lang, { first: steps[0]!, second: steps[1]! });
    emoji = `${first.emoji} ${second.emoji}`;
  }
  return makeEx(c, levelId, 'any', 'action', {
    eyebrow: t('eyebrowLumaSays', c.ui),
    prompt,
    display: { variant: 'none' },
    action: { emoji, text: prompt, steps },
    audio: { text: prompt, lang: c.lang },
    autoAudio: true,
    hint: t('hintAction', c.ui),
    explanation: t('actionDone', c.ui),
  });
}

/** Tarjeta de minijuego interactivo: siempre sin fallo y con voz. */
function makePlayAction(
  c: Ctx,
  levelId: number,
  game: ActionGame,
  emoji: string,
  prompt: string,
  audioText: string,
): Exercise {
  return makeEx(c, levelId, 'any', 'action', {
    eyebrow: t('eyebrowLumaSays', c.ui),
    prompt,
    display: { variant: 'none' },
    action: { emoji, text: prompt, game },
    audio: { text: audioText, lang: c.lang },
    autoAudio: true,
    hint: t('hintAction', c.ui),
    explanation: t('actionDone', c.ui),
  });
}

function playNumber(c: Ctx) {
  return numbers[1 + (c.state.seq % 4)]!;
}

/** Actividad de lectura fácil usada como alternativa cuando el mundo es abstracto. */
function makeSimpleChoice(c: Ctx, levelId: number): Exercise {
  const bank = visualWords(c);
  const w = pickFresh(bank, (x) => x.id, 'simple-choice', c.state);
  const chosen = distract(
    bank.filter((x) => x.id !== w.id).map((x) => x.emoji),
    w.emoji,
    Math.max(1, nOpts(c) - 1),
    c.difficulty,
    bank.map((x) => x.emoji),
  );
  const items: OptionInput[] = [w.emoji, ...chosen].map((emoji) => ({ label: emoji, emoji }));
  const { options, correctId } = optionSet(items, 0);
  const text = wordText(w, c.lang);
  return makeEx(c, levelId, 'visual', 'choice', {
    eyebrow: t('eyebrowLook', c.ui),
    prompt: tf('promptWhichImage', c.ui, { word: text }),
    display: { variant: 'word', text },
    audio: wordAudio(w, c.lang),
    options,
    correctId,
    hint: t('hintVisual', c.ui),
    explanation: answerExplanation(c, text, 'read'),
  });
}

/* ------------------------------------------------------------------ */
/* Fábricas por mundo                                                  */
/* ------------------------------------------------------------------ */

const factories: Record<number, Factory[]> = {
  1: [
    {
      id: 'l1-sound',
      modality: 'auditivo',
      make(c) {
        const w = pickFresh(words, (x) => x.id, 'l1-sound', c.state);
        const text = wordText(w, c.lang);
        const token = initialToken(text, c.lang);
        const rest = distract(allInitials(c.lang), token, nOpts(c) - 1, c.difficulty);
        const { options, correctId } = optionSet([token, ...rest].map((label) => ({ label })), 0);
        return makeEx(c, 1, 'auditivo', 'choice', {
          eyebrow: t('eyebrowListen', c.ui),
          prompt: t('promptStartSound', c.ui),
          display: { variant: 'none' },
          audio: wordAudio(w, c.lang),
          options,
          correctId,
          hint: `${t('hintFirst', c.ui)} ${t('hintListen', c.ui)}`,
          explanation: answerExplanation(c, token),
        });
      },
    },
    {
      id: 'l1-syllable-sound',
      modality: 'auditivo',
      make(c) {
        const w = pickFresh(words, (x) => x.id, 'l1-syl-sound', c.state);
        const syl = wordSyllables(w, c.lang)[0]!;
        const token = initialToken(syl, c.lang);
        const rest = distract(allInitials(c.lang), token, nOpts(c) - 1, c.difficulty);
        const { options, correctId } = optionSet([token, ...rest].map((label) => ({ label })), 0);
        return makeEx(c, 1, 'auditivo', 'choice', {
          eyebrow: t('eyebrowListen', c.ui),
          prompt: t('promptStartSound', c.ui),
          display: { variant: 'none' },
          audio: { text: syl, lang: c.lang },
          options,
          correctId,
          hint: t('hintListen', c.ui),
          explanation: answerExplanation(c, token),
        });
      },
    },
    {
      id: 'l1-missing',
      modality: 'visual',
      make(c) {
        const w = pickFresh(visualWords(c).filter((x) => wordText(x, c.lang).length > 2), (x) => x.id, 'l1-missing', c.state);
        const text = wordText(w, c.lang);
        const token = initialToken(text, c.lang);
        const hidden = `＿${text.slice(token.length)}`;
        const rest = distract(allInitials(c.lang), token, nOpts(c) - 1, c.difficulty);
        const { options, correctId } = optionSet([token, ...rest].map((label) => ({ label })), 0);
        return makeEx(c, 1, 'visual', 'choice', {
          eyebrow: t('eyebrowLook', c.ui),
          prompt: t('promptMissingLetter', c.ui),
          display: { variant: 'hidden', text: hidden, emoji: w.emoji },
          audio: wordAudio(w, c.lang),
          options,
          correctId,
          hint: t('hintFirst', c.ui),
          explanation: answerExplanation(c, text, 'written'),
        });
      },
    },
    {
      id: 'l1-picture-letter',
      modality: 'visual',
      make(c) {
        const w = pickFresh(visualWords(c), (x) => x.id, 'l1-pic-letter', c.state);
        const text = wordText(w, c.lang);
        const token = initialToken(text, c.lang);
        const rest = distract(allInitials(c.lang), token, nOpts(c) - 1, c.difficulty);
        const { options, correctId } = optionSet([token, ...rest].map((label) => ({ label })), 0);
        return makeEx(c, 1, 'visual', 'choice', {
          eyebrow: t('eyebrowLook', c.ui),
          prompt: t('promptStartPicture', c.ui),
          display: { variant: 'emoji', emoji: w.emoji },
          audio: wordAudio(w, c.lang),
          options,
          correctId,
          hint: t('hintVisual', c.ui),
          explanation: answerExplanation(c, token),
        });
      },
    },
    {
      id: 'l1-find-letter',
      modality: 'visual',
      make(c) {
        const w = pickFresh(visualWords(c).filter((x) => wordText(x, c.lang).length >= 4), (x) => x.id, 'l1-find', c.state);
        const text = wordText(w, c.lang);
        const gs = splitGraphemes(text, c.lang);
        const counts = new Map<string, number>();
        gs.forEach((g) => counts.set(normalize(g), (counts.get(normalize(g)) ?? 0) + 1));
        const specials = specialSounds[c.lang];
        let candidates = gs.filter((g) => counts.get(normalize(g)) === 1);
        if (c.difficulty >= 3) {
          const special = candidates.filter((g) => specials.includes(normalize(g)));
          if (special.length) candidates = special;
        }
        const target = rnd(candidates.length ? candidates : gs);
        const targetIndex = gs.findIndex((g) => normalize(g) === normalize(target));
        const chips: Tile[] = gs.map((g, i) => ({ id: `c${i}`, label: g }));
        return makeEx(c, 1, 'visual', 'tap', {
          eyebrow: t('eyebrowTap', c.ui),
          prompt: tf('promptFindLetter', c.ui, { token: target }),
          display: { variant: 'emoji', emoji: w.emoji },
          audio: wordAudio(w, c.lang),
          chips,
          correctChip: `c${targetIndex}`,
          hint: t('hintVisual', c.ui),
          explanation: answerExplanation(c, text, 'read'),
        });
      },
    },
    {
      id: 'l1-letters-order',
      modality: 'visual',
      make: (c) => makeLetterOrder(c, 1, 'visual'),
    },
    {
      id: 'dict-word-1',
      modality: 'auditivo',
      make: (c) => makeDictation(c, 1),
    },
    {
      id: 'phase-pairs-1',
      modality: 'visual',
      make: (c) => makePhasePairs(c, 1),
    },
  ],

  2: [
    {
      id: 'l2-build',
      modality: 'visual',
      make: (c) => makeBuild(c, 2, 'visual', 2),
    },
    {
      id: 'l2-letters-order',
      modality: 'visual',
      make: (c) => makeLetterOrder(c, 2, 'visual'),
    },
    {
      id: 'dict-word-2',
      modality: 'auditivo',
      make: (c) => makeDictation(c, 2),
    },
    {
      id: 'phase-pairs-2',
      modality: 'visual',
      make: (c) => makePhasePairs(c, 2),
    },
    {
      id: 'l2-find-syllable',
      modality: 'visual',
      make(c) {
        const w = pickFresh(stageVisualWords(c, 2), (x) => x.id, `l2-find-s${c.syllableStage}`, c.state);
        const syl = wordSyllables(w, c.lang);
        const index = pickStageSyllableIndex(syl, c.syllableStage);
        const chips: Tile[] = syl.map((s, i) => ({ id: `c${i}`, label: s }));
        return makeEx(c, 2, 'visual', 'tap', {
          eyebrow: t('eyebrowTap', c.ui),
          prompt: tf('promptFindSyllable', c.ui, { token: syl[index]! }),
          display: { variant: 'chunks', chunks: syl, emoji: w.emoji },
          audio: wordAudio(w, c.lang),
          chips,
          correctChip: `c${index}`,
          hint: stageHint(c),
          explanation: answerExplanation(c, syl[index]!),
          syllableStage: c.syllableStage,
        });
      },
    },
    {
      id: 'l2-hear-syllable',
      modality: 'auditivo',
      make(c) {
        const w = pickFresh(stageVisualWords(c, 2), (x) => x.id, `l2-hear-s${c.syllableStage}`, c.state);
        const syl = wordSyllables(w, c.lang);
        const index = pickStageSyllableIndex(syl, c.syllableStage);
        const chips: Tile[] = syl.map((s, i) => ({ id: `c${i}`, label: s }));
        return makeEx(c, 2, 'auditivo', 'tap', {
          eyebrow: t('eyebrowListen', c.ui),
          prompt: t('promptHearSyllable', c.ui),
          display: { variant: 'chunks', chunks: syl, emoji: w.emoji },
          audio: { text: syl[index]!, lang: c.lang },
          chips,
          correctChip: `c${index}`,
          hint: stageHint(c),
          explanation: answerExplanation(c, syl[index]!),
          syllableStage: c.syllableStage,
        });
      },
    },
    {
      id: 'l2-stage-missing',
      modality: 'visual',
      make(c) {
        const w = pickFresh(stageVisualWords(c, 2), (x) => x.id, `l2-miss-s${c.syllableStage}`, c.state);
        const syl = wordSyllables(w, c.lang);
        const index = pickStageSyllableIndex(syl, c.syllableStage);
        const target = syl[index]!;
        const hidden = syl.map((s, i) => (i === index ? '＿' : s)).join('');
        const bank = SYLLABLE_BANKS[c.lang][c.syllableStage];
        const contrastExtra: string[] = [];
        if (c.syllableStage === 2 && target.length === 2) {
          contrastExtra.push(`${target[1]}${target[0]}`);
        } else if (c.syllableStage === 3 && target.length >= 3) {
          contrastExtra.push(`${target[0]}${target.slice(2)}`);
        }
        const rest = distract([...contrastExtra, ...bank], target, nOpts(c) - 1, c.difficulty, allSyllables(c.lang));
        const { options, correctId } = optionSet([target, ...rest].map((label) => ({ label })), 0);
        const text = wordText(w, c.lang);
        return makeEx(c, 2, 'visual', 'choice', {
          eyebrow: t('eyebrowComplete', c.ui),
          prompt: c.syllableStage === 3 ? t('promptTrabadaWord', c.ui) : t('promptMissingLetter', c.ui),
          display: { variant: 'hidden', text: hidden, emoji: w.emoji },
          audio: wordAudio(w, c.lang),
          options,
          correctId,
          hint: stageHint(c),
          explanation: answerExplanation(c, text, 'written'),
          syllableStage: c.syllableStage,
        });
      },
    },
    {
      id: 'l2-count',
      modality: 'any',
      make(c) {
        const w = pickFresh(stageVisualWords(c, 1), (x) => x.id, `l2-count-s${c.syllableStage}`, c.state);
        const syl = wordSyllables(w, c.lang);
        const nums = ['1', '2', '3', '4', '5'];
        const correct = String(syl.length);
        const { options, correctId } = optionSet(nums.map((label) => ({ label })), nums.indexOf(correct));
        return makeEx(c, 2, 'any', 'choice', {
          eyebrow: t('eyebrowCount', c.ui),
          prompt: tf('promptCountSyllables', c.ui, { word: wordText(w, c.lang) }),
          display: { variant: 'chunks', chunks: syl, emoji: w.emoji },
          audio: wordAudio(w, c.lang),
          options,
          correctId,
          hint: stageHint(c),
          explanation: answerExplanation(c, correct),
          syllableStage: c.syllableStage,
        });
      },
    },
    {
      id: 'l2-starts-with',
      modality: 'visual',
      make(c) {
        const wanted = c.syllableStage === 3 ? 'trabada' : c.syllableStage === 2 ? 'inversa' : 'directa';
        const stageStarters = words.filter((x) => classifySyllable(wordSyllables(x, c.lang)[0]!) === wanted);
        const w = pickFresh(stageStarters.length ? stageStarters : words, (x) => x.id, `l2-starts-s${c.syllableStage}`, c.state);
        const target = wordSyllables(w, c.lang)[0]!;
        const pool = words.filter((x) => x.id !== w.id && wordSyllables(x, c.lang)[0] !== target);
        const { options, correctId } = wordOptions(c, w, pool);
        return makeEx(c, 2, 'visual', 'choice', {
          eyebrow: t('eyebrowRead', c.ui),
          prompt: tf('promptStartsWith', c.ui, { token: target }),
          display: { variant: 'word', text: target },
          options,
          correctId,
          hint: stageHint(c),
          explanation: answerExplanation(c, wordText(w, c.lang), 'written'),
          syllableStage: c.syllableStage,
        });
      },
    },
    {
      id: 'l2-hear-syllable-choice',
      modality: 'auditivo',
      make(c) {
        if (c.syllableStage === 2 && c.state.seq % 2 === 0) {
          const pair = pickFresh(INVERSE_MIRROR_PAIRS[c.lang], (p) => p[0], 'l2-mirror', c.state);
          const inv = pair[0];
          const dir = pair[1];
          const extra = distract(SYLLABLE_BANKS[c.lang][2], inv, Math.max(0, nOpts(c) - 2), c.difficulty).filter((s) => s !== dir);
          const items = [inv, dir, ...extra].slice(0, nOpts(c));
          const { options, correctId } = optionSet(items.map((label) => ({ label })), 0);
          return makeEx(c, 2, 'auditivo', 'choice', {
            eyebrow: t('eyebrowListen', c.ui),
            prompt: tf('promptInverseMirror', c.ui, { a: inv, b: dir }),
            display: { variant: 'none' },
            audio: { text: inv, lang: c.lang },
            options,
            correctId,
            hint: stageHint(c),
            explanation: answerExplanation(c, inv),
            syllableStage: 2,
          });
        }

        const stagePool = wordsForSyllableStage(c.syllableStage, c.lang);
        const w = pickFresh(stagePool.length ? stagePool : words, (x) => x.id, `l2-hear-choice-s${c.syllableStage}`, c.state);
        const syl = wordSyllables(w, c.lang);
        const idx = pickStageSyllableIndex(syl, c.syllableStage);
        const target = syl[idx]!;
        const bank = SYLLABLE_BANKS[c.lang][c.syllableStage];
        const rest = distract(bank, target, nOpts(c) - 1, c.difficulty, allSyllables(c.lang));
        const { options, correctId } = optionSet([target, ...rest].map((label) => ({ label })), 0);
        return makeEx(c, 2, 'auditivo', 'choice', {
          eyebrow: t('eyebrowListen', c.ui),
          prompt: t('promptHearSyllableChoice', c.ui),
          display: { variant: 'none' },
          audio: { text: target, lang: c.lang },
          options,
          correctId,
          hint: stageHint(c),
          explanation: answerExplanation(c, target),
          syllableStage: c.syllableStage,
        });
      },
    },
  ],

  3: [
    {
      id: 'l3-word-image',
      modality: 'visual',
      make(c) {
        const bank = visualWords(c);
        const stageBank = stageVisualWords(c, 1);
        const w = pickFresh(stageBank, (x) => x.id, `l3-word-img-s${c.syllableStage}`, c.state);
        const pool = bank.filter((x) => x.id !== w.id);
        const chosen = distract(
          pool.map((x) => x.emoji),
          w.emoji,
          nOpts(c) - 1,
          c.difficulty,
          bank.map((x) => x.emoji),
        );
        const items: OptionInput[] = [w.emoji, ...chosen].map((emoji) => ({ label: emoji, emoji }));
        const { options, correctId } = optionSet(items, 0);
        const text = wordText(w, c.lang);
        return makeEx(c, 3, 'visual', 'choice', {
          eyebrow: t('eyebrowRead', c.ui),
          prompt: tf('promptWhichImage', c.ui, { word: text }),
          display: { variant: 'word', text },
          audio: wordAudio(w, c.lang),
          options,
          correctId,
          hint: t('hintVisual', c.ui),
          explanation: answerExplanation(c, text, 'read'),
        });
      },
    },
    {
      id: 'l3-image-word',
      modality: 'visual',
      make(c) {
        const bank = visualWords(c);
        const stageBank = stageVisualWords(c, 1);
        const w = pickFresh(stageBank, (x) => x.id, `l3-img-word-s${c.syllableStage}`, c.state);
        const { options, correctId } = wordOptions(c, w, bank.filter((x) => x.id !== w.id), true);
        const text = wordText(w, c.lang);
        return makeEx(c, 3, 'visual', 'choice', {
          eyebrow: t('eyebrowLook', c.ui),
          prompt: t('promptHowWrite', c.ui),
          display: { variant: 'emoji', emoji: w.emoji },
          audio: wordAudio(w, c.lang),
          options,
          correctId,
          hint: t('hintVisual', c.ui),
          explanation: answerExplanation(c, text, 'written'),
        });
      },
    },
    {
      id: 'l3-hear-word',
      modality: 'auditivo',
      make(c) {
        const stagePool = wordsForSyllableStage(c.syllableStage, c.lang);
        const w = pickFresh(stagePool.length ? stagePool : words, (x) => x.id, `l3-hear-word-s${c.syllableStage}`, c.state);
        const sameCat = words.filter((x) => x.id !== w.id && x.cat === w.cat);
        const pool = c.difficulty >= 3 && sameCat.length >= 2 ? sameCat : words.filter((x) => x.id !== w.id);
        const { options, correctId } = wordOptions(c, w, pool);
        const text = wordText(w, c.lang);
        return makeEx(c, 3, 'auditivo', 'choice', {
          eyebrow: t('eyebrowListen', c.ui),
          prompt: t('promptHearWord', c.ui),
          display: { variant: 'none' },
          audio: wordAudio(w, c.lang),
          options,
          correctId,
          hint: t('hintListen', c.ui),
          explanation: answerExplanation(c, text, 'written'),
        });
      },
    },
    {
      id: 'l3-hear-image',
      modality: 'auditivo',
      make(c) {
        const bank = visualWords(c);
        const stageBank = stageVisualWords(c, 1);
        const w = pickFresh(stageBank, (x) => x.id, `l3-hear-img-s${c.syllableStage}`, c.state);
        const chosen = distract(
          bank.filter((x) => x.id !== w.id).map((x) => x.emoji),
          w.emoji,
          nOpts(c) - 1,
          c.difficulty,
          bank.map((x) => x.emoji),
        );
        const items: OptionInput[] = [w.emoji, ...chosen].map((emoji) => ({ label: emoji, emoji }));
        const { options, correctId } = optionSet(items, 0);
        const text = wordText(w, c.lang);
        return makeEx(c, 3, 'auditivo', 'choice', {
          eyebrow: t('eyebrowListen', c.ui),
          prompt: t('promptHearImage', c.ui),
          display: { variant: 'none' },
          audio: wordAudio(w, c.lang),
          options,
          correctId,
          hint: t('hintListen', c.ui),
          explanation: answerExplanation(c, text, 'read'),
        });
      },
    },
    {
      id: 'l3-category',
      modality: 'any',
      make(c) {
        const cats = Array.from(new Set(words.map((w) => w.cat))).filter(
          (cat) => words.filter((w) => w.cat === cat).length >= 3,
        );
        const cat = rnd(cats);
        const correct = pickFresh(words.filter((w) => w.cat === cat), (x) => x.id, 'l3-cat-correct', c.state);
        const pool = words.filter((w) => w.cat !== cat);
        const { options, correctId } = wordOptions(c, correct, pool, true);
        return makeEx(c, 3, 'any', 'choice', {
          eyebrow: t('eyebrowCategory', c.ui),
          prompt: tf('promptWhichCategory', c.ui, { cat: t(`cat${cat[0]!.toUpperCase()}${cat.slice(1)}`, c.ui) }),
          display: { variant: 'none' },
          options,
          correctId,
          hint: t('hintVisual', c.ui),
          explanation: answerExplanation(c, wordText(correct, c.lang)),
        });
      },
    },
    {
      id: 'l3-build',
      modality: 'visual',
      make: (c) => makeBuild(c, 3, 'visual', 3),
    },
    {
      id: 'l3-letters-order',
      modality: 'visual',
      make: (c) => makeLetterOrder(c, 3, 'visual'),
    },
    {
      id: 'dict-word-3',
      modality: 'auditivo',
      make: (c) => makeDictation(c, 3),
    },
    {
      id: 'phase-pairs-3',
      modality: 'visual',
      make: (c) => makePhasePairs(c, 3),
    },
  ],

  4: [
    {
      id: 'l4-minimal',
      modality: 'auditivo',
      make(c) {
        const set = pickFresh(minimalPairs[c.lang], (x) => x.join('|'), 'l4-min', c.state);
        const index = Math.floor(Math.random() * set.length);
        const { options, correctId } = optionSet(set.map((label) => ({ label })), index);
        return makeEx(c, 4, 'auditivo', 'choice', {
          eyebrow: t('eyebrowListen', c.ui),
          prompt: t('promptSameSound', c.ui),
          display: { variant: 'none' },
          audio: { text: set[index]!, lang: c.lang },
          options,
          correctId,
          hint: t('hintListen', c.ui),
          explanation: answerExplanation(c, set[index]!),
        });
      },
    },
    {
      id: 'l4-rhyme',
      modality: 'any',
      make(c) {
        const r = pickFresh(rhymes[c.lang], (x) => x.a, 'l4-rhyme', c.state);
        const pool = [...r.distractors, ...rhymes[c.lang].filter((x) => x.a !== r.a).map((x) => x.b)];
        const rest = distract(pool, r.b, nOpts(c) - 1, c.difficulty, allSyllables(c.lang));
        const { options, correctId } = optionSet([r.b, ...rest].map((label) => ({ label })), 0);
        return makeEx(c, 4, 'any', 'choice', {
          eyebrow: t('eyebrowRhyme', c.ui),
          prompt: tf('promptRhyme', c.ui, { word: r.a }),
          display: { variant: 'word', text: r.a },
          audio: { text: r.a, lang: c.lang },
          options,
          correctId,
          hint: t('hintRhyme', c.ui),
          explanation: answerExplanation(c, r.b),
        });
      },
    },
    {
      id: 'l4-ends-like',
      modality: 'visual',
      make(c) {
        const r = pickFresh(rhymes[c.lang], (x) => x.a, 'l4-ends', c.state);
        const pool = [...r.distractors, ...rhymes[c.lang].filter((x) => x.a !== r.a).map((x) => x.b)];
        const rest = distract(pool, r.b, nOpts(c) - 1, c.difficulty);
        const { options, correctId } = optionSet([r.b, ...rest].map((label) => ({ label })), 0);
        return makeEx(c, 4, 'visual', 'choice', {
          eyebrow: t('eyebrowRhyme', c.ui),
          prompt: tf('promptEndsLike', c.ui, { word: r.a }),
          display: { variant: 'word', text: r.a },
          audio: { text: r.a, lang: c.lang },
          options,
          correctId,
          hint: t('hintRhyme', c.ui),
          explanation: answerExplanation(c, r.b),
        });
      },
    },
    {
      id: 'l4-hear-rhyme',
      modality: 'auditivo',
      make(c) {
        const r = pickFresh(rhymes[c.lang], (x) => x.a, 'l4-hear-rhyme', c.state);
        const pool = [r.a, ...r.distractors, ...rhymes[c.lang].filter((x) => x.a !== r.a).map((x) => x.b)];
        const rest = distract(pool, r.b, nOpts(c) - 1, c.difficulty);
        const { options, correctId } = optionSet([r.b, ...rest].map((label) => ({ label })), 0);
        return makeEx(c, 4, 'auditivo', 'choice', {
          eyebrow: t('eyebrowListen', c.ui),
          prompt: t('promptHearWord', c.ui),
          display: { variant: 'none' },
          audio: { text: r.b, lang: c.lang },
          options,
          correctId,
          hint: t('hintListen', c.ui),
          explanation: answerExplanation(c, r.b),
        });
      },
    },
    {
      id: 'l4-special-tap',
      modality: 'visual',
      make(c) {
        const specials = shuffle(specialSounds[c.lang]);
        for (const special of specials) {
          const pool = words.filter((w) => {
            const syl = wordSyllables(w, c.lang);
            return syl.length >= 2 && syl.filter((s) => normalize(s).includes(special)).length === 1;
          });
          if (!pool.length) continue;
          const w = pickFresh(pool, (x) => x.id, 'l4-special-tap', c.state);
          const syl = wordSyllables(w, c.lang);
          const index = syl.findIndex((s) => normalize(s).includes(special));
          const chips: Tile[] = syl.map((s, i) => ({ id: `c${i}`, label: s }));
          return makeEx(c, 4, 'visual', 'tap', {
            eyebrow: t('eyebrowTap', c.ui),
            prompt: tf('promptSpecialSound', c.ui, { token: special }),
            display: { variant: 'chunks', chunks: syl, emoji: c.colorblind && w.cat === 'colores' ? undefined : w.emoji, highlight: special },
            audio: wordAudio(w, c.lang),
            chips,
            correctChip: `c${index}`,
            hint: t('hintVisual', c.ui),
            explanation: answerExplanation(c, syl[index]!),
          });
        }
        return makeBuild(c, 4, 'visual', 2);
      },
    },
    {
      id: 'l4-special-choice',
      modality: 'visual',
      make(c) {
        const specials = shuffle(specialSounds[c.lang]);
        for (const special of specials) {
          const hits = words.filter((w) => normalize(wordText(w, c.lang)).includes(special));
          const pool = words.filter((x) => !normalize(wordText(x, c.lang)).includes(special));
          if (!hits.length || pool.length < nOpts(c) - 1) continue;
          const w = pickFresh(hits, (x) => x.id, 'l4-special-choice', c.state);
          const { options, correctId } = wordOptions(c, w, pool, true);
          return makeEx(c, 4, 'visual', 'choice', {
            eyebrow: t('eyebrowRead', c.ui),
            prompt: tf('promptSpecialSound', c.ui, { token: special }),
            display: { variant: 'word', text: special },
            options,
            correctId,
            hint: t('hintVisual', c.ui),
            explanation: answerExplanation(c, wordText(w, c.lang)),
          });
        }
        return makeBuild(c, 4, 'visual', 2);
      },
    },
    {
      id: 'l4-letters-order',
      modality: 'visual',
      make: (c) => makeLetterOrder(c, 4, 'visual'),
    },
    {
      id: 'dict-word-4',
      modality: 'auditivo',
      make: (c) => makeDictation(c, 4),
    },
    {
      id: 'phase-pairs-4',
      modality: 'visual',
      make: (c) => makePhasePairs(c, 4),
    },
  ],

  5: [
    { id: 'l5-blank', modality: 'visual', make: (c) => makeBlank(c, 5, 'visual') },
    { id: 'l5-blank-audio', modality: 'auditivo', make: (c) => makeBlank(c, 5, 'auditivo') },
    { id: 'l5-order', modality: 'visual', make: (c) => makeOrder(c, 5, 'visual') },
    { id: 'l5-hear-sentence', modality: 'auditivo', make: (c) => makeHearSentence(c, 5, 'auditivo') },
    {
      id: 'l5-image-sentence',
      modality: 'visual',
      make(c) {
        const s = pickFresh(sentences, (x) => x.id, 'l5-img-sent', c.state);
        const correct = sentenceTokens(s, c.lang).join(' ');
        const others = sentences
          .filter((x) => x.id !== s.id)
          .map((x) => sentenceTokens(x, c.lang).join(' '));
        const rest = distract(others, correct, nOpts(c) - 1, c.difficulty);
        const { options, correctId } = optionSet([correct, ...rest].map((label) => ({ label })), 0);
        return makeEx(c, 5, 'visual', 'choice', {
          eyebrow: t('eyebrowLook', c.ui),
          prompt: t('promptWhichSentenceImage', c.ui),
          display: { variant: 'emoji', emoji: s.emoji },
          audio: { text: correct, lang: c.lang },
          options,
          correctId,
          hint: t('hintSentence', c.ui),
          explanation: answerExplanation(c, correct, 'written'),
        });
      },
    },
    {
      id: 'l5-count-words',
      modality: 'any',
      make(c) {
        const s = pickFresh(sentences, (x) => x.id, 'l5-count', c.state);
        const tokens = sentenceTokens(s, c.lang);
        const correct = tokens.length;
        const nums = Array.from(new Set([correct - 1, correct, correct + 1, correct + 2].filter((n) => n > 0))).map(String);
        const { options, correctId } = optionSet(nums.map((label) => ({ label })), nums.indexOf(String(correct)));
        return makeEx(c, 5, 'any', 'choice', {
          eyebrow: t('eyebrowCount', c.ui),
          prompt: t('promptCountWords', c.ui),
          display: { variant: 'chunks', chunks: tokens, emoji: s.emoji },
          audio: { text: tokens.join(' '), lang: c.lang },
          options,
          correctId,
          hint: t('hintSentence', c.ui),
          explanation: answerExplanation(c, String(correct)),
        });
      },
    },
    {
      id: 'dict-sentence-5',
      modality: 'auditivo',
      make: (c) => makeDictation(c, 5),
    },
    {
      id: 'phase-pairs-5',
      modality: 'visual',
      make: (c) => makePhasePairs(c, 5),
    },
  ],

  6: [
    { id: 'l6-story', modality: 'any', make: (c) => makeStory(c, 6, 'any', 'question') },
    { id: 'l6-story-listen', modality: 'auditivo', make: (c) => makeStory(c, 6, 'auditivo', 'question') },
    { id: 'l6-story-theme', modality: 'visual', make: (c) => makeStory(c, 6, 'visual', 'theme') },
    { id: 'l6-order', modality: 'visual', make: (c) => makeOrder(c, 6, 'visual') },
    { id: 'l6-blank', modality: 'visual', make: (c) => makeBlank(c, 6, 'visual') },
    { id: 'l6-hear-sentence', modality: 'auditivo', make: (c) => makeHearSentence(c, 6, 'auditivo') },
    { id: 'dict-sentence-6', modality: 'auditivo', make: (c) => makeDictation(c, 6) },
    { id: 'phase-pairs-6', modality: 'visual', make: (c) => makePhasePairs(c, 6) },
  ],

  /* Mundo 7 · Números y colores: contenido concreto, muy visual. */
  7: [
    {
      id: 'n1-count',
      modality: 'visual',
      make(c) {
        const n = pickFresh(numbers, (x) => String(x.n), 'n1', c.state);
        const emoji = rnd(countingEmojis);
        const group = Array.from({ length: n.n }, () => emoji).join(' ');
        const { options, correctId } = numeralOptions(n.n);
        return makeEx(c, 7, 'visual', 'choice', {
          eyebrow: t('eyebrowNumbers', c.ui),
          prompt: t('promptHowMany', c.ui),
          display: { variant: 'objects', text: group, emoji },
          audio: { text: t('promptHowMany', c.lang), lang: c.lang },
          options,
          correctId,
          hint: t('hintVisual', c.ui),
          explanation: answerExplanation(c, String(n.n)),
        });
      },
    },
    {
      id: 'n2-digit-word',
      modality: 'visual',
      make(c) {
        const n = pickFresh(numbers, (x) => String(x.n), 'n2', c.state);
        const labels = numbers.map((x) => x[c.lang]);
        const { options, correctId } = optionSet(labels.map((label) => ({ label })), labels.indexOf(n[c.lang]));
        return makeEx(c, 7, 'visual', 'choice', {
          eyebrow: t('eyebrowNumbers', c.ui),
          prompt: t('promptReadNumber', c.ui),
          display: { variant: 'word', text: String(n.n) },
          audio: { text: t('promptReadNumber', c.lang), lang: c.lang },
          options,
          correctId,
          hint: t('hintVisual', c.ui),
          explanation: answerExplanation(c, n[c.lang], 'read'),
        });
      },
    },
    {
      id: 'n3-word-quantity',
      modality: 'visual',
      make(c) {
        const n = pickFresh(numbers, (x) => String(x.n), 'n3', c.state);
        const emoji = rnd(countingEmojis);
        const groups = numbers.map((x) => Array.from({ length: x.n }, () => emoji).join(' '));
        const correctGroup = groups[n.n - 1]!;
        const { options, correctId } = optionSet(groups.map((label) => ({ label })), groups.indexOf(correctGroup));
        return makeEx(c, 7, 'visual', 'choice', {
          eyebrow: t('eyebrowNumbers', c.ui),
          prompt: t('promptFindNumber', c.ui),
          display: { variant: 'word', text: n[c.lang] },
          audio: { text: t('promptFindNumber', c.lang), lang: c.lang },
          options,
          correctId,
          hint: t('hintVisual', c.ui),
          explanation: answerExplanation(c, n[c.lang]),
        });
      },
    },
    {
      id: 'n4-next-number',
      modality: 'visual',
      make(c) {
        const n = pickFresh(numbers.filter((x) => x.n < 5), (x) => String(x.n), 'n4', c.state);
        const next = n.n + 1;
        const { options, correctId } = numeralOptions(next);
        return makeEx(c, 7, 'visual', 'choice', {
          eyebrow: t('eyebrowNumbers', c.ui),
          prompt: t('promptNextNumber', c.ui),
          display: { variant: 'word', text: String(n.n) },
          audio: { text: t('promptNextNumber', c.lang), lang: c.lang },
          options,
          correctId,
          hint: t('hintVisual', c.ui),
          explanation: answerExplanation(c, String(next)),
        });
      },
    },
    {
      id: 'n5-hear-number',
      modality: 'auditivo',
      make(c) {
        const n = pickFresh(numbers, (x) => String(x.n), 'n5', c.state);
        const { options, correctId } = numeralOptions(n.n);
        return makeEx(c, 7, 'auditivo', 'choice', {
          eyebrow: t('eyebrowListen', c.ui),
          prompt: t('promptHearNumber', c.ui),
          display: { variant: 'none' },
          audio: { text: n[c.lang], lang: c.lang },
          options,
          correctId,
          hint: t('hintListen', c.ui),
          explanation: answerExplanation(c, String(n.n)),
        });
      },
    },
    {
      id: 'n6-swatch-color',
      modality: 'visual',
      make(c) {
        const col = pickFresh(colors, (x) => x.id, 'n6', c.state);
        const { options, correctId } = colorOptions(c, col);
        return makeEx(c, 7, 'visual', 'choice', {
          eyebrow: t('eyebrowColors', c.ui),
          prompt: t('promptWhichColor', c.ui),
          display: { variant: 'swatch', color: col.hex, emoji: col.emoji, pattern: col.pattern, symbol: col.symbol },
          audio: { text: t('promptWhichColor', c.lang), lang: c.lang },
          options,
          correctId,
          hint: t('hintVisual', c.ui),
          explanation: answerExplanation(c, col[c.lang]),
        });
      },
    },
    {
      id: 'n7-object-color',
      modality: 'visual',
      make(c) {
        const obj = pickFresh(colorObjects, (x) => x.emoji, 'n7', c.state);
        const col = colorById[obj.colorId]!;
        const { options, correctId } = colorOptions(c, col);
        return makeEx(c, 7, 'visual', 'choice', {
          eyebrow: t('eyebrowColors', c.ui),
          prompt: tf('promptObjectColor', c.ui, { object: obj[c.ui] }),
          display: { variant: 'emoji', emoji: obj.emoji },
          audio: { text: tf('promptObjectColor', c.lang, { object: obj[c.lang] }), lang: c.lang },
          options,
          correctId,
          hint: t('hintVisual', c.ui),
          explanation: answerExplanation(c, col[c.lang]),
        });
      },
    },
    {
      id: 'n8-hear-color',
      modality: 'auditivo',
      make(c) {
        const col = pickFresh(colors, (x) => x.id, 'n8', c.state);
        const { options, correctId } = colorOptions(c, col);
        return makeEx(c, 7, 'auditivo', 'choice', {
          eyebrow: t('eyebrowListen', c.ui),
          prompt: t('promptHearColor', c.ui),
          display: { variant: 'none' },
          audio: { text: col[c.lang], lang: c.lang },
          options,
          correctId,
          hint: t('hintListen', c.ui),
          explanation: answerExplanation(c, col[c.lang]),
        });
      },
    },
    {
      id: 'phase-pairs-7',
      modality: 'visual',
      make: (c) => makePhasePairs(c, 7),
    },
  ],

  /* Mundo 8 · ¡Pato Ventura dice!: instrucciones literales, movimiento y cero fallos. */
  8: [
    { id: 'a1-action', modality: 'any', make: (c) => makeAction(c, 8) },
    { id: 'a2-two-steps', modality: 'any', make: (c) => makeAction(c, 8, true) },
    {
      id: 'a3-luma-color',
      modality: 'visual',
      make(c) {
        const col = pickFresh(colors, (x) => x.id, 'a3', c.state);
        const { options, correctId } = colorOptions(c, col);
        return makeEx(c, 8, 'visual', 'choice', {
          eyebrow: t('eyebrowLumaSays', c.ui),
          prompt: tf('promptLumaColor', c.ui, { word: col[c.lang] }),
          display: { variant: 'none' },
          audio: { text: tf('promptLumaColor', c.lang, { word: col[c.lang] }), lang: c.lang },
          options,
          correctId,
          hint: t('hintAction', c.ui),
          explanation: answerExplanation(c, col[c.lang]),
        });
      },
    },
    {
      id: 'a4-luma-number',
      modality: 'visual',
      make(c) {
        const n = pickFresh(numbers, (x) => String(x.n), 'a4', c.state);
        const { options, correctId } = numeralOptions(n.n);
        return makeEx(c, 8, 'visual', 'choice', {
          eyebrow: t('eyebrowLumaSays', c.ui),
          prompt: tf('promptLumaNumber', c.ui, { word: String(n.n) }),
          display: { variant: 'none' },
          audio: { text: tf('promptLumaNumber', c.lang, { word: String(n.n) }), lang: c.lang },
          options,
          correctId,
          hint: t('hintAction', c.ui),
          explanation: answerExplanation(c, String(n.n)),
        });
      },
    },
    {
      id: 'a5-luma-object',
      modality: 'visual',
      make(c) {
        const bank = visualWords(c);
        const w = pickFresh(bank, (x) => x.id, 'a5', c.state);
        const chosen = distract(
          bank.filter((x) => x.id !== w.id).map((x) => x.emoji),
          w.emoji,
          Math.max(1, nOpts(c) - 1),
          c.difficulty,
          bank.map((x) => x.emoji),
        );
        const items: OptionInput[] = [w.emoji, ...chosen].map((emoji) => ({ label: emoji, emoji }));
        const { options, correctId } = optionSet(items, 0);
        const text = wordText(w, c.lang);
        return makeEx(c, 8, 'visual', 'choice', {
          eyebrow: t('eyebrowLumaSays', c.ui),
          prompt: tf('promptLumaObject', c.ui, { word: text }),
          display: { variant: 'none' },
          audio: { text: tf('promptLumaObject', c.lang, { word: text }), lang: c.lang },
          options,
          correctId,
          hint: t('hintAction', c.ui),
          explanation: answerExplanation(c, text, 'read'),
        });
      },
    },
    { id: 'a6-action', modality: 'any', make: (c) => makeAction(c, 8) },
    {
      id: 'a7-bubbles',
      modality: 'any',
      make(c) {
        const n = playNumber(c);
        const prompt = tf('promptLumaBubbles', c.lang, { n: n[c.lang] });
        return makePlayAction(c, 8, { kind: 'bubbles', target: n.n, label: t('actionBubble', c.ui) }, '🫧', prompt, prompt);
      },
    },
    {
      id: 'a8-claps',
      modality: 'any',
      make(c) {
        const n = playNumber(c);
        const prompt = tf('promptLumaClaps', c.lang, { n: n[c.lang] });
        return makePlayAction(c, 8, { kind: 'count', target: n.n, emoji: '👏', label: t('actionClap', c.ui) }, '👏', prompt, prompt);
      },
    },
    {
      id: 'a9-breathe',
      modality: 'any',
      make(c) {
        const n = playNumber(c);
        const prompt = tf('promptLumaBreathe', c.lang, { n: n[c.lang] });
        return makePlayAction(c, 8, { kind: 'breathe', target: n.n, label: t('actionBreathe', c.ui) }, '🌬️', prompt, prompt);
      },
    },
    {
      id: 'a10-find',
      modality: 'visual',
      make(c) {
        const items = shuffle(visualWords(c))
          .slice(0, Math.max(3, nOpts(c)))
          .map((w, i) => ({ id: `f${i}`, emoji: w.emoji, label: wordText(w, c.lang) }));
        const prompt = t('promptLumaFind', c.lang);
        return makePlayAction(c, 8, { kind: 'find', items, label: t('actionFindHint', c.ui) }, '🔎', prompt, prompt);
      },
    },
    {
      id: 'a11-imitate',
      modality: 'any',
      make(c) {
        const imp = pickFresh(imperatives, (x) => x.id, 'a11-imitate', c.state);
        const prompt = tf('promptLumaImitate', c.lang, { emoji: imp.emoji });
        return makePlayAction(c, 8, { kind: 'imitate' }, imp.emoji, prompt, prompt);
      },
    },
    { id: 'a12-move', modality: 'any', make: (c) => makeAction(c, 8) },
    {
      id: 'phase-pairs-8',
      modality: 'visual',
      make: (c) => makePhasePairs(c, 8),
    },
  ],
};

/* ------------------------------------------------------------------ */
/* Selección adaptada a la ruta                                        */
/* ------------------------------------------------------------------ */

export interface ExerciseRequest {
  levelId: number;
  lang: Lang;
  learnLang: LearnLang;
  ui: UiLang;
  route: Route;
  difficulty: number;
  slot: number;
  state: GenState;
  adaptations?: Adaptations;
  syllableStage?: SyllableStage;
  schoolStage?: SchoolStage;
  readingPhase?: ReadingPhase;
  simpleOnly?: boolean;
}

/** Actividades adecuadas para lectura fácil: concretas, cortas y con imagen. */
function isEasyFactory(id: string): boolean {
  if (id.startsWith('n') || id.startsWith('a') || id.startsWith('l1') || id.startsWith('l3')) return id !== 'l3-category';
  return [
    'l2-build',
    'l2-find-syllable',
    'l2-hear-syllable',
    'l2-stage-missing',
    'l4-special-choice',
    'l4-special-tap',
    'l5-blank',
    'l5-blank-audio',
    'l6-blank',
    'l6-story',
    'letters-order',
    'phase-pairs',
    'dict-word',
  ].includes(id);
}

export function pickExercise(req: ExerciseRequest): Exercise {
  const ad = req.adaptations ?? defaultAdaptations;
  const effDiff = Math.min(req.difficulty, ad.difficultyCap);
  const autoStage: SyllableStage =
    req.syllableStage ??
    (req.difficulty <= 1 ? 1 : req.difficulty === 2 ? 2 : 3);

  const c: Ctx = {
    lang: req.lang,
    learnLang: req.learnLang,
    ui: req.ui,
    difficulty: effDiff,
    schoolStage: req.schoolStage ?? 'general',
    readingPhase: req.readingPhase ?? 'alfabética',
    syllableStage: autoStage,
    state: req.state,
    colorblind: ad.colorblind,
    simpleOnly: ad.simpleOnly,
  };

  // Pausa de movimiento periódica para perfiles con hiperactividad.
  if (ad.movement && req.slot > 0 && req.slot % 3 === 2) {
    req.state.lastFactory = 'movement-break';
    return applyAdaptations(makeAction(c, req.levelId), ad, req.ui);
  }

  // Fases de lectura: cada sesión integra ejercicios propios de la fase elegida.
  const phaseExercise = makePhaseExercise(c, req.readingPhase ?? 'alfabética');
  if (phaseExercise && Math.random() < 0.5) {
    req.state.lastFactory = `phase-${phaseExercise.kind}`;
    return applyAdaptations(phaseExercise, ad, req.ui);
  }

  let preferred: Modality;
  if (req.route === 'visual') preferred = Math.random() < 0.16 ? 'auditivo' : 'visual';
  else if (req.route === 'auditivo') preferred = Math.random() < 0.16 ? 'visual' : 'auditivo';
  else preferred = req.slot % 2 === 0 ? 'visual' : 'auditivo';

  const base = factories[req.levelId] ?? factories[3]!;
  // En daltonismo no se piden pruebas de «adivinar un color puro sin objeto ni texto».
  const all = ad.colorblind ? base.filter((f) => f.id !== 'n6-swatch-color') : base;
  let candidates = all.filter((f) => f.modality === preferred || f.modality === 'any');
  if (!candidates.length) candidates = all;

  if (ad.simpleOnly) {
    const byModality = candidates.filter((f) => isEasyFactory(f.id));
    const anyEasy = all.filter((f) => isEasyFactory(f.id));
    if (byModality.length) candidates = byModality;
    else if (anyEasy.length) candidates = anyEasy;
    else return applyAdaptations(makeSimpleChoice(c, req.levelId), ad, req.ui);
  }

  const notRepeated = candidates.filter((f) => f.id !== req.state.lastFactory);
  const pool = notRepeated.length ? notRepeated : candidates;
  const factory = rnd(pool);
  req.state.lastFactory = factory.id;
  return applyAdaptations(factory.make(c), ad, req.ui);
}

export function practiceLevel(progressStars: Record<number, number>): number {
  const available = levels.filter((l) => l.id === 1 || (progressStars[l.id - 1] ?? 0) >= 1 || (progressStars[l.id] ?? 0) >= 1);
  return rnd(available.length ? available : levels).id;
}

/** Ejercicio clásico de Duolingo: emparejar 4 (o 3 en apoyo) pares de palabras/dibujos. */
export function makePairsExercise(opts: {
  levelId: number;
  lang: Lang;
  learnLang: LearnLang;
  ui: UiLang;
  state: GenState;
  adaptations?: Adaptations;
  syllableStage?: SyllableStage;
  schoolStage?: SchoolStage;
  simpleOnly?: boolean;
}): Exercise {
  const ad = opts.adaptations ?? defaultAdaptations;
  const count = ad.optionCount <= 2 ? 3 : 4;
  const stage: SyllableStage = opts.syllableStage ?? 1;
  const c: Ctx = {
    lang: opts.lang,
    learnLang: opts.learnLang,
    ui: opts.ui,
    difficulty: 2,
    schoolStage: opts.schoolStage ?? 'general',
    readingPhase: 'alfabética',
    syllableStage: stage,
    state: opts.state,
    colorblind: ad.colorblind,
    simpleOnly: opts.simpleOnly ?? ad.simpleOnly,
  };
  const sourcePool = opts.levelId === 2 ? stageVisualWords(c, 1) : visualWords(c);
  const pool = shuffle(sourcePool).slice(0, count);
  const bilingual = opts.learnLang === 'both' && !ad.simpleOnly;
  const leftCards: PairCard[] = shuffle(
    pool.map((w, idx) =>
      bilingual
        ? { id: `pl-${idx}`, pairId: w.id, side: 'left', label: w.es, emoji: w.emoji, lang: 'es' }
        : { id: `pl-${idx}`, pairId: w.id, side: 'left', label: w.emoji, emoji: w.emoji },
    ),
  );
  const rightCards: PairCard[] = shuffle(
    pool.map((w, idx) =>
      bilingual
        ? { id: `pr-${idx}`, pairId: w.id, side: 'right', label: w.eu, lang: 'eu' }
        : { id: `pr-${idx}`, pairId: w.id, side: 'right', label: wordText(w, opts.lang), lang: opts.lang },
    ),
  );
  return makeEx(c, opts.levelId, 'visual', 'pairs', {
    eyebrow: t('eyebrowPairs', opts.ui),
    prompt: bilingual ? t('promptMatchBilingual', opts.ui) : t('promptMatchPairs', opts.ui),
    display: { variant: 'none' },
    pairs: [...leftCards, ...rightCards],
    hint: t('hintPairs', opts.ui),
    explanation: t('wellDone', opts.ui),
    ...(opts.levelId === 2 ? { syllableStage: stage } : {}),
  });
}


