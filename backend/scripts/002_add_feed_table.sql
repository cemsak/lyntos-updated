-- Migration 002: Add feed_items table for persistent notifications
-- LYNTOS V2 - Live Data Integration

CREATE TABLE IF NOT EXISTS feed_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id TEXT NOT NULL DEFAULT 'SYSTEM',
    client_id TEXT NOT NULL,
    period_id TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('risk', 'alert', 'info', 'upload', 'system')),
    title TEXT NOT NULL,
    message TEXT,
    severity TEXT DEFAULT 'INFO' CHECK(severity IN ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO')),
    is_read BOOLEAN DEFAULT 0,
    metadata TEXT, -- JSON for extra data
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_feed_items_client_period ON feed_items(client_id, period_id);
CREATE INDEX IF NOT EXISTS idx_feed_items_tenant ON feed_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_feed_items_created ON feed_items(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feed_items_unread ON feed_items(is_read) WHERE is_read = 0;
