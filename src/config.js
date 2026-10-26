/**
 * src/config.js — Configuración del addon leída de variables de entorno.
 *
 * Todo tiene un valor por defecto sensato: el addon arranca sin configurar
 * nada. En Render basta con definir PORT (lo inyecta la plataforma).
 */

function intEnv(name, fallback, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const value = Number.parseInt(raw, 10);
  if (!Number.isFinite(value) || value < min || value > max) {
    console.warn(`[config] ${name}="${raw}" no es válido; se usa ${fallback}`);
    return fallback;
  }
  return value;
}

function boolEnv(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  return /^(1|true|yes|si|sí|on)$/i.test(raw.trim());
}

function urlEnv(name, fallback) {
  const raw = (process.env[name] || '').trim();
  if (!raw) return fallback;
  try {
    const parsed = new URL(raw);
    if (!/^https?:$/.test(parsed.protocol)) throw new Error('protocolo no soportado');
    return raw.replace(/\/+$/, '');
  } catch {
    console.warn(`[config] ${name}="${raw}" no es una URL válida; se usa ${fallback}`);
    return fallback;
  }
}

export const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

function proxyModeEnv() {
  const raw = (process.env.STREAM_PROXY || '').trim().toLowerCase();
  if (!raw) return 'auto';
  if (['auto', 'always', 'never'].includes(raw)) return raw;
  console.warn(`[config] STREAM_PROXY="${raw}" no es válido; se usa auto`);
  return 'auto';
}

const FORMAT_ALIASES = {
  m3u8: 'hls',
  m3u: 'hls',
  hls: 'hls',
  mp4: 'mp4',
  m4v: 'mp4',
  mkv: 'mkv',
  webm: 'webm',
  mpd: 'dash',
  dash: 'dash'
};

function parseFormats(raw, fallback) {
  const value = String(raw == null ? '' : raw).trim();
  if (!value) return fallback;
  const formats = value
    .split(/[,\s]+/)
    .map((item) => FORMAT_ALIASES[item.trim().toLowerCase()] || '')
    .filter(Boolean);
  if (!formats.length) {
    console.warn(`[config] STREMIO_FORMATS="${value}" no es válido; se usa ${fallback.join(',')}`);
    return fallback;
  }
  return [...new Set(formats)];
}

export const config = {
  // 0 = puerto efímero (lo usa el test de arranque).
  port: intEnv('PORT', 7000, { min: 0, max: 65535 }),

  /** URL pública del servicio. Si falta se deduce del Host de cada petición. */
  publicBaseUrl: urlEnv('PUBLIC_BASE_URL', ''),

  /** Catálogo de Gnula (WordPress). */
  gnulaBaseUrl: urlEnv('GNULA_BASE_URL', 'https://www2.gnula.one'),

  /** Sitio hermano de Gnula para series (misma plantilla de reproductores). */
  seriesBaseUrl: urlEnv('SERIES_BASE_URL', 'https://ver.verteleseriesonline.com'),

  /** Hermano de Gnula con otra plantilla: /ver/<slug>/ + API gnrd de reproductores. */
  gnulahdBaseUrl: urlEnv('GNULAHD_BASE_URL', 'https://ww3.gnulahd.nu'),

  /** Metadatos IMDb → título/año (público, sin clave). */
  cinemetaBaseUrl: urlEnv('CINEMETA_BASE_URL', 'https://v3-cinemeta.strem.io'),

  /**
   * TMDB: opcional. Con clave añade el título en español (el que usan las
   * webs de destino) y permite IDs `tmdb:…`. Sin clave se usa solo Cinemeta.
   */
  tmdbApiKey: (process.env.TMDB_API_KEY || '').trim(),
  tmdbBaseUrl: urlEnv('TMDB_BASE_URL', 'https://api.themoviedb.org/3'),
  tmdbLanguage: (process.env.TMDB_LANGUAGE || '').trim() || 'es-MX',

  /** Buscador público de IMDb, respaldo si Cinemeta no responde. */
  imdbSuggestionBaseUrl: urlEnv('IMDB_SUGGESTION_BASE_URL', 'https://v2.sg.media-imdb.com/suggestion/t'),

  userAgent: (process.env.USER_AGENT || '').trim() || DEFAULT_USER_AGENT,

  /** Presupuesto total de una petición de Stremio. */
  handlerDeadlineMs: intEnv('HANDLER_DEADLINE_MS', 15000, { min: 1000, max: 120000 }),

  /** Timeout de cada petición HTTP individual. */
  fetchTimeoutMs: intEnv('FETCH_TIMEOUT_MS', 7000, { min: 1000, max: 60000 }),

  /** Embed que se intentan resolver por petición (los mejores primero). */
  maxResolvePerRequest: intEnv('MAX_RESOLVE_PER_REQUEST', 8, { min: 1, max: 24 }),

  /** Peticiones simultáneas a reproductores externos. */
  resolveConcurrency: intEnv('RESOLVE_CONCURRENCY', 3, { min: 1, max: 8 }),

  /** Saltos máximos al seguir un reproductor (agregadores → iframe → video). */
  maxResolveHops: intEnv('MAX_RESOLVE_HOPS', 3, { min: 1, max: 6 }),

  /** Caché de la ficha de Gnula (lista de embed). */
  cacheTtlSeconds: intEnv('CACHE_TTL_SECONDS', 900, { min: 0, max: 86400 }),

  /** TTL de la URL de video ya resuelta (los CDN firman enlaces que caducan). */
  mediaCacheTtlSeconds: intEnv('MEDIA_CACHE_TTL_SECONDS', 240, { min: 0, max: 3600 }),

  /**
   * Proxy propio de video:
   *   auto   → solo cuando el CDN exige Referer/UA (lo normal en estos hosts)
   *   always → siempre
   *   never  → nunca (se devuelve la URL directa + proxyHeaders)
   */
  streamProxy: proxyModeEnv(),

  /**
   * Formatos que se entregan: SOLO los que reproduce Stremio.
   *   hls   (.m3u8)  nativo en todas las plataformas
   *   mp4   (.mp4/.m4v) nativo en todas las plataformas
   *   mkv   solo escritorio/TV (opt-in explícito)
   *   dash  (.mpd) la mayoría de clientes no lo abre (opt-in explícito)
   *   webm  opt-in explícito
   * Cualquier otro enlace se descarta aunque el reproductor lo exponga.
   */
  stremioFormats: parseFormats(process.env.STREMIO_FORMATS, ['hls', 'mp4']),

  /** Log detallado por consola. */
  debug: boolEnv('DEBUG', false),

  /** Nombre y versión publicados en el manifest. */
  addonName: (process.env.ADDON_NAME || '').trim() || 'Gnula Streams',
  addonVersion: '1.0.0'
};
