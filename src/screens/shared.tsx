import type { ReactNode } from 'react';
import { PatoMark } from '../components';
import { IconEye, IconHeadphones, IconLayers } from '../icons';
import { t } from '../i18n';
import { startAmbientMusic, stopAmbientMusic } from '../music';
import type { Route, UiLang } from '../types';

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
