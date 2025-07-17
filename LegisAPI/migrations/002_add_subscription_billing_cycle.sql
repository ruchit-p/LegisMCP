-- Migration: Add subscription billing cycle support
-- This migration adds support for automatic usage reset based on Stripe subscription billing cycles

-- Create plans table for subscription management
CREATE TABLE IF NOT EXISTS plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    billing_frequency TEXT NOT NULL CHECK (billing_frequency IN ('monthly', 'yearly', 'one_time')),
    stripe_price_id TEXT UNIQUE,
    stripe_product_id TEXT,
    amount INTEGER NOT NULL DEFAULT 0, -- Amount in cents
    currency TEXT NOT NULL DEFAULT 'usd',
    features TEXT NOT NULL DEFAULT '[]', -- JSON array of features
    highlighted_features TEXT NOT NULL DEFAULT '[]', -- JSON array of highlighted features
    description TEXT NOT NULL DEFAULT '',
    is_active BOOLEAN NOT NULL DEFAULT 1,
    display_order INTEGER NOT NULL DEFAULT 0,
    mcp_calls_limit INTEGER NOT NULL DEFAULT 100,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Add subscription-related fields to users table
ALTER TABLE users ADD COLUMN stripe_customer_id TEXT;
ALTER TABLE users ADD COLUMN stripe_subscription_id TEXT;
ALTER TABLE users ADD COLUMN current_plan_id INTEGER REFERENCES plans(id);
ALTER TABLE users ADD COLUMN subscription_status TEXT DEFAULT 'free' CHECK (subscription_status IN ('free', 'active', 'past_due', 'canceled', 'incomplete', 'incomplete_expired', 'trialing', 'unpaid'));
ALTER TABLE users ADD COLUMN billing_cycle_start DATETIME;
ALTER TABLE users ADD COLUMN billing_cycle_end DATETIME;
ALTER TABLE users ADD COLUMN subscription_created_at DATETIME;
ALTER TABLE users ADD COLUMN subscription_updated_at DATETIME;
ALTER TABLE users ADD COLUMN subscription_ended_at DATETIME;
ALTER TABLE users ADD COLUMN usage_reset_at DATETIME;
ALTER TABLE users ADD COLUMN mcp_calls_count INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN mcp_calls_limit INTEGER DEFAULT 100;

-- Create payment history table
CREATE TABLE IF NOT EXISTS payment_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    stripe_invoice_id TEXT NOT NULL,
    amount INTEGER NOT NULL,
    currency TEXT NOT NULL DEFAULT 'usd',
    status TEXT NOT NULL CHECK (status IN ('succeeded', 'failed', 'pending')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Insert default plans
INSERT OR IGNORE INTO plans (name, slug, billing_frequency, amount, currency, features, highlighted_features, description, mcp_calls_limit, display_order) VALUES
('Free', 'free', 'one_time', 0, 'usd', '["100 API calls per month", "Basic legislative data", "Community support"]', '["Free forever"]', 'Perfect for getting started with legislative data', 100, 1),
('Developer', 'developer', 'monthly', 1900, 'usd', '["5,000 API calls per month", "All legislative data", "Email support", "Priority processing"]', '["5,000 API calls", "Email support"]', 'Ideal for developers building applications', 5000, 2),
('Developer Annual', 'developer-annual', 'yearly', 19900, 'usd', '["5,000 API calls per month", "All legislative data", "Email support", "Priority processing", "2 months free"]', '["5,000 API calls", "2 months free"]', 'Developer plan with annual billing', 5000, 3),
('Professional', 'professional', 'monthly', 4900, 'usd', '["25,000 API calls per month", "All legislative data", "Priority support", "Advanced analytics", "Webhook notifications"]', '["25,000 API calls", "Priority support"]', 'Perfect for professional applications', 25000, 4),
('Professional Annual', 'professional-annual', 'yearly', 49900, 'usd', '["25,000 API calls per month", "All legislative data", "Priority support", "Advanced analytics", "Webhook notifications", "2 months free"]', '["25,000 API calls", "2 months free"]', 'Professional plan with annual billing', 25000, 5),
('Enterprise', 'enterprise', 'monthly', 19900, 'usd', '["Unlimited API calls", "All legislative data", "24/7 support", "Custom integrations", "SLA guarantee", "Dedicated account manager"]', '["Unlimited API calls", "24/7 support"]', 'For large-scale applications', -1, 6);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_plans_slug ON plans(slug);
CREATE INDEX IF NOT EXISTS idx_plans_stripe_price_id ON plans(stripe_price_id);
CREATE INDEX IF NOT EXISTS idx_plans_is_active ON plans(is_active);
CREATE INDEX IF NOT EXISTS idx_plans_billing_frequency ON plans(billing_frequency);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_stripe_customer_id ON users(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_stripe_subscription_id ON users(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_users_current_plan_id ON users(current_plan_id);
CREATE INDEX IF NOT EXISTS idx_users_subscription_status ON users(subscription_status);
CREATE INDEX IF NOT EXISTS idx_users_billing_cycle_end ON users(billing_cycle_end);
CREATE INDEX IF NOT EXISTS idx_users_usage_reset_at ON users(usage_reset_at);

CREATE INDEX IF NOT EXISTS idx_payment_history_user_id ON payment_history(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_history_stripe_invoice_id ON payment_history(stripe_invoice_id);
CREATE INDEX IF NOT EXISTS idx_payment_history_status ON payment_history(status);

-- Update existing users to have the free plan
UPDATE users SET current_plan_id = (SELECT id FROM plans WHERE slug = 'free') WHERE current_plan_id IS NULL;
UPDATE users SET mcp_calls_limit = 100 WHERE mcp_calls_limit IS NULL;
UPDATE users SET mcp_calls_count = 0 WHERE mcp_calls_count IS NULL;

-- Add triggers for automatic timestamp updates
CREATE TRIGGER IF NOT EXISTS update_plans_updated_at 
AFTER UPDATE ON plans
BEGIN
    UPDATE plans SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Verify the migration
SELECT COUNT(*) as total_plans FROM plans;
SELECT COUNT(*) as total_users_with_plans FROM users WHERE current_plan_id IS NOT NULL;