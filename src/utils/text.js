/**
 * src/utils/text.js — Utilidades de texto compartidas.
 */

const ARTICLES = new Set(['the', 'a', 'an', 'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'lo']);

/** Minúsculas, sin acentos, sin signos, espacios simples. */
export function normalize(text) {
  return String(text == null ? '' : text)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

/** Forma "pegada" para comparar títulos y slugs: "spider-man" == "spider man". */
export function compact(text) {
  return normalize(text).replace(/[^a-z0-9]/g, '');
}

/** Quita artículos iniciales: "The Batman" y "Batman" se comparan mejor. */
export function withoutArticles(text) {
  const words = normalize(text).split(' ').filter(Boolean);
  while (words.length > 1 && ARTICLES.has(words[0])) words.shift();
  return words.join(' ');
}

/** Slug de WordPress: "Spider-Man: No Way Home" → "spider-man-no-way-home". */
export function slugify(text) {
  return String(text == null ? '' : text)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/['’`]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Similitud por tokens (Jaccard) entre dos títulos normalizados. */
export function tokenSimilarity(a, b) {
  const left = new Set(withoutArticles(a).split(' ').filter(Boolean));
  const right = new Set(withoutArticles(b).split(' ').filter(Boolean));
  if (!left.size || !right.size) return 0;
  let shared = 0;
  for (const token of left) if (right.has(token)) shared += 1;
  return shared / (left.size + right.size - shared);
}

/**
 * Parecido entre el título pedido y el de una ficha: 0..1.
 * Combina igualdad exacta, contención y tokens, que es lo que mejor funciona
 * con títulos traducidos ("El señor de los anillos" vs "The Lord of the Rings").
 */
export function titleSimilarity(wanted, candidate) {
  const a = compact(wanted);
  const b = compact(candidate);
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (a.startsWith(b) || b.startsWith(a)) {
    return 0.82 + 0.15 * (Math.min(a.length, b.length) / Math.max(a.length, b.length));
  }
  if (a.includes(b) || b.includes(a)) {
    return 0.7 + 0.15 * (Math.min(a.length, b.length) / Math.max(a.length, b.length));
  }
  return tokenSimilarity(wanted, candidate);
}

/** Extrae el año de "(2025)" o de un campo suelto. */
export function extractYear(text) {
  const match = /\(((?:19|20)\d{2})\)/.exec(String(text == null ? '' : text));
  if (match) return match[1];
  const loose = /\b((?:19|20)\d{2})\b/.exec(String(text == null ? '' : text));
  return loose ? loose[1] : '';
}

/** Texto plano de un trozo de HTML. */
export function stripTags(html) {
  return String(html == null ? '' : html)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[ \t\r\n]+/g, ' ')
    .trim();
}

/** Limita un texto para que quepa en un `title` de Stremio. */
export function clip(text, max = 90) {
  const value = String(text == null ? '' : text).replace(/\s+/g, ' ').trim();
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}
