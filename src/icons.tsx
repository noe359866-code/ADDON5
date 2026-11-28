import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Svg({ size = 18, children, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.1"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  );
}

export function IconVolume(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M11 5L6 9H2v6h4l5 4V5z" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </Svg>
  );
}

export function IconVolumeOff(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M11 5L6 9H2v6h4l5 4V5z" />
      <line x1="22" y1="9" x2="16" y2="15" />
      <line x1="16" y1="9" x2="22" y2="15" />
    </Svg>
  );
}

export function IconMusic(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </Svg>
  );
}

export function IconSettings(props: IconProps) {
  return (
    <Svg {...props}>
      <line x1="4" y1="7" x2="20" y2="7" />
      <circle cx="9" cy="7" r="2.5" fill="currentColor" stroke="none" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <circle cx="15" cy="12" r="2.5" fill="currentColor" stroke="none" />
      <line x1="4" y1="17" x2="20" y2="17" />
      <circle cx="11" cy="17" r="2.5" fill="currentColor" stroke="none" />
    </Svg>
  );
}

export function IconPlay(props: IconProps) {
  return (
    <Svg {...props}>
      <polygon points="7 4 20 12 7 20 7 4" fill="currentColor" strokeLinejoin="round" />
    </Svg>
  );
}

export function IconRepeat(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
      <path d="M3 3v5h5" />
    </Svg>
  );
}

export function IconLock(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="5" y="11" width="14" height="10" rx="2.5" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </Svg>
  );
}

export function IconCheck(props: IconProps) {
  return (
    <Svg {...props}>
      <polyline points="20 6 9 17 4 12" strokeWidth="2.6" />
    </Svg>
  );
}

export function IconClose(props: IconProps) {
  return (
    <Svg {...props}>
      <line x1="18" y1="6" x2="6" y2="18" strokeWidth="2.3" />
      <line x1="6" y1="6" x2="18" y2="18" strokeWidth="2.3" />
    </Svg>
  );
}

export function IconEye(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M2 12s3.8-7 10-7 10 7 10 7-3.8 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </Svg>
  );
}

export function IconHeadphones(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 14v-2a8 8 0 0 1 16 0v2" />
      <rect x="2" y="14" width="4" height="6" rx="2" />
      <rect x="18" y="14" width="4" height="6" rx="2" />
    </Svg>
  );
}

export function IconLayers(props: IconProps) {
  return (
    <Svg {...props}>
      <polygon points="12 3 2 8.5 12 14 22 8.5 12 3" />
      <polyline points="2 13.5 12 19 22 13.5" />
    </Svg>
  );
}

export function IconBook(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </Svg>
  );
}

export function IconSchool(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 3L1 9l11 6 9-4.9V17h2V9L12 3z" />
      <path d="M5 13.2V17c0 1.7 3.1 3 7 3s7-1.3 7-3v-3.8l-7 3.8-7-3.8z" />
    </Svg>
  );
}

export function IconCompass(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="9.5" />
      <polygon points="15.8 8.2 13.6 13.6 8.2 15.8 10.4 10.4 15.8 8.2" />
    </Svg>
  );
}

export function IconAward(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="8.5" r="5.5" />
      <path d="M8.5 13.5L7 22l5-2.8L17 22l-1.5-8.5" />
    </Svg>
  );
}

export function IconFlame(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 2.5c1.5 3.2 5.5 5.2 5.5 10.1a5.5 5.5 0 1 1-11 0c0-2.4 1.1-4.5 2.6-6.1 0 1.6 1 2.5 1.9 2.5.4-2.2 0-4.4 1-6.5z" />
    </Svg>
  );
}

export function IconStar(props: IconProps & { filled?: boolean }) {
  const { filled = false, ...rest } = props;
  return (
    <Svg {...rest}>
      <polygon
        points="12 2.6 14.9 8.5 21.4 9.4 16.7 14 17.8 20.5 12 17.4 6.2 20.5 7.3 14 2.6 9.4 9.1 8.5 12 2.6"
        fill={filled ? 'currentColor' : 'none'}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function IconBolt(props: IconProps) {
  return (
    <Svg {...props}>
      <polygon points="13 2 4.5 13.5 11.5 13.5 10.5 22 19.5 10.5 12.5 10.5 13 2" fill="currentColor" strokeLinejoin="round" />
    </Svg>
  );
}

export function IconLightbulb(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M9 18h6" />
      <path d="M10 22h4" />
      <path d="M12 2a7 7 0 0 0-4 12.7c.7.6 1 1.4 1 2.3h6c0-.9.3-1.7 1-2.3A7 7 0 0 0 12 2z" />
    </Svg>
  );
}

export function IconSparkles(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 3l1.7 4.8L18.5 9.5l-4.8 1.7L12 16l-1.7-4.8L5.5 9.5l4.8-1.7L12 3z" />
      <path d="M19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16z" />
    </Svg>
  );
}

export function IconShuffle(props: IconProps) {
  return (
    <Svg {...props}>
      <polyline points="16 3 21 3 21 8" />
      <line x1="4" y1="20" x2="21" y2="3" />
      <polyline points="21 16 21 21 16 21" />
      <line x1="15" y1="15" x2="21" y2="21" />
      <line x1="4" y1="4" x2="9" y2="9" />
    </Svg>
  );
}

export function IconAccessibility(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="4.5" r="1.8" fill="currentColor" stroke="none" />
      <path d="M5 8.5h14" />
      <path d="M12 8.5v6" />
      <path d="M9 21l3-6.5 3 6.5" />
    </Svg>
  );
}

export function IconGlobe(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="9.5" />
      <path d="M2.5 12h19" />
      <path d="M12 2.5a14.5 14.5 0 0 1 0 19 14.5 14.5 0 0 1 0-19z" />
    </Svg>
  );
}

export function IconUser(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 20.5a7.5 7.5 0 0 1 15 0" />
    </Svg>
  );
}

export function IconArrowRight(props: IconProps) {
  return (
    <Svg {...props}>
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="13 6 19 12 13 18" />
    </Svg>
  );
}

export function IconArrowLeft(props: IconProps) {
  return (
    <Svg {...props}>
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="11 6 5 12 11 18" />
    </Svg>
  );
}

export function IconGamepad(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="2.5" y="6.5" width="19" height="11" rx="4.5" />
      <line x1="7.5" y1="10" x2="7.5" y2="14" />
      <line x1="5.5" y1="12" x2="9.5" y2="12" />
      <circle cx="15.5" cy="11" r="1" fill="currentColor" stroke="none" />
      <circle cx="17.8" cy="13" r="1" fill="currentColor" stroke="none" />
    </Svg>
  );
}

export function IconMap(props: IconProps) {
  return (
    <Svg {...props}>
      <polygon points="3 6 9 3.5 15 6 21 3.5 21 18 15 20.5 9 18 3 20.5 3 6" />
      <line x1="9" y1="3.5" x2="9" y2="18" />
      <line x1="15" y1="6" x2="15" y2="20.5" />
    </Svg>
  );
}

/* ================================================================== */
/* Iconografía plana multicolor estilo Duolingo                        */
/* ================================================================== */

export function DuoFlagSvg({ code, size = 28 }: { code: 'es' | 'eu' | 'en' | 'both'; size?: number }) {
  const h = Math.round(size * 0.76);
  if (code === 'es') {
    return (
      <svg width={size} height={h} viewBox="0 0 36 26" aria-hidden="true" className="duo-flag-svg">
        <rect width="36" height="26" rx="6" fill="#FF4B4B" />
        <rect y="6.5" width="36" height="13" fill="#FFC800" />
        <circle cx="12" cy="13" r="3" fill="#FF9600" />
        <rect x="1" y="1" width="34" height="24" rx="5" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" />
      </svg>
    );
  }
  if (code === 'eu') {
    // Ikurriña estilizada estilo Duolingo
    return (
      <svg width={size} height={h} viewBox="0 0 36 26" aria-hidden="true" className="duo-flag-svg">
        <rect width="36" height="26" rx="6" fill="#EA2B2B" />
        <path d="M0 0 L36 26 M36 0 L0 26" stroke="#58CC02" strokeWidth="5.5" />
        <path d="M18 0 V26 M0 13 H36" stroke="#FFFFFF" strokeWidth="5.5" />
        <rect x="1" y="1" width="34" height="24" rx="5" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" />
      </svg>
    );
  }
  if (code === 'en') {
    // Bandera inglesa/británica estilizada estilo Duolingo
    return (
      <svg width={size} height={h} viewBox="0 0 36 26" aria-hidden="true" className="duo-flag-svg">
        <rect width="36" height="26" rx="6" fill="#1E549E" />
        <path d="M0 0 L36 26 M36 0 L0 26" stroke="#FFFFFF" strokeWidth="5.2" />
        <path d="M0 0 L36 26 M36 0 L0 26" stroke="#FF4B4B" strokeWidth="2.4" />
        <path d="M18 0 V26 M0 13 H36" stroke="#FFFFFF" strokeWidth="7.4" />
        <path d="M18 0 V26 M0 13 H36" stroke="#FF4B4B" strokeWidth="4.2" />
        <rect x="1" y="1" width="34" height="24" rx="5" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" />
      </svg>
    );
  }
  // Bilingüe ES + EU diagonal (solo Euskera + Español)
  return (
    <svg width={size} height={h} viewBox="0 0 36 26" aria-hidden="true" className="duo-flag-svg">
      <defs>
        <clipPath id="half-es">
          <polygon points="0,0 36,0 0,26" />
        </clipPath>
        <clipPath id="half-eu">
          <polygon points="36,0 36,26 0,26" />
        </clipPath>
      </defs>
      <g clipPath="url(#half-es)">
        <rect width="36" height="26" rx="6" fill="#FF4B4B" />
        <rect y="6.5" width="36" height="13" fill="#FFC800" />
      </g>
      <g clipPath="url(#half-eu)">
        <rect width="36" height="26" rx="6" fill="#EA2B2B" />
        <path d="M0 0 L36 26 M36 0 L0 26" stroke="#58CC02" strokeWidth="5" />
        <path d="M18 0 V26 M0 13 H36" stroke="#FFFFFF" strokeWidth="4.6" />
      </g>
      <line x1="36" y1="0" x2="0" y2="26" stroke="#FFFFFF" strokeWidth="2" />
      <rect x="1" y="1" width="34" height="24" rx="5" fill="none" stroke="rgba(0,0,0,0.12)" strokeWidth="1.5" />
    </svg>
  );
}

export function DuoFlameSvg({ size = 24, active = true }: { size?: number; active?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <path
        d="M17.2 3.2C17.8 7.8 25 11.2 25 18.4C25 24.1 20.8 28.5 15.8 28.5C10.6 28.5 6.8 24.3 6.8 18.8C6.8 14.5 9.2 11 11.7 8.8C11.5 11.5 13 12.8 14.3 12.8C14.8 9.2 14.6 6 17.2 3.2Z"
        fill={active ? '#FF9600' : '#AFAFAF'}
      />
      <path
        d="M16.2 13.8C17 16.2 20.2 17.8 20.2 21.4C20.2 24.2 18.2 26.2 15.8 26.2C13.4 26.2 11.5 24.2 11.5 21.5C11.5 19.1 13.3 16.9 16.2 13.8Z"
        fill={active ? '#FFC800' : '#E5E5E5'}
      />
    </svg>
  );
}

export function DuoGemSvg({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <polygon points="10,4 22,4 28,12 16,28 4,12" fill="#1CB0F6" />
      <polygon points="10,4 22,4 20,12 12,12" fill="#64D2FF" />
      <polygon points="4,12 12,12 16,28" fill="#1899D6" />
      <polygon points="20,12 28,12 16,28" fill="#1480B8" />
      <polygon points="12,12 20,12 16,28" fill="#3CC2FF" />
    </svg>
  );
}

export function DuoHeartSvg({ size = 24, broken = false, unlimited = false }: { size?: number; broken?: boolean; unlimited?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <path
        d="M16 27.5C16 27.5 4.5 20.2 4.5 11.7C4.5 7.7 7.6 4.8 11.2 4.8C13.5 4.8 15.2 6 16 7.6C16.8 6 18.5 4.8 20.8 4.8C24.4 4.8 27.5 7.7 27.5 11.7C27.5 20.2 16 27.5 16 27.5Z"
        fill={broken ? '#E5E5E5' : unlimited ? '#CE82FF' : '#FF4B4B'}
      />
      {!broken && (
        <ellipse cx="10.6" cy="10.2" rx="2.6" ry="1.6" transform="rotate(-28 10.6 10.2)" fill="rgba(255,255,255,0.45)" />
      )}
      {unlimited && (
        <text x="16" y="18.5" textAnchor="middle" fontSize="11" fontWeight="900" fill="#FFFFFF">
          ∞
        </text>
      )}
    </svg>
  );
}

export function DuoCrownSvg({ size = 24, purple = false }: { size?: number; purple?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <path
        d="M4 23L6.5 9.5L12.5 15L16 7.5L19.5 15L25.5 9.5L28 23H4Z"
        fill={purple ? '#CE82FF' : '#FFC800'}
      />
      <rect x="4" y="23" width="24" height="4" rx="2" fill={purple ? '#A568CC' : '#E5A800'} />
      <circle cx="16" cy="17.5" r="2" fill="#FFFFFF" opacity="0.85" />
    </svg>
  );
}

export function DuoChestSvg({ size = 44, open = false }: { size?: number; open?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <rect x="8" y="26" width="48" height="28" rx="8" fill={open ? '#AFAFAF' : '#CE82FF'} />
      <rect x="8" y="22" width="48" height="14" rx="7" fill={open ? '#CDCDCD' : '#FFC800'} />
      <rect x="27" y="26" width="10" height="12" rx="3" fill={open ? '#888' : '#FF9600'} />
      <circle cx="32" cy="32" r="2.3" fill="#FFF" />
      {!open && (
        <>
          <circle cx="18" cy="14" r="3" fill="#FFC800" />
          <circle cx="48" cy="12" r="2.4" fill="#1CB0F6" />
        </>
      )}
    </svg>
  );
}

export function DuoTurtleSvg({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <path d="M6 20C6 13.5 10.8 9.5 16.5 9.5C22.2 9.5 26 13.5 26 20H6Z" fill="#58CC02" />
      <path d="M9.5 18C10.5 14 13.2 12 16.5 12C19.8 12 22.2 14 23 18H9.5Z" fill="#89E219" />
      <circle cx="27" cy="17" r="3.6" fill="#58CC02" />
      <circle cx="28.1" cy="16.2" r="1" fill="#1E293B" />
      <rect x="9" y="20" width="4" height="4.5" rx="2" fill="#46A302" />
      <rect x="19.5" y="20" width="4" height="4.5" rx="2" fill="#46A302" />
    </svg>
  );
}

export function DuoNavIcon({ tab, size = 28 }: { tab: string; size?: number }) {
  switch (tab) {
    case 'learn':
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
          <path d="M5 15.5L16 6L27 15.5V26.5C27 27.6 26.1 28.5 25 28.5H7C5.9 28.5 5 27.6 5 26.5V15.5Z" fill="#FF4B4B" />
          <path d="M16 6L4 16.2L6.2 18.6L16 10.2L25.8 18.6L28 16.2L16 6Z" fill="#FFC800" />
          <rect x="12.5" y="18.5" width="7" height="10" rx="3" fill="#FFF5D3" />
        </svg>
      );
    case 'reading':
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
          <rect x="12" y="3" width="8" height="15" rx="4" fill="#CE82FF" />
          <path d="M8 14.5C8 19 11.6 22.5 16 22.5C20.4 22.5 24 19 24 14.5" fill="none" stroke="#A568CC" strokeWidth="2.4" strokeLinecap="round" />
          <rect x="14.8" y="22" width="2.4" height="5" rx="1.2" fill="#A568CC" />
          <rect x="10" y="26.5" width="12" height="2.6" rx="1.3" fill="#CE82FF" />
        </svg>
      );
    case 'dictionary':
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
          <rect x="4" y="5" width="17" height="23" rx="3.5" fill="#FF9600" />
          <rect x="7" y="5" width="17" height="23" rx="3.5" fill="#FFC800" />
          <rect x="10" y="11" width="10" height="2.6" rx="1.3" fill="#FFFFFF" />
          <rect x="10" y="16.5" width="7" height="2.6" rx="1.3" fill="#FFFFFF" />
          <circle cx="23" cy="22" r="6" fill="#1CB0F6" stroke="#FFFFFF" strokeWidth="2" />
          <path d="M27.4 26.4L31 30" stroke="#1899D6" strokeWidth="2.6" strokeLinecap="round" />
        </svg>
      );
    case 'letters':
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
          <rect x="4" y="4" width="24" height="24" rx="7" fill="#1CB0F6" />
          <text x="16" y="21.5" textAnchor="middle" fontSize="14.5" fontWeight="900" fill="#FFFFFF" fontFamily="Nunito, sans-serif">
            Aa
          </text>
        </svg>
      );
    case 'stories':
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
          <rect x="6" y="4" width="20" height="24" rx="4.5" fill="#FF9600" />
          <rect x="9" y="4" width="17" height="24" rx="3.5" fill="#FFC800" />
          <rect x="12" y="9" width="10" height="3" rx="1.5" fill="#FFFFFF" />
          <rect x="12" y="14.5" width="7.5" height="3" rx="1.5" fill="#FFFFFF" />
          <path d="M11 24V29L14 27L17 29V24H11Z" fill="#FF4B4B" />
        </svg>
      );
    case 'practice':
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
          <rect x="3" y="11" width="5" height="10" rx="2.5" fill="#1CB0F6" />
          <rect x="7" y="8" width="4.5" height="16" rx="2.2" fill="#1899D6" />
          <rect x="11.5" y="14" width="9" height="4" rx="1.5" fill="#AFAFAF" />
          <rect x="20.5" y="8" width="4.5" height="16" rx="2.2" fill="#1899D6" />
          <rect x="24" y="11" width="5" height="10" rx="2.5" fill="#1CB0F6" />
        </svg>
      );
    case 'leaderboard':
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
          <path d="M6 5H26V15.5C26 22 21.5 26.2 16 28.5C10.5 26.2 6 22 6 15.5V5Z" fill="#FFC800" />
          <path d="M9 8H23V15C23 19.8 19.8 23.2 16 25C12.2 23.2 9 19.8 9 15V8Z" fill="#FF9600" />
          <polygon points="16,10.5 17.6,13.8 21.2,14.3 18.6,16.8 19.2,20.3 16,18.6 12.8,20.3 13.4,16.8 10.8,14.3 14.4,13.8" fill="#FFF7D6" />
        </svg>
      );
    case 'quests':
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
          <rect x="4" y="13" width="24" height="14" rx="4.5" fill="#CE82FF" />
          <rect x="4" y="9" width="24" height="8" rx="4" fill="#FFC800" />
          <rect x="13.5" y="12" width="5" height="7" rx="2" fill="#FF9600" />
        </svg>
      );
    case 'shop':
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
          <rect x="5" y="13" width="22" height="14" rx="3.5" fill="#FF4B4B" />
          <path d="M3.5 13L6.5 6H25.5L28.5 13H3.5Z" fill="#FF86D0" />
          <rect x="12.5" y="18" width="7" height="9" rx="2" fill="#FFF5D3" />
        </svg>
      );
    case 'profile':
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
          <circle cx="16" cy="16" r="12.5" fill="#58CC02" />
          <circle cx="16" cy="12.5" r="4.5" fill="#FFFFFF" />
          <path d="M8.5 24.5C9.8 20.6 12.6 18.8 16 18.8C19.4 18.8 22.2 20.6 23.5 24.5" fill="#FFFFFF" />
        </svg>
      );
    default:
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
          <circle cx="8.5" cy="16" r="3" fill="#CE82FF" />
          <circle cx="16" cy="16" r="3" fill="#CE82FF" />
          <circle cx="23.5" cy="16" r="3" fill="#CE82FF" />
        </svg>
      );
  }
}

