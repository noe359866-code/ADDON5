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
  route: 'mixta',
  sound: true,
  music: false,
  darkMode: false,
  bigText: false,
  unlockAll: false,
  supports: [],
  calmMode: false,

  xp: 0,
  gems: 500,
  hearts: 5,
  unlimitedHearts: false,
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

export function loadProgress(): Progress {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...defaultProgress };
    const parsed = JSON.parse(raw) as Partial<Progress>;
    const today = todayString();
    const isSameDay = parsed.dailyDate === today;
    return {
      ...defaultProgress,
      ...parsed,
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
      supports: Array.isArray(parsed.supports) ? parsed.supports : [],
    };
  } catch {
    return { ...defaultProgress };
  }
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
