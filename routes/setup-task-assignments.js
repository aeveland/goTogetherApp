const express = require('express');
const pool = require('../database/db');

const router = express.Router();

// Create task_assignments table
router.get('/fix', async (req, res) => {
  try {
    // Create assignments table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS task_assignments (
        id SERIAL PRIMARY KEY,
        task_id INTEGER NOT NULL REFERENCES trip_tasks(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        is_completed BOOLEAN DEFAULT FALSE,
        completed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(task_id, user_id)
      )
    `);

    // Create indexes for faster queries
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_task_assignments_task 
      ON task_assignments(task_id)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_task_assignments_user 
      ON task_assignments(user_id)
    `);

    res.json({
      success: true,
      message: 'Task assignments table created successfully!'
    });
  } catch (error) {
    console.error('Error creating task assignments table:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
