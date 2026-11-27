import { colors, words } from './data';
import { t } from './i18n';
import type { Exercise, Progress, UiLang } from './types';

/* ------------------------------------------------------------------ */
/* Ajustes de accesibilidad (sin diagnosticos: solo toggles del usuario) */
/* ------------------------------------------------------------------ */

export interface Adaptations {
  optionCount: number;
  sessionLength: number;
  practiceLength: number;
  difficultyCap: number;
  autoRead: boolean;
  simpleOnly: boolean;
  pictograms: boolean;
  hyperlegible: boolean;
  calm: boolean;
  gentle: boolean;
  firstThen: boolean;
  bigTargets: boolean;
  speakAnswer: boolean;
  movement: boolean;
  shortPrompts: boolean;
  colorblind: boolean;
}

export const defaultAdaptations: Adaptations = {
  optionCount: 3,
  sessionLength: 6,
  practiceLength: 8,
  difficultyCap: 3,
  autoRead: false,
  simpleOnly: false,
  pictograms: false,
  hyperlegible: false,
  calm: false,
  gentle: false,
  firstThen: false,
  bigTargets: false,
  speakAnswer: false,
  movement: false,
  shortPrompts: false,
  colorblind: false,
};

/** Ajustes derivados solo de los toggles del usuario (sin diagnosticos). */
export function adaptationsFor(extra: { calmMode?: boolean; bigText?: boolean } = {}): Adaptations {
  const a: Adaptations = { ...defaultAdaptations };
  if (extra.calmMode) {
    a.calm = true;
    a.gentle = true;
    a.shortPrompts = true;
    a.autoRead = true;
    a.firstThen = true;
  }
  if (extra.bigText) {
    a.bigTargets = true;
    a.hyperlegible = true;
  }
  return a;
}

export function computeAdaptations(p: Progress): Adaptations {
  return adaptationsFor({ calmMode: p.calmMode, bigText: p.bigText });
}

/** Resumen visible de los ajustes activos (sin etiquetas diagnosticas). */
export function supportSummary(a: Adaptations, ui: UiLang): string[] {
  const out: string[] = [];
  if (a.sessionLength <= 4) out.push(t('adaptShort', ui));
  if (a.optionCount <= 2) out.push(t('adaptOptions', ui));
  if (a.autoRead) out.push(t('adaptVoice', ui));
  if (a.pictograms) out.push(t('adaptPictos', ui));
  if (a.hyperlegible) out.push(t('adaptFont', ui));
  if (a.calm) out.push(t('adaptCalm', ui));
  if (a.movement) out.push(t('adaptMovement', ui));
  if (a.firstThen) out.push(t('adaptSchedule', ui));
  if (a.gentle) out.push(t('adaptGentle', ui));
  if (a.bigTargets) out.push(t('adaptTargets', ui));
  if (a.colorblind) out.push(t('adaptColorblind', ui));
  return out;
}

/* ------------------------------------------------------------------ */
/* Transformación de cada ejercicio                                    */
/* ------------------------------------------------------------------ */

function norm(s: string): string {
  return s
    .toLowerCase()
    .replace(/ñ/g, '\u0001')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\u0001/g, 'ñ');
}

const pictograms = new Map<string, string>();
for (const w of words) {
  pictograms.set(norm(w.es), w.emoji);
  pictograms.set(norm(w.eu), w.emoji);
  pictograms.set(norm(w.en), w.emoji);
}
const colorMeta = new Map<string, { hex: string; pattern: string; symbol: string }>();
for (const c of colors) {
  pictograms.set(norm(c.es), c.emoji);
  pictograms.set(norm(c.eu), c.emoji);
  pictograms.set(norm(c.en), c.emoji);
  colorMeta.set(norm(c.es), { hex: c.hex, pattern: c.pattern, symbol: c.symbol });
  colorMeta.set(norm(c.eu), { hex: c.hex, pattern: c.pattern, symbol: c.symbol });
  colorMeta.set(norm(c.en), { hex: c.hex, pattern: c.pattern, symbol: c.symbol });
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

/** Aplica los apoyos activos a un ejercicio ya generado. */
export function applyAdaptations(source: Exercise, ad: Adaptations, ui: UiLang): Exercise {
  const out: Exercise = {
    ...source,
    display: source.display ? { ...source.display } : undefined,
    story: source.story ? { ...source.story } : undefined,
    action: source.action ? { ...source.action } : undefined,
    options: source.options?.map((o) => ({ ...o })),
  };

  // 1 · Menos opciones, manteniendo siempre la correcta.
  if (out.options && out.correctId && out.options.length > ad.optionCount) {
    const correct = out.options.find((o) => o.id === out.correctId)!;
    const others = out.options.filter((o) => o.id !== out.correctId).slice(0, Math.max(1, ad.optionCount - 1));
    const mixed = shuffle([correct, ...others]);
    out.options = mixed.map((o, i) => ({ ...o, id: `ad${i}` }));
    out.correctId = `ad${mixed.indexOf(correct)}`;
  }

  // 1b · En los juegos de «toca algo», menos pictogramas si el perfil lo pide.
  if (out.action?.game?.kind === 'find' && out.action.game.items.length > ad.optionCount) {
    out.action = {
      ...out.action,
      game: { ...out.action.game, items: out.action.game.items.slice(0, ad.optionCount) },
    };
  }

  // 2 · Pictogramas en todas las opciones de texto que sea posible.
  if (ad.pictograms && out.options) {
    out.options = out.options.map((o) => {
      if (o.emoji || o.color) return o;
      if (ad.colorblind && colorMeta.has(norm(o.label))) return o;
      const pic = pictograms.get(norm(o.label));
      return pic ? { ...o, emoji: pic } : o;
    });
  }

  // 2b · Daltonismo: toda opción de color lleva patrón y símbolo propios, nunca solo tono.
  if (ad.colorblind && out.options) {
    out.options = out.options.map((o) => {
      const meta = colorMeta.get(norm(o.label));
      if (!meta) return o;
      return {
        ...o,
        color: o.color ?? meta.hex,
        pattern: o.pattern ?? meta.pattern,
        symbol: o.symbol ?? meta.symbol,
      };
    });
  }

  // 3 · Lectura fácil: instrucciones breves y cuentos de una sola frase.
  if (ad.shortPrompts) {
    out.eyebrow = t('simpleChoose', ui);
    if (out.prompt.length > 90) out.prompt = out.prompt.split(/[.:]/)[0] || out.prompt;
    if (out.story) {
      const simple = out.story.shortText || out.story.text.split(/(?<=[.!?])\s+/)[0] || out.story.text;
      out.story.text = simple;
      out.audio = { text: simple, lang: out.lang };
    }
  }

  // 4 · Voz siempre disponible y reproducida automáticamente.
  if (ad.autoRead) {
    out.autoAudio = true;
    if (!out.audio) {
      const fallback = out.display?.text ?? out.options?.find((o) => o.id === out.correctId)?.label ?? out.prompt;
      out.audio = { text: fallback.replace(/＿/g, '').trim(), lang: out.lang };
    }
  }

  return out;
}
