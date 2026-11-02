import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  getDiscovery,
  type DiscoverPayload,
  type DiscoverSection,
} from '../lib/coupons-api';
import { useViewed } from '../lib/saved';
import { DealCard, DealCardSkeleton } from './DealCard';
import { Icon } from './Icon';

/**
 * THE DISCOVERY WALL — everything a visitor can enjoy without searching.
 *
 * Order is deliberate and follows shopper intent, not our inventory:
 *   1. today's best        — "there is something here, right now"
 *   2. biggest savings     — the reason deal sites exist
 *   3. price ceilings      — "I have ₹499, show me what I can get"
 *   4. category shelves    — intent without a product name
 *   5. bank/card/UPI       — the offer on top of the offer
 *   6. newly discovered    — proof the site is alive
 *   7. ending soon         — real urgency, only where a date exists
 *
 * NOTHING IS PADDED. The server decides which shelves have enough real rows and
 * omits the rest; the client renders what it receives and never invents a
 * placeholder deal to fill a row. On a thin day the wall is shorter and says so
 * instead of showing a fake.
 */
export function DiscoverShelves() {
  const [data, setData] = useState<DiscoverPayload | null>(null);
  const [failed, setFailed] = useState(false);
  const viewed = useViewed();

  useEffect(() => {
    const controller = new AbortController();
    getDiscovery(controller.signal)
      .then(setData)
      .catch((err: unknown) => {
        if ((err as Error).name === 'AbortError') return;
        // A missing shelf must never take the homepage down with it.
        setFailed(true);
      });
    return () => controller.abort();
  }, []);

  // While loading we show one shelf's worth of skeleton, not a spinner: the
  // layout must not move when the real cards arrive.
  if (!data && !failed) {
    return (
      <section className="section-tight discover">
        <div className="container">
          <div className="shelf-head">
            <div>
              <span className="eyebrow">Live offers</span>
              <h2>Loading today’s board…</h2>
            </div>
          </div>
          <div className="shelf-row">
            {[0, 1, 2, 3].map((i) => (
              <DealCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (failed || !data || data.sections.length === 0) return null;

  return (
    <section className="section-tight discover" id="discover">
      <div className="container">
        <div className="discover-intro">
          <div>
            <span className="eyebrow">Before you even search</span>
            <h2>What’s worth buying today</h2>
            <p className="lede" style={{ marginBottom: 8 }}>
              {data.totals.live.toLocaleString('en-IN')} live offers from {new Set(data.sections.flatMap((s) => s.items.map((i) => i.platformSlug))).size} stores, refreshed
              every few minutes. Every percentage and price below is the store’s own number — we add no
              markup, no padding and no invented countdowns.
            </p>
          </div>
          <div className="discover-stats">
            <span className="discover-stat">
              <strong>{data.totals.withCode}</strong>
              <span>with a code</span>
            </span>
            <span className="discover-stat">
              <strong>{data.totals.endingThisWeek}</strong>
              <span>ending this week</span>
            </span>
            <Link to="/deals" className="btn btn-primary">
              Browse all deals
            </Link>
          </div>
        </div>

        {viewed.length >= 3 && (
          <div className="shelf shelf-viewed">
            <div className="shelf-head">
              <div>
                <h3 className="shelf-title">Where you left off</h3>
                <p className="shelf-sub">Kept on this device only — no account, no tracking.</p>
              </div>
            </div>
            <div className="shelf-row shelf-row-compact">
              {viewed.slice(0, 6).map((v) => (
                <Link key={v.id} to="/deals" className="viewed-chip">
                  <span className="viewed-chip-title">{v.title}</span>
                  <span className="viewed-chip-meta">
                    {v.merchant}
                    {v.statedPercent ? ` · ${v.percentIsCap ? 'up to ' : ''}${v.statedPercent}% off` : ''}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {data.sections.map((section) => (
          <Shelf key={section.id} section={section} />
        ))}
      </div>
    </section>
  );
}

function Shelf({ section }: { section: DiscoverSection }) {
  const rowRef = useRef<HTMLDivElement>(null);
  const [atEnd, setAtEnd] = useState(false);

  function scrollBy(direction: 1 | -1): void {
    const el = rowRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * Math.max(240, el.clientWidth * 0.8), behavior: 'smooth' });
  }

  return (
    <div className="shelf">
      <div className="shelf-head">
        <div>
          <h3 className="shelf-title">{section.title}</h3>
          <p className="shelf-sub">{section.subtitle}</p>
        </div>
        <div className="shelf-nav">
          <button
            type="button"
            className="shelf-arrow"
            aria-label={`Scroll ${section.title} left`}
            onClick={() => scrollBy(-1)}
          >
            <Icon name="chevron-right" size={16} className="flip-x" />
          </button>
          <button
            type="button"
            className="shelf-arrow"
            aria-label={`Scroll ${section.title} right`}
            onClick={() => scrollBy(1)}
            disabled={atEnd}
          >
            <Icon name="chevron-right" size={16} />
          </button>
          <Link className="shelf-all" to={section.href}>
            See all
          </Link>
        </div>
      </div>
      <div
        className="shelf-row"
        ref={rowRef}
        onScroll={(e) => {
          const el = e.currentTarget;
          setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 8);
        }}
      >
        {section.items.map((deal) => (
          <DealCard key={deal.id} deal={deal} />
        ))}
      </div>
    </div>
  );
}
