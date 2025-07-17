-- Users table for tracking API usage
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    auth0_user_id TEXT UNIQUE NOT NULL,
    email TEXT NOT NULL,
    name TEXT,
    role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'super_admin')),
    plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'developer', 'professional', 'enterprise')),
    api_calls_count INTEGER DEFAULT 0,
    api_calls_limit INTEGER DEFAULT 100,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- API usage tracking
CREATE TABLE IF NOT EXISTS api_usage (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    endpoint TEXT NOT NULL,
    method TEXT NOT NULL,
    status_code INTEGER,
    response_time_ms INTEGER,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Indexes for performance
CREATE INDEX idx_users_auth0_id ON users(auth0_user_id);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_api_usage_user_id ON api_usage(user_id);
CREATE INDEX idx_api_usage_timestamp ON api_usage(timestamp);

-- User activity events tracking for comprehensive analytics
CREATE TABLE IF NOT EXISTS user_activity_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    session_id TEXT NOT NULL,
    event_type TEXT NOT NULL CHECK (event_type IN (
        'page_view', 'button_click', 'form_interaction', 'search_query',
        'session_start', 'session_end', 'error', 'feature_usage',
        'navigation', 'scroll_depth', 'time_on_page'
    )),
    event_data JSON NOT NULL,
    page_url TEXT NOT NULL,
    page_title TEXT,
    referrer TEXT,
    user_agent TEXT,
    device_type TEXT CHECK (device_type IN ('desktop', 'mobile', 'tablet')),
    viewport_width INTEGER,
    viewport_height INTEGER,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- MCP tool usage logs (enhanced version of existing mcp_logs)
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

-- Enhanced API usage tracking removed - was unused

-- Indexes for performance on new tables
CREATE INDEX idx_user_activity_events_user_id ON user_activity_events(user_id);
CREATE INDEX idx_user_activity_events_session_id ON user_activity_events(session_id);
CREATE INDEX idx_user_activity_events_event_type ON user_activity_events(event_type);
CREATE INDEX idx_user_activity_events_timestamp ON user_activity_events(timestamp);
CREATE INDEX idx_user_activity_events_page_url ON user_activity_events(page_url);

CREATE INDEX idx_mcp_logs_user_id ON mcp_logs(user_id);
CREATE INDEX idx_mcp_logs_tool_name ON mcp_logs(tool_name);
CREATE INDEX idx_mcp_logs_timestamp ON mcp_logs(timestamp);
CREATE INDEX idx_mcp_logs_status ON mcp_logs(status);

-- api_usage_enhanced indexes removed - table was unused

-- Trigger to update updated_at on users table
CREATE TRIGGER update_users_updated_at 
AFTER UPDATE ON users
BEGIN
    UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;-- System alerts table for error monitoring and notifications
CREATE TABLE IF NOT EXISTS system_alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    alert_type TEXT NOT NULL CHECK (alert_type IN ('error', 'warning', 'info', 'success')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    component TEXT NOT NULL, -- 'LegisAPI', 'MCP Server', 'Frontend'
    endpoint TEXT, -- Optional: specific endpoint that triggered the alert
    error_code TEXT, -- Optional: error code or identifier
    affected_users_count INTEGER DEFAULT 0,
    is_resolved BOOLEAN DEFAULT 0,
    is_read BOOLEAN DEFAULT 0,
    resolved_at DATETIME,
    resolved_by TEXT, -- user who resolved the alert
    resolution_notes TEXT,
    metadata JSON, -- Additional alert data
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Error events table for detailed error tracking
CREATE TABLE IF NOT EXISTS error_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_type TEXT NOT NULL, -- 'DATABASE_ERROR', 'API_ERROR', 'VALIDATION_ERROR', etc.
    severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    message TEXT NOT NULL,
    component TEXT NOT NULL, -- 'LegisAPI', 'MCP Server', 'Frontend'
    endpoint TEXT,
    method TEXT, -- HTTP method
    status_code INTEGER,
    user_id INTEGER,
    user_email TEXT,
    stack_trace TEXT,
    error_count INTEGER DEFAULT 1,
    first_occurrence DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_occurrence DATETIME DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved')),
    assigned_to TEXT,
    resolution_notes TEXT,
    tags TEXT, -- comma-separated tags
    ip_address TEXT,
    user_agent TEXT,
    request_data JSON,
    response_data JSON,
    session_id TEXT,
    correlation_id TEXT, -- for tracking related errors
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Error metrics aggregation table for performance
CREATE TABLE IF NOT EXISTS error_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    time_bucket DATETIME NOT NULL, -- hourly buckets
    component TEXT NOT NULL,
    endpoint TEXT,
    total_errors INTEGER DEFAULT 0,
    critical_errors INTEGER DEFAULT 0,
    high_errors INTEGER DEFAULT 0,
    medium_errors INTEGER DEFAULT 0,
    low_errors INTEGER DEFAULT 0,
    error_rate REAL DEFAULT 0.0,
    affected_users INTEGER DEFAULT 0,
    avg_response_time_ms INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(time_bucket, component, endpoint)
);

-- Alert rules table for configurable alerting
CREATE TABLE IF NOT EXISTS alert_rules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    condition_type TEXT NOT NULL CHECK (condition_type IN ('threshold', 'rate', 'count', 'percentage')),
    condition_value REAL NOT NULL,
    time_window_minutes INTEGER DEFAULT 5,
    component TEXT, -- Optional: specific component to monitor
    endpoint TEXT, -- Optional: specific endpoint to monitor
    severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    is_active BOOLEAN DEFAULT 1,
    notification_channels TEXT, -- comma-separated channels: 'email', 'slack', 'webhook'
    cooldown_minutes INTEGER DEFAULT 60, -- prevent alert spam
    last_triggered DATETIME,
    trigger_count INTEGER DEFAULT 0,
    created_by TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- System health metrics table
CREATE TABLE IF NOT EXISTS system_health (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    time_bucket DATETIME NOT NULL,
    component TEXT NOT NULL,
    metric_name TEXT NOT NULL,
    metric_value REAL NOT NULL,
    metric_unit TEXT, -- 'ms', 'percent', 'count', etc.
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(time_bucket, component, metric_name)
);

-- Indexes for performance
CREATE INDEX idx_system_alerts_created_at ON system_alerts(created_at);
CREATE INDEX idx_system_alerts_alert_type ON system_alerts(alert_type);
CREATE INDEX idx_system_alerts_severity ON system_alerts(severity);
CREATE INDEX idx_system_alerts_component ON system_alerts(component);
CREATE INDEX idx_system_alerts_is_resolved ON system_alerts(is_resolved);

CREATE INDEX idx_error_events_created_at ON error_events(created_at);
CREATE INDEX idx_error_events_event_type ON error_events(event_type);
CREATE INDEX idx_error_events_severity ON error_events(severity);
CREATE INDEX idx_error_events_component ON error_events(component);
CREATE INDEX idx_error_events_status ON error_events(status);
CREATE INDEX idx_error_events_user_id ON error_events(user_id);
CREATE INDEX idx_error_events_endpoint ON error_events(endpoint);
CREATE INDEX idx_error_events_correlation_id ON error_events(correlation_id);

CREATE INDEX idx_error_metrics_time_bucket ON error_metrics(time_bucket);
CREATE INDEX idx_error_metrics_component ON error_metrics(component);
CREATE INDEX idx_error_metrics_endpoint ON error_metrics(endpoint);

CREATE INDEX idx_alert_rules_is_active ON alert_rules(is_active);
CREATE INDEX idx_alert_rules_component ON alert_rules(component);
CREATE INDEX idx_alert_rules_last_triggered ON alert_rules(last_triggered);

CREATE INDEX idx_system_health_time_bucket ON system_health(time_bucket);
CREATE INDEX idx_system_health_component ON system_health(component);
CREATE INDEX idx_system_health_metric_name ON system_health(metric_name);

-- Triggers for auto-updating timestamps
CREATE TRIGGER update_system_alerts_updated_at 
AFTER UPDATE ON system_alerts
BEGIN
    UPDATE system_alerts SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER update_error_events_updated_at 
AFTER UPDATE ON error_events
BEGIN
    UPDATE error_events SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER update_alert_rules_updated_at 
AFTER UPDATE ON alert_rules
BEGIN
    UPDATE alert_rules SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Sample data for testing
INSERT OR IGNORE INTO alert_rules (name, description, condition_type, condition_value, time_window_minutes, severity, notification_channels, created_by) VALUES
('Critical Error Rate', 'Alert when error rate exceeds 5%', 'percentage', 5.0, 5, 'critical', 'email,slack', 'system'),
('Database Connection Failures', 'Alert when database errors exceed 10 in 5 minutes', 'count', 10, 5, 'high', 'email', 'system'),
('High API Response Time', 'Alert when average response time exceeds 2 seconds', 'threshold', 2000, 10, 'medium', 'slack', 'system'),
('User Session Failures', 'Alert when user authentication failures exceed 20 in 10 minutes', 'count', 20, 10, 'high', 'email', 'system');

-- Sample system alerts for testing
INSERT OR IGNORE INTO system_alerts (alert_type, title, message, severity, component, affected_users_count, metadata) VALUES
('error', 'Critical Error Spike', 'Error rate has increased to 8.5% in the last 15 minutes', 'critical', 'LegisAPI', 25, '{"error_rate": 8.5, "threshold": 5.0, "time_window": 15}'),
('warning', 'Database Connection Issues', 'Multiple D1 database timeout errors detected', 'high', 'LegisAPI', 12, '{"timeout_count": 15, "affected_endpoints": ["/api/bills", "/api/members"]}'),
('info', 'Error Rate Normalized', 'Error rate has returned to baseline levels', 'low', 'LegisAPI', 0, '{"error_rate": 2.1, "previous_rate": 8.5}'),
('warning', 'High Memory Usage', 'MCP Server memory usage above 80%', 'medium', 'MCP Server', 0, '{"memory_usage": 85.3, "threshold": 80.0}'),
('error', 'Rate Limiting Activated', 'Multiple users hitting rate limits', 'medium', 'MCP Server', 8, '{"rate_limited_users": 8, "endpoint": "/mcp/tools"}');

-- Sample error events for testing
INSERT OR IGNORE INTO error_events (event_type, severity, message, component, endpoint, method, status_code, user_email, error_count, tags) VALUES
('DATABASE_CONNECTION_ERROR', 'critical', 'Unable to connect to D1 database - connection timeout', 'LegisAPI', '/api/bills', 'GET', 500, 'john@example.com', 5, 'database,timeout,api'),
('RATE_LIMIT_EXCEEDED', 'high', 'User exceeded rate limit for MCP tool calls', 'MCP Server', '/mcp/tools', 'POST', 429, 'jane@example.com', 12, 'rate-limit,mcp,user'),
('AUTHENTICATION_ERROR', 'medium', 'Invalid JWT token in request', 'Frontend', '/api/auth/profile', 'GET', 401, 'test@example.com', 3, 'auth,jwt,token'),
('VALIDATION_ERROR', 'low', 'Invalid bill number format in search query', 'LegisAPI', '/api/search', 'GET', 400, 'user@example.com', 8, 'validation,search,format'),
('TIMEOUT_ERROR', 'high', 'Congress.gov API request timeout', 'LegisAPI', '/api/bills', 'GET', 504, 'admin@example.com', 2, 'timeout,external-api,congress');