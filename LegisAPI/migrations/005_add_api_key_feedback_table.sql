-- API Key Feature Feedback Table
-- This table tracks user feedback for the upcoming API key feature

CREATE TABLE IF NOT EXISTS api_key_feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    thumbs_up BOOLEAN NOT NULL DEFAULT FALSE,
    feedback_message TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    UNIQUE(user_id), -- One feedback per user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX idx_api_key_feedback_user_id ON api_key_feedback(user_id);
CREATE INDEX idx_api_key_feedback_thumbs_up ON api_key_feedback(thumbs_up);
CREATE INDEX idx_api_key_feedback_created_at ON api_key_feedback(created_at);

-- Trigger to update updated_at on api_key_feedback table
CREATE TRIGGER update_api_key_feedback_updated_at 
AFTER UPDATE ON api_key_feedback
BEGIN
    UPDATE api_key_feedback SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- View for getting feedback statistics
CREATE VIEW api_key_feedback_stats AS
SELECT 
    COUNT(*) as total_feedback,
    COUNT(CASE WHEN thumbs_up = TRUE THEN 1 END) as total_thumbs_up,
    COUNT(CASE WHEN thumbs_up = FALSE THEN 1 END) as total_thumbs_down,
    ROUND(
        (COUNT(CASE WHEN thumbs_up = TRUE THEN 1 END) * 100.0) / 
        NULLIF(COUNT(*), 0), 
        2
    ) as thumbs_up_percentage
FROM api_key_feedback; 