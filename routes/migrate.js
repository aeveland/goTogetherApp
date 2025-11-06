const express = require('express');
const pool = require('../database/db');

const router = express.Router();

// Simple migration to add profile fields
router.post('/add-profile-fields', async (req, res) => {
  try {
    console.log('Starting profile fields migration...');
    
    // Add profile columns to users table
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS bio TEXT,
      ADD COLUMN IF NOT EXISTS camper_type VARCHAR(20),
      ADD COLUMN IF NOT EXISTS group_size INTEGER DEFAULT 1,
      ADD COLUMN IF NOT EXISTS dietary_restrictions VARCHAR(50),
      ADD COLUMN IF NOT EXISTS phone VARCHAR(20)
    `);
    
    console.log('Added profile columns');
    
    // Add constraints
    await pool.query(`
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
    `);
    
    console.log('Added constraints');
    
    // Set default group_size for existing users
    await pool.query(`UPDATE users SET group_size = 1 WHERE group_size IS NULL`);
    
    console.log('Updated existing users');
    
    res.json({
      success: true,
      message: 'Profile fields migration completed successfully!',
      details: [
        'Added bio column',
        'Added camper_type column with constraints',
        'Added group_size column with default value 1',
        'Added dietary_restrictions column',
        'Added phone column',
        'Updated existing users with default group_size'
      ]
    });
    
  } catch (error) {
    console.error('Migration error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Migration failed',
      details: error.message 
    });
  }
});

// Check if migration is needed
router.get('/check-profile-fields', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name IN ('bio', 'camper_type', 'group_size', 'dietary_restrictions', 'phone')
    `);
    
    const existingColumns = result.rows.map(row => row.column_name);
    const requiredColumns = ['bio', 'camper_type', 'group_size', 'dietary_restrictions', 'phone'];
    const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col));
    
    res.json({
      migration_needed: missingColumns.length > 0,
      existing_columns: existingColumns,
      missing_columns: missingColumns,
      message: missingColumns.length > 0 ? 'Migration needed' : 'All profile fields exist'
    });
    
  } catch (error) {
    console.error('Check error:', error);
    res.status(500).json({ 
      error: 'Failed to check migration status',
      details: error.message 
    });
  }
});

// Migration to add shopping list tables
router.post('/add-shopping-tables', async (req, res) => {
  try {
    console.log('Starting shopping tables migration...');
    
    // Create shopping categories table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS shopping_categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL,
        icon VARCHAR(50),
        color VARCHAR(20),
        sort_order INTEGER DEFAULT 0,
        is_default BOOLEAN DEFAULT FALSE
      )
    `);
    
    // Create shopping items table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS trip_shopping_items (
        id SERIAL PRIMARY KEY,
        trip_id INTEGER NOT NULL REFERENCES camping_trips(id) ON DELETE CASCADE,
        item_name VARCHAR(255) NOT NULL,
        description TEXT,
        category VARCHAR(100) DEFAULT 'General',
        quantity INTEGER DEFAULT 1,
        estimated_cost DECIMAL(10,2),
        assigned_to VARCHAR(50) DEFAULT 'anyone',
        is_purchased BOOLEAN DEFAULT FALSE,
        purchased_by INTEGER REFERENCES users(id),
        purchased_at TIMESTAMP,
        created_by INTEGER NOT NULL REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_by INTEGER REFERENCES users(id),
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        amazon_asin VARCHAR(20),
        amazon_url TEXT,
        amazon_price DECIMAL(10,2),
        amazon_image_url TEXT,
        priority VARCHAR(20) DEFAULT 'medium',
        notes TEXT,
        CONSTRAINT valid_priority CHECK (priority IN ('high', 'medium', 'low')),
        CONSTRAINT valid_assignment CHECK (
          assigned_to IN ('everyone', 'anyone') OR 
          assigned_to ~ '^[0-9]+$'
        )
      )
    `);
    
    // Insert default categories
    await pool.query(`
      INSERT INTO shopping_categories (name, icon, color, sort_order, is_default) VALUES
      ('Food & Drinks', 'restaurant', '#FF6B35', 1, true),
      ('Camping Gear', 'outdoor_grill', '#4ECDC4', 2, true),
      ('Safety & First Aid', 'medical_services', '#FF3B30', 3, true),
      ('Personal Items', 'person', '#007AFF', 4, true),
      ('Entertainment', 'sports_esports', '#AF52DE', 5, true),
      ('Supplies & Tools', 'build', '#FF9500', 6, true),
      ('Transportation', 'directions_car', '#34C759', 7, true),
      ('General', 'shopping_cart', '#8E8E93', 8, true)
      ON CONFLICT (name) DO NOTHING
    `);
    
    // Create indexes
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_shopping_items_trip_id ON trip_shopping_items(trip_id);
      CREATE INDEX IF NOT EXISTS idx_shopping_items_category ON trip_shopping_items(category);
      CREATE INDEX IF NOT EXISTS idx_shopping_items_assigned_to ON trip_shopping_items(assigned_to);
      CREATE INDEX IF NOT EXISTS idx_shopping_items_purchased ON trip_shopping_items(is_purchased);
    `);
    
    console.log('Shopping tables migration completed successfully');
    res.json({ 
      success: true, 
      message: 'Shopping tables created successfully' 
    });
    
  } catch (error) {
    console.error('Shopping migration error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Migration failed', 
      details: error.message 
    });
  }
});

// Migration to add home address fields to users table
router.post('/add-home-address', async (req, res) => {
  try {
    console.log('Starting home address migration...');
    
    // Add home address columns to users table
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS home_address TEXT,
      ADD COLUMN IF NOT EXISTS home_city VARCHAR(100),
      ADD COLUMN IF NOT EXISTS home_state VARCHAR(50),
      ADD COLUMN IF NOT EXISTS home_zip VARCHAR(20),
      ADD COLUMN IF NOT EXISTS home_country VARCHAR(50) DEFAULT 'United States',
      ADD COLUMN IF NOT EXISTS home_latitude DECIMAL(10, 8),
      ADD COLUMN IF NOT EXISTS home_longitude DECIMAL(11, 8)
    `);
    
    console.log('Home address migration completed successfully');
    res.json({ 
      success: true, 
      message: 'Home address fields added successfully' 
    });
    
  } catch (error) {
    console.error('Home address migration error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Migration failed', 
      details: error.message 
    });
  }
});

// Geocode existing trips for weather integration
router.post('/geocode-trips', async (req, res) => {
  try {
    console.log('Starting trip geocoding migration...');
    
    // Get trips without coordinates
    const tripsResult = await pool.query(`
      SELECT id, location FROM camping_trips 
      WHERE latitude IS NULL OR longitude IS NULL
    `);
    
    let updated = 0;
    let failed = 0;
    
    for (const trip of tripsResult.rows) {
      try {
        // Use Nominatim geocoding service (free) with proper headers
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(trip.location)}&limit=1`, {
          headers: {
            'User-Agent': 'GoTogether-App/1.0 (camping-app)'
          }
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (data && data.length > 0) {
          const lat = parseFloat(data[0].lat);
          const lon = parseFloat(data[0].lon);
          
          await pool.query(`
            UPDATE camping_trips 
            SET latitude = $1, longitude = $2 
            WHERE id = $3
          `, [lat, lon, trip.id]);
          
          updated++;
          console.log(`Geocoded trip ${trip.id}: ${trip.location} -> ${lat}, ${lon}`);
        } else {
          failed++;
          console.log(`Failed to geocode trip ${trip.id}: ${trip.location}`);
        }
        
        // Rate limiting - wait 1 second between requests
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        failed++;
        console.error(`Error geocoding trip ${trip.id}:`, error.message);
      }
    }
    
    res.json({ 
      success: true, 
      message: `Geocoding completed: ${updated} updated, ${failed} failed`,
      details: { updated, failed, total: tripsResult.rows.length }
    });
    
  } catch (error) {
    console.error('Migration failed:', error);
    res.status(500).json({ success: false, error: 'Migration failed', details: error.message });
  }
});

// Fix coordinates migration for production
router.post('/fix-coordinates', async (req, res) => {
  try {
    console.log('Starting coordinates migration...');
    
    // Add latitude and longitude columns if they don't exist
    await pool.query(`
      DO $$ 
      BEGIN
          -- Add latitude column
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                         WHERE table_name = 'camping_trips' AND column_name = 'latitude') THEN
              ALTER TABLE camping_trips ADD COLUMN latitude DECIMAL(10, 8);
              RAISE NOTICE 'Added latitude column';
          ELSE
              RAISE NOTICE 'Latitude column already exists';
          END IF;
          
          -- Add longitude column  
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                         WHERE table_name = 'camping_trips' AND column_name = 'longitude') THEN
              ALTER TABLE camping_trips ADD COLUMN longitude DECIMAL(11, 8);
              RAISE NOTICE 'Added longitude column';
          ELSE
              RAISE NOTICE 'Longitude column already exists';
          END IF;
      END $$;
    `);

    // Add index for location-based queries
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_camping_trips_location ON camping_trips(latitude, longitude);
    `);
    
    console.log('Coordinates migration completed successfully');
    res.json({ 
      success: true, 
      message: 'Coordinates migration completed successfully' 
    });
    
  } catch (error) {
    console.error('Coordinates migration error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Coordinates migration failed', 
      details: error.message 
    });
  }
});

// Simple GET route for browser access to fix coordinates
router.get('/fix-coordinates-now', async (req, res) => {
  try {
    console.log('Starting coordinates migration via GET...');
    
    // Add latitude and longitude columns if they don't exist
    await pool.query(`
      DO $$ 
      BEGIN
          -- Add latitude column
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                         WHERE table_name = 'camping_trips' AND column_name = 'latitude') THEN
              ALTER TABLE camping_trips ADD COLUMN latitude DECIMAL(10, 8);
              RAISE NOTICE 'Added latitude column';
          ELSE
              RAISE NOTICE 'Latitude column already exists';
          END IF;
          
          -- Add longitude column  
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                         WHERE table_name = 'camping_trips' AND column_name = 'longitude') THEN
              ALTER TABLE camping_trips ADD COLUMN longitude DECIMAL(11, 8);
              RAISE NOTICE 'Added longitude column';
          ELSE
              RAISE NOTICE 'Longitude column already exists';
          END IF;
      END $$;
    `);

    // Add index for location-based queries
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_camping_trips_location ON camping_trips(latitude, longitude);
    `);
    
    console.log('Coordinates migration completed successfully');
    res.send(`
      <h1>✅ Database Fix Completed!</h1>
      <p>Successfully added latitude and longitude columns to camping_trips table.</p>
      <p>Trip creation should now work properly.</p>
      <a href="https://gotogether-m2g9.onrender.com">← Back to GoTogether</a>
    `);
    
  } catch (error) {
    console.error('Coordinates migration error:', error);
    res.status(500).send(`
      <h1>❌ Database Fix Failed</h1>
      <p>Error: ${error.message}</p>
      <p>Check server logs for details.</p>
    `);
  }
});

module.exports = router;
