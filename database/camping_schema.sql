-- Camping trips table
CREATE TABLE IF NOT EXISTS camping_trips (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    location VARCHAR(255) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    trip_type VARCHAR(30) CHECK (trip_type IN ('car_camping', 'backpacking', 'rv_camping', 'glamping')),
    organizer_id INTEGER REFERENCES users(id),
    is_public BOOLEAN DEFAULT true,
    trip_code VARCHAR(10) UNIQUE,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true
);

-- Add index for trip_code lookups
CREATE INDEX IF NOT EXISTS idx_camping_trips_code ON camping_trips(trip_code);

-- Trip participants table (many-to-many relationship)
CREATE TABLE IF NOT EXISTS trip_participants (
    id SERIAL PRIMARY KEY,
    trip_id INTEGER REFERENCES camping_trips(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'pending', 'cancelled')),
    UNIQUE(trip_id, user_id)
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_camping_trips_start_date ON camping_trips(start_date);
CREATE INDEX IF NOT EXISTS idx_camping_trips_organizer ON camping_trips(organizer_id);
CREATE INDEX IF NOT EXISTS idx_trip_participants_trip ON trip_participants(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_participants_user ON trip_participants(user_id);

-- Update timestamp trigger for camping_trips
DROP TRIGGER IF EXISTS update_camping_trips_updated_at ON camping_trips;
CREATE TRIGGER update_camping_trips_updated_at 
    BEFORE UPDATE ON camping_trips 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
