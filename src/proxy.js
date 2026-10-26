/**
 * src/proxy.js — Proxy de video y reescritura de listas HLS.
 *
 * Los CDN de estos reproductores devuelven 403 si no llega el Referer de su
 * propia página, y un reproductor web no puede ponerlo. El proxy los añade,
 * reescribe las URIs de la lista `.m3u8` (segmentos y claves) para que todas
 * pasen por aquí con las mismas cabeceras y admite `Range` para MP4.
 */

import { Readable } from 'node:stream';
import { config } from './config.js';
import { decodeParam } from './streams.js';

const PRIVATE_HOST_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^0\.0\.0\.0$/,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^169\.254\./,
  /^\[?::1\]?$/,
  /^\[?f[cd][0-9a-f]{2}:/i,
  /^\[?fe80:/i
];

export function isPrivateHost(hostname) {
  const host = String(hostname || '').toLowerCase().replace(/^\[|\]$/g, '');
  return PRIVATE_HOST_PATTERNS.some((pattern) => pattern.test(host));
}

export function isAllowedProxyTarget(rawUrl) {
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return false;
  }
  if (!/^https?:$/.test(parsed.protocol)) return false;
  if (isPrivateHost(parsed.hostname)) return false;
  return true;
}

/**
 * Reescribe una lista HLS para que cada URI pase por el proxy.
 * @param {string} text       contenido del .m3u8
 * @param {string} playlistUrl URL real de la lista (para resolver relativas)
 * @param {(absoluteUrl:string)=>string} proxyFor
 */
export function rewritePlaylist(text, playlistUrl, proxyFor) {
  const lines = String(text == null ? '' : text).split(/\r?\n/);
  const out = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      out.push(line);
      continue;
    }

    if (trimmed.startsWith('#')) {
      out.push(trimmed.replace(/URI="([^"]+)"/gi, (full, uri) => `URI="${proxyFor(resolveUrl(uri, playlistUrl))}"`));
      continue;
    }

    const absolute = resolveUrl(trimmed, playlistUrl);
    out.push(absolute ? proxyFor(absolute) : trimmed);
  }

  return out.join('\n');
}

export function resolveUrl(value, baseUrl) {
  try {
    return new URL(value, baseUrl).toString();
  } catch {
    return '';
  }
}

function proxyForFactory(baseUrl, referer) {
  return (absoluteUrl) => {
    if (!absoluteUrl) return '';
    const params = new URLSearchParams();
    params.set('u', Buffer.from(absoluteUrl, 'utf8').toString('base64url'));
    if (referer) params.set('r', Buffer.from(referer, 'utf8').toString('base64url'));
    return `${baseUrl}/proxy?${params.toString()}`;
  };
}

function requestHeaders(referer) {
  const headers = {
    'User-Agent': config.userAgent,
    Accept: '*/*',
    'Accept-Language': 'es-ES,es;q=0.9,en;q=0.6'
  };
  if (referer) {
    headers.Referer = referer;
    try {
      headers.Origin = new URL(referer).origin;
    } catch {
      // sin Origin
    }
  }
  return headers;
}

/**
 * Atiende GET/HEAD /proxy?u=<b64url>&r=<b64url>.
 */
export async function handleProxy(req, res, urlObject, baseUrl) {
  const target = decodeParam(urlObject.searchParams.get('u'));
  const referer = decodeParam(urlObject.searchParams.get('r'));

  if (!target || !isAllowedProxyTarget(target)) {
    return sendText(res, 400, 'Destino de proxy no permitido');
  }

  const controller = new AbortController();
  const headerTimer = setTimeout(() => controller.abort(), Math.max(15000, config.fetchTimeoutMs * 2));

  const headers = requestHeaders(referer);
  const range = req.headers.range;
  if (range) headers.Range = range;

  let upstream;
  try {
    upstream = await fetch(target, {
      method: req.method === 'HEAD' ? 'HEAD' : 'GET',
      headers,
      redirect: 'follow',
      signal: controller.signal
    });
  } catch (error) {
    clearTimeout(headerTimer);
    return sendText(res, 502, `No se pudo contactar con el servidor de video: ${(error && error.message) || 'error'}`);
  }
  clearTimeout(headerTimer);

  if (!upstream.ok && upstream.status !== 206) {
    return sendText(res, upstream.status === 403 ? 403 : 502, `El servidor de video respondió ${upstream.status}`);
  }

  const contentType = upstream.headers.get('content-type') || '';
  const looksLikePlaylist = /mpegurl/i.test(contentType)
    || /\.m3u8(\?|#|$)/i.test(target)
    || /\.m3u8(\?|#|$)/i.test(upstream.url || '');

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (looksLikePlaylist) {
    let text = '';
    try {
      text = await upstream.text();
    } catch {
      return sendText(res, 502, 'No se pudo leer la lista de reproducción');
    }

    const proxyFor = proxyForFactory(baseUrl, referer);
    const rewritten = rewritePlaylist(text, upstream.url || target, proxyFor);
    const body = Buffer.from(rewritten, 'utf8');
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
    res.setHeader('Content-Length', body.length);
    res.setHeader('Cache-Control', 'no-cache');
    if (req.method === 'HEAD') return res.end();
    return res.end(body);
  }

  res.statusCode = upstream.status === 206 ? 206 : 200;
  res.setHeader('Content-Type', contentType || 'application/octet-stream');
  res.setHeader('Cache-Control', 'public, max-age=3600');

  for (const header of ['content-length', 'content-range', 'accept-ranges', 'etag', 'last-modified']) {
    const value = upstream.headers.get(header);
    if (value) res.setHeader(header, value);
  }

  if (req.method === 'HEAD' || !upstream.body) {
    return res.end();
  }

  const body = Readable.fromWeb(upstream.body);
  body.on('error', () => res.destroy());
  req.on('close', () => body.destroy());
  body.pipe(res);
}

function sendText(res, status, message) {
  const body = Buffer.from(message, 'utf8');
  res.statusCode = status;
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Content-Length', body.length);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.end(body);
}
