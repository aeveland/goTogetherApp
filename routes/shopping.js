const express = require('express');
const { body, validationResult, param } = require('express-validator');
const pool = require('../database/db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get all shopping items for a specific trip
router.get('/trip/:tripId', authenticateToken, async (req, res) => {
  try {
    const tripId = req.params.tripId;
    const userId = req.user.id;

    // Verify user has access to this trip
    const tripAccess = await pool.query(`
      SELECT ct.id FROM camping_trips ct
      LEFT JOIN trip_participants tp ON ct.id = tp.trip_id
      WHERE ct.id = $1 AND (ct.organizer_id = $2 OR tp.user_id = $2)
    `, [tripId, userId]);

    if (tripAccess.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied to this trip' });
    }

    // Get shopping items with user details
    const result = await pool.query(`
      SELECT 
        tsi.*,
        creator.first_name as creator_first_name,
        creator.last_name as creator_last_name,
        purchaser.first_name as purchaser_first_name,
        purchaser.last_name as purchaser_last_name,
        sc.icon as category_icon,
        sc.color as category_color
      FROM trip_shopping_items tsi
      LEFT JOIN users creator ON tsi.created_by = creator.id
      LEFT JOIN users purchaser ON tsi.purchased_by = purchaser.id
      LEFT JOIN shopping_categories sc ON tsi.category = sc.name
      WHERE tsi.trip_id = $1
      ORDER BY 
        tsi.is_purchased ASC,
        CASE tsi.priority 
          WHEN 'high' THEN 1 
          WHEN 'medium' THEN 2 
          WHEN 'low' THEN 3 
        END,
        tsi.category,
        tsi.created_at DESC
    `, [tripId]);

    // Get dietary restrictions for trip participants
    const dietaryResult = await pool.query(`
      SELECT DISTINCT 
        u.first_name,
        u.last_name,
        u.dietary_restrictions
      FROM users u
      JOIN trip_participants tp ON u.id = tp.user_id
      WHERE tp.trip_id = $1 
        AND u.dietary_restrictions IS NOT NULL 
        AND u.dietary_restrictions != ''
      UNION
      SELECT DISTINCT 
        u.first_name,
        u.last_name,
        u.dietary_restrictions
      FROM users u
      JOIN camping_trips ct ON u.id = ct.organizer_id
      WHERE ct.id = $1 
        AND u.dietary_restrictions IS NOT NULL 
        AND u.dietary_restrictions != ''
      ORDER BY first_name, last_name
    `, [tripId]);

    res.json({ 
      items: result.rows,
      dietary_restrictions: dietaryResult.rows
    });
  } catch (error) {
    console.error('Error getting shopping items:', error);
    res.status(500).json({ error: 'Failed to get shopping items' });
  }
});

// Get shopping categories
router.get('/categories', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM shopping_categories 
      ORDER BY sort_order, name
    `);
    res.json({ categories: result.rows });
  } catch (error) {
    console.error('Error getting categories:', error);
    res.status(500).json({ error: 'Failed to get categories' });
  }
});

// Get shopping templates for trip type
router.get('/templates/:tripType', authenticateToken, async (req, res) => {
  try {
    const tripType = req.params.tripType;
    
    const result = await pool.query(`
      SELECT * FROM shopping_templates 
      WHERE trip_type = $1 OR trip_type IS NULL
      ORDER BY is_essential DESC, category, item_name
    `, [tripType]);
    
    res.json({ templates: result.rows });
  } catch (error) {
    console.error('Error getting shopping templates:', error);
    res.status(500).json({ error: 'Failed to get templates' });
  }
});

// Create new shopping item
router.post('/trip/:tripId', authenticateToken, [
  param('tripId').isInt().withMessage('Invalid trip ID'),
  body('item_name').trim().isLength({ min: 1, max: 255 }).withMessage('Item name is required (1-255 characters)'),
  body('description').optional().trim().isLength({ max: 1000 }).withMessage('Description too long'),
  body('category').optional().trim().isLength({ max: 100 }).withMessage('Category too long'),
  body('quantity').optional().isInt({ min: 1 }).withMessage('Quantity must be positive integer'),
  body('estimated_cost').optional().isFloat({ min: 0 }).withMessage('Cost must be positive number'),
  body('assigned_to').optional().trim(),
  body('priority').optional().isIn(['high', 'medium', 'low']).withMessage('Invalid priority'),
  body('notes').optional().trim().isLength({ max: 1000 }).withMessage('Notes too long')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const tripId = req.params.tripId;
    const userId = req.user.id;

    // Verify user has access to this trip
    const tripAccess = await pool.query(`
      SELECT ct.id FROM camping_trips ct
      LEFT JOIN trip_participants tp ON ct.id = tp.trip_id
      WHERE ct.id = $1 AND (ct.organizer_id = $2 OR tp.user_id = $2)
    `, [tripId, userId]);

    if (tripAccess.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied to this trip' });
    }

    const {
      item_name,
      description,
      category = 'General',
      quantity = 1,
      estimated_cost,
      assigned_to = 'anyone',
      priority = 'medium',
      notes
    } = req.body;

    const result = await pool.query(`
      INSERT INTO trip_shopping_items (
        trip_id, item_name, description, category, quantity, 
        estimated_cost, assigned_to, priority, notes, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [
      tripId, item_name, description, category, quantity,
      estimated_cost, assigned_to, priority, notes, userId
    ]);

    res.status(201).json({
      message: 'Shopping item added successfully',
      item: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating shopping item:', error);
    res.status(500).json({ error: 'Failed to create shopping item' });
  }
});

// Update shopping item
router.put('/:itemId', authenticateToken, [
  param('itemId').isInt().withMessage('Invalid item ID'),
  body('item_name').optional().trim().isLength({ min: 1, max: 255 }).withMessage('Item name must be 1-255 characters'),
  body('description').optional().trim().isLength({ max: 1000 }).withMessage('Description too long'),
  body('category').optional().trim().isLength({ max: 100 }).withMessage('Category too long'),
  body('quantity').optional().isInt({ min: 1 }).withMessage('Quantity must be positive integer'),
  body('estimated_cost').optional().isFloat({ min: 0 }).withMessage('Cost must be positive number'),
  body('assigned_to').optional().trim(),
  body('priority').optional().isIn(['high', 'medium', 'low']).withMessage('Invalid priority'),
  body('notes').optional().trim().isLength({ max: 1000 }).withMessage('Notes too long')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const itemId = req.params.itemId;
    const userId = req.user.id;

    // Verify user has access to this shopping item's trip
    const accessCheck = await pool.query(`
      SELECT tsi.trip_id FROM trip_shopping_items tsi
      JOIN camping_trips ct ON tsi.trip_id = ct.id
      LEFT JOIN trip_participants tp ON ct.id = tp.trip_id
      WHERE tsi.id = $1 AND (ct.organizer_id = $2 OR tp.user_id = $2)
    `, [itemId, userId]);

    if (accessCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const updateFields = [];
    const updateValues = [];
    let paramCount = 1;

    // Build dynamic update query
    Object.keys(req.body).forEach(key => {
      if (['item_name', 'description', 'category', 'quantity', 'estimated_cost', 'assigned_to', 'priority', 'notes'].includes(key)) {
        updateFields.push(`${key} = $${paramCount}`);
        updateValues.push(req.body[key]);
        paramCount++;
      }
    });

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    updateFields.push(`updated_by = $${paramCount}`);
    updateValues.push(userId);
    paramCount++;

    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);

    updateValues.push(itemId);

    const result = await pool.query(`
      UPDATE trip_shopping_items 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `, updateValues);

    res.json({
      message: 'Shopping item updated successfully',
      item: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating shopping item:', error);
    res.status(500).json({ error: 'Failed to update shopping item' });
  }
});

// Toggle item purchased status
router.patch('/:itemId/purchase', authenticateToken, async (req, res) => {
  try {
    const itemId = req.params.itemId;
    const userId = req.user.id;

    // Verify user has access to this shopping item's trip
    const accessCheck = await pool.query(`
      SELECT tsi.trip_id, tsi.is_purchased FROM trip_shopping_items tsi
      JOIN camping_trips ct ON tsi.trip_id = ct.id
      LEFT JOIN trip_participants tp ON ct.id = tp.trip_id
      WHERE tsi.id = $1 AND (ct.organizer_id = $2 OR tp.user_id = $2)
    `, [itemId, userId]);

    if (accessCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const currentStatus = accessCheck.rows[0].is_purchased;
    const newStatus = !currentStatus;

    const result = await pool.query(`
      UPDATE trip_shopping_items 
      SET 
        is_purchased = $1,
        purchased_by = CASE WHEN $1 THEN $2 ELSE NULL END,
        purchased_at = CASE WHEN $1 THEN CURRENT_TIMESTAMP ELSE NULL END,
        updated_by = $2,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *
    `, [newStatus, userId, itemId]);

    res.json({
      message: `Item marked as ${newStatus ? 'purchased' : 'not purchased'}`,
      item: result.rows[0]
    });
  } catch (error) {
    console.error('Error toggling purchase status:', error);
    res.status(500).json({ error: 'Failed to update purchase status' });
  }
});

// Delete shopping item
router.delete('/:itemId', authenticateToken, async (req, res) => {
  try {
    const itemId = req.params.itemId;
    const userId = req.user.id;

    // Verify user has access (organizer or creator can delete)
    const accessCheck = await pool.query(`
      SELECT tsi.trip_id FROM trip_shopping_items tsi
      JOIN camping_trips ct ON tsi.trip_id = ct.id
      WHERE tsi.id = $1 AND (ct.organizer_id = $2 OR tsi.created_by = $2)
    `, [itemId, userId]);

    if (accessCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied - only organizer or item creator can delete' });
    }

    await pool.query('DELETE FROM trip_shopping_items WHERE id = $1', [itemId]);

    res.json({ message: 'Shopping item deleted successfully' });
  } catch (error) {
    console.error('Error deleting shopping item:', error);
    res.status(500).json({ error: 'Failed to delete shopping item' });
  }
});

// Get user's shopping assignments across all trips
router.get('/my-assignments', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const result = await pool.query(`
      SELECT 
        tsi.*,
        ct.title as trip_title,
        ct.start_date as trip_start_date
      FROM trip_shopping_items tsi
      JOIN camping_trips ct ON tsi.trip_id = ct.id
      LEFT JOIN trip_participants tp ON ct.id = tp.trip_id
      WHERE tsi.is_purchased = false
      AND (
        tsi.assigned_to = 'everyone'
        OR (tsi.assigned_to = 'anyone' AND (ct.organizer_id = $1 OR tp.user_id = $1))
        OR tsi.assigned_to = $1::text
      )
      AND (ct.organizer_id = $1 OR tp.user_id = $1)
      ORDER BY 
        CASE tsi.priority 
          WHEN 'high' THEN 1 
          WHEN 'medium' THEN 2 
          WHEN 'low' THEN 3 
        END,
        ct.start_date ASC,
        tsi.created_at DESC
      LIMIT 10
    `, [userId]);
    
    res.json({ assignments: result.rows });
  } catch (error) {
    console.error('Error getting shopping assignments:', error);
    res.status(500).json({ error: 'Failed to get shopping assignments' });
  }
});

// Bulk add items from template
router.post('/trip/:tripId/from-template', authenticateToken, [
  param('tripId').isInt().withMessage('Invalid trip ID'),
  body('templateIds').isArray().withMessage('Template IDs must be an array'),
  body('templateIds.*').isInt().withMessage('Each template ID must be an integer')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const tripId = req.params.tripId;
    const userId = req.user.id;
    const { templateIds } = req.body;

    // Verify user has access to this trip
    const tripAccess = await pool.query(`
      SELECT ct.id FROM camping_trips ct
      LEFT JOIN trip_participants tp ON ct.id = tp.trip_id
      WHERE ct.id = $1 AND (ct.organizer_id = $2 OR tp.user_id = $2)
    `, [tripId, userId]);

    if (tripAccess.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied to this trip' });
    }

    // Get template items
    const templates = await pool.query(`
      SELECT * FROM shopping_templates 
      WHERE id = ANY($1)
    `, [templateIds]);

    // Insert items from templates
    const insertPromises = templates.rows.map(template => {
      return pool.query(`
        INSERT INTO trip_shopping_items (
          trip_id, item_name, description, category, quantity, 
          estimated_cost, priority, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `, [
        tripId, template.item_name, template.description, template.category,
        template.quantity, template.estimated_cost, template.priority, userId
      ]);
    });

    const results = await Promise.all(insertPromises);
    const createdItems = results.map(result => result.rows[0]);

    res.status(201).json({
      message: `Added ${createdItems.length} items from templates`,
      items: createdItems
    });
  } catch (error) {
    console.error('Error adding items from template:', error);
    res.status(500).json({ error: 'Failed to add items from template' });
  }
});

module.exports = router;
