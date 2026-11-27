import { getAudioContext } from './sound';

/**
 * Música ambiental relajante generada con Web Audio.
 * No descarga archivos, no usa voces y no depende de servicios externos.
 * Los navegadores bloquean el autoplay: se inicia desde un gesto del usuario
 * o se reanuda en la primera interacción si el ajuste ya estaba activo.
 */

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let filter: BiquadFilterNode | null = null;
let timer: number | null = null;
let running = false;
let step = 0;

const chords: number[][] = [
  [261.63, 329.63, 392.0], // Do mayor
  [293.66, 349.23, 440.0], // Re menor
  [261.63, 329.63, 392.0], // Do mayor
  [246.94, 293.66, 392.0], // Sol
];

function ensureChain(ac: AudioContext): GainNode {
  if (master && filter) return master;
  master = ac.createGain();
  master.gain.value = 0.0001;
  filter = ac.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 1100;
  filter.Q.value = 0.4;
  master.connect(filter);
  filter.connect(ac.destination);
  return master;
}

function softNote(ac: AudioContext, out: GainNode, freq: number, at: number, duration: number, volume: number) {
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq, at);
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(volume, at + 0.45);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
  osc.connect(gain);
  gain.connect(out);
  osc.start(at);
  osc.stop(at + duration + 0.1);
}

function playPhrase() {
  const ac = ctx;
  if (!ac || !running || !master) return;
  const out = master;
  const chord = chords[step % chords.length]!;
  const now = ac.currentTime + 0.05;
  chord.forEach((freq, i) => softNote(ac, out, freq, now + i * 0.12, 2.8, 0.018));
  // Una nota aguda y muy suave aporta movimiento sin estridencia.
  softNote(ac, out, chord[2]! * 2, now + 0.65, 1.9, 0.008);
  step += 1;
}

export function startAmbientMusic(): void {
  try {
    const ac = getAudioContext();
    if (!ac) return;
    ctx = ac;
    if (ac.state === 'suspended') void ac.resume();
    const out = ensureChain(ac);
    if (running) {
      out.gain.cancelScheduledValues(ac.currentTime);
      out.gain.setValueAtTime(Math.max(out.gain.value, 0.0001), ac.currentTime);
      out.gain.linearRampToValueAtTime(0.05, ac.currentTime + 0.8);
      return;
    }
    running = true;
    step = 0;
    out.gain.cancelScheduledValues(ac.currentTime);
    out.gain.setValueAtTime(Math.max(out.gain.value, 0.0001), ac.currentTime);
    out.gain.linearRampToValueAtTime(0.05, ac.currentTime + 1.4);
    playPhrase();
    timer = window.setInterval(playPhrase, 2600);
  } catch {
    /* Audio no disponible: la app sigue funcionando sin música. */
  }
}

export function stopAmbientMusic(): void {
  try {
    running = false;
    if (timer !== null) {
      window.clearInterval(timer);
      timer = null;
    }
    const ac = ctx;
    if (!ac || !master) return;
    master.gain.cancelScheduledValues(ac.currentTime);
    master.gain.setValueAtTime(Math.max(master.gain.value, 0.0001), ac.currentTime);
    master.gain.linearRampToValueAtTime(0.0001, ac.currentTime + 0.6);
  } catch {
    /* sin contexto de audio */
  }
}
