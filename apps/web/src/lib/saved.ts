import { useEffect, useState } from 'react';
import type { CouponView } from './coupons-api';

/**
 * THINGS THE SHOPPER KEEPS — WITHOUT AN ACCOUNT.
 *
 * A wishlist that requires registration before it works is a wishlist nobody
 * uses. These two lists therefore live in `localStorage` and work for a first-
 * time visitor on a phone, with no sign-up, no cookie banner and no server round
 * trip. That is also the cheapest possible implementation, which matters here.
 *
 * What is stored is deliberately **only what the deal card already showed**:
 * the title, the store, the code, the stated price and percentage, and the
 * expiry. No browsing history of third-party sites, no search queries, no
 * identifiers, nothing that could be joined to a person. When a shopper clears
 * their browser the record is gone, which is the correct behaviour for data that
 * was never given to us in the first place.
 *
 * `price_alerts` (a real, growing-price notification with email delivery) needs
 * a verified address, so that stays a signed-in feature — see docs/25.
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
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    // Corrupt or blocked storage (private mode, quota, disabled). Discovery is a
    // nice-to-have; it must never break the page.
    return [];
  }
}

function write<T>(key: string, value: T[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore: a full quota is not worth an error dialog.
  }
  notify();
}

export function readSaved(): SavedDeal[] {
  return read<SavedDeal>(SAVED_KEY);
}

export function readViewed(): ViewedDeal[] {
  return read<ViewedDeal>(VIEWED_KEY);
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

export function toggleSaved(deal: SaveableDeal): boolean {
  const existing = readSaved();
  const without = existing.filter((d) => d.id !== deal.id);
  if (without.length !== existing.length) {
    write(SAVED_KEY, without);
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
  write(SAVED_KEY, [entry, ...without].slice(0, MAX_SAVED));
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
  write(SAVED_KEY, []);
}

/** Subscribes to changes in the given list. Returns the current value. */
function useStoredList<T>(key: string): T[] {
  const [items, setItems] = useState<T[]>([]);
  useEffect(() => {
    const sync = (): void => setItems(read<T>(key));
    sync();
    listeners.add(sync);
    // Another tab saving a deal should light up this tab too.
    const onStorage = (e: StorageEvent): void => {
      if (e.key === key) sync();
    };
    window.addEventListener('storage', onStorage);
    return () => {
      listeners.delete(sync);
      window.removeEventListener('storage', onStorage);
    };
  }, [key]);
  return items;
}

export function useSaved(): SavedDeal[] {
  return useStoredList<SavedDeal>(SAVED_KEY);
}

export function useViewed(): ViewedDeal[] {
  return useStoredList<ViewedDeal>(VIEWED_KEY);
}
