import type { SchoolStage, UiLang } from './types';

/**
 * Niveles por color.
 *
 * En vez de mostrar cursos escolares («3.º de Primaria»), la app pide elegir un
 * color: los más peques tienen el amarillo y cada dos cursos de Primaria tienen
 * el suyo (verde, azul y morado). El curso sigue existiendo por dentro para
 * adaptar el vocabulario, pero nunca se escribe en la interfaz.
 *
 * La información nunca depende solo del color (WCAG 1.4.1): cada nivel lleva
 * además un nombre, un emoji y una forma geométrica distinta.
 */
export type StageColorKey = Exclude<SchoolStage, 'general'>;

export interface StageColor {
  key: StageColorKey;
  name: { es: string; eu: string };
  desc: { es: string; eu: string };
  emoji: string;
  /** Forma geométrica de apoyo para daltonismo y baja visión. */
  shape: 'circle' | 'triangle' | 'square' | 'star';
  glyph: string;
  color: string;
  lip: string;
  soft: string;
  ink: string;
}

export const STAGE_COLORS: StageColor[] = [
  {
    key: 'infantil',
    name: { es: 'Amarillo', eu: 'Horia' },
    desc: { es: 'Primeros sonidos y palabras', eu: 'Lehen soinuak eta hitzak' },
    emoji: '🐣',
    shape: 'circle',
    glyph: '●',
    color: '#FFC800',
    lip: '#E0A800',
    soft: '#FFF5D3',
    ink: '#7A5A00',
  },
  {
    key: 'prim12',
    name: { es: 'Verde', eu: 'Berdea' },
    desc: { es: 'Leo mis primeras frases', eu: 'Nire lehen esaldiak irakurtzen ditut' },
    emoji: '🌱',
    shape: 'triangle',
    glyph: '▲',
    color: '#58CC02',
    lip: '#46A302',
    soft: '#D7FFB8',
    ink: '#2C5A00',
  },
  {
    key: 'prim34',
    name: { es: 'Azul', eu: 'Urdina' },
    desc: { es: 'Frases y cuentos cortos', eu: 'Esaldi eta ipuin laburrak' },
    emoji: '📖',
    shape: 'square',
    glyph: '■',
    color: '#1CB0F6',
    lip: '#1899D6',
    soft: '#DDF4FF',
    ink: '#084A6B',
  },
  {
    key: 'prim56',
    name: { es: 'Morado', eu: 'Morea' },
    desc: { es: 'Retos de lectura largos', eu: 'Irakurketa erronka luzeak' },
    emoji: '🚀',
    shape: 'star',
    glyph: '★',
    color: '#CE82FF',
    lip: '#A568CC',
    soft: '#F3E5FF',
    ink: '#5B2A80',
  },
];

export const STAGE_ORDER: StageColorKey[] = STAGE_COLORS.map((s) => s.key);

/** Devuelve el nivel por color de una etapa guardada (con respaldo seguro). */
export function stageColor(key: SchoolStage | undefined): StageColor {
  return STAGE_COLORS.find((s) => s.key === key) ?? STAGE_COLORS[1]!;
}

export function stageColorName(key: SchoolStage | undefined, ui: UiLang): string {
  return stageColor(key).name[ui];
}

export function stageColorDesc(key: SchoolStage | undefined, ui: UiLang): string {
  return stageColor(key).desc[ui];
}
