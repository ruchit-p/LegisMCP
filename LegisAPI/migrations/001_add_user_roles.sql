-- Migration: Add role field to users table
-- Run this migration to add role support to existing database

-- Add role column to users table
ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'super_admin'));

-- Create index for role field
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Update existing users to have 'user' role by default
UPDATE users SET role = 'user' WHERE role IS NULL;

-- Optional: Set specific users as admin (update these email addresses as needed)
-- UPDATE users SET role = 'admin' WHERE email IN ('admin@legismcp.com', 'your-admin-email@example.com');

-- Verify the migration
SELECT COUNT(*) as total_users, role FROM users GROUP BY role;