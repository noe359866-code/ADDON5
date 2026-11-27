import { useEffect, useMemo, useRef, useState } from 'react';
import { computeAdaptations } from './adaptations';
import { ComboPill, Confetti, LangChip, Mascot, Modal, RoutePill, SessionProgress, XpFloat, prefersReducedMotion, staggerStyle } from './components';
import type { Mood } from './components';
import { bonusModes } from './data';
import { IconAccessibility, IconArrowRight, IconBolt, IconClose, IconLightbulb, IconVolume } from './icons';
import { createGenState, pickExercise, practiceLevel } from './exercises';
import type { GenState } from './exercises';
import { t, tf } from './i18n';
import { sfx, speak, stopSpeaking, voicesFor } from './sound';
import { starsFor } from './progress';
import type { Exercise, Lang, Modality, Progress, SessionResult } from './types';

interface Props {
  progress: Progress;
  mode: 'level' | 'practice';
  levelId: number | null;
  onExit: () => void;
  onFinish: (result: SessionResult) => void;
}

interface HistoryEntry {
  ok: boolean;
  modality: Modality;
  lang: Lang;
}

function longestStreak(history: HistoryEntry[], filter?: (m: Modality) => boolean): number {
  let current = 0;
  let best = 0;
  for (const entry of history) {
    if (entry.ok && (!filter || filter(entry.modality))) {
      current += 1;
      best = Math.max(best, current);
    } else if (!entry.ok) {
      current = 0;
    } else {
      current = 0;
    }
  }
  return best;
}

export function GameScreen({ progress, mode, levelId, onExit, onFinish }: Props) {
  const ad = computeAdaptations(progress);
  const total = mode === 'practice' ? ad.practiceLength : ad.sessionLength;
  const startDifficulty = Math.min(2, ad.difficultyCap);
  const bonus = bonusModes.find((b) => b.id === levelId);
  const gen = useRef<GenState | null>(null);
  if (!gen.current) gen.current = createGenState();

  const initialLang: Lang = progress.learnLang === 'both' ? 'es' : progress.learnLang;
  const makeExercise = (slot: number, difficulty: number, lang: Lang): Exercise =>
    pickExercise({
      levelId:
        mode === 'practice'
          ? ad.movement && Math.random() < 0.35
            ? 8
            : practiceLevel(progress.stars)
          : (levelId ?? 1),
      lang,
      ui: progress.uiLang,
      route: progress.route,
      difficulty,
      slot,
      state: gen.current!,
      adaptations: ad,
    });

  const [current, setCurrent] = useState<Exercise>(() => makeExercise(0, startDifficulty, initialLang));
  const [index, setIndex] = useState(0);
  const [difficulty, setDifficulty] = useState(startDifficulty);
  const [streak, setStreak] = useState(0);
  const [wrongStreak, setWrongStreak] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [picks, setPicks] = useState<string[]>([]);
  const [chip, setChip] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<'none' | 'correct' | 'wrong'>('none');
  const [lastOk, setLastOk] = useState(false);
  const [hintShown, setHintShown] = useState(false);
  const [showExit, setShowExit] = useState(false);
  const [burst, setBurst] = useState(0);
  const [noteDismissed, setNoteDismissed] = useState(false);
  const [soundNotice, setSoundNotice] = useState(false);
  const [euVoice, setEuVoice] = useState(true);
  const [xpPop, setXpPop] = useState<{ id: number; amount: number } | null>(null);
  const [combo, setCombo] = useState<{ id: number; count: number } | null>(null);
  const [actionTaps, setActionTaps] = useState(0);
  const [actionPicks, setActionPicks] = useState<string[]>([]);

  const correctRef = useRef(0);
  const xpRef = useRef(0);
  const historyRef = useRef<HistoryEntry[]>([]);
  const pendingRef = useRef(false);
  const answerTimerRef = useRef<number | null>(null);
  const speakAnswerTimerRef = useRef<number | null>(null);
  const aliveRef = useRef(true);
  const actionDoneRef = useRef(false);
  const actionTokenRef = useRef(0);

  function clearPendingTimers() {
    if (answerTimerRef.current !== null) {
      window.clearTimeout(answerTimerRef.current);
      answerTimerRef.current = null;
    }
    if (speakAnswerTimerRef.current !== null) {
      window.clearTimeout(speakAnswerTimerRef.current);
      speakAnswerTimerRef.current = null;
    }
    pendingRef.current = false;
  }

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
      clearPendingTimers();
    };
  }, []);

  const ui = progress.uiLang;
  const routeLabel = t(`route${progress.route === 'auditivo' ? 'Auditivo' : progress.route === 'visual' ? 'Visual' : 'Mixta'}`, ui);

  useEffect(() => {
    const check = () => setEuVoice(voicesFor('eu').length > 0);
    check();
    const id = window.setTimeout(check, 900);
    if (window.speechSynthesis) window.speechSynthesis.addEventListener('voiceschanged', check);
    return () => {
      window.clearTimeout(id);
      if (window.speechSynthesis) window.speechSynthesis.removeEventListener('voiceschanged', check);
    };
  }, []);

  // La ruta auditiva escucha cada pregunta automáticamente; la visual solo si lo pide.
  useEffect(() => {
    if (!current.audio || !progress.sound) return;
    if (progress.route !== 'auditivo' && !current.autoAudio) return;
    const id = window.setTimeout(() => speak(current.audio!.text, current.audio!.lang, true, 0.86), 450);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current.id]);

  const correctLabel = useMemo(() => {
    if (!current) return '';
    if (current.kind === 'build' && current.tiles && current.correctOrder) {
      return current.correctOrder.map((id) => current.tiles!.find((tile) => tile.id === id)?.label ?? '').join(' ');
    }
    if (current.kind === 'tap') return current.chips?.find((c) => c.id === current.correctChip)?.label ?? '';
    return current.options?.find((o) => o.id === current.correctId)?.label ?? '';
  }, [current]);

  function submitAnswer(ok: boolean) {
    if (feedback !== 'none') return;
    const base = mode === 'practice' ? 5 : 10;
    const gain = ok ? Math.max(3, base - (hintShown ? 4 : 0) + (difficulty === 3 ? 2 : 0)) : 0;
    correctRef.current += ok ? 1 : 0;
    xpRef.current += gain;
    historyRef.current.push({ ok, modality: current.modality, lang: current.lang });
    setLastOk(ok);
    setFeedback(ok ? 'correct' : 'wrong');
    sfx(ok ? 'correct' : 'wrong', progress.sound);
    if (ad.speakAnswer && correctLabel && progress.sound) {
      if (speakAnswerTimerRef.current !== null) window.clearTimeout(speakAnswerTimerRef.current);
      speakAnswerTimerRef.current = window.setTimeout(() => {
        speakAnswerTimerRef.current = null;
        if (aliveRef.current) speak(correctLabel, current.lang, true, 0.8);
      }, 560);
    }
    if (ok) {
      if (!ad.calm) setXpPop({ id: Date.now(), amount: gain });
      if (!ad.calm) setBurst((b) => b + 1);
      if (correctRef.current % 3 === 0) sfx('star', progress.sound);
    } else {
      setXpPop(null);
    }
    const nextCombo = ok ? streak + 1 : 0;
    if (!ad.calm) setCombo(nextCombo >= 2 ? { id: Date.now(), count: nextCombo } : null);
    if (nextCombo >= 3 && !ad.calm && !prefersReducedMotion()) sfx('combo', progress.sound);
  }

  /** Un instante de "presión" antes del resultado: la sensación Duolingo. */
  function delayedAnswer(ok: boolean) {
    if (pendingRef.current) return;
    if (ad.calm || prefersReducedMotion()) {
      submitAnswer(ok);
      return;
    }
    pendingRef.current = true;
    answerTimerRef.current = window.setTimeout(() => {
      answerTimerRef.current = null;
      pendingRef.current = false;
      if (aliveRef.current) submitAnswer(ok);
    }, 170);
  }

  /** Los juegos imperativos no tienen fallo: participar ya es un acierto. */
  function completeAction() {
    if (feedback !== 'none' || current.kind !== 'action') return;
    const gain = mode === 'practice' ? 5 : 10;
    correctRef.current += 1;
    xpRef.current += gain;
    historyRef.current.push({ ok: true, modality: current.modality, lang: current.lang });
    setLastOk(true);
    sfx('correct', progress.sound);
    if (!ad.calm) setBurst((b) => b + 1);
    advance(true);
  }

  /** Minijuegos de Pato Ventura: cualquier interacción cuenta, nunca hay fallo. */
  function handleActionGameTap(id?: string) {
    if (feedback !== 'none' || current.kind !== 'action' || !current.action?.game || actionDoneRef.current) return;
    const game = current.action.game;
    if (!ad.calm) sfx('pop', progress.sound);
    if (game.kind === 'find' || game.kind === 'imitate') {
      actionDoneRef.current = true;
      completeAction();
      return;
    }
    if (game.kind === 'bubbles' && id && actionPicks.includes(id)) return;
    const next = Math.min(actionTaps + 1, game.target);
    setActionTaps(next);
    if (id) setActionPicks((prev) => [...prev, id]);
    if (next >= game.target) {
      actionDoneRef.current = true;
      if (!ad.calm) sfx('star', progress.sound);
      const token = ++actionTokenRef.current;
      window.setTimeout(() => {
        if (aliveRef.current && actionTokenRef.current === token && feedback === 'none') completeAction();
      }, 240);
    }
  }

  function submitChoice(id: string) {
    if (feedback !== 'none' || pendingRef.current) return;
    setSelected(id);
    sfx('click', progress.sound);
    delayedAnswer(id === current.correctId);
  }

  function submitChip(id: string) {
    if (feedback !== 'none' || pendingRef.current) return;
    setChip(id);
    sfx('click', progress.sound);
    delayedAnswer(id === current.correctChip);
  }

  function addPick(id: string) {
    if (feedback !== 'none' || pendingRef.current || picks.includes(id) || !current.tiles) return;
    sfx('pop', progress.sound);
    setPicks([...picks, id]);
  }

  function submitBuild() {
    if (feedback !== 'none' || pendingRef.current || !current.correctOrder || picks.length !== current.correctOrder.length) return;
    delayedAnswer(picks.every((id, i) => id === current.correctOrder![i]));
  }

  function finish() {
    const history = historyRef.current;
    const correct = correctRef.current;
    const result: SessionResult = {
      mode,
      levelId,
      total,
      correct,
      xp: xpRef.current,
      stars: starsFor({ total, correct }),
      maxStreak: longestStreak(history),
      visualStreak: longestStreak(history, (m) => m !== 'auditivo'),
      audioStreak: longestStreak(history, (m) => m !== 'visual'),
      langsUsed: Array.from(new Set(history.map((h) => h.lang))) as Lang[],
      perfect: correct === total,
    };
    clearPendingTimers();
    stopSpeaking();
    onFinish(result);
  }

  function advance(okOverride?: boolean) {
    const nextIndex = index + 1;
    if (nextIndex >= total) {
      finish();
      return;
    }
    const wasOk = okOverride ?? lastOk;
    const newStreak = wasOk ? streak + 1 : 0;
    const newWrong = wasOk ? 0 : wrongStreak + 1;
    let nextDifficulty = difficulty;
    if (newStreak >= 3) nextDifficulty = Math.min(ad.difficultyCap, difficulty + 1);
    if (newWrong >= 2) nextDifficulty = Math.max(1, difficulty - 1);
    setStreak(newStreak);
    setWrongStreak(newWrong);
    setDifficulty(nextDifficulty);
    const lang: Lang = progress.learnLang === 'both' ? (nextIndex % 2 === 0 ? 'es' : 'eu') : progress.learnLang;
    clearPendingTimers();
    stopSpeaking();
    setCurrent(makeExercise(nextIndex, nextDifficulty, lang));
    setIndex(nextIndex);
    setSelected(null);
    setPicks([]);
    setChip(null);
    setFeedback('none');
    setHintShown(false);
    setXpPop(null);
    setCombo(null);
    setActionTaps(0);
    setActionPicks([]);
    actionDoneRef.current = false;
    actionTokenRef.current += 1;
  }

  function listen(rate = 0.88) {
    if (!current.audio) return;
    if (!progress.sound) {
      setSoundNotice(true);
      return;
    }
    sfx('click', true);
    speak(current.audio.text, current.audio.lang, true, rate);
  }

  function showHint() {
    if (feedback !== 'none' || pendingRef.current) return;
    setHintShown(true);
    sfx('pop', progress.sound);
    if (current.audio && progress.route !== 'visual') listen(0.68);
  }

  // Atajos de teclado: 1-4 para responder, Enter para continuar.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (showExit) return;
      if (feedback !== 'none') {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          advance();
        }
        return;
      }
      if (current.kind === 'action' && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        completeAction();
        return;
      }
      if (!/^[1-9]$/.test(e.key)) return;
      const n = Number(e.key) - 1;
      if (current.kind === 'choice' || current.kind === 'story') {
        const opt = current.options?.[n];
        if (opt) submitChoice(opt.id);
      } else if (current.kind === 'tap') {
        const c = current.chips?.[n];
        if (c) submitChip(c.id);
      } else if (current.kind === 'build') {
        const available = current.tiles?.filter((tile) => !picks.includes(tile.id)) ?? [];
        const tile = available[n];
        if (tile) addPick(tile.id);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const adaptiveLabel = t(difficulty === 1 ? 'adaptiveEasy' : difficulty === 2 ? 'adaptiveMedium' : 'adaptiveHard', ui);
  const showSoundOrb =
    current.audio &&
    (current.display?.variant === 'none' || current.modality === 'auditivo') &&
    !current.story &&
    current.kind !== 'action';
  const voiceNoteVisible = !euVoice && current.lang === 'eu' && progress.sound && !noteDismissed;
  const gameTitle = mode === 'practice' ? t('freeMode', ui) : bonus ? bonus[ui].title : `${t('worldOf', ui)} ${levelId}`;
  const titleCorrect = ad.gentle ? t('gentleGreat', ui) : t('correctTitle', ui);
  const titleWrong = ad.gentle ? t('gentleAlmost', ui) : t('wrongTitle', ui);
  const subCorrect = ad.gentle ? t('actionDone', ui) : t('wellDone', ui);
  const subWrong = ad.gentle ? current.hint : t('almost', ui);
  const actionGame = current.kind === 'action' ? current.action?.game : undefined;
  const promptMood: Mood =
    feedback === 'correct'
      ? 'cheer'
      : feedback === 'wrong'
        ? ad.gentle
          ? 'think'
          : 'sad'
        : hintShown
          ? 'think'
          : current.kind === 'action'
            ? 'wave'
            : streak >= 2
              ? 'excited'
              : index === 0
                ? 'wave'
                : 'happy';

  return (
    <div className={`game-screen ${ad.calm ? 'calm' : ''}`}>
      {burst > 0 && !ad.calm && <Confetti burstKey={burst} />}
      <header className="game-header">
        <button className="icon-btn" onClick={() => setShowExit(true)} aria-label={t('exit', ui)} title={t('exit', ui)}>
          <IconClose size={18} />
        </button>
        <div className="game-progress">
          <div className="game-progress-top">
            <span className="game-title">{gameTitle}</span>
            <span className="game-count">
              {index + 1} / {total}
            </span>
          </div>
          <SessionProgress current={index} total={total} />
        </div>
        <LangChip lang={current.lang} />
      </header>

      <div className="game-meta">
        <RoutePill route={progress.route} label={routeLabel} />
        <span className="adaptive-pill" title={t('adaptive', ui)}>
          <span className="adaptive-dots" aria-hidden="true">
            {[1, 2, 3].map((n) => (
              <i key={n} className={n <= difficulty ? 'on' : ''} />
            ))}
          </span>
          <span>{adaptiveLabel}</span>
        </span>
        <span className="xp-pill">
          <IconBolt size={13} />
          <span>{xpRef.current} {t('xp', ui)}</span>
        </span>
        {ad.active.length > 0 && (
          <span className="support-pill">
            <IconAccessibility size={14} />
            <span>{ad.active.length}</span>
          </span>
        )}
      </div>

      <main
        key={current.id}
        className={`exercise-card modality-${current.modality} ${progress.bigText ? 'big-text' : ''} ${ad.hyperlegible ? 'hyperlegible' : ''} ${ad.bigTargets ? 'big-targets' : ''}`}
      >
        {!ad.calm && xpPop && <XpFloat amount={xpPop.amount} burstKey={xpPop.id} />}
        {!ad.calm && combo && <ComboPill count={combo.count} label={t('comboLabel', ui)} burstKey={combo.id} />}
        {ad.firstThen && (
          <div className="first-then" aria-label={t('adaptSchedule', ui)}>
            <span><b>1</b> {t('stepListen', ui)}</span>
            <i>→</i>
            <span><b>2</b> {t('stepChoose', ui)}</span>
            <i>→</i>
            <span><b>3</b> ⭐ {t('stepStar', ui)}</span>
          </div>
        )}
        <div className="ex-eyebrow">
          <span className="ex-eyebrow-pill">{current.eyebrow}</span>
          {current.audio && (
            <button className="listen-small" onClick={() => listen()} aria-label={t('listenAgain', ui)}>
              <IconVolume size={15} />
              <span>{t('listen', ui)}</span>
            </button>
          )}
        </div>
        <div className="ex-prompt-row">
          <Mascot mood={promptMood} size={68} interactive sound={progress.sound} />
          <div className="ex-prompt-bubble">
            <h2 className="ex-prompt">{current.prompt}</h2>
          </div>
        </div>

        {current.story && (
          <section className="story-card">
            <div className="story-emoji" aria-hidden="true">
              {current.story.emoji}
            </div>
            <div className="story-body">
              <h3>{current.story.title}</h3>
              <p>{current.story.text}</p>
              <button className="btn btn-tiny" onClick={() => listen(0.82)}>
                <IconVolume size={14} />
                <span>{t('readAloud', ui)}</span>
              </button>
            </div>
          </section>
        )}

        {current.display && current.display.variant !== 'none' && (
          <div className={`display-area display-${current.display.variant}`}>
            {current.display.emoji && current.display.variant !== 'objects' && current.display.variant !== 'swatch' && (
              <div className="display-emoji">{current.display.emoji}</div>
            )}
            {current.display.variant === 'objects' && current.display.text && (
              <div className="display-objects" aria-label={current.display.text}>
                {current.display.text}
              </div>
            )}
            {current.display.variant === 'swatch' && (
              <div
                className={`display-swatch ${ad.colorblind && current.display.pattern ? `swatch-pattern pattern-${current.display.pattern}` : ''}`}
                style={{ backgroundColor: current.display.color }}
                aria-label={current.display.emoji}
              >
                {ad.colorblind && current.display.symbol ? (
                  <span className="swatch-symbol swatch-symbol-lg" aria-hidden="true">{current.display.symbol}</span>
                ) : (
                  current.display.emoji
                )}
              </div>
            )}
            {current.display.variant === 'chunks' && current.display.chunks && (
              <div className="chunk-row" aria-label={current.display.chunks.join(' ')}>
                {current.display.chunks.map((chunk, i) => (
                  <span key={i} className={`chunk chunk-${i % 5}`}>
                    {chunk}
                  </span>
                ))}
              </div>
            )}
            {(current.display.variant === 'blank' || current.display.variant === 'hidden' || current.display.variant === 'word') &&
              current.display.text && (
                <div className={`display-text ${current.display.variant === 'word' ? 'display-word' : ''}`}>
                  {current.display.text.split('＿').map((part, i, arr) => (
                    <span key={i}>
                      {part}
                      {i < arr.length - 1 && <span className="blank-box">?</span>}
                    </span>
                  ))}
                </div>
              )}
          </div>
        )}

        {showSoundOrb && (
          <button className={`sound-orb ${current.modality === 'auditivo' ? 'pulsing' : ''}`} onClick={() => listen()} aria-label={t('listenAgain', ui)}>
            <span className="orb-ring ring-1" />
            <span className="orb-ring ring-2" />
            <span className="orb-icon"><IconVolume size={34} /></span>
            <span className="orb-label">{t('listenAgain', ui)}</span>
          </button>
        )}

        {voiceNoteVisible && (
          <div className="voice-note">
            <span>{t('voiceFallback', ui)}</span>
            <button onClick={() => setNoteDismissed(true)} aria-label={t('close', ui)}>
              <IconClose size={14} />
            </button>
          </div>
        )}
        {soundNotice && (
          <div className="voice-note">
            <span>{t('soundOffNote', ui)}</span>
            <button onClick={() => setSoundNotice(false)} aria-label={t('close', ui)}>
              ✕
            </button>
          </div>
        )}

        {(current.kind === 'choice' || current.kind === 'story') && current.options && (
          <div className={`options options-${current.options.length > 3 ? 'four' : 'three'}`}>
            {current.options.map((opt, i) => {
              const isCorrect = opt.id === current.correctId;
              const isChosen = selected === opt.id;
              const state =
                feedback === 'none' ? '' : isCorrect ? 'is-correct' : isChosen ? 'is-wrong' : 'is-muted';
              return (
                <button
                  key={opt.id}
                  className={`option ${state} ${opt.emoji ? 'has-emoji' : ''} ${opt.color ? 'has-swatch' : ''} ${selected === opt.id && feedback === 'none' ? 'pressing' : ''}`}
                  style={staggerStyle(i)}
                  onClick={() => submitChoice(opt.id)}
                  disabled={feedback !== 'none'}
                >
                  <span className="option-key">{i + 1}</span>
                  {opt.color && (
                    <span
                      className={`option-swatch ${ad.colorblind && opt.pattern ? `swatch-pattern pattern-${opt.pattern}` : ''}`}
                      style={{ backgroundColor: opt.color }}
                      aria-hidden="true"
                    >
                      {ad.colorblind && opt.symbol && <span className="swatch-symbol">{opt.symbol}</span>}
                    </span>
                  )}
                  {opt.emoji && <span className="option-emoji">{opt.emoji}</span>}
                  {(!opt.emoji || opt.label !== opt.emoji) && <span className="option-label">{opt.label}</span>}
                  {opt.sub && <span className="option-sub">{opt.sub}</span>}
                  {feedback !== 'none' && isCorrect && <span className="option-check" aria-hidden="true">✓</span>}
                  {feedback !== 'none' && isChosen && !isCorrect && <span className="option-cross" aria-hidden="true">✕</span>}
                </button>
              );
            })}
          </div>
        )}

        {current.kind === 'tap' && current.chips && (
          <div className="chip-area">
            <p className="area-caption">{t('tapToFind', ui)}</p>
            <div className="chip-row">
              {current.chips.map((c, i) => {
                const isCorrect = c.id === current.correctChip;
                const isChosen = chip === c.id;
                const state = feedback === 'none' ? '' : isCorrect ? 'is-correct' : isChosen ? 'is-wrong' : 'is-muted';
                return (
                  <button
                    key={c.id}
                    className={`letter-chip ${state} ${chip === c.id && feedback === 'none' ? 'pressing' : ''}`}
                    style={staggerStyle(i)}
                    onClick={() => submitChip(c.id)}
                    disabled={feedback !== 'none'}
                  >
                    {c.label}
                    <span className="option-key">{i + 1}</span>
                    {feedback !== 'none' && isCorrect && <span className="chip-badge chip-ok" aria-hidden="true">✓</span>}
                    {feedback !== 'none' && isChosen && !isCorrect && <span className="chip-badge chip-no" aria-hidden="true">✕</span>}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {current.kind === 'build' && current.tiles && current.correctOrder && (
          <div className="build-area">
            <p className="area-caption">{t('tapToOrder', ui)}</p>
            <div className="build-slots">
              {current.correctOrder.map((slotId, i) => {
                const pickedId = picks[i];
                const tile = current.tiles!.find((x) => x.id === pickedId);
                return (
                  <button
                    key={slotId}
                    className={`build-slot ${tile ? 'filled' : ''}`}
                    onClick={() => {
                      if (feedback === 'none' && !pendingRef.current && pickedId) setPicks(picks.filter((_, idx) => idx !== i));
                    }}
                    disabled={feedback !== 'none'}
                  >
                    {tile?.label ?? ''}
                  </button>
                );
              })}
            </div>
            <div className="tile-pool">
              {current.tiles.map((tile, i) => (
                <button
                  key={tile.id}
                  style={staggerStyle(i)}
                  className={`tile ${picks.includes(tile.id) ? 'used' : ''} ${current.unit === 'word' ? 'tile-word' : ''}`}
                  onClick={() => addPick(tile.id)}
                  disabled={picks.includes(tile.id) || feedback !== 'none'}
                >
                  {tile.label}
                </button>
              ))}
            </div>
            <div className="build-actions">
              <button
                className="btn btn-quiet"
                onClick={() => {
                  if (feedback === 'none' && !pendingRef.current) setPicks(picks.slice(0, -1));
                }}
                disabled={!picks.length || feedback !== 'none'}
              >
                ↩ {t('undo', ui)}
              </button>
              <button className="btn btn-primary" onClick={submitBuild} disabled={picks.length !== current.tiles.length || feedback !== 'none'}>
                ✓ {t('check', ui)}
              </button>
            </div>
          </div>
        )}

        {current.kind === 'action' && current.action && feedback === 'none' && (
          <div className={`action-card ${actionGame ? `action-game-card action-game-${actionGame.kind}` : ''}`}>
            <div className="action-emoji" aria-hidden="true">{current.action.emoji}</div>
            <p className="action-text">{current.action.text}</p>
            {current.action.steps && (
              <div className="action-steps">
                <span className="action-steps-label">{t('actionSteps', ui)}</span>
                {current.action.steps.map((step, i) => (
                  <span key={i} className="action-step">
                    <b>{i === 0 ? t('firstThen', ui) : t('thenStep', ui)}</b> {step}
                  </span>
                ))}
              </div>
            )}

            {actionGame?.kind === 'bubbles' && (
              <div className="bubble-grid" role="group" aria-label={actionGame.label}>
                {Array.from({ length: actionGame.target + 2 }, (_, i) => `b${i}`).map((id, i) => (
                  <button
                    key={id}
                    style={staggerStyle(i)}
                    className={`bubble ${actionPicks.includes(id) ? 'popped' : ''}`}
                    onClick={() => handleActionGameTap(id)}
                    disabled={actionPicks.includes(id) || feedback !== 'none'}
                    aria-label={`${actionGame.label} ${i + 1}`}
                  >
                    🫧
                  </button>
                ))}
              </div>
            )}

            {actionGame && (actionGame.kind === 'count' || actionGame.kind === 'breathe') && (
              <div className="action-tap-area">
                {actionGame.kind === 'breathe' && <div className="breath-orb" aria-hidden="true">🌬️</div>}
                <button
                  className="action-tap-btn"
                  onClick={() => handleActionGameTap()}
                  disabled={feedback !== 'none'}
                >
                  <span aria-hidden="true">{actionGame.kind === 'count' ? actionGame.emoji : '🌬️'}</span>
                  <strong>{actionGame.label}</strong>
                </button>
                <div className="action-dots" aria-hidden="true">
                  {Array.from({ length: actionGame.target }, (_, i) => (
                    <i key={i} className={i < actionTaps ? 'on' : ''} />
                  ))}
                </div>
              </div>
            )}

            {actionGame?.kind === 'find' && (
              <div className="find-area">
                <div className="find-grid" role="group" aria-label={actionGame.label}>
                  {actionGame.items.map((item, i) => (
                    <button
                      key={item.id}
                      style={staggerStyle(i)}
                      className="find-card"
                      onClick={() => handleActionGameTap(item.id)}
                      disabled={feedback !== 'none'}
                    >
                      <span className="find-emoji" aria-hidden="true">{item.emoji}</span>
                      <span className="find-label">{item.label}</span>
                    </button>
                  ))}
                </div>
                <p className="action-game-hint">{actionGame.label}</p>
              </div>
            )}

            {actionGame?.kind === 'imitate' && (
              <button className="imitate-btn" onClick={() => handleActionGameTap()} disabled={feedback !== 'none'}>
                <span aria-hidden="true">{current.action.emoji}</span>
                <strong>{t('actionDo', ui)}</strong>
              </button>
            )}

            {actionGame && actionGame.kind !== 'find' && actionGame.kind !== 'imitate' && (
              <p className="action-game-status" role="status">
                {tf('actionCounter', ui, { done: String(actionTaps), total: String(actionGame.target) })}
              </p>
            )}

            <div className="action-buttons">
              <button className="btn btn-quiet" onClick={() => listen(0.78)}>🔁 {t('actionAgain', ui)}</button>
              {actionGame?.kind !== 'imitate' && (
                <button className="btn btn-primary btn-lg" onClick={completeAction}>{t('actionDo', ui)}</button>
              )}
              <button className="btn btn-quiet" onClick={completeAction}>{t('actionSkip', ui)}</button>
            </div>
          </div>
        )}

        {feedback === 'none' ? (
          <div className="game-footer">
            <button className={`btn btn-ghost ${hintShown ? 'active' : ''}`} onClick={showHint} disabled={hintShown}>
              <IconLightbulb size={16} />
              <span>{t('hint', ui)}</span>
            </button>
            {hintShown && (
              <div className="hint-box">
                <Mascot mood="think" size={62} interactive sound={progress.sound} />
                <div>
                  <strong>{t('hintTitle', ui)}</strong>
                  <p>{current.hint}</p>
                </div>
                <button className="icon-btn" onClick={() => setHintShown(false)} aria-label={t('hideHint', ui)}>
                  <IconClose size={15} />
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className={`feedback feedback-${feedback}`} role="status">
            <div className="feedback-head">
              <Mascot mood={feedback === 'correct' ? 'excited' : ad.gentle ? 'think' : 'sad'} size={80} interactive sound={progress.sound} />
              <div>
                <h3>{feedback === 'correct' ? titleCorrect : titleWrong}</h3>
                <p>{feedback === 'correct' ? subCorrect : subWrong}</p>
              </div>
            </div>
            <p className="feedback-explain">{current.explanation}</p>
            {feedback === 'wrong' && (
              <p className="correct-answer">
                {t('correctAnswerLabel', ui)}: <strong>{correctLabel}</strong>
              </p>
            )}
            <button className="btn btn-primary btn-wide" onClick={() => advance()} autoFocus>
              <span>{index + 1 >= total ? t('finishSession', ui) : t('continueBtn', ui)}</span>
              <IconArrowRight size={17} />
            </button>
          </div>
        )}
      </main>

      {showExit && (
        <Modal onClose={() => setShowExit(false)}>
          <h3>{t('exitTitle', ui)}</h3>
          <p>{t('exitSub', ui)}</p>
          <div className="modal-actions">
            <button className="btn btn-quiet" onClick={() => setShowExit(false)}>
              {t('exitNo', ui)}
            </button>
            <button
              className="btn btn-primary"
              onClick={() => {
                stopSpeaking();
                onExit();
              }}
            >
              {t('exitYes', ui)}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
