-- Add trip status field to trips table
-- This allows tracking trip progress: Planning, Active, Completed

ALTER TABLE trips 
ADD COLUMN status VARCHAR(20) DEFAULT 'planning' CHECK (status IN ('planning', 'active', 'completed'));

-- Update existing trips to have 'planning' status
UPDATE trips 
SET status = 'planning' 
WHERE status IS NULL;

-- Add index for better query performance
CREATE INDEX idx_trips_status ON trips(status);

-- Add index for status + start_date for filtering
CREATE INDEX idx_trips_status_date ON trips(status, start_date);

COMMENT ON COLUMN trips.status IS 'Trip status: planning, active, or completed';
