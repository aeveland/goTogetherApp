-- Add profile fields to existing users table
-- This is safe to run multiple times

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS camper_type VARCHAR(20),
ADD COLUMN IF NOT EXISTS group_size INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS dietary_restrictions VARCHAR(50),
ADD COLUMN IF NOT EXISTS phone VARCHAR(20);

-- Add constraints after columns exist
DO $$ 
BEGIN
    -- Add check constraint for camper_type if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'users_camper_type_check'
    ) THEN
        ALTER TABLE users ADD CONSTRAINT users_camper_type_check 
        CHECK (camper_type IN ('tent', 'trailer', 'rv', 'van', 'fifth_wheel'));
    END IF;
    
    -- Add check constraint for group_size if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'users_group_size_check'
    ) THEN
        ALTER TABLE users ADD CONSTRAINT users_group_size_check 
        CHECK (group_size >= 1 AND group_size <= 20);
    END IF;
END $$;

-- Set default group_size for existing users
UPDATE users SET group_size = 1 WHERE group_size IS NULL;
