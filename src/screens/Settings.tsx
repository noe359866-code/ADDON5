import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { computeAdaptations, supportSummary } from '../adaptations';
import { Modal } from '../components';
import { levels } from '../data';
import { IconAccessibility, IconBolt, IconBook, IconCheck, IconCompass, IconEye, IconGlobe, IconHeadphones, IconLayers, IconMusic, IconSchool, IconSettings, IconUser, IconVolume, IconVolumeOff } from '../icons';
import { t } from '../i18n';
import { downloadProgress, parseImportedProgress, readerLevel } from '../progress';
import { getMaiderState, setMaiderEnabled, subscribeMaider } from '../maider';
import type { DifficultyLevel, LearnLang, Progress, Route, SchoolStage, UiLang } from '../types';
import { syncMusic, Segmented } from './shared';

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
  const [maider, setMaider] = useState(getMaiderState);
  useEffect(() => subscribeMaider(setMaider), []);
  const importInputRef = useRef<HTMLInputElement>(null);
  const summary = supportSummary(computeAdaptations(progress), ui);
  const report = readerLevel(progress.xp);
  const worldsDone = levels.filter((l) => progress.completed[l.id]).length;
  const totalStars = levels.reduce((acc, l) => acc + (progress.stars[l.id] ?? 0), 0);

  function handleImportFile(file: File | undefined) {
    if (!file || !window.confirm(t('importConfirm', ui))) return;
    if (file.size > 1_000_000) { onToast(t('importError', ui)); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const imported = parseImportedProgress(String(reader.result ?? ''));
      if (imported) {
        setProgress(imported);
        onToast(t('importOk', ui));
      } else {
        onToast(t('importError', ui));
      }
    };
    reader.onerror = () => onToast(t('importError', ui));
    reader.readAsText(file);
  }

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
          <Toggle
            label={t('maiderLabel', ui)}
            checked={maider.enabled}
            onChange={setMaiderEnabled}
          />
          <p className="settings-hint">{t('maiderInfo', ui)}</p>
          {maider.enabled && (
            <div className="maider-status" role="status" aria-live="polite">
              {maider.status === 'loading' && <span>{t('maiderLoading', ui)} {maider.progress > 0 && `${maider.progress}%`}</span>}
              {maider.status === 'ready' && <span>{t('maiderReady', ui)}</span>}
              {maider.status === 'error' && <>
                <span>{t('maiderError', ui)}</span>
                <button className="duo-btn duo-btn-outline duo-btn-sm" onClick={() => setMaiderEnabled(true)}>{t('maiderRetry', ui)}</button>
              </>}
              {maider.status === 'ready' && <button className="duo-btn duo-btn-outline duo-btn-sm" onClick={() => { setMaiderEnabled(true); }}>{t('maiderTest', ui)}</button>}
            </div>
          )}
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
            label={t('unlimitedHeartsLabel', ui)}
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

        <div className="settings-group">
          <h3 className="settings-group-title">👨‍👩‍👧 {t('settingsGroupFamily', ui)}</h3>
          <div className="progress-report" aria-label={t('reportTitle', ui)}>
            <p className="report-title">📊 {t('reportTitle', ui)}</p>
            <dl className="report-grid">
              <div><dt>{t('reportName', ui)}</dt><dd>{progress.name || '—'}</dd></div>
              <div><dt>{t('reportLevel', ui)}</dt><dd>{report.level}</dd></div>
              <div><dt>{t('reportXp', ui)}</dt><dd>{progress.xp}</dd></div>
              <div><dt>{t('reportStreak', ui)}</dt><dd>{progress.streak} 🔥</dd></div>
              <div><dt>{t('reportWorlds', ui)}</dt><dd>{worldsDone}/{levels.length}</dd></div>
              <div><dt>{t('reportStars', ui)}</dt><dd>{totalStars} ⭐</dd></div>
              <div><dt>{t('reportSessions', ui)}</dt><dd>{progress.sessions}</dd></div>
            </dl>
            <p className="report-mistakes-title">{t('reportMistakes', ui)} ({progress.mistakes.length})</p>
            {progress.mistakes.length === 0 ? (
              <p className="settings-hint">{t('reportMistakesEmpty', ui)}</p>
            ) : (
              <ul className="report-mistakes">
                {progress.mistakes.slice(0, 8).map((m) => (
                  <li key={m.id}>
                    <span>{m.prompt}</span>
                    <strong>→ {m.answer}</strong>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="modal-actions family-actions">
            <button className="duo-btn duo-btn-outline" onClick={() => downloadProgress(progress)}>
              ⬇️ {t('exportProgress', ui)}
            </button>
            <button className="duo-btn duo-btn-outline" onClick={() => importInputRef.current?.click()}>
              ⬆️ {t('importProgress', ui)}
            </button>
            <input
              ref={importInputRef}
              type="file"
              accept="application/json,.json"
              className="sr-only-input"
              onChange={(e) => {
                handleImportFile(e.target.files?.[0]);
                e.target.value = '';
              }}
              aria-label={t('importProgress', ui)}
            />
          </div>
          <p className="settings-hint">🎙️ {t('micPrivacy', ui)}</p>
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
