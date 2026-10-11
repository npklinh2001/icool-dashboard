import type { ReactNode } from 'react';
import type { IconName } from '../types';

const ICON_PATHS: Record<IconName, ReactNode> = {
  chart: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
  users: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 3.5 6" />
    </>
  ),
  truck: (
    <>
      <path d="M2 6h11v10H2zM13 10h4l4 3v3h-8" />
      <circle cx="6" cy="18" r="2" />
      <circle cx="17" cy="18" r="2" />
    </>
  ),
  wrench: (
    <path d="M14.7 6.3a4 4 0 0 0-5.4 5.2L3 17.8V21h3.2l6.3-6.3a4 4 0 0 0 5.2-5.4l-2.6 2.6-2.4-.5-.5-2.4 2.5-2.7z" />
  ),
  shield: (
    <>
      <path d="M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6l8-3z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  cap: (
    <>
      <path d="M2 9l10-5 10 5-10 5L2 9z" />
      <path d="M6 11v5c0 1.5 2.7 3 6 3s6-1.5 6-3v-5M22 9v6" />
    </>
  ),
  cpu: (
    <>
      <rect x="6" y="6" width="12" height="12" rx="2" />
      <rect x="9.5" y="9.5" width="5" height="5" />
      <path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4" />
    </>
  ),
  wallet: <path d="M3 7a2 2 0 0 1 2-2h13v4M3 7v11a2 2 0 0 0 2 2h15V9H5a2 2 0 0 1-2-2zM16 14.5h1" />,
  scale: (
    <path d="M12 3v18M7 21h10M5 7h14M5 7l-3 7a3 3 0 0 0 6 0L5 7zM19 7l-3 7a3 3 0 0 0 6 0l-3-7z" />
  ),
  grid: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </>
  ),
};

const STROKE_PROPS = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

export function Icon({ name = 'grid', size = 16 }: { name?: IconName; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...STROKE_PROPS}>
      {ICON_PATHS[name]}
    </svg>
  );
}

export function StrokeIcon({
  size = 16,
  strokeWidth = 2,
  children,
}: {
  size?: number;
  strokeWidth?: number;
  children: ReactNode;
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...STROKE_PROPS} strokeWidth={strokeWidth}>
      {children}
    </svg>
  );
}

export function PowerBiIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <rect x="15" y="3" width="5" height="18" rx="1.5" fill="#f2c811" />
      <rect x="9.5" y="8" width="5" height="13" rx="1.5" fill="#e0b400" />
      <rect x="4" y="13" width="5" height="8" rx="1.5" fill="#c79a00" />
    </svg>
  );
}

export function ChevronIcon() {
  return (
    <svg
      className="chev"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      {...STROKE_PROPS}
      strokeWidth={2.2}
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}
