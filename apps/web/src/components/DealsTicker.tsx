import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listCoupons, discountLabel, type CouponView } from '../lib/coupons-api';

/**
 * Scrolling offer strip.
 *
 * Borrows the one thing every Indian e-commerce site gets right: a live band of
 * what is on offer, always moving, one tap from the full list. It is the cheapest
 * possible way to make a young site feel alive.
 *
 * Three deliberate choices:
 *  - **Fixed height.** The strip renders at its final size before data arrives, so
 *    it never causes layout shift. A ticker that pushes the page down is worse
 *    than no ticker.
 *  - **Motion is optional.** `prefers-reduced-motion` freezes the strip and turns
 *    it into a normal horizontally scrollable row. Animation that cannot be
 *    turned off is an accessibility failure, not a style.
 *  - **It goes quiet rather than lies.** If there are no verified offers, the strip
 *    does not render at all. An empty strip scrolling "no deals found" is worse
 *    than no strip.
 *
 * The track is duplicated once so the loop is seamless; the second copy is
 * hidden from screen readers so offers are not announced twice.
 */
export function DealsTicker() {
  const [coupons, setCoupons] = useState<CouponView[] | null>(null);

  useEffect(() => {
    let alive = true;
    listCoupons({ limit: 16, codesOnly: false })
      .then((d) => {
        if (alive) setCoupons(d.coupons.filter((c) => c.code || c.discountValue > 0).slice(0, 14));
      })
      .catch(() => alive && setCoupons([]));
    return () => {
      alive = false;
    };
  }, []);

  // Nothing to say → say nothing.
  if (!coupons || coupons.length < 3) return null;

  const items = coupons;

  const content = (hidden: boolean) => (
    <div className="ticker-track" aria-hidden={hidden || undefined}>
      {items.map((c) => (
        <Link key={`${c.id}${hidden ? '-b' : ''}`} to="/deals" className="ticker-item" tabIndex={hidden ? -1 : 0}>
          <span className="ticker-store">{c.platformName}</span>
          <span className="ticker-value">{discountLabel(c)}</span>
          <span className="ticker-title">{c.title}</span>
        </Link>
      ))}
    </div>
  );

  return (
    <aside className="ticker" aria-label="Live deals">
      <Link to="/deals" className="ticker-label">
        <span className="ticker-pulse" aria-hidden="true" />
        Live deals
      </Link>
      <div className="ticker-viewport">
        {content(false)}
        {content(true)}
      </div>
    </aside>
  );
}
