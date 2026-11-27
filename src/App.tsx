import { useEffect, useRef, useState } from 'react';
import { computeAdaptations } from './adaptations';
import { Toast } from './components';
import { GameScreen } from './GameScreen';
import { t } from './i18n';
import { startAmbientMusic, stopAmbientMusic } from './music';
import { badgesForResult, todayString, useProgress } from './progress';
import { Home, Onboarding, ResultScreen, Settings } from './screens';
import { sfx } from './sound';
import type { Progress, SessionMode, SessionResult } from './types';

type Screen = 'home' | 'game' | 'result';
interface Session {
  mode: SessionMode;
  levelId: number | null;
  nodeKey?: string;
}

function scrollToTop() {
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || document.body.classList.contains('calm');
  window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
}

export default function App() {
  const { progress, setProgress, reset } = useProgress();
  const [screen, setScreen] = useState<Screen>('home');
  const [session, setSession] = useState<Session | null>(null);
  const [nonce, setNonce] = useState(0);
  const [result, setResult] = useState<SessionResult | null>(null);
  const [newBadges, setNewBadges] = useState<string[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number | null>(null);

  function showToast(text: string) {
    setToast(text);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2800);
  }

  useEffect(() => {
    const ad = computeAdaptations(progress);
    document.documentElement.lang = progress.uiLang === 'eu' ? 'eu' : 'es';
    document.body.dataset.route = progress.route;
    document.body.classList.toggle('dark', progress.darkMode);
    document.body.classList.toggle('big-text', progress.bigText);
    document.body.classList.toggle('hyperlegible', ad.hyperlegible);
    document.body.classList.toggle('calm', ad.calm);
    document.body.classList.toggle('big-targets', ad.bigTargets);
    document.body.classList.toggle('colorblind', ad.colorblind);
    document.title = `hitzbidaia · ${t('appSub', progress.uiLang)}`;
  }, [progress]);

  useEffect(() => {
    if (progress.music) startAmbientMusic();
    else stopAmbientMusic();
  }, [progress.music]);

  useEffect(() => {
    if (!progress.music) return;
    const resume = () => startAmbientMusic();
    window.addEventListener('pointerdown', resume, { once: true });
    window.addEventListener('keydown', resume, { once: true });
    return () => {
      window.removeEventListener('pointerdown', resume);
      window.removeEventListener('keydown', resume);
    };
  }, [progress.music]);

  useEffect(
    () => () => {
      stopAmbientMusic();
      if (toastTimer.current) window.clearTimeout(toastTimer.current);
    },
    [],
  );

  function start(levelId: number | null, modeOverride?: SessionMode, nodeKey?: string) {
    sfx('click', progress.sound);
    const resolvedMode: SessionMode = modeOverride ?? (levelId === null ? 'practice' : 'level');
    setSession({ mode: resolvedMode, levelId, nodeKey });
    setNonce((n) => n + 1);
    setScreen('game');
    scrollToTop();
  }

  function finishSession(res: SessionResult) {
    const earned = badgesForResult(progress, res);
    const today = todayString();
    const yesterday = todayString(-1);
    const accPct = res.total > 0 ? Math.round((res.correct / res.total) * 100) : 100;

    setProgress((prev) => {
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
        dailyXp: prev.dailyXp + res.xp,
        dailyLessons: prev.dailyLessons + 1,
        dailyHighAcc: Math.max(prev.dailyHighAcc, accPct),
        xpHistory: {
          ...prev.xpHistory,
          [today]: (prev.xpHistory[today] ?? 0) + res.xp,
        },
        stars,
        completed,
        legendary,
        nodeProgress,
        badges: [...prev.badges, ...earned.filter((id) => !prev.badges.includes(id))],
        streak,
        bestStreak: Math.max(prev.bestStreak, streak),
        lastPlayed: today,
        sessions: prev.sessions + 1,
        perfectSessions: prev.perfectSessions + (res.perfect ? 1 : 0),
        correctTotal: prev.correctTotal + res.correct,
      };
    });

    sfx(earned.length ? 'badge' : 'levelup', progress.sound);
    setNewBadges(earned);
    setResult(res);
    setScreen('result');
    scrollToTop();
  }

  function goHome() {
    setScreen('home');
    setSession(null);
    scrollToTop();
  }

  const content = !progress.onboarded ? (
    <Onboarding onDone={(patch: Partial<Progress>) => setProgress(patch)} />
  ) : (
    <div className={`app route-${progress.route}`}>
      {screen === 'home' && (
        <Home
          progress={progress}
          setProgress={setProgress}
          onStart={start}
          onToast={showToast}
          onSettings={() => setSettingsOpen(true)}
        />
      )}
      {screen === 'game' && session && (
        <GameScreen
          key={`${session.mode}-${session.levelId ?? 'free'}-${session.nodeKey ?? ''}-${nonce}`}
          progress={progress}
          setProgress={setProgress}
          mode={session.mode}
          levelId={session.levelId}
          nodeKey={session.nodeKey}
          onExit={goHome}
          onFinish={finishSession}
        />
      )}
      {screen === 'result' && result && (
        <ResultScreen
          progress={progress}
          result={result}
          newBadges={newBadges}
          onNext={(id) => start(id, 'level')}
          onRepeat={() => (session ? start(session.levelId, session.mode, session.nodeKey) : goHome())}
          onMap={goHome}
        />
      )}
      {settingsOpen && (
        <Settings
          progress={progress}
          setProgress={setProgress}
          onClose={() => setSettingsOpen(false)}
          onToast={showToast}
          onReset={() => {
            reset();
            setSettingsOpen(false);
            setSession(null);
            setResult(null);
            setScreen('home');
          }}
        />
      )}
    </div>
  );

  return (
    <>
      {content}
      {toast && <Toast text={toast} />}
    </>
  );
}
