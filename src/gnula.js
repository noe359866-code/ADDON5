/**
 * src/gnula.js — Lectura de Gnula: búsqueda, fichas y reproductores.
 *
 * Gnula es un WordPress. Cada película vive en `/movie/<slug>/` y su ficha
 * agrupa los reproductores en pestañas (`<div id="tab1">…`) con un iframe
 * por pestaña. Cada grupo de pestañas corresponde a un idioma, que aparece
 * en la ficha como «opción 1, Latino, HD».
 *
 * El sitio hermano de series usa la misma plantilla de pestañas, pero en la
 * cabecera solo pone los idiomas con su número de servidores («Latino 8
 * Castellano 18 Sub Español 8»), así que ahí el idioma se asigna por orden
 * de grupo.
 *
 * Este módulo NO resuelve el video final: solo devuelve qué reproductores
 * (URLs de embed) hay que abrir. Eso lo hace src/players/.
 */

import { config } from './config.js';
import { request, safeDecodeEntities } from './http.js';
import { pageCache } from './cache.js';
import {
  ARTICLES,
  compact,
  extractYear,
  normalize,
  slugify,
  stripTags,
  titleSimilarity
} from './utils/text.js';

/* ------------------------------------------------------------------ *
 *  Utilidades de HTML
 * ------------------------------------------------------------------ */

export function attrValue(attrs, name) {
  const re = new RegExp(`(?:^|\\s)${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s"'>]+))`, 'i');
  const match = re.exec(attrs || '');
  if (!match) return '';
  return safeDecodeEntities(match[2] ?? match[3] ?? match[4] ?? '').trim();
}

export function hostOf(url) {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return '';
  }
}

export function isHttpUrl(value) {
  return /^https?:\/\/[^\s]+$/i.test(String(value == null ? '' : value).trim());
}

/** iframes de publicidad, tráilers y widgets sociales que nunca son video. */
const SKIPPED_HOST_PATTERNS = [
  /(^|\.)youtube\.com$/i,
  /(^|\.)youtu\.be$/i,
  /(^|\.)youtube-nocookie\.com$/i,
  /(^|\.)google\.com$/i,
  /(^|\.)googleapis\.com$/i,
  /(^|\.)gstatic\.com$/i,
  /(^|\.)googlesyndication\.com$/i,
  /(^|\.)doubleclick\.net$/i,
  /(^|\.)googleadservices\.com$/i,
  /(^|\.)facebook\.com$/i,
  /(^|\.)fbcdn\.net$/i,
  /(^|\.)twitter\.com$/i,
  /(^|\.)x\.com$/i,
  /(^|\.)instagram\.com$/i,
  /(^|\.)disqus\.com$/i,
  /(^|\.)cloudflare\.com$/i,
  /(^|\.)recaptcha\.net$/i,
  /(^|\.)hcaptcha\.com$/i,
  /(^|\.)whatsapp\.com$/i,
  /(^|\.)telegram\.me$/i,
  /(^|\.)t\.me$/i,
  /(^|\.)stremio\.com$/i,
  /(^|\.)tmdb\.org$/i,
  /(^|\.)imdb\.com$/i
];

export function isSkippedEmbed(url) {
  const host = hostOf(url);
  if (!host) return true;
  return SKIPPED_HOST_PATTERNS.some((pattern) => pattern.test(host));
}

/* ------------------------------------------------------------------ *
 *  Títulos de las tarjetas
 * ------------------------------------------------------------------ */

/** «Ver Jay Kelly (2025) online - Drama [HD]» → { title, year } */
export function parseCardTitle(raw) {
  let text = safeDecodeEntities(String(raw == null ? '' : raw)).replace(/\s+/g, ' ').trim();
  if (!text) return { title: '', year: '' };

  text = text.replace(/^ver\s+/i, '').replace(/\s+online\s*$/i, '').trim();

  const withYear = /^(.*?)\s*\(((?:19|20)\d{2})\)/.exec(text);
  if (withYear) {
    return {
      title: cleanCardTitle(withYear[1]),
      year: withYear[2]
    };
  }

  const year = extractYear(text);
  const withoutGenre = text.split(/\s+[-–—]\s+/)[0];
  return { title: cleanCardTitle(withoutGenre), year };
}

function cleanCardTitle(text) {
  return String(text == null ? '' : text)
    .replace(/\[[^\]]*\]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^[\s:–—-]+|[\s:–—-]+$/g, '')
    .slice(0, 200);
}

/**
 * Tarjetas de resultado: `<a href="…/movie/<slug>/"><img alt="…" title="…">`.
 * Se acepta cualquier subdominio de gnula porque el sitio rota (www2, www3…).
 */
export function parseSearchResults(html, { site = config.gnulaBaseUrl, section = 'movie' } = {}) {
  const baseHost = hostOf(site);
  const domain = baseHost.replace(/^www\d*\./i, '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(
    `<a\\b([^>]*\\bhref\\s*=\\s*["'](https?:\\/\\/(?:www\\d*\\.)?${domain}\\/${section}\\/([^"'\\/?#]+)\\/)["'][^>]*)>([\\s\\S]{0,600}?)<\\/a>`,
    'gi'
  );

  const results = [];
  const seen = new Set();
  let match;
  while ((match = re.exec(html))) {
    const url = match[2];
    const slug = safeDecodeEntities(match[3]);
    if (seen.has(slug)) continue;

    const inner = match[4];
    const img = /<img\b([^>]*)>/i.exec(inner);
    const attrs = img ? img[1] : '';
    const alt = attrValue(attrs, 'alt');
    const titleAttr = attrValue(attrs, 'title');
    const anchorTitle = attrValue(match[1], 'title');
    const anchorText = stripTags(inner);
    const raw = titleAttr || anchorTitle || alt || anchorText;

    const parsed = parseCardTitle(raw);
    if (!parsed.title) continue;

    seen.add(slug);
    results.push({
      slug,
      url,
      title: parsed.title,
      year: parsed.year || extractYear(alt) || extractYear(anchorText),
      raw
    });
  }

  return results;
}

/* ------------------------------------------------------------------ *
 *  Elección de la ficha correcta
 * ------------------------------------------------------------------ */

export const MIN_SCORE = 0.62;

export function scoreCandidate(candidate, titles, year) {
  let best = 0;
  for (const title of titles) {
    if (!title) continue;
    const score = titleSimilarity(title, candidate.title);
    if (score > best) best = score;
    // El slug del sitio suele ser exactamente el título: refuerza el acierto.
    if (candidate.slug && slugify(title) === candidate.slug) best = Math.max(best, 0.95);
  }

  if (year && candidate.year) {
    if (String(year) === String(candidate.year)) best += 0.08;
    else if (Math.abs(Number(year) - Number(candidate.year)) >= 2) best -= 0.25;
  }

  return Math.max(0, Math.min(1, best));
}

export function rankCandidates(candidates, titles, year) {
  return candidates
    .map((candidate) => ({ ...candidate, score: scoreCandidate(candidate, titles, year) }))
    .filter((candidate) => candidate.score >= MIN_SCORE)
    .sort((a, b) => b.score - a.score);
}

/* ------------------------------------------------------------------ *
 *  Idiomas
 * ------------------------------------------------------------------ */

const LANGUAGE_PATTERNS = [
  [/\bsub\s*espa[ñn]ol\b/i, 'Sub Español'],
  [/\bsubtitulad[oa]s?\b/i, 'Subtitulado'],
  [/\bsubt[ií]tulos\b/i, 'Subtitulado'],
  [/\blatino\b/i, 'Latino'],
  [/\bcastellano\b/i, 'Castellano'],
  [/\bespa[ñn]ol\b/i, 'Español']
];

export function canonicalLanguage(text) {
  const value = String(text == null ? '' : text);
  for (const [pattern, label] of LANGUAGE_PATTERNS) {
    if (pattern.test(value)) return label;
  }
  return '';
}

/** Marcadores «opción 1, Latino, HD» de las fichas de película. */
export function languageMarkers(html) {
  const markers = [];
  const re = /opci[oó]n\s*\d+\s*[,:]\s*([A-Za-zÁÉÍÓÚÜÑáéíóúüñ ]{3,28})/gi;
  let match;
  while ((match = re.exec(html))) {
    const language = canonicalLanguage(match[1]);
    if (language) markers.push({ pos: match.index, language });
  }
  return markers;
}

/** Cabecera «Latino 8 Castellano 18 Sub Español 8» del sitio de series. */
export function languageCounters(html) {
  const found = [];
  const re = /(latino|castellano|sub\s*espa[ñn]ol|espa[ñn]ol|subtitulad[oa]s?)\s*(\d{1,3})/gi;
  let match;
  while ((match = re.exec(html))) {
    const language = canonicalLanguage(match[1]);
    if (!language) continue;
    found.push({ pos: match.index, language, count: Number.parseInt(match[2], 10) });
  }
  return found;
}

/* ------------------------------------------------------------------ *
 *  Pestañas y reproductores
 * ------------------------------------------------------------------ */

function findTabBlocks(html) {
  const matches = [...html.matchAll(/<div\b[^>]*\bid\s*=\s*["']?(tab\d+)["']?[^>]*>/gi)];
  return matches.map((match, index) => {
    const start = match.index;
    const next = index + 1 < matches.length ? matches[index + 1].index : html.length;
    const end = Math.min(next, start + 6000);
    return { id: match[1].toLowerCase(), start, chunk: html.slice(start, end) };
  });
}

function tabLabels(html) {
  const labels = new Map();
  const re = /<a\b[^>]*\bhref\s*=\s*["']#(tab\d+)["'][^>]*>([\s\S]{0,200}?)<\/a>/gi;
  let match;
  while ((match = re.exec(html))) {
    const id = match[1].toLowerCase();
    if (!labels.has(id)) labels.set(id, stripTags(match[2]).slice(0, 60));
  }
  return labels;
}

/** URL del reproductor dentro del trozo de una pestaña. */
function embedInChunk(chunk) {
  const iframes = [...chunk.matchAll(/<iframe\b([^>]*)>/gi)];
  for (const iframe of iframes) {
    const attrs = iframe[1];
    for (const name of ['data-lazy-src', 'data-src', 'data-original', 'data-url', 'src']) {
      const value = attrValue(attrs, name);
      if (isHttpUrl(value)) return { url: value, kind: 'iframe' };
    }
  }

  const goToPlayer = /go_to_player\(\s*['"]([^'"]+)['"]/i.exec(chunk);
  if (goToPlayer && isHttpUrl(goToPlayer[1])) {
    return { url: safeDecodeEntities(goToPlayer[1]), kind: 'player' };
  }

  const direct = /<(?:a|source|video)\b[^>]*\b(?:href|src)\s*=\s*["']([^"']+\.(?:mp4|mkv|m3u8|mpd)(?:\?[^"']*)?)["']/i.exec(chunk);
  if (direct && isHttpUrl(direct[1])) {
    return { url: safeDecodeEntities(direct[1]), kind: 'direct' };
  }

  return null;
}

function directVideoIn(html) {
  const re = /<(?:a|source|video)\b[^>]*\b(?:href|src)\s*=\s*["']([^"']+\.(?:mp4|mkv|m3u8|mpd)(?:\?[^"']*)?)["']/gi;
  const out = [];
  let match;
  while ((match = re.exec(html)) && out.length < 4) {
    const url = safeDecodeEntities(match[1]);
    if (isHttpUrl(url) && !isSkippedEmbed(url)) out.push(url);
  }
  return out;
}

const PLAYER_PRIORITY = [
  'uqload.com',
  'uqload.to',
  'voe.sx',
  'ashleyhardat.com',
  'filemoon.sx',
  'filemoon.to',
  'filemoon.in',
  'streamwish.to',
  'hlswish.com',
  'vidhidevip.com',
  'streamtape.com',
  'doodstream.com',
  'dood.pm',
  'mixdrop.ch',
  'upstream.to',
  'streamhub.to',
  'player.cuevana.ac',
  'links.cuevana.ac',
  'viewsb.com',
  'jawcloud.co',
  'vidaraa.cc',
  'vidara.to',
  'byse.sx',
  'savefiles.com'
];

export function embedPriority(url) {
  // El resolvedor del propio sitio va primero: es el que mejor responde.
  if (/\/panel\/(?:vidara|the-tube)-resolve\.php/i.test(url)) return 0;
  const host = hostOf(url);
  const index = PLAYER_PRIORITY.indexOf(host);
  if (index >= 0) return index;
  // Agregadores: hay que entrar y volver a elegir, así que van detrás.
  if (/cuevana|pelisplushd|2embed|moovies/i.test(host)) return 60;
  return 40;
}

const HOST_LABELS = {
  'voe.sx': 'Voe',
  'filemoon.sx': 'Filemoon',
  'filemoon.to': 'Filemoon',
  'filemoon.in': 'Filemoon',
  'streamwish.to': 'StreamWish',
  'hlswish.com': 'StreamWish',
  'vidhidevip.com': 'VidHide',
  'streamtape.com': 'Streamtape',
  'doodstream.com': 'Doodstream',
  'dood.pm': 'Doodstream',
  'mixdrop.ch': 'Mixdrop',
  'upstream.to': 'Upstream',
  'streamhub.to': 'StreamHub',
  'player.cuevana.ac': 'Cuevana',
  'links.cuevana.ac': 'Cuevana',
  'goodstream.one': 'GoodStream',
  'uqload.com': 'Uqload',
  'uqload.to': 'Uqload',
  'viewsb.com': 'ViewSB',
  'jawcloud.co': 'Jawcloud',
  'vidaraa.cc': 'Vidara',
  'vidara.to': 'Vidara',
  'byse.sx': 'Byse',
  'savefiles.com': 'SaveFiles',
  'ashleyhardat.com': 'Voe'
};

export function hostLabel(url) {
  const host = hostOf(url);
  if (HOST_LABELS[host]) return HOST_LABELS[host];
  const first = host.split('.')[0] || 'Servidor';
  return first.charAt(0).toUpperCase() + first.slice(1);
}

function groupByLabelRestart(tabs, labels) {
  const groups = [];
  let current = null;
  let seen = new Set();

  for (const tab of tabs) {
    const label = (labels.get(tab.id) || '').toLowerCase();
    if (!current || (label && seen.has(label))) {
      current = { tabs: [], start: tab.start };
      groups.push(current);
      seen = new Set();
    }
    if (label) seen.add(label);
    current.tabs.push(tab);
  }

  return groups;
}

/* ------------------------------------------------------------------ *
 *  Plantilla de series: botones `js-server`
 * ------------------------------------------------------------------ */

/** `lat` / `cas` / `sub` → nombre visible. */
const SHORT_LANGUAGES = {
  lat: 'Latino',
  latino: 'Latino',
  cas: 'Castellano',
  castellano: 'Castellano',
  esp: 'Español',
  es: 'Español',
  sub: 'Sub Español',
  subtitulado: 'Subtitulado',
  subespanol: 'Sub Español'
};

export function shortLanguage(code, fallbackText = '') {
  const value = String(code == null ? '' : code).trim().toLowerCase();
  if (SHORT_LANGUAGES[value]) return SHORT_LANGUAGES[value];
  return canonicalLanguage(fallbackText) || (fallbackText ? fallbackText.slice(0, 24) : '');
}

/**
 * Nombres de idioma de la barra `.seg`: `<button class="… js-lang" data-lang="lat">Latino <span>8</span></button>`.
 * @returns {Map<string,string>} data-lang → «Latino»
 */
function languageTabs(html) {
  const labels = new Map();
  const re = /<button\b([^>]*\bclass\s*=\s*["'][^"']*\bjs-lang\b[^"']*["'][^>]*)>([\s\S]{0,160}?)<\/button>/gi;
  let match;
  while ((match = re.exec(html))) {
    const code = attrValue(match[1], 'data-lang');
    if (!code || labels.has(code)) continue;
    const text = stripTags(match[2]).replace(/\s*\d+\s*$/, '').trim();
    labels.set(code, shortLanguage(code, text));
  }
  return labels;
}

/**
 * Reproductores de la plantilla de series: cada idioma es un `<div class="servers"
 * data-lang="lat">` lleno de `<button class="server js-server" data-src="…">`.
 * @returns {{url:string, language:string, kind:string}[]}
 */
export function parseServerButtons(html) {
  const labels = languageTabs(html);
  const embeds = [];
  const re = /<div\b([^>]*\bclass\s*=\s*["'][^"']*\bservers\b[^"']*["'][^>]*)>([\s\S]{0,40000}?)<\/div>/gi;
  let match;

  while ((match = re.exec(html))) {
    const groupAttrs = match[1];
    const code = attrValue(groupAttrs, 'data-lang');
    const language = shortLanguage(code, labels.get(code) || '');
    const inner = match[2];

    const buttonRe = /<button\b([^>]*\bclass\s*=\s*["'][^"']*\bjs-server\b[^"']*["'][^>]*)>/gi;
    let button;
    while ((button = buttonRe.exec(inner))) {
      const url = attrValue(button[1], 'data-src');
      if (isHttpUrl(url)) embeds.push({ url: safeDecodeEntities(url), language, kind: 'iframe' });
    }
  }

  return embeds;
}

/**
 * Reproductores de una ficha, con su idioma cuando se puede deducir.
 * Dos plantillas del grupo: películas con pestañas e iframes (`div#tabN`) y
 * series con botones `js-server` cuyo `data-src` es el embed.
 * @returns {{url:string, language:string, kind:string}[]}
 */
export function parsePlayerEmbeds(html) {
  const tabs = findTabBlocks(html);
  const labels = tabLabels(html);
  const markers = languageMarkers(html);
  const counters = languageCounters(html);

  const embeds = [];
  const seen = new Set();

  const push = (url, language, kind) => {
    if (!isHttpUrl(url) || isSkippedEmbed(url)) return;
    let key = url;
    try {
      const parsed = new URL(url);
      parsed.hash = '';
      key = parsed.toString();
    } catch {
      return;
    }
    if (seen.has(key)) return;
    seen.add(key);
    embeds.push({ url: key, language: language || '', kind: kind || 'iframe' });
  };

  if (tabs.length) {
    const groups = groupByLabelRestart(tabs, labels);
    const languagesFromMarkers = markers.length >= 1;
    const languagesFromCounters = !languagesFromMarkers && counters.length === groups.length && counters.length > 0;

    groups.forEach((group, index) => {
      let language = '';
      if (languagesFromMarkers) {
        // Último «opción N, Idioma» anterior al grupo.
        for (const marker of markers) {
          if (marker.pos <= group.start) language = marker.language;
          else break;
        }
      } else if (languagesFromCounters) {
        language = counters[index].language;
      }

      for (const tab of group.tabs) {
        const embed = embedInChunk(tab.chunk);
        if (embed) push(embed.url, language, embed.kind);
      }
    });
  }

  // Plantilla de series (o ficha sin pestañas): botones con `data-src`.
  if (!embeds.length) {
    for (const embed of parseServerButtons(html)) {
      let language = embed.language;
      if (!language) {
        for (const marker of markers) {
          if (marker.pos <= html.indexOf(embed.url)) language = marker.language;
          else break;
        }
      }
      push(embed.url, language, embed.kind);
    }
  }

  // Plantilla desconocida o ficha sin pestañas: se leen todos los iframes.
  if (!embeds.length) {
    const re = /<iframe\b([^>]*)>/gi;
    let match;
    while ((match = re.exec(html))) {
      for (const name of ['data-lazy-src', 'data-src', 'data-original', 'src']) {
        const value = attrValue(match[1], name);
        if (!isHttpUrl(value)) continue;
        let language = '';
        for (const marker of markers) {
          if (marker.pos <= match.index) language = marker.language;
          else break;
        }
        push(value, language, 'iframe');
        break;
      }
    }
  }

  for (const url of directVideoIn(html)) push(url, '', 'direct');

  return embeds.sort((a, b) => embedPriority(a.url) - embedPriority(b.url));
}

/**
 * Elige qué reproductores abrir: primero uno por servidor distinto (si un host
 * está caído o pide captcha, el resto no comparte su suerte) y después el
 * resto, para no gastar el presupuesto en seis pestañas del mismo host.
 */
export function selectEmbedsForResolution(embeds, limit) {
  const chosen = [];
  const usedHosts = new Set();

  for (const embed of embeds) {
    if (chosen.length >= limit) break;
    const host = hostOf(embed.url);
    if (usedHosts.has(host)) continue;
    usedHosts.add(host);
    chosen.push(embed);
  }

  for (const embed of embeds) {
    if (chosen.length >= limit) break;
    if (!chosen.includes(embed)) chosen.push(embed);
  }

  return chosen;
}

/** ¿La página tiene pinta de ficha con reproductores? */
export function hasPlayers(html) {
  if (/<div\b[^>]*\bid\s*=\s*["']?tab\d+/i.test(html)) return true;
  if (/go_to_player\(/i.test(html)) return true;
  if (/class\s*=\s*["'][^"']*\bjs-server\b/i.test(html)) return true;
  return /\bopci[oó]n\s*\d+/i.test(html) && /<iframe\b/i.test(html);
}

/** «Ver película online [2025, Latino, Subtitulado, Castellano, HD]» → "HD" */
export function parseQuality(html) {
  const text = stripTags(html);
  const match = /Ver\s+pel[ií]cula\s+online\s*\[([^\]]+)\]/i.exec(text)
    || /Ver\s+serie\s+online\s*\[([^\]]+)\]/i.exec(text);
  if (!match) {
    // Plantilla de series: la calidad solo aparece en el título («Loki 2×01 HD Online»).
    const heading = /<title>([\s\S]{0,200}?)<\/title>/i.exec(html);
    const found = heading && /\b(4k|uhd|1080p|720p|hd)\b/i.exec(heading[1]);
    return found ? found[1].toUpperCase() : '';
  }
  const parts = match[1].split(',').map((part) => part.trim());
  const quality = parts.find((part) => /\b(4k|uhd|1080p|720p|hd|dvdrip|hdtv|brrip)\b/i.test(part));
  return quality ? quality.toUpperCase().slice(0, 10) : '';
}

/* ------------------------------------------------------------------ *
 *  Búsqueda de fichas
 * ------------------------------------------------------------------ */

export function contentRegion(html) {
  const start = html.indexOf('<div id="content">');
  if (start < 0) return html;
  let region = html.slice(start);
  for (const stop of ['class="navigation pagination"', '<div id="comments', '<div class="remodal"']) {
    const index = region.indexOf(stop);
    if (index > 0) region = region.slice(0, index);
  }
  return region;
}

/**
 * Búsquedas que se van a lanzar en el sitio, de mejor a peor:
 * primero los títulos completos (español y original), y solo después las
 * variantes —sin subtítulo tras «:», sin artículo inicial y en pocas
 * palabras— para los casos en que el buscador del sitio no encuentra la ficha
 * con el nombre largo. Nunca devuelve más de 4 para no gastar el presupuesto.
 */
export function searchTerms(titles) {
  const full = [];
  const variants = [];
  const seen = new Set();

  const push = (list, value) => {
    const clean = String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
    if (clean.length < 2) return;
    const key = compact(clean);
    if (!key || seen.has(key)) return;
    seen.add(key);
    list.push(clean);
  };

  for (const title of titles) push(full, title);

  for (const title of titles) {
    const value = String(title == null ? '' : title);
    // «Spider-Man: No Way Home» → «Spider-Man»
    const beforeColon = value.split(/\s*[:–—]\s+|\s+-\s+/)[0];
    if (beforeColon && beforeColon.length >= 4) push(variants, beforeColon);

    // «The Batman» → «Batman»
    const words = value.trim().split(/\s+/);
    if (words.length > 1 && ARTICLES.has(normalize(words[0]))) {
      push(variants, words.slice(1).join(' '));
    }

    // Títulos muy largos: las 4 primeras palabras suelen bastar.
    if (words.length > 5) push(variants, words.slice(0, 4).join(' '));
  }

  return [...full, ...variants].slice(0, 4);
}

async function searchSite(site, term, ctx, section = 'movie') {
  const url = `${site}/?s=${encodeURIComponent(term)}`;
  const result = await request(url, {
    deadline: ctx.deadline,
    headers: { Referer: `${site}/` }
  });
  if (!result.ok) return [];
  const region = contentRegion(result.text);
  const fromRegion = parseSearchResults(region, { site, section });
  if (fromRegion.length) return fromRegion;
  return parseSearchResults(result.text, { site, section });
}

async function fetchPage(url, ctx) {
  return request(url, {
    deadline: ctx.deadline,
    headers: { Referer: `${new URL(url).origin}/` }
  });
}

/**
 * Encuentra la ficha de una película y devuelve sus reproductores.
 * @param {{titles:string[], year:string}} wanted
 * @returns {Promise<{pageUrl:string,title:string,year:string,embeds:Array,quality:string}|null>}
 */
export async function findMovie({ titles, year }, ctx = {}) {
  const deadline = ctx.deadline;
  const terms = searchTerms(titles).slice(0, 2);
  const cacheKey = `gnula:movie:${compact(titles[0] || '')}:${year || ''}`;

  const cached = pageCache.get(cacheKey);
  if (cached) return cached;

  const candidates = [];
  const seen = new Set();
  const add = (list) => {
    for (const item of list) {
      if (seen.has(item.slug)) continue;
      seen.add(item.slug);
      candidates.push(item);
    }
  };

  for (const term of terms) {
    if (deadline && deadline.remaining() < 1500) break;
    add(await searchSite(config.gnulaBaseUrl, term, { deadline }));
    if (candidates.length >= 6) break;
  }

  let ranked = rankCandidates(candidates, titles, year);

  // Sin resultados: probar el slug directo del título (la URL es predecible).
  if (!ranked.length) {
    const slugs = [...new Set(titles.map((title) => slugify(title)).filter(Boolean))].slice(0, 3);
    for (const slug of slugs) {
      if (deadline && deadline.remaining() < 2000) break;
      const url = `${config.gnulaBaseUrl}/movie/${slug}/`;
      const page = await fetchPage(url, { deadline });
      if (page.ok && hasPlayers(page.text)) {
        ranked = [{ slug, url: page.url || url, title: titles[0], year: year || '', score: 0.7, preloaded: page.text }];
        break;
      }
    }
  }

  // Si la ficha existe pero ningún reproductor se pudo leer, se devuelve igual:
  // el addon puede ofrecer «abrir la ficha en el navegador» en vez de nada.
  let emptyPage = null;

  for (const candidate of ranked.slice(0, 2)) {
    if (deadline && deadline.remaining() < 1500) break;
    const page = candidate.preloaded ? { ok: true, text: candidate.preloaded, url: candidate.url } : await fetchPage(candidate.url, { deadline });
    if (!page.ok) continue;
    const embeds = parsePlayerEmbeds(page.text);
    const result = {
      pageUrl: page.url || candidate.url,
      title: candidate.title || titles[0],
      year: candidate.year || year || '',
      quality: parseQuality(page.text),
      embeds
    };
    if (!embeds.length) {
      if (!emptyPage) emptyPage = result;
      continue;
    }
    pageCache.set(cacheKey, result, config.cacheTtlSeconds);
    return result;
  }

  return emptyPage;
}

/**
 * Encuentra el episodio en el sitio de series hermano de Gnula.
 * @param {{titles:string[], year:string, season:number, episode:number}} wanted
 */
export async function findEpisode({ titles, year, season, episode }, ctx = {}) {
  const deadline = ctx.deadline;
  if (!Number.isInteger(season) || !Number.isInteger(episode)) return null;

  const cacheKey = `gnula:series:${compact(titles[0] || '')}:${season}:${episode}`;
  const cached = pageCache.get(cacheKey);
  if (cached) return cached;

  const site = config.seriesBaseUrl;
  const terms = searchTerms(titles).slice(0, 2);
  const candidates = [];
  const seen = new Set();
  const add = (list) => {
    for (const item of list) {
      if (seen.has(item.slug)) continue;
      seen.add(item.slug);
      candidates.push(item);
    }
  };

  for (const term of terms) {
    if (deadline && deadline.remaining() < 1500) break;
    add(await searchSite(site, term, { deadline }, 'serie'));
    if (candidates.length >= 6) break;
  }

  let ranked = rankCandidates(candidates, titles, year);

  if (!ranked.length) {
    const slugs = [...new Set(titles.map((title) => slugify(title)).filter(Boolean))].slice(0, 2);
    ranked = slugs.map((slug) => ({ slug, url: `${site}/serie/${slug}/`, title: titles[0], year: year || '', score: 0.6 }));
  }

  const episodePattern = new RegExp(`-${season}x0?${episode}-`, 'i');
  const fallbackEpisodeSlug = `${season}x${String(episode).padStart(2, '0')}`;
  let emptyPage = null;

  for (const candidate of ranked.slice(0, 2)) {
    if (deadline && deadline.remaining() < 2000) break;
    const seriesPage = await fetchPage(candidate.url, { deadline });
    if (!seriesPage.ok) continue;

    let episodeUrl = '';
    const linkRe = /<a\b[^>]*\bhref\s*=\s*["']([^"']+)["'][^>]*>/gi;
    let match;
    while ((match = linkRe.exec(seriesPage.text))) {
      const href = safeDecodeEntities(match[1]);
      if (!/^https?:\/\//i.test(href)) continue;
      if (!/-hd-online-temporada-\d+-episodio-\d+/i.test(href)) continue;
      if (episodePattern.test(href)) {
        episodeUrl = href;
        break;
      }
    }

    if (!episodeUrl) {
      // La URL del episodio es predecible: /<slug>-<SxEE>-hd-online-temporada-S-episodio-E/
      episodeUrl = `${site}/${candidate.slug}-${fallbackEpisodeSlug}-hd-online-temporada-${season}-episodio-${episode}/`;
    }

    const episodePage = await fetchPage(episodeUrl, { deadline });
    if (!episodePage.ok) continue;
    const embeds = parsePlayerEmbeds(episodePage.text);

    const result = {
      pageUrl: episodePage.url || episodeUrl,
      title: `${candidate.title || titles[0]} ${season}x${String(episode).padStart(2, '0')}`,
      year: candidate.year || year || '',
      quality: parseQuality(episodePage.text),
      embeds
    };
    if (!embeds.length) {
      if (!emptyPage) emptyPage = result;
      continue;
    }
    pageCache.set(cacheKey, result, config.cacheTtlSeconds);
    return result;
  }

  return emptyPage;
}
