import { getAudioContext } from './sound';

export type MaiderStatus = 'off' | 'loading' | 'ready' | 'error';
export interface MaiderState { status: MaiderStatus; progress: number; enabled: boolean }
const KEY = 'hitzbidaia.maider.v1';
let enabled = false;
try { enabled = typeof localStorage !== 'undefined' && localStorage.getItem(KEY) === 'true'; } catch { /* opcional */ }
let state: MaiderState = { status: enabled ? 'loading' : 'off', progress: 0, enabled };
let worker: Worker | null = null;
let active: AudioBufferSourceNode | null = null;
let serial = 0;
const listeners = new Set<(state: MaiderState) => void>();
const callbacks = new Map<number, { resolve: () => void; reject: (error: Error) => void }>();

function update(patch: Partial<MaiderState>) {
  state = { ...state, ...patch };
  listeners.forEach((listener) => listener(state));
}
export function getMaiderState(): MaiderState { return state; }
export function subscribeMaider(listener: (state: MaiderState) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
function ensureWorker(): Worker {
  if (worker) return worker;
  worker = new Worker(new URL('./maider.worker.ts', import.meta.url), { type: 'module' });
  worker.onmessage = (event) => {
    const data = event.data;
    if (data.type === 'progress') {
      if (state.enabled) update({ status: 'loading', progress: Math.round((data.fraction || 0) * 100) });
      return;
    }
    const callback = callbacks.get(data.id);
    callbacks.delete(data.id);
    if (!callback) return;
    if (data.type === 'cancelled') { callback.resolve(); return; }
    if (data.type === 'error') {
      if (state.enabled && data.id === serial) update({ status: 'error' });
      callback.reject(new Error(data.message));
      return;
    }
    if (state.enabled) update({ status: 'ready', progress: 100 });
    if (data.id === serial && state.enabled) {
      try {
        const context = getAudioContext();
        if (!context) throw new Error('Audio no disponible');
        const buffer = context.createBuffer(1, data.samples.length, data.sampleRate);
        buffer.copyToChannel(data.samples, 0);
        const source = context.createBufferSource();
        source.buffer = buffer;
        source.connect(context.destination);
        source.onended = () => { if (active === source) active = null; };
        active = source;
        source.start();
      } catch (error) { callback.reject(error instanceof Error ? error : new Error(String(error))); return; }
    }
    callback.resolve();
  };
  worker.onerror = () => {
    worker?.terminate(); worker = null;
    if (state.enabled) update({ status: 'error' });
    callbacks.forEach(({ reject }) => reject(new Error('No se pudo iniciar la voz')));
    callbacks.clear();
  };
  return worker;
}
export function cancelMaider(): void {
  serial++;
  worker?.postMessage({ id: serial, cancel: true });
  if (active) { try { active.stop(); } catch { /* ya terminó */ } active = null; }
}
export function setMaiderEnabled(value: boolean): void {
  cancelMaider();
  enabled = value;
  try { localStorage.setItem(KEY, String(value)); } catch { /* la preferencia dura la sesión */ }
  update({ enabled: value, status: value ? 'loading' : 'off', progress: 0 });
  if (!value) {
    // Detiene descargas e inferencias y libera memoria en dispositivos pequeños.
    worker?.terminate();
    worker = null;
    callbacks.forEach(({ resolve }) => resolve());
    callbacks.clear();
  }
  if (value) {
    // Inicializar AudioContext durante el gesto del usuario para móviles.
    getAudioContext();
    void speakMaider('Kaixo! Ongi etorri!', 0.88).catch(() => {});
  }
}
export function speakMaider(text: string, rate: number): Promise<void> {
  if (!state.enabled) return Promise.reject(new Error('Voz desactivada'));
  const id = ++serial;
  return new Promise((resolve, reject) => {
    callbacks.set(id, { resolve, reject });
    try {
      ensureWorker().postMessage({ id, text, rate, runtimeUrl: new URL('voice-runtime/', document.baseURI).href });
    } catch (error) {
      callbacks.delete(id); update({ status: 'error' });
      reject(error instanceof Error ? error : new Error(String(error)));
    }
  });
}
