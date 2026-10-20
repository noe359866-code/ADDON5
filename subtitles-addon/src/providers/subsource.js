'use strict';

const http = require('../utils/http');
const config = require('../config');
const { toIso6392 } = require('../utils/languages');

/**
 * SubSource — API oficial. Docs: https://subsource.net/api-docs
 *   Base: https://api.subsource.net/api/v1   Auth: header X-API-Key
 *   GET /movies/search        -> localizar el título por IMDb
 *   GET /subtitles            -> subtítulos de ese título (movieId, language...)
 *   GET /subtitles/{id}/download -> descarga (archivo, normalmente .zip)
 * Crea tu clave en subsource.net -> panel de cuenta -> pestaña API.
 *
 * Como en SubDL, la descarga suele ser .zip: ver la nota del endpoint proxy
 * en el README. El parsing es defensivo; verifica los nombres de campo con
 * tu propia clave contra la documentación enlazada arriba.
 */
const API_BASE = 'https://api.subsource.net/api/v1';

function asArray(payload, keys) {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== 'object') return [];
  for (const key of keys) {
    if (Array.isArray(payload[key])) return payload[key];
  }
  return [];
}

async function search({ imdbId, season, episode }) {
  if (!config.subsourceApiKey) return []; // sin clave, se desactiva solo

  const headers = { 'X-API-Key': config.subsourceApiKey, Accept: 'application/json' };

  // 1) Título por IMDb ID
  const moviesRes = await http.get(`${API_BASE}/movies/search`, {
    headers,
    params: { searchType: 'imdb', imdb: imdbId }
  });
  const movies = asArray(moviesRes.data, ['data', 'results', 'movies']);
  const movie = movies[0];
  const movieId = movie && (movie.id || movie.movieId || movie._id);
  if (!movieId) return [];

  // 2) Subtítulos de ese título (una petición por idioma configurado)
  const out = [];
  for (const lang2 of config.languages) {
    const subsRes = await http.get(`${API_BASE}/subtitles`, {
      headers,
      params: {
        movieId,
        language: lang2.toLowerCase(),
        ...(season !== undefined ? { season } : {}),
        ...(episode !== undefined ? { episode } : {})
      }
    });
    const subs = asArray(subsRes.data, ['data', 'results', 'subtitles']);
    for (const sub of subs) {
      const subId = sub.id || sub.subtitleId || sub._id;
      if (!subId) continue;
      // Filtra temporada/episodio si la API los devuelve en el propio registro
      if (season !== undefined && sub.season != null && Number(sub.season) !== season) continue;
      if (episode !== undefined && sub.episode != null && Number(sub.episode) !== episode) continue;
      out.push({
        url: `${API_BASE}/subtitles/${subId}/download`,
        lang: toIso6392(sub.language || sub.lang || lang2),
        provider: 'subsource'
      });
    }
  }
  return out;
}

module.exports = { name: 'subsource', search };
