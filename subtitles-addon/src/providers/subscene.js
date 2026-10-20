'use strict';

const cheerio = require('cheerio');
const http = require('../utils/http');
const config = require('../config');
const { toIso6392 } = require('../utils/languages');
const { classifyRelease, cleanText, normalizeTitle, slugifyTitle, ordinalWord } = require('../utils/release');
const { getCinemetaMetaAny } = require('../utils/cinemeta');
const { toStremioSubtitles } = require('../utils/stremio');

/**
 * Subscene actual (sub-scene.com) — scraping con Axios + Cheerio.
 *
 * ATENCIÓN: el sub-scene.com de hoy NO usa las rutas del Subscene clásico
 * (/subtitles/{slug}/{lang}/{id} + /subtitle/download?mac=…). La web nueva:
 *   - Su /search está tras un reto de Cloudflare, pero la caja de búsqueda
 *     usa un endpoint JSON abierto:
 *       GET /suggest?query={texto}
 *       -> { film: [{id,name,year}], tv: [{id,name,year}] }
 *   - Ficha del título:   /subscene/{id numérico}
 *     Las temporadas son "títulos" propios en el buscador, con nombres tipo
 *     "Game of Thrones - First Season": para series se pregunta primero por
 *     "{Título} - {Ordinal} Season" y si no, por el título a secas.
 *   - El listado de la ficha es una tabla donde cada subtítulo enlaza a
 *     /subtitle/{id} y el propio enlace lleva dos spans clásicos:
 *       <span class="l">English</span> <span class="new">Release.Name…</span>
 *     (un mismo id se repite por cada release compatible, como en SubSource)
 *   - La descarga se CONSTRUYE sin abrir la ficha:
 *       GET /download/{id}      (verificado en la página de detalle)
 *   - La ficha enlaza a imdb.com/title/tt… : verificamos el tt cuando el
 *     título se ha resuelto por nombre/año.
 *
 * API independiente:
 *   await getSubtitlesByImdb('tt0944947', 'es', { season: 1, episode: 3 })
 */
const PROVIDER = 'subscene';
const BASE = () => config.subsceneBaseUrl;

/* ------------------------------------------------------------------ utils */

function absUrl(href, pageUrl) {
  try { return new URL(href, pageUrl || BASE()).toString(); } catch { return null; }
}

function stripParens(name) {
  return String(name || '').replace(/\([^)]*\)/g, ' ');
}

/* ---------------------------------------------------------------- parsers */

/** /suggest -> lista plana [{id, name, year, kind:'film'|'tv'}] */
function parseSuggestResponse(data) {
  if (!data || typeof data !== 'object') return [];
  const out = [];
  for (const kind of ['film', 'tv']) {
    const items = Array.isArray(data[kind]) ? data[kind] : [];
    for (const item of items) {
      if (!item || item.id === undefined || !item.name) continue;
      out.push({
        id: String(item.id),
        name: String(item.name),
        year: item.year ? Number(item.year) : undefined,
        // /suggest ya devuelve el IMDb: nos evita depender del título exacto.
        imdbId: item.imdb ? `tt${String(item.imdb).replace(/^tt/i, '').padStart(7, '0')}` : undefined,
        kind
      });
    }
  }
  return out;
}

/** Película (o serie sin temporada): mejor coincidencia nombre/año/tipo. */
function pickSuggestTitle(items, { type, title, year, imdbId } = {}) {
  if (!items.length || (!title && !imdbId)) return null;
  const want = title ? normalizeTitle(title) : null;
  const wantKind = type === 'series' ? 'tv' : 'film';
  let best = null;
  let bestScore = -Infinity;
  items.forEach((item, i) => {
    const name = want ? normalizeTitle(stripParens(item.name)) : '';
    let score = -i * 0.01;
    // Coincidencia exacta de IMDb: es la señal más fiable de todas.
    if (imdbId && item.imdbId) score += item.imdbId === imdbId ? 8 : -4;
    if (item.kind === wantKind) score += 2;
    if (year && item.year) score += item.year === year ? 2 : -2;
    if (want) {
      if (name === want) score += 4;
      else if (name.startsWith(want) || want.startsWith(name)) score += 1;
    }
    if (score > bestScore) { bestScore = score; best = item; }
  });
  return bestScore > 0 ? best : null;
}

/**
 * Temporada concreta: "Title - First Season" > "Title … First Season"
 * > "Title Season 1" > la serie completa.
 */
function pickSeasonTitle(items, { title, season, imdbId } = {}) {
  if (!items.length || (!title && !imdbId) || season === undefined) return null;
  const want = title ? normalizeTitle(title) : null;
  const ordinal = (ordinalWord(season) || '').toLowerCase();
  let best = null;
  let bestRank = Infinity;
  for (const item of items) {
    if (imdbId && item.imdbId && item.imdbId !== imdbId) continue;
    const full = want ? normalizeTitle(stripParens(item.name)) : '';
    let rank = null;
    if (want && ordinal && full === `${want} ${ordinal} season`) rank = 0;
    else if (want && ordinal && full.startsWith(`${want} `) && full.endsWith(` ${ordinal} season`)) rank = 1;
    else if (want && full === `${want} season ${season}`) rank = 2;
    else if (want && full === want) rank = 3;
    else if (imdbId && item.imdbId === imdbId) rank = 4;
    if (rank !== null && rank < bestRank) { bestRank = rank; best = item; }
  }
  return best;
}

/** Listado /subscene/{id}: filas td.a1 con span.l (idioma) y span.new (release). */
function parseSubsceneListing(html, pageUrl) {
  const $ = cheerio.load(html);
  const byId = new Map();

  const add = (subtitleId, release, languageText, detailUrl) => {
    if (!subtitleId) return;
    const existing = byId.get(subtitleId);
    if (existing) {
      if (release && !existing.releases.includes(release)) existing.releases.push(release);
      return;
    }
    byId.set(subtitleId, {
      subtitleId,
      detailUrl,
      lang: toIso6392(languageText || ''),
      release: release || '',
      releases: release ? [release] : [],
      downloadUrl: `${BASE()}/download/${subtitleId}`
    });
  };

  // Vía principal verificada en la web actual.
  let anchors = $('td.a1 a[href^="/subtitle/"]');
  if (!anchors.length) anchors = $('a[href*="/subtitle/"]');
  anchors.each((_, a) => {
    const href = $(a).attr('href') || '';
    const abs = absUrl(href, pageUrl);
    if (!abs) return;
    let path = '';
    try { path = new URL(abs).pathname; } catch { return; }
    const m = path.match(/^\/subtitle\/(\d+)\/?$/);
    if (!m) return;

    let languageText = cleanText($(a).find('span.l').first().text());
    let release = cleanText($(a).find('span.new').first().text());
    if (!languageText || !release) {
      // Reserva: el enlace trae "{Idioma}<br>{Release}" sin spans útiles.
      const parts = ($(a).html() || '')
        .split(/<br[^>]*>/i)
        .map((p) => cleanText(cheerio.load(p).text()))
        .filter(Boolean);
      if (!languageText && parts.length > 1) languageText = parts[0];
      if (!release) release = parts.length > 1 ? parts.slice(1).join(' ') : cleanText($(a).text());
    }
    add(m[1], release, languageText, abs);
  });

  const out = [...byId.values()];
  for (const c of out) c.release = c.releases[0] || '';
  return out;
}

/** Ficha /subtitle/{id}: idioma (título), releases y enlace /download/{id}. */
function parseSubsceneDetail(html, pageUrl) {
  const $ = cheerio.load(html);
  let downloadUrl = null;
  $('a[href]').each((_, a) => {
    if (downloadUrl) return;
    const url = absUrl($(a).attr('href'), pageUrl);
    if (url && /\/download\/\d+/.test(url)) downloadUrl = url;
  });
  const titleText = cleanText($('title').first().text());
  const langMatch = titleText.match(/-\s*([A-Za-z][A-Za-z ]*?)\s+subtitle\s*$/i);
  const releases = [];
  $('li').each((_, li) => {
    const t = cleanText($(li).text());
    if (t && /\b(19|20)\d{2}\b/.test(t) && /[.\s](480p|720p|1080p|2160p|WEB|BluRay|HDTV|DVDRip|x26[45]|H\.?26[45])/i.test(t)) {
      releases.push(t);
    }
  });
  return {
    downloadUrl,
    lang: langMatch ? toIso6392(langMatch[1]) : undefined,
    release: releases[0],
    releases
  };
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

/* ----------------------------------------------------------------- lógica */

async function suggest(text, referer) {
  const { data } = await http.get(`${BASE()}/suggest`, {
    params: { query: text },
    headers: { Accept: 'application/json', Referer: referer || `${BASE()}/` },
    timeout: config.providerTimeoutMs
  });
  return parseSuggestResponse(data);
}

async function resolveTitle(query) {
  const { type, title, year, season, imdbId } = query;
  if (!title && !imdbId) return null;
  const searchText = title || imdbId;
  if (type === 'series' && season !== undefined) {
    const ordinal = ordinalWord(season);
    const queries = title && ordinal ? [`${title} - ${ordinal} Season`, title] : [searchText];
    for (const q of queries) {
      const items = await suggest(q);
      const hit = pickSeasonTitle(items.filter((i) => i.kind === 'tv'), { title, season, imdbId })
        || pickSuggestTitle(items, { type, title, year, imdbId });
      if (hit) return hit;
    }
    return null;
  }
  const items = await suggest(searchText);
  return pickSuggestTitle(items, { type, title, year, imdbId });
}

function classifyCandidate(candidate, season, episode) {
  const classes = (candidate.releases.length ? candidate.releases : [candidate.release])
    .map((r) => classifyRelease(r, season, episode));
  if (classes.includes('episode')) return 'episode';
  if (classes.includes('unknown')) return 'unknown';
  if (classes.includes('pack')) return 'pack';
  return 'mismatch';
}

async function searchInternal(query) {
  const titleItem = await resolveTitle(query);
  if (!titleItem) return [];
  const pageUrl = `${BASE()}/subscene/${titleItem.id}`;
  const html = await http.getHtml(pageUrl, { referer: `${BASE()}/` });
  const ids = pageImdbIds(html);
  // Si la ficha enlaza a otro tt…, el suggest nos dio el título equivocado.
  if (query.imdbId && ids.size && !ids.has(query.imdbId)) return [];
  return parseSubsceneListing(html, pageUrl);
}

function orderAndFilter(candidates, { season, episode }, desiredIsoList) {
  const desired = desiredIsoList || [];
  const langRank = (c) => {
    const i = desired.indexOf(c.lang);
    return i === -1 ? 99 : i;
  };
  const clsRank = { episode: 0, unknown: 1, pack: 2 };
  return candidates
    .map((c, i) => ({ c, i, cls: classifyCandidate(c, season, episode) }))
    .filter((x) => x.cls !== 'mismatch')
    .sort((a, b) =>
      (langRank(a.c) - langRank(b.c)) || (clsRank[a.cls] - clsRank[b.cls]) || (a.i - b.i))
    .map((x) => x.c);
}

function toProviderItems(candidates) {
  return candidates.map((c) => ({
    id: c.subtitleId,
    url: c.downloadUrl,
    lang: c.lang || 'und',
    provider: PROVIDER,
    release: c.release || '',
    referer: c.detailUrl,
    archive: true
  }));
}

/* ------------------------------------------------------- entradas públicas */

async function search(query) {
  try {
    const candidates = await searchInternal(query);
    const desired = config.languages.map((c) => toIso6392(c));
    return toProviderItems(orderAndFilter(candidates, query, desired))
      .slice(0, config.maxPerProvider);
  } catch (err) {
    console.warn(`[subscene] Error inesperado: ${err.message}`);
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
      if (!meta) return []; // sin título, el /suggest no puede trabajar
      title = title || meta.title;
      year = year !== undefined ? year : meta.year;
      type = type || meta.type;
    }
    let candidates = await searchInternal({
      imdbId,
      type: type || (options.season !== undefined ? 'series' : 'movie'),
      title, year, season: options.season, episode: options.episode
    });
    if (target) candidates = candidates.filter((c) => c.lang === target);
    const ordered = orderAndFilter(candidates, options, target ? [target] : []);
    return toStremioSubtitles(PROVIDER, toProviderItems(ordered)
      .slice(0, config.maxPerProvider));
  } catch (err) {
    console.warn(`[subscene] getSubtitlesByImdb falló: ${err.message}`);
    return [];
  }
}

module.exports = {
  name: PROVIDER,
  search,
  getSubtitlesByImdb,
  _test: {
    parseSuggestResponse, pickSuggestTitle, pickSeasonTitle,
    parseSubsceneListing, parseSubsceneDetail, pageImdbIds,
    classifyCandidate, slugifyTitle
  }
};
