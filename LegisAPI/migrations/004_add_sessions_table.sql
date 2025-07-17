-- Auth.js Sessions Table for D1 Session Storage
-- This table stores user sessions with comprehensive session data

CREATE TABLE IF NOT EXISTS sessions (
    session_token TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    expires DATETIME NOT NULL,
    
    -- User Information
    user_data JSON NOT NULL,
    
    -- Token Information
    access_token TEXT,
    refresh_token TEXT,
    id_token TEXT,
    token_expires_at DATETIME,
    
    -- Session Security
    ip_address TEXT,
    user_agent TEXT,
    csrf_token TEXT,
    
    -- User Preferences
    preferences JSON DEFAULT '{}',
    
    -- Security Information
    security_info JSON DEFAULT '{}',
    
    -- Session Metadata
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_accessed DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires);
CREATE INDEX IF NOT EXISTS idx_sessions_last_accessed ON sessions(last_accessed);
CREATE INDEX IF NOT EXISTS idx_sessions_ip_address ON sessions(ip_address);

-- Auth.js Account Table (for OAuth connections)
CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    type TEXT NOT NULL,
    provider TEXT NOT NULL,
    provider_account_id TEXT NOT NULL,
    refresh_token TEXT,
    access_token TEXT,
    expires_at INTEGER,
    id_token TEXT,
    scope TEXT,
    session_state TEXT,
    token_type TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(provider, provider_account_id)
);

-- Indexes for accounts table
CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_accounts_provider ON accounts(provider);

-- Auth.js Verification Tokens (for email verification, etc.)
CREATE TABLE IF NOT EXISTS verification_tokens (
    token TEXT PRIMARY KEY,
    identifier TEXT NOT NULL,
    expires DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Index for verification tokens
CREATE INDEX IF NOT EXISTS idx_verification_tokens_identifier ON verification_tokens(identifier);
CREATE INDEX IF NOT EXISTS idx_verification_tokens_expires ON verification_tokens(expires);

-- Update trigger for sessions table
CREATE TRIGGER IF NOT EXISTS update_sessions_updated_at 
AFTER UPDATE ON sessions
BEGIN
    UPDATE sessions SET updated_at = CURRENT_TIMESTAMP WHERE session_token = NEW.session_token;
END;

-- Update trigger for accounts table
CREATE TRIGGER IF NOT EXISTS update_accounts_updated_at 
AFTER UPDATE ON accounts
BEGIN
    UPDATE accounts SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Clean up expired sessions (run this periodically)
-- This can be called by a scheduled job
CREATE VIEW IF NOT EXISTS expired_sessions AS
SELECT session_token FROM sessions 
WHERE expires < CURRENT_TIMESTAMP;

-- Sample cleanup statement (to be run by scheduled job)
-- DELETE FROM sessions WHERE expires < CURRENT_TIMESTAMP;