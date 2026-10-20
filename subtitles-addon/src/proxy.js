'use strict';

const crypto = require('node:crypto');
const net = require('node:net');
const express = require('express');
const axios = require('axios');

const config = require('./config');
const { signToken, verifyToken } = require('./utils/token');
const { isZip, extractZip } = require('./utils/zip');
const { toStremioSubtitleText, pickSubtitleEntry } = require('./utils/subtitleText');

/**
 * Proxy de subtítulos propio (/sub/{token}.srt).
 *
 * ¿Por qué no devolver a Stremio el enlace original del sitio?
 *   1. Stremio Web bloquea descargas sin CORS y muchos de estos sitios no lo
 *      permiten.
 *   2. Varios exigen Referer/User-Agent de navegador: sin ellos, 403.
 *   3. La mayoría entrega .zip y Stremio no sabe abrir un zip.
 *   4. Los enlaces caducan o dependen de cookies de la sesión de scraping.
 *
 * Aquí descargamos, descomprimimos (ZIP store/deflate), convertimos a UTF-8 +
 * SRT y servimos el texto desde nuestro dominio, con CORS abierto.
 */

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

const PRIVATE_V4 = [
  /^0\./, /^10\./, /^127\./, /^169\.254\./, /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[01])\./, /^100\.(6[4-9]|[7-9]\d|1[0-2]\d)\./
];

let secretCache = null;

function getSecret() {
  if (secretCache) return secretCache;
  const configured = String(config.proxySecret || '').trim();
  if (configured.length >= 16) {
    secretCache = configured;
  } else {
    secretCache = crypto.randomBytes(32).toString('hex');
    console.warn('[proxy] SUBTITLE_TOKEN_SECRET no configurado (o <16 caracteres): se usa uno aleatorio. Los enlaces /sub/ dejarán de valer al reiniciar el servicio.');
  }
  return secretCache;
}

function canProxy() {
  return config.proxyEnabled && Boolean(config.publicBaseUrl);
}

function isPrivateHostname(hostname) {
  const host = String(hostname || '').toLowerCase().replace(/\.$/, '').replace(/^\[|\]$/g, '');
  if (!host || host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal')) {
    return true;
  }
  if (net.isIP(host) === 4) return PRIVATE_V4.some((re) => re.test(host));
  if (net.isIP(host) === 6) {
    return host === '::' || host === '::1' || /^f[cd]/i.test(host) || /^fe[89ab]/i.test(host) ||
      host.startsWith('::ffff:127.') || host.startsWith('::ffff:10.') || host.startsWith('::ffff:192.168.');
  }
  return false;
}

/** Devuelve la URL si es http(s) y pública; lanza si no. */
function assertPublicUrl(raw) {
  let url;
  try {
    url = new URL(String(raw || ''));
  } catch {
    throw new Error('URL no válida');
  }
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Protocolo no permitido');
  if (isPrivateHostname(url.hostname)) throw new Error('Destino no permitido');
  return url.toString();
}

function refererFor(upstream) {
  try {
    return `${new URL(upstream).origin}/`;
  } catch {
    return '';
  }
}

/**
 * Convierte un resultado de proveedor en una URL de nuestro dominio.
 * Si no hay URL pública configurada (p. ej. en local sin PUBLIC_BASE_URL),
 * devuelve el enlace original para no romper nada.
 */
function buildProxyUrl(item, options = {}) {
  if (!canProxy() || !item || typeof item.url !== 'string') return item ? item.url : undefined;
  try {
    assertPublicUrl(item.url);
    const token = signToken({
      u: item.url,
      l: item.lang || 'und',
      n: item.release || item.name || '',
      r: item.referer || refererFor(item.url),
      s: Number.isInteger(item.season) ? item.season : undefined,
      e: Number.isInteger(item.episode) ? item.episode : undefined
    }, getSecret(), config.proxyTokenTtlSeconds);
    return `${config.publicBaseUrl}/sub/${token}.srt`;
  } catch (err) {
    console.warn(`[proxy] No se pudo firmar ${item.url}: ${err.message}`);
    return item.url;
  }
}

/** Descarga con redirecciones manuales para validar cada salto (anti-SSRF). */
async function fetchUpstream(rawUrl, referer) {
  let current = assertPublicUrl(rawUrl);
  const headers = {
    'User-Agent': USER_AGENT,
    Accept: '*/*',
    'Accept-Language': 'es-ES,es;q=0.9,en-US;q=0.8,en;q=0.7',
    'Accept-Encoding': 'gzip, deflate'
  };

  for (let hop = 0; hop <= 3; hop += 1) {
    if (referer) headers.Referer = referer;
    const response = await axios.get(current, {
      responseType: 'arraybuffer',
      timeout: config.proxyTimeoutMs,
      maxRedirects: 0,
      maxContentLength: config.proxyMaxBytes,
      headers,
      validateStatus: (status) => status >= 200 && status < 400
    });

    if (response.status >= 300 && response.headers.location) {
      current = assertPublicUrl(new URL(response.headers.location, current).toString());
      continue;
    }
    return {
      buffer: Buffer.from(response.data),
      contentType: response.headers['content-type'] || ''
    };
  }
  throw new Error('Demasiadas redirecciones');
}

function safeFileName(name, ext = 'srt') {
  const base = String(name || '').replace(/^.*[\\/]/, '').replace(/\.[a-z0-9]+$/i, '');
  const clean = base.replace(/[^\w.\- ]+/g, '_').trim().slice(0, 90);
  return `${clean || 'subtitulo'}.${ext}`;
}

function sendText(res, status, body) {
  res.status(status)
    .set({
      'Content-Type': 'text/plain; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-store'
    })
    .send(body);
}

async function serveSubtitle(req, res) {
  let token = String(req.params.token || '');
  token = token.replace(/\.(srt|vtt)$/i, '');

  const payload = verifyToken(token, getSecret());
  if (!payload) {
    return sendText(res, 403, 'Enlace de subtítulo no válido o caducado. Vuelve a abrir el menú de subtítulos en Stremio.');
  }

  let upstream;
  try {
    upstream = await fetchUpstream(payload.u, payload.r || refererFor(payload.u));
  } catch (err) {
    console.warn(`[proxy] Falló la descarga de ${payload.u}: ${err.message}`);
    return sendText(res, 502, `No se pudo descargar el subtítulo: ${err.message}`);
  }

  let buffer = upstream.buffer;
  let entryName = (() => {
    try { return decodeURIComponent(new URL(payload.u).pathname.split('/').pop() || ''); } catch { return ''; }
  })();

  if (isZip(buffer) || /zip/i.test(upstream.contentType)) {
    const entries = extractZip(buffer, { maxBytes: config.proxyMaxBytes });
    const picked = pickSubtitleEntry(entries, {
      release: payload.n,
      season: payload.s,
      episode: payload.e
    });
    if (!picked) {
      console.warn(`[proxy] Zip sin subtítulos utilizables: ${payload.u}`);
      return sendText(res, 415, 'El archivo descargado no contiene un subtítulo reconocible.');
    }
    buffer = picked.data;
    entryName = picked.name;
  }

  const converted = toStremioSubtitleText(buffer, entryName);
  if (!converted) {
    return sendText(res, 415, 'El archivo descargado no parece un subtítulo de texto válido.');
  }

  res.status(200).set({
    'Content-Type': 'text/plain; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'public, max-age=86400',
    'Content-Disposition': `inline; filename="${safeFileName(payload.n || entryName, converted.ext)}"`
  });
  res.send(converted.text);
}

function createProxyRouter() {
  const router = express.Router();
  router.get('/sub/:token', (req, res) => {
    serveSubtitle(req, res).catch((err) => {
      console.error('[proxy] Error inesperado:', err.message);
      if (!res.headersSent) sendText(res, 500, 'Error interno del proxy de subtítulos.');
    });
  });
  return router;
}

module.exports = {
  buildProxyUrl,
  createProxyRouter,
  canProxy,
  getSecret,
  assertPublicUrl,
  fetchUpstream,
  isPrivateHostname
};
