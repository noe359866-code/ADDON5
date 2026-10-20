'use strict';

// Configuración centralizada: todo el proyecto lee process.env SOLO desde aquí.
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
  providerTimeoutMs: Number(process.env.PROVIDER_TIMEOUT_MS) || 8000,
  cacheTtlSeconds: Number(process.env.CACHE_TTL_SECONDS) || 21600, // 6 h
  // Topes del scraping: cuántos subtítulos devuelve como máximo cada
  // proveedor y para cuántos candidatos merece la pena abrir su ficha de
  // detalle (SubDL "info" / SubSource detalle) en busca del enlace directo.
  maxPerProvider: Number(process.env.MAX_SUBTITLES_PER_PROVIDER) || 30,
  maxDetailFetches: Number(process.env.MAX_DETAIL_FETCHES) || 10,
  // Bases/espejos de los sitios que cambian de dominio con frecuencia.
  // YTS: lista en orden de prueba (el primero que responda gana).
  ytsSubsBaseUrls: (process.env.YTS_SUBS_BASE_URLS || 'https://www.yts-subs.com,https://yifysubtitles.ch')
    .split(',').map((u) => u.trim().replace(/\/$/, '')).filter(Boolean),
  subsceneBaseUrl: (process.env.SUBSCENE_BASE_URL || 'https://sub-scene.com').replace(/\/$/, ''),
  indexSubtitleBaseUrl: (process.env.INDEXSUBTITLE_BASE_URL || 'https://indexsubtitle.cc').replace(/\/$/, '')
};
