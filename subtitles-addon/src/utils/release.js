'use strict';

// Utilidades sobre nombres de "release" (Game.of.Thrones.S01E05.720p...)
// y sobre títulos (para construir slugs de URL).

/**
 * Extrae temporada/episodio de un release.
 * Acepta S01E05, S1E5, 1x05, "Season 1 Episode 5" y un "E05" suelto.
 * Devuelve { season?, episode? } o null si no hay nada reconocible.
 */
function parseSeasonEpisode(text) {
  if (!text || typeof text !== 'string') return null;

  let m = text.match(/\bS(\d{1,2})[\s._-]*E(\d{1,3})\b/i);
  if (m) return { season: Number(m[1]), episode: Number(m[2]) };

  m = text.match(/\bSeason[\s._-]*(\d{1,2})\b[^a-z0-9]{0,12}\bEpisode[\s._-]*(\d{1,3})\b/i);
  if (m) return { season: Number(m[1]), episode: Number(m[2]) };

  m = text.match(/\b(\d{1,2})x(\d{1,3})\b/);
  if (m) return { season: Number(m[1]), episode: Number(m[2]) };

  m = text.match(/\bS(\d{1,2})\b/i);
  let seasonOnly = m ? Number(m[1]) : undefined;
  if (seasonOnly === undefined) {
    // "Season1" / "Season 1" / "Season.1" sin episodio (packs de temporada)
    m = text.match(/\bSeason[\s._-]*(\d{1,2})\b/i);
    if (m) seasonOnly = Number(m[1]);
  }
  m = text.match(/\bE(\d{1,3})\b/i);
  const episodeOnly = m ? Number(m[1]) : undefined;
  if (seasonOnly !== undefined || episodeOnly !== undefined) {
    return { season: seasonOnly, episode: episodeOnly };
  }
  return null;
}

function isSeasonPack(text) {
  if (!text) return false;
  if (/\b(complete|full[\s._-]*season|season[\s._-]*pack|pack)\b/i.test(text)) return true;
  // "S01" o "Season 1" sin episodio suele ser el pack de temporada.
  const parsed = parseSeasonEpisode(text);
  return Boolean(parsed && parsed.season !== undefined && parsed.episode === undefined);
}

/**
 * Clasifica un release frente al episodio pedido:
 *  'episode'  -> coincide S/E exactos (o no se pidió episodio)
 *  'pack'     -> pack de temporada (contiene el episodio, pero es un .zip)
 *  'unknown'  -> no se puede deducir (no lo descartamos de entrada)
 *  'mismatch' -> es de OTRO episodio/temporada: descartar
 */
function classifyRelease(release, season, episode) {
  if (episode === undefined) return 'episode';
  const parsed = parseSeasonEpisode(release || '');
  if (parsed && parsed.episode !== undefined) {
    if (season !== undefined && parsed.season !== undefined && parsed.season !== season) return 'mismatch';
    return parsed.episode === episode ? 'episode' : 'mismatch';
  }
  if (isSeasonPack(release)) {
    if (parsed && parsed.season !== undefined && season !== undefined && parsed.season !== season) return 'mismatch';
    return 'pack';
  }
  return 'unknown';
}

/** "Marvel's Agents of S.H.I.E.L.D." -> "marvels-agents-of-s-h-i-e-l-d" (aprox. de los slugs de estos sitios) */
function slugifyTitle(title) {
  if (!title || typeof title !== 'string') return '';
  return title
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // quita diacríticos
    .toLowerCase()
    .replace(/['’ʼ]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function normalizeTitle(title) {
  return slugifyTitle(title).replace(/-/g, ' ');
}

function cleanText(text) {
  return typeof text === 'string' ? text.replace(/\s+/g, ' ').trim() : '';
}

module.exports = {
  parseSeasonEpisode,
  isSeasonPack,
  classifyRelease,
  slugifyTitle,
  normalizeTitle,
  cleanText
};
