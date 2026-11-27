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
