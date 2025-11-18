-- Add onboarding tracking to users table
-- This is safe to run multiple times

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS onboarding_step INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS onboarding_skipped BOOLEAN DEFAULT false;

-- Create index for faster onboarding queries
CREATE INDEX IF NOT EXISTS idx_users_onboarding ON users(onboarding_completed) WHERE onboarding_completed = false;

COMMENT ON COLUMN users.onboarding_completed IS 'Whether user has completed the onboarding wizard';
COMMENT ON COLUMN users.onboarding_step IS 'Current step in onboarding process (0-5)';
COMMENT ON COLUMN users.onboarding_skipped IS 'Whether user skipped onboarding';
