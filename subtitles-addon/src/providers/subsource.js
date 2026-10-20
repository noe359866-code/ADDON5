'use strict';

const cheerio = require('cheerio');
const http = require('../utils/http');
const config = require('../config');
const { toIso6392, slugToIso6392 } = require('../utils/languages');
const { classifyRelease, cleanText, slugifyTitle } = require('../utils/release');

/**
 * SubSource (subsource.net) — SCRAPING con Axios + Cheerio (sin clave), con
 * la API oficial como reserva si defines SUBSOURCE_API_KEY.
 *
 * Estructura REAL verificada contra la web (2026):
 *   Listado película: /subtitles/{slug}-{año}      (a veces sin año)
 *   Listado serie:    /subtitles/{slug}/season-{n} (el slug puede llevar año)
 *   El listado es una TABLA: Language | Release Name | H.I. | Type | Owner,
 *   y cada celda enlaza a la ficha /subtitle/{slug}/{idioma}/{id numérico}.
 *   Ojo: un mismo subtítulo (mismo id) aparece en VARIAS filas, una por cada
 *   release con el que sincroniza -> deduplicamos por id conservando todos
 *   sus nombres de release (sirven para el filtro de episodio).
 *   Ficha: botón "Download X Subtitle" ->
 *     https://api.subsource.net/v1/subtitle/download/{token}
 *   La ficha/listado enlazan a imdb.com/title/tt... : lo usamos para
 *   VERIFICAR que el slug adivinado corresponde al tt pedido.
 *   El buscador web (/search) carga por JS ("Searching…"), así que para
 *   resolver IMDb -> slug usamos título/año (Cinemeta) + verificación IMDb;
 *   como reserva, el endpoint interno que usa la propia web para buscar.
 */
const BASE = 'https://subsource.net';
const API_BASE = 'https://api.subsource.net/api/v1';
const DETAIL_RE = /^\/subtitle\/([^/]+)\/([^/]+)\/(\d+)\/?$/;

/* ------------------------------------------------------------------ utils */

function absUrl(href, pageUrl) {
  try { return new URL(href, pageUrl || BASE).toString(); } catch { return null; }
}

function chunks(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/** Todos los tt... enlazados desde la página (para verificar el slug). */
function pageImdbIds(html) {
  const $ = cheerio.load(html);
  const ids = new Set();
  $('a[href*="imdb.com/title/"]').each((_, el) => {
    const m = ($(el).attr('href') || '').match(/imdb\.com\/title\/(tt\d+)/);
    if (m) ids.add(m[1]);
  });
  return ids;
}

/* ---------------------------------------------------------------- parsers */

/** De los textos que enlazan a la misma ficha, elige el que parece un release. */
function pickReleaseText(texts, languageSlug) {
  const langName = String(languageSlug || '').replace(/_/g, ' ').toLowerCase();
  const candidates = texts
    .map(cleanText)
    .filter((t) => t && t.toLowerCase() !== langName)
    .filter((t) => !/^(web|bluray|hdtv|other|dvd|bdrip|brrip|webrip|cam|hdrip|dvdrip)$/i.test(t))
    .filter((t) => !/^\d+h\s+\d+m(\s+\d+s)?$/i.test(t)); // duraciones "2h 37m 01s"
  if (!candidates.length) return '';
  const score = (t) =>
    (/\bS\d{1,2}E\d{1,3}\b/i.test(t) ? 4 : 0) +
    (/\b(19|20)\d{2}\b/.test(t) ? 2 : 0) +
    ((t.match(/\./g) || []).length >= 2 ? 2 : 0) +
    (/\b(720p|1080p|2160p|bluray|web-?dl|x26[45]|hevc|hdtv|amzn|nf)\b/i.test(t) ? 1 : 0) -
    (t.length > 110 ? 2 : 0); // los "caption" largos no son releases
  return candidates.sort((a, b) => score(b) - score(a))[0];
}

/** Tabla del listado -> candidatos deduplicados por id de subtítulo. */
function parseSubsourceListing(html, pageUrl) {
  const $ = cheerio.load(html);
  const byId = new Map();

  const addCandidate = (detailPath, release) => {
    const m = detailPath.match(DETAIL_RE);
    if (!m) return;
    const [, , languageSlug, id] = m;
    const existing = byId.get(id);
    if (existing) {
      if (release && !existing.releases.includes(release)) existing.releases.push(release);
      return;
    }
    byId.set(id, {
      subtitleId: id,
      languageSlug,
      lang: slugToIso6392(languageSlug),
      detailUrl: absUrl(detailPath, pageUrl),
      release: release || '',
      releases: release ? [release] : []
    });
  };

  // Vía principal: filas de la tabla (varias celdas enlazan a la misma ficha)
  $('tr').each((_, row) => {
    const textsByPath = new Map();
    $(row).find('a[href]').each((__, a) => {
      const href = $(a).attr('href') || '';
      let path;
      try { path = new URL(href, pageUrl || BASE).pathname; } catch { return; }
      if (!DETAIL_RE.test(path)) return;
      if (!textsByPath.has(path)) textsByPath.set(path, []);
      textsByPath.get(path).push($(a).text());
    });
    for (const [path, texts] of textsByPath) {
      const languageSlug = path.match(DETAIL_RE)[2];
      addCandidate(path, pickReleaseText(texts, languageSlug));
    }
  });

  // Reserva si la tabla deja de existir: cualquier enlace de ficha suelto.
  if (!byId.size) {
    $('a[href]').each((_, a) => {
      const href = $(a).attr('href') || '';
      let path;
      try { path = new URL(href, pageUrl || BASE).pathname; } catch { return; }
      if (!DETAIL_RE.test(path)) return;
      addCandidate(path, pickReleaseText([$(a).text()], path.match(DETAIL_RE)[2]));
    });
  }

  const out = [...byId.values()];
  for (const c of out) c.release = c.releases[0] || c.release || '';
  return out;
}

/** Ficha de subtítulo -> URL de descarga (token), release e idioma. */
function parseSubsourceDetail(html, detailUrl) {
  const $ = cheerio.load(html);
  let downloadUrl = null;
  $('a[href]').each((_, el) => {
    if (downloadUrl) return;
    const url = absUrl($(el).attr('href'), detailUrl);
    if (!url) return;
    if (/\/subtitle\/download\//.test(url) || /api\.subsource\.net\/.+\/download\//.test(url)) {
      downloadUrl = url;
      return;
    }
    if (/^download\b/i.test(cleanText($(el).text())) && /subsource\.net/.test(url)) {
      downloadUrl = url;
    }
  });

  const bodyText = cleanText($('body').text());
  const releaseMatch = bodyText.match(/Release Info:\s*(?:Copy all\s+)?(.{3,300}?)\s+(A Commentary By:|Download [A-Z]|Subtitle Details)/);

  let languageSlug;
  try {
    const m = new URL(detailUrl).pathname.match(DETAIL_RE);
    if (m) languageSlug = m[2];
  } catch { /* noop */ }
  if (!languageSlug) {
    const tm = cleanText($('title').first().text()).match(/-\s*([A-Za-z][A-Za-z ]*?)\s+Subtitle/i);
    if (tm) languageSlug = tm[1];
  }

  return {
    downloadUrl,
    release: releaseMatch ? releaseMatch[1].trim() : undefined,
    lang: languageSlug ? slugToIso6392(languageSlug) : undefined
  };
}

/** Candidatos de slug a probar para el listado (con/sin año, según el sitio). */
function subsourceSlugCandidates({ type, title, year, season }) {
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

/* --------------------------------------------------------- resolución IMDb */

async function tryListingUrl(url, imdbId, referer) {
  const html = await http.getHtml(url, { referer });
  const ids = pageImdbIds(html);
  if (ids.size && !ids.has(imdbId)) return null; // slug equivocado: descartar
  const candidates = parseSubsourceListing(html, url);
  if (!candidates.length && !ids.has(imdbId)) return null;
  return { url, candidates };
}

/**
 * Reserva: el endpoint interno de búsqueda que usa la propia web
 * (POST /v1/movie/search). Su formato ha cambiado con los años, así que es
 * código best-effort: extraemos de la respuesta cualquier ruta /subtitles/…
 * o "link" y lo verificamos igual que un slug adivinado.
 */
async function resolveViaInternalSearch(query) {
  const { title, year, imdbId } = query;
  if (!title) return null;
  const { data } = await http.post(
    'https://api.subsource.net/v1/movie/search',
    { query: `${title} ${year || ''}`.trim(), includeSeasons: true },
    {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Origin: BASE,
        Referer: `${BASE}/search`
      },
      timeout: 6000
    }
  );
  const foundPaths = [];
  const walk = (node) => {
    if (!node || foundPaths.length > 5) return;
    if (typeof node === 'string') {
      const clean = node.replace('season=', 'season-');
      const m = clean.match(/subtitles\/([A-Za-z0-9\-/]+)/) || clean.match(/^([a-z0-9-]+(?:\/season-\d+)?)$/);
      if (m && clean.length < 160) foundPaths.push(m[1].replace(/^\/+/, ''));
      return;
    }
    if (Array.isArray(node)) { node.slice(0, 5).forEach(walk); return; }
    if (typeof node === 'object') Object.values(node).forEach(walk);
  };
  walk(data);
  for (const path of [...new Set(foundPaths)]) {
    try {
      const resolved = await tryListingUrl(`${BASE}/subtitles/${path}`, imdbId, `${BASE}/search`);
      if (resolved) return resolved;
    } catch { /* siguiente */ }
  }
  return null;
}

async function resolveListing(query) {
  for (const path of subsourceSlugCandidates(query)) {
    try {
      const resolved = await tryListingUrl(`${BASE}/subtitles/${path}`, query.imdbId, `${BASE}/`);
      if (resolved) return resolved;
    } catch (err) {
      console.warn(`[subsource] Slug ${path} no válido: ${err.message}`);
    }
  }
  try {
    return await resolveViaInternalSearch(query);
  } catch (err) {
    console.warn(`[subsource] Búsqueda interna falló: ${err.message}`);
    return null;
  }
}

/* -------------------------------------------------------------- API reserva */

function asArray(payload, keys) {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== 'object') return [];
  for (const key of keys) if (Array.isArray(payload[key])) return payload[key];
  return [];
}

async function searchByApi({ imdbId, season, episode }) {
  const headers = { 'X-API-Key': config.subsourceApiKey, Accept: 'application/json' };
  const moviesRes = await http.get(`${API_BASE}/movies/search`, {
    headers,
    params: { searchType: 'imdb', imdb: imdbId }
  });
  const movie = asArray(moviesRes.data, ['data', 'results', 'movies'])[0];
  const movieId = movie && (movie.id || movie.movieId || movie._id);
  if (!movieId) return [];

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
    for (const sub of asArray(subsRes.data, ['data', 'results', 'subtitles'])) {
      const subId = sub.id || sub.subtitleId || sub._id;
      if (!subId) continue;
      if (season !== undefined && sub.season != null && Number(sub.season) !== season) continue;
      if (episode !== undefined && sub.episode != null && Number(sub.episode) !== episode) continue;
      out.push({
        id: subId,
        url: `${API_BASE}/subtitles/${subId}/download`,
        lang: toIso6392(sub.language || sub.lang || lang2),
        provider: 'subsource',
        release: sub.releaseName || sub.release_name || sub.name || ''
      });
    }
  }
  return out;
}

/* -------------------------------------------------------------- scraping */

function classifyCandidate(candidate, season, episode) {
  const classes = (candidate.releases.length ? candidate.releases : [candidate.release])
    .map((r) => classifyRelease(r, season, episode));
  if (classes.includes('episode')) return 'episode';
  if (classes.includes('unknown')) return 'unknown';
  if (classes.includes('pack')) return 'pack';
  return 'mismatch';
}

function orderCandidates(candidates, { season, episode }) {
  const preferred = config.languages.map((c) => toIso6392(c));
  const clsRank = { episode: 0, unknown: 1, pack: 2 };
  return candidates
    .map((c, i) => ({
      c, i,
      cls: classifyCandidate(c, season, episode),
      langRank: preferred.includes(c.lang) ? preferred.indexOf(c.lang) : 99
    }))
    .filter((x) => x.cls !== 'mismatch')
    // Primero tus idiomas configurados (para gastar las fichas de detalle
    // en ellos), dentro de cada idioma: episodio exacto > desconocido > pack.
    .sort((a, b) => (a.langRank - b.langRank) || (clsRank[a.cls] - clsRank[b.cls]) || (a.i - b.i))
    .map((x) => x.c);
}

async function searchByScraping(query) {
  const resolved = await resolveListing(query);
  if (!resolved) return [];

  const ordered = orderCandidates(resolved.candidates, query)
    .slice(0, config.maxDetailFetches);

  // Sin abrir la ficha no hay URL de descarga: es EL paso que convierte
  // candidatos en subtítulos servibles. En lotes de 4 y tolerante a fallos.
  const out = [];
  for (const batch of chunks(ordered, 4)) {
    const results = await Promise.allSettled(batch.map(async (c) => {
      const html = await http.getHtml(c.detailUrl, { referer: resolved.url, timeout: 6000 });
      const detail = parseSubsourceDetail(html, c.detailUrl);
      if (!detail.downloadUrl) return null;
      return {
        id: c.subtitleId,
        url: detail.downloadUrl,
        lang: detail.lang || c.lang || 'und',
        provider: 'subsource',
        release: detail.release || c.release || ''
      };
    }));
    for (const r of results) {
      if (r.status === 'fulfilled' && r.value) out.push(r.value);
      else if (r.status === 'rejected') {
        console.warn(`[subsource] Ficha falló: ${r.reason?.message || r.reason}`);
      }
    }
  }
  return out.slice(0, config.maxPerProvider);
}

/* ------------------------------------------------------------------ search */

async function search(query) {
  // try/catch TOTAL: este proveedor jamás propaga un error al addon.
  try {
    try {
      const scraped = await searchByScraping(query);
      if (scraped.length) return scraped;
    } catch (err) {
      console.warn(`[subsource] Scraping falló para ${query.imdbId}: ${err.message}`);
    }
    if (config.subsourceApiKey) {
      try {
        return await searchByApi(query);
      } catch (err) {
        console.warn(`[subsource] API falló para ${query.imdbId}: ${err.message}`);
      }
    }
    return [];
  } catch (err) {
    console.warn(`[subsource] Error inesperado: ${err.message}`);
    return [];
  }
}

module.exports = {
  name: 'subsource',
  search,
  _test: {
    parseSubsourceListing, parseSubsourceDetail, pageImdbIds,
    subsourceSlugCandidates, classifyCandidate, pickReleaseText
  }
};
