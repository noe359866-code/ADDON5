import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { adaptationsFor, computeAdaptations, supportProfiles, supportSummary } from './adaptations';
import {
  Confetti,
  Mascot,
  Modal,
  PatoMark,
  ProgressBar,
  SectionHead,
  StarRow,
  StepProgress,
  prefersReducedMotion,
  staggerStyle,
  useCountUp,
} from './components';
import { badgeById, badges, bonusModes, levels } from './data';
import {
  IconAccessibility,
  IconArrowLeft,
  IconArrowRight,
  IconAward,
  IconBolt,
  IconBook,
  IconCheck,
  IconCompass,
  IconEye,
  IconFlame,
  IconGamepad,
  IconGlobe,
  IconHeadphones,
  IconLayers,
  IconLightbulb,
  IconLock,
  IconMap,
  IconMusic,
  IconPlay,
  IconRepeat,
  IconSettings,
  IconShuffle,
  IconStar,
  IconUser,
  IconVolume,
  IconVolumeOff,
} from './icons';
import { t, tf } from './i18n';
import { startAmbientMusic, stopAmbientMusic } from './music';
import { isUnlocked, nextLevel, readerLevel } from './progress';
import { sfx } from './sound';
import type { LearnLang, Progress, Route, SessionResult, SupportId, UiLang } from './types';

/* ------------------------------------------------------------------ */
/* Piezas pequeñas                                                     */
/* ------------------------------------------------------------------ */

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

function Brand({ ui, compact = false }: { ui: UiLang; compact?: boolean }) {
  return (
    <div className={`brand ${compact ? 'brand-compact' : ''}`}>
      <span className="brand-mark" aria-hidden="true">
        <PatoMark size={compact ? 24 : 32} />
      </span>
      <span className="brand-text">
        <strong>{t('appName', ui)}</strong>
        {!compact && <small>{t('appSub', ui)}</small>}
      </span>
    </div>
  );
}

function RouteIcon({ route, size = 18 }: { route: Route; size?: number }) {
  if (route === 'visual') return <IconEye size={size} />;
  if (route === 'auditivo') return <IconHeadphones size={size} />;
  return <IconLayers size={size} />;
}

/* ------------------------------------------------------------------ */
/* Onboarding                                                          */
/* ------------------------------------------------------------------ */

export function Onboarding({ onDone }: { onDone: (patch: Partial<Progress>) => void }) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [learnLang, setLearnLang] = useState<LearnLang>('both');
  const [route, setRoute] = useState<Route>('mixta');
  const [ui, setUi] = useState<UiLang>('es');
  const [supports, setSupports] = useState<SupportId[]>([]);

  const toggleSupport = (id: SupportId) =>
    setSupports((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const langCards: { value: LearnLang; icon: ReactNode; code: string; title: string; desc: string }[] = [
    { value: 'es', icon: <IconBook size={20} />, code: 'ES', title: t('langEs', ui), desc: t('langEsDesc', ui) },
    { value: 'eu', icon: <IconGlobe size={20} />, code: 'EU', title: t('langEu', ui), desc: t('langEuDesc', ui) },
    { value: 'both', icon: <IconLayers size={20} />, code: 'ES + EU', title: t('langBoth', ui), desc: t('langBothDesc', ui) },
  ];
  const routeCards: { value: Route; title: string; desc: string }[] = [
    { value: 'visual', title: t('routeVisual', ui), desc: t('routeVisualDesc', ui) },
    { value: 'auditivo', title: t('routeAuditivo', ui), desc: t('routeAuditivoDesc', ui) },
    { value: 'mixta', title: t('routeMixta', ui), desc: t('routeMixtaDesc', ui) },
  ];

  return (
    <div className="onboarding">
      <div className="onb-top">
        <Brand ui={ui} />
        <div className="lang-switch" role="group" aria-label={t('appLangLabel', ui)}>
          <button className={ui === 'es' ? 'on' : ''} onClick={() => setUi('es')} aria-pressed={ui === 'es'}>
            ES
          </button>
          <button className={ui === 'eu' ? 'on' : ''} onClick={() => setUi('eu')} aria-pressed={ui === 'eu'}>
            EU
          </button>
        </div>
      </div>

      <div className="onb-card">
        <div className="onb-hero">
          <div className="onb-mascot-frame">
            <Mascot mood={step === 0 ? 'wave' : step === 2 ? 'excited' : 'happy'} size={136} interactive />
          </div>
          <div className="speech-bubble">
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
            <div className="choice-grid">
              {langCards.map((card, i) => (
                <button
                  key={card.value}
                  style={staggerStyle(i)}
                  className={`choice-card ${learnLang === card.value ? 'selected' : ''}`}
                  onClick={() => setLearnLang(card.value)}
                  aria-pressed={learnLang === card.value}
                >
                  <span className="choice-head">
                    <span className="choice-icon">{card.icon}</span>
                    <span className="choice-code">{card.code}</span>
                  </span>
                  <strong>{card.title}</strong>
                  <small>{card.desc}</small>
                  {learnLang === card.value && (
                    <span className="choice-check" aria-hidden="true">
                      <IconCheck size={13} />
                    </span>
                  )}
                </button>
              ))}
            </div>
            <div className="onb-actions">
              <button className="btn btn-primary btn-wide" onClick={() => setStep(1)}>
                <span>{t('next', ui)}</span>
                <IconArrowRight size={17} />
              </button>
            </div>
          </>
        ) : step === 1 ? (
          <>
            <h1>{t('step2Title', ui)}</h1>
            <p className="onb-sub">{t('step2Sub', ui)}</p>
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
            <p className="onb-note">
              <IconLightbulb size={16} />
              <span>{t('routeExplanation', ui)}</span>
            </p>
            <div className="onb-actions">
              <button className="btn btn-quiet" onClick={() => setStep(0)}>
                <IconArrowLeft size={16} />
                <span>{t('back', ui)}</span>
              </button>
              <button className="btn btn-primary" onClick={() => setStep(2)}>
                <span>{t('next', ui)}</span>
                <IconArrowRight size={16} />
              </button>
            </div>
          </>
        ) : (
          <>
            <h1>{t('step3Title', ui)}</h1>
            <p className="onb-sub">{t('step3Sub', ui)}</p>
            <div className="support-grid">
              {supportProfiles.map((profile, i) => (
                <button
                  key={profile.id}
                  style={staggerStyle(i)}
                  className={`support-card ${supports.includes(profile.id) ? 'selected' : ''}`}
                  onClick={() => toggleSupport(profile.id)}
                  aria-pressed={supports.includes(profile.id)}
                >
                  <span className="support-emoji" aria-hidden="true">{profile.emoji}</span>
                  <span className="support-text">
                    <strong>{profile[ui].name}</strong>
                    <small>{profile[ui].desc}</small>
                  </span>
                  {supports.includes(profile.id) && (
                    <span className="choice-check" aria-hidden="true">
                      <IconCheck size={13} />
                    </span>
                  )}
                </button>
              ))}
            </div>
            {supports.length > 0 && (
              <div className="support-summary">
                {supportSummary(adaptationsFor(supports), ui).map((s) => (
                  <span key={s}>{s}</span>
                ))}
              </div>
            )}
            <p className="onb-note">
              <IconLightbulb size={16} />
              <span>{t('supportsHint', ui)}</span>
            </p>
            <div className="onb-actions">
              <button className="btn btn-quiet" onClick={() => setStep(1)}>
                <IconArrowLeft size={16} />
                <span>{t('back', ui)}</span>
              </button>
              <button
                className="btn btn-primary"
                onClick={() =>
                  onDone({
                    onboarded: true,
                    name: name.trim() || (ui === 'eu' ? 'Lagun' : 'Amigo'),
                    learnLang,
                    route,
                    uiLang: ui,
                    supports,
                    calmMode: supports.includes('tea'),
                  })
                }
              >
                <IconPlay size={16} />
                <span>{t('letsGo', ui)}</span>
              </button>
            </div>
            <button
              className="support-skip"
              onClick={() =>
                onDone({
                  onboarded: true,
                  name: name.trim() || (ui === 'eu' ? 'Lagun' : 'Amigo'),
                  learnLang,
                  route,
                  uiLang: ui,
                  supports: [],
                  calmMode: false,
                })
              }
            >
              {t('supportSkip', ui)}
            </button>
          </>
        )}
        <p className="onb-foot">{t('onboardNote', ui)}</p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Pantalla principal / estudio de aprendizaje                         */
/* ------------------------------------------------------------------ */

interface HomeProps {
  progress: Progress;
  setProgress: (patch: Partial<Progress> | ((prev: Progress) => Partial<Progress>)) => void;
  onStart: (levelId: number | null) => void;
  onToast: (text: string) => void;
  onSettings: () => void;
}

export function Home({ progress, setProgress, onStart, onToast, onSettings }: HomeProps) {
  const ui = progress.uiLang;
  const current = nextLevel(progress);
  const levelInfo = readerLevel(progress.xp);
  const currentDef = levels.find((l) => l.id === current)!;
  const name = progress.name || (ui === 'eu' ? 'Lagun' : 'Amigo');
  const ad = computeAdaptations(progress);
  const supportLabels = supportSummary(ad, ui);
  const completedCount = levels.filter((l) => progress.completed[l.id]).length;
  const totalStars = levels.reduce((acc, l) => acc + (progress.stars[l.id] ?? 0), 0);
  const maxStars = levels.length * 3;

  const setRoute = (route: Route) => {
    setProgress({ route });
    onToast(t('routeChanged', ui));
  };

  const toggleMusic = () => {
    const next = !progress.music;
    syncMusic(next);
    setProgress({ music: next });
    onToast(t(next ? 'musicOn' : 'musicOff', ui));
  };

  const routeKey = (r: Route) => (r === 'visual' ? 'routeVisual' : r === 'auditivo' ? 'routeAuditivo' : 'routeMixta');

  return (
    <div className="home">
      <header className="home-header">
        <Brand ui={ui} />
        <div className="home-controls">
          <span className="learner-chip" title={`${t('readerLevel', ui)} ${levelInfo.level}`}>
            <IconUser size={14} />
            <span className="learner-name">{name}</span>
            <span className="learner-lvl">Nv. {levelInfo.level}</span>
          </span>
          <div className="lang-switch" role="group" aria-label={t('appLangLabel', ui)}>
            <button className={ui === 'es' ? 'on' : ''} onClick={() => setProgress({ uiLang: 'es' })} aria-pressed={ui === 'es'}>
              ES
            </button>
            <button className={ui === 'eu' ? 'on' : ''} onClick={() => setProgress({ uiLang: 'eu' })} aria-pressed={ui === 'eu'}>
              EU
            </button>
          </div>
          <button
            className={`icon-btn ${progress.sound ? 'is-active' : ''}`}
            onClick={() => setProgress({ sound: !progress.sound })}
            aria-label={t('sound', ui)}
            title={t('sound', ui)}
            aria-pressed={progress.sound}
          >
            {progress.sound ? <IconVolume size={18} /> : <IconVolumeOff size={18} />}
          </button>
          <button
            className={`icon-btn music-btn ${progress.music ? 'on' : ''}`}
            onClick={toggleMusic}
            aria-label={t('music', ui)}
            title={t('music', ui)}
            aria-pressed={progress.music}
          >
            <IconMusic size={18} />
          </button>
          <button className="icon-btn" onClick={onSettings} aria-label={t('settings', ui)} title={t('settings', ui)}>
            <IconSettings size={18} />
          </button>
        </div>
      </header>

      <section className="hero-card">
        <div className="hero-left">
          <div className="hero-mascot-ring">
            <Mascot mood="wave" size={126} interactive sound={progress.sound} />
          </div>
          <div className="hero-greeting">
            <div className="hero-eyebrow-row">
              <span className="hero-kicker">{t('hello', ui)}, {name}!</span>
              <span className="hero-skill-pill">
                {t('worldOf', ui)} {currentDef.id}/6 · {currentDef[ui].skill}
              </span>
            </div>
            <h1>{t('greetingSub', ui)}</h1>
            <p className="hero-world">
              {t('currentLevel', ui)}: <strong>{currentDef[ui].title}</strong>
            </p>
            <div className="hero-cta-row">
              <button className="btn btn-primary btn-lg pulse-cta" onClick={() => onStart(current)}>
                <IconPlay size={16} />
                <span>{t('continueAdventure', ui)}</span>
              </button>
              <button className="btn btn-quiet" onClick={() => onStart(null)}>
                <IconShuffle size={15} />
                <span>{t('practiceTitle', ui)}</span>
              </button>
            </div>
          </div>
        </div>

        <aside className="hero-stats" aria-label={t('curriculumProgress', ui)}>
          <div className="stats-header">
            <span className="stats-title">
              <IconBolt size={14} /> {t('readerLevel', ui)} {levelInfo.level}
            </span>
            <span className="stats-xp">{levelInfo.into} / 120 {t('xp', ui)}</span>
          </div>
          <ProgressBar value={levelInfo.into} max={120} tone="purple" />
          <div className="stats-grid">
            <div className="stat-box">
              <span className="stat-box-icon stat-teal"><IconMap size={15} /></span>
              <div>
                <strong>{completedCount}/6</strong>
                <span>{t('worldsCompleted', ui)}</span>
              </div>
            </div>
            <div className="stat-box">
              <span className="stat-box-icon stat-gold"><IconStar size={15} filled /></span>
              <div>
                <strong>{totalStars}/{maxStars}</strong>
                <span>{t('stars', ui)}</span>
              </div>
            </div>
            <div className="stat-box">
              <span className="stat-box-icon stat-amber"><IconFlame size={15} /></span>
              <div>
                <strong>{progress.streak}</strong>
                <span>{t('days', ui)}</span>
              </div>
            </div>
            <div className="stat-box">
              <span className="stat-box-icon stat-blue"><IconAward size={15} /></span>
              <div>
                <strong>{progress.badges.length}/{badges.length}</strong>
                <span>{t('badgesTitle', ui)}</span>
              </div>
            </div>
          </div>
        </aside>
      </section>

      <section className="plan-section home-section">
        <SectionHead
          icon={<IconCompass size={18} />}
          title={t('planTitle', ui)}
          sub={t('routeExplanation', ui)}
        />
        <div className="route-cards">
          {(['visual', 'auditivo', 'mixta'] as Route[]).map((r, i) => {
            const active = progress.route === r;
            return (
              <button
                key={r}
                style={staggerStyle(i)}
                className={`route-card route-${r} ${active ? 'selected' : ''}`}
                onClick={() => setRoute(r)}
                aria-pressed={active}
              >
                <div className="route-card-top">
                  <span className="route-icon">
                    <RouteIcon route={r} size={19} />
                  </span>
                  {active && (
                    <span className="route-selected-mark" aria-hidden="true">
                      <IconCheck size={12} />
                    </span>
                  )}
                </div>
                <strong>{t(routeKey(r), ui)}</strong>
                <small>
                  {r === 'visual' ? t('routeVisualDesc', ui) : r === 'auditivo' ? t('routeAuditivoDesc', ui) : t('routeMixtaDesc', ui)}
                </small>
              </button>
            );
          })}
        </div>

        <div className="plan-controls-bar">
          <div className="learn-lang-row">
            <span>{t('learningLabel', ui)}</span>
            <Segmented<LearnLang>
              value={progress.learnLang}
              options={[
                { value: 'es', label: t('langEs', ui) },
                { value: 'eu', label: t('langEu', ui) },
                { value: 'both', label: t('langBoth', ui) },
              ]}
              onChange={(value) => setProgress({ learnLang: value })}
            />
          </div>

          <div className={`supports-strip ${ad.active.length > 0 ? 'has-supports' : ''}`}>
            <span className="supports-strip-label">
              <IconAccessibility size={16} />
              <strong>{t('supportsTitle', ui)}</strong>
            </span>
            <div className="support-summary">
              {supportLabels.length > 0 ? (
                supportLabels.map((label) => <span key={label}>{label}</span>)
              ) : (
                <span className="summary-muted">{t('supportsNone', ui)}</span>
              )}
            </div>
            <button className="btn btn-quiet btn-compact" onClick={onSettings}>
              <IconSettings size={14} />
              <span>{t('configureSupports', ui)}</span>
            </button>
          </div>
        </div>
      </section>

      <section className="map-section home-section">
        <SectionHead
          icon={<IconMap size={18} />}
          title={t('mapTitle', ui)}
          sub={t('mapSubtitle', ui)}
          meta={
            <span className="meta-pill">
              <IconStar size={14} filled /> {totalStars} / {maxStars}
            </span>
          }
        />
        {progress.unlockAll && <p className="demo-banner">{t('demoNote', ui)}</p>}
        <div className="map-path">
          {levels.map((level, i) => {
            const locked = !isUnlocked(progress, level.id);
            const stars = progress.stars[level.id] ?? 0;
            const done = !!progress.completed[level.id];
            const isCurrent = current === level.id;
            return (
              <button
                key={level.id}
                style={staggerStyle(i)}
                className={`level-card theme-${level.theme} ${locked ? 'locked' : ''} ${done ? 'is-done' : ''} ${isCurrent ? 'is-current' : ''}`}
                onClick={() => (locked ? onToast(t('lockedHint', ui)) : onStart(level.id))}
              >
                <span className="level-bubble" aria-hidden="true">
                  {locked ? <IconLock size={22} /> : level.emoji}
                </span>
                <span className="level-body">
                  <span className="level-meta-row">
                    <span className="level-num">
                      {t('worldOf', ui)} {level.id}
                    </span>
                    <span className="skill-tag">{level[ui].skill}</span>
                    {done && (
                      <span className="status-tag status-done">
                        <IconCheck size={11} /> {t('completedLabel', ui)}
                      </span>
                    )}
                    {!done && isCurrent && !locked && (
                      <span className="status-tag status-current">{t('inProgressTag', ui)}</span>
                    )}
                  </span>
                  <strong>{level[ui].title}</strong>
                  <small>{locked ? t('locked', ui) : level[ui].sub}</small>
                </span>
                <span className="level-right">
                  <StarRow count={stars} size="sm" />
                  <span className="level-go" aria-hidden="true">
                    {locked ? <IconLock size={15} /> : done ? <IconRepeat size={15} /> : <IconPlay size={15} />}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="bonus-section home-section">
        <SectionHead
          icon={<IconGamepad size={18} />}
          title={t('bonusTitle', ui)}
          sub={t('bonusSub', ui)}
          meta={<span className="meta-pill meta-open">{t('bonusFree', ui)}</span>}
        />
        <div className="bonus-grid">
          {bonusModes.map((mode, i) => (
            <button
              key={mode.id}
              style={staggerStyle(i)}
              className={`bonus-card theme-${mode.theme}`}
              onClick={() => onStart(mode.id)}
            >
              <span className="bonus-emoji" aria-hidden="true">{mode.emoji}</span>
              <span className="bonus-body">
                <em>{t('bonusFree', ui)}</em>
                <strong>{mode[ui].title}</strong>
                <small>{mode[ui].sub}</small>
              </span>
              <span className="bonus-go">
                <span>{t('playBonus', ui)}</span>
                <IconPlay size={12} />
              </span>
            </button>
          ))}
        </div>

        <div className="practice-card">
          <span className="practice-emoji" aria-hidden="true">
            <IconShuffle size={22} />
          </span>
          <div className="practice-copy">
            <strong>{t('practiceTitle', ui)}</strong>
            <p>{t('practiceDesc', ui)}</p>
          </div>
          <button className="btn btn-secondary" onClick={() => onStart(null)}>
            <span>{t('playBonus', ui)}</span>
            <IconArrowRight size={15} />
          </button>
        </div>
      </section>

      <section className="badges-section home-section">
        <SectionHead
          icon={<IconAward size={18} />}
          title={t('badgesTitle', ui)}
          sub={progress.badges.length ? `${progress.badges.length} / ${badges.length}` : t('badgesEmpty', ui)}
          meta={
            <span className="meta-pill">
              {progress.badges.length} / {badges.length}
            </span>
          }
        />
        <div className="badge-shelf">
          {badges.map((b) => {
            const owned = progress.badges.includes(b.id);
            return (
              <div key={b.id} className={`badge-item ${owned ? 'owned' : ''}`} title={`${b[ui].name} · ${b[ui].desc}`}>
                <span className="badge-emblem" aria-hidden="true">
                  {owned ? b.emoji : <IconLock size={18} />}
                </span>
                <small>{owned ? b[ui].name : '···'}</small>
              </div>
            );
          })}
        </div>
      </section>

      <footer className="home-footer">
        <Brand ui={ui} compact />
        <span className="home-tagline">{t('tagline', ui)}</span>
        <span className="home-credits" aria-label="Créditos">{t('credits', ui)}</span>
      </footer>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Ajustes                                                             */
/* ------------------------------------------------------------------ */

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
  const activeSupports = progress.supports ?? [];
  const summary = supportSummary(computeAdaptations(progress), ui);
  const toggleSupport = (id: SupportId) =>
    setProgress((prev) => ({
      supports: prev.supports.includes(id) ? prev.supports.filter((x) => x !== id) : [...prev.supports, id],
    }));
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
                { value: 'both', label: t('langBoth', ui) },
              ]}
              onChange={(value) => setProgress({ learnLang: value })}
            />
          </div>
        </div>

        <div className="settings-group">
          <h3 className="settings-group-title">{t('settingsGroupMethod', ui)}</h3>
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
            <span className="field-label"><IconAccessibility size={15} /> {t('supportsTitle', ui)}</span>
            <div className="support-grid support-grid-settings">
              {supportProfiles.map((profile) => (
                <button
                  key={profile.id}
                  className={`support-card compact ${activeSupports.includes(profile.id) ? 'selected' : ''}`}
                  onClick={() => toggleSupport(profile.id)}
                  aria-pressed={activeSupports.includes(profile.id)}
                  title={profile[ui].desc}
                >
                  <span className="support-emoji" aria-hidden="true">{profile.emoji}</span>
                  <strong>{profile[ui].name}</strong>
                  {activeSupports.includes(profile.id) && (
                    <span className="choice-check" aria-hidden="true">
                      <IconCheck size={12} />
                    </span>
                  )}
                </button>
              ))}
            </div>
            <p className="settings-hint">{t('supportsHint', ui)}</p>
            <div className="support-summary">
              {summary.length ? summary.map((s) => <span key={s}>{s}</span>) : <span className="summary-muted">{t('supportsNone', ui)}</span>}
            </div>
          </div>
        </div>

        <div className="settings-group">
          <h3 className="settings-group-title">{t('settingsGroupAudio', ui)}</h3>
          <Toggle
            icon={<IconVolume size={16} />}
            label={t('sound', ui)}
            checked={progress.sound}
            onChange={(v) => setProgress({ sound: v })}
          />
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
          <p className="settings-hint settings-hint-tight">{t('musicDesc', ui)} {t('musicNote', ui)}</p>
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
              <button className="btn btn-quiet" onClick={() => setConfirmReset(false)}>
                {t('resetNo', ui)}
              </button>
              <button className="btn btn-danger" onClick={onReset}>
                {t('resetYes', ui)}
              </button>
            </div>
          </div>
        ) : (
          <button className="reset-link" onClick={() => setConfirmReset(true)}>
            {t('reset', ui)}
          </button>
        )}
        <button className="btn btn-primary btn-wide" onClick={onClose}>
          {t('close', ui)}
        </button>
      </div>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* Resultado                                                           */
/* ------------------------------------------------------------------ */

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
  const hasNext = result.mode === 'level' && (result.levelId ?? 0) < levels.length && result.stars >= 1;
  const allDone = levels.every((l) => progress.completed[l.id]);
  const calm = computeAdaptations(progress).calm;
  const xpCount = useCountUp(result.xp);
  const previousXp = Math.max(0, progress.xp - result.xp);
  const leveledUp = Math.floor(previousXp / 120) < Math.floor(progress.xp / 120);

  useEffect(() => {
    if (leveledUp && !calm && !prefersReducedMotion()) sfx('levelup', progress.sound);
  }, [leveledUp, calm, progress.sound]);

  return (
    <div className="result-screen">
      {!calm && <Confetti burstKey={1} count={46} />}
      <div className="result-card">
        <div className="result-mascot-wrap">
          <Mascot mood="cheer" size={146} interactive sound={progress.sound} />
        </div>
        <h1>{result.mode === 'practice' ? t('levelCompleted', ui) : t('resultTitle', ui)}</h1>
        <p className="result-sub">{result.perfect ? t('resultPerfect', ui) : t('resultSub', ui)}</p>

        {leveledUp && (
          <div className="levelup-banner" role="status">
            <Mascot mood="excited" size={62} interactive sound={progress.sound} />
            <div>
              <strong><IconBolt size={14} /> {t('levelUpTitle', ui)}</strong>
              <span>{t('levelUpSub', ui)}</span>
            </div>
          </div>
        )}

        {result.mode === 'level' && (
          <div className="result-stars">
            <StarRow count={result.stars} size="lg" animate />
          </div>
        )}

        <div className="result-stats">
          <div>
            <strong>{result.correct}/{result.total}</strong>
            <span>{t('accuracy', ui)}</span>
          </div>
          <div>
            <strong className="xp-counter">+{xpCount}</strong>
            <span>{t('xpEarned', ui)}</span>
          </div>
          <div>
            <strong>{result.maxStreak}</strong>
            <span>{t('streak', ui)}</span>
          </div>
        </div>

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

        {allDone && <p className="result-final">{t('allDone', ui)} {t('allDoneSub', ui)}</p>}

        <div className="result-actions">
          {hasNext ? (
            <button className="btn btn-primary btn-wide" onClick={() => onNext((result.levelId ?? 1) + 1)}>
              <span>{t('nextWorld', ui)}</span>
              <IconArrowRight size={17} />
            </button>
          ) : (
            <button className="btn btn-primary btn-wide" onClick={onMap}>
              <IconMap size={17} />
              <span>{t('backToMap', ui)}</span>
            </button>
          )}
          <div className="result-secondary">
            <button className="btn btn-quiet" onClick={onRepeat}>
              <IconRepeat size={15} />
              <span>{t('repeat', ui)}</span>
            </button>
            <button className="btn btn-quiet" onClick={onMap}>
              <IconMap size={15} />
              <span>{t('backToMap', ui)}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
