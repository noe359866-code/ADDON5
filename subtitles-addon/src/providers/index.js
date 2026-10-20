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
 * Consulta TODOS los proveedores en paralelo. Promise.allSettled garantiza
 * que si uno falla (timeout, 403 de Cloudflare, HTML cambiado...) los demás
 * siguen aportando resultados y el addon nunca responde con error.
 *
 * query: { type, imdbId, season, episode, filename, videoHash, videoSize }
 * Devuelve subtítulos ya en formato Stremio: { id, url, lang }
 */
async function searchAll(query) {
  const settled = await Promise.allSettled(
    providers.map(async (provider) => {
      const results = await provider.search(query);
      return Array.isArray(results) ? results : [];
    })
  );

  const seenUrls = new Set();
  const subtitles = [];

  settled.forEach((result, i) => {
    if (result.status === 'rejected') {
      console.warn(`[providers] ${providers[i].name} falló: ${result.reason?.message || result.reason}`);
      return;
    }
    for (const sub of result.value) {
      if (!sub || typeof sub.url !== 'string' || !/^https?:\/\//i.test(sub.url)) continue;
      if (seenUrls.has(sub.url)) continue;
      seenUrls.add(sub.url);
      const providerName = sub.provider || providers[i].name;
      const hash = crypto.createHash('sha1').update(sub.url).digest('hex').slice(0, 10);
      subtitles.push({
        // "id" debe ser único por subtítulo; "lang" va en ISO 639-2 (eng, spa...)
        id: `${providerName}-${hash}`,
        url: sub.url,
        lang: sub.lang || 'und'
      });
    }
  });

  return subtitles;
}

module.exports = { providers, searchAll };
