/**
 * src/players/shared.js — Utilidades comunes de los extractores.
 *
 * Todos los reproductores acaban igual: una URL de video (`.m3u8` o `.mp4`)
 * escondida en el HTML, o un salto a otro reproductor. Aquí están los
 * buscadores de esa URL y las cabeceras que estos CDN exigen para no
 * responder 403.
 */

import { config } from '../config.js';
import { request, safeDecodeEntities } from '../http.js';
import { hostOf, isHttpUrl, isSkippedEmbed } from '../gnula.js';

export const MEDIA_EXTENSION_RE = /\.(m3u8|mp4|mpd|m4v)(\?|#|$)/i;

const JUNK_PATTERNS = [
  /\/sprite[s]?\//i,
  // Los reproductores caídos a veces devuelven un vídeo de demostración en
  // lugar del capítulo: no es la película y no debe llegar a Stremio.
  /test-videos\.co\.uk/i,
  /bigbuckbunny/i,
  /sample-videos\.com/i,
  /gtv-videos-bucket/i,
  /commondatastorage\.googleapis\.com/i,
  /\/thumb[s]?\//i,
  /poster\.(?:jpe?g|png|webp)/i,
  /trailer/i,
  /preview\.(?:mp4|m3u8)/i,
  /sample\.(?:mp4|mkv)/i,
  /placeholder/i
];

/** ¿La cadena es una URL de video reproducible? */
export function isMediaUrl(value, baseUrl = '') {
  const url = normalizeUrl(value, baseUrl);
  if (!url) return false;
  return MEDIA_EXTENSION_RE.test(url) && !JUNK_PATTERNS.some((pattern) => pattern.test(url));
}

/** Arregla `https:\/\/…`, `//host/…`, rutas relativas y entidades HTML. */
export function normalizeUrl(value, baseUrl = '') {
  let url = safeDecodeEntities(String(value == null ? '' : value)).trim();
  if (!url) return '';
  url = url.replace(/\\\//g, '/').replace(/^["']|["']$/g, '');

  if (url.startsWith('//')) url = `https:${url}`;

  if (!/^https?:\/\//i.test(url)) {
    if (!baseUrl) return '';
    try {
      url = new URL(url, baseUrl).toString();
    } catch {
      return '';
    }
  }

  if (!isHttpUrl(url)) return '';
  if (isSkippedEmbed(url)) return '';
  return url;
}

/** Prefiere HLS sobre MP4 y descarta los hosts de publicidad. */
export function pickBestMedia(candidates) {
  const unique = [...new Set(candidates.filter(Boolean))];
  const hls = unique.find((url) => /\.m3u8(\?|#|$)/i.test(url));
  return hls || unique[0] || '';
}

/** Busca una URL de video en el HTML/JS de un reproductor. */
export function findMedia(html, baseUrl = '') {
  const source = String(html == null ? '' : html);
  const candidates = [];

  const keyed = /["']?(?:file|src|source|hls|hls4|playlist|video_url|direct_access_url|contentUrl|url)["']?\s*[:=]\s*["']([^"']{8,2048})["']/gi;
  let match;
  while ((match = keyed.exec(source))) {
    if (isMediaUrl(match[1], baseUrl)) candidates.push(normalizeUrl(match[1], baseUrl));
  }

  const bare = /(?:https?:)?\/\/[^\s"'<>\\)]{6,2048}\.(?:m3u8|mp4|mpd|m4v)(?:\?[^\s"'<>\\)]*)?/gi;
  while ((match = bare.exec(source))) {
    if (isMediaUrl(match[0], baseUrl)) candidates.push(normalizeUrl(match[0], baseUrl));
  }

  const sourceTags = /<source\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/gi;
  while ((match = sourceTags.exec(source))) {
    if (isMediaUrl(match[1], baseUrl)) candidates.push(normalizeUrl(match[1], baseUrl));
  }

  const ogVideo = /<meta\b[^>]*(?:property|name)\s*=\s*["'](?:og:video(?::url|:secure_url)?|twitter:player:stream)["'][^>]*content\s*=\s*["']([^"']+)["']/gi;
  while ((match = ogVideo.exec(source))) {
    if (isMediaUrl(match[1], baseUrl)) candidates.push(normalizeUrl(match[1], baseUrl));
  }

  return pickBestMedia(candidates);
}

/** URL de video escondida en un `atob('…')`. */
export function findAtobMedia(html, baseUrl = '') {
  const re = /atob\(\s*["']([A-Za-z0-9+/=_-]{16,4096})["']\s*\)/g;
  const candidates = [];
  let match;
  while ((match = re.exec(String(html == null ? '' : html)))) {
    const cleaned = match[1].replace(/-/g, '+').replace(/_/g, '/');
    try {
      const decoded = Buffer.from(cleaned, 'base64').toString('utf8');
      if (isMediaUrl(decoded, baseUrl)) candidates.push(normalizeUrl(decoded, baseUrl));
    } catch {
      // base64 inválido: se ignora
    }
  }
  return pickBestMedia(candidates);
}

/** A dónde salta el reproductor: `go_to_player(…)`, iframes, redirects JS. */
export function findEmbedTargets(html, baseUrl = '') {
  const source = String(html == null ? '' : html);
  const found = [];

  const push = (value) => {
    const url = normalizeUrl(value, baseUrl);
    if (!url) return;
    if (baseUrl && url.split('#')[0] === String(baseUrl).split('#')[0]) return;
    if (!found.includes(url)) found.push(url);
  };

  let match;
  const goToPlayer = /go_to_player\(\s*['"]([^'"]+)['"]/gi;
  while ((match = goToPlayer.exec(source))) push(match[1]);

  const iframes = /<iframe\b([^>]*)>/gi;
  while ((match = iframes.exec(source))) {
    for (const name of ['data-lazy-src', 'data-src', 'data-original', 'src']) {
      const attrRe = new RegExp(`${name}\\s*=\\s*["']([^"']+)["']`, 'i');
      const value = attrRe.exec(match[1]);
      if (value) {
        push(value[1]);
        break;
      }
    }
  }

  const jsRedirect = /(?:window\.|document\.)?location(?:\.href)?\s*=\s*["']([^"']+)["']/gi;
  while ((match = jsRedirect.exec(source))) push(match[1]);

  return found.filter((url) => hostOf(url)).slice(0, 4);
}

/** Cabeceras que estos CDN comprueban (Referer y UA de navegador). */
export function playerHeaders(referer) {
  const headers = {
    Accept: '*/*',
    'Accept-Language': 'es-ES,es;q=0.9,en;q=0.6'
  };
  if (referer) {
    headers.Referer = referer;
    try {
      headers.Origin = new URL(referer).origin;
    } catch {
      // referer inválido: se omite Origin
    }
  }
  return headers;
}

/**
 * Texto de una URL de reproductor. `ctx.fetchText` permite inyectar una
 * respuesta en los tests sin salir a la red.
 */
export async function fetchText(url, ctx = {}, referer = '') {
  if (typeof ctx.fetchText === 'function') {
    return String((await ctx.fetchText(url, ctx)) || '');
  }
  const result = await request(url, {
    deadline: ctx.deadline,
    timeoutMs: ctx.timeoutMs || config.fetchTimeoutMs,
    headers: playerHeaders(referer || `${safeOrigin(url)}/`)
  });
  if (!result.ok) {
    if (config.debug) console.warn(`[player] ${hostOf(url)} → ${result.error || result.status}`);
    return '';
  }
  return result.text;
}

/** Petición a la página de un reproductor. */
export async function fetchPlayer(url, ctx = {}) {
  const own = `${safeOrigin(url)}/`;
  const referer = ctx.referer || own;
  const text = await fetchText(url, ctx, referer);

  // Algunos hosts (uqload) tienen protección anti-hotlink: con el Referer de
  // la web de origen contestan una página de 38 bytes. Se reintenta como si el
  // enlace se abriera a mano (Referer del propio host).
  const short = !text || text.length < 512;
  if (short && referer !== own && (!ctx.deadline || ctx.deadline.remaining() > 1500)) {
    const retry = await fetchText(url, ctx, own);
    if (retry && retry.length > (text ? text.length : 0)) {
      return { text: retry, url, referer: own };
    }
  }

  if (!text) return null;
  return { text, url, referer };
}

export function safeOrigin(url) {
  try {
    return new URL(url).origin;
  } catch {
    return '';
  }
}
