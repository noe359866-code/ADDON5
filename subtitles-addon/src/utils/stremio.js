'use strict';

const crypto = require('node:crypto');

/**
 * Normaliza UN resultado de proveedor al formato del SDK de Stremio.
 * Entrada (flexible): { id?, url, lang?, release?, provider?, ... }
 * Salida (exacta):    { id, url, lang }   <- lo que Stremio consume
 * El proveedor puede proponer su propio id (numérico, slug…); lo prefijamos
 * con el nombre del proveedor para garantizar unicidad global.
 */
function toStremioSubtitle(providerName, sub) {
  if (!sub || typeof sub.url !== 'string' || !/^https?:\/\//i.test(sub.url)) return null;
  const provider = sub.provider || providerName;
  let id;
  if (sub.id !== undefined && sub.id !== null && String(sub.id).trim() !== '') {
    const raw = String(sub.id).trim();
    id = raw.startsWith(`${provider}-`) ? raw : `${provider}-${raw}`;
  } else {
    const hash = crypto.createHash('sha1').update(sub.url).digest('hex').slice(0, 10);
    id = `${provider}-${hash}`;
  }
  return { id, url: sub.url, lang: sub.lang || 'und' };
}

/** Array -> array Stremio, sin duplicados por URL ni por id. */
function toStremioSubtitles(providerName, items) {
  const seenUrls = new Set();
  const seenIds = new Set();
  const out = [];
  for (const item of items || []) {
    const normalized = toStremioSubtitle(providerName, item);
    if (!normalized || seenUrls.has(normalized.url) || seenIds.has(normalized.id)) continue;
    seenUrls.add(normalized.url);
    seenIds.add(normalized.id);
    out.push(normalized);
  }
  return out;
}

module.exports = { toStremioSubtitle, toStremioSubtitles };
