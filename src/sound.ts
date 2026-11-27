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
  if (lang === 'en' && (vLang === 'en-gb' || vLang === 'en_gb' || vLang === 'en-us' || vLang === 'en_us')) score += 12;
  if (name.includes('natural') || name.includes('neural') || name.includes('online')) score += 15;
  if (name.includes('google') || name.includes('microsoft') || name.includes('apple')) score += 8;
  if (!v.localService) score += 4;
  return score;
}

export function voicesFor(lang: Lang): SpeechSynthesisVoice[] {
  if (typeof window === 'undefined' || !window.speechSynthesis) return [];
  const all = window.speechSynthesis.getVoices();
  const tag = lang === 'eu' ? 'eu' : lang === 'en' ? 'en' : 'es';
  return all
    .filter((v) => v.lang.toLowerCase().startsWith(tag))
    .sort((a, b) => voiceScore(b, lang) - voiceScore(a, lang));
}

export function stopSpeaking() {
  if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.cancel();
}

/**
 * En euskera batua la «h» es muda (no se pronuncia):
 * p. ej. hori → ori, hiru → iru, haur → aur, handi → andi, harri → arri,
 * haize → aize, mahai → maai, bihotz → biotz, ahate → aate, ohe → oe, behi → bei, zuhaitz → zuaitz.
 * Se conserva únicamente el dígrafo palatal «nh» / «lh» si apareciera, aunque todas las «h»
 * solas en inicio o interior de palabra se silencian antes de enviar el texto al sintetizador TTS.
 */
export function phoneticBasqueText(text: string): string {
  return text.replace(/([A-Za-zÁÉÍÓÚÜÑáéíóúüñ]*)/g, (word) => {
    if (!word) return word;
    if (/^[hH]$/.test(word)) return 'hatxe';
    let out = '';
    for (let i = 0; i < word.length; i++) {
      const ch = word[i]!;
      if (ch === 'h' || ch === 'H') {
        const prev = i > 0 ? word[i - 1]!.toLowerCase() : '';
        // En préstamos ocasionales con «ch» o «sh» no se elimina; en toda palabra vasca (tx, tz, ts, h inicial o intervocálica) la h es muda
        if (prev === 'c' || prev === 's') {
          out += ch;
        }
        continue;
      }
      out += ch;
    }
    return out;
  });
}

/**
 * Prepara el texto que se envía al motor de voz según el idioma y la velocidad:
 * - En euskera silencia la «h» muda.
 * - Cuando la velocidad es lenta (<= 0.72) y se proporcionan las sílabas, marca
 *   pausas claras sílaba a sílaba (y después pronuncia la palabra completa) para
 *   ayudar a diferenciar cada golpe de voz al aprender a leer.
 */
export function prepareSpeechText(text: string, lang: Lang, syllables?: string[], rate = 0.88): string {
  let base = text;
  if (syllables && syllables.length >= 2 && rate <= 0.72) {
    const marked = syllables.join(', ');
    base = `${marked}. ${text}`;
  }
  if (lang === 'eu') return phoneticBasqueText(base);
  return base;
}

/** Lee un texto en voz alta. En euskera silencia la «h» muda; si rate es lento marca sílabas. */
export function speak(text: string, lang: Lang, enabled = true, rate = 0.88, syllables?: string[]): void {
  if (!enabled) return;
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  stopSpeaking();
  const clampedRate = Math.min(1.15, Math.max(0.35, rate));
  const spokenText = prepareSpeechText(text, lang, syllables, clampedRate);
  const utter = new SpeechSynthesisUtterance(spokenText);
  const own = voicesFor(lang);
  const fallback = lang === 'eu' ? voicesFor('es') : [];
  const voice = own[0] ?? fallback[0] ?? null;
  if (voice) {
    utter.voice = voice;
    utter.lang = voice.lang;
  } else {
    utter.lang = lang === 'eu' ? 'eu-ES' : lang === 'en' ? 'en-US' : 'es-ES';
  }
  utter.rate = clampedRate;
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

/* ================================================================== */
/* Reconocimiento de voz con micrófono (Web Speech API)                */
/* ================================================================== */

interface SpeechRecognitionAlternativeLike {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionResultLike {
  length: number;
  [index: number]: SpeechRecognitionAlternativeLike;
}

interface SpeechRecognitionEventLike {
  results: {
    length: number;
    [index: number]: SpeechRecognitionResultLike;
  };
}

interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  continuous: boolean;
  onresult: ((ev: SpeechRecognitionEventLike) => void) | null;
  onerror: ((ev: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function isSpeechRecognitionSupported(): boolean {
  return getSpeechRecognitionCtor() !== null;
}

function cleanSpeechCompare(s: string, lang: Lang): string {
  const base = lang === 'eu' ? phoneticBasqueText(s) : s;
  return base
    .toLowerCase()
    .replace(/ñ/g, '\u0001')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\u0001/g, 'ñ')
    .replace(/[^a-z0-9ñ\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function editDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i]![0] = i;
  for (let j = 0; j <= n; j++) dp[0]![j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i]![j] = Math.min(dp[i - 1]![j]! + 1, dp[i]![j - 1]! + 1, dp[i - 1]![j - 1]! + cost);
    }
  }
  return dp[m]![n]!;
}

/**
 * Compara lo que el niño o niña ha pronunciado en el micrófono con la palabra o frase objetivo.
 * Tolera artículos iniciales, repetición de sílabas y pequeñas variaciones de pronunciación infantil.
 */
export function matchesSpokenTarget(heardList: string[], target: string, lang: Lang): { ok: boolean; bestHeard: string } {
  const normTarget = cleanSpeechCompare(target, lang);
  const firstHeard = heardList[0]?.trim() ?? '';
  if (!normTarget) return { ok: false, bestHeard: firstHeard };

  for (const raw of heardList) {
    const normHeard = cleanSpeechCompare(raw, lang);
    if (!normHeard) continue;
    if (normHeard === normTarget) return { ok: true, bestHeard: raw };
    const heardNoSpaces = normHeard.replace(/\s+/g, '');
    const targetNoSpaces = normTarget.replace(/\s+/g, '');
    if (heardNoSpaces === targetNoSpaces) return { ok: true, bestHeard: raw };
    // Si la palabra pronunciada aparece dentro de una frase corta ("el gato" para "gato")
    const heardWords = normHeard.split(' ');
    if (normTarget.indexOf(' ') === -1 && heardWords.includes(normTarget)) {
      return { ok: true, bestHeard: raw };
    }
    // Tolerancia suave de 1 letra en palabras de 4+ letras o 2 letras en palabras/frases de 7+ letras
    const dist = editDistance(heardNoSpaces, targetNoSpaces);
    const maxDist = targetNoSpaces.length >= 7 ? 2 : targetNoSpaces.length >= 4 ? 1 : 0;
    if (dist <= maxDist) return { ok: true, bestHeard: raw };
  }
  return { ok: false, bestHeard: firstHeard };
}

/** Activa el micrófono y escucha una palabra o frase para comprobar la pronunciación. */
export function listenOnceFromMic(
  lang: Lang,
  callbacks: {
    onResult: (transcripts: string[]) => void;
    onError: (errorCode: string) => void;
    onEnd?: () => void;
  },
): (() => void) | null {
  const Ctor = getSpeechRecognitionCtor();
  if (!Ctor) {
    callbacks.onError('unsupported');
    return null;
  }
  stopSpeaking();
  const rec = new Ctor();
  rec.lang = lang === 'eu' ? 'eu-ES' : lang === 'en' ? 'en-US' : 'es-ES';
  rec.interimResults = false;
  rec.maxAlternatives = 5;
  rec.continuous = false;

  let finished = false;
  rec.onresult = (ev) => {
    finished = true;
    const transcripts: string[] = [];
    for (let i = 0; i < ev.results.length; i++) {
      const res = ev.results[i];
      if (!res) continue;
      for (let j = 0; j < res.length; j++) {
        const alt = res[j];
        if (alt?.transcript) transcripts.push(alt.transcript);
      }
    }
    callbacks.onResult(transcripts);
  };
  rec.onerror = (ev) => {
    finished = true;
    callbacks.onError(ev.error || 'mic-error');
  };
  rec.onend = () => {
    if (!finished) callbacks.onError('no-speech');
    callbacks.onEnd?.();
  };

  try {
    rec.start();
  } catch {
    callbacks.onError('start-failed');
    return null;
  }

  return () => {
    try {
      rec.stop();
    } catch {
      /* ya detenido */
    }
  };
}
