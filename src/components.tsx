import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { IconBolt, IconCheck, IconClose, IconEye, IconFlame, IconHeadphones, IconLayers, IconSparkles, IconStar } from './icons';
import { sfx } from './sound';
import type { Lang, OutfitId, Route } from './types';

export type Mood = 'happy' | 'cheer' | 'think' | 'wave' | 'sad' | 'excited';

/** Variable CSS reutilizable para entradas escalonadas (evita casts repetidos). */
export function staggerStyle(index: number): CSSProperties {
  return { '--i': index } as CSSProperties;
}

/** Encabezado editorial y consistente para las secciones del panel educativo. */
export function SectionHead({
  index,
  title,
  sub,
  icon,
  meta,
}: {
  index?: string;
  title: ReactNode;
  sub?: string;
  icon?: ReactNode;
  meta?: ReactNode;
}) {
  return (
    <div className="section-head">
      <div className="section-head-main">
        {icon ? (
          <span className="section-icon" aria-hidden="true">{icon}</span>
        ) : index ? (
          <span className="section-index" aria-hidden="true">{index}</span>
        ) : null}
        <div className="section-head-text">
          <h2>{title}</h2>
          {sub && <p>{sub}</p>}
        </div>
      </div>
      {meta && <div className="section-meta">{meta}</div>}
    </div>
  );
}

/** Indicador visual de pasos numerados para el onboarding educativo. */
export function StepProgress({ current, total, label }: { current: number; total: number; label: string }) {
  return (
    <div className="step-progress-wrap">
      <div className="step-progress-head">
        <span className="step-progress-label">{label}</span>
        <span className="step-progress-count">{current} / {total}</span>
      </div>
      <div
        className="stepper"
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={total}
        aria-valuenow={current}
        aria-valuetext={label}
      >
        {Array.from({ length: total }, (_, idx) => {
          const stepNum = idx + 1;
          const done = stepNum < current;
          const active = stepNum === current;
          return (
            <div key={stepNum} className={`stepper-item ${done ? 'is-done' : active ? 'is-active' : ''}`}>
              <span className="stepper-dot" aria-hidden="true">
                {done ? <IconCheck size={13} /> : stepNum}
              </span>
              {stepNum < total && <span className={`stepper-line ${done ? 'is-done' : ''}`} aria-hidden="true" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Progreso segmentado por pregunta para la barra de estudio en clase. */
export function SessionProgress({ current, total }: { current: number; total: number }) {
  return (
    <div
      className="session-segments"
      role="progressbar"
      aria-valuenow={current}
      aria-valuemin={0}
      aria-valuemax={total}
    >
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={`session-seg ${i < current ? 'is-done' : i === current ? 'is-current' : ''}`}
        />
      ))}
    </div>
  );
}

/** Insignia compacta de Pato Ventura para cabecera y pie de página. */
export function PatoMark({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <path d="M29 14 C25 5, 32 3, 34 10 C36 4, 43 6, 38 14 Z" fill="#FFB800" />
      <path
        d="M32 12 C46 12, 52 21, 51 34 C51 47, 44 55, 32 55 C20 55, 13 47, 13 34 C12 21, 18 12, 32 12 Z"
        fill="#FFD93D"
      />
      <ellipse cx="26" cy="20" rx="8" ry="3.5" transform="rotate(-14 26 20)" fill="#FFF2A6" opacity="0.7" />
      <path d="M14 44 Q32 52 50 44 L49 51 Q32 58 15 51 Z" fill="#2EC4B6" />
      <path d="M23 48 Q32 53 41 48 L32 59 Z" fill="#1FA397" />
      <ellipse cx="23.5" cy="29" rx="6.2" ry="7.2" fill="#FFFFFF" />
      <ellipse cx="40.5" cy="29" rx="6.2" ry="7.2" fill="#FFFFFF" />
      <ellipse cx="24.5" cy="29.5" rx="3.4" ry="4.2" fill="#1E293B" />
      <ellipse cx="39.5" cy="29.5" rx="3.4" ry="4.2" fill="#1E293B" />
      <circle cx="26" cy="27.5" r="1.4" fill="#FFFFFF" />
      <circle cx="41" cy="27.5" r="1.4" fill="#FFFFFF" />
      <ellipse cx="16.5" cy="35.5" rx="3.2" ry="2" fill="#FF7B9C" opacity="0.5" />
      <ellipse cx="47.5" cy="35.5" rx="3.2" ry="2" fill="#FF7B9C" opacity="0.5" />
      <path d="M21 37 C21 32, 43 32, 43 37 C43 42, 38 44.5, 32 44.5 C26 44.5, 21 42, 21 37 Z" fill="#FF922B" />
      <path d="M24 38.5 Q32 42.5 40 38.5" stroke="#D9480F" strokeWidth="1.8" strokeLinecap="round" fill="none" />
    </svg>
  );
}

/** Pato Ventura: mascota estilo Duolingo dibujada en SVG vectorial (con trajes equipables). */
export function Mascot({
  mood = 'happy',
  size = 120,
  className = '',
  interactive = false,
  sound = true,
  outfit = 'classic',
}: {
  mood?: Mood;
  size?: number;
  className?: string;
  interactive?: boolean;
  sound?: boolean;
  outfit?: OutfitId;
}) {
  const uid = useId().replace(/:/g, '');
  const bodyId = `${uid}-body`;
  const wingId = `${uid}-wing`;
  const billId = `${uid}-bill`;
  const scarfId = `${uid}-scarf`;
  const [quacking, setQuacking] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    },
    [],
  );

  function handlePoke() {
    if (!interactive) return;
    sfx('quack', sound);
    setQuacking(true);
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      setQuacking(false);
    }, 520);
  }

  const celebrating = mood === 'cheer' || mood === 'excited';
  const openBill = celebrating || quacking;

  const svg = (
    <svg
      className={`mascot mascot-${mood} ${quacking ? 'mascot-boing' : ''} ${className}`}
      width={size}
      height={size}
      viewBox="0 0 180 190"
      role={interactive ? undefined : 'img'}
      aria-hidden={interactive || undefined}
      aria-label={interactive ? undefined : 'Pato Ventura'}
    >
      <defs>
        <linearGradient id={bodyId} x1="0" y1="0" x2="0.2" y2="1">
          <stop offset="0%" stopColor="#FFE45E" />
          <stop offset="55%" stopColor="#FFD230" />
          <stop offset="100%" stopColor="#FFB800" />
        </linearGradient>
        <linearGradient id={wingId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FFD43B" />
          <stop offset="100%" stopColor="#F5A600" />
        </linearGradient>
        <linearGradient id={billId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFA94D" />
          <stop offset="100%" stopColor="#F76707" />
        </linearGradient>
        <linearGradient id={scarfId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#38D9C0" />
          <stop offset="100%" stopColor="#1CA89C" />
        </linearGradient>
      </defs>

      {/* sombra suave en el suelo */}
      <ellipse className="mascot-shadow" cx="90" cy="176" rx="44" ry="8" fill="#2C3A57" opacity="0.12" />

      {/* Capa Super Pato detrás del cuerpo */}
      {outfit === 'super' && (
        <path
          d="M44 104 C20 128, 22 162, 42 170 Q90 158 138 170 C158 162, 160 128, 136 104 Z"
          fill="#CE82FF"
          stroke="#A568CC"
          strokeWidth="3"
        />
      )}

      <g className="mascot-body">
        {/* patitas palmeadas de pato */}
        <g className="mascot-feet">
          <path
            d="M55 164 Q50 175 63 175 Q69 172 75 175 Q83 174 79 164 L75 151 L63 151 Z"
            fill="#FF922B"
          />
          <path d="M56 171 Q67 176 79 171" stroke="#E8590C" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          <path
            d="M101 164 Q97 174 105 175 Q111 172 117 175 Q130 175 125 164 L117 151 L105 151 Z"
            fill="#FF922B"
          />
          <path d="M101 171 Q113 176 124 171" stroke="#E8590C" strokeWidth="2.5" strokeLinecap="round" fill="none" />
        </g>

        {/* colita de pato */}
        <path
          className="mascot-tail"
          d="M132 126 Q160 116 155 98 Q143 106 135 104 Q146 93 139 87 Q127 98 122 114 Z"
          fill="#F5B200"
        />

        {/* ala izquierda */}
        {celebrating ? (
          <path
            className="mascot-wing mascot-wing-left"
            d="M46 106 C19 92, 13 66, 29 58 C42 52, 53 74, 53 100 Z"
            fill={`url(#${wingId})`}
          />
        ) : (
          <path
            className="mascot-wing mascot-wing-left"
            d="M45 100 C22 109, 20 135, 37 143 C48 148, 56 134, 52 115 Z"
            fill={`url(#${wingId})`}
          />
        )}

        {/* ala derecha */}
        {celebrating || mood === 'wave' || quacking ? (
          <path
            className="mascot-wing mascot-wing-right"
            d="M134 106 C161 92, 167 66, 151 58 C138 52, 127 74, 127 100 Z"
            fill={`url(#${wingId})`}
          />
        ) : mood === 'think' ? (
          <path
            className="mascot-wing mascot-wing-right"
            d="M134 114 C150 105, 148 86, 131 85 C120 85, 117 98, 124 110 Z"
            fill={`url(#${wingId})`}
          />
        ) : (
          <path
            className="mascot-wing mascot-wing-right"
            d="M135 100 C158 109, 160 135, 143 143 C132 148, 124 134, 128 115 Z"
            fill={`url(#${wingId})`}
          />
        )}

        {/* penacho alegre arriba de la cabeza */}
        <path
          className="mascot-tuft"
          d="M83 28 C75 11, 88 4, 93 19 C98 5, 113 10, 103 27 C110 19, 118 25, 107 32 Z"
          fill="#FFC517"
        />

        {/* silueta principal redondeada estilo Duolingo */}
        <path
          d="M90 24 C121 24, 137 44, 135 72 C134 89, 145 107, 143 129 C141 153, 119 164, 90 164 C61 164, 39 153, 37 129 C35 107, 46 89, 45 72 C43 44, 59 24, 90 24 Z"
          fill={`url(#${bodyId})`}
        />

        {/* brillo cel-shading en la cabeza */}
        <ellipse cx="73" cy="39" rx="22" ry="8.5" transform="rotate(-14 73 39)" fill="#FFF4B5" opacity="0.7" />

        {/* barriguita clara */}
        <ellipse cx="90" cy="135" rx="34" ry="23" fill="#FFF7CE" opacity="0.92" />

        {/* pañuelo aventurero de Pato Ventura */}
        <g className="mascot-scarf">
          {/* colita del nudo */}
          <path d="M133 102 Q151 107 156 121 Q143 122 131 110 Z" fill="#2EC4B6" />
          <path d="M133 106 Q146 116 144 127 Q135 123 129 112 Z" fill="#1FA397" />
          {/* cinta alrededor del cuello */}
          <path d="M46 97 Q90 113 134 97 L137 107 Q90 124 43 107 Z" fill={`url(#${scarfId})`} />
          {/* triángulo frontal */}
          <path d="M62 106 Q90 118 118 106 L90 135 Z" fill="#25B5A8" />
          <path d="M65 107 L90 132 L115 107" stroke="#188C82" strokeWidth="2" strokeLinejoin="round" fill="none" opacity="0.55" />
          {/* nudo lateral */}
          <circle cx="133" cy="104" r="6.5" fill="#1BA397" />
          {/* estrellita brújula de aventurero */}
          <path
            d="M90 111.5 L92 116 L96.8 116.7 L93.3 120 L94.2 124.7 L90 122.4 L85.8 124.7 L86.7 120 L83.2 116.7 L88 116 Z"
            fill="#FFE066"
          />
        </g>

        {/* ojos gigantes estilo Duolingo */}
        {mood === 'cheer' ? (
          <g className="mascot-eyes">
            <path d="M55 64 Q69 47 83 64" stroke="#1E293B" strokeWidth="5.2" strokeLinecap="round" fill="none" />
            <path d="M97 64 Q111 47 125 64" stroke="#1E293B" strokeWidth="5.2" strokeLinecap="round" fill="none" />
            <path d="M58 46 Q69 40 79 45" stroke="#D99B00" strokeWidth="3.2" strokeLinecap="round" fill="none" />
            <path d="M101 45 Q111 40 122 46" stroke="#D99B00" strokeWidth="3.2" strokeLinecap="round" fill="none" />
          </g>
        ) : mood === 'sad' ? (
          <g className="mascot-eyes">
            <ellipse cx="69" cy="64" rx="14" ry="15.5" fill="#FFFFFF" />
            <ellipse cx="111" cy="64" rx="14" ry="15.5" fill="#FFFFFF" />
            <ellipse cx="70" cy="68" rx="7.5" ry="8.5" fill="#1E293B" />
            <ellipse cx="110" cy="68" rx="7.5" ry="8.5" fill="#1E293B" />
            <circle cx="73" cy="64" r="3" fill="#FFFFFF" />
            <circle cx="113" cy="64" r="3" fill="#FFFFFF" />
            {/* cejas empáticas */}
            <path d="M55 51 Q66 47 78 44" stroke="#C98A00" strokeWidth="3.5" strokeLinecap="round" fill="none" />
            <path d="M125 51 Q114 47 102 44" stroke="#C98A00" strokeWidth="3.5" strokeLinecap="round" fill="none" />
            {/* lagrimita suave */}
            <path className="mascot-tear" d="M56 76 Q52 84 56 87 Q60 84 56 76 Z" fill="#74C0FC" />
          </g>
        ) : mood === 'think' ? (
          <g className="mascot-eyes">
            <ellipse cx="69" cy="62" rx="14.5" ry="16" fill="#FFFFFF" />
            <ellipse cx="111" cy="62" rx="14.5" ry="16" fill="#FFFFFF" />
            <ellipse cx="74" cy="57" rx="7.8" ry="9" fill="#1E293B" />
            <ellipse cx="116" cy="57" rx="7.8" ry="9" fill="#1E293B" />
            <circle cx="77" cy="53.5" r="3" fill="#FFFFFF" />
            <circle cx="119" cy="53.5" r="3" fill="#FFFFFF" />
            <path d="M56 44 Q69 42 81 45" stroke="#C98A00" strokeWidth="3.4" strokeLinecap="round" fill="none" />
            <path d="M99 42 Q112 35 124 41" stroke="#C98A00" strokeWidth="3.4" strokeLinecap="round" fill="none" />
          </g>
        ) : (
          <g className="mascot-eyes">
            <g className="mascot-eye">
              <ellipse cx="69" cy="62" rx="14.5" ry="16.5" fill="#FFFFFF" />
              <ellipse cx="71" cy="63" rx="8.2" ry="9.8" fill="#1E293B" />
              {mood === 'excited' ? (
                <path
                  d="M73.5 55.5 L74.9 59 L78.5 59.5 L75.8 61.8 L76.5 65.3 L73.5 63.5 L70.5 65.3 L71.2 61.8 L68.5 59.5 L72.1 59 Z"
                  fill="#FFE066"
                />
              ) : (
                <>
                  <circle cx="74.5" cy="58.5" r="3.4" fill="#FFFFFF" />
                  <circle cx="67.5" cy="68.5" r="1.6" fill="#FFFFFF" />
                </>
              )}
            </g>
            <g className="mascot-eye">
              <ellipse cx="111" cy="62" rx="14.5" ry="16.5" fill="#FFFFFF" />
              <ellipse cx="109" cy="63" rx="8.2" ry="9.8" fill="#1E293B" />
              {mood === 'excited' ? (
                <path
                  d="M111.5 55.5 L112.9 59 L116.5 59.5 L113.8 61.8 L114.5 65.3 L111.5 63.5 L108.5 65.3 L109.2 61.8 L106.5 59.5 L110.1 59 Z"
                  fill="#FFE066"
                />
              ) : (
                <>
                  <circle cx="112.5" cy="58.5" r="3.4" fill="#FFFFFF" />
                  <circle cx="105.5" cy="68.5" r="1.6" fill="#FFFFFF" />
                </>
              )}
            </g>
            <path d="M57 44 Q69 38 80 43" stroke="#D99B00" strokeWidth="3.2" strokeLinecap="round" fill="none" />
            <path d="M100 43 Q111 38 123 44" stroke="#D99B00" strokeWidth="3.2" strokeLinecap="round" fill="none" />
          </g>
        )}

        {/* mofletes rosados */}
        <ellipse cx="50" cy="78" rx="8.5" ry="5" fill="#FF7B9C" opacity={celebrating ? 0.62 : 0.45} />
        <ellipse cx="130" cy="78" rx="8.5" ry="5" fill="#FF7B9C" opacity={celebrating ? 0.62 : 0.45} />

        {/* pico ancho y expresivo de pato */}
        {openBill ? (
          <g className="mascot-bill">
            {/* boca abierta feliz / ¡cuac! */}
            <path d="M71 83 Q90 103 109 83 Z" fill="#C92A2A" />
            <ellipse cx="90" cy="91.5" rx="9" ry="4.5" fill="#FF8787" />
            <path d="M70 83 Q90 104 110 83" stroke="#F76707" strokeWidth="3.5" strokeLinecap="round" fill="none" />
            {/* pico superior */}
            <path
              d="M64 79 C64 68, 116 68, 116 79 C116 85.5, 103 88, 90 88 C77 88, 64 85.5, 64 79 Z"
              fill={`url(#${billId})`}
            />
            <ellipse cx="83" cy="74.5" rx="9" ry="2.6" fill="#FFD09B" opacity="0.55" />
            <circle cx="83" cy="76.5" r="1.6" fill="#C84B0A" opacity="0.65" />
            <circle cx="97" cy="76.5" r="1.6" fill="#C84B0A" opacity="0.65" />
          </g>
        ) : (
          <g className="mascot-bill">
            <path
              d="M65 80 C65 69, 115 69, 115 80 C115 89.5, 103 94, 90 94 C77 94, 65 89.5, 65 80 Z"
              fill={`url(#${billId})`}
            />
            <ellipse cx="83" cy="75.5" rx="9.5" ry="2.6" fill="#FFD09B" opacity="0.55" />
            <circle cx="83.5" cy="77" r="1.6" fill="#C84B0A" opacity="0.6" />
            <circle cx="96.5" cy="77" r="1.6" fill="#C84B0A" opacity="0.6" />
            {mood === 'sad' ? (
              <path d="M76 88 Q90 83 104 88" stroke="#C84B0A" strokeWidth="2.7" strokeLinecap="round" fill="none" />
            ) : mood === 'think' ? (
              <path d="M76 86 Q91 88 104 83" stroke="#C84B0A" strokeWidth="2.7" strokeLinecap="round" fill="none" />
            ) : (
              <path d="M72 83.5 Q90 92 108 83.5" stroke="#C84B0A" strokeWidth="2.7" strokeLinecap="round" fill="none" />
            )}
          </g>
        )}

        {/* Accesorios de la Boutique de Pato Ventura */}
        {outfit === 'explorer' && (
          <g className="mascot-hat">
            <ellipse cx="90" cy="30" rx="48" ry="9" fill="#C97A2B" stroke="#8C4F12" strokeWidth="2.5" />
            <path d="M56 29 C58 8, 122 8, 124 29 Z" fill="#E3963E" stroke="#8C4F12" strokeWidth="2.5" />
            <rect x="57" y="23" width="66" height="5.5" rx="2.5" fill="#58CC02" />
          </g>
        )}
        {outfit === 'royal' && (
          <g className="mascot-crown">
            <path
              d="M62 28 L66 8 L79 19 L90 5 L101 19 L114 8 L118 28 Z"
              fill="#FFC800"
              stroke="#E09F00"
              strokeWidth="2.4"
              strokeLinejoin="round"
            />
            <circle cx="90" cy="19" r="3" fill="#FF4B4B" />
            <circle cx="74" cy="21" r="2.3" fill="#1CB0F6" />
            <circle cx="106" cy="21" r="2.3" fill="#58CC02" />
          </g>
        )}
        {outfit === 'cool' && (
          <g className="mascot-shades">
            <rect x="49" y="51" width="36" height="21" rx="8" fill="#1E293B" stroke="#1CB0F6" strokeWidth="3" />
            <rect x="95" y="51" width="36" height="21" rx="8" fill="#1E293B" stroke="#1CB0F6" strokeWidth="3" />
            <line x1="85" y1="59" x2="95" y2="59" stroke="#1CB0F6" strokeWidth="3.5" />
            <line x1="55" y1="56" x2="65" y2="66" stroke="#FFFFFF" strokeWidth="2.4" strokeLinecap="round" opacity="0.65" />
            <line x1="101" y1="56" x2="111" y2="66" stroke="#FFFFFF" strokeWidth="2.4" strokeLinecap="round" opacity="0.65" />
          </g>
        )}
        {outfit === 'super' && (
          <g className="mascot-mask">
            <path
              d="M47 56 C47 45, 76 45, 90 55 C104 45, 133 45, 133 56 C133 70, 106 74, 90 64 C74 74, 47 70, 47 56 Z"
              fill="#CE82FF"
              opacity="0.42"
            />
          </g>
        )}
      </g>

      {/* chispas de celebración */}
      {(celebrating || quacking) && (
        <g className="mascot-sparkles" fill="#FFC93C">
          <path d="M18 42 l3.2 8.5 8.5 3.2 -8.5 3.2 -3.2 8.5 -3.2 -8.5 -8.5 -3.2 8.5 -3.2 Z" />
          <path d="M161 38 l2.6 7 7 2.6 -7 2.6 -2.6 7 -2.6 -7 -7 -2.6 7 -2.6 Z" />
          <path d="M155 138 l2.2 5.5 5.5 2.2 -5.5 2.2 -2.2 5.5 -2.2 -5.5 -5.5 -2.2 5.5 -2.2 Z" fill="#2EC4B6" />
        </g>
      )}

      {/* burbuja de pensamiento */}
      {mood === 'think' && (
        <g className="mascot-thought">
          <circle cx="144" cy="54" r="4.5" fill="#FFFFFF" stroke="#0E8A7D" strokeWidth="2.4" />
          <circle cx="155" cy="37" r="12" fill="#FFFFFF" stroke="#0E8A7D" strokeWidth="2.8" />
          <text x="155" y="42.5" textAnchor="middle" fontSize="15" fontWeight="900" fill="#0E8A7D">
            ?
          </text>
        </g>
      )}
    </svg>
  );

  if (!interactive) return svg;

  return (
    <button
      type="button"
      className="mascot-btn"
      onClick={handlePoke}
      aria-label="Pato Ventura"
      title="Pato Ventura"
    >
      {svg}
    </button>
  );
}

export function Confetti({ burstKey, count = 34 }: { burstKey: number; count?: number }) {
  const pieces = useMemo(() => {
    const colors = ['#58CC02', '#1CB0F6', '#FFC800', '#FF4B4B', '#CE82FF', '#FF9600'];
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

/** Búho amigo lector en Feather Green (#58CC02) que acompaña a Pato Ventura en el camino. */
export function DuoOwlBuddy({ size = 86, locked = false }: { size?: number; locked?: boolean }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      className={`duo-owl-buddy ${locked ? 'is-locked' : ''}`}
      aria-hidden="true"
    >
      <ellipse cx="60" cy="110" rx="32" ry="6" fill="rgba(0,0,0,0.10)" />
      {/* Patitas naranja */}
      <rect x="42" y="98" width="12" height="8" rx="4" fill={locked ? '#BDBDBD' : '#FF9600'} />
      <rect x="66" y="98" width="12" height="8" rx="4" fill={locked ? '#BDBDBD' : '#FF9600'} />
      {/* Cuerpo Feather Green */}
      <path
        d="M32 28 L44 36 Q60 28 76 36 L88 28 C96 42, 96 76, 88 92 C80 103, 40 103, 32 92 C24 76, 24 42, 32 28 Z"
        fill={locked ? '#D6D6D6' : '#58CC02'}
      />
      {/* Alas */}
      <path d="M28 56 C14 62, 16 84, 30 86 Z" fill={locked ? '#C2C2C2' : '#43C000'} />
      <path d="M92 56 C106 62, 104 84, 90 86 Z" fill={locked ? '#C2C2C2' : '#43C000'} />
      {/* Máscara clara Mask Green */}
      <ellipse cx="47" cy="55" rx="14" ry="15" fill={locked ? '#EBEBEB' : '#89E219'} />
      <ellipse cx="73" cy="55" rx="14" ry="15" fill={locked ? '#EBEBEB' : '#89E219'} />
      {/* Plumas del pecho */}
      <path d="M46 78 Q53 84 60 78 Q67 84 74 78" stroke={locked ? '#EBEBEB' : '#89E219'} strokeWidth="4" strokeLinecap="round" fill="none" />
      <path d="M50 87 Q60 93 70 87" stroke={locked ? '#EBEBEB' : '#89E219'} strokeWidth="4" strokeLinecap="round" fill="none" />
      {/* Ojos grandes */}
      <circle cx="47" cy="55" r="10.5" fill="#FFFFFF" />
      <circle cx="73" cy="55" r="10.5" fill="#FFFFFF" />
      <circle cx="48.5" cy="55.5" r="5.5" fill={locked ? '#8E8E8E' : '#4B4B4B'} />
      <circle cx="71.5" cy="55.5" r="5.5" fill={locked ? '#8E8E8E' : '#4B4B4B'} />
      <circle cx="50.5" cy="53" r="2.2" fill="#FFFFFF" />
      <circle cx="73.5" cy="53" r="2.2" fill="#FFFFFF" />
      {/* Pico */}
      <path d="M54 62 Q60 58 66 62 L60 71 Z" fill={locked ? '#B0B0B0' : '#FFC800'} />
    </svg>
  );
}

/** Barra continua brillante estilo lección de Duolingo con tubo de luz interior. */
export function DuoLessonProgress({ current, total, streak = 0 }: { current: number; total: number; streak?: number }) {
  const pct = total > 0 ? Math.min(100, Math.max(4, Math.round((current / total) * 100))) : 0;
  return (
    <div
      className={`duo-lesson-bar ${streak >= 3 ? 'is-hot' : ''}`}
      role="progressbar"
      aria-valuenow={current}
      aria-valuemin={0}
      aria-valuemax={total}
    >
      <div className="duo-lesson-bar-fill" style={{ width: `${pct}%` }}>
        <span className="duo-lesson-bar-shine" />
      </div>
    </div>
  );
}

export function StarRow({
  count,
  max = 3,
  size = 'md',
  animate = false,
}: {
  count: number;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  animate?: boolean;
}) {
  const px = size === 'lg' ? 40 : size === 'sm' ? 16 : 20;
  return (
    <span className={`star-row star-row-${size} ${animate ? 'star-row-animated' : ''}`} aria-label={`${count} / ${max}`}>
      {Array.from({ length: max }, (_, i) => (
        <span
          key={i}
          className={i < count ? 'star on' : 'star off'}
          style={animate ? { animationDelay: `${i * 0.16}s` } : undefined}
        >
          <IconStar size={px} filled={i < count} />
        </span>
      ))}
    </span>
  );
}

/** ¿El sistema o el modo calm piden evitar movimiento? */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
}

/** Número que sube con easing, como el contador de XP de Duolingo. */
export function useCountUp(target: number, duration = 850): number {
  const [value, setValue] = useState(0);
  useEffect(() => {
    const reduce =
      prefersReducedMotion() ||
      (typeof document !== 'undefined' && document.body.classList.contains('calm')) ||
      typeof requestAnimationFrame === 'undefined';
    if (reduce) {
      setValue(target);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      setValue(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}

export function XpFloat({ amount, burstKey }: { amount: number; burstKey: number }) {
  return (
    <div className="xp-float" key={burstKey} aria-hidden="true">
      <IconBolt size={14} /> +{amount} XP
    </div>
  );
}

export function ComboPill({ count, label, burstKey }: { count: number; label: string; burstKey: number }) {
  return (
    <div className="combo-pill" key={burstKey} role="status">
      <IconFlame size={14} /> {label} ×{count}
    </div>
  );
}

export function LangChip({ lang }: { lang: Lang }) {
  return (
    <span className={`lang-chip lang-${lang}`}>
      <strong>{lang.toUpperCase()}</strong>
      <span>{lang === 'eu' ? 'euskara' : lang === 'en' ? 'english' : 'castellano'}</span>
    </span>
  );
}

export function RoutePill({ route, label }: { route: Route; label: string }) {
  const icon =
    route === 'visual' ? <IconEye size={14} /> : route === 'auditivo' ? <IconHeadphones size={14} /> : <IconLayers size={14} />;
  return (
    <span className={`route-pill route-${route}`}>
      {icon}
      <span>{label}</span>
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

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Modal({ children, onClose, labelledBy }: { children: ReactNode; onClose: () => void; labelledBy?: string }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const prev = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    cardRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab' || !cardRef.current) return;
      const nodes = Array.from(cardRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
      if (!nodes.length) return;
      const first = nodes[0]!;
      const last = nodes[nodes.length - 1]!;
      const active = document.activeElement;
      if (e.shiftKey && (active === first || active === cardRef.current)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      prev?.focus?.();
    };
  }, []);

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div
        ref={cardRef}
        tabIndex={-1}
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button className="icon-btn modal-close" onClick={onClose} aria-label="Cerrar">
          <IconClose size={18} />
        </button>
        {children}
      </div>
    </div>
  );
}

export function Toast({ text }: { text: string }) {
  return (
    <div className="toast" role="status">
      <IconSparkles size={15} />
      <span>{text}</span>
    </div>
  );
}
