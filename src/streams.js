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

function titleFor({ language, label, quality }) {
  const parts = [];
  if (language) parts.push(language);
  if (label) parts.push(label);
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
 */
export function buildStream({
  baseUrl,
  media,
  referer = '',
  language = '',
  label = '',
  quality = '',
  source = 'Gnula'
}) {
  const proxied = shouldProxy(media, referer);
  const url = proxied ? buildProxyUrl(baseUrl, media, referer) : media;
  const name = source || 'Gnula';

  const stream = {
    name: language ? `${name} · ${language}` : name,
    title: titleFor({ language: '', label, quality }),
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

/**
 * Último recurso: el reproductor no se pudo abrir, pero la persona puede
 * verlo en su navegador. Stremio abre estas entradas fuera del reproductor.
 */
export function buildExternalStream({ embedUrl, pageUrl = '', language = '', label = '', source = 'Gnula' }) {
  const target = embedUrl || pageUrl;
  if (!target) return null;
  const suffix = embedUrl ? 'abrir reproductor' : 'abrir la ficha';
  return {
    name: language ? `${source} · ${language}` : source,
    title: clip(`${label ? `${label} · ` : ''}${suffix} en el navegador`, 90),
    externalUrl: target,
    behaviorHints: { notWebReady: true }
  };
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
