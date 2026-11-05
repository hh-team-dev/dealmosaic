import { useSyncExternalStore } from 'react';

export const PWA_VERSION = String(import.meta.env.VITE_RELEASE_VERSION);
export const PWA_ENABLED = import.meta.env.VITE_PWA_MODE !== 'classic';
const DISABLED = 'dealmosaic.offline-disabled.v1';
const CACHE_PREFIX = 'dealmosaic-pwa-';
type InstallEvent = Event & { prompt(): Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> };
type Snapshot = { installed: boolean; offline: boolean; disconnected: boolean; bootOffline: boolean; canInstall: boolean; ready: boolean; updateReady: boolean; changed: boolean; disabled: boolean; message: string; busy: boolean };
const standalone = () => window.matchMedia('(display-mode: standalone)').matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
const readDisabled = () => { try { return localStorage.getItem(DISABLED) === '1'; } catch { return false; } };
const initialOffline = Boolean((window as Window & { __DM_OFFLINE_SHELL__?: boolean }).__DM_OFFLINE_SHELL__);
let state: Snapshot = { installed: standalone(), offline: !navigator.onLine, disconnected: initialOffline || !navigator.onLine, bootOffline: initialOffline, canInstall: false, ready: false, updateReady: false, changed: false, disabled: readDisabled(), message: '', busy: false };
const listeners = new Set<() => void>();
let registration: ServiceWorkerRegistration | undefined;
let deferred: InstallEvent | undefined;
let reloadOnChange = false;
let initialized = false;
let lastCheck = 0;
const patch = (next: Partial<Snapshot>) => { state = { ...state, ...next }; for (const fn of listeners) fn(); };
export const usePwa = () => useSyncExternalStore(fn => { listeners.add(fn); return () => { listeners.delete(fn); }; }, () => state, () => state);
export const sensitiveTask = (path: string) => /^\/stays\/plan(\/|$)/.test(path) || /^\/(stays|dining)\/compare(\/|$)/.test(path) || /^\/(admin|buy|direct-orders|app|login|register|verify-email|reset-password|forgot-password)(\/|$)/.test(path);

async function offlineReady() {
  try {
    const names = (await caches.keys()).filter(key => key.startsWith(CACHE_PREFIX));
    const shells = await Promise.all(names.map(async name => Boolean(await caches.match('/pwa-shell.html', { cacheName: name }))));
    patch({ ready: Boolean(registration?.active) && shells.some(Boolean) });
  }
  catch { patch({ ready: false }); }
}
async function register() {
  if (!('serviceWorker' in navigator) || !window.isSecureContext || !import.meta.env.PROD) return;
  try {
    // A fresh classic visit must not create a new removal worker. That can race
    // an immediate switch back to PWA while its own unregister is still pending.
    if (!PWA_ENABLED && !await navigator.serviceWorker.getRegistration('/')) return;
    registration = await navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' });
    if (!PWA_ENABLED) return; // The classic build serves a self-removing network-only worker.
    if (registration.waiting) patch({ updateReady: true });
    const current = registration;
    const observed = new WeakSet<ServiceWorker>();
    const observeInstall = () => {
      const worker = current.installing;
      if (!worker || observed.has(worker)) return;
      observed.add(worker);
      // Determine this for EACH installation, not once when the first worker registers.
      const replacesActive = Boolean(current.active && current.active !== worker);
      const changed = () => {
        if (worker.state === 'installed') {
          if (replacesActive) patch({ updateReady: true });
          else void navigator.serviceWorker.ready.then(() => { patch({ updateReady: false }); return offlineReady(); });
        }
        if (worker.state === 'activated') void offlineReady();
        if (worker.state === 'redundant') patch({ message: 'Offline files could not be prepared. The online website still works; try checking again.' });
      };
      worker.addEventListener('statechange', changed);
      changed();
    };
    current.addEventListener('updatefound', observeInstall);
    observeInstall();
    await offlineReady();
  } catch {
    patch({ message: 'Offline access is unavailable in this browser right now. You can still use the online website.', ready: false });
  }
}
export function initPwa() {
  if (initialized) return;
  initialized = true;
  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    if (PWA_ENABLED) { deferred = event as InstallEvent; patch({ canInstall: true }); }
  });
  window.addEventListener('appinstalled', () => { deferred = undefined; patch({ installed: true, canInstall: false, message: 'DealMosaic was added. Look for its icon on your home screen or app launcher.' }); });
  window.matchMedia('(display-mode: standalone)').addEventListener?.('change', () => patch({ installed: standalone() }));
  window.addEventListener('offline', () => patch({ offline: true, disconnected: true }));
  // Do not treat the connectivity flag as proof of API reachability or replay any action.
  window.addEventListener('online', () => patch({ offline: false }));
  if ('serviceWorker' in navigator) navigator.serviceWorker.addEventListener('controllerchange', () => {
    void offlineReady();
    if (reloadOnChange) { reloadOnChange = false; window.location.reload(); }
    else if (registration?.active && state.ready) patch({ changed: true, updateReady: false });
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && navigator.onLine && Date.now() - lastCheck > 60 * 60 * 1000) {
      lastCheck = Date.now(); void registration?.update().catch(() => {});
    }
  });
  if (!state.disabled || !PWA_ENABLED) void register();
}
export async function installApp() {
  if (!deferred || state.installed) { patch({ message: 'Use the browser-specific installation steps below.' }); return; }
  const event = deferred; deferred = undefined; patch({ busy: true, canInstall: false, message: '' });
  try {
    await event.prompt(); const result = await event.userChoice;
    patch({ message: result.outcome === 'accepted' ? 'Installation was accepted. Your browser will finish adding the app.' : 'No problem. Keep using the website; you can install later from your browser menu.' });
  } catch { patch({ message: 'The install prompt could not open. Use your browser menu and the steps below.' }); }
  finally { patch({ busy: false }); }
}
export async function checkForUpdate() {
  if (!navigator.onLine) { patch({ message: 'Reconnect before checking for updates.' }); return; }
  patch({ busy: true, message: '' });
  try {
    if (!registration) await register();
    if (!registration) throw new Error('unavailable');
    await registration.update();
    patch({ updateReady: Boolean(registration.waiting), message: registration.waiting ? 'An update is ready. Save your work before applying it.' : 'Update check finished. New files may still be preparing; a ready update will appear here.' });
    await offlineReady();
  } catch { patch({ message: 'Could not check for updates. Check your connection and try again.' }); }
  finally { patch({ busy: false }); }
}
export function applyUpdate() {
  if (sensitiveTask(window.location.pathname)) { patch({ message: 'Finish your current task first. Apply updates from Install & app settings.' }); return; }
  if (!navigator.onLine) { patch({ message: 'Reconnect before applying an update.' }); return; }
  if (!window.confirm('Reload with the current app version? Save any work in this window first. Other windows will not reload.')) return;
  if (registration?.waiting) { reloadOnChange = true; registration.waiting.postMessage({ type: 'ACTIVATE_UPDATE' }); }
  else window.location.reload();
}
export async function reconnect() {
  patch({ busy: true, message: '' });
  try {
    const response = await fetch('/pwa-release.json', { cache: 'no-store', signal: AbortSignal.timeout(10000) });
    const result = await response.json();
    if (!response.ok || !result.version) throw new Error('offline');
    if (sensitiveTask(window.location.pathname) && !window.confirm('Reload current information? Unsaved fields in this window will be lost. No payment or change will be sent automatically.')) return;
    window.location.reload();
  } catch { patch({ message: 'The site could not be reached. Your local saved list is still available. No action has been queued.' }); }
  finally { patch({ busy: false }); }
}
export async function setOfflineAccess(enabled: boolean) {
  if (!navigator.onLine) { patch({ message: 'Reconnect before changing offline access.' }); return; }
  patch({ busy: true, message: '' });
  try {
    if (enabled) {
      localStorage.removeItem(DISABLED); patch({ disabled: false });
      if (!state.ready && registration) { await registration.unregister(); registration = undefined; }
      await register();
      if (registration) patch({ message: 'Preparing offline access. Keep this window open until Offline ready appears.' });
    } else {
      localStorage.setItem(DISABLED, '1');
      for (const reg of await navigator.serviceWorker.getRegistrations()) {
        const worker = reg.active || reg.waiting || reg.installing;
        if (worker && new URL(worker.scriptURL).pathname === '/sw.js' && new URL(worker.scriptURL).origin === location.origin) await reg.unregister();
      }
      for (const name of await caches.keys()) if (name.startsWith(CACHE_PREFIX)) await caches.delete(name);
      registration = undefined; patch({ disabled: true, ready: false, updateReady: false, message: 'Online-only mode is set. Saved deals and account cookies were kept. Reload to finish switching this window.' });
    }
  } catch { patch({ message: 'This browser blocked the storage change. Nothing was cleared from your saved list or account.' }); }
  finally { patch({ busy: false }); }
}
export async function protectStorage() {
  if (!navigator.storage?.persist) { patch({ message: 'This browser manages storage automatically. Offline files are not a permanent backup.' }); return; }
  try {
    const granted = await navigator.storage.persist();
    patch({ message: granted ? 'The browser granted persistent storage. Clearing site data can still remove it.' : 'The browser did not grant persistent storage. Offline access still works while its files are kept.' });
  } catch { patch({ message: 'Storage protection is unavailable. Keep using the website normally.' }); }
}
export async function shareApp() {
  const url = new URL('/install', window.location.origin).href;
  try {
    if (navigator.share) await navigator.share({ title: 'DealMosaic', text: 'Real totals. Honest comparisons. Add DealMosaic to your home screen.', url });
    else { await navigator.clipboard.writeText(url); patch({ message: 'Install guide link copied.' }); }
  } catch (error) {
    if ((error as Error).name !== 'AbortError') patch({ message: 'Sharing was blocked. Copy this link manually: ' + url });
  }
}
