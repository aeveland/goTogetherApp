const express = require('express');
const pool = require('../database/db');

const router = express.Router();

// Simple browser-accessible database fix
router.get('/', async (req, res) => {
  try {
    let results = [];
    let errors = [];

    // Step 1: Add coordinates to trips table
    try {
      await pool.query(`
        ALTER TABLE camping_trips 
        ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
        ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8)
      `);
      results.push('✅ Added latitude/longitude columns to camping_trips');
    } catch (error) {
      errors.push(`❌ Coordinates error: ${error.message}`);
    }

    // Step 2: Add profile fields to users
    try {
      await pool.query(`
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS bio TEXT,
        ADD COLUMN IF NOT EXISTS camper_type VARCHAR(20),
        ADD COLUMN IF NOT EXISTS group_size INTEGER DEFAULT 1,
        ADD COLUMN IF NOT EXISTS dietary_restrictions VARCHAR(50),
        ADD COLUMN IF NOT EXISTS phone VARCHAR(20)
      `);
      results.push('✅ Added profile fields to users table');
    } catch (error) {
      errors.push(`❌ Profile fields error: ${error.message}`);
    }

    // Step 3: Create task tables
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
      errors.push(`❌ Tasks table error: ${error.message}`);
    }

    // Step 4: Create shopping tables
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

    // Step 5: Add indexes
    try {
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_camping_trips_location ON camping_trips(latitude, longitude);
        CREATE INDEX IF NOT EXISTS idx_trip_tasks_trip_id ON trip_tasks(trip_id);
        CREATE INDEX IF NOT EXISTS idx_shopping_items_trip_id ON trip_shopping_items(trip_id);
      `);
      results.push('✅ Added database indexes');
    } catch (error) {
      errors.push(`❌ Indexes error: ${error.message}`);
    }

    // Generate HTML response
    const successCount = results.length;
    const errorCount = errors.length;
    const status = errorCount === 0 ? 'SUCCESS' : 'PARTIAL';

    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>GoTogether Database Fix</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; margin: 40px; background: #f5f5f7; }
          .container { max-width: 800px; margin: 0 auto; background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
          .status { padding: 20px; border-radius: 8px; margin: 20px 0; font-weight: 500; }
          .success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
          .error { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
          .partial { background: #fff3cd; color: #856404; border: 1px solid #ffeaa7; }
          .result-list { margin: 20px 0; }
          .result-list li { margin: 8px 0; padding: 8px; background: #f8f9fa; border-radius: 4px; }
          h1 { color: #1d1d1f; margin-bottom: 10px; }
          .summary { font-size: 18px; margin: 20px 0; }
          button { background: #007AFF; color: white; border: none; padding: 12px 24px; border-radius: 6px; cursor: pointer; margin: 10px 5px; font-size: 16px; }
          button:hover { background: #0056b3; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🏕️ GoTogether Database Fix Results</h1>
          
          <div class="status ${status.toLowerCase()}">
            <h2>${status === 'SUCCESS' ? '✅ All Fixes Applied Successfully!' : status === 'PARTIAL' ? '⚠️ Partial Fix Completed' : '❌ Fix Failed'}</h2>
            <p class="summary">Completed ${successCount} operations with ${errorCount} errors</p>
          </div>

          ${results.length > 0 ? `
            <h3>✅ Successful Operations:</h3>
            <ul class="result-list">
              ${results.map(result => `<li>${result}</li>`).join('')}
            </ul>
          ` : ''}

          ${errors.length > 0 ? `
            <h3>❌ Errors:</h3>
            <ul class="result-list">
              ${errors.map(error => `<li style="background: #f8d7da; color: #721c24;">${error}</li>`).join('')}
            </ul>
          ` : ''}

          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e5e7;">
            <h3>🎯 Next Steps:</h3>
            <p>1. <strong>Test trip creation</strong> - Try creating a new camping trip</p>
            <p>2. <strong>Check weather</strong> - Weather should load if API key is configured</p>
            <p>3. <strong>Verify tasks</strong> - Task management should now work</p>
            
            <button onclick="window.location.href='https://gotogether-m2g8.onrender.com'">
              🏕️ Go to GoTogether App
            </button>
            
            <button onclick="window.location.reload()">
              🔄 Run Fix Again
            </button>
          </div>
        </div>
      </body>
      </html>
    `);

  } catch (error) {
    console.error('Database fix error:', error);
    res.status(500).send(`
      <h1>❌ Database Fix Failed</h1>
      <p>Error: ${error.message}</p>
      <p>Check server logs for details.</p>
    `);
  }
});

module.exports = router;
