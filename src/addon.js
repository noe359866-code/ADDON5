/**
 * src/addon.js — De una petición de Stremio a la lista de streams.
 *
 *   1. `tt…` (y la temporada/episodio) → título y año con Cinemeta.
 *   2. El título se busca EN PARALELO en todas las fuentes (Gnula y GnulaHD).
 *   3. Los reproductores de las fuentes que respondieron se abren en paralelo
 *      hasta dar con la URL de video.
 *   4. Se construyen los `stream` de Stremio (proxy propio si hace falta),
 *      indicando de qué web viene cada uno.
 *
 * Si algo falla se devuelve `{ streams: [] }`: Stremio nunca debe recibir un
 * error de este addon porque lo interpreta como que el addon está roto.
 */

import { config } from './config.js';
import { Deadline, mapLimit } from './http.js';
import { mediaCache } from './cache.js';
import { lookupTitle } from './cinemeta.js';
import { findEpisode, findMovie, hostLabel, isHttpUrl, selectEmbedsForResolution } from './gnula.js';
import { resolveEmbed } from './players/index.js';
import { isMediaUrl } from './players/shared.js';
import { SOURCES } from './sources.js';
import { buildExternalStream, buildStream, dedupeStreams } from './streams.js';

const SUPPORTED_TYPES = new Set(['movie', 'series']);

export function isSupportedRequest(type, id) {
  return SUPPORTED_TYPES.has(type) && /^tt\d{5,}(:\d+:\d+)?$/.test(String(id || ''));
}

async function resolveOneEmbed(embed, deadline, resolve = resolveEmbed) {
  const cached = mediaCache.get(embed.url);
  if (cached) return { ...cached, via: 'cache' };

  const remaining = deadline.remaining();
  if (remaining < 1200) return null;

  const startedAt = Date.now();
  const subDeadline = new Deadline(Math.min(10000, remaining));
  let resolved = null;
  try {
    resolved = await resolve(embed.url, { deadline: subDeadline, referer: embed.pageUrl });
  } catch {
    resolved = null;
  }
  if (!resolved || !isHttpUrl(resolved.media)) return null;

  const value = {
    media: resolved.media,
    referer: resolved.referer || embed.pageUrl,
    via: resolved.via,
    ms: Date.now() - startedAt
  };
  mediaCache.set(embed.url, value, config.mediaCacheTtlSeconds);
  return value;
}

function directEmbedMedia(embed) {
  if (isMediaUrl(embed.url)) {
    return { media: embed.url, referer: embed.pageUrl, via: 'directo', ms: 0 };
  }
  return null;
}

/**
 * Mezcla los reproductores de todas las fuentes alternando una por una, para
 * que ninguna web se quede sin intentar cuando la otra publica muchas
 * pestañas.
 */
export function interleaveEmbeds(groups) {
  const out = [];
  const longest = groups.reduce((max, group) => Math.max(max, group.length), 0);
  for (let index = 0; index < longest; index += 1) {
    for (const group of groups) {
      if (index < group.length) out.push(group[index]);
    }
  }
  return out;
}

/**
 * Núcleo reutilizado por /stream y por /selftest.
 *
 * `deps` permite inyectar las piezas que salen a la red (tests sin internet):
 *   { lookupTitle, findMovie, findEpisode, resolveEmbed, sources }
 *
 * @returns {Promise<{streams:Array, trace:object}>}
 */
export async function collectStreams({
  type,
  id,
  baseUrl,
  deadlineMs = config.handlerDeadlineMs,
  deps = {}
}) {
  const {
    lookupTitle: lookup = lookupTitle,
    findMovie: movieFinder = findMovie,
    findEpisode: episodeFinder = findEpisode,
    resolveEmbed: embedResolver = resolveEmbed,
    sources = SOURCES
  } = deps;

  const deadline = new Deadline(deadlineMs);
  const trace = {
    request: { type, id },
    deadlineMs,
    meta: null,
    sources: [],
    page: null,
    embeds: [],
    resolved: [],
    errors: []
  };

  if (!isSupportedRequest(type, id)) {
    trace.errors.push('tipo o ID no soportado');
    return { streams: [], trace };
  }

  let info;
  try {
    info = await lookup(type, id, { deadline });
  } catch (error) {
    trace.errors.push(`cinemeta: ${(error && error.message) || error}`);
    return { streams: [], trace };
  }

  if (!info) {
    trace.errors.push('no se pudo resolver el título con Cinemeta');
    return { streams: [], trace };
  }
  trace.meta = info;

  const titles = [...new Set([info.name, info.originalName].filter(Boolean))];
  const wanted = { titles, year: info.year };

  // Todas las fuentes a la vez: la más rápida no espera a la más lenta.
  const found = await Promise.all(sources.map(async (source) => {
    const finder = type === 'movie' ? source.findMovie : source.findEpisode;
    if (typeof finder !== 'function') return { source, page: null, error: 'tipo no soportado' };

    try {
      const page = type === 'movie'
        ? await finder(wanted, { deadline })
        : await finder({ ...wanted, season: info.season, episode: info.episode }, { deadline });
      return { source, page, error: page ? '' : 'sin ficha' };
    } catch (error) {
      return { source, page: null, error: (error && error.message) || 'error' };
    }
  }));

  for (const entry of found) {
    trace.sources.push({
      id: entry.source.id,
      label: entry.source.label,
      page: entry.page ? entry.page.pageUrl : '',
      title: entry.page ? entry.page.title : '',
      year: entry.page ? entry.page.year : '',
      quality: entry.page ? entry.page.quality : '',
      embeds: entry.page && entry.page.embeds ? entry.page.embeds.length : 0,
      error: entry.error
    });
    if (entry.error) trace.errors.push(`${entry.source.label}: ${entry.error}`);
  }

  const withEmbeds = found.filter((entry) => entry.page && entry.page.embeds && entry.page.embeds.length);
  const pages = found.filter((entry) => entry.page);

  // Ninguna fuente tiene reproductores: al menos se ofrece abrir la ficha.
  if (!withEmbeds.length) {
    if (!pages.length) {
      trace.errors.push('ninguna fuente tiene ficha para este título');
      return { streams: [], trace };
    }
    trace.page = {
      url: pages[0].page.pageUrl,
      title: pages[0].page.title,
      year: pages[0].page.year,
      quality: pages[0].page.quality,
      embeds: 0
    };
    trace.errors.push('las fichas no expusieron reproductores');
    const fallbacks = pages.map((entry) => buildExternalStream({
      pageUrl: entry.page.pageUrl,
      label: entry.source.label
    }));
    return { streams: dedupeStreams(fallbacks), trace };
  }

  trace.page = {
    url: withEmbeds[0].page.pageUrl,
    title: withEmbeds[0].page.title,
    year: withEmbeds[0].page.year,
    quality: withEmbeds[0].page.quality,
    embeds: withEmbeds.reduce((total, entry) => total + entry.page.embeds.length, 0)
  };

  // Cada reproductor recuerda de qué fuente viene y con qué idioma.
  const groups = withEmbeds.map((entry) => entry.page.embeds.map((embed) => ({
    ...embed,
    source: entry.source.id,
    sourceLabel: entry.source.label,
    quality: entry.page.quality,
    pageUrl: entry.page.pageUrl
  })));

  trace.embeds = groups.flat().map((embed) => ({
    url: embed.url,
    language: embed.language,
    source: embed.source
  }));

  const all = interleaveEmbeds(groups);
  const resolved = [];
  const pending = [];

  for (const embed of all) {
    const direct = directEmbedMedia(embed);
    if (direct) {
      resolved.push({ embed, ...direct });
      trace.resolved.push({
        embed: embed.url,
        language: embed.language,
        source: embed.source,
        media: direct.media,
        via: 'directo',
        ms: 0
      });
    } else {
      pending.push(embed);
    }
  }

  const queue = selectEmbedsForResolution(pending, config.maxResolvePerRequest);
  const outcomes = await mapLimit(queue, config.resolveConcurrency, (embed) => resolveOneEmbed(embed, deadline, embedResolver));

  outcomes.forEach((outcome, index) => {
    const embed = queue[index];
    if (outcome && outcome.media) {
      resolved.push({ embed, ...outcome });
      trace.resolved.push({
        embed: embed.url,
        language: embed.language,
        source: embed.source,
        media: outcome.media,
        via: outcome.via,
        ms: outcome.ms || 0
      });
    } else {
      trace.resolved.push({
        embed: embed.url,
        language: embed.language,
        source: embed.source,
        media: '',
        via: '',
        ms: 0,
        failed: true
      });
    }
  });

  // Un agregador (o la otra web) puede revelar el mismo servidor: se queda el
  // primero, que es el enlace directo, y se evita el duplicado.
  const seenMedia = new Set();
  const built = [];
  for (const { embed, media, referer } of resolved) {
    if (seenMedia.has(media)) continue;
    seenMedia.add(media);
    built.push(buildStream({
      baseUrl,
      media,
      referer,
      language: embed.language,
      label: embed.kind === 'direct' ? 'Enlace directo' : hostLabel(embed.url),
      quality: embed.quality || '',
      source: embed.sourceLabel
    }));
  }

  const streams = dedupeStreams(built);

  if (!streams.length) {
    // Sin video resuelto: al menos se ofrece abrir el reproductor o la ficha.
    const fallbacks = all.slice(0, 3)
      .map((embed) => buildExternalStream({
        embedUrl: embed.url,
        language: embed.language,
        label: `${embed.sourceLabel} · ${hostLabel(embed.url)}`
      }))
      .filter(Boolean);
    if (!fallbacks.length) {
      fallbacks.push(...pages.map((entry) => buildExternalStream({
        pageUrl: entry.page.pageUrl,
        label: entry.source.label
      })));
    }
    trace.errors.push('ningún reproductor devolvió una URL de video');
    return { streams: dedupeStreams(fallbacks), trace };
  }

  return { streams, trace };
}

/** Handler que usa el servidor para GET /stream/{type}/{id}.json */
export async function handleStream(type, id, baseUrl) {
  const { streams } = await collectStreams({ type, id, baseUrl });
  return { streams };
}
