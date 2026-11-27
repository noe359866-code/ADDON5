import {
  blanks,
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
  wordSyllables,
  wordText,
  words,
} from './data';
import type { ColorItem, Word } from './data';
import { applyAdaptations, defaultAdaptations } from './adaptations';
import type { Adaptations } from './adaptations';
import { t, tf } from './i18n';
import type { Exercise, ExerciseKind, Lang, Modality, Option, Route, Tile, UiLang } from './types';

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
  ui: UiLang;
  difficulty: number;
  state: GenState;
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
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
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
  const unique = Array.from(new Set([...pool, ...fallback].filter((x) => x && normalize(x) !== nc)));
  let list = shuffle(unique);
  if (difficulty >= 3) list = list.sort((a, b) => similarity(b, correct) - similarity(a, correct));
  return list.slice(0, n);
}

interface OptionInput {
  label: string;
  emoji?: string;
  sub?: string;
  color?: string;
}

function optionSet(items: OptionInput[], correctIndex: number): { options: Option[]; correctId: string } {
  const tagged = items.map((it, i) => ({ ...it, id: `o${i}`, ok: i === correctIndex }));
  const mixed = shuffle(tagged);
  const correctId = mixed.find((x) => x.ok)!.id;
  const options: Option[] = mixed.map((x) => ({
    id: x.id,
    label: x.label,
    ...(x.emoji ? { emoji: x.emoji } : {}),
    ...(x.sub ? { sub: x.sub } : {}),
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
    return withEmoji && w ? { label, emoji: w.emoji } : { label };
  });
  return optionSet(items, 0);
}

/* ------------------------------------------------------------------ */
/* Generadores reutilizables                                           */
/* ------------------------------------------------------------------ */

function makeBuild(c: Ctx, levelId: number, modality: Modality, minSyllables: number): Exercise {
  const pool = words.filter((w) => wordSyllables(w, c.lang).length >= minSyllables);
  const w = pickFresh(pool, (x) => x.id, `build-${levelId}`, c.state);
  const syl = wordSyllables(w, c.lang);
  let tiles: Tile[] = shuffle(syl.map((s, i) => ({ id: `t${i}`, label: s })));
  if (tiles.every((tile, i) => tile.id === `t${i}`)) tiles = [...tiles.slice(1), tiles[0]!];
  const text = wordText(w, c.lang);
  return makeEx(c, levelId, modality, 'build', {
    eyebrow: t('eyebrowBuild', c.ui),
    prompt: t('promptBuildWord', c.ui),
    display: { variant: 'emoji', emoji: w.emoji },
    audio: { text, lang: c.lang },
    tiles,
    correctOrder: syl.map((_, i) => `t${i}`),
    unit: 'syllable',
    hint: t('hintSyllables', c.ui),
    explanation: answerExplanation(c, text, 'written'),
  });
}

function makeOrder(c: Ctx, levelId: number, modality: Modality): Exercise {
  const s = pickFresh(sentences, (x) => x.id, `order-${levelId}`, c.state);
  const tokens = c.lang === 'es' ? s.es : s.eu;
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
  const b = pickFresh(blanks, (x) => x.id, `blank-${levelId}`, c.state);
  const parts = c.lang === 'es' ? b.es : b.eu;
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
  const s = pickFresh(sentences, (x) => x.id, `hearsent-${levelId}`, c.state);
  const tokens = c.lang === 'es' ? s.es : s.eu;
  const correct = tokens.join(' ');
  const other = pickFresh(sentences.filter((x) => x.id !== s.id), (x) => x.id, `hearsent-other-${levelId}`, c.state);
  const otherTokens = c.lang === 'es' ? other.es : other.eu;
  const replacement = rnd(words.map((w) => wordText(w, c.lang)));
  const variant1 = [...tokens.slice(0, -1), replacement].join(' ');
  const variant2 = otherTokens.join(' ');
  const variant3 = [tokens[0]!, ...shuffle(tokens.slice(1))].join(' ');
  const variant4 = [tokens[tokens.length - 1]!, ...tokens.slice(0, -1)].join(' ');
  const otherSentences = sentences.filter((x) => x.id !== s.id).map((x) => (c.lang === 'es' ? x.es : x.eu).join(' '));
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
  const block = { title: s.title[c.lang], text: s.text[c.lang], emoji: s.emoji };
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
/* Generadores de los modos de apoyo                                   */
/* ------------------------------------------------------------------ */

function colorOptions(c: Ctx, correct: ColorItem): { options: Option[]; correctId: string } {
  const pool = colors.filter((x) => x.id !== correct.id);
  const labels = distract(pool.map((x) => x[c.lang]), correct[c.lang], Math.max(1, nOpts(c) - 1), c.difficulty);
  const picked = labels.map((label) => colors.find((x) => x[c.lang] === label)!).filter(Boolean);
  const items: OptionInput[] = [correct, ...picked].map((x) => ({ label: x[c.lang], color: x.hex }));
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
    prompt = tf('promptTwoSteps', c.ui, { first: steps[0]!, second: steps[1]! });
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

/** Actividad de lectura fácil usada como alternativa cuando el mundo es abstracto. */
function makeSimpleChoice(c: Ctx, levelId: number): Exercise {
  const w = pickFresh(words, (x) => x.id, 'simple-choice', c.state);
  const chosen = distract(
    words.filter((x) => x.id !== w.id).map((x) => x.emoji),
    w.emoji,
    Math.max(1, nOpts(c) - 1),
    c.difficulty,
    words.map((x) => x.emoji),
  );
  const items: OptionInput[] = [w.emoji, ...chosen].map((emoji) => ({ label: emoji, emoji }));
  const { options, correctId } = optionSet(items, 0);
  const text = wordText(w, c.lang);
  return makeEx(c, levelId, 'visual', 'choice', {
    eyebrow: t('eyebrowLook', c.ui),
    prompt: tf('promptWhichImage', c.ui, { word: text }),
    display: { variant: 'word', text },
    audio: { text, lang: c.lang },
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
          audio: { text, lang: c.lang },
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
        const w = pickFresh(words.filter((x) => wordText(x, c.lang).length > 2), (x) => x.id, 'l1-missing', c.state);
        const text = wordText(w, c.lang);
        const token = initialToken(text, c.lang);
        const hidden = `＿${text.slice(token.length)}`;
        const rest = distract(allInitials(c.lang), token, nOpts(c) - 1, c.difficulty);
        const { options, correctId } = optionSet([token, ...rest].map((label) => ({ label })), 0);
        return makeEx(c, 1, 'visual', 'choice', {
          eyebrow: t('eyebrowLook', c.ui),
          prompt: t('promptMissingLetter', c.ui),
          display: { variant: 'hidden', text: hidden, emoji: w.emoji },
          audio: { text, lang: c.lang },
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
        const w = pickFresh(words, (x) => x.id, 'l1-pic-letter', c.state);
        const text = wordText(w, c.lang);
        const token = initialToken(text, c.lang);
        const rest = distract(allInitials(c.lang), token, nOpts(c) - 1, c.difficulty);
        const { options, correctId } = optionSet([token, ...rest].map((label) => ({ label })), 0);
        return makeEx(c, 1, 'visual', 'choice', {
          eyebrow: t('eyebrowLook', c.ui),
          prompt: t('promptStartPicture', c.ui),
          display: { variant: 'emoji', emoji: w.emoji },
          audio: { text, lang: c.lang },
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
        const w = pickFresh(words.filter((x) => wordText(x, c.lang).length >= 4), (x) => x.id, 'l1-find', c.state);
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
          audio: { text, lang: c.lang },
          chips,
          correctChip: `c${targetIndex}`,
          hint: t('hintVisual', c.ui),
          explanation: answerExplanation(c, text, 'read'),
        });
      },
    },
  ],

  2: [
    {
      id: 'l2-build',
      modality: 'visual',
      make: (c) => makeBuild(c, 2, 'visual', 2),
    },
    {
      id: 'l2-find-syllable',
      modality: 'visual',
      make(c) {
        const w = pickFresh(words.filter((x) => wordSyllables(x, c.lang).length >= 2), (x) => x.id, 'l2-find', c.state);
        const syl = wordSyllables(w, c.lang);
        const index = Math.floor(Math.random() * syl.length);
        const chips: Tile[] = syl.map((s, i) => ({ id: `c${i}`, label: s }));
        return makeEx(c, 2, 'visual', 'tap', {
          eyebrow: t('eyebrowTap', c.ui),
          prompt: tf('promptFindSyllable', c.ui, { token: syl[index]! }),
          display: { variant: 'chunks', chunks: syl, emoji: w.emoji },
          audio: { text: wordText(w, c.lang), lang: c.lang },
          chips,
          correctChip: `c${index}`,
          hint: t('hintSyllables', c.ui),
          explanation: answerExplanation(c, syl[index]!),
        });
      },
    },
    {
      id: 'l2-hear-syllable',
      modality: 'auditivo',
      make(c) {
        const w = pickFresh(words.filter((x) => wordSyllables(x, c.lang).length >= 2), (x) => x.id, 'l2-hear', c.state);
        const syl = wordSyllables(w, c.lang);
        const index = Math.floor(Math.random() * syl.length);
        const chips: Tile[] = syl.map((s, i) => ({ id: `c${i}`, label: s }));
        return makeEx(c, 2, 'auditivo', 'tap', {
          eyebrow: t('eyebrowListen', c.ui),
          prompt: t('promptHearSyllable', c.ui),
          display: { variant: 'chunks', chunks: syl, emoji: w.emoji },
          audio: { text: syl[index]!, lang: c.lang },
          chips,
          correctChip: `c${index}`,
          hint: t('hintListen', c.ui),
          explanation: answerExplanation(c, syl[index]!),
        });
      },
    },
    {
      id: 'l2-count',
      modality: 'any',
      make(c) {
        const w = pickFresh(words, (x) => x.id, 'l2-count', c.state);
        const syl = wordSyllables(w, c.lang);
        const nums = ['1', '2', '3', '4', '5'];
        const correct = String(syl.length);
        const { options, correctId } = optionSet(nums.map((label) => ({ label })), nums.indexOf(correct));
        return makeEx(c, 2, 'any', 'choice', {
          eyebrow: t('eyebrowCount', c.ui),
          prompt: tf('promptCountSyllables', c.ui, { word: wordText(w, c.lang) }),
          display: { variant: 'chunks', chunks: syl, emoji: w.emoji },
          audio: { text: wordText(w, c.lang), lang: c.lang },
          options,
          correctId,
          hint: t('hintSyllables', c.ui),
          explanation: answerExplanation(c, correct),
        });
      },
    },
    {
      id: 'l2-starts-with',
      modality: 'visual',
      make(c) {
        const w = pickFresh(words, (x) => x.id, 'l2-starts', c.state);
        const target = wordSyllables(w, c.lang)[0]!;
        const pool = words.filter((x) => x.id !== w.id && wordSyllables(x, c.lang)[0] !== target);
        const { options, correctId } = wordOptions(c, w, pool);
        return makeEx(c, 2, 'visual', 'choice', {
          eyebrow: t('eyebrowRead', c.ui),
          prompt: tf('promptStartsWith', c.ui, { token: target }),
          display: { variant: 'word', text: target },
          options,
          correctId,
          hint: t('hintVisual', c.ui),
          explanation: answerExplanation(c, wordText(w, c.lang), 'written'),
        });
      },
    },
    {
      id: 'l2-hear-syllable-choice',
      modality: 'auditivo',
      make(c) {
        const w = pickFresh(words, (x) => x.id, 'l2-hear-choice', c.state);
        const syl = wordSyllables(w, c.lang);
        const target = rnd(syl);
        const rest = distract(allSyllables(c.lang), target, nOpts(c) - 1, c.difficulty);
        const { options, correctId } = optionSet([target, ...rest].map((label) => ({ label })), 0);
        return makeEx(c, 2, 'auditivo', 'choice', {
          eyebrow: t('eyebrowListen', c.ui),
          prompt: t('promptHearSyllableChoice', c.ui),
          display: { variant: 'none' },
          audio: { text: target, lang: c.lang },
          options,
          correctId,
          hint: t('hintListen', c.ui),
          explanation: answerExplanation(c, target),
        });
      },
    },
  ],

  3: [
    {
      id: 'l3-word-image',
      modality: 'visual',
      make(c) {
        const w = pickFresh(words, (x) => x.id, 'l3-word-img', c.state);
        const pool = words.filter((x) => x.id !== w.id);
        const chosen = distract(
          pool.map((x) => x.emoji),
          w.emoji,
          nOpts(c) - 1,
          c.difficulty,
          words.map((x) => x.emoji),
        );
        const items: OptionInput[] = [w.emoji, ...chosen].map((emoji) => ({ label: emoji, emoji }));
        const { options, correctId } = optionSet(items, 0);
        const text = wordText(w, c.lang);
        return makeEx(c, 3, 'visual', 'choice', {
          eyebrow: t('eyebrowRead', c.ui),
          prompt: tf('promptWhichImage', c.ui, { word: text }),
          display: { variant: 'word', text },
          audio: { text, lang: c.lang },
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
        const w = pickFresh(words, (x) => x.id, 'l3-img-word', c.state);
        const { options, correctId } = wordOptions(c, w, words.filter((x) => x.id !== w.id), true);
        const text = wordText(w, c.lang);
        return makeEx(c, 3, 'visual', 'choice', {
          eyebrow: t('eyebrowLook', c.ui),
          prompt: t('promptHowWrite', c.ui),
          display: { variant: 'emoji', emoji: w.emoji },
          audio: { text, lang: c.lang },
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
        const w = pickFresh(words, (x) => x.id, 'l3-hear-word', c.state);
        const sameCat = words.filter((x) => x.id !== w.id && x.cat === w.cat);
        const pool = c.difficulty >= 3 && sameCat.length >= 2 ? sameCat : words.filter((x) => x.id !== w.id);
        const { options, correctId } = wordOptions(c, w, pool);
        const text = wordText(w, c.lang);
        return makeEx(c, 3, 'auditivo', 'choice', {
          eyebrow: t('eyebrowListen', c.ui),
          prompt: t('promptHearWord', c.ui),
          display: { variant: 'none' },
          audio: { text, lang: c.lang },
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
        const w = pickFresh(words, (x) => x.id, 'l3-hear-img', c.state);
        const chosen = distract(
          words.filter((x) => x.id !== w.id).map((x) => x.emoji),
          w.emoji,
          nOpts(c) - 1,
          c.difficulty,
          words.map((x) => x.emoji),
        );
        const items: OptionInput[] = [w.emoji, ...chosen].map((emoji) => ({ label: emoji, emoji }));
        const { options, correctId } = optionSet(items, 0);
        const text = wordText(w, c.lang);
        return makeEx(c, 3, 'auditivo', 'choice', {
          eyebrow: t('eyebrowListen', c.ui),
          prompt: t('promptHearImage', c.ui),
          display: { variant: 'none' },
          audio: { text, lang: c.lang },
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
            display: { variant: 'chunks', chunks: syl, emoji: w.emoji, highlight: special },
            audio: { text: wordText(w, c.lang), lang: c.lang },
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
        const special = rnd(specialSounds[c.lang]);
        const hits = words.filter((w) => normalize(wordText(w, c.lang)).includes(special));
        const w = rnd(hits.length ? hits : words);
        const pool = words.filter((x) => x.id !== w.id && !normalize(wordText(x, c.lang)).includes(special));
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
      },
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
        const correct = (c.lang === 'es' ? s.es : s.eu).join(' ');
        const others = sentences
          .filter((x) => x.id !== s.id)
          .map((x) => (c.lang === 'es' ? x.es : x.eu).join(' '));
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
        const tokens = c.lang === 'es' ? s.es : s.eu;
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
  ],

  6: [
    { id: 'l6-story', modality: 'any', make: (c) => makeStory(c, 6, 'any', 'question') },
    { id: 'l6-story-listen', modality: 'auditivo', make: (c) => makeStory(c, 6, 'auditivo', 'question') },
    { id: 'l6-story-theme', modality: 'visual', make: (c) => makeStory(c, 6, 'visual', 'theme') },
    { id: 'l6-order', modality: 'visual', make: (c) => makeOrder(c, 6, 'visual') },
    { id: 'l6-blank', modality: 'visual', make: (c) => makeBlank(c, 6, 'visual') },
    { id: 'l6-hear-sentence', modality: 'auditivo', make: (c) => makeHearSentence(c, 6, 'auditivo') },
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
          display: { variant: 'swatch', color: col.hex, emoji: col.emoji },
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
  ],

  /* Mundo 8 · ¡Luma dice!: instrucciones literales, movimiento y cero fallos. */
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
        const w = pickFresh(words, (x) => x.id, 'a5', c.state);
        const chosen = distract(
          words.filter((x) => x.id !== w.id).map((x) => x.emoji),
          w.emoji,
          Math.max(1, nOpts(c) - 1),
          c.difficulty,
          words.map((x) => x.emoji),
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
  ],
};

/* ------------------------------------------------------------------ */
/* Selección adaptada a la ruta                                        */
/* ------------------------------------------------------------------ */

export interface ExerciseRequest {
  levelId: number;
  lang: Lang;
  ui: UiLang;
  route: Route;
  difficulty: number;
  slot: number;
  state: GenState;
  adaptations?: Adaptations;
}

/** Actividades adecuadas para lectura fácil: concretas, cortas y con imagen. */
function isEasyFactory(id: string): boolean {
  if (id.startsWith('n') || id.startsWith('a') || id.startsWith('l1') || id.startsWith('l3')) return id !== 'l3-category';
  return [
    'l2-build',
    'l2-find-syllable',
    'l2-hear-syllable',
    'l4-special-choice',
    'l4-special-tap',
    'l5-blank',
    'l5-blank-audio',
    'l6-blank',
    'l6-story',
  ].includes(id);
}

export function pickExercise(req: ExerciseRequest): Exercise {
  const ad = req.adaptations ?? defaultAdaptations;
  const c: Ctx = { lang: req.lang, ui: req.ui, difficulty: Math.min(req.difficulty, ad.difficultyCap), state: req.state };

  // Pausa de movimiento periódica para perfiles con hiperactividad.
  if (ad.movement && req.slot > 0 && req.slot % 3 === 2) {
    req.state.lastFactory = 'movement-break';
    return applyAdaptations(makeAction(c, req.levelId), ad, req.ui);
  }

  let preferred: Modality;
  if (req.route === 'visual') preferred = Math.random() < 0.16 ? 'auditivo' : 'visual';
  else if (req.route === 'auditivo') preferred = Math.random() < 0.16 ? 'visual' : 'auditivo';
  else preferred = req.slot % 2 === 0 ? 'visual' : 'auditivo';

  const all = factories[req.levelId] ?? factories[3]!;
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

