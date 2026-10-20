'use strict';

const cheerio = require('cheerio');
const http = require('../utils/http');
const { guessFromText } = require('../utils/languages');

/**
 * Helper genérico para los proveedores SIN API (scraping con cheerio).
 *
 * Realidad del scraping: cada sitio tiene su propio HTML, cambia con el
 * tiempo y varios están detrás de Cloudflare. Por eso esto hace una
 * extracción CONSERVADORA y defensiva:
 *   1. Abre la URL de búsqueda del sitio con el IMDb ID.
 *   2. Recoge enlaces cuyo href parezca un subtítulo (.srt/.vtt) o una
 *      ruta de descarga (/download...).
 *   3. Adivina el idioma por el texto del enlace/fila.
 *
 * Cuando adaptes un proveedor en serio, inspecciona el HTML real del sitio
 * (DevTools) y sustituye esta extracción por selectores concretos en su
 * archivo. Si algo falla, devolvemos [] y los demás proveedores siguen.
 */
async function scrapeSubtitleLinks({ provider, searchUrl }) {
  // getHtml añade headers de navegador completos, Referer encadenado y
  // detección de retos Cloudflare (lanza -> el agregador devuelve []).
  const html = await http.getHtml(searchUrl);
  if (!html.includes('<')) return [];

  const $ = cheerio.load(html);
  const base = new URL(searchUrl);
  const found = [];
  const seen = new Set();

  $('a[href]').each((_, el) => {
    const href = $(el).attr('href') || '';
    const isSubtitleFile = /\.(srt|vtt)(\?|#|$)/i.test(href);
    const isDownloadPath = /download/i.test(href);
    if (!isSubtitleFile && !isDownloadPath) return;

    let url;
    try {
      url = new URL(href, base).toString();
    } catch {
      return;
    }
    if (seen.has(url)) return;
    seen.add(url);

    const contextText = `${$(el).text()} ${$(el).closest('tr,li,div').text()}`;
    found.push({
      // Solo los .srt/.vtt directos funcionan tal cual en Stremio; los enlaces
      // /download suelen ser .zip y necesitarán un endpoint proxy que los
      // descomprima (ver "Siguientes pasos" en el README).
      url,
      lang: guessFromText(contextText),
      provider,
      directFile: isSubtitleFile
    });
  });

  // Prioriza archivos directos .srt/.vtt sobre enlaces de descarga genéricos.
  return found.sort((a, b) => Number(b.directFile) - Number(a.directFile));
}

module.exports = { scrapeSubtitleLinks };
