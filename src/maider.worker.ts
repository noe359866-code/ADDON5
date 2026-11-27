import { loadVoice, synthesize, type LoadedVoice, type VoiceEntry } from 'phoonnx';
import { makeEspeakTokenizer } from 'phoonnx/espeak';
import espeakFactory from 'espeak-ng';
import espeakWasmUrl from 'espeak-ng/dist/espeak-ng.wasm?url';

const entry: VoiceEntry = {
  id: 'eu_ES-maider-medium', repo: 'rhasspy/piper-voices', voice: 'Maider',
  lang: 'eu-ES', langLabel: 'Euskara', phonemeType: 'espeak',
  onnx: 'eu/eu_ES/maider/medium/eu_ES-maider-medium.onnx',
  config: 'eu/eu_ES/maider/medium/eu_ES-maider-medium.onnx.json',
  piperConfig: null, espeakVoice: 'eu', sampleRate: 22050,
  sampleText: 'Kaixo! Ongi etorri!', haCompatible: true,
};
const tokenize = makeEspeakTokenizer(espeakFactory, espeakWasmUrl);
let voicePromise: Promise<LoadedVoice> | undefined;
let queue = Promise.resolve();
let latest = 0;
self.onmessage = (event: MessageEvent<{ id: number; text?: string; rate?: number; runtimeUrl?: string; cancel?: boolean }>) => {
  const { id, text, rate, runtimeUrl } = event.data;
  latest = id;
  if (event.data.cancel || text === undefined || rate === undefined || runtimeUrl === undefined) return;
  // Una única inferencia a la vez para no acumular modelos o saturar el móvil.
  queue = queue.then(async () => {
    try {
      voicePromise ??= loadVoice(entry, {
        wasmPaths: runtimeUrl, webgpu: false, numThreads: 1,
        onProgress: (fraction, label) => self.postMessage({ type: 'progress', id, fraction, label }),
      }).catch((error: unknown) => { voicePromise = undefined; throw error; });
      const voice = await voicePromise;
      if (id !== latest) { self.postMessage({ type: 'cancelled', id }); return; }
      const result = await synthesize(voice, text, {
        lengthScale: Math.max(0.8, Math.min(2, 0.88 / rate)),
        tokenize: (value, map) => tokenize(value, map, 'eu', { keepPunctuation: voice.keepPunctuation }),
      });
      const samples = new Float32Array(result.samples);
      self.postMessage({ type: 'audio', id, samples, sampleRate: result.sampleRate }, { transfer: [samples.buffer] });
    } catch (error) {
      self.postMessage({ type: 'error', id, message: error instanceof Error ? error.message : String(error) });
    }
  });
};
