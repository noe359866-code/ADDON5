import type { Lang, SchoolStage } from './types';

export type Category =
  | 'animales'
  | 'naturaleza'
  | 'comida'
  | 'colores'
  | 'casa'
  | 'numeros'
  | 'acciones'
  | 'cuerpo'
  | 'adj'
  | 'emociones'
  | 'dias'
  | 'meses'
  | 'ropa'
  | 'cole';

export interface Word {
  id: string;
  es: string;
  eu: string;
  en: string;
  emoji: string;
  sylEs: string[];
  sylEu: string[];
  sylEn: string[];
  cat: Category;
  stages?: Exclude<SchoolStage, 'general'>[];
}

/** Banco de palabras: el mismo contenido en castellano, euskera e inglés, con sus sílabas. */
export const words: Word[] = [
  { id: 'sol', es: 'sol', eu: 'eguzki', en: 'sun', emoji: '☀️', sylEs: ['sol'], sylEu: ['e', 'guz', 'ki'], sylEn: ['sun'], cat: 'naturaleza' },
  { id: 'luna', es: 'luna', eu: 'ilargi', en: 'moon', emoji: '🌙', sylEs: ['lu', 'na'], sylEu: ['i', 'lar', 'gi'], sylEn: ['moon'], cat: 'naturaleza' },
  { id: 'agua', es: 'agua', eu: 'ur', en: 'water', emoji: '💧', sylEs: ['a', 'gua'], sylEu: ['ur'], sylEn: ['wa', 'ter'], cat: 'naturaleza' },
  { id: 'flor', es: 'flor', eu: 'lore', en: 'flower', emoji: '🌸', sylEs: ['flor'], sylEu: ['lo', 're'], sylEn: ['flo', 'wer'], cat: 'naturaleza' },
  { id: 'arbol', es: 'árbol', eu: 'zuhaitz', en: 'tree', emoji: '🌳', sylEs: ['ár', 'bol'], sylEu: ['zu', 'haitz'], sylEn: ['tree'], cat: 'naturaleza' },
  { id: 'mar', es: 'mar', eu: 'itsaso', en: 'sea', emoji: '🌊', sylEs: ['mar'], sylEu: ['it', 'sa', 'so'], sylEn: ['sea'], cat: 'naturaleza' },
  { id: 'montana', es: 'montaña', eu: 'mendi', en: 'mountain', emoji: '⛰️', sylEs: ['mon', 'ta', 'ña'], sylEu: ['men', 'di'], sylEn: ['moun', 'tain'], cat: 'naturaleza' },
  { id: 'estrella', es: 'estrella', eu: 'izar', en: 'star', emoji: '⭐', sylEs: ['es', 'tre', 'lla'], sylEu: ['i', 'zar'], sylEn: ['star'], cat: 'naturaleza' },
  { id: 'viento', es: 'viento', eu: 'haize', en: 'wind', emoji: '💨', sylEs: ['vien', 'to'], sylEu: ['hai', 'ze'], sylEn: ['wind'], cat: 'naturaleza' },
  { id: 'piedra', es: 'piedra', eu: 'harri', en: 'stone', emoji: '🪨', sylEs: ['pie', 'dra'], sylEu: ['ha', 'rri'], sylEn: ['stone'], cat: 'naturaleza' },

  { id: 'gato', es: 'gato', eu: 'katu', en: 'cat', emoji: '🐱', sylEs: ['ga', 'to'], sylEu: ['ka', 'tu'], sylEn: ['cat'], cat: 'animales' },
  { id: 'perro', es: 'perro', eu: 'txakur', en: 'dog', emoji: '🐶', sylEs: ['pe', 'rro'], sylEu: ['txa', 'kur'], sylEn: ['dog'], cat: 'animales' },
  { id: 'pajaro', es: 'pájaro', eu: 'txori', en: 'bird', emoji: '🐦', sylEs: ['pá', 'ja', 'ro'], sylEu: ['txo', 'ri'], sylEn: ['bird'], cat: 'animales' },
  { id: 'caballo', es: 'caballo', eu: 'zaldi', en: 'horse', emoji: '🐴', sylEs: ['ca', 'ba', 'llo'], sylEu: ['zal', 'di'], sylEn: ['horse'], cat: 'animales' },
  { id: 'pez', es: 'pez', eu: 'arrain', en: 'fish', emoji: '🐟', sylEs: ['pez'], sylEu: ['a', 'rrain'], sylEn: ['fish'], cat: 'animales' },
  { id: 'mariposa', es: 'mariposa', eu: 'tximeleta', en: 'butterfly', emoji: '🦋', sylEs: ['ma', 'ri', 'po', 'sa'], sylEu: ['txi', 'me', 'le', 'ta'], sylEn: ['but', 'ter', 'fly'], cat: 'animales' },

  { id: 'casa', es: 'casa', eu: 'etxe', en: 'house', emoji: '🏠', sylEs: ['ca', 'sa'], sylEu: ['et', 'xe'], sylEn: ['house'], cat: 'casa' },
  { id: 'libro', es: 'libro', eu: 'liburu', en: 'book', emoji: '📖', sylEs: ['li', 'bro'], sylEu: ['li', 'bu', 'ru'], sylEn: ['book'], cat: 'casa' },
  { id: 'mesa', es: 'mesa', eu: 'mahai', en: 'table', emoji: '🪑', sylEs: ['me', 'sa'], sylEu: ['ma', 'hai'], sylEn: ['ta', 'ble'], cat: 'casa' },
  { id: 'puerta', es: 'puerta', eu: 'ate', en: 'door', emoji: '🚪', sylEs: ['puer', 'ta'], sylEu: ['a', 'te'], sylEn: ['door'], cat: 'casa' },
  { id: 'ventana', es: 'ventana', eu: 'leiho', en: 'window', emoji: '🪟', sylEs: ['ven', 'ta', 'na'], sylEu: ['lei', 'ho'], sylEn: ['win', 'dow'], cat: 'casa' },
  { id: 'escuela', es: 'escuela', eu: 'eskola', en: 'school', emoji: '🏫', sylEs: ['es', 'cue', 'la'], sylEu: ['es', 'ko', 'la'], sylEn: ['school'], cat: 'casa' },
  { id: 'llave', es: 'llave', eu: 'giltza', en: 'key', emoji: '🔑', sylEs: ['lla', 've'], sylEu: ['gil', 'tza'], sylEn: ['key'], cat: 'casa' },
  { id: 'zapato', es: 'zapato', eu: 'zapata', en: 'shoe', emoji: '👟', sylEs: ['za', 'pa', 'to'], sylEu: ['za', 'pa', 'ta'], sylEn: ['shoe'], cat: 'casa' },

  { id: 'manzana', es: 'manzana', eu: 'sagar', en: 'apple', emoji: '🍎', sylEs: ['man', 'za', 'na'], sylEu: ['sa', 'gar'], sylEn: ['ap', 'ple'], cat: 'comida' },
  { id: 'pan', es: 'pan', eu: 'ogi', en: 'bread', emoji: '🍞', sylEs: ['pan'], sylEu: ['o', 'gi'], sylEn: ['bread'], cat: 'comida' },
  { id: 'leche', es: 'leche', eu: 'esne', en: 'milk', emoji: '🥛', sylEs: ['le', 'che'], sylEu: ['es', 'ne'], sylEn: ['milk'], cat: 'comida' },
  { id: 'queso', es: 'queso', eu: 'gazta', en: 'cheese', emoji: '🧀', sylEs: ['que', 'so'], sylEu: ['gaz', 'ta'], sylEn: ['cheese'], cat: 'comida' },
  { id: 'chocolate', es: 'chocolate', eu: 'txokolate', en: 'chocolate', emoji: '🍫', sylEs: ['cho', 'co', 'la', 'te'], sylEu: ['txo', 'ko', 'la', 'te'], sylEn: ['cho', 'co', 'late'], cat: 'comida' },

  { id: 'rojo', es: 'rojo', eu: 'gorri', en: 'red', emoji: '🔴', sylEs: ['ro', 'jo'], sylEu: ['go', 'rri'], sylEn: ['red'], cat: 'colores' },
  { id: 'azul', es: 'azul', eu: 'urdin', en: 'blue', emoji: '🔵', sylEs: ['a', 'zul'], sylEu: ['ur', 'din'], sylEn: ['blue'], cat: 'colores' },
  { id: 'verde', es: 'verde', eu: 'berde', en: 'green', emoji: '🟢', sylEs: ['ver', 'de'], sylEu: ['ber', 'de'], sylEn: ['green'], cat: 'colores' },
  { id: 'amarillo', es: 'amarillo', eu: 'hori', en: 'yellow', emoji: '🟡', sylEs: ['a', 'ma', 'ri', 'llo'], sylEu: ['ho', 'ri'], sylEn: ['yel', 'low'], cat: 'colores' },
  { id: 'blanco', es: 'blanco', eu: 'zuri', en: 'white', emoji: '⚪', sylEs: ['blan', 'co'], sylEu: ['zu', 'ri'], sylEn: ['white'], cat: 'colores' },
  { id: 'negro', es: 'negro', eu: 'beltz', en: 'black', emoji: '⚫', sylEs: ['ne', 'gro'], sylEu: ['beltz'], sylEn: ['black'], cat: 'colores' },
  { id: 'naranja', es: 'naranja', eu: 'laranja', en: 'orange', emoji: '🟠', sylEs: ['na', 'ran', 'ja'], sylEu: ['la', 'ran', 'ja'], sylEn: ['o', 'range'], cat: 'colores' },
  { id: 'morado', es: 'morado', eu: 'morea', en: 'purple', emoji: '🟣', sylEs: ['mo', 'ra', 'do'], sylEu: ['mo', 're', 'a'], sylEn: ['pur', 'ple'], cat: 'colores' },
  { id: 'rosa', es: 'rosa', eu: 'arrosa', en: 'pink', emoji: '🌷', sylEs: ['ro', 'sa'], sylEu: ['a', 'rro', 'sa'], sylEn: ['pink'], cat: 'colores' },

  { id: 'uno', es: 'uno', eu: 'bat', en: 'one', emoji: '1️⃣', sylEs: ['u', 'no'], sylEu: ['bat'], sylEn: ['one'], cat: 'numeros' },
  { id: 'dos', es: 'dos', eu: 'bi', en: 'two', emoji: '2️⃣', sylEs: ['dos'], sylEu: ['bi'], sylEn: ['two'], cat: 'numeros' },
  { id: 'tres', es: 'tres', eu: 'hiru', en: 'three', emoji: '3️⃣', sylEs: ['tres'], sylEu: ['hi', 'ru'], sylEn: ['three'], cat: 'numeros' },
  { id: 'cuatro', es: 'cuatro', eu: 'lau', en: 'four', emoji: '4️⃣', sylEs: ['cua', 'tro'], sylEu: ['lau'], sylEn: ['four'], cat: 'numeros' },
  { id: 'cinco', es: 'cinco', eu: 'bost', en: 'five', emoji: '5️⃣', sylEs: ['cin', 'co'], sylEu: ['bost'], sylEn: ['five'], cat: 'numeros' },

  { id: 'correr', es: 'correr', eu: 'korrika', en: 'running', emoji: '🏃', sylEs: ['co', 'rrer'], sylEu: ['ko', 'rri', 'ka'], sylEn: ['run', 'ning'], cat: 'acciones' },
  { id: 'cantar', es: 'cantar', eu: 'abestu', en: 'singing', emoji: '🎤', sylEs: ['can', 'tar'], sylEu: ['a', 'bes', 'tu'], sylEn: ['sin', 'ging'], cat: 'acciones' },
  { id: 'bailar', es: 'bailar', eu: 'dantzan', en: 'dancing', emoji: '💃', sylEs: ['bai', 'lar'], sylEu: ['dan', 'tzan'], sylEn: ['dan', 'cing'], cat: 'acciones' },
  { id: 'jugar', es: 'jugar', eu: 'jolastu', en: 'playing', emoji: '🎲', sylEs: ['ju', 'gar'], sylEu: ['jo', 'las', 'tu'], sylEn: ['pla', 'ying'], cat: 'acciones' },
  { id: 'leer', es: 'leer', eu: 'irakurri', en: 'reading', emoji: '📚', sylEs: ['le', 'er'], sylEu: ['i', 'ra', 'ku', 'rri'], sylEn: ['rea', 'ding'], cat: 'acciones' },
  { id: 'escribir', es: 'escribir', eu: 'idatzi', en: 'writing', emoji: '✏️', sylEs: ['es', 'cri', 'bir'], sylEu: ['i', 'da', 'tzi'], sylEn: ['wri', 'ting'], cat: 'acciones' },

  { id: 'corazon', es: 'corazón', eu: 'bihotz', en: 'heart', emoji: '❤️', sylEs: ['co', 'ra', 'zón'], sylEu: ['bi', 'hotz'], sylEn: ['heart'], cat: 'cuerpo' },
  { id: 'mano', es: 'mano', eu: 'esku', en: 'hand', emoji: '✋', sylEs: ['ma', 'no'], sylEu: ['es', 'ku'], sylEn: ['hand'], cat: 'cuerpo' },
  { id: 'ojo', es: 'ojo', eu: 'begi', en: 'eye', emoji: '👁️', sylEs: ['o', 'jo'], sylEu: ['be', 'gi'], sylEn: ['eye'], cat: 'cuerpo' },

  { id: 'amigo', es: 'amigo', eu: 'lagun', en: 'friend', emoji: '🧑‍🤝‍🧑', sylEs: ['a', 'mi', 'go'], sylEu: ['la', 'gun'], sylEn: ['friend'], cat: 'adj' },
  { id: 'nino', es: 'niño', eu: 'haur', en: 'child', emoji: '🧒', sylEs: ['ni', 'ño'], sylEu: ['haur'], sylEn: ['child'], cat: 'adj' },
  { id: 'grande', es: 'grande', eu: 'handi', en: 'big', emoji: '🐘', sylEs: ['gran', 'de'], sylEu: ['han', 'di'], sylEn: ['big'], cat: 'adj' },
  { id: 'pequeno', es: 'pequeño', eu: 'txiki', en: 'little', emoji: '🐭', sylEs: ['pe', 'que', 'ño'], sylEu: ['txi', 'ki'], sylEn: ['lit', 'tle'], cat: 'adj' },
  { id: 'bonito', es: 'bonito', eu: 'polit', en: 'happy', emoji: '✨', sylEs: ['bo', 'ni', 'to'], sylEu: ['po', 'lit'], sylEn: ['hap', 'py'], cat: 'adj' },

  /* Etapa 1 · Sílabas directas puras (CV: consonante + vocal) */
  { id: 'pato', es: 'pato', eu: 'ahate', en: 'duck', emoji: '🦆', sylEs: ['pa', 'to'], sylEu: ['a', 'ha', 'te'], sylEn: ['duck'], cat: 'animales' },
  { id: 'vaca', es: 'vaca', eu: 'behi', en: 'cow', emoji: '🐮', sylEs: ['va', 'ca'], sylEu: ['be', 'hi'], sylEn: ['cow'], cat: 'animales' },
  { id: 'mono', es: 'mono', eu: 'tximino', en: 'monkey', emoji: '🐒', sylEs: ['mo', 'no'], sylEu: ['txi', 'mi', 'no'], sylEn: ['mon', 'key'], cat: 'animales' },
  { id: 'sopa', es: 'sopa', eu: 'zopa', en: 'soup', emoji: '🥣', sylEs: ['so', 'pa'], sylEu: ['zo', 'pa'], sylEn: ['soup'], cat: 'comida' },
  { id: 'tomate', es: 'tomate', eu: 'tomate', en: 'tomato', emoji: '🍅', sylEs: ['to', 'ma', 'te'], sylEu: ['to', 'ma', 'te'], sylEn: ['to', 'ma', 'to'], cat: 'comida' },
  { id: 'seta', es: 'seta', eu: 'perretxiko', en: 'potato', emoji: '🍄', sylEs: ['se', 'ta'], sylEu: ['pe', 'rre', 'txi', 'ko'], sylEn: ['po', 'ta', 'to'], cat: 'naturaleza' },
  { id: 'pelota', es: 'pelota', eu: 'pilota', en: 'banana', emoji: '⚽', sylEs: ['pe', 'lo', 'ta'], sylEu: ['pi', 'lo', 'ta'], sylEn: ['ba', 'na', 'na'], cat: 'casa' },
  { id: 'cama', es: 'cama', eu: 'ohe', en: 'sofa', emoji: '🛏️', sylEs: ['ca', 'ma'], sylEu: ['o', 'he'], sylEn: ['so', 'fa'], cat: 'casa' },

  /* Etapa 2 · Sílabas inversas (VC: vocal + consonante) */
  { id: 'isla', es: 'isla', eu: 'irla', en: 'island', emoji: '🏝️', sylEs: ['is', 'la'], sylEu: ['ir', 'la'], sylEn: ['is', 'land'], cat: 'naturaleza' },
  { id: 'espejo', es: 'espejo', eu: 'ispilu', en: 'mirror', emoji: '🪞', sylEs: ['es', 'pe', 'jo'], sylEu: ['is', 'pi', 'lu'], sylEn: ['mir', 'ror'], cat: 'casa' },
  { id: 'arco', es: 'arco', eu: 'arku', en: 'arrow', emoji: '🏹', sylEs: ['ar', 'co'], sylEu: ['ar', 'ku'], sylEn: ['ar', 'row'], cat: 'casa' },
  { id: 'espada', es: 'espada', eu: 'ezpata', en: 'sword', emoji: '⚔️', sylEs: ['es', 'pa', 'da'], sylEu: ['ez', 'pa', 'ta'], sylEn: ['sword'], cat: 'casa' },
  { id: 'antena', es: 'antena', eu: 'antena', en: 'antenna', emoji: '📡', sylEs: ['an', 'te', 'na'], sylEu: ['an', 'te', 'na'], sylEn: ['an', 'ten', 'na'], cat: 'casa' },
  { id: 'ardilla', es: 'ardilla', eu: 'urtxintxa', en: 'squirrel', emoji: '🐿️', sylEs: ['ar', 'di', 'lla'], sylEu: ['ur', 'txin', 'txa'], sylEn: ['squir', 'rel'], cat: 'animales' },
  { id: 'insecto', es: 'insecto', eu: 'intsektu', en: 'insect', emoji: '🐞', sylEs: ['in', 'sec', 'to'], sylEu: ['in', 'tsek', 'tu'], sylEn: ['in', 'sect'], cat: 'animales' },
  { id: 'ambulancia', es: 'ambulancia', eu: 'anbulantzia', en: 'ambulance', emoji: '🚑', sylEs: ['am', 'bu', 'lan', 'cia'], sylEu: ['an', 'bu', 'lan', 'tzi', 'a'], sylEn: ['am', 'bu', 'lance'], cat: 'casa' },

  /* Etapa 3 · Sílabas trabadas / sinfones (CCV: bl, cl, fl, gl, pl, br, cr, dr, fr, gr, pr, tr) */
  { id: 'tren', es: 'tren', eu: 'trena', en: 'train', emoji: '🚂', sylEs: ['tren'], sylEu: ['tre', 'na'], sylEn: ['train'], cat: 'casa' },
  { id: 'plato', es: 'plato', eu: 'plater', en: 'plate', emoji: '🍽️', sylEs: ['pla', 'to'], sylEu: ['pla', 'ter'], sylEn: ['plate'], cat: 'comida' },
  { id: 'globo', es: 'globo', eu: 'globo', en: 'balloon', emoji: '🎈', sylEs: ['glo', 'bo'], sylEu: ['glo', 'bo'], sylEn: ['bal', 'loon'], cat: 'casa' },
  { id: 'fruta', es: 'fruta', eu: 'fruta', en: 'fruit', emoji: '🍓', sylEs: ['fru', 'ta'], sylEu: ['fru', 'ta'], sylEn: ['fruit'], cat: 'comida' },
  { id: 'flan', es: 'flan', eu: 'flana', en: 'pudding', emoji: '🍮', sylEs: ['flan'], sylEu: ['fla', 'na'], sylEn: ['pud', 'ding'], cat: 'comida' },
  { id: 'tigre', es: 'tigre', eu: 'tigre', en: 'tiger', emoji: '🐯', sylEs: ['ti', 'gre'], sylEu: ['ti', 'gre'], sylEn: ['ti', 'ger'], cat: 'animales' },
  { id: 'dragon', es: 'dragón', eu: 'dragoi', en: 'dragon', emoji: '🐉', sylEs: ['dra', 'gón'], sylEu: ['dra', 'goi'], sylEn: ['dra', 'gon'], cat: 'animales' },
  { id: 'cebra', es: 'cebra', eu: 'zebra', en: 'zebra', emoji: '🦓', sylEs: ['ce', 'bra'], sylEu: ['ze', 'bra'], sylEn: ['ze', 'bra'], cat: 'animales' },
  { id: 'cocodrilo', es: 'cocodrilo', eu: 'krokodilo', en: 'crocodile', emoji: '🐊', sylEs: ['co', 'co', 'dri', 'lo'], sylEu: ['kro', 'ko', 'di', 'lo'], sylEn: ['cro', 'co', 'dile'], cat: 'animales' },
  { id: 'princesa', es: 'princesa', eu: 'printzesa', en: 'princess', emoji: '👑', sylEs: ['prin', 'ce', 'sa'], sylEu: ['prin', 'tze', 'sa'], sylEn: ['prin', 'cess'], cat: 'adj' },
  { id: 'trompeta', es: 'trompeta', eu: 'tronpeta', en: 'trumpet', emoji: '🎺', sylEs: ['trom', 'pe', 'ta'], sylEu: ['tron', 'pe', 'ta'], sylEn: ['trum', 'pet'], cat: 'casa' },
  { id: 'tractor', es: 'tractor', eu: 'traktore', en: 'tractor', emoji: '🚜', sylEs: ['trac', 'tor'], sylEu: ['trak', 'to', 're'], sylEn: ['trac', 'tor'], cat: 'casa' },
  { id: 'bicicleta', es: 'bicicleta', eu: 'bizikleta', en: 'bicycle', emoji: '🚲', sylEs: ['bi', 'ci', 'cle', 'ta'], sylEu: ['bi', 'zi', 'kle', 'ta'], sylEn: ['bi', 'cy', 'cle'], cat: 'casa' },
  { id: 'blusa', es: 'blusa', eu: 'blusa', en: 'blouse', emoji: '👚', sylEs: ['blu', 'sa'], sylEu: ['blu', 'sa'], sylEn: ['blouse'], cat: 'ropa' },

  /* Tema nuevo · Emociones funcionales del día a día */
  { id: 'feliz', es: 'feliz', eu: 'pozik', en: 'glad', emoji: '😄', sylEs: ['fe', 'liz'], sylEu: ['po', 'zik'], sylEn: ['glad'], cat: 'emociones', stages: ['infantil', 'prim12'] },
  { id: 'triste', es: 'triste', eu: 'triste', en: 'sad', emoji: '😢', sylEs: ['tris', 'te'], sylEu: ['tris', 'te'], sylEn: ['sad'], cat: 'emociones', stages: ['infantil', 'prim12'] },
  { id: 'enfadado', es: 'enfadado', eu: 'haserre', en: 'angry', emoji: '😠', sylEs: ['en', 'fa', 'da', 'do'], sylEu: ['ha', 'se', 'rre'], sylEn: ['an', 'gry'], cat: 'emociones', stages: ['infantil', 'prim12', 'prim34'] },
  { id: 'cansado', es: 'cansado', eu: 'nekatuta', en: 'tired', emoji: '🥱', sylEs: ['can', 'sa', 'do'], sylEu: ['ne', 'ka', 'tu', 'ta'], sylEn: ['ti', 'red'], cat: 'emociones', stages: ['infantil', 'prim12', 'prim34'] },
  { id: 'tranquilo', es: 'tranquilo', eu: 'lasai', en: 'calm', emoji: '😌', sylEs: ['tran', 'qui', 'lo'], sylEu: ['la', 'sai'], sylEn: ['calm'], cat: 'emociones', stages: ['prim12', 'prim34', 'prim56'] },
  { id: 'asustado', es: 'asustado', eu: 'beldurtuta', en: 'scared', emoji: '😨', sylEs: ['a', 'sus', 'ta', 'do'], sylEu: ['bel', 'dur', 'tu', 'ta'], sylEn: ['sca', 'red'], cat: 'emociones', stages: ['prim12', 'prim34', 'prim56'] },
  { id: 'sorprendido', es: 'sorpresa', eu: 'harrituta', en: 'surprised', emoji: '😮', sylEs: ['sor', 'pre', 'sa'], sylEu: ['ha', 'rri', 'tu', 'ta'], sylEn: ['sur', 'prised'], cat: 'emociones', stages: ['prim34', 'prim56'] },

  /* Tema nuevo · Ropa cotidiana */
  { id: 'abrigo', es: 'abrigo', eu: 'beroki', en: 'coat', emoji: '🧥', sylEs: ['a', 'bri', 'go'], sylEu: ['be', 'ro', 'ki'], sylEn: ['coat'], cat: 'ropa', stages: ['infantil', 'prim12'] },
  { id: 'pantalon', es: 'pantalón', eu: 'prakak', en: 'trousers', emoji: '👖', sylEs: ['pan', 'ta', 'lón'], sylEu: ['pra', 'kak'], sylEn: ['trou', 'sers'], cat: 'ropa', stages: ['infantil', 'prim12', 'prim34'] },
  { id: 'camiseta', es: 'camiseta', eu: 'kamiseta', en: 'shirt', emoji: '👕', sylEs: ['ca', 'mi', 'se', 'ta'], sylEu: ['ka', 'mi', 'se', 'ta'], sylEn: ['shirt'], cat: 'ropa', stages: ['infantil', 'prim12'] },
  { id: 'gorra', es: 'gorra', eu: 'txano', en: 'cap', emoji: '🧢', sylEs: ['go', 'rra'], sylEu: ['txa', 'no'], sylEn: ['cap'], cat: 'ropa', stages: ['infantil', 'prim12'] },
  { id: 'bufanda', es: 'bufanda', eu: 'bufanda', en: 'scarf', emoji: '🧣', sylEs: ['bu', 'fan', 'da'], sylEu: ['bu', 'fan', 'da'], sylEn: ['scarf'], cat: 'ropa', stages: ['prim12', 'prim34'] },
  { id: 'calcetin', es: 'calcetín', eu: 'galtzerdi', en: 'socks', emoji: '🧦', sylEs: ['cal', 'ce', 'tín'], sylEu: ['gal', 'tzer', 'di'], sylEn: ['socks'], cat: 'ropa', stages: ['infantil', 'prim12', 'prim34'] },
  { id: 'vestido', es: 'vestido', eu: 'soineko', en: 'dress', emoji: '👗', sylEs: ['ves', 'ti', 'do'], sylEu: ['soi', 'ne', 'ko'], sylEn: ['dress'], cat: 'ropa', stages: ['prim12', 'prim34'] },
  { id: 'botas', es: 'botas', eu: 'botak', en: 'boots', emoji: '🥾', sylEs: ['bo', 'tas'], sylEu: ['bo', 'tak'], sylEn: ['boots'], cat: 'ropa', stages: ['infantil', 'prim12'] },

  /* Tema nuevo · El cole (material y rutinas escolares) */
  { id: 'mochila', es: 'mochila', eu: 'motxila', en: 'backpack', emoji: '🎒', sylEs: ['mo', 'chi', 'la'], sylEu: ['mo', 'txi', 'la'], sylEn: ['back', 'pack'], cat: 'cole', stages: ['infantil', 'prim12'] },
  { id: 'tijeras', es: 'tijeras', eu: 'guraizeak', en: 'scissors', emoji: '✂️', sylEs: ['ti', 'je', 'ras'], sylEu: ['gu', 'rai', 'ze', 'ak'], sylEn: ['scis', 'sors'], cat: 'cole', stages: ['infantil', 'prim12', 'prim34'] },
  { id: 'regla', es: 'regla', eu: 'erregela', en: 'ruler', emoji: '📏', sylEs: ['re', 'gla'], sylEu: ['e', 'rre', 'ge', 'la'], sylEn: ['ru', 'ler'], cat: 'cole', stages: ['prim12', 'prim34', 'prim56'] },
  { id: 'cuaderno', es: 'cuaderno', eu: 'koaderno', en: 'notebook', emoji: '📓', sylEs: ['cua', 'der', 'no'], sylEu: ['ko', 'a', 'der', 'no'], sylEn: ['note', 'book'], cat: 'cole', stages: ['prim12', 'prim34', 'prim56'] },
  { id: 'pinturas', es: 'pinturas', eu: 'margoak', en: 'crayons', emoji: '🖍️', sylEs: ['pin', 'tu', 'ras'], sylEu: ['mar', 'go', 'ak'], sylEn: ['cra', 'yons'], cat: 'cole', stages: ['infantil', 'prim12'] },
  { id: 'pegamento', es: 'pegamento', eu: 'kola', en: 'glue', emoji: '📎', sylEs: ['pe', 'ga', 'men', 'to'], sylEu: ['ko', 'la'], sylEn: ['glue'], cat: 'cole', stages: ['infantil', 'prim12', 'prim34'] },
  { id: 'clase', es: 'pizarra', eu: 'arbela', en: 'board', emoji: '🧑‍🏫', sylEs: ['pi', 'za', 'rra'], sylEu: ['ar', 'be', 'la'], sylEn: ['board'], cat: 'cole', stages: ['prim12', 'prim34', 'prim56'] },

  /* Tema nuevo · Días de la semana */
  { id: 'lunes', es: 'lunes', eu: 'astelehena', en: 'monday', emoji: '📅', sylEs: ['lu', 'nes'], sylEu: ['as', 'te', 'le', 'he', 'na'], sylEn: ['mon', 'day'], cat: 'dias', stages: ['prim12', 'prim34', 'prim56'] },
  { id: 'martes', es: 'martes', eu: 'asteartea', en: 'tuesday', emoji: '🗓️', sylEs: ['mar', 'tes'], sylEu: ['as', 'te', 'ar', 'te', 'a'], sylEn: ['tues', 'day'], cat: 'dias', stages: ['prim12', 'prim34', 'prim56'] },
  { id: 'miercoles', es: 'miércoles', eu: 'asteazkena', en: 'wednesday', emoji: '🌤️', sylEs: ['miér', 'co', 'les'], sylEu: ['as', 'te', 'az', 'ke', 'na'], sylEn: ['wed', 'nes', 'day'], cat: 'dias', stages: ['prim12', 'prim34', 'prim56'] },
  { id: 'jueves', es: 'jueves', eu: 'osteguna', en: 'thursday', emoji: '⛅', sylEs: ['jue', 'ves'], sylEu: ['os', 'te', 'gu', 'na'], sylEn: ['thurs', 'day'], cat: 'dias', stages: ['prim12', 'prim34', 'prim56'] },
  { id: 'viernes', es: 'viernes', eu: 'ostirala', en: 'friday', emoji: '🎉', sylEs: ['vier', 'nes'], sylEu: ['os', 'ti', 'ra', 'la'], sylEn: ['fri', 'day'], cat: 'dias', stages: ['prim12', 'prim34', 'prim56'] },
  { id: 'sabado', es: 'sábado', eu: 'larunbata', en: 'saturday', emoji: '🏞️', sylEs: ['sá', 'ba', 'do'], sylEu: ['la', 'run', 'ba', 'ta'], sylEn: ['sa', 'tur', 'day'], cat: 'dias', stages: ['prim12', 'prim34', 'prim56'] },
  { id: 'domingo', es: 'domingo', eu: 'igandea', en: 'sunday', emoji: '🪁', sylEs: ['do', 'min', 'go'], sylEu: ['i', 'gan', 'de', 'a'], sylEn: ['sun', 'day'], cat: 'dias', stages: ['prim12', 'prim34', 'prim56'] },

  /* Tema nuevo · Meses y estaciones del año + alce (elk) en naturaleza/animales */
  { id: 'alce', es: 'alce', eu: 'altze', en: 'elk', emoji: '🫎', sylEs: ['al', 'ce'], sylEu: ['al', 'tze'], sylEn: ['elk'], cat: 'animales', stages: ['prim12', 'prim34', 'prim56'] },
  { id: 'enero', es: 'enero', eu: 'urtarrila', en: 'january', emoji: '⛄', sylEs: ['e', 'ne', 'ro'], sylEu: ['ur', 'ta', 'rri', 'la'], sylEn: ['ja', 'nu', 'a', 'ry'], cat: 'meses', stages: ['prim34', 'prim56'] },
  { id: 'marzo', es: 'marzo', eu: 'martxoa', en: 'march', emoji: '🌱', sylEs: ['mar', 'zo'], sylEu: ['mar', 'txo', 'a'], sylEn: ['march'], cat: 'meses', stages: ['prim34', 'prim56'] },
  { id: 'mayo', es: 'mayo', eu: 'maiatza', en: 'may', emoji: '🌼', sylEs: ['ma', 'yo'], sylEu: ['ma', 'ia', 'tza'], sylEn: ['may'], cat: 'meses', stages: ['prim34', 'prim56'] },
  { id: 'julio', es: 'julio', eu: 'uztaila', en: 'july', emoji: '🏖️', sylEs: ['ju', 'lio'], sylEu: ['uz', 'tai', 'la'], sylEn: ['ju', 'ly'], cat: 'meses', stages: ['prim34', 'prim56'] },
  { id: 'septiembre', es: 'septiembre', eu: 'iraila', en: 'september', emoji: '🍂', sylEs: ['sep', 'tiem', 'bre'], sylEu: ['i', 'rai', 'la'], sylEn: ['sep', 'tem', 'ber'], cat: 'meses', stages: ['prim34', 'prim56'] },
  { id: 'diciembre', es: 'diciembre', eu: 'abendua', en: 'december', emoji: '🎄', sylEs: ['di', 'ciem', 'bre'], sylEu: ['a', 'ben', 'du', 'a'], sylEn: ['de', 'cem', 'ber'], cat: 'meses', stages: ['prim34', 'prim56'] },
];

export const wordById: Record<string, Word> = Object.fromEntries(words.map((w) => [w.id, w]));

export function wordText(w: Word, lang: Lang): string {
  if (lang === 'en') return w.en;
  return lang === 'es' ? w.es : w.eu;
}

export function wordSyllables(w: Word, lang: Lang): string[] {
  if (lang === 'en') return w.sylEn.slice();
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
 * - directa (CV / V abierta: termina en vocal/y abierta y sin grupo consonántico trabado)
 * - mixta (CVC sin sinfón inicial: sol, mar, pan, cat, dog...)
 */
export function classifySyllable(syl: string): SyllableType {
  const s = plainSyllable(syl);
  if (/^(bl|cl|fl|gl|kl|pl|tl|br|cr|dr|fr|gr|kr|pr|tr)[aeiouy]/.test(s)) return 'trabada';
  if (/^[aeiou]+[bcdfghjklmnñpqrstvwxyz]/.test(s)) return 'inversa';
  if (/[aeiouy]$/.test(s)) return 'directa';
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
  en: {
    1: ['ba', 'na', 'ma', 'to', 'po', 'ta', 'so', 'fa', 'ti', 'ze', 'bi', 'cy', 'wa', 'cho', 'co'],
    2: ['an', 'in', 'is', 'am', 'ap', 'ar', 'el', 'on', 'un', 'up', 'it', 'at', 'en', 'or'],
    3: ['bla', 'blu', 'cla', 'cle', 'fla', 'flo', 'gla', 'pla', 'bra', 'bre', 'cro', 'dra', 'fru', 'gre', 'pri', 'tra', 'tre', 'tru'],
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
  en: [
    ['an', 'na'],
    ['in', 'ni'],
    ['on', 'no'],
    ['is', 'si'],
    ['it', 'ti'],
    ['at', 'ta'],
    ['ar', 'ra'],
    ['am', 'ma'],
    ['up', 'pu'],
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
  en: ['sh', 'ch', 'th', 'wh', 'qu', 'oo', 'ee'],
};

export const specialSounds: Record<Lang, string[]> = {
  es: ['ch', 'rr', 'ñ', 'll', 'qu', 'z'],
  eu: ['tx', 'tz', 'rr', 'ai', 'h', 'k'],
  en: ['sh', 'ch', 'th', 'oo', 'ee', 'qu'],
};

export interface Rhyme {
  a: string;
  b: string;
  distractors: string[];
}

/** Rimas en castellano, euskera e inglés. */
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
  en: [
    { a: 'cat', b: 'hat', distractors: ['dog', 'sun'] },
    { a: 'dog', b: 'frog', distractors: ['moon', 'tree'] },
    { a: 'star', b: 'car', distractors: ['book', 'milk'] },
    { a: 'tree', b: 'bee', distractors: ['fish', 'hand'] },
    { a: 'moon', b: 'spoon', distractors: ['bird', 'door'] },
    { a: 'house', b: 'mouse', distractors: ['bread', 'key'] },
    { a: 'book', b: 'look', distractors: ['water', 'apple'] },
    { a: 'train', b: 'rain', distractors: ['shoe', 'cow'] },
    { a: 'fish', b: 'dish', distractors: ['stone', 'wind'] },
    { a: 'blue', b: 'shoe', distractors: ['red', 'table'] },
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
  en: [
    ['cat', 'hat', 'cap'],
    ['dog', 'frog', 'log'],
    ['ship', 'sheep', 'shop'],
    ['tree', 'three', 'free'],
    ['book', 'look', 'cook'],
    ['star', 'car', 'far'],
    ['train', 'rain', 'brain'],
    ['plate', 'plane', 'play'],
  ],
};

export interface Sentence {
  id: string;
  emoji: string;
  es: string[];
  eu: string[];
  en: string[];
  stage?: Exclude<SchoolStage, 'general'>;
}

export const sentences: Sentence[] = [
  /* Frases funcionales cotidianas · Infantil (rutinas básicas, deseos y emociones) */
  { id: 's1', emoji: '💧✋', es: ['Quiero', 'beber', 'agua'], eu: ['Ura', 'edan', 'nahi', 'dut'], en: ['I', 'want', 'water'], stage: 'infantil' },
  { id: 's2', emoji: '😄☀️', es: ['Hoy', 'estoy', 'muy', 'feliz'], eu: ['Gaur', 'oso', 'pozik', 'nago'], en: ['Today', 'I', 'am', 'happy'], stage: 'infantil' },
  { id: 's3', emoji: '🧥👟', es: ['Me', 'pongo', 'el', 'abrigo'], eu: ['Berokia', 'janzten', 'dut'], en: ['I', 'put', 'on', 'my', 'coat'], stage: 'infantil' },
  { id: 's4', emoji: '✋🧼', es: ['Me', 'lavo', 'las', 'manos'], eu: ['Eskuak', 'garbitzen', 'ditut'], en: ['I', 'wash', 'my', 'hands'], stage: 'infantil' },
  { id: 's5', emoji: '🎒🏫', es: ['Llevo', 'mi', 'mochila', 'al', 'cole'], eu: ['Motxila', 'eskolara', 'darama'], en: ['I', 'take', 'my', 'backpack'], stage: 'infantil' },

  /* Frases funcionales · 1.º y 2.º de Primaria (colegio, emociones, familia y hábitos) */
  { id: 's6', emoji: '🐱🥛', es: ['El', 'gato', 'bebe', 'leche'], eu: ['Katuak', 'esnea', 'edaten', 'du'], en: ['The', 'cat', 'drinks', 'milk'], stage: 'prim12' },
  { id: 's7', emoji: '📖🏫', es: ['En', 'clase', 'leemos', 'un', 'libro'], eu: ['Gelan', 'liburu', 'bat', 'irakurtzen', 'dugu'], en: ['In', 'class', 'we', 'read', 'books'], stage: 'prim12' },
  { id: 's8', emoji: '📅🎨', es: ['El', 'lunes', 'pintamos', 'con', 'pinturas'], eu: ['Astelehenean', 'margoekin', 'margotzen', 'dugu'], en: ['On', 'Monday', 'we', 'use', 'crayons'], stage: 'prim12' },
  { id: 's9', emoji: '🧣❄️', es: ['Hace', 'frío', 'y', 'llevo', 'bufanda'], eu: ['Hotz', 'dago', 'eta', 'bufanda', 'daramat'], en: ['It', 'is', 'cold', 'with', 'my', 'scarf'], stage: 'prim12' },
  { id: 's10', emoji: '🥱🛏️', es: ['Estoy', 'cansado', 'y', 'quiero', 'dormir'], eu: ['Nekatuta', 'nago', 'eta', 'lo', 'nahi', 'dut'], en: ['I', 'am', 'tired', 'and', 'sleepy'], stage: 'prim12' },

  /* Frases funcionales · 3.º y 4.º de Primaria (organización semanal, ayuda y autonomía) */
  { id: 's11', emoji: '📓✏️', es: ['Guardo', 'el', 'cuaderno', 'en', 'la', 'mochila'], eu: ['Koadernoa', 'motxilan', 'gordetzen', 'dut'], en: ['I', 'keep', 'my', 'notebook', 'in', 'my', 'bag'], stage: 'prim34' },
  { id: 's12', emoji: '🎉⚽', es: ['El', 'viernes', 'jugamos', 'en', 'el', 'patio'], eu: ['Ostiralean', 'jolastokian', 'jolasten', 'dugu'], en: ['On', 'Friday', 'we', 'play', 'outside'], stage: 'prim34' },
  { id: 's13', emoji: '🍂🎒', es: ['En', 'septiembre', 'volvemos', 'a', 'la', 'escuela'], eu: ['Irailean', 'eskolara', 'itzultzen', 'gara'], en: ['In', 'September', 'we', 'return', 'to', 'school'], stage: 'prim34' },
  { id: 's14', emoji: '😌🌬️', es: ['Respiro', 'despacio', 'para', 'estar', 'tranquilo'], eu: ['Poliki', 'arnasten', 'dut', 'lasai', 'egoteko'], en: ['I', 'breathe', 'slowly', 'to', 'feel', 'calm'], stage: 'prim34' },

  /* Frases funcionales · 5.º y 6.º de Primaria (planificación, calendario y convivencia) */
  { id: 's15', emoji: '📏🧑‍🏫', es: ['¿Me', 'prestas', 'la', 'regla', 'por', 'favor?'], eu: ['Utziko', 'al', 'didazu', 'erregela', 'mesedez?'], en: ['Can', 'I', 'borrow', 'your', 'ruler', 'please?'], stage: 'prim56' },
  { id: 's16', emoji: '🏖️☀️', es: ['En', 'julio', 'nadamos', 'en', 'el', 'mar'], eu: ['Uztailean', 'itsasoan', 'igeri', 'egiten', 'dugu'], en: ['In', 'July', 'we', 'swim', 'in', 'the', 'sea'], stage: 'prim56' },
  { id: 's17', emoji: '🎄🧥', es: ['En', 'diciembre', 'usamos', 'abrigo', 'y', 'botas'], eu: ['Abenduan', 'berokia', 'eta', 'botak', 'darabiltzagu'], en: ['In', 'December', 'we', 'wear', 'warm', 'coats'], stage: 'prim56' },
  { id: 's18', emoji: '🧑‍🤝‍🧑💬', es: ['Comparto', 'el', 'material', 'con', 'mis', 'amigos'], eu: ['Materiala', 'lagunekin', 'partekatzen', 'dut'], en: ['I', 'share', 'school', 'supplies', 'with', 'friends'], stage: 'prim56' },
];

export interface Blank {
  id: string;
  emoji: string;
  es: { before: string; after: string };
  eu: { before: string; after: string };
  en: { before: string; after: string };
  answer: string;
  distractors: string[];
  stage?: Exclude<SchoolStage, 'general'>;
}

export const blanks: Blank[] = [
  { id: 'b1', emoji: '🍎', es: { before: 'Merendamos una', after: 'roja' }, eu: { before: '', after: 'gorria jaten dugu' }, en: { before: 'We eat a red', after: '' }, answer: 'manzana', distractors: ['luna', 'mar'], stage: 'infantil' },
  { id: 'b2', emoji: '💧', es: { before: 'Tengo sed y bebo', after: '' }, eu: { before: 'Egarri naiz eta', after: 'edaten dut' }, en: { before: 'I am thirsty and drink', after: '' }, answer: 'agua', distractors: ['queso', 'libro'], stage: 'infantil' },
  { id: 'b3', emoji: '🧥', es: { before: 'Hace frío, me pongo el', after: '' }, eu: { before: 'Hotz dago,', after: 'janzten dut' }, en: { before: 'It is cold, I wear my', after: '' }, answer: 'abrigo', distractors: ['plato', 'sol'], stage: 'infantil' },
  { id: 'b4', emoji: '😄', es: { before: 'Hoy me siento muy', after: '' }, eu: { before: 'Gaur oso', after: 'sentitzen naiz' }, en: { before: 'Today I feel very', after: '' }, answer: 'feliz', distractors: ['mesa', 'piedra'], stage: 'infantil' },
  { id: 'b5', emoji: '🎒', es: { before: 'Guardo el libro en la', after: '' }, eu: { before: 'Liburua', after: 'barruan gordetzen dut' }, en: { before: 'I put my book in the', after: '' }, answer: 'mochila', distractors: ['flor', 'vaca'], stage: 'prim12' },
  { id: 'b6', emoji: '📅', es: { before: 'El primer día de cole es el', after: '' }, eu: { before: 'Asteko lehen eguna', after: 'da' }, en: { before: 'The first school day is', after: '' }, answer: 'lunes', distractors: ['queso', 'gato'], stage: 'prim12' },
  { id: 'b7', emoji: '📓', es: { before: 'Escribo la tarea en mi', after: '' }, eu: { before: 'Etxeko lanak nire', after: 'batean idazten ditut' }, en: { before: 'I write homework in my', after: '' }, answer: 'cuaderno', distractors: ['zapato', 'perro'], stage: 'prim34' },
  { id: 'b8', emoji: '🍂', es: { before: 'Las clases empiezan en', after: '' }, eu: { before: 'Eskolak', after: 'hilabetean hasten dira' }, en: { before: 'School classes start in', after: '' }, answer: 'septiembre', distractors: ['sopa', 'mano'], stage: 'prim34' },
  { id: 'b9', emoji: '📏', es: { before: 'Mido la línea con la', after: '' }, eu: { before: 'Marra', after: 'batekin neurtzen dut' }, en: { before: 'I measure the line with a', after: '' }, answer: 'regla', distractors: ['estrella', 'pan'], stage: 'prim56' },
  { id: 'b10', emoji: '😌', es: { before: 'Respiro hondo y estoy', after: '' }, eu: { before: 'Arnasa hartu eta', after: 'nago' }, en: { before: 'I breathe deeply and feel', after: '' }, answer: 'tranquilo', distractors: ['globo', 'tren'], stage: 'prim56' },
];

export interface LocalizedText {
  es: string;
  eu: string;
  en: string;
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
    title: { es: 'La mañana de Txori', eu: 'Txoriren goiza', en: 'Sunny Morning Bird' },
    text: {
      es: 'El sol brilla. El pájaro canta en el árbol. Todo está alegre.',
      eu: 'Eguzkiak distira egiten du. Txoriak zuhaitzean abesten du. Dena alai dago.',
      en: 'The sun shines. The bird sings in the tree. Everything is happy.',
    },
    shortText: {
      es: 'El pájaro canta en el árbol.',
      eu: 'Txoriak zuhaitzean abesten du.',
      en: 'The bird sings in the tree.',
    },
    question: { es: '¿Quién canta?', eu: 'Nork abesten du?', en: 'Who sings?' },
    options: [
      { es: 'El pájaro', eu: 'Txoriak', en: 'The bird' },
      { es: 'El gato', eu: 'Katuak', en: 'The cat' },
      { es: 'La luna', eu: 'Ilargiak', en: 'The moon' },
    ],
    correct: 0,
    theme: { es: 'Un pájaro', eu: 'Txori bat', en: 'A bird' },
  },
  {
    id: 'st2',
    emoji: '🦋🌸',
    title: { es: 'Vuelo de colores', eu: 'Kolorezko hegaldia', en: 'Colorful Flight' },
    text: {
      es: 'La mariposa vuela sobre la flor roja. Después descansa en una hoja verde.',
      eu: 'Tximeleta lore gorriaren gainean hegan dabil. Gero hosto berde batean atseden hartzen du.',
      en: 'The butterfly flies over the red flower. Then it rests on a green leaf.',
    },
    shortText: {
      es: 'La mariposa vuela sobre la flor roja.',
      eu: 'Tximeleta lore gorriaren gainean hegan dabil.',
      en: 'The butterfly flies over the red flower.',
    },
    question: { es: '¿Sobre qué vuela la mariposa?', eu: 'Zeren gainean egiten du hegan tximeletak?', en: 'What does the butterfly fly over?' },
    options: [
      { es: 'Sobre la flor', eu: 'Lorearen gainean', en: 'Over the flower' },
      { es: 'Sobre el mar', eu: 'Itsasoaren gainean', en: 'Over the sea' },
      { es: 'Sobre la luna', eu: 'Ilargiaren gainean', en: 'Over the moon' },
    ],
    correct: 0,
    theme: { es: 'Una mariposa', eu: 'Tximeleta bat', en: 'A butterfly' },
  },
  {
    id: 'st3',
    emoji: '🍞🧀🍎',
    title: { es: 'La mesa misteriosa', eu: 'Mahai misteriotsua', en: 'The Mystery Table' },
    text: {
      es: 'En la mesa hay pan, queso y una manzana. Falta la leche: ¡la busca el gato!',
      eu: 'Mahaian ogia, gazta eta sagarra daude. Esnea falta da: katuak bilatzen du!',
      en: 'On the table there is bread, cheese and an apple. The milk is missing: the cat looks for it!',
    },
    shortText: {
      es: 'En la mesa hay pan y manzana, pero falta la leche.',
      eu: 'Mahaian ogia eta sagarra daude, baina esnea falta da.',
      en: 'On the table there is bread and an apple, but the milk is missing.',
    },
    question: { es: '¿Qué NO está en la mesa?', eu: 'Zer EZ dago mahaian?', en: 'What is NOT on the table?' },
    options: [
      { es: 'La leche', eu: 'Esnea', en: 'The milk' },
      { es: 'El pan', eu: 'Ogia', en: 'The bread' },
      { es: 'La manzana', eu: 'Sagarra', en: 'The apple' },
    ],
    correct: 0,
    theme: { es: 'La comida', eu: 'Janaria', en: 'Food' },
  },
  {
    id: 'st4',
    emoji: '📖🔵',
    title: { es: 'El libro azul', eu: 'Liburu urdina', en: 'The Blue Book' },
    text: {
      es: 'Mi amigo y yo leemos un libro azul. El cuento habla de una estrella muy pequeña.',
      eu: 'Lagunak eta biok liburu urdin bat irakurtzen dugu. Ipuinak izar txiki bati buruz hitz egiten du.',
      en: 'My friend and I read a blue book. The story is about a very little star.',
    },
    shortText: {
      es: 'Mi amigo y yo leemos un libro azul.',
      eu: 'Lagunak eta biok liburu urdin bat irakurtzen dugu.',
      en: 'My friend and I read a blue book.',
    },
    question: { es: '¿De qué color es el libro?', eu: 'Zer koloretakoa da liburua?', en: 'What color is the book?' },
    options: [
      { es: 'Azul', eu: 'Urdina', en: 'Blue' },
      { es: 'Rojo', eu: 'Gorria', en: 'Red' },
      { es: 'Verde', eu: 'Berdea', en: 'Green' },
    ],
    correct: 0,
    theme: { es: 'Un libro', eu: 'Liburu bat', en: 'A book' },
  },
  {
    id: 'st5',
    emoji: '🐶🌳',
    title: { es: 'Carrera en el bosque', eu: 'Lasterketa basoan', en: 'Forest Race' },
    text: {
      es: 'El perro corre hacia el árbol grande. El viento mueve las hojas y el perro ladra contento.',
      eu: 'Txakurra zuhaitz handirantz korrika doa. Haizeak hostoak mugitzen ditu eta txakurrak alai zaunka egiten du.',
      en: 'The dog runs to the big tree. The wind moves the leaves and the dog barks happily.',
    },
    shortText: {
      es: 'El perro corre hacia el árbol grande.',
      eu: 'Txakurra zuhaitz handirantz korrika doa.',
      en: 'The dog runs to the big tree.',
    },
    question: { es: '¿Hacia dónde corre el perro?', eu: 'Nora doa korrika txakurra?', en: 'Where does the dog run?' },
    options: [
      { es: 'Hacia el árbol', eu: 'Zuhaitzera', en: 'To the tree' },
      { es: 'Hacia el mar', eu: 'Itsasora', en: 'To the sea' },
      { es: 'Hacia la escuela', eu: 'Eskolara', en: 'To the school' },
    ],
    correct: 0,
    theme: { es: 'Un perro', eu: 'Txakur bat', en: 'A dog' },
  },
  {
    id: 'st6',
    emoji: '🌙🦆',
    title: { es: 'Buenas noches, Pato Ventura', eu: 'Gabon, Pato Ventura', en: 'Good Night, Pato Ventura' },
    text: {
      es: 'La luna blanca mira el cielo. Una estrella pequeña brilla y Pato Ventura se duerme en su nido.',
      eu: 'Ilargi zuriak zeruari begiratzen dio. Izar txiki batek distira egiten du eta Pato Ventura habian lokartzen da.',
      en: 'The white moon looks at the sky. A little star shines and Pato Ventura sleeps in his nest.',
    },
    shortText: {
      es: 'Por la noche, Pato Ventura se duerme en su nido.',
      eu: 'Gauez, Pato Ventura habian lokartzen da.',
      en: 'At night, Pato Ventura sleeps in his nest.',
    },
    question: { es: '¿Dónde se duerme Pato Ventura?', eu: 'Non lokartzen da Pato Ventura?', en: 'Where does Pato Ventura sleep?' },
    options: [
      { es: 'En su nido', eu: 'Habian', en: 'In his nest' },
      { es: 'En el mar', eu: 'Itsasoan', en: 'In the sea' },
      { es: 'En la mesa', eu: 'Mahaian', en: 'On the table' },
    ],
    correct: 0,
    theme: { es: 'La noche', eu: 'Gaua', en: 'Night' },
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
  en: string;
  hex: string;
  emoji: string;
  /** Patrón geométrico y símbolo único para niños con daltonismo. */
  pattern: string;
  symbol: string;
}

export const colors: ColorItem[] = [
  { id: 'rojo', es: 'rojo', eu: 'gorri', en: 'red', hex: '#E8503A', emoji: '🔴', pattern: 'stripes', symbol: '▲' },
  { id: 'azul', es: 'azul', eu: 'urdin', en: 'blue', hex: '#3B82F6', emoji: '🔵', pattern: 'waves', symbol: '●' },
  { id: 'verde', es: 'verde', eu: 'berde', en: 'green', hex: '#34A853', emoji: '🟢', pattern: 'dots', symbol: '■' },
  { id: 'amarillo', es: 'amarillo', eu: 'hori', en: 'yellow', hex: '#F5C518', emoji: '🟡', pattern: 'grid', symbol: '★' },
  { id: 'blanco', es: 'blanco', eu: 'zuri', en: 'white', hex: '#F5F3EE', emoji: '⚪', pattern: 'ring', symbol: '○' },
  { id: 'negro', es: 'negro', eu: 'beltz', en: 'black', hex: '#2C3A57', emoji: '⚫', pattern: 'solid', symbol: '◆' },
  { id: 'naranja', es: 'naranja', eu: 'laranja', en: 'orange', hex: '#F58A32', emoji: '🟠', pattern: 'vstripes', symbol: '▼' },
  { id: 'morado', es: 'morado', eu: 'morea', en: 'purple', hex: '#8B5CF6', emoji: '🟣', pattern: 'diamond', symbol: '❖' },
  { id: 'rosa', es: 'rosa', eu: 'arrosa', en: 'pink', hex: '#F472B6', emoji: '🌷', pattern: 'check', symbol: '♥' },
];

export const colorById: Record<string, ColorItem> = Object.fromEntries(colors.map((c) => [c.id, c]));

export interface ColorObject {
  emoji: string;
  es: string;
  eu: string;
  en: string;
  colorId: string;
}

/** Objetos de color inequívocos, para preguntas concretas y literales. */
export const colorObjects: ColorObject[] = [
  { emoji: '🍅', es: 'el tomate', eu: 'tomatea', en: 'the tomato', colorId: 'rojo' },
  { emoji: '🍌', es: 'el plátano', eu: 'banana', en: 'the banana', colorId: 'amarillo' },
  { emoji: '🥬', es: 'la lechuga', eu: 'letxuga', en: 'the lettuce', colorId: 'verde' },
  { emoji: '🌊', es: 'el mar', eu: 'itsasoa', en: 'the sea', colorId: 'azul' },
  { emoji: '❄️', es: 'la nieve', eu: 'elurra', en: 'the snow', colorId: 'blanco' },
  { emoji: '🌑', es: 'la noche', eu: 'gaua', en: 'the night', colorId: 'negro' },
  { emoji: '🍊', es: 'la naranja', eu: 'laranja', en: 'the orange', colorId: 'naranja' },
  { emoji: '🍇', es: 'las uvas', eu: 'mahatsak', en: 'the grapes', colorId: 'morado' },
  { emoji: '🌷', es: 'la flor rosa', eu: 'lore arrosa', en: 'the pink flower', colorId: 'rosa' },
];

export interface NumberItem {
  n: number;
  es: string;
  eu: string;
  en: string;
  emoji: string;
}

export const numbers: NumberItem[] = [
  { n: 1, es: 'uno', eu: 'bat', en: 'one', emoji: '1️⃣' },
  { n: 2, es: 'dos', eu: 'bi', en: 'two', emoji: '2️⃣' },
  { n: 3, es: 'tres', eu: 'hiru', en: 'three', emoji: '3️⃣' },
  { n: 4, es: 'cuatro', eu: 'lau', en: 'four', emoji: '4️⃣' },
  { n: 5, es: 'cinco', eu: 'bost', en: 'five', emoji: '5️⃣' },
];

/** Emojis para contar: todos del mismo tipo en cada pregunta. */
export const countingEmojis = ['🍎', '⭐', '🐟', '🎈', '🌸', '🐦', '🍋'];

export interface Imperative {
  id: string;
  emoji: string;
  es: string;
  eu: string;
  en: string;
}

/**
 * Instrucciones de un solo paso, literales y sin reglas con truco.
 * Se evita deliberadamente el "Simón dice" clásico (que excluye a quien
 * tiene dificultades de comprensión): siempre se hace lo que dice Pato Ventura.
 */
export const imperatives: Imperative[] = [
  { id: 'i1', emoji: '🧍', es: 'Levántate', eu: 'Jaiki', en: 'Stand up' },
  { id: 'i2', emoji: '🪑', es: 'Siéntate', eu: 'Eseri', en: 'Sit down' },
  { id: 'i3', emoji: '👏', es: 'Da una palmada', eu: 'Txalo egin', en: 'Clap your hands' },
  { id: 'i4', emoji: '🙆', es: 'Toca la cabeza', eu: 'Ukitu burua', en: 'Touch your head' },
  { id: 'i5', emoji: '👃', es: 'Toca la nariz', eu: 'Ukitu sudurra', en: 'Touch your nose' },
  { id: 'i6', emoji: '🤲', es: 'Abre las manos', eu: 'Ireki eskuak', en: 'Open your hands' },
  { id: 'i7', emoji: '🦘', es: 'Da un salto', eu: 'Jauzi egin', en: 'Jump up' },
  { id: 'i8', emoji: '🌬️', es: 'Respira hondo', eu: 'Arnasa hartu', en: 'Take a deep breath' },
  { id: 'i9', emoji: '⬆️', es: 'Mira arriba', eu: 'Begiratu gora', en: 'Look up' },
  { id: 'i10', emoji: '🚪', es: 'Señala la puerta', eu: 'Seinalatu atea', en: 'Point to the door' },
  { id: 'i11', emoji: '🔢', es: 'Cuenta hasta tres', eu: 'Zenbatu hirura arte', en: 'Count to three' },
  { id: 'i12', emoji: '😊', es: 'Sonríe', eu: 'Irribarre egin', en: 'Smile' },
  { id: 'i13', emoji: '🙌', es: 'Estira los brazos', eu: 'Luzatu besoak', en: 'Stretch your arms' },
  { id: 'i14', emoji: '🔄', es: 'Da una vuelta', eu: 'Buelta eman', en: 'Turn around' },
  { id: 'i15', emoji: '🤪', es: 'Haz una mueca', eu: 'Egin imintzio bat', en: 'Make a funny face' },
  { id: 'i16', emoji: '👋', es: 'Saluda con la mano', eu: 'Agurtu eskuarekin', en: 'Wave your hand' },
  { id: 'i17', emoji: '✍️', es: 'Dibuja una letra en el aire', eu: 'Marraztu letra bat airean', en: 'Draw a letter in the air' },
  { id: 'i18', emoji: '🐧', es: 'Camina como un pingüino', eu: 'Ibili pinguino bezala', en: 'Walk like a penguin' },
  { id: 'i19', emoji: '🧘', es: 'Estira la espalda', eu: 'Luzatu bizkarra', en: 'Stretch your back' },
  { id: 'i20', emoji: '👂', es: 'Escucha un sonido', eu: 'Entzun soinu bat', en: 'Listen to a sound' },
  { id: 'i21', emoji: '🤫', es: 'Haz palmas suaves', eu: 'Egin txalo leunak', en: 'Clap softly' },
  { id: 'i22', emoji: '🦆', es: 'Mira a Pato Ventura y sonríe', eu: 'Begiratu Pato Venturari eta irribarre egin', en: 'Look at Pato Ventura and smile' },
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
