const express = require('express');
const pool = require('../database/db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get onboarding status for current user
router.get('/status', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const result = await pool.query(`
      SELECT 
        onboarding_completed,
        onboarding_step,
        onboarding_skipped
      FROM users
      WHERE id = $1
    `, [userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // If columns don't exist yet, return defaults
    const status = result.rows[0];
    res.json({
      completed: status.onboarding_completed || false,
      currentStep: status.onboarding_step || 0,
      skipped: status.onboarding_skipped || false
    });
  } catch (error) {
    console.error('Error getting onboarding status:', error);
    // If columns don't exist, return defaults
    if (error.code === '42703') {
      return res.json({
        completed: false,
        currentStep: 0,
        skipped: false
      });
    }
    res.status(500).json({ error: 'Failed to get onboarding status' });
  }
});

// Update onboarding progress
router.patch('/progress', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { step, completed, skipped } = req.body;

    const updates = [];
    const values = [userId];
    let paramCount = 2;

    if (typeof step === 'number') {
      updates.push(`onboarding_step = $${paramCount}`);
      values.push(step);
      paramCount++;
    }

    if (typeof completed === 'boolean') {
      updates.push(`onboarding_completed = $${paramCount}`);
      values.push(completed);
      paramCount++;
    }

    if (typeof skipped === 'boolean') {
      updates.push(`onboarding_skipped = $${paramCount}`);
      values.push(skipped);
      paramCount++;
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    await pool.query(`
      UPDATE users 
      SET ${updates.join(', ')}
      WHERE id = $1
    `, values);

    res.json({ message: 'Onboarding progress updated' });
  } catch (error) {
    console.error('Error updating onboarding progress:', error);
    res.status(500).json({ error: 'Failed to update onboarding progress' });
  }
});

// Skip onboarding
router.post('/skip', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    await pool.query(`
      UPDATE users 
      SET onboarding_skipped = true,
          onboarding_completed = true
      WHERE id = $1
    `, [userId]);

    res.json({ message: 'Onboarding skipped' });
  } catch (error) {
    console.error('Error skipping onboarding:', error);
    res.status(500).json({ error: 'Failed to skip onboarding' });
  }
});

// Complete onboarding
router.post('/complete', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    await pool.query(`
      UPDATE users 
      SET onboarding_completed = true,
          onboarding_step = 5
      WHERE id = $1
    `, [userId]);

    res.json({ message: 'Onboarding completed!' });
  } catch (error) {
    console.error('Error completing onboarding:', error);
    res.status(500).json({ error: 'Failed to complete onboarding' });
  }
});

module.exports = router;
