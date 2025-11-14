const express = require('express');
const pool = require('../database/db');

const router = express.Router();

// Create shopping_item_assignments table
router.get('/fix', async (req, res) => {
  try {
    // Create assignments table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS shopping_item_assignments (
        id SERIAL PRIMARY KEY,
        shopping_item_id INTEGER NOT NULL REFERENCES trip_shopping_items(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        is_completed BOOLEAN DEFAULT FALSE,
        completed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(shopping_item_id, user_id)
      )
    `);

    // Create index for faster queries
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_shopping_assignments_item 
      ON shopping_item_assignments(shopping_item_id)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_shopping_assignments_user 
      ON shopping_item_assignments(user_id)
    `);

    res.json({
      success: true,
      message: 'Shopping item assignments table created successfully!'
    });
  } catch (error) {
    console.error('Error creating assignments table:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
