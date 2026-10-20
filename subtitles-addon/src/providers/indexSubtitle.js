'use strict';

const cheerio = require('cheerio');
const http = require('../utils/http');
const config = require('../config');
const { toIso6392, slugToIso6392 } = require('../utils/languages');
const { classifyRelease, cleanText, normalizeTitle, slugifyTitle } = require('../utils/release');
const { getCinemetaMetaAny } = require('../utils/cinemeta');
const { toStremioSubtitles } = require('../utils/stremio');

/**
 * IndexSubtitle (indexsubtitle.cc) — scraping con Axios + Cheerio.
 *
 * Es el sitio más "a capas" de los seis. Peculiaridades verificadas:
 *   - Slugs estilo SubSource: /subtitles/{slug}-{año} y
 *     /subtitles/{slug}/season-{n}; la ficha enlaza a imdb.com/title/tt…
 *     (lo usamos para verificar el slug adivinado).
 *   - La tabla HTML visible es un DataTables paginado (10 filas, enlaces a
 *     "#download" inútiles) — PERO la ficha embebe en un <script> la lista
 *     COMPLETA en JSON y un ttl:
 *         ttl = 1234567890
 *         data: [{"title":"<release>","language":"english",
 *                 "url":"{slug}/{idioma}/{id}","author":{...}}, …], columns: …
 *     Parseamos ese JSON (con balanceo de corchetes, consciente de strings).
 *   - La descarga exige pedir un TOKEN por subtítulo:
 *       POST /subtitlesInfo   { id, lang, url }  (X-Requested-With: XMLHttpRequest)
 *       -> { token }
 *     y el zip final se construye como hace el JS del sitio:
 *       /d/{id}/{ttl}/{token}/{zipName}.zip
 *       zipName = url.replace(/[^\w ]/, '').replace(/\//g, '_')
 *       (¡ojo! el primer replace SOLO quita el primer carácter no-\w)
 *   - Buscador de reserva: POST /search {query} -> JSON
 *     [{title:"Nombre (AAAA)", url:"/subtitles/…"}] (cuerpo vacío = nada).
 *   - Rate-limit agresivo (~5 req/10 s, HTTP 429) y cookies de sesión:
 *     mantenemos un mini cookie-jar durante la búsqueda, pedimos tokens en
 *     lotes pequeños y si llega un 429 devolvemos lo ya conseguido.
 *
 * API independiente:
 *   await getSubtitlesByImdb('tt0111161', 'spanish')
 */
const PROVIDER = 'indexsubtitle';
const BASE = () => config.indexSubtitleBaseUrl;

/* --------------------------------------------------------- cliente + cookies */

function absorbCookies(jar, headers) {
  const setCookie = headers && headers['set-cookie'];
  if (!Array.isArray(setCookie)) return;
  for (const raw of setCookie) {
    const pair = String(raw).split(';')[0];
    const eq = pair.indexOf('=');
    if (eq > 0) jar.set(pair.slice(0, eq).trim(), pair.slice(eq + 1).trim());
  }
}

function cookieHeader(jar) {
  if (!jar || !jar.size) return {};
  return { Cookie: [...jar.entries()].map(([k, v]) => `${k}=${v}`).join('; ') };
}

async function getText(url, { referer, jar } = {}) {
  const res = await http.get(url, {
    headers: { ...http.browserHeaders(referer || `${BASE()}/`), ...cookieHeader(jar) },
    responseType: 'text',
    transformResponse: [(d) => d],
    timeout: config.providerTimeoutMs,
    maxContentLength: 12 * 1024 * 1024
  });
  if (jar) absorbCookies(jar, res.headers);
  if (typeof res.data !== 'string') throw new Error(`Respuesta no-HTML desde ${url}`);
  if (/Just a moment|cf-challenge|challenge-platform/i.test(res.data.slice(0, 8000))) {
    throw new Error(`Reto anti-bots (Cloudflare) en ${url}`);
  }
  return res.data;
}

/** POST de formulario estilo AJAX del propio sitio (devuelve objeto o texto). */
async function postForm(url, form, { referer, jar } = {}) {
  const res = await http.post(url, new URLSearchParams(form).toString(), {
    headers: {
      'User-Agent': http.USER_AGENT,
      Accept: 'application/json, text/javascript, */*; q=0.01',
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'X-Requested-With': 'XMLHttpRequest',
      Origin: BASE(),
      Referer: referer || `${BASE()}/`,
      ...cookieHeader(jar)
    },
    timeout: config.providerTimeoutMs
  });
  if (jar) absorbCookies(jar, res.headers);
  return res.data;
}

/* ------------------------------------------------------------------ utils */

function absUrl(href, pageUrl) {
  try { return new URL(href, pageUrl || BASE()).toString(); } catch { return null; }
}

function pageImdbIds(html) {
  const $ = cheerio.load(html);
  const ids = new Set();
  $('a[href*="imdb.com/title/"]').each((_, a) => {
    const m = ($(a).attr('href') || '').match(/imdb\.com\/title\/(tt\d+)/);
    if (m) ids.add(m[1]);
  });
  return ids;
}

/** Slugs a probar (mismo esquema que SubSource, verificado en su portada). */
function indexSubtitleSlugCandidates({ type, title, year, season }) {
  if (!title) return [];
  const slug = slugifyTitle(title);
  if (!slug) return [];
  const out = [];
  if (type === 'series') {
    const s = season !== undefined ? season : 1;
    out.push(`${slug}/season-${s}`);
    if (year) out.push(`${slug}-${year}/season-${s}`);
  } else {
    if (year) out.push(`${slug}-${year}`);
    out.push(slug);
  }
  return [...new Set(out)];
}

/* ---------------------------------------------------------------- parsers */

/** Extrae un array JSON empezando en `start` con balanceo consciente de strings. */
function extractJsonArray(text, start) {
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < text.length; i += 1) {
    const ch = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === '[') depth += 1;
    else if (ch === ']') {
      depth -= 1;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

/** Ficha -> { ttl, rows: candidatos } desde el JSON embebido del DataTables. */
function parseIndexEmbedded(html) {
  const ttlMatch = String(html).match(/\bttl\s*=\s*(\d+)/);
  const ttl = ttlMatch ? ttlMatch[1] : null;
  const dataMatch = String(html).match(/\bdata\s*:\s*\[/);
  if (!dataMatch) return { ttl, rows: [] };
  const start = String(html).indexOf('[', dataMatch.index);
  const raw = extractJsonArray(String(html), start);
  if (!raw) return { ttl, rows: [] };
  let parsed;
  try { parsed = JSON.parse(raw); } catch { return { ttl, rows: [] }; }
  if (!Array.isArray(parsed)) return { ttl, rows: [] };

  const rows = [];
  for (const item of parsed) {
    if (!item || typeof item !== 'object' || !item.url) continue;
    const urlPath = String(item.url).replace(/^\/+/, '');
    const subtitleId = urlPath.split('/').filter(Boolean).pop();
    if (!subtitleId) continue;
    rows.push({
      subtitleId,
      urlPath,
      release: cleanText(item.title || ''),
      siteLang: String(item.language || ''),
      lang: slugToIso6392(item.language || ''),
      author: item.author && typeof item.author === 'object'
        ? cleanText(item.author.name || '') : cleanText(item.author || '')
    });
  }
  return { ttl, rows };
}

/** POST /search -> [{title, name, year, url}] (acepta texto u objeto ya parseado). */
function parseIndexSearchResults(data) {
  let parsed = data;
  if (typeof data === 'string') {
    if (!data.trim()) return [];
    try { parsed = JSON.parse(data); } catch { return []; }
  }
  if (!Array.isArray(parsed)) return [];
  const out = [];
  for (const item of parsed) {
    if (!item || !item.url) continue;
    const fullTitle = cleanText(item.title || '');
    const m = fullTitle.match(/^(.*?)\s*\((\d{4})\)\s*$/);
    out.push({
      title: fullTitle,
      name: m ? m[1].trim() : fullTitle,
      year: m ? Number(m[2]) : undefined,
      url: absUrl(item.url, BASE())
    });
  }
  return out.filter((r) => r.url);
}

function pickIndexSearchResult(results, { type, title, year, season } = {}) {
  if (!results.length || !title) return null;
  const want = normalizeTitle(title);
  let best = null;
  let bestScore = -Infinity;
  results.forEach((r, i) => {
    const name = normalizeTitle(r.name);
    let score = -i * 0.01;
    if (name === want) score += 4;
    else if (name.startsWith(want) || want.startsWith(name)) score += 1;
    if (type === 'series' && season !== undefined) {
      if (name === `${want} season ${season}` || /\/season-\d+$/.test(r.url) && r.url.endsWith(`season-${season}`)) score += 4;
      else if (/season \d+/.test(name) || /\/season-\d+$/.test(r.url)) score -= 3;
    } else if (year && r.year) {
      score += r.year === year ? 2 : -2;
    }
    if (score > bestScore) { bestScore = score; best = r; }
  });
  return bestScore > 0 ? best : null;
}

/** El zipName EXACTO del JS del sitio (el primer replace no lleva /g). */
function buildIndexZipName(urlPath) {
  return String(urlPath || '').replace(/[^\w ]/, '').replace(/\//g, '_');
}

function buildIndexDownloadUrl(candidate, ttl, token) {
  if (!candidate || !ttl || !token) return null;
  return `${BASE()}/d/${candidate.subtitleId}/${ttl}/${token}/${buildIndexZipName(candidate.urlPath)}.zip`;
}

/* ----------------------------------------------------------------- lógica */

async function tryListing(url, imdbId, jar, referer) {
  const html = await getText(url, { jar, referer });
  const ids = pageImdbIds(html);
  if (imdbId && ids.size && !ids.has(imdbId)) return null;
  const { ttl, rows } = parseIndexEmbedded(html);
  if (!rows.length) return null;
  return { pageUrl: url, ttl, rows };
}

async function resolveListing(query, jar) {
  for (const path of indexSubtitleSlugCandidates(query)) {
    try {
      const resolved = await tryListing(`${BASE()}/subtitles/${path}`, query.imdbId, jar, `${BASE()}/`);
      if (resolved) return resolved;
    } catch (err) {
      console.warn(`[indexsubtitle] Slug ${path} no válido: ${err.message}`);
    }
  }
  if (query.title) {
    try {
      const data = await postForm(`${BASE()}/search`, { query: query.title }, { jar, referer: `${BASE()}/` });
      const hit = pickIndexSearchResult(parseIndexSearchResults(data), query);
      if (hit) return await tryListing(hit.url, query.imdbId, jar, `${BASE()}/`);
    } catch (err) {
      console.warn(`[indexsubtitle] /search falló: ${err.message}`);
    }
  }
  return null;
}

function orderCandidates(rows, query, desiredIsoList) {
  const desired = desiredIsoList || [];
  const clsRank = { episode: 0, unknown: 1, pack: 2 };
  const seen = new Set();
  return rows
    .filter((r) => {
      const key = r.urlPath || r.subtitleId;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((c, i) => ({ c, i, cls: classifyRelease(c.release, query.season, query.episode) }))
    .filter((x) => x.cls !== 'mismatch')
    .sort((a, b) => {
      const ra = desired.indexOf(a.c.lang) === -1 ? 99 : desired.indexOf(a.c.lang);
      const rb = desired.indexOf(b.c.lang) === -1 ? 99 : desired.indexOf(b.c.lang);
      return (ra - rb) || (clsRank[a.cls] - clsRank[b.cls]) || (a.i - b.i);
    })
    .map((x) => x.c);
}

async function searchInternal(query, desiredIsoList) {
  const jar = new Map(); // cookies de sesión durante ESTA búsqueda
  const resolved = await resolveListing(query, jar);
  if (!resolved) return [];
  if (!resolved.ttl) {
    console.warn('[indexsubtitle] La ficha no trae ttl: sin él no hay URL de descarga');
    return [];
  }

  // Sin token no hay descarga: 1 POST por subtítulo. Lotes pequeños y
  // parada limpia ante el 429 del sitio (devuelve lo conseguido).
  const ordered = orderCandidates(resolved.rows, query, desiredIsoList)
    .slice(0, config.maxDetailFetches);
  const out = [];
  let rateLimited = false;
  for (let i = 0; i < ordered.length && !rateLimited; i += 3) {
    const batch = ordered.slice(i, i + 3);
    const results = await Promise.allSettled(batch.map(async (c) => {
      const data = await postForm(
        `${BASE()}/subtitlesInfo`,
        { id: c.subtitleId, lang: c.siteLang, url: c.urlPath },
        { jar, referer: resolved.pageUrl }
      );
      const token = data && typeof data === 'object' ? data.token : null;
      const url = buildIndexDownloadUrl(c, resolved.ttl, token);
      if (!url) return null;
      return {
        id: c.subtitleId,
        url,
        lang: c.lang || 'und',
        provider: PROVIDER,
        release: c.release || '',
        referer: resolved.pageUrl,
        archive: true
      };
    }));
    for (const r of results) {
      if (r.status === 'fulfilled' && r.value) out.push(r.value);
      else if (r.status === 'rejected') {
        if (r.reason?.response?.status === 429) rateLimited = true;
        else console.warn(`[indexsubtitle] Token falló: ${r.reason?.message || r.reason}`);
      }
    }
  }
  if (rateLimited) {
    console.warn('[indexsubtitle] 429 (rate-limit): devolviendo lo obtenido hasta ahora');
  }
  return out;
}

/* ------------------------------------------------------- entradas públicas */

async function search(query) {
  try {
    const desired = config.languages.map((c) => toIso6392(c));
    const items = await searchInternal(query, desired);
    return items.slice(0, config.maxPerProvider);
  } catch (err) {
    console.warn(`[indexsubtitle] Error inesperado: ${err.message}`);
    return [];
  }
}

/**
 * API independiente: IMDb ID + idioma deseado -> subtítulos listos para Stremio.
 * @param {string} imdbId 'tt0111161' | 'tt0944947'
 * @param {string} [language] 'es' | 'spa' | 'spanish' (omitir = todos)
 * @param {{season?:number, episode?:number, title?:string, year?:number, type?:string}} [options]
 */
async function getSubtitlesByImdb(imdbId, language, options = {}) {
  try {
    if (!/^tt\d+$/.test(String(imdbId || ''))) return [];
    const target = language ? toIso6392(language) : null;
    let { title, year, type } = options;
    if (!title) {
      const hint = type || (options.season !== undefined || options.episode !== undefined ? 'series' : undefined);
      const meta = await getCinemetaMetaAny(imdbId, hint).catch(() => null);
      if (!meta) return [];
      title = meta.title;
      year = year !== undefined ? year : meta.year;
      type = type || meta.type;
    }
    let items = await searchInternal(
      {
        imdbId,
        type: type || (options.season !== undefined ? 'series' : 'movie'),
        title, year, season: options.season, episode: options.episode
      },
      target ? [target] : []
    );
    if (target) items = items.filter((it) => it.lang === target);
    return toStremioSubtitles(PROVIDER, items.slice(0, config.maxPerProvider));
  } catch (err) {
    console.warn(`[indexsubtitle] getSubtitlesByImdb falló: ${err.message}`);
    return [];
  }
}

module.exports = {
  name: PROVIDER,
  search,
  getSubtitlesByImdb,
  _test: {
    parseIndexEmbedded, parseIndexSearchResults, pickIndexSearchResult,
    buildIndexZipName, buildIndexDownloadUrl, indexSubtitleSlugCandidates,
    extractJsonArray, pageImdbIds
  }
};
