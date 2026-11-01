-- DEALMOSAIC — Phase 1 schema (SQLite).
-- Portable SQL; types map cleanly to PostgreSQL for the Supabase deployment.
-- All money columns are INTEGER minor units (paise). No floats, ever.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id                TEXT PRIMARY KEY,
  email             TEXT NOT NULL UNIQUE,
  password_hash     TEXT NOT NULL,
  display_name      TEXT NOT NULL,
  email_verified_at TEXT,
  age_confirmed_at  TEXT,
  phone             TEXT,
  role              TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user','admin','super_admin')),
  status            TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended','deleted')),
  created_at        TEXT NOT NULL,
  updated_at        TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash   TEXT NOT NULL UNIQUE,
  csrf_token   TEXT NOT NULL,
  created_at   TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  expires_at   TEXT NOT NULL,
  revoked_at   TEXT,
  ip_hash      TEXT,
  user_agent   TEXT
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expiry ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS auth_tokens (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind        TEXT NOT NULL CHECK (kind IN ('verify_email','reset_password')),
  token_hash  TEXT NOT NULL UNIQUE,
  expires_at  TEXT NOT NULL,
  consumed_at TEXT,
  created_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_auth_tokens_user ON auth_tokens(user_id, kind);

CREATE TABLE IF NOT EXISTS user_preferences (
  user_id          TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  country_code     TEXT NOT NULL DEFAULT 'IN',
  display_currency TEXT NOT NULL DEFAULT 'INR',
  pincode          TEXT,
  notify_inapp     INTEGER NOT NULL DEFAULT 1,
  notify_email     INTEGER NOT NULL DEFAULT 1,
  created_at       TEXT NOT NULL,
  updated_at       TEXT NOT NULL
);

-- Development-only mailbox. In production the same content goes to a real
-- provider (Brevo/Resend). Never contains a password, only single-use links.
CREATE TABLE IF NOT EXISTS dev_outbox (
  id         TEXT PRIMARY KEY,
  to_email   TEXT NOT NULL,
  subject    TEXT NOT NULL,
  body       TEXT NOT NULL,
  action_url TEXT,
  created_at TEXT NOT NULL,
  -- Delivery outcome. NULL/NULL means no mail transport was configured: the
  -- message was recorded but not sent, which is not the same as a failure.
  sent_at    TEXT,
  send_error TEXT
);

CREATE TABLE IF NOT EXISTS exchange_rates (
  base       TEXT NOT NULL,
  quote      TEXT NOT NULL,
  rate       REAL NOT NULL,
  rate_date  TEXT NOT NULL,
  source     TEXT NOT NULL,
  fetched_at TEXT NOT NULL,
  PRIMARY KEY (base, quote)
);

CREATE TABLE IF NOT EXISTS countries (
  code             TEXT PRIMARY KEY,
  name             TEXT NOT NULL,
  flag             TEXT NOT NULL,
  default_currency TEXT NOT NULL,
  region           TEXT NOT NULL,
  enabled          INTEGER NOT NULL DEFAULT 0,
  note             TEXT
);

CREATE TABLE IF NOT EXISTS currencies (
  code        TEXT PRIMARY KEY,
  symbol      TEXT NOT NULL,
  name        TEXT NOT NULL,
  minor_units INTEGER NOT NULL
);

-- Retailer / quick-commerce platform registry. Phase 1 seeds it so the product
-- can show, honestly, what is connected and what is not.
CREATE TABLE IF NOT EXISTS platforms (
  slug                TEXT PRIMARY KEY,
  name                TEXT NOT NULL,
  owner               TEXT,
  kind                TEXT NOT NULL CHECK (kind IN ('marketplace','quick_commerce','grocery')),
  status              TEXT NOT NULL CHECK (status IN ('live','community_only','pending_approval','no_public_api')),
  status_note         TEXT NOT NULL,
  delivery_promise    TEXT,
  deep_link_template  TEXT,
  affiliate           INTEGER NOT NULL DEFAULT 0,
  sort_order          INTEGER NOT NULL DEFAULT 100
);

-- Security log: every auth event, no PII beyond a hashed IP.
CREATE TABLE IF NOT EXISTS auth_events (
  id         TEXT PRIMARY KEY,
  user_id    TEXT,
  event      TEXT NOT NULL,
  ip_hash    TEXT,
  detail     TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_auth_events_created ON auth_events(created_at);

-- ---------------------------------------------------------------------------
-- User-owned tables used by the privacy export today and by Phases 2–4 next.
-- Created now so data export and account deletion are complete and testable
-- rather than "export everything except the tables we haven't built yet".
-- `variant_ref` becomes a foreign key to product_variants in Phase 2.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS user_search_history (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  query        TEXT NOT NULL,
  country_code TEXT NOT NULL DEFAULT 'IN',
  result_count INTEGER,
  variant_id   TEXT,
  outcome      TEXT,
  created_at   TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_search_history_user ON user_search_history(user_id, created_at);

CREATE TABLE IF NOT EXISTS saved_products (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  variant_ref TEXT NOT NULL,
  note        TEXT,
  created_at  TEXT NOT NULL,
  UNIQUE (user_id, variant_ref)
);

CREATE TABLE IF NOT EXISTS price_alerts (
  id                TEXT PRIMARY KEY,
  user_id           TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  variant_ref       TEXT NOT NULL,
  target_price_minor INTEGER NOT NULL,
  currency          TEXT NOT NULL DEFAULT 'INR',
  country_code      TEXT NOT NULL DEFAULT 'IN',
  status            TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','triggered','expired','paused')),
  created_at        TEXT NOT NULL,
  updated_at        TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_price_alerts_user ON price_alerts(user_id, status);

CREATE TABLE IF NOT EXISTS notification_events (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind       TEXT NOT NULL,
  payload    TEXT NOT NULL,
  read_at    TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notification_events(user_id, created_at);
