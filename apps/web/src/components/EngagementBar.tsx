import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { installApp, sensitiveTask, usePwa } from '../lib/pwa';
import { DealsTicker } from './DealsTicker';
import { LogoMark } from './Logo';
import { Modal } from './Ui';
import { useToast } from './Toast';

const MOTION_KEY = 'dealmosaic.motion-paused.v1';
const readPaused = () => { try { return localStorage.getItem(MOTION_KEY) === '1'; } catch { return false; } };

/** The two requested always-visible features have one owner, on EVERY React route. */
export function EngagementBar() {
  const app = usePwa();
  const location = useLocation();
  const toast = useToast();
  const bar = useRef<HTMLElement>(null);
  const dirty = useRef(false);
  const requestedInstall = useRef(false);
  const [help, setHelp] = useState(false);
  const [paused, setPaused] = useState(readPaused);
  const [visible, setVisible] = useState(document.visibilityState === 'visible');
  const [editing, setEditing] = useState(false);
  const [reduced, setReduced] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [otherDialog, setOtherDialog] = useState(false);
  const still = paused || reduced || !visible || editing || help || otherDialog || app.busy;
  const apple = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  useEffect(() => { if (app.message && requestedInstall.current) { requestedInstall.current = false; toast.push(app.message, 'info'); } }, [app.message, toast]);
  useEffect(() => { dirty.current = false; setEditing(false); }, [location.pathname, location.search]);
  useLayoutEffect(() => {
    const update = () => document.documentElement.style.setProperty('--engagement-height', `${Math.ceil(bar.current?.getBoundingClientRect().height || 96)}px`);
    update(); const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update);
    if (bar.current) observer?.observe(bar.current);
    window.addEventListener('resize', update);
    return () => { observer?.disconnect(); window.removeEventListener('resize', update); document.documentElement.style.removeProperty('--engagement-height'); };
  }, []);
  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const preference = () => setReduced(media.matches);
    const visibility = () => setVisible(document.visibilityState === 'visible');
    const storage = (event: StorageEvent) => { if (event.key === MOTION_KEY || event.key === null) setPaused(readPaused()); };
    const isField = (target: EventTarget | null) => target instanceof Element && target.matches('input,textarea,select,[contenteditable="true"]') && !bar.current?.contains(target);
    const change = (event: Event) => { if (isField(event.target)) dirty.current = true; };
    const focus = (event: FocusEvent) => setEditing(isField(event.target));
    const blur = (event: FocusEvent) => setEditing(isField(event.relatedTarget));
    media.addEventListener?.('change', preference); document.addEventListener('visibilitychange', visibility);
    window.addEventListener('storage', storage); document.addEventListener('input', change, true); document.addEventListener('change', change, true);
    document.addEventListener('focusin', focus); document.addEventListener('focusout', blur);
    // Custom dialogs must remain above the bar and quiet the animations, not compete with them.
    const observer = new MutationObserver(() => setOtherDialog(Boolean(document.querySelector('[role="dialog"],dialog[open]'))));
    observer.observe(document.body, { childList: true, subtree: true });
    return () => { observer.disconnect(); media.removeEventListener?.('change', preference); document.removeEventListener('visibilitychange', visibility); window.removeEventListener('storage', storage); document.removeEventListener('input', change, true); document.removeEventListener('change', change, true); document.removeEventListener('focusin', focus); document.removeEventListener('focusout', blur); };
  }, []);
  function beforeNavigate() {
    if (dirty.current && sensitiveTask(location.pathname)) {
      return window.confirm('Leave this page? Save any unfinished form first. No order, payment or account change will be submitted by this link.');
    }
    return true;
  }
  function toggleMotion() {
    const next = !paused; setPaused(next);
    try { localStorage.setItem(MOTION_KEY, next ? '1' : '0'); }
    catch { toast.push('Motion preference applies to this window; your browser blocked saving it.', 'info'); }
  }
  return <>
    <section ref={bar} className={`engagement-bar${still ? ' engagement-still' : ''}`} aria-label="Install and deals bar">
      <div className="engagement-install">
        <span className={`engagement-icon${app.installed ? ' is-installed' : ''}`} aria-hidden="true"><LogoMark size={26} /></span>
        <div className="engagement-copy"><strong>DealMosaic</strong><span>{app.installed ? 'Your home-screen companion' : 'One tap from your home screen'}</span></div>
        <button type="button" className={`engagement-install-button${app.installed ? ' is-installed' : ''}`} disabled={app.busy}
          onClick={() => { if (app.canInstall && !app.installed && !app.disconnected) { requestedInstall.current = true; void installApp(); } else setHelp(true); }}>
          {app.installed ? 'App tools' : 'Install app'}<span aria-hidden="true">{app.installed ? ' ✓' : ' ↗'}</span>
        </button>
        <button type="button" className="engagement-motion" onClick={toggleMotion} aria-pressed={paused}
          aria-label={paused ? 'Resume animations' : 'Pause animations'} title={reduced ? 'Your device’s reduced-motion preference is respected' : paused ? 'Resume breathing and scrolling' : 'Pause breathing and scrolling'}>
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">{paused ? <path d="M8 5v14l11-7z" fill="currentColor" /> : <path d="M7 5h3v14H7zm7 0h3v14h-3z" fill="currentColor" />}</svg>
        </button>
      </div>
      <DealsTicker offline={app.disconnected} paused={still} visible={visible} beforeNavigate={beforeNavigate} />
    </section>
    <div className="engagement-spacer" aria-hidden="true" />
    <Modal open={help} onClose={() => setHelp(false)} title={app.installed ? 'Your DealMosaic app' : 'Keep DealMosaic one tap away'}>
      <div className="stack">
        <p>{app.installed ? 'You are already using app mode. The same website, account and shopping tools are here.' : 'Add the DealMosaic icon to your home screen. No app-store download or separate app account is needed.'}</p>
        {!app.installed && <>
          <h3>{apple ? 'On iPhone or iPad' : 'On Android'}</h3>
          <ol className="engagement-steps">{apple ? <><li>Open this website in Safari and tap Share.</li><li>Choose Add to Home Screen.</li><li>Enable Open as Web App when shown, then tap Add.</li></> : <><li>Open this website in Chrome or another supporting browser.</li><li>Open the browser menu and choose Install app or Add to Home screen.</li><li>Confirm, then open the DealMosaic icon.</li></>}</ol>
          <p className="small">Inside another app? Open this page in your browser first. Already added it? Use your home-screen icon—browsers cannot always tell this tab that an app is installed.</p>
        </>}
        <p className="small">The icon stays within reach until you or your device removes it. Live prices and checkout need a connection. Browser storage can be cleared; installation does not enable push notifications.</p>
        <Link className="btn btn-primary" to="/install" onClick={event => { if (!beforeNavigate()) event.preventDefault(); else setHelp(false); }}>Full install guide & app settings</Link>
        <button type="button" className="btn btn-quiet" onClick={() => setHelp(false)}>Continue on this page</button>
      </div>
    </Modal>
  </>;
}
