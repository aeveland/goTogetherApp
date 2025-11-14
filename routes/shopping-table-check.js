const express = require('express');
const pool = require('../database/db');

const router = express.Router();

// Check and fix shopping items table
router.get('/check', async (req, res) => {
  try {
    // Get current table structure
    const columnsResult = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'trip_shopping_items'
      ORDER BY ordinal_position
    `);

    const columns = columnsResult.rows.map(r => r.column_name);
    const missingColumns = [];

    // Check for required columns
    const requiredColumns = {
      'id': 'SERIAL PRIMARY KEY',
      'trip_id': 'INTEGER NOT NULL',
      'item_name': 'VARCHAR(255) NOT NULL',
      'description': 'TEXT',
      'category': 'VARCHAR(100)',
      'quantity': 'INTEGER DEFAULT 1',
      'estimated_cost': 'DECIMAL(10,2)',
      'assigned_to': 'VARCHAR(100) DEFAULT \'anyone\'',
      'priority': 'VARCHAR(20) DEFAULT \'medium\'',
      'notes': 'TEXT',
      'is_purchased': 'BOOLEAN DEFAULT FALSE',
      'purchased_by': 'INTEGER',
      'purchased_at': 'TIMESTAMP',
      'created_by': 'INTEGER',
      'created_at': 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP',
      'updated_at': 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP'
    };

    // Check which columns are missing
    for (const [colName, colType] of Object.entries(requiredColumns)) {
      if (!columns.includes(colName)) {
        missingColumns.push({ name: colName, type: colType });
      }
    }

    res.json({
      success: true,
      tableExists: columnsResult.rows.length > 0,
      currentColumns: columns,
      missingColumns: missingColumns,
      message: missingColumns.length === 0 
        ? 'All columns present' 
        : `Missing ${missingColumns.length} columns: ${missingColumns.map(c => c.name).join(', ')}`
    });
  } catch (error) {
    console.error('Error checking shopping table:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Fix missing columns
router.get('/fix', async (req, res) => {
  try {
    const results = [];

    // Ensure all columns exist
    const alterQueries = [
      `ALTER TABLE trip_shopping_items ADD COLUMN IF NOT EXISTS description TEXT`,
      `ALTER TABLE trip_shopping_items ADD COLUMN IF NOT EXISTS category VARCHAR(100) DEFAULT 'General'`,
      `ALTER TABLE trip_shopping_items ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 1`,
      `ALTER TABLE trip_shopping_items ADD COLUMN IF NOT EXISTS estimated_cost DECIMAL(10,2)`,
      `ALTER TABLE trip_shopping_items ADD COLUMN IF NOT EXISTS assigned_to VARCHAR(100) DEFAULT 'anyone'`,
      `ALTER TABLE trip_shopping_items ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'medium'`,
      `ALTER TABLE trip_shopping_items ADD COLUMN IF NOT EXISTS notes TEXT`,
      `ALTER TABLE trip_shopping_items ADD COLUMN IF NOT EXISTS is_purchased BOOLEAN DEFAULT FALSE`,
      `ALTER TABLE trip_shopping_items ADD COLUMN IF NOT EXISTS purchased_by INTEGER REFERENCES users(id)`,
      `ALTER TABLE trip_shopping_items ADD COLUMN IF NOT EXISTS purchased_at TIMESTAMP`,
      `ALTER TABLE trip_shopping_items ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id)`,
      `ALTER TABLE trip_shopping_items ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`,
      `ALTER TABLE trip_shopping_items ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`
    ];

    for (const query of alterQueries) {
      try {
        await pool.query(query);
        results.push(`✅ ${query.substring(0, 80)}...`);
      } catch (error) {
        results.push(`❌ ${error.message}`);
      }
    }

    res.json({
      success: true,
      message: 'Shopping items table updated',
      results: results
    });
  } catch (error) {
    console.error('Error fixing shopping table:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
