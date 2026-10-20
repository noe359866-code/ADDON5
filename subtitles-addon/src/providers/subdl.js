'use strict';

const http = require('../utils/http');
const config = require('../config');
const { toIso6392 } = require('../utils/languages');

/**
 * SubDL — API oficial (recomendado: es la vía estable, sin scraping).
 * Docs: https://subdl.com/api-doc
 *   GET https://api.subdl.com/api/v1/subtitles
 *       ?api_key=...&imdb_id=tt0111161&type=movie|tv
 *       &season_number=1&episode_number=2&languages=ES,EN
 * Consigue tu clave gratis en https://subdl.com/panel/api
 *
 * NOTA: SubDL sirve las descargas como .zip. Stremio necesita la URL del
 * .srt directamente, así que en producción conviene interponer un endpoint
 * propio que descargue y descomprima (ver README > Siguientes pasos).
 * El parsing de abajo es defensivo ante pequeñas variaciones de la API.
 */
const API_URL = 'https://api.subdl.com/api/v1/subtitles';

function normalizeUrl(raw) {
  if (!raw || typeof raw !== 'string') return null;
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith('/')) return `https://dl.subdl.com${raw}`;
  return `https://dl.subdl.com/${raw}`;
}

async function search({ type, imdbId, season, episode }) {
  if (!config.subdlApiKey) return []; // sin clave, este proveedor se desactiva solo

  const { data } = await http.get(API_URL, {
    params: {
      api_key: config.subdlApiKey,
      imdb_id: imdbId,
      type: type === 'series' ? 'tv' : 'movie',
      ...(season !== undefined ? { season_number: season } : {}),
      ...(episode !== undefined ? { episode_number: episode } : {}),
      languages: config.languages.join(','),
      subs_per_page: 30
    },
    headers: { Accept: 'application/json' }
  });

  if (!data || data.status === false) return [];

  // La API agrupa por título: results[].subtitles[] (y en algunas respuestas
  // puede venir un arreglo plano). Aplanamos ambos casos.
  const groups = Array.isArray(data.results) ? data.results : [data];
  const out = [];
  for (const group of groups) {
    const subs = Array.isArray(group.subtitles) ? group.subtitles : [];
    for (const sub of subs) {
      const url = normalizeUrl(sub.url || sub.download_link || sub.link);
      if (!url) continue;
      out.push({
        url,
        lang: toIso6392(sub.lang || sub.language || sub.language_code || group.lang),
        provider: 'subdl'
      });
    }
  }
  return out;
}

module.exports = { name: 'subdl', search };
