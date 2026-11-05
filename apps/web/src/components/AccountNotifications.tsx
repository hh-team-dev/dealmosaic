import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../lib/api';
import { formatDate, inr } from '../lib/format';
import { useAuth } from '../lib/session';

type Notice = { id: string; title: string; productSlug: string | null; observedPriceMinor: number; targetMinor: number; platform: string; createdAt: string; emailSent: boolean };
export function AccountNotifications() {
  const { preferences } = useAuth();
  const [data, setData] = useState<{ enabled: boolean; notifications: Notice[] } | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let alive = true; setData(null); setFailed(false);
    apiRequest<{ enabled: boolean; notifications: Notice[] }>('/api/me/notifications')
      .then(value => { if (alive) setData(value); })
      .catch(() => { if (alive) setFailed(true); });
    return () => { alive = false; };
  }, [attempt, preferences?.notifyInApp]);
  return <section className="card stack-sm" id="notifications" aria-labelledby="notifications-heading">
    <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}><h2 className="h3" id="notifications-heading" style={{ margin: 0 }}>Notification centre</h2><Link className="btn btn-ghost btn-sm" to="/app/settings">Notification settings</Link></div>
    {failed ? <div role="alert"><p>Updates could not load. This does not mean there are none.</p><button className="btn btn-quiet" onClick={() => setAttempt(n => n + 1)}>Retry updates</button></div>
      : !data ? <p className="small" role="status">Loading your updates…</p>
      : !data.enabled ? <p className="small">In-app updates are switched off. Price-target emails you explicitly requested are separate; cancel those targets above if you no longer want them.</p>
      : !data.notifications.length ? <p className="small">No qualifying price-target updates yet. We only add an update after a recent live store observation beats a target you set—not to prompt you to shop. Saved-offer reminders are managed from <Link to="/saved">your saved board</Link>.</p>
      : <ul className="alert-list">{data.notifications.map(n => <li key={n.id} className="alert-row"><div className="alert-row-main"><strong>{n.productSlug ? <Link to={`/p/${n.productSlug}`}>{n.title}</Link> : n.title}</strong><span className="small">Observed at {inr(n.observedPriceMinor)} at {n.platform}, below your {inr(n.targetMinor)} target.</span><span className="tiny muted">Recorded {formatDate(n.createdAt)} · {n.emailSent ? 'Email accepted by the delivery service; inbox arrival is not guaranteed.' : 'Email delivery not confirmed; the target remains active for retry unless cancelled.'}</span></div></li>)}</ul>}
    <p className="tiny muted">These are past observations, not current checkout quotes. Delivery and other fees may apply. No phone push or SMS is enabled.</p>
  </section>;
}
