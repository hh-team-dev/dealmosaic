/** The "Prism Tessera" mark: three angular tiles converge into one prism, with an
 *  aperture notch for discovery. Original geometry, inline SVG, animates on mount. */
export function LogoMark({
  size = 34,
  animated = false,
  title = 'DEALMOSAIC',
}: {
  size?: number;
  animated?: boolean;
  title?: string;
}) {
  return (
    <svg
      className={`brand-mark logo-tiles${animated ? ' logo-anim' : ''}`}
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label={title}
    >
      <defs>
        <linearGradient id="dmA" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FF6B6B" />
          <stop offset="1" stopColor="#FF8A3D" />
        </linearGradient>
        <linearGradient id="dmB" x1="1" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFBE0B" />
          <stop offset="1" stopColor="#B8F34A" />
        </linearGradient>
        <linearGradient id="dmC" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2EC4B6" />
          <stop offset="1" stopColor="#4361EE" />
        </linearGradient>
      </defs>
      <polygon points="32,4 8,32 32,32" fill="url(#dmA)" />
      <polygon points="32,4 56,32 32,32" fill="url(#dmB)" />
      <polygon points="8,32 32,32 32,60 56,32" fill="url(#dmC)" />
      <circle cx="40.5" cy="21.5" r="6.2" fill="none" stroke="#FFF9F0" strokeWidth="3.2" />
      <line x1="45" y1="26" x2="50" y2="31" stroke="#FFF9F0" strokeWidth="3.2" strokeLinecap="round" />
    </svg>
  );
}

export function Wordmark({ sub = false }: { sub?: boolean }) {
  return (
    <span className="brand">
      <LogoMark animated />
      <span>
        <span className="brand-word">
          DEALMOSAIC<span>.</span>
        </span>
        {sub && <span className="brand-sub">One search · Three real deals</span>}
      </span>
    </span>
  );
}
