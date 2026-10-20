'use strict';

const { scrapeSubtitleLinks } = require('./_scraper');

/**
 * IndexSubtitle (indexsubtitle.cc) — scraping con cheerio.
 * TODO al adaptarlo: confirma la ruta real de búsqueda del sitio y los
 * selectores de su tabla de resultados (ver _scraper.js).
 */
const BASE_URL = 'https://indexsubtitle.cc';

async function search({ imdbId }) {
  return scrapeSubtitleLinks({
    provider: 'indexsubtitle',
    searchUrl: `${BASE_URL}/search?q=${encodeURIComponent(imdbId)}`
  });
}

module.exports = { name: 'indexsubtitle', search };
