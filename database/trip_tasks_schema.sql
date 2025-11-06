-- Trip Tasks table for shared task management
CREATE TABLE IF NOT EXISTS trip_tasks (
    id SERIAL PRIMARY KEY,
    trip_id INTEGER REFERENCES camping_trips(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    created_by INTEGER REFERENCES users(id),
    assigned_to INTEGER REFERENCES users(id), -- NULL means "everyone"
    assignment_type VARCHAR(20) DEFAULT 'everyone' CHECK (assignment_type IN ('everyone', 'anyone', 'specific')),
    due_date TIMESTAMP,
    has_due_date BOOLEAN DEFAULT false,
    is_completed BOOLEAN DEFAULT false,
    completed_by INTEGER REFERENCES users(id),
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_trip_tasks_trip_id ON trip_tasks(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_tasks_assigned_to ON trip_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_trip_tasks_created_by ON trip_tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_trip_tasks_due_date ON trip_tasks(due_date);

-- Update timestamp trigger for trip_tasks
DROP TRIGGER IF EXISTS update_trip_tasks_updated_at ON trip_tasks;
CREATE TRIGGER update_trip_tasks_updated_at 
    BEFORE UPDATE ON trip_tasks 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
