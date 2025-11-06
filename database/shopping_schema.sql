-- Group Shopping List Schema for Camping Trips
-- Designed for collaborative shopping with future Amazon integration

-- Shopping list items for each trip
CREATE TABLE IF NOT EXISTS trip_shopping_items (
    id SERIAL PRIMARY KEY,
    trip_id INTEGER NOT NULL REFERENCES camping_trips(id) ON DELETE CASCADE,
    
    -- Item details
    item_name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) DEFAULT 'general', -- food, gear, supplies, personal, etc.
    quantity INTEGER DEFAULT 1,
    estimated_cost DECIMAL(10,2), -- for budgeting
    
    -- Assignment and status
    assigned_to VARCHAR(50), -- 'everyone', 'anyone', or specific user_id
    is_purchased BOOLEAN DEFAULT FALSE,
    purchased_by INTEGER REFERENCES users(id),
    purchased_at TIMESTAMP,
    
    -- Collaboration tracking
    created_by INTEGER NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by INTEGER REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Future Amazon integration fields
    amazon_asin VARCHAR(20), -- Amazon Standard Identification Number
    amazon_url TEXT,
    amazon_price DECIMAL(10,2),
    amazon_image_url TEXT,
    
    -- Priority and notes
    priority VARCHAR(20) DEFAULT 'medium', -- high, medium, low
    notes TEXT,
    
    CONSTRAINT valid_priority CHECK (priority IN ('high', 'medium', 'low')),
    CONSTRAINT valid_assignment CHECK (
        assigned_to IN ('everyone', 'anyone') OR 
        assigned_to ~ '^[0-9]+$' -- numeric user ID
    )
);

-- Shopping categories for organization
CREATE TABLE IF NOT EXISTS shopping_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    icon VARCHAR(50), -- Material Design icon name
    color VARCHAR(20), -- CSS color or hex
    sort_order INTEGER DEFAULT 0,
    is_default BOOLEAN DEFAULT FALSE
);

-- Insert default shopping categories
INSERT INTO shopping_categories (name, icon, color, sort_order, is_default) VALUES
('Food & Drinks', 'restaurant', '#FF6B35', 1, true),
('Camping Gear', 'outdoor_grill', '#4ECDC4', 2, true),
('Safety & First Aid', 'medical_services', '#FF3B30', 3, true),
('Personal Items', 'person', '#007AFF', 4, true),
('Entertainment', 'sports_esports', '#AF52DE', 5, true),
('Supplies & Tools', 'build', '#FF9500', 6, true),
('Transportation', 'directions_car', '#34C759', 7, true),
('General', 'shopping_cart', '#8E8E93', 8, true)
ON CONFLICT (name) DO NOTHING;

-- Shopping list templates for common camping items
CREATE TABLE IF NOT EXISTS shopping_templates (
    id SERIAL PRIMARY KEY,
    trip_type VARCHAR(50), -- car_camping, backpacking, etc.
    category VARCHAR(100),
    item_name VARCHAR(255) NOT NULL,
    description TEXT,
    quantity INTEGER DEFAULT 1,
    priority VARCHAR(20) DEFAULT 'medium',
    estimated_cost DECIMAL(10,2),
    is_essential BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert common camping shopping items
INSERT INTO shopping_templates (trip_type, category, item_name, description, quantity, priority, estimated_cost, is_essential) VALUES
-- Food essentials
('car_camping', 'Food & Drinks', 'Water (gallons)', 'Drinking water for the group', 2, 'high', 5.00, true),
('car_camping', 'Food & Drinks', 'Snacks & Trail Mix', 'Energy snacks for hiking', 1, 'medium', 15.00, false),
('car_camping', 'Food & Drinks', 'Marshmallows', 'For campfire s''mores', 2, 'low', 8.00, false),
('car_camping', 'Food & Drinks', 'Hot Dogs & Buns', 'Easy campfire meal', 1, 'medium', 12.00, false),

-- Camping gear
('car_camping', 'Camping Gear', 'Firewood', 'For campfire and cooking', 1, 'high', 20.00, true),
('car_camping', 'Camping Gear', 'Matches/Lighter', 'Fire starting supplies', 2, 'high', 5.00, true),
('car_camping', 'Camping Gear', 'Cooler Ice', 'Keep food and drinks cold', 2, 'high', 10.00, true),
('car_camping', 'Camping Gear', 'Camping Chairs', 'Comfortable seating around fire', 4, 'medium', 80.00, false),

-- Safety & supplies
('car_camping', 'Safety & First Aid', 'First Aid Kit', 'Basic medical supplies', 1, 'high', 25.00, true),
('car_camping', 'Safety & First Aid', 'Flashlights', 'Emergency lighting', 2, 'high', 15.00, true),
('car_camping', 'Supplies & Tools', 'Trash Bags', 'Leave no trace cleanup', 1, 'high', 8.00, true),
('car_camping', 'Supplies & Tools', 'Paper Towels', 'Cleanup and cooking prep', 2, 'medium', 6.00, false),

-- Backpacking specific
('backpacking', 'Food & Drinks', 'Dehydrated Meals', 'Lightweight camping food', 3, 'high', 45.00, true),
('backpacking', 'Safety & First Aid', 'Water Purification Tablets', 'Safe drinking water', 1, 'high', 12.00, true),
('backpacking', 'Camping Gear', 'Portable Stove Fuel', 'Cooking fuel canisters', 2, 'high', 20.00, true)

ON CONFLICT DO NOTHING;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_shopping_items_trip_id ON trip_shopping_items(trip_id);
CREATE INDEX IF NOT EXISTS idx_shopping_items_category ON trip_shopping_items(category);
CREATE INDEX IF NOT EXISTS idx_shopping_items_assigned_to ON trip_shopping_items(assigned_to);
CREATE INDEX IF NOT EXISTS idx_shopping_items_purchased ON trip_shopping_items(is_purchased);
CREATE INDEX IF NOT EXISTS idx_shopping_templates_trip_type ON shopping_templates(trip_type);

-- Update trigger for shopping items
CREATE OR REPLACE FUNCTION update_shopping_item_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER shopping_item_update_timestamp
    BEFORE UPDATE ON trip_shopping_items
    FOR EACH ROW
    EXECUTE FUNCTION update_shopping_item_timestamp();
