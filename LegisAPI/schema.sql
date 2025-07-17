-- Users table for tracking API usage
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    auth0_user_id TEXT UNIQUE NOT NULL,
    email TEXT NOT NULL,
    name TEXT,
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

-- Enhanced API usage tracking with more details
CREATE TABLE IF NOT EXISTS api_usage_enhanced (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    endpoint TEXT NOT NULL,
    method TEXT NOT NULL,
    status_code INTEGER,
    response_time_ms INTEGER,
    request_size_bytes INTEGER,
    response_size_bytes INTEGER,
    error_message TEXT,
    ip_address TEXT,
    user_agent TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

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

CREATE INDEX idx_api_usage_enhanced_user_id ON api_usage_enhanced(user_id);
CREATE INDEX idx_api_usage_enhanced_endpoint ON api_usage_enhanced(endpoint);
CREATE INDEX idx_api_usage_enhanced_timestamp ON api_usage_enhanced(timestamp);

-- Trigger to update updated_at on users table
CREATE TRIGGER update_users_updated_at 
AFTER UPDATE ON users
BEGIN
    UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;