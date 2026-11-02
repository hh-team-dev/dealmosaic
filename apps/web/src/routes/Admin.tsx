import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Chrome } from '../components/PublicChrome';
import { Icon } from '../components/Icon';
import { Seo } from '../lib/seo';
import { useAuth } from '../lib/session';
import { ApiError } from '../lib/api';
import { inr } from '../lib/format';
import {
  getJobs,
  listAdminCoupons,
  listAudit,
  listReports,
  listUsers,
  setCouponState,
  setReportState,
  setUserRole,
  type AdminAuditEntry,
  type AdminCoupon,
  type AdminReport,
  type AdminUser,
} from '../lib/admin-api';

/**
 * /admin — the owner's control centre.
 *
 * Deliberately boring where it matters: every row shows the value that a decision
 * would change, every action states what it will do, and every write is attributed
 * in the audit trail below it. Nothing here deletes anything.
 *
 * The page is not the security boundary. If a signed-in non-administrator reaches
 * this route, the API answers 403 to the first request and the page says so
 * plainly rather than pretending the feature is missing.
 */

type Tab = 'overview' | 'coupons' | 'reports' | 'people' | 'audit';

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'coupons', label: 'Coupons' },
  { id: 'reports', label: 'Price reports' },
  { id: 'people', label: 'People' },
  { id: 'audit', label: 'Audit log' },
];

/**
 * "2 Nov 2026", not "2/11/2026": a date written with slashes is read as month-first
 * by half the people who see it, and this one sits next to an expiry — the one place
 * being wrong costs someone a wasted trip to a checkout.
 */
function formatDay(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** "2 Nov 2026, 10:15 pm" — unambiguous day-first, and honest about the hour. */
function formatMoment(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function Admin() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const tab = (params.get('tab') as Tab) ?? 'overview';
  const [denied, setDenied] = useState<'anon' | 'forbidden' | null>(null);

  const fail = useCallback((err: unknown) => {
    if (err instanceof ApiError && err.status === 401) setDenied('anon');
    else if (err instanceof ApiError && err.status === 403) setDenied('forbidden');
    else setDenied(null);
  }, []);

  return (
    <>
      <Seo title="Control centre" description="DealMosaic operations." path="/admin" index={false} />
      <Chrome>
        <div className="container section stack-lg">
          <header className="stack-sm">
            <span className="eyebrow">Owner only</span>
            <h1>Control centre</h1>
            <p className="muted" style={{ margin: 0 }}>
              Everything here runs through an administrator-checked API. Changes are recorded in the
              audit log with who made them and what the value was before.
            </p>
          </header>

          {denied && (
            <div className="card card-lg stack">
              <Icon name="lock" size={28} />
              <h2 className="h3" style={{ margin: 0 }}>
                {denied === 'anon' ? 'Sign in to continue' : 'This account is not an administrator'}
              </h2>
              <p className="muted" style={{ margin: 0 }}>
                {denied === 'anon'
                  ? 'The control centre is not public. Sign in with the owner account.'
                  : 'Being signed in is not enough — the role is checked on the server for every request.'}
              </p>
              <div className="row wrap">
                <Link className="btn btn-primary" to="/login?next=/admin">
                  Sign in
                </Link>
                <Link className="btn btn-ghost" to="/">
                  Back to the site
                </Link>
              </div>
            </div>
          )}

          {/*
            Nothing loads until we know somebody is signed in. The tabs used to mount
            for anonymous visitors and immediately fire six authenticated requests,
            which trained the browser to log 401s on a page where 401 is the normal
            answer — noise that hides the one 401 that would matter.
          */}
          {!denied && user && (
            <>
              <nav className="admin-tabs" aria-label="Control centre sections">
                {TABS.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className={`chip${tab === t.id ? ' chip-active' : ''}`}
                    aria-current={tab === t.id ? 'page' : undefined}
                    onClick={() => setParams({ tab: t.id })}
                  >
                    {t.label}
                  </button>
                ))}
              </nav>

              {tab === 'overview' && <Overview onError={fail} />}
              {tab === 'coupons' && <Coupons onError={fail} />}
              {tab === 'reports' && <Reports onError={fail} />}
              {tab === 'people' && <People onError={fail} />}
              {tab === 'audit' && <Audit onError={fail} />}
            </>
          )}
        </div>
      </Chrome>
    </>
  );
}

/* ------------------------------------------------------------------ */

function useLoader<T>(load: (signal: AbortSignal) => Promise<T>, deps: unknown[], onError: (e: unknown) => void) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    load(controller.signal)
      .then((d) => setData(d))
      .catch((err: unknown) => {
        if ((err as Error).name !== 'AbortError') onError(err);
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return { data, loading, setData };
}

function Overview({ onError }: { onError: (e: unknown) => void }) {
  const [data, setData] = useState<Awaited<ReturnType<typeof getJobs>> | null>(null);
  const overview = useLoader(
    (signal) => import('../lib/admin-api').then((m) => m.getOverview(signal)),
    [],
    onError,
  );
  const jobs = useLoader(getJobs, [], onError);

  useEffect(() => {
    if (jobs.data) setData(jobs.data);
  }, [jobs.data]);

  const o = overview.data;
  if (!o) return <SkeletonRows n={3} />;

  const tiles: Array<[string, string, string]> = [
    ['Live offers', o.coupons.live.toLocaleString('en-IN'), `${o.coupons.total.toLocaleString('en-IN')} stored`],
    ['With a code', o.coupons.with_code.toLocaleString('en-IN'), 'copyable'],
    ['Stated price', o.coupons.with_price.toLocaleString('en-IN'), 'merchant printed a number'],
    ['Stores', o.coupons.stores.toLocaleString('en-IN'), 'distinct platforms'],
    ['Compared products', String(o.catalogue.products), `${o.catalogue.variants} variants`],
    ['Comparison offers', String(o.catalogue.offers), `${o.catalogue.snapshots} price observations`],
    ['Accounts', String(o.people.users), `${o.people.verified} verified`],
    ['Price alerts', String(o.catalogue.alerts), 'active engine'],
    ['Shopper reports', String(o.catalogue.community), `${o.catalogue.community_pending} awaiting moderation`],
  ];

  return (
    <div className="stack-lg">
      <div className="admin-tiles">
        {tiles.map(([label, value, note]) => (
          <div className="admin-tile" key={label}>
            <span className="tiny muted">{label}</span>
            <strong>{value}</strong>
            <span className="tiny muted">{note}</span>
          </div>
        ))}
      </div>

      <section className="card card-lg stack">
        <h2 className="h4" style={{ margin: 0 }}>
          Daily job
        </h2>
        {o.job ? (
          <>
            <p className="muted" style={{ margin: 0 }}>
              Last finished <strong>{o.job.lastFinishedAt ? formatMoment(o.job.lastFinishedAt) : 'never'}</strong>
              {' · '}
              {o.job.lastOk ? 'reported ok' : 'reported a problem'} · {o.job.due ? 'run is due' : 'next run not yet due'}
            </p>
            <pre className="admin-pre">{pretty(o.job.lastResult)}</pre>
          </>
        ) : (
          <p className="muted">No job has run yet.</p>
        )}
      </section>

      <section className="card card-lg stack">
        <h2 className="h4" style={{ margin: 0 }}>
          Affiliate approval
        </h2>
        {o.affiliate ? (
          <p className="muted" style={{ margin: 0 }}>
            <strong>{o.affiliate.merchantsEarning}</strong> of <strong>{o.affiliate.merchantsTracked}</strong>{' '}
            listed merchants are approved and earn on a completed purchase. {o.affiliate.earning.toLocaleString('en-IN')}{' '}
            of {o.affiliate.tracked.toLocaleString('en-IN')} cached campaigns are open. Last synced{' '}
            {o.affiliate.lastSyncedAt ? formatDay(o.affiliate.lastSyncedAt) : 'never'}.
          </p>
        ) : (
          <p className="muted">Approval status has not been synced yet.</p>
        )}
      </section>

      {data && (
        <section className="card card-lg stack">
          <h2 className="h4" style={{ margin: 0 }}>
            Recent runs
          </h2>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Job</th>
                <th>Started</th>
                <th>Result</th>
              </tr>
            </thead>
            <tbody>
              {data.runs.slice(0, 8).map((r, i) => (
                <tr key={i}>
                  <td>{String(r.name)}</td>
                  <td>{r.last_started_at ? formatMoment(String(r.last_started_at)) : '—'}</td>
                  <td>{String(r.last_ok) === '1' ? 'ok' : 'problem'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}

function Coupons({ onError }: { onError: (e: unknown) => void }) {
  const [state, setState] = useState('live');
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const { data, loading, setData } = useLoader(
    (signal) => listAdminCoupons(state, q, signal),
    [state, q],
    onError,
  );

  async function act(id: string, trustState: string) {
    setBusy(id);
    try {
      await setCouponState(id, trustState);
      setData((prev) =>
        prev ? { ...prev, coupons: prev.coupons.map((c) => (c.id === id ? { ...c, trust_state: trustState } : c)) } : prev,
      );
    } catch (err) {
      onError(err);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="stack">
      <div className="admin-controls">
        <label className="admin-field">
          <span className="tiny muted">Show</span>
          <select className="input-sm" value={state} onChange={(e) => setState(e.target.value)}>
            <option value="live">Live</option>
            <option value="codes">With a code</option>
            <option value="expired">Expired</option>
            <option value="rejected">Rejected</option>
            <option value="all">Everything</option>
          </select>
        </label>
        <label className="admin-field grow">
          <span className="tiny muted">Search</span>
          <input
            className="input-sm"
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Store, title or code"
          />
        </label>
      </div>

      {loading && <SkeletonRows n={6} />}
      {!loading && data && data.count === 0 && <p className="muted">Nothing matches that filter.</p>}
      {!loading && data && data.count > 0 && (
        <ul className="admin-list">
          {data.coupons.map((c) => (
            <li className="admin-row" key={c.id}>
              <div className="admin-row-main">
                <span className="tiny muted">
                  {c.campaign_name ?? c.platform_slug}
                  {c.affiliate_status && c.affiliate_status !== 'open' ? ` · affiliate ${c.affiliate_status}` : ''}
                </span>
                <strong>{c.title}</strong>
                <span className="tiny muted">
                  {c.code ? <code className="admin-code">{c.code}</code> : 'no code'}
                  {c.stated_percent ? ` · ${c.stated_percent}%` : ''}
                  {c.expires_at ? ` · ends ${formatDay(c.expires_at)}` : ''}
                  {c.success_count + c.fail_count === 0
                    ? ' · no shopper reports yet'
                    : ` · ${c.success_count} worked, ${c.fail_count} did not`}
                </span>
              </div>
              <div className="admin-row-actions">
                <span className={`badge ${c.trust_state === 'rejected' ? 'badge-red' : 'badge-green'}`}>
                  {c.trust_state === 'rejected' ? 'rejected' : 'live'}
                </span>
                {c.trust_state === 'rejected' ? (
                  <button type="button" className="btn btn-ghost btn-sm" disabled={busy === c.id} onClick={() => act(c.id, 'moderator_verified')}>
                    Restore
                  </button>
                ) : (
                  <button type="button" className="btn btn-ghost btn-sm" disabled={busy === c.id} onClick={() => act(c.id, 'rejected')}>
                    Reject
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Reports({ onError }: { onError: (e: unknown) => void }) {
  const [busy, setBusy] = useState<string | null>(null);
  const { data, loading, setData } = useLoader(listReports, [], onError);

  async function act(id: string, trustState: string) {
    setBusy(id);
    try {
      await setReportState(id, trustState);
      setData((prev) =>
        prev ? { ...prev, reports: prev.reports.map((r) => (r.id === id ? { ...r, trust_state: trustState } : r)) } : prev,
      );
    } catch (err) {
      onError(err);
    } finally {
      setBusy(null);
    }
  }

  if (loading) return <SkeletonRows n={4} />;
  if (!data || data.count === 0) {
    return (
      <p className="muted">
        No shopper price reports yet. When someone reports what they actually paid, it appears here for
        review before it is shown publicly.
      </p>
    );
  }

  return (
    <ul className="admin-list">
      {data.reports.map((r) => (
        <li className="admin-row" key={r.id}>
          <div className="admin-row-main">
            <strong>
              {r.title ?? 'Unknown product'} {r.variant_label ? `· ${r.variant_label}` : ''}
            </strong>
            <span className="tiny muted">
              {inr(r.price_minor / 100)} at {r.platform_slug} · PIN {r.pincode ?? 'not given'} ·{' '}
              {r.observed_at ? formatDay(r.observed_at) : 'no date'}
            </span>
          </div>
          <div className="admin-row-actions">
            <span className="badge badge-neutral">{r.trust_state}</span>
            <button type="button" className="btn btn-ghost btn-sm" disabled={busy === r.id} onClick={() => act(r.id, 'community_verified')}>
              Confirm
            </button>
            <button type="button" className="btn btn-ghost btn-sm" disabled={busy === r.id} onClick={() => act(r.id, 'rejected')}>
              Reject
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}

function People({ onError }: { onError: (e: unknown) => void }) {
  const [busy, setBusy] = useState<string | null>(null);
  const { data, loading, setData } = useLoader(listUsers, [], onError);

  async function act(id: string, role: string) {
    setBusy(id);
    try {
      await setUserRole(id, role);
      setData((prev) =>
        prev ? { ...prev, users: prev.users.map((u) => (u.id === id ? { ...u, role } : u)) } : prev,
      );
    } catch (err) {
      onError(err);
    } finally {
      setBusy(null);
    }
  }

  if (loading) return <SkeletonRows n={4} />;
  if (!data) return null;

  return (
    <ul className="admin-list">
      {data.users.map((u) => (
        <li className="admin-row" key={u.id}>
          <div className="admin-row-main">
            <strong>{u.email}</strong>
            <span className="tiny muted">
              {u.role} · {u.status} · {u.email_verified_at ? 'verified' : 'unverified'} · joined{' '}
              {formatDay(u.created_at)}
            </span>
          </div>
          <div className="admin-row-actions">
            {u.role === 'super_admin' ? (
              <span className="badge badge-violet">super admin</span>
            ) : (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                disabled={busy === u.id}
                onClick={() => act(u.id, u.role === 'admin' ? 'user' : 'admin')}
              >
                {u.role === 'admin' ? 'Remove admin' : 'Make admin'}
              </button>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

function Audit({ onError }: { onError: (e: unknown) => void }) {
  const { data, loading } = useLoader(listAudit, [], onError);
  if (loading) return <SkeletonRows n={4} />;
  if (!data || data.count === 0) return <p className="muted">No administrative changes recorded yet.</p>;

  return (
    <ul className="admin-list">
      {data.entries.map((e: AdminAuditEntry) => (
        <li className="admin-row" key={e.id}>
          <div className="admin-row-main">
            <strong>{e.action}</strong>
            <span className="tiny muted">
              {e.actor_email} · {e.entity} {e.entity_id.slice(0, 8)} · {formatMoment(e.at)}
            </span>
            {/* Raw JSON of the before and after row. It has no spaces to break on,
                so it needs its own class — otherwise it runs out of the card and
                clips, and an audit entry that hides part of the record is worse
                than no audit entry at all. */}
            <span className="tiny muted admin-json">
              {e.before_json ?? '—'} → {e.after_json ?? '—'}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}

function SkeletonRows({ n }: { n: number }) {
  return (
    <div className="admin-list" aria-hidden="true">
      {Array.from({ length: n }).map((_, i) => (
        <div className="admin-row" key={i}>
          <div className="admin-row-main">
            <span className="skeleton skeleton-line" style={{ width: '40%' }} />
            <span className="skeleton skeleton-line" style={{ width: '75%' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function pretty(raw: unknown): string {
  if (typeof raw !== 'string') return String(raw ?? '—');
  try {
    return JSON.stringify(JSON.parse(raw), null, 1);
  } catch {
    return raw;
  }
}
