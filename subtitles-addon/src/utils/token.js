'use strict';

const crypto = require('node:crypto');

/**
 * Tokens opacos para el endpoint de descarga propio (/sub/…).
 *
 * El addon devuelve a Stremio URLs de NUESTRO dominio en lugar de los enlaces
 * directos de los sitios de subtítulos. Así:
 *   - Stremio Web no sufre bloqueos CORS,
 *   - podemos enviar el Referer/User-Agent que exigen esos sitios,
 *   - descomprimimos los .zip y entregamos un .srt/.vtt limpio en UTF-8.
 *
 * El token es JSON + firma HMAC: sin estado en el servidor y válido aunque
 * Render reinicie la instancia (siempre que el secreto sea estable).
 */

const VERSION = 1;

function base64url(input) {
  return Buffer.from(input).toString('base64url');
}

function fromBase64url(text) {
  return Buffer.from(text, 'base64url');
}

function signature(body, secret) {
  return crypto.createHmac('sha256', secret).update(body).digest('base64url');
}

/**
 * @param {object} payload  { u: url upstream, l: lang, n: nombre, r: referer }
 * @param {string} secret   secreto compartido (>= 16 caracteres)
 * @param {number} [ttlSeconds]
 * @returns {string} token `payload.firma`
 */
function signToken(payload, secret, ttlSeconds) {
  if (!payload || typeof payload.u !== 'string' || !/^https?:\/\//i.test(payload.u)) {
    throw new Error('URL upstream inválida para el token');
  }
  const now = Math.floor(Date.now() / 1000);
  const ttl = Number.isFinite(Number(ttlSeconds)) ? Number(ttlSeconds) : 7 * 24 * 3600;
  const body = base64url(JSON.stringify({
    v: VERSION,
    ...payload,
    iat: now,
    exp: now + ttl
  }));
  return `${body}.${signature(body, secret)}`;
}

/**
 * @returns {object|null} payload si la firma y la caducidad son válidas
 */
function verifyToken(token, secret) {
  if (typeof token !== 'string' || token.length < 20 || token.length > 8192) return null;
  const dot = token.lastIndexOf('.');
  if (dot <= 0 || dot === token.length - 1) return null;
  const body = token.slice(0, dot);
  const provided = token.slice(dot + 1);
  const expected = signature(body, secret);
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  let payload;
  try {
    payload = JSON.parse(fromBase64url(body).toString('utf8'));
  } catch {
    return null;
  }
  if (!payload || payload.v !== VERSION) return null;
  if (typeof payload.u !== 'string' || !/^https?:\/\//i.test(payload.u)) return null;
  if (!Number.isFinite(payload.exp) || payload.exp < Math.floor(Date.now() / 1000)) return null;
  return payload;
}

module.exports = { signToken, verifyToken, base64url };
