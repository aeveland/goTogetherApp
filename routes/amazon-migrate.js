const express = require('express');
const pool = require('../database/db');

const router = express.Router();

// Create amazon_suggestions table
router.get('/setup', async (req, res) => {
  try {
    // Check if amazon_suggestions table already exists
    const checkResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'amazon_suggestions'
    `);

    if (checkResult.rows.length > 0) {
      return res.json({
        success: true,
        message: 'Amazon suggestions table already exists. No migration needed.',
        alreadyExists: true
      });
    }

    // Check if shopping_list table exists
    const shoppingListCheck = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'shopping_list'
    `);

    if (shoppingListCheck.rows.length === 0) {
      // Create shopping_list table first
      await pool.query(`
        CREATE TABLE shopping_list (
          id SERIAL PRIMARY KEY,
          trip_id INTEGER NOT NULL REFERENCES camping_trips(id) ON DELETE CASCADE,
          item_name VARCHAR(200) NOT NULL,
          quantity INTEGER DEFAULT 1,
          category VARCHAR(50),
          priority VARCHAR(20) DEFAULT 'medium',
          assigned_to VARCHAR(100) DEFAULT 'anyone',
          description TEXT,
          estimated_cost DECIMAL(10,2),
          is_purchased BOOLEAN DEFAULT FALSE,
          purchased_by INTEGER REFERENCES users(id),
          purchased_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await pool.query(`
        CREATE INDEX idx_shopping_list_trip ON shopping_list(trip_id)
      `);
    }

    // Now create amazon_suggestions table
    await pool.query(`
      CREATE TABLE amazon_suggestions (
        id SERIAL PRIMARY KEY,
        shopping_item_id INTEGER NOT NULL REFERENCES shopping_list(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        amazon_url TEXT NOT NULL,
        product_title TEXT,
        product_image_url TEXT,
        product_price TEXT,
        asin VARCHAR(20),
        suggested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        vote_count INTEGER DEFAULT 0,
        UNIQUE(shopping_item_id, asin)
      )
    `);

    // Create indexes
    await pool.query(`
      CREATE INDEX idx_amazon_suggestions_shopping_item ON amazon_suggestions(shopping_item_id)
    `);
    
    await pool.query(`
      CREATE INDEX idx_amazon_suggestions_user ON amazon_suggestions(user_id)
    `);

    res.json({
      success: true,
      message: 'Amazon suggestions table created successfully! Ready to accept product suggestions.',
      tableCreated: true,
      shoppingListCreated: shoppingListCheck.rows.length === 0
    });
  } catch (error) {
    console.error('Migration error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      details: 'Failed to create amazon_suggestions table',
      hint: 'Check that camping_trips and users tables exist first'
    });
  }
});

module.exports = router;
