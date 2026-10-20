'use strict';

/**
 * Stremio envía el id así:
 *   Película:  "tt0111161"
 *   Serie:     "tt0944947:1:3"   ->  imdbId : temporada : episodio
 * Devuelve null si el id no es un IMDb válido (el handler responderá []).
 */
function parseSubtitlesId(id) {
  if (typeof id !== 'string') return null;
  const [imdbId, seasonRaw, episodeRaw] = id.split(':');
  if (!/^tt\d+$/.test(imdbId || '')) return null;

  const season = seasonRaw !== undefined ? Number(seasonRaw) : undefined;
  const episode = episodeRaw !== undefined ? Number(episodeRaw) : undefined;

  return {
    imdbId,
    season: Number.isInteger(season) && season >= 0 ? season : undefined,
    episode: Number.isInteger(episode) && episode >= 0 ? episode : undefined
  };
}

module.exports = { parseSubtitlesId };
