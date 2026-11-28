import { words } from './data';
import type { Category, Word } from './data';
import type { Lang, LearnLang, SchoolStage } from './types';

/**
 * Búsqueda de diccionario.
 *
 * Los peques escriben (o dictan al adulto) una palabra en castellano, euskera o
 * inglés; la búsqueda ignora tildes, mayúsculas y signos, y prioriza las
 * coincidencias exactas y las palabras de su nivel por color.
 */

export type CategoryFilter = Category | 'todas';

export interface WordHit {
  word: Word;
  /** Idiomas en los que se ha encontrado la búsqueda. */
  matched: Lang[];
  exact: boolean;
  score: number;
}

export function normalizeSearch(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9ñü]+/g, ' ')
    .trim();
}

/** Idiomas que se muestran y se buscan según el idioma de aprendizaje. */
export function searchLangs(learnLang: LearnLang): Lang[] {
  if (learnLang === 'both') return ['es', 'eu'];
  return [learnLang];
}

/** Palabras del nivel por color, sin repetir y con respaldo si el filtro deja muy pocas. */
export function stageWords(stage: SchoolStage | undefined, list: Word[] = words): Word[] {
  if (!stage || stage === 'general') return list;
  const own = list.filter((w) => w.stages?.includes(stage));
  return own.length >= 6 ? own : list;
}

function wordFields(w: Word): { lang: Lang; text: string }[] {
  return [
    { lang: 'es', text: w.es },
    { lang: 'eu', text: w.eu },
    { lang: 'en', text: w.en },
  ];
}

/**
 * Busca palabras y devuelve las coincidencias ordenadas por relevancia.
 * Sin consulta, devuelve palabras de su nivel como sugerencia.
 */
export function searchDictionary(
  query: string,
  options: {
    learnLang?: LearnLang;
    stage?: SchoolStage;
    category?: CategoryFilter;
    limit?: number;
    list?: Word[];
  } = {},
): WordHit[] {
  const { learnLang = 'both', stage, category = 'todas', limit = 24, list = words } = options;
  const preferred = searchLangs(learnLang);
  const pool = category === 'todas' ? list : list.filter((w) => w.cat === category);
  const normalized = normalizeSearch(query);

  if (!normalized) {
    return stageWords(stage, pool)
      .slice(0, limit)
      .map((word) => ({ word, matched: preferred, exact: false, score: 0 }));
  }

  const hits: WordHit[] = [];
  for (const word of pool) {
    const matched: Lang[] = [];
    let score = 0;
    let exact = false;
    for (const field of wordFields(word)) {
      const text = normalizeSearch(field.text);
      if (!text) continue;
      let fieldScore = 0;
      if (text === normalized) {
        fieldScore = 100;
        exact = true;
      } else if (text.startsWith(normalized)) {
        fieldScore = 70;
      } else if (text.split(' ').some((part) => part.startsWith(normalized))) {
        fieldScore = 55;
      } else if (text.includes(normalized)) {
        fieldScore = 30;
      }
      if (fieldScore > 0) {
        matched.push(field.lang);
        score = Math.max(score, fieldScore);
      }
    }
    if (score === 0) continue;
    if (matched.some((lang) => preferred.includes(lang))) score += 15;
    if (stage && stage !== 'general' && word.stages?.includes(stage)) score += 8;
    hits.push({ word, matched, exact, score });
  }

  hits.sort((a, b) => b.score - a.score || a.word.es.localeCompare(b.word.es));
  return hits.slice(0, limit);
}

/** Categorías presentes en el banco, para los filtros del diccionario. */
export const DICTIONARY_CATEGORIES: Category[] = [
  'animales',
  'naturaleza',
  'comida',
  'colores',
  'casa',
  'cole',
  'ropa',
  'numeros',
  'acciones',
  'cuerpo',
  'emociones',
  'dias',
  'meses',
  'adj',
];

export const DICTIONARY_CATEGORY_LABEL: Record<Category, { es: string; eu: string }> = {
  animales: { es: 'Animales', eu: 'Animaliak' },
  naturaleza: { es: 'Naturaleza', eu: 'Natura' },
  comida: { es: 'Comida', eu: 'Janaria' },
  colores: { es: 'Colores', eu: 'Koloreak' },
  casa: { es: 'Casa', eu: 'Etxea' },
  cole: { es: 'Cole', eu: 'Eskola' },
  ropa: { es: 'Ropa', eu: 'Arropa' },
  numeros: { es: 'Números', eu: 'Zenbakiak' },
  acciones: { es: 'Acciones', eu: 'Ekintzak' },
  cuerpo: { es: 'Cuerpo', eu: 'Gorputza' },
  emociones: { es: 'Emociones', eu: 'Emozioak' },
  dias: { es: 'Días', eu: 'Egunak' },
  meses: { es: 'Meses', eu: 'Hilabeteak' },
  adj: { es: 'Palabras bonitas', eu: 'Hitz politak' },
};
