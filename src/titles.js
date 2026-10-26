/**
 * src/titles.js — Resolvedor de IDs a títulos.
 *
 * Stremio solo manda el ID (`tt0816692`, `tt0944947:2:1`, `tmdb:157336`).
 * Las dos webs de destino son españolas y buscan por nombre, así que aquí se
 * traduce el ID a **una lista de títulos** con la que buscar:
 *
 *   1. Cinemeta  (IMDb → name / originalName / año)   sin clave
 *   2. TMDB      (→ título en español, vía /find)      con TMDB_API_KEY
 *   3. Wikidata+Wikipedia es (→ «Interestelar» desde Interstellar) sin clave
 *   4. IMDb      (sugerencias, si Cinemeta no responde) sin clave
 *
 * Cuantos más nombres se prueben, más fácil es que el buscador del sitio
 * encuentre la ficha: «Interestelar» además de «Interstellar». Todo se cachea
 * por ID; si ninguna fuente responde se devuelve null y el addon contesta
 * `{ streams: [] }` en vez de buscar a ciegas.
 */

import { config } from './config.js';
import { requestJson } from './http.js';
import { metaCache } from './cache.js';
import { compact } from './utils/text.js';

const IMDB_RE = /^tt\d{5,}$/;
const TMDB_RE = /^(?:tmdb[:/])?(\d+)$/i;

function clean(value) {
  return String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
}

function yearOf(value) {
  const match = /((?:19|20)\d{2})/.exec(String(value == null ? '' : value));
  return match ? match[1] : '';
}

/**
 * "tt0944947:2:1"     → { kind:'imdb', imdbId, season:2, episode:1 }
 * "tmdb:157336:1:2"   → { kind:'tmdb', tmdbId, season:1, episode:2 }
 */
export function parseStremioId(rawId) {
  const parts = String(rawId == null ? '' : rawId).split(':');
  const head = clean(parts[0]);

  // "tmdb:157336:1:2" lleva su propio prefijo, así que el ID y la temporada
  // van una posición más a la derecha que en "tt0944947:1:2".
  const prefixed = /^tmdb$/i.test(head);
  const idValue = prefixed ? clean(parts[1]) : head;
  const season = Number.parseInt(prefixed ? parts[2] : parts[1], 10);
  const episode = Number.parseInt(prefixed ? parts[3] : parts[2], 10);
  const tail = {
    season: Number.isInteger(season) ? season : null,
    episode: Number.isInteger(episode) ? episode : null
  };

  if (!prefixed && IMDB_RE.test(idValue)) {
    return { kind: 'imdb', imdbId: idValue, tmdbId: null, ...tail };
  }

  const tmdb = TMDB_RE.exec(idValue);
  if (tmdb) {
    return { kind: 'tmdb', imdbId: null, tmdbId: tmdb[1], ...tail };
  }

  return null;
}

/* ------------------------------------------------------------------ *
 *  TMDB (opcional: necesita TMDB_API_KEY)
 * ------------------------------------------------------------------ */

export function tmdbEnabled() {
  return Boolean(config.tmdbApiKey);
}

async function tmdbRequest(path, deadline) {
  if (!tmdbEnabled()) return null;
  const separator = path.includes('?') ? '&' : '?';
  const key = config.tmdbApiKey;
  // La clave v4 es un JWT (lleva puntos) y va en la cabecera Authorization;
  // la v3 clásica va como ?api_key=.
  const isBearer = key.includes('.');
  const url = `${config.tmdbBaseUrl}${path}${isBearer ? '' : `${separator}api_key=${encodeURIComponent(key)}`}`;

  const result = await requestJson(url, {
    deadline,
    headers: isBearer ? { Authorization: `Bearer ${key}`, Accept: 'application/json' } : { Accept: 'application/json' }
  });
  return result.ok && result.json ? result.json : null;
}

const TMDB_PATH = { movie: 'movie', series: 'tv' };

function fromTmdb(data) {
  if (!data || typeof data !== 'object') return null;
  const name = clean(data.title || data.name);
  const originalName = clean(data.original_title || data.original_name);
  if (!name && !originalName) return null;
  return {
    name: name || originalName,
    originalName: originalName || name,
    year: yearOf(data.release_date || data.first_air_date)
  };
}

/** TMDB por ID propio: /movie/{id} o /tv/{id}, en español. */
async function tmdbById(tmdbId, type, deadline) {
  const path = `/${TMDB_PATH[type] || 'movie'}/${encodeURIComponent(tmdbId)}?language=${encodeURIComponent(config.tmdbLanguage)}`;
  return fromTmdb(await tmdbRequest(path, deadline));
}

/** TMDB a partir del IMDb: /find/{tt…}?external_source=imdb_id */
async function tmdbByImdb(imdbId, type, deadline) {
  const path = `/find/${encodeURIComponent(imdbId)}?external_source=imdb_id&language=${encodeURIComponent(config.tmdbLanguage)}`;
  const data = await tmdbRequest(path, deadline);
  if (!data) return null;
  const list = type === 'series' ? data.tv_results : data.movie_results;
  if (!Array.isArray(list) || !list.length) {
    const other = type === 'series' ? data.movie_results : data.tv_results;
    return Array.isArray(other) && other.length ? fromTmdb(other[0]) : null;
  }
  return fromTmdb(list[0]);
}

/* ------------------------------------------------------------------ *
 *  Cinemeta e IMDb (sin clave)
 * ------------------------------------------------------------------ */

async function fromCinemeta(imdbId, type, deadline) {
  const url = `${config.cinemetaBaseUrl}/meta/${type}/${imdbId}.json`;
  const result = await requestJson(url, { deadline, headers: { Accept: 'application/json' } });
  const meta = result.json && result.json.meta ? result.json.meta : null;
  if (!meta || !meta.name) return null;

  return {
    name: clean(meta.name),
    originalName: clean(meta.originalName || '') || clean(meta.name),
    year: yearOf(meta.year || meta.releaseInfo)
  };
}

/** Último recurso sin clave: el buscador público de IMDb. */
async function fromImdbSuggestion(imdbId, deadline) {
  const url = `${config.imdbSuggestionBaseUrl}/${imdbId}.json`;
  const result = await requestJson(url, { deadline, headers: { Accept: 'application/json' } });
  const list = result.json && Array.isArray(result.json.d) ? result.json.d : [];
  const entry = list.find((item) => item && item.id === imdbId) || list[0];
  if (!entry || !entry.l) return null;

  return {
    name: clean(entry.l),
    originalName: clean(entry.l),
    year: yearOf(entry.y)
  };
}

/* ------------------------------------------------------------------ *
 *  Wikipedia en español (sin clave)
 * ------------------------------------------------------------------ */

/**
 * Limpia un valor de ficha de Wikipedia: `''Interestelar'' ([[Hispanoamérica]])`
 * → «Interestelar». Quita referencias, plantillas, enlaces y aclaraciones entre
 * paréntesis (el país donde se usó ese título, «película de 2014»…).
 */
export function cleanWikiName(value) {
  return String(value == null ? '' : value)
    .replace(/<ref[^>]*\/>/gi, ' ')
    .replace(/<ref[\s\S]*?<\/ref>/gi, ' ')
    .replace(/\{\{[^{}]*\}\}/g, ' ')
    .replace(/\[\[[^\]|]*\|([^\]]*)\]\]/g, '$1')
    .replace(/\[\[([^\]]*)\]\]/g, '$1')
    .replace(/'{2,}/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/\([^()]*\)/g, ' ')
    .replace(/[|{}[\]]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^[\s.,;:–—-]+|[\s.,;:–—-]+$/g, '')
    .trim();
}

/** Corta el valor del campo en el siguiente `|` de la misma línea (plantillas en una línea). */
function cutFileValue(value) {
  let links = 0;
  let templates = 0;
  for (let i = 0; i < value.length; i += 1) {
    const pair = value.slice(i, i + 2);
    if (pair === '[[') { links += 1; i += 1; continue; }
    if (pair === ']]') { links = Math.max(0, links - 1); i += 1; continue; }
    if (pair === '{{') { templates += 1; i += 1; continue; }
    if (pair === '}}') { templates = Math.max(0, templates - 1); i += 1; continue; }
    if (value[i] === '|' && links === 0 && templates === 0) return value.slice(0, i);
  }
  return value;
}

/**
 * Títulos en español que declara la ficha de Wikipedia:
 *
 *   | título = ''Interestelar'' ([[Hispanoamérica]])
 *   | título = ''''Cadena perpetua'''' ([[España]])''''Sueño de fuga'''' (resto de [[Hispanoamérica]])
 *
 * Cada título va entre comillas simples de Wiki; cuando dos van seguidos las
 * comillas se pegan, así que se parte por rachas de comillas y se descartan
 * los trozos que solo eran la aclaración del país. Nunca se lee
 * `título original` (ese es el inglés y ya lo da Cinemeta).
 */
export function parseSpanishTitlesFromWikitext(wikitext) {
  const text = String(wikitext == null ? '' : wikitext);
  const titles = [];
  const seen = new Set();

  const push = (value) => {
    const title = cleanWikiName(value);
    if (!title || title.length > 90) return;
    const key = compact(title);
    if (!key || seen.has(key)) return;
    seen.add(key);
    titles.push(title);
  };

  // Solo los campos de la ficha, que empiezan la línea (`| título = …`). Las
  // plantillas de citas de dentro llevan `|título=` y colarían aquí.
  const re = /^\s*\|\s*((?:t[ií]tulo|nombre)[^=|\n]{0,32})\s*=\s*([^\n]*)/gim;
  let match;

  while ((match = re.exec(text))) {
    if (/original/i.test(match[1])) continue;
    const value = cutFileValue(match[2]);
    for (const line of value.split(/<br\s*\/?>|\n/i)) {
      const pieces = /'{2,}/.test(line) ? line.split(/'{2,}/) : [line];
      for (const piece of pieces) {
        // «([[España]])», «(resto de [[Hispanoamérica]])»…: solo el país.
        if (/^\s*\(/.test(piece)) continue;
        push(piece);
      }
    }
  }

  if (titles.length) return titles.slice(0, 4);

  // Plantilla escrita en una sola línea: `{{Ficha de película |título = …}}`.
  const inline = /\|\s*((?:t[ií]tulo|nombre)[^=|\n]{0,32})\s*=\s*([^|}]*)/gi;
  const depthAt = (index) => {
    const before = text.slice(0, index);
    const open = (before.match(/\{\{/g) || []).length;
    const close = (before.match(/\}\}/g) || []).length;
    return open - close;
  };
  while ((match = inline.exec(text))) {
    if (/original/i.test(match[1])) continue;
    // Dentro de la ficha (nivel 1) sí; dentro de una cita anidada (nivel 2+), no.
    if (depthAt(match.index) > 1) continue;
    push(match[2]);
  }

  return titles.slice(0, 4);
}

/** Pide la sección 0 (ficha) de un artículo; '' si no existe. */
async function wikipediaWikitext(page, deadline) {
  const base = config.wikipediaBaseUrl.replace(/\/+$/, '');
  const url = `${base}/w/api.php?action=parse&page=${encodeURIComponent(page)}`
    + '&prop=wikitext&section=0&redirects=1&format=json&formatversion=2';
  const result = await requestJson(url, { deadline, headers: { Accept: 'application/json' } });
  const parsed = result.json && result.json.parse;
  return parsed && typeof parsed.wikitext === 'string' ? parsed.wikitext : '';
}

/**
 * Artículo de la Wikipedia en español del título exacto: IMDb → Wikidata
 * (`haswbstatement:P345`) → enlace `eswiki`. Sin ambigüedad: buscar «Loki» a
 * secas devuelve el artículo del dios nórdico, no el de la serie.
 */
async function wikipediaArticleFor(imdbId, deadline) {
  const base = config.wikidataBaseUrl.replace(/\/+$/, '');
  const headers = { Accept: 'application/json' };

  const searchUrl = `${base}/w/api.php?action=query&list=search`
    + `&srsearch=${encodeURIComponent(`haswbstatement:P345=${imdbId}`)}`
    + '&srlimit=1&format=json&formatversion=2';
  const found = await requestJson(searchUrl, { deadline, headers }).catch(() => null);
  const hits = found && found.json && found.json.query && found.json.query.search;
  const qid = Array.isArray(hits) && hits[0] ? clean(hits[0].title) : '';
  if (!/^Q\d+$/.test(qid)) return null;

  const entityUrl = `${base}/w/api.php?action=wbgetentities&ids=${qid}`
    + '&props=sitelinks&sitefilter=eswiki&format=json&formatversion=2';
  const entity = await requestJson(entityUrl, { deadline, headers }).catch(() => null);
  const links = entity && entity.json && entity.json.entities && entity.json.entities[qid]
    && entity.json.entities[qid].sitelinks;
  const title = links && links.eswiki && links.eswiki.title;
  return typeof title === 'string' && title ? title : null;
}

/**
 * Títulos en español según Wikipedia. Solo se usa con el artículo que
 * corresponde al ID de IMDb pedido, así que nunca cae en un homónimo.
 */
async function fromWikipedia(imdbId, deadline) {
  if (!config.wikipediaTitles || !imdbId) return null;

  const article = await wikipediaArticleFor(imdbId, deadline).catch(() => null);
  if (!article) return null;

  const wikitext = await wikipediaWikitext(article, deadline).catch(() => '');
  const titles = parseSpanishTitlesFromWikitext(wikitext);
  return titles.length ? titles : null;
}

/* ------------------------------------------------------------------ *
 *  Resolución
 * ------------------------------------------------------------------ */

function mergeTitles(candidates) {
  const seen = new Set();
  const titles = [];
  for (const candidate of candidates) {
    // Un título suelto («Interestelar») o un objeto {name, originalName}.
    const values = typeof candidate === 'string'
      ? [candidate]
      : (Array.isArray(candidate)
        ? candidate
        : [candidate && candidate.name, candidate && candidate.originalName]);
    for (const value of values) {
      const title = clean(value);
      if (!title) continue;
      const key = compact(title);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      titles.push(title);
    }
  }
  if (titles.length) return titles.slice(0, 4);

  // Plantilla escrita en una sola línea: `{{Ficha de película |título = …}}`.
  const inline = /\|\s*((?:t[ií]tulo|nombre)[^=|\n]{0,32})\s*=\s*([^|}]*)/gi;
  const depthAt = (index) => {
    const before = text.slice(0, index);
    const open = (before.match(/\{\{/g) || []).length;
    const close = (before.match(/\}\}/g) || []).length;
    return open - close;
  };
  while ((match = inline.exec(text))) {
    if (/original/i.test(match[1])) continue;
    // Dentro de la ficha (nivel 1) sí; dentro de una cita anidada (nivel 2+), no.
    if (depthAt(match.index) > 1) continue;
    push(match[2]);
  }

  return titles.slice(0, 4);
}

/**
 * Devuelve { imdbId, tmdbId, type, name, originalName, year, titles, season,
 * episode } o null si no se pudo poner nombre al ID.
 */
export async function lookupTitle(type, rawId, { deadline } = {}) {
  if (type !== 'movie' && type !== 'series') return null;
  const parsed = parseStremioId(rawId);
  if (!parsed) return null;

  const cacheKey = `title:${type}:${parsed.imdbId || `tmdb${parsed.tmdbId}`}`;
  const cached = metaCache.get(cacheKey);
  if (cached) {
    return { ...cached, season: parsed.season, episode: parsed.episode };
  }

  const sources = [];
  let imdb = null;
  let tmdb = null;
  let wikipedia = null;

  if (parsed.kind === 'imdb') {
    // Cinemeta y TMDB son independientes: se piden a la vez.
    const [cinemeta, tmdbResult] = await Promise.all([
      fromCinemeta(parsed.imdbId, type, deadline).catch(() => null),
      tmdbByImdb(parsed.imdbId, type, deadline).catch(() => null)
    ]);
    imdb = cinemeta;
    tmdb = tmdbResult;
    if (imdb) sources.push('cinemeta');
    if (tmdb) sources.push('tmdb');

    // Wikipedia traduce «Interstellar» → «Interestelar», que es el nombre con
    // el que las webs tienen la ficha. Necesita el nombre, así que va después.
    wikipedia = await fromWikipedia(parsed.imdbId, deadline).catch(() => null);
    if (wikipedia) sources.push('wikipedia');

    if (!imdb) {
      const suggestion = await fromImdbSuggestion(parsed.imdbId, deadline).catch(() => null);
      if (suggestion) {
        imdb = suggestion;
        sources.push('imdb');
      }
    }
  } else {
    tmdb = await tmdbById(parsed.tmdbId, type, deadline).catch(() => null);
    if (tmdb) sources.push('tmdb');
  }

  if (!imdb && !tmdb) {
    if (config.debug) console.warn(`[titles] ${type}/${rawId}: sin nombre en ninguna fuente`);
    return null;
  }

  // El español manda (las dos webs buscan por el título de su ficha): primero
  // Wikipedia —es el que usa Latinoamérica—, después TMDB y por último el
  // título original de Cinemeta.
  const ordered = [...(wikipedia || []), tmdb, imdb];
  const info = {
    imdbId: parsed.imdbId,
    tmdbId: parsed.tmdbId,
    type,
    name: clean((imdb || tmdb).name),
    originalName: clean((imdb || tmdb).originalName) || clean((imdb || tmdb).name),
    year: (imdb && imdb.year) || (tmdb && tmdb.year) || '',
    titles: mergeTitles(ordered.filter(Boolean)),
    sources
  };

  if (config.debug) {
    console.log(`[titles] ${rawId} → ${info.titles.map((title) => `"${title}"`).join(' / ')} (${sources.join('+')})`);
  }

  metaCache.set(cacheKey, info, 86400);
  return { ...info, season: parsed.season, episode: parsed.episode };
}
