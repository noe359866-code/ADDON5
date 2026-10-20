'use strict';

const { scrapeSubtitleLinks } = require('./_scraper');

/**
 * JustSubtitles (justsubtitles.com) — scraping con cheerio.
 * TODO al adaptarlo: confirma la ruta real de búsqueda del sitio y los
 * selectores de su tabla de resultados (ver _scraper.js).
 */
const BASE_URL = 'https://www.justsubtitles.com';

async function search({ imdbId }) {
  return scrapeSubtitleLinks({
    provider: 'justsubtitles',
    searchUrl: `${BASE_URL}/search?q=${encodeURIComponent(imdbId)}`
  });
}

module.exports = { name: 'justsubtitles', search };
