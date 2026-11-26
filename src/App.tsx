import { useEffect, useRef, useState } from 'react';
import { Toast } from './components';
import { GameScreen } from './GameScreen';
import { t } from './i18n';
import { badgesForResult, todayString, useProgress } from './progress';
import { Home, Onboarding, ResultScreen, Settings } from './screens';
import { sfx } from './sound';
import type { Progress, SessionResult } from './types';

type Screen = 'home' | 'game' | 'result';
interface Session {
  mode: 'level' | 'practice';
  levelId: number | null;
}

function yesterdayString(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
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
    document.documentElement.lang = progress.uiLang === 'eu' ? 'eu' : 'es';
    document.body.dataset.route = progress.route;
    document.body.classList.toggle('big-text', progress.bigText);
    document.title = `HitzBidaia · ${t('appSub', progress.uiLang)}`;
  }, [progress.uiLang, progress.route, progress.bigText]);

  useEffect(() => () => {
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
  }, []);

  function start(levelId: number | null) {
    sfx('click', progress.sound);
    setSession({ mode: levelId === null ? 'practice' : 'level', levelId });
    setNonce((n) => n + 1);
    setScreen('game');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function finishSession(res: SessionResult) {
    const earned = badgesForResult(progress, res);
    const today = todayString();
    const yesterday = yesterdayString();
    setProgress((prev) => {
      const stars = { ...prev.stars };
      const completed = { ...prev.completed };
      if (res.mode === 'level' && res.levelId && res.stars > 0) {
        stars[res.levelId] = Math.max(stars[res.levelId] ?? 0, res.stars);
        completed[res.levelId] = true;
      }
      let streak = prev.streak;
      if (prev.lastPlayed !== today) streak = prev.lastPlayed === yesterday ? prev.streak + 1 : 1;
      return {
        xp: prev.xp + res.xp,
        stars,
        completed,
        badges: [...prev.badges, ...earned.filter((id) => !prev.badges.includes(id))],
        streak,
        lastPlayed: today,
        sessions: prev.sessions + 1,
        correctTotal: prev.correctTotal + res.correct,
      };
    });
    sfx(earned.length ? 'badge' : 'star', progress.sound);
    setNewBadges(earned);
    setResult(res);
    setScreen('result');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function goHome() {
    setScreen('home');
    setSession(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
          key={`${session.mode}-${session.levelId ?? 'free'}-${nonce}`}
          progress={progress}
          mode={session.mode}
          levelId={session.levelId}
          onExit={goHome}
          onFinish={finishSession}
        />
      )}
      {screen === 'result' && result && (
        <ResultScreen
          progress={progress}
          result={result}
          newBadges={newBadges}
          onNext={(id) => start(id)}
          onRepeat={() => (session ? start(session.levelId) : goHome())}
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
