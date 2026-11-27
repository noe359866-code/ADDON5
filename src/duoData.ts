import type { Lang, LearnLang, OutfitId, Progress, SyllableStage, UiLang } from './types';

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
  en: string;
  sylEs: string;
  sylEu: string;
  sylEn: string;
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
    tipEs: 'Cada letra tiene su propia voz. En euskera recuerda que la «h» es muda (no suena).',
    tipEu: 'Letra bakoitzak bere ahotsa du. Gogoratu euskaraz «h» letra mutua dela (ez da ahoskatzen).',
    ruleTitleEs: 'Letras especiales: tx, ch, sh, th y la «h» muda vasca',
    ruleTitleEu: 'Letra bereziak: tx, ch, sh, th eta euskarazko «h» mutua',
    ruleBodyEs: 'En euskera «tx» suena como «ch», y la «h» nunca se pronuncia (hiru = iru, behi = bei). En inglés «sh» y «th» unen dos letras en un sonido.',
    ruleBodyEu: 'Euskaraz «tx» eta gaztelaniaz «ch» antzekoak dira, eta «h» ez da inoiz ahoskatzen (hiru = iru, behi = bei). Ingelesez «sh» eta «th» digrafoak dira.',
    phrases: [
      { emoji: '🐶', es: 'perro', eu: 'txakur', en: 'dog', sylEs: 'pe · rro', sylEu: 'txa · kur', sylEn: 'dog' },
      { emoji: '🐦', es: 'pájaro', eu: 'txori', en: 'bird', sylEs: 'pá · ja · ro', sylEu: 'txo · ri', sylEn: 'bird' },
      { emoji: '☀️', es: 'sol', eu: 'eguzki', en: 'sun', sylEs: 'sol', sylEu: 'e · guz · ki', sylEn: 'sun' },
      { emoji: '3️⃣', es: 'tres', eu: 'hiru', en: 'three', sylEs: 'tres', sylEu: 'hi · ru (iru)', sylEn: 'three' },
    ],
  },
  2: {
    unitId: 2,
    tipEs: 'Avanzamos en 3 pasos: 1º Directas (consonante+vocal), 2º Inversas (vocal+consonante) y 3º Trabadas (doble consonante con L o R).',
    tipEu: '3 urratsetan goaz: 1. Zuzenak (kontsonante+bokal), 2. Alderantzizkoak (bokal+kontsonante) eta 3. Trabatutakoak (L edo R-rekin).',
    ruleTitleEs: '1 · Directas → 2 · Inversas → 3 · Trabadas',
    ruleTitleEu: '1 · Zuzenak → 2 · Alderantzizkoak → 3 · Trabatutakoak',
    ruleBodyEs: '1) Directas: «pa · to», «ba · na · na». 2) Inversas: primero suena la vocal («is · la», «is · land»). 3) Trabadas: dos consonantes unidas («pla · to», «dra · gon»).',
    ruleBodyEu: '1) Zuzenak: «ka · tu», «pi · lo · ta». 2) Alderantzizkoak: bokala lehenik («ir · la», «is · pi · lu»). 3) Trabatutakoak: bi kontsonante elkarrekin («pla · ter», «dra · goi»).',
    phrases: [
      { emoji: '🍅', es: 'tomate', eu: 'tomate', en: 'tomato', sylEs: '1·Directa: to·ma·te', sylEu: '1·Zuzena: to·ma·te', sylEn: '1·Open: to·ma·to' },
      { emoji: '🏝️', es: 'isla', eu: 'irla', en: 'island', sylEs: '2·Inversa: is·la', sylEu: '2·Alderantzizkoa: ir·la', sylEn: '2·Inverse: is·land' },
      { emoji: '🍽️', es: 'plato', eu: 'plater', en: 'plate', sylEs: '3·Trabada: pla·to', sylEu: '3·Trabatua: pla·ter', sylEn: '3·Blend: plate' },
      { emoji: '🐉', es: 'dragón', eu: 'dragoi', en: 'dragon', sylEs: '3·Trabada: dra·gón', sylEu: '3·Trabatua: dra·goi', sylEn: '3·Blend: dra·gon' },
    ],
  },
  3: {
    unitId: 3,
    tipEs: 'Conecta cada palabra funcional con su dibujo y su sonido: emociones, el cole, la ropa, los días y los meses.',
    tipEu: 'Lotu hitz funtzional bakoitza bere marrazkiarekin eta soinuarekin: emozioak, eskola, arropa, egunak eta hilabeteak.',
    ruleTitleEs: 'Temas del día a día: emociones, cole, ropa, días y meses',
    ruleTitleEu: 'Eguneroko gaiak: emozioak, eskola, arropa, egunak eta hilabeteak',
    ruleBodyEs: 'Agrupar palabras cotidianas por temas (emociones, ropa, el cole, días de la semana y meses) ayuda a leer y expresarse en Infantil y Primaria.',
    ruleBodyEu: 'Eguneroko hitzak gaien arabera biltzeak (emozioak, arropa, eskola, asteko egunak eta hilabeteak) Haur eta Lehen Hezkuntzan irakurtzen laguntzen du.',
    phrases: [
      { emoji: '😄', es: 'feliz', eu: 'pozik', en: 'glad', sylEs: 'fe · liz', sylEu: 'po · zik', sylEn: 'glad' },
      { emoji: '🎒', es: 'mochila', eu: 'motxila', en: 'backpack', sylEs: 'mo · chi · la', sylEu: 'mo · txi · la', sylEn: 'back · pack' },
      { emoji: '🧥', es: 'abrigo', eu: 'beroki', en: 'coat', sylEs: 'a · bri · go', sylEu: 'be · ro · ki', sylEn: 'coat' },
      { emoji: '📅', es: 'lunes', eu: 'astelehena', en: 'monday', sylEs: 'lu · nes', sylEu: 'as · te · le · he · na', sylEn: 'mon · day' },
    ],
  },
  4: {
    unitId: 4,
    tipEs: 'Dos palabras riman cuando su final canta igual: «gato / pato», «txori / hori», «cat / hat».',
    tipEu: 'Bi hitzek errima egiten dute amaierak berdin abesten duenean: «txori / hori», «cat / hat».',
    ruleTitleEs: 'Entrena el oído con pares parecidos',
    ruleTitleEu: 'Entrenatu belarria antzeko bikoteekin',
    ruleBodyEs: 'Fíjate en la letra que cambia: «casa» frente a «taza», «katu» frente a «zapatu», o «tree» frente a «bee».',
    ruleBodyEu: 'Begiratu aldatzen den letrari: «sagar / adar», «lore / kolore» edo «cat / hat».',
    phrases: [
      { emoji: '🐱', es: 'gato · pato', eu: 'txori · hori', en: 'cat · hat', sylEs: 'ga·to / pa·to', sylEu: 'txo·ri / o·ri', sylEn: 'cat / hat' },
      { emoji: '⭐', es: 'estrella · botella', eu: 'sagar · izar', en: 'star · car', sylEs: 'es·tre·lla', sylEu: 'sa·gar / i·zar', sylEn: 'star / car' },
      { emoji: '🌸', es: 'flor · color', eu: 'lore · kolore', en: 'tree · bee', sylEs: 'flor / co·lor', sylEu: 'lo·re / ko·lo·re', sylEn: 'tree / bee' },
      { emoji: '🌙', es: 'luna · cuna', eu: 'urdin · egin', en: 'moon · spoon', sylEs: 'lu·na / cu·na', sylEu: 'ur·din / e·gin', sylEn: 'moon / spoon' },
    ],
  },
  5: {
    unitId: 5,
    tipEs: 'Una frase cuenta una pequeña película: quién hace algo y qué ocurre.',
    tipEu: 'Esaldi batek film txiki bat kontatzen du: nork egiten duen zerbait eta zer gertatzen den.',
    ruleTitleEs: 'El orden de las palabras en ES, EU y EN',
    ruleTitleEu: 'Hitzen ordena ES, EU eta EN hizkuntzetan',
    ruleBodyEs: 'En castellano e inglés el verbo va en medio («El gato bebe leche» / «The cat drinks milk»); en euskera suele ir al final («Katuak esnea edaten du»).',
    ruleBodyEu: 'Gaztelaniaz eta ingelesez aditza erdian doa («The cat drinks milk»); euskaraz amaieran («Katuak esnea edaten du»).',
    phrases: [
      { emoji: '🐱🥛', es: 'El gato bebe leche', eu: 'Katuak esnea edaten du', en: 'The cat drinks milk', sylEs: '4 palabras', sylEu: '4 hitz', sylEn: '4 words' },
      { emoji: '☀️', es: 'El sol brilla hoy', eu: 'Eguzkiak gaur distira egiten du', en: 'The sun shines today', sylEs: '4 palabras', sylEu: '5 hitz', sylEn: '4 words' },
      { emoji: '🐶🌳', es: 'El perro corre al árbol', eu: 'Txakurra zuhaitzera korrika doa', en: 'The dog runs to trees', sylEs: '5 palabras', sylEu: '4 hitz', sylEn: '5 words' },
      { emoji: '🌙', es: 'La luna es blanca', eu: 'Ilargia zuria da', en: 'The moon is white', sylEs: '4 palabras', sylEu: '3 hitz', sylEn: '4 words' },
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
      { emoji: '🐦☀️', es: 'El pájaro canta en el árbol.', eu: 'Txoriak zuhaitzean abesten du.', en: 'The bird sings in the tree.', sylEs: '¿Quién canta?', sylEu: 'Nork abesten du?', sylEn: 'Who sings?' },
      { emoji: '🦋🌸', es: 'La mariposa vuela sobre la flor.', eu: 'Tximeleta lorearen gainean hegan dabil.', en: 'The butterfly flies over the flower.', sylEs: '¿Dónde vuela?', sylEu: 'Non dabil?', sylEn: 'Where?' },
      { emoji: '📖🔵', es: 'Leemos un libro azul.', eu: 'Liburu urdin bat irakurtzen dugu.', en: 'We read a blue book.', sylEs: '¿Qué color?', sylEu: 'Zer kolore?', sylEn: 'What color?' },
      { emoji: '🌙🦆', es: 'Pato Ventura duerme en su nido.', eu: 'Pato Ventura habian lokartzen da.', en: 'Pato Ventura sleeps in his nest.', sylEs: '¿Dónde duerme?', sylEu: 'Non lokartzen da?', sylEn: 'Where?' },
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
  exampleEn: string;
  emoji: string;
  audioEs: string;
  audioEu: string;
  audioEn: string;
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
      { id: 'sd-ma', symbol: 'ma', exampleEs: 'ma·no', exampleEu: 'ma·hai', exampleEn: 'to·ma·to', emoji: '✋', audioEs: 'ma, mano', audioEu: 'ma, mahai', audioEn: 'ma, tomato' },
      { id: 'sd-pa', symbol: 'pa / ba', exampleEs: 'pa·to', exampleEu: 'za·pa·ta', exampleEn: 'ba·na·na', emoji: '🦆', audioEs: 'pa, pato', audioEu: 'pa, zapata', audioEn: 'ba, banana' },
      { id: 'sd-lu', symbol: 'lu / po', exampleEs: 'lu·na', exampleEu: 'is·pi·lu', exampleEn: 'po·ta·to', emoji: '🌙', audioEs: 'lu, luna', audioEu: 'lu, ispilu', audioEn: 'po, potato' },
      { id: 'sd-so', symbol: 'so', exampleEs: 'so·pa', exampleEu: 'it·sa·so', exampleEn: 'so·fa', emoji: '🥣', audioEs: 'so, sopa', audioEu: 'so, itsaso', audioEn: 'so, sofa' },
      { id: 'sd-to', symbol: 'to', exampleEs: 'to·ma·te', exampleEu: 'to·ma·te', exampleEn: 'to·ma·to', emoji: '🍅', audioEs: 'to, tomate', audioEu: 'to, tomate', audioEn: 'to, tomato' },
      { id: 'sd-pe', symbol: 'pe / ti', exampleEs: 'pe·lo·ta', exampleEu: 'pi·lo·ta', exampleEn: 'ti·ger', emoji: '⚽', audioEs: 'pe, pelota', audioEu: 'pi, pilota', audioEn: 'ti, tiger' },
      { id: 'sd-ka', symbol: 'ka / ca', exampleEs: 'ca·sa', exampleEu: 'ka·tu', exampleEn: 'ca·bin', emoji: '🐱', audioEs: 'ca, casa', audioEu: 'ka, katu', audioEn: 'cat' },
      { id: 'sd-lo', symbol: 'lo / ze', exampleEs: 'pe·lo·ta', exampleEu: 'lo·re', exampleEn: 'ze·bra', emoji: '🌸', audioEs: 'lo, pelota', audioEu: 'lo, lore', audioEn: 'ze, zebra' },
    ],
  },
  {
    id: 'syllables-inverse',
    stage: 2,
    titleEs: '2 · Sílabas Inversas (VC)',
    titleEu: '2 · Alderantzizko Silabak (VC)',
    subEs: 'Paso 2: Primero suena la vocal y después cierra la consonante (al, ar, an, es, in…).',
    subEu: '2. urratsa: Bokala entzuten da lehenik eta kontsonanteak ixten du (al, ar, an, es, in…).',
    cards: [
      { id: 'si-is', symbol: 'is / ir', exampleEs: 'is·la', exampleEu: 'ir·la', exampleEn: 'is·land', emoji: '🏝️', audioEs: 'is, isla', audioEu: 'ir, irla', audioEn: 'island' },
      { id: 'si-es', symbol: 'es / ap', exampleEs: 'es·pe·jo', exampleEu: 'es·ko·la', exampleEn: 'ap·ple', emoji: '🪞', audioEs: 'es, espejo', audioEu: 'es, eskola', audioEn: 'apple' },
      { id: 'si-ar', symbol: 'ar', exampleEs: 'ar·co', exampleEu: 'ar·ku', exampleEn: 'ar·row', emoji: '🏹', audioEs: 'ar, arco', audioEu: 'ar, arku', audioEn: 'arrow' },
      { id: 'si-an', symbol: 'an', exampleEs: 'an·te·na', exampleEu: 'an·te·na', exampleEn: 'an·ten·na', emoji: '📡', audioEs: 'an, antena', audioEu: 'an, antena', audioEn: 'antenna' },
      { id: 'si-in', symbol: 'in', exampleEs: 'in·sec·to', exampleEu: 'in·tsek·tu', exampleEn: 'in·sect', emoji: '🐞', audioEs: 'in, insecto', audioEu: 'in, intsektu', audioEn: 'insect' },
      { id: 'si-ez', symbol: 'es / ez', exampleEs: 'es·pa·da', exampleEu: 'ez·pa·ta', exampleEn: 'up', emoji: '⚔️', audioEs: 'es, espada', audioEu: 'ez, ezpata', audioEn: 'up' },
      { id: 'si-ur', symbol: 'ár / ur', exampleEs: 'ár·bol', exampleEu: 'ur·din', exampleEn: 'o·range', emoji: '🌳', audioEs: 'ar, árbol', audioEu: 'ur, urdin', audioEn: 'orange' },
      { id: 'si-am', symbol: 'am / an', exampleEs: 'am·bu·lan·cia', exampleEu: 'an·bu·lan·tzi·a', exampleEn: 'am·bu·lance', emoji: '🚑', audioEs: 'am, ambulancia', audioEu: 'an, anbulantzia', audioEn: 'ambulance' },
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
      { id: 'st-pla', symbol: 'pla', exampleEs: 'pla·to', exampleEu: 'pla·ter', exampleEn: 'plate', emoji: '🍽️', audioEs: 'pla, plato', audioEu: 'pla, plater', audioEn: 'plate' },
      { id: 'st-blu', symbol: 'blu / blo', exampleEs: 'blu·sa', exampleEu: 'blu·sa', exampleEn: 'blouse', emoji: '👚', audioEs: 'blu, blusa', audioEu: 'blu, blusa', audioEn: 'blouse' },
      { id: 'st-cle', symbol: 'cle / kle', exampleEs: 'bi·ci·cle·ta', exampleEu: 'bi·zi·kle·ta', exampleEn: 'bi·cy·cle', emoji: '🚲', audioEs: 'cle, bicicleta', audioEu: 'kle, bizikleta', audioEn: 'bicycle' },
      { id: 'st-fla', symbol: 'fla / flo', exampleEs: 'flan', exampleEu: 'fla·na', exampleEn: 'flo·wer', emoji: '🍮', audioEs: 'flan', audioEu: 'fla, flana', audioEn: 'flower' },
      { id: 'st-glo', symbol: 'glo / gre', exampleEs: 'glo·bo', exampleEu: 'glo·bo', exampleEn: 'green', emoji: '🎈', audioEs: 'glo, globo', audioEu: 'glo, globo', audioEn: 'green' },
      { id: 'st-bra', symbol: 'bra', exampleEs: 'ce·bra', exampleEu: 'ze·bra', exampleEn: 'ze·bra', emoji: '🦓', audioEs: 'bra, cebra', audioEu: 'bra, zebra', audioEn: 'zebra' },
      { id: 'st-dri', symbol: 'dri / cro', exampleEs: 'co·co·dri·lo', exampleEu: 'kro·ko·di·lo', exampleEn: 'cro·co·dile', emoji: '🐊', audioEs: 'dri, cocodrilo', audioEu: 'kro, krokodilo', audioEn: 'crocodile' },
      { id: 'st-dra', symbol: 'dra', exampleEs: 'dra·gón', exampleEu: 'dra·goi', exampleEn: 'dra·gon', emoji: '🐉', audioEs: 'dra, dragón', audioEu: 'dra, dragoi', audioEn: 'dragon' },
      { id: 'st-fru', symbol: 'fru', exampleEs: 'fru·ta', exampleEu: 'fru·ta', exampleEn: 'fruit', emoji: '🍓', audioEs: 'fru, fruta', audioEu: 'fru, fruta', audioEn: 'fruit' },
      { id: 'st-gre', symbol: 'gre / tre', exampleEs: 'ti·gre', exampleEu: 'ti·gre', exampleEn: 'tree', emoji: '🐯', audioEs: 'gre, tigre', audioEu: 'gre, tigre', audioEn: 'tree' },
      { id: 'st-pri', symbol: 'prin', exampleEs: 'prin·ce·sa', exampleEu: 'prin·tze·sa', exampleEn: 'prin·cess', emoji: '👑', audioEs: 'prin, princesa', audioEu: 'prin, printzesa', audioEn: 'princess' },
      { id: 'st-tra', symbol: 'tra', exampleEs: 'trac·tor', exampleEu: 'trak·to·re', exampleEn: 'trac·tor', emoji: '🚜', audioEs: 'trac, tractor', audioEu: 'trak, traktore', audioEn: 'tractor' },
    ],
  },
  {
    id: 'vowels',
    titleEs: 'Las 5 Vocales',
    titleEu: '5 Bokalak',
    subEs: 'Escucha cómo suenan las vocales en cada idioma.',
    subEu: 'Entzun nola ahoskatzen diren bokalak hizkuntza bakoitzean.',
    cards: [
      { id: 'v-a', symbol: 'a', exampleEs: 'agua', exampleEu: 'ate', exampleEn: 'apple', emoji: '💧', audioEs: 'a, agua', audioEu: 'a, ate', audioEn: 'apple' },
      { id: 'v-e', symbol: 'e', exampleEs: 'estrella', exampleEu: 'etxe', exampleEn: 'tree', emoji: '⭐', audioEs: 'e, estrella', audioEu: 'e, etxe', audioEn: 'tree' },
      { id: 'v-i', symbol: 'i', exampleEs: 'isla', exampleEu: 'izar', exampleEn: 'insect', emoji: '🏝️', audioEs: 'i, isla', audioEu: 'i, izar', audioEn: 'insect' },
      { id: 'v-o', symbol: 'o', exampleEs: 'ojo', exampleEu: 'ogi', exampleEn: 'orange', emoji: '👁️', audioEs: 'o, ojo', audioEu: 'o, ogi', audioEn: 'orange' },
      { id: 'v-u', symbol: 'u', exampleEs: 'uno', exampleEu: 'ur', exampleEn: 'sun', emoji: '1️⃣', audioEs: 'u, uno', audioEu: 'u, ur', audioEn: 'sun' },
    ],
  },
  {
    id: 'basque-special',
    titleEs: 'Sonidos del Euskera (¡H muda!)',
    titleEu: 'Euskararen Soinuak (H mutua!)',
    subEs: 'Dígrafos vascos y la H muda: se escribe pero nunca se pronuncia.',
    subEu: 'Euskal digrafoak eta H mutua: idatzi bai, baina ez da ahoskatzen.',
    cards: [
      { id: 'eu-h', symbol: 'h (muda)', exampleEs: 'h silenciosa', exampleEu: 'hiru → iru', exampleEn: 'silent h', emoji: '🤫', audioEs: 'iru', audioEu: 'hiru', audioEn: 'iru' },
      { id: 'eu-tx', symbol: 'tx', exampleEs: 'como «ch»', exampleEu: 'txakur', exampleEn: 'like ch', emoji: '🐶', audioEs: 'txakur', audioEu: 'txakur', audioEn: 'chocolate' },
      { id: 'eu-tz', symbol: 'tz', exampleEs: 'sonido vibrante', exampleEu: 'giltza', exampleEn: 'tz', emoji: '🔑', audioEs: 'giltza', audioEu: 'giltza', audioEn: 'key' },
      { id: 'eu-ts', symbol: 'ts', exampleEs: 'suave silbante', exampleEu: 'itsaso', exampleEn: 'ts', emoji: '🌊', audioEs: 'itsaso', audioEu: 'itsaso', audioEn: 'sea' },
      { id: 'eu-rr', symbol: 'rr', exampleEs: 'erre fuerte', exampleEu: 'harri → arri', exampleEn: 'stone', emoji: '🪨', audioEs: 'arri', audioEu: 'harri', audioEn: 'stone' },
      { id: 'eu-z', symbol: 'z', exampleEs: 'ese suave', exampleEu: 'zuhaitz → zuaitz', exampleEn: 'tree', emoji: '🌳', audioEs: 'zuaitz', audioEu: 'zuhaitz', audioEn: 'tree' },
    ],
  },
  {
    id: 'spanish-english-special',
    titleEs: 'Dígrafos de Castellano e Inglés',
    titleEu: 'Gaztelaniaren eta Ingelesaren Digrafoak',
    subEs: 'Parejas de letras especiales en español (ch, ll, ñ, qu) e inglés (sh, th, oo, ee).',
    subEu: 'Letra-bikote bereziak gaztelaniaz (ch, ll, ñ, qu) eta ingelesez (sh, th, oo, ee).',
    cards: [
      { id: 'es-ch', symbol: 'ch', exampleEs: 'chocolate', exampleEu: 'txokolate', exampleEn: 'cheese', emoji: '🍫', audioEs: 'chocolate', audioEu: 'txokolate', audioEn: 'cheese' },
      { id: 'es-ll', symbol: 'll / sh', exampleEs: 'llave', exampleEu: 'giltza', exampleEn: 'shoe', emoji: '👟', audioEs: 'llave', audioEu: 'giltza', audioEn: 'shoe' },
      { id: 'es-ny', symbol: 'ñ / th', exampleEs: 'niño', exampleEu: 'haur', exampleEn: 'three', emoji: '3️⃣', audioEs: 'niño', audioEu: 'haur', audioEn: 'three' },
      { id: 'es-qu', symbol: 'qu / sq', exampleEs: 'queso', exampleEu: 'gazta', exampleEn: 'squirrel', emoji: '🐿️', audioEs: 'queso', audioEu: 'gazta', audioEn: 'squirrel' },
      { id: 'en-oo', symbol: 'oo', exampleEs: 'luna', exampleEu: 'ilargi', exampleEn: 'moon · book', emoji: '🌙', audioEs: 'luna', audioEu: 'ilargi', audioEn: 'moon, book' },
      { id: 'en-ee', symbol: 'ee', exampleEs: 'árbol', exampleEu: 'zuhaitz', exampleEn: 'tree · green', emoji: '🌳', audioEs: 'árbol', audioEu: 'zuhaitz', audioEn: 'tree, green' },
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
  en: string;
  quiz?: {
    questionEs: string;
    questionEu: string;
    questionEn: string;
    options: { es: string; eu: string; en: string; ok?: boolean }[];
  };
}

export interface DuoStory {
  id: string;
  set: number;
  emoji: string;
  color: string;
  titleEs: string;
  titleEu: string;
  titleEn: string;
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
    titleEn: "Pato Ventura's Breakfast",
    xpReward: 20,
    steps: [
      {
        speaker: 'Pato Ventura',
        avatar: '🦆',
        es: '¡Buenos días, Katu! Tengo mucha hambre.',
        eu: 'Egun on, Katu! Gose handia daukat.',
        en: 'Good morning, Katu! I am very hungry.',
      },
      {
        speaker: 'Katu',
        avatar: '🐱',
        es: '¡Hola! En la mesa hay pan y queso.',
        eu: 'Kaixo! Mahaian ogia eta gazta daude.',
        en: 'Hello! On the table there is bread and cheese.',
      },
      {
        speaker: 'Pato Ventura',
        avatar: '🦆',
        es: '¡Qué rico! ¿Y hay una manzana roja?',
        eu: 'Ze goxoa! Eta ba al dago sagar gorri bat?',
        en: 'Yummy! And is there a red apple?',
        quiz: {
          questionEs: '¿Qué busca Pato Ventura ahora?',
          questionEu: 'Zer bilatzen du Pato Venturak orain?',
          questionEn: 'What is Pato Ventura looking for now?',
          options: [
            { es: 'Una manzana roja 🍎', eu: 'Sagar gorri bat 🍎', en: 'A red apple 🍎', ok: true },
            { es: 'Un zapato azul 👟', eu: 'Zapata urdin bat 👟', en: 'A blue shoe 👟' },
            { es: 'Una piedra grande 🪨', eu: 'Harri handi bat 🪨', en: 'A big stone 🪨' },
          ],
        },
      },
      {
        speaker: 'Katu',
        avatar: '🐱',
        es: '¡Sí! Toma la manzana y un vaso de leche.',
        eu: 'Bai! Hartu sagarra eta baso bat esne.',
        en: 'Yes! Take the apple and a glass of milk.',
      },
      {
        speaker: 'Pato Ventura',
        avatar: '🦆',
        es: '¡Gracias, amigo! Ahora vamos a leer juntos.',
        eu: 'Eskerrik asko, lagun! Orain goazen elkarrekin irakurtzera.',
        en: 'Thank you, friend! Now let us read together.',
        quiz: {
          questionEs: '¿Qué van a hacer después de desayunar?',
          questionEu: 'Zer egingo dute gosaldu ondoren?',
          questionEn: 'What are they going to do after breakfast?',
          options: [
            { es: 'Leer juntos 📖', eu: 'Elkarrekin irakurri 📖', en: 'Read together 📖', ok: true },
            { es: 'Dormir de noche 🌙', eu: 'Gauez lo egin 🌙', en: 'Sleep at night 🌙' },
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
    titleEn: 'The Lost Key',
    xpReward: 20,
    steps: [
      {
        speaker: 'Naroa',
        avatar: '🧒',
        es: '¡Oh, no! No encuentro la llave de casa.',
        eu: 'Oi, ez! Ez dut etxeko giltza aurkitzen.',
        en: 'Oh no! I cannot find the house key.',
      },
      {
        speaker: 'Txakur',
        avatar: '🐶',
        es: '¡Guau! ¿Está encima de la mesa?',
        eu: 'Zaunk! Mahai gainean al dago?',
        en: 'Woof! Is it on the table?',
      },
      {
        speaker: 'Naroa',
        avatar: '🧒',
        es: 'No, en la mesa solo hay un libro azul.',
        eu: 'Ez, mahaian liburu urdin bat besterik ez dago.',
        en: 'No, on the table there is only a blue book.',
        quiz: {
          questionEs: '¿Qué hay encima de la mesa?',
          questionEu: 'Zer dago mahai gainean?',
          questionEn: 'What is on the table?',
          options: [
            { es: 'Un libro azul 📖', eu: 'Liburu urdin bat 📖', en: 'A blue book 📖', ok: true },
            { es: 'La llave 🔑', eu: 'Giltza 🔑', en: 'The key 🔑' },
            { es: 'Un pescado 🐟', eu: 'Arrain bat 🐟', en: 'A fish 🐟' },
          ],
        },
      },
      {
        speaker: 'Txakur',
        avatar: '🐶',
        es: '¡Mira junto a la flor amarilla en el jardín!',
        eu: 'Begiratu lorategiko lore horiaren ondoan!',
        en: 'Look next to the yellow flower in the garden!',
      },
      {
        speaker: 'Naroa',
        avatar: '🧒',
        es: '¡Aquí está la llave! ¡Buen perro, Txakur!',
        eu: 'Hemen dago giltza! Txakur ona, Txakur!',
        en: 'Here is the key! Good dog, Txakur!',
        quiz: {
          questionEs: '¿Dónde estaba la llave?',
          questionEu: 'Non zegoen giltza?',
          questionEn: 'Where was the key?',
          options: [
            { es: 'Junto a la flor amarilla 🌸', eu: 'Lore horiaren ondoan 🌸', en: 'Next to the yellow flower 🌸', ok: true },
            { es: 'En la escuela 🏫', eu: 'Eskolan 🏫', en: 'At school 🏫' },
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
    titleEn: 'A Concert in the Tree',
    xpReward: 20,
    steps: [
      {
        speaker: 'Txori',
        avatar: '🐦',
        es: 'El sol brilla mucho hoy en la montaña.',
        eu: 'Eguzkiak distira handia egiten du gaur mendian.',
        en: 'The sun shines brightly today on the mountain.',
      },
      {
        speaker: 'Tximeleta',
        avatar: '🦋',
        es: '¡Hola, Txori! Me encanta escuchar tu canción.',
        eu: 'Kaixo, Txori! Asko gustatzen zait zure abestia entzutea.',
        en: 'Hello, Txori! I love listening to your song.',
      },
      {
        speaker: 'Txori',
        avatar: '🐦',
        es: '¡Canta y baila conmigo en el árbol grande!',
        eu: 'Abestu eta dantzatu nirekin zuhaitz handian!',
        en: 'Sing and dance with me in the big tree!',
        quiz: {
          questionEs: '¿Dónde están Txori y la mariposa?',
          questionEu: 'Non daude Txori eta tximeleta?',
          questionEn: 'Where are Txori and the butterfly?',
          options: [
            { es: 'En el árbol grande 🌳', eu: 'Zuhaitz handian 🌳', en: 'In the big tree 🌳', ok: true },
            { es: 'Debajo del mar 🌊', eu: 'Itsaso azpian 🌊', en: 'Under the sea 🌊' },
          ],
        },
      },
      {
        speaker: 'Pato Ventura',
        avatar: '🦆',
        es: '¡Cuac! ¡Yo llevo el ritmo dando tres palmadas!',
        eu: 'Kuak! Nik erritmoa eramango dut hiru txalo eginez!',
        en: 'Quack! I keep the beat with three claps!',
      },
    ],
  },
  {
    id: 'ds4',
    set: 2,
    emoji: '🌊',
    color: '#ce82ff',
    titleEs: 'Viaje al mar azul',
    titleEu: 'Bidaia itsaso urdinera',
    titleEn: 'Trip to the Blue Sea',
    xpReward: 20,
    steps: [
      {
        speaker: 'Pato Ventura',
        avatar: '🦆',
        es: '¡Mira qué grande es el mar azul!',
        eu: 'Begira zein handia den itsaso urdina!',
        en: 'Look how big the blue sea is!',
      },
      {
        speaker: 'Arrain',
        avatar: '🐟',
        es: '¡Hola! En el agua nadamos cinco peces amigos.',
        eu: 'Kaixo! Uretan bost arrain lagun igerian gabiltza.',
        en: 'Hello! Five friendly fish swim in the water.',
      },
      {
        speaker: 'Pato Ventura',
        avatar: '🦆',
        es: '¡Uno, dos, tres, cuatro y cinco! ¡Qué rápidos!',
        eu: 'Bat, bi, hiru, lau eta bost! Zein azkarrak!',
        en: 'One, two, three, four and five! So fast!',
        quiz: {
          questionEs: '¿Cuántos peces nadan en el agua?',
          questionEu: 'Zenbat arrain dabiltza uretan?',
          questionEn: 'How many fish swim in the water?',
          options: [
            { es: 'Cinco (5) 🐟', eu: 'Bost (5) 🐟', en: 'Five (5) 🐟', ok: true },
            { es: 'Dos (2) 🐟', eu: 'Bi (2) 🐟', en: 'Two (2) 🐟' },
          ],
        },
      },
      {
        speaker: 'Arrain',
        avatar: '🐟',
        es: 'El viento suave hace olas blancas.',
        eu: 'Haize leunak olatu zuriak egiten ditu.',
        en: 'The gentle wind makes white waves.',
      },
    ],
  },
  {
    id: 'ds5',
    set: 2,
    emoji: '🍫',
    color: '#ff86d0',
    titleEs: 'La merienda secreta',
    titleEu: 'Askari sekretua',
    titleEn: 'The Secret Snack',
    xpReward: 20,
    steps: [
      {
        speaker: 'Hartz',
        avatar: '🐻',
        es: 'Hoy vienen mis amigos a casa para merendar.',
        eu: 'Gaur nire lagunak etxera datoz askaltzera.',
        en: 'Today my friends come home for a snack.',
      },
      {
        speaker: 'Naroa',
        avatar: '🧒',
        es: 'Yo traigo chocolate y pan recién hecho.',
        eu: 'Nik txokolatea eta ogi berria dakartzat.',
        en: 'I bring chocolate and fresh bread.',
      },
      {
        speaker: 'Hartz',
        avatar: '🐻',
        es: '¡Qué bien huele! Ponemos cuatro platos en la mesa.',
        eu: 'Ze usain goxoa! Lau plater jarriko ditugu mahaian.',
        en: 'It smells great! We put four plates on the table.',
        quiz: {
          questionEs: '¿Qué trae Naroa para merendar?',
          questionEu: 'Zer dakar Naroak askaltzeko?',
          questionEn: 'What does Naroa bring for the snack?',
          options: [
            { es: 'Chocolate y pan 🍫🍞', eu: 'Txokolatea eta ogia 🍫🍞', en: 'Chocolate and bread 🍫🍞', ok: true },
            { es: 'Piedras y hojas 🪨🍃', eu: 'Harriak eta hostoak 🪨🍃', en: 'Stones and leaves 🪨🍃' },
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
    titleEn: 'The Traveling Star',
    xpReward: 20,
    steps: [
      {
        speaker: 'Pato Ventura',
        avatar: '🦆',
        es: 'Ya es de noche y la luna blanca ilumina el cielo.',
        eu: 'Gaua da jada eta ilargi zuriak zerua argitzen du.',
        en: 'It is night now and the white moon lights up the sky.',
      },
      {
        speaker: 'Katu',
        avatar: '🐱',
        es: '¡Mira arriba! Una estrella pequeña brilla sobre la montaña.',
        eu: 'Begira gora! Izar txiki batek mendi gainean distira egiten du.',
        en: 'Look up! A little star shines over the mountain.',
      },
      {
        speaker: 'Pato Ventura',
        avatar: '🦆',
        es: 'Es hora de guardar nuestro libro y descansar en el nido.',
        eu: 'Gure liburua gorde eta habian atseden hartzeko ordua da.',
        en: 'It is time to put away our book and rest in the nest.',
        quiz: {
          questionEs: '¿Dónde brilla la estrella pequeña?',
          questionEu: 'Non egiten du distira izar txikiak?',
          questionEn: 'Where does the little star shine?',
          options: [
            { es: 'Sobre la montaña ⛰️', eu: 'Mendi gainean ⛰️', en: 'Over the mountain ⛰️', ok: true },
            { es: 'Dentro del zapato 👟', eu: 'Zapataren barruan 👟', en: 'Inside the shoe 👟' },
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
  langFlag: 'ES' | 'EU' | 'EN' | 'ES+EU';
}

export const LEAGUE_RIVALS: LeagueRival[] = [
  { id: 'r1', name: 'Ane Etxebarria', avatar: '🦊', bg: '#fff0d6', baseXp: 340, streak: 28, langFlag: 'ES+EU' },
  { id: 'r2', name: 'Mikel Agirre', avatar: '🐻', bg: '#ddf4ff', baseXp: 285, streak: 19, langFlag: 'EU' },
  { id: 'r3', name: 'Uxue Lasa', avatar: '🦋', bg: '#f3e5ff', baseXp: 230, streak: 14, langFlag: 'EN' },
  { id: 'r4', name: 'Iker Zabala', avatar: '🐼', bg: '#d7ffb8', baseXp: 190, streak: 11, langFlag: 'EU' },
  { id: 'r5', name: 'Naroa Ruiz', avatar: '🐨', bg: '#ffe6f5', baseXp: 155, streak: 9, langFlag: 'ES' },
  { id: 'r6', name: 'Jon Mendizabal', avatar: '🦁', bg: '#fff7d6', baseXp: 120, streak: 7, langFlag: 'ES+EU' },
  { id: 'r7', name: 'Maialen Otaegi', avatar: '🐰', bg: '#d6fff4', baseXp: 95, streak: 6, langFlag: 'EN' },
  { id: 'r8', name: 'Unai Goikoetxea', avatar: '🐸', bg: '#d7ffb8', baseXp: 70, streak: 5, langFlag: 'ES+EU' },
  { id: 'r9', name: 'Leire Navarro', avatar: '🦉', bg: '#ddf4ff', baseXp: 50, streak: 4, langFlag: 'ES' },
  { id: 'r10', name: 'Aitor Uribe', avatar: '🐯', bg: '#fff0d6', baseXp: 35, streak: 3, langFlag: 'EU' },
  { id: 'r11', name: 'Amaia Kortazar', avatar: '🦄', bg: '#f3e5ff', baseXp: 20, streak: 2, langFlag: 'EN' },
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

export function flagLabelFor(learnLang: LearnLang, lang?: Lang): string {
  const code = lang ?? learnLang;
  if (code === 'es') return 'ES';
  if (code === 'eu') return 'EU';
  if (code === 'en') return 'EN';
  return 'ES+EU';
}
