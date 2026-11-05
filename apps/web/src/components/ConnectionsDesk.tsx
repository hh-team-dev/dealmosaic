import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../lib/api';

type Service = { category: string; name: string; status: string; detail: string };
type Category = { id: string; name: string; campaigns: number; open: number; publishedCampaigns: number; publishedOffers: number; homepageOffers: number };
type Campaign = { id: number; name: string; domain: string | null; access: string; type: string; checkedAt: string | null; category: string; categoryBasis: string; networkCategories: string[]; countries: string[]; countryEvidence: string; publishedOffers: number; homepageOffers: number; directFallbacks: number; warning: string | null; offerPath: string | null };
type Payload = { generatedAt: string; services: Service[]; summary: Record<string, number>; categories: Category[]; redirectHosts: { host: string; offers: number }[]; page: number; totalPages: number; total: number; rows: Campaign[]; scope: string };
const number = (n?: number) => (n ?? 0).toLocaleString('en-IN');
const date = (s: string | null) => s ? new Date(s).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : 'No stored check';
const accessName = (s: string) => ({ open: 'Open access reported', pending: 'Approval pending', not_applied: 'Not applied', unknown: 'Access not confirmed' })[s] || s;

export default function ConnectionsDesk() {
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [category, setCategory] = useState('');
  const [access, setAccess] = useState('');
  const [published, setPublished] = useState('');
  const [country, setCountry] = useState('');
  const [draft, setDraft] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    const controller = new AbortController(); setBusy(true); setError('');
    const params = new URLSearchParams({ category, access, published, country, q, page: String(page) });
    apiRequest<Payload>(`/api/admin/connections?${params}`, { signal: controller.signal })
      .then(value => { if (!controller.signal.aborted) setData(value); })
      .catch(e => { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : 'Could not read the inventory.'); })
      .finally(() => { if (!controller.signal.aborted) setBusy(false); });
    return () => controller.abort();
  }, [category, access, published, country, q, page, reload]);
  function selectCategory(value: string) { setCategory(value); setPage(1); }
  const groups = data ? [{ id: 'shared', name: 'Shared affiliate network' }, ...data.categories,
    { id: 'own-shop', name: 'Your own shop' }, { id: 'operations', name: 'Website support services' }] : [];
  return <div className="stack stack-lg connections-desk">
    <header className="stack"><span className="eyebrow">Owner’s connection desk</span><h2>What is connected, approved and actually shown?</h2>
      <p>Connected, approved and published are separate. A listed offer or click is not an earning.</p>
      <div className="row wrap"><button type="button" className="btn btn-ghost" disabled={busy} onClick={() => setReload(n => n + 1)}>Refresh stored inventory</button><Link className="btn btn-quiet" to="/admin?tab=campaigns&inventory=network">Read current network campaigns</Link><Link className="btn btn-quiet" to="/admin?tab=revenue">Check earnings separately</Link></div>
      {data && <p className="tiny muted">Database snapshot: {date(data.generatedAt)}. Refresh does not apply to campaigns, send messages, visit store links or spend money.</p>}
    </header>
    {busy && <p role="status">Reading your connection inventory…</p>}
    {error && <div role="alert" className="callout callout-danger"><p>{error} {data ? 'The figures below are the previous snapshot, not a fresh result.' : ''}</p><button className="btn btn-ghost" onClick={() => setReload(n => n + 1)}>Try again</button></div>}
    {data && <>
      <section className="card stack"><h3>1. APIs & tie-ups</h3><p className="small">Open a category to see its actual connection status. A name shown here is not a claim of partnership.</p>
        {groups.map(group => {
          const services = data.services.filter(s => s.category === group.id);
          if (!services.length) return null;
          return <details key={group.id} open={group.id === 'shared'} className="connection-group"><summary><strong>{group.name}</strong> · {services.length} services</summary><div className="stack">{services.map(service => <article className="connection-service stack" key={service.name}><h4>{service.name}</h4><strong className="small">{service.status}</strong><p className="small muted">{service.detail}</p></article>)}</div></details>;
        })}
        <div className="callout"><strong>Hotels, in one sentence:</strong><p>Customers can browse curated places and use planning tools today; they cannot yet see combined live Agoda, Booking.com or Skyscanner room results. Ordinary venue links and planning tools do not automatically earn commission.</p><Link to="/admin?tab=hospitality">Hotel permissions, enquiry brief & next steps</Link></div>
      </section>
      <section className="card stack"><h3>2. Campaign access</h3>
        <div className="connection-grid">{[
          ['open', 'Open access worldwide · cached'], ['indiaOpen', 'Open access with India listed'], ['pending', 'Approval pending'], ['notApplied', 'Not applied'], ['unknown', 'Access not confirmed'],
        ].map(([key, label]) => <div className="callout" key={key}><strong className="h3">{number(data.summary[key!])}</strong><p className="small">{label}</p></div>)}</div>
        <p className="small">{number(data.summary.cachedCampaigns)} campaigns in the stored worldwide network cache. The India figure counts only campaigns whose stored country list includes India; it is not blanket placement approval. “Open” is the network’s access status, not confirmation that every coupon, country, traffic source or placement is permitted. Unknown rows are kept visible rather than counted as approved. Use Campaigns for live network checks and payout terms.</p>
        <p className="small">The stored access counts are not the full CPC catalogue. <Link to="/admin?tab=campaigns&inventory=network&campaignType=CPC">Read live CPC inventory and its country/event rules</Link>.</p>
      </section>
      <section className="card stack"><h3>3. Campaigns with published offers</h3>
        <div className="connection-grid">{[
          ['publishedCampaigns', 'Campaigns with published offers'], ['publishedOfferRows', 'Published offer rows'], ['homepageCampaigns', 'Campaigns on homepage shelves'], ['homepageOffers', 'Offer cards selected for homepage shelves'],
        ].map(([key, label]) => <div className="callout" key={key}><strong className="h3">{number(data.summary[key!])}</strong><p className="small">{label}</p></div>)}</div>
        <p className="small">Published means available to the offer lists now, not displayed on every screen or checkout-verified. Homepage selection uses the same shelf rules as the public site; its short cache may lag this snapshot. Counts exclude expired, future and rejected rows; duplicate-code filtering can reduce visible cards.</p>
        {data.summary.unconfirmedAccessOffers! > 0 && <p className="callout callout-danger"><strong>Review needed:</strong> {number(data.summary.unconfirmedAccessOffers)} published offer rows do not have open campaign access confirmed in this cache. Do not assume they can earn.</p>}
        {data.summary.unlinkedOfferRows! > 0 && <p className="small">{number(data.summary.unlinkedOfferRows)} published rows have no campaign ID and cannot be assigned to a campaign below.</p>}
        <div className="connection-grid">{data.categories.map(group => <button type="button" className="btn btn-ghost connection-category" key={group.id} aria-pressed={category === group.id} onClick={() => selectCategory(group.id)}><strong>{group.name}</strong><span>{number(group.open)} open · {number(group.publishedCampaigns)} with published offers</span><span>{number(group.publishedOffers)} offer rows · {number(group.homepageOffers)} homepage cards</span></button>)}</div>
      </section>
      <section className="card stack"><h3>Store-link reliability</h3><p>{number(data.summary.directFallbacks)} of {number(data.summary.publishedOfferRows)} published offer rows have a direct merchant-homepage alternative confirmed by the imported campaign domain and link destination.</p>
        <ul>{data.redirectHosts.map(host => <li key={host.host}><strong>{host.host}</strong>: {number(host.offers)} offer rows depend on this redirect host.</li>)}</ul>
        <p className="small">A working DealMosaic page does not prove that a customer’s connection can resolve the next host. DNS failure on the phone is a real failure even if our server can resolve it. No external affiliate clicks are generated by these checks.</p>
        <p className="small"><strong>Direct fallback is a recovery route, not an earning fix.</strong> It opens the merchant homepage without our network redirect. We do not record it as an affiliate click or assume commission. The item, coupon or affiliate-only price may need to be checked again.</p>
      </section>
      <section className="stack" aria-label="Campaign inventory by category"><h3>Find a campaign</h3>
        <form className="connection-filters" onSubmit={e => { e.preventDefault(); setQ(draft.trim()); setPage(1); }}>
          <label>Category<select value={category} onChange={e => selectCategory(e.target.value)}><option value="">All categories</option>{data.categories.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}</select></label>
          <label>Access<select value={access} onChange={e => { setAccess(e.target.value); setPage(1); }}><option value="">All access states</option><option value="open">Open access reported</option><option value="pending">Approval pending</option><option value="not_applied">Not applied</option><option value="unknown">Not confirmed</option></select></label>
          <label>Country evidence<select value={country} onChange={e => { setCountry(e.target.value); setPage(1); }}><option value="">All countries</option><option value="IN">India listed</option><option value="unknown">Country not confirmed</option></select></label>
          <label>Published offers<select value={published} onChange={e => { setPublished(e.target.value); setPage(1); }}><option value="">With and without offers</option><option value="yes">With published offers</option><option value="no">No published offers</option></select></label>
          <label>Campaign, domain or ID<input value={draft} onChange={e => setDraft(e.target.value)} maxLength={100} placeholder="For example: Cleartrip" /></label><button className="btn btn-primary" disabled={busy}>Search campaigns</button>
          <button type="button" className="btn btn-quiet" onClick={() => { selectCategory(''); setAccess(''); setPublished(''); setCountry(''); setDraft(''); setQ(''); }}>Clear filters</button>
        </form>
        <p className="small" aria-live="polite">{number(data.total)} matching campaigns · page {data.page} of {data.totalPages}</p>
        {!data.rows.length && <p className="callout">No campaigns match these filters. This does not mean the whole network has no campaigns.</p>}
        {data.rows.map(row => <article className="card stack" key={row.id}>
          <div><span className="eyebrow">{data.categories.find(g => g.id === row.category)?.name}</span><h4 className="h3">{row.name}</h4><p className="tiny muted">Campaign {row.id} · {row.domain || 'No merchant domain stored'}</p></div>
          <dl className="connection-facts"><div><dt>Network access</dt><dd>{accessName(row.access)}</dd></div><div><dt>Country evidence</dt><dd>{row.countryEvidence}</dd></div><div><dt>Network label</dt><dd>{row.type} · read payable-event terms</dd></div><div><dt>Published offer rows</dt><dd>{number(row.publishedOffers)}</dd></div><div><dt>Homepage cards</dt><dd>{number(row.homepageOffers)}</dd></div><div><dt>Direct fallback available</dt><dd>{number(row.directFallbacks)} offer rows</dd></div><div><dt>Access last stored</dt><dd>{date(row.checkedAt)}</dd></div></dl>
          <p className="tiny muted">Category basis: {row.categoryBasis}</p>{row.countries.length > 0 && <details><summary>Network country codes ({row.countries.length})</summary><p className="tiny">{row.countries.join(', ')}</p></details>}{row.warning && <p className="callout callout-danger">{row.warning}</p>}
          {row.offerPath ? <Link className="btn btn-ghost" to={row.offerPath}>View public offers · no store click</Link> : <p className="small">No published offers from this campaign. Access alone does not put it on the website.</p>}
        </article>)}
        <div className="row wrap"><button className="btn btn-ghost" disabled={busy || data.page <= 1} onClick={() => setPage(data.page - 1)}>Previous page</button><button className="btn btn-ghost" disabled={busy || data.page >= data.totalPages} onClick={() => setPage(data.page + 1)}>Next page</button></div>
        <details><summary>How to read these figures</summary><p className="small">{data.scope}</p></details>
      </section>
    </>}
  </div>;
}
