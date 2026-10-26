/**
 * src/cinemeta.js — De un ID IMDb de Stremio al título/año que entiende Gnula.
 *
 * Stremio solo manda el ID (`tt0111161` / `tt0944947:1:2`). Gnula busca por
 * título, así que se resuelve el nombre con Cinemeta (público, sin clave).
 * Si Cinemeta no responde, se intenta con el nombre original de IMDb; si
 * tampoco, el addon devuelve lista vacía en vez de buscar a ciegas.
 */

import { config } from './config.js';
import { requestJson } from './http.js';
import { metaCache } from './cache.js';

/** "tt0944947:1:2" → { imdbId, season: 1, episode: 2 } */
export function parseStremioId(rawId) {
  const parts = String(rawId == null ? '' : rawId).split(':');
  const imdbId = parts[0];
  if (!/^tt\d{5,}$/.test(imdbId)) return null;
  const season = parts[1] !== undefined && parts[1] !== '' ? Number.parseInt(parts[1], 10) : null;
  const episode = parts[2] !== undefined && parts[2] !== '' ? Number.parseInt(parts[2], 10) : null;
  return {
    imdbId,
    season: Number.isInteger(season) ? season : null,
    episode: Number.isInteger(episode) ? episode : null
  };
}

function cleanTitle(value) {
  return String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
}

/**
 * Devuelve { imdbId, type, name, originalName, year, season, episode }.
 * `null` si no se pudo resolver el título.
 */
export async function lookupTitle(type, rawId, { deadline } = {}) {
  const parsed = parseStremioId(rawId);
  if (!parsed) return null;
  if (type !== 'movie' && type !== 'series') return null;

  const cacheKey = `${type}:${parsed.imdbId}`;
  const cached = metaCache.get(cacheKey);
  if (cached) {
    return { ...cached, season: parsed.season, episode: parsed.episode };
  }

  const url = `${config.cinemetaBaseUrl}/meta/${type}/${parsed.imdbId}.json`;
  const result = await requestJson(url, {
    deadline,
    headers: { Accept: 'application/json' }
  });

  const meta = result.json && result.json.meta ? result.json.meta : null;
  if (!meta || !meta.name) return null;

  const info = {
    imdbId: parsed.imdbId,
    type,
    name: cleanTitle(meta.name),
    originalName: cleanTitle(meta.originalName || '') || cleanTitle(meta.name),
    year: cleanTitle(meta.year || meta.releaseInfo || '').slice(0, 4),
    episodes: Array.isArray(meta.videos) ? meta.videos.length : 0
  };

  if (config.debug) {
    console.log(`[cinemeta] ${parsed.imdbId} → "${info.name}" (${info.year})`);
  }

  metaCache.set(cacheKey, info, 86400);
  return { ...info, season: parsed.season, episode: parsed.episode };
}
