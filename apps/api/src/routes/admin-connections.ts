import { Hono } from 'hono';
import { db, isRemote } from '../db/index.js';
import type { AppBindings } from '../middleware/session.js';
import { isConfigured } from '../lib/cuelinks.js';
import { activeTransport } from '../lib/mailer.js';
import { allConnectors, KNOWN_PLATFORMS } from '../connectors/index.js';
import { settings } from '../services/direct-shop.js';
import { buildDiscovery } from '../services/discover.js';
import { toApi, type CouponRow } from './coupons.js';
import { merchantHome } from '../lib/merchant-home.js';

/** Owner-only, read-only inventory. No upstream requests, campaign applications,
 * tracking visits, emails, credentials or financial details in this response. */
export const adminConnectionRoutes = new Hono<AppBindings>();
export const CONNECTION_CATEGORIES = [
  { id: 'products', name: 'Products & online shopping' },
  { id: 'grocery', name: 'Grocery, FMCG & quick commerce' },
  { id: 'hotels', name: 'Hotels & stays' },
  { id: 'dining', name: 'Dining, QSR & food delivery' },
  { id: 'travel', name: 'Flights, transport & experiences' },
  { id: 'other', name: 'Other services / needs classification' },
] as const;
type Category = typeof CONNECTION_CATEGORIES[number]['id'];
type Offer = CouponRow & { campaign_id: number | null; merchant_domain?: string | null };
type Campaign = { id: number; name: string; domain: string | null; access_status: string | null; campaign_type: string | null; synced_at: string | null; categories_json?: string | null; countries_json?: string | null };
export function campaignCategory(name: string, rows: Pick<Offer, 'platform_slug' | 'deal_group'>[], categories: string[] = []): { id: Category; basis: string } {
  const hotel = /\b(hotels?|stays?|agoda|trivago|booking\.com|treebo|fabhotels|oyo)\b/i;
  const dining = /\b(domino'?s?|pizza hut|kfc|mcdonald'?s?|burger king|chinese wok|barbeque nation|eatclub|eatsure|zomato|swiggy food)\b/i;
  if (rows.some(r => /^(cleartrip-hotels|itc-hotels)$/.test(r.platform_slug))) return { id: 'hotels', basis: 'Hotel promotion source used by the stays page' };
  if (hotel.test(name)) return { id: 'hotels', basis: 'Campaign-name classification; not proof of hotel API access' };
  if (dining.test(name)) return { id: 'dining', basis: 'Campaign-name classification; review mixed food/grocery campaigns' };
  const networkGroups = new Set<Category>();
  for (const label of categories.map(value => value.toLowerCase())) {
    const group: Category | null = /hotel|accommodation/.test(label) ? 'hotels'
      : /restaurant|dining/.test(label) ? 'dining' : /grocer|fmcg|quick.commerce/.test(label) ? 'grocery'
      : /travel|flight|transport|tour/.test(label) ? 'travel'
      : /fashion|apparel|clothing|beauty|health|electronic|mobile|computer|home|furniture|kid|baby|sport|jewel|accessor|footwear|retail|shopping|pet|gift|book|toy|lifestyle/.test(label) ? 'products' : null;
    if (group) networkGroups.add(group);
  }
  if (networkGroups.size === 1) return { id: [...networkGroups][0]!, basis: `Network categories: ${categories.join(', ')}` };
  if (networkGroups.size > 1 || categories.some(label => /food|beverage/i.test(label))) return { id: 'other', basis: `Mixed or broad network categories require review: ${categories.join(', ')}. Food alone does not distinguish groceries from restaurants.` };
  const counts = new Map<Category, number>();
  for (const r of rows) {
    const category: Category = r.deal_group === 'grocery' ? 'grocery' : r.deal_group === 'travel' ? 'travel'
      : ['fashion', 'electronics', 'beauty', 'kids', 'home'].includes(r.deal_group ?? '') ? 'products' : 'other';
    counts.set(category, (counts.get(category) ?? 0) + 1);
  }
  const largest = [...counts].sort((a, b) => b[1] - a[1])[0];
  if (largest) return { id: largest[0], basis: 'Main category of imported offers (including historical rows)' };
  return { id: 'other', basis: 'No reliable offer category stored; not guessed from a brand name' };
}

function readList(value?: string | null): string[] { try { const a: unknown = JSON.parse(value || 'null'); return Array.isArray(a) ? a.filter((v): v is string => typeof v === 'string').slice(0, 250) : []; } catch { return []; } }

adminConnectionRoutes.get('/', async c => {
  c.header('Cache-Control', 'private, no-store');
  const now = new Date().toISOString();
  const [campaigns, all, live, shop, fx] = await Promise.all([
    db.prepare('SELECT id, name, domain, access_status, campaign_type, synced_at, categories_json, countries_json FROM affiliate_campaigns').all() as Promise<Campaign[]>,
    db.prepare('SELECT campaign_id, platform_slug, campaign_name, deal_group FROM coupons').all() as unknown as Promise<Offer[]>,
    db.prepare(`SELECT c.*, a.domain AS merchant_domain, p.name AS platform_name FROM coupons c
      LEFT JOIN affiliate_campaigns a ON a.id = c.campaign_id LEFT JOIN platforms p ON p.slug = c.platform_slug
      WHERE c.trust_state IN ('listed','community_verified','moderator_verified')
      AND (c.expires_at IS NULL OR c.expires_at > ?) AND (c.starts_at IS NULL OR c.starts_at <= ?)
      ORDER BY c.created_at DESC`).all(now, now) as unknown as Promise<Offer[]>,
    settings(), db.prepare('SELECT MAX(fetched_at) AS checkedAt FROM exchange_rates').get(),
  ]);
  const homepage = new Set(buildDiscovery(live.slice(0, 2500).map(toApi), new Date(now)).sections.flatMap(s => s.items.map(o => o.id)));
  const byCampaign = new Map<number, Offer[]>();
  for (const offer of all) {
    if (offer.campaign_id == null) continue;
    const rows = byCampaign.get(offer.campaign_id) ?? []; rows.push(offer); byCampaign.set(offer.campaign_id, rows);
  }
  const known = new Set(campaigns.map(r => r.id));
  // An offer can reference a campaign absent from the cached access list. Keep
  // this visible as UNKNOWN, rather than silently counting it as approved.
  for (const [id, rows] of byCampaign) if (!known.has(id)) campaigns.push({ id, name: rows[0]?.campaign_name || `Campaign ${id}`, domain: null, access_status: null, campaign_type: null, synced_at: null });
  const hosts = new Map<string, number>();
  const inventory = campaigns.map(row => {
    const offers = live.filter(o => o.campaign_id === row.id);
    const categories = readList(row.categories_json);
    const countries = readList(row.countries_json);
    const category = campaignCategory(row.name, byCampaign.get(row.id) ?? [], categories);
    return { id: row.id, name: row.name, domain: row.domain, access: row.access_status || 'unknown', type: row.campaign_type || 'unknown', checkedAt: row.synced_at,
      category: category.id, categoryBasis: category.basis, networkCategories: categories, countries, countryEvidence: row.countries_json == null ? 'Not stored' : countries.includes('IN') ? 'India listed' : countries.length ? 'India not listed' : 'No country specified', publishedOffers: offers.length, homepageOffers: offers.filter(o => homepage.has(o.id)).length,
      directFallbacks: offers.filter(o => merchantHome(o.merchant_domain, o.tracking_url)).length,
      warning: row.id === 2516 ? 'Placement permission unresolved: Deals/Coupons restrictions apply. Not activated here.' : row.access_status !== 'open' && offers.length ? 'Published offers do not have open access confirmed in this cache. Review before assuming commission.' : null,
      offerPath: offers[0] ? '/deals?' + new URLSearchParams({ platform: offers[0].platform_slug }).toString() : null };
  }).sort((a, b) => b.publishedOffers - a.publishedOffers || a.name.localeCompare(b.name));
  for (const offer of live) { try { const h = new URL(offer.tracking_url || '').hostname; hosts.set(h, (hosts.get(h) || 0) + 1); } catch { /* separately counted below */ } }
  const category = c.req.query('category') || '';
  const access = c.req.query('access') || '';
  const published = c.req.query('published') || '';
  const country = c.req.query('country') || '';
  const q = (c.req.query('q') || '').trim().toLowerCase().slice(0, 100);
  const filtered = inventory.filter(r => (!category || r.category === category) && (!access || r.access === access)
    && (!country || (country === 'unknown' ? r.countries.length === 0 : r.countries.includes(country)))
    && (!published || (published === 'yes' ? r.publishedOffers > 0 : r.publishedOffers === 0))
    && (!q || `${r.name} ${r.domain || ''} ${r.id}`.toLowerCase().includes(q)));
  const page = Math.max(1, Math.min(Math.ceil(filtered.length / 30) || 1, Number.parseInt(c.req.query('page') || '1', 10) || 1));
  const directFallbacks = live.filter(o => merchantHome(o.merchant_domain, o.tracking_url)).length;
  const connectors = allConnectors().filter(x => x.slug !== 'demo');
  const services = [
    { category: 'shared', name: 'Cuelinks offers, campaigns & earnings API', status: isConfigured() ? 'Credentials configured' : 'Not configured', detail: 'Imported promotions and campaign access, not live product stock or room availability. Cache dates below are the last stored evidence; configuration alone does not prove current API health.' },
    ...connectors.map(x => ({ category: 'products', name: x.displayName, status: x.isConfigured() ? 'Configured · health not tested here' : 'Not configured', detail: 'Product-data connector. No network request is made by this overview; credential presence is not evidence of valid inventory or affiliate approval.' })),
    ...KNOWN_PLATFORMS.filter(p => p.slug !== 'ebay').map(p => ({ category: p.kind === 'qcommerce' ? 'grocery' : 'products', name: `${p.displayName} native price API`, status: 'No dedicated price API connected', detail: 'A coupon campaign, catalogue reference or external store link is not a live price, stock or PIN-serviceability integration. A generic licensed feed, if configured separately, must be checked for its actual platform coverage.' })),
    ...['Agoda', 'Booking.com', 'Skyscanner', 'Expedia'].map(name => ({ category: 'hotels', name: `${name} hotel inventory / rates`, status: 'Not connected', detail: 'No authorised hotel inventory adapter, live rate connection or completed access gate is recorded in this release. An affiliate promotion would not grant these API rights.' })),
    { category: 'hotels', name: 'Hotel directory & planning tools', status: 'Available · not live room search', detail: 'Curated venue records, provider promotions, manual quote comparison, budgets and checklists. No combined provider availability or comparable live room prices.' },
    { category: 'dining', name: 'Restaurant listings & reservations', status: 'Directory available · reservation API not connected', detail: 'Curated places, external venue links and eligible brand offers. No recorded direct venue fee agreements or live table-booking API.' },
    { category: 'own-shop', name: 'DealMosaic direct shop', status: shop.enabled ? 'Enabled in owner settings' : 'Paused in owner settings', detail: 'Owner-managed products and manual UPI workflow, separate from affiliate campaigns. No payment-gateway or courier API partnership is implied; inspect My shop for product, seller, payment and delivery readiness.' },
    { category: 'operations', name: 'Database', status: isRemote ? 'Turso connected for these reads' : 'Local test / development database', detail: 'This overview is built from database reads. No database address or token is exposed.' },
    { category: 'operations', name: 'Transactional email', status: activeTransport() === 'none' ? 'Not configured' : `${activeTransport()} configured`, detail: 'Transport configuration only; this page does not send an email or verify delivery.' },
    { category: 'operations', name: 'Frankfurter exchange-rate API', status: fx?.checkedAt ? 'Cached reference rates present' : 'No cached rates', detail: `Reference conversion, not checkout pricing. Last stored fetch: ${fx?.checkedAt || 'none'}. No refresh or paid service is triggered here.` },
    { category: 'operations', name: 'Maps / venue-source links', status: 'External links · not a hotel data API', detail: 'Opening a map or provider website is not a supplier agreement, licensed hotel inventory feed or payable referral by itself.' },
  ];
  return c.json({ generatedAt: now, services,
    summary: { cachedCampaigns: known.size, open: inventory.filter(r => r.access === 'open').length, pending: inventory.filter(r => r.access === 'pending').length, indiaOpen: inventory.filter(r => r.access === 'open' && r.countries.includes('IN')).length,
      notApplied: inventory.filter(r => r.access === 'not_applied').length, unknown: inventory.filter(r => r.access === 'unknown').length,
      publishedCampaigns: inventory.filter(r => r.publishedOffers > 0).length, publishedOfferRows: live.length, homepageOffers: homepage.size,
      homepageCampaigns: inventory.filter(r => r.homepageOffers > 0).length, directFallbacks,
      unconfirmedAccessOffers: live.filter(o => !inventory.some(r => r.id === o.campaign_id && r.access === 'open')).length,
      unlinkedOfferRows: live.filter(o => o.campaign_id == null).length },
    categories: CONNECTION_CATEGORIES.map(g => ({ ...g, campaigns: inventory.filter(r => r.category === g.id).length,
      open: inventory.filter(r => r.category === g.id && r.access === 'open').length,
      publishedCampaigns: inventory.filter(r => r.category === g.id && r.publishedOffers > 0).length,
      publishedOffers: inventory.filter(r => r.category === g.id).reduce((n, r) => n + r.publishedOffers, 0),
      homepageOffers: inventory.filter(r => r.category === g.id).reduce((n, r) => n + r.homepageOffers, 0) })),
    redirectHosts: [...hosts].map(([host, offers]) => ({ host, offers })),
    page, pageSize: 30, total: filtered.length, totalPages: Math.max(1, Math.ceil(filtered.length / 30)), rows: filtered.slice((page - 1) * 30, page * 30),
    scope: 'Read-only database snapshot. Cached campaigns are not the full worldwide network directory. Open means network-reported access, not blanket permission for every placement. Published rows are available to offer listings; duplicate codes and filters can reduce visible cards. Homepage counts use the same shelf builder as the public page, before its short public cache. Neither count proves a successful outbound visit, checkout verification or income. Categories use network metadata, imported offers or explicit name rules; unclassified campaigns stay separate.',
  });
});
