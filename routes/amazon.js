const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../database/db');
const { authenticateToken } = require('../middleware/auth');
const amazonService = require('../services/amazon');

const router = express.Router();

// Get Amazon suggestions for a shopping item
router.get('/suggestions/:shoppingItemId', authenticateToken, async (req, res) => {
  try {
    const { shoppingItemId } = req.params;

    const result = await pool.query(`
      SELECT 
        s.*,
        u.first_name,
        u.last_name
      FROM amazon_suggestions s
      JOIN users u ON s.user_id = u.id
      WHERE s.shopping_item_id = $1
      ORDER BY s.vote_count DESC, s.suggested_at DESC
    `, [shoppingItemId]);

    res.json({ suggestions: result.rows });
  } catch (error) {
    console.error('Error fetching Amazon suggestions:', error);
    res.status(500).json({ error: 'Failed to fetch suggestions' });
  }
});

// Add Amazon product suggestion
router.post('/suggest', authenticateToken, [
  body('shoppingItemId').isInt().withMessage('Valid shopping item ID required'),
  body('amazonUrl').trim().isLength({ min: 10 }).withMessage('Valid Amazon URL required'),
  body('productTitle').optional().trim().isLength({ max: 500 }).withMessage('Product title too long')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { shoppingItemId, amazonUrl, productTitle } = req.body;
    const userId = req.user.id;

    // Verify user has access to this shopping item
    const accessCheck = await pool.query(`
      SELECT tsi.trip_id
      FROM trip_shopping_items tsi
      JOIN camping_trips t ON tsi.trip_id = t.id
      LEFT JOIN trip_participants tp ON t.id = tp.trip_id AND tp.user_id = $1
      WHERE tsi.id = $2
      AND (t.organizer_id = $1 OR tp.user_id IS NOT NULL)
    `, [userId, shoppingItemId]);

    if (accessCheck.rows.length === 0) {
      return res.status(403).json({ error: 'You do not have access to this shopping item' });
    }

    // Parse and clean Amazon URL
    let productData;
    try {
      productData = amazonService.parseProductFromUrl(amazonUrl);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }

    // Add suggestion to database
    const result = await pool.query(`
      INSERT INTO amazon_suggestions 
      (shopping_item_id, user_id, amazon_url, asin, product_title)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (shopping_item_id, asin) 
      DO UPDATE SET 
        vote_count = amazon_suggestions.vote_count + 1,
        product_title = COALESCE(EXCLUDED.product_title, amazon_suggestions.product_title)
      RETURNING *
    `, [
      shoppingItemId,
      userId,
      productData.amazon_url,
      productData.asin,
      productTitle || null
    ]);

    res.json({
      message: 'Product suggestion added successfully',
      suggestion: result.rows[0]
    });
  } catch (error) {
    console.error('Error adding Amazon suggestion:', error);
    res.status(500).json({ error: 'Failed to add product suggestion' });
  }
});

// Vote for a product suggestion
router.post('/vote/:suggestionId', authenticateToken, async (req, res) => {
  try {
    const { suggestionId } = req.params;

    const result = await pool.query(`
      UPDATE amazon_suggestions
      SET vote_count = vote_count + 1
      WHERE id = $1
      RETURNING *
    `, [suggestionId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Suggestion not found' });
    }

    res.json({ suggestion: result.rows[0] });
  } catch (error) {
    console.error('Error voting for suggestion:', error);
    res.status(500).json({ error: 'Failed to vote' });
  }
});

// Delete a suggestion (only by creator or organizer)
router.delete('/suggestion/:suggestionId', authenticateToken, async (req, res) => {
  try {
    const { suggestionId } = req.params;
    const userId = req.user.id;

    // Check if user is creator or trip organizer
    const authCheck = await pool.query(`
      SELECT s.user_id, t.organizer_id
      FROM amazon_suggestions s
      JOIN trip_shopping_items tsi ON s.shopping_item_id = tsi.id
      JOIN camping_trips t ON tsi.trip_id = t.id
      WHERE s.id = $1
    `, [suggestionId]);

    if (authCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Suggestion not found' });
    }

    const { user_id, organizer_id } = authCheck.rows[0];
    if (user_id !== userId && organizer_id !== userId) {
      return res.status(403).json({ error: 'Not authorized to delete this suggestion' });
    }

    await pool.query('DELETE FROM amazon_suggestions WHERE id = $1', [suggestionId]);

    res.json({ message: 'Suggestion deleted successfully' });
  } catch (error) {
    console.error('Error deleting suggestion:', error);
    res.status(500).json({ error: 'Failed to delete suggestion' });
  }
});

module.exports = router;
