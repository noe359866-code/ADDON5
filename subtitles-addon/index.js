'use strict';

/**
 * index.js — ARCHIVO PRINCIPAL del addon de subtítulos para Stremio.
 *
 * Une todos los módulos de scraping creados (SubDL, SubSource, Subscene,
 * YTS-Subs, JustSubtitles e IndexSubtitle, en src/providers/) detrás del
 * único recurso que Stremio nos pide: "subtitles".
 *
 * Flujo de una petición  GET /subtitles/{type}/{id}.json
 *   1. defineSubtitlesHandler extrae el ID (IMDb tt… o anime kitsu:/mal:).
 *   2. Se resuelve el IMDb equivalente y el título/año (Cinemeta/Kitsu).
 *   3. Se lanzan TODOS los proveedores EN PARALELO con un presupuesto de
 *      tiempo global: si uno tarda, respondemos con lo que ya haya. Stremio
 *      abandona las peticiones lentas, y un timeout se ve como "no hay
 *      subtítulos".
 *   4. Se unifican resultados: {id,url,lang}, sin duplicados y ordenados por
 *      idioma (español, inglés y después el resto).
 *   5. Cada URL se reescribe a /sub/{token}.srt (proxy propio) para que el
 *      reproductor reciba un SRT en UTF-8 aunque el sitio entregue un .zip,
 *      exija Referer o no mande CORS.
 *   6. El servidor HTTP escucha en process.env.PORT (Render lo asigna
 *      dinámicamente) o en 7000 en local.
 *
 * Ejecutar:  npm start   (o npm run dev, con nodemon)
 * Instalar:  http://localhost:7000/manifest.json  (local)
 *            https://<tu-servicio>.onrender.com/manifest.json  (Render)
 * Diagnóstico: GET /selftest?id=tt0111161&type=movie
 */

// .env primero: src/config.js lee process.env al ser requerido.
require('dotenv').config();

const express = require('express');
const { addonBuilder, getRouter } = require('stremio-addon-sdk');

const manifest = require('./src/manifest');
const config = require('./src/config');
const { context, languages, parsePreferences } = require('./src/preferences');

function requestKey(type, id, extra = {}) {
  return JSON.stringify([type, id, config.languages, config.languagesOnly, extra.filename || '', extra.videoHash || '', extra.videoSize || '']);
}
const TtlCache = require('./src/cache');
const { parseMediaId, resolveAnimeImdb, getKitsuMeta, getAnimeIndex } = require('./src/utils/mediaId');
const { getCinemetaMeta } = require('./src/utils/cinemeta');
const { providers, unifySettled } = require('./src/providers');
const { buildProxyUrl, createProxyRouter, canProxy } = require('./src/proxy');

// Render (y cualquier PaaS) asigna el puerto en process.env.PORT: NUNCA se
// debe hardcodear. En local, si nadie define PORT, usamos 7000 por defecto.
const PORT = Number(process.env.PORT) || 7000;

// Render expone la URL pública en RENDER_EXTERNAL_URL; en local no existe.
const PUBLIC_BASE_URL = config.publicBaseUrl || `http://localhost:${PORT}`;

const MEDIA_TYPES = new Set(['movie', 'series']);

/* ------------------------------------------------------------------ *\
 *  Utilidades de tiempo                                              *
\* ------------------------------------------------------------------ */

function remainingMs(deadlineAt) {
  return Math.max(0, deadlineAt - Date.now());
}

/** Promesa que se resuelve con `fallback` si tarda más de `ms`. */
function withTimeout(promise, ms, fallback = null) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(fallback), Math.max(0, ms));
    Promise.resolve(promise).then(
      (value) => { clearTimeout(timer); resolve(value); },
      () => { clearTimeout(timer); resolve(fallback); }
    );
  });
}

/**
 * Equivalente a Promise.allSettled pero con fecha límite: las promesas que
 * siguen pendientes al agotarse el presupuesto se marcan como rechazadas por
 * timeout. Así el handler SIEMPRE responde a tiempo.
 */
function settleWithDeadline(promises, deadlineAt) {
  return Promise.all(promises.map((promise) => new Promise((resolve) => {
    let settled = false;
    const finish = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(result);
    };
    const timer = setTimeout(
      () => finish({ status: 'rejected', reason: new Error('Tiempo agotado') }),
      remainingMs(deadlineAt)
    );
    Promise.resolve(promise).then(
      (value) => finish({ status: 'fulfilled', value }),
      (reason) => finish({ status: 'rejected', reason })
    );
  })));
}

/* ------------------------------------------------------------------ *\
 *  Builder del addon (publica manifest.json y registra el handler)   *
\* ------------------------------------------------------------------ */
const builder = new addonBuilder(manifest);

// Caché en memoria: Stremio abre el selector de subtítulos a menudo y no
// queremos repetir el scraping completo en cada apertura.
const cache = new TtlCache(config.cacheTtlSeconds);

// Peticiones simultáneas del mismo título comparten una sola búsqueda.
const inFlight = new Map();

/* ------------------------------------------------------------------ *\
 *  Resolución del ID y de los metadatos                              *
\* ------------------------------------------------------------------ */

/**
 * Convierte lo que envía Stremio en una consulta para los proveedores.
 * Acepta IMDb (tt…) y anime (kitsu:/mal:/anidb:) resolviendo el tt… real.
 * @returns {Promise<null|{type:string,imdbId:string,season?:number,episode?:number,
 *   title?:string,year?:number,anime:boolean}>}
 */
async function resolveQuery(type, id, deadlineAt, logger = console) {
  const parsed = parseMediaId(id);
  if (!parsed) return null;

  let imdbId = parsed.imdbId || null;
  let anime = parsed.namespace !== 'tt';

  if (!imdbId) {
    const budget = Math.min(2500, Math.max(800, remainingMs(deadlineAt) - 1500));
    imdbId = await resolveAnimeImdb(parsed.namespace, parsed.externalId, budget);
    if (!imdbId) {
      logger.warn(`[subtitles] No se pudo mapear ${parsed.namespace}:${parsed.externalId} a IMDb (¿índice de anime no disponible?)`);
      return null;
    }
  }

  // Los scrapers buscan por TEXTO: sin título, varios no encuentran nada.
  let meta = null;
  if (!anime) {
    meta = await withTimeout(
      getCinemetaMeta(type, imdbId).catch(() => null),
      Math.min(config.cinemetaTimeoutMs, Math.max(500, remainingMs(deadlineAt) - 2000))
    );
  } else {
    meta = await withTimeout(
      getCinemetaMeta(type, imdbId).catch(() => null),
      Math.min(config.cinemetaTimeoutMs, Math.max(500, remainingMs(deadlineAt) - 2500))
    );
    if (!meta) {
      meta = await withTimeout(getKitsuMeta(parsed.externalId), 2500);
    }
  }

  return {
    type,
    imdbId,
    season: parsed.season,
    episode: parsed.episode,
    title: meta ? meta.title : undefined,
    year: meta ? meta.year : undefined,
    anime
  };
}

/* ------------------------------------------------------------------ *\
 *  Búsqueda en proveedores con presupuesto de tiempo                 *
\* ------------------------------------------------------------------ */

/**
 * Lanza todos los proveedores en paralelo y devuelve sus resultados ya
 * normalizados, sin pasarse nunca de `deadlineAt`.
 * @returns {Promise<{subtitles:Array, detailed:Array}>}
 */
async function runProviders(query, deadlineAt, options = {}) {
  const preferredLanguages = options.preferredLanguages || config.languages;
  const onlyPreferred = options.onlyPreferred !== undefined ? options.onlyPreferred : config.languagesOnly;
  const providerList = options.providers || providers;
  const startedAt = Date.now();

  const settled = await settleWithDeadline(
    providerList.map((provider) => {
      try {
        return provider.search(query);
      } catch (err) {
        return Promise.reject(err);
      }
    }),
    deadlineAt
  );

  const detailed = settled.map((result, i) => {
    const name = providerList[i] && providerList[i].name ? providerList[i].name : `provider-${i}`;
    if (result.status === 'rejected') {
      return { name, ok: false, count: 0, error: result.reason ? result.reason.message : 'error' };
    }
    const items = Array.isArray(result.value) ? result.value : [];
    return { name, ok: true, count: items.length, error: null };
  });

  // Reescribimos cada enlace a nuestro proxy ANTES de unificar, para poder
  // firmar también el release/temporada/episodio (sirven para elegir el
  // archivo correcto dentro de un .zip de temporada).
  const proxied = settled.map((result) => {
    if (result.status !== 'fulfilled') return result;
    const items = Array.isArray(result.value) ? result.value : [];
    return {
      status: 'fulfilled',
      value: items.map((item) => {
        if (!item || typeof item.url !== 'string') return item;
        const enriched = {
          ...item,
          season: item.season !== undefined ? item.season : query.season,
          episode: item.episode !== undefined ? item.episode : query.episode
        };
        return { ...enriched, url: buildProxyUrl(enriched) };
      })
    };
  });

  const subtitles = unifySettled(proxied, providerList, {
    preferredLanguages,
    onlyPreferred
  });

  return {
    subtitles,
    detailed,
    elapsedMs: Date.now() - startedAt
  };
}

/* ------------------------------------------------------------------ *\
 *  HANDLER DE SUBTÍTULOS — el corazón del addon                       *
 *                                                                     *
 *  Stremio llama con:                                                 *
 *    película:  { type:'movie',  id:'tt0111161' }                     *
 *    serie:     { type:'series', id:'tt0944947:1:3',                  *
 *                extra:{ filename, videoHash, videoSize } }           *
 *    anime:     { type:'series', id:'kitsu:1234:5' }                  *
\* ------------------------------------------------------------------ */
async function computeSubtitles({ type, id, extra = {} } = {}) {
  // ----- 1) ID válido y tipo soportado ------------------------------
  const parsed = parseMediaId(id);
  if (!parsed || !MEDIA_TYPES.has(type)) {
    return { subtitles: [] };
  }

  const cacheKey = requestKey(type, id, extra);
  const cached = cache.get(cacheKey);
  if (cached) return { subtitles: cached };

  const startedAt = Date.now();
  const deadlineAt = startedAt + config.handlerDeadlineMs;
  let subtitles = [];
  let detailed = [];

  try {
    // ----- 2) IMDb + título/año (Cinemeta o Kitsu) -----------------
    const query = await resolveQuery(type, id, deadlineAt);
    if (!query) {
      console.warn(`[subtitles] ${cacheKey}: sin IMDb equivalente, no se puede buscar`);
      return { subtitles: [] };
    }
    if (extra && typeof extra.filename === 'string') query.filename = extra.filename;
    if (extra && extra.videoHash) query.videoHash = extra.videoHash;
    if (extra && extra.videoSize) query.videoSize = extra.videoSize;

    // ----- 3) TODAS las fuentes EN PARALELO, con deadline ----------
    // Si un proveedor se cuelga, no bloquea a los demás ni a Stremio.
    const result = await runProviders(query, deadlineAt);
    subtitles = result.subtitles;
    detailed = result.detailed;

    const perProvider = detailed
      .map((r) => `${r.name}:${r.ok ? r.count : 'error'}`)
      .join(' ');
    console.log(`[subtitles] ${cacheKey} [${perProvider}] -> ${subtitles.length} unificado(s) en ${Date.now() - startedAt} ms`);
  } catch (err) {
    // Nunca propagues el error a Stremio: { subtitles: [] } es válido.
    console.error(`[subtitles] Error buscando ${cacheKey}:`, err.message);
  }

  // IMPORTANTE: no cachear listas vacías. Un fallo puntual (Render despertando,
  // Cloudflare, timeout) envenenaría el addon durante 6 horas: el usuario
  // abriría el menú una y otra vez y siempre vería "ningún subtítulo".
  if (subtitles.length) cache.set(cacheKey, subtitles);

  // ----- 4) JSON final con la forma que espera Stremio ---------------
  return { subtitles, _detailed: detailed };
}

async function handleSubtitlesRequest(params = {}) {
  const { type, id } = params;
  const parsed = parseMediaId(id);
  if (!parsed || !MEDIA_TYPES.has(type)) return { subtitles: [] };

  const key = requestKey(type, id, params.extra);
  if (inFlight.has(key)) return inFlight.get(key);

  const promise = computeSubtitles(params)
    .then(({ subtitles }) => ({ subtitles }))
    .catch((err) => {
      console.error(`[subtitles] ${key}:`, err.message);
      return { subtitles: [] };
    })
    .finally(() => inFlight.delete(key));

  inFlight.set(key, promise);
  return promise;
}

builder.defineSubtitlesHandler(handleSubtitlesRequest);

const addonInterface = builder.getInterface();

/* ------------------------------------------------------------------ *\
 *  5) Servidor HTTP — puerto dinámico (process.env.PORT) o 7000 local  *
 *                                                                     *
 *  Express envuelve al router del SDK para poder añadir rutas propias:*
 *  /sub/{token}.srt (proxy de descargas), /selftest y /health.        *
 *  El SDK sirve él solito /manifest.json y /subtitles/…               *
 *  Escuchamos en 0.0.0.0: Render enruta el tráfico externo al proceso *
 *  solo si el servidor acepta conexiones en todas las interfaces.     *
\* ------------------------------------------------------------------ */
function createApp() {
  const app = express();

  // El proxy va ANTES del router del SDK (rutas /sub/* propias).
  app.use(createProxyRouter());

  // Marca y página de instalación propias, antes del router del SDK.
  app.use('/assets', express.static(require('node:path').join(__dirname, 'public')));
  app.get(['/', '/configure', '/:preferences/configure'], (req, res) => {
    res.sendFile(require('node:path').join(__dirname, 'public', 'index.html'));
  });
  app.get('/api/languages', (req, res) => res.json({ languages, defaults: { languages: config.languages, languagesOnly: config.languagesOnly } }));
  app.get(['/manifest.json', '/:preferences/manifest.json'], (req, res) => {
    if (req.params.preferences) {
      try { parsePreferences(req.params.preferences); }
      catch (error) { return res.status(400).json({ error: error.message }); }
    }
    const host = String(req.get('host') || 'localhost');
    const protocol = req.get('x-forwarded-proto') === 'https' ? 'https' : req.protocol;
    const base = config.publicBaseUrl || (/^[a-z0-9.:[\]-]+$/i.test(host) ? `${protocol}://${host}` : PUBLIC_BASE_URL);
    res.set('Access-Control-Allow-Origin', '*');
    res.json({ ...addonInterface.manifest, logo: `${base.replace(/\/$/, '')}/assets/logo.png` });
  });

  // Each installation carries its own preferences; no global mutations.
  app.get(['/:preferences/subtitles/:type/:id.json', '/:preferences/subtitles/:type/:id/:extra.json'], async (req, res) => {
    res.set('Access-Control-Allow-Origin', '*');
    let preferences;
    try { preferences = parsePreferences(req.params.preferences); }
    catch (error) { return res.status(400).json({ error: error.message }); }
    const extra = Object.fromEntries(new URLSearchParams(req.params.extra || req.url.split('?')[1] || ''));
    const result = await context.run(preferences, () => handleSubtitlesRequest({ type: req.params.type, id: req.params.id, extra }));
    res.set('Cache-Control', 'no-store').json(result);
  });

  app.use(getRouter(addonInterface));

  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      addon: addonInterface.manifest.id,
      version: addonInterface.manifest.version,
      publicBaseUrl: PUBLIC_BASE_URL,
      proxy: canProxy(),
      anime: config.animeMappingEnabled,
      handlerDeadlineMs: config.handlerDeadlineMs,
      providers: providers.map((p) => p.name)
    });
  });

  /**
   * Diagnóstico: ejecuta los proveedores de verdad (sin caché) y devuelve
   * cuántos subtítulos aporta cada uno y cuánto tarda. Es la forma rápida de
   * saber POR QUÉ el menú de Stremio está vacío.
   *
   *   /selftest?id=tt0111161&type=movie
   *   /selftest?id=tt0944947:1:3&type=series
   */
  app.get('/selftest', async (req, res) => {
    const type = req.query.type === 'series' ? 'series' : 'movie';
    const id = String(req.query.id || req.query.imdb || 'tt0111161').trim();
    const startedAt = Date.now();
    const deadlineAt = startedAt + Math.max(config.handlerDeadlineMs, 15000);

    const logs = [];
    const logger = { warn: (msg) => logs.push(msg), error: (msg) => logs.push(msg) };
    const query = await resolveQuery(type, id, deadlineAt, logger).catch(() => null);
    if (!query) {
      return res.status(400).json({
        ok: false,
        id,
        type,
        error: 'ID no reconocido o anime sin mapeo a IMDb',
        logs
      });
    }

    const result = await runProviders(query, deadlineAt, { onlyPreferred: false });
    res.json({
      ok: result.subtitles.length > 0,
      id,
      type,
      query,
      elapsedMs: Date.now() - startedAt,
      total: result.subtitles.length,
      providers: result.detailed,
      sample: result.subtitles.slice(0, 10),
      logs
    });
  });

  return app;
}

const app = createApp();

// Solo escuchamos cuando este archivo es el programa principal
// (así los tests pueden require('./index') sin arrancar el servidor).
if (require.main === module) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`${addonInterface.manifest.name} v${addonInterface.manifest.version} escuchando en 0.0.0.0:${PORT}`);
    console.log(`Instala en Stremio: ${PUBLIC_BASE_URL}/manifest.json`);
    console.log(`Health check:      ${PUBLIC_BASE_URL}/health`);
    console.log(`Diagnóstico:       ${PUBLIC_BASE_URL}/selftest?id=tt0111161&type=movie`);
    console.log(`Proxy de descargas: ${canProxy() ? 'activo' : 'desactivado (define PUBLIC_BASE_URL/RENDER_EXTERNAL_URL)'}`);
    console.log(`Fuentes activas:   ${providers.map((p) => p.name).join(', ')}`);

    // Precalentamos el índice de anime en segundo plano: la primera petición
    // con un ID kitsu:/mal: no debería esperar a descargar ~6 MB.
    if (config.animeMappingEnabled) {
      getAnimeIndex().catch(() => {});
    }
  });
}

module.exports = {
  app,
  addonInterface,
  handleSubtitlesRequest,
  resolveQuery,
  runProviders,
  settleWithDeadline,
  withTimeout
};
