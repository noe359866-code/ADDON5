import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';

const bundle = await build({ entryPoints: ['src/maider.ts'], bundle: true, platform: 'node', format: 'esm', write: false });
const voice = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
let instance;
class FakeWorker {
  messages = [];
  constructor() { instance = this; }
  postMessage(message) { this.messages.push(message); }
  emit(data) { this.onmessage({ data }); }
  terminate() {}
}
const store = new Map();
const NativeURL = globalThis.URL;
globalThis.URL = class extends NativeURL { constructor(path, base) { super(path, String(base).startsWith('data:') ? 'https://example.org/' : base); } };
globalThis.Worker = FakeWorker;
globalThis.localStorage = { setItem: (k, v) => store.set(k, v), getItem: (k) => store.get(k) ?? null };
globalThis.document = { baseURI: 'https://example.org/' };
globalThis.window = {};

test('descarga opcional, estado y cancelación de la voz local', async () => {
  voice.setMaiderEnabled(true);
  const request = instance.messages.at(-1);
  assert.equal(request.text, 'Kaixo! Ongi etorri!');
  assert.equal(request.runtimeUrl, 'https://example.org/voice-runtime/');
  instance.emit({ type: 'progress', id: request.id, fraction: 0.5 });
  assert.equal(voice.getMaiderState().progress, 50);
  voice.cancelMaider();
  instance.emit({ type: 'cancelled', id: request.id });
  voice.setMaiderEnabled(false);
  assert.equal(voice.getMaiderState().status, 'off');
  assert.equal(store.get('hitzbidaia.maider.v1'), 'false');
});

test('el fallo de descarga es visible y permite reintentar', async () => {
  voice.setMaiderEnabled(true);
  const request = instance.messages.at(-1);
  instance.emit({ type: 'error', id: request.id, message: 'sin conexión' });
  await Promise.resolve();
  assert.equal(voice.getMaiderState().status, 'error');
  voice.setMaiderEnabled(true);
  assert.equal(voice.getMaiderState().status, 'loading');
  voice.setMaiderEnabled(false);
});
