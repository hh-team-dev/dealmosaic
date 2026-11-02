-- Phase 2 — catalogue, offers, community prices, matching reviews.

CREATE TABLE IF NOT EXISTS catalogue_products (
  id             TEXT PRIMARY KEY,
  slug           TEXT NOT NULL UNIQUE,
  title          TEXT NOT NULL,
  brand          TEXT NOT NULL,
  category       TEXT NOT NULL,
  category_slug  TEXT NOT NULL,
  description    TEXT NOT NULL,
  image_hint     TEXT,
  unit_kind      TEXT CHECK (unit_kind IN ('electronics','grocery','book','apparel','other')),
  is_grocery     INTEGER NOT NULL DEFAULT 0,
  created_at     TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_products_category ON catalogue_products(category_slug);
CREATE INDEX IF NOT EXISTS idx_products_brand ON catalogue_products(brand);

CREATE TABLE IF NOT EXISTS product_variants (
  id             TEXT PRIMARY KEY,
  product_id     TEXT NOT NULL REFERENCES catalogue_products(id) ON DELETE CASCADE,
  variant_label  TEXT NOT NULL,
  attributes     TEXT NOT NULL,
  gtin           TEXT,
  mpn            TEXT,
  isbn           TEXT,
  mrp_minor      INTEGER,
  net_quantity   REAL,
  unit           TEXT CHECK (unit IN ('g','ml','kg','l','pc')),
  pack_count     INTEGER NOT NULL DEFAULT 1,
  sort_order     INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_variants_product ON product_variants(product_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_variants_gtin ON product_variants(gtin) WHERE gtin IS NOT NULL;

CREATE TABLE IF NOT EXISTS offers (
  id                  TEXT PRIMARY KEY,
  variant_id          TEXT NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
  platform_slug       TEXT NOT NULL,
  title               TEXT NOT NULL,
  seller_name         TEXT NOT NULL,
  seller_type         TEXT NOT NULL CHECK (seller_type IN ('platform','official','marketplace','dark_store')),
  seller_rating       REAL,
  seller_rating_count INTEGER,
  product_rating      REAL,
  product_review_count INTEGER,
  item_price_minor    INTEGER NOT NULL,
  currency            TEXT NOT NULL DEFAULT 'INR',
  mrp_minor           INTEGER,
  item_condition      TEXT NOT NULL DEFAULT 'new' CHECK (item_condition IN ('new','refurbished','used')),
  in_stock            INTEGER NOT NULL DEFAULT 1,
  shipping_minor      INTEGER,
  shipping_note       TEXT,
  delivery_days_min   INTEGER,
  delivery_days_max   INTEGER,
  tax_minor           INTEGER,
  tax_state           TEXT NOT NULL DEFAULT 'included' CHECK (tax_state IN ('included','confirmed','not_available','not_applicable')),
  fee_lines           TEXT NOT NULL DEFAULT '[]',
  discount_lines      TEXT NOT NULL DEFAULT '[]',
  return_window_days  INTEGER,
  warranty_months     INTEGER,
  product_url         TEXT NOT NULL,
  affiliate           INTEGER NOT NULL DEFAULT 0,
  data_origin         TEXT NOT NULL CHECK (data_origin IN ('live','feed','community','demo')),
  source_label        TEXT NOT NULL,
  last_checked_at     TEXT NOT NULL,
  is_active           INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_offers_variant ON offers(variant_id, is_active);

CREATE TABLE IF NOT EXISTS offer_snapshots (
  id           TEXT PRIMARY KEY,
  offer_id     TEXT NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
  price_minor  INTEGER NOT NULL,
  currency     TEXT NOT NULL,
  observed_at  TEXT NOT NULL,
  data_origin  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_snapshots_offer ON offer_snapshots(offer_id, observed_at DESC);

-- Community-reported quick-commerce prices. Never merged into a verified total.
CREATE TABLE IF NOT EXISTS community_prices (
  id               TEXT PRIMARY KEY,
  variant_id       TEXT NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
  platform_slug    TEXT NOT NULL,
  pincode          TEXT NOT NULL,
  price_minor      INTEGER NOT NULL,
  currency         TEXT NOT NULL DEFAULT 'INR',
  mrp_minor        INTEGER,
  delivery_fee_minor INTEGER,
  reported_by      TEXT REFERENCES users(id) ON DELETE SET NULL,
  reported_at      TEXT NOT NULL,
  trust_state      TEXT NOT NULL DEFAULT 'reported' CHECK (trust_state IN ('reported','corroborated','moderator_verified','rejected')),
  corroboration_count INTEGER NOT NULL DEFAULT 0,
  note             TEXT
);
CREATE INDEX IF NOT EXISTS idx_community_variant ON community_prices(variant_id, pincode, reported_at DESC);

CREATE TABLE IF NOT EXISTS product_match_reviews (
  id         TEXT PRIMARY KEY,
  user_id    TEXT REFERENCES users(id) ON DELETE SET NULL,
  variant_id TEXT,
  offer_id   TEXT,
  decision   TEXT NOT NULL CHECK (decision IN ('confirmed','split','merge','rejected')),
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS trending_queries (
  query       TEXT PRIMARY KEY,
  search_count INTEGER NOT NULL DEFAULT 0,
  last_seen   TEXT NOT NULL
);

-- ---------------------------------------------------------------------------
-- COUPONS
--
-- A claim about a discount is worth nothing until someone has checked it, so
-- every row carries a trust_state and a source. Nothing is seeded: an empty
-- table producing an honest "no verified offers" message is strictly better
-- than invented codes that fail at checkout and destroy trust on first use.
--
-- discount_type covers the shapes Indian retail actually uses: percentage off,
-- flat rupees off, cashback credited after purchase (which is NOT a price cut
-- and must stay separate in the UI), and free delivery.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS coupons (
  id                 TEXT PRIMARY KEY,
  platform_slug      TEXT NOT NULL,
  code               TEXT,
  title              TEXT NOT NULL,
  description        TEXT,
  discount_type      TEXT NOT NULL CHECK (discount_type IN ('percent','flat','cashback','free_delivery')),
  discount_value     INTEGER NOT NULL DEFAULT 0,
  max_discount_minor INTEGER,
  min_order_minor    INTEGER,
  category_slug      TEXT,
  terms              TEXT,
  source             TEXT NOT NULL CHECK (source IN ('community','merchant','affiliate','moderator')),
  trust_state        TEXT NOT NULL DEFAULT 'reported'
                     CHECK (trust_state IN ('reported','community_verified','moderator_verified','expired','rejected')),
  success_count      INTEGER NOT NULL DEFAULT 0,
  fail_count         INTEGER NOT NULL DEFAULT 0,
  reported_by        TEXT REFERENCES users(id) ON DELETE SET NULL,
  -- Set when the row came from an affiliate network rather than a human.
  -- `external_id` is the network's own offer id, so a re-sync updates in place
  -- instead of duplicating, and `tracking_url` is the money-making outbound link.
  external_id        TEXT,
  tracking_url       TEXT,
  starts_at          TEXT,
  expires_at         TEXT,
  verified_at        TEXT,
  created_at         TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_coupons_platform ON coupons(platform_slug, trust_state, expires_at);
CREATE INDEX IF NOT EXISTS idx_coupons_category ON coupons(category_slug, trust_state);
