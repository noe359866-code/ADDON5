import { useMemo, useState } from 'react';
import { Confetti, Mascot, Modal } from './components';
import { badges, bonusModes, levels } from './data';
import {
  DUO_ACHIEVEMENTS,
  DUO_STORIES,
  LEAGUE_RIVALS,
  LEAGUES,
  OUTFIT_CATALOG,
  PHONETIC_SECTIONS,
  UNIT_GUIDEBOOKS,
  UNIT_THEMES,
  getDailyQuests,
} from './duoData';
import type { DuoStory } from './duoData';
import {
  DuoCrownSvg,
  DuoFlagSvg,
  DuoFlameSvg,
  DuoGemSvg,
  DuoHeartSvg,
  DuoTurtleSvg,
  IconBook,
  IconCheck,
  IconClose,
  IconLock,
  IconPlay,
  IconSettings,
  IconVolume,
} from './icons';
import { t, tf } from './i18n';
import { getRecentWeekStats, isXpBoostActive, xpBoostMinutesLeft } from './progress';
import { sfx, speak, stopSpeaking } from './sound';
import type { Lang, OutfitId, Progress, SessionMode, SyllableStage, UiLang } from './types';

/* ================================================================== */
/* 1 · Modal Guía de Unidad (Guidebook)                               */
/* ================================================================== */

export function GuidebookModal({
  unitId,
  ui,
  sound,
  outfit,
  onClose,
}: {
  unitId: number;
  ui: UiLang;
  sound: boolean;
  outfit: OutfitId;
  onClose: () => void;
}) {
  const gb = UNIT_GUIDEBOOKS[unitId] ?? UNIT_GUIDEBOOKS[1]!;
  const level = levels.find((l) => l.id === unitId) ?? levels[0]!;
  const theme = UNIT_THEMES[unitId] ?? UNIT_THEMES[1]!;

  return (
    <Modal onClose={onClose} labelledBy="guidebook-title">
      <div className="duo-guidebook">
        <div className="duo-gb-banner" style={{ background: theme.bg, borderBottomColor: theme.lip }}>
          <span className="duo-gb-kicker">{tf('sectionUnit', ui, { n: String(unitId) })}</span>
          <h2 id="guidebook-title">{tf('guidebookTitle', ui, { n: String(unitId) })}: {level[ui].title}</h2>
          <p>{level[ui].sub}</p>
        </div>

        <div className="duo-gb-tip">
          <Mascot mood="happy" size={76} outfit={outfit} interactive sound={sound} />
          <div className="duo-gb-tip-bubble">
            <strong>💡 {t('guidebookTips', ui)}</strong>
            <p>{ui === 'eu' ? gb.tipEu : gb.tipEs}</p>
          </div>
        </div>

        <div className="duo-gb-rule">
          <h3>📖 {ui === 'eu' ? gb.ruleTitleEu : gb.ruleTitleEs}</h3>
          <p>{ui === 'eu' ? gb.ruleBodyEu : gb.ruleBodyEs}</p>
        </div>

        <h3 className="duo-gb-subhead">🔊 {t('guidebookPhrases', ui)}</h3>
        <div className="duo-gb-phrases">
          {gb.phrases.map((ph, i) => (
            <div key={i} className="duo-gb-phrase-card">
              <span className="duo-gb-emoji" aria-hidden="true">{ph.emoji}</span>
              <div className="duo-gb-phrase-texts">
                <div className="duo-gb-lang-line">
                  <span className="duo-mini-tag tag-es">ES</span>
                  <strong>{ph.es}</strong>
                  <small>({ph.sylEs})</small>
                  <button
                    className="duo-audio-mini"
                    onClick={() => {
                      sfx('click', sound);
                      speak(ph.es, 'es', sound, 0.9);
                    }}
                    title="Escuchar ES"
                  >
                    <IconVolume size={15} />
                  </button>
                  <button
                    className="duo-audio-mini slow"
                    onClick={() => {
                      sfx('click', sound);
                      speak(ph.es, 'es', sound, 0.6);
                    }}
                    title={t('slowAudio', ui)}
                  >
                    <DuoTurtleSvg size={16} />
                  </button>
                </div>
                <div className="duo-gb-lang-line">
                  <span className="duo-mini-tag tag-eu">EU</span>
                  <strong>{ph.eu}</strong>
                  <small>({ph.sylEu})</small>
                  <button
                    className="duo-audio-mini"
                    onClick={() => {
                      sfx('click', sound);
                      speak(ph.eu, 'eu', sound, 0.88);
                    }}
                    title="Entzun EU"
                  >
                    <IconVolume size={15} />
                  </button>
                  <button
                    className="duo-audio-mini slow"
                    onClick={() => {
                      sfx('click', sound);
                      speak(ph.eu, 'eu', sound, 0.58);
                    }}
                    title={t('slowAudio', ui)}
                  >
                    <DuoTurtleSvg size={16} />
                  </button>
                </div>
                <div className="duo-gb-lang-line">
                  <span className="duo-mini-tag tag-en">EN</span>
                  <strong>{ph.en}</strong>
                  <small>({ph.sylEn})</small>
                  <button
                    className="duo-audio-mini"
                    onClick={() => {
                      sfx('click', sound);
                      speak(ph.en, 'en', sound, 0.88);
                    }}
                    title="Listen EN"
                  >
                    <IconVolume size={15} />
                  </button>
                  <button
                    className="duo-audio-mini slow"
                    onClick={() => {
                      sfx('click', sound);
                      speak(ph.en, 'en', sound, 0.58);
                    }}
                    title={t('slowAudio', ui)}
                  >
                    <DuoTurtleSvg size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <button className="duo-btn duo-btn-green duo-btn-full" onClick={onClose}>
          {t('gotItBtn', ui)}
        </button>
      </div>
    </Modal>
  );
}

/* ================================================================== */
/* 2 · Pestaña Sonidos / Letras (estilo Hiragana/Phonics de Duolingo)  */
/* ================================================================== */

export function LettersView({
  progress,
  setProgress,
  onStartLettersLesson,
  onStartSyllableStage,
}: {
  progress: Progress;
  setProgress: (patch: Partial<Progress> | ((prev: Progress) => Partial<Progress>)) => void;
  onStartLettersLesson: () => void;
  onStartSyllableStage?: (stage?: SyllableStage) => void;
}) {
  const ui = progress.uiLang;
  const activeLang: Lang = progress.learnLang === 'eu' ? 'eu' : progress.learnLang === 'en' ? 'en' : 'es';
  const [listenLang, setListenLang] = useState<Lang>(activeLang);

  const stage1Done = (progress.nodeProgress['u2-n0'] ?? 0) >= 1 || !!progress.completed[2];
  const stage2Done = (progress.nodeProgress['u2-n1'] ?? 0) >= 1 || !!progress.completed[2];
  const stage3Done = (progress.nodeProgress['u2-n3'] ?? 0) >= 1 || !!progress.completed[2];

  const stage2Unlocked = progress.unlockAll || stage1Done;
  const stage3Unlocked = progress.unlockAll || stage2Done;

  function handleCardTap(id: string, audioEs: string, audioEu: string, audioEn: string) {
    sfx('pop', progress.sound);
    const audioText = listenLang === 'eu' ? audioEu : listenLang === 'en' ? audioEn : audioEs;
    speak(audioText, listenLang, progress.sound, progress.speechRate);
    if (!progress.lettersMastered.includes(id)) {
      setProgress((prev) => ({
        lettersMastered: prev.lettersMastered.includes(id) ? prev.lettersMastered : [...prev.lettersMastered, id],
        xp: prev.xp + 2,
      }));
    }
  }

  const stageCards: {
    stage: SyllableStage;
    title: string;
    sub: string;
    chips: string[];
    color: string;
    done: boolean;
    unlocked: boolean;
  }[] = [
    {
      stage: 1,
      title: t('sylStage1Short', ui),
      sub: t('sylStage1Sub', ui),
      chips:
        listenLang === 'eu'
          ? ['ma', 'ka', 'lu', 'zo', 'pi']
          : listenLang === 'en'
            ? ['ba', 'na', 'to', 'ma', 'so']
            : ['ma', 'pa', 'lu', 'so', 'pe'],
      color: 'green',
      done: stage1Done,
      unlocked: true,
    },
    {
      stage: 2,
      title: t('sylStage2Short', ui),
      sub: t('sylStage2Sub', ui),
      chips:
        listenLang === 'eu'
          ? ['ir', 'es', 'ar', 'ez', 'in']
          : listenLang === 'en'
            ? ['is', 'an', 'in', 'ar', 'am']
            : ['is', 'es', 'ar', 'an', 'in'],
      color: 'blue',
      done: stage2Done,
      unlocked: stage2Unlocked,
    },
    {
      stage: 3,
      title: t('sylStage3Short', ui),
      sub: t('sylStage3Sub', ui),
      chips:
        listenLang === 'eu'
          ? ['pla', 'tre', 'dra', 'kle', 'bra']
          : listenLang === 'en'
            ? ['pla', 'tra', 'dra', 'cle', 'fru']
            : ['pla', 'tre', 'dra', 'cle', 'bra'],
      color: 'purple',
      done: stage3Done,
      unlocked: stage3Unlocked,
    },
  ];

  return (
    <div className="duo-tab-page">
      <div className="duo-letters-hero">
        <div>
          <h1>{t('lettersTitle', ui)}</h1>
          <p>{t('lettersSub', ui)}</p>
          <div className="duo-letters-actions">
            <button
              className="duo-btn duo-btn-green"
              onClick={() => (onStartSyllableStage ? onStartSyllableStage() : onStartLettersLesson())}
            >
              <IconPlay size={16} />
              <span>{ui === 'eu' ? '1 → 2 → 3 PROGRESIOA +15 XP' : 'PROGRESIÓN 1 → 2 → 3 +15 XP'}</span>
            </button>
            <button className="duo-btn duo-btn-outline" onClick={onStartLettersLesson}>
              <span>{t('lettersPracticeBtn', ui)}</span>
            </button>
            <div className="duo-pill-toggle" role="group">
              <button
                className={listenLang === 'es' ? 'active' : ''}
                onClick={() => setListenLang('es')}
              >
                🔊 ES
              </button>
              <button
                className={listenLang === 'eu' ? 'active' : ''}
                onClick={() => setListenLang('eu')}
              >
                🔊 EU
              </button>
              <button
                className={listenLang === 'en' ? 'active' : ''}
                onClick={() => setListenLang('en')}
              >
                🔊 EN
              </button>
            </div>
            <div className="duo-speed-bar duo-letters-speed">
              <div className="duo-speed-bar-head">
                <span>🎚️ {t('audioSpeedLabel', ui)}</span>
                <span className="duo-speed-value">
                  {progress.speechRate <= 0.72 ? `🐢 ${t('audioSpeedSlowHint', ui)}` : `🐇 ${t('audioSpeedNormalHint', ui)}`}
                </span>
              </div>
              <input
                type="range"
                className="duo-speed-range"
                min={0.45}
                max={1}
                step={0.05}
                value={progress.speechRate}
                onChange={(e) => setProgress({ speechRate: Number(e.target.value) })}
                aria-label={t('audioSpeedLabel', ui)}
              />
            </div>
          </div>
        </div>
        <Mascot mood="happy" size={108} outfit={progress.equippedOutfit} interactive sound={progress.sound} />
      </div>

      {/* Escalera Progresiva de Sílabas: 1 · Directas → 2 · Inversas → 3 · Trabadas */}
      {onStartSyllableStage && (
        <section className="duo-card-box duo-syl-ladder-box">
          <div className="duo-card-box-head">
            <h2>🧩 {t('sylProgTitle', ui)}</h2>
          </div>
          <p className="duo-syl-ladder-sub">{t('sylProgSub', ui)}</p>
          <div className="duo-syl-ladder-grid">
            {stageCards.map((sc) => (
              <div
                key={sc.stage}
                className={`duo-syl-step-card tone-${sc.color} ${sc.done ? 'is-done' : ''} ${!sc.unlocked ? 'is-locked' : ''}`}
              >
                <div className="duo-syl-step-head">
                  <span className={`duo-syl-step-badge tone-${sc.color}`}>
                    {sc.done ? <IconCheck size={16} /> : !sc.unlocked ? <IconLock size={15} /> : sc.stage}
                  </span>
                  <strong>{sc.title}</strong>
                </div>
                <p>{sc.sub}</p>
                <div className="duo-syl-chip-preview">
                  {sc.chips.map((ch) => (
                    <span key={ch}>{ch}</span>
                  ))}
                </div>
                <button
                  className={`duo-btn duo-btn-sm duo-btn-full ${
                    !sc.unlocked
                      ? 'duo-btn-outline'
                      : sc.color === 'green'
                        ? 'duo-btn-green'
                        : sc.color === 'blue'
                          ? 'duo-btn-blue'
                          : 'duo-btn-purple'
                  }`}
                  onClick={() => onStartSyllableStage(sc.stage)}
                >
                  {!sc.unlocked
                    ? `⚡ ${ui === 'eu' ? 'HONA SALTO EGIN' : 'SALTAR A ESTA ETAPA'}`
                    : sc.done
                      ? `${ui === 'eu' ? 'ERRIPIKATU' : 'REPASAR'} +10 XP`
                      : `${t('startPill', ui)} +15 XP`}
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {PHONETIC_SECTIONS.map((sec) => (
        <section key={sec.id} className="duo-letters-section">
          <div className="duo-sec-divider">
            <span>{ui === 'eu' ? sec.titleEu : sec.titleEs}</span>
          </div>
          <div className="duo-sec-sub-row">
            <p className="duo-sec-sub">{ui === 'eu' ? sec.subEu : sec.subEs}</p>
            {sec.stage && onStartSyllableStage && (
              <button
                className="duo-btn duo-btn-outline duo-btn-sm"
                onClick={() => onStartSyllableStage(sec.stage)}
              >
                <IconPlay size={13} />
                <span>{ui === 'eu' ? 'Praktikatu' : 'Practicar'}</span>
              </button>
            )}
          </div>
          <div className="duo-phonetic-grid">
            {sec.cards.map((card) => {
              const mastered = progress.lettersMastered.includes(card.id);
              return (
                <button
                  key={card.id}
                  className={`duo-phonetic-card ${mastered ? 'mastered' : ''}`}
                  onClick={() => handleCardTap(card.id, card.audioEs, card.audioEu, card.audioEn)}
                >
                  <span className="duo-phonetic-emoji" aria-hidden="true">{card.emoji}</span>
                  <strong className="duo-phonetic-sym">{card.symbol}</strong>
                  <small className="duo-phonetic-ex">
                    {listenLang === 'eu' ? card.exampleEu : listenLang === 'en' ? card.exampleEn : card.exampleEs}
                  </small>
                  <span className="duo-phonetic-bar">
                    <i style={{ width: mastered ? '100%' : '22%' }} />
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

/* ================================================================== */
/* 3 · Pestaña Cuentos Interactivos + Lector Paso a Paso               */
/* ================================================================== */

export function StoryPlayerModal({
  story,
  progress,
  onComplete,
  onClose,
}: {
  story: DuoStory;
  progress: Progress;
  onComplete: (storyId: string, xpReward: number) => void;
  onClose: () => void;
}) {
  const ui = progress.uiLang;
  const primaryLang: Lang = progress.learnLang === 'eu' ? 'eu' : progress.learnLang === 'en' ? 'en' : 'es';
  const [readLang, setReadLang] = useState<Lang>(primaryLang);
  const [showDual, setShowDual] = useState(progress.learnLang === 'both');
  const [visibleSteps, setVisibleSteps] = useState(1);
  const [quizAnswered, setQuizAnswered] = useState<Record<number, boolean>>({});
  const [wrongPick, setWrongPick] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const activeStepIndex = visibleSteps - 1;
  const activeStep = story.steps[activeStepIndex];
  const needsQuiz = !!activeStep?.quiz && !quizAnswered[activeStepIndex];
  const isLastStep = visibleSteps >= story.steps.length && !needsQuiz;

  function storyTitleFor(l: Lang): string {
    return l === 'eu' ? story.titleEu : l === 'en' ? story.titleEn : story.titleEs;
  }

  function stepTextFor(step: DuoStory['steps'][number], l: Lang): string {
    return l === 'eu' ? step.eu : l === 'en' ? step.en : step.es;
  }

  function speakLine(text: string, lang: Lang, rate = 0.88) {
    speak(text, lang, progress.sound, rate);
  }

  function nextLine() {
    if (needsQuiz) return;
    if (visibleSteps < story.steps.length) {
      const nextIdx = visibleSteps;
      const nextStep = story.steps[nextIdx]!;
      setVisibleSteps(nextIdx + 1);
      setWrongPick(null);
      sfx('pop', progress.sound);
      speakLine(stepTextFor(nextStep, readLang), readLang);
    } else {
      setDone(true);
      sfx('levelup', progress.sound);
    }
  }

  function answerQuiz(stepIdx: number, optIdx: number, ok?: boolean) {
    if (quizAnswered[stepIdx]) return;
    if (ok) {
      sfx('correct', progress.sound);
      setWrongPick(null);
      setQuizAnswered((prev) => ({ ...prev, [stepIdx]: true }));
    } else {
      sfx('wrong', progress.sound);
      setWrongPick(`${stepIdx}-${optIdx}`);
    }
  }

  return (
    <div className="duo-story-overlay">
      {done && !progress.calmMode && <Confetti burstKey={1} count={42} />}
      <header className="duo-story-topbar">
        <button
          className="duo-close-x"
          onClick={() => {
            stopSpeaking();
            onClose();
          }}
          aria-label={t('close', ui)}
        >
          <IconClose size={22} />
        </button>
        <div className="duo-lesson-bar">
          <div
            className="duo-lesson-bar-fill"
            style={{ width: `${Math.round(((done ? story.steps.length : visibleSteps) / story.steps.length) * 100)}%` }}
          >
            <span className="duo-lesson-bar-shine" />
          </div>
        </div>
        <div className="duo-story-lang-controls">
          <button
            className={`duo-chip-btn ${readLang === 'es' ? 'on' : ''}`}
            onClick={() => setReadLang('es')}
          >
            ES
          </button>
          <button
            className={`duo-chip-btn ${readLang === 'eu' ? 'on' : ''}`}
            onClick={() => setReadLang('eu')}
          >
            EU
          </button>
          <button
            className={`duo-chip-btn ${readLang === 'en' ? 'on' : ''}`}
            onClick={() => setReadLang('en')}
          >
            EN
          </button>
          <button
            className={`duo-chip-btn ${showDual ? 'on' : ''}`}
            onClick={() => setShowDual((v) => !v)}
            title="Subtítulo bilingüe ES+EU"
          >
            ES+EU
          </button>
        </div>
      </header>

      <main className="duo-story-stage">
        {!done ? (
          <>
            <div className="duo-story-title-card">
              <span className="duo-story-cover-icon" style={{ background: story.color }}>
                {story.emoji}
              </span>
              <div>
                <h2>{storyTitleFor(readLang)}</h2>
                {showDual && (
                  <p className="duo-story-dual-sub">{readLang === 'eu' ? story.titleEs : story.titleEu}</p>
                )}
              </div>
              <button
                className="duo-audio-circle"
                onClick={() => speakLine(storyTitleFor(readLang), readLang)}
                aria-label={t('listen', ui)}
              >
                <IconVolume size={18} />
              </button>
            </div>

            <div className="duo-story-lines">
              {story.steps.slice(0, visibleSteps).map((step, idx) => {
                const mainText = stepTextFor(step, readLang);
                const subText = readLang === 'eu' ? step.es : readLang === 'en' ? (ui === 'eu' ? step.eu : step.es) : step.eu;
                return (
                  <div key={idx} className="duo-story-block">
                    <div className="duo-story-line">
                      <span className="duo-story-avatar" aria-hidden="true">{step.avatar}</span>
                      <div className="duo-story-speech">
                        <div className="duo-story-speaker-row">
                          <strong>{step.speaker}</strong>
                          <div className="duo-story-audio-btns">
                            <button
                              className="duo-audio-mini"
                              onClick={() => speakLine(mainText, readLang, 0.9)}
                              aria-label={t('listen', ui)}
                            >
                              <IconVolume size={15} />
                            </button>
                            <button
                              className="duo-audio-mini slow"
                              onClick={() => speakLine(mainText, readLang, 0.6)}
                              aria-label={t('slowAudio', ui)}
                            >
                              <DuoTurtleSvg size={15} />
                            </button>
                          </div>
                        </div>
                        <p className="duo-story-main-text">{mainText}</p>
                        {showDual && <p className="duo-story-sub-text">{subText}</p>}
                      </div>
                    </div>

                    {step.quiz && (
                      <div className="duo-story-quiz">
                        <h4>
                          {readLang === 'en'
                            ? step.quiz.questionEn
                            : ui === 'eu'
                              ? step.quiz.questionEu
                              : step.quiz.questionEs}
                        </h4>
                        <div className="duo-story-quiz-opts">
                          {step.quiz.options.map((opt, oIdx) => {
                            const answered = !!quizAnswered[idx];
                            const isWrong = wrongPick === `${idx}-${oIdx}`;
                            return (
                              <button
                                key={oIdx}
                                disabled={answered}
                                className={`duo-story-opt ${answered && opt.ok ? 'is-correct' : ''} ${isWrong ? 'is-wrong' : ''}`}
                                onClick={() => answerQuiz(idx, oIdx, opt.ok)}
                              >
                                <span>{readLang === 'eu' ? opt.eu : readLang === 'en' ? opt.en : opt.es}</span>
                                {answered && opt.ok && <IconCheck size={16} />}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="duo-story-done-card">
            <Mascot mood="cheer" size={140} outfit={progress.equippedOutfit} interactive sound={progress.sound} />
            <h2>{ui === 'eu' ? 'Ipuina amaituta!' : '¡Cuento completado!'}</h2>
            <p>{storyTitleFor(readLang)}</p>
            <div className="duo-result-boxes two-cols">
              <div className="duo-rbox yellow">
                <span className="duo-rbox-head">{t('statTotalXp', ui)}</span>
                <strong>+{story.xpReward} XP</strong>
              </div>
              <div className="duo-rbox blue">
                <span className="duo-rbox-head">{t('statGems', ui)}</span>
                <strong>+10 💎</strong>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="duo-story-bottombar">
        <div className="duo-story-bottom-inner">
          {!done ? (
            <button
              className="duo-btn duo-btn-green duo-btn-lg"
              disabled={needsQuiz}
              onClick={nextLine}
            >
              {isLastStep ? t('storyFinish', ui) : t('storyContinue', ui)}
            </button>
          ) : (
            <button
              className="duo-btn duo-btn-green duo-btn-lg"
              onClick={() => {
                stopSpeaking();
                onComplete(story.id, story.xpReward);
              }}
            >
              {t('continueBtn', ui).toUpperCase()}
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}

export function StoriesView({
  progress,
  setProgress,
  onOpenStory,
}: {
  progress: Progress;
  setProgress: (patch: Partial<Progress> | ((prev: Progress) => Partial<Progress>)) => void;
  onOpenStory: (story: DuoStory) => void;
}) {
  const ui = progress.uiLang;
  const sets = [1, 2];

  return (
    <div className="duo-tab-page">
      <div className="duo-letters-hero stories-hero">
        <div>
          <h1>{t('storiesTitle', ui)}</h1>
          <p>{t('storiesSub', ui)}</p>
          <div className="duo-speed-bar duo-letters-speed">
            <div className="duo-speed-bar-head">
              <span>🎚️ {t('audioSpeedLabel', ui)}</span>
              <span className="duo-speed-value">
                {progress.speechRate <= 0.72 ? `🐢 ${t('audioSpeedSlowHint', ui)}` : `🐇 ${t('audioSpeedNormalHint', ui)}`}
              </span>
            </div>
            <input
              type="range"
              className="duo-speed-range"
              min={0.45}
              max={1}
              step={0.05}
              value={progress.speechRate}
              onChange={(e) => setProgress({ speechRate: Number(e.target.value) })}
              aria-label={t('audioSpeedLabel', ui)}
            />
          </div>
        </div>
        <Mascot mood="excited" size={106} outfit={progress.equippedOutfit} interactive sound={progress.sound} />
      </div>

      {sets.map((setNum) => (
        <section key={setNum} className="duo-letters-section">
          <div className="duo-sec-divider">
            <span>{ui === 'eu' ? `${setNum}. Bilduma` : `Serie ${setNum}`}</span>
          </div>
          <div className="duo-stories-grid">
            {DUO_STORIES.filter((s) => s.set === setNum).map((st) => {
              const isRead = progress.storiesRead.includes(st.id);
              return (
                <button
                  key={st.id}
                  className={`duo-story-book-card ${isRead ? 'is-read' : ''}`}
                  onClick={() => onOpenStory(st)}
                >
                  <div
                    className="duo-story-book-cover"
                    style={{ background: isRead ? '#ffc800' : st.color }}
                  >
                    <span className="duo-story-book-emoji">{st.emoji}</span>
                    {isRead && (
                      <span className="duo-story-read-check">
                        <IconCheck size={14} />
                      </span>
                    )}
                  </div>
                  <strong>
                    {progress.learnLang === 'en' ? st.titleEn : ui === 'eu' ? st.titleEu : st.titleEs}
                  </strong>
                  <span className="duo-story-xp-tag">
                    {isRead ? t('storyReplayBtn', ui) : t('storyStartBtn', ui)}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

/* ================================================================== */
/* 4 · Centro de Práctica (Practice Hub estilo Super Duolingo)         */
/* ================================================================== */

export function PracticeHubView({
  progress,
  onStartMode,
}: {
  progress: Progress;
  onStartMode: (mode: SessionMode, levelId: number | null) => void;
}) {
  const ui = progress.uiLang;

  return (
    <div className="duo-tab-page">
      <div className="duo-super-practice-banner">
        <div>
          <span className="duo-super-pill">{t('superBadge', ui)}</span>
          <h1>{t('practiceHubTitle', ui)}</h1>
          <p>{t('practiceHubSub', ui)}</p>
          <button
            className="duo-btn duo-btn-white"
            onClick={() => onStartMode('practice', null)}
          >
            ❤️ {ui === 'eu' ? 'PRAKTIKA AZKARRA (+1 BIHOTZ)' : 'PRÁCTICA RÁPIDA (+1 VIDA)'}
          </button>
        </div>
        <Mascot mood="cheer" size={116} outfit={progress.equippedOutfit} interactive sound={progress.sound} />
      </div>

      <div className="duo-practice-list">
        <button
          className="duo-practice-row"
          onClick={() => onStartMode('mistakes', null)}
        >
          <span className="duo-practice-icon orange">🎯</span>
          <div className="duo-practice-copy">
            <strong>
              {t('mistakesTitle', ui)}
              {progress.mistakes.length > 0 && (
                <span className="duo-count-badge">{progress.mistakes.length}</span>
              )}
            </strong>
            <p>{progress.mistakes.length > 0 ? t('mistakesDesc', ui) : t('mistakesEmpty', ui)}</p>
          </div>
          <span className="duo-practice-cta">+15 XP</span>
        </button>

        <button
          className="duo-practice-row"
          onClick={() => onStartMode('timed', null)}
        >
          <span className="duo-practice-icon purple">⏱️</span>
          <div className="duo-practice-copy">
            <strong>{t('timedTitle', ui)}</strong>
            <p>{t('timedDesc', ui)}</p>
          </div>
          <span className="duo-practice-cta">+20 XP</span>
        </button>

        <button
          className="duo-practice-row"
          onClick={() => onStartMode('listening', null)}
        >
          <span className="duo-practice-icon blue">🎧</span>
          <div className="duo-practice-copy">
            <strong>{t('listeningTitle', ui)}</strong>
            <p>{t('listeningDesc', ui)}</p>
          </div>
          <span className="duo-practice-cta">+15 XP</span>
        </button>

        {bonusModes.map((bm) => (
          <button
            key={bm.id}
            className="duo-practice-row"
            onClick={() => onStartMode('level', bm.id)}
          >
            <span className={`duo-practice-icon ${bm.id === 7 ? 'yellow' : 'green'}`}>{bm.emoji}</span>
            <div className="duo-practice-copy">
              <strong>{bm[ui].title}</strong>
              <p>{bm[ui].sub}</p>
            </div>
            <span className="duo-practice-cta">+10 XP</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ================================================================== */
/* 5 · Ligas Semanales (Leaderboards estilo Duolingo)                  */
/* ================================================================== */

export function LeaderboardView({
  progress,
  setProgress,
  onToast,
}: {
  progress: Progress;
  setProgress: (patch: Partial<Progress> | ((prev: Progress) => Partial<Progress>)) => void;
  onToast: (msg: string) => void;
}) {
  const ui = progress.uiLang;
  const leagueIdx = Math.min(LEAGUES.length - 1, Math.max(0, progress.leagueId ?? 2));
  const currentLeague = LEAGUES[leagueIdx]!;

  const rows = useMemo(() => {
    const myName = progress.name || (ui === 'eu' ? 'Lagun (Zu)' : 'Tú');
    const all = [
      ...LEAGUE_RIVALS.map((r) => ({
        id: r.id,
        name: r.name,
        avatar: r.avatar,
        bg: r.bg,
        xp: r.baseXp,
        streak: r.streak,
        flag: r.langFlag,
        isMe: false,
      })),
      {
        id: 'me',
        name: myName,
        avatar: '🦆',
        bg: '#d7ffb8',
        xp: progress.xp,
        streak: progress.streak,
        flag: (progress.learnLang === 'both' ? 'ES+EU' : progress.learnLang.toUpperCase()) as 'ES' | 'EU' | 'EN' | 'ES+EU',
        isMe: true,
      },
    ];
    return all.sort((a, b) => b.xp - a.xp);
  }, [progress.xp, progress.name, progress.streak, progress.learnLang, ui]);

  const myRank = rows.findIndex((r) => r.isMe) + 1;

  return (
    <div className="duo-tab-page">
      <div className="duo-league-header">
        <div className="duo-league-shields">
          {LEAGUES.map((lg) => (
            <span
              key={lg.id}
              className={`duo-league-shield ${lg.id === leagueIdx ? 'current' : lg.id < leagueIdx ? 'passed' : 'locked'}`}
              title={lg[ui]}
            >
              {lg.badge}
            </span>
          ))}
        </div>
        <h1>{tf('leagueTitle', ui, { name: currentLeague[ui] })}</h1>
        <p>{t('leagueSubtitle', ui)}</p>
        <div className="duo-league-meta">
          <span>⏳ {t('leagueDaysLeft', ui)}</span>
          <span>#{myRank} · {progress.xp} XP</span>
          {myRank <= 5 && leagueIdx < LEAGUES.length - 1 && (
            <button
              className="duo-btn duo-btn-green duo-btn-sm"
              onClick={() => {
                const nextLg = LEAGUES[leagueIdx + 1]!;
                setProgress({ leagueId: leagueIdx + 1, gems: progress.gems + 40 });
                sfx('levelup', progress.sound);
                onToast(
                  ui === 'eu'
                    ? `Zorionak! ${nextLg.eu} Ligara igo zara (+40 💎)`
                    : `¡Ascendiste a la Liga ${nextLg.es}! (+40 💎)`,
                );
              }}
            >
              ▲ {ui === 'eu' ? 'IGO LIGAZ ORAIN' : 'ASCENDER DE LIGA'}
            </button>
          )}
        </div>
      </div>

      <div className="duo-leaderboard-table">
        {rows.map((r, i) => {
          const rank = i + 1;
          const rankBadge = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : String(rank);
          return (
            <div key={r.id}>
              <div className={`duo-lb-row ${r.isMe ? 'is-me' : ''} ${rank <= 5 ? 'in-promo' : ''}`}>
                <span className={`duo-lb-rank rank-${rank <= 3 ? rank : 'n'}`}>{rankBadge}</span>
                <span className="duo-lb-avatar" style={{ background: r.bg }} aria-hidden="true">
                  {r.avatar}
                </span>
                <div className="duo-lb-info">
                  <strong>
                    {r.name}
                    {r.isMe && <span className="duo-you-chip">{t('youTag', ui)}</span>}
                  </strong>
                  <small>🔥 {r.streak}d · {r.flag}</small>
                </div>
                <strong className="duo-lb-xp">{r.xp} XP</strong>
              </div>
              {rank === 5 && (
                <div className="duo-zone-divider promo">
                  <span>▲ {t('promotionZone', ui)} ▲</span>
                </div>
              )}
              {rank === 10 && (
                <div className="duo-zone-divider demo">
                  <span>▼ {t('demotionZone', ui)} ▼</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ================================================================== */
/* 6 · Misiones del Día y Desafío Mensual (Quests estilo Duolingo)     */
/* ================================================================== */

export function QuestsView({
  progress,
  setProgress,
  onToast,
}: {
  progress: Progress;
  setProgress: (patch: Partial<Progress> | ((prev: Progress) => Partial<Progress>)) => void;
  onToast: (msg: string) => void;
}) {
  const ui = progress.uiLang;
  const quests = getDailyQuests(progress, ui);
  const monthlyProgress = Math.min(20, progress.sessions + Object.values(progress.questClaims).filter(Boolean).length);

  function claimQuest(qId: string, gems: number) {
    sfx('badge', progress.sound);
    setProgress((prev) => ({
      gems: prev.gems + gems,
      questClaims: { ...prev.questClaims, [qId]: true },
    }));
    onToast(ui === 'eu' ? `+${gems} harribitxi irabazi dituzu! 💎` : `¡Reclamaste +${gems} gemas! 💎`);
  }

  return (
    <div className="duo-tab-page">
      <div className="duo-monthly-quest-banner">
        <div className="duo-mq-copy">
          <span className="duo-mq-pill">
            {ui === 'eu' ? 'AZAROKO ERRONKA' : 'DESAFÍO DEL MES'}
          </span>
          <h1>{ui === 'eu' ? 'Pato Venturaren Irakurketa Jaia' : 'El Festival de Lectura de Pato Ventura'}</h1>
          <p>
            {ui === 'eu'
              ? 'Osatu 20 saio eta misio hilabete honetako Urrezko Domina lortzeko.'
              : 'Completa 20 lecciones y misiones para ganar la Insignia Especial del Mes.'}
          </p>
          <div className="duo-mq-progress-card">
            <div className="duo-mq-bar-head">
              <strong>{monthlyProgress} / 20</strong>
              <span>🏆</span>
            </div>
            <div className="duo-quest-bar">
              <div className="duo-quest-fill" style={{ width: `${Math.round((monthlyProgress / 20) * 100)}%` }} />
            </div>
          </div>
        </div>
        <Mascot mood="excited" size={118} outfit={progress.equippedOutfit} interactive sound={progress.sound} />
      </div>

      <section className="duo-card-box">
        <div className="duo-card-box-head">
          <h2>{t('dailyQuestsTitle', ui)}</h2>
          <span className="duo-muted-tag">⏰ 24h</span>
        </div>

        <div className="duo-quests-list">
          {quests.map((q) => {
            const pct = Math.min(100, Math.round((q.current / q.target) * 100));
            return (
              <div key={q.id} className={`duo-quest-item ${q.done ? 'is-done' : ''}`}>
                <span className="duo-quest-emoji" aria-hidden="true">{q.emoji}</span>
                <div className="duo-quest-body">
                  <div className="duo-quest-title-row">
                    <strong>{q.title}</strong>
                    <span className="duo-quest-gem-tag">+{q.rewardGems} 💎</span>
                  </div>
                  <div className="duo-quest-bar-wrap">
                    <div className="duo-quest-bar">
                      <div className="duo-quest-fill" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="duo-quest-count">{q.current} / {q.target}</span>
                  </div>
                </div>
                {q.done && !q.claimed ? (
                  <button
                    className="duo-btn duo-btn-green duo-btn-sm"
                    onClick={() => claimQuest(q.id, q.rewardGems)}
                  >
                    🎁 {t('claimReward', ui)}
                  </button>
                ) : q.claimed ? (
                  <span className="duo-quest-claimed-pill">✓ {t('claimedLabel', ui)}</span>
                ) : (
                  <span className="duo-quest-chest-icon" aria-hidden="true">📦</span>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className="duo-card-box">
        <h2>🎯 {t('dailyGoalLabel', ui)}</h2>
        <div className="duo-goal-grid">
          {[
            { xp: 10, es: 'Relajada', eu: 'Lasaia' },
            { xp: 20, es: 'Normal', eu: 'Arrunta' },
            { xp: 30, es: 'Seria', eu: 'Serioa' },
            { xp: 50, es: 'Intensa', eu: 'Bizkorra' },
          ].map((g) => (
            <button
              key={g.xp}
              className={`duo-goal-btn ${progress.dailyGoal === g.xp ? 'selected' : ''}`}
              onClick={() => {
                sfx('click', progress.sound);
                setProgress({ dailyGoal: g.xp });
              }}
            >
              <strong>{ui === 'eu' ? g.eu : g.es}</strong>
              <span>{g.xp} XP / {ui === 'eu' ? 'egun' : 'día'}</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

/* ================================================================== */
/* 7 · Tienda de Gemas & Boutique de Pato Ventura                      */
/* ================================================================== */

export function ShopView({
  progress,
  setProgress,
  onToast,
}: {
  progress: Progress;
  setProgress: (patch: Partial<Progress> | ((prev: Progress) => Partial<Progress>)) => void;
  onToast: (msg: string) => void;
}) {
  const ui = progress.uiLang;
  const boostActive = isXpBoostActive(progress);
  const boostMins = xpBoostMinutesLeft(progress);

  function spendGems(cost: number, action: () => void) {
    if (progress.gems < cost) {
      sfx('wrong', progress.sound);
      onToast(t('notEnoughGems', ui));
      return;
    }
    sfx('star', progress.sound);
    action();
  }

  return (
    <div className="duo-tab-page">
      <div className="duo-shop-banner">
        <div>
          <h1>{t('shopTitle', ui)}</h1>
          <p>{t('shopSub', ui)}</p>
          <div className="duo-shop-balance">
            <DuoGemSvg size={24} />
            <strong>{progress.gems}</strong>
            <span>{ui === 'eu' ? 'harribitxi erabilgarri' : 'gemas disponibles'}</span>
          </div>
        </div>
        <Mascot mood="happy" size={114} outfit={progress.equippedOutfit} interactive sound={progress.sound} />
      </div>

      {/* Super HitzBidaia Card */}
      <div className="duo-super-card">
        <div className="duo-super-card-body">
          <span className="duo-super-pill">{t('superBadge', ui)}</span>
          <h3>{t('superTitle', ui)}</h3>
          <p>{t('superDesc', ui)}</p>
        </div>
        <button
          className={`duo-btn ${progress.unlimitedHearts ? 'duo-btn-outline' : 'duo-btn-white'}`}
          onClick={() => {
            sfx('star', progress.sound);
            const next = !progress.unlimitedHearts;
            setProgress({ unlimitedHearts: next, hearts: 5 });
            onToast(next ? t('superActive', ui) : '5 ❤️');
          }}
        >
          {progress.unlimitedHearts ? t('superDeactivate', ui) : t('superActivate', ui)}
        </button>
      </div>

      {/* Vidas */}
      <section className="duo-card-box">
        <h2>{t('shopHeartsSection', ui)}</h2>
        <div className="duo-shop-row">
          <span className="duo-shop-icon"><DuoHeartSvg size={42} /></span>
          <div className="duo-shop-copy">
            <strong>{ui === 'eu' ? 'Bete Bihotzak (5/5)' : 'Rellenar vidas (5/5)'}</strong>
            <p>{ui === 'eu' ? 'Berreskuratu zure 5 bihotzak akatsengatik ez gelditzeko.' : 'Recupera tus 5 vidas al instante para seguir aprendiendo.'}</p>
          </div>
          <button
            className="duo-btn duo-btn-blue"
            disabled={progress.hearts >= 5 || progress.unlimitedHearts}
            onClick={() =>
              spendGems(100, () => {
                setProgress({ gems: progress.gems - 100, hearts: 5 });
                onToast('❤️ 5 / 5!');
              })
            }
          >
            {progress.unlimitedHearts ? '♾️' : progress.hearts >= 5 ? 'LLENAS' : '100 💎'}
          </button>
        </div>
      </section>

      {/* Potenciadores */}
      <section className="duo-card-box">
        <h2>{t('shopPowerupsSection', ui)}</h2>
        <div className="duo-shop-list">
          <div className="duo-shop-row">
            <span className="duo-shop-icon">🧊</span>
            <div className="duo-shop-copy">
              <strong>
                {ui === 'eu' ? 'Bolada Babeslea' : 'Protector de racha'} ({progress.streakFreezes}/2)
              </strong>
              <p>{ui === 'eu' ? ' Zure bolada babesten du egun batean jolastu ezin baduzu.' : 'Protege tu racha automáticamente si un día no puedes practicar.'}</p>
            </div>
            <button
              className="duo-btn duo-btn-blue"
              disabled={progress.streakFreezes >= 2}
              onClick={() =>
                spendGems(200, () => {
                  setProgress({ gems: progress.gems - 200, streakFreezes: progress.streakFreezes + 1 });
                  onToast('🧊 Protector equipado!');
                })
              }
            >
              {progress.streakFreezes >= 2 ? '2/2 EQUIPADO' : '200 💎'}
            </button>
          </div>

          <div className="duo-shop-row">
            <span className="duo-shop-icon">⚡</span>
            <div className="duo-shop-copy">
              <strong>{ui === 'eu' ? 'XP Bikoitza Edabea (15 min)' : 'Poción de Doble XP (15 min)'}</strong>
              <p>{ui === 'eu' ? 'Irabazi XP bikoitza hurrengo 15 minutuetako ikasgaietan!' : '¡Gana el doble de XP en todas las lecciones durante 15 minutos!'}</p>
            </div>
            <button
              className="duo-btn duo-btn-purple"
              disabled={boostActive}
              onClick={() =>
                spendGems(150, () => {
                  setProgress({ gems: progress.gems - 150, xpBoostUntil: Date.now() + 15 * 60 * 1000 });
                  onToast('⚡ ¡Doble XP activo durante 15 minutos!');
                })
              }
            >
              {boostActive ? `⚡ ${boostMins}m` : '150 💎'}
            </button>
          </div>

          <div className="duo-shop-row">
            <span className="duo-shop-icon">🔥</span>
            <div className="duo-shop-copy">
              <strong>{ui === 'eu' ? 'Bikoitza edo Ezer Ez' : 'Doble o Nada'}</strong>
              <p>{ui === 'eu' ? 'Mantendu 7 eguneko bolada zure 50 harribitxiak bikoizteko!' : 'Apuesta 50 gemas y duplícalas manteniendo una racha de 7 días.'}</p>
            </div>
            <button
              className="duo-btn duo-btn-orange"
              disabled={!!progress.doubleOrNothing?.active}
              onClick={() =>
                spendGems(50, () => {
                  setProgress({
                    gems: progress.gems - 50,
                    doubleOrNothing: { active: true, startDate: progress.dailyDate },
                  });
                  onToast('🔥 ¡Apuesta Doble o Nada activada!');
                })
              }
            >
              {progress.doubleOrNothing?.active ? t('activeBtn', ui) : '50 💎'}
            </button>
          </div>
        </div>
      </section>

      {/* Boutique de Pato Ventura */}
      <section className="duo-card-box">
        <h2>{t('shopOutfitsSection', ui)}</h2>
        <div className="duo-outfit-grid">
          {OUTFIT_CATALOG.map((item) => {
            const owned = progress.outfits.includes(item.id);
            const equipped = progress.equippedOutfit === item.id;
            return (
              <div key={item.id} className={`duo-outfit-card ${equipped ? 'equipped' : ''}`}>
                <div className="duo-outfit-preview">
                  <Mascot mood="happy" size={86} outfit={item.id} />
                </div>
                <strong>{item.emoji} {item[ui].name}</strong>
                <small>{item[ui].desc}</small>
                {equipped ? (
                  <button className="duo-btn duo-btn-green duo-btn-sm" disabled>
                    ✓ {t('equippedBtn', ui)}
                  </button>
                ) : owned ? (
                  <button
                    className="duo-btn duo-btn-outline duo-btn-sm"
                    onClick={() => {
                      sfx('pop', progress.sound);
                      setProgress({ equippedOutfit: item.id });
                    }}
                  >
                    {t('equipBtn', ui)}
                  </button>
                ) : (
                  <button
                    className="duo-btn duo-btn-blue duo-btn-sm"
                    onClick={() =>
                      spendGems(item.price, () => {
                        setProgress({
                          gems: progress.gems - item.price,
                          outfits: [...progress.outfits, item.id],
                          equippedOutfit: item.id,
                        });
                        onToast(`${item.emoji} ${item[ui].name}!`);
                      })
                    }
                  >
                    {item.price} 💎
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

/* ================================================================== */
/* 8 · Perfil del Estudiante (Estadísticas, Gráfica 7d y Logros)       */
/* ================================================================== */

export function ProfileView({
  progress,
  setProgress,
  onOpenSettings,
}: {
  progress: Progress;
  setProgress: (patch: Partial<Progress> | ((prev: Progress) => Partial<Progress>)) => void;
  onOpenSettings: () => void;
}) {
  const ui = progress.uiLang;
  const name = progress.name || (ui === 'eu' ? 'Lagun' : 'Amigo');
  const league = LEAGUES[Math.min(LEAGUES.length - 1, progress.leagueId ?? 2)]!;
  const totalStars = levels.reduce((acc, l) => acc + (progress.stars[l.id] ?? 0), 0);
  const weekStats = getRecentWeekStats(progress);
  const maxDayXp = Math.max(30, ...weekStats.map((d) => d.xp));

  return (
    <div className="duo-tab-page">
      <div className="duo-profile-header">
        <div className="duo-profile-avatar-ring">
          <Mascot mood="wave" size={118} outfit={progress.equippedOutfit} interactive sound={progress.sound} />
        </div>
        <div className="duo-profile-identity">
          <h1>{name}</h1>
          <p className="duo-profile-joined">{tf('profileJoined', ui, { date: progress.joinedDate })}</p>
          <div className="duo-profile-badges-inline">
            <span className="duo-flag-pill">
              <DuoFlagSvg code={progress.learnLang} size={22} />
              <strong>
                {progress.learnLang === 'both'
                  ? 'ES + EU'
                  : progress.learnLang === 'eu'
                    ? 'Euskara'
                    : progress.learnLang === 'en'
                      ? 'English'
                      : 'Castellano'}
              </strong>
            </span>
            <span className="duo-flag-pill support">
              <IconBook size={15} />
              <strong>{t('phase' + (progress.readingPhase[0]!.toUpperCase() + progress.readingPhase.slice(1)), ui)}</strong>
            </span>
          </div>
        </div>
        <div className="duo-profile-actions">
          <button
            className="duo-btn duo-btn-outline duo-btn-sm"
            onClick={() => setProgress({ darkMode: !progress.darkMode })}
          >
            {progress.darkMode ? '☀️' : '🌙'} {t('darkModeLabel', ui)}
          </button>
          <button className="duo-btn duo-btn-blue duo-btn-sm" onClick={onOpenSettings}>
            <IconSettings size={15} />
            <span>{t('settings', ui).toUpperCase()}</span>
          </button>
        </div>
      </div>

      {/* 4 Tarjetas de Estadísticas estilo Duolingo */}
      <section className="duo-profile-section">
        <h2>{t('profileStatsTitle', ui)}</h2>
        <div className="duo-stats-4grid">
          <div className="duo-stat-card">
            <DuoFlameSvg size={28} active={progress.streak > 0} />
            <div>
              <strong>{progress.streak}</strong>
              <span>{t('streak', ui)} ({t('days', ui)})</span>
            </div>
          </div>
          <div className="duo-stat-card">
            <span className="duo-stat-emoji">⚡</span>
            <div>
              <strong>{progress.xp}</strong>
              <span>{t('statTotalXp', ui)}</span>
            </div>
          </div>
          <div className="duo-stat-card">
            <span className="duo-stat-emoji">{league.badge}</span>
            <div>
              <strong>{league[ui]}</strong>
              <span>{t('navLeagues', ui)}</span>
            </div>
          </div>
          <div className="duo-stat-card">
            <DuoCrownSvg size={28} />
            <div>
              <strong>{totalStars}</strong>
              <span>{t('stars', ui)}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Gráfica de actividad de los últimos 7 días */}
      <section className="duo-card-box">
        <h2>{t('profileWeekTitle', ui)}</h2>
        <div className="duo-xp-chart">
          {weekStats.map((day) => {
            const hPct = Math.max(8, Math.round((day.xp / maxDayXp) * 100));
            return (
              <div key={day.date} className={`duo-xp-col ${day.isToday ? 'today' : ''}`}>
                <span className="duo-xp-val">{day.xp}</span>
                <div className="duo-xp-track">
                  <div
                    className={`duo-xp-bar ${day.xp > 0 ? 'has-xp' : ''}`}
                    style={{ height: `${hPct}%` }}
                  />
                </div>
                <span className="duo-xp-day">{ui === 'eu' ? day.labelEu : day.labelEs}</span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Logros por niveles estilo Duolingo */}
      <section className="duo-card-box">
        <h2>{t('profileAchievements', ui)}</h2>
        <div className="duo-ach-list">
          {DUO_ACHIEVEMENTS.map((ach) => {
            const val = ach.value(progress);
            const tierIdx = ach.tiers.findIndex((target) => val < target);
            const levelNum = tierIdx === -1 ? ach.tiers.length : tierIdx + 1;
            const target = tierIdx === -1 ? ach.tiers[ach.tiers.length - 1]! : ach.tiers[tierIdx]!;
            const pct = Math.min(100, Math.round((val / target) * 100));
            return (
              <div key={ach.id} className="duo-ach-row">
                <div className="duo-ach-badge" style={{ background: ach.color }}>
                  <span>{ach.emoji}</span>
                  <small>Nv.{levelNum}</small>
                </div>
                <div className="duo-ach-body">
                  <div className="duo-ach-head">
                    <strong>{ach[ui].name}</strong>
                    <span>{Math.min(val, target)} / {target}</span>
                  </div>
                  <p>{ach[ui].desc}</p>
                  <div className="duo-quest-bar">
                    <div className="duo-quest-fill" style={{ width: `${pct}%`, background: ach.color }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Vitrina de Insignias de HitzBidaia */}
      <section className="duo-card-box">
        <h2>🏅 {t('badgesTitle', ui)} ({progress.badges.length}/{badges.length})</h2>
        <div className="badge-shelf">
          {badges.map((b) => {
            const owned = progress.badges.includes(b.id);
            return (
              <div key={b.id} className={`badge-item ${owned ? 'owned' : ''}`} title={`${b[ui].name} · ${b[ui].desc}`}>
                <span className="badge-emblem" aria-hidden="true">
                  {owned ? b.emoji : '🔒'}
                </span>
                <small>{owned ? b[ui].name : '···'}</small>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
