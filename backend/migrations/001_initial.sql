-- ============================================================
-- CryptoSentinel Database Schema
-- Run this against your Supabase PostgreSQL instance
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    company_name TEXT,
    tier TEXT NOT NULL DEFAULT 'starter' CHECK (tier IN ('starter', 'growth', 'enterprise')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_email ON users(email);

-- ============================================================
-- API KEYS
-- ============================================================
CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    key TEXT UNIQUE NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    usage_count INTEGER NOT NULL DEFAULT 0,
    last_used_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_api_keys_key ON api_keys(key);
CREATE INDEX idx_api_keys_user ON api_keys(user_id);

-- ============================================================
-- PRICE SNAPSHOTS
-- ============================================================
CREATE TABLE IF NOT EXISTS price_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    symbol TEXT NOT NULL,
    price_usd NUMERIC(20, 8) NOT NULL,
    volume_24h NUMERIC(20, 2),
    market_cap NUMERIC(20, 2),
    change_24h NUMERIC(10, 4),
    change_7d NUMERIC(10, 4),
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_price_snapshots_symbol ON price_snapshots(symbol);
CREATE INDEX idx_price_snapshots_recorded ON price_snapshots(recorded_at DESC);
CREATE INDEX idx_price_snapshots_symbol_time ON price_snapshots(symbol, recorded_at DESC);

-- Partition-friendly: auto-delete old snapshots (optional, run via pg_cron)
-- DELETE FROM price_snapshots WHERE recorded_at < now() - INTERVAL '90 days';

-- ============================================================
-- ALERTS
-- ============================================================
CREATE TABLE IF NOT EXISTS alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type TEXT NOT NULL CHECK (type IN ('arbitrage', 'liquidation', 'governance', 'momentum', 'custom')),
    severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    symbol TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    data JSONB DEFAULT '{}',
    dedup_key TEXT,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_alerts_type ON alerts(type);
CREATE INDEX idx_alerts_severity ON alerts(severity);
CREATE INDEX idx_alerts_created ON alerts(created_at DESC);
CREATE INDEX idx_alerts_dedup ON alerts(dedup_key, created_at);
CREATE INDEX idx_alerts_unread ON alerts(is_read) WHERE is_read = false;

-- ============================================================
-- ALERT RULES (user-configured)
-- ============================================================
CREATE TABLE IF NOT EXISTS alert_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('arbitrage', 'liquidation', 'governance', 'momentum', 'custom')),
    symbol TEXT NOT NULL,
    conditions JSONB NOT NULL DEFAULT '{}',
    webhook_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_alert_rules_user ON alert_rules(user_id);
CREATE INDEX idx_alert_rules_active ON alert_rules(is_active) WHERE is_active = true;

-- ============================================================
-- AI ANALYSES
-- ============================================================
CREATE TABLE IF NOT EXISTS analyses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    symbol TEXT NOT NULL,
    summary TEXT,
    sentiment TEXT,
    risk_level TEXT,
    recommendation TEXT,
    confidence NUMERIC(4, 3),
    signals JSONB DEFAULT '[]',
    raw_response JSONB DEFAULT '{}',
    generated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_analyses_symbol ON analyses(symbol);
CREATE INDEX idx_analyses_generated ON analyses(generated_at DESC);

-- ============================================================
-- WEBHOOKS
-- ============================================================
CREATE TABLE IF NOT EXISTS webhooks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    events JSONB NOT NULL DEFAULT '[]',
    secret TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_webhooks_user ON webhooks(user_id);
CREATE INDEX idx_webhooks_active ON webhooks(is_active) WHERE is_active = true;

-- ============================================================
-- USAGE TRACKING
-- ============================================================
CREATE TABLE IF NOT EXISTS usage_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL,
    method TEXT NOT NULL,
    status_code INTEGER,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_usage_log_user_date ON usage_log(user_id, recorded_at DESC);

-- ============================================================
-- Row Level Security (RLS) — Supabase best practice
-- ============================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_log ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS, which is what our backend uses.
-- If you want direct Supabase client access from frontend, add policies:
--
-- CREATE POLICY "Users can read own data" ON users FOR SELECT USING (auth.uid() = id);
-- CREATE POLICY "Users can manage own keys" ON api_keys FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- Helpful views
-- ============================================================
CREATE OR REPLACE VIEW latest_prices AS
SELECT DISTINCT ON (symbol)
    symbol, price_usd, volume_24h, market_cap, change_24h, change_7d, recorded_at
FROM price_snapshots
ORDER BY symbol, recorded_at DESC;

CREATE OR REPLACE VIEW alert_summary AS
SELECT
    type,
    severity,
    COUNT(*) as count,
    MAX(created_at) as latest
FROM alerts
WHERE created_at > now() - INTERVAL '24 hours'
GROUP BY type, severity
ORDER BY count DESC;

-- ============================================================
-- Updated_at trigger
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER alert_rules_updated_at
    BEFORE UPDATE ON alert_rules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
