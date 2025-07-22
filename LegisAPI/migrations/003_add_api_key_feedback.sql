-- Create api_key_feedback table for tracking user feedback on API key generation feature
CREATE TABLE IF NOT EXISTS api_key_feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    thumbs_up BOOLEAN NOT NULL,
    feedback_text TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    -- Ensure one feedback per user
    UNIQUE(user_id)
);

-- Index for querying feedback by user
CREATE INDEX idx_api_key_feedback_user_id ON api_key_feedback(user_id);

-- Index for aggregating thumbs up/down stats
CREATE INDEX idx_api_key_feedback_thumbs_up ON api_key_feedback(thumbs_up);