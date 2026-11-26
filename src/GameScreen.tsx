import { useEffect, useMemo, useRef, useState } from 'react';
import { Confetti, LangChip, Mascot, Modal, ProgressBar, RoutePill } from './components';
import { levels } from './data';
import { createGenState, pickExercise, practiceLevel } from './exercises';
import type { GenState } from './exercises';
import { t } from './i18n';
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
  const total = mode === 'level' ? (levels.find((l) => l.id === levelId)?.questions ?? 6) : 8;
  const gen = useRef<GenState | null>(null);
  if (!gen.current) gen.current = createGenState();

  const initialLang: Lang = progress.learnLang === 'both' ? 'es' : progress.learnLang;
  const makeExercise = (slot: number, difficulty: number, lang: Lang): Exercise =>
    pickExercise({
      levelId: mode === 'practice' ? practiceLevel(progress.stars) : (levelId ?? 1),
      lang,
      ui: progress.uiLang,
      route: progress.route,
      difficulty,
      slot,
      state: gen.current!,
    });

  const [current, setCurrent] = useState<Exercise>(() => makeExercise(0, 2, initialLang));
  const [index, setIndex] = useState(0);
  const [difficulty, setDifficulty] = useState(2);
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

  const correctRef = useRef(0);
  const xpRef = useRef(0);
  const historyRef = useRef<HistoryEntry[]>([]);

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
    if (ok) {
      setBurst((b) => b + 1);
      if (correctRef.current % 3 === 0) sfx('star', progress.sound);
    }
  }

  function submitChoice(id: string) {
    if (feedback !== 'none') return;
    setSelected(id);
    sfx('click', progress.sound);
    submitAnswer(id === current.correctId);
  }

  function submitChip(id: string) {
    if (feedback !== 'none') return;
    setChip(id);
    sfx('click', progress.sound);
    submitAnswer(id === current.correctChip);
  }

  function addPick(id: string) {
    if (feedback !== 'none' || picks.includes(id) || !current.tiles) return;
    sfx('pop', progress.sound);
    setPicks([...picks, id]);
  }

  function submitBuild() {
    if (feedback !== 'none' || !current.correctOrder || picks.length !== current.correctOrder.length) return;
    submitAnswer(picks.every((id, i) => id === current.correctOrder![i]));
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
    stopSpeaking();
    onFinish(result);
  }

  function advance() {
    const nextIndex = index + 1;
    if (nextIndex >= total) {
      finish();
      return;
    }
    const newStreak = lastOk ? streak + 1 : 0;
    const newWrong = lastOk ? 0 : wrongStreak + 1;
    let nextDifficulty = difficulty;
    if (newStreak >= 3) nextDifficulty = Math.min(3, difficulty + 1);
    if (newWrong >= 2) nextDifficulty = Math.max(1, difficulty - 1);
    setStreak(newStreak);
    setWrongStreak(newWrong);
    setDifficulty(nextDifficulty);
    const lang: Lang = progress.learnLang === 'both' ? (nextIndex % 2 === 0 ? 'es' : 'eu') : progress.learnLang;
    stopSpeaking();
    setCurrent(makeExercise(nextIndex, nextDifficulty, lang));
    setIndex(nextIndex);
    setSelected(null);
    setPicks([]);
    setChip(null);
    setFeedback('none');
    setHintShown(false);
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
  const showSoundOrb = current.audio && (current.display?.variant === 'none' || current.modality === 'auditivo') && !current.story;
  const voiceNoteVisible = !euVoice && current.lang === 'eu' && progress.sound && !noteDismissed;

  return (
    <div className="game-screen">
      {burst > 0 && <Confetti burstKey={burst} />}
      <header className="game-header">
        <button className="icon-btn" onClick={() => setShowExit(true)} aria-label={t('exit', ui)}>
          ✕
        </button>
        <div className="game-progress">
          <div className="game-progress-top">
            <span className="game-title">{mode === 'practice' ? t('freeMode', ui) : `${t('worldOf', ui)} ${levelId}`}</span>
            <span className="game-count">
              {t('question', ui)} {index + 1} {t('of', ui)} {total}
            </span>
          </div>
          <ProgressBar value={index} max={total} tone="mint" />
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
          {t('adaptive', ui)}: {adaptiveLabel}
        </span>
        <span className="xp-pill">⚡ {xpRef.current} {t('xp', ui)}</span>
      </div>

      <main className={`exercise-card modality-${current.modality} ${progress.bigText ? 'big-text' : ''}`}>
        <div className="ex-eyebrow">
          <span>{current.eyebrow}</span>
          {current.audio && (
            <button className="listen-small" onClick={() => listen()} aria-label={t('listenAgain', ui)}>
              🔊 {t('listen', ui)}
            </button>
          )}
        </div>
        <h2 className="ex-prompt">{current.prompt}</h2>

        {current.story && (
          <section className="story-card">
            <div className="story-emoji" aria-hidden="true">
              {current.story.emoji}
            </div>
            <div className="story-body">
              <h3>{current.story.title}</h3>
              <p>{current.story.text}</p>
              <button className="btn btn-tiny" onClick={() => listen(0.82)}>
                🔊 {t('readAloud', ui)}
              </button>
            </div>
          </section>
        )}

        {current.display && current.display.variant !== 'none' && (
          <div className={`display-area display-${current.display.variant}`}>
            {current.display.emoji && <div className="display-emoji">{current.display.emoji}</div>}
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
            <span className="orb-icon">🔊</span>
            <span className="orb-label">{t('listenAgain', ui)}</span>
          </button>
        )}

        {voiceNoteVisible && (
          <div className="voice-note">
            <span>{t('voiceFallback', ui)}</span>
            <button onClick={() => setNoteDismissed(true)} aria-label={t('close', ui)}>
              ✕
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
                  className={`option ${state} ${opt.emoji ? 'has-emoji' : ''}`}
                  onClick={() => submitChoice(opt.id)}
                  disabled={feedback !== 'none'}
                >
                  <span className="option-key">{i + 1}</span>
                  {opt.emoji && <span className="option-emoji">{opt.emoji}</span>}
                  {(!opt.emoji || opt.label !== opt.emoji) && <span className="option-label">{opt.label}</span>}
                  {opt.sub && <span className="option-sub">{opt.sub}</span>}
                  {feedback !== 'none' && isCorrect && <span className="option-check">✓</span>}
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
                  <button key={c.id} className={`letter-chip ${state}`} onClick={() => submitChip(c.id)} disabled={feedback !== 'none'}>
                    {c.label}
                    <span className="option-key">{i + 1}</span>
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
                      if (feedback === 'none' && pickedId) setPicks(picks.filter((_, idx) => idx !== i));
                    }}
                    disabled={feedback !== 'none'}
                  >
                    {tile?.label ?? ''}
                  </button>
                );
              })}
            </div>
            <div className="tile-pool">
              {current.tiles.map((tile) => (
                <button
                  key={tile.id}
                  className={`tile ${picks.includes(tile.id) ? 'used' : ''} ${current.unit === 'word' ? 'tile-word' : ''}`}
                  onClick={() => addPick(tile.id)}
                  disabled={picks.includes(tile.id) || feedback !== 'none'}
                >
                  {tile.label}
                </button>
              ))}
            </div>
            <div className="build-actions">
              <button className="btn btn-quiet" onClick={() => setPicks(picks.slice(0, -1))} disabled={!picks.length || feedback !== 'none'}>
                ↩ {t('undo', ui)}
              </button>
              <button className="btn btn-primary" onClick={submitBuild} disabled={picks.length !== current.tiles.length || feedback !== 'none'}>
                ✓ {t('check', ui)}
              </button>
            </div>
          </div>
        )}

        {feedback === 'none' ? (
          <div className="game-footer">
            <button className={`btn btn-ghost ${hintShown ? 'active' : ''}`} onClick={showHint} disabled={hintShown}>
              💡 {t('hint', ui)}
            </button>
            {hintShown && (
              <div className="hint-box">
                <Mascot mood="think" size={60} />
                <div>
                  <strong>{t('hintTitle', ui)}</strong>
                  <p>{current.hint}</p>
                </div>
                <button className="icon-btn" onClick={() => setHintShown(false)} aria-label={t('hideHint', ui)}>
                  ✕
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className={`feedback feedback-${feedback}`} role="status">
            <div className="feedback-head">
              <Mascot mood={feedback === 'correct' ? 'cheer' : 'think'} size={76} />
              <div>
                <h3>{feedback === 'correct' ? t('correctTitle', ui) : t('wrongTitle', ui)}</h3>
                <p>{feedback === 'correct' ? t('wellDone', ui) : t('almost', ui)}</p>
              </div>
            </div>
            <p className="feedback-explain">{current.explanation}</p>
            {feedback === 'wrong' && (
              <p className="correct-answer">
                {t('correctAnswerLabel', ui)}: <strong>{correctLabel}</strong>
              </p>
            )}
            <button className="btn btn-primary btn-wide" onClick={advance} autoFocus>
              {index + 1 >= total ? t('finishSession', ui) : t('continueBtn', ui)} →
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
