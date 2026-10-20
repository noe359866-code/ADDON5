'use strict';

const { addonBuilder } = require('stremio-addon-sdk');
const manifest = require('./manifest');
const config = require('./config');
const TtlCache = require('./cache');
const { parseSubtitlesId } = require('./utils/imdb');
const { searchAll } = require('./providers');

const builder = new addonBuilder(manifest);
const cache = new TtlCache(config.cacheTtlSeconds);

// Stremio llamará a GET /subtitles/{type}/{id}.json
//   película: /subtitles/movie/tt0111161.json
//   serie:    /subtitles/series/tt0944947:1:3.json   (id codificado en la URL)
// "extra" puede traer filename / videoHash / videoSize del stream elegido,
// útiles a futuro para puntuar qué subtítulo sincroniza mejor.
builder.defineSubtitlesHandler(async ({ type, id, extra = {} }) => {
  const parsed = parseSubtitlesId(id);
  if (!parsed || !['movie', 'series'].includes(type)) {
    return { subtitles: [] };
  }

  const cacheKey = `${type}:${id}`;
  const cached = cache.get(cacheKey);
  if (cached) return { subtitles: cached };

  let subtitles = [];
  try {
    subtitles = await searchAll({
      type,
      imdbId: parsed.imdbId,
      season: parsed.season,
      episode: parsed.episode,
      filename: extra.filename,
      videoHash: extra.videoHash,
      videoSize: extra.videoSize
    });
  } catch (err) {
    // Nunca propagues el error a Stremio: un [] es una respuesta válida.
    console.error(`[subtitles] Error buscando ${cacheKey}:`, err.message);
  }

  cache.set(cacheKey, subtitles);
  console.log(`[subtitles] ${cacheKey} -> ${subtitles.length} subtítulo(s)`);
  return { subtitles };
});

module.exports = builder.getInterface();
