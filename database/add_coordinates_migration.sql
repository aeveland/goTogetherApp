-- Migration to add latitude and longitude columns to camping_trips table
-- This fixes the trip creation error in production

-- Add latitude and longitude columns if they don't exist
DO $$ 
BEGIN
    -- Add latitude column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'camping_trips' AND column_name = 'latitude') THEN
        ALTER TABLE camping_trips ADD COLUMN latitude DECIMAL(10, 8);
    END IF;
    
    -- Add longitude column  
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'camping_trips' AND column_name = 'longitude') THEN
        ALTER TABLE camping_trips ADD COLUMN longitude DECIMAL(11, 8);
    END IF;
END $$;

-- Add indexes for location-based queries
CREATE INDEX IF NOT EXISTS idx_camping_trips_location ON camping_trips(latitude, longitude);

-- Verify the changes
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'camping_trips' 
ORDER BY ordinal_position;
