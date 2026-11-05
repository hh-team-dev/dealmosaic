/** An explicit, non-network fallback, never a tracking-host substitution.
 * Only use a public HTTPS merchant origin confirmed by BOTH the imported
 * campaign domain and the nested destination in its imported tracking URL.
 * Never accept a visitor-supplied destination, preserve affiliate parameters,
 * or fetch either URL. A homepage is not a guarantee of the advertised offer. */
export function merchantHome(domain: string | null | undefined, tracking: string | null | undefined): string | null {
  if (!domain || !tracking) return null;
  try {
    const canonical = new URL(/^[a-z]+:\/\//i.test(domain) ? domain : `https://${domain}`);
    if (!['http:', 'https:'].includes(canonical.protocol) || canonical.username || canonical.password || canonical.port) return null;
    const host = canonical.hostname.toLowerCase();
    if (!/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,63}$/.test(host)
      || /\.(?:local|localhost|internal|test|invalid|example)$/.test(host)
      || host.split('.').some(part => part.startsWith('xn--'))
      || ['linksredirect.com', 'linksredirect.in', 'cuelinks.com'].some(h => host === h || host.endsWith(`.${h}`))) return null;
    const network = new URL(tracking);
    if (network.protocol !== 'https:' || network.username || network.password) return null;
    const target = new URL(network.searchParams.get('url') || '');
    if (!['https:', 'http:'].includes(target.protocol) || target.username || target.password || target.port) return null;
    const base = host.replace(/^www\./, '');
    const destination = target.hostname.toLowerCase();
    if (destination !== base && !destination.endsWith(`.${base}`)) return null;
    return `https://${host}/`;
  } catch { return null; }
}
