import { apiRequest } from './api';

/**
 * Client for the owner's control centre.
 *
 * Every call here can return 401 (not signed in) or 403 (signed in, not an
 * administrator). The UI treats those as terminal states and stops — it never
 * renders a disabled-looking version of a page the server would refuse anyway.
 */

export interface AdminOverview {
  coupons: {
    total: number;
    live: number;
    expired: number;
    with_code: number;
    with_price: number;
    rejected: number;
    community_verified: number;
    stores: number;
  };
  people: { users: number; verified: number; inactive: number };
  catalogue: {
    products: number;
    variants: number;
    offers: number;
    snapshots: number;
    alerts: number;
    community: number;
    community_pending: number;
  };
  job: { due: boolean; lastStartedAt: string | null; lastFinishedAt: string | null; lastOk: boolean | null; lastResult: string | null } | null;
  affiliate: { tracked: number; earning: number; merchantsTracked: number; merchantsEarning: number; lastSyncedAt: string | null } | null;
  now: string;
}

export interface AdminCoupon {
  id: string;
  platform_slug: string;
  campaign_name: string | null;
  code: string | null;
  title: string;
  trust_state: string;
  source: string;
  expires_at: string | null;
  success_count: number;
  fail_count: number;
  stated_percent: number | null;
  stated_price_minor: number | null;
  offer_type: string | null;
  tracking_url: string | null;
  affiliate_status: string | null;
}

export interface AdminReport {
  id: string;
  title: string | null;
  variant_label: string | null;
  platform_slug: string;
  price_minor: number;
  pincode: string | null;
  observed_at: string | null;
  trust_state: string;
}

export interface AdminUser {
  id: string;
  email: string;
  display_name: string | null;
  role: string;
  status: string;
  email_verified_at: string | null;
  created_at: string;
}

export interface AdminAuditEntry {
  id: string;
  actor_email: string;
  action: string;
  entity: string;
  entity_id: string;
  before_json: string | null;
  after_json: string | null;
  at: string;
}

export const getOverview = (signal?: AbortSignal) => apiRequest<AdminOverview>('/api/admin/overview', { signal });

export const listAdminCoupons = (state: string, q: string, signal?: AbortSignal) =>
  apiRequest<{ state: string; count: number; coupons: AdminCoupon[] }>(
    `/api/admin/coupons?state=${encodeURIComponent(state)}${q ? `&q=${encodeURIComponent(q)}` : ''}`,
    { signal },
  );

export const setCouponState = (id: string, trustState: string) =>
  apiRequest<{ ok: boolean }>(`/api/admin/coupons/${id}/state`, { method: 'POST', body: { trustState } });

export const listReports = (signal?: AbortSignal) =>
  apiRequest<{ count: number; reports: AdminReport[] }>('/api/admin/community', { signal });

export const setReportState = (id: string, trustState: string) =>
  apiRequest<{ ok: boolean }>(`/api/admin/community/${id}/state`, { method: 'POST', body: { trustState } });

export const listUsers = (signal?: AbortSignal) =>
  apiRequest<{ count: number; users: AdminUser[] }>('/api/admin/users', { signal });

export const setUserRole = (id: string, role: string) =>
  apiRequest<{ ok: boolean }>(`/api/admin/users/${id}/role`, { method: 'POST', body: { role } });

export const listAudit = (signal?: AbortSignal) =>
  apiRequest<{ count: number; entries: AdminAuditEntry[] }>('/api/admin/audit', { signal });

export const getJobs = (signal?: AbortSignal) =>
  apiRequest<{
    job: { due: boolean; lastStartedAt: string | null; lastFinishedAt: string | null; lastOk: boolean | null; lastResult: string | null } | null;
    runs: Array<Record<string, unknown>>;
  }>('/api/admin/jobs', { signal });
