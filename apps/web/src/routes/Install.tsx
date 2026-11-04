import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Chrome } from '../components/PublicChrome';
import { Seo } from '../lib/seo';
import { PWA_ENABLED, PWA_VERSION, applyUpdate, checkForUpdate, installApp, protectStorage, reconnect, setOfflineAccess, shareApp, usePwa } from '../lib/pwa';

export default function Install() {
  const app = usePwa();
  const [storage, setStorage] = useState<string | null>(null);
  const apple = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  useEffect(() => {
    let live = true;
    void navigator.storage?.estimate?.().then(value => { if (live && value.usage !== undefined) setStorage((value.usage / 1024 / 1024).toFixed(1)); }).catch(() => {});
    return () => { live = false; };
  }, [app.ready, app.disabled]);
  return <Chrome>
    <Seo title="Install DealMosaic · app settings" description="Add DealMosaic to your home screen, manage offline access and apply updates when you are ready." path="/install" index={false} />
    <div className="container section stack stack-lg pwa-guide">
      <header className="card card-lg pwa-install-hero stack">
        <div className="row wrap"><img src="/brand/dm-icon-192.png" width="64" height="64" alt="" /><span className="badge badge-lime">Same DealMosaic. One tap away.</span></div>
        <h1>{app.installed ? 'Your DealMosaic app' : 'A home for smarter shopping'}</h1>
        <p className="lede">Keep DealMosaic on your home screen. The same comparisons, deals, account and owner-operated shop—without maintaining a separate app account.</p>
        <div className="row wrap">
          {app.installed ? <span className="badge badge-grass">Open in app mode</span> : app.canInstall && PWA_ENABLED ? <button className="btn btn-primary" disabled={app.busy} onClick={() => void installApp()}>Install DealMosaic</button> : <a className="btn btn-primary" href="#install-steps">{apple ? 'See iPhone / iPad steps' : 'See installation steps'}</a>}
          <button className="btn btn-quiet" onClick={() => void shareApp()}>Share install guide</button>
        </div>
        <p className="small muted">Free to add. No app-store download required. Installation, browser storage and device features are controlled by your browser and operating system.</p>
      </header>
      {app.message && <div className="callout" role="status">{app.message}</div>}
      <section className="pwa-feature-grid" aria-label="What changes when you install">
        <article className="card card-lg"><h2 className="h3">One product, not two</h2><p>The website and app share the same code, prices, ranking rules and server data. Commission never changes the ranking.</p></article>
        <article className="card card-lg"><h2 className="h3">A useful offline fallback</h2><p>Read and copy deals already saved on this browser. Their prices and codes are saved notes—not current quotes. Reconnect to shop or change your list.</p></article>
        <article className="card card-lg"><h2 className="h3">Updates on your terms</h2><p>New files prepare in the background. We do not force-reload checkout, payment or owner forms. Apply a ready update when your work is saved.</p></article>
      </section>
      <section className="card card-lg stack" id="install-steps">
        <span className="eyebrow">Choose your device</span><h2>Install in a few taps</h2>
        <details open={apple}><summary>iPhone or iPad</summary><ol><li>Open DealMosaic in Safari. If you are inside another app, open the link in your browser first.</li><li>Open the Share menu, then choose <strong>Add to Home Screen</strong>.</li><li>If shown, turn on <strong>Open as Web App</strong>, then tap <strong>Add</strong>.</li></ol><p className="small">If the action is missing, check Edit Actions in the Share menu. The website cannot force an iPhone installation prompt.</p></details>
        <details open={!apple}><summary>Android phone or tablet</summary><ol><li>Open DealMosaic in Chrome or another browser that supports web-app installation.</li><li>Use <strong>Install DealMosaic</strong> above when available, or open the browser menu and look for <strong>Install app</strong> or <strong>Add to Home screen</strong>.</li><li>Confirm, then launch the DealMosaic icon. Menu wording varies by browser.</li></ol><p className="small">If you only get a shortcut, you can still use the full website. Private browsing and embedded browsers may not support installation.</p></details>
        <details><summary>Computer</summary><p>In a supporting browser, look for its install control or app menu. On supported Safari versions on Mac, use Add to Dock. A regular browser tab always remains an option.</p></details>
      </section>
      <section className="card card-lg stack" aria-labelledby="app-controls">
        <h2 id="app-controls">Install & app settings</h2>
        <dl className="pwa-status"><div><dt>Release</dt><dd>DealMosaic {PWA_VERSION} · {PWA_ENABLED ? 'PWA + website' : 'Online-only website'}</dd></div><div><dt>Offline files</dt><dd>{!PWA_ENABLED ? 'Not enabled in this release' : app.disabled ? 'Online-only mode selected' : app.ready ? 'Offline ready' : 'Not prepared yet'}</dd></div><div><dt>Connection</dt><dd>{app.offline ? 'Offline' : app.disconnected ? 'Refresh needed to confirm' : 'Device reports online; requests are checked individually'}</dd></div>{storage && <div><dt>Site storage estimate</dt><dd>{storage} MiB across this browser’s site data</dd></div>}</dl>
        <div className="row wrap">
          <button className="btn btn-quiet" disabled={app.busy || app.offline || app.disabled || !PWA_ENABLED || !('serviceWorker' in navigator)} onClick={() => void checkForUpdate()}>Check for updates</button>
          {(app.updateReady || app.changed) && <button className="btn btn-primary" disabled={app.offline} onClick={applyUpdate}>Apply update & reload</button>}
          <button className="btn btn-ghost" disabled={app.busy} onClick={() => void reconnect()}>Reload current information</button>
        </div>
        {PWA_ENABLED && 'serviceWorker' in navigator && <div className="row wrap">
          <button className="btn btn-quiet" disabled={app.busy || app.offline} onClick={() => void setOfflineAccess(app.disabled || !app.ready)}>{app.disabled || !app.ready ? 'Prepare offline access' : 'Use online-only mode'}</button>
          {typeof navigator.storage?.persist === 'function' && <button className="btn btn-ghost" disabled={app.busy || !app.ready} onClick={() => void protectStorage()}>Ask browser to keep offline files</button>}
        </div>}
        <p className="small muted">Online-only mode removes only DealMosaic’s offline app files. It does not clear saved deals, account cookies or order-link storage. Reload after switching. To remove the home-screen icon, use your device’s app or home-screen controls.</p>
      </section>
      <section className="card card-lg stack">
        <h2>What still needs a connection?</h2>
        <p>Current prices, search results, availability, shipping checks, sign-in, owner controls, orders and payment confirmation. Nothing financial is retried or submitted later in the background.</p>
        <p>Installation does not enable push notifications. Existing account email preferences still apply. DealMosaic does not request notification, location, camera or microphone permissions just because you install it.</p>
        <p>Some browsers keep the installed app’s storage separate from browser tabs. You may need to sign in again. Guest saved lists do not automatically move between browsers or devices; keep your private order link somewhere safe. Clearing site data can remove local saves and offline files.</p>
        <div className="row wrap"><Link className="btn btn-primary" to="/deals">Explore deals</Link><Link className="btn btn-quiet" to="/saved">Your saved deals</Link><Link className="btn btn-ghost" to="/privacy">Privacy & data</Link></div>
      </section>
    </div>
  </Chrome>;
}
