'use strict';

const http = require('./http');
const config = require('../config');

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
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
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
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  try {
    const { data } = await http.get(`${CINEMETA_BASE}/meta/${type}/${imdbId}.json`, {
      headers: { Accept: 'application/json' },
      timeout: config.cinemetaTimeoutMs
    });
    const parsed = parseCinemetaMeta(data);
    if (parsed) {
      if (cache.size > 500) cache.clear();
      cache.set(key, { value: parsed, expiresAt: Date.now() + CACHE_TTL_MS });
    }
    return parsed;
  } catch (err) {
    // NO se cachea el fallo. Antes, un timeout puntual (Render frío, red
    // lenta) dejaba ese título sin metadatos durante toda la vida del
    // proceso: sin título, SubSource/SubScene no encuentran nada y el menú
    // de subtítulos se quedaba vacío hasta reiniciar.
    console.warn(`[cinemeta] Sin metadatos para ${key}: ${err.message}`);
    return null;
  }
}

/**
 * Igual que getCinemetaMeta pero sin saber el tipo: prueba el tipo indicado
 * (o 'movie') y luego el otro. Útil para las APIs independientes
 * getSubtitlesByImdb(imdbId, language), que solo reciben el tt...
 * Devuelve { title, year, type } o null.
 */
async function getCinemetaMetaAny(imdbId, typeHint) {
  const order = typeHint === 'series' ? ['series', 'movie'] : ['movie', 'series'];
  for (const type of order) {
    const meta = await getCinemetaMeta(type, imdbId);
    if (meta) return { ...meta, type };
  }
  return null;
}

module.exports = { getCinemetaMeta, getCinemetaMetaAny, parseCinemetaMeta };
