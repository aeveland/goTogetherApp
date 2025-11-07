const express = require('express');
const pool = require('../database/db');

const router = express.Router();

// Comprehensive database fix for all missing tables and columns
router.get('/', async (req, res) => {
  try {
    let results = [];
    let errors = [];

    // 1. Fix camping_trips table - add missing columns
    try {
      await pool.query(`
        ALTER TABLE camping_trips 
        ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
        ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8),
        ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE
      `);
      results.push('✅ Fixed camping_trips table (added latitude, longitude, is_active)');
    } catch (error) {
      errors.push(`❌ camping_trips error: ${error.message}`);
    }

    // 2. Create trip_tasks table
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS trip_tasks (
          id SERIAL PRIMARY KEY,
          trip_id INTEGER NOT NULL REFERENCES camping_trips(id) ON DELETE CASCADE,
          title VARCHAR(255) NOT NULL,
          description TEXT,
          assigned_to VARCHAR(50) DEFAULT 'anyone',
          due_date DATE,
          is_completed BOOLEAN DEFAULT FALSE,
          completed_by INTEGER REFERENCES users(id),
          completed_at TIMESTAMP,
          created_by INTEGER NOT NULL REFERENCES users(id),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          priority VARCHAR(20) DEFAULT 'medium'
        )
      `);
      results.push('✅ Created trip_tasks table');
    } catch (error) {
      errors.push(`❌ trip_tasks error: ${error.message}`);
    }

    // 3. Create trip_participants table if missing
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS trip_participants (
          id SERIAL PRIMARY KEY,
          trip_id INTEGER NOT NULL REFERENCES camping_trips(id) ON DELETE CASCADE,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          status VARCHAR(20) DEFAULT 'confirmed',
          UNIQUE(trip_id, user_id)
        )
      `);
      results.push('✅ Created trip_participants table');
    } catch (error) {
      errors.push(`❌ trip_participants error: ${error.message}`);
    }

    // 4. Create shopping tables
    try {
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
          priority VARCHAR(20) DEFAULT 'medium',
          notes TEXT
        )
      `);
      results.push('✅ Created shopping tables');
    } catch (error) {
      errors.push(`❌ Shopping tables error: ${error.message}`);
    }

    // 5. Add user profile fields
    try {
      await pool.query(`
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS bio TEXT,
        ADD COLUMN IF NOT EXISTS camper_type VARCHAR(20),
        ADD COLUMN IF NOT EXISTS group_size INTEGER DEFAULT 1,
        ADD COLUMN IF NOT EXISTS dietary_restrictions VARCHAR(50),
        ADD COLUMN IF NOT EXISTS phone VARCHAR(20)
      `);
      results.push('✅ Added user profile fields');
    } catch (error) {
      errors.push(`❌ User profile fields error: ${error.message}`);
    }

    // 6. Create indexes for performance
    try {
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_camping_trips_location ON camping_trips(latitude, longitude);
        CREATE INDEX IF NOT EXISTS idx_trip_tasks_trip_id ON trip_tasks(trip_id);
        CREATE INDEX IF NOT EXISTS idx_trip_tasks_assigned_to ON trip_tasks(assigned_to);
        CREATE INDEX IF NOT EXISTS idx_trip_participants_trip_id ON trip_participants(trip_id);
        CREATE INDEX IF NOT EXISTS idx_trip_participants_user_id ON trip_participants(user_id);
        CREATE INDEX IF NOT EXISTS idx_shopping_items_trip_id ON trip_shopping_items(trip_id);
      `);
      results.push('✅ Created performance indexes');
    } catch (error) {
      errors.push(`❌ Indexes error: ${error.message}`);
    }

    // 7. Insert default shopping categories
    try {
      await pool.query(`
        INSERT INTO shopping_categories (name, icon, color, sort_order, is_default) VALUES
        ('Food & Drinks', 'restaurant', '#FF6B35', 1, true),
        ('Camping Gear', 'outdoor_grill', '#4ECDC4', 2, true),
        ('Safety & First Aid', 'local_hospital', '#FF3B30', 3, true),
        ('Tools & Utilities', 'build', '#8E8E93', 4, true),
        ('Entertainment', 'sports_esports', '#AF52DE', 5, true),
        ('Personal Items', 'person', '#007AFF', 6, true),
        ('General', 'shopping_cart', '#34C759', 7, true)
        ON CONFLICT (name) DO NOTHING
      `);
      results.push('✅ Added default shopping categories');
    } catch (error) {
      errors.push(`❌ Shopping categories error: ${error.message}`);
    }

    // Generate HTML response
    const successCount = results.length;
    const errorCount = errors.length;
    const status = errorCount === 0 ? 'SUCCESS' : 'PARTIAL';

    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Complete Database Fix</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; margin: 40px; background: #f5f5f7; }
          .container { max-width: 900px; margin: 0 auto; background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
          .status { padding: 20px; border-radius: 8px; margin: 20px 0; font-weight: 500; }
          .success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
          .error { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
          .partial { background: #fff3cd; color: #856404; border: 1px solid #ffeaa7; }
          .result-list { margin: 20px 0; }
          .result-list li { margin: 8px 0; padding: 12px; background: #f8f9fa; border-radius: 6px; border-left: 4px solid #28a745; }
          .error-list li { border-left-color: #dc3545; background: #f8d7da; }
          h1 { color: #1d1d1f; margin-bottom: 10px; }
          .summary { font-size: 18px; margin: 20px 0; }
          button { background: #007AFF; color: white; border: none; padding: 12px 24px; border-radius: 6px; cursor: pointer; margin: 10px 5px; font-size: 16px; }
          button:hover { background: #0056b3; }
          .test-button { background: #34C759; }
          .test-button:hover { background: #28a745; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🔧 Complete Database Fix Results</h1>
          
          <div class="status ${status.toLowerCase()}">
            <h2>${status === 'SUCCESS' ? '✅ All Database Issues Fixed!' : status === 'PARTIAL' ? '⚠️ Partial Fix Completed' : '❌ Fix Failed'}</h2>
            <p class="summary">Completed ${successCount} operations with ${errorCount} errors</p>
          </div>

          ${results.length > 0 ? `
            <h3>✅ Successful Operations (${results.length}):</h3>
            <ul class="result-list">
              ${results.map(result => `<li>${result}</li>`).join('')}
            </ul>
          ` : ''}

          ${errors.length > 0 ? `
            <h3>❌ Errors (${errors.length}):</h3>
            <ul class="result-list error-list">
              ${errors.map(error => `<li>${error}</li>`).join('')}
            </ul>
          ` : ''}

          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e5e7;">
            <h3>🎯 What This Fixed:</h3>
            <ul>
              <li><strong>Trip Tasks:</strong> /api/tasks/my-tasks should now work</li>
              <li><strong>Trip Stats:</strong> /api/trips/my-stats should now work</li>
              <li><strong>Shopping Lists:</strong> Full shopping functionality enabled</li>
              <li><strong>User Profiles:</strong> Complete profile system</li>
              <li><strong>Performance:</strong> Database indexes for faster queries</li>
            </ul>
            
            <div style="margin-top: 20px;">
              <button onclick="window.location.href='https://gotogether-m2g9.onrender.com'">
                🏕️ Test GoTogether App
              </button>
              
              <button class="test-button" onclick="window.location.href='/api/test-system'">
                🧪 Run System Tests
              </button>
              
              <button onclick="window.location.reload()">
                🔄 Run Fix Again
              </button>
            </div>
          </div>
        </div>
      </body>
      </html>
    `);

  } catch (error) {
    console.error('Complete database fix error:', error);
    res.status(500).send(`
      <h1>❌ Complete Database Fix Failed</h1>
      <p>Error: ${error.message}</p>
      <p>Check server logs for details.</p>
    `);
  }
});

module.exports = router;
