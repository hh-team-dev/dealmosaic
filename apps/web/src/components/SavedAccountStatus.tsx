import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../lib/api';
import { useAuth } from '../lib/session';
import { useSaved } from '../lib/saved';
import { usePwa } from '../lib/pwa';

/** A local heart is not a reminder subscription. Show actual account linkage,
 * explicit repair, and the user's real preference instead of promising delivery. */
export function SavedAccountStatus() {
  const { user, loading, preferences } = useAuth();
  const saved = useSaved();
  const { disconnected } = usePwa();
  const [ids, setIds] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const key = saved.map(d => d.id).join('|');
  useEffect(() => {
    const changed = () => setAttempt(n => n + 1);
    window.addEventListener('dealmosaic:saved-account-change', changed);
    return () => window.removeEventListener('dealmosaic:saved-account-change', changed);
  }, []);
  useEffect(() => {
    setIds(null); setError(null);
    if (!user || disconnected) return;
    const controller = new AbortController();
    apiRequest<{ saved: { couponId: string }[] }>('/api/me/saved-deals', { signal: controller.signal })
      .then(data => { if (!controller.signal.aborted) setIds(data.saved.map(d => d.couponId)); })
      .catch(() => { if (!controller.signal.aborted) setError('Account linkage could not be checked. The device list is safe; reminder eligibility is unknown.'); });
    return () => controller.abort();
  }, [user?.id, key, attempt, disconnected]);
  if (loading) return <p className="small" role="status">Checking account options…</p>;
  if (!user) return <section className="card stack-sm"><h2 className="h3">Browse freely. Make an account when it helps.</h2>
    <p className="small">As a guest, you can search, open offers, copy codes and save on this device. An account adds saved-offer email preferences and the ability to report code results. It does not unlock a secret price or guarantee a discount.</p>
    <p className="tiny muted">Device-only saves do not receive automatic reminders. After signing in, link the offers below and choose your email preference. The saved board itself does not sync across devices.</p>
    <div className="row wrap"><Link className="btn btn-primary" to="/register">Create free account</Link><Link className="btn btn-ghost" to="/login?next=%2Fsaved">Sign in</Link></div>
  </section>;
  const missing = saved.filter(d => !ids?.includes(d.id));
  async function linkSaved() {
    if (busy || ids === null) return;
    setBusy(true); setMessage(null); let added = 0; let failed = 0;
    for (const deal of missing) {
      try { await apiRequest('/api/me/saved-deals', { method: 'POST', body: { couponId: deal.id } }); added++; }
      catch { failed++; }
    }
    setMessage(`${added} saved offers linked.${failed ? ` ${failed} could not be linked; check their current availability and retry.` : ''} No email was sent by this action.`);
    setBusy(false); setAttempt(n => n + 1);
  }
  return <section className="card stack-sm"><h2 className="h3">Your reminder status</h2>
    <p className="small">Email preference: <strong>{preferences?.notifyEmail ? 'enabled' : 'off'}</strong>. Eligible saved-offer updates are sent at most weekly, not at the moment you save. Delivery is not guaranteed and we do not send empty updates.</p>
    {disconnected ? <p className="small">Offline: account linkage cannot be checked or changed.</p> : error ? <p className="small" role="alert">{error}</p> : ids === null ? <p role="status">Checking saved-offer linkage…</p> : <p className="small"><strong>{saved.length - missing.length} of {saved.length}</strong> offers on this device are linked to your account. {missing.length > 0 ? 'The remaining device-only saves are not eligible for account reminders.' : 'This confirms saved IDs, not an email delivery.'}</p>}
    {message && <p className="small" role="status">{message}</p>}
    <div className="row wrap">
      {ids !== null && missing.length > 0 && <button className="btn btn-primary" disabled={busy || disconnected} onClick={() => void linkSaved()}>{busy ? 'Linking saved offers…' : 'Link these saved offers to my account'}</button>}
      <Link className="btn btn-ghost" to="/app/settings">Manage email preferences</Link>
      {!disconnected && <button className="btn btn-quiet" disabled={busy} onClick={() => setAttempt(n => n + 1)}>Refresh reminder status</button>}
    </div>
  </section>;
}
