import { colors, words } from './data';
import { t } from './i18n';
import type { Exercise, Progress, SupportId, UiLang } from './types';

/* ------------------------------------------------------------------ */
/* Perfiles de apoyo (se pueden combinar entre sí)                     */
/* ------------------------------------------------------------------ */

export interface SupportProfile {
  id: SupportId;
  emoji: string;
  es: { name: string; desc: string };
  eu: { name: string; desc: string };
}

export const supportProfiles: SupportProfile[] = [
  {
    id: 'cognitiva',
    emoji: '🧠',
    es: { name: 'Discapacidad cognitiva', desc: 'Sesiones cortas, 2 opciones, palabras concretas y repetición.' },
    eu: { name: 'Desgaitasun kognitiboa', desc: 'Saio laburrak, 2 aukera, hitz zehatzak eta errepikapena.' },
  },
  {
    id: 'comprension',
    emoji: '📖',
    es: { name: 'Dificultades de comprensión', desc: 'Frases cortas, cuentos de una sola frase y apoyo visual.' },
    eu: { name: 'Ulermen zailtasunak', desc: 'Esaldi laburrak, esaldi bateko ipuinak eta laguntza bisuala.' },
  },
  {
    id: 'comunicacion',
    emoji: '💬',
    es: { name: 'Dificultades comunicativas', desc: 'Pictogramas, la voz dice la respuesta y rutina visual.' },
    eu: { name: 'Komunikazio zailtasunak', desc: 'Piktogramak, erantzuna esaten duen ahotsa eta errutina bisuala.' },
  },
  {
    id: 'dislexia',
    emoji: '🔠',
    es: { name: 'Dislexia', desc: 'Letra hiperlegible, sílabas de colores, espaciado y voz siempre.' },
    eu: { name: 'Dislexia', desc: 'Letra hiperlegigarria, koloretako silabak, tarteak eta ahotsa beti.' },
  },
  {
    id: 'tdah',
    emoji: '⚡',
    es: { name: 'Hiperactividad / TDAH', desc: 'Sesiones muy cortas con pausas de movimiento cada 3 actividades.' },
    eu: { name: 'Hiperaktibitatea / TDAH', desc: 'Saio oso laburrak, 3 jardueratik behin mugimendu-pausak.' },
  },
  {
    id: 'tea',
    emoji: '🧩',
    es: { name: 'TEA / Autismo', desc: 'Rutina predecible, lenguaje literal, sin sorpresas ni confeti.' },
    eu: { name: 'TEA / Autismoa', desc: 'Errutina aurreikusgarria, hizkuntza literala, ustekaberik eta konfetirik gabe.' },
  },
  {
    id: 'down',
    emoji: '🌈',
    es: { name: 'Síndrome de Down', desc: 'Más imágenes, repetición, botones grandes y refuerzo positivo.' },
    eu: { name: 'Down sindromea', desc: 'Irudi gehiago, errepikapena, botoi handiak eta indarpen positiboa.' },
  },
];

export const supportById: Record<string, SupportProfile> = Object.fromEntries(supportProfiles.map((p) => [p.id, p]));

/* ------------------------------------------------------------------ */
/* Qué cambia exactamente en la app                                    */
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
  active: SupportId[];
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
  active: [],
};

export function adaptationsFor(supports: SupportId[], extra: { calmMode?: boolean; bigText?: boolean } = {}): Adaptations {
  const a: Adaptations = { ...defaultAdaptations, active: [...supports] };
  const has = (id: SupportId) => supports.includes(id);

  // Lectura fácil / apoyo cognitivo: menos carga, más imagen, más voz.
  if (has('cognitiva') || has('comprension') || has('down') || has('comunicacion')) {
    a.optionCount = 2;
    a.sessionLength = 4;
    a.practiceLength = 5;
    a.difficultyCap = 1;
    a.autoRead = true;
    a.simpleOnly = true;
    a.pictograms = true;
    a.gentle = true;
    a.firstThen = true;
    a.bigTargets = true;
    a.speakAnswer = true;
    a.shortPrompts = true;
  }
  if (has('dislexia')) {
    a.hyperlegible = true;
    a.autoRead = true;
    a.gentle = true;
    a.bigTargets = true;
    a.shortPrompts = true;
    a.optionCount = Math.min(a.optionCount, 3);
    a.difficultyCap = Math.min(a.difficultyCap, 2);
  }
  if (has('tdah')) {
    a.sessionLength = 4;
    a.practiceLength = 5;
    a.movement = true;
    a.bigTargets = true;
    a.firstThen = true;
    a.gentle = true;
  }
  if (has('tea')) {
    a.calm = true;
    a.firstThen = true;
    a.shortPrompts = true;
    a.autoRead = true;
    a.gentle = true;
    a.optionCount = Math.min(a.optionCount, 3);
  }
  if (extra.calmMode) a.calm = true;
  if (extra.bigText) a.bigTargets = true;
  return a;
}

export function computeAdaptations(p: Progress): Adaptations {
  return adaptationsFor(p.supports ?? [], { calmMode: p.calmMode, bigText: p.bigText });
}

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
  return out;
}

/* ------------------------------------------------------------------ */
/* Transformación de cada ejercicio                                    */
/* ------------------------------------------------------------------ */

function norm(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

const pictograms = new Map<string, string>();
for (const w of words) {
  pictograms.set(norm(w.es), w.emoji);
  pictograms.set(norm(w.eu), w.emoji);
}
for (const c of colors) {
  pictograms.set(norm(c.es), c.emoji);
  pictograms.set(norm(c.eu), c.emoji);
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
      const pic = pictograms.get(norm(o.label));
      return pic ? { ...o, emoji: pic } : o;
    });
  }

  // 3 · Lectura fácil: instrucciones breves y cuentos de una sola frase.
  if (ad.shortPrompts) {
    out.eyebrow = t('simpleChoose', ui);
    if (out.prompt.length > 90) out.prompt = out.prompt.split(/[.:]/)[0] || out.prompt;
    if (out.story) {
      const first = out.story.text.split(/(?<=[.!?])\s+/)[0] || out.story.text;
      out.story.text = first;
      out.audio = { text: first, lang: out.lang };
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
