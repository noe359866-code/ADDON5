'use strict';

// Stremio espera "lang" como código ISO 639-2 de 3 letras ("eng", "spa"...).
// Los proveedores devuelven nombres ("Spanish") o códigos de 2 letras ("es"),
// así que normalizamos todo a ISO 639-2. Si no reconocemos el idioma,
// devolvemos el texto tal cual (Stremio lo mostrará como etiqueta).
const BY_NAME_OR_CODE = {
  english: 'eng', en: 'eng', eng: 'eng',
  spanish: 'spa', es: 'spa', spa: 'spa',
  'spanish (latin america)': 'spa', 'spanish-latin': 'spa',
  portuguese: 'por', pt: 'por', por: 'por',
  'portuguese (brazil)': 'por', 'pt-br': 'por',
  french: 'fre', fr: 'fre', fra: 'fre', fre: 'fre',
  german: 'ger', de: 'ger', deu: 'ger', ger: 'ger',
  italian: 'ita', it: 'ita', ita: 'ita',
  dutch: 'dut', nl: 'dut', nld: 'dut', dut: 'dut',
  arabic: 'ara', ar: 'ara', ara: 'ara',
  russian: 'rus', ru: 'rus', rus: 'rus',
  turkish: 'tur', tr: 'tur', tur: 'tur',
  polish: 'pol', pl: 'pol', pol: 'pol',
  romanian: 'rum', ro: 'rum', ron: 'rum', rum: 'rum',
  greek: 'gre', el: 'gre', ell: 'gre', gre: 'gre',
  hebrew: 'heb', he: 'heb', heb: 'heb',
  persian: 'per', fa: 'per', fas: 'per', per: 'per',
  hindi: 'hin', hi: 'hin', hin: 'hin',
  indonesian: 'ind', id: 'ind', ind: 'ind',
  malay: 'may', ms: 'may', msa: 'may', may: 'may',
  vietnamese: 'vie', vi: 'vie', vie: 'vie',
  thai: 'tha', th: 'tha', tha: 'tha',
  korean: 'kor', ko: 'kor', kor: 'kor',
  japanese: 'jpn', ja: 'jpn', jpn: 'jpn',
  chinese: 'chi', zh: 'chi', zho: 'chi', chi: 'chi',
  czech: 'cze', cs: 'cze', ces: 'cze', cze: 'cze',
  hungarian: 'hun', hu: 'hun', hun: 'hun',
  swedish: 'swe', sv: 'swe', swe: 'swe',
  danish: 'dan', da: 'dan', dan: 'dan',
  norwegian: 'nor', no: 'nor', nor: 'nor',
  finnish: 'fin', fi: 'fin', fin: 'fin',
  croatian: 'hrv', hr: 'hrv', hrv: 'hrv',
  serbian: 'scc', sr: 'scc',
  bulgarian: 'bul', bg: 'bul', bul: 'bul',
  ukrainian: 'ukr', uk: 'ukr', ukr: 'ukr'
};

function toIso6392(value) {
  if (!value || typeof value !== 'string') return 'und'; // undetermined
  const key = value.trim().toLowerCase();
  return BY_NAME_OR_CODE[key] || value.trim();
}

// Adivina el idioma por el texto visible de un enlace/fila de scraping.
function guessFromText(text) {
  if (!text) return 'und';
  const lower = text.toLowerCase();
  for (const name of Object.keys(BY_NAME_OR_CODE)) {
    if (name.length > 2 && lower.includes(name)) return BY_NAME_OR_CODE[name];
  }
  return 'und';
}

module.exports = { toIso6392, guessFromText };
