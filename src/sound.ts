import type { Lang } from './types';

let ctx: AudioContext | null = null;

export function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!ctx) ctx = new Ctor();
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

function note(freq: number, start: number, duration: number, volume: number, type: OscillatorType = 'sine') {
  const ac = getAudioContext();
  if (!ac) return;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ac.currentTime + start);
  gain.gain.setValueAtTime(0.0001, ac.currentTime + start);
  gain.gain.exponentialRampToValueAtTime(volume, ac.currentTime + start + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + start + duration);
  osc.connect(gain);
  gain.connect(ac.destination);
  osc.start(ac.currentTime + start);
  osc.stop(ac.currentTime + start + duration + 0.02);
}

function quackPulse(start: number, baseFreq: number, duration: number) {
  const ac = getAudioContext();
  if (!ac) return;
  const now = ac.currentTime + start;
  const osc = ac.createOscillator();
  const filter = ac.createBiquadFilter();
  const gain = ac.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(baseFreq * 1.15, now);
  osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.72, now + duration);
  filter.type = 'bandpass';
  filter.Q.value = 3.2;
  filter.frequency.setValueAtTime(1450, now);
  filter.frequency.exponentialRampToValueAtTime(760, now + duration);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.06, now + 0.018);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  osc.connect(filter);
  filter.connect(gain);
  gain.connect(ac.destination);
  osc.start(now);
  osc.stop(now + duration + 0.02);
}

export type Sfx = 'click' | 'correct' | 'wrong' | 'star' | 'badge' | 'pop' | 'combo' | 'levelup' | 'quack';

export function sfx(kind: Sfx, enabled = true) {
  if (!enabled) return;
  try {
    switch (kind) {
      case 'click':
        note(520, 0, 0.07, 0.05, 'triangle');
        break;
      case 'pop':
        note(680, 0, 0.09, 0.06, 'sine');
        note(880, 0.05, 0.09, 0.04, 'sine');
        break;
      case 'quack':
        quackPulse(0, 440, 0.11);
        quackPulse(0.13, 500, 0.12);
        break;
      case 'correct':
        [523.25, 659.25, 783.99].forEach((f, i) => note(f, i * 0.085, 0.22, 0.07, 'sine'));
        break;
      case 'wrong':
        note(300, 0, 0.16, 0.05, 'triangle');
        note(240, 0.12, 0.2, 0.045, 'triangle');
        break;
      case 'star':
        [659.25, 830.61, 987.77, 1318.5].forEach((f, i) => note(f, i * 0.07, 0.3, 0.06, 'sine'));
        break;
      case 'badge':
        [392, 523.25, 659.25, 1046.5].forEach((f, i) => note(f, i * 0.1, 0.35, 0.06, 'triangle'));
        break;
      case 'combo':
        [659.25, 880, 1174.66].forEach((f, i) => note(f, i * 0.06, 0.18, 0.055, 'triangle'));
        break;
      case 'levelup':
        [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => note(f, i * 0.09, 0.32, 0.055, 'sine'));
        break;
    }
  } catch {
    /* El navegador puede bloquear el audio: la app sigue funcionando igual. */
  }
}

function voiceScore(v: SpeechSynthesisVoice, lang: Lang): number {
  let score = 0;
  const name = v.name.toLowerCase();
  const vLang = v.lang.toLowerCase();
  if (lang === 'eu' && vLang.startsWith('eu')) score += 20;
  if (lang === 'es' && (vLang === 'es-es' || vLang === 'es_es')) score += 10;
  if (name.includes('natural') || name.includes('neural') || name.includes('online')) score += 15;
  if (name.includes('google') || name.includes('microsoft') || name.includes('apple')) score += 8;
  if (!v.localService) score += 4;
  return score;
}

export function voicesFor(lang: Lang): SpeechSynthesisVoice[] {
  if (typeof window === 'undefined' || !window.speechSynthesis) return [];
  const all = window.speechSynthesis.getVoices();
  const tag = lang === 'eu' ? 'eu' : 'es';
  return all
    .filter((v) => v.lang.toLowerCase().startsWith(tag))
    .sort((a, b) => voiceScore(b, lang) - voiceScore(a, lang));
}

export function stopSpeaking() {
  if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.cancel();
}

/** Lee un texto en voz alta. Si no hay voz en euskera, usa una voz en español. */
export function speak(text: string, lang: Lang, enabled = true, rate = 0.88): void {
  if (!enabled) return;
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  stopSpeaking();
  const utter = new SpeechSynthesisUtterance(text);
  const own = voicesFor(lang);
  const fallback = lang === 'eu' ? voicesFor('es') : [];
  const voice = own[0] ?? fallback[0] ?? null;
  if (voice) {
    utter.voice = voice;
    utter.lang = voice.lang;
  } else {
    utter.lang = lang === 'eu' ? 'eu-ES' : 'es-ES';
  }
  utter.rate = rate;
  utter.pitch = 1.05;
  utter.volume = 1;
  // Algunos navegadores necesitan un pequeño retardo tras cancel().
  window.setTimeout(() => {
    try {
      window.speechSynthesis.speak(utter);
    } catch {
      /* sin voz disponible */
    }
  }, 60);
}
