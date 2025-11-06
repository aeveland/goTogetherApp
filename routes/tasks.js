const express = require('express');
const { body, validationResult, param } = require('express-validator');
const pool = require('../database/db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get all tasks for a specific trip
router.get('/trip/:tripId', authenticateToken, async (req, res) => {
  try {
    const tripId = req.params.tripId;
    const userId = req.user.id;

    // First verify user has access to this trip (is organizer or participant)
    const tripAccess = await pool.query(`
      SELECT ct.id 
      FROM camping_trips ct
      LEFT JOIN trip_participants tp ON ct.id = tp.trip_id AND tp.user_id = $1
      WHERE ct.id = $2 AND ct.is_active = true 
        AND (ct.organizer_id = $1 OR tp.user_id IS NOT NULL)
    `, [userId, tripId]);

    if (tripAccess.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied to this trip' });
    }

    // Get all tasks for the trip with user details
    const result = await pool.query(`
      SELECT 
        tt.*,
        creator.first_name || ' ' || creator.last_name as created_by_name,
        assignee.first_name || ' ' || assignee.last_name as assigned_to_name,
        completer.first_name || ' ' || completer.last_name as completed_by_name
      FROM trip_tasks tt
      LEFT JOIN users creator ON tt.created_by = creator.id
      LEFT JOIN users assignee ON tt.assigned_to = assignee.id
      LEFT JOIN users completer ON tt.completed_by = completer.id
      WHERE tt.trip_id = $1
      ORDER BY 
        tt.is_completed ASC,
        CASE WHEN tt.has_due_date THEN tt.due_date ELSE '9999-12-31'::timestamp END ASC,
        tt.created_at DESC
    `, [tripId]);

    res.json({ tasks: result.rows });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// Create a new task
router.post('/trip/:tripId', [
  authenticateToken,
  param('tripId').isInt().withMessage('Trip ID must be a valid integer'),
  body('title').trim().isLength({ min: 1, max: 255 }).withMessage('Title must be between 1 and 255 characters'),
  body('description').optional().trim().isLength({ max: 1000 }).withMessage('Description must be less than 1000 characters'),
  body('assignmentType').isIn(['everyone', 'anyone', 'specific']).withMessage('Invalid assignment type'),
  body('assignedTo').optional().isInt().withMessage('Assigned user must be a valid integer'),
  body('hasDueDate').isBoolean().withMessage('Has due date must be a boolean'),
  body('dueDate').optional().isISO8601().withMessage('Due date must be a valid date')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const tripId = req.params.tripId;
    const userId = req.user.id;
    const {
      title,
      description,
      assignmentType,
      assignedTo,
      hasDueDate,
      dueDate
    } = req.body;

    // Verify user has access to this trip
    const tripAccess = await pool.query(`
      SELECT ct.id 
      FROM camping_trips ct
      LEFT JOIN trip_participants tp ON ct.id = tp.trip_id AND tp.user_id = $1
      WHERE ct.id = $2 AND ct.is_active = true 
        AND (ct.organizer_id = $1 OR tp.user_id IS NOT NULL)
    `, [userId, tripId]);

    if (tripAccess.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied to this trip' });
    }

    // If specific assignment, verify the assigned user is part of the trip
    if (assignmentType === 'specific' && assignedTo) {
      const userAccess = await pool.query(`
        SELECT u.id 
        FROM users u
        LEFT JOIN camping_trips ct ON ct.organizer_id = u.id AND ct.id = $1
        LEFT JOIN trip_participants tp ON tp.user_id = u.id AND tp.trip_id = $1
        WHERE u.id = $2 AND (ct.id IS NOT NULL OR tp.user_id IS NOT NULL)
      `, [tripId, assignedTo]);

      if (userAccess.rows.length === 0) {
        return res.status(400).json({ error: 'Assigned user is not part of this trip' });
      }
    }

    // Create the task
    const result = await pool.query(`
      INSERT INTO trip_tasks (
        trip_id, title, description, created_by, assigned_to, 
        assignment_type, has_due_date, due_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [
      tripId,
      title,
      description || null,
      userId,
      assignmentType === 'specific' ? assignedTo : null,
      assignmentType,
      hasDueDate,
      hasDueDate && dueDate ? dueDate : null
    ]);

    res.status(201).json({ 
      message: 'Task created successfully',
      task: result.rows[0]
    });

  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// Update a task
router.put('/:taskId', [
  authenticateToken,
  param('taskId').isInt().withMessage('Task ID must be a valid integer'),
  body('title').trim().isLength({ min: 1, max: 255 }).withMessage('Title must be between 1 and 255 characters'),
  body('description').optional().trim().isLength({ max: 1000 }).withMessage('Description must be less than 1000 characters'),
  body('assignmentType').isIn(['everyone', 'anyone', 'specific']).withMessage('Invalid assignment type'),
  body('assignedTo').optional().isInt().withMessage('Assigned user must be a valid integer'),
  body('hasDueDate').isBoolean().withMessage('Has due date must be a boolean'),
  body('dueDate').optional().isISO8601().withMessage('Due date must be a valid date')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const taskId = req.params.taskId;
    const userId = req.user.id;
    const {
      title,
      description,
      assignmentType,
      assignedTo,
      hasDueDate,
      dueDate
    } = req.body;

    // Verify user has access to this task (created it or is trip organizer)
    const taskAccess = await pool.query(`
      SELECT tt.*, ct.organizer_id
      FROM trip_tasks tt
      JOIN camping_trips ct ON tt.trip_id = ct.id
      WHERE tt.id = $1 AND (tt.created_by = $2 OR ct.organizer_id = $2)
    `, [taskId, userId]);

    if (taskAccess.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied to this task' });
    }

    const task = taskAccess.rows[0];

    // If specific assignment, verify the assigned user is part of the trip
    if (assignmentType === 'specific' && assignedTo) {
      const userAccess = await pool.query(`
        SELECT u.id 
        FROM users u
        LEFT JOIN camping_trips ct ON ct.organizer_id = u.id AND ct.id = $1
        LEFT JOIN trip_participants tp ON tp.user_id = u.id AND tp.trip_id = $1
        WHERE u.id = $2 AND (ct.id IS NOT NULL OR tp.user_id IS NOT NULL)
      `, [task.trip_id, assignedTo]);

      if (userAccess.rows.length === 0) {
        return res.status(400).json({ error: 'Assigned user is not part of this trip' });
      }
    }

    // Update the task
    const result = await pool.query(`
      UPDATE trip_tasks 
      SET 
        title = $1,
        description = $2,
        assigned_to = $3,
        assignment_type = $4,
        has_due_date = $5,
        due_date = $6,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $7
      RETURNING *
    `, [
      title,
      description || null,
      assignmentType === 'specific' ? assignedTo : null,
      assignmentType,
      hasDueDate,
      hasDueDate && dueDate ? dueDate : null,
      taskId
    ]);

    res.json({ 
      message: 'Task updated successfully',
      task: result.rows[0]
    });

  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// Toggle task completion
router.patch('/:taskId/complete', authenticateToken, async (req, res) => {
  try {
    const taskId = req.params.taskId;
    const userId = req.user.id;

    // Verify user has access to this task (is part of the trip)
    const taskAccess = await pool.query(`
      SELECT tt.*, ct.organizer_id
      FROM trip_tasks tt
      JOIN camping_trips ct ON tt.trip_id = ct.id
      LEFT JOIN trip_participants tp ON tp.trip_id = ct.id AND tp.user_id = $2
      WHERE tt.id = $1 AND (ct.organizer_id = $2 OR tp.user_id IS NOT NULL)
    `, [taskId, userId]);

    if (taskAccess.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied to this task' });
    }

    const task = taskAccess.rows[0];
    const newCompletionState = !task.is_completed;

    // Update task completion
    const result = await pool.query(`
      UPDATE trip_tasks 
      SET 
        is_completed = $1,
        completed_by = $2,
        completed_at = $3,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING *
    `, [
      newCompletionState,
      newCompletionState ? userId : null,
      newCompletionState ? new Date() : null,
      taskId
    ]);

    res.json({ 
      message: `Task ${newCompletionState ? 'completed' : 'reopened'} successfully`,
      task: result.rows[0]
    });

  } catch (error) {
    console.error('Error toggling task completion:', error);
    res.status(500).json({ error: 'Failed to update task completion' });
  }
});

// Delete a task
router.delete('/:taskId', authenticateToken, async (req, res) => {
  try {
    const taskId = req.params.taskId;
    const userId = req.user.id;

    // Verify user has access to delete this task (created it or is trip organizer)
    const taskAccess = await pool.query(`
      SELECT tt.*, ct.organizer_id
      FROM trip_tasks tt
      JOIN camping_trips ct ON tt.trip_id = ct.id
      WHERE tt.id = $1 AND (tt.created_by = $2 OR ct.organizer_id = $2)
    `, [taskId, userId]);

    if (taskAccess.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied to delete this task' });
    }

    // Delete the task
    await pool.query('DELETE FROM trip_tasks WHERE id = $1', [taskId]);

    res.json({ message: 'Task deleted successfully' });

  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

module.exports = router;
