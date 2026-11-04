import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Chrome } from '../components/PublicChrome';
import { Icon } from '../components/Icon';
import { ApiError } from '../lib/api';
import { inr } from '../lib/format';
import { getProduct, type ProductDetail } from '../lib/search-api';
import { Seo, breadcrumbJsonLd, productJsonLd, SITE_URL } from '../lib/seo';
import { CommunityPanel, CouponStrip, OfferList, PriceAlertForm, PriceChart } from '../components/ProductInsights';
import { DealsTicker } from '../components/DealsTicker';

/**
 * /p/:slug — the indexable product page.
 *
 * This is the page a search engine should rank: a stable URL, a real product
 * identity (brand, variant list, GTINs), an accurate description, and structured
 * data built only from prices we actually hold. The live comparison lives behind
 * /search, but the page is useful — and truthful — without an account.
 */
export default function Product() {
  const { slug = '' } = useParams();
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<{ status: 'loading' } | { status: 'ok'; data: ProductDetail } | { status: 'error'; notFound: boolean }>(
    { status: 'loading' },
  );

  useEffect(() => {
    let alive = true;
    setState({ status: 'loading' });
    getProduct(slug)
      .then((data) => alive && setState({ status: 'ok', data }))
      .catch((err) => alive && setState({ status: 'error', notFound: err instanceof ApiError && err.status === 404 }));
    return () => {
      alive = false;
    };
  }, [slug, attempt]);

  if (state.status === 'loading') {
    return (
      <Chrome>
        <div className="container section stack">
          <div className="skeleton skeleton-line" style={{ width: '40%' }} />
          <div className="skeleton skeleton-card" />
        </div>
      </Chrome>
    );
  }

  if (state.status === 'error') {
    return (
      <Chrome>
        <Seo title={state.notFound ? "Product not found" : "Product could not load"} description="Browse the DealMosaic catalogue or retry loading this product." path={`/p/${slug}`} index={false} />
        <div className="container section empty-state card card-lg stack">
          <Icon name="search" size={28} />
          <h1 className="h3">{state.notFound ? "We do not have that product" : "This product could not load"}</h1>
          <p className="muted">{state.notFound ? "It may not be in the catalogue yet. Try a search instead." : "Please check your connection and try again."}</p>
          {!state.notFound && <button className="btn btn-primary" onClick={() => setAttempt((value) => value + 1)}>Try again</button>}
          <Link className="btn btn-primary" to="/browse">
            Browse products
          </Link>
        </div>
      </Chrome>
    );
  }

  const { product, variants, disclosure, offersByVariant, history, community, coupons, notes, productOrigin } =
    state.data;
  const cheapest = variants.reduce<number | null>(
    (min, v) => (v.priceFromMinor === null ? min : min === null ? v.priceFromMinor : Math.min(min, v.priceFromMinor)),
    null,
  );

  const jsonLd = [
    breadcrumbJsonLd([
      { name: 'Home', path: '/' },
      { name: 'Browse', path: '/browse' },
      { name: product.category, path: `/c/${product.categorySlug}` },
      { name: product.title, path: `/p/${product.slug}` },
    ]),
    productJsonLd({
      name: product.title,
      description: product.description,
      brand: product.brand,
      sku: variants[0]?.mpn ?? null,
      gtin: variants[0]?.gtin ?? null,
      mpn: variants[0]?.mpn ?? null,
      category: product.category,
      // Only prices we actually hold. No invented offers, no ratings.
      offers: [],
      lowPriceMinor: cheapest,
      highPriceMinor: null,
    }),
  ];

  return (
    <>
      <Seo
        title={`${product.title} price comparison in India`}
        description={`Compare the real landed cost of ${product.title} across Indian stores. See every variant, delivery charges and fees itemised, with a commission-blind ranking.`}
        path={`/p/${product.slug}`}
        type="product"
        jsonLd={jsonLd}
      />
      <Chrome>
        <div className="container section stack-lg">
          <DealsTicker />
          <nav className="row wrap tiny muted" aria-label="Breadcrumb">
            <Link to="/">Home</Link>
            <span aria-hidden="true">/</span>
            <Link to="/browse">Browse</Link>
            <span aria-hidden="true">/</span>
            <Link to={`/c/${product.categorySlug}`}>{product.category}</Link>
          </nav>

          <header className="stack-sm">
            <span className="eyebrow">{product.brand}</span>
            <h1 className="h1">{product.title}</h1>
            <p className="lede">{product.description}</p>
            {cheapest !== null && (
              <p className="price-from">
                from <strong className="numeric">{inr(cheapest)}</strong>{' '}
                <span className="tiny muted">
                  {/* "observed across connected stores" was a claim about a
                      measurement. Until a retailer feed exists, the sentence has
                      to say what the number actually is. */}
                  {/* The chip is dropped here on purpose: the sentence beside the
                      number already says it, and the full caveat sits underneath.
                      Three statements of one fact read as panic. */}
                  {productOrigin?.origin === 'live' ? 'observed across connected stores' : 'illustrative price'}
                </span>
              </p>
            )}
            {productOrigin?.caveat && (
              <p className="tiny muted origin-caveat" role="note">
                {productOrigin.caveat}
              </p>
            )}
          </header>

          <section className="stack" aria-labelledby="variants-heading">
            <h2 id="variants-heading" className="h3">
              {variants.length} variant{variants.length === 1 ? '' : 's'}
            </h2>
            <p className="small muted">
              Each variant is compared separately. A 128 GB phone and a 256 GB phone are not the same product, and we
              never average them.
            </p>
            <ul className="variant-cards">
              {variants.map((v) => (
                <li key={v.id} className="variant-card card">
                  <div className="variant-head">
                    <div className="stack-sm" style={{ flex: 1 }}>
                      <strong>{v.label}</strong>
                      <span className="tiny muted">
                        {Object.entries(v.attributes)
                          .map(([k, value]) => `${k}: ${value}`)
                          .join(' · ')}
                      </span>
                      {v.gtin && <span className="tiny muted">GTIN {v.gtin}</span>}
                    </div>
                    <div className="stack-sm" style={{ alignItems: 'flex-end' }}>
                      {v.priceFromMinor !== null && (
                        <strong className="numeric">
                          {inr(v.priceFromMinor)}
                          {v.priceOrigin?.chip && <span className="origin-chip tiny">{v.priceOrigin.chip}</span>}
                        </strong>
                      )}
                      <span className="tiny muted">
                        {v.offerCount} offer{v.offerCount === 1 ? '' : 's'}
                      </span>
                    </div>
                    <Link
                      className="btn btn-primary btn-sm"
                      to={`/search?q=${encodeURIComponent(`${product.title} ${v.label}`)}&v=${v.id}`}
                    >
                      Compare
                    </Link>
                  </div>

                  {/* The offers behind the number, each labelled with its origin.
                      The commission line sits here, above the buttons it applies to,
                      rather than in a policy card further down the page. A disclosure
                      below the fold is not a disclosure. */}
                  <p className="commission-line">
                    Some store links earn us a commission. It never changes the order — ranking is commission-blind.
                  </p>
                  <OfferList offers={offersByVariant?.[v.id] ?? []} />

                  <div className="variant-extras">
                    <div className="variant-chart">
                      <h3 className="tiny muted" style={{ margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        Price history
                      </h3>
                      <PriceChart history={history?.[v.id]} label={`${product.title}, ${v.label}`} />
                    </div>
                    <PriceAlertForm variantId={v.id} variantLabel={v.label} currentPriceMinor={v.priceFromMinor} />
                  </div>
                </li>
              ))}
            </ul>
          </section>

          {coupons && coupons.length > 0 && <CouponStrip coupons={coupons} />}

          <CommunityPanel
            variantId={variants[0]?.id ?? ''}
            variantLabel={variants[0]?.label ?? product.title}
            reports={community ?? []}
            note={notes?.community ?? 'Shopper-reported prices, never merged into the ranked offers.'}
          />

          <section className="card card-tint stack-sm" aria-labelledby="how-heading">
            <h2 id="how-heading" className="h4">
              How this comparison works
            </h2>
            <p className="small">
              We itemise the landed cost — item price, delivery, fees, tax — and only call a total verified when every
              mandatory line is known. Three offers are shown, ranked by the real total, and commission is never an
              input to that order.
            </p>
            <div className="row wrap">
              <Link className="btn btn-ghost btn-sm" to="/how-we-rank">
                Read the ranking rules
              </Link>
              <Link className="btn btn-ghost btn-sm" to="/data-sources">
                Where the prices come from
              </Link>
            </div>
            <p className="tiny muted">{disclosure}</p>
          </section>

          <p className="tiny muted">
            Canonical URL: {SITE_URL}/p/{product.slug}
          </p>
        </div>
      </Chrome>
    </>
  );
}
