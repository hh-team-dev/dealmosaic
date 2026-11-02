import { useEffect, useState } from 'react';
import { apiRequest } from './api';

/**
 * PINCODE — stored on the device, sent to the API only to look up facts.
 *
 * Quick-commerce prices in India change by dark store, and delivery promises
 * change by pincode. Until now that was true in the database and invisible in
 * the interface. This hook gives one input that every page can read.
 *
 * A pincode is not an identity: it is six digits shared by tens of thousands of
 * people. It is kept in `localStorage` rather than on the account so a visitor
 * who never signs up still gets local answers.
 */

const KEY = 'dealmosaic.pincode.v1';
const listeners = new Set<() => void>();

export interface LocationSummary {
  location: { pincode: string; city: string | null; state: string | null; region?: string | null };
  deliveryStyles: Array<{
    slug: string;
    name: string;
    kind: string;
    status: string;
    publishedPromise: string | null;
    band: number | string;
    bandLabel: string;
    serviceability: 'unknown';
    serviceabilityNote: string;
  }>;
  communityReports: Array<{
    platformSlug: string;
    reports: number;
    latestAt: string;
    lowestMinor: number | null;
  }>;
  disclaimer: string;
}

export function readPincode(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw && /^[1-9][0-9]{5}$/.test(raw) ? raw : null;
  } catch {
    return null;
  }
}

export function writePincode(value: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (value) window.localStorage.setItem(KEY, value);
    else window.localStorage.removeItem(KEY);
  } catch {
    /* storage can be blocked; the feature degrades to "not set" */
  }
  for (const fn of listeners) fn();
}

export function usePincode(): [string | null, (v: string | null) => void] {
  const [value, setValue] = useState<string | null>(null);
  useEffect(() => {
    const sync = (): void => setValue(readPincode());
    sync();
    listeners.add(sync);
    return () => {
      listeners.delete(sync);
    };
  }, []);
  return [value, writePincode];
}

/** Asks the API what it actually knows about this pincode. */
export function useLocationSummary(pincode: string | null): {
  data: LocationSummary | null;
  error: string | null;
  loading: boolean;
} {
  const [data, setData] = useState<LocationSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!pincode) {
      setData(null);
      setError(null);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    apiRequest<LocationSummary>(`/api/location/summary?pincode=${pincode}`, { signal: controller.signal })
      .then((d) => {
        setData(d);
        setError(null);
      })
      .catch((err: unknown) => {
        if ((err as Error).name === 'AbortError') return;
        setData(null);
        setError(err instanceof Error ? err.message : 'Could not check that pincode.');
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [pincode]);

  return { data, error, loading };
}
