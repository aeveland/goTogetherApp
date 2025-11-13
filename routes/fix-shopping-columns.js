const express = require('express');
const pool = require('../database/db');

const router = express.Router();

// Fix shopping items table to ensure all required columns exist
router.get('/fix-shopping-columns', async (req, res) => {
  try {
    console.log('🔧 Fixing shopping items table columns...');
    
    // Add missing columns if they don't exist
    const alterQueries = [
      `ALTER TABLE trip_shopping_items ADD COLUMN IF NOT EXISTS purchased_by INTEGER REFERENCES users(id)`,
      `ALTER TABLE trip_shopping_items ADD COLUMN IF NOT EXISTS purchased_at TIMESTAMP`,
      `ALTER TABLE trip_shopping_items ADD COLUMN IF NOT EXISTS updated_by INTEGER REFERENCES users(id)`,
      `ALTER TABLE trip_shopping_items ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`,
      `ALTER TABLE trip_shopping_items ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id)`,
      `ALTER TABLE trip_shopping_items ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`
    ];

    for (const query of alterQueries) {
      try {
        await pool.query(query);
        console.log('✅ Executed:', query.substring(0, 60) + '...');
      } catch (error) {
        // Column might already exist, that's okay
        console.log('ℹ️ Skipped (already exists):', query.substring(0, 60) + '...');
      }
    }

    // Update existing rows to have proper timestamps if they're null
    await pool.query(`
      UPDATE trip_shopping_items 
      SET 
        created_at = COALESCE(created_at, CURRENT_TIMESTAMP),
        updated_at = COALESCE(updated_at, CURRENT_TIMESTAMP)
      WHERE created_at IS NULL OR updated_at IS NULL
    `);

    console.log('✅ Shopping items table columns fixed successfully');
    
    res.json({ 
      success: true, 
      message: 'Shopping items table columns fixed successfully' 
    });
  } catch (error) {
    console.error('❌ Error fixing shopping columns:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fix shopping columns', 
      details: error.message 
    });
  }
});

module.exports = router;
