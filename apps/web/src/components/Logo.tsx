/**
 * The DEALMOSAIC mark — "Mosaic M".
 *
 * Two polygons, one letterform. An angular M whose left facet is Cobalt Deep and
 * whose right facet is Coral Spark; the two halves meet along the chevron that
 * runs up the middle of the letter, so the colour change *is* the letter's
 * construction rather than a decoration laid over it. Read as a whole it is an M;
 * read as parts it is two tiles joined at an angle — a mosaic.
 *
 * The geometry is original. It is deliberately not a gradient, not a stroke, not a
 * glyph set in a typeface, and not assembled from pieces of other companies' marks.
 * Flat fills only: that is what survives being scaled to 16 px and what prints in
 * one ink when the palette is unavailable.
 *
 * The grid is 64 x 64 with the mark inset to x 8..56 / y 12..54, and the viewBox
 * crops to a square window around it so the optical padding is even on all sides.
 * Assets generated from the same geometry live in apps/web/public/brand/
 * (see scripts/brand/brand.py and docs/brand-identity.md).
 *
 * Colours come from CSS custom properties rather than hard-coded hex, so the mark
 * can be re-tinted per surface (e.g. the on-dark pair) without touching markup.
 */
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
      viewBox="3 4 58 58"
      role="img"
      aria-label={title}
    >
      <polygon points="8,54 8,12 20,12 32,29 32,48 20,31 20,54" fill="var(--brand-cobalt)" />
      <polygon points="32,29 44,12 56,12 56,54 44,54 44,31 32,48" fill="var(--brand-coral)" />
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
