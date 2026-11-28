import { useCallback, useEffect, useState } from 'react';
import { levels } from './data';
import type { Progress, SessionResult } from './types';

const KEY = 'hitzbidaia.progress.v1';

export function todayString(offsetDays = 0): string {
  const d = new Date();
  if (offsetDays !== 0) d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export const defaultProgress: Progress = {
  onboarded: false,
  name: '',
  joinedDate: todayString(),
  uiLang: 'es',
  learnLang: 'both',
  difficultyLevel: 'medio',
  schoolStage: 'prim12',
  readingPhase: 'alfabética',
  speechRate: 0.85,
  route: 'mixta',
  sound: true,
  music: false,
  darkMode: false,
  bigText: false,
  unlockAll: false,
  calmMode: false,

  xp: 0,
  gems: 500,
  // Vidas ilimitadas por defecto: en una app para peques que aprenden a leer,
  // bloquear el juego por fallar es contraproducente. Se puede desactivar en Ajustes.
  hearts: 5,
  unlimitedHearts: true,
  dailyGoal: 20,
  dailyXp: 0,
  dailyLessons: 0,
  dailyHighAcc: 0,
  dailyDate: todayString(),
  xpHistory: {},
  streak: 0,
  bestStreak: 0,
  streakFreezes: 1,
  frozenDates: [],
  doubleOrNothing: null,
  xpBoostUntil: 0,
  leagueId: 2,

  stars: {},
  completed: {},
  legendary: {},
  nodeProgress: {},
  chestsClaimed: [],
  questClaims: {},
  storiesRead: [],
  lettersMastered: [],
  mistakes: [],
  outfits: ['classic'],
  equippedOutfit: 'classic',

  badges: [],
  lastPlayed: '',
  sessions: 0,
  perfectSessions: 0,
  correctTotal: 0,
};

/**
 * Valida y completa un objeto de progreso (desde localStorage o desde un archivo
 * importado por familias/docentes). Nunca lanza: ante datos inválidos devuelve
 * el progreso por defecto.
 */
export function sanitizeProgress(rawParsed: unknown): Progress {
  const parsed = (rawParsed && typeof rawParsed === 'object' ? rawParsed : {}) as Partial<Progress>;
  const today = todayString();
  const isSameDay = parsed.dailyDate === today;
  return {
      ...defaultProgress,
      ...parsed,
      difficultyLevel:
        parsed.difficultyLevel === 'bajo' || parsed.difficultyLevel === 'medio' || parsed.difficultyLevel === 'alto'
          ? parsed.difficultyLevel
          : 'medio',
      // Los niveles antiguos «general» pasan a tener color (verde): la interfaz
      // ya solo habla de colores, pero se aceptan datos de versiones anteriores.
      schoolStage:
        parsed.schoolStage === 'infantil' ||
        parsed.schoolStage === 'prim12' ||
        parsed.schoolStage === 'prim34' ||
        parsed.schoolStage === 'prim56'
          ? parsed.schoolStage
          : 'prim12',
      readingPhase:
        parsed.readingPhase === 'fonologica' ||
        parsed.readingPhase === 'logográfica' ||
        parsed.readingPhase === 'alfabética' ||
        parsed.readingPhase === 'ortográfica'
          ? parsed.readingPhase
          : 'alfabética',
      speechRate:
        typeof parsed.speechRate === 'number' && Number.isFinite(parsed.speechRate)
          ? Math.max(0.4, Math.min(1.05, parsed.speechRate))
          : 0.85,
      learnLang:
        parsed.learnLang === 'es' || parsed.learnLang === 'eu' || parsed.learnLang === 'en' || parsed.learnLang === 'both'
          ? parsed.learnLang
          : 'both',
      joinedDate: parsed.joinedDate || today,
      dailyDate: today,
      dailyXp: isSameDay ? (parsed.dailyXp ?? 0) : 0,
      dailyLessons: isSameDay ? (parsed.dailyLessons ?? 0) : 0,
      dailyHighAcc: isSameDay ? (parsed.dailyHighAcc ?? 0) : 0,
      stars: { ...(parsed.stars ?? {}) },
      completed: { ...(parsed.completed ?? {}) },
      legendary: { ...(parsed.legendary ?? {}) },
      nodeProgress: { ...(parsed.nodeProgress ?? {}) },
      xpHistory: { ...(parsed.xpHistory ?? {}) },
      questClaims: isSameDay ? { ...(parsed.questClaims ?? {}) } : {},
      chestsClaimed: Array.isArray(parsed.chestsClaimed) ? parsed.chestsClaimed : [],
      storiesRead: Array.isArray(parsed.storiesRead) ? parsed.storiesRead : [],
      lettersMastered: Array.isArray(parsed.lettersMastered) ? parsed.lettersMastered : [],
      mistakes: Array.isArray(parsed.mistakes) ? parsed.mistakes : [],
      outfits: Array.isArray(parsed.outfits) && parsed.outfits.length ? parsed.outfits : ['classic'],
      frozenDates: Array.isArray(parsed.frozenDates) ? parsed.frozenDates : [],
      badges: Array.isArray(parsed.badges) ? parsed.badges : [],
    };
}

/**
 * Premia una lectura en voz alta terminada. Mantiene la racha diaria, el XP del
 * día y el histórico igual que una lección corta, sin tocar estrellas ni vidas.
 */
export function awardReadingXp(p: Progress, xp: number, gems = 5): Partial<Progress> {
  const today = todayString();
  const yesterday = todayString(-1);
  const gained = Math.max(0, Math.round(xp));
  let streak = p.streak;
  if (p.lastPlayed !== today) {
    streak = p.lastPlayed === yesterday ? p.streak + 1 : Math.max(1, p.streak);
  }
  return {
    xp: p.xp + gained,
    gems: p.gems + Math.max(0, gems),
    dailyXp: p.dailyXp + gained,
    dailyLessons: p.dailyLessons + 1,
    xpHistory: { ...p.xpHistory, [today]: (p.xpHistory[today] ?? 0) + gained },
    streak,
    bestStreak: Math.max(p.bestStreak, streak),
    lastPlayed: today,
  };
}

export function loadProgress(): Progress {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...defaultProgress };
    return sanitizeProgress(JSON.parse(raw) as Partial<Progress>);
  } catch {
    return { ...defaultProgress };
  }
}

/** Descarga el progreso como JSON (copia de seguridad para familias y docentes). */
export function downloadProgress(p: Progress): void {
  const payload = JSON.stringify({ app: 'hitzbidaia', version: 1, exportedAt: new Date().toISOString(), progress: p }, null, 2);
  const blob = new Blob([payload], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `hitzbidaia-progreso-${todayString()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Acepta únicamente copias completas de esta aplicación para evitar sobrescribir
 * el progreso actual con archivos incompletos o tipos incompatibles. */
export function parseImportedProgress(text: string): Progress | null {
  try {
    const payload: unknown = JSON.parse(text);
    if (!isRecord(payload) || payload.app !== 'hitzbidaia' || payload.version !== 1 || !isRecord(payload.progress)) return null;
    const candidate = payload.progress;
    for (const [key, defaultValue] of Object.entries(defaultProgress)) {
      const value = candidate[key];
      if (key === 'doubleOrNothing') {
        if (value !== null && (!isRecord(value) || typeof value.active !== 'boolean' || typeof value.startDate !== 'string')) return null;
      } else if (Array.isArray(defaultValue)) {
        if (!Array.isArray(value)) return null;
        if (key === 'mistakes') {
          if (!value.every((m: unknown) => isRecord(m) && typeof m.id === 'string' && typeof m.prompt === 'string' && typeof m.answer === 'string' && ['es', 'eu', 'en'].includes(String(m.lang)) && typeof m.levelId === 'number' && Number.isFinite(m.levelId) && typeof m.addedAt === 'string')) return null;
        } else if (!value.every((item: unknown) => typeof item === 'string')) return null;
      } else if (typeof defaultValue === 'object') {
        if (!isRecord(value)) return null;
        const booleanMap = ['completed', 'legendary', 'questClaims'].includes(key);
        if (!Object.values(value).every((item) => booleanMap ? typeof item === 'boolean' : typeof item === 'number' && Number.isFinite(item) && item >= 0)) return null;
      } else if (typeof value !== typeof defaultValue || (typeof value === 'number' && (!Number.isFinite(value) || value < 0))) return null;
    }
    const enums: Record<string, string[]> = {
      uiLang: ['es', 'eu'], learnLang: ['es', 'eu', 'en', 'both'],
      route: ['visual', 'auditivo', 'mixta'], difficultyLevel: ['bajo', 'medio', 'alto'],
      schoolStage: ['general', 'infantil', 'prim12', 'prim34', 'prim56'],
      readingPhase: ['fonologica', 'logográfica', 'alfabética', 'ortográfica'],
      equippedOutfit: ['classic', 'explorer', 'super', 'royal', 'cool'],
    };
    if (Object.entries(enums).some(([key, values]) => !values.includes(String(candidate[key])))) return null;
    if (!(candidate.outfits as unknown[]).every((item) => enums.equippedOutfit!.includes(String(item)))) return null;
    return sanitizeProgress(candidate);
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function isUnlocked(p: Progress, levelId: number): boolean {
  if (p.unlockAll || levelId <= 1) return true;
  return (p.stars[levelId - 1] ?? 0) >= 1 || !!p.completed[levelId - 1];
}

export function nextLevel(p: Progress): number {
  for (const level of levels) if (!p.completed[level.id] && isUnlocked(p, level.id)) return level.id;
  return levels.length;
}

export function readerLevel(xp: number): { level: number; into: number; pct: number } {
  const level = Math.floor(xp / 120) + 1;
  const into = xp % 120;
  return { level, into, pct: Math.round((into / 120) * 100) };
}

export function starsFor(result: { total: number; correct: number }): number {
  if (result.total === 0) return 0;
  const ratio = result.correct / result.total;
  if (ratio >= 0.99) return 3;
  if (ratio >= 0.7) return 2;
  if (ratio >= 0.5) return 1;
  return 0;
}

export function badgesForResult(p: Progress, result: SessionResult): string[] {
  const earned: string[] = [];
  const add = (id: string) => {
    if (!p.badges.includes(id)) earned.push(id);
  };
  if (result.correct > 0) add('first');
  if (result.audioStreak >= 5) add('ear');
  if (result.visualStreak >= 5) add('eye');
  if (result.maxStreak >= 5) add('streak5');
  if ((result.mode === 'level' || result.mode === 'legendary') && result.levelId === 1 && result.stars >= 1) add('explorer');
  if (result.langsUsed.includes('es') && result.langsUsed.includes('eu')) add('bilingual');
  if ((result.mode === 'level' || result.mode === 'legendary') && result.levelId === 6 && result.stars >= 1) add('storyteller');
  if (result.levelId === 7 && result.stars >= 1) add('counter');
  if (result.levelId === 8 && result.stars >= 1) add('mover');
  const allDone = levels.every(
    (l) =>
      (p.completed[l.id] ?? false) ||
      ((result.mode === 'level' || result.mode === 'legendary') && result.levelId === l.id && result.stars >= 1),
  );
  if (allDone) add('master');
  return [...new Set(earned)];
}

export interface WeekDayStat {
  date: string;
  labelEs: string;
  labelEu: string;
  xp: number;
  done: boolean;
  frozen: boolean;
  isToday: boolean;
}

/** Devuelve los últimos 7 días (o la semana actual L-D) para el calendario de racha y gráfica de XP. */
export function getRecentWeekStats(p: Progress): WeekDayStat[] {
  const namesEs = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
  const namesEu = ['I', 'A', 'A', 'A', 'O', 'O', 'L'];
  const today = todayString();
  const out: WeekDayStat[] = [];
  for (let i = -6; i <= 0; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const dow = d.getDay();
    const xp = p.xpHistory[key] ?? (key === today ? p.dailyXp : 0);
    const frozen = p.frozenDates.includes(key);
    out.push({
      date: key,
      labelEs: namesEs[dow]!,
      labelEu: namesEu[dow]!,
      xp,
      done: xp > 0 || (key === p.lastPlayed && p.streak > 0),
      frozen,
      isToday: key === today,
    });
  }
  return out;
}

export function isXpBoostActive(p: Progress): boolean {
  return p.xpBoostUntil > Date.now();
}

export function xpBoostMinutesLeft(p: Progress): number {
  const diff = p.xpBoostUntil - Date.now();
  return diff > 0 ? Math.ceil(diff / 60000) : 0;
}

export function useProgress() {
  const [progress, setProgressState] = useState<Progress>(loadProgress);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(progress));
    } catch {
      /* almacenamiento no disponible: la sesión sigue siendo jugable */
    }
  }, [progress]);

  const setProgress = useCallback((patch: Partial<Progress> | ((prev: Progress) => Partial<Progress>)) => {
    setProgressState((prev) => {
      const next = typeof patch === 'function' ? patch(prev) : patch;
      return { ...prev, ...next };
    });
  }, []);

  const reset = useCallback(
    () =>
      setProgressState({
        ...defaultProgress,
        joinedDate: todayString(),
        dailyDate: todayString(),
        stars: {},
        completed: {},
        legendary: {},
        nodeProgress: {},
        xpHistory: {},
        questClaims: {},
        chestsClaimed: [],
        storiesRead: [],
        lettersMastered: [],
        mistakes: [],
        outfits: ['classic'],
        frozenDates: [],
        badges: [],
      }),
    [],
  );

  return { progress, setProgress, reset };
}
