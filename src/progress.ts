import { useCallback, useEffect, useState } from 'react';
import { levels } from './data';
import type { Progress, SessionResult } from './types';

const KEY = 'hitzbidaia.progress.v1';

export const defaultProgress: Progress = {
  onboarded: false,
  name: '',
  uiLang: 'es',
  learnLang: 'both',
  route: 'mixta',
  sound: true,
  music: false,
  bigText: false,
  unlockAll: false,
  supports: [],
  calmMode: false,
  xp: 0,
  stars: {},
  completed: {},
  badges: [],
  streak: 0,
  lastPlayed: '',
  sessions: 0,
  correctTotal: 0,
};

export function loadProgress(): Progress {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...defaultProgress };
    const parsed = JSON.parse(raw) as Partial<Progress>;
    return {
      ...defaultProgress,
      ...parsed,
      stars: { ...(parsed.stars ?? {}) },
      completed: { ...(parsed.completed ?? {}) },
      badges: Array.isArray(parsed.badges) ? parsed.badges : [],
      supports: Array.isArray(parsed.supports) ? parsed.supports : [],
    };
  } catch {
    return { ...defaultProgress };
  }
}

export function todayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
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
  if (result.mode === 'level' && result.levelId === 1 && result.stars >= 1) add('explorer');
  if (result.langsUsed.includes('es') && result.langsUsed.includes('eu')) add('bilingual');
  if (result.mode === 'level' && result.levelId === 6 && result.stars >= 1) add('storyteller');
  if (result.mode === 'level' && result.levelId === 7 && result.stars >= 1) add('counter');
  if (result.mode === 'level' && result.levelId === 8 && result.stars >= 1) add('mover');
  const allDone = levels.every((l) => (p.completed[l.id] ?? false) || (result.mode === 'level' && result.levelId === l.id && result.stars >= 1));
  if (allDone) add('master');
  return [...new Set(earned)];
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

  const reset = useCallback(() => setProgressState({ ...defaultProgress, stars: {}, completed: {}, badges: [] }), []);

  return { progress, setProgress, reset };
}
