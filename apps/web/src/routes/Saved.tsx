import { useToast } from '../components/Toast';
import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { Chrome } from '../components/PublicChrome';
import { Icon } from '../components/Icon';
import { Seo } from '../lib/seo';
import { clearSaved, clearViewed, toggleSaved, useSaved, useViewed, type SaveableDeal } from '../lib/saved';
import { statedPercentLabel, statedPriceLabel, expiryLabel } from '../lib/coupons-api';
import { DealsTicker } from '../components/DealsTicker';

/**
 * /saved — the visitor's own board.
 *
 * This is the "reason to return" page, and it works with **no account at all**:
 * the list lives in this browser only. That is a deliberate trade. A saved list
 * that demands an email before it saves anything converts nobody; a local list
 * works on the first visit and costs nothing to run.
 *
 * The honest limit is stated on the page rather than discovered later: these
 * items are on *this* device, and clearing site data removes them. Turning that
 * into a synced account list plus real price-drop email is a server feature
 * (`price_alerts` already exists in the schema) and is the next step.
 */
export default function Saved() {
  const toast = useToast();
  const saved = useSaved();
  const viewed = useViewed();
  const [copied, setCopied] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const copy = useCallback(async (id: string, code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(id);
      setTimeout(() => setCopied((prev) => (prev === id ? null : prev)), 1800);
    } catch {
      toast.push(`Copy was blocked. Long-press the code ${code} to copy it manually.`, 'info');
    }
  }, [toast]);

  return (
    <>
      <Seo
        title="Your saved deals and recently viewed offers"
        description="The deals you kept and the offers you looked at, stored on your own device — no account needed."
        path="/saved"
      />
      <Chrome>
        <div className="container section stack-lg">
          {/* Alive on every screen, not only the first one. */}
          <DealsTicker />
          <header>
            <span className="eyebrow">
              <Icon name="heart" size={14} /> Your board
            </span>
            <h1>Saved deals</h1>
            <p className="lede" style={{ maxWidth: '56ch' }}>
              Kept on this device only — no account, no tracking, nothing sent to our servers. Clear your browser data
              and the list goes with it.
            </p>
          </header>

          {saved.length === 0 ? (
            <div className="card card-lg center-text">
              <h2 style={{ marginTop: 0 }}>Nothing saved yet</h2>
              <p className="small" style={{ maxWidth: '44ch', margin: '0 auto 16px' }}>
                Tap the heart on any deal to keep it here. It stays on this phone, even if you close the tab.
              </p>
              <Link to="/deals" className="btn btn-primary">
                Find something worth saving
              </Link>
            </div>
          ) : (
            <>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <p className="small" style={{ margin: 0 }}>
                  {saved.length} saved {saved.length === 1 ? 'deal' : 'deals'}
                </p>
                <button
                  type="button"
                  className="btn btn-quiet btn-sm"
                  onClick={() => {
                    clearSaved();
                    setTick(tick + 1);
                  }}
                >
                  <Icon name="trash" size={14} /> Clear all
                </button>
              </div>
              <div className="saved-grid">
                {saved.map((d) => {
                  const percent = statedPercentLabel(d);
                  const price = statedPriceLabel(d);
                  return (
                    <article className="deal-card" key={d.id}>
                      <div className="deal-card-top">
                        <span className="deal-monogram deal-monogram-3" aria-hidden="true">
                          {(d.merchant || '?').slice(0, 2).toUpperCase()}
                        </span>
                        <div className="deal-card-headings">
                          <span className="deal-card-merchant">{d.merchant}</span>
                          <span className="deal-card-category">Saved {d.savedAt.slice(0, 10)}</span>
                        </div>
                        <button
                          type="button"
                          className="deal-save is-saved"
                          aria-label={`Remove ${d.title} from saved deals`}
                          onClick={() => {
                            // Re-saving with the same id removes it — the same
                            // toggle the card uses, so the two never disagree.
                            toggleSaved({
                              ...d,
                              platformName: d.merchant,
                              campaignName: d.merchant,
                              platformSlug: d.merchantSlug,
                              dealGroup: d.group as SaveableDeal['dealGroup'],
                            });
                            setTick(tick + 1);
                          }}
                        >
                          <Icon name="heart" size={16} />
                        </button>
                      </div>
                      {percent && <span className="deal-badge">{percent}</span>}
                      <h3 className="deal-card-title">{d.title}</h3>
                      {price && <p className="deal-card-price">{price}</p>}
                      <div className="deal-card-actions">
                        {d.code ? (
                          <button type="button" className="deal-code" onClick={() => copy(d.id, d.code!)}>
                            <span className="deal-code-value">{d.code}</span>
                            <span className="deal-code-hint">{copied === d.id ? 'Copied' : 'Copy'}</span>
                          </button>
                        ) : (
                          <span className="deal-code deal-code-none">No code needed</span>
                        )}
                        {d.outboundUrl && (
                          <a
                            className="deal-go"
                            href={`/api/go/${d.id}?src=saved`}
                            target="_blank"
                            rel="sponsored nofollow noopener noreferrer"
                          >
                            Shop at store <Icon name="external" size={13} />
                          </a>
                        )}
                      </div>
                      <footer className="deal-card-foot">
                        <span className="deal-urgency">
                          <Icon name="clock" size={12} /> {expiryLabel(d.expiresAt, null) ?? 'No expiry published'}
                        </span>
                      </footer>
                    </article>
                  );
                })}
              </div>
            </>
          )}

          {viewed.length > 0 && (
            <section>
              <div className="row" style={{ justifyContent: 'space-between', marginBottom: 10 }}>
                <h2 style={{ margin: 0 }}>Recently viewed</h2>
                <button
                  type="button"
                  className="btn btn-quiet btn-sm"
                  onClick={() => {
                    clearViewed();
                    setTick(tick + 1);
                  }}
                >
                  Clear
                </button>
              </div>
              <div className="shelf-row shelf-row-compact">
                {viewed.map((v) => (
                  <div className="viewed-chip" key={v.id}>
                    <span className="viewed-chip-title">{v.title}</span>
                    <span className="viewed-chip-meta">
                      {v.merchant}
                      {v.statedPercent ? ` · ${v.percentIsCap ? 'up to ' : ''}${v.statedPercent}% off` : ''}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </Chrome>
    </>
  );
}
