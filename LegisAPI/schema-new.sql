-- Plans table for Stripe subscription tiers
CREATE TABLE IF NOT EXISTS plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL, -- 'free', 'starter', 'professional', 'enterprise'
    billing_frequency TEXT NOT NULL CHECK (billing_frequency IN ('monthly', 'yearly', 'one_time')),
    stripe_price_id TEXT,
    stripe_product_id TEXT,
    amount INTEGER NOT NULL, -- Amount in cents
    currency TEXT DEFAULT 'usd',
    features JSON NOT NULL, -- Array of feature strings
    highlighted_features JSON, -- Array of feature strings to highlight
    description TEXT,
    is_active BOOLEAN DEFAULT 1,
    display_order INTEGER DEFAULT 0,
    mcp_calls_limit INTEGER NOT NULL, -- -1 for unlimited
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Users table with Stripe integration
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    auth0_user_id TEXT UNIQUE NOT NULL,
    email TEXT NOT NULL,
    name TEXT,
    stripe_customer_id TEXT UNIQUE,
    current_plan_id INTEGER,
    subscription_status TEXT DEFAULT 'free' CHECK (subscription_status IN ('free', 'active', 'canceled', 'past_due', 'trialing')),
    subscription_period_end DATETIME,
    api_calls_count INTEGER DEFAULT 0,
    api_calls_reset_at DATETIME,
    is_admin BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (current_plan_id) REFERENCES plans(id)
);

-- API usage tracking with more details
CREATE TABLE IF NOT EXISTS api_usage (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    endpoint TEXT NOT NULL,
    method TEXT NOT NULL,
    status_code INTEGER,
    response_time_ms INTEGER,
    error_message TEXT,
    ip_address TEXT,
    user_agent TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- MCP tool usage logs
CREATE TABLE IF NOT EXISTS mcp_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    tool_name TEXT NOT NULL,
    request_data JSON,
    response_data JSON,
    status TEXT CHECK (status IN ('success', 'error', 'timeout')),
    error_message TEXT,
    response_time_ms INTEGER,
    tokens_used INTEGER,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Auth0 configuration
CREATE TABLE IF NOT EXISTS auth_config (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    config_name TEXT UNIQUE NOT NULL, -- 'frontend', 'mcp_server', etc.
    auth0_domain TEXT NOT NULL,
    auth0_client_id TEXT NOT NULL,
    auth0_audience TEXT,
    auth0_scope TEXT,
    allowed_callback_urls JSON,
    allowed_logout_urls JSON,
    allowed_origins JSON,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Stripe webhooks log for debugging
CREATE TABLE IF NOT EXISTS stripe_webhook_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    stripe_event_id TEXT UNIQUE NOT NULL,
    event_type TEXT NOT NULL,
    processing_status TEXT DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processed', 'failed')),
    error_message TEXT,
    raw_payload JSON,
    processed_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Payment history table
CREATE TABLE IF NOT EXISTS payment_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    stripe_invoice_id TEXT NOT NULL,
    amount INTEGER NOT NULL,
    currency TEXT NOT NULL DEFAULT 'usd',
    status TEXT NOT NULL CHECK (status IN ('succeeded', 'failed', 'pending')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Indexes for performance
CREATE INDEX idx_users_auth0_id ON users(auth0_user_id);
CREATE INDEX idx_users_stripe_customer_id ON users(stripe_customer_id);
CREATE INDEX idx_users_admin ON users(is_admin);
CREATE INDEX idx_api_usage_user_id ON api_usage(user_id);
CREATE INDEX idx_api_usage_timestamp ON api_usage(timestamp);
CREATE INDEX idx_mcp_logs_user_id ON mcp_logs(user_id);
CREATE INDEX idx_mcp_logs_timestamp ON mcp_logs(timestamp);
CREATE INDEX idx_mcp_logs_tool_name ON mcp_logs(tool_name);
CREATE INDEX idx_stripe_webhook_logs_event_id ON stripe_webhook_logs(stripe_event_id);
CREATE INDEX idx_payment_history_user_id ON payment_history(user_id);
CREATE INDEX idx_payment_history_invoice_id ON payment_history(stripe_invoice_id);

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at 
AFTER UPDATE ON users
BEGIN
    UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER update_plans_updated_at 
AFTER UPDATE ON plans
BEGIN
    UPDATE plans SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER update_auth_config_updated_at 
AFTER UPDATE ON auth_config
BEGIN
    UPDATE auth_config SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Insert default plans with Stripe price IDs
INSERT INTO plans (name, slug, billing_frequency, stripe_price_id, stripe_product_id, amount, features, highlighted_features, description, mcp_calls_limit, display_order) VALUES
-- Free Plan
('Free', 'free', 'one_time', 'price_1RYWwWDPvUT1MYwpDn5s9ArJ', 'prod_STTujqN4OfWiE8', 0, 
 '["100 MCP calls (one-time)", "All Legislative tools", "Standard rate limiting", "Community support", "No expiration"]',
 '["100 MCP calls (one-time)"]',
 'Get started with 100 free MCP calls. No credit card required.',
 100, 0),

-- Starter Monthly
('Developer', 'starter', 'monthly', 'price_1Rhkv3DPvUT1MYwp0ahKz7cd', 'prod_Sd0w3jRUdRwiLV', 999,
 '["1,000 MCP calls per month", "Standard rate limiting", "All Legislative tools", "Email support", "Community access"]',
 '[]',
 'Perfect for individual developers and small projects.',
 1000, 1),

-- Starter Yearly
('Developer', 'starter', 'yearly', 'price_1Ri54ODPvUT1MYwpE4XjFlzC', 'prod_Sd0w3jRUdRwiLV', 9999,
 '["1,000 MCP calls per month", "Standard rate limiting", "All Legislative tools", "Email support", "Community access", "Save 20% with annual billing"]',
 '["Save 20% with annual billing"]',
 'Perfect for individual developers and small projects.',
 1000, 2),

-- Professional Monthly
('Professional', 'professional', 'monthly', 'price_1Rhkx2DPvUT1MYwpUb93RS8Q', 'prod_Sd0yPKAtErLGcg', 2999,
 '["10,000 MCP calls per month", "Priority rate limiting", "All Legislative tools", "Advanced bill analysis", "Priority support", "Team collaboration"]',
 '["All Legislative tools", "Advanced bill analysis"]',
 'Enhanced access for production applications and teams.',
 10000, 3),

-- Professional Yearly
('Professional', 'professional', 'yearly', 'price_1Ri56WDPvUT1MYwpMeT2dBzr', 'prod_Sd0yPKAtErLGcg', 29999,
 '["10,000 MCP calls per month", "Priority rate limiting", "All Legislative tools", "Advanced bill analysis", "Priority support", "Team collaboration", "Save 20% with annual billing"]',
 '["All Legislative tools", "Advanced bill analysis", "Save 20% with annual billing"]',
 'Enhanced access for production applications and teams.',
 10000, 4),

-- Enterprise (Contact Sales)
('Enterprise', 'enterprise', 'monthly', NULL, 'prod_Sd11R3Ij9FAqBk', 0,
 '["Unlimited MCP calls", "No rate limiting", "Premium tools & features", "Real-time data feeds", "Custom integrations", "Dedicated support", "SLA guarantee"]',
 '["Unlimited MCP calls", "Custom integrations", "SLA guarantee"]',
 'Unlimited access for mission-critical applications.',
 -1, 5);

-- Insert Auth0 configuration
INSERT INTO auth_config (config_name, auth0_domain, auth0_client_id, auth0_audience, auth0_scope, allowed_callback_urls, allowed_logout_urls, allowed_origins) VALUES
('frontend', 'your-tenant.us.auth0.com', 'eUovWUOrn6gy4vIXHsxuFEOsoogZcVXJ', 'urn:legis-api', 
 'openid profile email offline_access read:bills read:members read:votes read:committees',
 '["http://localhost:3000/api/auth/callback", "https://legismcp.com/api/auth/callback", "https://www.legismcp.com/api/auth/callback"]',
 '["http://localhost:3000", "https://legismcp.com", "https://www.legismcp.com"]',
 '["http://localhost:3000", "https://legismcp.com", "https://www.legismcp.com"]');

-- Create view for user subscription details
CREATE VIEW user_subscription_details AS
SELECT 
    u.id,
    u.auth0_user_id,
    u.email,
    u.name,
    u.stripe_customer_id,
    u.subscription_status,
    u.subscription_period_end,
    u.api_calls_count,
    p.name as plan_name,
    p.slug as plan_slug,
    p.billing_frequency,
    p.amount as plan_amount,
    p.mcp_calls_limit,
    CASE 
        WHEN p.mcp_calls_limit = -1 THEN 'Unlimited'
        WHEN u.api_calls_count >= p.mcp_calls_limit THEN 'Limit Reached'
        ELSE CAST(p.mcp_calls_limit - u.api_calls_count AS TEXT) || ' remaining'
    END as calls_remaining
FROM users u
LEFT JOIN plans p ON u.current_plan_id = p.id;