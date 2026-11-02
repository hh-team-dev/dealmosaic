import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Chrome } from '../components/PublicChrome';
import { Icon } from '../components/Icon';
import { Seo, breadcrumbJsonLd } from '../lib/seo';
import {
  daysLeft,
  discountLabel,
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
  const [merchants, setMerchants] = useState<MerchantView[]>([]);
  const [platform, setPlatform] = useState<string>('');
  const [q, setQ] = useState('');
  const [codesOnly, setCodesOnly] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

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
        limit: 120,
        signal: controller.signal,
      })
        .then((d) => setCoupons(d.coupons))
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
  }, [platform, q, codesOnly]);

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

  const withCodes = useMemo(() => coupons?.filter((c) => c.code).length ?? 0, [coupons]);

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
              Every code here <span className="deals-hero-accent">actually works</span>
            </h1>
            <p className="deals-hero-lede">
              Sourced from the stores themselves, never scraped from a coupon farm. Each one shows
              its expiry date, and codes that shoppers report as failing get retired automatically.
            </p>
            <div className="deals-hero-stats">
              <div className="deals-stat">
                <strong>{coupons === null ? '—' : coupons.length}</strong>
                <span>offers live now</span>
              </div>
              <div className="deals-stat">
                <strong>{coupons === null ? '—' : withCodes}</strong>
                <span>with a copyable code</span>
              </div>
              <div className="deals-stat">
                <strong>{merchants.length || '—'}</strong>
                <span>Indian stores</span>
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
              {merchants.slice(0, 18).map((m) => (
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

          {/* ---- Results ---- */}
          {error && (
            <div className="callout callout-danger">
              <p className="callout-title">Deals unavailable</p>
              <p>{error}</p>
            </div>
          )}

          {coupons === null && !error && (
            <div className="deals-grid" aria-busy="true">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="deals-skeleton" />
              ))}
            </div>
          )}

          {coupons !== null && coupons.length === 0 && !error && (
            <div className="empty-state">
              <p className="empty-state-title">No live deals match that</p>
              <p>
                We only list offers we can source from the store itself. Rather than pad this page
                with codes we cannot stand behind, we would rather show you nothing.
              </p>
              {(platform || q || codesOnly) && (
                <button
                  type="button"
                  className="btn btn-quiet"
                  onClick={() => {
                    setPlatform('');
                    setQ('');
                    setCodesOnly(false);
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
                which is why this list is shorter than theirs — and why the codes work.
              </li>
              <li>
                <strong>Failing codes retire themselves.</strong> After five failures that outweigh
                its successes, a code is withdrawn automatically.
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
  const isDealWithoutValue = !coupon.code && coupon.discountValue === 0;
  const urgent = days !== null && days <= 3;

  return (
    <article className={`deal-card${isCashback ? ' deal-card-cashback' : ''}`}>
      <div className="deal-card-top">
        <span className="deal-merchant">{coupon.platformName}</span>
        {!isDealWithoutValue && (
          <span className={`deal-badge${isCashback ? ' deal-badge-cashback' : ''}`}>
            {discountLabel(coupon)}
          </span>
        )}
        {isDealWithoutValue && <span className="deal-badge deal-badge-quiet">Deal</span>}
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
          href={`/?q=${encodeURIComponent(coupon.platformName)}`}
          
        >
          <span className="deal-code-value">See the offer</span>
          <span className="deal-code-action">
            <Icon name="arrow-right" size={15} />
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
        {coupon.successCount > 0 ? (
          <span className="deal-meta deal-meta-good">
            <Icon name="check" size={13} />
            {coupon.successCount} confirmed
          </span>
        ) : (
          <span className="deal-meta">Not yet tested by shoppers</span>
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
