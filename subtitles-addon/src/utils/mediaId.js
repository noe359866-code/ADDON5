'use strict';

const axios = require('axios');
const config = require('../config');

/**
 * IDs que Stremio puede enviar al recurso "subtitles".
 *
 *   Cine/series (Cinemeta):  "tt0111161"          -> IMDb
 *                            "tt0944947:1:3"      -> IMDb + temporada/episodio
 *   Anime (catálogos Kitsu): "kitsu:1234"         -> película de anime
 *                            "kitsu:1234:5"       -> episodio 5 (sin temporada)
 *                            "kitsu:1234:1:5"     -> temporada 1, episodio 5
 *                            "mal:1234:5" / "anidb:1234:5"
 *
 * Los sitios de subtítulos solo entienden IMDb (tt…), así que para los IDs de
 * anime resolvemos el tt… equivalente antes de buscar. Sin esto, Stremio
 * mostraría "ningún subtítulo" en todo lo que venga de catálogos de anime.
 */

const NAMESPACES = new Set(['tt', 'kitsu', 'mal', 'anidb']);

/**
 * @returns {null|{
 *   namespace:'tt'|'kitsu'|'mal'|'anidb',
 *   imdbId?:string, externalId?:string,
 *   season?:number, episode?:number
 * }}
 */
function parseMediaId(raw) {
  if (typeof raw !== 'string') return null;
  const parts = raw.trim().split(':').filter((p) => p !== '');
  if (!parts.length) return null;

  const head = parts[0].toLowerCase();
  const numbers = [];
  const numeric = (value) => /^\d+$/.test(value || '') ? Number(value) : null;

  if (/^tt\d{5,}$/.test(head)) {
    for (const part of parts.slice(1)) {
      const n = numeric(part);
      if (n === null) return null;
      numbers.push(n);
    }
    const timing = numbers.length === 1
      ? { episode: numbers[0] }
      : numbers.length >= 2 ? { season: numbers[0], episode: numbers[1] } : {};
    return { namespace: 'tt', imdbId: head, ...timing };
  }

  if (NAMESPACES.has(head) && head !== 'tt') {
    const externalId = parts[1];
    if (!/^\d+$/.test(externalId || '')) return null;
    for (const part of parts.slice(2)) {
      const n = numeric(part);
      if (n === null) return null;
      numbers.push(n);
    }
    const timing = numbers.length === 1
      ? { episode: numbers[0] }
      : numbers.length >= 2 ? { season: numbers[0], episode: numbers[1] } : {};
    return { namespace: head, externalId, ...timing };
  }
  return null;
}

/* --------------------------------------------------------- anime -> IMDb */

let animeIndexPromise = null;
let animeIndexFailedAt = 0;

function pickImdb(value) {
  if (typeof value !== 'string') return null;
  const m = value.match(/tt\d{5,}/i);
  return m ? m[0].toLowerCase() : null;
}

function buildIndex(rows) {
  const byKitsu = new Map();
  const byMal = new Map();
  const byAnidb = new Map();
  for (const row of rows) {
    if (!row || typeof row !== 'object') continue;
    const imdb = pickImdb(row.imdb_id || row.imdbId || row.imdb);
    if (!imdb) continue;
    const kitsu = row.kitsu_id || row.kitsuId;
    const mal = row.mal_id || row.malId;
    const anidb = row.anidb_id || row.anidbId;
    if (kitsu !== undefined && kitsu !== null) byKitsu.set(String(kitsu), imdb);
    if (mal !== undefined && mal !== null) byMal.set(String(mal), imdb);
    if (anidb !== undefined && anidb !== null) byAnidb.set(String(anidb), imdb);
  }
  return { byKitsu, byMal, byAnidb };
}

async function fetchJson(url) {
  const { data } = await axios.get(url, {
    timeout: config.animeMappingTimeoutMs,
    maxContentLength: 60 * 1024 * 1024,
    maxBodyLength: 60 * 1024 * 1024,
    headers: { Accept: 'application/json' }
  });
  return data;
}

/**
 * Índice anime (kitsu/mal/anidb -> IMDb). Se descarga una sola vez por
 * proceso (~6 MB) y se guarda en memoria. Si falla, el addon sigue
 * funcionando para todo lo que ya tiene tt…: solo el anime queda sin mapear.
 */
function getAnimeIndex() {
  if (animeIndexPromise) return animeIndexPromise;
  if (animeIndexFailedAt && Date.now() - animeIndexFailedAt < 10 * 60 * 1000) {
    return Promise.resolve(null);
  }
  animeIndexPromise = (async () => {
    for (const url of config.animeMappingUrls) {
      try {
        const data = await fetchJson(url);
        if (!Array.isArray(data) || !data.length) continue;
        const index = buildIndex(data);
        if (index.byKitsu.size || index.byMal.size || index.byAnidb.size) {
          console.log(`[anime] índice cargado: ${index.byKitsu.size} kitsu / ${index.byMal.size} mal / ${index.byAnidb.size} anidb`);
          return index;
        }
      } catch (err) {
        console.warn(`[anime] No se pudo cargar ${url}: ${err.message}`);
      }
    }
    animeIndexFailedAt = Date.now();
    animeIndexPromise = null;
    return null;
  })();
  return animeIndexPromise;
}

function resetAnimeIndexForTests() {
  animeIndexPromise = null;
  animeIndexFailedAt = 0;
}

/** Espera máxima: si el índice tarda, no bloqueamos el handler de Stremio. */
function withDeadline(promise, ms) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), ms);
    promise.then((value) => { clearTimeout(timer); resolve(value); })
      .catch(() => { clearTimeout(timer); resolve(null); });
  });
}

async function resolveAnimeImdb(namespace, externalId, budgetMs = 2500) {
  if (!config.animeMappingEnabled) return null;
  const index = await withDeadline(getAnimeIndex(), budgetMs);
  if (!index) return null;
  if (namespace === 'kitsu') return index.byKitsu.get(String(externalId)) || null;
  if (namespace === 'mal') return index.byMal.get(String(externalId)) || null;
  if (namespace === 'anidb') return index.byAnidb.get(String(externalId)) || null;
  return null;
}

/** Título/año de un anime en Kitsu (para los scrapers que buscan por texto). */
async function getKitsuMeta(kitsuId) {
  try {
    const { data } = await axios.get(`${config.kitsuApiBaseUrl}/anime/${encodeURIComponent(kitsuId)}`, {
      timeout: 3000,
      headers: { Accept: 'application/vnd.api+json' }
    });
    const attributes = data && data.data && data.data.attributes;
    if (!attributes) return null;
    const title = attributes.canonicalTitle || (attributes.titles && (attributes.titles.en || attributes.titles.en_jp)) || null;
    if (!title) return null;
    const yearMatch = String(attributes.startDate || '').match(/^(\d{4})/);
    return { title, year: yearMatch ? Number(yearMatch[1]) : undefined };
  } catch (err) {
    console.warn(`[anime] Kitsu ${kitsuId}: ${err.message}`);
    return null;
  }
}

module.exports = {
  parseMediaId,
  resolveAnimeImdb,
  getKitsuMeta,
  getAnimeIndex,
  resetAnimeIndexForTests
};
