import { createHash } from 'node:crypto';

/** Genera un service worker versionado por el contenido de la versión construida. */
export function makeServiceWorker(files) {
  const entries = [...files].sort((a, b) => a.path.localeCompare(b.path));
  const hash = createHash('sha256');
  for (const item of entries) hash.update(item.path).update(item.content);
  const version = hash.digest('hex').slice(0, 16);
  const urls = entries.map((item) => `/${item.path}`);
  return `// Generado durante la compilación; solo almacena recursos de la aplicación.
const CACHE = 'hitzbidaia-shell-${version}';
const PREFIX = 'hitzbidaia-shell-';
const FILES = ${JSON.stringify(urls)};
self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(FILES)));
});
self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith(PREFIX) && key !== CACHE).map((key) => caches.delete(key)))));
});
self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).then((response) => {
      if (!response.ok) throw new Error('navigation failed');
      return response;
    }).catch(async () => (await caches.open(CACHE)).match('/index.html')));
    return;
  }
  // No interceptar datos de usuario, APIs ni descargas de terceros.
  if (!url.pathname.startsWith('/assets/') && !url.pathname.startsWith('/voice-runtime/') && !FILES.includes(url.pathname)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const hit = await cache.match(request);
    if (hit) return hit;
    const response = await fetch(request);
    if (response.ok && response.type !== 'opaque') {
      try { await cache.put(request, response.clone()); } catch { /* sin espacio: sigue funcionando en línea */ }
    }
    return response;
  })());
});
`;
}
