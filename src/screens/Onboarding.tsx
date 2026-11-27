import { useState } from 'react';
import { DuoOwlBuddy, Mascot, StepProgress, staggerStyle } from '../components';
import { DuoFlagSvg, IconArrowLeft, IconArrowRight, IconCheck, IconLightbulb, IconPlay, IconUser } from '../icons';
import { t, tf } from '../i18n';
import type { DifficultyLevel, LearnLang, Progress, ReadingPhase, Route, SchoolStage, UiLang } from '../types';
import { DuoWordmark, RouteIcon } from './shared';

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
