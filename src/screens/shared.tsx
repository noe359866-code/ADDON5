import type { CSSProperties, ReactNode } from 'react';
import { PatoMark } from '../components';
import { IconCheck, IconEye, IconHeadphones, IconLayers } from '../icons';
import { t, tf } from '../i18n';
import { startAmbientMusic, stopAmbientMusic } from '../music';
import { STAGE_COLORS } from '../stages';
import type { StageColorKey } from '../stages';
import type { Route, SchoolStage, UiLang } from '../types';

export function syncMusic(enabled: boolean) {
  if (enabled) startAmbientMusic();
  else stopAmbientMusic();
}

export function Segmented<T extends string>({
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

export function RouteIcon({ route, size = 18 }: { route: Route; size?: number }) {
  if (route === 'visual') return <IconEye size={size} />;
  if (route === 'auditivo') return <IconHeadphones size={size} />;
  return <IconLayers size={size} />;
}

/**
 * Selector de nivel por color: sustituye a la lista de cursos escolares.
 * Cada nivel muestra color + nombre + emoji + forma geométrica para que la
 * información no dependa solo del color (WCAG 1.4.1).
 */
export function StageColorPicker({
  value,
  ui,
  onChange,
  compact = false,
  legend = true,
  ariaLabel,
}: {
  value: SchoolStage;
  ui: UiLang;
  onChange: (value: StageColorKey) => void;
  compact?: boolean;
  legend?: boolean;
  ariaLabel?: string;
}) {
  return (
    <div className="stage-colors-wrap">
      <div
        className={`stage-colors ${compact ? 'is-compact' : ''}`}
        role="radiogroup"
        aria-label={ariaLabel ?? t('stageColorsLabel', ui)}
      >
        {STAGE_COLORS.map((sc) => {
          const selected = value === sc.key;
          const style = {
            '--stage': sc.color,
            '--stage-lip': sc.lip,
            '--stage-soft': sc.soft,
            '--stage-ink': sc.ink,
          } as CSSProperties;
          return (
            <button
              key={sc.key}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={tf('stageColorAria', ui, { name: sc.name[ui], desc: sc.desc[ui] })}
              className={`stage-color ${selected ? 'selected' : ''} ${compact ? 'is-compact' : ''}`}
              style={style}
              onClick={() => onChange(sc.key)}
            >
              <span className="stage-color-dot" aria-hidden="true">
                <span className="stage-color-emoji">{sc.emoji}</span>
                <span className={`stage-color-shape shape-${sc.shape}`}>{sc.glyph}</span>
              </span>
              <span className="stage-color-copy">
                <strong>{sc.name[ui]}</strong>
                {!compact && <small>{sc.desc[ui]}</small>}
              </span>
              {selected && (
                <span className="stage-color-check" aria-hidden="true">
                  <IconCheck size={13} />
                </span>
              )}
            </button>
          );
        })}
      </div>
      {legend && <p className="stage-colors-legend">{t('stageLegend', ui)}</p>}
    </div>
  );
}
