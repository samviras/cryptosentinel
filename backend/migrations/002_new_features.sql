-- ============================================================
-- CryptoSentinel Migration 002: Price Alerts & Portfolio
-- ============================================================

-- ============================================================
-- USER PRICE ALERTS
-- ============================================================
CREATE TABLE IF NOT EXISTS user_price_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    symbol TEXT NOT NULL,
    target_price NUMERIC(20, 8) NOT NULL,
    direction TEXT NOT NULL CHECK (direction IN ('above', 'below')),
    is_triggered BOOLEAN NOT NULL DEFAULT false,
    triggered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_user_price_alerts_user ON user_price_alerts(user_id);
CREATE INDEX idx_user_price_alerts_active ON user_price_alerts(is_triggered) WHERE is_triggered = false;

ALTER TABLE user_price_alerts ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- PORTFOLIO HOLDINGS
-- ============================================================
CREATE TABLE IF NOT EXISTS portfolio_holdings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    symbol TEXT NOT NULL,
    amount NUMERIC(30, 10) NOT NULL,
    buy_price NUMERIC(20, 8) NOT NULL,
    added_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_portfolio_holdings_user ON portfolio_holdings(user_id);

ALTER TABLE portfolio_holdings ENABLE ROW LEVEL SECURITY;
