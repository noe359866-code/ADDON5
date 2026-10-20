'use strict';

/**
 * index.js — ARCHIVO PRINCIPAL del addon de subtítulos para Stremio.
 *
 * Une todos los módulos de scraping creados (SubDL, SubSource, Subscene,
 * YTS-Subs, JustSubtitles e IndexSubtitle, en src/providers/) detrás del
 * único recurso que Stremio nos pide: "subtitles".
 *
 * Flujo de una petición  GET /subtitles/{type}/{id}.json
 *   1. defineSubtitlesHandler extrae IMDb ID (+ temporada/episodio).
 *   2. Se lanzan TODOS los proveedores EN PARALELO con Promise.allSettled.
 *   3. Se unifican resultados: formato {id,url,lang}, sin duplicados y
 *      ordenados por idioma (español, inglés y después el resto).
 *   4. Se devuelve el JSON final { subtitles: [...] } que espera Stremio.
 *   5. El servidor HTTP escucha en process.env.PORT (Render lo asigna
 *      dinámicamente) o en el puerto 7000 si se ejecuta en local.
 *
 * Ejecutar:  npm start   (o npm run dev, con nodemon)
 * Instalar:  http://localhost:7000/manifest.json  (local)
 *            https://<tu-servicio>.onrender.com/manifest.json  (Render)
 */

// .env primero: src/config.js lee process.env al ser requerido.
require('dotenv').config();

const express = require('express');
const { addonBuilder, getRouter } = require('stremio-addon-sdk');

const manifest = require('./src/manifest');
const config = require('./src/config');
const TtlCache = require('./src/cache');
const { parseSubtitlesId } = require('./src/utils/imdb');
const { getCinemetaMeta } = require('./src/utils/cinemeta');
const { providers, unifySettled } = require('./src/providers');

// Render (y cualquier PaaS) asigna el puerto en process.env.PORT: NUNCA se
// debe hardcodear. En local, si nadie define PORT, usamos 7000 por defecto.
const PORT = Number(process.env.PORT) || 7000;

// Render expone la URL pública en RENDER_EXTERNAL_URL; en local no existe.
const PUBLIC_BASE_URL = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;

/* ------------------------------------------------------------------ *
 *  Builder del addon (publica manifest.json y registra el handler)   *
 * ------------------------------------------------------------------ */
const builder = new addonBuilder(manifest);

// Caché en memoria: Stremio abre el selector de subtítulos a menudo y no
// queremos repetir el scraping completo en cada apertura.
const cache = new TtlCache(config.cacheTtlSeconds);

/* ------------------------------------------------------------------ *
 *  HANDLER DE SUBTÍTULOS — el corazón del addon                       *
 *                                                                      *
 *  Stremio llama con:                                                  *
 *    película:  { type:'movie',  id:'tt0111161' }                      *
 *    serie:     { type:'series', id:'tt0944947:1:3',                   *
 *                extra:{ filename, videoHash, videoSize } }           *
 * ------------------------------------------------------------------ */
async function handleSubtitlesRequest({ type, id, extra = {} } = {}) {
  // ----- 1) Extraer IMDb ID, temporada y episodio -------------------
  const parsed = parseSubtitlesId(id); // 'tt0944947:1:3' -> tt… + S1/E3
  if (!parsed || !['movie', 'series'].includes(type)) {
    return { subtitles: [] };
  }

  const cacheKey = `${type}:${id}`;
  const cached = cache.get(cacheKey);
  if (cached) return { subtitles: cached };

  const startedAt = Date.now();
  let subtitles = [];

  try {
    // Título/año vía Cinemeta: varios sitios buscan por texto, no por tt…
    // (getCinemetaMeta nunca lanza; si falla, los scrapers usan el IMDb).
    const metaInfo = await getCinemetaMeta(type, parsed.imdbId).catch(() => null);

    const query = {
      type,
      imdbId: parsed.imdbId,
      season: parsed.season,     // undefined en películas
      episode: parsed.episode,   // undefined en películas
      title: metaInfo ? metaInfo.title : undefined,
      year: metaInfo ? metaInfo.year : undefined,
      filename: extra.filename,   // p.ej. 'Movie.2024.1080p.WEB-DL.mkv'
      videoHash: extra.videoHash, // hash estilo OpenSubtitles (a futuro)
      videoSize: extra.videoSize
    };

    // ----- 2) TODAS las fuentes EN PARALELO --------------------------
    // Promise.allSettled: esperamos a todas, pero un fallo (timeout,
    // 403, HTML cambiado…) NO tumba la búsqueda — las demás suman.
    const settled = await Promise.allSettled(
      providers.map(async (provider) => {
        const results = await provider.search(query);
        return Array.isArray(results) ? results : [];
      })
    );

    // ----- 3) Filtrar y unificar --------------------------------------
    // - descarta proveedores que rechazaron,
    // - normaliza a EXACTAMENTE { id, url, lang } (ISO 639-2),
    // - deduplica por URL y por id,
    // - ordena: español, inglés y el resto detrás
    //   (con SUBTITLE_LANGUAGES_ONLY=true, el resto se descarta).
    subtitles = unifySettled(settled, providers, {
      preferredLanguages: config.languages, // ['ES', 'EN'] por defecto
      onlyPreferred: config.languagesOnly
    });

    const perProvider = settled
      .map((r, i) => `${providers[i].name}:${r.status === 'fulfilled' ? (r.value?.length || 0) : 'error'}`)
      .join(' ');
    console.log(`[subtitles] ${cacheKey} [${perProvider}] -> ${subtitles.length} unificado(s) en ${Date.now() - startedAt} ms`);
  } catch (err) {
    // Nunca propagues el error a Stremio: { subtitles: [] } es válido.
    console.error(`[subtitles] Error buscando ${cacheKey}:`, err.message);
  }

  cache.set(cacheKey, subtitles);

  // ----- 4) JSON final con la forma que espera Stremio ---------------
  return { subtitles };
}

builder.defineSubtitlesHandler(handleSubtitlesRequest);

const addonInterface = builder.getInterface();

/* ------------------------------------------------------------------ *
 *  5) Servidor HTTP — puerto dinámico (process.env.PORT) o 7000 local  *
 *                                                                      *
 *  Express solo envuelve al router del SDK para poder añadir rutas    *
 *  propias (/health hoy; mañana /download/*.srt descomprimiendo).     *
 *  El SDK sirve él solito /manifest.json y /subtitles/…               *
 *  Escuchamos en 0.0.0.0: Render enruta el tráfico externo al proceso *
 *  solo si el servidor acepta conexiones en todas las interfaces.     *
 * ------------------------------------------------------------------ */
function createApp() {
  const app = express();

  app.use(getRouter(addonInterface));

  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      addon: addonInterface.manifest.id,
      providers: providers.map((p) => p.name)
    });
  });

  app.get('/', (req, res) => {
    res.type('text/plain').send(
      `${addonInterface.manifest.name} — instala en Stremio la URL que termina en /manifest.json`
    );
  });

  return app;
}

const app = createApp();

// Solo escuchamos cuando este archivo es el programa principal
// (así los tests pueden require('./index') sin arrancar el servidor).
if (require.main === module) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`${addonInterface.manifest.name} escuchando en 0.0.0.0:${PORT}`);
    console.log(`Instala en Stremio: ${PUBLIC_BASE_URL}/manifest.json`);
    console.log(`Health check:      ${PUBLIC_BASE_URL}/health`);
    console.log(`Fuentes activas:   ${providers.map((p) => p.name).join(', ')}`);
  });
}

module.exports = { app, addonInterface, handleSubtitlesRequest };
