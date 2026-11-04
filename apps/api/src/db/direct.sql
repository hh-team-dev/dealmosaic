-- Own-stock commerce. No seed products, rates, seller identity or payment address.
CREATE TABLE IF NOT EXISTS direct_settings (id INTEGER PRIMARY KEY CHECK(id=1), data TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 1);
CREATE TABLE IF NOT EXISTS direct_products (id TEXT PRIMARY KEY, data TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'draft', version INTEGER NOT NULL DEFAULT 1, updated_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS direct_rates (id TEXT PRIMARY KEY, product_id TEXT NOT NULL REFERENCES direct_products(id), data TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS direct_rates_product ON direct_rates(product_id);
CREATE TABLE IF NOT EXISTS direct_media (id TEXT PRIMARY KEY, mime TEXT NOT NULL, bytes BLOB NOT NULL, size INTEGER NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS direct_quotes (id TEXT PRIMARY KEY, data TEXT NOT NULL, expires_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS direct_orders (id TEXT PRIMARY KEY, access_hash TEXT NOT NULL UNIQUE, quote_id TEXT NOT NULL UNIQUE, data TEXT NOT NULL, status TEXT NOT NULL, bank_reference TEXT UNIQUE, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS direct_orders_time ON direct_orders(created_at);
CREATE TABLE IF NOT EXISTS direct_events (id TEXT PRIMARY KEY, actor_id TEXT, entity_id TEXT NOT NULL, action TEXT NOT NULL, detail TEXT NOT NULL, at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS direct_delivery_checks (product_id TEXT NOT NULL REFERENCES direct_products(id), destination_pin TEXT NOT NULL, checks INTEGER NOT NULL DEFAULT 1, last_checked TEXT NOT NULL, PRIMARY KEY(product_id,destination_pin));
