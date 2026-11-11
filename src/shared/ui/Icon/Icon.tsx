import type { ReactNode, SVGProps } from 'react';

/**
 * Набор иконок в стиле iOS (контур 24×24, stroke = currentColor).
 * Чтобы добавить иконку — допишите ключ в ICONS.
 */
const ICONS = {
  home: <path d="M3.5 10.2 12 3.5l8.5 6.7V19a1.5 1.5 0 0 1-1.5 1.5h-4v-6h-6v6H5A1.5 1.5 0 0 1 3.5 19z" />,
  plus: <path d="M12 5v14M5 12h14" />,
  plusCircle: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 8v8M8 12h8" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="3.8" />
      <path d="M4.5 20.5c.6-3.9 3.6-6.2 7.5-6.2s6.9 2.3 7.5 6.2" />
    </>
  ),
  chevronLeft: <path d="m14.5 5.5-6.5 6.5 6.5 6.5" />,
  chevronRight: <path d="m9.5 5.5 6.5 6.5-6.5 6.5" />,
  chevronDown: <path d="m6 9.5 6 6 6-6" />,
  chevronUp: <path d="m6 14.5 6-6 6 6" />,
  calendar: (
    <>
      <rect x="4" y="5.5" width="16" height="14.5" rx="2.5" />
      <path d="M4 10h16M8.5 3.5v4M15.5 3.5v4" />
    </>
  ),
  search: (
    <>
      <circle cx="10.5" cy="10.5" r="6" />
      <path d="m15 15 5 5" />
    </>
  ),
  sliders: (
    <>
      <path d="M4 8h9M17 8h3M4 16h3M11 16h9" />
      <circle cx="15" cy="8" r="2" />
      <circle cx="9" cy="16" r="2" />
    </>
  ),
  pie: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 4v8l5.7 5.7" />
    </>
  ),
  bars: <path d="M6 19v-5M12 19V9M18 19V5" />,
  scan: (
    <>
      <path d="M4 8V5.5A1.5 1.5 0 0 1 5.5 4H8M16 4h2.5A1.5 1.5 0 0 1 20 5.5V8M20 16v2.5a1.5 1.5 0 0 1-1.5 1.5H16M8 20H5.5A1.5 1.5 0 0 1 4 18.5V16" />
      <rect x="8" y="8" width="3" height="3" rx=".5" />
      <rect x="13" y="8" width="3" height="3" rx=".5" />
      <rect x="8" y="13" width="3" height="3" rx=".5" />
      <path d="M13 13h3v3" />
    </>
  ),
  cart: (
    <>
      <path d="M3 4.5h2.2l2.1 10.2a1.5 1.5 0 0 0 1.5 1.2h8.4a1.5 1.5 0 0 0 1.5-1.1L20.5 8H6.2" />
      <circle cx="9.5" cy="19.5" r="1.2" />
      <circle cx="17" cy="19.5" r="1.2" />
    </>
  ),
  bus: (
    <>
      <rect x="5" y="3.5" width="14" height="15" rx="3" />
      <path d="M5 11h14M8.5 21v-2.5M15.5 21v-2.5M8.5 15h.01M15.5 15h.01M9 7h6" />
    </>
  ),
  doc: (
    <>
      <path d="M14 3.5H7.5A1.5 1.5 0 0 0 6 5v14a1.5 1.5 0 0 0 1.5 1.5h9A1.5 1.5 0 0 0 18 19V7.5z" />
      <path d="M14 3.5v4h4M9 12.5h6M9 16h6" />
    </>
  ),
  sofa: (
    <>
      <path d="M5.5 11V8a2.5 2.5 0 0 1 2.5-2.5h8A2.5 2.5 0 0 1 18.5 8v3" />
      <path d="M3.5 13a2 2 0 0 1 4 0v1.5h9V13a2 2 0 0 1 4 0v4a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 17zM6 18.5V20M18 18.5V20" />
    </>
  ),
  medical: <path d="M9.5 4h5v5.5H20v5h-5.5V20h-5v-5.5H4v-5h5.5z" />,
  wifi: (
    <>
      <path d="M3.5 9.5a12 12 0 0 1 17 0M6.5 12.8a7.7 7.7 0 0 1 11 0M9.5 16a3.5 3.5 0 0 1 5 0" />
      <path d="M12 19.2h.01" strokeWidth="2.6" />
    </>
  ),
  grid: (
    <>
      <rect x="4" y="4" width="6.5" height="6.5" rx="2" />
      <rect x="13.5" y="4" width="6.5" height="6.5" rx="2" />
      <rect x="4" y="13.5" width="6.5" height="6.5" rx="2" />
      <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="2" />
    </>
  ),
  book: (
    <>
      <path d="M4.5 5.5A1.5 1.5 0 0 1 6 4h4.5A1.5 1.5 0 0 1 12 5.5V20a2 2 0 0 0-2-2H4.5z" />
      <path d="M19.5 5.5A1.5 1.5 0 0 0 18 4h-4.5A1.5 1.5 0 0 0 12 5.5V20a2 2 0 0 1 2-2h5.5z" />
    </>
  ),
  mail: (
    <>
      <rect x="3.5" y="5.5" width="17" height="13" rx="2.5" />
      <path d="m4.5 7.5 7.5 5.5 7.5-5.5" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M3.5 12h17M12 3.5c2.3 2.3 3.4 5.2 3.4 8.5s-1.1 6.2-3.4 8.5c-2.3-2.3-3.4-5.2-3.4-8.5S9.7 5.8 12 3.5z" />
    </>
  ),
  moon: <path d="M19.5 14.5A8 8 0 0 1 9.5 4.5a8 8 0 1 0 10 10z" />,
  banknote: (
    <>
      <rect x="3" y="6.5" width="18" height="11" rx="2" />
      <circle cx="12" cy="12" r="2.5" />
      <path d="M6.5 10v4M17.5 10v4" />
    </>
  ),
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  /** «Поделиться» в Safari: квадрат со стрелкой вверх */
  share: <path d="M12 3.5v11M8 7.5l4-4 4 4M8.5 10.5H7a1.5 1.5 0 0 0-1.5 1.5v7A1.5 1.5 0 0 0 7 20.5h10a1.5 1.5 0 0 0 1.5-1.5v-7A1.5 1.5 0 0 0 17 10.5h-1.5" />,
  plusSquare: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="4" />
      <path d="M12 8.5v7M8.5 12h7" />
    </>
  ),
  moreVertical: (
    <>
      <circle cx="12" cy="6" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="12" cy="18" r="1.6" fill="currentColor" stroke="none" />
    </>
  ),
  smartphone: (
    <>
      <rect x="6.5" y="3" width="11" height="18" rx="2.5" />
      <path d="M10.5 17.5h3" />
    </>
  ),
  download: <path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M5 19.5h14" />,
  more: (
    <>
      <circle cx="6" cy="12" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="18" cy="12" r="1.6" fill="currentColor" stroke="none" />
    </>
  ),
  close: <path d="M7 7l10 10M17 7 7 17" />,
  trash: (
    <>
      <path d="M4.5 6.5h15M9.5 6.5V4.5h5v2M6.5 6.5l.9 12.2a1.5 1.5 0 0 0 1.5 1.3h6.2a1.5 1.5 0 0 0 1.5-1.3l.9-12.2" />
      <path d="M10 10.5v6M14 10.5v6" />
    </>
  ),
  pencil: <path d="M15.5 4.5 19.5 8.5 9 19H5v-4zM13.5 6.5l4 4" />,
  store: (
    <>
      <path d="M4 9.5 5.5 4.5h13L20 9.5" />
      <path d="M4 9.5a2.7 2.7 0 0 0 5.3 0 2.7 2.7 0 0 0 5.4 0 2.7 2.7 0 0 0 5.3 0" />
      <path d="M5.5 12v7.5h13V12M10 19.5V15h4v4.5" />
    </>
  ),
  flash: <path d="M13 3 5.5 13.5H12L11 21l7.5-10.5H12z" />,
  shield: (
    <>
      <path d="M12 3.5 5 6v5.5c0 4.3 2.9 7.6 7 9 4.1-1.4 7-4.7 7-9V6z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  chart: <path d="M4 4.5V19.5h16M7.5 15l4-4.5 3 3L19.5 8" />,
  upload: <path d="M12 15V4.5M7.5 8.5 12 4l4.5 4.5M5 14.5V19a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 19 19v-4.5" />,
  cloud: <path d="M7 18.5h10.5a4 4 0 0 0 .6-7.95A6 6 0 0 0 6.5 9.5 4.5 4.5 0 0 0 7 18.5z" />,
  cloudOff: (
    <>
      <path d="M9.6 6.1A6 6 0 0 1 18.1 10.55 4 4 0 0 1 20 17.6M16.5 18.5H7a4.5 4.5 0 0 1-.5-9 6 6 0 0 1 .5-1.6" />
      <path d="m3.5 3.5 17 17" />
    </>
  ),
  receipt: (
    <>
      <path d="M6 3.5h12v17l-2.4-1.6L13.2 20.5 12 19.7l-1.2.8-2.4-1.6L6 20.5z" />
      <path d="M9 8h6M9 11.5h6M9 15h3.5" />
    </>
  ),
  alert: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5v5.5" />
      <path d="M12 16.3h.01" strokeWidth="2.4" />
    </>
  ),
  trendDown: <path d="m6 7 11 11M17 10v8h-8" />,
  trendUp: <path d="M6 17 17 6M9 6h8v8" />,
  backspace: (
    <>
      <path d="M8.5 5.5H19a1.5 1.5 0 0 1 1.5 1.5v10a1.5 1.5 0 0 1-1.5 1.5H8.5L3 12z" />
      <path d="m11 9.5 5 5M16 9.5l-5 5" />
    </>
  ),
} satisfies Record<string, ReactNode>;

export type IconName = keyof typeof ICONS;

interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'name'> {
  name: IconName;
  size?: number;
  strokeWidth?: number;
  /** Подпись для скринридера. Без неё иконка считается декоративной. */
  label?: string;
}

export function Icon({ name, size = 22, strokeWidth = 1.8, label, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      {...rest}
    >
      {ICONS[name]}
    </svg>
  );
}
