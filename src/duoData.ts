import type { Lang, OutfitId, Progress, SyllableStage, UiLang } from './types';

export interface UnitTheme {
  id: number;
  bg: string;
  lip: string;
  soft: string;
  textOnSoft: string;
}

export const UNIT_THEMES: Record<number, UnitTheme> = {
  1: { id: 1, bg: '#58cc02', lip: '#58a700', soft: '#d7ffb8', textOnSoft: '#468c00' }, // Feather Green
  2: { id: 2, bg: '#1cb0f6', lip: '#1899d6', soft: '#ddf4ff', textOnSoft: '#1179ad' }, // Macaw Blue
  3: { id: 3, bg: '#ff9600', lip: '#e07e00', soft: '#fff0d6', textOnSoft: '#b86200' }, // Fox Orange
  4: { id: 4, bg: '#ce82ff', lip: '#a568cc', soft: '#f3e5ff', textOnSoft: '#8446ad' }, // Beetle Purple
  5: { id: 5, bg: '#ff86d0', lip: '#d861ac', soft: '#ffe6f5', textOnSoft: '#b03e86' }, // Flamingo Pink
  6: { id: 6, bg: '#00cd9c', lip: '#00a37c', soft: '#d6fff4', textOnSoft: '#007a5c' }, // Emerald Teal
  7: { id: 7, bg: '#ffc800', lip: '#e0ac00', soft: '#fff7d6', textOnSoft: '#9e7600' }, // Bee Gold
  8: { id: 8, bg: '#2b70c9', lip: '#1e549e', soft: '#e0eeff', textOnSoft: '#1b4d91' }, // Humpback Blue
};

export type PathNodeKind = 'lesson' | 'practice' | 'chest' | 'story' | 'trophy';

export interface PathNodeDef {
  index: number;
  kind: PathNodeKind;
  offsetPx: number;
  totalCrownSteps: number;
  storyId?: string;
  syllableStage?: SyllableStage;
  shortTagEs?: string;
  shortTagEu?: string;
  esLabel: string;
  euLabel: string;
}

export function nodesForUnit(unitId: number): PathNodeDef[] {
  const dir = unitId % 2 === 1 ? 1 : -1;
  if (unitId === 2) {
    return [
      {
        index: 0,
        kind: 'lesson',
        offsetPx: 0,
        totalCrownSteps: 2,
        syllableStage: 1,
        shortTagEs: '1 · Directas',
        shortTagEu: '1 · Zuzenak',
        esLabel: '1 · Sílabas directas (ma, pa, la…)',
        euLabel: '1 · Silaba zuzenak (ma, pa, la…)',
      },
      {
        index: 1,
        kind: 'lesson',
        offsetPx: 58 * dir,
        totalCrownSteps: 2,
        syllableStage: 2,
        shortTagEs: '2 · Inversas',
        shortTagEu: '2 · Alderantzizkoak',
        esLabel: '2 · Sílabas inversas (al, ar, es…)',
        euLabel: '2 · Alderantzizko silabak (al, ar, es…)',
      },
      {
        index: 2,
        kind: 'chest',
        offsetPx: 78 * dir,
        totalCrownSteps: 1,
        esLabel: 'Cofre de tesoro',
        euLabel: 'Altxor kutxa',
      },
      {
        index: 3,
        kind: 'practice',
        offsetPx: 58 * dir,
        totalCrownSteps: 2,
        syllableStage: 3,
        shortTagEs: '3 · Trabadas',
        shortTagEu: '3 · Trabatutakoak',
        esLabel: '3 · Sílabas trabadas (pla, bra, tra…)',
        euLabel: '3 · Silaba trabatutakoak (pla, bra, tra…)',
      },
      {
        index: 4,
        kind: 'story',
        offsetPx: 30 * dir,
        totalCrownSteps: 1,
        storyId: `ds${unitId}`,
        esLabel: 'Cuento de la unidad',
        euLabel: 'Unitateko ipuina',
      },
      {
        index: 5,
        kind: 'trophy',
        offsetPx: 0,
        totalCrownSteps: 1,
        shortTagEs: '1 → 2 → 3',
        shortTagEu: '1 → 2 → 3',
        esLabel: 'Trofeo · Progresión (Directas → Inversas → Trabadas)',
        euLabel: 'Garaikurra · Progresioa (Zuzenak → Alderantzizkoak → Trabatutakoak)',
      },
    ];
  }
  return [
    {
      index: 0,
      kind: 'lesson',
      offsetPx: 0,
      totalCrownSteps: 2,
      esLabel: 'Primeros pasos',
      euLabel: 'Lehen urratsak',
    },
    {
      index: 1,
      kind: 'practice',
      offsetPx: 58 * dir,
      totalCrownSteps: 2,
      esLabel: 'Práctica guiada',
      euLabel: 'Praktika gidatua',
    },
    {
      index: 2,
      kind: 'chest',
      offsetPx: 78 * dir,
      totalCrownSteps: 1,
      esLabel: 'Cofre de tesoro',
      euLabel: 'Altxor kutxa',
    },
    {
      index: 3,
      kind: 'story',
      offsetPx: 44 * dir,
      totalCrownSteps: 1,
      storyId: `ds${unitId}`,
      esLabel: 'Cuento de la unidad',
      euLabel: 'Unitateko ipuina',
    },
    {
      index: 4,
      kind: 'trophy',
      offsetPx: 0,
      totalCrownSteps: 1,
      esLabel: 'Trofeo de la unidad',
      euLabel: 'Unitateko garaikurra',
    },
  ];
}

/* ================================================================== */
/* Guías de Unidad (Guidebooks estilo Duolingo)                        */
/* ================================================================== */

export interface GuidePhrase {
  emoji: string;
  es: string;
  eu: string;
  sylEs: string;
  sylEu: string;
}

export interface UnitGuidebook {
  unitId: number;
  tipEs: string;
  tipEu: string;
  ruleTitleEs: string;
  ruleTitleEu: string;
  ruleBodyEs: string;
  ruleBodyEu: string;
  phrases: GuidePhrase[];
}

export const UNIT_GUIDEBOOKS: Record<number, UnitGuidebook> = {
  1: {
    unitId: 1,
    tipEs: 'Cada letra tiene su propia voz. Escucha el primer sonido de la palabra y míralo con calma.',
    tipEu: 'Letra bakoitzak bere ahotsa du. Entzun hitzaren lehen soinua eta begiratu lasai.',
    ruleTitleEs: 'Letras especiales: tx, tz, ch, ñ, rr',
    ruleTitleEu: 'Letra bereziak: tx, tz, ch, ñ, rr',
    ruleBodyEs: 'En euskera «tx» suena como «ch» en castellano (txakur = perro, txori = pájaro). ¡Dos letras que hacen un solo sonido!',
    ruleBodyEu: 'Euskaraz «tx» eta gaztelaniaz «ch» antzeko soinua dute (txakur, txokolate). Bi letra, soinu bakar bat!',
    phrases: [
      { emoji: '🐶', es: 'perro', eu: 'txakur', sylEs: 'pe · rro', sylEu: 'txa · kur' },
      { emoji: '🐦', es: 'pájaro', eu: 'txori', sylEs: 'pá · ja · ro', sylEu: 'txo · ri' },
      { emoji: '☀️', es: 'sol', eu: 'eguzki', sylEs: 'sol', sylEu: 'e · guz · ki' },
      { emoji: '🔑', es: 'llave', eu: 'giltza', sylEs: 'lla · ve', sylEu: 'gil · tza' },
    ],
  },
  2: {
    unitId: 2,
    tipEs: 'Avanzamos en 3 pasos: 1º Directas (consonante+vocal), 2º Inversas (vocal+consonante) y 3º Trabadas (doble consonante con L o R).',
    tipEu: '3 urratsetan goaz: 1. Zuzenak (kontsonante+bokal), 2. Alderantzizkoak (bokal+kontsonante) eta 3. Trabatutakoak (L edo R-rekin).',
    ruleTitleEs: '1 · Directas → 2 · Inversas → 3 · Trabadas',
    ruleTitleEu: '1 · Zuzenak → 2 · Alderantzizkoak → 3 · Trabatutakoak',
    ruleBodyEs: '1) Directas: «pa · to», «pe · lo · ta». 2) Inversas: primero suena la vocal («is · la», «es · pe · jo»). 3) Trabadas: dos consonantes unidas («pla · to», «ti · gre», «dra · gón»).',
    ruleBodyEu: '1) Zuzenak: «ka · tu», «pi · lo · ta». 2) Alderantzizkoak: bokala lehenik («ir · la», «is · pi · lu»). 3) Trabatutakoak: bi kontsonante elkarrekin («pla · ter», «ti · gre», «dra · goi»).',
    phrases: [
      { emoji: '⚽', es: '1·Directa: pelota', eu: '1·Zuzena: pilota', sylEs: 'pe · lo · ta', sylEu: 'pi · lo · ta' },
      { emoji: '🪞', es: '2·Inversa: espejo', eu: '2·Alderantzizkoa: ispilu', sylEs: 'es · pe · jo', sylEu: 'is · pi · lu' },
      { emoji: '🍽️', es: '3·Trabada (L): plato', eu: '3·Trabatua (L): plater', sylEs: 'pla · to', sylEu: 'pla · ter' },
      { emoji: '🐉', es: '3·Trabada (R): dragón', eu: '3·Trabatua (R): dragoi', sylEs: 'dra · gón', sylEu: 'dra · goi' },
    ],
  },
  3: {
    unitId: 3,
    tipEs: 'Conecta la palabra escrita con su dibujo y con su sonido para recordarla el doble de rápido.',
    tipEu: 'Lotu hitz idatzia bere marrazkiarekin eta soinuarekin bi aldiz azkarrago gogoratzeko.',
    ruleTitleEs: 'Familias de palabras cotidianas',
    ruleTitleEu: 'Eguneroko hitzen familiak',
    ruleBodyEs: 'Agrupar palabras por familias (animales, comida, casa, naturaleza) ayuda a tu cerebro a encontrarlas enseguida al leer.',
    ruleBodyEu: 'Hitzak familien arabera biltzeak (animaliak, janaria, etxea, natura) irakurtzean azkar aurkitzen laguntzen du.',
    phrases: [
      { emoji: '🐱', es: 'gato', eu: 'katu', sylEs: 'ga · to', sylEu: 'ka · tu' },
      { emoji: '🍞', es: 'pan', eu: 'ogi', sylEs: 'pan', sylEu: 'o · gi' },
      { emoji: '🥛', es: 'leche', eu: 'esne', sylEs: 'le · che', sylEu: 'es · ne' },
      { emoji: '📖', es: 'libro', eu: 'liburu', sylEs: 'li · bro', sylEu: 'li · bu · ru' },
    ],
  },
  4: {
    unitId: 4,
    tipEs: 'Dos palabras riman cuando su final canta igual: «gato» y «pato», «txori» y «hori».',
    tipEu: 'Bi hitzek errima egiten dute amaierak berdin abesten duenean: «txori» eta «hori», «sagar» eta «izar».',
    ruleTitleEs: 'Entrena el oído con pares parecidos',
    ruleTitleEu: 'Entrenatu belarria antzeko bikoteekin',
    ruleBodyEs: 'Fíjate en la letra que cambia: «casa» frente a «taza», o «katu» frente a «zapatu». ¡Leer el final con atención evita confusiones!',
    ruleBodyEu: 'Begiratu aldatzen den letrari: «sagar» eta «adar», edo «lore» eta «kolore».',
    phrases: [
      { emoji: '🐱', es: 'gato · pato', eu: 'txori · hori', sylEs: 'ga·to / pa·to', sylEu: 'txo·ri / ho·ri' },
      { emoji: '⭐', es: 'estrella · botella', eu: 'sagar · izar', sylEs: 'es·tre·lla', sylEu: 'sa·gar / i·zar' },
      { emoji: '🌸', es: 'flor · color', eu: 'lore · kolore', sylEs: 'flor / co·lor', sylEu: 'lo·re / ko·lo·re' },
      { emoji: '❤️', es: 'corazón · canción', eu: 'urdin · egin', sylEs: 'co·ra·zón', sylEu: 'ur·din / e·gin' },
    ],
  },
  5: {
    unitId: 5,
    tipEs: 'Una frase cuenta una pequeña película: quién hace algo y qué ocurre.',
    tipEu: 'Esaldi batek film txiki bat kontatzen du: nork egiten duen zerbait eta zer gertatzen den.',
    ruleTitleEs: 'El orden de las palabras en ES y EU',
    ruleTitleEu: 'Hitzen ordena gaztelaniaz eta euskaraz',
    ruleBodyEs: 'En castellano decimos «El gato bebe leche». En euskera el verbo suele ir al final: «Katuak esnea edaten du» (El gato leche bebe).',
    ruleBodyEu: 'Gaztelaniaz «El gato bebe leche» esaten da; euskaraz aditza amaieran doa: «Katuak esnea edaten du».',
    phrases: [
      { emoji: '🐱🥛', es: 'El gato bebe leche', eu: 'Katuak esnea edaten du', sylEs: '4 palabras', sylEu: '4 hitz' },
      { emoji: '☀️', es: 'El sol brilla hoy', eu: 'Eguzkiak gaur distira egiten du', sylEs: '4 palabras', sylEu: '5 hitz' },
      { emoji: '🐶🌳', es: 'El perro corre al árbol', eu: 'Txakurra zuhaitzera korrika doa', sylEs: '5 palabras', sylEu: '4 hitz' },
      { emoji: '🌙', es: 'La luna es blanca', eu: 'Ilargia zuria da', sylEs: '4 palabras', sylEu: '3 hitz' },
    ],
  },
  6: {
    unitId: 6,
    tipEs: 'Al leer un cuento, imagina la escena en tu cabeza y busca palabras pista en cada frase.',
    tipEu: 'Ipuin bat irakurtzean, irudikatu eszena buruan eta bilatu hitz gakoak esaldi bakoitzean.',
    ruleTitleEs: 'Leer para comprender historias',
    ruleTitleEu: 'Istorioak ulertzeko irakurri',
    ruleBodyEs: 'Puedes pulsar 🔊 o la tortuga 🐢 para escuchar el cuento despacio mientras sigues las palabras con la vista.',
    ruleBodyEu: 'Sakatu 🔊 edo dortoka 🐢 ipuina poliki entzuteko hitzei begiradarekin jarraitzen diezun bitartean.',
    phrases: [
      { emoji: '🐦☀️', es: 'El pájaro canta en el árbol.', eu: 'Txoriak zuhaitzean abesten du.', sylEs: '¿Quién canta?', sylEu: 'Nork abesten du?' },
      { emoji: '🦋🌸', es: 'La mariposa vuela sobre la flor.', eu: 'Tximeleta lorearen gainean hegan dabil.', sylEs: '¿Dónde vuela?', sylEu: 'Non dabil?' },
      { emoji: '📖🔵', es: 'Leemos un libro azul.', eu: 'Liburu urdin bat irakurtzen dugu.', sylEs: '¿Qué color?', sylEu: 'Zer kolore?' },
      { emoji: '🌙🦆', es: 'Pato Ventura duerme en su nido.', eu: 'Pato Ventura habian lokartzen da.', sylEs: '¿Dónde duerme?', sylEu: 'Non lokartzen da?' },
    ],
  },
};

/* ================================================================== */
/* Letras, Dígrafos y Sílabas (Pestaña Sonidos / Letras estilo Duo)    */
/* ================================================================== */

export interface PhoneticCard {
  id: string;
  symbol: string;
  exampleEs: string;
  exampleEu: string;
  emoji: string;
  audioEs: string;
  audioEu: string;
}

export interface PhoneticSection {
  id: string;
  stage?: SyllableStage;
  titleEs: string;
  titleEu: string;
  subEs: string;
  subEu: string;
  cards: PhoneticCard[];
}

export const PHONETIC_SECTIONS: PhoneticSection[] = [
  {
    id: 'syllables-direct',
    stage: 1,
    titleEs: '1 · Sílabas Directas (CV)',
    titleEu: '1 · Silaba Zuzenak (CV)',
    subEs: 'Paso 1: Consonante + vocal abierta. ¡El punto de partida ideal!',
    subEu: '1. urratsa: Kontsonantea + bokal irekia. Hasteko aproposa!',
    cards: [
      { id: 'sd-ma', symbol: 'ma', exampleEs: 'ma·no', exampleEu: 'ma·hai', emoji: '✋', audioEs: 'ma, mano', audioEu: 'ma, mahai' },
      { id: 'sd-pa', symbol: 'pa', exampleEs: 'pa·to', exampleEu: 'za·pa·ta', emoji: '🦆', audioEs: 'pa, pato', audioEu: 'pa, zapata' },
      { id: 'sd-lu', symbol: 'lu', exampleEs: 'lu·na', exampleEu: 'is·pi·lu', emoji: '🌙', audioEs: 'lu, luna', audioEu: 'lu' },
      { id: 'sd-so', symbol: 'so', exampleEs: 'so·pa', exampleEu: 'it·sa·so', emoji: '🥣', audioEs: 'so, sopa', audioEu: 'so, itsaso' },
      { id: 'sd-to', symbol: 'to', exampleEs: 'to·ma·te', exampleEu: 'to·ma·te', emoji: '🍅', audioEs: 'to, tomate', audioEu: 'to, tomate' },
      { id: 'sd-pe', symbol: 'pe', exampleEs: 'pe·lo·ta', exampleEu: 'pe·rre·txi·ko', emoji: '⚽', audioEs: 'pe, pelota', audioEu: 'pe, perretxiko' },
      { id: 'sd-ka', symbol: 'ka', exampleEs: 'ca·sa', exampleEu: 'ka·tu', emoji: '🐱', audioEs: 'ca, casa', audioEu: 'ka, katu' },
      { id: 'sd-lo', symbol: 'lo', exampleEs: 'pe·lo·ta', exampleEu: 'lo·re', emoji: '🌸', audioEs: 'lo, pelota', audioEu: 'lo, lore' },
    ],
  },
  {
    id: 'syllables-inverse',
    stage: 2,
    titleEs: '2 · Sílabas Inversas (VC)',
    titleEu: '2 · Alderantzizko Silabak (VC)',
    subEs: 'Paso 2: Primero suena la vocal y después cierra la consonante (al, ar, an, es…).',
    subEu: '2. urratsa: Bokala entzuten da lehenik eta kontsonanteak ixten du (al, ar, an, es…).',
    cards: [
      { id: 'si-is', symbol: 'is / ir', exampleEs: 'is·la', exampleEu: 'ir·la', emoji: '🏝️', audioEs: 'is, isla', audioEu: 'ir, irla' },
      { id: 'si-es', symbol: 'es', exampleEs: 'es·pe·jo', exampleEu: 'es·ko·la', emoji: '🪞', audioEs: 'es, espejo', audioEu: 'es, eskola' },
      { id: 'si-ar', symbol: 'ar', exampleEs: 'ar·co', exampleEu: 'ar·ku', emoji: '🏹', audioEs: 'ar, arco', audioEu: 'ar, arku' },
      { id: 'si-an', symbol: 'an', exampleEs: 'an·te·na', exampleEu: 'an·te·na', emoji: '📡', audioEs: 'an, antena', audioEu: 'an, antena' },
      { id: 'si-in', symbol: 'in', exampleEs: 'in·sec·to', exampleEu: 'in·tsek·tu', emoji: '🐞', audioEs: 'in, insecto', audioEu: 'in, intsektu' },
      { id: 'si-ez', symbol: 'es / ez', exampleEs: 'es·pa·da', exampleEu: 'ez·pa·ta', emoji: '⚔️', audioEs: 'es, espada', audioEu: 'ez, ezpata' },
      { id: 'si-ur', symbol: 'ár / ur', exampleEs: 'ár·bol', exampleEu: 'ur·din', emoji: '🌳', audioEs: 'ar, árbol', audioEu: 'ur, urdin' },
      { id: 'si-am', symbol: 'am / an', exampleEs: 'am·bu·lan·cia', exampleEu: 'an·bu·lan·tzi·a', emoji: '🚑', audioEs: 'am, ambulancia', audioEu: 'an, anbulantzia' },
    ],
  },
  {
    id: 'syllables-trabadas',
    stage: 3,
    titleEs: '3 · Sílabas Trabadas (CCV)',
    titleEu: '3 · Silaba Trabatutakoak (CCV)',
    subEs: 'Paso 3: Dos consonantes unidas con L o con R antes de la vocal (bl, cl, fl, gl, pl · br, cr, dr, fr, gr, pr, tr).',
    subEu: '3. urratsa: Bi kontsonante L edo R-rekin bokalaren aurretik (bl, kl, fl, gl, pl · br, kr, dr, fr, gr, pr, tr).',
    cards: [
      { id: 'st-pla', symbol: 'pla', exampleEs: 'pla·to', exampleEu: 'pla·ter', emoji: '🍽️', audioEs: 'pla, plato', audioEu: 'pla, plater' },
      { id: 'st-blu', symbol: 'blu', exampleEs: 'blu·sa', exampleEu: 'blu·sa', emoji: '👚', audioEs: 'blu, blusa', audioEu: 'blu, blusa' },
      { id: 'st-cle', symbol: 'cle / kle', exampleEs: 'bi·ci·cle·ta', exampleEu: 'bi·zi·kle·ta', emoji: '🚲', audioEs: 'cle, bicicleta', audioEu: 'kle, bizikleta' },
      { id: 'st-fla', symbol: 'fla', exampleEs: 'flan', exampleEu: 'fla·na', emoji: '🍮', audioEs: 'flan', audioEu: 'fla, flana' },
      { id: 'st-glo', symbol: 'glo', exampleEs: 'glo·bo', exampleEu: 'glo·bo', emoji: '🎈', audioEs: 'glo, globo', audioEu: 'glo, globo' },
      { id: 'st-bra', symbol: 'bra', exampleEs: 'ce·bra', exampleEu: 'ze·bra', emoji: '🦓', audioEs: 'bra, cebra', audioEu: 'bra, zebra' },
      { id: 'st-dri', symbol: 'dri / kro', exampleEs: 'co·co·dri·lo', exampleEu: 'kro·ko·di·lo', emoji: '🐊', audioEs: 'dri, cocodrilo', audioEu: 'kro, krokodilo' },
      { id: 'st-dra', symbol: 'dra', exampleEs: 'dra·gón', exampleEu: 'dra·goi', emoji: '🐉', audioEs: 'dra, dragón', audioEu: 'dra, dragoi' },
      { id: 'st-fru', symbol: 'fru', exampleEs: 'fru·ta', exampleEu: 'fru·ta', emoji: '🍓', audioEs: 'fru, fruta', audioEu: 'fru, fruta' },
      { id: 'st-gre', symbol: 'gre', exampleEs: 'ti·gre', exampleEu: 'ti·gre', emoji: '🐯', audioEs: 'gre, tigre', audioEu: 'gre, tigre' },
      { id: 'st-pri', symbol: 'prin', exampleEs: 'prin·ce·sa', exampleEu: 'prin·tze·sa', emoji: '👑', audioEs: 'prin, princesa', audioEu: 'prin, printzesa' },
      { id: 'st-tra', symbol: 'tre / tra', exampleEs: 'trac·tor', exampleEu: 'trak·to·re', emoji: '🚜', audioEs: 'trac, tractor', audioEu: 'trak, traktore' },
    ],
  },
  {
    id: 'vowels',
    titleEs: 'Las 5 Vocales Claras',
    titleEu: '5 Bokal Argiak',
    subEs: 'Suenan igual de claras en castellano y en euskera.',
    subEu: 'Berdin-berdin entzuten dira euskaraz zein gaztelaniaz.',
    cards: [
      { id: 'v-a', symbol: 'a', exampleEs: 'agua', exampleEu: 'ate', emoji: '💧', audioEs: 'a, agua', audioEu: 'a, ate' },
      { id: 'v-e', symbol: 'e', exampleEs: 'estrella', exampleEu: 'etxe', emoji: '⭐', audioEs: 'e, estrella', audioEu: 'e, etxe' },
      { id: 'v-i', symbol: 'i', exampleEs: 'isla', exampleEu: 'izar', emoji: '🏝️', audioEs: 'i, isla', audioEu: 'i, izar' },
      { id: 'v-o', symbol: 'o', exampleEs: 'ojo', exampleEu: 'ogi', emoji: '👁️', audioEs: 'o, ojo', audioEu: 'o, ogi' },
      { id: 'v-u', symbol: 'u', exampleEs: 'uno', exampleEu: 'ur', emoji: '1️⃣', audioEs: 'u, uno', audioEu: 'u, ur' },
    ],
  },
  {
    id: 'basque-special',
    titleEs: 'Sonidos Especiales del Euskera',
    titleEu: 'Euskararen Soinu Bereziak',
    subEs: 'Parejas de letras muy frecuentes al leer en euskera.',
    subEu: 'Euskaraz irakurtzean oso ohikoak diren letra-bikoteak.',
    cards: [
      { id: 'eu-tx', symbol: 'tx', exampleEs: 'como «ch»', exampleEu: 'txakur', emoji: '🐶', audioEs: 'txakur', audioEu: 'txakur' },
      { id: 'eu-tz', symbol: 'tz', exampleEs: 'sonido vibrante', exampleEu: 'giltza', emoji: '🔑', audioEs: 'giltza', audioEu: 'giltza' },
      { id: 'eu-ts', symbol: 'ts', exampleEs: 'suave silbante', exampleEu: 'itsaso', emoji: '🌊', audioEs: 'itsaso', audioEu: 'itsaso' },
      { id: 'eu-rr', symbol: 'rr', exampleEs: 'erre fuerte', exampleEu: 'harri', emoji: '🪨', audioEs: 'harri', audioEu: 'harri' },
      { id: 'eu-kh', symbol: 'k', exampleEs: 'sonido /k/', exampleEu: 'katu', emoji: '🐱', audioEs: 'katu', audioEu: 'katu' },
      { id: 'eu-z', symbol: 'z', exampleEs: 'ese suave', exampleEu: 'zuhaitz', emoji: '🌳', audioEs: 'zuhaitz', audioEu: 'zuhaitz' },
    ],
  },
  {
    id: 'spanish-special',
    titleEs: 'Sonidos Especiales del Castellano',
    titleEu: 'Gaztelaniaren Soinu Bereziak',
    subEs: 'Dígrafos y letras mágicas para leer sin tropezar.',
    subEu: 'Digrafo eta letra bereziak erraz irakurtzeko.',
    cards: [
      { id: 'es-ch', symbol: 'ch', exampleEs: 'chocolate', exampleEu: 'txokolate', emoji: '🍫', audioEs: 'chocolate', audioEu: 'txokolate' },
      { id: 'es-ll', symbol: 'll', exampleEs: 'llave', exampleEu: 'giltza', emoji: '🔑', audioEs: 'llave', audioEu: 'llave' },
      { id: 'es-ny', symbol: 'ñ', exampleEs: 'niño', exampleEu: 'haur', emoji: '🧒', audioEs: 'niño', audioEu: 'niño' },
      { id: 'es-rr', symbol: 'rr', exampleEs: 'perro', exampleEu: 'txakur', emoji: '🐶', audioEs: 'perro', audioEu: 'perro' },
      { id: 'es-qu', symbol: 'qu', exampleEs: 'queso', exampleEu: 'gazta', emoji: '🧀', audioEs: 'queso', audioEu: 'queso' },
      { id: 'es-fl', symbol: 'fl', exampleEs: 'flor', exampleEu: 'lore', emoji: '🌸', audioEs: 'flor', audioEu: 'flor' },
    ],
  },
];

/* ================================================================== */
/* Duolingo Stories · Cuentos Interactivos Paso a Paso                 */
/* ================================================================== */

export interface StoryStep {
  speaker: string;
  avatar: string;
  es: string;
  eu: string;
  quiz?: {
    questionEs: string;
    questionEu: string;
    options: { es: string; eu: string; ok?: boolean }[];
  };
}

export interface DuoStory {
  id: string;
  set: number;
  emoji: string;
  color: string;
  titleEs: string;
  titleEu: string;
  xpReward: number;
  steps: StoryStep[];
}

export const DUO_STORIES: DuoStory[] = [
  {
    id: 'ds1',
    set: 1,
    emoji: '🥐',
    color: '#58cc02',
    titleEs: 'El desayuno de Pato Ventura',
    titleEu: 'Pato Venturaren gosaria',
    xpReward: 20,
    steps: [
      { speaker: 'Pato Ventura', avatar: '🦆', es: '¡Buenos días, Katu! Tengo mucha hambre.', eu: 'Egun on, Katu! Gose handia daukat.' },
      { speaker: 'Katu', avatar: '🐱', es: '¡Hola! En la mesa hay pan y queso.', eu: 'Kaixo! Mahaian ogia eta gazta daude.' },
      {
        speaker: 'Pato Ventura',
        avatar: '🦆',
        es: '¡Qué rico! ¿Y hay una manzana roja?',
        eu: 'Ze goxoa! Eta ba al dago sagar gorri bat?',
        quiz: {
          questionEs: '¿Qué busca Pato Ventura ahora?',
          questionEu: 'Zer bilatzen du Pato Venturak orain?',
          options: [
            { es: 'Una manzana roja 🍎', eu: 'Sagar gorri bat 🍎', ok: true },
            { es: 'Un zapato azul 👟', eu: 'Zapata urdin bat 👟' },
            { es: 'Una piedra grande 🪨', eu: 'Harri handi bat 🪨' },
          ],
        },
      },
      { speaker: 'Katu', avatar: '🐱', es: '¡Sí! Toma la manzana y un vaso de leche.', eu: 'Bai! Hartu sagarra eta baso bat esne.' },
      {
        speaker: 'Pato Ventura',
        avatar: '🦆',
        es: '¡Gracias, amigo! Ahora vamos a leer juntos.',
        eu: 'Eskerrik asko, lagun! Orain goazen elkarrekin irakurtzera.',
        quiz: {
          questionEs: '¿Qué van a hacer después de desayunar?',
          questionEu: 'Zer egingo dute gosaldu ondoren?',
          options: [
            { es: 'Leer juntos 📖', eu: 'Elkarrekin irakurri 📖', ok: true },
            { es: 'Dormir de noche 🌙', eu: 'Gauez lo egin 🌙' },
          ],
        },
      },
    ],
  },
  {
    id: 'ds2',
    set: 1,
    emoji: '🔑',
    color: '#1cb0f6',
    titleEs: 'La llave perdida',
    titleEu: 'Galdutako giltza',
    xpReward: 20,
    steps: [
      { speaker: 'Naroa', avatar: '🧒', es: '¡Oh, no! No encuentro la llave de casa.', eu: 'Oi, ez! Ez dut etxeko giltza aurkitzen.' },
      { speaker: 'Txakur', avatar: '🐶', es: '¡Guau! ¿Está encima de la mesa?', eu: 'Zaunk! Mahai gainean al dago?' },
      {
        speaker: 'Naroa',
        avatar: '🧒',
        es: 'No, en la mesa solo hay un libro azul.',
        eu: 'Ez, mahaian liburu urdin bat besterik ez dago.',
        quiz: {
          questionEs: '¿Qué hay encima de la mesa?',
          questionEu: 'Zer dago mahai gainean?',
          options: [
            { es: 'Un libro azul 📖', eu: 'Liburu urdin bat 📖', ok: true },
            { es: 'La llave 🔑', eu: 'Giltza 🔑' },
            { es: 'Un pescado 🐟', eu: 'Arrain bat 🐟' },
          ],
        },
      },
      { speaker: 'Txakur', avatar: '🐶', es: '¡Mira junto a la flor amarilla en el jardín!', eu: 'Begiratu lorategiko lore horiaren ondoan!' },
      {
        speaker: 'Naroa',
        avatar: '🧒',
        es: '¡Aquí está la llave! ¡Buen perro, Txakur!',
        eu: 'Hemen dago giltza! Txakur ona, Txakur!',
        quiz: {
          questionEs: '¿Dónde estaba la llave?',
          questionEu: 'Non zegoen giltza?',
          options: [
            { es: 'Junto a la flor amarilla 🌸', eu: 'Lore horiaren ondoan 🌸', ok: true },
            { es: 'En la escuela 🏫', eu: 'Eskolan 🏫' },
          ],
        },
      },
    ],
  },
  {
    id: 'ds3',
    set: 1,
    emoji: '🦋',
    color: '#ff9600',
    titleEs: 'Un concierto en el árbol',
    titleEu: 'Kontzertua zuhaitzean',
    xpReward: 20,
    steps: [
      { speaker: 'Txori', avatar: '🐦', es: 'El sol brilla mucho hoy en la montaña.', eu: 'Eguzkiak distira handia egiten du gaur mendian.' },
      { speaker: 'Tximeleta', avatar: '🦋', es: '¡Hola, Txori! Me encanta escuchar tu canción.', eu: 'Kaixo, Txori! Asko gustatzen zait zure abestia entzutea.' },
      {
        speaker: 'Txori',
        avatar: '🐦',
        es: '¡Canta y baila conmigo en el árbol grande!',
        eu: 'Abestu eta dantzatu nirekin zuhaitz handian!',
        quiz: {
          questionEs: '¿Dónde están Txori y la mariposa?',
          questionEu: 'Non daude Txori eta tximeleta?',
          options: [
            { es: 'En el árbol grande 🌳', eu: 'Zuhaitz handian 🌳', ok: true },
            { es: 'Debajo del mar 🌊', eu: 'Itsaso azpian 🌊' },
          ],
        },
      },
      { speaker: 'Pato Ventura', avatar: '🦆', es: '¡Cuac! ¡Yo llevo el ritmo dando tres palmadas!', eu: 'Kuak! Nik erritmoa eramango dut hiru txalo eginez!' },
    ],
  },
  {
    id: 'ds4',
    set: 2,
    emoji: '🌊',
    color: '#ce82ff',
    titleEs: 'Viaje al mar azul',
    titleEu: 'Bidaia itsaso urdinera',
    xpReward: 20,
    steps: [
      { speaker: 'Pato Ventura', avatar: '🦆', es: '¡Mira qué grande es el mar azul!', eu: 'Begira zein handia den itsaso urdina!' },
      { speaker: 'Arrain', avatar: '🐟', es: '¡Hola! En el agua nadamos cinco peces amigos.', eu: 'Kaixo! Uretan bost arrain lagun igerian gabiltza.' },
      {
        speaker: 'Pato Ventura',
        avatar: '🦆',
        es: '¡Uno, dos, tres, cuatro y cinco! ¡Qué rápidos!',
        eu: 'Bat, bi, hiru, lau eta bost! Zein azkarrak!',
        quiz: {
          questionEs: '¿Cuántos peces nadan en el agua?',
          questionEu: 'Zenbat arrain dabiltza uretan?',
          options: [
            { es: 'Cinco (5) 🐟', eu: 'Bost (5) 🐟', ok: true },
            { es: 'Dos (2) 🐟', eu: 'Bi (2) 🐟' },
          ],
        },
      },
      { speaker: 'Arrain', avatar: '🐟', es: 'El viento suave hace olas blancas.', eu: 'Haize leunak olatu zuriak egiten ditu.' },
    ],
  },
  {
    id: 'ds5',
    set: 2,
    emoji: '🍫',
    color: '#ff86d0',
    titleEs: 'La merienda secreta',
    titleEu: 'Askari sekretua',
    xpReward: 20,
    steps: [
      { speaker: 'Hartz', avatar: '🐻', es: 'Hoy vienen mis amigos a casa para merendar.', eu: 'Gaur nire lagunak etxera datoz askaltzera.' },
      { speaker: 'Naroa', avatar: '🧒', es: 'Yo traigo chocolate y pan recién hecho.', eu: 'Nik txokolatea eta ogi berria dakartzat.' },
      {
        speaker: 'Hartz',
        avatar: '🐻',
        es: '¡Qué bien huele! Ponemos cuatro platos en la mesa.',
        eu: 'Ze usain goxoa! Lau plater jarriko ditugu mahaian.',
        quiz: {
          questionEs: '¿Qué trae Naroa para merendar?',
          questionEu: 'Zer dakar Naroak askaltzeko?',
          options: [
            { es: 'Chocolate y pan 🍫🍞', eu: 'Txokolatea eta ogia 🍫🍞', ok: true },
            { es: 'Piedras y hojas 🪨🍃', eu: 'Harriak eta hostoak 🪨🍃' },
          ],
        },
      },
    ],
  },
  {
    id: 'ds6',
    set: 2,
    emoji: '🌙',
    color: '#00cd9c',
    titleEs: 'La estrella viajera',
    titleEu: 'Izar bidaiaria',
    xpReward: 20,
    steps: [
      { speaker: 'Pato Ventura', avatar: '🦆', es: 'Ya es de noche y la luna blanca ilumina el cielo.', eu: 'Gaua da jada eta ilargi zuriak zerua argitzen du.' },
      { speaker: 'Katu', avatar: '🐱', es: '¡Mira arriba! Una estrella pequeña brilla sobre la montaña.', eu: 'Begira gora! Izar txiki batek mendi gainean distira egiten du.' },
      {
        speaker: 'Pato Ventura',
        avatar: '🦆',
        es: 'Es hora de guardar nuestro libro y descansar en el nido.',
        eu: 'Gure liburua gorde eta habian atseden hartzeko ordua da.',
        quiz: {
          questionEs: '¿Dónde brilla la estrella pequeña?',
          questionEu: 'Non egiten du distira izar txikiak?',
          options: [
            { es: 'Sobre la montaña ⛰️', eu: 'Mendi gainean ⛰️', ok: true },
            { es: 'Dentro del zapato 👟', eu: 'Zapataren barruan 👟' },
          ],
        },
      },
    ],
  },
];

/* ================================================================== */
/* Ligas Semanales estilo Duolingo                                     */
/* ================================================================== */

export interface LeagueTier {
  id: number;
  es: string;
  eu: string;
  color: string;
  badge: string;
}

export const LEAGUES: LeagueTier[] = [
  { id: 0, es: 'Bronce', eu: 'Brontzea', color: '#cd7f32', badge: '🥉' },
  { id: 1, es: 'Plata', eu: 'Zilarra', color: '#9aa7b8', badge: '🥈' },
  { id: 2, es: 'Oro', eu: 'Urrea', color: '#ffc800', badge: '🥇' },
  { id: 3, es: 'Zafiro', eu: 'Zafiroa', color: '#1cb0f6', badge: '💎' },
  { id: 4, es: 'Rubí', eu: 'Errubia', color: '#ff4b4b', badge: '♦️' },
  { id: 5, es: 'Esmeralda', eu: 'Esmeralda', color: '#58cc02', badge: '💚' },
  { id: 6, es: 'Amatista', eu: 'Amatista', color: '#ce82ff', badge: '🔮' },
  { id: 7, es: 'Perla', eu: 'Perla', color: '#ff86d0', badge: '🫧' },
  { id: 8, es: 'Obsidiana', eu: 'Obsidiana', color: '#4b4b4b', badge: '🛡️' },
  { id: 9, es: 'Diamante', eu: 'Diamantea', color: '#00cd9c', badge: '👑' },
];

export interface LeagueRival {
  id: string;
  name: string;
  avatar: string;
  bg: string;
  baseXp: number;
  streak: number;
  langFlag: 'ES' | 'EU' | 'ES+EU';
}

export const LEAGUE_RIVALS: LeagueRival[] = [
  { id: 'r1', name: 'Ane Etxebarria', avatar: '🦊', bg: '#fff0d6', baseXp: 340, streak: 28, langFlag: 'ES+EU' },
  { id: 'r2', name: 'Mikel Agirre', avatar: '🐻', bg: '#ddf4ff', baseXp: 285, streak: 19, langFlag: 'EU' },
  { id: 'r3', name: 'Uxue Lasa', avatar: '🦋', bg: '#f3e5ff', baseXp: 230, streak: 14, langFlag: 'ES+EU' },
  { id: 'r4', name: 'Iker Zabala', avatar: '🐼', bg: '#d7ffb8', baseXp: 190, streak: 11, langFlag: 'EU' },
  { id: 'r5', name: 'Naroa Ruiz', avatar: '🐨', bg: '#ffe6f5', baseXp: 155, streak: 9, langFlag: 'ES' },
  { id: 'r6', name: 'Jon Mendizabal', avatar: '🦁', bg: '#fff7d6', baseXp: 120, streak: 7, langFlag: 'ES+EU' },
  { id: 'r7', name: 'Maialen Otaegi', avatar: '🐰', bg: '#d6fff4', baseXp: 95, streak: 6, langFlag: 'EU' },
  { id: 'r8', name: 'Unai Goikoetxea', avatar: '🐸', bg: '#d7ffb8', baseXp: 70, streak: 5, langFlag: 'ES+EU' },
  { id: 'r9', name: 'Leire Navarro', avatar: '🦉', bg: '#ddf4ff', baseXp: 50, streak: 4, langFlag: 'ES' },
  { id: 'r10', name: 'Aitor Uribe', avatar: '🐯', bg: '#fff0d6', baseXp: 35, streak: 3, langFlag: 'EU' },
  { id: 'r11', name: 'Amaia Kortazar', avatar: '🦄', bg: '#f3e5ff', baseXp: 20, streak: 2, langFlag: 'ES+EU' },
  { id: 'r12', name: 'Gorka Zubia', avatar: '🐧', bg: '#e0eeff', baseXp: 10, streak: 1, langFlag: 'ES' },
];

/* ================================================================== */
/* Tienda & Boutique de Pato Ventura                                   */
/* ================================================================== */

export interface OutfitItem {
  id: OutfitId;
  emoji: string;
  price: number;
  es: { name: string; desc: string };
  eu: { name: string; desc: string };
}

export const OUTFIT_CATALOG: OutfitItem[] = [
  {
    id: 'classic',
    emoji: '🧣',
    price: 0,
    es: { name: 'Pañuelo Turquesa', desc: 'El look clásico de Pato Ventura.' },
    eu: { name: 'Zapi Turkesa', desc: 'Pato Venturaren itxura klasikoa.' },
  },
  {
    id: 'explorer',
    emoji: '🤠',
    price: 120,
    es: { name: 'Sombrero Explorador', desc: 'Listo para recorrer los 6 mundos.' },
    eu: { name: 'Esploratzaile Txapela', desc: '6 munduak zeharkatzeko prest.' },
  },
  {
    id: 'super',
    emoji: '🦸',
    price: 180,
    es: { name: 'Capa Super Pato', desc: 'Capa púrpura de superlector veloz.' },
    eu: { name: 'Super Pato Kapa', desc: 'Super-irakurle azkarraren kapa morea.' },
  },
  {
    id: 'royal',
    emoji: '👑',
    price: 250,
    es: { name: 'Corona Dorada', desc: 'Brilla como una leyenda de las palabras.' },
    eu: { name: 'Urrezko Koroa', desc: 'Distira egin hitzen kondaira bezala.' },
  },
  {
    id: 'cool',
    emoji: '🕶️',
    price: 150,
    es: { name: 'Gafas Estrella', desc: 'Estilo total en cada lección.' },
    eu: { name: 'Izar Betaurrekoak', desc: 'Estilo bikaina ikasgai bakoitzean.' },
  },
];

/* ================================================================== */
/* Logros por niveles (estilo Perfil de Duolingo)                      */
/* ================================================================== */

export interface DuoAchievement {
  id: string;
  emoji: string;
  color: string;
  es: { name: string; desc: string };
  eu: { name: string; desc: string };
  tiers: number[];
  value: (p: Progress) => number;
}

export const DUO_ACHIEVEMENTS: DuoAchievement[] = [
  {
    id: 'wildfire',
    emoji: '🔥',
    color: '#ff9600',
    es: { name: 'En llamas', desc: 'Mantén tu racha de días seguidos' },
    eu: { name: 'Sutan', desc: 'Mantendu eguneko bolada' },
    tiers: [3, 7, 14, 30],
    value: (p) => Math.max(p.streak, p.bestStreak),
  },
  {
    id: 'sage',
    emoji: '⚡',
    color: '#58cc02',
    es: { name: 'Sabio de las palabras', desc: 'Acumula experiencia (XP) leyendo' },
    eu: { name: 'Hitzen jakintsua', desc: 'Metatu esperientzia (XP) irakurriz' },
    tiers: [100, 300, 750, 1500],
    value: (p) => p.xp,
  },
  {
    id: 'scholar',
    emoji: '🎯',
    color: '#1cb0f6',
    es: { name: 'Erudito', desc: 'Suma respuestas correctas en ejercicios' },
    eu: { name: 'Ikasia', desc: 'Lortu erantzun zuzenak ariketetan' },
    tiers: [15, 50, 120, 250],
    value: (p) => p.correctTotal,
  },
  {
    id: 'sharpshooter',
    emoji: '🏹',
    color: '#ce82ff',
    es: { name: 'Francotirador', desc: 'Completa lecciones sin ningún fallo' },
    eu: { name: 'Frankotiratzailea', desc: 'Osatu ikasgaiak akatsik gabe' },
    tiers: [1, 5, 12, 25],
    value: (p) => p.perfectSessions,
  },
  {
    id: 'storylover',
    emoji: '📚',
    color: '#ff86d0',
    es: { name: 'Cuentacuentos', desc: 'Lee cuentos interactivos completos' },
    eu: { name: 'Ipuinlaria', desc: 'Irakurri ipuin interaktibo osoak' },
    tiers: [1, 3, 6],
    value: (p) => p.storiesRead.length,
  },
  {
    id: 'champion',
    emoji: '👑',
    color: '#ffc800',
    es: { name: 'Campeón del camino', desc: 'Completa mundos y desafíos legendarios' },
    eu: { name: 'Bideko txapelduna', desc: 'Osatu munduak eta erronka elezaharrak' },
    tiers: [1, 3, 6],
    value: (p) => Object.values(p.completed).filter(Boolean).length,
  },
];

export interface DailyQuestComputed {
  id: string;
  emoji: string;
  title: string;
  current: number;
  target: number;
  rewardGems: number;
  claimed: boolean;
  done: boolean;
}

export function getDailyQuests(p: Progress, ui: UiLang): DailyQuestComputed[] {
  const q1Target = p.dailyGoal || 20;
  const q1Cur = Math.min(q1Target, p.dailyXp);
  const q2Target = 2;
  const q2Cur = Math.min(q2Target, p.dailyLessons);
  const q3Target = 90;
  const q3Cur = Math.min(q3Target, p.dailyHighAcc);

  return [
    {
      id: 'q-xp',
      emoji: '⚡',
      title: ui === 'eu' ? `Irabazi ${q1Target} XP gaur` : `Gana ${q1Target} XP hoy`,
      current: q1Cur,
      target: q1Target,
      rewardGems: 15,
      claimed: !!p.questClaims['q-xp'],
      done: q1Cur >= q1Target,
    },
    {
      id: 'q-lessons',
      emoji: '🎯',
      title: ui === 'eu' ? 'Osatu 2 ikasgai' : 'Completa 2 lecciones',
      current: q2Cur,
      target: q2Target,
      rewardGems: 20,
      claimed: !!p.questClaims['q-lessons'],
      done: q2Cur >= q2Target,
    },
    {
      id: 'q-acc',
      emoji: '🌟',
      title: ui === 'eu' ? 'Lortu %90+ ikasgai batean' : 'Consigue 90% o más en una lección',
      current: q3Cur,
      target: q3Target,
      rewardGems: 25,
      claimed: !!p.questClaims['q-acc'],
      done: q3Cur >= q3Target,
    },
  ];
}

export function flagLabelFor(learnLang: 'es' | 'eu' | 'both', lang?: Lang): string {
  const code = lang ?? learnLang;
  if (code === 'es') return 'ES';
  if (code === 'eu') return 'EU';
  return 'ES+EU';
}
