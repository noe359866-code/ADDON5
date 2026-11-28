import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Confetti, Mascot, StarRow } from './components';
import { t, tf } from './i18n';
import { awardReadingXp } from './progress';
import {
  alignManual,
  alignReading,
  passagesForLevel,
  readingFeedback,
  readingStars,
  readingXp,
  spokenWords,
  tokenizeReading,
} from './reading';
import type { ReadingAlignment } from './reading';
import { isSpeechRecognitionSupported, listenStreamFromMic, sfx, speak, stopSpeaking } from './sound';
import { stageColor } from './stages';
import type { Lang, Progress } from './types';

/* ================================================================== */
/* Micrófono de lectura con seguimiento en vivo                        */
/* ================================================================== */

interface ReadingResult {
  matched: number;
  total: number;
  stars: number;
  xp: number;
}

export function ReadingCoachView({
  progress,
  setProgress,
  onToast,
}: {
  progress: Progress;
  setProgress: (patch: Partial<Progress> | ((prev: Progress) => Partial<Progress>)) => void;
  onToast: (text: string) => void;
}) {
  const ui = progress.uiLang;
  const level = stageColor(progress.schoolStage);
  const micSupported = isSpeechRecognitionSupported();
  const passages = useMemo(() => passagesForLevel(level.key), [level.key]);

  const [passageId, setPassageId] = useState<string>(() => passages[0]?.id ?? '');
  const passage = passages.find((p) => p.id === passageId) ?? passages[0]!;

  const [readLang, setReadLang] = useState<Lang>(
    progress.learnLang === 'eu' ? 'eu' : progress.learnLang === 'en' ? 'en' : 'es',
  );
  const text = passage.text[readLang];
  const tokens = useMemo(() => tokenizeReading(text), [text]);

  const [listening, setListening] = useState(false);
  const [finalText, setFinalText] = useState('');
  const [interimText, setInterimText] = useState('');
  const [error, setError] = useState<'denied' | 'unsupported' | 'language' | 'error' | null>(null);
  const [manualReads, setManualReads] = useState<number[]>([]);
  const [result, setResult] = useState<ReadingResult | null>(null);
  const [awarded, setAwarded] = useState(false);
  const [burst, setBurst] = useState(0);
  const stopRef = useRef<(() => void) | null>(null);
  const mountedRef = useRef(false);

  const stopMic = useCallback(() => {
    stopRef.current?.();
    stopRef.current = null;
    setListening(false);
  }, []);

  const resetReading = useCallback(() => {
    stopMic();
    stopSpeaking();
    setFinalText('');
    setInterimText('');
    setManualReads([]);
    setResult(null);
    setAwarded(false);
    setError(null);
  }, [stopMic]);

  /* Al cambiar de color, el texto elegido puede no existir en el nuevo nivel. */
  useEffect(() => {
    if (!passages.some((p) => p.id === passageId) && passages[0]) setPassageId(passages[0].id);
  }, [passages, passageId]);

  /* Al cambiar de texto o de idioma se empieza de cero (no en el primer montaje). */
  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }
    resetReading();
  }, [passageId, readLang, resetReading]);

  /* Nunca se deja el micrófono abierto al salir de la pestaña. */
  useEffect(
    () => () => {
      stopRef.current?.();
      stopSpeaking();
    },
    [],
  );

  const usingManual = !micSupported || manualReads.length > 0;
  const heard = useMemo(() => [...spokenWords(finalText), ...spokenWords(interimText)], [finalText, interimText]);

  const alignment: ReadingAlignment = useMemo(
    () => (usingManual ? alignManual(tokens, manualReads) : alignReading(tokens, heard)),
    [usingManual, tokens, manualReads, heard],
  );

  const finish = useCallback(
    (current: ReadingAlignment) => {
      stopMic();
      const stars = readingStars(current.matched, current.total);
      const xp = readingXp(current.matched, stars);
      setResult({ matched: current.matched, total: current.total, stars, xp });
      sfx(stars >= 2 ? 'levelup' : 'star', progress.sound);
    },
    [stopMic, progress.sound],
  );

  /* Al leer la última palabra se cierra la lectura automáticamente. */
  useEffect(() => {
    if (!listening || result) return;
    if (alignment.total > 0 && alignment.matched >= alignment.total) finish(alignment);
  }, [listening, result, alignment, finish]);

  function startListening() {
    setError(null);
    setManualReads([]);
    setFinalText('');
    setInterimText('');
    setResult(null);
    setAwarded(false);
    const stop = listenStreamFromMic(readLang, {
      onTranscript: ({ final, interim }) => {
        setFinalText(final);
        setInterimText(interim);
      },
      onError: (code) => {
        stopRef.current = null;
        setListening(false);
        setError(
          code === 'denied'
            ? 'denied'
            : code === 'unsupported'
              ? 'unsupported'
              : code === 'language-not-supported'
                ? 'language'
                : 'error',
        );
      },
      onEnd: () => {
        stopRef.current = null;
        setListening(false);
      },
    });
    if (stop) {
      stopRef.current = stop;
      setListening(true);
      sfx('pop', progress.sound);
    }
  }

  function toggleWord(index: number) {
    if (listening || result) return;
    sfx('click', progress.sound);
    setManualReads((prev) => (prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]));
  }

  function claimReward() {
    if (!result || awarded) return;
    setProgress((prev) => awardReadingXp(prev, result.xp, 5));
    setAwarded(true);
    setBurst((b) => b + 1);
    sfx('badge', progress.sound);
    onToast(`✨ +${result.xp} XP · +5 💎`);
  }

  const pct = alignment.total > 0 ? Math.round((alignment.matched / alignment.total) * 100) : 0;
  const spokenText = [finalText, interimText].filter(Boolean).join(' ').trim();

  return (
    <div className="duo-tab-page duo-read-page">
      {burst > 0 && !progress.calmMode && <Confetti burstKey={burst} count={30} />}

      <div className="duo-letters-hero duo-read-hero">
        <div>
          <h1>🎤 {t('readingTitle', ui)}</h1>
          <p>{t('readingSub', ui)}</p>
          <span
            className="duo-dict-level-chip"
            style={{ background: level.soft, color: level.ink, borderColor: level.color }}
          >
            <span aria-hidden="true">{level.emoji}</span> {level.name[ui]}
          </span>
        </div>
        <Mascot mood={listening ? 'excited' : 'happy'} size={104} outfit={progress.equippedOutfit} interactive sound={progress.sound} />
      </div>

      {/* Elección de texto e idioma */}
      <section className="duo-read-picker">
        <span className="duo-read-picker-label">📚 {t('readingPassageLabel', ui)}</span>
        <div className="duo-read-passages">
          {passages.map((p) => (
            <button
              key={p.id}
              className={`duo-read-passage-btn ${p.id === passage.id ? 'active' : ''}`}
              onClick={() => setPassageId(p.id)}
              aria-pressed={p.id === passage.id}
            >
              <span aria-hidden="true">{p.emoji}</span>
              <span>{p.title[ui === 'eu' ? 'eu' : 'es']}</span>
            </button>
          ))}
        </div>
        <div className="duo-pill-toggle" role="group" aria-label={t('learningLabel', ui)}>
          {(['es', 'eu', 'en'] as Lang[]).map((lg) => (
            <button
              key={lg}
              className={readLang === lg ? 'active' : ''}
              onClick={() => setReadLang(lg)}
              aria-pressed={readLang === lg}
            >
              {lg === 'es' ? 'ES' : lg === 'eu' ? 'EU' : 'EN'}
            </button>
          ))}
        </div>
      </section>

      {/* Tarjeta de lectura */}
      <section className="duo-read-card">
        <div className="duo-read-card-head">
          <span className="duo-read-emoji" aria-hidden="true">
            {passage.emoji}
          </span>
          <h2>{passage.title[ui === 'eu' ? 'eu' : 'es']}</h2>
          <span className={`duo-read-mic-state ${listening ? 'on' : ''}`}>
            <span aria-hidden="true">🎤</span>
            {listening ? t('readingMicOn', ui) : t('readingMicOff', ui)}
          </span>
        </div>

        <p className="duo-read-text">
          {tokens.map((token, i) => {
            const state = alignment.states[i] ?? 'pending';
            const className = `duo-read-word is-${state}`;
            if (listening || result) {
              return (
                <span key={`${token.text}-${i}`} className={className}>
                  {token.text}{' '}
                </span>
              );
            }
            return (
              <button
                key={`${token.text}-${i}`}
                type="button"
                className={className}
                onClick={() => toggleWord(i)}
                aria-pressed={state === 'read'}
                aria-label={token.text}
              >
                {token.text}{' '}
              </button>
            );
          })}
        </p>

        <div className="duo-read-track" aria-hidden="true">
          <div className="duo-read-track-fill" style={{ width: `${pct}%` }} />
        </div>
        <div className="duo-read-meta">
          <span>{tf('readingWordsCount', ui, { done: String(alignment.matched), total: String(alignment.total) })}</span>
          <span>{pct}%</span>
        </div>

        <div className="duo-read-controls">
          {!listening ? (
            <button
              className="duo-read-mic-btn"
              onClick={() => (micSupported ? startListening() : setError('unsupported'))}
              disabled={!!result || !micSupported}
              aria-label={t('readingStart', ui)}
            >
              <span aria-hidden="true">🎤</span>
              <span>{t('readingStart', ui)}</span>
            </button>
          ) : (
            <button className="duo-read-mic-btn is-on" onClick={stopMic} aria-label={t('readingStop', ui)}>
              <span aria-hidden="true">⏹️</span>
              <span>{t('readingStop', ui)}</span>
            </button>
          )}

          <button
            className="duo-btn duo-btn-outline"
            onClick={() => {
              sfx('click', progress.sound);
              speak(text, readLang, progress.sound, progress.speechRate);
            }}
          >
            🔊 {t('readingSpeak', ui)}
          </button>

          <button
            className="duo-btn duo-btn-green"
            onClick={() => finish(alignment)}
            disabled={alignment.matched === 0 || !!result}
          >
            ✅ {t('readingFinish', ui)}
          </button>

          <button className="duo-btn duo-btn-outline" onClick={resetReading}>
            🔄 {t('readingReset', ui)}
          </button>
        </div>

        <div className="duo-read-status" aria-live="polite">
          {listening && (
            <span className="duo-read-listening">
              <span className="duo-read-pulse" aria-hidden="true" />
              {t('readingListening', ui)}
            </span>
          )}
          {spokenText ? (
            <span className="duo-read-heard">{tf('readingHeard', ui, { text: spokenText })}</span>
          ) : listening ? (
            <span className="duo-read-hint">{t('readingHeardEmpty', ui)}</span>
          ) : (
            <span className="duo-read-hint">{t('readingTapHint', ui)}</span>
          )}
          {error && (
            <span className="duo-read-error">
              {error === 'denied'
                ? t('readingDenied', ui)
                : error === 'language'
                  ? t('readingLangUnsupported', ui)
                  : error === 'unsupported'
                    ? t('readingUnsupported', ui)
                    : t('readingMicError', ui)}
            </span>
          )}
        </div>

        {!micSupported && <p className="duo-read-note">🎤 {t('readingTapHint', ui)}</p>}
      </section>

      {/* Resultado */}
      {result && (
        <section className="duo-read-result" role="status">
          <StarRow count={result.stars} size="lg" animate={!progress.calmMode} />
          <div className="duo-read-result-copy">
            <strong>{t('readingDoneTitle', ui)}</strong>
            <p>{tf('readingDoneSub', ui, { done: String(result.matched), total: String(result.total) })}</p>
            <p className="duo-read-feedback">{readingFeedback(result.matched, result.total, ui)}</p>
          </div>
          <div className="duo-read-result-actions">
            <button className="duo-btn duo-btn-green" onClick={claimReward} disabled={awarded}>
              {awarded ? `✅ ${t('readingClaimed', ui)}` : tf('readingClaim', ui, { xp: String(result.xp) })}
            </button>
            <button
              className="duo-btn duo-btn-outline"
              onClick={() => {
                resetReading();
                setPassageId((id) => {
                  const idx = passages.findIndex((p) => p.id === id);
                  const next = passages[(idx + 1) % passages.length];
                  return next ? next.id : id;
                });
              }}
            >
              📖 {t('readingNext', ui)}
            </button>
          </div>
        </section>
      )}

      <p className="duo-read-privacy">🔒 {t('readingPrivacy', ui)}</p>
    </div>
  );
}
