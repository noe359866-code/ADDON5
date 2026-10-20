'use strict';

const { scrapeSubtitleLinks } = require('./_scraper');

/**
 * Sub-Scene (sub-scene.com) — sin API pública: scraping con cheerio.
 * TODO al adaptarlo: inspecciona el HTML real del buscador del sitio y
 * ajusta la ruta de búsqueda y los selectores (ver _scraper.js).
 * El Subscene original (subscene.com) cerró en 2024; existen espejos con
 * dominios parecidos, por eso la base va en una constante fácil de cambiar.
 */
const BASE_URL = 'https://sub-scene.com';

async function search({ imdbId }) {
  return scrapeSubtitleLinks({
    provider: 'subscene',
    searchUrl: `${BASE_URL}/search?query=${encodeURIComponent(imdbId)}`
  });
}

module.exports = { name: 'subscene', search };
