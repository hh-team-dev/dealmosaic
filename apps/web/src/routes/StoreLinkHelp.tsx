import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Chrome } from '../components/PublicChrome';
import { Seo } from '../lib/seo';
import { apiRequest } from '../lib/api';
import { Icon } from '../components/Icon';
import { useToast } from '../components/Toast';

type OfferHelp = { available: boolean; reason?: string; title?: string; store?: string; code?: string | null; terms?: string | null; expiresAt?: string | null; linkHost?: string | null };
export default function StoreLinkHelp() {
  const [params] = useSearchParams();
  const id = (params.get('offer') ?? '').slice(0, 128);
  const [offer, setOffer] = useState<OfferHelp | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const toast = useToast();
  useEffect(() => {
    if (!id) return;
    const controller = new AbortController(); setOffer(null); setError(null);
    apiRequest<OfferHelp>(`/api/go/${encodeURIComponent(id)}/details`, { signal: controller.signal })
      .then(result => { if (!controller.signal.aborted) setOffer(result); })
      .catch(e => { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : 'Offer details could not load.'); });
    return () => controller.abort();
  }, [id, attempt]);
  async function copy() {
    if (!offer?.code) return;
    try { await navigator.clipboard.writeText(offer.code); toast.push('Code copied. Check it is accepted at checkout.'); }
    catch { toast.push('Copy was blocked. Long-press the visible code to copy it manually.', 'info'); }
  }
  return <><Seo title="Help opening a store link" description="Recover a store visit, keep your offer code and check the checkout conditions." path="/store-link-help" index={false} />
    <Chrome><div className="container section stack stack-lg" style={{ maxWidth: 780 }}>
      <header><span className="eyebrow">Store-link help</span><h1>Keep your offer in view.</h1><p className="lede">If a store opens blank or says its address cannot be found, return here. Your code is not proof that a discount has been applied.</p></header>
      {id && !offer && !error && <p role="status">Checking this offer…</p>}
      {error && <div className="callout callout-danger" role="alert"><p>{error}</p><button className="btn btn-primary" onClick={() => setAttempt(n => n + 1)}>Reload offer details</button></div>}
      {offer && <section className="card stack">
        {offer.available ? <>
          <span className="eyebrow">{offer.store}</span><h2 className="h3">{offer.title}</h2>
          {offer.code ? <><p>Offer code: <strong className="selectable-code">{offer.code}</strong></p><button className="btn btn-ghost" onClick={() => void copy()}>Copy code</button></> : <p>No code is listed for this offer. Check the merchant’s eligibility rules and final bill.</p>}
          <a className="btn btn-primary" href={`/api/go/${encodeURIComponent(id)}?src=recovery`} target="_blank" rel="sponsored nofollow noopener noreferrer">Try the store link again <Icon name="external" size={15} /></a>
          <p className="tiny">Affiliate link · opens a new tab. This page stays here. Opening the store does not automatically apply a code or confirm a discount.</p>
          {offer.terms && <details><summary>Offer conditions supplied in the feed</summary><p style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{offer.terms}</p></details>}
          {offer.linkHost && <p className="tiny muted">First link host: <strong>{offer.linkHost}</strong>. This identifies the redirect host, not a diagnosis of the fault.</p>}
        </> : <><h2 className="h3">This offer link is not available</h2><p>{offer.reason ?? 'It may have expired, been withdrawn or lost its destination.'} We have not sent you to a replacement or recorded a store visit.</p><Link className="btn btn-primary" to="/deals">Find another offer</Link></>}
      </section>}
      <section className="card stack"><h2 className="h3">A safe way to recover</h2><ol className="small stack">
        <li>Retry once. A temporary redirect or connection error may clear. We cannot detect a failed third-party page from this tab.</li>
        <li>If the error says <strong>DNS_PROBE_FINISHED_NXDOMAIN</strong>, the browser could not resolve the address. A successful site refresh does not prove that redirect host is reliable.</li>
        <li>If other websites load, you can try another trusted connection or try later. Do not disable browser security, install an unknown app or share a password to claim an offer.</li>
        <li>Confirm the exact item, code acceptance, delivery fees and final total at the retailer. Unless its own terms say otherwise, a public code is not exclusive to DealMosaic.</li>
      </ol><p className="small">If it still fails, contact support with the store name, offer reference and error text. Avoid sending passwords, payment details or account screenshots.</p>
        {id && <p className="tiny" style={{ overflowWrap: 'anywhere' }}>Offer reference: {id}</p>}
        <div className="row wrap"><Link className="btn btn-ghost" to="/contact">Contact & support</Link><Link className="btn btn-quiet" to="/deals">Back to offers</Link></div>
      </section>
    </div></Chrome></>;
}
