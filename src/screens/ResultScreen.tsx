import { useEffect } from 'react';
import { computeAdaptations } from '../adaptations';
import { Confetti, Mascot, StarRow, prefersReducedMotion, staggerStyle, useCountUp } from '../components';
import { badgeById, levels } from '../data';
import { DuoFlameSvg, DuoGemSvg, DuoHeartSvg, IconArrowRight, IconAward, IconBolt, IconRepeat } from '../icons';
import { t, tf } from '../i18n';
import { getRecentWeekStats } from '../progress';
import { sfx } from '../sound';
import type { Progress, SessionResult } from '../types';

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
