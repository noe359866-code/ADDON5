/**
 * src/gnulahd.js — Hermano de Gnula: https://ww3.gnulahd.nu
 *
 * Es otra plantilla (no la de pestañas de gnula.one):
 *
 *   Búsqueda  /?s=<término>            tarjetas <a class="gnrd-card">
 *   Ficha     /ver/<slug>/             h1.gnrd-fi-title, div.gnrd-qf (Año/Calidad)
 *   Series    a.gnrd-epc               episodios «1x01» con su propio /ver/…
 *   Jugadores window.GNRD={pid,tok,k}  → /wp-json/gnrd/v1/player?id=&t=
 *                                       → {p:"<base64 XOR>"} → {langs:[{label,servers}]}
 *
 * El payload del reproductor viene en base64 y cifrado con XOR contra una
 * clave que también viaja en base64 en la página. Se descifra aquí, sin
 * ejecutar nada del sitio. Si la página es la variante antigua (variables
 * `_gnpv_ep_langs` / `_gd` en línea) también se leen.
 */

import { config } from './config.js';
import { request } from './http.js';
import { pageCache } from './cache.js';
import {
  canonicalLanguage,
  embedPriority,
  isHttpUrl,
  isSkippedEmbed,
  rankCandidates,
  searchTerms
} from './gnula.js';
import { compact, slugify } from './utils/text.js';

const BASE = () => config.gnulahdBaseUrl;

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

/** Descifra el payload del reproductor: XOR byte a byte contra la clave. */
export function xorDecrypt(encoded, keyBase64) {
  const key = decodeBase64(keyBase64);
  const raw = decodeBase64(encoded);
  if (!key.length || !raw.length) return '';
  const out = Buffer.alloc(raw.length);
  for (let i = 0; i < raw.length; i += 1) {
    out[i] = raw[i] ^ key[i % key.length];
  }
  return out.toString('utf8');
}

/** Cifra al revés; solo lo usan las pruebas para fabricar un payload válido. */
export function xorEncrypt(plain, keyBase64) {
  const key = decodeBase64(keyBase64);
  const raw = Buffer.from(String(plain), 'utf8');
  const out = Buffer.alloc(raw.length);
  for (let i = 0; i < raw.length; i += 1) {
    out[i] = raw[i] ^ key[i % key.length];
  }
  return out.toString('base64');
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

/** Filas «Año / Calidad / Audio» de la ficha. */
export function parseQuickFacts(html) {
  const facts = {};
  const re = /<span[^>]*class\s*=\s*["'][^"']*gnrd-qf-l[^"']*["'][^>]*>([\s\S]*?)<\/span>[\s\S]{0,200}?<span[^>]*class\s*=\s*["'][^"']*gnrd-qf-v[^"']*["'][^>]*>([\s\S]*?)<\/span>/gi;
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
  return title.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

export function parseQuality(html) {
  const facts = parseQuickFacts(html);
  const quality = facts.calidad || '';
  return quality ? quality.toUpperCase().slice(0, 10) : '';
}

/** Episodios `<a class="gnrd-epc" href="…"><span class="gnrd-epc-n">1x01</span>…`. */
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
    episodes.push({ url, season, episode, label });
  }

  return episodes;
}

/* ------------------------------------------------------------------ *
 *  Reproductores
 * ------------------------------------------------------------------ */

/** `window.GNRD={pid:123,tok:"…",k:"…"}` */
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

/** Convierte {langs:[{label,servers:[{src}]}]} en embeds normalizados. */
export function playersFromJson(data, { site = BASE() } = {}) {
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

/**
 * Reproductores de una página de GnulaHD: API GNRD (payload cifrado),
 * variables en línea de la versión anterior o, como último recurso, iframes.
 */
export async function readPlayers(html, pageUrl, ctx = {}) {
  const gnrd = parseGnrdConfig(html);
  let embeded = [];

  if (gnrd) {
    const apiUrl = `${BASE()}/wp-json/gnrd/v1/player?id=${encodeURIComponent(gnrd.pid)}&t=${encodeURIComponent(gnrd.tok)}`;
    const response = await request(apiUrl, {
      deadline: ctx.deadline,
      headers: {
        Referer: pageUrl,
        'X-Requested-With': 'gnrd',
        Accept: 'application/json'
      }
    });

    if (response.ok && response.text) {
      let payload = null;
      try {
        payload = JSON.parse(response.text);
      } catch {
        payload = null;
      }
      const encoded = payload && typeof payload.p === 'string' ? payload.p : '';
      if (encoded) {
        try {
          const decrypted = xorDecrypt(encoded, gnrd.key);
          embeded = playersFromJson(JSON.parse(decrypted));
        } catch {
          embeded = [];
        }
      }
      if (!embeded.length && payload && Array.isArray(payload.langs)) {
        embeded = playersFromJson(payload);
      }
    }
  }

  if (!embeded.length) {
    const inline = parseInlinePlayers(html);
    if (inline) embeded = playersFromJson(inline);
  }

  if (!embeded.length) {
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
          embeded.push({ url, language: '', kind: 'iframe' });
        }
        break;
      }
    }
  }

  embeded = await resolveTheTube(embeded, ctx);

  // Deduplicado por URL conservando el orden de prioridad del sitio.
  const seen = new Set();
  return embeded
    .filter((embed) => {
      if (seen.has(embed.url)) return false;
      seen.add(embed.url);
      return true;
    })
    .sort((a, b) => embedPriority(a.url) - embedPriority(b.url));
}

/**
 * they.tube se resuelve en el propio sitio: /panel/the-tube-resolve.php
 * devuelve el master .m3u8. Si no responde, el enlace se deja como está.
 */
async function resolveTheTube(embeds, ctx) {
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
    const url = `${BASE()}/panel/the-tube-resolve.php?code=${encodeURIComponent(code[1])}&t=${encodeURIComponent(config.theTubeToken)}`;
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

async function search(term, ctx) {
  const result = await request(`${BASE()}/?s=${encodeURIComponent(term)}`, {
    deadline: ctx.deadline,
    headers: { Referer: `${BASE()}/` }
  });
  if (!result.ok) return [];
  return parseCards(result.text);
}

async function candidatesFor(titles, year, ctx) {
  const cards = [];
  const seen = new Set();
  for (const term of searchTerms(titles).slice(0, 2)) {
    if (ctx.deadline && ctx.deadline.remaining() < 1500) break;
    for (const card of await search(term, ctx)) {
      if (seen.has(card.slug)) continue;
      seen.add(card.slug);
      cards.push(card);
    }
    if (cards.length >= 6) break;
  }

  const ranked = rankCandidates(cards, titles, year);
  if (ranked.length) return ranked;

  // El slug es predecible: se prueba directo antes de darse por vencido.
  for (const title of titles) {
    const slug = slugify(title);
    if (!slug) continue;
    const url = `${BASE()}/ver/${slug}/`;
    const page = await fetchPage(url, { deadline: ctx.deadline });
    if (page.ok && /gnrd-fi-title|gnrd-epc|GNRD|_gnpv_ep_langs/i.test(page.text)) {
      return [{ slug, url: page.url || url, title, year: year || '', score: 0.7, preloaded: page.text }];
    }
  }
  return [];
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
