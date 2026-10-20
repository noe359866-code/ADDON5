'use strict';

const config = require('../config');
const { toIso6392 } = require('../utils/languages');
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

/** Lista de idiomas preferidos en ISO 639-2, p.ej. ['spa', 'eng']. */
function preferredIsoList(options = {}) {
  const raw = options.preferredLanguages || config.languages;
  return [...new Set((raw || []).map((x) => toIso6392(String(x))))]
    .filter((x) => x && x !== 'und');
}

/**
 * Ordena los subtítulos ya normalizados poniendo primero los idiomas
 * preferidos (por defecto SUBTITLE_LANGUAGES=ES,EN -> spa, después eng) y
 * manteniendo el resto de idiomas detrás en su orden original.
 *
 * No filtra nada por defecto: Stremio mostrará también el resto de idiomas.
 * Con { onlyPreferred: true } (o SUBTITLE_LANGUAGES_ONLY=true) sí descarta
 * los idiomas no preferidos.
 */
function prioritizeSubtitles(subtitles, options = {}) {
  const preferred = preferredIsoList(options);
  const onlyPreferred = options.onlyPreferred !== undefined
    ? Boolean(options.onlyPreferred)
    : Boolean(config.languagesOnly);
  const filtered = onlyPreferred && preferred.length
    ? subtitles.filter((s) => preferred.includes(s.lang))
    : [...subtitles];

  return filtered
    .map((s, i) => ({ s, i, rank: preferred.indexOf(s.lang) }))
    .sort((a, b) => {
      const ra = a.rank === -1 ? preferred.length : a.rank;
      const rb = b.rank === -1 ? preferred.length : b.rank;
      return (ra - rb) || (a.i - b.i);
    })
    .map((x) => x.s);
}

/**
 * Unifica el resultado de Promise.allSettled([...proveedores]):
 *  - Ignora los proveedores que rechazaron (log y seguir).
 *  - Normaliza cada item a exactamente { id, url, lang }.
 *  - Deduplica por URL y por id.
 *  - Prioriza idiomas (spa > eng > resto, ver prioritizeSubtitles).
 */
function unifySettled(settled, providerList = providers, options = {}) {
  // Atajo cómodo: unifySettled(settled, { preferredLanguages: [...] })
  if (!Array.isArray(providerList)) {
    options = providerList || {};
    providerList = providers;
  }

  const seenUrls = new Set();
  const seenIds = new Set();
  const subtitles = [];

  (settled || []).forEach((result, i) => {
    const provider = providerList[i] || {};
    const providerName = provider.name || `provider-${i}`;
    if (!result || result.status === 'rejected') {
      console.warn(`[providers] ${providerName} falló: ${result?.reason?.message || result?.reason}`);
      return;
    }
    const items = Array.isArray(result.value) ? result.value : [];
    for (const sub of items) {
      const item = normalizeItem(providerName, sub);
      if (!item || seenUrls.has(item.url) || seenIds.has(item.id)) continue;
      seenUrls.add(item.url);
      seenIds.add(item.id);
      subtitles.push(item);
    }
  });

  return prioritizeSubtitles(subtitles, options);
}

/**
 * Consulta TODOS los proveedores en paralelo. Promise.allSettled garantiza
 * que si uno falla (timeout, 403 de Cloudflare, HTML cambiado...) los demás
 * siguen aportando resultados y el addon nunca responde con error.
 * (Además, cada proveedor se envuelve en su propio try/catch: doble cinturón.)
 *
 * El index.js principal usa esta misma mecánica de forma explícita; esta
 * función queda como atajo reutilizable y testeable.
 */
async function searchAll(query, options = {}) {
  const settled = await Promise.allSettled(
    providers.map(async (provider) => {
      const results = await provider.search(query);
      return Array.isArray(results) ? results : [];
    })
  );
  return unifySettled(settled, providers, options);
}

module.exports = {
  providers,
  searchAll,
  unifySettled,
  prioritizeSubtitles,
  preferredIsoList,
  normalizeItem
};
