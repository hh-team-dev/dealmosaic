import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Chrome } from '../components/PublicChrome';
import { Icon } from '../components/Icon';
import { DemoFlag } from '../components/Ui';
import { DealCard } from '../components/DealCard';
import { Podium } from '../components/Podium';
import { OfferCard, OfferDeck } from '../components/OfferCard';
import { Seo, breadcrumbJsonLd, SITE_NAME } from '../lib/seo';
import { inr, relativeTime } from '../lib/format';
import { ApiError } from '../lib/api';
import { search, type Comparison, type NeedsSelection, type NoResults, type SearchOutcome } from '../lib/search-api';

/**
 * /search?q=...
 *
 * Three states, all honest:
 *  - comparison      → podium + three cards
 *  - needs_selection → ask which variant, never guess
 *  - no_results      → say nothing matched, do not invent a "closest match"
 */
export default function Search() {
  const [params, setParams] = useSearchParams();
  const query = params.get('q') ?? '';
  const [attempt, setAttempt] = useState(0);
  const variantId = params.get('v') ?? undefined;

  const [state, setState] = useState<
    { status: 'idle' } | { status: 'loading' } | { status: 'ok'; data: SearchOutcome } | { status: 'error'; error: string; gated?: boolean }
  >({ status: 'idle' });

  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!query) {
      setState({ status: 'idle' });
      return;
    }
    for (const el of Array.from(document.querySelectorAll('link[rel="canonical"], link[rel="prev"], link[rel="next"]'))) {
      el.remove();
    }
    // Search is deliberately open to everyone. No session probe is awaited here:
    // a signed-out visitor gets the same three deals, and waiting on auth only
    // delayed the one thing the site exists to do.
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setState({ status: 'loading' });
    search(query, variantId, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setState({ status: 'ok', data });
      })
      .catch((err: unknown) => {
        if ((err as Error).name === 'AbortError') return;
        const apiErr = err instanceof ApiError ? err : null;
        setState({
          status: 'error',
          error: apiErr?.message ?? 'Something went wrong. Please try again.',
          gated: apiErr?.status === 401 || apiErr?.code === 'email_unverified' || apiErr?.status === 403,
        });
      });

    return () => controller.abort();
  }, [query, variantId, attempt]);

  const chooseVariant = useCallback(
    (id: string) => {
      const next = new URLSearchParams(params);
      next.set('v', id);
      setParams(next, { replace: true });
    },
    [params, setParams],
  );

  const data = state.status === 'ok' ? state.data : null;
  const comparison = data?.kind === 'comparison' ? (data as Comparison) : null;

  return (
    <>
      <Seo
        title={query ? `${query} — price comparison` : 'Search prices'}
        description={
          query
            ? `Compare the true landed cost of ${query} across Indian stores. At most three ranked offers, delivery and fees included, with the reason each one ranked where it did.`
            : 'Search any product to compare its real landed cost across Indian stores.'
        }
        path={query ? `/search?q=${encodeURIComponent(query)}` : '/search'}
        // Query-string result pages are thin and volatile; the durable landing
        // surface for a product is its product page, so keep those indexed only.
        index={false}
        jsonLd={breadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: 'Search', path: '/search' },
        ])}
      />
      <Chrome>
        <div className="container search-shell">
          <SearchField initial={query} />

          {!query && (
            <div className="empty-state card card-lg stack">
              <Icon name="search" size={30} />
              <h1 className="h3">What are you buying?</h1>
              <p className="muted">
                Search a phone, a laptop, a bag of chips. We compare the total you actually pay — including delivery and
                fees — across up to four stores, and show you three.
              </p>
              <div className="row wrap center-row">
                {['Samsung Galaxy S25 Ultra 512GB', 'iPhone 16', 'Lay\u2019s Classic Salted 52 g', 'Amul Taaza milk'].map(
                  (s) => (
                    <Link key={s} className="chip" to={`/search?q=${encodeURIComponent(s)}`}>
                      {s}
                    </Link>
                  ),
                )}
              </div>
            </div>
          )}

          {state.status === 'loading' && <SearchSkeleton />}

          {state.status === 'error' && (
            <div className="empty-state card card-lg stack">
              <Icon name="lock" size={28} />
              <h1 className="h3">{state.gated ? 'Sign in to compare' : 'That search did not go through'}</h1>
              <p className="muted">{state.error}</p>
              {state.gated ? (
                <div className="row wrap center-row">
                  <Link className="btn btn-primary" to={`/login?next=${encodeURIComponent(`/search?q=${query}`)}`}>
                    Sign in
                  </Link>
                  <Link className="btn btn-ghost" to="/register">
                    Create a free account
                  </Link>
                </div>
              ) : (
                <button type="button" className="btn btn-ghost" onClick={() => setAttempt((value) => value + 1)}>
                  Try again
                </button>
              )}
            </div>
          )}

          {data?.kind === 'needs_selection' && <VariantChoice data={data as NeedsSelection} onChoose={chooseVariant} />}
          {data?.kind === 'no_results' && <NoMatches data={data as NoResults} />}
          {comparison && <ComparisonView comparison={comparison} />}
        </div>
      </Chrome>
    </>
  );
}

/* ------------------------------------------------------------------ */

function SearchField({ initial }: { initial: string }) {
  const [params, setParams] = useSearchParams();
  const [value, setValue] = useState(initial);

  useEffect(() => setValue(initial), [initial]);

  return (
    <form
      className="search-field"
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        const next = new URLSearchParams();
        if (value.trim()) next.set('q', value.trim());
        setParams(next);
      }}
    >
      <label className="sr-only" htmlFor="search-input">
        Search for a product
      </label>
      <span className="search-field-icon" aria-hidden="true">
        <Icon name="search" size={19} />
      </span>
      <input
        id="search-input"
        className="search-field-input"
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Phone, laptop, chips, soap, toothpaste…"
        autoComplete="off"
        enterKeyHint="search"
      />
      <button type="submit" className="btn btn-primary btn-sm search-field-submit">
        Compare
      </button>
    </form>
  );
}

function SearchSkeleton() {
  return (
    <div className="stack-lg" aria-busy="true" aria-live="polite">
      <span className="sr-only">Comparing prices…</span>
      <div className="skeleton skeleton-line" style={{ width: '46%' }} />
      <div className="offer-deck">
        {[0, 1, 2].map((i) => (
          <div key={i} className="skeleton skeleton-card" />
        ))}
      </div>
    </div>
  );
}

function VariantChoice({ data, onChoose }: { data: NeedsSelection; onChoose: (id: string) => void }) {
  return (
    <section className="card card-lg stack variant-choice" aria-labelledby="variant-title">
      <span className="badge badge-magenta">
        <Icon name="info" size={13} /> Which one exactly?
      </span>
      <h1 id="variant-title" className="h3">
        {data.product.title}
      </h1>
      <p className="muted">{data.reason}</p>

      <ul className="variant-list">
        {data.candidates.map((candidate) => (
          <li key={candidate.variantId}>
            <button type="button" className="variant-option" onClick={() => onChoose(candidate.variantId)}>
              <span className="variant-label">{candidate.label}</span>
              <span className="variant-attrs tiny muted">
                {Object.entries(candidate.attributes)
                  .map(([k, v]) => `${k}: ${v}`)
                  .join(' · ')}
              </span>
              <Icon name="chevron-right" size={16} />
            </button>
          </li>
        ))}
      </ul>

      <p className="tiny muted">
        We ask because prices differ between variants, and a comparison built on the wrong variant is worse than no
        comparison at all.
      </p>
    </section>
  );
}

function NoMatches({ data }: { data: NoResults }) {
  const offers = data.offers ?? [];

  return (
    <div className="stack-lg">
      {offers.length > 0 ? (
        <section className="stack" aria-labelledby="offer-listings-title">
          <div className="stack-sm">
            <span className="eyebrow">Live store listings</span>
            <h1 id="offer-listings-title" className="h2">
              Stores mentioning “{data.query}”
            </h1>
            <p className="muted" style={{ margin: 0 }}>
              {data.reason}
            </p>
          </div>
          <div className="discover" style={{ margin: 0 }}>
            <div className="shelf-row">
              {offers.map((deal) => (
                <DealCard key={deal.id} deal={deal} />
              ))}
            </div>
          </div>
          <p className="tiny muted">
            These are the store’s own words and their own stated price, if any. We have not compared
            them, because we have not confirmed they are the same product — and an unconfirmed
            comparison is how people buy the wrong size.
          </p>
        </section>
      ) : (
        <section className="empty-state card card-lg stack" aria-labelledby="no-results-title">
          <Icon name="search" size={28} />
          <h1 id="no-results-title" className="h3">
            No confirmed comparison for “{data.query}”
          </h1>
          <p className="muted">{data.reason}</p>
          <Link className="btn btn-primary" to="/deals">Explore current store offers</Link>
        </section>
      )}

      {data.suggestions.length > 0 && (
        <section className="stack-sm">
          <p className="small muted" style={{ margin: 0 }}>
            {offers.length > 0 ? 'Or compare one of these we do cover:' : 'Try one of these:'}
          </p>
          <div className="row wrap">
            {data.suggestions.map((s) => (
              <Link key={s.slug} className="chip" to={`/p/${s.slug}`}>
                {s.title}
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function ComparisonView({ comparison }: { comparison: Comparison }) {
  const best = comparison.offers.find((o) => o.rank === 1);

  return (
    <div className="stack-lg comparison">
      <header className="comparison-head">
        <div className="stack-sm">
          <div className="row wrap comparison-crumbs">
            <Link className="tiny muted" to={`/c/${comparison.product.categorySlug}`}>
              {comparison.product.category}
            </Link>
            <span className="tiny muted">/</span>
            <Link className="tiny muted" to={`/p/${comparison.product.slug}`}>
              {comparison.product.title}
            </Link>
          </div>
          <h1 className="h2">{comparison.product.title}</h1>
          <div className="row wrap">
            <span className="badge badge-ember">{comparison.variant.label}</span>
            {comparison.variant.gtin && <span className="badge badge-neutral">GTIN {comparison.variant.gtin}</span>}
            {comparison.variant.netQuantity && (
              <span className="badge badge-neutral">
                {comparison.variant.netQuantity}
                {comparison.variant.unit}
                {comparison.variant.packCount > 1 ? ` × ${comparison.variant.packCount}` : ''}
              </span>
            )}
            <span className="badge badge-neutral">{comparison.stats.observedOffers} offers observed</span>
          </div>
        </div>

        {best && (
          <div className="saving-summary">
            <span className="tiny muted">Spread between offers</span>
            <strong className="numeric">
              {comparison.stats.spreadMinor !== null ? inr(comparison.stats.spreadMinor) : '—'}
            </strong>
            {comparison.stats.maxSavingPct !== null && (
              <span className="tiny muted">{comparison.stats.maxSavingPct}% between the cheapest and dearest</span>
            )}
          </div>
        )}
      </header>

      {comparison.dataMode !== 'live' && <DemoFlag />}

      <Podium comparison={comparison} onSelect={() => undefined} />

      <section aria-labelledby="detail-title" className="stack">
        <h2 id="detail-title" className="h3">
          Every number, line by line
        </h2>
        <p className="small muted">
          Tap a card for the full break-up, the trust radar and the provenance record. Swipe on a phone.
        </p>
        <OfferDeck offers={comparison.offers} />
      </section>

      <div className="comparison-grid">
        {comparison.unitPrice && (
          <section className="card stack-sm" aria-labelledby="unit-title">
            <h2 id="unit-title" className="h4">
              Unit price
            </h2>
            <p className="unit-price numeric">
              {comparison.unitPrice.per100 !== null &&
                `${inr(comparison.unitPrice.per100)} per 100${comparison.unitPrice.unit}`}
            </p>
            <p className="tiny muted">{comparison.unitPrice.basis}</p>
            <p className="tiny muted">
              Pack sizes are not the same thing as value. Bigger is often cheaper per gram — and sometimes it is not.
            </p>
          </section>
        )}

        <section className="card stack-sm" aria-labelledby="stats-title">
          <h2 id="stats-title" className="h4">
            What we saw
          </h2>
          <dl className="stat-list">
            <div>
              <dt>Offers observed</dt>
              <dd className="numeric">{comparison.stats.observedOffers}</dd>
            </div>
            <div>
              <dt>Cheapest verified</dt>
              <dd className="numeric">
                {comparison.stats.cheapestVerifiedMinor !== null ? inr(comparison.stats.cheapestVerifiedMinor) : 'not established'}
              </dd>
            </div>
            <div>
              <dt>Median</dt>
              <dd className="numeric">{comparison.stats.medianMinor !== null ? inr(comparison.stats.medianMinor) : '—'}</dd>
            </div>
            <div>
              <dt>Could not be fully verified</dt>
              <dd className="numeric">{comparison.stats.unverifiedCount}</dd>
            </div>
          </dl>
        </section>

        {comparison.otherVariants.length > 0 && (
          <section className="card stack-sm" aria-labelledby="variants-title">
            <h2 id="variants-title" className="h4">
              Other variants
            </h2>
            <ul className="plain-list">
              {comparison.otherVariants.map((v) => (
                <li key={v.id}>
                  <Link to={`/search?q=${encodeURIComponent(comparison.product.title)}&v=${v.id}`}>{v.label}</Link>
                  <span className="tiny muted">
                    {' '}
                    · {v.offerCount} offer{v.offerCount === 1 ? '' : 's'}
                  </span>
                </li>
              ))}
            </ul>
            <p className="tiny muted">Different variant, different price. We never blend them into one number.</p>
          </section>
        )}

        <section className="card stack-sm" aria-labelledby="history-title">
          <h2 id="history-title" className="h4">
            Price history
          </h2>
          {comparison.history.length > 1 ? (
            <p className="small">
              {comparison.history.length} observations since{' '}
              {relativeTime(comparison.history[0]!.observedAt)}.
            </p>
          ) : (
            <p className="small muted">
              We started watching this product on{' '}
              {new Date(comparison.history[0]?.observedAt ?? comparison.resolvedAt).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
              . We will not draw a 12-month chart from data we do not have — the history begins when our watching begins.
            </p>
          )}
        </section>
      </div>

      <section className="disclosures card card-tint" aria-labelledby="disclosure-title">
        <h2 id="disclosure-title" className="h4">
          Read this before you buy
        </h2>
        <ul className="plain-list small">
          {comparison.disclaimers.map((d) => (
            <li key={d}>{d}</li>
          ))}
        </ul>
        <p className="tiny muted">
          {SITE_NAME} does not sell anything. Prices are observations, not offers, and a store may change a price before
          you reach checkout.
        </p>
      </section>
    </div>
  );
}
