'use strict';

// Configuración centralizada: todo el proyecto lee process.env SOLO desde aquí.
function number(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function origin(value) {
  try {
    return new URL(String(value || '').trim()).origin;
  } catch {
    return String(value || '').trim().replace(/\/+$/, '');
  }
}

module.exports = {
  port: Number(process.env.PORT) || 7000,
  subdlApiKey: process.env.SUBDL_API_KEY || '',
  subsourceApiKey: process.env.SUBSOURCE_API_KEY || '',
  // Idiomas que pedimos a las APIs que permiten filtrar (SubDL usa códigos en mayúsculas: ES, EN...)
  languages: (process.env.SUBTITLE_LANGUAGES || 'ES,EN')
    .split(',')
    .map((l) => l.trim().toUpperCase())
    .filter(Boolean),
  // false (defecto): se devuelven TODOS los idiomas, con ES/EN primero.
  // true: se descartan los subtítulos que no estén en SUBTITLE_LANGUAGES.
  languagesOnly: /^(1|true|yes)$/i.test(process.env.SUBTITLE_LANGUAGES_ONLY || ''),
  providerTimeoutMs: number(process.env.PROVIDER_TIMEOUT_MS, 5000),
  cacheTtlSeconds: number(process.env.CACHE_TTL_SECONDS, 21600), // 6 h
  // Presupuesto TOTAL del handler. Stremio abandona las peticiones lentas: si
  // el scraping tarda más que esto devolvemos lo que haya (nunca esperamos
  // más), porque un timeout del cliente equivale a "no hay subtítulos".
  handlerDeadlineMs: number(process.env.HANDLER_DEADLINE_MS, 9000),
  cinemetaTimeoutMs: number(process.env.CINEMETA_TIMEOUT_MS, 3000),
  // Topes del scraping: cuántos subtítulos devuelve como máximo cada
  // proveedor y para cuántos candidatos merece la pena abrir su ficha de
  // detalle (SubDL "info" / SubSource detalle) en busca del enlace directo.
  maxPerProvider: number(process.env.MAX_SUBTITLES_PER_PROVIDER, 30),
  maxDetailFetches: number(process.env.MAX_DETAIL_FETCHES, 4),
  // Bases/espejos de los sitios que cambian de dominio con frecuencia.
  // YTS: lista en orden de prueba (el primero que responda gana).
  ytsSubsBaseUrls: (process.env.YTS_SUBS_BASE_URLS || 'https://yifysubtitles.ch,https://www.yts-subs.com')
    .split(',').map((u) => u.trim().replace(/\/$/, '')).filter(Boolean),
  subsceneBaseUrl: (process.env.SUBSCENE_BASE_URL || 'https://sub-scene.com').replace(/\/$/, ''),
  indexSubtitleBaseUrl: (process.env.INDEXSUBTITLE_BASE_URL || 'https://indexsubtitle.cc').replace(/\/$/, ''),

  /* ---------------------------------------------------------- proxy propio */
  // URL pública del addon. En Render se rellena sola con RENDER_EXTERNAL_URL.
  // Sin ella no podemos reescribir los enlaces de descarga a /sub/…, así que
  // se devuelven las URLs originales (funciona en local, pero Stremio Web
  // puede bloquearlas por CORS y los .zip no se reproducen).
  publicBaseUrl: origin(process.env.PUBLIC_BASE_URL || process.env.RENDER_EXTERNAL_URL),
  // Interruptor de emergencia: SUBTITLE_PROXY=false devuelve las URLs originales.
  proxyEnabled: !/^(0|false|no|off)$/i.test(String(process.env.SUBTITLE_PROXY || '').trim()),
  // Secreto para firmar los enlaces /sub/{token}. Si no se define se genera
  // uno aleatorio al arrancar (los enlaces dejan de valer tras un reinicio).
  proxySecret: process.env.SUBTITLE_TOKEN_SECRET || process.env.STREAM_TOKEN_SECRET || '',
  proxyTokenTtlSeconds: number(process.env.SUBTITLE_TOKEN_TTL_SECONDS, 7 * 24 * 3600),
  proxyTimeoutMs: number(process.env.PROXY_TIMEOUT_MS, 20000),
  proxyMaxBytes: number(process.env.PROXY_MAX_BYTES, 20 * 1024 * 1024),

  /* ----------------------------------------------------------- anime (kitsu) */
  // Stremio también envía IDs tipo "kitsu:1234" (catálogos de anime). Para
  // buscar en sitios que solo entienden IMDb necesitamos el tt… equivalente.
  animeMappingEnabled: !/^(0|false|no|off)$/i.test(String(process.env.ANIME_MAPPING_ENABLED || '').trim()),
  animeMappingUrls: (process.env.ANIME_MAPPING_URLS ||
    'https://raw.githubusercontent.com/Fribb/anime-lists/master/anime-list-mini.json')
    .split(',').map((u) => u.trim()).filter(Boolean),
  animeMappingTimeoutMs: number(process.env.ANIME_MAPPING_TIMEOUT_MS, 15000),
  kitsuApiBaseUrl: origin(process.env.KITSU_API_BASE_URL) || 'https://kitsu.io/api/edge'
};
