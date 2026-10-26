/**
 * src/gnulahd.js — Hermano de Gnula: https://ww3.gnulahd.nu
 *
 * Es otra plantilla (no la de pestañas de gnula.one). Comprobado contra la web
 * real en octubre de 2026:
 *
 *   Búsqueda  /?s=<término>            tarjetas <a class="gnrd-card">
 *   Ficha     /ver/<slug>/             h1.gnrd-fi-title, filas .qf-l / .qf-v
 *   Series    a.gnrd-epc               «4x07» con data-s/data-e y su propia URL
 *   Jugadores <script>                 _gnrdPid=…, _gnrdTok="…"
 *                                      → /wp-json/gnrd/v1/player?id=&t=
 *                                      → {p:"<base64>"} cifrado XOR
 *   Resolvedores del sitio             /panel/vidara-resolve.php  (devuelve HLS)
 *                                      /panel/the-tube-resolve.php (JSON {master})
 *
 * El payload NO viene en claro: es base64 y va cifrado con XOR byte a byte
 * contra una clave de 4 bytes que está en la propia página, dentro de
 * `gnrdUnpack` (`k=[103,78,55,100]` = "gN7d"). Aquí se descifra sin ejecutar
 * nada del sitio; la clave se lee de la página y solo se usa la conocida si
 * no aparece.
 *
 * Los enlaces de vidara (vidaraa.cc / vidara.to) no se rastrean en su web: el
 * propio sitio los convierte en un HLS con `/panel/vidara-resolve.php?pl=1`.
 * Ese token es distinto en cada ficha, así que se lee de la página en el
 * momento y nunca se guarda en la configuración.
 */

import { config } from './config.js';
import { request, safeDecodeEntities } from './http.js';
import { pageCache } from './cache.js';
import {
  MIN_SCORE,
  canonicalLanguage,
  embedPriority,
  hostOf,
  isHttpUrl,
  isSkippedEmbed,
  rankCandidates,
  scoreCandidate,
  searchTerms
} from './gnula.js';
import { compact, slugify } from './utils/text.js';

const BASE = () => config.gnulahdBaseUrl;

/** Clave de `gnrdUnpack` en la web actual: [103,78,55,100] → "gN7d". */
const DEFAULT_PLAYER_KEY = Buffer.from([103, 78, 55, 100]);

/* ------------------------------------------------------------------ *
 *  Base64 / XOR
 * ------------------------------------------------------------------ */

function decodeBase64(value) {
  const clean = String(value == null ? '' : value)
    .trim()
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  if (!clean) return Buffer.alloc(0);
  const padded = clean + '='.repeat((4 - (clean.length % 4)) % 4);
  try {
    return Buffer.from(padded, 'base64');
  } catch {
    return Buffer.alloc(0);
  }
}

const CONTROL_CHARS = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\ufffd]/;

/** Bytes de la clave: Buffer, [103,78,…] o el texto tal cual. */
export function keyBytes(key) {
  if (Buffer.isBuffer(key)) return key;
  if (Array.isArray(key)) return Buffer.from(key.map((value) => Number(value) & 0xff));
  return Buffer.from(String(key == null ? '' : key), 'utf8');
}

/** Variantes a probar: el texto tal cual y, si parece base64, su decodificado. */
function keyCandidates(key) {
  const list = [keyBytes(key)];
  if (typeof key === 'string' && key.trim()) {
    const decoded = decodeBase64(key);
    if (decoded.length) list.push(decoded);
  }
  return list.filter((buffer) => buffer.length);
}

function xorBytes(raw, key) {
  const out = Buffer.alloc(raw.length);
  for (let i = 0; i < raw.length; i += 1) {
    out[i] = raw[i] ^ key[i % key.length];
  }
  return out;
}

/**
 * Descifra el payload del reproductor: XOR byte a byte contra la clave.
 * Se queda con la primera lectura que sea texto limpio (la clave puede venir
 * como texto —"gN7d"— o en base64, según la versión de la web).
 */
export function xorDecrypt(encoded, key) {
  const raw = decodeBase64(encoded);
  if (!raw.length) return '';
  let fallback = '';
  for (const candidate of keyCandidates(key)) {
    const text = xorBytes(raw, candidate).toString('utf8');
    if (!fallback) fallback = text;
    if (!CONTROL_CHARS.test(text)) return text;
  }
  return fallback;
}

/** Cifra al revés; solo lo usan las pruebas para fabricar un payload válido. */
export function xorEncrypt(plain, key) {
  const raw = Buffer.from(String(plain), 'utf8');
  return xorBytes(raw, keyBytes(key)).toString('base64');
}

/** Descifra y valida que sea JSON; `null` si la clave no era la correcta. */
export function decodePlayerPayload(encoded, key) {
  if (!encoded) return null;
  for (const candidate of keyCandidates(key)) {
    try {
      return JSON.parse(xorBytes(decodeBase64(encoded), candidate).toString('utf8'));
    } catch {
      // se prueba la siguiente variante de la clave
    }
  }
  return null;
}

/* ------------------------------------------------------------------ *
 *  Tarjetas de búsqueda
 * ------------------------------------------------------------------ */

function firstMatch(text, re) {
  const match = re.exec(text);
  return match ? match[1].trim() : '';
}

/**
 * Tarjetas `<a class="gnrd-card" href="/ver/<slug>/">…</a>`.
 * Devuelve { slug, url, title, year, type }.
 */
export function parseCards(html, { site = BASE() } = {}) {
  const re = /<a\b([^>]*\bclass\s*=\s*["'][^"']*\bgnrd-card\b[^"']*["'][^>]*)>([\s\S]{0,4000}?)<\/a>/gi;
  const cards = [];
  const seen = new Set();
  let match;

  while ((match = re.exec(html))) {
    const attrs = match[1];
    const inner = match[2];

    const href = /href\s*=\s*["']([^"']+)["']/i.exec(attrs);
    let url = href ? href[1] : '';
    if (url.startsWith('/')) url = `${site}${url}`;
    if (!/^https?:\/\//i.test(url)) url = new URL(url, `${site}/`).toString();

    const slug = firstMatch(url, /\/ver\/([^/?#]+)/i);
    if (!slug || seen.has(slug)) continue;

    const title = firstMatch(inner, /<span[^>]*class\s*=\s*["'][^"']*gnrd-card-title[^"']*["'][^>]*>([\s\S]*?)<\/span>/i)
      || firstMatch(attrs, /title\s*=\s*["']([^"']+)["']/i);
    if (!title) continue;

    // Las URLs del póster traen el año de subida (/uploads/2026/07/…): se
    // quitan antes de buscar el año para no confundirlo con el de la película.
    const withoutMedia = inner
      .replace(/<img\b[^>]*>/gi, ' ')
      .replace(/\b(?:src|href|data-src|data-lazy-src|style|alt)\s*=\s*"[^"]*"/gi, ' ');
    const text = withoutMedia.replace(/<[^>]+>/g, ' ');
    // El año nunca forma parte de la nota («★ 8.5»): se exige que no lo
    // preceda un dígito o un punto decimal.
    const yearMatch = /(?<![\d.])((?:19|20)\d{2})(?!\d)/.exec(text);
    const typeMatch = /<span[^>]*class\s*=\s*["'][^"']*gnrd-type-badge[^"']*["'][^>]*>([\s\S]*?)<\/span>/i.exec(inner);

    seen.add(slug);
    cards.push({
      slug,
      url,
      title: title.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim(),
      year: yearMatch ? yearMatch[1] : '',
      type: typeMatch ? typeMatch[1].trim().toLowerCase() : ''
    });
  }

  return cards;
}

/* ------------------------------------------------------------------ *
 *  Ficha
 * ------------------------------------------------------------------ */

/**
 * Filas «Año / Calidad / Audio» de la ficha. La plantilla actual usa
 * `<span class="qf-l">Año</span><span class="qf-v">2014</span>`; versiones
 * anteriores las llamaban `gnrd-qf-…` y también se aceptan.
 */
export function parseQuickFacts(html) {
  const facts = {};
  const re = /<span[^>]*class\s*=\s*["'][^"']*(?:gnrd-qf|qf)-l[^"']*["'][^>]*>([\s\S]*?)<\/span>[\s\S]{0,200}?<span[^>]*class\s*=\s*["'][^"']*(?:gnrd-qf|qf)-v[^"']*["'][^>]*>([\s\S]*?)<\/span>/gi;
  let match;
  while ((match = re.exec(html))) {
    const label = match[1].replace(/<[^>]+>/g, '').trim().toLowerCase();
    const value = match[2].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    if (label && value && !facts[label]) facts[label] = value;
  }
  return facts;
}

export function parseDetailTitle(html) {
  const title = firstMatch(html, /<h1[^>]*class\s*=\s*["'][^"']*gnrd-fi-title[^"']*["'][^>]*>([\s\S]*?)<\/h1>/i);
  // El sitio escribe «4&#215;07» (×) y acentos como entidades: se decodifican
  // para que el nombre llegue limpio a Stremio.
  return safeDecodeEntities(title.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
}

export function parseQuality(html) {
  const facts = parseQuickFacts(html);
  const quality = facts.calidad || '';
  return quality ? quality.toUpperCase().slice(0, 10) : '';
}

/**
 * Episodios `<a class="gnrd-epc" href="…" data-id data-t data-s data-e>`.
 * `data-id`/`data-t` son el id y el token del reproductor de ese capítulo.
 */
export function parseEpisodes(html, { site = BASE() } = {}) {
  const re = /<a\b([^>]*\bclass\s*=\s*["'][^"']*\bgnrd-epc\b[^"']*["'][^>]*)>([\s\S]{0,3000}?)<\/a>/gi;
  const episodes = [];
  const seen = new Set();
  let match;

  while ((match = re.exec(html))) {
    const attrs = match[1];
    const inner = match[2];

    const href = /href\s*=\s*["']([^"']+)["']/i.exec(attrs);
    if (!href) continue;
    let url = href[1];
    if (url.startsWith('/')) url = `${site}${url}`;
    if (!/^https?:\/\//i.test(url)) continue;
    if (seen.has(url)) continue;

    const label = firstMatch(inner, /<span[^>]*class\s*=\s*["'][^"']*gnrd-epc-n[^"']*["'][^>]*>([\s\S]*?)<\/span>/i)
      .replace(/<[^>]+>/g, '')
      .trim();
    const dataS = firstMatch(attrs, /data-s\s*=\s*["'](\d+)["']/i);
    const dataE = firstMatch(attrs, /data-e\s*=\s*["'](\d+)["']/i);
    const fromLabel = /(\d+)\s*x\s*(\d+)/i.exec(label);

    const season = Number.parseInt(dataS || (fromLabel ? fromLabel[1] : ''), 10);
    const episode = Number.parseInt(dataE || (fromLabel ? fromLabel[2] : ''), 10);
    if (!Number.isInteger(season) || !Number.isInteger(episode)) continue;

    seen.add(url);
    episodes.push({
      url,
      season,
      episode,
      label,
      playerId: firstMatch(attrs, /data-id\s*=\s*["'](\d+)["']/i),
      playerToken: firstMatch(attrs, /data-t\s*=\s*["']([^"']+)["']/i)
    });
  }

  return episodes;
}

/* ------------------------------------------------------------------ *
 *  Reproductores
 * ------------------------------------------------------------------ */

/**
 * Configuración del reproductor en la página actual:
 *   var _gnrdPid=206802,_gnrdTok="…";
 *   function gnrdUnpack(s){ … k=[103,78,55,100] … }
 * @returns {{pid:string, tok:string, key:Buffer}|null}
 */
export function parsePlayerConfig(html) {
  const pid = firstMatch(html, /_gnrdPid\s*=\s*["']?(\d+)/i);
  const tok = firstMatch(html, /_gnrdTok\s*=\s*["']([^"']+)/i);
  if (!pid || !tok) return null;

  // La clave del XOR viaja en la propia función que desempaqueta el payload.
  const keyBytesMatch = /gnrdUnpack[\s\S]{0,600}?\bk\s*=\s*\[([0-9,\s]+)\]/i.exec(html);
  let key = DEFAULT_PLAYER_KEY;
  if (keyBytesMatch) {
    const bytes = keyBytesMatch[1]
      .split(',')
      .map((value) => Number.parseInt(value, 10))
      .filter((value) => Number.isInteger(value) && value >= 0 && value <= 255);
    if (bytes.length) key = Buffer.from(bytes);
  }

  return { pid, tok, key };
}

/**
 * Variante antigua: `window.GNRD={pid:123,tok:"…",k:"…"}`. Ya no se sirve,
 * pero si una página llega desde una caché intermedia se sigue entendiendo.
 */
export function parseGnrdConfig(html) {
  const block = /window\.GNRD\s*=\s*\{([\s\S]{0,2000}?)\}\s*;?/.exec(html);
  if (!block) return null;
  const body = block[1];
  const pid = firstMatch(body, /\bpid\s*:\s*["']?(\d+)["']?/i);
  const tok = firstMatch(body, /\btok\s*:\s*["']([^"']*)["']/i);
  const key = firstMatch(body, /\bk\s*:\s*["']([^"']*)["']/i);
  if (!pid || !tok || !key) return null;
  return { pid, tok, key };
}

/**
 * Resolvedores propios del sitio, con su token (cambia en cada ficha):
 *   RESOLVE='/panel/the-tube-resolve.php?code=', AUTH='&t=…'
 *   VD_RESOLVE='/panel/vidara-resolve.php',    VD_AUTH='&t=…'
 */
export function parseResolvers(html) {
  const vidaraPath = firstMatch(html, /VD_RESOLVE\s*=\s*["']([^"']+)/i) || '/panel/vidara-resolve.php';
  const vidaraToken = firstMatch(html, /VD_AUTH\s*=\s*["']&?t=([^"']+)/i);
  const tubePath = firstMatch(html, /(?<![A-Za-z])RESOLVE\s*=\s*["']([^"']+)/i);
  const tubeToken = firstMatch(html, /(?<![A-Za-z])AUTH\s*=\s*["']&?t=([^"']+)/i);

  return {
    vidara: {
      path: vidaraPath,
      token: vidaraToken,
      on: !/VD_ON\s*=\s*false/i.test(html)
    },
    theTube: {
      path: tubePath,
      token: tubeToken,
      on: !/TT_ON\s*=\s*false/i.test(html)
    }
  };
}

/** URL del HLS que sirve el propio sitio para un enlace de vidara. */
export function vidaraResolveUrl(embedUrl, { site = BASE(), resolvers = null } = {}) {
  if (!resolvers || !resolvers.vidara || !resolvers.vidara.on) return '';
  if (!resolvers.vidara.token) return '';
  const host = hostOf(embedUrl);
  if (!/^vidaraa?\.(?:cc|to)$/i.test(host)) return '';

  let code = '';
  try {
    const segments = new URL(embedUrl).pathname.split('/').filter(Boolean);
    code = segments[segments.length - 1] || '';
  } catch {
    return '';
  }
  code = code.replace(/\.html?$/i, '');
  if (!code) return '';

  const path = resolvers.vidara.path.startsWith('/') ? resolvers.vidara.path : `/${resolvers.vidara.path}`;
  return `${site}${path}?pl=1&code=${encodeURIComponent(code)}&host=${encodeURIComponent(host)}&t=${encodeURIComponent(resolvers.vidara.token)}`;
}

/** Convierte {langs:[{label,servers:[{src}]}]} en embeds normalizados. */
export function playersFromJson(data, { site = BASE(), resolvers = null } = {}) {
  const langs = Array.isArray(data) ? data : (data && Array.isArray(data.langs) ? data.langs : []);
  const embeds = [];

  for (const lang of langs) {
    if (!lang || typeof lang !== 'object') continue;
    const rawLabel = String(lang.label || lang.name || lang.lang || '').trim();
    const language = canonicalLanguage(rawLabel) || rawLabel.slice(0, 24);
    const servers = lang.servers || lang.links || lang.urls || lang.players || [];
    if (!Array.isArray(servers)) continue;

    for (const server of servers) {
      if (!server) continue;
      const raw = typeof server === 'string'
        ? server
        : (server.src || server.url || server.link || server.file || '');
      let url = String(raw || '').replace(/\\\//g, '/').trim();
      if (!url) continue;
      if (url.startsWith('//')) url = `https:${url}`;
      if (url.startsWith('/')) url = `${site}${url}`;
      if (!isHttpUrl(url)) continue;
      if (/aviso\.mp4/i.test(url)) continue; // relleno publicitario del sitio
      if (isSkippedEmbed(url)) continue;

      // vidara se ve a través del resolvedor del propio sitio (devuelve HLS).
      // El nombre visible es el del servidor original, no el del dominio del
      // resolvedor.
      const resolved = vidaraResolveUrl(url, { site, resolvers });
      if (resolved) {
        embeds.push({ url: resolved, language, kind: 'iframe', label: 'Vidara' });
        continue;
      }

      embeds.push({ url, language, kind: /\.(m3u8|mp4|mpd)(\?|#|$)/i.test(url) ? 'direct' : 'iframe' });
    }
  }

  return embeds;
}

/** Variante antigua: `var _gnpv_ep_langs = [...]` en el HTML. */
export function parseInlinePlayers(html) {
  const re = /var\s+(_gnpv_ep_langs|_gd)\s*=\s*(\[[\s\S]*?\])\s*;/i;
  const match = re.exec(html);
  if (!match) return null;
  try {
    return JSON.parse(match[2].replace(/\\\//g, '/'));
  } catch {
    return null;
  }
}

/** Llama a la API del reproductor y devuelve los embeds ya normalizados. */
async function fetchPlayers({ pid, tok, key }, pageUrl, ctx, resolvers) {
  const apiUrl = `${BASE()}/wp-json/gnrd/v1/player?id=${encodeURIComponent(pid)}&t=${encodeURIComponent(tok)}`;
  const response = await request(apiUrl, {
    deadline: ctx.deadline,
    headers: {
      Referer: pageUrl,
      'X-Requested-With': 'gnrd',
      Accept: 'application/json'
    }
  });
  if (!response.ok || !response.text) return [];

  let payload = null;
  try {
    payload = JSON.parse(response.text);
  } catch {
    return [];
  }

  // Lo normal: `{p:"<base64 cifrado>"}`. Si algún día llega en claro, vale igual.
  let data = decodePlayerPayload(payload && payload.p, key);
  if (!data) {
    data = payload && (Array.isArray(payload.langs) || Array.isArray(payload)) ? payload : null;
  }
  if (!data) return [];

  return playersFromJson(data, { site: BASE(), resolvers });
}

/**
 * Reproductores de una página de GnulaHD: API con el payload cifrado,
 * variables en línea de la versión anterior o, como último recurso, iframes.
 */
export async function readPlayers(html, pageUrl, ctx = {}) {
  const resolvers = parseResolvers(html);
  const current = parsePlayerConfig(html);
  const legacy = current ? null : parseGnrdConfig(html);

  let embeds = [];
  if (current || legacy) {
    embeds = await fetchPlayers(current || legacy, pageUrl, ctx, resolvers);
  }

  if (!embeds.length) {
    const inline = parseInlinePlayers(html);
    if (inline) embeds = playersFromJson(inline, { site: BASE(), resolvers });
  }

  if (!embeds.length) {
    // Último recurso: iframes sueltos en la página.
    const re = /<iframe\b([^>]*)>/gi;
    let match;
    while ((match = re.exec(html))) {
      for (const name of ['data-lazy-src', 'data-src', 'data-original', 'src']) {
        const attr = new RegExp(`${name}\\s*=\\s*["']([^"']+)["']`, 'i').exec(match[1]);
        if (!attr) continue;
        let url = attr[1].replace(/\\\//g, '/');
        if (url.startsWith('//')) url = `https:${url}`;
        if (isHttpUrl(url) && !isSkippedEmbed(url)) {
          embeds.push({ url, language: '', kind: 'iframe' });
        }
        break;
      }
    }
  }

  embeds = await resolveTheTube(embeds, ctx, resolvers);

  // Deduplicado por URL conservando el orden de prioridad del sitio.
  const seen = new Set();
  return embeds
    .filter((embed) => {
      if (seen.has(embed.url)) return false;
      seen.add(embed.url);
      return true;
    })
    .sort((a, b) => embedPriority(a.url) - embedPriority(b.url));
}

/**
 * they.tube se resuelve en el propio sitio: /panel/the-tube-resolve.php
 * devuelve el master .m3u8. El token es el de la ficha abierta.
 */
async function resolveTheTube(embeds, ctx, resolvers) {
  const resolver = resolvers && resolvers.theTube;
  if (!resolver || !resolver.on || !resolver.path) return embeds;

  const out = [];
  for (const embed of embeds) {
    if (!/the(?:y)?\.tube/i.test(embed.url)) {
      out.push(embed);
      continue;
    }
    const code = /the(?:y)?\.tube\/(?:e\/)?([A-Za-z0-9_-]+)/i.exec(embed.url);
    if (!code) {
      out.push(embed);
      continue;
    }
    const token = resolver.token;
    const base = `${BASE()}${resolver.path}`;
    const separator = base.includes('?') ? '' : '?code=';
    const url = `${base}${separator}${encodeURIComponent(code[1])}${token ? `&t=${encodeURIComponent(token)}` : ''}`;
    const response = await request(url, {
      deadline: ctx.deadline,
      headers: { Referer: BASE(), Accept: 'application/json' }
    });
    let master = '';
    if (response.ok && response.text) {
      try {
        const payload = JSON.parse(response.text);
        master = typeof payload.master === 'string' ? payload.master : '';
      } catch {
        master = '';
      }
    }
    if (master && /^https?:\/\//i.test(master) && /\.(m3u8|mp4)/i.test(master)) {
      out.push({ ...embed, url: master, kind: 'direct' });
    } else {
      out.push(embed);
    }
  }
  return out;
}

/* ------------------------------------------------------------------ *
 *  Búsqueda de fichas
 * ------------------------------------------------------------------ */

async function fetchPage(url, ctx) {
  return request(url, {
    deadline: ctx.deadline,
    headers: { Referer: `${BASE()}/` }
  });
}

/**
 * Búsqueda. `/?s=` se cuelga (más de 60 s medidos) cuando el sitio está
 * cargado, pero la API REST de WordPress responde en ~12 s: se usa esa y, si
 * el tema la tapa, se cae al HTML de siempre con un tope corto.
 *
 * `/wp-json/wp/v2/search` devuelve [{title, url, subtype}] — sin año ni tipo,
 * así que se completa con la URL (`/ver/<slug>/`).
 */
/** `/wp-json/wp/v2/search` → tarjetas {slug,url,title,year,type}. */
export function cardsFromRest(list, { site = BASE() } = {}) {
  const cards = [];
  if (!Array.isArray(list)) return cards;

  for (const item of list) {
    if (!item || !item.url) continue;
    const slug = firstMatch(String(item.url), /\/ver\/([^/?#]+)/i);
    if (!slug) continue;
    const title = safeDecodeEntities(String(item.title || '').replace(/<[^>]+>/g, '')).trim();
    if (!title) continue;
    let url = String(item.url);
    if (url.startsWith('/')) url = `${site}${url}`;
    cards.push({ slug, url, title, year: '', type: String(item.subtype || '').toLowerCase() });
  }

  return cards;
}

async function search(term, ctx) {
  const api = `${BASE()}/wp-json/wp/v2/search?search=${encodeURIComponent(term)}&per_page=20`;
  const result = await request(api, {
    deadline: ctx.deadline,
    headers: { Referer: `${BASE()}/`, Accept: 'application/json' }
  });

  if (result.ok && result.text) {
    try {
      const cards = cardsFromRest(JSON.parse(result.text));
      if (cards.length) return cards;
    } catch {
      // No era JSON: se intenta el HTML.
    }
  }

  const html = await request(`${BASE()}/?s=${encodeURIComponent(term)}`, {
    deadline: ctx.deadline,
    headers: { Referer: `${BASE()}/` }
  });
  return html.ok ? parseCards(html.text) : [];
}

async function candidatesFor(titles, year, ctx) {
  // Dos caminos a la vez y gana el primero que sirva:
  //  · slug directo, /ver/<título>/ — 1-2 s cuando el slug coincide;
  //  · búsqueda REST — ~12 s, pero resuelve los títulos que no son el slug.
  const searchable = searchTerms(titles).slice(0, 2);
  const cardsPromise = (async () => {
    const cards = [];
    const seen = new Set();
    for (const term of searchable) {
      if (ctx.deadline && ctx.deadline.remaining() < 1500) break;
      for (const card of await search(term, ctx)) {
        if (seen.has(card.slug)) continue;
        seen.add(card.slug);
        cards.push(card);
      }
      if (rankCandidates(cards, titles, year).length) break;
      if (cards.length >= 12) break;
    }
    return cards;
  })().catch(() => []);

  for (const title of titles.slice(0, 2)) {
    const slug = slugify(title);
    if (!slug) continue;
    const page = await fetchPage(`${BASE()}/ver/${slug}/`, ctx).catch(() => null);
    if (!page || !page.ok || !/gnrd-fi-title|gnrd-epc|_gnrdTok/i.test(page.text)) continue;

    const card = {
      slug,
      url: page.url || `${BASE()}/ver/${slug}/`,
      title: parseDetailTitle(page.text) || title,
      year: parseQuickFacts(page.text).año || year || '',
      preloaded: page.text
    };
    // El slug es una apuesta: `/ver/it/` puede ser otra película. Se comprueba
    // el título de la ficha antes de darla por buena.
    if (scoreCandidate(card, titles, year) < MIN_SCORE) continue;
    // Acierto: se devuelve ya, sin esperar a la búsqueda (tarda ~12 s).
    return [{ ...card, score: 1 }];
  }

  return rankCandidates(await cardsPromise, titles, year);
}

async function pageFor(candidate, ctx) {
  if (candidate.preloaded) {
    return { ok: true, text: candidate.preloaded, url: candidate.url };
  }
  return fetchPage(candidate.url, ctx);
}

/** Película en GnulaHD. */
export async function findMovie({ titles, year }, ctx = {}) {
  const cacheKey = `gnulahd:movie:${compact(titles[0] || '')}:${year || ''}`;
  const cached = pageCache.get(cacheKey);
  if (cached) return cached;

  const ranked = await candidatesFor(titles, year, ctx);
  let emptyPage = null;

  for (const candidate of ranked.slice(0, 2)) {
    if (ctx.deadline && ctx.deadline.remaining() < 1500) break;
    const page = await pageFor(candidate, ctx);
    if (!page.ok) continue;

    const embeds = await readPlayers(page.text, page.url || candidate.url, ctx);
    const result = {
      pageUrl: page.url || candidate.url,
      title: parseDetailTitle(page.text) || candidate.title || titles[0],
      year: parseQuickFacts(page.text).año || candidate.year || year || '',
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

/** Episodio en GnulaHD: ficha de la serie → lista de episodios → página del capítulo. */
export async function findEpisode({ titles, year, season, episode }, ctx = {}) {
  if (!Number.isInteger(season) || !Number.isInteger(episode)) return null;

  const cacheKey = `gnulahd:series:${compact(titles[0] || '')}:${season}:${episode}`;
  const cached = pageCache.get(cacheKey);
  if (cached) return cached;

  const ranked = await candidatesFor(titles, year, ctx);
  let emptyPage = null;

  for (const candidate of ranked.slice(0, 2)) {
    if (ctx.deadline && ctx.deadline.remaining() < 2000) break;
    const seriesPage = await pageFor(candidate, ctx);
    if (!seriesPage.ok) continue;

    const episodes = parseEpisodes(seriesPage.text);
    const wanted = episodes.find((item) => item.season === season && item.episode === episode);

    if (!wanted) {
      // Puede ser una ficha de película con reproductores: se usan esos.
      const embeds = await readPlayers(seriesPage.text, seriesPage.url || candidate.url, ctx);
      if (embeds.length) {
        const result = {
          pageUrl: seriesPage.url || candidate.url,
          title: parseDetailTitle(seriesPage.text) || candidate.title || titles[0],
          year: parseQuickFacts(seriesPage.text).año || candidate.year || year || '',
          quality: parseQuality(seriesPage.text),
          embeds
        };
        pageCache.set(cacheKey, result, config.cacheTtlSeconds);
        return result;
      }
      continue;
    }

    const episodePage = await fetchPage(wanted.url, { deadline: ctx.deadline });
    if (!episodePage.ok) continue;

    const embeds = await readPlayers(episodePage.text, episodePage.url || wanted.url, ctx);
    const result = {
      pageUrl: episodePage.url || wanted.url,
      title: `${parseDetailTitle(seriesPage.text) || candidate.title || titles[0]} ${season}x${String(episode).padStart(2, '0')}`,
      year: parseQuickFacts(seriesPage.text).año || candidate.year || year || '',
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
