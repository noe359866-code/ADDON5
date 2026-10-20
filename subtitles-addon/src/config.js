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
  providerTimeoutMs: Number(process.env.PROVIDER_TIMEOUT_MS) || 8000,
  cacheTtlSeconds: Number(process.env.CACHE_TTL_SECONDS) || 21600, // 6 h
  // Topes del scraping: cuántos subtítulos devuelve como máximo cada
  // proveedor y para cuántos candidatos merece la pena abrir su ficha de
  // detalle (SubDL "info" / SubSource detalle) en busca del enlace directo.
  maxPerProvider: Number(process.env.MAX_SUBTITLES_PER_PROVIDER) || 30,
  maxDetailFetches: Number(process.env.MAX_DETAIL_FETCHES) || 10
};
