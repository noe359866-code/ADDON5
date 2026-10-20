'use strict';

const { scrapeSubtitleLinks } = require('./_scraper');

/**
 * YTS-Subs (yts-subs.com, familia YIFY Subtitles) — scraping con cheerio.
 * Este tipo de sitios suele tener la ficha por IMDb ID directamente, p. ej.
 * /movie-imdb/tt0111161 — verifica la ruta vigente y ajústala aquí.
 * Centrado en películas; para series devolverá normalmente [].
 */
const BASE_URL = 'https://yts-subs.com';

async function search({ type, imdbId }) {
  if (type === 'series') return [];
  return scrapeSubtitleLinks({
    provider: 'yts-subs',
    searchUrl: `${BASE_URL}/movie-imdb/${encodeURIComponent(imdbId)}`
  });
}

module.exports = { name: 'yts-subs', search };
