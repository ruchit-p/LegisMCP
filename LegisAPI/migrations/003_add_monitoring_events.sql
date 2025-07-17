-- Migration: Add monitoring events table for comprehensive system monitoring
-- This migration adds monitoring and observability features for usage reset operations and system health

-- Create monitoring events table
CREATE TABLE IF NOT EXISTS monitoring_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_type TEXT NOT NULL CHECK (event_type IN ('usage_reset', 'subscription_change', 'webhook_received', 'error', 'performance')),
    category TEXT NOT NULL,
    action TEXT NOT NULL,
    label TEXT,
    value REAL,
    user_id INTEGER,
    metadata TEXT, -- JSON string for additional event data
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_monitoring_events_type ON monitoring_events(event_type);
CREATE INDEX IF NOT EXISTS idx_monitoring_events_category ON monitoring_events(category);
CREATE INDEX IF NOT EXISTS idx_monitoring_events_action ON monitoring_events(action);
CREATE INDEX IF NOT EXISTS idx_monitoring_events_timestamp ON monitoring_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_monitoring_events_user_id ON monitoring_events(user_id);

-- Create composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_monitoring_events_type_timestamp ON monitoring_events(event_type, timestamp);
CREATE INDEX IF NOT EXISTS idx_monitoring_events_category_action ON monitoring_events(category, action);

-- Create system health metrics table for aggregated data
CREATE TABLE IF NOT EXISTS system_health_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    metric_name TEXT NOT NULL,
    metric_value REAL NOT NULL,
    metric_unit TEXT,
    category TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for system health metrics
CREATE INDEX IF NOT EXISTS idx_system_health_metrics_name ON system_health_metrics(metric_name);
CREATE INDEX IF NOT EXISTS idx_system_health_metrics_category ON system_health_metrics(category);
CREATE INDEX IF NOT EXISTS idx_system_health_metrics_timestamp ON system_health_metrics(timestamp);

-- Insert sample monitoring events for testing
INSERT OR IGNORE INTO monitoring_events (event_type, category, action, label, value, metadata) VALUES
('usage_reset', 'billing', 'automatic', 'scheduled_reset', 1, '{"resetType": "daily_cron", "usersAffected": 0}'),
('webhook_received', 'stripe', 'success', 'subscription.created', 1, '{"eventId": "evt_test_123", "customerId": "cus_test_456"}'),
('error', 'billing', 'usage_reset_failed', 'Database connection timeout', 1, '{"error": "Connection timeout", "retryCount": 3}');

-- Insert sample system health metrics
INSERT OR IGNORE INTO system_health_metrics (metric_name, metric_value, metric_unit, category) VALUES
('total_users', 0, 'count', 'users'),
('active_subscriptions', 0, 'count', 'subscriptions'),
('usage_resets_today', 0, 'count', 'usage'),
('webhook_success_rate', 100.0, 'percent', 'webhooks'),
('error_rate', 0.0, 'percent', 'errors'),
('average_response_time', 0.0, 'milliseconds', 'performance');

-- Create trigger to automatically update system health metrics
CREATE TRIGGER IF NOT EXISTS update_system_health_on_monitoring_event
AFTER INSERT ON monitoring_events
BEGIN
    -- Update usage reset metrics
    UPDATE system_health_metrics 
    SET metric_value = (
        SELECT COUNT(*) FROM monitoring_events 
        WHERE event_type = 'usage_reset' 
        AND timestamp >= datetime('now', '-1 day')
    )
    WHERE metric_name = 'usage_resets_today';
    
    -- Update webhook success rate
    UPDATE system_health_metrics 
    SET metric_value = (
        SELECT 
            CASE 
                WHEN COUNT(*) = 0 THEN 100.0
                ELSE (COUNT(CASE WHEN action = 'success' THEN 1 END) * 100.0 / COUNT(*))
            END
        FROM monitoring_events 
        WHERE event_type = 'webhook_received' 
        AND timestamp >= datetime('now', '-1 day')
    )
    WHERE metric_name = 'webhook_success_rate';
    
    -- Update error rate
    UPDATE system_health_metrics 
    SET metric_value = (
        SELECT 
            CASE 
                WHEN COUNT(*) = 0 THEN 0.0
                ELSE (COUNT(CASE WHEN event_type = 'error' THEN 1 END) * 100.0 / COUNT(*))
            END
        FROM monitoring_events 
        WHERE timestamp >= datetime('now', '-1 day')
    )
    WHERE metric_name = 'error_rate';
END;

-- Verify the migration
SELECT COUNT(*) as monitoring_events_count FROM monitoring_events;
SELECT COUNT(*) as system_health_metrics_count FROM system_health_metrics;