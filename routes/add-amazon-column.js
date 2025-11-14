const express = require('express');
const pool = require('../database/db');

const router = express.Router();

// Add amazon_link column to trip_shopping_items
router.get('/fix', async (req, res) => {
  try {
    // Add column if it doesn't exist
    await pool.query(`
      ALTER TABLE trip_shopping_items 
      ADD COLUMN IF NOT EXISTS amazon_link TEXT
    `);

    res.json({
      success: true,
      message: 'Added amazon_link column to shopping items table'
    });
  } catch (error) {
    console.error('Error adding column:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
