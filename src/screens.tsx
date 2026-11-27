import { useState } from 'react';
import { adaptationsFor, computeAdaptations, supportProfiles, supportSummary } from './adaptations';
import { Confetti, Mascot, Modal, ProgressBar, StarRow } from './components';
import { badgeById, badges, bonusModes, levels } from './data';
import { t } from './i18n';
import { isUnlocked, nextLevel, readerLevel } from './progress';
import type { LearnLang, Progress, Route, SessionResult, SupportId, UiLang } from './types';

/* ------------------------------------------------------------------ */
/* Piezas pequeñas                                                     */
/* ------------------------------------------------------------------ */

function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string; icon?: string }[];
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
          {opt.icon && <span aria-hidden="true">{opt.icon}</span>}
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function Brand({ ui, compact = false }: { ui: UiLang; compact?: boolean }) {
  return (
    <div className={`brand ${compact ? 'brand-compact' : ''}`}>
      <span className="brand-mark" aria-hidden="true">
        🐦
      </span>
      <span className="brand-text">
        <strong>{t('appName', ui)}</strong>
        {!compact && <small>{t('appSub', ui)}</small>}
      </span>
    </div>
  );
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

  const langCards: { value: LearnLang; icon: string; title: string; desc: string }[] = [
    { value: 'es', icon: '📖', title: t('langEs', ui), desc: t('langEsDesc', ui) },
    { value: 'eu', icon: '🐦', title: t('langEu', ui), desc: t('langEuDesc', ui) },
    { value: 'both', icon: '🌈', title: t('langBoth', ui), desc: t('langBothDesc', ui) },
  ];
  const routeCards: { value: Route; icon: string; title: string; desc: string }[] = [
    { value: 'visual', icon: '👁️', title: t('routeVisual', ui), desc: t('routeVisualDesc', ui) },
    { value: 'auditivo', icon: '🎧', title: t('routeAuditivo', ui), desc: t('routeAuditivoDesc', ui) },
    { value: 'mixta', icon: '🌈', title: t('routeMixta', ui), desc: t('routeMixtaDesc', ui) },
  ];

  return (
    <div className="onboarding">
      <div className="blob blob-a" aria-hidden="true" />
      <div className="blob blob-b" aria-hidden="true" />
      <div className="blob blob-c" aria-hidden="true" />
      <div className="onb-top">
        <Brand ui={ui} />
        <div className="lang-switch">
          <button className={ui === 'es' ? 'on' : ''} onClick={() => setUi('es')}>
            ES
          </button>
          <button className={ui === 'eu' ? 'on' : ''} onClick={() => setUi('eu')}>
            EU
          </button>
        </div>
      </div>

      <div className="onb-card">
        <div className="onb-hero">
          <Mascot mood={step === 0 ? 'wave' : 'happy'} size={150} />
          <div className="speech-bubble">
            <strong>{t('welcomeKicker', ui)}</strong>
            <span>{t('welcomeSub', ui)}</span>
          </div>
        </div>

        <div className="onb-steps" aria-hidden="true">
          {[0, 1, 2].map((n) => (
            <i key={n} className={step === n ? 'on' : ''} />
          ))}
        </div>

        {step === 0 ? (
          <>
            <h1>{t('step1Title', ui)}</h1>
            <p className="onb-sub">{t('step1Sub', ui)}</p>
            <label className="name-field">
              <span>{t('nameLabel', ui)}</span>
              <input
                value={name}
                maxLength={18}
                placeholder={t('namePlaceholder', ui)}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <div className="choice-grid">
              {langCards.map((card) => (
                <button
                  key={card.value}
                  className={`choice-card ${learnLang === card.value ? 'selected' : ''}`}
                  onClick={() => setLearnLang(card.value)}
                >
                  <span className="choice-icon">{card.icon}</span>
                  <strong>{card.title}</strong>
                  <small>{card.desc}</small>
                  {learnLang === card.value && <span className="choice-check">✓</span>}
                </button>
              ))}
            </div>
            <div className="onb-actions">
              <button className="btn btn-primary btn-wide" onClick={() => setStep(1)}>
                {t('next', ui)} →
              </button>
            </div>
          </>
        ) : step === 1 ? (
          <>
            <h1>{t('step2Title', ui)}</h1>
            <p className="onb-sub">{t('step2Sub', ui)}</p>
            <div className="choice-grid">
              {routeCards.map((card) => (
                <button
                  key={card.value}
                  className={`choice-card route-${card.value} ${route === card.value ? 'selected' : ''}`}
                  onClick={() => setRoute(card.value)}
                >
                  <span className="choice-icon">{card.icon}</span>
                  <strong>{card.title}</strong>
                  <small>{card.desc}</small>
                  {route === card.value && <span className="choice-check">✓</span>}
                </button>
              ))}
            </div>
            <p className="onb-note">💡 {t('routeExplanation', ui)}</p>
            <div className="onb-actions">
              <button className="btn btn-quiet" onClick={() => setStep(0)}>
                ← {t('back', ui)}
              </button>
              <button className="btn btn-primary" onClick={() => setStep(2)}>
                {t('next', ui)} →
              </button>
            </div>
          </>
        ) : (
          <>
            <h1>{t('step3Title', ui)}</h1>
            <p className="onb-sub">{t('step3Sub', ui)}</p>
            <div className="support-grid">
              {supportProfiles.map((profile) => (
                <button
                  key={profile.id}
                  className={`support-card ${supports.includes(profile.id) ? 'selected' : ''}`}
                  onClick={() => toggleSupport(profile.id)}
                  aria-pressed={supports.includes(profile.id)}
                >
                  <span className="support-emoji">{profile.emoji}</span>
                  <strong>{profile[ui].name}</strong>
                  <small>{profile[ui].desc}</small>
                  {supports.includes(profile.id) && <span className="choice-check">✓</span>}
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
            <p className="onb-note">💡 {t('supportsHint', ui)}</p>
            <div className="onb-actions">
              <button className="btn btn-quiet" onClick={() => setStep(1)}>
                ← {t('back', ui)}
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
                {t('letsGo', ui)} 🚀
              </button>
            </div>
            <button className="support-skip" onClick={() => onDone({ onboarded: true, name: name.trim() || 'Amigo', learnLang, route, uiLang: ui, supports: [], calmMode: false })}>
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
/* Pantalla principal / mapa                                           */
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

  const setRoute = (route: Route) => {
    setProgress({ route });
    onToast(t('routeChanged', ui));
  };

  const routeKey = (r: Route) => (r === 'visual' ? 'routeVisual' : r === 'auditivo' ? 'routeAuditivo' : 'routeMixta');

  return (
    <div className="home">
      <header className="home-header">
        <Brand ui={ui} />
        <div className="home-controls">
          <div className="lang-switch">
            <button className={ui === 'es' ? 'on' : ''} onClick={() => setProgress({ uiLang: 'es' })}>
              ES
            </button>
            <button className={ui === 'eu' ? 'on' : ''} onClick={() => setProgress({ uiLang: 'eu' })}>
              EU
            </button>
          </div>
          <button
            className="icon-btn"
            onClick={() => setProgress({ sound: !progress.sound })}
            aria-label={t('sound', ui)}
            title={t('sound', ui)}
          >
            {progress.sound ? '🔊' : '🔇'}
          </button>
          <button className="icon-btn" onClick={onSettings} aria-label={t('settings', ui)} title={t('settings', ui)}>
            ⚙️
          </button>
        </div>
      </header>

      <section className="hero-card">
        <div className="hero-left">
          <Mascot mood="happy" size={126} />
          <div className="hero-greeting">
            <span className="hero-kicker">🐦 {t('hello', ui)}, {name}!</span>
            <h1>{t('greetingSub', ui)}</h1>
            <p className="hero-world">
              {t('currentLevel', ui)}: <strong>{currentDef[ui].title}</strong> {currentDef.emoji}
            </p>
            <button className="btn btn-primary btn-lg" onClick={() => onStart(current)}>
              ▶ {t('continueAdventure', ui)}
            </button>
          </div>
        </div>
        <div className="hero-stats">
          <div className="stat-line">
            <span>⚡ {t('readerLevel', ui)} {levelInfo.level}</span>
            <span>{levelInfo.into} / 120 {t('xp', ui)}</span>
          </div>
          <ProgressBar value={levelInfo.into} max={120} tone="purple" />
          <div className="stat-chips">
            <span className="stat-chip">⭐ {Object.values(progress.stars).reduce((a, b) => a + b, 0)} {t('stars', ui)}</span>
            <span className="stat-chip">🔥 {progress.streak} {t('days', ui)}</span>
            <span className="stat-chip">🏅 {progress.badges.length}</span>
          </div>
        </div>
      </section>

      <section className="route-section">
        <div className="section-head">
          <h2>{t('routeLabel', ui)}</h2>
          <p>{t('routeExplanation', ui)}</p>
        </div>
        <div className="route-cards">
          {(['visual', 'auditivo', 'mixta'] as Route[]).map((r) => (
            <button
              key={r}
              className={`route-card route-${r} ${progress.route === r ? 'selected' : ''}`}
              onClick={() => setRoute(r)}
            >
              <span className="route-icon">{r === 'visual' ? '👁️' : r === 'auditivo' ? '🎧' : '🌈'}</span>
              <strong>{t(routeKey(r), ui)}</strong>
              <small>{r === 'visual' ? t('routeVisualDesc', ui) : r === 'auditivo' ? t('routeAuditivoDesc', ui) : t('routeMixtaDesc', ui)}</small>
            </button>
          ))}
        </div>
        <div className="learn-lang-row">
          <span>{t('learningLabel', ui)}:</span>
          <Segmented<LearnLang>
            value={progress.learnLang}
            options={[
              { value: 'es', label: t('langEs', ui), icon: '📖' },
              { value: 'eu', label: t('langEu', ui), icon: '🐦' },
              { value: 'both', label: t('langBoth', ui), icon: '🌈' },
            ]}
            onChange={(value) => setProgress({ learnLang: value })}
          />
        </div>
      </section>

      {ad.active.length > 0 && (
        <section className="support-active-card">
          <strong>🧩 {t('supportsActive', ui)}</strong>
          <div className="support-summary">
            {supportLabels.map((label) => (
              <span key={label}>{label}</span>
            ))}
          </div>
          <button className="btn btn-tiny" onClick={onSettings}>
            ⚙️ {t('settings', ui)}
          </button>
        </section>
      )}

      <section className="map-section">
        <div className="section-head">
          <h2>🗺️ {t('mapTitle', ui)}</h2>
          <p>{t('mapSubtitle', ui)}</p>
        </div>
        {progress.unlockAll && <p className="demo-banner">🧪 {t('demoNote', ui)}</p>}
        <div className="map-path">
          {levels.map((level, i) => {
            const locked = !isUnlocked(progress, level.id);
            const stars = progress.stars[level.id] ?? 0;
            const done = !!progress.completed[level.id];
            return (
              <button
                key={level.id}
                className={`level-card theme-${level.theme} ${i % 2 ? 'offset-right' : 'offset-left'} ${locked ? 'locked' : ''} ${current === level.id ? 'is-current' : ''}`}
                onClick={() => (locked ? onToast(t('lockedHint', ui)) : onStart(level.id))}
              >
                <span className="level-bubble">{locked ? '🔒' : level.emoji}</span>
                <span className="level-body">
                  <span className="level-num">
                    {t('worldOf', ui)} {level.id} {done && <span className="done-tag">✓ {t('completedLabel', ui)}</span>}
                  </span>
                  <strong>{level[ui].title}</strong>
                  <small>{locked ? t('locked', ui) : level[ui].sub}</small>
                  <StarRow count={stars} size="sm" />
                </span>
                <span className="level-go">{locked ? '·' : done ? '↻' : '▶'}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="bonus-section">
        <div className="section-head">
          <h2>🎠 {t('bonusTitle', ui)}</h2>
          <p>{t('bonusSub', ui)}</p>
        </div>
        <div className="bonus-grid">
          {bonusModes.map((mode) => (
            <button key={mode.id} className={`bonus-card theme-${mode.theme}`} onClick={() => onStart(mode.id)}>
              <span className="bonus-emoji" aria-hidden="true">{mode.emoji}</span>
              <span className="bonus-body">
                <strong>{mode[ui].title}</strong>
                <small>{mode[ui].sub}</small>
                <em>🔓 {t('bonusFree', ui)}</em>
              </span>
              <span className="bonus-go">{t('playBonus', ui)} ▶</span>
            </button>
          ))}
        </div>
      </section>

      <section className="practice-section">
        <div className="practice-card">
          <span className="practice-emoji" aria-hidden="true">
            🎲
          </span>
          <div>
            <h3>{t('practiceTitle', ui)}</h3>
            <p>{t('practiceDesc', ui)}</p>
          </div>
          <button className="btn btn-secondary" onClick={() => onStart(null)}>
            {t('practiceTitle', ui)} →
          </button>
        </div>
      </section>

      <section className="badges-section">
        <div className="section-head">
          <h2>🏅 {t('badgesTitle', ui)}</h2>
          <p>{progress.badges.length ? `${progress.badges.length} / ${badges.length}` : t('badgesEmpty', ui)}</p>
        </div>
        <div className="badge-shelf">
          {badges.map((b) => {
            const owned = progress.badges.includes(b.id);
            return (
              <div key={b.id} className={`badge-item ${owned ? 'owned' : ''}`} title={`${b[ui].name} · ${b[ui].desc}`}>
                <span>{owned ? b.emoji : '❔'}</span>
                <small>{owned ? b[ui].name : '???'}</small>
              </div>
            );
          })}
        </div>
      </section>

      <footer className="home-footer">
        <Brand ui={ui} compact />
        <span>{t('tagline', ui)}</span>
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

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="toggle-row">
      <span>{label}</span>
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
        <h2 id="settings-title">⚙️ {t('optionsTitle', ui)}</h2>

        <label className="settings-field">
          <span>👤 {t('profileName', ui)}</span>
          <input value={progress.name} maxLength={18} onChange={(e) => setProgress({ name: e.target.value })} />
        </label>

        <div className="settings-field">
          <span>🌐 {t('appLangLabel', ui)}</span>
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
          <span>📚 {t('learningLabel', ui)}</span>
          <Segmented<LearnLang>
            value={progress.learnLang}
            options={[
              { value: 'es', label: t('langEs', ui), icon: '📖' },
              { value: 'eu', label: t('langEu', ui), icon: '🐦' },
              { value: 'both', label: t('langBoth', ui), icon: '🌈' },
            ]}
            onChange={(value) => setProgress({ learnLang: value })}
          />
        </div>

        <div className="settings-field">
          <span>🧭 {t('routeLabel', ui)}</span>
          <Segmented<Route>
            value={progress.route}
            options={[
              { value: 'visual', label: t('routeVisual', ui), icon: '👁️' },
              { value: 'auditivo', label: t('routeAuditivo', ui), icon: '🎧' },
              { value: 'mixta', label: t('routeMixta', ui), icon: '🌈' },
            ]}
            onChange={(value) => {
              setProgress({ route: value });
              onToast(t('routeChanged', ui));
            }}
          />
          <p className="settings-hint">{t('routeExplanation', ui)}</p>
        </div>

        <div className="settings-field">
          <span>🧩 {t('supportsTitle', ui)}</span>
          <div className="support-grid support-grid-settings">
            {supportProfiles.map((profile) => (
              <button
                key={profile.id}
                className={`support-card compact ${activeSupports.includes(profile.id) ? 'selected' : ''}`}
                onClick={() => toggleSupport(profile.id)}
                aria-pressed={activeSupports.includes(profile.id)}
                title={profile[ui].desc}
              >
                <span className="support-emoji">{profile.emoji}</span>
                <strong>{profile[ui].name}</strong>
                {activeSupports.includes(profile.id) && <span className="choice-check">✓</span>}
              </button>
            ))}
          </div>
          <p className="settings-hint">{t('supportsHint', ui)}</p>
          <div className="support-summary">
            {summary.length ? summary.map((s) => <span key={s}>{s}</span>) : <span>{t('supportsNone', ui)}</span>}
          </div>
        </div>

        <Toggle label={`🔊 ${t('sound', ui)}`} checked={progress.sound} onChange={(v) => setProgress({ sound: v })} />
        <Toggle label={`🌿 ${t('calmModeLabel', ui)}`} checked={progress.calmMode} onChange={(v) => setProgress({ calmMode: v })} />
        <Toggle label={`🔠 ${t('bigText', ui)}`} checked={progress.bigText} onChange={(v) => setProgress({ bigText: v })} />
        <Toggle label={`🧪 ${t('unlockAll', ui)}`} checked={progress.unlockAll} onChange={(v) => setProgress({ unlockAll: v })} />

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
  return (
    <div className="result-screen">
      {!calm && <Confetti burstKey={1} count={50} />}
      <div className="result-card">
        <Mascot mood="cheer" size={140} />
        <h1>{result.mode === 'practice' ? t('levelCompleted', ui) : t('resultTitle', ui)}</h1>
        <p className="result-sub">{result.perfect ? t('resultPerfect', ui) : t('resultSub', ui)}</p>

        {result.mode === 'level' && (
          <div className="result-stars">
            <StarRow count={result.stars} size="lg" />
          </div>
        )}

        <div className="result-stats">
          <div>
            <strong>{result.correct}/{result.total}</strong>
            <span>{t('accuracy', ui)}</span>
          </div>
          <div>
            <strong>+{result.xp}</strong>
            <span>{t('xpEarned', ui)}</span>
          </div>
          <div>
            <strong>{result.maxStreak}</strong>
            <span>🔥 {t('streak', ui)}</span>
          </div>
        </div>

        {newBadges.length > 0 && (
          <div className="result-badges">
            <strong>🏅 {t('newBadge', ui)}</strong>
            <div>
              {newBadges.map((id) => {
                const b = badgeById[id];
                return b ? (
                  <span key={id} className="earned-badge">
                    {b.emoji} {b[ui].name}
                  </span>
                ) : null;
              })}
            </div>
          </div>
        )}

        {allDone && <p className="result-final">🏆 {t('allDone', ui)} {t('allDoneSub', ui)}</p>}

        <div className="result-actions">
          {hasNext ? (
            <button className="btn btn-primary btn-wide" onClick={() => onNext((result.levelId ?? 1) + 1)}>
              {t('nextWorld', ui)} 🚀
            </button>
          ) : (
            <button className="btn btn-primary btn-wide" onClick={onMap}>
              {t('backToMap', ui)} 🗺️
            </button>
          )}
          <div className="result-secondary">
            <button className="btn btn-quiet" onClick={onRepeat}>
              ↻ {t('repeat', ui)}
            </button>
            <button className="btn btn-quiet" onClick={onMap}>
              🗺️ {t('backToMap', ui)}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

