import { useEffect, useState } from 'react';
import type { CouponView } from './coupons-api';

/** Device-first saved notes. Signed-in deal IDs are mirrored best-effort for
 * eligible opted-in reminders; the local board is not hydrated across devices.
 * Clearing site data removes the local records. No offline mutation queue exists.
 */

const SAVED_KEY = 'dealmosaic.saved.v1';
const VIEWED_KEY = 'dealmosaic.viewed.v1';
const MAX_VIEWED = 12;
const MAX_SAVED = 60;

export interface SavedDeal {
  id: string;
  title: string;
  merchant: string;
  merchantSlug: string;
  code: string | null;
  statedPriceMinor: number | null;
  statedPriceKind: CouponView['statedPriceKind'];
  statedPercent: number | null;
  percentIsCap: boolean;
  expiresAt: string | null;
  outboundUrl: string | null;
  savedAt: string;
  /** Which shelf it was found on, so "saved from" can be shown later. */
  group: string;
}

export interface ViewedDeal {
  id: string;
  title: string;
  merchant: string;
  merchantSlug: string;
  statedPriceMinor: number | null;
  statedPercent: number | null;
  percentIsCap: boolean;
  viewedAt: string;
}

/** Fires on every write so components in different parts of the tree agree. */
const listeners = new Set<() => void>();
function notify(): void {
  for (const fn of listeners) fn();
}

function read<T>(key: string): T[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw || raw.length > 1024 * 1024) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    // Corrupt or blocked storage (private mode, quota, disabled). Discovery is a
    // nice-to-have; it must never break the page.
    return [];
  }
}

function write<T>(key: string, value: T[]): boolean {
  if (typeof window === 'undefined') return false;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    window.dispatchEvent(new Event('dealmosaic:storage-error'));
    return false;
  }
  notify();
  return true;
}

export function readSaved(): SavedDeal[] {
  return read<unknown>(SAVED_KEY).filter((value): value is SavedDeal => {
    if (!value || typeof value !== 'object') return false;
    const d = value as SavedDeal;
    return ['id', 'title', 'merchant', 'merchantSlug', 'savedAt', 'group'].every(key => typeof (d as unknown as Record<string, unknown>)[key] === 'string')
      && d.id.length > 0 && d.id.length <= 128 && !Number.isNaN(Date.parse(d.savedAt))
      && (d.code === null || typeof d.code === 'string') && (d.outboundUrl === null || typeof d.outboundUrl === 'string')
      && (d.statedPriceMinor === null || (Number.isSafeInteger(d.statedPriceMinor) && d.statedPriceMinor >= 0))
      && (d.statedPercent === null || (typeof d.statedPercent === 'number' && Number.isFinite(d.statedPercent)))
      && typeof d.percentIsCap === 'boolean' && (d.expiresAt === null || typeof d.expiresAt === 'string');
  }).slice(0, MAX_SAVED);
}

export function readViewed(): ViewedDeal[] {
  return read<unknown>(VIEWED_KEY).filter((value): value is ViewedDeal => {
    if (!value || typeof value !== 'object') return false;
    const d = value as ViewedDeal;
    return ['id', 'title', 'merchant', 'merchantSlug', 'viewedAt'].every(key => typeof (d as unknown as Record<string, unknown>)[key] === 'string')
      && d.id.length > 0 && !Number.isNaN(Date.parse(d.viewedAt))
      && (d.statedPercent === null || (typeof d.statedPercent === 'number' && Number.isFinite(d.statedPercent)));
  }).slice(0, MAX_VIEWED);
}

export function isSaved(id: string): boolean {
  return readSaved().some((d) => d.id === id);
}

/** The minimum a caller must know to save something — deliberately small. */
export interface SaveableDeal {
  id: string;
  title: string;
  campaignName: string;
  platformName: string;
  platformSlug: string;
  code: string | null;
  statedPriceMinor: number | null;
  statedPriceKind: CouponView['statedPriceKind'];
  statedPercent: number | null;
  percentIsCap: boolean;
  expiresAt: string | null;
  outboundUrl: string | null;
  dealGroup: CouponView['dealGroup'];
}

/**
 * TELL THE SERVER, WHEN THERE IS A SERVER TO TELL.
 *
 * The list stays device-first: it works with no account, no network and no
 * cookies. But a signed-in shopper who saves a deal should also get the weekly
 * email about it, and the server cannot email an offer it has never heard of — so
 * the id is mirrored up, best effort, and a failure changes nothing on this device.
 *
 * `void` on purpose: saving a deal must never wait for a network round trip, and
 * a 401 for an anonymous visitor is the normal answer, not an error.
 */
function mirrorToServer(dealId: string, saved: boolean): void {
  void (async () => {
    try {
      const { apiRequest } = await import('./api');
      if (saved) {
        await apiRequest('/api/me/saved-deals', { method: 'POST', body: { couponId: dealId } });
      } else {
        await apiRequest(`/api/me/saved-deals/${encodeURIComponent(dealId)}`, { method: 'DELETE' });
      }
    } catch {
      /* Not signed in, offline, or the API refused. The device list is unaffected.
         The Saved page reports actual account linkage, never assumed reminders. */
    } finally {
      window.dispatchEvent(new Event('dealmosaic:saved-account-change'));
    }
  })();
}

export function toggleSaved(deal: SaveableDeal): boolean | null {
  const existing = readSaved();
  const without = existing.filter((d) => d.id !== deal.id);
  if (without.length !== existing.length) {
    if (!write(SAVED_KEY, without)) return null;
    mirrorToServer(deal.id, false);
    return false;
  }
  const entry: SavedDeal = {
    id: deal.id,
    title: deal.title,
    merchant: deal.campaignName || deal.platformName,
    merchantSlug: deal.platformSlug,
    code: deal.code,
    statedPriceMinor: deal.statedPriceMinor,
    statedPriceKind: deal.statedPriceKind,
    statedPercent: deal.statedPercent,
    percentIsCap: deal.percentIsCap,
    expiresAt: deal.expiresAt,
    outboundUrl: deal.outboundUrl,
    savedAt: new Date().toISOString(),
    group: deal.dealGroup,
  };
  if (!write(SAVED_KEY, [entry, ...without].slice(0, MAX_SAVED))) return null;
  mirrorToServer(deal.id, true);
  return true;
}

export function recordView(deal: CouponView): void {
  const existing = readViewed().filter((d) => d.id !== deal.id);
  const entry: ViewedDeal = {
    id: deal.id,
    title: deal.title,
    merchant: deal.campaignName || deal.platformName,
    merchantSlug: deal.platformSlug,
    statedPriceMinor: deal.statedPriceMinor,
    statedPercent: deal.statedPercent,
    percentIsCap: deal.percentIsCap,
    viewedAt: new Date().toISOString(),
  };
  write(VIEWED_KEY, [entry, ...existing].slice(0, MAX_VIEWED));
}

export function clearViewed(): void {
  write(VIEWED_KEY, []);
}

export function clearSaved(): void {
  const existing = readSaved();
  if (write(SAVED_KEY, [])) for (const item of existing) mirrorToServer(item.id, false);
}

/** Subscribes to changes in the given list. Returns the current value. */
function useStoredList<T>(key: string, readValid: () => T[]): T[] {
  const [items, setItems] = useState<T[]>([]);
  useEffect(() => {
    const sync = (): void => setItems(readValid());
    sync();
    listeners.add(sync);
    // Another tab saving a deal should light up this tab too.
    const onStorage = (e: StorageEvent): void => {
      if (e.key === key || e.key === null) sync();
    };
    window.addEventListener('storage', onStorage);
    return () => {
      listeners.delete(sync);
      window.removeEventListener('storage', onStorage);
    };
  }, [key, readValid]);
  return items;
}

export function useSaved(): SavedDeal[] {
  return useStoredList<SavedDeal>(SAVED_KEY, readSaved);
}

export function useViewed(): ViewedDeal[] {
  return useStoredList<ViewedDeal>(VIEWED_KEY, readViewed);
}
