import type { Lang } from './types';

export type Category =
  | 'animales'
  | 'naturaleza'
  | 'comida'
  | 'colores'
  | 'casa'
  | 'numeros'
  | 'acciones'
  | 'cuerpo'
  | 'adj';

export interface Word {
  id: string;
  es: string;
  eu: string;
  emoji: string;
  sylEs: string[];
  sylEu: string[];
  cat: Category;
}

/** Banco de palabras: la misma idea en dos lenguas, con sus sílabas. */
export const words: Word[] = [
  { id: 'sol', es: 'sol', eu: 'eguzki', emoji: '☀️', sylEs: ['sol'], sylEu: ['e', 'guz', 'ki'], cat: 'naturaleza' },
  { id: 'luna', es: 'luna', eu: 'ilargi', emoji: '🌙', sylEs: ['lu', 'na'], sylEu: ['i', 'lar', 'gi'], cat: 'naturaleza' },
  { id: 'agua', es: 'agua', eu: 'ur', emoji: '💧', sylEs: ['a', 'gua'], sylEu: ['ur'], cat: 'naturaleza' },
  { id: 'flor', es: 'flor', eu: 'lore', emoji: '🌸', sylEs: ['flor'], sylEu: ['lo', 're'], cat: 'naturaleza' },
  { id: 'arbol', es: 'árbol', eu: 'zuhaitz', emoji: '🌳', sylEs: ['ár', 'bol'], sylEu: ['zu', 'haitz'], cat: 'naturaleza' },
  { id: 'mar', es: 'mar', eu: 'itsaso', emoji: '🌊', sylEs: ['mar'], sylEu: ['it', 'sa', 'so'], cat: 'naturaleza' },
  { id: 'montana', es: 'montaña', eu: 'mendi', emoji: '⛰️', sylEs: ['mon', 'ta', 'ña'], sylEu: ['men', 'di'], cat: 'naturaleza' },
  { id: 'estrella', es: 'estrella', eu: 'izar', emoji: '⭐', sylEs: ['es', 'tre', 'lla'], sylEu: ['i', 'zar'], cat: 'naturaleza' },
  { id: 'viento', es: 'viento', eu: 'haize', emoji: '💨', sylEs: ['vien', 'to'], sylEu: ['hai', 'ze'], cat: 'naturaleza' },
  { id: 'piedra', es: 'piedra', eu: 'harri', emoji: '🪨', sylEs: ['pie', 'dra'], sylEu: ['ha', 'rri'], cat: 'naturaleza' },

  { id: 'gato', es: 'gato', eu: 'katu', emoji: '🐱', sylEs: ['ga', 'to'], sylEu: ['ka', 'tu'], cat: 'animales' },
  { id: 'perro', es: 'perro', eu: 'txakur', emoji: '🐶', sylEs: ['pe', 'rro'], sylEu: ['txa', 'kur'], cat: 'animales' },
  { id: 'pajaro', es: 'pájaro', eu: 'txori', emoji: '🐦', sylEs: ['pá', 'ja', 'ro'], sylEu: ['txo', 'ri'], cat: 'animales' },
  { id: 'caballo', es: 'caballo', eu: 'zaldi', emoji: '🐴', sylEs: ['ca', 'ba', 'llo'], sylEu: ['zal', 'di'], cat: 'animales' },
  { id: 'pez', es: 'pez', eu: 'arrain', emoji: '🐟', sylEs: ['pez'], sylEu: ['a', 'rrain'], cat: 'animales' },
  { id: 'mariposa', es: 'mariposa', eu: 'tximeleta', emoji: '🦋', sylEs: ['ma', 'ri', 'po', 'sa'], sylEu: ['txi', 'me', 'le', 'ta'], cat: 'animales' },

  { id: 'casa', es: 'casa', eu: 'etxe', emoji: '🏠', sylEs: ['ca', 'sa'], sylEu: ['et', 'xe'], cat: 'casa' },
  { id: 'libro', es: 'libro', eu: 'liburu', emoji: '📖', sylEs: ['li', 'bro'], sylEu: ['li', 'bu', 'ru'], cat: 'casa' },
  { id: 'mesa', es: 'mesa', eu: 'mahai', emoji: '🪑', sylEs: ['me', 'sa'], sylEu: ['ma', 'hai'], cat: 'casa' },
  { id: 'puerta', es: 'puerta', eu: 'ate', emoji: '🚪', sylEs: ['puer', 'ta'], sylEu: ['a', 'te'], cat: 'casa' },
  { id: 'ventana', es: 'ventana', eu: 'leiho', emoji: '🪟', sylEs: ['ven', 'ta', 'na'], sylEu: ['lei', 'ho'], cat: 'casa' },
  { id: 'escuela', es: 'escuela', eu: 'eskola', emoji: '🏫', sylEs: ['es', 'cue', 'la'], sylEu: ['es', 'ko', 'la'], cat: 'casa' },
  { id: 'llave', es: 'llave', eu: 'giltza', emoji: '🔑', sylEs: ['lla', 've'], sylEu: ['gil', 'tza'], cat: 'casa' },
  { id: 'zapato', es: 'zapato', eu: 'zapata', emoji: '👟', sylEs: ['za', 'pa', 'to'], sylEu: ['za', 'pa', 'ta'], cat: 'casa' },

  { id: 'manzana', es: 'manzana', eu: 'sagar', emoji: '🍎', sylEs: ['man', 'za', 'na'], sylEu: ['sa', 'gar'], cat: 'comida' },
  { id: 'pan', es: 'pan', eu: 'ogi', emoji: '🍞', sylEs: ['pan'], sylEu: ['o', 'gi'], cat: 'comida' },
  { id: 'leche', es: 'leche', eu: 'esne', emoji: '🥛', sylEs: ['le', 'che'], sylEu: ['es', 'ne'], cat: 'comida' },
  { id: 'queso', es: 'queso', eu: 'gazta', emoji: '🧀', sylEs: ['que', 'so'], sylEu: ['gaz', 'ta'], cat: 'comida' },
  { id: 'chocolate', es: 'chocolate', eu: 'txokolate', emoji: '🍫', sylEs: ['cho', 'co', 'la', 'te'], sylEu: ['txo', 'ko', 'la', 'te'], cat: 'comida' },

  { id: 'rojo', es: 'rojo', eu: 'gorri', emoji: '🔴', sylEs: ['ro', 'jo'], sylEu: ['go', 'rri'], cat: 'colores' },
  { id: 'azul', es: 'azul', eu: 'urdin', emoji: '🔵', sylEs: ['a', 'zul'], sylEu: ['ur', 'din'], cat: 'colores' },
  { id: 'verde', es: 'verde', eu: 'berde', emoji: '🟢', sylEs: ['ver', 'de'], sylEu: ['ber', 'de'], cat: 'colores' },
  { id: 'amarillo', es: 'amarillo', eu: 'hori', emoji: '🟡', sylEs: ['a', 'ma', 'ri', 'llo'], sylEu: ['ho', 'ri'], cat: 'colores' },
  { id: 'blanco', es: 'blanco', eu: 'zuri', emoji: '⚪', sylEs: ['blan', 'co'], sylEu: ['zu', 'ri'], cat: 'colores' },
  { id: 'negro', es: 'negro', eu: 'beltz', emoji: '⚫', sylEs: ['ne', 'gro'], sylEu: ['beltz'], cat: 'colores' },
  { id: 'naranja', es: 'naranja', eu: 'laranja', emoji: '🟠', sylEs: ['na', 'ran', 'ja'], sylEu: ['la', 'ran', 'ja'], cat: 'colores' },
  { id: 'morado', es: 'morado', eu: 'morea', emoji: '🟣', sylEs: ['mo', 'ra', 'do'], sylEu: ['mo', 're', 'a'], cat: 'colores' },
  { id: 'rosa', es: 'rosa', eu: 'arrosa', emoji: '🌷', sylEs: ['ro', 'sa'], sylEu: ['a', 'rro', 'sa'], cat: 'colores' },

  { id: 'uno', es: 'uno', eu: 'bat', emoji: '1️⃣', sylEs: ['u', 'no'], sylEu: ['bat'], cat: 'numeros' },
  { id: 'dos', es: 'dos', eu: 'bi', emoji: '2️⃣', sylEs: ['dos'], sylEu: ['bi'], cat: 'numeros' },
  { id: 'tres', es: 'tres', eu: 'hiru', emoji: '3️⃣', sylEs: ['tres'], sylEu: ['hi', 'ru'], cat: 'numeros' },
  { id: 'cuatro', es: 'cuatro', eu: 'lau', emoji: '4️⃣', sylEs: ['cua', 'tro'], sylEu: ['lau'], cat: 'numeros' },
  { id: 'cinco', es: 'cinco', eu: 'bost', emoji: '5️⃣', sylEs: ['cin', 'co'], sylEu: ['bost'], cat: 'numeros' },

  { id: 'correr', es: 'correr', eu: 'korrika', emoji: '🏃', sylEs: ['co', 'rrer'], sylEu: ['ko', 'rri', 'ka'], cat: 'acciones' },
  { id: 'cantar', es: 'cantar', eu: 'abestu', emoji: '🎤', sylEs: ['can', 'tar'], sylEu: ['a', 'bes', 'tu'], cat: 'acciones' },
  { id: 'bailar', es: 'bailar', eu: 'dantzan', emoji: '💃', sylEs: ['bai', 'lar'], sylEu: ['dan', 'tzan'], cat: 'acciones' },
  { id: 'jugar', es: 'jugar', eu: 'jolastu', emoji: '🎲', sylEs: ['ju', 'gar'], sylEu: ['jo', 'las', 'tu'], cat: 'acciones' },
  { id: 'leer', es: 'leer', eu: 'irakurri', emoji: '📚', sylEs: ['le', 'er'], sylEu: ['i', 'ra', 'ku', 'rri'], cat: 'acciones' },
  { id: 'escribir', es: 'escribir', eu: 'idatzi', emoji: '✏️', sylEs: ['es', 'cri', 'bir'], sylEu: ['i', 'da', 'tzi'], cat: 'acciones' },

  { id: 'corazon', es: 'corazón', eu: 'bihotz', emoji: '❤️', sylEs: ['co', 'ra', 'zón'], sylEu: ['bi', 'hotz'], cat: 'cuerpo' },
  { id: 'mano', es: 'mano', eu: 'esku', emoji: '✋', sylEs: ['ma', 'no'], sylEu: ['es', 'ku'], cat: 'cuerpo' },
  { id: 'ojo', es: 'ojo', eu: 'begi', emoji: '👁️', sylEs: ['o', 'jo'], sylEu: ['be', 'gi'], cat: 'cuerpo' },

  { id: 'amigo', es: 'amigo', eu: 'lagun', emoji: '🧑‍🤝‍🧑', sylEs: ['a', 'mi', 'go'], sylEu: ['la', 'gun'], cat: 'adj' },
  { id: 'nino', es: 'niño', eu: 'haur', emoji: '🧒', sylEs: ['ni', 'ño'], sylEu: ['haur'], cat: 'adj' },
  { id: 'grande', es: 'grande', eu: 'handi', emoji: '🐘', sylEs: ['gran', 'de'], sylEu: ['han', 'di'], cat: 'adj' },
  { id: 'pequeno', es: 'pequeño', eu: 'txiki', emoji: '🐭', sylEs: ['pe', 'que', 'ño'], sylEu: ['txi', 'ki'], cat: 'adj' },
  { id: 'bonito', es: 'bonito', eu: 'polit', emoji: '✨', sylEs: ['bo', 'ni', 'to'], sylEu: ['po', 'lit'], cat: 'adj' },

  /* Etapa 1 · Sílabas directas puras (CV: consonante + vocal) */
  { id: 'pato', es: 'pato', eu: 'ahate', emoji: '🦆', sylEs: ['pa', 'to'], sylEu: ['a', 'ha', 'te'], cat: 'animales' },
  { id: 'vaca', es: 'vaca', eu: 'behi', emoji: '🐮', sylEs: ['va', 'ca'], sylEu: ['be', 'hi'], cat: 'animales' },
  { id: 'mono', es: 'mono', eu: 'tximino', emoji: '🐒', sylEs: ['mo', 'no'], sylEu: ['txi', 'mi', 'no'], cat: 'animales' },
  { id: 'sopa', es: 'sopa', eu: 'zopa', emoji: '🥣', sylEs: ['so', 'pa'], sylEu: ['zo', 'pa'], cat: 'comida' },
  { id: 'tomate', es: 'tomate', eu: 'tomate', emoji: '🍅', sylEs: ['to', 'ma', 'te'], sylEu: ['to', 'ma', 'te'], cat: 'comida' },
  { id: 'seta', es: 'seta', eu: 'perretxiko', emoji: '🍄', sylEs: ['se', 'ta'], sylEu: ['pe', 'rre', 'txi', 'ko'], cat: 'naturaleza' },
  { id: 'pelota', es: 'pelota', eu: 'pilota', emoji: '⚽', sylEs: ['pe', 'lo', 'ta'], sylEu: ['pi', 'lo', 'ta'], cat: 'casa' },
  { id: 'cama', es: 'cama', eu: 'ohe', emoji: '🛏️', sylEs: ['ca', 'ma'], sylEu: ['o', 'he'], cat: 'casa' },

  /* Etapa 2 · Sílabas inversas (VC: vocal + consonante) */
  { id: 'isla', es: 'isla', eu: 'irla', emoji: '🏝️', sylEs: ['is', 'la'], sylEu: ['ir', 'la'], cat: 'naturaleza' },
  { id: 'espejo', es: 'espejo', eu: 'ispilu', emoji: '🪞', sylEs: ['es', 'pe', 'jo'], sylEu: ['is', 'pi', 'lu'], cat: 'casa' },
  { id: 'arco', es: 'arco', eu: 'arku', emoji: '🏹', sylEs: ['ar', 'co'], sylEu: ['ar', 'ku'], cat: 'casa' },
  { id: 'espada', es: 'espada', eu: 'ezpata', emoji: '⚔️', sylEs: ['es', 'pa', 'da'], sylEu: ['ez', 'pa', 'ta'], cat: 'casa' },
  { id: 'antena', es: 'antena', eu: 'antena', emoji: '📡', sylEs: ['an', 'te', 'na'], sylEu: ['an', 'te', 'na'], cat: 'casa' },
  { id: 'ardilla', es: 'ardilla', eu: 'urtxintxa', emoji: '🐿️', sylEs: ['ar', 'di', 'lla'], sylEu: ['ur', 'txin', 'txa'], cat: 'animales' },
  { id: 'insecto', es: 'insecto', eu: 'intsektu', emoji: '🐞', sylEs: ['in', 'sec', 'to'], sylEu: ['in', 'tsek', 'tu'], cat: 'animales' },
  { id: 'ambulancia', es: 'ambulancia', eu: 'anbulantzia', emoji: '🚑', sylEs: ['am', 'bu', 'lan', 'cia'], sylEu: ['an', 'bu', 'lan', 'tzi', 'a'], cat: 'casa' },

  /* Etapa 3 · Sílabas trabadas / sinfones (CCV: bl, cl, fl, gl, pl, br, cr, dr, fr, gr, pr, tr) */
  { id: 'tren', es: 'tren', eu: 'trena', emoji: '🚂', sylEs: ['tren'], sylEu: ['tre', 'na'], cat: 'casa' },
  { id: 'plato', es: 'plato', eu: 'plater', emoji: '🍽️', sylEs: ['pla', 'to'], sylEu: ['pla', 'ter'], cat: 'comida' },
  { id: 'globo', es: 'globo', eu: 'globo', emoji: '🎈', sylEs: ['glo', 'bo'], sylEu: ['glo', 'bo'], cat: 'casa' },
  { id: 'fruta', es: 'fruta', eu: 'fruta', emoji: '🍓', sylEs: ['fru', 'ta'], sylEu: ['fru', 'ta'], cat: 'comida' },
  { id: 'flan', es: 'flan', eu: 'flana', emoji: '🍮', sylEs: ['flan'], sylEu: ['fla', 'na'], cat: 'comida' },
  { id: 'tigre', es: 'tigre', eu: 'tigre', emoji: '🐯', sylEs: ['ti', 'gre'], sylEu: ['ti', 'gre'], cat: 'animales' },
  { id: 'dragon', es: 'dragón', eu: 'dragoi', emoji: '🐉', sylEs: ['dra', 'gón'], sylEu: ['dra', 'goi'], cat: 'animales' },
  { id: 'cebra', es: 'cebra', eu: 'zebra', emoji: '🦓', sylEs: ['ce', 'bra'], sylEu: ['ze', 'bra'], cat: 'animales' },
  { id: 'cocodrilo', es: 'cocodrilo', eu: 'krokodilo', emoji: '🐊', sylEs: ['co', 'co', 'dri', 'lo'], sylEu: ['kro', 'ko', 'di', 'lo'], cat: 'animales' },
  { id: 'princesa', es: 'princesa', eu: 'printzesa', emoji: '👑', sylEs: ['prin', 'ce', 'sa'], sylEu: ['prin', 'tze', 'sa'], cat: 'adj' },
  { id: 'trompeta', es: 'trompeta', eu: 'tronpeta', emoji: '🎺', sylEs: ['trom', 'pe', 'ta'], sylEu: ['tron', 'pe', 'ta'], cat: 'casa' },
  { id: 'tractor', es: 'tractor', eu: 'traktore', emoji: '🚜', sylEs: ['trac', 'tor'], sylEu: ['trak', 'to', 're'], cat: 'casa' },
  { id: 'bicicleta', es: 'bicicleta', eu: 'bizikleta', emoji: '🚲', sylEs: ['bi', 'ci', 'cle', 'ta'], sylEu: ['bi', 'zi', 'kle', 'ta'], cat: 'casa' },
  { id: 'blusa', es: 'blusa', eu: 'blusa', emoji: '👚', sylEs: ['blu', 'sa'], sylEu: ['blu', 'sa'], cat: 'casa' },
];

export const wordById: Record<string, Word> = Object.fromEntries(words.map((w) => [w.id, w]));

export function wordText(w: Word, lang: Lang): string {
  return lang === 'es' ? w.es : w.eu;
}

export function wordSyllables(w: Word, lang: Lang): string[] {
  return (lang === 'es' ? w.sylEs : w.sylEu).slice();
}

export type SyllableType = 'directa' | 'inversa' | 'trabada' | 'mixta';

function plainSyllable(s: string): string {
  return s
    .toLowerCase()
    .replace(/ñ/g, '\u0001')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\u0001/g, 'ñ');
}

/**
 * Clasifica fonológicamente una sílaba en:
 * - trabada (CCV: bl, cl, fl, gl, kl, pl, tl, br, cr, dr, fr, gr, kr, pr, tr + vocal)
 * - inversa (VC: empieza por vocal seguida de consonante: al, ar, an, as, es, is, ur, ez...)
 * - directa (CV / V abierta: termina en vocal y sin grupo consonántico trabado)
 * - mixta (CVC sin sinfón inicial: sol, mar, pan...)
 */
export function classifySyllable(syl: string): SyllableType {
  const s = plainSyllable(syl);
  if (/^(bl|cl|fl|gl|kl|pl|tl|br|cr|dr|fr|gr|kr|pr|tr)[aeiou]/.test(s)) return 'trabada';
  if (/^[aeiou]+[bcdfghjklmnñpqrstvwxyz]/.test(s)) return 'inversa';
  if (/[aeiou]$/.test(s)) return 'directa';
  return 'mixta';
}

/** Extrae el grupo trabado inicial (pl, br, tr, fl...) si la sílaba es trabada. */
export function trabadaCluster(syl: string): string | null {
  const m = plainSyllable(syl).match(/^(bl|cl|fl|gl|kl|pl|tl|br|cr|dr|fr|gr|kr|pr|tr)/);
  return m ? m[1]! : null;
}

/**
 * Devuelve la etapa silábica de una palabra en el idioma indicado:
 * - 3: contiene al menos una sílaba trabada (CCV)
 * - 2: sin trabadas, contiene sílaba inversa (VC) o cerrada
 * - 1: todas sus sílabas son directas/abiertas puras (CV / V)
 */
export function wordSyllableStage(w: Word, lang: Lang): 1 | 2 | 3 {
  const syls = wordSyllables(w, lang);
  const types = syls.map(classifySyllable);
  if (types.includes('trabada')) return 3;
  if (types.includes('inversa')) return 2;
  if (types.every((t) => t === 'directa')) return 1;
  return 2;
}

/** Palabras que pertenecen exactamente a la etapa silábica pedida (1: Directas, 2: Inversas, 3: Trabadas). */
export function wordsForSyllableStage(stage: 1 | 2 | 3, lang: Lang, list: Word[] = words): Word[] {
  if (stage === 1) {
    return list.filter((w) => wordSyllables(w, lang).every((s) => classifySyllable(s) === 'directa'));
  }
  if (stage === 2) {
    // Prioriza palabras con sílaba inversa pura (VC) y sin ninguna trabada
    const strictInverse = list.filter((w) => {
      const ts = wordSyllables(w, lang).map(classifySyllable);
      return !ts.includes('trabada') && ts.includes('inversa');
    });
    return strictInverse.length >= 6 ? strictInverse : list.filter((w) => wordSyllableStage(w, lang) === 2);
  }
  return list.filter((w) => wordSyllables(w, lang).some((s) => classifySyllable(s) === 'trabada'));
}

export const SYLLABLE_BANKS: Record<Lang, Record<1 | 2 | 3, string[]>> = {
  es: {
    1: ['ma', 'me', 'mi', 'mo', 'mu', 'pa', 'pe', 'pi', 'po', 'pu', 'la', 'le', 'li', 'lo', 'lu', 'sa', 'se', 'si', 'so', 'su', 'ta', 'te', 'ti', 'to', 'tu', 'ca', 'co', 'ga', 'go'],
    2: ['al', 'el', 'il', 'ol', 'ul', 'ar', 'er', 'ir', 'or', 'ur', 'an', 'en', 'in', 'on', 'un', 'as', 'es', 'is', 'os', 'us', 'am', 'im'],
    3: ['bla', 'blu', 'cla', 'cle', 'fla', 'flo', 'gla', 'glo', 'pla', 'ple', 'bra', 'bro', 'cra', 'cre', 'dra', 'dri', 'fra', 'fru', 'gra', 'gre', 'pra', 'pri', 'tra', 'tre', 'tro'],
  },
  eu: {
    1: ['ma', 'me', 'mi', 'mo', 'mu', 'ba', 'be', 'bi', 'bo', 'bu', 'ka', 'ke', 'ki', 'ko', 'ku', 'la', 'le', 'li', 'lo', 'lu', 'sa', 'se', 'si', 'so', 'su', 'ta', 'te', 'ti', 'to', 'tu', 'za', 'zo', 'zu'],
    2: ['al', 'el', 'il', 'ol', 'ul', 'ar', 'er', 'ir', 'or', 'ur', 'an', 'en', 'in', 'on', 'un', 'as', 'es', 'is', 'os', 'us', 'az', 'ez', 'iz', 'it', 'et'],
    3: ['bla', 'blu', 'kla', 'kle', 'fla', 'flo', 'gla', 'glo', 'pla', 'ple', 'bra', 'bro', 'kra', 'kro', 'dra', 'dri', 'fra', 'fru', 'gra', 'gre', 'pra', 'pri', 'tra', 'tre', 'tro'],
  },
};

/** Pares espejo Directa ↔ Inversa para entrenar el orden letra-sonido (la ↔ al, es ↔ se...). */
export const INVERSE_MIRROR_PAIRS: Record<Lang, [string, string][]> = {
  es: [
    ['al', 'la'],
    ['el', 'le'],
    ['ar', 'ra'],
    ['er', 're'],
    ['an', 'na'],
    ['en', 'ne'],
    ['in', 'ni'],
    ['as', 'sa'],
    ['es', 'se'],
    ['is', 'si'],
    ['os', 'so'],
  ],
  eu: [
    ['al', 'la'],
    ['el', 'le'],
    ['ar', 'ra'],
    ['ir', 'ri'],
    ['ur', 'ru'],
    ['an', 'na'],
    ['in', 'ni'],
    ['es', 'se'],
    ['is', 'si'],
    ['ez', 'ze'],
    ['iz', 'zi'],
  ],
};

export interface LevelDef {
  id: number;
  emoji: string;
  theme: string;
  questions: number;
  es: { title: string; sub: string; skill: string };
  eu: { title: string; sub: string; skill: string };
}

export const levels: LevelDef[] = [
  {
    id: 1,
    emoji: '🔤',
    theme: 'mint',
    questions: 6,
    es: { title: 'Letras que suenan', sub: 'Descubre el sonido de cada letra', skill: 'Fonética' },
    eu: { title: 'Soinua duten letrak', sub: 'Ezagutu letra bakoitzaren soinua', skill: 'Fonetika' },
  },
  {
    id: 2,
    emoji: '🧩',
    theme: 'sky',
    questions: 6,
    es: { title: 'El taller de sílabas', sub: 'En progresión: 1·Directas → 2·Inversas → 3·Trabadas', skill: '1·Directas · 2·Inversas · 3·Trabadas' },
    eu: { title: 'Silaben tailerra', sub: 'Progresioan: 1·Zuzenak → 2·Alderantzizkoak → 3·Trabatutakoak', skill: '1·Zuzenak · 2·Alderantzizkoak · 3·Trabatutakoak' },
  },
  {
    id: 3,
    emoji: '🍎',
    theme: 'coral',
    questions: 6,
    es: { title: 'Primeras palabras', sub: 'Lee, mira y escucha palabras reales', skill: 'Vocabulario' },
    eu: { title: 'Lehen hitzak', sub: 'Irakurri, ikusi eta entzun benetako hitzak', skill: 'Hiztegia' },
  },
  {
    id: 4,
    emoji: '🎵',
    theme: 'grape',
    questions: 6,
    es: { title: 'Rimas y sonidos', sub: 'Juega con palabras que suenan parecido', skill: 'Conciencia fonológica' },
    eu: { title: 'Errimak eta soinuak', sub: 'Jolastu antzeko soinua duten hitzekin', skill: 'Entzumen-bereizketa' },
  },
  {
    id: 5,
    emoji: '💬',
    theme: 'sun',
    questions: 6,
    es: { title: 'Frases que cobran vida', sub: 'Une palabras para contar cosas', skill: 'Sintaxis' },
    eu: { title: 'Bizirik dauden esaldiak', sub: 'Elkartu hitzak gauzak kontatzeko', skill: 'Sintaxia' },
  },
  {
    id: 6,
    emoji: '📖',
    theme: 'violet',
    questions: 6,
    es: { title: 'El bosque de los cuentos', sub: 'Lee historias y descubre sus secretos', skill: 'Comprensión lectora' },
    eu: { title: 'Ipuinen basoa', sub: 'Irakurri istorioak eta ezagutu sekretuak', skill: 'Ulermena' },
  },
];

export const digraphs: Record<Lang, string[]> = {
  es: ['ch', 'll', 'rr', 'qu', 'gu', 'ce', 'ci'],
  eu: ['tx', 'tz', 'ts', 'tzi', 'rr', 'll', 'dd'],
};

export const specialSounds: Record<Lang, string[]> = {
  es: ['ch', 'rr', 'ñ', 'll', 'qu', 'z'],
  eu: ['tx', 'tz', 'rr', 'ai', 'h', 'k'],
};

export interface Rhyme {
  a: string;
  b: string;
  distractors: string[];
}

/** Rimas (consonantes en castellano, asonantes en euskera). */
export const rhymes: Record<Lang, Rhyme[]> = {
  es: [
    { a: 'gato', b: 'pato', distractors: ['casa', 'luna'] },
    { a: 'casa', b: 'taza', distractors: ['pez', 'sol'] },
    { a: 'luna', b: 'cuna', distractors: ['libro', 'flor'] },
    { a: 'pan', b: 'flan', distractors: ['mesa', 'gato'] },
    { a: 'mesa', b: 'fresa', distractors: ['perro', 'mar'] },
    { a: 'perro', b: 'cerro', distractors: ['luna', 'queso'] },
    { a: 'viento', b: 'cuento', distractors: ['casa', 'pan'] },
    { a: 'estrella', b: 'botella', distractors: ['sol', 'mano'] },
    { a: 'corazón', b: 'canción', distractors: ['árbol', 'leche'] },
    { a: 'flor', b: 'color', distractors: ['agua', 'libro'] },
  ],
  eu: [
    { a: 'txori', b: 'hori', distractors: ['katu', 'etxe'] },
    { a: 'sagar', b: 'izar', distractors: ['ur', 'ogi'] },
    { a: 'katu', b: 'zapatu', distractors: ['liburu', 'lore'] },
    { a: 'lore', b: 'kolore', distractors: ['mendi', 'esne'] },
    { a: 'liburu', b: 'buru', distractors: ['txori', 'sagar'] },
    { a: 'ogi', b: 'txiki', distractors: ['itsaso', 'handi'] },
    { a: 'harri', b: 'begi', distractors: ['etxe', 'ur'] },
    { a: 'urdin', b: 'egin', distractors: ['gorri', 'zuri'] },
    { a: 'etxe', b: 'esne', distractors: ['haize', 'bihotz'] },
    { a: 'haize', b: 'gazte', distractors: ['liburu', 'katu'] },
  ],
};

/** Pares que se parecen mucho al oído: para entrenar la discriminación auditiva. */
export const minimalPairs: Record<Lang, string[][]> = {
  es: [
    ['gato', 'pato', 'paco'],
    ['casa', 'taza', 'cama'],
    ['luna', 'cuna', 'loma'],
    ['perro', 'pero', 'perla'],
    ['pan', 'plan', 'flan'],
    ['flor', 'color', 'florero'],
    ['mesa', 'fresa', 'meta'],
    ['queso', 'beso', 'peso'],
  ],
  eu: [
    ['katu', 'katua', 'zapata'],
    ['txori', 'hori', 'txoko'],
    ['etxe', 'etxea', 'esne'],
    ['sagar', 'sagarra', 'adar'],
    ['lore', 'kolore', 'loreak'],
    ['ogi', 'ogia', 'txiki'],
    ['harri', 'harria', 'begi'],
    ['urdin', 'urdina', 'egin'],
  ],
};

export interface Sentence {
  id: string;
  emoji: string;
  es: string[];
  eu: string[];
}

export const sentences: Sentence[] = [
  { id: 's1', emoji: '🐱🥛', es: ['El', 'gato', 'bebe', 'leche'], eu: ['Katuak', 'esnea', 'edaten', 'du'] },
  { id: 's2', emoji: '🦋🌸', es: ['La', 'mariposa', 'vuela', 'mucho'], eu: ['Tximeletak', 'asko', 'hegan', 'egiten', 'du'] },
  { id: 's3', emoji: '☀️', es: ['El', 'sol', 'brilla', 'hoy'], eu: ['Eguzkiak', 'gaur', 'distira', 'egiten', 'du'] },
  { id: 's4', emoji: '📖🔵', es: ['Mi', 'amigo', 'lee', 'un', 'libro'], eu: ['Lagunak', 'liburu', 'bat', 'irakurtzen', 'du'] },
  { id: 's5', emoji: '🐶🌳', es: ['El', 'perro', 'corre', 'al', 'árbol'], eu: ['Txakurra', 'zuhaitzera', 'korrika', 'doa'] },
  { id: 's6', emoji: '🌙⚪', es: ['La', 'luna', 'es', 'blanca'], eu: ['Ilargia', 'zuria', 'da'] },
  { id: 's7', emoji: '🏠🍞', es: ['En', 'casa', 'hay', 'pan'], eu: ['Etxean', 'ogia', 'dago'] },
  { id: 's8', emoji: '🐦🎵', es: ['El', 'pájaro', 'canta', 'alegre'], eu: ['Txoriak', 'alai', 'abesten', 'du'] },
];

export interface Blank {
  id: string;
  emoji: string;
  es: { before: string; after: string };
  eu: { before: string; after: string };
  answer: string;
  distractors: string[];
}

export const blanks: Blank[] = [
  { id: 'b1', emoji: '🍎', es: { before: '', after: 'roja' }, eu: { before: '', after: 'gorria' }, answer: 'manzana', distractors: ['luna', 'mar'] },
  { id: 'b2', emoji: '💧', es: { before: 'Bebo', after: '' }, eu: { before: '', after: 'edaten dut' }, answer: 'agua', distractors: ['queso', 'libro'] },
  { id: 'b3', emoji: '📖', es: { before: 'Leo un', after: '' }, eu: { before: '', after: 'bat irakurtzen dut' }, answer: 'libro', distractors: ['perro', 'sol'] },
  { id: 'b4', emoji: '🐶', es: { before: 'El', after: 'corre' }, eu: { before: '', after: 'korrika doa' }, answer: 'perro', distractors: ['flor', 'mesa'] },
  { id: 'b5', emoji: '🌙', es: { before: 'La', after: 'brilla' }, eu: { before: '', after: 'distira egiten du' }, answer: 'luna', distractors: ['pan', 'gato'] },
  { id: 'b6', emoji: '🌊', es: { before: '', after: 'azul' }, eu: { before: '', after: 'urdina' }, answer: 'mar', distractors: ['queso', 'mano'] },
  { id: 'b7', emoji: '🍞', es: { before: 'Como', after: '' }, eu: { before: '', after: 'jaten dut' }, answer: 'pan', distractors: ['estrella', 'ojo'] },
  { id: 'b8', emoji: '🐦', es: { before: 'Veo un', after: '' }, eu: { before: '', after: 'bat ikusten dut' }, answer: 'pajaro', distractors: ['leche', 'piedra'] },
];

export interface LocalizedText {
  es: string;
  eu: string;
}

export interface Story {
  id: string;
  emoji: string;
  title: LocalizedText;
  text: LocalizedText;
  /** Versión de lectura fácil (una sola frase que siempre contiene la respuesta). */
  shortText: LocalizedText;
  question: LocalizedText;
  options: LocalizedText[];
  correct: number;
  theme: LocalizedText;
}

export const stories: Story[] = [
  {
    id: 'st1',
    emoji: '🐦☀️',
    title: { es: 'La mañana de Txori', eu: 'Txoriren goiza' },
    text: {
      es: 'El sol brilla. El pájaro canta en el árbol. Todo está alegre.',
      eu: 'Eguzkiak distira egiten du. Txoriak zuhaitzean abesten du. Dena alai dago.',
    },
    shortText: {
      es: 'El pájaro canta en el árbol.',
      eu: 'Txoriak zuhaitzean abesten du.',
    },
    question: { es: '¿Quién canta?', eu: 'Nork abesten du?' },
    options: [
      { es: 'El pájaro', eu: 'Txoriak' },
      { es: 'El gato', eu: 'Katuak' },
      { es: 'La luna', eu: 'Ilargiak' },
    ],
    correct: 0,
    theme: { es: 'Un pájaro', eu: 'Txori bat' },
  },
  {
    id: 'st2',
    emoji: '🦋🌸',
    title: { es: 'Vuelo de colores', eu: 'Kolorezko hegaldia' },
    text: {
      es: 'La mariposa vuela sobre la flor roja. Después descansa en una hoja verde.',
      eu: 'Tximeleta lore gorriaren gainean hegan dabil. Gero hosto berde batean atseden hartzen du.',
    },
    shortText: {
      es: 'La mariposa vuela sobre la flor roja.',
      eu: 'Tximeleta lore gorriaren gainean hegan dabil.',
    },
    question: { es: '¿Sobre qué vuela la mariposa?', eu: 'Zeren gainean egiten du hegan tximeletak?' },
    options: [
      { es: 'Sobre la flor', eu: 'Lorearen gainean' },
      { es: 'Sobre el mar', eu: 'Itsasoaren gainean' },
      { es: 'Sobre la luna', eu: 'Ilargiaren gainean' },
    ],
    correct: 0,
    theme: { es: 'Una mariposa', eu: 'Tximeleta bat' },
  },
  {
    id: 'st3',
    emoji: '🍞🧀🍎',
    title: { es: 'La mesa misteriosa', eu: 'Mahai misteriotsua' },
    text: {
      es: 'En la mesa hay pan, queso y una manzana. Falta la leche: ¡la busca el gato!',
      eu: 'Mahaian ogia, gazta eta sagarra daude. Esnea falta da: katuak bilatzen du!',
    },
    shortText: {
      es: 'En la mesa hay pan y manzana, pero falta la leche.',
      eu: 'Mahaian ogia eta sagarra daude, baina esnea falta da.',
    },
    question: { es: '¿Qué NO está en la mesa?', eu: 'Zer EZ dago mahaian?' },
    options: [
      { es: 'La leche', eu: 'Esnea' },
      { es: 'El pan', eu: 'Ogia' },
      { es: 'La manzana', eu: 'Sagarra' },
    ],
    correct: 0,
    theme: { es: 'La comida', eu: 'Janaria' },
  },
  {
    id: 'st4',
    emoji: '📖🔵',
    title: { es: 'El libro azul', eu: 'Liburu urdina' },
    text: {
      es: 'Mi amigo y yo leemos un libro azul. El cuento habla de una estrella muy pequeña.',
      eu: 'Lagunak eta biok liburu urdin bat irakurtzen dugu. Ipuinak izar txiki bati buruz hitz egiten du.',
    },
    shortText: {
      es: 'Mi amigo y yo leemos un libro azul.',
      eu: 'Lagunak eta biok liburu urdin bat irakurtzen dugu.',
    },
    question: { es: '¿De qué color es el libro?', eu: 'Zer koloretakoa da liburua?' },
    options: [
      { es: 'Azul', eu: 'Urdina' },
      { es: 'Rojo', eu: 'Gorria' },
      { es: 'Verde', eu: 'Berdea' },
    ],
    correct: 0,
    theme: { es: 'Un libro', eu: 'Liburu bat' },
  },
  {
    id: 'st5',
    emoji: '🐶🌳',
    title: { es: 'Carrera en el bosque', eu: 'Lasterketa basoan' },
    text: {
      es: 'El perro corre hacia el árbol grande. El viento mueve las hojas y el perro ladra contento.',
      eu: 'Txakurra zuhaitz handirantz korrika doa. Haizeak hostoak mugitzen ditu eta txakurrak alai zaunka egiten du.',
    },
    shortText: {
      es: 'El perro corre hacia el árbol grande.',
      eu: 'Txakurra zuhaitz handirantz korrika doa.',
    },
    question: { es: '¿Hacia dónde corre el perro?', eu: 'Nora doa korrika txakurra?' },
    options: [
      { es: 'Hacia el árbol', eu: 'Zuhaitzera' },
      { es: 'Hacia el mar', eu: 'Itsasora' },
      { es: 'Hacia la escuela', eu: 'Eskolara' },
    ],
    correct: 0,
    theme: { es: 'Un perro', eu: 'Txakur bat' },
  },
  {
    id: 'st6',
    emoji: '🌙🦆',
    title: { es: 'Buenas noches, Pato Ventura', eu: 'Gabon, Pato Ventura' },
    text: {
      es: 'La luna blanca mira el cielo. Una estrella pequeña brilla y Pato Ventura se duerme en su nido.',
      eu: 'Ilargi zuriak zeruari begiratzen dio. Izar txiki batek distira egiten du eta Pato Ventura habian lokartzen da.',
    },
    shortText: {
      es: 'Por la noche, Pato Ventura se duerme en su nido.',
      eu: 'Gauez, Pato Ventura habian lokartzen da.',
    },
    question: { es: '¿Dónde se duerme Pato Ventura?', eu: 'Non lokartzen da Pato Ventura?' },
    options: [
      { es: 'En su nido', eu: 'Habian' },
      { es: 'En el mar', eu: 'Itsasoan' },
      { es: 'En la mesa', eu: 'Mahaian' },
    ],
    correct: 0,
    theme: { es: 'La noche', eu: 'Gaua' },
  },
];

export interface Badge {
  id: string;
  emoji: string;
  es: { name: string; desc: string };
  eu: { name: string; desc: string };
}

export const badges: Badge[] = [
  { id: 'first', emoji: '🌱', es: { name: 'Primer paso', desc: 'Tu primer acierto' }, eu: { name: 'Lehen urratsa', desc: 'Lehen asmatzea' } },
  { id: 'ear', emoji: '👂', es: { name: 'Oído de oro', desc: '5 aciertos auditivos seguidos' }, eu: { name: 'Urrezko belarria', desc: '5 entzunezko asmatze jarraian' } },
  { id: 'eye', emoji: '👁️', es: { name: 'Ojo de lince', desc: '5 aciertos visuales seguidos' }, eu: { name: 'Belatz begia', desc: '5 ikusizko asmatze jarraian' } },
  { id: 'streak5', emoji: '🔥', es: { name: 'Racha de 5', desc: '5 respuestas seguidas sin fallar' }, eu: { name: 'Bosteko bolada', desc: '5 erantzun jarraian akatsik gabe' } },
  { id: 'explorer', emoji: '🗺️', es: { name: 'Explorador', desc: 'Completar el primer mundo' }, eu: { name: 'Esploratzailea', desc: 'Lehen mundua osatu' } },
  { id: 'bilingual', emoji: '🌈', es: { name: 'Bilingüe', desc: 'Leer en euskera y castellano' }, eu: { name: 'Elebiduna', desc: 'Euskaraz eta gaztelaniaz irakurri' } },
  { id: 'storyteller', emoji: '📚', es: { name: 'Cuentacuentos', desc: 'Terminar el bosque de los cuentos' }, eu: { name: 'Ipuinlaria', desc: 'Ipuinen basoa amaitu' } },
  { id: 'master', emoji: '🏆', es: { name: 'Maestro lector', desc: 'Completar los 6 mundos' }, eu: { name: 'Irakurle maisu', desc: '6 munduak osatu' } },
  { id: 'counter', emoji: '🔢', es: { name: 'Contador de colores', desc: 'Completar números y colores' }, eu: { name: 'Kolore zenbatzailea', desc: 'Zenbakiak eta koloreak osatu' } },
  { id: 'mover', emoji: '🕹️', es: { name: 'Siguiendo a Pato Ventura', desc: 'Completar ¡Pato Ventura dice!' }, eu: { name: 'Pato Venturari jarraituz', desc: 'Pato Venturak dio! osatu' } },
];

export const badgeById: Record<string, Badge> = Object.fromEntries(badges.map((b) => [b.id, b]));

/* ================================================================== */
/* Contenido de apoyo: números, colores y juegos imperativos           */
/* ================================================================== */

export interface ColorItem {
  id: string;
  es: string;
  eu: string;
  hex: string;
  emoji: string;
  /** Patrón geométrico y símbolo único para niños con daltonismo. */
  pattern: string;
  symbol: string;
}

export const colors: ColorItem[] = [
  { id: 'rojo', es: 'rojo', eu: 'gorri', hex: '#E8503A', emoji: '🔴', pattern: 'stripes', symbol: '▲' },
  { id: 'azul', es: 'azul', eu: 'urdin', hex: '#3B82F6', emoji: '🔵', pattern: 'waves', symbol: '●' },
  { id: 'verde', es: 'verde', eu: 'berde', hex: '#34A853', emoji: '🟢', pattern: 'dots', symbol: '■' },
  { id: 'amarillo', es: 'amarillo', eu: 'hori', hex: '#F5C518', emoji: '🟡', pattern: 'grid', symbol: '★' },
  { id: 'blanco', es: 'blanco', eu: 'zuri', hex: '#F5F3EE', emoji: '⚪', pattern: 'ring', symbol: '○' },
  { id: 'negro', es: 'negro', eu: 'beltz', hex: '#2C3A57', emoji: '⚫', pattern: 'solid', symbol: '◆' },
  { id: 'naranja', es: 'naranja', eu: 'laranja', hex: '#F58A32', emoji: '🟠', pattern: 'vstripes', symbol: '▼' },
  { id: 'morado', es: 'morado', eu: 'morea', hex: '#8B5CF6', emoji: '🟣', pattern: 'diamond', symbol: '❖' },
  { id: 'rosa', es: 'rosa', eu: 'arrosa', hex: '#F472B6', emoji: '🌷', pattern: 'check', symbol: '♥' },
];

export const colorById: Record<string, ColorItem> = Object.fromEntries(colors.map((c) => [c.id, c]));

export interface ColorObject {
  emoji: string;
  es: string;
  eu: string;
  colorId: string;
}

/** Objetos de color inequívocos, para preguntas concretas y literales. */
export const colorObjects: ColorObject[] = [
  { emoji: '🍅', es: 'el tomate', eu: 'tomatea', colorId: 'rojo' },
  { emoji: '🍌', es: 'el plátano', eu: 'banana', colorId: 'amarillo' },
  { emoji: '🥬', es: 'la lechuga', eu: 'letxuga', colorId: 'verde' },
  { emoji: '🌊', es: 'el mar', eu: 'itsasoa', colorId: 'azul' },
  { emoji: '❄️', es: 'la nieve', eu: 'elurra', colorId: 'blanco' },
  { emoji: '🌑', es: 'la noche', eu: 'gaua', colorId: 'negro' },
  { emoji: '🍊', es: 'la naranja', eu: 'laranja', colorId: 'naranja' },
  { emoji: '🍇', es: 'las uvas', eu: 'mahatsak', colorId: 'morado' },
  { emoji: '🌷', es: 'la flor rosa', eu: 'lore arrosa', colorId: 'rosa' },
];

export interface NumberItem {
  n: number;
  es: string;
  eu: string;
  emoji: string;
}

export const numbers: NumberItem[] = [
  { n: 1, es: 'uno', eu: 'bat', emoji: '1️⃣' },
  { n: 2, es: 'dos', eu: 'bi', emoji: '2️⃣' },
  { n: 3, es: 'tres', eu: 'hiru', emoji: '3️⃣' },
  { n: 4, es: 'cuatro', eu: 'lau', emoji: '4️⃣' },
  { n: 5, es: 'cinco', eu: 'bost', emoji: '5️⃣' },
];

/** Emojis para contar: todos del mismo tipo en cada pregunta. */
export const countingEmojis = ['🍎', '⭐', '🐟', '🎈', '🌸', '🐦', '🍋'];

export interface Imperative {
  id: string;
  emoji: string;
  es: string;
  eu: string;
}

/**
 * Instrucciones de un solo paso, literales y sin reglas con truco.
 * Se evita deliberadamente el "Simón dice" clásico (que excluye a quien
 * tiene dificultades de comprensión): siempre se hace lo que dice Pato Ventura.
 */
export const imperatives: Imperative[] = [
  { id: 'i1', emoji: '🧍', es: 'Levántate', eu: 'Jaiki' },
  { id: 'i2', emoji: '🪑', es: 'Siéntate', eu: 'Eseri' },
  { id: 'i3', emoji: '👏', es: 'Da una palmada', eu: 'Txalo egin' },
  { id: 'i4', emoji: '🙆', es: 'Toca la cabeza', eu: 'Ukitu burua' },
  { id: 'i5', emoji: '👃', es: 'Toca la nariz', eu: 'Ukitu sudurra' },
  { id: 'i6', emoji: '🤲', es: 'Abre las manos', eu: 'Ireki eskuak' },
  { id: 'i7', emoji: '🦘', es: 'Da un salto', eu: 'Jauzi egin' },
  { id: 'i8', emoji: '🌬️', es: 'Respira hondo', eu: 'Arnasa hartu' },
  { id: 'i9', emoji: '⬆️', es: 'Mira arriba', eu: 'Begiratu gora' },
  { id: 'i10', emoji: '🚪', es: 'Señala la puerta', eu: 'Seinalatu atea' },
  { id: 'i11', emoji: '🔢', es: 'Cuenta hasta tres', eu: 'Zenbatu hirura arte' },
  { id: 'i12', emoji: '😊', es: 'Sonríe', eu: 'Irribarre egin' },
  { id: 'i13', emoji: '🙌', es: 'Estira los brazos', eu: 'Luzatu besoak' },
  { id: 'i14', emoji: '🔄', es: 'Da una vuelta', eu: 'Buelta eman' },
  { id: 'i15', emoji: '🤪', es: 'Haz una mueca', eu: 'Egin imintzio bat' },
  { id: 'i16', emoji: '👋', es: 'Saluda con la mano', eu: 'Agurtu eskuarekin' },
  { id: 'i17', emoji: '✍️', es: 'Dibuja una letra en el aire', eu: 'Marraztu letra bat airean' },
  { id: 'i18', emoji: '🐧', es: 'Camina como un pingüino', eu: 'Ibili pinguino bezala' },
  { id: 'i19', emoji: '🧘', es: 'Estira la espalda', eu: 'Luzatu bizkarra' },
  { id: 'i20', emoji: '👂', es: 'Escucha un sonido', eu: 'Entzun soinu bat' },
  { id: 'i21', emoji: '🤫', es: 'Haz palmas suaves', eu: 'Egin txalo leunak' },
  { id: 'i22', emoji: '🦆', es: 'Mira a Pato Ventura y sonríe', eu: 'Begiratu Pato Venturari eta irribarre egin' },
];

export interface BonusMode {
  id: number;
  emoji: string;
  theme: string;
  questions: number;
  es: { title: string; sub: string };
  eu: { title: string; sub: string };
}

/** Mundos especiales, siempre abiertos y sin bloqueo por estrellas. */
export const bonusModes: BonusMode[] = [
  {
    id: 7,
    emoji: '🔢',
    theme: 'sun',
    questions: 6,
    es: { title: 'Números y colores', sub: 'Contar, reconocer y señalar' },
    eu: { title: 'Zenbakiak eta koloreak', sub: 'Zenbatzen, ezagutzen eta seinalatzen' },
  },
  {
    id: 8,
    emoji: '🕹️',
    theme: 'mint',
    questions: 6,
    es: { title: '¡Pato Ventura dice!', sub: 'Instrucciones, burbujas, palmas y respiración' },
    eu: { title: 'Pato Venturak dio!', sub: 'Jarraibideak, burbuilak, txaloak eta arnasa' },
  },
];

