import { useEffect, useMemo, useRef, useState } from 'react';
import { computeAdaptations } from './adaptations';
import {
  ComboPill,
  Confetti,
  DuoLessonProgress,
  LangChip,
  Mascot,
  Modal,
  XpFloat,
  prefersReducedMotion,
  staggerStyle,
} from './components';
import type { Mood } from './components';
import { bonusModes } from './data';
import { createGenState, makePairsExercise, pickExercise, practiceLevel } from './exercises';
import type { GenState } from './exercises';
import {
  DuoGemSvg,
  DuoHeartSvg,
  DuoTurtleSvg,
  IconArrowRight,
  IconCheck,
  IconClose,
  IconLightbulb,
  IconVolume,
} from './icons';
import { t, tf } from './i18n';
import { isXpBoostActive, starsFor } from './progress';
import { getMaiderState, subscribeMaider } from './maider';
import { isSpeechRecognitionSupported, listenOnceFromMic, matchesSpokenTarget, sfx, speak, stopSpeaking, voicesFor } from './sound';
import { startAmbientMusic, stopAmbientMusic } from './music';
import type { Exercise, Lang, MistakeEntry, Modality, Progress, SessionMode, SessionResult, SyllableStage } from './types';

interface Props {
  progress: Progress;
  setProgress: (patch: Partial<Progress> | ((prev: Progress) => Partial<Progress>)) => void;
  mode: SessionMode;
  levelId: number | null;
  nodeKey?: string;
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
    } else {
      current = 0;
    }
  }
  return best;
}

/** Normaliza texto para comparar respuestas de dictado (diacríticos, espacios, ñ y h silenciosa del euskara). */
function normalizeForDictation(s: string, lang: Lang): string {
  const base = lang === 'eu' ? s.replace(/h/g, '') : s;
  return base
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9ñ\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function GameScreen({ progress, setProgress, mode, levelId, nodeKey, onExit, onFinish }: Props) {
  const ad = computeAdaptations(progress);
  const effectiveUnlimited = progress.unlimitedHearts || ad.gentle || mode === 'practice' || mode === 'mistakes';
  const xpBoost = isXpBoostActive(progress);

  const baseTotal =
    mode === 'legendary'
      ? Math.max(ad.sessionLength, 7)
      : mode === 'timed'
        ? 8
        : mode === 'practice' || mode === 'mistakes' || mode === 'listening'
          ? ad.practiceLength
          : ad.sessionLength;

  const userDiffNum =
    progress.difficultyLevel === 'bajo' ? 1 : progress.difficultyLevel === 'alto' ? 3 : 2;
  const startDifficulty =
    mode === 'legendary' ? Math.min(3, ad.difficultyCap) : Math.min(userDiffNum, ad.difficultyCap);
  const bonus = bonusModes.find((b) => b.id === levelId);
  const gen = useRef<GenState | null>(null);
  if (!gen.current) gen.current = createGenState();
  const startedAtRef = useRef<number>(Date.now());

  const fixedSyllableStage: SyllableStage | undefined =
    nodeKey === 'u2-n0' ? 1 : nodeKey === 'u2-n1' ? 2 : nodeKey === 'u2-n3' ? 3 : undefined;

  const resolveStageForSlot = (slot: number, targetLevel: number, diff: number): SyllableStage | undefined => {
    if (fixedSyllableStage) return fixedSyllableStage;
    if (targetLevel === 2) {
      const third = Math.max(1, Math.floor(baseTotal / 3));
      if (slot < third) return 1;
      if (slot < third * 2) return 2;
      return 3;
    }
    if (targetLevel === 3) {
      return diff <= 1 ? 1 : diff === 2 ? 2 : 3;
    }
    return undefined;
  };

  // Cuando se elige "both" (todos los idiomas combinados), alterna únicamente Euskera y Español (nunca Inglés)
  const initialLang: Lang = progress.learnLang === 'both' ? 'es' : progress.learnLang;

  const makeExercise = (slot: number, difficulty: number, lang: Lang): Exercise => {
    const targetLevel =
      levelId !== null
        ? levelId
        : mode === 'letters'
          ? 1
          : ad.movement && Math.random() < 0.35
            ? 8
            : practiceLevel(progress.stars);

    const sylStage = resolveStageForSlot(slot, targetLevel, difficulty);

    // Intercala un ejercicio clásico de Emparejar Parejas de Duolingo a mitad de lección
    if (
      slot === 2 &&
      targetLevel !== 8 &&
      mode !== 'listening' &&
      !ad.movement
    ) {
      return makePairsExercise({
        levelId: targetLevel,
        lang,
        learnLang: progress.learnLang,
        ui: progress.uiLang,
        state: gen.current!,
        adaptations: ad,
        syllableStage: sylStage,
        schoolStage: progress.schoolStage,
        simpleOnly: ad.simpleOnly,
      });
    }

    return pickExercise({
      levelId: targetLevel,
      lang,
      learnLang: progress.learnLang,
      ui: progress.uiLang,
      route: mode === 'listening' ? 'auditivo' : progress.route,
      difficulty,
      slot,
      state: gen.current!,
      adaptations: ad,
      syllableStage: sylStage,
      schoolStage: progress.schoolStage,
      readingPhase: progress.readingPhase,
      simpleOnly: ad.simpleOnly,
    });
  };

  const [current, setCurrent] = useState<Exercise>(() => makeExercise(0, startDifficulty, initialLang));
  const [stepDone, setStepDone] = useState(0);
  const [slotIndex, setSlotIndex] = useState(0);
  const [difficulty, setDifficulty] = useState(startDifficulty);
  const [streak, setStreak] = useState(0);
  const [wrongStreak, setWrongStreak] = useState(0);

  // Estado de selección antes de pulsar COMPROBAR
  const [selected, setSelected] = useState<string | null>(null);
  const [picks, setPicks] = useState<string[]>([]);
  const [chip, setChip] = useState<string | null>(null);

  // Estado de emparejar pares (Match Pairs)
  const [pairLeft, setPairLeft] = useState<string | null>(null);
  const [pairRight, setPairRight] = useState<string | null>(null);
  const [matchedPairIds, setMatchedPairIds] = useState<string[]>([]);
  const [wrongPairFlash, setWrongPairFlash] = useState<string[]>([]);

  const [feedback, setFeedback] = useState<'none' | 'correct' | 'wrong'>('none');
  const [lastOk, setLastOk] = useState(false);
  const [hintShown, setHintShown] = useState(false);
  const [showExit, setShowExit] = useState(false);
  const [outOfHearts, setOutOfHearts] = useState(false);
  const [burst, setBurst] = useState(0);
  const [noteDismissed, setNoteDismissed] = useState(false);
  const [soundNotice, setSoundNotice] = useState(false);
  const [euVoice, setEuVoice] = useState(true);
  const [maider, setMaider] = useState(getMaiderState);
  useEffect(() => subscribeMaider(setMaider), []);
  const [xpPop, setXpPop] = useState<{ id: number; amount: number } | null>(null);
  const [combo, setCombo] = useState<{ id: number; count: number } | null>(null);
  const [fiveToast, setFiveToast] = useState<number | null>(null);
  const [reviewBanner, setReviewBanner] = useState(false);
  const [stageUpToast, setStageUpToast] = useState<SyllableStage | null>(null);

  // Barra de velocidad del audio, verificación con micrófono y dictado
  const [micStatus, setMicStatus] = useState<'idle' | 'listening' | 'ok' | 'ko' | 'unsupported' | 'denied'>('idle');
  const [micHeard, setMicHeard] = useState('');
  const [dictationText, setDictationText] = useState('');

  // Temporizador para modo Contrarreloj (90s)
  const [timeLeft, setTimeLeft] = useState(90);

  // Minijuegos de Pato Ventura
  const [actionTaps, setActionTaps] = useState(0);
  const [actionPicks, setActionPicks] = useState<string[]>([]);

  const reviewQueueRef = useRef<Exercise[]>([]);
  const inReviewPhaseRef = useRef(false);
  const correctRef = useRef(0);
  const gradedCountRef = useRef(0);
  const xpRef = useRef(0);
  const historyRef = useRef<HistoryEntry[]>([]);
  const speakAnswerTimerRef = useRef<number | null>(null);
  const aliveRef = useRef(true);
  const actionDoneRef = useRef(false);
  const actionTokenRef = useRef(0);
  const promptRef = useRef<HTMLHeadingElement>(null);

  const ui = progress.uiLang;

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
      if (speakAnswerTimerRef.current !== null) window.clearTimeout(speakAnswerTimerRef.current);
    };
  }, []);

  // Temporizador para Contrarreloj
  useEffect(() => {
    if (mode !== 'timed' || showExit || outOfHearts) return;
    const iv = window.setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(iv);
          finishSessionNow();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, showExit, outOfHearts]);

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

  // Reproducción automática en ruta auditiva o cuando el ejercicio lo requiere
  useEffect(() => {
    setMicStatus('idle');
    setMicHeard('');
    setDictationText('');
    if (!current.audio || !progress.sound) return;
    if (progress.route !== 'auditivo' && mode !== 'listening' && !current.autoAudio) return;
    const id = window.setTimeout(
      () => speak(current.audio!.text, current.audio!.lang, true, progress.speechRate, current.audio!.syllables),
      380,
    );
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current.id]);

  // Accesibilidad: al cambiar de pregunta, el foco va al encabezado para que
  // lectores de pantalla y teclado no se queden en un botón desmontado.
  useEffect(() => {
    promptRef.current?.focus({ preventScroll: true });
    return () => {
      // No leer la respuesta de la pregunta anterior después de avanzar rápido.
      if (speakAnswerTimerRef.current !== null) {
        window.clearTimeout(speakAnswerTimerRef.current);
        speakAnswerTimerRef.current = null;
      }
    };
  }, [current.id]);

  const correctLabel = useMemo(() => {
    if (!current) return '';
    if (current.kind === 'build' && current.tiles && current.correctOrder) {
      return current.correctOrder.map((id) => current.tiles!.find((tile) => tile.id === id)?.label ?? '').join(' ');
    }
    if (current.kind === 'tap') return current.chips?.find((c) => c.id === current.correctChip)?.label ?? '';
    return current.options?.find((o) => o.id === current.correctId)?.label ?? '';
  }, [current]);

  const micTarget = current.dictationTarget ?? correctLabel;

  function recordMistakeItem() {
    if (!correctLabel) return;
    const entry: MistakeEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      prompt: current.prompt,
      answer: correctLabel,
      lang: current.lang,
      levelId: current.levelId,
      addedAt: new Date().toISOString(),
    };
    setProgress((prev) => ({
      mistakes: [entry, ...prev.mistakes.filter((m) => m.answer !== correctLabel)].slice(0, 15),
    }));
  }

  function submitAnswer(ok: boolean) {
    if (feedback !== 'none') return;
    const base = mode === 'legendary' ? 14 : mode === 'timed' ? 12 : mode === 'practice' ? 8 : 10;
    let gain = ok ? Math.max(4, base - (hintShown ? 3 : 0) + (difficulty === 3 ? 2 : 0)) : 0;
    if (xpBoost) gain *= 2;

    if (!current.isReview) {
      gradedCountRef.current += 1;
      if (ok) correctRef.current += 1;
    }
    xpRef.current += gain;
    historyRef.current.push({ ok, modality: current.modality, lang: current.lang });
    setLastOk(ok);
    setFeedback(ok ? 'correct' : 'wrong');
    sfx(ok ? 'correct' : 'wrong', progress.sound);

    if (ad.speakAnswer && correctLabel && progress.sound) {
      if (speakAnswerTimerRef.current !== null) window.clearTimeout(speakAnswerTimerRef.current);
      speakAnswerTimerRef.current = window.setTimeout(() => {
        speakAnswerTimerRef.current = null;
        if (aliveRef.current) speak(correctLabel, current.lang, true, 0.82);
      }, 520);
    }

    if (ok) {
      setStepDone((s) => s + 1);
      if (!ad.calm) setXpPop({ id: Date.now(), amount: gain });
      if (!ad.calm) setBurst((b) => b + 1);
      if (mode === 'mistakes' && progress.mistakes.length > 0) {
        setProgress((prev) => ({ mistakes: prev.mistakes.slice(1) }));
      }
    } else {
      setXpPop(null);
      recordMistakeItem();
      // Cola de repaso estilo Duolingo al final de la lección (salvo modo gentil sin fallos)
      if (!ad.gentle && reviewQueueRef.current.length < 3) {
        reviewQueueRef.current.push({
          ...current,
          id: `${current.id}-rev-${Date.now()}`,
          isReview: true,
        });
      }
      // Descuento de vidas reales en estado global (salvo vidas ilimitadas o apoyo gentil)
      if (!effectiveUnlimited) {
        const nextHearts = Math.max(0, progress.hearts - 1);
        setProgress({ hearts: nextHearts });
        if (nextHearts === 0) {
          window.setTimeout(() => {
            if (aliveRef.current) setOutOfHearts(true);
          }, 650);
        }
      }
    }

    const nextCombo = ok ? streak + 1 : 0;
    if (!ad.calm) setCombo(nextCombo >= 2 ? { id: Date.now(), count: nextCombo } : null);
    if (nextCombo > 0 && nextCombo % 5 === 0 && !ad.calm) {
      setFiveToast(nextCombo);
      window.setTimeout(() => {
        if (aliveRef.current) setFiveToast(null);
      }, 2100);
    }
    if (nextCombo >= 3 && !ad.calm && !prefersReducedMotion()) sfx('combo', progress.sound);
  }

  /** Selección estilo Duolingo: 1er clic ilumina en azul, 2º clic en la misma opción o COMPROBAR evalúa. */
  function handleOptionClick(id: string, labelToSpeak?: string) {
    if (feedback !== 'none') return;
    if (ad.gentle) {
      // En perfiles cognitivos/lectura fácil basta 1 toque directo si lo prefieren, o seleccionan rápido
      setSelected(id);
      sfx('click', progress.sound);
      submitAnswer(id === current.correctId);
      return;
    }
    if (selected === id) {
      checkCurrentAnswer();
      return;
    }
    setSelected(id);
    sfx('click', progress.sound);
    if (labelToSpeak && progress.sound && current.modality !== 'auditivo') {
      speak(labelToSpeak, current.lang, true, 0.94);
    }
  }

  function handleChipClick(id: string, labelToSpeak?: string) {
    if (feedback !== 'none') return;
    if (ad.gentle || chip === id) {
      setChip(id);
      submitAnswer(id === current.correctChip);
      return;
    }
    setChip(id);
    sfx('click', progress.sound);
    if (labelToSpeak && progress.sound && current.modality !== 'auditivo') {
      speak(labelToSpeak, current.lang, true, 0.92);
    }
  }

  function addPick(id: string, label?: string) {
    if (feedback !== 'none' || picks.includes(id) || !current.tiles) return;
    sfx('pop', progress.sound);
    if (label && progress.sound && current.modality !== 'auditivo') {
      speak(label, current.lang, true, 0.94);
    }
    setPicks([...picks, id]);
  }

  function handlePairCardTap(cardId: string, side: 'left' | 'right', pairId: string, label: string, cardLang?: Lang) {
    if (feedback !== 'none' || matchedPairIds.includes(pairId)) return;
    sfx('click', progress.sound);
    if (cardLang && progress.sound) {
      speak(label, cardLang, true, 0.92);
    }

    const nextLeft = side === 'left' ? (pairLeft === cardId ? null : cardId) : pairLeft;
    const nextRight = side === 'right' ? (pairRight === cardId ? null : cardId) : pairRight;
    setPairLeft(nextLeft);
    setPairRight(nextRight);

    if (nextLeft && nextRight && current.pairs) {
      const lCard = current.pairs.find((c) => c.id === nextLeft);
      const rCard = current.pairs.find((c) => c.id === nextRight);
      if (lCard && rCard) {
        if (lCard.pairId === rCard.pairId) {
          sfx('pop', progress.sound);
          const updated = [...matchedPairIds, lCard.pairId];
          setMatchedPairIds(updated);
          setPairLeft(null);
          setPairRight(null);
          const totalPairs = current.pairs.length / 2;
          if (updated.length >= totalPairs) {
            submitAnswer(true);
          }
        } else {
          sfx('wrong', progress.sound);
          setWrongPairFlash([nextLeft, nextRight]);
          setPairLeft(null);
          setPairRight(null);
          window.setTimeout(() => {
            if (aliveRef.current) setWrongPairFlash([]);
          }, 420);
        }
      }
    }
  }

  const canCheck = useMemo(() => {
    if (feedback !== 'none') return false;
    if (current.kind === 'choice' || current.kind === 'story') return selected !== null;
    if (current.kind === 'tap') return chip !== null;
    if (current.kind === 'build') return !!current.tiles && picks.length === current.tiles.length;
    if (current.kind === 'dictation') return dictationText.trim().length > 0;
    return false;
  }, [feedback, current, selected, chip, picks, dictationText]);

  function checkCurrentAnswer() {
    if (feedback !== 'none') return;
    if (current.kind === 'choice' || current.kind === 'story') {
      if (!selected) return;
      submitAnswer(selected === current.correctId);
    } else if (current.kind === 'tap') {
      if (!chip) return;
      submitAnswer(chip === current.correctChip);
    } else if (current.kind === 'build' && current.correctOrder) {
      if (picks.length !== current.correctOrder.length) return;
      submitAnswer(picks.every((id, i) => id === current.correctOrder![i]));
    } else if (current.kind === 'dictation') {
      checkDictation();
    }
  }

  function skipExercise() {
    if (feedback !== 'none') return;
    if (current.kind === 'action') {
      completeAction();
      return;
    }
    submitAnswer(false);
  }

  function completeAction() {
    if (feedback !== 'none' || current.kind !== 'action') return;
    let gain = mode === 'practice' ? 8 : 10;
    if (xpBoost) gain *= 2;
    gradedCountRef.current += 1;
    correctRef.current += 1;
    xpRef.current += gain;
    historyRef.current.push({ ok: true, modality: current.modality, lang: current.lang });
    setStepDone((s) => s + 1);
    setLastOk(true);
    sfx('correct', progress.sound);
    if (!ad.calm) setBurst((b) => b + 1);
    advance(true);
  }

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

  function finishSessionNow() {
    const history = historyRef.current;
    const total = Math.max(1, gradedCountRef.current || baseTotal);
    const correct = Math.min(total, correctRef.current);
    const durationSec = Math.max(8, Math.round((Date.now() - startedAtRef.current) / 1000));
    const bonusXp = mode === 'legendary' ? 25 : mode === 'timed' ? 10 : correct === total ? 5 : 0;
    const finalXp = xpRef.current + (xpBoost ? bonusXp * 2 : bonusXp);
    const gemsEarned = mode === 'legendary' ? 30 : correct === total ? 15 : 10;
    const heartsRestored = mode === 'practice' && progress.hearts < 5 && !progress.unlimitedHearts ? 1 : 0;

    const result: SessionResult = {
      mode,
      levelId,
      nodeKey,
      total,
      correct,
      xp: finalXp,
      gemsEarned,
      durationSec,
      xpBoosted: xpBoost,
      stars: starsFor({ total, correct }),
      maxStreak: longestStreak(history),
      visualStreak: longestStreak(history, (m) => m !== 'auditivo'),
      audioStreak: longestStreak(history, (m) => m !== 'visual'),
      langsUsed: Array.from(new Set(history.map((h) => h.lang))) as Lang[],
      perfect: correct === total,
      heartsRestored,
    };
    stopSpeaking();
    onFinish(result);
  }

  function advance(okOverride?: boolean) {
    const wasOk = okOverride ?? lastOk;
    const newStreak = wasOk ? streak + 1 : 0;
    const newWrong = wasOk ? 0 : wrongStreak + 1;
    // Se respeta el nivel elegido por el usuario (Bajo=1, Medio=2, Alto=3); solo se suaviza temporalmente si hay fallos seguidos
    let nextDifficulty = Math.min(userDiffNum, ad.difficultyCap);
    if (mode === 'legendary') nextDifficulty = Math.min(3, ad.difficultyCap);
    else if (newWrong >= 2) nextDifficulty = Math.max(1, nextDifficulty - 1);

    setStreak(newStreak);
    setWrongStreak(newWrong);
    setDifficulty(nextDifficulty);

    const nextSlot = slotIndex + 1;
    let nextEx: Exercise | null = null;

    if (!inReviewPhaseRef.current && nextSlot < baseTotal) {
      // 'both' alterna exclusivamente Español y Euskera
      const lang: Lang = progress.learnLang === 'both' ? (nextSlot % 2 === 0 ? 'es' : 'eu') : progress.learnLang;
      nextEx = makeExercise(nextSlot, nextDifficulty, lang);
      setSlotIndex(nextSlot);
    } else if (reviewQueueRef.current.length > 0) {
      if (!inReviewPhaseRef.current) {
        inReviewPhaseRef.current = true;
        setReviewBanner(true);
        window.setTimeout(() => {
          if (aliveRef.current) setReviewBanner(false);
        }, 2200);
      }
      nextEx = reviewQueueRef.current.shift()!;
    }

    if (!nextEx) {
      finishSessionNow();
      return;
    }

    if (
      !nextEx.isReview &&
      nextEx.syllableStage &&
      current.syllableStage &&
      nextEx.syllableStage > current.syllableStage
    ) {
      setStageUpToast(nextEx.syllableStage);
      if (!ad.calm) sfx('star', progress.sound);
      window.setTimeout(() => {
        if (aliveRef.current) setStageUpToast(null);
      }, 2400);
    }

    stopSpeaking();
    setCurrent(nextEx);
    setSelected(null);
    setPicks([]);
    setChip(null);
    setPairLeft(null);
    setPairRight(null);
    setMatchedPairIds([]);
    setWrongPairFlash([]);
    setFeedback('none');
    setHintShown(false);
    setXpPop(null);
    setCombo(null);
    setActionTaps(0);
    setActionPicks([]);
    actionDoneRef.current = false;
    actionTokenRef.current += 1;
  }

  function listen(rate?: number) {
    if (!current.audio) return;
    if (!progress.sound) {
      setSoundNotice(true);
      return;
    }
    sfx('click', true);
    speak(current.audio.text, current.audio.lang, true, rate ?? progress.speechRate, current.audio.syllables);
  }

  function setSpeechRate(value: number) {
    setProgress({ speechRate: Math.max(0.45, Math.min(1.0, value)) });
  }

  function toggleMusic() {
    if (progress.music) {
      stopAmbientMusic();
      setProgress({ music: false });
    } else {
      startAmbientMusic();
      setProgress({ music: true });
    }
  }

  // Verificación de pronunciación con el micrófono del dispositivo
  const micSupported = isSpeechRecognitionSupported();
  function verifyWithMic() {
    if (!micTarget || !micSupported) {
      setMicStatus('unsupported');
      return;
    }
    setMicStatus('listening');
    const cancel = listenOnceFromMic(current.lang, {
      onResult: (transcripts) => {
        const { ok, bestHeard } = matchesSpokenTarget(transcripts, micTarget, current.lang);
        setMicHeard(bestHeard);
        setMicStatus(ok ? 'ok' : 'ko');
        if (ok) sfx('correct', progress.sound);
        else sfx('wrong', progress.sound);
      },
      onError: (code) => {
        setMicHeard('');
        setMicStatus(code === 'not-allowed' || code === 'service-not-allowed' || code === 'denied' ? 'denied' : 'ko');
      },
      onEnd: () => {},
    });
    void cancel;
  }

  function checkDictation() {
    if (feedback !== 'none' || !current.dictationTarget) return;
    const normalized = normalizeForDictation(dictationText, current.lang);
    submitAnswer(normalized === normalizeForDictation(current.dictationTarget, current.lang));
  }

  function showHint() {
    if (feedback !== 'none') return;
    setHintShown(true);
    sfx('pop', progress.sound);
    if (current.audio && progress.route !== 'visual') listen(0.65);
  }

  // Atajos de teclado estilo Duolingo: 1-4 para seleccionar, Enter para Comprobar / Continuar, R para audio
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (showExit || outOfHearts) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      if (feedback !== 'none') {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          advance();
        }
        return;
      }

      if (e.key.toLowerCase() === 'r' && current.audio && progress.sound) {
        e.preventDefault();
        listen(0.86);
        return;
      }

      if (e.key === 'Enter') {
        if (current.kind === 'action') {
          e.preventDefault();
          completeAction();
        } else if (canCheck) {
          e.preventDefault();
          checkCurrentAnswer();
        }
        return;
      }

      if (!/^[1-9]$/.test(e.key)) return;
      const n = Number(e.key) - 1;
      if (current.kind === 'choice' || current.kind === 'story') {
        const opt = current.options?.[n];
        if (opt) handleOptionClick(opt.id, opt.label);
      } else if (current.kind === 'tap') {
        const c = current.chips?.[n];
        if (c) handleChipClick(c.id, c.label);
      } else if (current.kind === 'build') {
        const available = current.tiles?.filter((tile) => !picks.includes(tile.id)) ?? [];
        const tile = available[n];
        if (tile) addPick(tile.id, tile.label);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const showSoundOrb =
    current.audio &&
    (current.display?.variant === 'none' || current.modality === 'auditivo') &&
    !current.story &&
    current.kind !== 'action' &&
    current.kind !== 'pairs' &&
    current.kind !== 'dictation';

  const voiceNoteVisible = ((!euVoice && !maider.enabled) || (maider.enabled && maider.status === 'error')) && current.lang === 'eu' && progress.sound && !noteDismissed;
  const titleCorrect = ad.gentle ? t('gentleGreat', ui) : t('correctTitle', ui);
  const titleWrong = ad.gentle ? t('gentleAlmost', ui) : t('wrongTitle', ui);
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
              : 'happy';

  const totalProgressTarget = baseTotal + reviewQueueRef.current.length + (current.isReview ? 1 : 0);
  const timeFormatted = `${Math.floor(timeLeft / 60)}:${String(timeLeft % 60).padStart(2, '0')}`;

  return (
    <div className={`duo-lesson-screen ${mode === 'legendary' ? 'is-legendary' : ''} ${ad.calm ? 'calm' : ''}`}>
      {burst > 0 && !ad.calm && <Confetti burstKey={burst} count={26} />}

      {/* Cabecera superior minimalista estilo Duolingo */}
      <header className="duo-lesson-topbar">
        <div className="duo-lesson-topbar-inner">
          <button
            className="duo-close-x"
            onClick={() => setShowExit(true)}
            aria-label={t('exit', ui)}
            title={t('exit', ui)}
          >
            <IconClose size={22} />
          </button>

          <DuoLessonProgress current={stepDone} total={totalProgressTarget} streak={streak} />

          {mode === 'timed' && (
            <span className={`duo-timer-pill ${timeLeft <= 15 ? 'urgent' : ''}`}>
              ⏱️ {timeFormatted}
            </span>
          )}

          {xpBoost && <span className="duo-boost-pill">⚡ 2X</span>}

          <span
            className={`duo-hearts-live ${!effectiveUnlimited && progress.hearts <= 1 ? 'low' : ''}`}
            aria-label={`${effectiveUnlimited ? '∞' : progress.hearts} ${ui === 'eu' ? 'bihotz' : 'vidas'}`}
          >
            <DuoHeartSvg size={24} unlimited={effectiveUnlimited} />
            <strong>{effectiveUnlimited ? '∞' : progress.hearts}</strong>
          </span>

          <button
            className={`duo-music-btn ${progress.music ? 'is-on' : ''}`}
            onClick={toggleMusic}
            aria-label={t('musicQuickOn', ui)}
            title={progress.music ? t('musicQuickOff', ui) : t('musicQuickOn', ui)}
          >
            🎵
          </button>

          <div className="duo-speed-slider" role="group" aria-label={t('audioSpeedLabel', ui)}>
            <span className="duo-speed-emoji">{progress.speechRate <= 0.72 ? '🐢' : '🐇'}</span>
            <input
              type="range"
              min={0.45}
              max={1}
              step={0.05}
              value={progress.speechRate}
              onChange={(e) => setSpeechRate(Number(e.target.value))}
              aria-label={t('audioSpeedLabel', ui)}
            />
          </div>

          <LangChip lang={current.lang} />
        </div>
      </header>

      {/* Avisos flotantes de Racha de 5 o Ronda de Repaso */}
      {fiveToast !== null && (
        <div className="duo-interstitial-toast streak" role="status">
          🔥 {tf('streakFiveBanner', ui, { n: String(fiveToast) })}
        </div>
      )}
      {reviewBanner && (
        <div className="duo-interstitial-toast review" role="status">
          🔄 {t('reviewRoundBanner', ui)}
        </div>
      )}
      {stageUpToast !== null && (
        <div className="duo-interstitial-toast stageup" role="status">
          🧩{' '}
          {tf('sylStageUpBanner', ui, {
            n: String(stageUpToast),
            name: t(stageUpToast === 2 ? 'sylStage2Short' : 'sylStage3Short', ui),
          })}
        </div>
      )}

      {/* Área central del ejercicio */}
      <main
        key={current.id}
        className={`duo-exercise-stage modality-${current.modality} ${progress.bigText ? 'big-text' : ''} ${ad.hyperlegible ? 'hyperlegible' : ''} ${ad.bigTargets ? 'big-targets' : ''}`}
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

        {/* Kicker / Eyebrow superior estilo Duolingo ("NUEVA PALABRA", "ESCUCHA Y ELIGE", "REPASO") */}
        <div className="duo-ex-kicker-row">
          {current.isReview ? (
            <span className="duo-review-tag">🔄 {t('reviewMistakeTag', ui)}</span>
          ) : (
            <span className="duo-eyebrow-tag">
              {mode === 'legendary' ? '👑 ' : bonus ? `${bonus.emoji} ` : '✨ '}
              {current.eyebrow}
            </span>
          )}
          {current.syllableStage && (
            <span className={`duo-syl-stage-pill stage-${current.syllableStage}`}>
              {t(
                current.syllableStage === 1
                  ? 'sylStage1Badge'
                  : current.syllableStage === 2
                    ? 'sylStage2Badge'
                    : 'sylStage3Badge',
                ui,
              )}
            </span>
          )}
          {streak >= 2 && <span className="streak-pill-live">🔥 {streak}</span>}
        </div>

        {/* Instrucción principal + Pato Ventura + Bocadillo con Audio Normal y Tortuga Lenta */}
        <h1 className="duo-ex-headline" ref={promptRef} tabIndex={-1}>{current.prompt}</h1>

        <div className="duo-character-prompt-row">
          <Mascot
            mood={promptMood}
            size={92}
            outfit={progress.equippedOutfit}
            interactive
            sound={progress.sound}
          />
          {current.audio && !showSoundOrb && !current.story && (
            <div className="duo-audio-bubble">
              <button
                className="duo-speaker-btn"
                onClick={() => listen(0.9)}
                aria-label={t('listen', ui)}
                title={t('listen', ui)}
              >
                <IconVolume size={22} />
              </button>
              <button
                className="duo-turtle-btn"
                onClick={() => listen(0.58)}
                aria-label={t('slowAudio', ui)}
                title={t('slowAudio', ui)}
              >
                <DuoTurtleSvg size={22} />
              </button>
              {current.display?.variant === 'word' && current.display.text && (
                <strong className="duo-bubble-word">{current.display.text}</strong>
              )}
            </div>
          )}
        </div>

        {/* Tarjeta de Cuento */}
        {current.story && (
          <section className="story-card">
            <div className="story-emoji" aria-hidden="true">
              {current.story.emoji}
            </div>
            <div className="story-body">
              <h3>{current.story.title}</h3>
              <p>{current.story.text}</p>
              <div className="duo-story-inline-audio">
                <button className="duo-btn duo-btn-blue duo-btn-sm" onClick={() => listen(0.84)}>
                  <IconVolume size={15} />
                  <span>{t('readAloud', ui)}</span>
                </button>
                <button className="duo-btn duo-btn-outline duo-btn-sm" onClick={() => listen(0.58)}>
                  <DuoTurtleSvg size={17} />
                  <span>{t('slowAudio', ui)}</span>
                </button>
              </div>
            </div>
          </section>
        )}

        {/* Área visual (emoji, sílabas, huecos, muestras de color, objetos) */}
        {current.display &&
          current.display.variant !== 'none' &&
          !(current.audio && !showSoundOrb && current.display.variant === 'word') && (
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

        {/* Botones dobles de escucha (Altavoz grande azul + Tortuga lenta) estilo Duolingo Listening */}
        {showSoundOrb && (
          <div className="duo-listening-pair">
            <button
              className="duo-big-speaker"
              onClick={() => listen()}
              aria-label={t('listenAgain', ui)}
            >
              <IconVolume size={40} />
            </button>
            <button
              className="duo-big-turtle"
              onClick={() => listen(Math.max(0.45, Math.min(0.62, progress.speechRate * 0.7)))}
              aria-label={t('slowAudio', ui)}
              title={t('slowAudio', ui)}
            >
              <DuoTurtleSvg size={32} />
            </button>
          </div>
        )}

        {/* Barra de velocidad del audio (sílabas marcadas) y verificación con micrófono */}
        {current.audio && (
          <div className="duo-audio-controls">
            <div className="duo-speed-bar">
              <div className="duo-speed-bar-head">
                <span>🎚️ {t('audioSpeedLabel', ui)}</span>
                <span className="duo-speed-value">
                  {progress.speechRate <= 0.72
                    ? `🐢 ${t('audioSpeedSlowHint', ui)}`
                    : `🐇 ${t('audioSpeedNormalHint', ui)}`}
                </span>
                {current.audio.syllables && progress.speechRate <= 0.72 && (
                  <span className="duo-syl-badge">🎵 {t('audioSpeedMarkedBadge', ui)}</span>
                )}
              </div>
              <input
                type="range"
                className="duo-speed-range"
                min={0.45}
                max={1}
                step={0.05}
                value={progress.speechRate}
                onChange={(e) => setSpeechRate(Number(e.target.value))}
                aria-label={t('audioSpeedLabel', ui)}
              />
              <div className="duo-speed-ticks">
                <span>🐢 0.45</span>
                <span>0.70</span>
                <span>1.00 🐇</span>
              </div>
            </div>

            {micSupported && (
              <div className="duo-mic-bar">
                <button
                  className="duo-btn duo-btn-outline duo-btn-sm"
                  onClick={verifyWithMic}
                  disabled={!micTarget || micStatus === 'listening'}
                >
                  🎤 {t('micRepeatBtn', ui)}
                </button>
                {micStatus === 'listening' && <span className="duo-mic-status">{tf('micListening', ui, { target: micTarget })}</span>}
                {micStatus === 'ok' && (
                  <span className="duo-mic-status ok">{tf('micSuccess', ui, { heard: micHeard || micTarget })}</span>
                )}
                {micStatus === 'ko' && (
                  <span className="duo-mic-status ko">
                    {tf('micTryAgain', ui, { heard: micHeard || t('micEmpty', ui), target: micTarget })}
                  </span>
                )}
                {micStatus === 'denied' && <span className="duo-mic-status ko">{t('micDenied', ui)}</span>}
              </div>
            )}
            {!micSupported && current.kind !== 'action' && current.kind !== 'pairs' && (
              <p className="duo-mic-note">🎤 {t('micUnsupported', ui)}</p>
            )}
          </div>
        )}

        {voiceNoteVisible && (
          <div className="voice-note">
            <span>{t(maider.enabled && maider.status === 'error' ? 'maiderError' : 'voiceFallback', ui)}</span>
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

        {/* 1 · Opciones de Selección Múltiple estilo Duolingo */}
        {(current.kind === 'choice' || current.kind === 'story') && current.options && (
          <div className={`options options-${current.options.length > 3 ? 'four' : 'three'}`}>
            {current.options.map((opt, i) => {
              const isCorrect = opt.id === current.correctId;
              const isChosen = selected === opt.id;
              const state =
                feedback === 'none'
                  ? isChosen
                    ? 'is-selected'
                    : ''
                  : isCorrect
                    ? 'is-correct'
                    : isChosen
                      ? 'is-wrong'
                      : 'is-muted';
              return (
                <button
                  key={opt.id}
                  className={`option ${state} ${opt.emoji ? 'has-emoji' : ''} ${opt.color ? 'has-swatch' : ''}`}
                  style={staggerStyle(i)}
                  onClick={() => handleOptionClick(opt.id, opt.emoji === opt.label ? undefined : opt.label)}
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

        {/* 2 · Tocar Letra / Sílaba */}
        {current.kind === 'tap' && current.chips && (
          <div className="chip-area">
            <p className="area-caption">{t('tapToFind', ui)}</p>
            <div className="chip-row">
              {current.chips.map((c, i) => {
                const isCorrect = c.id === current.correctChip;
                const isChosen = chip === c.id;
                const state =
                  feedback === 'none'
                    ? isChosen
                      ? 'is-selected'
                      : ''
                    : isCorrect
                      ? 'is-correct'
                      : isChosen
                        ? 'is-wrong'
                        : 'is-muted';
                return (
                  <button
                    key={c.id}
                    className={`letter-chip ${state}`}
                    style={staggerStyle(i)}
                    onClick={() => handleChipClick(c.id, c.label)}
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

        {/* 3 · Banco de Palabras / Sílabas sobre renglones estilo Duolingo */}
        {current.kind === 'build' && current.tiles && current.correctOrder && (
          <div className="duo-wordbank">
            <p className="area-caption">{t('tapToOrder', ui)}</p>
            <div className="duo-wordbank-lines">
              {picks.length === 0 && (
                <span className="duo-wordbank-placeholder">{t('tapToOrder', ui)}…</span>
              )}
              {picks.map((pickedId, i) => {
                const tile = current.tiles!.find((x) => x.id === pickedId);
                return (
                  <button
                    key={`${pickedId}-${i}`}
                    className={`duo-wb-tile picked ${current.unit === 'word' ? 'tile-word' : ''}`}
                    onClick={() => {
                      if (feedback === 'none') {
                        sfx('click', progress.sound);
                        setPicks(picks.filter((_, idx) => idx !== i));
                      }
                    }}
                    disabled={feedback !== 'none'}
                  >
                    {tile?.label ?? ''}
                  </button>
                );
              })}
            </div>

            <div className="duo-wb-pool">
              {current.tiles.map((tile, i) => {
                const used = picks.includes(tile.id);
                return (
                  <div key={tile.id} className="duo-wb-slot-ghost">
                    <button
                      style={staggerStyle(i)}
                      className={`duo-wb-tile ${used ? 'is-used' : ''} ${current.unit === 'word' ? 'tile-word' : ''}`}
                      onClick={() => addPick(tile.id, tile.label)}
                      disabled={used || feedback !== 'none'}
                    >
                      {tile.label}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 4 · Emparejar Parejas (2 columnas estilo Duolingo Match Pairs) */}
        {current.kind === 'pairs' && current.pairs && (
          <div className="duo-pairs-grid">
            <div className="duo-pairs-col">
              {current.pairs
                .filter((c) => c.side === 'left')
                .map((card, i) => {
                  const isMatched = matchedPairIds.includes(card.pairId);
                  const isSelected = pairLeft === card.id;
                  const isWrong = wrongPairFlash.includes(card.id);
                  return (
                    <button
                      key={card.id}
                      style={staggerStyle(i)}
                      disabled={isMatched || feedback !== 'none'}
                      className={`duo-pair-btn ${isSelected ? 'is-selected' : ''} ${isMatched ? 'is-matched' : ''} ${isWrong ? 'is-wrong' : ''}`}
                      onClick={() => handlePairCardTap(card.id, 'left', card.pairId, card.label, card.lang)}
                    >
                      {card.emoji && card.label !== card.emoji && <span className="pair-emoji">{card.emoji}</span>}
                      <span className={card.label === card.emoji ? 'pair-big-emoji' : 'pair-label'}>{card.label}</span>
                    </button>
                  );
                })}
            </div>
            <div className="duo-pairs-col">
              {current.pairs
                .filter((c) => c.side === 'right')
                .map((card, i) => {
                  const isMatched = matchedPairIds.includes(card.pairId);
                  const isSelected = pairRight === card.id;
                  const isWrong = wrongPairFlash.includes(card.id);
                  return (
                    <button
                      key={card.id}
                      style={staggerStyle(i)}
                      disabled={isMatched || feedback !== 'none'}
                      className={`duo-pair-btn ${isSelected ? 'is-selected' : ''} ${isMatched ? 'is-matched' : ''} ${isWrong ? 'is-wrong' : ''}`}
                      onClick={() => handlePairCardTap(card.id, 'right', card.pairId, card.label, card.lang)}
                    >
                      <span className="pair-label">{card.label}</span>
                    </button>
                  );
                })}
            </div>
          </div>
        )}

        {/* 5 · Minijuegos de Acción de Pato Ventura (sin fallo) */}
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
              <button className="duo-btn duo-btn-outline" onClick={() => listen(0.78)}>
                🔁 {t('actionAgain', ui)}
              </button>
              {actionGame?.kind !== 'imitate' && (
                <button className="duo-btn duo-btn-green duo-btn-lg" onClick={completeAction}>
                  {t('actionDo', ui)}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Dictado con audio: escribir lo que se escucha (con banco de letras de ayuda) */}
        {current.kind === 'dictation' && current.dictationTarget && (
          <div className="duo-dictation">
            <label className="duo-dictation-label" htmlFor="dictation-input">
              {t('eyebrowDictation', ui)}
            </label>
            <input
              id="dictation-input"
              type="text"
              className="duo-dictation-input"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              value={dictationText}
              onChange={(e) => setDictationText(e.target.value)}
              placeholder={current.dictationPlaceholder}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && canCheck) {
                  e.preventDefault();
                  checkCurrentAnswer();
                }
              }}
            />
            {current.tiles && (
              <div className="duo-dictation-bank" aria-label={t('dictationHelperBank', ui)}>
                {current.tiles.map((tile, i) => (
                  <button
                    key={tile.id}
                    style={staggerStyle(i)}
                    className="duo-wb-tile tile-letter"
                    onClick={() => {
                      if (feedback === 'none') setDictationText((prev) => `${prev}${tile.label}`);
                    }}
                    disabled={feedback !== 'none'}
                  >
                    {tile.label}
                  </button>
                ))}
              </div>
            )}
            <div className="duo-dictation-actions">
              <button className="duo-btn duo-btn-outline duo-btn-sm" onClick={() => listen()}>
                <IconVolume size={15} />
                <span>{t('listen', ui)}</span>
              </button>
              <button
                className="duo-btn duo-btn-outline duo-btn-sm"
                onClick={() => listen(Math.max(0.45, Math.min(0.62, progress.speechRate * 0.7)))}
              >
                <DuoTurtleSvg size={17} />
                <span>{t('slowAudio', ui)}</span>
              </button>
              <button
                className="duo-btn duo-btn-yellow-ghost duo-btn-sm"
                onClick={verifyWithMic}
                disabled={!micTarget || micStatus === 'listening'}
              >
                🎤 {t('micRepeatBtn', ui)}
              </button>
            </div>
          </div>
        )}

        {/* Caja de pista desplegable */}
        {hintShown && feedback === 'none' && (
          <div className="hint-box">
            <Mascot mood="think" size={58} outfit={progress.equippedOutfit} />
            <div>
              <strong>💡 {t('hintTitle', ui)}</strong>
              <p>{current.hint}</p>
            </div>
            <button className="duo-close-x" onClick={() => setHintShown(false)} aria-label={t('hideHint', ui)}>
              <IconClose size={16} />
            </button>
          </div>
        )}
      </main>

      {/* Barra Inferior Fija de Ancho Completo estilo Duolingo (COMPROBAR / Feedback Verde o Rojo) */}
      <footer
        className={`duo-lesson-bottombar ${feedback === 'correct' ? 'is-correct' : feedback === 'wrong' ? 'is-wrong' : ''}`}
        role="status"
      >
        <div className="duo-lesson-bottom-inner">
          {feedback === 'none' ? (
            <>
              <div className="duo-bottom-left-btns">
                <button className="duo-btn duo-btn-outline" onClick={skipExercise}>
                  {t('skipBtn', ui)}
                </button>
                <button
                  className="duo-btn duo-btn-yellow-ghost"
                  onClick={showHint}
                  disabled={hintShown}
                >
                  <IconLightbulb size={17} />
                  <span>{t('hint', ui).toUpperCase()}</span>
                </button>
              </div>

              {current.kind === 'action' ? (
                <button className="duo-btn duo-btn-green duo-btn-lg" onClick={completeAction}>
                  <span>{t('continueBtn', ui).toUpperCase()}</span>
                </button>
              ) : current.kind === 'pairs' ? (
                <span className="duo-pairs-counter">
                  {matchedPairIds.length} / {(current.pairs?.length ?? 8) / 2}
                </span>
              ) : (
                <button
                  className="duo-btn duo-btn-green duo-btn-lg"
                  disabled={!canCheck}
                  onClick={checkCurrentAnswer}
                >
                  <span>{t('check', ui).toUpperCase()}</span>
                </button>
              )}
            </>
          ) : (
            <>
              <div className="duo-feedback-left">
                <span className={`duo-fb-circle ${feedback}`} aria-hidden="true">
                  {feedback === 'correct' ? <IconCheck size={28} /> : <IconClose size={28} />}
                </span>
                <div className="duo-fb-copy">
                  <h3>{feedback === 'correct' ? titleCorrect : titleWrong}</h3>
                  {feedback === 'wrong' && correctLabel && (
                    <p className="duo-fb-solution">
                      {t('correctAnswerLabel', ui)}: <strong>{correctLabel}</strong>
                    </p>
                  )}
                  <p className="duo-fb-explain">{current.explanation}</p>
                </div>
              </div>

              <button
                className={`duo-btn ${feedback === 'correct' ? 'duo-btn-green' : 'duo-btn-red'} duo-btn-lg`}
                onClick={() => advance()}
                autoFocus
              >
                <span>{feedback === 'correct' ? t('continueBtn', ui).toUpperCase() : t('gotItBtn', ui)}</span>
                <IconArrowRight size={17} />
              </button>
            </>
          )}
        </div>
      </footer>

      {/* Modal "¡Te quedaste sin vidas!": nunca bloquea el aprendizaje.
          La opción gratuita va primera; cerrar el modal también activa vidas ilimitadas. */}
      {outOfHearts && (
        <Modal
          onClose={() => {
            setProgress({ unlimitedHearts: true, hearts: 5 });
            setOutOfHearts(false);
          }}
        >
          <div className="duo-hearts-modal">
            <Mascot mood="sad" size={118} outfit={progress.equippedOutfit} />
            <h2>{t('outOfHeartsTitle', ui)}</h2>
            <p>{t('heartsFreeSub', ui)}</p>
            <div className="duo-hearts-modal-gems">
              <DuoGemSvg size={22} /> <strong>{progress.gems}</strong>
            </div>
            <div className="duo-pop-btn-col">
              <button
                className="duo-btn duo-btn-green duo-btn-full"
                onClick={() => {
                  sfx('star', progress.sound);
                  setProgress({ unlimitedHearts: true, hearts: 5 });
                  setOutOfHearts(false);
                }}
              >
                ♾️ {t('heartsFree', ui)}
              </button>
              <button
                className="duo-btn duo-btn-blue duo-btn-full"
                disabled={progress.gems < 100}
                onClick={() => {
                  if (progress.gems >= 100) {
                    sfx('star', progress.sound);
                    setProgress({ gems: progress.gems - 100, hearts: 5 });
                    setOutOfHearts(false);
                  }
                }}
              >
                {t('refillGemsBtn', ui)}
              </button>
              <button
                className="duo-btn duo-btn-outline duo-btn-full"
                onClick={() => {
                  stopSpeaking();
                  onExit();
                }}
              >
                {t('leaveLessonBtn', ui)}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal de confirmación de salida */}
      {showExit && (
        <Modal onClose={() => setShowExit(false)}>
          <div className="duo-hearts-modal">
            <Mascot mood="sad" size={110} outfit={progress.equippedOutfit} />
            <h3>{t('exitTitle', ui)}</h3>
            <p>{t('exitSub', ui)}</p>
            <div className="duo-pop-btn-col">
              <button className="duo-btn duo-btn-blue duo-btn-full" onClick={() => setShowExit(false)}>
                {t('exitNo', ui).toUpperCase()}
              </button>
              <button
                className="duo-btn duo-btn-red-ghost duo-btn-full"
                onClick={() => {
                  stopSpeaking();
                  onExit();
                }}
              >
                {t('exitYes', ui).toUpperCase()}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
