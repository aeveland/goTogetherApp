const express = require('express');
const pool = require('../database/db');
const fs = require('fs');
const path = require('path');

const router = express.Router();

// Comprehensive database health check
router.get('/database', async (req, res) => {
  try {
    const healthReport = {
      timestamp: new Date().toISOString(),
      database_connection: false,
      tables: {},
      columns: {},
      issues: [],
      recommendations: []
    };

    // Test database connection
    try {
      await pool.query('SELECT NOW()');
      healthReport.database_connection = true;
    } catch (error) {
      healthReport.issues.push(`Database connection failed: ${error.message}`);
      return res.status(500).json(healthReport);
    }

    // Check required tables
    const requiredTables = [
      'users',
      'camping_trips', 
      'trip_participants',
      'trip_tasks',
      'trip_shopping_items',
      'shopping_categories'
    ];

    for (const tableName of requiredTables) {
      try {
        const result = await pool.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = $1
          )
        `, [tableName]);
        
        healthReport.tables[tableName] = result.rows[0].exists;
        
        if (!result.rows[0].exists) {
          healthReport.issues.push(`Missing table: ${tableName}`);
          healthReport.recommendations.push(`Run migration to create ${tableName} table`);
        }
      } catch (error) {
        healthReport.tables[tableName] = false;
        healthReport.issues.push(`Error checking table ${tableName}: ${error.message}`);
      }
    }

    // Check required columns for camping_trips
    const requiredColumns = {
      'camping_trips': ['id', 'title', 'location', 'start_date', 'end_date', 'organizer_id', 'latitude', 'longitude', 'trip_code', 'is_public'],
      'users': ['id', 'email', 'first_name', 'last_name', 'bio', 'camper_type', 'group_size', 'dietary_restrictions', 'phone'],
      'trip_tasks': ['id', 'trip_id', 'title', 'description', 'assigned_to', 'due_date', 'is_completed'],
      'trip_shopping_items': ['id', 'trip_id', 'item_name', 'category', 'quantity', 'assigned_to', 'is_purchased']
    };

    for (const [tableName, columns] of Object.entries(requiredColumns)) {
      if (healthReport.tables[tableName]) {
        healthReport.columns[tableName] = {};
        
        for (const columnName of columns) {
          try {
            const result = await pool.query(`
              SELECT EXISTS (
                SELECT FROM information_schema.columns 
                WHERE table_name = $1 AND column_name = $2
              )
            `, [tableName, columnName]);
            
            healthReport.columns[tableName][columnName] = result.rows[0].exists;
            
            if (!result.rows[0].exists) {
              healthReport.issues.push(`Missing column: ${tableName}.${columnName}`);
              healthReport.recommendations.push(`Add ${columnName} column to ${tableName} table`);
            }
          } catch (error) {
            healthReport.columns[tableName][columnName] = false;
            healthReport.issues.push(`Error checking column ${tableName}.${columnName}: ${error.message}`);
          }
        }
      }
    }

    // Check for data integrity
    if (healthReport.tables['camping_trips']) {
      try {
        const tripCount = await pool.query('SELECT COUNT(*) FROM camping_trips');
        healthReport.trip_count = parseInt(tripCount.rows[0].count);
      } catch (error) {
        healthReport.issues.push(`Error counting trips: ${error.message}`);
      }
    }

    if (healthReport.tables['users']) {
      try {
        const userCount = await pool.query('SELECT COUNT(*) FROM users');
        healthReport.user_count = parseInt(userCount.rows[0].count);
      } catch (error) {
        healthReport.issues.push(`Error counting users: ${error.message}`);
      }
    }

    // Overall health status
    healthReport.status = healthReport.issues.length === 0 ? 'HEALTHY' : 'NEEDS_MIGRATION';
    healthReport.issues_count = healthReport.issues.length;

    res.json(healthReport);

  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({
      status: 'ERROR',
      error: 'Health check failed',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Auto-fix database issues
router.post('/fix-all', async (req, res) => {
  try {
    const fixReport = {
      timestamp: new Date().toISOString(),
      steps: [],
      errors: [],
      success: false
    };

    // Step 1: Create missing tables
    fixReport.steps.push('Creating missing tables...');
    
    try {
      // Read and execute the main schema
      const schemaPath = path.join(__dirname, '..', 'database', 'camping_schema.sql');
      if (fs.existsSync(schemaPath)) {
        const schema = fs.readFileSync(schemaPath, 'utf8');
        await pool.query(schema);
        fixReport.steps.push('✅ Main schema applied');
      }
    } catch (error) {
      fixReport.errors.push(`Schema creation error: ${error.message}`);
    }

    // Step 2: Add profile fields
    fixReport.steps.push('Adding user profile fields...');
    
    try {
      await pool.query(`
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS bio TEXT,
        ADD COLUMN IF NOT EXISTS camper_type VARCHAR(20),
        ADD COLUMN IF NOT EXISTS group_size INTEGER DEFAULT 1,
        ADD COLUMN IF NOT EXISTS dietary_restrictions VARCHAR(50),
        ADD COLUMN IF NOT EXISTS phone VARCHAR(20),
        ADD COLUMN IF NOT EXISTS home_address TEXT,
        ADD COLUMN IF NOT EXISTS home_city VARCHAR(100),
        ADD COLUMN IF NOT EXISTS home_state VARCHAR(50),
        ADD COLUMN IF NOT EXISTS home_zip VARCHAR(20),
        ADD COLUMN IF NOT EXISTS home_country VARCHAR(50) DEFAULT 'United States',
        ADD COLUMN IF NOT EXISTS home_latitude DECIMAL(10, 8),
        ADD COLUMN IF NOT EXISTS home_longitude DECIMAL(11, 8)
      `);
      fixReport.steps.push('✅ User profile fields added');
    } catch (error) {
      fixReport.errors.push(`Profile fields error: ${error.message}`);
    }

    // Step 3: Add coordinates to trips
    fixReport.steps.push('Adding coordinates to trips...');
    
    try {
      await pool.query(`
        ALTER TABLE camping_trips 
        ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
        ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8)
      `);
      fixReport.steps.push('✅ Trip coordinates added');
    } catch (error) {
      fixReport.errors.push(`Coordinates error: ${error.message}`);
    }

    // Step 4: Create task tables
    fixReport.steps.push('Creating task management tables...');
    
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
          priority VARCHAR(20) DEFAULT 'medium',
          CONSTRAINT valid_priority CHECK (priority IN ('high', 'medium', 'low')),
          CONSTRAINT valid_assignment CHECK (
            assigned_to IN ('everyone', 'anyone') OR 
            assigned_to ~ '^[0-9]+$'
          )
        )
      `);
      
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_trip_tasks_trip_id ON trip_tasks(trip_id);
        CREATE INDEX IF NOT EXISTS idx_trip_tasks_assigned_to ON trip_tasks(assigned_to);
        CREATE INDEX IF NOT EXISTS idx_trip_tasks_completed ON trip_tasks(is_completed);
      `);
      
      fixReport.steps.push('✅ Task tables created');
    } catch (error) {
      fixReport.errors.push(`Task tables error: ${error.message}`);
    }

    // Step 5: Create shopping tables
    fixReport.steps.push('Creating shopping tables...');
    
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
      
      fixReport.steps.push('✅ Shopping tables created');
    } catch (error) {
      fixReport.errors.push(`Shopping tables error: ${error.message}`);
    }

    // Step 6: Add indexes and constraints
    fixReport.steps.push('Adding indexes and constraints...');
    
    try {
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_camping_trips_location ON camping_trips(latitude, longitude);
        CREATE INDEX IF NOT EXISTS idx_camping_trips_start_date ON camping_trips(start_date);
        CREATE INDEX IF NOT EXISTS idx_camping_trips_organizer ON camping_trips(organizer_id);
        CREATE INDEX IF NOT EXISTS idx_trip_participants_trip ON trip_participants(trip_id);
        CREATE INDEX IF NOT EXISTS idx_trip_participants_user ON trip_participants(user_id);
        CREATE INDEX IF NOT EXISTS idx_shopping_items_trip_id ON trip_shopping_items(trip_id);
        CREATE INDEX IF NOT EXISTS idx_shopping_items_category ON trip_shopping_items(category);
      `);
      fixReport.steps.push('✅ Indexes created');
    } catch (error) {
      fixReport.errors.push(`Indexes error: ${error.message}`);
    }

    // Final status
    fixReport.success = fixReport.errors.length === 0;
    fixReport.status = fixReport.success ? 'ALL_FIXED' : 'PARTIAL_FIX';
    fixReport.summary = `Completed ${fixReport.steps.length} steps with ${fixReport.errors.length} errors`;

    res.json(fixReport);

  } catch (error) {
    console.error('Auto-fix error:', error);
    res.status(500).json({
      success: false,
      error: 'Auto-fix failed',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Simple browser-accessible health check
router.get('/', async (req, res) => {
  try {
    const healthCheck = await pool.query('SELECT NOW() as current_time, version() as db_version');
    
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>GoTogether Health Check</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; margin: 40px; }
          .status { padding: 20px; border-radius: 8px; margin: 20px 0; }
          .healthy { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
          .warning { background: #fff3cd; color: #856404; border: 1px solid #ffeaa7; }
          .error { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
          button { background: #007AFF; color: white; border: none; padding: 12px 24px; border-radius: 6px; cursor: pointer; margin: 10px 5px; }
          button:hover { background: #0056b3; }
          .danger { background: #dc3545; }
          .danger:hover { background: #c82333; }
        </style>
      </head>
      <body>
        <h1>🏕️ GoTogether Health Dashboard</h1>
        
        <div class="status healthy">
          <h3>✅ Database Connection: OK</h3>
          <p>Connected at: ${healthCheck.rows[0].current_time}</p>
          <p>Database: ${healthCheck.rows[0].db_version}</p>
        </div>

        <h3>🔧 Database Management</h3>
        <button onclick="window.location.href='/api/health/database'">📊 Full Health Check</button>
        <button onclick="runFix()" class="danger">🚨 Auto-Fix All Issues</button>
        
        <h3>📋 Individual Migrations</h3>
        <button onclick="window.location.href='/api/migrate/fix-coordinates'">📍 Fix Coordinates</button>
        <button onclick="window.location.href='/api/migrate/add-profile-fields'">👤 Add Profile Fields</button>
        <button onclick="window.location.href='/api/migrate/add-shopping-tables'">🛒 Add Shopping Tables</button>

        <div id="result"></div>

        <script>
          async function runFix() {
            if (!confirm('This will run all database migrations. Continue?')) return;
            
            document.getElementById('result').innerHTML = '<div class="status warning">🔄 Running auto-fix...</div>';
            
            try {
              const response = await fetch('/api/health/fix-all', { method: 'POST' });
              const data = await response.json();
              
              let html = '<div class="status ' + (data.success ? 'healthy' : 'error') + '">';
              html += '<h3>' + (data.success ? '✅ All Issues Fixed!' : '⚠️ Partial Fix Completed') + '</h3>';
              html += '<p>' + data.summary + '</p>';
              
              if (data.steps.length > 0) {
                html += '<h4>Steps Completed:</h4><ul>';
                data.steps.forEach(step => html += '<li>' + step + '</li>');
                html += '</ul>';
              }
              
              if (data.errors.length > 0) {
                html += '<h4>Errors:</h4><ul>';
                data.errors.forEach(error => html += '<li style="color: red;">' + error + '</li>');
                html += '</ul>';
              }
              
              html += '</div>';
              document.getElementById('result').innerHTML = html;
              
            } catch (error) {
              document.getElementById('result').innerHTML = 
                '<div class="status error"><h3>❌ Fix Failed</h3><p>' + error.message + '</p></div>';
            }
          }
        </script>
      </body>
      </html>
    `);
  } catch (error) {
    res.status(500).send(`
      <h1>❌ Database Connection Failed</h1>
      <p>Error: ${error.message}</p>
      <p>Check your DATABASE_URL environment variable.</p>
    `);
  }
});

module.exports = router;
