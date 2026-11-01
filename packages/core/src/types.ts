/**
 * Shared types between API and web. Provenance is part of the type system so the
 * UI cannot accidentally present demo data as live, or a community-reported price
 * as a verified retailer price.
 */

export type DataOrigin = 'live' | 'feed' | 'community' | 'demo';
export type TrustTier = 'verified_retailer' | 'moderator_verified' | 'community' | 'demo';

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  emailVerified: boolean;
  role: 'user' | 'admin' | 'super_admin';
  createdAt: string;
  phone: string | null;
}

export interface UserPreferences {
  countryCode: string;
  displayCurrency: string;
  pincode: string | null;
  notifyInApp: boolean;
  notifyEmail: boolean;
}

export interface SessionPayload {
  user: UserProfile;
  preferences: UserPreferences;
  csrfToken: string;
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    /** field-level messages for forms */
    fields?: Record<string, string>;
  };
}

/** Retailer / quick-commerce platform registry entry (Phase 1 seeds reference data). */
export interface PlatformSummary {
  slug: string;
  name: string;
  kind: 'marketplace' | 'quick_commerce' | 'grocery';
  status: 'live' | 'community_only' | 'pending_approval' | 'no_public_api';
  statusNote: string;
  deliveryPromise: string | null;
  deepLinkTemplate: string | null;
  affiliate: boolean;
}
