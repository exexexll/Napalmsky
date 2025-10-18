-- ===== SECURITY FEATURES MIGRATION =====
-- Run this on production PostgreSQL database
-- Safe to run multiple times (uses IF NOT EXISTS)
-- Created: October 18, 2025

-- ===== SESSIONS TABLE UPDATES =====

-- Add new columns for single-session enforcement
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS device_info TEXT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMP DEFAULT NOW();

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_sessions_is_active ON sessions(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_sessions_user_active ON sessions(user_id, is_active) WHERE is_active = TRUE;

-- Update existing sessions to be active (backward compatibility)
UPDATE sessions SET is_active = TRUE WHERE is_active IS NULL;
UPDATE sessions SET last_active_at = created_at WHERE last_active_at IS NULL;

-- ===== USERS TABLE UPDATES =====

-- Add new columns for QR grace period system
ALTER TABLE users ADD COLUMN IF NOT EXISTS qr_unlocked BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS successful_sessions INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS qr_unlocked_at TIMESTAMP;

-- Update paid_status constraint to include grace period
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_paid_status_check;
ALTER TABLE users ADD CONSTRAINT users_paid_status_check 
  CHECK (paid_status IN ('unpaid', 'paid', 'qr_verified', 'qr_grace_period'));

-- Initialize existing users
UPDATE users SET qr_unlocked = FALSE WHERE qr_unlocked IS NULL;
UPDATE users SET successful_sessions = 0 WHERE successful_sessions IS NULL;

-- Users who paid should have QR unlocked immediately
UPDATE users SET qr_unlocked = TRUE WHERE paid_status = 'paid' AND qr_unlocked = FALSE;

-- ===== SESSION COMPLETIONS TABLE =====

-- Create new table for tracking video call completions
CREATE TABLE IF NOT EXISTS session_completions (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  partner_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  room_id UUID NOT NULL,
  duration_seconds INTEGER NOT NULL CHECK (duration_seconds > 0),
  completed_at TIMESTAMP DEFAULT NOW(),
  
  -- Prevent duplicate entries for same call
  CONSTRAINT unique_session_completion UNIQUE (user_id, room_id)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_completions_user_id ON session_completions(user_id);
CREATE INDEX IF NOT EXISTS idx_completions_completed_at ON session_completions(completed_at);

-- ===== VERIFICATION =====

-- Verify migrations completed successfully
DO $$
BEGIN
  -- Check sessions columns exist
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'sessions' AND column_name = 'is_active'
  ) THEN
    RAISE NOTICE '✅ Sessions table updated successfully';
  ELSE
    RAISE EXCEPTION '❌ Sessions table migration failed';
  END IF;
  
  -- Check users columns exist
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'qr_unlocked'
  ) THEN
    RAISE NOTICE '✅ Users table updated successfully';
  ELSE
    RAISE EXCEPTION '❌ Users table migration failed';
  END IF;
  
  -- Check session_completions table exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'session_completions'
  ) THEN
    RAISE NOTICE '✅ Session completions table created successfully';
  ELSE
    RAISE EXCEPTION '❌ Session completions table creation failed';
  END IF;
  
  RAISE NOTICE '🎉 All migrations completed successfully!';
END $$;

-- ===== POST-MIGRATION QUERIES =====

-- View migration results
SELECT 
  'sessions' as table_name,
  COUNT(*) as total_rows,
  COUNT(*) FILTER (WHERE is_active = TRUE) as active_sessions,
  COUNT(*) FILTER (WHERE device_info IS NOT NULL) as with_device_info
FROM sessions
UNION ALL
SELECT 
  'users' as table_name,
  COUNT(*) as total_rows,
  COUNT(*) FILTER (WHERE qr_unlocked = TRUE) as unlocked_users,
  COUNT(*) FILTER (WHERE paid_status = 'qr_grace_period') as grace_period_users
FROM users
UNION ALL
SELECT 
  'session_completions' as table_name,
  COUNT(*) as total_rows,
  NULL as col2,
  NULL as col3
FROM session_completions;

