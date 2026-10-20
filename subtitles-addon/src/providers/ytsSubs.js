'use strict';

const cheerio = require('cheerio');
const http = require('../utils/http');
const config = require('../config');
const { toIso6392, guessFromText } = require('../utils/languages');
const { cleanText } = require('../utils/release');
const { toStremioSubtitles } = require('../utils/stremio');

/**
 * YTS-Subs / YIFY Subtitles (yts-subs.com y espejos tipo yifysubtitles.ch)
 * — scraping con Axios + Cheerio. SOLO películas.
 *
 * Peculiaridades verificadas de este sitio:
 *   - La ficha de la película se abre DIRECTO por IMDb ID:
 *       GET /movie-imdb/tt0111161
 *     (sin buscador ni título de por medio: es el proveedor más simple)
 *   - La tabla "All subtitles" es: Rating | Language | Release | Uploader
 *     | Download. Tanto el release ("subtitle The.Shawshank…YTS.AG") como el
 *     "download" enlazan a la ficha /subtitles/{slug-título-año-idioma-yify-id}
 *   - La DESCARGA real no es ese enlace: se construye cambiando el plural
 *     por singular y añadiendo .zip —
 *       /subtitles/rango-english-yify-1787  ->  /subtitle/rango-english-yify-1787.zip
 *     (es el patrón histórico de la familia YIFY; también intentamos leer
 *     un .zip ya presente en la fila por si un espejo lo enlaza directo)
 *   - La página tiene TONELADAS de filas duplicadas (mismo release/idioma):
 *     deduplicamos por idioma+release quedándonos el mejor rating.
 *   - Buscador de reserva: /search/{Title+(Year)} con enlaces /movie-imdb/tt…
 *   - Idiomas con sus rarezas: "Brazilian Portuguese", "Farsi/Persian", etc.
 *     (normalizados en utils/languages.js)
 *   - El dominio cambia a menudo -> lista de espejos en YTS_SUBS_BASE_URLS.
 *
 * API independiente (la que pide el enunciado):
 *   const { getSubtitlesByImdb } = require('./ytsSubs');
 *   await getSubtitlesByImdb('tt0111161', 'es')
 *   // -> [{ id:'yts-subs-…', url:'https://…/subtitle/….zip', lang:'spa' }]
 */
const PROVIDER = 'yts-subs';

/* ------------------------------------------------------------------ utils */

function originOf(url) {
  try { return new URL(url).origin; } catch { return null; }
}

function absUrl(href, pageUrl) {
  try { return new URL(href, pageUrl).toString(); } catch { return null; }
}

function imdbIdsIn(html) {
  const ids = new Set();
  for (const m of String(html).matchAll(/imdb\.com\/title\/(tt\d+)/gi)) ids.add(m[1]);
  return ids;
}

/** /subtitles/{slug} -> {origin}/subtitle/{slug}.zip (patrón YIFY) */
function buildYtsZipUrl(detailUrlOrPath, pageUrl) {
  const abs = absUrl(detailUrlOrPath, pageUrl);
  if (!abs) return null;
  if (/\.zip($|\?)/i.test(abs)) return abs;
  try {
    const u = new URL(abs);
    const slug = u.pathname.replace(/^\/subtitles\//, '').replace(/\/$/, '');
    if (!slug || slug.includes('/')) return abs;
    return `${u.origin}/subtitle/${slug}.zip`;
  } catch {
    return abs;
  }
}

/* ---------------------------------------------------------------- parsers */

function candidateFrom(detailUrl, pageUrl, { release, languageText, rating }) {
  const detailAbs = absUrl(detailUrl, pageUrl);
  if (!detailAbs) return null;
  let path = '';
  try { path = new URL(detailAbs).pathname; } catch { return null; }
  const slug = path.replace(/^\/subtitles?\//, '').replace(/\.zip$/i, '').replace(/\/$/, '');
  if (!slug || slug.includes('/')) return null;
  const idMatch = slug.match(/-yify-(\d+)$/i) || slug.match(/-(\d+)$/);
  const cleanRelease = cleanText(release || '').replace(/^subtitle\s+/i, '');
  return {
    subtitleSlug: slug,
    subtitleId: idMatch ? idMatch[1] : slug,
    detailUrl: detailAbs,
    downloadUrl: buildYtsZipUrl(detailAbs, pageUrl),
    release: cleanRelease,
    lang: toIso6392(languageText || ''),
    rating: Number.isFinite(rating) ? rating : 0,
    referer: pageUrl,
    isArchive: true
  };
}

/** Tabla "All subtitles" de /movie-imdb/tt… (con dedupe por idioma+release). */
function parseYtsListing(html, pageUrl) {
  const $ = cheerio.load(html);
  const byKey = new Map();
  const push = (cand) => {
    if (!cand || !cand.downloadUrl) return;
    const key = `${cand.lang}|${cand.release.toLowerCase()}`;
    const prev = byKey.get(key);
    // Filas repetidas a montones: gana el de mayor rating (empate: el primero)
    if (!prev || cand.rating > prev.rating) byKey.set(key, cand);
  };

  $('tr').each((_, row) => {
    const $row = $(row);
    const cells = $row.find('td');
    if (cells.length < 2) return;
    const releaseAnchor = $row.find('a[href*="/subtitles/"], a[href*="/subtitle/"]').first();
    if (!releaseAnchor.length) return;
    const zipAnchor = $row.find('a[href$=".zip"], a[href*=".zip?"]').first();
    const langText = cleanText($row.find('.sub-lang').first().text()) || cleanText(cells.eq(1).text());
    const rating = Number.parseInt(cleanText(cells.eq(0).text()), 10);
    const cand = candidateFrom(
      zipAnchor.length ? zipAnchor.attr('href') : releaseAnchor.attr('href'),
      pageUrl,
      { release: releaseAnchor.text(), languageText: langText, rating }
    );
    push(cand);
  });

  // Reserva: enlaces sueltos si la tabla cambia de forma en algún espejo.
  if (!byKey.size) {
    $('a[href]').each((_, a) => {
      const href = $(a).attr('href') || '';
      if (!/\/subtitles?\/[^/]+/i.test(href) && !/\.zip($|\?)/i.test(href)) return;
      const rowText = `${$(a).text()} ${$(a).closest('tr, li, div').text()}`;
      push(candidateFrom(href, pageUrl, {
        release: $(a).text(),
        languageText: guessFromText(rowText),
        rating: 0
      }));
    });
  }

  return [...byKey.values()];
}

/** Ficha de subtítulo: por si un espejo exige pasar por ella para descargar. */
function parseYtsDetail(html, pageUrl) {
  const $ = cheerio.load(html);
  let downloadUrl = null;
  $('a[href]').each((_, a) => {
    if (downloadUrl) return;
    const url = absUrl($(a).attr('href'), pageUrl);
    if (url && (/\.zip($|\?)/i.test(url) || /\/subtitle\//.test(url))) downloadUrl = url;
  });
  const body = cleanText($('body').text());
  const langMatch = body.match(/\b([A-Za-z][A-Za-z/ ]*?)\s+Language:/);
  return {
    downloadUrl: downloadUrl ? buildYtsZipUrl(downloadUrl, pageUrl) : null,
    lang: langMatch ? toIso6392(langMatch[1]) : undefined
  };
}

/** Resultados de /search/...: enlaces /movie-imdb/tt… */
function parseYtsSearch(html, pageUrl) {
  const $ = cheerio.load(html);
  const out = [];
  $('a[href]').each((_, a) => {
    const href = $(a).attr('href') || '';
    const m = href.match(/\/movie-imdb\/(tt\d+)/i);
    if (!m) return;
    const url = absUrl(href, pageUrl);
    if (url && !out.some((o) => o.url === url)) out.push({ imdbId: m[1], url });
  });
  return out;
}

/* ----------------------------------------------------------------- lógica */

function sortCandidates(candidates, desiredIsoList) {
  const desired = desiredIsoList || [];
  const rank = (c) => {
    const i = desired.indexOf(c.lang);
    return i === -1 ? 99 : i;
  };
  return [...candidates].sort((a, b) =>
    (rank(a) - rank(b)) || ((b.rating || 0) - (a.rating || 0)));
}

async function fetchListing(base, imdbId) {
  const pageUrl = `${base}/movie-imdb/${encodeURIComponent(imdbId)}`;
  const html = await http.getHtml(pageUrl, { referer: `${base}/` });
  const ids = imdbIdsIn(html);
  if (ids.size && !ids.has(imdbId)) return []; // redirección a otra película
  return parseYtsListing(html, pageUrl);
}

async function searchInternal({ imdbId, type, title, year }) {
  if (type === 'series') return []; // YIFY/YTS es un archivo de películas
  for (const base of config.ytsSubsBaseUrls) {
    try {
      const items = await fetchListing(base, imdbId);
      if (items.length) return items;
    } catch (err) {
      console.warn(`[yts-subs] ${base} falló para ${imdbId}: ${err.message}`);
    }
  }
  // Reserva: buscador por título (algunos espejos desactivan /movie-imdb/)
  if (title) {
    const base = config.ytsSubsBaseUrls[0];
    const term = year ? `${title} (${year})` : title;
    try {
      const searchUrl = `${base}/search/${encodeURIComponent(term)}`;
      const html = await http.getHtml(searchUrl, { referer: `${base}/` });
      const hit = parseYtsSearch(html, searchUrl).find((r) => r.imdbId === imdbId);
      if (hit) {
        const listingHtml = await http.getHtml(hit.url, { referer: searchUrl });
        return parseYtsListing(listingHtml, hit.url);
      }
    } catch (err) {
      console.warn(`[yts-subs] Búsqueda por título falló: ${err.message}`);
    }
  }
  return [];
}

function toProviderItems(candidates) {
  return candidates.map((c) => ({
    id: c.subtitleId,
    url: c.downloadUrl,
    lang: c.lang || 'und',
    provider: PROVIDER,
    release: c.release || '',
    rating: c.rating,
    referer: c.referer,
    archive: true // la familia YTS descarga siempre .zip
  }));
}

/* ------------------------------------------------------- entradas públicas */

/** Contrato del addon: search(query) -> items de proveedor (los normaliza el agregador). */
async function search(query) {
  try {
    const candidates = await searchInternal(query);
    const desired = config.languages.map((c) => toIso6392(c));
    return toProviderItems(sortCandidates(candidates, desired))
      .slice(0, config.maxPerProvider);
  } catch (err) {
    console.warn(`[yts-subs] Error inesperado: ${err.message}`);
    return [];
  }
}

/**
 * API independiente: a partir de IMDb ID + idioma deseado.
 * @param {string} imdbId  'tt0111161'
 * @param {string} [language] 'es' | 'spa' | 'spanish' | ... (omitir = todos)
 * @param {{title?:string, year?:number}} [options]
 * @returns {Promise<Array<{id:string,url:string,lang:string}>>} listo para Stremio
 */
async function getSubtitlesByImdb(imdbId, language, options = {}) {
  try {
    if (!/^tt\d+$/.test(String(imdbId || ''))) return [];
    const target = language ? toIso6392(language) : null;
    let candidates = await searchInternal({
      imdbId, type: 'movie', title: options.title, year: options.year
    });
    if (target) candidates = candidates.filter((c) => c.lang === target);
    candidates = sortCandidates(candidates, target ? [target] : []);
    return toStremioSubtitles(PROVIDER, toProviderItems(candidates)
      .slice(0, config.maxPerProvider));
  } catch (err) {
    console.warn(`[yts-subs] getSubtitlesByImdb falló: ${err.message}`);
    return [];
  }
}

module.exports = {
  name: PROVIDER,
  search,
  getSubtitlesByImdb,
  _test: { parseYtsListing, parseYtsDetail, parseYtsSearch, buildYtsZipUrl, sortCandidates }
};
