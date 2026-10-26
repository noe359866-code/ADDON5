/**
 * src/streams.js — Construcción de los objetos `stream` de Stremio.
 *
 * Stremio reproduce URLs directas, no páginas de reproductor. Cuando el CDN
 * exige un Referer (casi todos estos lo hacen) hay dos caminos:
 *   - proxyHeaders: se lo pide el reproductor al cliente de Stremio.
 *   - /proxy propio: lo pone nuestro servidor, funciona en cualquier cliente.
 * En modo `auto` se usa el proxy solo para los enlaces que traen Referer,
 * que son exactamente los que fallarían sin cabeceras.
 */

import { config } from './config.js';
import { clip } from './utils/text.js';

export function encodeParam(value) {
  return Buffer.from(String(value == null ? '' : value), 'utf8').toString('base64url');
}

export function decodeParam(value, maxLength = 8192) {
  const raw = String(value == null ? '' : value);
  if (!raw || raw.length > maxLength * 2) return '';
  try {
    return Buffer.from(raw, 'base64url').toString('utf8');
  } catch {
    return '';
  }
}

export function buildProxyUrl(baseUrl, mediaUrl, referer = '') {
  const params = new URLSearchParams();
  params.set('u', encodeParam(mediaUrl));
  if (referer) params.set('r', encodeParam(referer));
  return `${baseUrl}/proxy?${params.toString()}`;
}

export function shouldProxy(mediaUrl, referer) {
  if (!mediaUrl) return false;
  if (config.streamProxy === 'always') return true;
  if (config.streamProxy === 'never') return false;
  return Boolean(referer);
}

function titleFor({ label, format, quality }) {
  const parts = [];
  if (label) parts.push(label);
  if (format) parts.push(format);
  if (quality) parts.push(quality);
  return clip(parts.join(' · '), 90) || 'Gnula';
}

/**
 * @param {object} input
 * @param {string} input.baseUrl   URL pública del addon (para /proxy)
 * @param {string} input.media     URL de video ya resuelta
 * @param {string} input.referer   Referer que exige el CDN
 * @param {string} input.language  «Latino», «Castellano», «Subtitulado»…
 * @param {string} input.label     Nombre del reproductor (Voe, Streamtape…)
 * @param {string} input.quality   «HD», «1080P»…
 * @param {string} input.source    Web de origen («Gnula», «GnulaHD»)
 * @param {string} input.format    «HLS», «MP4»… (solo se entregan estos)
 */
export function buildStream({
  baseUrl,
  media,
  referer = '',
  language = '',
  label = '',
  quality = '',
  source = 'Gnula',
  format = ''
}) {
  const proxied = shouldProxy(media, referer);
  const url = proxied ? buildProxyUrl(baseUrl, media, referer) : media;
  const name = source || 'Gnula';

  const stream = {
    name: language ? `${name} · ${language}` : name,
    title: titleFor({ label, format, quality }),
    url
  };

  if (!proxied && referer) {
    stream.behaviorHints = {
      notWebReady: false,
      proxyHeaders: {
        request: {
          Referer: referer,
          'User-Agent': config.userAgent
        }
      }
    };
  } else {
    stream.behaviorHints = { notWebReady: false };
  }

  return stream;
}

/** Quita repetidos por URL conservando el orden (y los idiomas distintos). */
export function dedupeStreams(streams) {
  const seen = new Set();
  const out = [];
  for (const stream of streams) {
    if (!stream) continue;
    const key = stream.url || stream.externalUrl || '';
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(stream);
  }
  return out;
}
