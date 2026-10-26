/**
 * src/formats.js — ¿Puede Stremio reproducir este enlace?
 *
 * El addon no devuelve páginas de reproductor, listas de descarga ni enlaces
 * de descarga comprimidos: solo lo que el reproductor de Stremio abre.
 *
 *   HLS  (.m3u8)              sí — nativo en todas las plataformas
 *   MP4  (.mp4/.m4v)          sí — nativo en todas las plataformas
 *   MKV  (.mkv)               solo escritorio/TV → opt-in
 *   DASH (.mpd)               sin soporte en la mayoría de clientes → opt-in
 *   resto (.zip, .html, .ts…) no
 *
 * Algunos CDN no ponen extensión (`/get_video?id=…`): en ese caso se pregunta
 * el `Content-Type` con un HEAD (y un Range mínimo si el HEAD está bloqueado),
 * sin descargar el archivo. Si tampoco así se puede confirmar, el enlace no se
 * entrega: vale más una lista corta y reproducible que una entrada que falla.
 */

import { config } from './config.js';

const EXTENSION_FORMATS = {
  m3u8: 'hls',
  m3u: 'hls',
  mp4: 'mp4',
  m4v: 'mp4',
  mkv: 'mkv',
  webm: 'webm',
  mpd: 'dash',
  ts: 'ts',
  flv: 'flv',
  avi: 'avi',
  wmv: 'wmv',
  mov: 'mov',
  zip: 'zip',
  rar: 'rar',
  html: 'page',
  txt: 'page'
};

const CONTENT_TYPE_FORMATS = [
  [/mpegurl/i, 'hls'],
  [/dash\+xml/i, 'dash'],
  [/matroska/i, 'mkv'],
  [/webm/i, 'webm'],
  [/^(?:video|audio)\/mp4\b/i, 'mp4'],
  [/^video\/(?:quicktime|x-m4v)\b/i, 'mp4'],
  [/^video\/mp2t\b/i, 'ts'],
  [/^(?:text\/html|application\/xhtml\+xml|application\/json|text\/plain)\b/i, 'page'],
  [/^(?:application\/zip|application\/x-zip)/i, 'zip'],
  [/^video\//i, 'other-video'],
  [/^application\/octet-stream/i, 'binary']
];

/** Etiqueta que se muestra en el título del stream. */
const FORMAT_LABELS = {
  hls: 'HLS',
  mp4: 'MP4',
  mkv: 'MKV',
  webm: 'WebM',
  dash: 'DASH'
};

export function extensionOf(url) {
  const match = /\.([a-z0-9]{1,5})(?:[?#]|$)/i.exec(String(url == null ? '' : url));
  return match ? match[1].toLowerCase() : '';
}

/** 'hls' | 'mp4' | 'mkv' | 'dash' | 'page' | … | '' si no hay extensión. */
export function formatFromUrl(url) {
  return EXTENSION_FORMATS[extensionOf(url)] || '';
}

export function formatFromContentType(contentType) {
  const value = String(contentType == null ? '' : contentType).split(';')[0].trim();
  if (!value) return '';
  for (const [pattern, format] of CONTENT_TYPE_FORMATS) {
    if (pattern.test(value)) return format;
  }
  return '';
}

export function formatLabel(format) {
  return FORMAT_LABELS[format] || '';
}

export function allowedFormats() {
  return new Set(config.stremioFormats);
}

export function isAllowedFormat(format) {
  return Boolean(format) && allowedFormats().has(format);
}

function mediaHeaders(referer) {
  const headers = {
    'User-Agent': config.userAgent,
    Accept: '*/*',
    'Accept-Language': 'es-ES,es;q=0.9,en;q=0.6'
  };
  // Igual que en los reproductores: Referer sí, Origin no (un <video> no lo
  // manda y algunos CDN lo rechazan).
  if (referer) headers.Referer = referer;
  return headers;
}

/**
 * Content-Type del enlace sin descargarlo. Devuelve '' si no se pudo saber.
 */
export async function probeContentType(url, { deadline = null, referer = '', timeoutMs = 4000 } = {}) {
  const budget = deadline ? deadline.budget(timeoutMs) : timeoutMs;
  if (!(budget > 0)) return '';

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), budget);
  const headers = mediaHeaders(referer);

  const read = async (options) => {
    const response = await fetch(url, { redirect: 'follow', signal: controller.signal, ...options });
    const type = response.headers.get('content-type') || '';
    // El cuerpo no se descarga: solo interesan las cabeceras.
    if (response.body && typeof response.body.cancel === 'function') {
      await response.body.cancel().catch(() => {});
    }
    return { status: response.status, ok: response.ok, type };
  };

  try {
    const head = await read({ method: 'HEAD', headers });
    if ((head.ok || head.status === 206) && head.type) return head.type;

    // Algunos CDN rechazan HEAD: se pide un solo byte.
    const ranged = await read({ method: 'GET', headers: { ...headers, Range: 'bytes=0-1' } });
    if (ranged.ok || ranged.status === 206) return ranged.type;
    return '';
  } catch {
    return '';
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Decide si el enlace sirve para Stremio.
 * @returns {Promise<{compatible:boolean, format:string, label:string, reason:string}>}
 */
export async function classifyMedia(url, { deadline = null, referer = '' } = {}) {
  let format = formatFromUrl(url);

  // Con extensión conocida no hace falta preguntar nada.
  if (format && format !== 'binary') {
    const compatible = isAllowedFormat(format);
    return {
      compatible,
      format,
      label: formatLabel(format),
      reason: compatible ? '' : `formato ${format} no soportado por Stremio`
    };
  }

  const contentType = await probeContentType(url, { deadline, referer });
  format = formatFromContentType(contentType);

  if (!format) {
    return {
      compatible: false,
      format: '',
      label: '',
      reason: contentType ? `tipo de contenido desconocido (${contentType})` : 'no se pudo confirmar el tipo de video'
    };
  }

  const compatible = isAllowedFormat(format);
  return {
    compatible,
    format,
    label: formatLabel(format),
    reason: compatible ? '' : `tipo de contenido ${contentType} no soportado por Stremio`
  };
}
