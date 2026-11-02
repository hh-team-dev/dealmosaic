import { useEffect } from 'react';

/**
 * Route-level SEO.
 *
 * Every page states its own title, description, canonical URL and structured
 * data. This is the technical half of findability: crawlers must get a unique,
 * accurate description of each page from the HTML, not a generic app shell.
 *
 * Honesty rules enforced here:
 *  - No `aggregateRating` is ever emitted. We do not own reviews, so claiming a
 *    star rating in structured data would be fabricating rich results.
 *  - `Product` markup lists offers with prices we actually hold, and states the
 *    price validity window.
 */

/**
 * The site's own origin, resolved at runtime.
 *
 * This used to be the hardcoded string 'https://dealmosaic.in' — a domain we do
 * not own and which does not resolve. Every page therefore declared a canonical
 * URL on a non-existent host while robots.txt and sitemap.xml pointed at
 * dealmosaic.pages.dev. Conflicting signals like that can suppress indexing
 * outright, so the SEO work was actively undone by one constant.
 *
 * Reading `location.origin` is correct in every environment by construction:
 * pages.dev today, a custom domain the day one exists, localhost in dev. No
 * rebuild, no config, nothing to forget. The build-time SITE_URL is kept as the
 * fallback for non-browser contexts (tests, prerender).
 */
function resolveOrigin(): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return process.env.SITE_URL ?? 'https://dealmosaic.pages.dev';
}

export const SITE_URL = resolveOrigin();
export const SITE_NAME = 'DEALMOSAIC';

export interface SeoProps {
  title: string;
  description: string;
  /** Path beginning with "/" — canonical is derived from it. */
  path: string;
  /** Set false for private/authenticated pages. */
  index?: boolean;
  jsonLd?: Record<string, unknown> | Array<Record<string, unknown>>;
  /** og:type */
  type?: 'website' | 'article' | 'product';
  /** Relative or absolute image URL. */
  image?: string;
}

function setMeta(attr: 'name' | 'property', key: string, content: string): void {
  let tag = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute(attr, key);
    document.head.appendChild(tag);
  }
  tag.setAttribute('content', content);
}

function setLink(rel: string, href: string): void {
  let tag = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!tag) {
    tag = document.createElement('link');
    tag.setAttribute('rel', rel);
    document.head.appendChild(tag);
  }
  tag.setAttribute('href', href);
}

const JSONLD_ID = 'dm-jsonld-route';

export function Seo({ title, description, path, index = true, jsonLd, type = 'website', image }: SeoProps) {
  const fullTitle = title.includes(SITE_NAME) ? title : `${title} · ${SITE_NAME}`;
  const canonical = `${SITE_URL}${path}`;
  const imageUrl = image ? (image.startsWith('http') ? image : `${SITE_URL}${image}`) : `${SITE_URL}/og.png`;

  useEffect(() => {
    document.title = fullTitle;
    setMeta('name', 'description', description);
    setMeta('name', 'robots', index ? 'index,follow,max-image-preview:large' : 'noindex,nofollow');
    setLink('canonical', canonical);

    setMeta('property', 'og:title', fullTitle);
    setMeta('property', 'og:description', description);
    setMeta('property', 'og:url', canonical);
    setMeta('property', 'og:type', type === 'product' ? 'product' : type);
    setMeta('property', 'og:site_name', SITE_NAME);
    setMeta('property', 'og:image', imageUrl);
    setMeta('property', 'og:locale', 'en_IN');
    setMeta('name', 'twitter:card', 'summary_large_image');
    setMeta('name', 'twitter:title', fullTitle);
    setMeta('name', 'twitter:description', description);
    setMeta('name', 'twitter:image', imageUrl);

    const previous = document.getElementById(JSONLD_ID);
    if (previous) previous.remove();

    if (jsonLd) {
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.id = JSONLD_ID;
      script.textContent = JSON.stringify(Array.isArray(jsonLd) ? jsonLd : [jsonLd]);
      document.head.appendChild(script);
    }

    return () => {
      // Leave the tags in place on unmount: the next route overwrites them, and
      // removing them mid-transition causes a flash of missing metadata.
    };
  }, [fullTitle, description, canonical, index, type, imageUrl, JSON.stringify(jsonLd)]);

  return null;
}

/* ------------------------------------------------------------------ */
/* Structured-data builders                                            */
/* ------------------------------------------------------------------ */

export function organizationJsonLd(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/brand/dm-icon-512.png`,
    description:
      'DEALMOSAIC compares the true landed cost of a product across Indian stores — item price, delivery, fees and taxes — and shows at most three ranked, commission-blind offers.',
    areaServed: { '@type': 'Country', name: 'India' },
    slogan: 'One search. Three real deals. Zero price surprises.',
  };
}

export function websiteJsonLd(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: SITE_URL,
    inLanguage: 'en-IN',
    potentialAction: {
      '@type': 'SearchAction',
      target: { '@type': 'EntryPoint', urlTemplate: `${SITE_URL}/search?q={search_term_string}` },
      'query-input': 'required name=search_term_string',
    },
  };
}

export function breadcrumbJsonLd(trail: Array<{ name: string; path: string }>): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: `${SITE_URL}${item.path}`,
    })),
  };
}

/**
 * Product markup built only from prices we actually hold. No rating, no review
 * count unless a platform genuinely published one — and then it is theirs, not
 * ours, which is why we omit it rather than implying endorsement.
 */
export function productJsonLd(opts: {
  name: string;
  description: string;
  brand: string;
  sku: string | null;
  gtin: string | null;
  mpn: string | null;
  category: string;
  offers: Array<{ platformName: string; priceMinor: number; url: string; inStock: boolean; observedAt: string }>;
  lowPriceMinor: number | null;
  highPriceMinor: number | null;
}): Record<string, unknown> {
  const base: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: opts.name,
    description: opts.description,
    brand: { '@type': 'Brand', name: opts.brand },
    category: opts.category,
  };
  if (opts.sku) base.sku = opts.sku;
  if (opts.gtin) base.gtin = opts.gtin;
  if (opts.mpn) base.mpn = opts.mpn;

  if (opts.offers.length > 0) {
    base.offers = opts.offers.map((o) => ({
      '@type': 'Offer',
      priceCurrency: 'INR',
      price: (o.priceMinor / 100).toFixed(2),
      availability: o.inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      url: o.url,
      seller: { '@type': 'Organization', name: o.platformName },
      priceValidUntil: new Date(Date.parse(o.observedAt) + 24 * 3600_000).toISOString().slice(0, 10),
    }));
  }
  return base;
}
