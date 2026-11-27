import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { computeAdaptations, supportSummary } from './adaptations';
import {
  Confetti,
  DuoOwlBuddy,
  Mascot,
  Modal,
  PatoMark,
  StarRow,
  StepProgress,
  prefersReducedMotion,
  staggerStyle,
  useCountUp,
} from './components';
import { badgeById, bonusModes, levels } from './data';
import {
  DUO_STORIES,
  LEAGUE_RIVALS,
  LEAGUES,
  UNIT_THEMES,
  getDailyQuests,
  nodesForUnit,
} from './duoData';
import type { DuoStory, PathNodeDef } from './duoData';
import {
  GuidebookModal,
  LeaderboardView,
  LettersView,
  PracticeHubView,
  ProfileView,
  QuestsView,
  ShopView,
  StoriesView,
  StoryPlayerModal,
} from './DuoViews';
import {
  DuoChestSvg,
  DuoCrownSvg,
  DuoFlagSvg,
  DuoFlameSvg,
  DuoGemSvg,
  DuoHeartSvg,
  DuoNavIcon,
  IconAccessibility,
  IconArrowLeft,
  IconArrowRight,
  IconAward,
  IconBolt,
  IconBook,
  IconCheck,
  IconCompass,
  IconEye,
  IconGlobe,
  IconHeadphones,
  IconLayers,
  IconLightbulb,
  IconLock,
  IconMusic,
  IconPlay,
  IconRepeat,
  IconSchool,
  IconSettings,
  IconStar,
  IconUser,
  IconVolume,
  IconVolumeOff,
} from './icons';
import { t, tf } from './i18n';
import { startAmbientMusic, stopAmbientMusic } from './music';
import { getRecentWeekStats, isUnlocked, isXpBoostActive, nextLevel, todayString, xpBoostMinutesLeft } from './progress';
import { sfx } from './sound';
import type { DifficultyLevel, LearnLang, NavTab, Progress, ReadingPhase, Route, SchoolStage, SessionMode, SessionResult, UiLang } from './types';

function syncMusic(enabled: boolean) {
  if (enabled) startAmbientMusic();
  else stopAmbientMusic();
}

function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string; icon?: ReactNode }[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="segmented" role="group">
      {options.map((opt) => (
        <button
          key={opt.value}
          className={`segment ${value === opt.value ? 'active' : ''}`}
          onClick={() => onChange(opt.value)}
          aria-pressed={value === opt.value}
        >
          {opt.icon && <span className="segment-icon" aria-hidden="true">{opt.icon}</span>}
          <span>{opt.label}</span>
        </button>
      ))}
    </div>
  );
}

export function DuoWordmark({ ui, compact = false }: { ui: UiLang; compact?: boolean }) {
  return (
    <div className={`duo-brand ${compact ? 'compact' : ''}`}>
      <span className="duo-brand-owl" aria-hidden="true">
        <PatoMark size={compact ? 28 : 36} />
      </span>
      <div className="duo-brand-copy">
        <span className="duo-wordmark">hitzbidaia</span>
        {!compact && <small>{t('appSub', ui)}</small>}
      </div>
    </div>
  );
}

function RouteIcon({ route, size = 18 }: { route: Route; size?: number }) {
  if (route === 'visual') return <IconEye size={size} />;
  if (route === 'auditivo') return <IconHeadphones size={size} />;
  return <IconLayers size={size} />;
}

/* ================================================================== */
/* Onboarding estilo Duolingo                                          */
/* ================================================================== */

export function Onboarding({ onDone }: { onDone: (patch: Partial<Progress>) => void }) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [learnLang, setLearnLang] = useState<LearnLang>('both');
  const [difficultyLevel, setDifficultyLevel] = useState<DifficultyLevel>('medio');
  const [schoolStage, setSchoolStage] = useState<SchoolStage>('general');
  const [route, setRoute] = useState<Route>('mixta');
  const [dailyGoal, setDailyGoal] = useState<number>(20);
  const [ui, setUi] = useState<UiLang>('es');
  const [readingPhase, setReadingPhase] = useState<ReadingPhase>('alfabética');

  const langCards: { value: LearnLang; flag: 'es' | 'eu' | 'en' | 'both'; title: string; desc: string }[] = [
    { value: 'es', flag: 'es', title: t('langEs', ui), desc: t('langEsDesc', ui) },
    { value: 'eu', flag: 'eu', title: t('langEu', ui), desc: t('langEuDesc', ui) },
    { value: 'en', flag: 'en', title: t('langEn', ui), desc: t('langEnDesc', ui) },
    { value: 'both', flag: 'both', title: t('langBoth', ui), desc: t('langBothDesc', ui) },
  ];
  const diffCards: { value: DifficultyLevel; emoji: string; title: string; desc: string }[] = [
    { value: 'bajo', emoji: '🌱', title: t('diffLow', ui), desc: t('diffLowDesc', ui) },
    { value: 'medio', emoji: '⭐', title: t('diffMed', ui), desc: t('diffMedDesc', ui) },
    { value: 'alto', emoji: '🚀', title: t('diffHigh', ui), desc: t('diffHighDesc', ui) },
  ];
  const stageCards: { value: SchoolStage; emoji: string; title: string; desc: string }[] = [
    { value: 'general', emoji: '🧩', title: t('stageGeneral', ui), desc: t('stageGeneralDesc', ui) },
    { value: 'infantil', emoji: '🧸', title: t('stageInfantil', ui), desc: t('stageInfantilDesc', ui) },
    { value: 'prim12', emoji: '📖', title: t('stagePrim12', ui), desc: t('stagePrim12Desc', ui) },
    { value: 'prim34', emoji: '📅', title: t('stagePrim34', ui), desc: t('stagePrim34Desc', ui) },
    { value: 'prim56', emoji: '🏆', title: t('stagePrim56', ui), desc: t('stagePrim56Desc', ui) },
  ];
  const routeCards: { value: Route; title: string; desc: string }[] = [
    { value: 'visual', title: t('routeVisual', ui), desc: t('routeVisualDesc', ui) },
    { value: 'auditivo', title: t('routeAuditivo', ui), desc: t('routeAuditivoDesc', ui) },
    { value: 'mixta', title: t('routeMixta', ui), desc: t('routeMixtaDesc', ui) },
  ];
  const phaseCards: { value: ReadingPhase; emoji: string; title: string; desc: string }[] = [
    { value: 'fonologica', emoji: '🎵', title: t('phaseFonologica', ui), desc: t('phaseFonologicaDesc', ui) },
    { value: 'logográfica', emoji: '👀', title: t('phaseLogografica', ui), desc: t('phaseLogograficaDesc', ui) },
    { value: 'alfabética', emoji: '🔤', title: t('phaseAlfabetica', ui), desc: t('phaseAlfabeticaDesc', ui) },
    { value: 'ortográfica', emoji: '📖', title: t('phaseOrtografica', ui), desc: t('phaseOrtograficaDesc', ui) },
  ];

  function completeOnboarding() {
    onDone({
      onboarded: true,
      name: name.trim() || (ui === 'eu' ? 'Lagun' : 'Amigo'),
      learnLang,
      difficultyLevel,
      schoolStage,
      readingPhase,
      route,
      dailyGoal,
      uiLang: ui,
      calmMode: false,
      unlimitedHearts: false,
    });
  }

  return (
    <div className="duo-onboarding">
      <header className="duo-onb-header">
        <DuoWordmark ui={ui} />
        <div className="lang-switch" role="group" aria-label={t('appLangLabel', ui)}>
          <button className={ui === 'es' ? 'on' : ''} onClick={() => setUi('es')} aria-pressed={ui === 'es'}>
            ES
          </button>
          <button className={ui === 'eu' ? 'on' : ''} onClick={() => setUi('eu')} aria-pressed={ui === 'eu'}>
            EU
          </button>
        </div>
      </header>

      <div className="duo-onb-card">
        <div className="duo-onb-mascot-row">
          <div className="duo-onb-mascots">
            <Mascot mood={step === 0 ? 'wave' : step === 2 ? 'excited' : 'happy'} size={118} interactive />
            <DuoOwlBuddy size={72} />
          </div>
          <div className="duo-speech-cloud">
            <span className="speech-kicker">{t('welcomeKicker', ui)}</span>
            <strong>{t('welcomeTitle', ui)}</strong>
            <span>{t('welcomeSub', ui)}</span>
          </div>
        </div>

        <StepProgress current={step + 1} total={3} label={tf('stepCounter', ui, { n: String(step + 1) })} />

        {step === 0 ? (
          <>
            <h1>{t('step1Title', ui)}</h1>
            <p className="onb-sub">{t('step1Sub', ui)}</p>

            <div className="duo-course-grid">
              {langCards.map((card, i) => (
                <button
                  key={card.value}
                  style={staggerStyle(i)}
                  className={`duo-course-card ${learnLang === card.value ? 'selected' : ''}`}
                  onClick={() => {
                    setLearnLang(card.value);
                    if (card.value === 'eu' || card.value === 'es') setUi(card.value);
                  }}
                  aria-pressed={learnLang === card.value}
                >
                  <DuoFlagSvg code={card.flag} size={46} />
                  <strong>{card.title}</strong>
                  <small>{card.desc}</small>
                </button>
              ))}
            </div>

            <label className="name-field">
              <span className="field-label">
                <IconUser size={15} /> {t('nameLabel', ui)}
              </span>
              <input
                value={name}
                maxLength={18}
                placeholder={t('namePlaceholder', ui)}
                onChange={(e) => setName(e.target.value)}
              />
            </label>

            <div className="onb-actions">
              <button className="duo-btn duo-btn-green duo-btn-lg" onClick={() => setStep(1)}>
                <span>{t('continueBtn', ui).toUpperCase()}</span>
                <IconArrowRight size={17} />
              </button>
            </div>
          </>
        ) : step === 1 ? (
          <>
            <h1>{t('step2Title', ui)}</h1>
            <p className="onb-sub">{t('step2Sub', ui)}</p>

            <div className="duo-onb-goal" style={{ marginBottom: 16 }}>
              <span className="field-label">📊 {t('diffLevelLabel', ui)}</span>
              <div className="choice-grid">
                {diffCards.map((dc, i) => (
                  <button
                    key={dc.value}
                    style={staggerStyle(i)}
                    className={`choice-card ${difficultyLevel === dc.value ? 'selected' : ''}`}
                    onClick={() => setDifficultyLevel(dc.value)}
                    aria-pressed={difficultyLevel === dc.value}
                  >
                    <span className="choice-icon" aria-hidden="true">{dc.emoji}</span>
                    <strong>{dc.title}</strong>
                    <small>{dc.desc}</small>
                    {difficultyLevel === dc.value && (
                      <span className="choice-check" aria-hidden="true">
                        <IconCheck size={13} />
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="duo-onb-goal" style={{ marginBottom: 16 }}>
              <span className="field-label">🏫 {t('stageLabel', ui)}</span>
              <div className="choice-grid">
                {stageCards.map((sc, i) => (
                  <button
                    key={sc.value}
                    style={staggerStyle(i)}
                    className={`choice-card ${schoolStage === sc.value ? 'selected' : ''}`}
                    onClick={() => setSchoolStage(sc.value)}
                    aria-pressed={schoolStage === sc.value}
                  >
                    <span className="choice-icon" aria-hidden="true">{sc.emoji}</span>
                    <strong>{sc.title}</strong>
                    <small>{sc.desc}</small>
                    {schoolStage === sc.value && (
                      <span className="choice-check" aria-hidden="true">
                        <IconCheck size={13} />
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <span className="field-label" style={{ display: 'flex', marginBottom: 8 }}>🧭 {t('routeLabel', ui)}</span>
            <div className="choice-grid">
              {routeCards.map((card, i) => (
                <button
                  key={card.value}
                  style={staggerStyle(i)}
                  className={`choice-card route-${card.value} ${route === card.value ? 'selected' : ''}`}
                  onClick={() => setRoute(card.value)}
                  aria-pressed={route === card.value}
                >
                  <span className="choice-icon">
                    <RouteIcon route={card.value} size={22} />
                  </span>
                  <strong>{card.title}</strong>
                  <small>{card.desc}</small>
                  {route === card.value && (
                    <span className="choice-check" aria-hidden="true">
                      <IconCheck size={13} />
                    </span>
                  )}
                </button>
              ))}
            </div>

            <div className="duo-onb-goal">
              <span className="field-label">🔥 {t('dailyGoalLabel', ui)}</span>
              <div className="duo-goal-grid">
                {[
                  { xp: 10, es: 'Relajada', eu: 'Lasaia' },
                  { xp: 20, es: 'Normal', eu: 'Arrunta' },
                  { xp: 30, es: 'Seria', eu: 'Serioa' },
                  { xp: 50, es: 'Intensa', eu: 'Bizkorra' },
                ].map((g) => (
                  <button
                    key={g.xp}
                    className={`duo-goal-btn ${dailyGoal === g.xp ? 'selected' : ''}`}
                    onClick={() => setDailyGoal(g.xp)}
                  >
                    <strong>{ui === 'eu' ? g.eu : g.es}</strong>
                    <span>{g.xp} XP</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="onb-actions split">
              <button className="duo-btn duo-btn-outline" onClick={() => setStep(0)}>
                <IconArrowLeft size={16} />
                <span>{t('back', ui).toUpperCase()}</span>
              </button>
              <button className="duo-btn duo-btn-green duo-btn-lg" onClick={() => setStep(2)}>
                <span>{t('continueBtn', ui).toUpperCase()}</span>
                <IconArrowRight size={16} />
              </button>
            </div>
          </>
        ) : (
          <>
            <h1>{t('phaseTitle', ui)}</h1>
            <p className="onb-sub">{t('phaseSub', ui)}</p>
            <div className="support-grid">
              {phaseCards.map((card, i) => (
                <button
                  key={card.value}
                  style={staggerStyle(i)}
                  className={`support-card ${readingPhase === card.value ? 'selected' : ''}`}
                  onClick={() => setReadingPhase(card.value)}
                  aria-pressed={readingPhase === card.value}
                >
                  <span className="support-emoji" aria-hidden="true">{card.emoji}</span>
                  <span className="support-text">
                    <strong>{card.title}</strong>
                    <small>{card.desc}</small>
                  </span>
                  {readingPhase === card.value && (
                    <span className="choice-check" aria-hidden="true">
                      <IconCheck size={13} />
                    </span>
                  )}
                </button>
              ))}
            </div>
            <p className="onb-note">
              <IconLightbulb size={16} />
              <span>{t('phaseHint', ui)}</span>
            </p>
            <div className="onb-actions split">
              <button className="duo-btn duo-btn-outline" onClick={() => setStep(1)}>
                <IconArrowLeft size={16} />
                <span>{t('back', ui).toUpperCase()}</span>
              </button>
              <button
                className="duo-btn duo-btn-green duo-btn-lg"
                onClick={() => completeOnboarding()}
              >
                <IconPlay size={16} />
                <span>{t('letsGo', ui).toUpperCase()}</span>
              </button>
            </div>
          </>
        )}
        <p className="onb-foot">{t('onboardNote', ui)}</p>
      </div>
    </div>
  );
}

/* ================================================================== */
/* Camino Serpentino de Unidades (Duolingo /learn)                     */
/* ================================================================== */

interface ActiveNodePopover {
  unitId: number;
  node: PathNodeDef;
  unlocked: boolean;
  done: boolean;
  isLegendary: boolean;
}

function LearnPathView({
  progress,
  setProgress,
  onStartLesson,
  onOpenStory,
  onOpenGuidebook,
  onToast,
}: {
  progress: Progress;
  setProgress: (patch: Partial<Progress> | ((prev: Progress) => Partial<Progress>)) => void;
  onStartLesson: (mode: SessionMode, levelId: number | null, nodeKey?: string) => void;
  onOpenStory: (story: DuoStory) => void;
  onOpenGuidebook: (unitId: number) => void;
  onToast: (msg: string) => void;
}) {
  const ui = progress.uiLang;
  const currentUnitId = nextLevel(progress);
  const [selectedPop, setSelectedPop] = useState<ActiveNodePopover | null>(null);
  const [chestBurst, setChestBurst] = useState(0);

  function openChest(chestKey: string) {
    if (progress.chestsClaimed.includes(chestKey)) return;
    sfx('badge', progress.sound);
    setChestBurst((b) => b + 1);
    setProgress((prev) => ({
      gems: prev.gems + 25,
      chestsClaimed: [...prev.chestsClaimed, chestKey],
    }));
    onToast(t('chestToast', ui));
    setSelectedPop(null);
  }

  return (
    <div className="duo-learn-column" onClick={() => setSelectedPop(null)}>
      {chestBurst > 0 && !progress.calmMode && <Confetti burstKey={chestBurst} count={36} />}

      {levels.map((unit) => {
        const theme = UNIT_THEMES[unit.id] ?? UNIT_THEMES[1]!;
        const unitUnlocked = isUnlocked(progress, unit.id);
        const unitCompleted = !!progress.completed[unit.id];
        const unitLegendary = !!progress.legendary[unit.id];
        const stars = progress.stars[unit.id] ?? 0;
        const nodes = nodesForUnit(unit.id);

        const chestKey = `chest-u${unit.id}`;
        const chestOpened = progress.chestsClaimed.includes(chestKey);
        const storyRead = progress.storiesRead.includes(`ds${unit.id}`);

        const nodeDone = nodes.map((nd) => {
          if (nd.kind === 'chest') return chestOpened;
          if (nd.kind === 'story') return storyRead || unitCompleted;
          if (nd.kind === 'trophy') return unitCompleted;
          const count = progress.nodeProgress[`u${unit.id}-n${nd.index}`] ?? 0;
          return count >= 1 || unitCompleted;
        });

        let activeIdx = -1;
        if (unitUnlocked && unit.id === currentUnitId && !unitCompleted) {
          activeIdx = nodeDone.findIndex((d) => !d);
          if (activeIdx === -1) activeIdx = nodes.length - 1;
        }

        const unitHasPopover = selectedPop?.unitId === unit.id;

        return (
          <section key={unit.id} className={`duo-unit-section ${unitHasPopover ? 'has-popover' : ''}`}>
            {/* Banner colorido oficial de Unidad con botón GUÍA */}
            <header
              className={`duo-unit-banner ${!unitUnlocked ? 'is-locked' : ''} ${unitLegendary ? 'is-legendary' : ''}`}
              style={
                unitLegendary
                  ? { background: 'linear-gradient(135deg, #ce82ff 0%, #8b46ff 100%)', borderBottomColor: '#6929d4' }
                  : unitUnlocked
                    ? { background: theme.bg, borderBottomColor: theme.lip }
                    : undefined
              }
            >
              <div className="duo-unit-banner-text">
                <span className="duo-unit-kicker">
                  {tf('sectionUnit', ui, { n: String(unit.id) })} · {unit[ui].skill}
                </span>
                <h2>{unit[ui].title}</h2>
                <p>{unit[ui].sub}</p>
              </div>
              <button
                className="duo-guidebook-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  sfx('click', progress.sound);
                  onOpenGuidebook(unit.id);
                }}
              >
                <IconBook size={18} />
                <span>{t('guidebookBtn', ui)}</span>
              </button>
            </header>

            {/* Camino Serpentino de Nodos 3D */}
            <div className="duo-serpentine-track">
              {/* Personajes animados junto al camino */}
              <div
                className={`duo-path-character ${unit.id % 2 === 1 ? 'side-left' : 'side-right'} ${!unitUnlocked ? 'is-locked' : ''}`}
              >
                {unit.id % 2 === 1 ? (
                  <Mascot
                    mood={!unitUnlocked ? 'think' : unitCompleted ? 'cheer' : 'wave'}
                    size={102}
                    outfit={progress.equippedOutfit}
                    interactive={unitUnlocked}
                    sound={progress.sound}
                  />
                ) : (
                  <DuoOwlBuddy size={88} locked={!unitUnlocked} />
                )}
              </div>

              {nodes.map((node, idx) => {
                const nodeKey = `u${unit.id}-n${node.index}`;
                const isDone = !!nodeDone[idx];
                const isCurrent = idx === activeIdx;
                const canClickChest = unitUnlocked && (idx === 0 || nodeDone[0] || unitCompleted);
                const nodeUnlocked =
                  unitUnlocked &&
                  (idx === 0 ||
                    isDone ||
                    isCurrent ||
                    !!nodeDone[idx - 1] ||
                    (node.kind === 'chest' && canClickChest) ||
                    node.kind === 'story');
                const isJumpable = !unitUnlocked && idx === 0;
                const isSelected = selectedPop?.unitId === unit.id && selectedPop?.node.index === node.index;

                // Color del nodo circular 3D
                let bg = '#e5e5e5';
                let lip = '#b7b7b7';
                let fg = '#afafaf';
                if (unitLegendary && isDone) {
                  bg = '#ce82ff';
                  lip = '#9b51e0';
                  fg = '#ffffff';
                } else if (isDone && node.kind !== 'chest') {
                  bg = '#ffc800';
                  lip = '#e0a800';
                  fg = '#ffffff';
                } else if (nodeUnlocked) {
                  bg = theme.bg;
                  lip = theme.lip;
                  fg = '#ffffff';
                } else if (isJumpable) {
                  bg = theme.bg;
                  lip = theme.lip;
                  fg = '#ffffff';
                }

                // Progreso del anillo exterior
                const stepVal = progress.nodeProgress[nodeKey] ?? 0;
                const pctRing = isCurrent
                  ? Math.min(85, Math.max(20, Math.round((stepVal / node.totalCrownSteps) * 100) || 25))
                  : 0;
                const circumference = 2 * Math.PI * 42;

                return (
                  <div
                    key={nodeKey}
                    className={`duo-node-row ${isSelected ? 'has-popover' : ''}`}
                    style={{ transform: `translateX(${node.offsetPx}px)` }}
                  >
                    <div className="duo-node-anchor" onClick={(e) => e.stopPropagation()}>
                      {/* Etiqueta flotante animada EMPEZAR / ¿SALTAR AQUÍ? / LEGENDARIO (clicable directo) */}
                      {isCurrent && (
                        <button
                          type="button"
                          className="duo-floating-start"
                          style={{ color: theme.bg }}
                          onClick={() => {
                            if (node.kind === 'chest') {
                              openChest(chestKey);
                            } else if (node.kind === 'story') {
                              const st = DUO_STORIES.find((s) => s.id === node.storyId) ?? DUO_STORIES[0]!;
                              onOpenStory(st);
                            } else {
                              onStartLesson('level', unit.id, nodeKey);
                            }
                          }}
                        >
                          {t('startPill', ui)}
                        </button>
                      )}
                      {isJumpable && (
                        <button
                          type="button"
                          className="duo-floating-start jump"
                          style={{ color: theme.bg }}
                          onClick={() => onStartLesson('level', unit.id, nodeKey)}
                        >
                          {t('jumpHerePill', ui)}
                        </button>
                      )}
                      {unitCompleted && !unitLegendary && node.kind === 'trophy' && unit.id === currentUnitId && (
                        <button
                          type="button"
                          className="duo-floating-start legendary"
                          onClick={() => onStartLesson('legendary', unit.id, nodeKey)}
                        >
                          👑 {t('legendaryPill', ui)}
                        </button>
                      )}

                      {/* Anillo de progreso circular SVG alrededor del nodo activo */}
                      {isCurrent && (
                        <svg className="duo-node-ring" width="98" height="92" viewBox="0 0 98 98" aria-hidden="true">
                          <circle cx="49" cy="49" r="42" fill="none" stroke="var(--duo-swan)" strokeWidth="7" />
                          <circle
                            cx="49"
                            cy="49"
                            r="42"
                            fill="none"
                            stroke={theme.bg}
                            strokeWidth="7"
                            strokeLinecap="round"
                            strokeDasharray={circumference}
                            strokeDashoffset={circumference - (pctRing / 100) * circumference}
                            transform="rotate(-90 49 49)"
                          />
                        </svg>
                      )}

                      {/* Nodo Cofre vs Nodo Circular 3D */}
                      {node.kind === 'chest' ? (
                        <button
                          className={`duo-chest-node ${chestOpened ? 'opened' : canClickChest ? 'ready' : 'locked'}`}
                          onClick={() => {
                            sfx('click', progress.sound);
                            setSelectedPop({
                              unitId: unit.id,
                              node,
                              unlocked: canClickChest,
                              done: chestOpened,
                              isLegendary: unitLegendary,
                            });
                          }}
                          aria-label={t('chestTitle', ui)}
                        >
                          <DuoChestSvg size={64} open={chestOpened} />
                        </button>
                      ) : (
                        <button
                          className={`duo-pebble-btn ${isCurrent ? 'is-current' : ''} ${isDone ? 'is-done' : ''} ${!nodeUnlocked && !isJumpable ? 'is-locked' : ''}`}
                          style={{
                            background: bg,
                            borderBottomColor: lip,
                            color: fg,
                          }}
                          onClick={() => {
                            sfx('click', progress.sound);
                            setSelectedPop(
                              isSelected
                                ? null
                                : {
                                    unitId: unit.id,
                                    node,
                                    unlocked: nodeUnlocked || isJumpable,
                                    done: isDone,
                                    isLegendary: unitLegendary,
                                  },
                            );
                          }}
                          aria-label={`${unit[ui].title} · ${ui === 'eu' ? node.euLabel : node.esLabel}`}
                        >
                          <span className="duo-pebble-shine" aria-hidden="true" />
                          {!nodeUnlocked && !isJumpable ? (
                            <IconLock size={26} />
                          ) : node.kind === 'story' ? (
                            <IconBook size={28} />
                          ) : node.kind === 'trophy' ? (
                            <DuoCrownSvg size={32} purple={unitLegendary} />
                          ) : isDone ? (
                            <IconCheck size={30} />
                          ) : node.syllableStage ? (
                            <strong className="duo-node-stage-num">{node.syllableStage}</strong>
                          ) : idx === 0 ? (
                            <IconStar size={30} filled />
                          ) : (
                            <span className="duo-node-emoji">{unit.emoji}</span>
                          )}
                        </button>
                      )}

                      {/* Etiqueta de etapa progresiva debajo del nodo (ej. 1·Directas, 2·Inversas, 3·Trabadas) */}
                      {(node.shortTagEs || node.shortTagEu) && (
                        <span className={`duo-node-subtag ${isDone ? 'done' : nodeUnlocked ? 'open' : 'locked'}`}>
                          {ui === 'eu' ? node.shortTagEu : node.shortTagEs}
                        </span>
                      )}

                      {/* Mini estrellas debajo del trofeo de unidad completada */}
                      {node.kind === 'trophy' && stars > 0 && (
                        <div className="duo-node-stars">
                          <StarRow count={stars} size="sm" />
                        </div>
                      )}

                      {/* Popover interactivo estilo Duolingo al pulsar un nodo */}
                      {isSelected && (
                        <div
                          className={`duo-node-popover ${!selectedPop.unlocked ? 'locked' : ''}`}
                          style={
                            selectedPop.unlocked
                              ? {
                                  background: unitLegendary ? '#9b51e0' : isDone && node.kind !== 'chest' ? '#ffc800' : theme.bg,
                                }
                              : undefined
                          }
                        >
                          <h4>{ui === 'eu' ? node.euLabel : node.esLabel}</h4>
                          <p>
                            {!selectedPop.unlocked
                              ? t('nodeLockedMsg', ui)
                              : node.kind === 'chest'
                                ? chestOpened
                                  ? t('chestClaimed', ui)
                                  : '+25 💎'
                                : isDone
                                  ? t('nodeCompleted', ui)
                                  : unit[ui].title}
                          </p>

                          {selectedPop.unlocked && (
                            <>
                              {node.kind === 'chest' ? (
                                !chestOpened && (
                                  <button
                                    className="duo-popover-cta"
                                    style={{ color: '#9b51e0' }}
                                    onClick={() => openChest(chestKey)}
                                  >
                                    {t('chestOpenBtn', ui)}
                                  </button>
                                )
                              ) : node.kind === 'story' ? (
                                <button
                                  className="duo-popover-cta"
                                  style={{ color: isDone ? '#b58300' : theme.bg }}
                                  onClick={() => {
                                    const st = DUO_STORIES.find((s) => s.id === node.storyId) ?? DUO_STORIES[0]!;
                                    setSelectedPop(null);
                                    onOpenStory(st);
                                  }}
                                >
                                  {isDone ? t('storyReplayBtn', ui) : t('storyStartBtn', ui)}
                                </button>
                              ) : isJumpable ? (
                                <button
                                  className="duo-popover-cta"
                                  style={{ color: theme.bg }}
                                  onClick={() => {
                                    setSelectedPop(null);
                                    onStartLesson('level', unit.id, nodeKey);
                                  }}
                                >
                                  ⚡ {t('nodeJumpBtn', ui)}
                                </button>
                              ) : (
                                <div className="duo-popover-btn-stack">
                                  <button
                                    className="duo-popover-cta"
                                    style={{ color: isDone ? '#b58300' : theme.bg }}
                                    onClick={() => {
                                      setSelectedPop(null);
                                      onStartLesson('level', unit.id, nodeKey);
                                    }}
                                  >
                                    {isDone
                                      ? tf('nodePracticeXp', ui, { xp: '10' })
                                      : tf('nodeStartXp', ui, { xp: '15' })}
                                  </button>
                                  {isDone && node.kind === 'trophy' && !unitLegendary && (
                                    <button
                                      className="duo-popover-cta legendary-cta"
                                      onClick={() => {
                                        setSelectedPop(null);
                                        onStartLesson('legendary', unit.id, nodeKey);
                                      }}
                                    >
                                      👑 {t('nodeLegendaryXp', ui)}
                                    </button>
                                  )}
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}

      {/* Sección final Patio de Juegos Abierto (Modos 7 y 8) */}
      <section className="duo-unit-section">
        <header
          className="duo-unit-banner"
          style={{ background: UNIT_THEMES[7]!.bg, borderBottomColor: UNIT_THEMES[7]!.lip, color: '#3c2d00' }}
        >
          <div className="duo-unit-banner-text">
            <span className="duo-unit-kicker dark">{t('bonusFree', ui)}</span>
            <h2 style={{ color: '#3c2d00' }}>🎠 {t('bonusTitle', ui)}</h2>
            <p style={{ color: '#5c4500' }}>{t('bonusSub', ui)}</p>
          </div>
        </header>
        <div className="duo-playground-row">
          {bonusModes.map((bm) => (
            <button
              key={bm.id}
              className="duo-playground-card"
              onClick={() => onStartLesson('level', bm.id)}
            >
              <span className="duo-pg-emoji" aria-hidden="true">{bm.emoji}</span>
              <div>
                <strong>{bm[ui].title}</strong>
                <small>{bm[ui].sub}</small>
              </div>
              <span className="duo-btn duo-btn-green duo-btn-sm">{t('playBonus', ui).toUpperCase()}</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

/* ================================================================== */
/* Shell Principal de 3 Columnas estilo Duolingo Web                   */
/* ================================================================== */

interface HomeProps {
  progress: Progress;
  setProgress: (patch: Partial<Progress> | ((prev: Progress) => Partial<Progress>)) => void;
  onStart: (levelId: number | null, mode?: SessionMode, nodeKey?: string) => void;
  onToast: (text: string) => void;
  onSettings: () => void;
}

type PopoverKind = 'course' | 'streak' | 'gems' | 'hearts' | null;

export function Home({ progress, setProgress, onStart, onToast, onSettings }: HomeProps) {
  const ui = progress.uiLang;
  const [activeTab, setActiveTab] = useState<NavTab>('learn');
  const [openPop, setOpenPop] = useState<PopoverKind>(null);
  const [guidebookUnit, setGuidebookUnit] = useState<number | null>(null);
  const [activeStory, setActiveStory] = useState<DuoStory | null>(null);
  const [childMode, setChildMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('hitzbidaia.childMode.v1') === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('hitzbidaia.childMode.v1', String(childMode));
    } catch {
      // El modo elegido solo afecta a la presentación; si no se puede guardar, la app sigue funcionando.
    }
  }, [childMode]);

  const ad = computeAdaptations(progress);
  const effectiveUnlimited = progress.unlimitedHearts || ad.gentle;
  const quests = getDailyQuests(progress, ui);
  const weekStats = getRecentWeekStats(progress);
  const league = LEAGUES[Math.min(LEAGUES.length - 1, progress.leagueId ?? 2)]!;
  const myLeagueRank = useMemoRank(progress.xp);
  const boostActive = isXpBoostActive(progress);
  const boostMins = xpBoostMinutesLeft(progress);

  const navItems: { id: NavTab; label: string; badge?: number }[] = [
    { id: 'learn', label: t('navLearn', ui) },
    { id: 'letters', label: t('navLetters', ui) },
    { id: 'stories', label: t('navStories', ui) },
    { id: 'practice', label: t('navPractice', ui), badge: progress.mistakes.length || undefined },
    { id: 'leaderboard', label: t('navLeagues', ui) },
    { id: 'quests', label: t('navQuests', ui), badge: quests.filter((q) => q.done && !q.claimed).length || undefined },
    { id: 'shop', label: t('navShop', ui) },
    { id: 'profile', label: t('navProfile', ui) },
  ];

  const toggleMusic = () => {
    const next = !progress.music;
    syncMusic(next);
    setProgress({ music: next });
    onToast(t(next ? 'musicOn' : 'musicOff', ui));
  };

  function handleStoryComplete(storyId: string, xpReward: number) {
    const today = todayString();
    const yesterday = todayString(-1);
    const alreadyRead = progress.storiesRead.includes(storyId);
    const earnedXp = alreadyRead ? 10 : xpReward;
    setProgress((prev) => {
      let streak = prev.streak;
      if (prev.lastPlayed !== today) {
        streak = prev.lastPlayed === yesterday ? prev.streak + 1 : Math.max(1, prev.streak);
      }
      return {
        xp: prev.xp + earnedXp,
        gems: prev.gems + 10,
        dailyXp: prev.dailyXp + earnedXp,
        dailyLessons: prev.dailyLessons + 1,
        xpHistory: { ...prev.xpHistory, [today]: (prev.xpHistory[today] ?? 0) + earnedXp },
        storiesRead: alreadyRead ? prev.storiesRead : [...prev.storiesRead, storyId],
        streak,
        bestStreak: Math.max(prev.bestStreak, streak),
        lastPlayed: today,
        sessions: prev.sessions + 1,
      };
    });
    setActiveStory(null);
    onToast(`📖 +${earnedXp} XP · +10 💎`);
  }

  const statsBar = (
    <div className="duo-top-stats" onClick={(e) => e.stopPropagation()}>
      {/* Bandera de Curso / Idioma */}
      <div className="duo-stat-trigger-wrap">
        <button
          className={`duo-stat-pill flag ${openPop === 'course' ? 'active' : ''}`}
          onClick={() => setOpenPop(openPop === 'course' ? null : 'course')}
          aria-label={t('learningLabel', ui)}
        >
          <DuoFlagSvg code={progress.learnLang} size={28} />
        </button>
        {openPop === 'course' && (
          <div className="duo-top-popover">
            <h4>{t('learningLabel', ui)}</h4>
            <div className="duo-pop-course-list">
              {(['es', 'eu', 'en', 'both'] as LearnLang[]).map((code) => (
                <button
                  key={code}
                  className={`duo-pop-course-item ${progress.learnLang === code ? 'selected' : ''}`}
                  onClick={() => {
                    sfx('click', progress.sound);
                    setProgress({ learnLang: code });
                    setOpenPop(null);
                  }}
                >
                  <DuoFlagSvg code={code} size={26} />
                  <strong>
                    {code === 'es'
                      ? t('langEs', ui)
                      : code === 'eu'
                        ? t('langEu', ui)
                        : code === 'en'
                          ? t('langEn', ui)
                          : t('langBoth', ui)}
                  </strong>
                  {progress.learnLang === code && <IconCheck size={15} />}
                </button>
              ))}
            </div>
            <div className="duo-pop-sep" />
            <h4>{t('diffLevelLabel', ui)}</h4>
            <Segmented<DifficultyLevel>
              value={progress.difficultyLevel}
              options={[
                { value: 'bajo', label: t('diffLow', ui) },
                { value: 'medio', label: t('diffMed', ui) },
                { value: 'alto', label: t('diffHigh', ui) },
              ]}
              onChange={(difficultyLevel) => {
                setProgress({ difficultyLevel });
                onToast(t('diffChanged', ui));
              }}
            />
            <div className="duo-pop-sep" />
            <h4>{t('stageLabel', ui)}</h4>
            <Segmented<SchoolStage>
              value={progress.schoolStage}
              options={[
                { value: 'general', label: t('stageGeneral', ui) },
                { value: 'infantil', label: t('stageInfantil', ui) },
                { value: 'prim12', label: t('stagePrim12', ui) },
                { value: 'prim34', label: t('stagePrim34', ui) },
                { value: 'prim56', label: t('stagePrim56', ui) },
              ]}
              onChange={(schoolStage) => {
                setProgress({ schoolStage });
                onToast(t('stageChanged', ui));
              }}
            />
            <div className="duo-pop-sep" />
            <h4>{t('routeLabel', ui)}</h4>
            <Segmented<Route>
              value={progress.route}
              options={[
                { value: 'visual', label: t('routeVisual', ui) },
                { value: 'auditivo', label: t('routeAuditivo', ui) },
                { value: 'mixta', label: t('routeMixta', ui) },
              ]}
              onChange={(route) => {
                setProgress({ route });
                onToast(t('routeChanged', ui));
              }}
            />
            <div className="duo-pop-sep" />
            <div className="duo-pop-ui-row">
              <span>{t('appLangLabel', ui)}:</span>
              <div className="lang-switch">
                <button className={ui === 'es' ? 'on' : ''} onClick={() => setProgress({ uiLang: 'es' })}>ES</button>
                <button className={ui === 'eu' ? 'on' : ''} onClick={() => setProgress({ uiLang: 'eu' })}>EU</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Racha Diaria 🔥 */}
      <div className="duo-stat-trigger-wrap">
        <button
          className={`duo-stat-pill streak ${progress.streak > 0 ? 'lit' : ''}`}
          onClick={() => setOpenPop(openPop === 'streak' ? null : 'streak')}
        >
          <DuoFlameSvg size={24} active={progress.streak > 0} />
          <strong>{progress.streak}</strong>
        </button>
        {openPop === 'streak' && (
          <div className="duo-top-popover">
            <div className="duo-pop-streak-head">
              <DuoFlameSvg size={38} active={progress.streak > 0} />
              <div>
                <strong>{tf('streakCardTitle', ui, { n: String(progress.streak) })}</strong>
                <p>{t('streakCardSub', ui)}</p>
              </div>
            </div>
            <div className="duo-week-row">
              {weekStats.map((d) => (
                <div key={d.date} className={`duo-week-dot ${d.done ? 'done' : ''} ${d.isToday ? 'today' : ''}`}>
                  <span>{ui === 'eu' ? d.labelEu : d.labelEs}</span>
                  <i>{d.done ? '✓' : d.frozen ? '🧊' : ''}</i>
                </div>
              ))}
            </div>
            <div className="duo-pop-freeze-note">
              🧊 {ui === 'eu' ? 'Bolada babesleak:' : 'Protectores de racha:'} <strong>{progress.streakFreezes}/2</strong>
            </div>
          </div>
        )}
      </div>

      {/* Gemas 💎 */}
      <div className="duo-stat-trigger-wrap">
        <button
          className="duo-stat-pill gems"
          onClick={() => setOpenPop(openPop === 'gems' ? null : 'gems')}
        >
          <DuoGemSvg size={23} />
          <strong>{progress.gems}</strong>
        </button>
        {openPop === 'gems' && (
          <div className="duo-top-popover">
            <div className="duo-pop-streak-head">
              <DuoGemSvg size={36} />
              <div>
                <strong>{progress.gems} {ui === 'eu' ? 'Harribitxi' : 'Gemas'}</strong>
                <p>{t('shopSub', ui)}</p>
              </div>
            </div>
            <button
              className="duo-btn duo-btn-blue duo-btn-full"
              onClick={() => {
                setActiveTab('shop');
                setOpenPop(null);
              }}
            >
              {t('navShop', ui).toUpperCase()}
            </button>
          </div>
        )}
      </div>

      {/* Vidas ❤️ / ♾️ */}
      <div className="duo-stat-trigger-wrap">
        <button
          className="duo-stat-pill hearts"
          onClick={() => setOpenPop(openPop === 'hearts' ? null : 'hearts')}
        >
          <DuoHeartSvg size={24} unlimited={effectiveUnlimited} />
          <strong>{effectiveUnlimited ? '∞' : progress.hearts}</strong>
        </button>
        {openPop === 'hearts' && (
          <div className="duo-top-popover">
            <h4>{t('shopHeartsSection', ui)}</h4>
            {effectiveUnlimited ? (
              <p className="duo-pop-unlimited-msg">✨ {t('superActive', ui)}</p>
            ) : (
              <div className="duo-hearts-row-pop">
                {[1, 2, 3, 4, 5].map((n) => (
                  <DuoHeartSvg key={n} size={26} broken={n > progress.hearts} />
                ))}
              </div>
            )}
            <div className="duo-pop-btn-col">
              {!effectiveUnlimited && progress.hearts < 5 && (
                <>
                  <button
                    className="duo-btn duo-btn-blue duo-btn-full"
                    onClick={() => {
                      setOpenPop(null);
                      onStart(null, 'practice');
                    }}
                  >
                    {t('practiceHeartBtn', ui)}
                  </button>
                  <button
                    className="duo-btn duo-btn-outline duo-btn-full"
                    disabled={progress.gems < 100}
                    onClick={() => {
                      if (progress.gems >= 100) {
                        sfx('star', progress.sound);
                        setProgress({ gems: progress.gems - 100, hearts: 5 });
                        setOpenPop(null);
                      }
                    }}
                  >
                    {t('refillGemsBtn', ui)}
                  </button>
                </>
              )}
              <button
                className="duo-btn duo-btn-purple duo-btn-full"
                onClick={() => {
                  sfx('star', progress.sound);
                  setProgress({ unlimitedHearts: !progress.unlimitedHearts, hearts: 5 });
                  setOpenPop(null);
                }}
              >
                {progress.unlimitedHearts ? t('superDeactivate', ui) : t('enableUnlimitedBtn', ui)}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Botones rápidos de Modo Oscuro y Música */}
      <button
        className="duo-icon-round"
        onClick={() => setProgress({ darkMode: !progress.darkMode })}
        title={t('darkModeLabel', ui)}
        aria-label={t('darkModeLabel', ui)}
      >
        {progress.darkMode ? '☀️' : '🌙'}
      </button>
      <button
        className={`duo-icon-round ${progress.music ? 'active' : ''}`}
        onClick={toggleMusic}
        title={t('music', ui)}
        aria-label={t('music', ui)}
      >
        <IconMusic size={17} />
      </button>
    </div>
  );

  return (
    <div className={`duo-app-shell ${childMode ? 'duo-child-mode' : ''}`} onClick={() => setOpenPop(null)}>
      {/* Barra lateral izquierda estilo Duolingo (256px en escritorio, barra inferior en móvil) */}
      <aside className="duo-left-sidebar">
        <button className="duo-logo-btn" onClick={() => setActiveTab('learn')}>
          <DuoWordmark ui={ui} />
        </button>

        <nav className="duo-nav-list" aria-label="Navegación principal">
          {navItems.map((item) => (
            <button
              key={item.id}
              className={`duo-nav-item ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => {
                sfx('click', progress.sound);
                setActiveTab(item.id);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            >
              <span className="duo-nav-icon-wrap">
                <DuoNavIcon tab={item.id} size={28} />
                {item.badge && <span className="duo-nav-badge">{item.badge}</span>}
              </span>
              <span className="duo-nav-label">{item.label}</span>
            </button>
          ))}

          <button
            className={`duo-nav-item duo-mode-toggle ${childMode ? 'active' : ''}`}
            onClick={() => setChildMode((value) => !value)}
            aria-pressed={childMode}
            title={childMode ? (ui === 'eu' ? 'Ikuspegi osoa' : 'Vista completa') : (ui === 'eu' ? 'Haurrentzako ikuspegia' : 'Modo infantil')}
          >
            <span className="duo-nav-icon-wrap" aria-hidden="true">🧸</span>
            <span className="duo-nav-label">{childMode ? (ui === 'eu' ? 'Ikuspegi osoa' : 'Vista completa') : (ui === 'eu' ? 'Haurrentzako modua' : 'Modo infantil')}</span>
          </button>

          <button className="duo-nav-item desktop-only-nav" onClick={onSettings}>
            <span className="duo-nav-icon-wrap">
              <DuoNavIcon tab="more" size={28} />
            </span>
            <span className="duo-nav-label">{t('navMore', ui)}</span>
          </button>
        </nav>
      </aside>

      {/* Barra superior compacta en móvil / tablet */}
      <header className="duo-mobile-topbar">
        {statsBar}
      </header>

      {/* Columna central principal */}
      <main className="duo-center-main">
        {activeTab === 'learn' && (
          <LearnPathView
            progress={progress}
            setProgress={setProgress}
            onStartLesson={(mode, lvlId, nodeKey) => onStart(lvlId, mode, nodeKey)}
            onOpenStory={(st) => setActiveStory(st)}
            onOpenGuidebook={(uId) => setGuidebookUnit(uId)}
            onToast={onToast}
          />
        )}
        {activeTab === 'letters' && (
          <LettersView
            progress={progress}
            setProgress={setProgress}
            onStartLettersLesson={() => onStart(1, 'letters')}
            onStartSyllableStage={(stage) => {
              if (stage === 1) onStart(2, 'level', 'u2-n0');
              else if (stage === 2) onStart(2, 'level', 'u2-n1');
              else if (stage === 3) onStart(2, 'level', 'u2-n3');
              else onStart(2, 'level', 'u2-n5');
            }}
          />
        )}
        {activeTab === 'stories' && (
          <StoriesView progress={progress} setProgress={setProgress} onOpenStory={(st) => setActiveStory(st)} />
        )}
        {activeTab === 'practice' && (
          <PracticeHubView
            progress={progress}
            onStartMode={(mode, lvlId) => onStart(lvlId, mode)}
          />
        )}
        {activeTab === 'leaderboard' && (
          <LeaderboardView progress={progress} setProgress={setProgress} onToast={onToast} />
        )}
        {activeTab === 'quests' && (
          <QuestsView progress={progress} setProgress={setProgress} onToast={onToast} />
        )}
        {activeTab === 'shop' && (
          <ShopView progress={progress} setProgress={setProgress} onToast={onToast} />
        )}
        {activeTab === 'profile' && (
          <ProfileView progress={progress} setProgress={setProgress} onOpenSettings={onSettings} />
        )}
      </main>

      {/* Columna derecha de Widgets estilo Duolingo (368px en escritorio) */}
      <aside className="duo-right-rail">
        {statsBar}

        {boostActive && (
          <div className="duo-rail-boost">
            <span>⚡</span>
            <strong>2X XP ACTIVO ({boostMins} min)</strong>
          </div>
        )}

        {/* Tarjeta Super / Vidas Ilimitadas */}
        {!effectiveUnlimited && (
          <div className="duo-rail-card super-promo">
            <div className="duo-rail-super-top">
              <div>
                <span className="duo-super-pill">{t('superBadge', ui)}</span>
                <h3>{t('superTitle', ui)}</h3>
                <p>{t('superDesc', ui)}</p>
              </div>
              <Mascot mood="excited" size={74} outfit={progress.equippedOutfit} />
            </div>
            <button
              className="duo-btn duo-btn-blue duo-btn-full"
              onClick={() => {
                sfx('star', progress.sound);
                setProgress({ unlimitedHearts: true, hearts: 5 });
                onToast(t('superActive', ui));
              }}
            >
              {t('superActivate', ui)}
            </button>
          </div>
        )}

        {/* Widget de Liga Semanal */}
        <div className="duo-rail-card">
          <div className="duo-rail-head">
            <h3>{tf('leagueTitle', ui, { name: league[ui] })}</h3>
            <button className="duo-link-btn" onClick={() => setActiveTab('leaderboard')}>
              {t('viewAll', ui)}
            </button>
          </div>
          <div className="duo-rail-league-body">
            <span className="duo-rail-shield">{league.badge}</span>
            <div>
              <strong>
                #{myLeagueRank} · {progress.xp} XP
              </strong>
              <p>
                {myLeagueRank <= 5
                  ? `▲ ${t('promotionZone', ui)}`
                  : t('leagueSubtitle', ui)}
              </p>
            </div>
          </div>
        </div>

        {/* Widget de Misiones del Día */}
        <div className="duo-rail-card">
          <div className="duo-rail-head">
            <h3>{t('dailyQuestsTitle', ui)}</h3>
            <button className="duo-link-btn" onClick={() => setActiveTab('quests')}>
              {t('viewAll', ui)}
            </button>
          </div>
          <div className="duo-rail-quests">
            {quests.map((q) => {
              const pct = Math.min(100, Math.round((q.current / q.target) * 100));
              return (
                <div key={q.id} className="duo-rail-quest-row">
                  <span className="duo-rq-icon">{q.emoji}</span>
                  <div className="duo-rq-main">
                    <div className="duo-rq-top">
                      <strong>{q.title}</strong>
                      <small>{q.current}/{q.target}</small>
                    </div>
                    <div className="duo-quest-bar">
                      <div className="duo-quest-fill" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Widget de Nivel (Bajo/Medio/Alto), Ruta Pedagógica y Accesibilidad */}
        <div className="duo-rail-card">
          <div className="duo-rail-head">
            <h3>
              <IconAccessibility size={16} /> {t('diffLevelLabel', ui)}
            </h3>
            <button className="duo-link-btn" onClick={onSettings}>
              {t('configureSupports', ui).toUpperCase()}
            </button>
          </div>
          <div className="duo-rail-route-pills" style={{ marginBottom: 8 }}>
            {(['bajo', 'medio', 'alto'] as DifficultyLevel[]).map((dl) => (
              <button
                key={dl}
                className={`duo-route-mini ${progress.difficultyLevel === dl ? 'active' : ''}`}
                onClick={() => {
                  setProgress({ difficultyLevel: dl });
                  onToast(t('diffChanged', ui));
                }}
              >
                <span>
                  {dl === 'bajo' ? `🌱 ${t('diffLow', ui)}` : dl === 'medio' ? `⭐ ${t('diffMed', ui)}` : `🚀 ${t('diffHigh', ui)}`}
                </span>
              </button>
            ))}
          </div>
          <div className="duo-rail-route-pills">
            {(['visual', 'auditivo', 'mixta'] as Route[]).map((r) => (
              <button
                key={r}
                className={`duo-route-mini ${progress.route === r ? 'active' : ''}`}
                onClick={() => {
                  setProgress({ route: r });
                  onToast(t('routeChanged', ui));
                }}
              >
                <RouteIcon route={r} size={14} />
                <span>
                  {r === 'visual' ? t('routeVisual', ui) : r === 'auditivo' ? t('routeAuditivo', ui) : t('routeMixta', ui)}
                </span>
              </button>
            ))}
          </div>
          {supportSummary(ad, ui).length > 0 && (
            <div className="support-summary" style={{ marginTop: 10 }}>
              {supportSummary(ad, ui).map((lbl) => (
                <span key={lbl}>{lbl}</span>
              ))}
            </div>
          )}
        </div>

        <footer className="duo-rail-footer">
          <span>{t('tagline', ui)}</span>
          <strong>{t('credits', ui)}</strong>
        </footer>
      </aside>

      {/* Modales de Guía de Unidad y Lector de Cuentos */}
      {guidebookUnit !== null && (
        <GuidebookModal
          unitId={guidebookUnit}
          ui={ui}
          sound={progress.sound}
          outfit={progress.equippedOutfit}
          onClose={() => setGuidebookUnit(null)}
        />
      )}

      {activeStory !== null && (
        <StoryPlayerModal
          story={activeStory}
          progress={progress}
          onComplete={handleStoryComplete}
          onClose={() => setActiveStory(null)}
        />
      )}
    </div>
  );
}

function useMemoRank(myXp: number): number {
  let rank = 1;
  for (const r of LEAGUE_RIVALS) {
    if (r.baseXp > myXp) rank += 1;
  }
  return rank;
}

/* ================================================================== */
/* Modal de Ajustes y Accesibilidad                                    */
/* ================================================================== */

interface SettingsProps {
  progress: Progress;
  setProgress: (patch: Partial<Progress> | ((prev: Progress) => Partial<Progress>)) => void;
  onClose: () => void;
  onReset: () => void;
  onToast: (text: string) => void;
}

function Toggle({
  icon,
  label,
  checked,
  onChange,
}: {
  icon?: ReactNode;
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="toggle-row">
      <span className="toggle-label">
        {icon && <span className="toggle-icon" aria-hidden="true">{icon}</span>}
        <span>{label}</span>
      </span>
      <button className={`toggle ${checked ? 'on' : ''}`} onClick={() => onChange(!checked)} aria-pressed={checked}>
        <i />
      </button>
    </label>
  );
}

export function Settings({ progress, setProgress, onClose, onReset, onToast }: SettingsProps) {
  const ui = progress.uiLang;
  const [confirmReset, setConfirmReset] = useState(false);
  const summary = supportSummary(computeAdaptations(progress), ui);
  return (
    <Modal onClose={onClose} labelledBy="settings-title">
      <div className="settings">
        <div className="settings-head">
          <span className="settings-head-icon" aria-hidden="true"><IconSettings size={20} /></span>
          <h2 id="settings-title">{t('optionsTitle', ui)}</h2>
        </div>

        <div className="settings-group">
          <h3 className="settings-group-title">{t('settingsGroupProfile', ui)}</h3>
          <label className="settings-field">
            <span className="field-label"><IconUser size={15} /> {t('profileName', ui)}</span>
            <input value={progress.name} maxLength={18} onChange={(e) => setProgress({ name: e.target.value })} />
          </label>

          <div className="settings-field">
            <span className="field-label"><IconGlobe size={15} /> {t('appLangLabel', ui)}</span>
            <Segmented<UiLang>
              value={ui}
              options={[
                { value: 'es', label: t('uiEs', ui) },
                { value: 'eu', label: t('uiEu', ui) },
              ]}
              onChange={(value) => setProgress({ uiLang: value })}
            />
          </div>

          <div className="settings-field">
            <span className="field-label"><IconBook size={15} /> {t('learningLabel', ui)}</span>
            <Segmented<LearnLang>
              value={progress.learnLang}
              options={[
                { value: 'es', label: t('langEs', ui) },
                { value: 'eu', label: t('langEu', ui) },
                { value: 'en', label: t('langEn', ui) },
                { value: 'both', label: t('langBoth', ui) },
              ]}
              onChange={(value) => setProgress({ learnLang: value })}
            />
            <p className="settings-hint">{t('langBothDesc', ui)}</p>
          </div>
        </div>

        <div className="settings-group">
          <h3 className="settings-group-title">{t('settingsGroupMethod', ui)}</h3>
          <div className="settings-field">
            <span className="field-label"><IconBolt size={15} /> {t('diffLevelLabel', ui)}</span>
            <Segmented<DifficultyLevel>
              value={progress.difficultyLevel}
              options={[
                { value: 'bajo', label: `🌱 ${t('diffLow', ui)}` },
                { value: 'medio', label: `⭐ ${t('diffMed', ui)}` },
                { value: 'alto', label: `🚀 ${t('diffHigh', ui)}` },
              ]}
              onChange={(difficultyLevel) => {
                setProgress({ difficultyLevel });
                onToast(t('diffChanged', ui));
              }}
            />
            <p className="settings-hint">{t('diffLevelHint', ui)}</p>
          </div>

          <div className="settings-field">
            <span className="field-label"><IconSchool size={15} /> {t('stageLabel', ui)}</span>
            <Segmented<SchoolStage>
              value={progress.schoolStage}
              options={[
                { value: 'general', label: t('stageGeneral', ui) },
                { value: 'infantil', label: t('stageInfantil', ui) },
                { value: 'prim12', label: t('stagePrim12', ui) },
                { value: 'prim34', label: t('stagePrim34', ui) },
                { value: 'prim56', label: t('stagePrim56', ui) },
              ]}
              onChange={(schoolStage) => {
                setProgress({ schoolStage });
                onToast(t('stageChanged', ui));
              }}
            />
            <p className="settings-hint">{t('stageHint', ui)}</p>
          </div>
          <div className="settings-field">
            <span className="field-label"><IconCompass size={15} /> {t('routeLabel', ui)}</span>
            <Segmented<Route>
              value={progress.route}
              options={[
                { value: 'visual', label: t('routeVisual', ui), icon: <IconEye size={14} /> },
                { value: 'auditivo', label: t('routeAuditivo', ui), icon: <IconHeadphones size={14} /> },
                { value: 'mixta', label: t('routeMixta', ui), icon: <IconLayers size={14} /> },
              ]}
              onChange={(value) => {
                setProgress({ route: value });
                onToast(t('routeChanged', ui));
              }}
            />
            <p className="settings-hint">{t('routeExplanation', ui)}</p>
          </div>
        </div>

        <div className="settings-group">
          <h3 className="settings-group-title">{t('settingsGroupAccess', ui)}</h3>
          <div className="settings-field">
            <span className="field-label"><IconAccessibility size={15} /> {t('phaseTitle', ui)}</span>
            <div className="support-grid support-grid-settings">
              <button
                className={`support-card compact ${progress.readingPhase === 'fonologica' ? 'selected' : ''}`}
                onClick={() => { setProgress({ readingPhase: 'fonologica' }); onToast(t('phaseChanged', ui)); }}
                aria-pressed={progress.readingPhase === 'fonologica'}
                title={t('phaseFonologicaDesc', ui)}
              >
                <span className="support-emoji" aria-hidden="true">🎵</span>
                <strong>{t('phaseFonologica', ui)}</strong>
                {progress.readingPhase === 'fonologica' && (<span className="choice-check" aria-hidden="true"><IconCheck size={12} /></span>)}
              </button>
              <button
                className={`support-card compact ${progress.readingPhase === 'logográfica' ? 'selected' : ''}`}
                onClick={() => { setProgress({ readingPhase: 'logográfica' }); onToast(t('phaseChanged', ui)); }}
                aria-pressed={progress.readingPhase === 'logográfica'}
                title={t('phaseLogograficaDesc', ui)}
              >
                <span className="support-emoji" aria-hidden="true">👀</span>
                <strong>{t('phaseLogografica', ui)}</strong>
                {progress.readingPhase === 'logográfica' && (<span className="choice-check" aria-hidden="true"><IconCheck size={12} /></span>)}
              </button>
              <button
                className={`support-card compact ${progress.readingPhase === 'alfabética' ? 'selected' : ''}`}
                onClick={() => { setProgress({ readingPhase: 'alfabética' }); onToast(t('phaseChanged', ui)); }}
                aria-pressed={progress.readingPhase === 'alfabética'}
                title={t('phaseAlfabeticaDesc', ui)}
              >
                <span className="support-emoji" aria-hidden="true">🔤</span>
                <strong>{t('phaseAlfabetica', ui)}</strong>
                {progress.readingPhase === 'alfabética' && (<span className="choice-check" aria-hidden="true"><IconCheck size={12} /></span>)}
              </button>
              <button
                className={`support-card compact ${progress.readingPhase === 'ortográfica' ? 'selected' : ''}`}
                onClick={() => { setProgress({ readingPhase: 'ortográfica' }); onToast(t('phaseChanged', ui)); }}
                aria-pressed={progress.readingPhase === 'ortográfica'}
                title={t('phaseOrtograficaDesc', ui)}
              >
                <span className="support-emoji" aria-hidden="true">📖</span>
                <strong>{t('phaseOrtografica', ui)}</strong>
                {progress.readingPhase === 'ortográfica' && (<span className="choice-check" aria-hidden="true"><IconCheck size={12} /></span>)}
              </button>
            </div>
            <p className="settings-hint">{t('phaseHint', ui)}</p>
            <div className="support-summary">
              {summary.length ? summary.map((s) => <span key={s}>{s}</span>) : <span className="summary-muted">{t('supportsNone', ui)}</span>}
            </div>
          </div>
        </div>

        <div className="settings-group">
          <h3 className="settings-group-title">{t('settingsGroupAudio', ui)}</h3>
          <Toggle
            icon={progress.sound ? <IconVolume size={16} /> : <IconVolumeOff size={16} />}
            label={t('sound', ui)}
            checked={progress.sound}
            onChange={(v) => setProgress({ sound: v })}
          />
          <div className="settings-field">
            <span className="field-label">🎚️ {t('audioSpeedLabel', ui)}</span>
            <div className="duo-speed-bar">
              <div className="duo-speed-bar-head">
                <span>
                  {progress.speechRate <= 0.72
                    ? `🐢 ${t('audioSpeedSlowHint', ui)}`
                    : `🐇 ${t('audioSpeedNormalHint', ui)}`}
                </span>
                <span className="duo-speed-value">{progress.speechRate.toFixed(2)}</span>
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
              <div className="duo-speed-ticks">
                <span>🐢 0.45</span>
                <span>0.70</span>
                <span>1.00 🐇</span>
              </div>
            </div>
            <p className="settings-hint">{t('hintDictation', ui)}</p>
          </div>
          <Toggle
            icon={<IconMusic size={16} />}
            label={t('music', ui)}
            checked={progress.music}
            onChange={(v) => {
              syncMusic(v);
              setProgress({ music: v });
              onToast(t(v ? 'musicOn' : 'musicOff', ui));
            }}
          />
          <Toggle
            label={`🌙 ${t('darkModeLabel', ui)}`}
            checked={progress.darkMode}
            onChange={(v) => setProgress({ darkMode: v })}
          />
          <Toggle
            label={`♾️ ${t('superActive', ui)}`}
            checked={progress.unlimitedHearts}
            onChange={(v) => setProgress({ unlimitedHearts: v, hearts: 5 })}
          />
          <Toggle
            label={t('calmModeLabel', ui)}
            checked={progress.calmMode}
            onChange={(v) => setProgress({ calmMode: v })}
          />
          <Toggle
            label={t('bigText', ui)}
            checked={progress.bigText}
            onChange={(v) => setProgress({ bigText: v })}
          />
          <Toggle
            label={t('unlockAll', ui)}
            checked={progress.unlockAll}
            onChange={(v) => setProgress({ unlockAll: v })}
          />
        </div>

        {confirmReset ? (
          <div className="reset-confirm">
            <p>{t('resetConfirm', ui)}</p>
            <div className="modal-actions">
              <button className="duo-btn duo-btn-outline" onClick={() => setConfirmReset(false)}>
                {t('resetNo', ui)}
              </button>
              <button className="duo-btn duo-btn-red" onClick={onReset}>
                {t('resetYes', ui)}
              </button>
            </div>
          </div>
        ) : (
          <button className="reset-link" onClick={() => setConfirmReset(true)}>
            {t('reset', ui)}
          </button>
        )}
        <button className="duo-btn duo-btn-green duo-btn-full" onClick={onClose}>
          {t('close', ui).toUpperCase()}
        </button>
      </div>
    </Modal>
  );
}

/* ================================================================== */
/* Pantalla de Celebración Final estilo Duolingo                       */
/* ================================================================== */

interface ResultProps {
  progress: Progress;
  result: SessionResult;
  newBadges: string[];
  onNext: (levelId: number) => void;
  onRepeat: () => void;
  onMap: () => void;
}

export function ResultScreen({ progress, result, newBadges, onNext, onRepeat, onMap }: ResultProps) {
  const ui = progress.uiLang;
  const calm = computeAdaptations(progress).calm;
  const xpCount = useCountUp(result.xp);
  const accPct = result.total > 0 ? Math.round((result.correct / result.total) * 100) : 100;
  const mins = Math.floor((result.durationSec || 45) / 60);
  const secs = (result.durationSec || 45) % 60;
  const timeFormatted = `${mins}:${String(secs).padStart(2, '0')}`;
  const weekStats = getRecentWeekStats(progress);

  const previousXp = Math.max(0, progress.xp - result.xp);
  const leveledUp = Math.floor(previousXp / 120) < Math.floor(progress.xp / 120);
  const hasNextUnit =
    (result.mode === 'level' || result.mode === 'legendary') &&
    (result.levelId ?? 0) >= 1 &&
    (result.levelId ?? 0) < levels.length &&
    result.stars >= 1;

  useEffect(() => {
    if (leveledUp && !calm && !prefersReducedMotion()) sfx('levelup', progress.sound);
  }, [leveledUp, calm, progress.sound]);

  return (
    <div className="duo-result-page">
      {!calm && <Confetti burstKey={1} count={52} />}

      <div className="duo-result-center">
        <div className="duo-result-mascots">
          <Mascot mood="cheer" size={148} outfit={progress.equippedOutfit} interactive sound={progress.sound} />
        </div>

        <h1 className="duo-result-headline">
          {result.mode === 'legendary'
            ? '👑 ¡Unidad Legendaria!'
            : result.perfect
              ? t('resultPerfect', ui)
              : t('resultTitle', ui)}
        </h1>
        <p className="duo-result-sub">{t('resultSub', ui)}</p>

        {(result.mode === 'level' || result.mode === 'legendary') && (
          <div className="result-stars">
            <StarRow count={result.stars} size="lg" animate />
          </div>
        )}

        {/* Las 3 cajas de colores icónicas de Duolingo (XP Amarillo, Precisión Verde, Tiempo Azul) */}
        <div className="duo-result-boxes">
          <div className="duo-rbox yellow" style={staggerStyle(0)}>
            <span className="duo-rbox-head">
              {t('statTotalXp', ui)} {result.xpBoosted ? '⚡2X' : ''}
            </span>
            <strong>⚡ +{xpCount}</strong>
          </div>
          <div className="duo-rbox green" style={staggerStyle(1)}>
            <span className="duo-rbox-head">{t('statAccuracy', ui)}</span>
            <strong>🎯 {accPct}%</strong>
          </div>
          <div className="duo-rbox blue" style={staggerStyle(2)}>
            <span className="duo-rbox-head">{t('statSpeed', ui)}</span>
            <strong>⏱️ {timeFormatted}</strong>
          </div>
        </div>

        {/* Píldora de gemas y vidas recuperadas */}
        <div className="duo-result-rewards-row">
          <span className="duo-gem-reward-pill">
            <DuoGemSvg size={20} /> +{result.gemsEarned} {ui === 'eu' ? 'harribitxi' : 'gemas'}
          </span>
          {(result.heartsRestored ?? 0) > 0 && (
            <span className="duo-heart-reward-pill">
              <DuoHeartSvg size={20} /> +{result.heartsRestored} {ui === 'eu' ? 'bihotz' : 'vida'}
            </span>
          )}
        </div>

        {/* Tarjeta de Racha Diaria estilo Duolingo */}
        <div className="duo-streak-result-card">
          <div className="duo-streak-rc-top">
            <DuoFlameSvg size={38} active />
            <div>
              <strong>{tf('streakCardTitle', ui, { n: String(progress.streak) })}</strong>
              <span>{t('streakCardSub', ui)}</span>
            </div>
          </div>
          <div className="duo-week-row">
            {weekStats.map((d) => (
              <div key={d.date} className={`duo-week-dot ${d.done ? 'done' : ''} ${d.isToday ? 'today' : ''}`}>
                <span>{ui === 'eu' ? d.labelEu : d.labelEs}</span>
                <i>{d.done ? '✓' : ''}</i>
              </div>
            ))}
          </div>
        </div>

        {leveledUp && (
          <div className="levelup-banner" role="status">
            <Mascot mood="excited" size={58} outfit={progress.equippedOutfit} />
            <div>
              <strong><IconBolt size={14} /> {t('levelUpTitle', ui)}</strong>
              <span>{t('levelUpSub', ui)}</span>
            </div>
          </div>
        )}

        {newBadges.length > 0 && (
          <div className="result-badges">
            <strong><IconAward size={15} /> {t('newBadge', ui)}</strong>
            <div>
              {newBadges.map((id, i) => {
                const b = badgeById[id];
                return b ? (
                  <span key={id} className="earned-badge" style={{ animationDelay: `${i * 0.14}s` }}>
                    {b.emoji} {b[ui].name}
                  </span>
                ) : null;
              })}
            </div>
          </div>
        )}
      </div>

      {/* Barra inferior fija de celebración estilo Duolingo */}
      <footer className="duo-lesson-bottombar">
        <div className="duo-lesson-bottom-inner">
          <button className="duo-btn duo-btn-outline duo-btn-lg" onClick={onRepeat}>
            <IconRepeat size={17} />
            <span>{t('repeat', ui).toUpperCase()}</span>
          </button>
          <div className="duo-bottom-right-btns">
            {hasNextUnit && (
              <button
                className="duo-btn duo-btn-blue duo-btn-lg"
                onClick={() => onNext((result.levelId ?? 1) + 1)}
              >
                <span>{t('nextWorld', ui).toUpperCase()}</span>
              </button>
            )}
            <button className="duo-btn duo-btn-green duo-btn-lg" onClick={onMap}>
              <span>{t('continueBtn', ui).toUpperCase()}</span>
              <IconArrowRight size={17} />
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
