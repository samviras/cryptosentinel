-- Migration 003: Watchlist and shareable portfolio support

-- Watchlist table for user-tracked tokens with price targets
CREATE TABLE IF NOT EXISTS user_watchlist (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    symbol TEXT NOT NULL,
    buy_target NUMERIC(20, 8),
    sell_target NUMERIC(20, 8),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, symbol)
);
CREATE INDEX IF NOT EXISTS idx_user_watchlist_user ON user_watchlist(user_id);
ALTER TABLE user_watchlist ENABLE ROW LEVEL SECURITY;

-- Share token for public portfolio pages (% allocation only, no amounts)
ALTER TABLE users ADD COLUMN IF NOT EXISTS share_token TEXT UNIQUE;
CREATE INDEX IF NOT EXISTS idx_users_share_token ON users(share_token) WHERE share_token IS NOT NULL;
