/**
 * src/players/index.js — Extractores de reproductores.
 *
 * Un embed de Gnula puede ser:
 *   1. Un video directo (`.mp4` / `.m3u8`): se usa tal cual.
 *   2. Un reproductor con el video a la vista (Filemoon, StreamWish, Voe…):
 *      el primer extractor que encuentre la URL gana.
 *   3. Un agregador que solo lista más botones (links.cuevana.ac): se sigue
 *      el salto encadenado hasta MAX_RESOLVE_HOPS.
 *
 * Cada extractor devuelve `{ media, referer }`, `{ next: [...] }` o `null`.
 * Nunca lanza: un host caído o con captcha solo hace que se pruebe el
 * siguiente reproductor.
 */

import { config } from '../config.js';
import { hostOf } from '../gnula.js';
import {
  fetchPlayer,
  fetchText,
  findAtobMedia,
  findEmbedTargets,
  findMedia,
  normalizeUrl
} from './shared.js';
import { unpackFromHtml } from './packer.js';

/* ------------------------------ Streamtape ------------------------------ */

export async function extractStreamtape(url, ctx) {
  const page = await fetchPlayer(url, ctx);
  if (!page) return null;

  const direct = findMedia(page.text, page.url);
  if (direct) return { media: direct, referer: page.url };

  // El enlace real viene partido: '/get_video?id=…&token=' + 'xxxx'
  const split = /(\/get_video\?[^'"\s<>]{10,})['"]\s*\+\s*['"]([^'"]*)['"]/.exec(page.text);
  if (split) {
    const media = normalizeUrl(`${split[1]}${split[2]}`, page.url);
    if (media) return { media, referer: page.url };
  }

  const robot = /id=["']robotlink["'][^>]*>([^<]{10,}?)</i.exec(page.text);
  if (robot) {
    const appended = /getElementById\(\s*['"]robotlink['"]\s*\)\.innerHTML\s*\+=\s*['"]([^'"]*)['"]/.exec(page.text);
    const media = normalizeUrl(`${robot[1].trim()}${appended ? appended[1] : ''}`, page.url);
    if (media && /get_video/i.test(media)) return { media, referer: page.url };
  }

  return null;
}

/* ------------------------------ Doodstream ------------------------------ */

const RANDOM_CHARS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

function randomString(size = 10) {
  let out = '';
  for (let i = 0; i < size; i += 1) {
    out += RANDOM_CHARS[Math.floor(Math.random() * RANDOM_CHARS.length)];
  }
  return out;
}

export async function extractDoodstream(url, ctx) {
  const page = await fetchPlayer(url, ctx);
  if (!page) return null;

  const direct = findMedia(page.text, page.url);
  if (direct) return { media: direct, referer: page.url };

  const pass = /(\/pass_md5\/[^"'\s<>]+)/.exec(page.text);
  if (!pass) return null;

  let origin;
  try {
    origin = new URL(page.url).origin;
  } catch {
    return null;
  }

  const passPath = pass[1];
  const token = passPath.split('/').filter(Boolean).pop() || '';
  const answer = await fetchText(`${origin}${passPath}`, ctx, page.url);
  const base = String(answer || '').trim().replace(/\/+$/, '');
  if (!/^https?:\/\//i.test(base)) return null;

  return {
    media: `${base}${randomString(10)}?token=${token}&expiry=${Date.now()}`,
    referer: page.url
  };
}

/* --------------------------------- Voe ---------------------------------- */

export async function extractVoe(url, ctx) {
  let current = url;
  let referer = ctx.referer || '';

  for (let hop = 0; hop < 3; hop += 1) {
    const page = await fetchPlayer(current, { ...ctx, referer: referer || `${safeOrigin(current)}/` });
    if (!page) return null;

    const unpacked = unpackFromHtml(page.text);
    const media = findMedia(page.text, page.url)
      || findAtobMedia(page.text, page.url)
      || (unpacked ? findMedia(unpacked, page.url) : '');
    if (media) return { media, referer: page.url };

    const redirect = /(?:window\.|document\.)?location(?:\.href)?\s*=\s*["']([^"']+)["']/i.exec(page.text);
    const target = redirect ? normalizeUrl(redirect[1], page.url) : '';
    if (!target || target === current) break;
    referer = current;
    current = target;
  }

  return null;
}

/* -------------------------------- Mixdrop ------------------------------- */

export async function extractMixdrop(url, ctx) {
  const page = await fetchPlayer(url, ctx);
  if (!page) return null;

  const direct = findMedia(page.text, page.url);
  if (direct) return { media: direct, referer: page.url };

  const wurl = /MDCore\.wurl\s*=\s*["']([^"']+)["']/i.exec(page.text)
    || /["']?wurl["']?\s*[:=]\s*["']([^"']+)["']/i.exec(page.text);
  if (wurl) {
    const media = normalizeUrl(wurl[1], page.url);
    if (media && /\.(mp4|m3u8)/i.test(media)) return { media, referer: page.url };
  }

  const unpacked = unpackFromHtml(page.text);
  if (unpacked) {
    const media = findMedia(unpacked, page.url);
    if (media) return { media, referer: page.url };
  }

  return null;
}

/* -------------------------------- Genérico ------------------------------ */

export async function extractGeneric(url, ctx) {
  const page = await fetchPlayer(url, ctx);
  if (!page) return null;

  const direct = findMedia(page.text, page.url);
  if (direct) return { media: direct, referer: page.url };

  const unpacked = unpackFromHtml(page.text);
  if (unpacked) {
    const unpackedMedia = findMedia(unpacked, page.url) || findAtobMedia(unpacked, page.url);
    if (unpackedMedia) return { media: unpackedMedia, referer: page.url };
  }

  const atobMedia = findAtobMedia(page.text, page.url);
  if (atobMedia) return { media: atobMedia, referer: page.url };

  const next = findEmbedTargets(page.text, page.url);
  if (next.length) return { next };

  return null;
}

/* ------------------- Resolvedores del propio sitio ---------------------- */

/**
 * GnulaHD resuelve algunos servidores en su propio dominio:
 *   /panel/vidara-resolve.php?pl=1&code=&host=&t=  → devuelve el HLS
 *   /panel/the-tube-resolve.php?code=&t=           → JSON { master }
 * La respuesta de vidara ya ES el playlist, así que la URL sirve tal cual.
 */
export async function extractSiteResolver(url, ctx) {
  const page = await fetchPlayer(url, ctx);
  if (!page) return null;

  const body = String(page.text || '').trimStart();
  if (body.startsWith('#EXTM3U')) {
    return { media: url, referer: page.url, format: 'hls' };
  }

  try {
    const payload = JSON.parse(body);
    const master = payload && typeof payload.master === 'string' ? payload.master : '';
    if (master && /^https?:\/\//i.test(master)) {
      return {
        media: master,
        referer: page.url,
        format: /\.m3u8/i.test(master) ? 'hls' : ''
      };
    }
  } catch {
    // no era JSON: se sigue con la búsqueda normal
  }

  const media = findMedia(page.text, page.url);
  if (media) return { media, referer: page.url };
  return null;
}

/* ------------------------------ Dispatcher ------------------------------ */

export function extractorFor(url) {
  const host = hostOf(url);
  if (/\/(?:vidara|the-tube)-resolve\.php/i.test(url)) return extractSiteResolver;
  if (/streamtape|stape\./i.test(host)) return extractStreamtape;
  if (/dood|ds2play|dsvplay|d000d/i.test(host)) return extractDoodstream;
  if (/voe\.(sx|to|st|eu|so|re)/i.test(host)) return extractVoe;
  if (/mixdrop/i.test(host)) return extractMixdrop;
  return extractGeneric;
}

function safeOrigin(url) {
  try {
    return new URL(url).origin;
  } catch {
    return '';
  }
}

/**
 * Resuelve un embed hasta una URL de video.
 * @returns {Promise<{media:string, referer:string, via:string}|null>}
 */
export async function resolveEmbed(embedUrl, ctx = {}) {
  const deadline = ctx.deadline;
  const queue = [{ url: embedUrl, referer: ctx.referer || '', depth: 0 }];
  const visited = new Set();

  while (queue.length) {
    if (deadline && deadline.expired()) return null;
    const node = queue.shift();
    if (!node.url || visited.has(node.url)) continue;
    visited.add(node.url);

    const extractor = extractorFor(node.url);
    let outcome = null;
    try {
      outcome = await extractor(node.url, { ...ctx, referer: node.referer });
    } catch (error) {
      if (config.debug) console.warn(`[player] ${hostOf(node.url)}: ${(error && error.message) || error}`);
      outcome = null;
    }

    if (outcome && outcome.media) {
      return {
        media: outcome.media,
        referer: outcome.referer || node.url,
        via: hostOf(node.url),
        format: outcome.format || ''
      };
    }

    if (outcome && Array.isArray(outcome.next) && node.depth < config.maxResolveHops) {
      for (const next of outcome.next) {
        if (!visited.has(next)) {
          queue.push({ url: next, referer: node.url, depth: node.depth + 1 });
        }
      }
    }
  }

  return null;
}
