import { EngagementBar } from './EngagementBar';
import { useState, type ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { applyUpdate, reconnect, sensitiveTask, usePwa } from '../lib/pwa';

export function PwaExperience({ children }: { children: ReactNode }) {
  const app = usePwa();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [later, setLater] = useState(false);
  const safeOfflinePage = ['/saved', '/install'].includes(pathname.replace(/\/$/, '') || '/');
  const bootBlocked = app.bootOffline && !safeOfflinePage;
  const locked = app.disconnected && sensitiveTask(pathname);
  return <>
    <EngagementBar />
    {app.installed && <nav className="pwa-nav" aria-label="App navigation">
      <button type="button" onClick={() => typeof window.history.state?.idx === 'number' && window.history.state.idx > 0 ? navigate(-1) : navigate('/')}>Back</button>
      <Link to="/">Home</Link><Link to="/deals">Deals</Link><Link to="/saved">Saved</Link><Link to="/install">App settings</Link>
    </nav>}
    {app.disconnected && <section className="pwa-connection" aria-label="Connection status">
      <strong role="status">{app.offline ? 'You are offline' : 'Connection may be back — refresh to confirm'}</strong>
      <p>Previously loaded prices may be out of date. Orders, payments and account changes are never queued. Reload current information before continuing.</p>
      <div className="row wrap"><Link className="btn btn-quiet btn-sm" to="/saved">Read saved deals</Link><button className="btn btn-primary btn-sm" disabled={app.busy} onClick={() => void reconnect()}>Reload current information</button></div>
      {app.message && <p role="status">{app.message}</p>}
    </section>}
    {!app.disconnected && !later && (app.updateReady || app.changed) && <section className="pwa-update" aria-label="App update">
      <p role="status"><strong>An app update is ready.</strong> {sensitiveTask(pathname) ? 'Finish your current task, then open Install & app settings. Nothing will reload automatically.' : 'Save your work before reloading. Other open windows will not reload.'}</p>
      <div className="row wrap">{!sensitiveTask(pathname) && <button className="btn btn-primary btn-sm" onClick={applyUpdate}>Update this window</button>}<button className="btn btn-ghost btn-sm" onClick={() => setLater(true)}>Later</button></div>
    </section>}
    {bootBlocked ? <main id="main" className="container section pwa-offline-main">
      <span className="eyebrow">DealMosaic · connection needed</span><h1>Your saved list is still here</h1>
      <p className="lede">We do not show old prices, private orders or shipping quotes as live information. Open the saved deals already kept in this browser, or reconnect to use the full website.</p>
      <div className="row wrap"><Link className="btn btn-primary" to="/saved">Open saved deals</Link><Link className="btn btn-quiet" to="/install">App help</Link></div>
      <p className="small muted">Offline access needs a successful earlier visit and stored app files. Your browser may clear those files. No purchase or payment is sent in the background.</p>
    </main> : <div inert={locked || undefined} onSubmitCapture={event => { if (locked) { event.preventDefault(); event.stopPropagation(); } }} onChangeCapture={event => { if (locked) event.stopPropagation(); }} onClickCapture={event => {
      if (locked) { event.preventDefault(); event.stopPropagation(); return; }
      if (!app.disconnected) return;
      const anchor = (event.target as Element).closest?.('a');
      if (anchor && (/^(upi:|\/api\/go\/|\/buy\/)/.test(anchor.getAttribute('href') || ''))) event.preventDefault();
    }}>{children}</div>}
  </>;
}
