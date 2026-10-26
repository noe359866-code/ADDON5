/**
 * src/players/packer.js — Desempaqueta el JavaScript "packed" de Dean Edwards.
 *
 * Filemoon, StreamWish, VidHide y compañía sirven su reproductor con
 * `eval(function(p,a,c,k,e,d){…}('…',62,123,'a|b|c'.split('|'),0,{}))`. Ese
 * paquete se puede desempaquetar sin ejecutar el código del sitio: se evalúa
 * SOLO la función de desempaquetado (que devuelve una cadena) dentro de un
 * contexto vacío de `node:vm`, con timeout. Lo que devuelve no se ejecuta.
 */

import vm from 'node:vm';

const MAX_UNPACKED = 2 * 1024 * 1024;

/** Índice del paréntesis que cierra el que está en `openIndex`. */
export function findBalancedEnd(text, openIndex) {
  let depth = 0;
  let quote = '';
  let escaped = false;

  for (let i = openIndex; i < text.length; i += 1) {
    const char = text[i];

    if (escaped) {
      escaped = false;
      continue;
    }
    if (quote) {
      if (char === '\\') escaped = true;
      else if (char === quote) quote = '';
      continue;
    }
    if (char === '"' || char === "'" || char === '`') {
      quote = char;
      continue;
    }
    if (char === '(') depth += 1;
    else if (char === ')') {
      depth -= 1;
      if (depth === 0) return i;
    }
  }

  return -1;
}

/**
 * Extrae la expresión `function(p,a,c,k,e,d){…}('…',62,123,'a|b'.split('|'),0,{})`
 * del `eval(eval(...))` de la página.
 */
export function findPackedCall(html) {
  const source = String(html == null ? '' : html);
  const evalRe = /\beval\s*\(/gi;
  let match;
  while ((match = evalRe.exec(source))) {
    const open = match.index + match[0].length - 1;
    const inner = source.slice(open + 1, open + 60);
    if (!/^\s*function\s*\(/.test(inner)) continue;
    const end = findBalancedEnd(source, open);
    if (end < 0) continue;
    const call = source.slice(open + 1, end).trim();
    if (call.length < 40 || call.length > 400000) continue;
    if (!call.includes('split')) continue;
    return call;
  }
  return '';
}

/** Devuelve el código desempaquetado o '' si la página no venía empaquetada. */
export function unpackFromHtml(html) {
  const call = findPackedCall(html);
  if (!call) return '';

  try {
    const context = vm.createContext(Object.create(null));
    const result = vm.runInContext(`(${call})`, context, { timeout: 500, displayErrors: false });
    const text = typeof result === 'string' ? result : '';
    return text.length > MAX_UNPACKED ? text.slice(0, MAX_UNPACKED) : text;
  } catch {
    return '';
  }
}

/** Implementación pura (sin eval) del desempaquetado, para tests y respaldo. */
export function unpack(p, a, c, k) {
  const e = (index) => (index < a ? '' : e(Math.floor(index / a))) + ((index %= a) > 35
    ? String.fromCharCode(index + 29)
    : index.toString(36));

  const dictionary = {};
  let index = c;
  while (index) {
    index -= 1;
    dictionary[e(index)] = k[index] || e(index);
  }

  return String(p).replace(/\b\w+\b/g, (token) => (dictionary[token] !== undefined ? dictionary[token] : token));
}
