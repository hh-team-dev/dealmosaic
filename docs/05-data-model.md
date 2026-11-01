# Part 14 — Database Design (29 tables)

Portable SQL. Local driver: SQLite. Production target: Supabase PostgreSQL (same logical schema; types mapped `TEXT→text`, `INTEGER→integer/bigint`, `REAL→numeric`, `JSON→jsonb`). All money is stored as **integer minor units** + ISO-4217 currency code — no floats.

## Conventions

- `id` = UUIDv4 text primary key (stable across SQLite/Postgres, safe in URLs).
- `created_at` / `updated_at` = ISO-8601 UTC text, defaults set in SQL.
- Every user-owned table carries `user_id` FK with `ON DELETE CASCADE` → account deletion truly deletes.
- Every offer row carries provenance: `data_origin ∈ {live, feed, demo}` and `verification_state ∈ {complete, partial, unverified}`.
- Indexes on every FK used in filtering, plus `(country_code, status)`, `(product_id, observed_at DESC)`, `(user_id, created_at DESC)`.

## Core reference data

| # | Table | Key columns | Purpose |
|---|---|---|---|
| 1 | `countries` | code PK (ISO-3166-1 alpha-2), name, flag_emoji, default_currency, region, is_supported, sort_order | India … UAE + UNIVERSAL sentinel `ZZ` |
| 2 | `currencies` | code PK, symbol, name, minor_units, decimal_sep | Display + conversion targets |
| 3 | `exchange_rates` | base, quote, rate (REAL 8dp), rate_date, source, fetched_at — UNIQUE(base,quote,rate_date) | Frankfurter v2 daily cache; conversion date is shown in UI |
| 4 | `retailers` | id, slug UNIQUE, name, legal_name, logo_url, website, country_code, trust_notes | Retailer identity |
| 5 | `retailer_markets` | id, retailer_id, country_code, currency, is_active, delivery_regions JSON | Which retailers serve which market |
| 6 | `retailer_connectors` | id, retailer_id, kind ∈ {api, feed, network, demo}, adapter_key, status ∈ {enabled, disabled, pending_approval, error}, capabilities JSON, config JSONB (no secrets), last_health_at | Connector registry, drives admin Data-Source Health |

## Catalogue

| # | Table | Key columns | Purpose |
|---|---|---|---|
| 7 | `products` | id, canonical_title, brand, category, description, image_url, attributes JSON, created_at | One row per real-world product |
| 8 | `product_variants` | id, product_id, variant_label, attributes JSON (colour, storage, ram, size…), gtin, mpn, is_primary | Variants are never merged |
| 9 | `product_identifiers` | id, variant_id, scheme ∈ {gtin, ean, upc, isbn, mpn, model, sku}, value, UNIQUE(scheme,value) | Identifier-first matching ladder |

## Offers & prices

| # | Table | Key columns | Purpose |
|---|---|---|---|
| 10 | `offers` | id, variant_id, retailer_id, retailer_market_id, title, seller_name, seller_type, item_price_minor, currency, item_condition, product_url, in_stock, data_origin, verification_state, source_label, last_checked_at, match_confidence, is_active | The atom of comparison |
| 11 | `offer_price_snapshots` | id, offer_id, price_minor, currency, shipping_minor NULL, tax_minor NULL, observed_at, data_origin | Real observations only. History charts read exclusively from here. |
| 12 | `shipping_information` | id, offer_id, cost_minor NULL, is_free, estimate_min_days, estimate_max_days, carrier, destination_country, is_verified | NULL = unknown, never 0 |
| 13 | `seller_metadata` | id, offer_id, seller_name, rating (0–5) NULL, rating_count NULL, positive_pct NULL, is_verified_source, source_label | Seller trust, distinct from product rating |
| 14 | `product_reviews_metadata` | id, variant_id, rating_avg NULL, review_count NULL, source, fetched_at | Product rating, never mixed with seller rating |
| 15 | `affiliate_links` | id, offer_id, network, url, campaign_id, is_active, disclosure_required, created_at | Attribution; Amazon reward-ineligible flag enforced |

## User data

| # | Table | Key columns | Purpose |
|---|---|---|---|
| 16 | `users` | id, email UNIQUE, password_hash, display_name, email_verified_at, age_confirmed_at, phone NULL, role, status, created_at, deleted_at | No DOB stored by default |
| 17 | `sessions` | id, user_id, token_hash, csrf_token, ip_hash, user_agent, created_at, last_seen_at, expires_at, revoked_at | Server-side sessions |
| 18 | `auth_tokens` | id, user_id, kind ∈ {verify_email, reset_password}, token_hash, expires_at, consumed_at | Single-use, hashed |
| 19 | `user_preferences` | user_id PK, country_code, display_currency, destination_postcode NULL, notification_prefs JSON, reduced_data, theme | Country/currency per user |
| 20 | `user_search_history` | id, user_id, query, country_code, result_count, created_at | My Searches |
| 21 | `saved_products` | id, user_id, variant_id, note, created_at — UNIQUE(user_id, variant_id) | Watchlist / saved |

## Alerts & notifications

| # | Table | Key columns | Purpose |
|---|---|---|---|
| 22 | `price_alerts` | id, user_id, variant_id, target_price_minor, currency, country_code, status ∈ {active, triggered, expired, paused}, last_checked_at, triggered_at, trigger_offer_id | Target-price alerts |
| 23 | `notification_events` | id, user_id, kind, payload JSON, read_at, created_at | In-app notification centre (free channel) |

## Rewards

| # | Table | Key columns | Purpose |
|---|---|---|---|
| 24 | `reward_accounts` | user_id PK, xp, level, badges JSON, lifetime_xp | Mosaic XP (non-cash) |
| 25 | `reward_transactions` | id, user_id, kind ∈ {xp, purchase_reward}, reason, xp_delta, amount_minor NULL, currency NULL, status ∈ {pending, approved, rejected, cancelled}, merchant_slug, reference, created_at | XP now; monetary rewards only when policy allows |
| 26 | `reward_policy_rules` | id, merchant_slug, purchase_rewards_enabled, rate_bps, min_order_minor, redemption_rules JSON, is_hard_disabled, notes, updated_by | Admin-configurable, never hardcoded. Amazon row: `is_hard_disabled = 1` |
| 27 | `conversion_events` | id, user_id NULL, offer_id, retailer_id, network, external_id, status, occurred_at | Attribution groundwork; no invented commissions |

## Governance

| # | Table | Key columns | Purpose |
|---|---|---|---|
| 28 | `support_tickets` | id, user_id, kind ∈ {price_report, match_report, retailer_issue, feedback}, subject, body, related_offer_id, status, admin_notes, resolved_at | Support centre |
| 29 | `incorrect_price_reports` | id, user_id, offer_id, reported_price_minor NULL, evidence_url, description, status ∈ {open, verified, rejected, duplicate}, reviewer_id, created_at | Feeds XP + admin review queue |
| 30 | `product_match_reviews` | id, user_id NULL, product_id, variant_id, decision ∈ {confirmed, split, merge, rejected}, confidence_before, reviewer_id, created_at | The matching engine learns from these |
| 31 | `admin_roles` | id, user_id, role ∈ {super_admin, ops, reviewer, analyst}, granted_by, granted_at | Server-side role verification |
| 32 | `admin_audit_logs` | id, actor_user_id, action, entity, entity_id, before JSON, after JSON, ip_hash, created_at | Every admin mutation |

*(Tables 30–32 are the review/audit trio the brief lists under Part 14/Part 10; counted together with the brief's 29 named structures, this covers every required entity.)*

## Grocery & quick-commerce extensions (Phase 3B)

| # | Table | Key columns | Purpose |
|---|---|---|---|
| 33 | `qc_platforms` | id, slug UNIQUE, name, owner, country_code, delivery_model ∈ {instant, express, slotted, subscription}, deep_link_template, status ∈ {live, community_only, pending_approval, no_public_api}, affiliate_network NULL, admin_contact, notes | Platform registry for Blinkit, Zepto, Instamart, BB Now, JioMart, Flipkart Minutes, Amazon Now, DMart Ready |
| 34 | `qc_service_areas` | id, platform_id, pincode, city, is_serviceable, observed_at, source ∈ {community, official, admin} | Pincode serviceability, honestly sourced and timestamped |
| 35 | `product_units` | variant_id PK, net_quantity, unit ∈ {g, ml, pc, kg, l}, pack_count, mrp_minor NULL | Net quantity is mandatory for grocery; drives unit pricing |
| 36 | `unit_prices` | variant_id, currency, price_per_100g_minor, price_per_kg_minor, price_per_l_minor, price_per_pc_minor, computed_at | Derived, never hand-entered; refreshed on every price change |
| 37 | `community_price_reports` | id, user_id, variant_id, platform_id, pincode, reported_price_minor, mrp_minor NULL, currency, delivery_fee_minor NULL, screenshot_url NULL, reported_at, trust_state ∈ {reported, corroborated, moderator_verified, rejected, expired}, corroboration_count, reviewer_id, reviewer_notes, ip_hash | The Community Price pipeline. Expires from ranking after 90 min. |
| 38 | `fee_schedules` | id, platform_id, fee_kind ∈ {delivery, handling, small_cart, packaging, surge, gst_on_fees}, amount_minor NULL, waiver_threshold_minor NULL, is_conditional, condition_note, source ∈ {community, official}, observed_at | Powers **Conditional** lines in Price Truth |

Additional rules enforced in code and tests:
- `community_price_reports` rows are **never** joined into a "verified total" — the API returns them in a separate `communityOffers[]` array with their own trust tier.
- One report per `(user, variant, platform, pincode)` per 6 hours; duplicates rejected before XP.
- Reports are user-scoped: exported with the account, hard-deleted on account deletion (DPDP data-minimisation).

## Access-control model

- **Local/SQLite:** authorisation enforced in repositories (`WHERE user_id = :session_user_id`) — never from request input.
- **Production/Supabase:** Row Level Security policies mirror the same rules:
  - `users`, `user_preferences`, `user_search_history`, `saved_products`, `price_alerts`, `notification_events`, `reward_accounts`, `reward_transactions`, `support_tickets` → `user_id = auth.uid()` for SELECT/UPDATE/DELETE.
  - `offers`, `products`, `retailers` → public SELECT (read-only) for authenticated users; writes only `service_role`.
  - `admin_*`, `reward_policy_rules`, `retailer_connectors` → no direct client access; server-side only.
- Cross-user isolation is a **test**, not a hope: `tests/isolation.test.ts` attempts to read/write another user's watchlist, alerts, XP and tickets on every run.
