import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { listCoupons, type CouponView } from '../lib/coupons-api';
import { eligibleTickerOffers, tickerOfferPath, tickerDiscountLabel, TICKER_FRESH_MS } from '../lib/ticker';

/** One global, persistent discovery strip. No duplicate fetchers on route changes. */
export function DealsTicker({ offline, paused, visible, beforeNavigate }: {
  offline: boolean; paused: boolean; visible: boolean; beforeNavigate: () => boolean;
}) {
  const [coupons, setCoupons] = useState<CouponView[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [fetchedAt, setFetchedAt] = useState(0);
  const [clock, setClock] = useState(Date.now());
  const [manual, setManual] = useState(false);
  const [touchPaused, setTouchPaused] = useState(false);
  const request = useRef<AbortController | null>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const refresh = useCallback(async () => {
    request.current?.abort();
    const controller = new AbortController(); request.current = controller;
    setStatus('loading');
    try {
      const result = await listCoupons({ limit: 30, codesOnly: false, signal: controller.signal });
      if (controller.signal.aborted) return;
      setCoupons(result.coupons); setFetchedAt(Date.now()); setClock(Date.now()); setStatus('ready');
    } catch {
      if (!controller.signal.aborted) { setCoupons([]); setStatus('error'); }
    }
  }, []);
  useEffect(() => {
    if (offline || !visible) { request.current?.abort(); return; }
    void refresh();
    return () => request.current?.abort();
  }, [offline, visible, refresh]);
  useEffect(() => {
    if (offline || !visible || status !== 'ready') return;
    const deadline = Math.min(fetchedAt + TICKER_FRESH_MS, ...coupons.map(c => Date.parse(c.expiresAt || '')).filter(t => t > clock));
    const timer = window.setTimeout(() => {
      setClock(Date.now());
      if (Date.now() >= fetchedAt + TICKER_FRESH_MS) void refresh();
    }, Math.max(20, deadline - Date.now() + 20));
    return () => clearTimeout(timer);
  }, [offline, visible, status, coupons, fetchedAt, clock, refresh]);
  const items = offline || status !== 'ready' || clock - fetchedAt >= TICKER_FRESH_MS ? [] : eligibleTickerOffers(coupons, clock);
  const identity = items.map(c => c.id).join('|');
  useEffect(() => {
    const track = viewport.current?.querySelector<HTMLElement>('.ticker-track');
    if (!track) return;
    const measure = () => viewport.current?.style.setProperty('--ticker-duration', `${Math.max(20, track.scrollWidth / 32)}s`);
    measure(); const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure); observer?.observe(track);
    return () => observer?.disconnect();
  }, [identity]);
  const staticMode = paused || manual || items.length < 2;
  useEffect(() => {
    if (!staticMode) { if (viewport.current) viewport.current.scrollLeft = 0; return; }
    const focused = document.activeElement as HTMLElement | null;
    if (focused && viewport.current?.contains(focused)) focused.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [staticMode]);
  const content = (hidden: boolean) => <div className="ticker-track" aria-hidden={hidden || undefined}>
    {items.map(c => <Link key={c.id} to={tickerOfferPath(c)} className="ticker-item" tabIndex={hidden ? -1 : 0}
      title={`${c.platformName}: ${c.title}. Listed offer; check terms and checkout total.`}
      onClick={event => { if (!beforeNavigate()) event.preventDefault(); else window.scrollTo({ top: 0, behavior: 'instant' }); }}>
      <span className="ticker-store">{c.platformName}</span><span className="ticker-value">{tickerDiscountLabel(c)}</span><span className="ticker-title">{c.title}</span>
    </Link>)}
  </div>;
  return <aside className={`ticker${staticMode ? ' ticker-static' : ''}${touchPaused || !visible ? ' ticker-held' : ''}`} aria-label="Current deal offers">
    <Link to="/deals" className="ticker-label" title="Listed offers—not a promise that codes have been checkout-verified"
      onClick={event => { if (!beforeNavigate()) event.preventDefault(); else window.scrollTo({ top: 0, behavior: 'instant' }); }}>
      <span className="ticker-pulse" aria-hidden="true" />Deals
    </Link>
    {items.length > 0 ? <div ref={viewport} className="ticker-viewport" onPointerDown={() => setTouchPaused(true)} onPointerLeave={() => setTouchPaused(false)}
      onPointerUp={() => setTouchPaused(false)} onPointerCancel={() => setTouchPaused(false)}
      onFocusCapture={event => { if (event.target.matches(':focus-visible')) setManual(true); }}
      onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setManual(false); }}>
      {content(false)}{content(true)}
    </div> : <div className="ticker-empty">
      <span>{offline ? 'Offline · live offers paused' : status === 'loading' ? 'Checking current offers…' : status === 'error' ? 'Offers temporarily unavailable' : 'No current offers to highlight'}</span>
      {!offline && status === 'error' && <button type="button" onClick={() => void refresh()}>Retry offers</button>}
    </div>}
  </aside>;
}
