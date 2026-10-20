'use strict';

// Stremio espera "lang" como código ISO 639-2 de 3 letras ("eng", "spa"...).
// Los proveedores devuelven nombres ("Spanish"), códigos de 2 letras ("es")
// o slugs ("spanish_spain"): normalizamos todo a ISO 639-2. Si no
// reconocemos el idioma, devolvemos el texto tal cual (Stremio lo mostrará
// como etiqueta).
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
  persian: 'per', fa: 'per', fas: 'per', per: 'per', farsi: 'per',
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
  ukrainian: 'ukr', uk: 'ukr', ukr: 'ukr',
  // Frecuentes en SubDL/SubSource (sus listados se ordenan alfabéticamente)
  albanian: 'alb', sq: 'alb', sqi: 'alb', alb: 'alb',
  bengali: 'ben', bn: 'ben', ben: 'ben',
  bosnian: 'bos', bs: 'bos', bos: 'bos',
  catalan: 'cat', ca: 'cat', cat: 'cat',
  estonian: 'est', et: 'est', est: 'est',
  latvian: 'lav', lv: 'lav', lav: 'lav',
  lithuanian: 'lit', lt: 'lit', lit: 'lit',
  macedonian: 'mac', mk: 'mac', mkd: 'mac', mac: 'mac',
  slovak: 'slo', sk: 'slo', slk: 'slo', slo: 'slo',
  slovenian: 'slv', sl: 'slv', slv: 'slv',
  urdu: 'urd', ur: 'urd', urd: 'urd',
  sinhala: 'sin', si: 'sin', sin: 'sin',
  burmese: 'bur', my: 'bur', mya: 'bur', bur: 'bur',
  khmer: 'khm', km: 'khm', khm: 'khm',
  nepali: 'nep', ne: 'nep', nep: 'nep'
};

function toIso6392(value) {
  if (!value || typeof value !== 'string') return 'und'; // undetermined
  // SubSource usa slugs con guión bajo: spanish_spain, portuguese_brazil...
  const key = value.trim().toLowerCase().replace(/_/g, ' ');
  if (BY_NAME_OR_CODE[key]) return BY_NAME_OR_CODE[key];
  // Regional: "Spanish Spain" / "Spanish (Latin America)" -> primera palabra
  const firstWord = key.replace(/\(.*?\)/g, '').trim().split(/\s+/)[0];
  return BY_NAME_OR_CODE[firstWord] || value.trim();
}

// Nombres de idioma tal y como aparecen en las URLs de SubDL
// (/subtitle/sd6642/blitz/english, .../first-season/spanish, etc.)
const SLUG_BY_CODE2 = {
  ES: 'spanish', EN: 'english', PT: 'portuguese', FR: 'french', DE: 'german',
  IT: 'italian', NL: 'dutch', AR: 'arabic', RU: 'russian', TR: 'turkish',
  PL: 'polish', RO: 'romanian', EL: 'greek', HE: 'hebrew', FA: 'persian',
  HI: 'hindi', ID: 'indonesian', MS: 'malay', VI: 'vietnamese', TH: 'thai',
  KO: 'korean', JA: 'japanese', ZH: 'chinese', CS: 'czech', HU: 'hungarian',
  SV: 'swedish', DA: 'danish', NO: 'norwegian', FI: 'finnish', HR: 'croatian',
  SR: 'serbian', BG: 'bulgarian', UK: 'ukrainian', SQ: 'albanian', BN: 'bengali'
};

const LANGUAGE_SLUGS = new Set(Object.values(SLUG_BY_CODE2));

/** 'ES' -> 'spanish' (para construir URLs de idioma de SubDL); null si no consta. */
function code2ToSlug(code2) {
  return SLUG_BY_CODE2[String(code2 || '').toUpperCase()] || null;
}

/** ¿Es este segmento de URL un idioma tipo 'english'/'spanish'? */
function isLanguageSlug(segment) {
  return LANGUAGE_SLUGS.has(String(segment || '').toLowerCase());
}

/** 'spanish'/'spanish_spain' -> 'spa' (atajo semántico sobre toIso6392). */
function slugToIso6392(slug) {
  return toIso6392(slug);
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

module.exports = { toIso6392, guessFromText, code2ToSlug, isLanguageSlug, slugToIso6392 };
