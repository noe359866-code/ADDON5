/**
 * src/addon.js — De una petición de Stremio a la lista de streams.
 *
 *   1. `tt…` (y la temporada/episodio) → título y año con Cinemeta.
 *   2. El título se busca EN PARALELO en todas las fuentes (Gnula y GnulaHD).
 *   3. Los reproductores de las fuentes que respondieron se abren en paralelo
 *      hasta dar con la URL de video.
 *   4. Cada enlace se verifica y se descarta si Stremio no lo puede reproducir
 *      (ver src/formats.js: HLS y MP4 por defecto).
 *   5. Se construyen los `stream` de Stremio (proxy propio si hace falta),
 *      indicando de qué web viene cada uno.
 *
 * Nada más: no hay catálogo, ni fichas, ni entradas «abrir en el navegador».
 * Si no hay ningún enlace reproducible se devuelve `{ streams: [] }`; Stremio
 * nunca debe recibir un error de este addon porque lo interpreta como que el
 * addon está roto.
 */

import { config } from './config.js';
import { Deadline, mapLimit } from './http.js';
import { mediaCache } from './cache.js';
import { lookupTitle } from './titles.js';
import { findEpisode, findMovie, hostLabel, isHttpUrl, selectEmbedsForResolution } from './gnula.js';
import { classifyMedia, formatLabel } from './formats.js';
import { resolveEmbed } from './players/index.js';
import { isMediaUrl } from './players/shared.js';
import { SOURCES } from './sources.js';
import { buildStream, dedupeStreams } from './streams.js';

const SUPPORTED_TYPES = new Set(['movie', 'series']);

export function isSupportedRequest(type, id) {
  if (!SUPPORTED_TYPES.has(type)) return false;
  const value = String(id || '');
  // Los IDs de TMDB solo se aceptan si hay clave para traducirlos.
  if (config.tmdbApiKey && /^tmdb:\d+(:\d+:\d+)?$/i.test(value)) return true;
  return /^tt\d{5,}(:\d+:\d+)?$/.test(value);
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

  const referer = resolved.referer || embed.pageUrl;
  // ¿Lo puede abrir Stremio? Si no, es como si no se hubiera resuelto.
  const verdict = await classifyMedia(resolved.media, { deadline: subDeadline, referer });

  const value = {
    media: resolved.media,
    referer,
    via: resolved.via,
    ms: Date.now() - startedAt,
    format: verdict.format,
    compatible: verdict.compatible,
    reason: verdict.reason
  };
  mediaCache.set(embed.url, value, config.mediaCacheTtlSeconds);
  return value;
}

function directEmbedMedia(embed, deadline) {
  if (!isMediaUrl(embed.url)) return null;
  return classifyMedia(embed.url, { deadline, referer: embed.pageUrl })
    .then((verdict) => ({
      media: embed.url,
      referer: embed.pageUrl,
      via: 'directo',
      ms: 0,
      format: verdict.format,
      compatible: verdict.compatible,
      reason: verdict.reason
    }));
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

  // El resolvedor ya devuelve los nombres listos para buscar: el del sitio
  // (español, si TMDB está configurado) y el original.
  const titles = [...new Set((info.titles && info.titles.length
    ? info.titles
    : [info.name, info.originalName]).filter(Boolean))];
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
    return { streams: [], trace };
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
    const direct = await directEmbedMedia(embed, deadline);
    if (direct) {
      if (direct.compatible) resolved.push({ embed, ...direct });
      trace.resolved.push({
        embed: embed.url,
        language: embed.language,
        source: embed.source,
        media: direct.media,
        via: 'directo',
        format: direct.format,
        compatible: direct.compatible,
        reason: direct.reason,
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
      if (outcome.compatible) resolved.push({ embed, ...outcome });
      trace.resolved.push({
        embed: embed.url,
        language: embed.language,
        source: embed.source,
        media: outcome.media,
        via: outcome.via,
        format: outcome.format,
        compatible: outcome.compatible,
        reason: outcome.reason,
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
  for (const { embed, media, referer, format } of resolved) {
    if (seenMedia.has(media)) continue;
    seenMedia.add(media);
    built.push(buildStream({
      baseUrl,
      media,
      referer,
      language: embed.language,
      label: embed.kind === 'direct' ? 'Enlace directo' : hostLabel(embed.url),
      quality: embed.quality || '',
      source: embed.sourceLabel,
      format: formatLabel(format)
    }));
  }

  const streams = dedupeStreams(built);

  if (!streams.length) {
    trace.errors.push('ningún enlace reproducible por Stremio');
    return { streams: [], trace };
  }

  return { streams, trace };
}

/** Handler que usa el servidor para GET /stream/{type}/{id}.json */
export async function handleStream(type, id, baseUrl) {
  const { streams } = await collectStreams({ type, id, baseUrl });
  return { streams };
}
