import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { makeServiceWorker } from '../scripts/pwa.mjs';

const files = [{ path: 'index.html', content: 'shell' }, { path: 'assets/app.js', content: 'code' }];
function setup(fetchFn = async () => { throw new Error('offline'); }) {
  const events = {};
  const saved = new Map([['/index.html', 'página guardada'], ['/assets/app.js', 'script guardado']]);
  const removed = [];
  let precached = [];
  const cache = {
    addAll: async (paths) => { precached = paths; },
    match: async (request) => saved.get(typeof request === 'string' ? request : new URL(request.url).pathname),
    put: async (request, value) => { saved.set(new URL(request.url).pathname, value); },
  };
  const caches = { open: async () => cache, keys: async () => ['hitzbidaia-shell-old', 'phoonnx-voices'], delete: async (key) => { removed.push(key); } };
  const self = { location: { origin: 'https://example.org' }, addEventListener: (name, handler) => { events[name] = handler; } };
  vm.runInNewContext(makeServiceWorker(files), { self, caches, fetch: fetchFn, URL, Promise, Error });
  return { events, removed, getPrecached: () => precached };
}

test('la instalación guarda el HTML y los recursos y actualiza solo su propia caché', async () => {
  const sw = setup();
  let task;
  sw.events.install({ waitUntil: (p) => { task = p; } });
  await task;
  assert.deepEqual([...sw.getPrecached()], ['/assets/app.js', '/index.html']);
  sw.events.activate({ waitUntil: (p) => { task = p; } });
  await task;
  assert.deepEqual(sw.removed, ['hitzbidaia-shell-old']);
});

test('la navegación y recursos principales funcionan sin conexión', async () => {
  const sw = setup();
  let result;
  sw.events.fetch({ request: { method: 'GET', url: 'https://example.org/', mode: 'navigate' }, respondWith: (p) => { result = p; } });
  assert.equal(await result, 'página guardada');
  sw.events.fetch({ request: { method: 'GET', url: 'https://example.org/assets/app.js', mode: 'same-origin' }, respondWith: (p) => { result = p; } });
  assert.equal(await result, 'script guardado');
});

test('el service worker no intercepta datos ni servicios de terceros', () => {
  const sw = setup();
  for (const request of [
    { method: 'GET', url: 'https://other.org/model.onnx', mode: 'cors' },
    { method: 'POST', url: 'https://example.org/api', mode: 'cors' },
    { method: 'GET', url: 'https://example.org/api/private', mode: 'cors' },
  ]) {
    let intercepted = false;
    sw.events.fetch({ request, respondWith: () => { intercepted = true; } });
    assert.equal(intercepted, false);
  }
});

test('el identificador de caché cambia cuando cambia el contenido', () => {
  assert.notEqual(makeServiceWorker(files), makeServiceWorker([{ ...files[0], content: 'nuevo' }, files[1]]));
});
