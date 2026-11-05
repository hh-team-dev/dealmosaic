import { useEffect, useState } from 'react';
import { Seo } from '../lib/seo';
import { Link } from 'react-router-dom';
import { AppShell } from '../components/Chrome';
import { Icon } from '../components/Icon';
import { useAuth } from '../lib/session';
import { formatDate, inr } from '../lib/format';
import { useToast } from '../components/Toast';
import { deleteAlert, listAlerts, type AlertView } from '../lib/alerts-api';
import { useSaved } from '../lib/saved';
import { AccountNotifications } from '../components/AccountNotifications';
import { DiscoverShelves } from '../components/DiscoverShelves';

export default function Dashboard() {
  const { user, preferences } = useAuth();
  const toast = useToast();
  const saved = useSaved();
  const [alerts, setAlerts] = useState<AlertView[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [alertError, setAlertError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    setAlertError(false); setAlerts(null);
    listAlerts()
      .then((d) => alive && setAlerts(d.alerts))
      .catch(() => alive && setAlertError(true));
    return () => {
      alive = false;
    };
  }, [attempt]);

  async function cancelAlert(id: string): Promise<void> {
    setBusy(id);
    try {
      await deleteAlert(id);
      setAlerts((prev) => (prev ?? []).filter((a) => a.id !== id));
      toast.push('Alert cancelled.', 'success');
    } catch {
      toast.push('Could not cancel that alert.', 'error');
    } finally {
      setBusy(null);
    }
  }

  async function handleExport() {
    try {
      const res = await fetch('/api/me/export', { credentials: 'same-origin' });
      if (!res.ok) throw new Error('export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dealmosaic-data-${user?.id.slice(0, 8)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.push('Your data export has been downloaded.', 'success');
    } catch {
      toast.push('Export failed. Please try again.', 'error');
    }
  }

  return (
      <>
      <Seo
        title="Your dashboard"
        description="Your price alerts, saved deals and account settings."
        path="/app"
        index={false}
      />
    <AppShell>
      <div className="stack stack-lg">
        {/*
          THE DASHBOARD IS NOT A WAITING ROOM.
          Signing in used to lead to a page of account settings while the live
          wall — the reason anyone opens this site — vanished. The ticker and the
          shelves now come with you into the app, so no screen is a dead end.
        */}
        <header>
          <span className="badge badge-lime">
            <span className="dot dot-grass" aria-hidden="true" />
            India · prices in ₹
          </span>
          <h1 style={{ fontSize: 'clamp(1.6rem, 6vw, 2.2rem)', margin: '10px 0 4px' }}>
            Namaste, {user?.displayName.split(' ')[0]}.
          </h1>
          <p className="small" style={{ margin: 0 }}>
            Member since {user ? formatDate(user.createdAt) : '—'} · {user?.email}
          </p>
        </header>

        {/* ---- Your price alerts: the reason this page exists ---- */}
        <section className="card stack-sm" aria-labelledby="alerts-heading">
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 id="alerts-heading" className="h3" style={{ margin: 0 }}>
              Price alerts
            </h2>
            <Link to="/deals" className="btn btn-ghost btn-sm">
              Find something to watch
            </Link>
          </div>

          {alertError ? <div role="alert"><p>Alerts could not load. This does not mean your list is empty.</p><button className="btn btn-ghost" onClick={() => setAttempt(n => n + 1)}>Retry alerts</button></div> : alerts === null ? (
            <p className="small muted" style={{ margin: 0 }}>
              Loading your alerts…
            </p>
          ) : alerts.length === 0 ? (
            <p className="small" style={{ margin: 0 }}>
              No price alerts. Targets can be set only for variants with live store prices. Saved-offer reminders are separate; manage them from your saved board.
            </p>
          ) : (
            <ul className="alert-list">
              {alerts.map((a) => (
                <li key={a.id} className="alert-row">
                  <div className="alert-row-main">
                    <strong>
                      {a.productSlug ? <Link to={`/p/${a.productSlug}`}>{a.productTitle}</Link> : a.productTitle}
                      {a.variantLabel ? ` · ${a.variantLabel}` : ''}
                    </strong>
                    <span className="tiny muted">
                      Target {inr(a.targetPriceMinor)}
                      {a.bestPriceMinor !== null ? ` · now ${inr(a.bestPriceMinor)}${a.bestPlatform ? ` at ${a.bestPlatform}` : ''}` : ' · no live offer right now'}
                    </span>
                  </div>
                  <span className={`badge ${a.status === 'triggered' ? 'badge-grass' : a.isBelowTarget ? 'badge-sun' : 'badge-neutral'}`}>
                    {a.status === 'triggered' ? 'Closed' : a.bestPriceMinor === null ? 'Price unavailable' : a.isBelowTarget ? 'Below target' : 'Watching'}
                  </span>
                  <button
                    type="button"
                    className="btn btn-quiet btn-sm"
                    onClick={() => cancelAlert(a.id)}
                    disabled={busy === a.id}
                  >
                    {busy === a.id ? '…' : 'Cancel'}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className="tiny muted" style={{ margin: 0 }}>
            A confirmed price-target email closes its alert. If delivery fails, the alert stays active for a later attempt. Saved-offer weekly emails are separate.
          </p>
        </section>

        <AccountNotifications />

        <div className="grid grid-2">
          <Link to="/saved" className="card card-top-magenta" style={{ textDecoration: 'none' }}>
            <h3 style={{ marginTop: 0 }}>Your saved board</h3>
            <p className="small" style={{ marginBottom: 8 }}>
              {saved.length === 0
                ? 'Nothing saved yet. Tap the heart on any deal and it stays on this device.'
                : `${saved.length} deal${saved.length === 1 ? '' : 's'} saved on this device.`}
            </p>
            <span className="btn btn-quiet btn-sm">Open saved deals</span>
          </Link>

          <Link to="/deals" className="card card-top-sun" style={{ textDecoration: 'none' }}>
            <h3 style={{ marginTop: 0 }}>Today’s board</h3>
            <p className="small" style={{ marginBottom: 8 }}>
              Live offers across groceries, electronics, fashion and beauty — codes first, expiry where the store
              published one.
            </p>
            <span className="btn btn-quiet btn-sm">Browse live deals</span>
          </Link>
        </div>

        <div className="grid grid-2">
          <div className="card card-top-magenta">
            <h3 style={{ marginTop: 0 }}>Your comparison context</h3>
            <dl className="offer-meta" style={{ borderTop: 'none', paddingTop: 0 }}>
              <div>
                <dt>Market</dt>
                <dd>India</dd>
              </div>
              <div>
                <dt>Display currency</dt>
                <dd>{preferences?.displayCurrency ?? 'INR'} ₹</dd>
              </div>
              <div>
                <dt>PIN code</dt>
                <dd>{preferences?.pincode ?? 'Not set'}</dd>
              </div>
              <div>
                <dt>Quick commerce</dt>
                <dd>{preferences?.pincode ? 'PIN saved; authorised prices still required' : 'PIN needed for local quotes'}</dd>
              </div>
            </dl>
            <Link to="/app/settings" className="btn btn-quiet btn-sm" style={{ marginTop: 12 }}>
              {preferences?.pincode ? 'Change preferences' : 'Add your PIN code'}
            </Link>
          </div>

          <div className="card card-top-sun">
            <h3 style={{ marginTop: 0 }}>Why we ask for a PIN code</h3>
            <p className="small">
              Blinkit, Zepto, Instamart and BigBasket price products <strong>per dark store</strong>, not per country.
              Without a PIN code a grocery comparison would be a guess. We store the PIN only — never GPS, never your
              address — and it is deleted with your account.
            </p>
            <p className="tiny" style={{ marginBottom: 0 }}>
              You can browse without a PIN. Adding one does not itself connect a retailer or make live grocery prices available.
            </p>
          </div>
        </div>

        <div className="grid grid-2">
          <div className="card">
            <h3 style={{ marginTop: 0 }}>Your data, your call</h3>
            <p className="small">
              Export your account data or delete your account, sessions, preferences and searches. Separate direct-shop order records are retained as explained in our privacy policy.
            </p>
            <div className="row" style={{ gap: 8 }}>
              <button className="btn btn-quiet btn-sm" onClick={handleExport}>
                <Icon name="download" size={15} /> Export my data
              </button>
              <Link to="/app/settings#danger" className="btn btn-danger btn-sm">
                Delete account
              </Link>
            </div>
          </div>

          <div className="card">
            <h3 style={{ marginTop: 0 }}>What we never ask for</h3>
            <ul className="small" style={{ marginBottom: 0, paddingLeft: 18 }}>
              <li>Your retailer login or shopping-account password</li>
              <li>Card or bank details for retailer comparisons; retailer checkout stays with the retailer</li>
              <li>Your date of birth (an age confirmation is enough)</li>
              <li>A phone number, unless you choose to add one</li>
            </ul>
          </div>
        </div>

        <DiscoverShelves />
      </div>
    </AppShell>
      </>
  );
}
