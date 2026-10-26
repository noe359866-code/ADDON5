/**
 * src/addon.js — De una petición de Stremio a la lista de streams.
 *
 *   1. `tt…` (y la temporada/episodio) → título y año con Cinemeta.
 *   2. Título → ficha de Gnula (o del sitio de series) con sus reproductores.
 *   3. Cada reproductor se intenta abrir en paralelo hasta dar con el video.
 *   4. Se construyen los `stream` de Stremio (proxy propio si hace falta).
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
import { buildExternalStream, buildStream, dedupeStreams } from './streams.js';

const SUPPORTED_TYPES = new Set(['movie', 'series']);

export function isSupportedRequest(type, id) {
  return SUPPORTED_TYPES.has(type) && /^tt\d{5,}(:\d+:\d+)?$/.test(String(id || ''));
}

async function resolveOneEmbed(embed, page, deadline, resolve = resolveEmbed) {
  const cached = mediaCache.get(embed.url);
  if (cached) return { ...cached, via: 'cache' };

  const remaining = deadline.remaining();
  if (remaining < 1200) return null;

  const startedAt = Date.now();
  const subDeadline = new Deadline(Math.min(10000, remaining));
  let resolved = null;
  try {
    resolved = await resolve(embed.url, { deadline: subDeadline, referer: page.pageUrl });
  } catch {
    resolved = null;
  }
  if (!resolved || !isHttpUrl(resolved.media)) return null;

  const value = {
    media: resolved.media,
    referer: resolved.referer || page.pageUrl,
    via: resolved.via,
    ms: Date.now() - startedAt
  };
  mediaCache.set(embed.url, value, config.mediaCacheTtlSeconds);
  return value;
}

function directEmbedMedia(embed, page) {
  if (isMediaUrl(embed.url)) {
    return { media: embed.url, referer: page.pageUrl, via: 'directo', ms: 0 };
  }
  return null;
}

/**
 * Núcleo reutilizado por /stream y por /selftest.
 *
 * `deps` permite inyectar las piezas que salen a la red (tests sin internet):
 *   { lookupTitle, findMovie, findEpisode, resolveEmbed }
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
    resolveEmbed: embedResolver = resolveEmbed
  } = deps;
  const deadline = new Deadline(deadlineMs);
  const trace = {
    request: { type, id },
    deadlineMs,
    meta: null,
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

  let page = null;
  try {
    page = type === 'movie'
      ? await movieFinder(wanted, { deadline })
      : await episodeFinder({ ...wanted, season: info.season, episode: info.episode }, { deadline });
  } catch (error) {
    trace.errors.push(`gnula: ${(error && error.message) || error}`);
  }

  if (!page) {
    trace.errors.push('Gnula no tiene ficha para este título');
    return { streams: [], trace };
  }

  if (!page.embeds || !page.embeds.length) {
    trace.errors.push('la ficha no expuso reproductores');
    trace.page = { url: page.pageUrl, title: page.title, year: page.year, quality: page.quality, embeds: 0 };
    return {
      streams: dedupeStreams([buildExternalStream({ pageUrl: page.pageUrl, label: 'Gnula' })]),
      trace
    };
  }

  trace.page = {
    url: page.pageUrl,
    title: page.title,
    year: page.year,
    quality: page.quality,
    embeds: page.embeds.length
  };
  trace.embeds = page.embeds.map((embed) => ({ url: embed.url, language: embed.language }));

  const embeds = page.embeds.slice(0, Math.max(config.maxResolvePerRequest * 2, 4));

  // Los enlaces que ya son video directo no necesitan abrir nada.
  const pending = [];
  const resolved = [];
  for (const embed of embeds) {
    const direct = directEmbedMedia(embed, page);
    if (direct) {
      resolved.push({ embed, ...direct });
      trace.resolved.push({ embed: embed.url, language: embed.language, media: direct.media, via: 'directo', ms: 0 });
    } else {
      pending.push(embed);
    }
  }

  const queue = selectEmbedsForResolution(pending, config.maxResolvePerRequest);
  const outcomes = await mapLimit(queue, config.resolveConcurrency, (embed) => resolveOneEmbed(embed, page, deadline, embedResolver));

  outcomes.forEach((outcome, index) => {
    const embed = queue[index];
    if (outcome && outcome.media) {
      resolved.push({ embed, ...outcome });
      trace.resolved.push({
        embed: embed.url,
        language: embed.language,
        media: outcome.media,
        via: outcome.via,
        ms: outcome.ms || 0
      });
    } else {
      trace.resolved.push({
        embed: embed.url,
        language: embed.language,
        media: '',
        via: '',
        ms: 0,
        failed: true
      });
    }
  });

  // Un agregador puede revelar el mismo servidor que ya está en la ficha:
  // se queda el primero (el enlace directo) y se evita el duplicado.
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
      quality: page.quality
    }));
  }

  const streams = dedupeStreams(built);

  if (!streams.length) {
    // Sin video resuelto: al menos se ofrece abrir el reproductor o la ficha.
    const fallbacks = embeds.slice(0, 3)
      .map((embed) => buildExternalStream({
        embedUrl: embed.url,
        language: embed.language,
        label: hostLabel(embed.url)
      }))
      .filter(Boolean);
    if (!fallbacks.length) {
      fallbacks.push(buildExternalStream({ pageUrl: page.pageUrl, label: 'Gnula' }));
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
