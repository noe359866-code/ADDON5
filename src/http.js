/**
 * src/http.js — Cliente HTTP con presupuesto de tiempo.
 *
 * Envuelve el fetch global de Node 22 para que ningún sitio externo pueda
 * colgar una petición de Stremio: todas las llamadas reciben un Deadline y
 * heredan su tiempo restante. Los errores de red NUNCA se lanzan hacia
 * arriba: se devuelven como `{ ok: false, status: 0, error }` para que el
 * llamante decida (normalmente seguir con el siguiente servidor).
 */

import { config } from './config.js';

const MAX_TEXT_BYTES = 4 * 1024 * 1024;

export class Deadline {
  constructor(ms = config.handlerDeadlineMs) {
    this.startedAt = Date.now();
    this.totalMs = ms;
    this.endsAt = this.startedAt + ms;
  }

  remaining() {
    return Math.max(0, this.endsAt - Date.now());
  }

  expired() {
    return this.remaining() <= 0;
  }

  elapsed() {
    return Date.now() - this.startedAt;
  }

  /** Tiempo efectivo para una petición: el menor entre el timeout y lo que queda. */
  budget(perRequestMs = config.fetchTimeoutMs) {
    return Math.min(perRequestMs, this.remaining());
  }
}

function buildHeaders(extra = {}) {
  return {
    'User-Agent': config.userAgent,
    'Accept-Language': 'es-ES,es;q=0.9,en;q=0.6',
    Accept: 'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8',
    ...extra
  };
}

/**
 * GET/POST a una URL con timeout y deadline.
 * @returns {Promise<{ok:boolean,status:number,url:string,text:string,headers:Headers,contentType:string,error:string}>}
 */
export async function request(url, opts = {}) {
  const {
    headers = {},
    timeoutMs = config.fetchTimeoutMs,
    deadline = null,
    method = 'GET',
    body = undefined,
    redirect = 'follow'
  } = opts;

  const budget = deadline ? deadline.budget(timeoutMs) : timeoutMs;
  if (!(budget > 0)) {
    return { ok: false, status: 0, url, text: '', headers: new Headers(), contentType: '', error: 'sin tiempo disponible' };
  }

  let response;
  try {
    response = await fetch(url, {
      method,
      body,
      redirect,
      headers: buildHeaders(headers),
      signal: AbortSignal.timeout(budget)
    });
  } catch (error) {
    const name = error && error.name ? error.name : '';
    const message = name === 'TimeoutError' || name === 'AbortError'
      ? `timeout tras ${Math.round(budget)} ms`
      : (error && error.message) || 'error de red';
    if (config.debug) console.warn(`[http] ${method} ${url} → ${message}`);
    return { ok: false, status: 0, url, text: '', headers: new Headers(), contentType: '', error: message };
  }

  const contentType = response.headers.get('content-type') || '';
  let text = '';
  if (method !== 'HEAD') {
    try {
      const raw = await response.text();
      text = raw.length > MAX_TEXT_BYTES ? raw.slice(0, MAX_TEXT_BYTES) : raw;
    } catch (error) {
      return {
        ok: false,
        status: response.status,
        url: response.url || url,
        text: '',
        headers: response.headers,
        contentType,
        error: (error && error.message) || 'error leyendo el cuerpo'
      };
    }
  }

  return {
    ok: response.ok,
    status: response.status,
    url: response.url || url,
    text,
    headers: response.headers,
    contentType,
    error: response.ok ? '' : `HTTP ${response.status}`
  };
}

export async function requestJson(url, opts = {}) {
  const result = await request(url, opts);
  if (!result.ok || !result.text) return { ...result, json: null };
  try {
    return { ...result, json: JSON.parse(result.text) };
  } catch {
    return { ...result, json: null, ok: false, error: 'JSON inválido' };
  }
}

/** Ejecuta `worker` sobre `items` con un máximo de tareas simultáneas. */
export async function mapLimit(items, limit, worker) {
  const results = new Array(items.length);
  let cursor = 0;
  const runners = new Array(Math.min(limit, items.length)).fill(null).map(async () => {
    while (true) {
      const index = cursor++;
      if (index >= items.length) return;
      try {
        results[index] = await worker(items[index], index);
      } catch (error) {
        results[index] = { error: (error && error.message) || 'error' };
      }
    }
  });
  await Promise.all(runners);
  return results;
}

export function safeDecodeEntities(text) {
  return String(text == null ? '' : text)
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&');
}
