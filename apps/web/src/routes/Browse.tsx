import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Chrome } from '../components/PublicChrome';
import { Icon } from '../components/Icon';
import { inr } from '../lib/format';
import { listCategories, listProducts, type ProductSummary } from '../lib/search-api';
import { Seo, breadcrumbJsonLd } from '../lib/seo';

type Category = { name: string; slug: string; productCount: number; isGrocery: boolean };

/** /browse and /c/:slug — category hubs, the crawl path into product pages. */
export default function Browse() {
  const { slug } = useParams();
  const [products, setProducts] = useState<ProductSummary[] | null>(null);
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    setProducts(null);
    Promise.all([listProducts({ category: slug, limit: 120 }), listCategories()])
      .then(([p, c]) => {
        if (!alive) return;
        setProducts(p.products);
        setCategories(c.categories);
      })
      .catch(() => alive && setError(true));
    return () => {
      alive = false;
    };
  }, [slug]);

  const active = categories?.find((c) => c.slug === slug);
  const heading = slug ? (active?.name ?? 'Category') : 'Every product we compare';
  const path = slug ? `/c/${slug}` : '/browse';

  return (
    <>
      <Seo
        title={slug ? `${heading} price comparison in India` : 'Browse products and compare real prices'}
        description={
          slug
            ? `Compare the landed cost of ${heading.toLowerCase()} across Indian stores — delivery and fees included, at most three ranked offers.`
            : 'Browse every product DEALMOSAIC compares, across electronics, grocery, personal care and more. Honest totals, no price surprises.'
        }
        path={path}
        jsonLd={breadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: 'Browse', path: '/browse' },
          ...(slug ? [{ name: heading, path }] : []),
        ])}
      />
      <Chrome>
        <div className="container section stack-lg">
          <header className="stack-sm">
            <span className="eyebrow">{slug ? 'Category' : 'Catalogue'}</span>
            <h1 className="h1">{heading}</h1>
            <p className="lede">
              {products === null
                ? 'Loading the catalogue…'
                : `${products.length} product${products.length === 1 ? '' : 's'}, each compared variant by variant.`}
            </p>
          </header>

          {categories && (
            <nav className="row wrap" aria-label="Categories">
              <Link className={`chip${!slug ? ' is-active' : ''}`} to="/browse">
                All
              </Link>
              {categories.map((c) => (
                <Link key={c.slug} className={`chip${c.slug === slug ? ' is-active' : ''}`} to={`/c/${c.slug}`}>
                  {c.isGrocery ? '\u{1F96C} ' : ''}
                  {c.name}
                  <span className="chip-count">{c.productCount}</span>
                </Link>
              ))}
            </nav>
          )}

          {error && (
            <div className="empty-state card stack">
              <Icon name="warn" size={24} />
              <p>The catalogue did not load. Please try again.</p>
            </div>
          )}

          {products === null && !error && (
            <div className="product-grid" aria-busy="true">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="skeleton skeleton-card" />
              ))}
            </div>
          )}

          {products && products.length === 0 && (
            <div className="empty-state card stack">
              <Icon name="box" size={24} />
              <p>Nothing in this category yet.</p>
              <Link className="btn btn-ghost btn-sm" to="/browse">
                See everything
              </Link>
            </div>
          )}

          {products && products.length > 0 && (
            <ul className="product-grid">
              {products.map((p) => (
                <li key={p.id}>
                  <Link to={`/p/${p.slug}`} className="product-tile card">
                    <span className="tile-brand tiny">{p.brand}</span>
                    <strong className="tile-title">{p.title}</strong>
                    <span className="tiny muted">
                      {p.variantCount} variant{p.variantCount === 1 ? '' : 's'} · {p.category}
                    </span>
                    <span className="tile-price numeric">
                      {p.priceFromMinor !== null
                        ? `from ${inr(p.priceFromMinor)}`
                        : p.mrpFromMinor
                          ? `MRP ${inr(p.mrpFromMinor)}`
                          : 'no price yet'}
                    </span>
                    {/*
                      A price with no origin on it is a price pretending to be a
                      quote. Illustrative prices get a chip on every card, including
                      the ones nobody clicks.
                    */}
                    {p.priceOrigin?.chip && <span className="tile-origin tiny">{p.priceOrigin.chip}</span>}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Chrome>
    </>
  );
}
