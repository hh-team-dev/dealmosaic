/**
 * Inline SVG icon set.
 *
 * Deliberately not emoji: emoji rendering varies by OS (Windows has no flag
 * emoji at all, headless Linux shows tofu boxes), and an icon that disappears
 * on a user's machine is worse than no icon. These are currentColor, 1.9px
 * strokes, and inherit size from CSS.
 */
type IconName =
  | 'search'
  | 'bulb'
  | 'shield'
  | 'lock'
  | 'chart'
  | 'clock'
  | 'ban'
  | 'box'
  | 'warn'
  | 'info'
  | 'check'
  | 'download'
  | 'trash'
  | 'phone'
  | 'cards'
  | 'cart'
  | 'bolt'
  | 'flag'
  | 'sparkle'
  | 'alert'
  | 'arrow-right'
  | 'external'
  | 'spark'
  | 'receipt'
  | 'radar'
  | 'passport'
  | 'tag'
  | 'chevron-right'
  | 'star'
  | 'ban-circle';

const PATHS: Record<IconName, React.ReactNode> = {
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4.5 4.5" />
    </>
  ),
  bulb: (
    <>
      <path d="M9 18h6M10 21h4" />
      <path d="M12 3a6 6 0 0 0-3.5 10.9c.4.3.6.8.6 1.3V16h5.8v-.8c0-.5.2-1 .6-1.3A6 6 0 0 0 12 3Z" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3 5 6v5.5c0 4.2 2.9 7.6 7 9.5 4.1-1.9 7-5.3 7-9.5V6l-7-3Z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  lock: (
    <>
      <rect x="4.5" y="10.5" width="15" height="10" rx="2.5" />
      <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" />
    </>
  ),
  chart: (
    <>
      <path d="M4 19V5M4 19h16" />
      <path d="m7 15 4-5 3 3 4-6" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  ban: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="m6.5 17.5 11-11" />
    </>
  ),
  box: (
    <>
      <path d="M4 8.5 12 4l8 4.5v7L12 20l-8-4.5v-7Z" />
      <path d="M4 8.5 12 13l8-4.5M12 13v7" />
    </>
  ),
  warn: (
    <>
      <path d="M12 4.5 21 19H3l9-14.5Z" />
      <path d="M12 10v4M12 16.6v.4" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5M12 8v.4" />
    </>
  ),
  check: <path d="m5 12.5 4.5 4.5L19 7" />,
  download: (
    <>
      <path d="M12 4v10m0 0 4-4m-4 4-4-4" />
      <path d="M5 18h14" />
    </>
  ),
  trash: (
    <>
      <path d="M4.5 7h15M9 7V5h6v2M6.5 7l.8 12h9.4l.8-12" />
      <path d="M10.5 11v4.5M13.5 11v4.5" />
    </>
  ),
  phone: <path d="M7 3.5h3l1.5 4-2 1.5a10 10 0 0 0 5.5 5.5l1.5-2 4 1.5v3a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 5 5.7 2 2 0 0 1 7 3.5Z" />,
  cards: (
    <>
      <rect x="3.5" y="8.5" width="13" height="9" rx="2" />
      <path d="M7 5.5h11a2 2 0 0 1 2 2v7" />
    </>
  ),
  cart: (
    <>
      <path d="M4 5h2l2.2 9.5h9.3L20 8H7" />
      <circle cx="9.5" cy="18.5" r="1.4" />
      <circle cx="17" cy="18.5" r="1.4" />
    </>
  ),
  bolt: <path d="M13 3 6 13h4.5L10 21l7-10h-4.5L13 3Z" />,
  flag: (
    <>
      <path d="M6 21V4" />
      <path d="M6 5h11l-2 4 2 4H6" />
    </>
  ),
  sparkle: (
    <>
      <path d="M12 3v6M12 15v6M3 12h6M15 12h6" />
      <path d="m6.5 6.5 3 3M14.5 14.5l3 3M17.5 6.5l-3 3M9.5 14.5l-3 3" />
    </>
  ),

  alert: (
    <>
      <path d="M12 4.5 2.8 20h18.4L12 4.5Z" />
      <path d="M12 10v4" />
      <circle cx="12" cy="17.2" r=".6" fill="currentColor" stroke="none" />
    </>
  ),
  'arrow-right': (
    <>
      <path d="M4 12h16" />
      <path d="m14 6 6 6-6 6" />
    </>
  ),
  external: (
    <>
      <path d="M14 4h6v6" />
      <path d="M20 4 11 13" />
      <path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
    </>
  ),
  spark: (
    <>
      <path d="M12 3v4M12 17v4M4.6 7.4l2.8 2.8M16.6 13.8l2.8 2.8M3 12h4M17 12h4M4.6 16.6l2.8-2.8M16.6 10.2l2.8-2.8" />
    </>
  ),
  receipt: (
    <>
      <path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z" />
      <path d="M9 8h6M9 12h6" />
    </>
  ),
  radar: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4.5" />
      <path d="M12 12 18 6.5" />
      <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  passport: (
    <>
      <rect x="4.5" y="3" width="15" height="18" rx="2" />
      <circle cx="12" cy="10" r="3.2" />
      <path d="M8.5 17h7" />
    </>
  ),
  tag: (
    <>
      <path d="M11.6 3H21v9.4L11.4 22 2 12.6 11.6 3Z" />
      <circle cx="17" cy="7" r="1.4" />
    </>
  ),
  'chevron-right': <path d="m9 5 7 7-7 7" />,
  star: (
    <path d="m12 3.6 2.6 5.4 5.9.8-4.3 4.1 1.1 5.9-5.3-2.9-5.3 2.9 1.1-5.9L3.5 9.8l5.9-.8L12 3.6Z" />
  ),
  'ban-circle': (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="m6.5 17.5 11-11" />
    </>
  ),
};

export function Icon({
  name,
  size = 18,
  strokeWidth = 1.9,
  className = '',
  label,
}: {
  name: IconName;
  size?: number;
  strokeWidth?: number;
  className?: string;
  /** Provide only when the icon carries meaning without adjacent text. */
  label?: string;
}) {
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
      className={className}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      style={{ flex: '0 0 auto' }}
    >
      {PATHS[name]}
    </svg>
  );
}

export type { IconName };
