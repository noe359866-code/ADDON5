'use strict';

const cheerio = require('cheerio');
const http = require('../utils/http');
const config = require('../config');
const { toIso6392, slugToIso6392, code2ToSlug, isLanguageSlug } = require('../utils/languages');
const { classifyRelease, cleanText, normalizeTitle } = require('../utils/release');

/**
 * SubDL (subdl.com) — SCRAPING con Axios + Cheerio (sin clave), con la API
 * oficial como reserva si defines SUBDL_API_KEY y el scraping no da nada.
 *
 * Estructura REAL verificada contra la web (2026):
 *   Buscador:   GET /search/{título}             (SSR; ¡/search/tt0111161 da 0
 *               resultados! por eso buscamos por título vía Cinemeta y solo
 *               usamos el IMDb ID como último recurso)
 *   Ficha:      /subtitle/sd{ digitos }/{slug}
 *   Temporada:  /subtitle/sd.../{slug}/first-season   (specials-season = T0)
 *   Idioma:     .../{english|spanish|...}
 *   Cada entrada del listado enlaza a:
 *     - /s/info/{código}/{slug}  con el NOMBRE DEL RELEASE como texto, y
 *     - "Quick Download" -> https://dl.subdl.com/subtitle/{n}-{n}.zip
 *   La ficha /s/info/... además expone el archivo individual:
 *     - https://dl.subdl.com/subtitle/{código}/{archivo}  ("for Mobile")
 *   Ese enlace por-archivo es el que Stremio puede consumir directamente;
 *   el .zip necesitará el futuro endpoint de descompresión (ver README).
 */
const BASE = 'https://subdl.com';
const DL_BASE = 'https://dl.subdl.com';
const API_URL = 'https://api.subdl.com/api/v1/subtitles';

/* ------------------------------------------------------------------ utils */

function absUrl(href, pageUrl) {
  try { return new URL(href, pageUrl || BASE).toString(); } catch { return null; }
}

function segmentsOf(url) {
  try { return new URL(url).pathname.split('/').filter(Boolean); } catch { return []; }
}

function chunks(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

const ORDINAL_ONES = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth', 'eleventh', 'twelfth', 'thirteenth', 'fourteenth', 'fifteenth', 'sixteenth', 'seventeenth', 'eighteenth', 'nineteenth'];
function seasonSlug(season) {
  if (season === 0) return 'specials-season';
  if (season >= 1 && season <= 19) return `${ORDINAL_ONES[season - 1]}-season`;
  if (season === 20) return 'twentieth-season';
  if (season > 20 && season < 30) return `twenty-${ORDINAL_ONES[season - 21]}-season`;
  if (season === 30) return 'thirtieth-season';
  if (season > 30 && season < 40) return `thirty-${ORDINAL_ONES[season - 31]}-season`;
  return `season-${season}`; // improbable; findSeasonUrl() es la vía principal
}

/* ---------------------------------------------------------------- parsers */
/* Todos los parseXXX son funciones puras (HTML/JSON -> objetos)             */
/* para poder probarlos con fixtures sin tocar la red.                      */

/** Tarjetas de /search/{query}: título, año, movie|tv y URL de ficha. */
function parseSubdlSearch(html, pageUrl = BASE) {
  const $ = cheerio.load(html);
  const out = [];
  const seen = new Set();
  $('a[href]').each((_, el) => {
    const url = absUrl($(el).attr('href'), pageUrl);
    if (!url || seen.has(url)) return;
    const segs = segmentsOf(url);
    if (segs.length !== 3 || segs[0] !== 'subtitle' || !/^sd\d+$/.test(segs[1])) return;
    const text = cleanText($(el).text());
    if (!text) return;
    seen.add(url);
    const yearMatch = text.match(/\((\d{4})\)/);
    const typeMatch = text.match(/\b(movie|tv)\b/i);
    const title = text
      .replace(/\s*\(\d{4}\)\s*(movie|tv)?\s*([\d,]+\s*subtitles?)?\s*$/i, '')
      .trim();
    out.push({
      sdId: segs[1],
      slug: segs[2],
      url,
      title: title || text,
      year: yearMatch ? Number(yearMatch[1]) : undefined,
      mediaType: typeMatch ? typeMatch[1].toLowerCase() : undefined
    });
  });
  return out;
}

/** Elige la tarjeta que mejor casa con {type, title, year} de Stremio/Cinemeta. */
function pickBestTitle(cards, { type, title, year } = {}) {
  if (!cards.length) return null;
  const wantType = type === 'series' ? 'tv' : 'movie';
  const wantTitle = title ? normalizeTitle(title) : null;
  let best = null;
  let bestScore = -Infinity;
  cards.forEach((card, i) => {
    let score = -i * 0.01; // desempate: orden de la propia web
    if (card.mediaType) score += card.mediaType === wantType ? 3 : -3;
    if (year && card.year) score += card.year === year ? 2 : -2;
    if (wantTitle) {
      const cardTitle = normalizeTitle(card.title);
      if (cardTitle === wantTitle) score += 4;
      else if (cardTitle.startsWith(wantTitle) || wantTitle.startsWith(cardTitle)) score += 1;
    }
    if (score > bestScore) { bestScore = score; best = card; }
  });
  return best;
}

/**
 * Listado de subtítulos de una ficha (o de su página de idioma/temporada).
 * Recorremos los enlaces EN ORDEN de documento manteniendo el idioma del
 * grupo actual (los enlaces ".../english" preceden a su grupo) y el último
 * release visto (/s/info/...), que se empareja con su Quick Download.
 */
function parseSubdlListing(html, pageUrl) {
  const $ = cheerio.load(html);
  const pageSegs = segmentsOf(pageUrl || '');
  let currentLangSlug = isLanguageSlug(pageSegs[pageSegs.length - 1])
    ? pageSegs[pageSegs.length - 1].toLowerCase()
    : null;
  let pending = null; // último release /s/info/ aún sin descarga emparejada
  const pendingByCode = new Map();
  const out = [];
  const seen = new Set();

  $('a[href]').each((_, el) => {
    const url = absUrl($(el).attr('href'), pageUrl);
    if (!url) return;
    const segs = segmentsOf(url);
    const text = cleanText($(el).text());

    // Enlace de grupo de idioma: /subtitle/sd.../.../{english|spanish...}
    if (
      segs[0] === 'subtitle' && /^sd\d+$/.test(segs[1] || '') &&
      segs.length >= 4 && isLanguageSlug(segs[segs.length - 1])
    ) {
      currentLangSlug = segs[segs.length - 1].toLowerCase();
      return;
    }

    // Release: /s/info/{código}/{slug}
    const infoMatch = url.match(/\/s\/info\/([A-Za-z0-9_-]+)\//);
    if (infoMatch) {
      pending = {
        infoCode: infoMatch[1],
        infoUrl: url,
        release: text,
        languageSlug: currentLangSlug
      };
      pendingByCode.set(pending.infoCode, pending);
      return;
    }

    // Descarga: https://dl.subdl.com/subtitle/...
    if (url.startsWith(`${DL_BASE}/subtitle/`)) {
      // 1) mismo <li>/<tr>: emparejamiento más fiable
      let assoc = null;
      const container = $(el).closest('li, tr');
      if (container.length) {
        const containerInfo = container.find('a[href*="/s/info/"]').first();
        const m = (containerInfo.attr('href') || '').match(/\/s\/info\/([A-Za-z0-9_-]+)\//);
        if (m) assoc = pendingByCode.get(m[1]) || {
          infoCode: m[1],
          infoUrl: absUrl(containerInfo.attr('href'), pageUrl),
          release: cleanText(containerInfo.text()),
          languageSlug: currentLangSlug
        };
      }
      // 2) si no, el release inmediatamente anterior en el documento
      assoc = assoc || pending;
      if (!assoc) return;
      const key = assoc.infoCode || url;
      if (seen.has(key)) return;
      seen.add(key);
      out.push({
        infoCode: assoc.infoCode,
        infoUrl: assoc.infoUrl,
        release: assoc.release,
        languageSlug: assoc.languageSlug || currentLangSlug,
        lang: slugToIso6392(assoc.languageSlug || currentLangSlug || ''),
        downloadUrl: url,
        url,
        isArchive: /\.zip($|\?)/i.test(url)
      });
      pending = null;
    }
  });
  return out;
}

/**
 * Ficha /s/info/: buscamos el archivo INDIVIDUAL (…/subtitle/{cod}/{arch})
 * antes que el .zip, el idioma del título y el release de "Release info".
 */
function parseSubdlInfoPage(html, pageUrl) {
  const $ = cheerio.load(html);
  const links = [];
  $('a[href]').each((_, el) => {
    const url = absUrl($(el).attr('href'), pageUrl);
    if (url && url.startsWith(`${DL_BASE}/subtitle/`) && !links.includes(url)) links.push(url);
  });
  const perFile = links.find((u) => {
    const segs = segmentsOf(u);
    return segs.length === 3 && !/\.zip($|\?)/i.test(u);
  });
  const downloadUrl = perFile || links.find((u) => !/\.zip($|\?)/i.test(u)) || links[0] || null;

  const titleText = cleanText($('title').first().text());
  const langMatch = titleText.match(/Download\s+([A-Za-z][A-Za-z ]*?)\s+Subtitles?\b/i);
  const bodyText = cleanText($('body').text());
  const releaseMatch = bodyText.match(/Release info\s+(.{3,200}?)\s+(A Commentary by|Tags\b|Download [A-Z])/);

  return {
    downloadUrl,
    isArchive: downloadUrl ? /\.zip($|\?)/i.test(downloadUrl) : undefined,
    lang: langMatch ? toIso6392(langMatch[1]) : undefined,
    release: releaseMatch ? releaseMatch[1].trim() : undefined
  };
}

/** URL de la temporada pedida desde la ficha de la serie (Season 1, Specials). */
function findSubdlSeasonUrl(html, pageUrl, season) {
  const $ = cheerio.load(html);
  let found = null;
  $('a[href]').each((_, el) => {
    if (found) return;
    const url = absUrl($(el).attr('href'), pageUrl);
    if (!url) return;
    const segs = segmentsOf(url);
    const last = segs[segs.length - 1] || '';
    if (!/^(specials-season|.+-season)$/.test(last)) return;
    let n;
    if (last === 'specials-season') n = 0;
    else {
      const fromText = cleanText($(el).text()).match(/Season\s+(\d+)/i);
      if (fromText) n = Number(fromText[1]);
      else for (let k = 1; k <= 40; k += 1) if (seasonSlug(k) === last) { n = k; break; }
    }
    if (n === season) found = url;
  });
  return found;
}

/* ------------------------------------------------------------- API (reserva) */

function normalizeApiUrl(raw) {
  if (!raw || typeof raw !== 'string') return null;
  if (/^https?:\/\//i.test(raw)) return raw;
  return raw.startsWith('/') ? `${DL_BASE}${raw}` : `${DL_BASE}/${raw}`;
}

/**
 * Respuesta REAL de la API v1: { status, results:[títulos],
 * subtitles:[...] } — ojo: "subtitles" es HERMANO de "results", no va
 * dentro de cada resultado (también toleramos la forma anidada antigua).
 * Con unpack=1 cada subtítulo puede traer unpack_files[] con la URL del
 * archivo suelto: eso es lo que preferimos frente al .zip.
 */
function parseSubdlApiResponse(data, { season, episode } = {}) {
  if (!data || data.status === false) return [];
  const lists = [];
  if (Array.isArray(data.subtitles)) lists.push(data.subtitles);
  if (Array.isArray(data.results)) {
    for (const r of data.results) if (Array.isArray(r.subtitles)) lists.push(r.subtitles);
  }
  const inRange = (sub) => {
    if (episode === undefined) return true;
    const from = Number(sub.episode_from);
    const end = Number(sub.episode_end);
    if (Number.isInteger(from) && Number.isInteger(end) && from > 0) {
      return episode >= from && episode <= end;
    }
    if (sub.episode && Number(sub.episode) !== episode && !sub.full_season) return false;
    return true;
  };
  const out = [];
  for (const list of lists) {
    for (const sub of list) {
      if (!inRange(sub)) continue;
      const files = Array.isArray(sub.unpack_files) ? sub.unpack_files : [];
      const usableFiles = files.filter((f) =>
        episode === undefined || !f.episode || Number(f.episode) === episode);
      if (usableFiles.length) {
        for (const f of usableFiles) {
          const url = normalizeApiUrl(f.url);
          if (!url) continue;
          out.push({
            id: f.file_n_id || undefined,
            url,
            lang: toIso6392(f.language || f.lang || sub.language || sub.lang),
            provider: 'subdl',
            release: f.release_name || f.name || sub.release_name || sub.name || '',
            archive: false
          });
        }
        continue;
      }
      const url = normalizeApiUrl(sub.url || sub.download_link || sub.link);
      if (!url) continue;
      out.push({
        url,
        lang: toIso6392(sub.language || sub.lang || sub.language_code),
        provider: 'subdl',
        release: sub.release_name || sub.name || '',
        archive: /\.zip($|\?)/i.test(url)
      });
    }
  }
  return out;
}

async function searchByApi({ type, imdbId, season, episode }) {
  const { data } = await http.get(API_URL, {
    params: {
      api_key: config.subdlApiKey,
      imdb_id: imdbId,
      type: type === 'series' ? 'tv' : 'movie',
      ...(season !== undefined ? { season_number: season } : {}),
      ...(episode !== undefined ? { episode_number: episode } : {}),
      languages: config.languages.join(','),
      subs_per_page: 30,
      unpack: 1,
      releases: 1
    },
    headers: { Accept: 'application/json' }
  });
  return parseSubdlApiResponse(data, { season, episode });
}

/* -------------------------------------------------------------- scraping */

function orderByEpisode(candidates, season, episode) {
  if (episode === undefined) return candidates;
  const rank = { episode: 0, unknown: 1, pack: 2 };
  return candidates
    .map((c) => ({ c, cls: classifyRelease(c.release, season, episode) }))
    .filter((x) => x.cls !== 'mismatch')
    .sort((a, b) => rank[a.cls] - rank[b.cls])
    .map((x) => x.c);
}

/** Abre las fichas /s/info/ de los primeros candidatos para cambiar el .zip por el archivo suelto y corregir idioma/release. Fallos individuales se ignoran. */
async function enrichDirectLinks(candidates, listingUrl) {
  const targets = candidates.slice(0, config.maxDetailFetches).filter((c) => c.infoUrl);
  for (const batch of chunks(targets, 4)) {
    await Promise.allSettled(batch.map(async (c) => {
      const html = await http.getHtml(c.infoUrl, { referer: listingUrl, timeout: config.providerTimeoutMs });
      const info = parseSubdlInfoPage(html, c.infoUrl);
      if (info.downloadUrl) {
        c.downloadUrl = info.downloadUrl;
        c.url = info.downloadUrl;
        c.isArchive = Boolean(info.isArchive);
      }
      if (info.lang && info.lang !== 'und') c.lang = info.lang;
      if (info.release) c.release = info.release;
    }));
  }
}

/** Prueba las páginas por idioma configurado y, si no hay nada, la general. */
async function fetchListingCandidates(listingUrl, referer) {
  const collected = [];
  const seen = new Set();
  const pushAll = (items) => {
    for (const it of items) {
      const key = it.infoCode || it.downloadUrl;
      if (seen.has(key)) continue;
      seen.add(key);
      collected.push(it);
    }
  };
  const langSlugs = [...new Set(config.languages.map(code2ToSlug).filter(Boolean))].slice(0, 3);
  // Los listados por idioma se piden EN PARALELO: secuencialmente, un sitio
  // lento podía agotar el presupuesto de Stremio antes de devolver nada.
  const settled = await Promise.allSettled(langSlugs.map(async (slug) => {
    const url = `${listingUrl}/${slug}`;
    return { url, items: parseSubdlListing(await http.getHtml(url, { referer }), url) };
  }));
  for (const result of settled) {
    if (result.status === 'fulfilled') pushAll(result.value.items);
    else console.warn(`[subdl] Sin listado por idioma: ${result.reason?.message || result.reason}`);
  }
  if (!collected.length) {
    pushAll(parseSubdlListing(await http.getHtml(listingUrl, { referer }), listingUrl));
  }
  return collected;
}

async function searchByScraping(query) {
  const { type, imdbId, season, episode, title, year } = query;

  // 1) IMDb -> ficha. El buscador web es por título; el tt... es el plan B.
  const searchTerms = [title, imdbId].filter(Boolean);
  let card = null;
  let searchUrl = null;
  for (const term of searchTerms) {
    searchUrl = `${BASE}/search/${encodeURIComponent(term)}`;
    try {
      const html = await http.getHtml(searchUrl, { referer: `${BASE}/` });
      card = pickBestTitle(parseSubdlSearch(html, searchUrl), { type, title, year });
      if (card) break;
    } catch (err) {
      console.warn(`[subdl] Búsqueda "${term}" falló: ${err.message}`);
    }
  }
  if (!card) return [];

  // 2) Series: localizar la página de la temporada pedida.
  let listingUrl = card.url;
  if (type === 'series' && season !== undefined) {
    try {
      const titleHtml = await http.getHtml(card.url, { referer: searchUrl });
      listingUrl = findSubdlSeasonUrl(titleHtml, card.url, season)
        || `${card.url}/${seasonSlug(season)}`;
    } catch {
      listingUrl = `${card.url}/${seasonSlug(season)}`;
    }
  }

  // 3) Listado -> filtro de episodio -> enlaces directos por archivo.
  let candidates = await fetchListingCandidates(listingUrl, card.url);
  candidates = orderByEpisode(candidates, season, episode);
  candidates = candidates.slice(0, config.maxPerProvider * 2);
  await enrichDirectLinks(candidates, listingUrl);

  // Archivos sueltos primero (Stremio no abre .zip), orden estable dentro.
  candidates.sort((a, b) => Number(a.isArchive) - Number(b.isArchive));

  return candidates.slice(0, config.maxPerProvider).map((c) => ({
    id: c.infoCode,
    url: c.downloadUrl,
    lang: c.lang || 'und',
    provider: 'subdl',
    release: c.release || '',
    referer: listingUrl,
    archive: Boolean(c.isArchive)
  }));
}

/* ------------------------------------------------------------------ search */

async function search(query) {
  // try/catch TOTAL: este proveedor jamás propaga un error al addon.
  try {
    try {
      const scraped = await searchByScraping(query);
      if (scraped.length) return scraped;
    } catch (err) {
      console.warn(`[subdl] Scraping falló para ${query.imdbId}: ${err.message}`);
    }
    if (config.subdlApiKey) {
      try {
        return await searchByApi(query);
      } catch (err) {
        console.warn(`[subdl] API falló para ${query.imdbId}: ${err.message}`);
      }
    }
    return [];
  } catch (err) {
    console.warn(`[subdl] Error inesperado: ${err.message}`);
    return [];
  }
}

module.exports = {
  name: 'subdl',
  search,
  _test: {
    parseSubdlSearch, pickBestTitle, parseSubdlListing, parseSubdlInfoPage,
    findSubdlSeasonUrl, seasonSlug, parseSubdlApiResponse
  }
};
