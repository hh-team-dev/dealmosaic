import { apiRequest } from './api';

/** Price-alert client. Mirrors the API shape so nothing is re-derived twice. */
export interface AlertView {
  id: string;
  variantId: string;
  productTitle: string | null;
  productSlug: string | null;
  variantLabel: string | null;
  targetPriceMinor: number;
  status: 'active' | 'triggered' | 'expired' | 'paused' | string;
  createdAt: string;
  updatedAt: string;
  bestPriceMinor: number | null;
  bestPlatform: string | null;
  isBelowTarget: boolean;
}

export async function listAlerts(signal?: AbortSignal): Promise<{ alerts: AlertView[] }> {
  return apiRequest<{ alerts: AlertView[] }>('/api/alerts', { signal });
}

export async function createAlert(
  variantId: string,
  targetPrice: number,
): Promise<{ ok: true; id: string; message?: string; bestPriceMinor?: number | null }> {
  return apiRequest('/api/alerts', { method: 'POST', body: { variantId, targetPrice } });
}

export async function deleteAlert(id: string): Promise<{ ok: true }> {
  return apiRequest(`/api/alerts/${id}`, { method: 'DELETE' });
}
