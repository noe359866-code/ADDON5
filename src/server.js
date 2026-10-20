import http from 'node:http';
import crypto from 'node:crypto';
import { isIP } from 'node:net';
import { pathToFileURL } from 'node:url';
import { scrapeCatalog, scrapeHlsFromPage } from './pelispedia.js';

const APP_NAME = 'ADDON5 HLS';
const APP_VERSION = '1.0.0';
const MEDIA_TYPES = new Set(['movie', 'series']);
const QUALITY_VALUES = new Set(['4K', '2160p', '1080p', '720p', '480p', 'SD', 'Auto']);
const LANGUAGE_VALUES = new Set(['Español', 'Español latino', 'Inglés', 'Português', 'Original', 'Desconocido']);
const SAFE_HEADER_NAMES = new Set(['accept', 'accept-language', 'authorization', 'cookie', 'origin', 'referer', 'user-agent']);
const MAX_PLAYLIST_BYTES = 2 * 1024 * 1024;
const MAX_REDIRECTS = 5;
const REQUEST_TIMEOUT_MS = 20000;

function parseJsonEnv(value, fallback, name) {
  if (value == null || value.trim() === '') return fallback;
  try {
    return JSON.parse(value);
  } catch {
    throw new Error(`${name} debe contener JSON válido`);
  }
}

function safeMediaType(value) {
  return MEDIA_TYPES.has(value) ? value : null;
}

function safeDecode(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}

function isPrivateIp(hostname) {
  const version = isIP(hostname);
  if (version === 4) {
    const p = hostname.split('.').map(Number);
    return p[0] === 0 || p[0] === 10 || p[0] === 127 || p[0] >= 224 || (p[0] === 169 && p[1] === 254) || (p[0] === 172 && p[1] >= 16 && p[1] <= 31) || (p[0] === 192 && p[1] === 168) || (p[0] === 100 && p[1] >= 64 && p[1] <= 127);
  }
  if (version === 6) {
    const normalized = hostname.toLowerCase();
    return normalized === '::' || normalized === '::1' || normalized.startsWith('fc') || normalized.startsWith('fd') || normalized.startsWith('fe8') || normalized.startsWith('fe9') || normalized.startsWith('fea') || normalized.startsWith('feb') || normalized.startsWith('::ffff:127.') || normalized.startsWith('::ffff:10.') || normalized.startsWith('::ffff:192.168.');
  }
  return false;
}

function parseAllowedHosts(value) {
  return (value || '').split(',').map(x => x.trim().toLowerCase()).filter(Boolean);
}

function hostIsAllowed(hostname, allowedHosts) {
  const host = hostname.toLowerCase().replace(/\.$/, '');
  if (!allowedHosts.length || isIP(host) !== 0 || isPrivateIp(host) || host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local')) return false;
  return allowedHosts.some(entry => {
    const domain = entry.replace(/^\*\./, '').replace(/\.$/, '');
    if (entry.startsWith('*.')) return host !== domain && host.endsWith(`.${domain}`);
    return host === domain;
  });
}

function cleanConfiguredHeaders(headers) {
  const result = {};
  if (!headers || typeof headers !== 'object' || Array.isArray(headers)) return result;
  for (const [rawName, rawValue] of Object.entries(headers)) {
    const name = rawName.toLowerCase();
    if (!SAFE_HEADER_NAMES.has(name) || typeof rawValue !== 'string' || /[\r\n]/.test(rawValue)) continue;
    result[name] = rawValue.slice(0, 4096);
  }
  return result;
}

function parseCatalog(raw) {
  if (!Array.isArray(raw)) throw new Error('CATALOG_JSON debe ser un arreglo JSON');
  const seen = new Set();
  return raw.filter(item => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return false;
    if (typeof item.id !== 'string' || !item.id.trim() || typeof item.name !== 'string' || !item.name.trim()) return false;
    if (!safeMediaType(item.type) || seen.has(`${item.type}:${item.id}`)) return false;
    seen.add(`${item.type}:${item.id}`);
    return true;
  }).map(item => ({ ...item, id: item.id.trim(), name: item.name.trim() }));
}

function parseStreams(raw, allowedHosts) {
  if (!Array.isArray(raw)) throw new Error('STREAMS_JSON debe ser un arreglo JSON');
  const items = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
    if (typeof item.id !== 'string' || !item.id.trim() || !safeMediaType(item.type) || typeof item.url !== 'string') continue;
    let url;
    try {
      url = new URL(item.url);
    } catch {
      continue;
    }
    if (url.protocol !== 'https:' || !url.pathname.toLowerCase().endsWith('.m3u8') || !hostIsAllowed(url.hostname, allowedHosts)) continue;
    const headers = cleanConfiguredHeaders(item.headers);
    const key = crypto.createHash('sha256').update(JSON.stringify([item.type, item.id, url.toString(), headers])).digest('hex').slice(0, 32);
    items.push({
      id: item.id.trim(),
      type: item.type,
      url: url.toString(),
      key,
      headers,
      quality: QUALITY_VALUES.has(item.quality) ? item.quality : 'Auto',
      language: LANGUAGE_VALUES.has(item.language) ? item.language : 'Desconocido'
    });
  }
  return items;
}

function cleanMeta(item, detailed = false) {
  const meta = {
    id: item.id,
    type: item.type,
    name: item.name
  };
  for (const key of ['poster', 'background', 'logo', 'description', 'releaseInfo', 'year', 'genres', 'imdbRating', 'runtime', 'country', 'language']) {
    if (item[key] !== undefined) meta[key] = item[key];
  }
  if (detailed && item.type === 'series' && Array.isArray(item.videos)) {
    meta.videos = item.videos.filter(v => v && typeof v.id === 'string' && typeof v.title === 'string').map(v => {
      const video = { id: v.id, title: v.title };
      for (const key of ['season', 'episode', 'released', 'overview', 'thumbnail', 'available']) {
        if (v[key] !== undefined) video[key] = v[key];
      }
      return video;
    });
  }
  return meta;
}

function normalizeBaseUrl(value) {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    return url.origin;
  } catch {
    return null;
  }
}

function getPublicBaseUrl(req, env) {
  const configured = normalizeBaseUrl(env.PUBLIC_BASE_URL) || normalizeBaseUrl(env.RENDER_EXTERNAL_URL);
  if (configured) return configured;
  const forwardedProto = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim().toLowerCase();
  const protocol = forwardedProto === 'https' ? 'https' : 'http';
  const host = String(req.headers.host || 'localhost').split(',')[0].trim();
  if (!/^[a-z0-9.:[\]-]+$/i.test(host)) return 'http://localhost';
  return `${protocol}://${host}`;
}

function encryptionKey(secret) {
  return crypto.createHash('sha256').update(secret).digest();
}

function encryptToken(payload, key) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(payload), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, tag, encrypted].map(part => part.toString('base64url')).join('.');
}

function decryptToken(token, key) {
  const parts = token.split('.');
  if (parts.length !== 3 || parts.some(part => !/^[A-Za-z0-9_-]+$/.test(part))) throw new Error('Token inválido');
  const iv = Buffer.from(parts[0], 'base64url');
  const tag = Buffer.from(parts[1], 'base64url');
  const encrypted = Buffer.from(parts[2], 'base64url');
  if (iv.length !== 12 || tag.length !== 16 || encrypted.length > 8192) throw new Error('Token inválido');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return JSON.parse(Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8'));
}

function jsonResponse(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(body),
    'cache-control': 'no-store',
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET, HEAD, OPTIONS',
    'access-control-allow-headers': 'Content-Type, Range'
  });
  res.end(body);
}

function errorResponse(res, status, message) {
  jsonResponse(res, status, { err: message });
}

function parseExtraArgs(url, trailing) {
  const result = new URLSearchParams(url.searchParams);
  if (trailing) {
    const extra = trailing.endsWith('.json') ? trailing.slice(0, -5) : trailing;
    for (const [key, value] of new URLSearchParams(extra)) result.set(key, value);
  }
  return result;
}

function buildManifest() {
  return {
    id: 'com.noe359866-code.addon5-hls',
    version: APP_VERSION,
    name: APP_NAME,
    description: 'Catálogo y reproducción HLS para películas y series.',
    resources: ['catalog', 'meta', 'stream'],
    types: ['movie', 'series'],
    catalogs: [
      { type: 'movie', id: 'addon5-movies', name: 'Películas', extra: [{ name: 'search', isRequired: false }] },
      { type: 'series', id: 'addon5-series', name: 'Series', extra: [{ name: 'search', isRequired: false }] }
    ],
    idPrefixes: []
  };
}

export function createAddonServer(options = {}) {
  const env = options.env || process.env;
  const fetchImpl = options.fetchImpl || fetch;
  const allowedHosts = parseAllowedHosts(env.HLS_ALLOWED_HOSTS);
  const catalogRaw = parseJsonEnv(env.CATALOG_JSON, [], 'CATALOG_JSON');
  const streamsRaw = parseJsonEnv(env.STREAMS_JSON, [], 'STREAMS_JSON');
  const catalog = parseCatalog(catalogRaw);
  const streams = parseStreams(streamsRaw, allowedHosts);
  const pelispediaEnabled = String(env.PELISPEDIA_ENABLED || '').toLowerCase() === 'true';
  const pelispediaBaseUrl = env.PELISPEDIA_BASE_URL || 'https://pelispedia.mov/';
  const dynamicCatalog = new Map();
  const dynamicStreams = new Map();
  let catalogCacheUntil = 0;
  let catalogRefresh = null;
  async function getPelispediaCatalog() {
    if (!pelispediaEnabled) return [];
    if (Date.now() < catalogCacheUntil) return [...dynamicCatalog.values()];
    if (!catalogRefresh) catalogRefresh = scrapeCatalog(pelispediaBaseUrl, fetchImpl).then(items => { dynamicCatalog.clear(); for (const item of items) dynamicCatalog.set(item.id, item); catalogCacheUntil = Date.now() + 300000; return items; }).finally(() => { catalogRefresh = null; });
    try { return await catalogRefresh; } catch { return [...dynamicCatalog.values()]; }
  }
  async function getPelispediaStreams(item) {
    if (!pelispediaEnabled || !item || !item._sourceUrl) return [];
    const cached = dynamicStreams.get(item.id);
    if (cached && cached.until > Date.now()) return cached.items;
    try {
      const discovered = await scrapeHlsFromPage(item._sourceUrl, pelispediaBaseUrl, allowedHosts, fetchImpl);
      const parsed = parseStreams(discovered.map(source => ({ id: item.id, type: item.type, url: source.url, quality: source.quality, language: source.language })), allowedHosts);
      const result = parsed.map(source => ({ ...source, key: crypto.createHash('sha256').update(JSON.stringify([source.type, source.id, source.url, source.headers])).digest('hex').slice(0, 32) }));
      dynamicStreams.set(item.id, { items: result, until: Date.now() + 120000 });
      return result;
    } catch { return []; }
  }
  const configuredSecret = env.STREAM_TOKEN_SECRET;
  if (env.NODE_ENV === 'production' && (!configuredSecret || configuredSecret.length < 32)) {
    throw new Error('En producción, STREAM_TOKEN_SECRET debe tener al menos 32 caracteres');
  }
  const secret = configuredSecret && configuredSecret.length >= 32 ? configuredSecret : crypto.randomBytes(32).toString('hex');
  const key = encryptionKey(secret);
  const manifest = buildManifest();

  async function proxyFetch(initialUrl, headers, req) {
    let current = new URL(initialUrl);
    for (let count = 0; count <= MAX_REDIRECTS; count++) {
      if (current.protocol !== 'https:' || !hostIsAllowed(current.hostname, allowedHosts)) throw new Error('Origen HLS no permitido');
      const upstreamHeaders = { ...headers };
      const range = req.headers.range;
      if (typeof range === 'string' && /^bytes=\d*-\d*(,\d*-\d*)*$/.test(range)) upstreamHeaders.range = range;
      const response = await fetchImpl(current, {
        method: 'GET',
        headers: upstreamHeaders,
        redirect: 'manual',
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
      });
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get('location');
        await response.body?.cancel().catch(() => {});
        if (!location || count === MAX_REDIRECTS) throw new Error('Redirección HLS inválida');
        current = new URL(location, current);
        continue;
      }
      return { response, finalUrl: current };
    }
    throw new Error('Límite de redirecciones alcanzado');
  }

  function makeProxyUrl(req, url, streamKey) {
    const base = getPublicBaseUrl(req, env);
    const token = encryptToken({ url, key: streamKey }, key);
    return `${base}/hls/${token}`;
  }

  async function handleProxy(req, res, token) {
    let tokenPayload;
    try {
      tokenPayload = decryptToken(token, key);
    } catch {
      errorResponse(res, 403, 'Enlace HLS no válido o caducado');
      return;
    }
    if (!tokenPayload || typeof tokenPayload.url !== 'string' || typeof tokenPayload.key !== 'string') {
      errorResponse(res, 403, 'Enlace HLS no válido');
      return;
    }
    const stream = streams.find(item => item.key === tokenPayload.key);
    if (!stream) {
      errorResponse(res, 403, 'Fuente HLS no disponible');
      return;
    }
    let target;
    try {
      target = new URL(tokenPayload.url);
    } catch {
      errorResponse(res, 403, 'Enlace HLS no válido');
      return;
    }
    if (target.protocol !== 'https:' || !hostIsAllowed(target.hostname, allowedHosts)) {
      errorResponse(res, 403, 'Origen HLS no permitido');
      return;
    }
    try {
      const { response, finalUrl } = await proxyFetch(target.toString(), stream.headers, req);
      if (!response.ok && response.status !== 206) {
        await response.body?.cancel().catch(() => {});
        errorResponse(res, response.status >= 400 && response.status <= 599 ? response.status : 502, 'No se pudo obtener el recurso HLS');
        return;
      }
      const contentType = response.headers.get('content-type') || '';
      const isPlaylist = finalUrl.pathname.toLowerCase().endsWith('.m3u8') || /(?:mpegurl|vnd\.apple\.mpegurl)/i.test(contentType);
      res.setHeader('access-control-allow-origin', '*');
      res.setHeader('access-control-allow-methods', 'GET, HEAD, OPTIONS');
      res.setHeader('accept-ranges', 'bytes');
      res.setHeader('cache-control', 'private, max-age=15');
      if (isPlaylist) {
        const declaredLength = Number(response.headers.get('content-length') || 0);
        if (declaredLength > MAX_PLAYLIST_BYTES) {
          await response.body?.cancel().catch(() => {});
          errorResponse(res, 502, 'La lista HLS supera el tamaño permitido');
          return;
        }
        const text = await response.text();
        if (Buffer.byteLength(text) > MAX_PLAYLIST_BYTES || !text.trimStart().startsWith('#EXTM3U')) {
          errorResponse(res, 502, 'Respuesta HLS no válida');
          return;
        }
        const rewritten = text.split(/\r?\n/).map(line => {
          const trimmed = line.trim();
          if (!trimmed) return line;
          if (trimmed.startsWith('#')) {
            return line.replace(/URI=(['"])(.*?)\1/g, (match, quote, uri) => {
              try {
                const absolute = new URL(uri, finalUrl).toString();
                return `URI=${quote}${makeProxyUrl(req, absolute, stream.key)}${quote}`;
              } catch {
                return match;
              }
            });
          }
          try {
            const leading = line.slice(0, line.indexOf(trimmed));
            const absolute = new URL(trimmed, finalUrl).toString();
            return `${leading}${makeProxyUrl(req, absolute, stream.key)}`;
          } catch {
            return line;
          }
        }).join('\n');
        res.writeHead(200, {
          'content-type': 'application/vnd.apple.mpegurl; charset=utf-8',
          'content-length': Buffer.byteLength(rewritten)
        });
        res.end(rewritten);
        return;
      }
      const passHeaders = {};
      for (const name of ['content-type', 'content-length', 'content-range', 'last-modified', 'etag']) {
        const value = response.headers.get(name);
        if (value && !/[\r\n]/.test(value)) passHeaders[name] = value;
      }
      if (!passHeaders['content-type']) passHeaders['content-type'] = 'application/octet-stream';
      if (req.method === 'HEAD') {
        res.writeHead(response.status, passHeaders);
        res.end();
        await response.body?.cancel().catch(() => {});
        return;
      }
      res.writeHead(response.status, passHeaders);
      if (!response.body) {
        res.end();
        return;
      }
      const reader = response.body.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (!res.write(Buffer.from(value))) await new Promise(resolve => res.once('drain', resolve));
        }
        res.end();
      } catch {
        res.destroy();
      } finally {
        reader.releaseLock();
      }
    } catch {
      if (!res.headersSent) errorResponse(res, 502, 'Error al entregar el recurso HLS');
      else res.destroy();
    }
  }

  const server = http.createServer(async (req, res) => {
    res.setHeader('access-control-allow-origin', '*');
    res.setHeader('access-control-allow-methods', 'GET, HEAD, OPTIONS');
    res.setHeader('access-control-allow-headers', 'Content-Type, Range');
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }
    if (!['GET', 'HEAD'].includes(req.method)) {
      errorResponse(res, 405, 'Método no permitido');
      return;
    }
    let url;
    try {
      url = new URL(req.url, 'http://localhost');
    } catch {
      errorResponse(res, 400, 'Solicitud inválida');
      return;
    }
    const pathname = url.pathname;
    if (pathname === '/health' || pathname === '/healthz') {
      jsonResponse(res, 200, { status: 'ok', service: 'addon5-hls', version: APP_VERSION });
      return;
    }
    if (pathname === '/') {
      jsonResponse(res, 200, { name: APP_NAME, version: APP_VERSION, manifest: '/manifest.json', health: '/health' });
      return;
    }
    if (pathname === '/manifest.json') {
      jsonResponse(res, 200, manifest);
      return;
    }
    const parts = pathname.split('/').filter(Boolean);
    if (parts[0] === 'catalog' && parts.length >= 3 && parts.length <= 4 && (parts[2].endsWith('.json') || (parts.length === 4 && parts[3].endsWith('.json')))) {
      const type = safeMediaType(parts[1]);
      const catalogId = safeDecode(parts[2].endsWith('.json') ? parts[2].slice(0, -5) : parts[2]);
      if (!type || !((type === 'movie' && catalogId === 'addon5-movies') || (type === 'series' && catalogId === 'addon5-series'))) {
        jsonResponse(res, 200, { metas: [] });
        return;
      }
      const extra = parseExtraArgs(url, parts[3]);
      const search = (extra.get('search') || '').trim().toLocaleLowerCase();
      const skip = Math.max(0, Math.min(100000, Number.parseInt(extra.get('skip') || '0', 10) || 0));
      const sourceCatalog = pelispediaEnabled ? [...catalog, ...await getPelispediaCatalog()] : catalog;
      const matches = sourceCatalog.filter(item => item.type === type && (!search || [item.name, item.description, ...(Array.isArray(item.genres) ? item.genres : [])].filter(Boolean).join(' ').toLocaleLowerCase().includes(search)));
      const metas = matches.slice(skip, skip + 100).map(item => cleanMeta(item, false));
      jsonResponse(res, 200, { metas });
      return;
    }
    if (parts[0] === 'meta' && parts.length === 3 && parts[2].endsWith('.json')) {
      const type = safeMediaType(parts[1]);
      const id = safeDecode(parts[2].slice(0, -5));
      const item = type ? (catalog.find(entry => entry.type === type && entry.id === id) || (await getPelispediaCatalog()).find(entry => entry.type === type && entry.id === id)) : null;
      jsonResponse(res, 200, { meta: item ? cleanMeta(item, true) : null });
      return;
    }
    if (parts[0] === 'stream' && parts.length === 3 && parts[2].endsWith('.json')) {
      const type = safeMediaType(parts[1]);
      const id = safeDecode(parts[2].slice(0, -5));
      if (!type) {
        jsonResponse(res, 200, { streams: [] });
        return;
      }
      const sourceItem = catalog.find(entry => entry.type === type && entry.id === id) || (await getPelispediaCatalog()).find(entry => entry.type === type && entry.id === id);
      const dynamicFound = sourceItem ? await getPelispediaStreams(sourceItem) : [];
      const found = [...streams.filter(item => item.type === type && item.id === id), ...dynamicFound].map(item => ({
        name: APP_NAME,
        title: [item.quality, item.language].filter(Boolean).join(' • '),
        url: makeProxyUrl(req, item.url, item.key),
        behaviorHints: { notWebReady: false }
      }));
      jsonResponse(res, 200, { streams: found });
      return;
    }
    if (parts[0] === 'hls' && parts.length === 2) {
      const token = parts[1];
      if (token.length > 12000) {
        errorResponse(res, 414, 'Enlace HLS demasiado largo');
        return;
      }
      await handleProxy(req, res, token);
      return;
    }
    errorResponse(res, 404, 'Ruta no encontrada');
  });

  return server;
}

export { buildManifest, cleanMeta, hostIsAllowed, parseCatalog, parseStreams };

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const server = createAddonServer();
    const port = Number.parseInt(process.env.PORT || '10000', 10);
    server.listen(port, '0.0.0.0', () => {
      process.stdout.write(`ADDON5 HLS escuchando en el puerto ${port}\n`);
    });
    const shutdown = () => server.close(() => process.exit(0));
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exit(1);
  }
}
