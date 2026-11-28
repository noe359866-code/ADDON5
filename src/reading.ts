import type { Lang } from './types';
import type { StageColorKey } from './stages';

/**
 * Lectura en voz alta con seguimiento.
 *
 * El micrófono del navegador devuelve texto; aquí comparamos ese texto con las
 * palabras del texto elegido y marcamos cada palabra como leída, saltada o
 * pendiente. Toda la lógica de comparación es pura para poder probarla.
 */

export type ReadingWordState = 'read' | 'current' | 'skipped' | 'pending';

export interface ReadingToken {
  /** Palabra tal cual aparece en el texto (con su puntuación). */
  text: string;
  /** Palabra normalizada para comparar con el reconocimiento de voz. */
  clean: string;
}

export interface ReadingPassage {
  id: string;
  level: StageColorKey;
  emoji: string;
  title: { es: string; eu: string; en: string };
  /** Texto en cada idioma. */
  text: Record<Lang, string>;
}

/** Textos cortos, con vocabulario cotidiano y frases separables. */
export const READING_PASSAGES: ReadingPassage[] = [
  {
    id: 'amarillo-palabras',
    level: 'infantil',
    emoji: '🐣',
    title: { es: 'Mis primeras palabras', eu: 'Nire lehen hitzak', en: 'My first words' },
    text: {
      es: 'sol luna pan uva gato mesa',
      eu: 'eguzki ilargi ogi mahats katu mahai',
      en: 'sun moon bread grape cat table',
    },
  },
  {
    id: 'amarillo-gato',
    level: 'infantil',
    emoji: '🐱',
    title: { es: 'Mi gato', eu: 'Nire katua', en: 'My cat' },
    text: {
      es: 'Mi gato es pequeño. Mi gato come pan. Yo quiero a mi gato.',
      eu: 'Nire katua txikia da. Nire katuak ogia jaten du. Nik nire katua maite dut.',
      en: 'My cat is little. My cat eats bread. I love my cat.',
    },
  },
  {
    id: 'verde-parque',
    level: 'prim12',
    emoji: '🌳',
    title: { es: 'En el parque', eu: 'Parkean', en: 'At the park' },
    text: {
      es: 'Hoy vamos al parque. Llevo mi pelota nueva. Juego con mis amigos hasta la tarde.',
      eu: 'Gaur parkera goaz. Nire pilota berria daramat. Lagunekin jolasten dut arratsalderarte.',
      en: 'Today we go to the park. I bring my new ball. I play with my friends until the afternoon.',
    },
  },
  {
    id: 'verde-escuela',
    level: 'prim12',
    emoji: '🏫',
    title: { es: 'Mi mochila', eu: 'Nire motxila', en: 'My backpack' },
    text: {
      es: 'En mi mochila llevo un libro y dos lápices. También llevo una manzana para el recreo.',
      eu: 'Nire motxilan liburu bat eta bi arkatz daramatzat. Sagar bat ere badaramat atsedenaldirako.',
      en: 'In my backpack I carry a book and two pencils. I also carry an apple for the break.',
    },
  },
  {
    id: 'azul-luna',
    level: 'prim34',
    emoji: '🌙',
    title: { es: 'La luna curiosa', eu: 'Ilargi jakintsua', en: 'The curious moon' },
    text: {
      es: 'La luna se asomó por la ventana de mi cuarto. Vio mis zapatos, mi libro y un dibujo. Sonrió y se quedó a dormir sobre la almohada.',
      eu: 'Ilargia nire gelako leihotik begiratu zuen. Nire zapatuak, nire liburua eta marrazki bat ikusi zituen. Irribarre egin eta burukoaren gainean lo egitera geratu zen.',
      en: 'The moon peeked through my bedroom window. It saw my shoes, my book and a drawing. It smiled and stayed to sleep on my pillow.',
    },
  },
  {
    id: 'azul-huerto',
    level: 'prim34',
    emoji: '🌻',
    title: { es: 'El huerto del cole', eu: 'Eskolako baratzea', en: 'The school garden' },
    text: {
      es: 'Cada martes regamos el huerto del colegio. Las tomateras ya tienen flores amarillas. Pronto podremos recoger tomates para la clase.',
      eu: 'Asteartean eskolako baratzea ureztatzen dugu. Tomate-landareek lore horiak dituzte jada. Laster tomateak jasoko ditugu gelarako.',
      en: 'Every Tuesday we water the school garden. The tomato plants already have yellow flowers. Soon we will pick tomatoes for the class.',
    },
  },
  {
    id: 'morado-viaje',
    level: 'prim56',
    emoji: '🧭',
    title: { es: 'Un viaje inesperado', eu: 'Ustekabeko bidaia', en: 'An unexpected trip' },
    text: {
      es: 'Aquella mañana el viento empujó la puerta y entró una carta con olor a mar. Dentro había un mapa dibujado a mano y una frase: «Si quieres conocer el mundo, empieza por la esquina de tu calle».',
      eu: 'Goiz hartan haizeak atea bultzatu eta itsaso usaina zuen gutun bat sartu zen. Barruan eskuz marraztutako mapa bat zegoen eta esaldi bat: «Mundua ezagutu nahi baduzu, hasi zure kaleko izkinatik».',
      en: 'That morning the wind pushed the door open and a letter that smelled of the sea came in. Inside there was a hand-drawn map and a sentence: “If you want to know the world, start at the corner of your street”.',
    },
  },
  {
    id: 'morado-biblioteca',
    level: 'prim56',
    emoji: '📚',
    title: { es: 'La biblioteca secreta', eu: 'Liburutegi sekretua', en: 'The secret library' },
    text: {
      es: 'Detrás de la estantería más antigua había una escalera de caracol. Subimos despacio, contando los peldaños, y encontramos una sala llena de libros que hablaban en voz baja cuando nadie miraba.',
      eu: 'Apalategirik zaharrenaren atzean espiral-eskailera bat zegoen. Poliki igo ginen, mailak zenbatuz, eta inork begiratzen ez zuenean isilka hitz egiten zuten liburuz betetako gela bat aurkitu genuen.',
      en: 'Behind the oldest bookshelf there was a spiral staircase. We climbed slowly, counting the steps, and found a room full of books that whispered when nobody was looking.',
    },
  },
];

export function passagesForLevel(level: StageColorKey): ReadingPassage[] {
  const own = READING_PASSAGES.filter((p) => p.level === level);
  return own.length ? own : READING_PASSAGES;
}

/** Texto normalizado: minúsculas, sin tildes, sin signos y con ñ → n. */
export function normalizeReadingWord(word: string): string {
  return word
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '');
}

/** Divide un texto o una transcripción en palabras normalizadas. */
export function spokenWords(text: string): string[] {
  return text
    .split(/\s+/)
    .map((w) => normalizeReadingWord(w))
    .filter(Boolean);
}

export function tokenizeReading(text: string): ReadingToken[] {
  return text
    .split(/\s+/)
    .filter(Boolean)
    .map((raw) => ({ text: raw, clean: normalizeReadingWord(raw) }))
    .filter((token) => token.clean.length > 0);
}

function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    for (let j = 1; j <= b.length; j++) {
      row[j] = Math.min(prev[j]! + 1, row[j - 1]! + 1, prev[j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = row;
  }
  return prev[b.length]!;
}

/**
 * ¿La palabra que se ha oído corresponde a la esperada?
 * Se toleran errores lógicos del reconocimiento de voz: plurales, sufijos del
 * euskera, una letra de diferencia o una palabra cortada por la mitad.
 */
export function readingWordsMatch(heard: string, expected: string): boolean {
  const h = normalizeReadingWord(heard);
  const e = normalizeReadingWord(expected);
  if (!h || !e) return false;
  if (h === e) return true;
  if (e.length >= 4 && (h.startsWith(e) || e.startsWith(h))) return true;
  if (e.length >= 5 && editDistance(h, e) <= 1) return true;
  if (e.length >= 9 && editDistance(h, e) <= 2) return true;
  return false;
}

export interface ReadingAlignment {
  states: ReadingWordState[];
  matched: number;
  total: number;
  lastRead: number;
  ratio: number;
}

/** Cuántas palabras oídas se miran por delante para emparejar la siguiente. */
const LOOKAHEAD = 4;

/**
 * Alinea las palabras oídas con las del texto y devuelve el estado de cada una.
 * Se recalcula con cada transcripción (final + provisional), así que el
 * seguimiento también avanza mientras el niño o la niña lee.
 */
export function alignReading(tokens: ReadingToken[], heard: string[]): ReadingAlignment {
  const states: ReadingWordState[] = tokens.map(() => 'pending');
  let heardIndex = 0;
  let matched = 0;
  let lastRead = -1;

  for (let i = 0; i < tokens.length; i++) {
    const expected = tokens[i]!.clean;
    const end = Math.min(heard.length, heardIndex + LOOKAHEAD);
    for (let j = heardIndex; j < end; j++) {
      if (readingWordsMatch(heard[j]!, expected)) {
        states[i] = 'read';
        heardIndex = j + 1;
        matched += 1;
        lastRead = i;
        break;
      }
    }
  }

  for (let i = 0; i < states.length; i++) {
    if (states[i] === 'pending' && i < lastRead) states[i] = 'skipped';
  }
  const next = states.indexOf('pending');
  if (next >= 0) states[next] = 'current';

  return {
    states,
    matched,
    total: tokens.length,
    lastRead,
    ratio: tokens.length > 0 ? matched / tokens.length : 0,
  };
}

/**
 * Seguimiento sin micrófono: el propio lector toca cada palabra al leerla.
 * Sirve de respaldo cuando el navegador no tiene reconocimiento de voz o no hay
 * permiso de micrófono, sin dejar fuera a nadie.
 */
export function alignManual(tokens: ReadingToken[], readIndexes: number[]): ReadingAlignment {
  const read = new Set(readIndexes);
  const states: ReadingWordState[] = tokens.map((_, i) => (read.has(i) ? 'read' : 'pending'));
  const next = states.indexOf('pending');
  if (next >= 0) states[next] = 'current';
  const matched = states.filter((s) => s === 'read').length;
  const lastRead = states.lastIndexOf('read');
  return {
    states,
    matched,
    total: tokens.length,
    lastRead,
    ratio: tokens.length > 0 ? matched / tokens.length : 0,
  };
}

export function readingStars(matched: number, total: number): number {
  if (total <= 0) return 1;
  const ratio = matched / total;
  if (ratio >= 0.9) return 3;
  if (ratio >= 0.7) return 2;
  return 1;
}

export function readingXp(matched: number, stars: number): number {
  return Math.min(30, 5 + matched) + stars * 2;
}

/** Resumen amable: nunca se presenta como un error, siempre como una pista. */
export function readingFeedback(matched: number, total: number, ui: 'es' | 'eu'): string {
  const ratio = total > 0 ? matched / total : 0;
  if (ratio >= 0.9) return ui === 'eu' ? 'Bikain! Ia dena ondo irakurri duzu.' : '¡Genial! Has leído casi todo fenomenal.';
  if (ratio >= 0.7) return ui === 'eu' ? 'Oso ondo! Hitz batzuk berriro irakurtzeko.' : '¡Muy bien! Solo quedan un par de palabras por repasar.';
  if (ratio >= 0.4) return ui === 'eu' ? 'Ondo doa! Polikiago irakurri eta berriro saiatu.' : '¡Buen trabajo! Lee más despacio y prueba otra vez.';
  return ui === 'eu' ? 'Ez kezkatu: irakurtzea praktikarekin ikasten da.' : 'No pasa nada: leer se aprende practicando.';
}
