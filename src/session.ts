import { todayString } from './progress';
import type { Progress, SessionResult } from './types';

/**
 * Aplica el resultado de una sesión al progreso (función pura, sin React ni
 * localStorage). Extraída de `App.finishSession` para poder probarla.
 *
 * Devuelve un parche parcial de progreso; el llamador lo fusiona con el
 * progreso actual (setProgress hace `{ ...prev, ...patch }`).
 *
 * Nota: los contadores diarios (`dailyXp`, `dailyLessons`, `dailyHighAcc`) se
 * reinician cuando cambia el día, igual que hace `sanitizeProgress` al cargar.
 */
export function applySessionResult(
  prev: Progress,
  res: SessionResult,
  earnedBadges: string[],
  today: string = todayString(),
  yesterday: string = todayString(-1),
): Partial<Progress> {
  const sameDay = prev.dailyDate === today;
  const accPct = res.total > 0 ? Math.round((res.correct / res.total) * 100) : 100;

  const stars = { ...prev.stars };
  const completed = { ...prev.completed };
  const legendary = { ...prev.legendary };
  const nodeProgress = { ...prev.nodeProgress };

  if (res.nodeKey) {
    nodeProgress[res.nodeKey] = (nodeProgress[res.nodeKey] ?? 0) + 1;
  }

  if ((res.mode === 'level' || res.mode === 'legendary') && res.levelId && res.stars > 0) {
    stars[res.levelId] = Math.max(stars[res.levelId] ?? 0, res.stars);
    const n0 = nodeProgress[`u${res.levelId}-n0`] ?? 0;
    const n1 = nodeProgress[`u${res.levelId}-n1`] ?? 0;
    const n3 = nodeProgress[`u${res.levelId}-n3`] ?? 0;
    const isUnit2Complete =
      res.levelId === 2 &&
      (!res.nodeKey || res.nodeKey.endsWith('-n5') || (n0 >= 1 && n1 >= 1 && n3 >= 1));
    const isStandardComplete =
      res.levelId !== 2 &&
      (!res.nodeKey || res.nodeKey.endsWith('-n4') || (n0 >= 1 && n1 >= 1));
    if (isUnit2Complete || isStandardComplete || res.levelId >= 7) {
      completed[res.levelId] = true;
    }
    if (res.mode === 'legendary' && res.stars >= 2) {
      legendary[res.levelId] = true;
      completed[res.levelId] = true;
    }
  }

  let streak = prev.streak;
  if (prev.lastPlayed !== today) {
    streak = prev.lastPlayed === yesterday ? prev.streak + 1 : 1;
  }

  const nextHearts = Math.min(5, prev.hearts + (res.heartsRestored ?? 0));
  return {
    xp: prev.xp + res.xp,
    gems: prev.gems + res.gemsEarned,
    hearts: nextHearts,
    dailyDate: today,
    dailyXp: (sameDay ? prev.dailyXp : 0) + res.xp,
    dailyLessons: (sameDay ? prev.dailyLessons : 0) + 1,
    dailyHighAcc: Math.max(sameDay ? prev.dailyHighAcc : 0, accPct),
    xpHistory: {
      ...prev.xpHistory,
      [today]: (prev.xpHistory[today] ?? 0) + res.xp,
    },
    stars,
    completed,
    legendary,
    nodeProgress,
    badges: [...prev.badges, ...earnedBadges.filter((id) => !prev.badges.includes(id))],
    streak,
    bestStreak: Math.max(prev.bestStreak, streak),
    lastPlayed: today,
    sessions: prev.sessions + 1,
    perfectSessions: prev.perfectSessions + (res.perfect ? 1 : 0),
    correctTotal: prev.correctTotal + res.correct,
  };
}
