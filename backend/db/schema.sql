-- Evolvee Radiance Operations Hub. PostgreSQL schema
-- Applied idempotently by db/applySchema.js (safe to run more than once).

CREATE TABLE IF NOT EXISTS users (
    id            SERIAL PRIMARY KEY,
    email         TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name     TEXT NOT NULL,
    role          TEXT NOT NULL CHECK (role IN ('admin','developer','ops_manager','marketing','partner')),
    is_active     BOOLEAN NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS manufacturers (
    id         SERIAL PRIMARY KEY,
    name       TEXT NOT NULL,
    country    TEXT,
    notes      TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS manufacturer_contacts (
    id              SERIAL PRIMARY KEY,
    manufacturer_id INTEGER NOT NULL REFERENCES manufacturers(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    role            TEXT,
    email           TEXT,
    phone           TEXT,
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS products (
    id              SERIAL PRIMARY KEY,
    sku             TEXT UNIQUE NOT NULL,
    name            TEXT NOT NULL,
    -- Shopify inventory_item_id. The live store has no SKUs, so stock levels are
    -- matched on this; SKU is still used for the bundled sample data.
    shopify_inventory_item_id TEXT,
    manufacturer_id INTEGER REFERENCES manufacturers(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- For databases created before the column existed:
ALTER TABLE products ADD COLUMN IF NOT EXISTS shopify_inventory_item_id TEXT;

CREATE TABLE IF NOT EXISTS reorder_thresholds (
    id         SERIAL PRIMARY KEY,
    product_id INTEGER UNIQUE NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    threshold  INTEGER NOT NULL CHECK (threshold >= 0),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reorder_alerts (
    id           SERIAL PRIMARY KEY,
    product_id   INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    stock_level  INTEGER NOT NULL,
    threshold    INTEGER NOT NULL,
    status       TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','acknowledged','resolved')),
    triggered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at  TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS reorder_history (
    id               SERIAL PRIMARY KEY,
    product_id       INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    manufacturer_id  INTEGER REFERENCES manufacturers(id) ON DELETE SET NULL,
    quantity_ordered INTEGER NOT NULL CHECK (quantity_ordered > 0),
    ordered_at       DATE NOT NULL DEFAULT CURRENT_DATE,
    notes            TEXT,
    created_by       INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS communications (
    id              SERIAL PRIMARY KEY,
    manufacturer_id INTEGER NOT NULL REFERENCES manufacturers(id) ON DELETE CASCADE,
    contact_id      INTEGER REFERENCES manufacturer_contacts(id) ON DELETE SET NULL,
    channel         TEXT NOT NULL DEFAULT 'email' CHECK (channel IN ('email','phone','meeting','other')),
    summary         TEXT NOT NULL,
    logged_by       INTEGER REFERENCES users(id) ON DELETE SET NULL,
    logged_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS production_runs (
    id              SERIAL PRIMARY KEY,
    manufacturer_id INTEGER NOT NULL REFERENCES manufacturers(id) ON DELETE CASCADE,
    product_id      INTEGER REFERENCES products(id) ON DELETE SET NULL,
    quantity        INTEGER,
    status          TEXT NOT NULL DEFAULT 'ordered'
                    CHECK (status IN ('ordered','in_production','shipped','received','cancelled')),
    expected_date   DATE,
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sync_status (
    source       TEXT PRIMARY KEY,
    mode         TEXT NOT NULL,
    last_run_at  TIMESTAMPTZ,
    last_success TIMESTAMPTZ,
    ok           BOOLEAN,
    message      TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_products_shopify_iid ON products(shopify_inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_alerts_status   ON reorder_alerts(status);
CREATE INDEX IF NOT EXISTS idx_comms_mfr       ON communications(manufacturer_id);
CREATE INDEX IF NOT EXISTS idx_runs_mfr        ON production_runs(manufacturer_id);
CREATE INDEX IF NOT EXISTS idx_history_product ON reorder_history(product_id);