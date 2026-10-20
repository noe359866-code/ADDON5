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
  cacheTtlSeconds: Number(process.env.CACHE_TTL_SECONDS) || 21600 // 6 h
};
