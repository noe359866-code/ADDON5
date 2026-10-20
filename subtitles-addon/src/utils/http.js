'use strict';

const axios = require('axios');
const config = require('../config');

// User-Agent de un Chrome real y reciente. Ojo: esto evita los bloqueos
// "básicos" (403 por UA vacío/de bot), NO los retos de Cloudflare con JS:
// si un sitio presenta el challenge, getHtml() lo detecta y lanza, y el
// proveedor afectado devolverá [] sin tumbar el addon.
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

function browserHeaders(referer) {
  const headers = {
    'User-Agent': USER_AGENT,
    Accept:
      'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'es-ES,es;q=0.9,en-US;q=0.8,en;q=0.7',
    // Sin "br": el adaptador HTTP de axios/Node descomprime gzip/deflate sin
    // problema; pedir brotli puede dejarte con bytes sin descomprimir.
    'Accept-Encoding': 'gzip, deflate',
    Connection: 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-User': '?1'
  };
  if (referer) {
    headers.Referer = referer;
    // Encadenamos Referer búsqueda -> ficha -> detalle, como un navegador.
    try {
      headers['Sec-Fetch-Site'] = 'same-origin';
    } catch { /* noop */ }
  }
  return headers;
}

const http = axios.create({
  timeout: config.providerTimeoutMs,
  maxRedirects: 5,
  headers: {
    'User-Agent': USER_AGENT,
    'Accept-Language': 'es-ES,es;q=0.9,en-US;q=0.8,en;q=0.7'
  },
  validateStatus: (status) => status >= 200 && status < 300
});

const CLOUDFLARE_RE =
  /Just a moment|cf-challenge|challenge-platform|Attention Required! \| Cloudflare|Checking your browser/i;

/**
 * Descarga una página HTML como texto. Lanza en errores HTTP/red y cuando
 * detecta un reto anti-bots (el HTML del challenge no sirve para parsear).
 */
async function getHtml(url, { referer, timeout } = {}) {
  const fallbackReferer = (() => {
    try { return `${new URL(url).origin}/`; } catch { return undefined; }
  })();
  const { data } = await http.get(url, {
    headers: browserHeaders(referer || fallbackReferer),
    responseType: 'text',
    timeout: timeout || config.providerTimeoutMs,
    maxContentLength: 12 * 1024 * 1024, // las fichas de series son enormes
    transformResponse: [(d) => d]
  });
  if (typeof data !== 'string') throw new Error(`Respuesta no-HTML desde ${url}`);
  if (CLOUDFLARE_RE.test(data.slice(0, 8000))) {
    throw new Error(`Reto anti-bots (Cloudflare) en ${url}`);
  }
  return data;
}

http.getHtml = getHtml;
http.browserHeaders = browserHeaders;
http.USER_AGENT = USER_AGENT;

module.exports = http;
