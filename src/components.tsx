import { useMemo } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import type { Lang, Route } from './types';

type Mood = 'happy' | 'cheer' | 'think' | 'wave';

/** Luma, la mascotita: un pajarito dibujado a mano en SVG (sin assets externos). */
export function Mascot({ mood = 'happy', size = 120, className = '' }: { mood?: Mood; size?: number; className?: string }) {
  return (
    <svg
      className={`mascot mascot-${mood} ${className}`}
      width={size}
      height={size}
      viewBox="0 0 160 170"
      role="img"
      aria-label="Luma, la mascota"
    >
      <defs>
        <linearGradient id="lumaBody" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#6FE3D2" />
          <stop offset="100%" stopColor="#2BBBAE" />
        </linearGradient>
        <linearGradient id="lumaWing" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#3FC9BC" />
          <stop offset="100%" stopColor="#1F9E97" />
        </linearGradient>
      </defs>
      <ellipse cx="80" cy="158" rx="38" ry="7" fill="#2C3A57" opacity="0.10" />
      {/* patitas */}
      <path d="M62 143 L58 154 M58 154 l-7 3 M58 154 l7 3" stroke="#F2A03D" strokeWidth="4" strokeLinecap="round" fill="none" />
      <path d="M98 143 L102 154 M102 154 l-7 3 M102 154 l7 3" stroke="#F2A03D" strokeWidth="4" strokeLinecap="round" fill="none" />
      {/* cola */}
      <path d="M118 112 Q146 100 146 78 Q128 84 112 96 Z" fill="#2BB3A7" />
      {/* cuerpo */}
      <ellipse cx="80" cy="99" rx="47" ry="49" fill="url(#lumaBody)" />
      {/* barriguita */}
      <ellipse cx="77" cy="110" rx="31" ry="30" fill="#FFF4DE" opacity="0.95" />
      {/* ala */}
      <path className="mascot-wing" d="M38 88 Q20 104 34 124 Q48 130 54 112 Q50 96 38 88 Z" fill="url(#lumaWing)" />
      {/* copete */}
      <path d="M63 53 Q58 34 72 41 Q74 27 84 38 Q94 32 92 50 Z" fill="#2BBBAE" />
      {/* ojos */}
      {mood === 'cheer' ? (
        <>
          <path d="M60 84 q8 -10 16 0" stroke="#26415A" strokeWidth="4" strokeLinecap="round" fill="none" />
          <path d="M92 84 q8 -10 16 0" stroke="#26415A" strokeWidth="4" strokeLinecap="round" fill="none" />
        </>
      ) : (
        <>
          <circle className="mascot-eye" cx="68" cy="84" r="7.5" fill="#26415A" />
          <circle cx="70.5" cy="81.5" r="2.6" fill="#fff" />
          <circle className="mascot-eye" cx="100" cy="84" r="7.5" fill="#26415A" />
          <circle cx="102.5" cy="81.5" r="2.6" fill="#fff" />
        </>
      )}
      {/* pico */}
      <path d="M76 97 Q84 91 92 97 Q84 108 76 97 Z" fill="#FF9F43" />
      {/* mofletes */}
      <circle cx="53" cy="99" r="6" fill="#FF8FA3" opacity="0.55" />
      <circle cx="115" cy="99" r="6" fill="#FF8FA3" opacity="0.55" />
      {/* bufanda */}
      <path d="M53 128 Q80 141 108 128 L106 137 Q80 149 55 137 Z" fill="#7C6CF0" />
      <path d="M103 134 l13 15 l-12 3 l-6 -14 Z" fill="#6457DC" />
      {mood === 'cheer' && (
        <g className="mascot-sparkles" fill="#FFC93C">
          <path d="M20 48 l3 8 l8 3 l-8 3 l-3 8 l-3 -8 l-8 -3 l8 -3 Z" />
          <path d="M140 46 l2 6 l6 2 l-6 2 l-2 6 l-2 -6 l-6 -2 l6 -2 Z" />
          <path d="M132 118 l2 5 l5 2 l-5 2 l-2 5 l-2 -5 l-5 -2 l5 -2 Z" />
        </g>
      )}
      {mood === 'think' && <circle cx="128" cy="52" r="9" fill="#fff" stroke="#7C6CF0" strokeWidth="3" />}
    </svg>
  );
}

export function Confetti({ burstKey, count = 34 }: { burstKey: number; count?: number }) {
  const pieces = useMemo(() => {
    const colors = ['#FF8A5B', '#FFC93C', '#6C5CE7', '#2EC4B6', '#4D96FF', '#FF6FA5'];
    return Array.from({ length: count }, (_, i) => {
      const style: CSSProperties = {
        left: `${(i * 37 + Math.random() * 60) % 100}%`,
        animationDelay: `${Math.random() * 0.35}s`,
        animationDuration: `${1.5 + Math.random() * 1.2}s`,
        background: colors[i % colors.length],
        transform: `rotate(${Math.random() * 180}deg)`,
        borderRadius: i % 3 === 0 ? '50%' : '3px',
      };
      return style;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [burstKey, count]);
  return (
    <div className="confetti" aria-hidden="true" key={burstKey}>
      {pieces.map((style, i) => (
        <span key={i} style={style} />
      ))}
    </div>
  );
}

export function StarRow({ count, max = 3, size = 'md' }: { count: number; max?: number; size?: 'sm' | 'md' | 'lg' }) {
  return (
    <span className={`star-row star-row-${size}`} aria-label={`${count} / ${max}`}>
      {Array.from({ length: max }, (_, i) => (
        <span key={i} className={i < count ? 'star on' : 'star off'}>
          ★
        </span>
      ))}
    </span>
  );
}

export function LangChip({ lang }: { lang: Lang }) {
  return <span className={`lang-chip lang-${lang}`}>{lang === 'eu' ? 'EU · euskara' : 'ES · castellano'}</span>;
}

export function RoutePill({ route, label }: { route: Route; label: string }) {
  const icon = route === 'visual' ? '👁️' : route === 'auditivo' ? '🎧' : '🌈';
  return (
    <span className={`route-pill route-${route}`}>
      <span aria-hidden="true">{icon}</span> {label}
    </span>
  );
}

export function ProgressBar({ value, max = 100, tone = 'purple' }: { value: number; max?: number; tone?: 'purple' | 'mint' | 'sun' }) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div className={`progress-bar tone-${tone}`} role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max}>
      <div className="progress-fill" style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Modal({ children, onClose, labelledBy }: { children: ReactNode; onClose: () => void; labelledBy?: string }) {
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal-card" role="dialog" aria-modal="true" aria-labelledby={labelledBy} onMouseDown={(e) => e.stopPropagation()}>
        <button className="icon-btn modal-close" onClick={onClose} aria-label="✕">
          ✕
        </button>
        {children}
      </div>
    </div>
  );
}

export function Toast({ text }: { text: string }) {
  return (
    <div className="toast" role="status">
      <span aria-hidden="true">✨</span> {text}
    </div>
  );
}
