'use strict';

const http = require('./http');

/**
 * Cinemeta es el addon oficial de metadatos de Stremio y es público:
 *   GET https://v3-cinemeta.strem.io/meta/{movie|series}/{tt...}.json
 *
 * ¿Para qué lo necesitamos? Los buscadores web de SubDL/SubSource buscan por
 * TÍTULO (el /search/tt0111161 de SubDL devuelve 0 resultados) y Stremio solo
 * nos da el IMDb ID. Cinemeta convierte tt0111161 -> "The Shawshank
 * Redemption" (1994), que es lo que los scrapers necesitan para buscar y
 * para construir/verificar slugs.
 *
 * Nunca lanza: ante cualquier fallo devuelve null y los proveedores siguen
 * con sus estrategias de reserva (buscar por el propio IMDb ID, etc.).
 */
const CINEMETA_BASE = 'https://v3-cinemeta.strem.io';
const cache = new Map();

function parseCinemetaMeta(json) {
  const meta = json && json.meta;
  if (!meta || typeof meta.name !== 'string' || !meta.name.trim()) return null;
  const yearText = String(meta.year || meta.releaseInfo || '');
  const yearMatch = yearText.match(/\d{4}/);
  return {
    title: meta.name.trim(),
    year: yearMatch ? Number(yearMatch[0]) : undefined
  };
}

async function getCinemetaMeta(type, imdbId) {
  const key = `${type}:${imdbId}`;
  if (cache.has(key)) return cache.get(key);
  try {
    const { data } = await http.get(`${CINEMETA_BASE}/meta/${type}/${imdbId}.json`, {
      headers: { Accept: 'application/json' },
      timeout: 4000
    });
    const parsed = parseCinemetaMeta(data);
    if (cache.size > 500) cache.clear();
    cache.set(key, parsed);
    return parsed;
  } catch (err) {
    console.warn(`[cinemeta] Sin metadatos para ${key}: ${err.message}`);
    cache.set(key, null);
    return null;
  }
}

module.exports = { getCinemetaMeta, parseCinemetaMeta };
