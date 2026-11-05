import { Link } from 'react-router-dom';

/** Direct merchant homepages arrive from the API's campaign/destination match.
 * They never call /api/go, never invent an affiliate click and never replace the
 * main sponsored route. Check again here because saved items can outlive a build. */
export function safeMerchantHome(value?: string | null): string | null {
  try {
    const u = new URL(value || '');
    return u.protocol === 'https:' && !u.username && !u.password && !u.port && u.pathname === '/' && !u.search && !u.hash
      && /^(?:[a-z0-9-]+\.)+[a-z]{2,63}$/i.test(u.hostname) ? u.href : null;
  } catch { return null; }
}
export function StoreFallback({ id, merchantHomeUrl, showHelp = false }: { id: string; merchantHomeUrl?: string | null; showHelp?: boolean }) {
  const home = safeMerchantHome(merchantHomeUrl);
  return <div className="store-fallback">
    {home && <><a className="tiny store-link-help" href={home} target="_blank" rel="nofollow noopener noreferrer">Store not opening? Open its homepage</a><span className="tiny muted">Direct route · offer-specific pricing may differ.</span></>}
    {(showHelp || !home) && <Link className="tiny store-link-help" to={`/store-link-help?offer=${encodeURIComponent(id)}`}>Keep your code & get link help</Link>}
  </div>;
}
