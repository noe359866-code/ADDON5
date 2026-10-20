'use strict';

const crypto = require('node:crypto');

// Registro de proveedores. Para añadir uno nuevo: crea su archivo con
// { name, search(query) } y regístralo en esta lista. Nada más hay que tocar.
const providers = [
  require('./subdl'),
  require('./subsource'),
  require('./subscene'),
  require('./ytsSubs'),
  require('./justSubtitles'),
  require('./indexSubtitle')
];

/**
 * Normaliza UN resultado de proveedor al formato del SDK de Stremio.
 * Entrada (flexible): { id?, url, lang?, release?, provider?, ... }
 * Salida (exacta):    { id, url, lang }   <- lo que Stremio consume
 * El proveedor puede proponer su propio id (p. ej. el numérico de SubSource o
 * el código /s/info/ de SubDL); nosotros lo prefijamos con el nombre del
 * proveedor para garantizar unicidad global en la respuesta.
 */
function normalizeItem(providerName, sub) {
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

/**
 * Consulta TODOS los proveedores en paralelo. Promise.allSettled garantiza
 * que si uno falla (timeout, 403 de Cloudflare, HTML cambiado...) los demás
 * siguen aportando resultados y el addon nunca responde con error.
 * (Además, cada proveedor serio se envuelve en su propio try/catch: doble
 * cinturón de seguridad.)
 *
 * query: { type, imdbId, season, episode, title?, year?,
 *          filename, videoHash, videoSize }
 */
async function searchAll(query) {
  const settled = await Promise.allSettled(
    providers.map(async (provider) => {
      const results = await provider.search(query);
      return Array.isArray(results) ? results : [];
    })
  );

  const seenUrls = new Set();
  const seenIds = new Set();
  const subtitles = [];

  settled.forEach((result, i) => {
    if (result.status === 'rejected') {
      console.warn(`[providers] ${providers[i].name} falló: ${result.reason?.message || result.reason}`);
      return;
    }
    for (const sub of result.value) {
      const item = normalizeItem(providers[i].name, sub);
      if (!item || seenUrls.has(item.url) || seenIds.has(item.id)) continue;
      seenUrls.add(item.url);
      seenIds.add(item.id);
      subtitles.push(item);
    }
  });

  return subtitles;
}

module.exports = { providers, searchAll, normalizeItem };
