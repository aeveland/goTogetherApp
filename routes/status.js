const express = require('express');
const pool = require('../database/db');

const router = express.Router();

// Database status endpoint
router.get('/db', async (req, res) => {
  try {
    // Check if tables exist
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    const tables = result.rows.map(row => row.table_name);
    
    // Check if camping tables exist
    const hasCampingTables = tables.includes('camping_trips') && tables.includes('trip_participants');
    
    res.json({
      status: 'connected',
      tables: tables,
      hasCampingTables: hasCampingTables,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Database status error:', error);
    res.status(500).json({
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// App version endpoint
router.get('/version', (req, res) => {
  res.json({
    version: '2.0.0',
    features: ['authentication', 'camping_trips'],
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
