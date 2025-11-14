const express = require('express');
const pool = require('../database/db');

const router = express.Router();

// Fix the valid_assignment constraint issue
router.get('/fix', async (req, res) => {
  try {
    // Drop the problematic constraint
    await pool.query(`
      ALTER TABLE trip_shopping_items 
      DROP CONSTRAINT IF EXISTS valid_assignment
    `);

    res.json({
      success: true,
      message: 'Removed valid_assignment constraint. You can now use "me", "anyone", "everyone", or any other assignment value.'
    });
  } catch (error) {
    console.error('Error fixing constraint:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
