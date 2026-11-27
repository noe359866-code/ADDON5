import { useEffect, useRef, useState } from 'react';
import { computeAdaptations } from './adaptations';
import { Toast } from './components';
import { GameScreen } from './GameScreen';
import { t } from './i18n';
import { startAmbientMusic, stopAmbientMusic } from './music';
import { badgesForResult, useProgress } from './progress';
import { Home, Onboarding, ResultScreen, Settings } from './screens';
import { applySessionResult } from './session';
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

    setProgress((prev) => applySessionResult(prev, res, earned));

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
