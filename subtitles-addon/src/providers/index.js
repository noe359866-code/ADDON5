'use strict';

const { toStremioSubtitle } = require('../utils/stremio');

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

// La normalización vive en utils/stremio.js para que cada proveedor pueda
// usarla también en su API independiente getSubtitlesByImdb(imdbId, lang).
const normalizeItem = toStremioSubtitle;

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
