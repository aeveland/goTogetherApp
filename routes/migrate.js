const express = require('express');
const pool = require('../database/db');

const router = express.Router();

// Simple migration to add profile fields
router.post('/add-profile-fields', async (req, res) => {
  try {
    console.log('Starting profile fields migration...');
    
    // Add profile columns to users table
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS bio TEXT,
      ADD COLUMN IF NOT EXISTS camper_type VARCHAR(20),
      ADD COLUMN IF NOT EXISTS group_size INTEGER DEFAULT 1,
      ADD COLUMN IF NOT EXISTS dietary_restrictions VARCHAR(50),
      ADD COLUMN IF NOT EXISTS phone VARCHAR(20)
    `);
    
    console.log('Added profile columns');
    
    // Add constraints
    await pool.query(`
      DO $$ 
      BEGIN
          -- Add check constraint for camper_type if it doesn't exist
          IF NOT EXISTS (
              SELECT 1 FROM information_schema.check_constraints 
              WHERE constraint_name = 'users_camper_type_check'
          ) THEN
              ALTER TABLE users ADD CONSTRAINT users_camper_type_check 
              CHECK (camper_type IN ('tent', 'trailer', 'rv', 'van', 'fifth_wheel'));
          END IF;
          
          -- Add check constraint for group_size if it doesn't exist
          IF NOT EXISTS (
              SELECT 1 FROM information_schema.check_constraints 
              WHERE constraint_name = 'users_group_size_check'
          ) THEN
              ALTER TABLE users ADD CONSTRAINT users_group_size_check 
              CHECK (group_size >= 1 AND group_size <= 20);
          END IF;
      END $$;
    `);
    
    console.log('Added constraints');
    
    // Set default group_size for existing users
    await pool.query(`UPDATE users SET group_size = 1 WHERE group_size IS NULL`);
    
    console.log('Updated existing users');
    
    res.json({
      success: true,
      message: 'Profile fields migration completed successfully!',
      details: [
        'Added bio column',
        'Added camper_type column with constraints',
        'Added group_size column with default value 1',
        'Added dietary_restrictions column',
        'Added phone column',
        'Updated existing users with default group_size'
      ]
    });
    
  } catch (error) {
    console.error('Migration error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Migration failed',
      details: error.message 
    });
  }
});

// Check if migration is needed
router.get('/check-profile-fields', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name IN ('bio', 'camper_type', 'group_size', 'dietary_restrictions', 'phone')
    `);
    
    const existingColumns = result.rows.map(row => row.column_name);
    const requiredColumns = ['bio', 'camper_type', 'group_size', 'dietary_restrictions', 'phone'];
    const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col));
    
    res.json({
      migration_needed: missingColumns.length > 0,
      existing_columns: existingColumns,
      missing_columns: missingColumns,
      message: missingColumns.length > 0 ? 'Migration needed' : 'All profile fields exist'
    });
    
  } catch (error) {
    console.error('Check error:', error);
    res.status(500).json({ 
      error: 'Failed to check migration status',
      details: error.message 
    });
  }
});

module.exports = router;
