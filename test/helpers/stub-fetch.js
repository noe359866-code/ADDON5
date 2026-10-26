/**
 * test/helpers/stub-fetch.js — Sustituye `fetch` por respuestas fijas.
 *
 * Los tests nunca salen a internet: cada URL pedida se busca por prefijo en
 * el mapa de rutas y se devuelve ese HTML/JSON. El proxy de video usa el
 * mismo `fetch`, así que también se puede probar sin red.
 */

export function installFetchStub(routes) {
  const original = globalThis.fetch;
  const calls = [];

  globalThis.fetch = async (input, init = {}) => {
    const url = typeof input === 'string' ? input : String(input && input.url);
    calls.push({ url, method: init.method || 'GET', headers: init.headers || {} });

    // Gana el prefijo MÁS LARGO: /ver/serie/ no debe tapar a /ver/serie/2x01/.
    const key = Object.keys(routes)
      .filter((prefix) => url.startsWith(prefix))
      .sort((a, b) => b.length - a.length)[0];
    if (!key) return new Response('no encontrado en el stub', { status: 404 });

    const route = routes[key];
    const value = typeof route === 'function' ? await route(url, init) : route;

    if (value instanceof Response) return value;
    if (value && typeof value === 'object' && 'body' in value) {
      return new Response(value.body, {
        status: value.status || 200,
        headers: value.headers || {}
      });
    }
    return new Response(String(value), {
      status: 200,
      headers: { 'content-type': 'text/html; charset=utf-8' }
    });
  };

  return {
    calls,
    /** fetch real, para llamar al servidor de prueba sin pasar por el stub */
    fetch: original,
    restore() {
      globalThis.fetch = original;
    }
  };
}

export function jsonRoute(payload) {
  return { body: JSON.stringify(payload), headers: { 'content-type': 'application/json' } };
}
