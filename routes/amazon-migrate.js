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

    // If table exists with wrong reference, drop and recreate
    if (checkResult.rows.length > 0) {
      try {
        await pool.query(`DROP TABLE IF EXISTS amazon_suggestions CASCADE`);
      } catch (dropError) {
        console.log('Note: Table did not exist or was already dropped');
      }
    }

    // Now create amazon_suggestions table (references trip_shopping_items)
    await pool.query(`
      CREATE TABLE amazon_suggestions (
        id SERIAL PRIMARY KEY,
        shopping_item_id INTEGER NOT NULL REFERENCES trip_shopping_items(id) ON DELETE CASCADE,
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
      tableCreated: true
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
