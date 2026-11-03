import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Chrome } from '../components/PublicChrome';
import { Icon } from '../components/Icon';
import { ClaimBadge, ConfidenceLine } from '../components/DealFacts';
import { Seo, breadcrumbJsonLd } from '../lib/seo';
import {
  daysLeft,
  listCoupons,
  listMerchants,
  type CouponView,
  type MerchantView,
} from '../lib/coupons-api';

/**
 * /deals — the coupon and discount page.
 *
 * Design intent: this is the page people screenshot and send to a friend. So it
 * leads with the *code*, not the product photo — the code is the thing with
 * value. Everything else supports it: what you save, where, until when, and
 * whether anyone has actually used it.
 *
 * Three honesty rules are visible in the markup, not buried in a policy page:
 *  1. Cashback is never shown as money off. It arrives later and can be refused,
 *     so it gets a different colour and an explicit label.
 *  2. A "deal" with no stated rupee value says "from ₹X", never "₹0 off" — a
 *     zero discount badge would be a lie dressed as data.
 *  3. Expiry is shown on everything that has one, because urgency we invent is
 *     manipulation and urgency that is real is information.
 */
export default function Deals() {
  const [coupons, setCoupons] = useState<CouponView[] | null>(null);
  const [totals, setTotals] = useState<{
    live: number;
    withCode: number;
    stores: number;
    filtered?: boolean;
  } | null>(null);
  const [merchants, setMerchants] = useState<MerchantView[]>([]);
  /**
   * The homepage shelves link here with a filter already applied
   * (`?maxPrice=499`, `?group=grocery`, `?expiring=7`, …). Reading the URL instead
   * of component state means the link a shopper shares, the page a crawler
   * indexes and the page a human sees are all the same page — and the back
   * button behaves.
   */
  const [params, setParams] = useSearchParams();
  const platform = params.get('platform') ?? '';
  const group = params.get('group') ?? '';
  const maxPrice = Number(params.get('maxPrice') ?? '') || 0;
  const expiring = Number(params.get('expiring') ?? '') || 0;
  const bankOnly = params.get('bank') === '1';
  const sortParam = (params.get('sort') ?? '') as '' | 'savings' | 'price' | 'new' | 'ending';
  const [q, setQ] = useState('');
  const codesOnly = params.get('codes') === '1';
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const setParam = useCallback(
    (key: string, value: string | null) => {
      const next = new URLSearchParams(params);
      if (value) next.set(key, value);
      else next.delete(key);
      setParams(next, { replace: true });
    },
    [params, setParams],
  );

  const setPlatform = useCallback((slug: string) => setParam('platform', slug || null), [setParam]);
  const setCodesOnly = useCallback(
    (next: boolean | ((v: boolean) => boolean)) => {
      const value = typeof next === 'function' ? next(codesOnly) : next;
      setParam('codes', value ? '1' : null);
    },
    [codesOnly, setParam],
  );

  useEffect(() => {
    listMerchants()
      .then((m) => setMerchants(m.merchants))
      .catch(() => setMerchants([]));
  }, []);

  useEffect(() => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setCoupons(null);
    setError(null);
    const timer = setTimeout(() => {
      listCoupons({
        platform: platform || undefined,
        q: q.trim() || undefined,
        codesOnly,
        group: group || undefined,
        maxPrice: maxPrice || undefined,
        expiring: expiring || undefined,
        bankOnly,
        sort: sortParam || undefined,
        limit: 200,
        signal: controller.signal,
      })
        .then((d) => {
          setCoupons(d.coupons);
          if (d.totals) setTotals(d.totals);
        })
        .catch((err: unknown) => {
          if ((err as Error).name === 'AbortError') return;
          setError('Could not load deals just now. Try again in a moment.');
          setCoupons([]);
        });
    }, q ? 250 : 0); // debounce typing, never delay a filter tap
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [platform, q, codesOnly, group, maxPrice, expiring, bankOnly, sortParam]);

  const copy = useCallback(async (c: CouponView) => {
    if (!c.code) return;
    try {
      await navigator.clipboard.writeText(c.code);
      setCopied(c.id);
      setTimeout(() => setCopied((prev) => (prev === c.id ? null : prev)), 1800);
    } catch {
      // Clipboard needs a secure context and permission; the code is visible
      // anyway, so a failure here is not worth an error dialog.
    }
  }, []);

  /**
   * Counts come from the server over the whole table. The page request is capped
   * at 200 rows, so counting what arrived would print "200 offers live now" while
   * 1,089 were live — a confident, checkable falsehood on the busiest page.
   */
  /**
   * `filtered` is derived from the same place the request is built, so the wording
   * can never describe a filtered list as the whole inventory.
   */
  const filtered = Boolean(platform || group || maxPrice || expiring || bankOnly || q.trim());

  return (
    <>
      <Seo
        title="Today's best coupon codes and deals across Indian stores"
        description="Verified coupon codes and real discounts from Indian stores — Tata Cliq, Myntra, Croma, Nykaa, Vijay Sales and more. Every code shows its expiry and how many shoppers confirmed it."
        path="/deals"
        jsonLd={breadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: 'Deals', path: '/deals' },
        ])}
      />
      <Chrome>
        <div className="container section stack-lg">
          {/* ---- Hero: the promise, and the count that backs it ---- */}
          <header className="deals-hero">
            <span className="deals-hero-kicker">
              <Icon name="tag" size={14} /> Live offers
            </span>
            <h1 className="deals-hero-title">
              Every code here is <span className="deals-hero-accent">live right now</span>
            </h1>
            {/*
              Four sentences became two. The detail did not disappear — it is in the
              rules block at the foot of the page and in the disclosure page — but a
              hero that reads as a paragraph pushes every offer below the fold.
            */}
            <p className="deals-hero-lede">
              Straight from the stores&apos; own campaign feeds, never scraped from a coupon farm.
              Each expiry is the one the store published, and no code is called tested unless it was.
            </p>
            {/*
              The counters describe the list underneath them, filters included. They
              used to describe the whole table, so choosing "Klook" printed 289
              "with a copyable code" above 22 Klook offers — a true number used to
              answer a different question, which is how a page starts lying without
              containing a single false statement.
            */}
            <div className="deals-hero-stats">
              <div className="deals-stat">
                <strong>{totals ? totals.live.toLocaleString('en-IN') : '—'}</strong>
                <span>{filtered ? 'matching offers' : 'offers live now'}</span>
              </div>
              <div className="deals-stat">
                <strong>{totals ? totals.withCode.toLocaleString('en-IN') : '—'}</strong>
                <span>with a copyable code</span>
              </div>
              <div className="deals-stat">
                <strong>{totals ? totals.stores.toLocaleString('en-IN') : merchants.length || '—'}</strong>
                <span>{filtered ? 'store(s) in this view' : 'Indian stores'}</span>
              </div>
            </div>
          </header>

          {/* ---- Filters ---- */}
          <div className="deals-controls">
            <label className="deals-search">
              <Icon name="search" size={18} />
              <input
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search a store or an offer…"
                aria-label="Search deals"
              />
              {q && (
                <button type="button" className="deals-search-clear" onClick={() => setQ('')} aria-label="Clear search">
                  ×
                </button>
              )}
            </label>
            <button
              type="button"
              className={`deals-toggle${codesOnly ? ' is-on' : ''}`}
              onClick={() => setCodesOnly((v) => !v)}
              aria-pressed={codesOnly}
            >
              <Icon name="tag" size={15} />
              Codes only
            </button>
          </div>

          {merchants.length > 0 && (
            <div className="deals-chips" role="group" aria-label="Filter by store">
              <button
                type="button"
                className={`deals-chip${!platform ? ' is-active' : ''}`}
                onClick={() => setPlatform('')}
              >
                All stores
              </button>
              {merchants.slice(0, 24).map((m) => (
                <button
                  key={m.slug}
                  type="button"
                  className={`deals-chip${platform === m.slug ? ' is-active' : ''}`}
                  onClick={() => setPlatform(platform === m.slug ? '' : m.slug)}
                >
                  {m.name}
                  <span className="deals-chip-n">{m.total}</span>
                </button>
              ))}
            </div>
          )}

          {/* ---- Active shelf: say out loud why this list looks the way it does ---- */}
          {(group || maxPrice || expiring || bankOnly || sortParam) && (
            <div className="deals-active">
              <span className="deals-active-label">
                <Icon name="tag" size={14} />
                {maxPrice
                  ? `Offers with a stated price under ₹${maxPrice}`
                  : group
                    ? `Offers in ${group.replace(/^\w/, (m) => m.toUpperCase())}`
                    : expiring
                      ? `Ending within ${expiring} days`
                      : bankOnly
                        ? 'Bank, card and UPI offers'
                        : sortParam === 'new'
                          ? 'Newest offers first'
                          : 'Biggest stated savings first'}
              </span>
              <button
                type="button"
                className="deals-chip"
                onClick={() => setParams(new URLSearchParams(), { replace: true })}
              >
                Clear
              </button>
            </div>
          )}

          {/* ---- Results ---- */}
          {error && (
            <div className="callout callout-danger">
              <p className="callout-title">Deals unavailable</p>
              <p>{error}</p>
            </div>
          )}

          {coupons === null && !error && (
            <>
              <p className="deals-loading" role="status">
                Loading the live list…
              </p>
              {/*
                Six equal placeholders. They used to be one fixed 232 px block
                repeated in a two-column grid, so a filtered reload painted a
                checkerboard of unrelated boxes next to the real card heights and
                read as a broken layout rather than a loading state. The height now
                comes from the card itself (aspect-ratio in CSS).
              */}
              <div className="deals-grid" aria-busy="true" aria-live="polite">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="deals-skeleton" />
                ))}
              </div>
            </>
          )}

          {coupons !== null && coupons.length === 0 && !error && (
            <div className="empty-state">
              <p className="empty-state-title">Nothing live for that filter</p>
              <p>
                Try a different store or clear the filters. We only list offers sourced from the
                store itself, so the list is shorter than a coupon aggregator&apos;s — and unlike
                theirs, the codes work.
              </p>
              {(platform || q || codesOnly || group || maxPrice || expiring || bankOnly) && (
                <button
                  type="button"
                  className="btn btn-quiet"
                  onClick={() => {
                    setQ('');
                    setParams(new URLSearchParams(), { replace: true });
                  }}
                >
                  Clear filters
                </button>
              )}
            </div>
          )}

          {coupons !== null && coupons.length > 0 && (
            <div className="deals-grid">
              {coupons.map((c) => (
                <CouponCard key={c.id} coupon={c} copied={copied === c.id} onCopy={() => copy(c)} />
              ))}
            </div>
          )}

          {/* ---- The rules, stated where people actually read them ---- */}
          <section className="deals-rules">
            <h2 className="h3">How we treat these numbers</h2>
            <ul className="plain-list">
              <li>
                <strong>Cashback is not a discount.</strong> Cashback arrives days later and can be
                refused, so it is never subtracted from a price you pay at checkout. Where we show
                it, it is labelled separately for that reason.
              </li>
              <li>
                <strong>Only sourced offers.</strong> Every code comes from the merchant&apos;s own
                campaign data through an affiliate network. We do not copy from coupon aggregators,
                which is why this list is shorter than theirs. Coming from the merchant is evidence
                that a code exists — not evidence that it works, so each card says which of the two
                we actually know.
              </li>
              <li>
                <strong>Codes mostly failing get withdrawn.</strong> Five reports from different
                shoppers, with failures outweighing successes, take a code off the site. A person on
                this team can also retire one directly.
              </li>
              <li>
                <strong>We earn a commission.</strong> If you buy through a link here, the store pays
                us a small percentage at no extra cost to you. It never affects which offers appear
                or how they are ordered.{" "}
                <Link to="/disclosure">Full disclosure</Link>.
              </li>
            </ul>
          </section>
        </div>
      </Chrome>
    </>
  );
}

function CouponCard({
  coupon,
  copied,
  onCopy,
}: {
  coupon: CouponView;
  copied: boolean;
  onCopy: () => void;
}) {
  const days = daysLeft(coupon.expiresAt);
  const isCashback = coupon.discountType === 'cashback';
  const urgent = days !== null && days <= 3;

  return (
    <article className={`deal-card${isCashback ? ' deal-card-cashback' : ''}`}>
      <div className="deal-card-top">
        <span className="deal-merchant">{coupon.platformName}</span>
        <ClaimBadge coupon={coupon} />
      </div>

      <h3 className="deal-title">{coupon.title}</h3>

      {coupon.description && <p className="deal-desc">{coupon.description}</p>}

      {coupon.code ? (
        <button
          type="button"
          className={`deal-code${copied ? ' is-copied' : ''}`}
          onClick={onCopy}
          aria-label={`Copy code ${coupon.code}`}
        >
          {/*
            The whole code, always. It used to be a single ellipsised line in a
            0.95 rem monospace face, so `ALLSTARSDIWALOFFER` arrived on screen as
            `ALLSTARSDIWAL…` — the one piece of information on the card that a
            shopper has to copy by hand was the one being cut off. It now wraps.
          */}
          <span className="deal-code-value">{coupon.code}</span>
          <span className="deal-code-action">
            {copied ? (
              <>
                <Icon name="check" size={15} /> Copied
              </>
            ) : (
              <>
                <Icon name="copy" size={15} /> Copy
              </>
            )}
          </span>
        </button>
      ) : (
        <a
          className="deal-code deal-code-link"
          // The offer lives at the merchant. The old target was the homepage with
          // a query string, which is a dead end dressed as a link.
          href={coupon.outboundUrl ?? `/deals?platform=${encodeURIComponent(coupon.platformSlug)}`}
          {...(coupon.outboundUrl
            ? { target: '_blank', rel: 'sponsored nofollow noopener noreferrer' }
            : {})}
        >
          <span className="deal-code-value">See the offer</span>
          <span className="deal-code-action">
            <Icon name="external" size={15} />
          </span>
        </a>
      )}

      <div className="deal-card-foot">
        {days === null ? (
          <span className="deal-meta">No expiry listed</span>
        ) : (
          <span className={`deal-meta${urgent ? ' deal-meta-urgent' : ''}`}>
            <Icon name="clock" size={13} />
            {days === 0 ? 'Ends today' : `${days} day${days === 1 ? '' : 's'} left`}
          </span>
        )}
        <ConfidenceLine coupon={coupon} />
        {/*
          Only the positive case earns a line here. Saying "not yet tested by
          shoppers" underneath an evidence line that already reads "Not yet
          reported" is the same sentence twice, and repetition reads as emphasis —
          which would make silence feel like a warning.
        */}
        {coupon.successCount > 0 && (
          <span className="deal-meta deal-meta-good">
            <Icon name="check" size={13} />
            {coupon.successCount} confirmed
          </span>
        )}
      </div>

      {isCashback && (
        <p className="deal-cashback-note">
          Cashback, not a discount — credited after delivery, so it is not taken off the price you pay.
        </p>
      )}
      {coupon.terms && <p className="deal-terms">{coupon.terms}</p>}
    </article>
  );
}
