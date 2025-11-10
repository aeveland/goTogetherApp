const express = require('express');
const { body, validationResult, param } = require('express-validator');
const pool = require('../database/db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get user's trips (trips they've joined or organized)
router.get('/my', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const result = await pool.query(`
      SELECT 
        ct.*,
        u.first_name || ' ' || u.last_name as organizer_name,
        COUNT(tp.user_id) as current_participants
      FROM camping_trips ct
      LEFT JOIN users u ON ct.organizer_id = u.id
      LEFT JOIN trip_participants tp ON ct.id = tp.trip_id AND tp.status = 'confirmed'
      WHERE ct.is_active = true 
        AND ct.start_date >= CURRENT_DATE
        AND (ct.organizer_id = $1 OR EXISTS (
          SELECT 1 FROM trip_participants tp3 
          WHERE tp3.trip_id = ct.id AND tp3.user_id = $1 AND tp3.status = 'confirmed'
        ))
      GROUP BY ct.id, u.first_name, u.last_name
      ORDER BY ct.start_date ASC
    `, [userId]);

    res.json({
      trips: result.rows
    });
  } catch (error) {
    console.error('Error fetching user trips:', error);
    res.status(500).json({ error: 'Failed to fetch user trips' });
  }
});

// Get all upcoming camping trips
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        ct.*,
        u.first_name || ' ' || u.last_name as organizer_name,
        COUNT(tp.user_id) as current_participants
      FROM camping_trips ct
      LEFT JOIN users u ON ct.organizer_id = u.id
      LEFT JOIN trip_participants tp ON ct.id = tp.trip_id AND tp.status = 'confirmed'
      WHERE ct.is_active = true AND ct.start_date >= CURRENT_DATE AND ct.is_public = true
      GROUP BY ct.id, u.first_name, u.last_name
      ORDER BY ct.start_date ASC
    `);

    res.json({
      trips: result.rows
    });
  } catch (error) {
    console.error('Error fetching trips:', error);
    res.status(500).json({ error: 'Failed to fetch trips' });
  }
});

// Get single trip details
router.get('/:id', [
  param('id').isInt().withMessage('Trip ID must be a number')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const tripId = req.params.id;

    // Get trip details
    const tripResult = await pool.query(`
      SELECT 
        ct.*,
        u.first_name || ' ' || u.last_name as organizer_name,
        u.email as organizer_email
      FROM camping_trips ct
      LEFT JOIN users u ON ct.organizer_id = u.id
      WHERE ct.id = $1 AND ct.is_active = true
    `, [tripId]);

    if (tripResult.rows.length === 0) {
      return res.status(404).json({ error: 'Trip not found' });
    }

    // Get participants
    const participantsResult = await pool.query(`
      SELECT 
        u.first_name || ' ' || u.last_name as name,
        tp.joined_at,
        tp.status
      FROM trip_participants tp
      JOIN users u ON tp.user_id = u.id
      WHERE tp.trip_id = $1 AND tp.status = 'confirmed'
      ORDER BY tp.joined_at ASC
    `, [tripId]);

    const trip = tripResult.rows[0];
    trip.participants = participantsResult.rows;
    trip.current_participants = participantsResult.rows.length;

    res.json({ trip });
  } catch (error) {
    console.error('Error fetching trip details:', error);
    res.status(500).json({ error: 'Failed to fetch trip details' });
  }
});

// Create new camping trip (requires authentication)
router.post('/', authenticateToken, [
  body('title').trim().isLength({ min: 3, max: 255 }).withMessage('Title must be 3-255 characters'),
  body('description').optional().trim().isLength({ max: 2000 }).withMessage('Description too long'),
  body('location').trim().isLength({ min: 3, max: 255 }).withMessage('Location must be 3-255 characters'),
  body('startDate').isISO8601().withMessage('Invalid start date'),
  body('endDate').isISO8601().withMessage('Invalid end date'),
  body('tripType').isIn(['car_camping', 'backpacking', 'rv_camping', 'glamping']).withMessage('Invalid trip type'),
  body('status').optional().isIn(['planning', 'active', 'completed']).withMessage('Invalid status'),
  body('isPublic').isBoolean().withMessage('isPublic must be boolean'),
  body('tripCode').optional().trim().custom((value, { req }) => {
    // Only validate trip code if it's provided or if the trip is private
    if (value && (value.length < 6 || value.length > 10)) {
      throw new Error('Trip code must be 6-10 characters');
    }
    // For private trips, trip code is required
    if (!req.body.isPublic && !value) {
      throw new Error('Private trips require a trip code');
    }
    return true;
  }),
  body('latitude').optional().isFloat({ min: -90, max: 90 }).withMessage('Invalid latitude'),
  body('longitude').optional().isFloat({ min: -180, max: 180 }).withMessage('Invalid longitude')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      title,
      description,
      location,
      startDate,
      endDate,
      tripType,
      status = 'planning',
      isPublic,
      tripCode,
      latitude,
      longitude
    } = req.body;

    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (start < today) {
      return res.status(400).json({ error: 'Start date cannot be in the past' });
    }

    if (end <= start) {
      return res.status(400).json({ error: 'End date must be after start date' });
    }

    // Create trip (handle missing latitude/longitude gracefully)
    // Try with status column first, fallback without it if column doesn't exist
    let result;
    try {
      result = await pool.query(`
        INSERT INTO camping_trips (
          title, description, location, start_date, end_date,
          trip_type, status, organizer_id, is_public, trip_code, latitude, longitude
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *
      `, [
        title, description, location, startDate, endDate,
        tripType, status, req.user.id, isPublic, tripCode, latitude || null, longitude || null
      ]);
    } catch (error) {
      // If status column doesn't exist, try without it
      if (error.message.includes('column "status" of relation "camping_trips" does not exist')) {
        console.log('Status column not found, creating trip without status');
        result = await pool.query(`
          INSERT INTO camping_trips (
            title, description, location, start_date, end_date,
            trip_type, organizer_id, is_public, trip_code, latitude, longitude
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          RETURNING *
        `, [
          title, description, location, startDate, endDate,
          tripType, req.user.id, isPublic, tripCode, latitude || null, longitude || null
        ]);
      } else {
        throw error;
      }
    }

    // Automatically add organizer as participant
    await pool.query(`
      INSERT INTO trip_participants (trip_id, user_id, status)
      VALUES ($1, $2, 'confirmed')
    `, [result.rows[0].id, req.user.id]);

    res.status(201).json({
      message: 'Camping trip created successfully',
      trip: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating trip:', error);
    res.status(500).json({ error: 'Failed to create trip' });
  }
});

// Join a camping trip (requires authentication)
router.post('/:id/join', authenticateToken, [
  param('id').isInt().withMessage('Trip ID must be a number')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const tripId = req.params.id;
    const userId = req.user.id;

    // Check if trip exists and is active
    const tripResult = await pool.query(`
      SELECT id, max_participants, start_date
      FROM camping_trips 
      WHERE id = $1 AND is_active = true
    `, [tripId]);

    if (tripResult.rows.length === 0) {
      return res.status(404).json({ error: 'Trip not found' });
    }

    const trip = tripResult.rows[0];

    // Check if trip hasn't started
    if (new Date(trip.start_date) <= new Date()) {
      return res.status(400).json({ error: 'Cannot join trip that has already started' });
    }

    // Check current participant count
    const participantCount = await pool.query(`
      SELECT COUNT(*) as count
      FROM trip_participants 
      WHERE trip_id = $1 AND status = 'confirmed'
    `, [tripId]);

    if (parseInt(participantCount.rows[0].count) >= trip.max_participants) {
      return res.status(400).json({ error: 'Trip is full' });
    }

    // Check if user already joined
    const existingParticipant = await pool.query(`
      SELECT id FROM trip_participants 
      WHERE trip_id = $1 AND user_id = $2
    `, [tripId, userId]);

    if (existingParticipant.rows.length > 0) {
      return res.status(400).json({ error: 'You have already joined this trip' });
    }

    // Add user to trip
    await pool.query(`
      INSERT INTO trip_participants (trip_id, user_id, status)
      VALUES ($1, $2, 'confirmed')
    `, [tripId, userId]);

    res.json({ message: 'Successfully joined the camping trip!' });
  } catch (error) {
    console.error('Error joining trip:', error);
    res.status(500).json({ error: 'Failed to join trip' });
  }
});

// Leave a camping trip (requires authentication)
router.delete('/:id/leave', authenticateToken, [
  param('id').isInt().withMessage('Trip ID must be a number')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const tripId = req.params.id;
    const userId = req.user.id;

    // Check if user is participant
    const participantResult = await pool.query(`
      SELECT id FROM trip_participants 
      WHERE trip_id = $1 AND user_id = $2 AND status = 'confirmed'
    `, [tripId, userId]);

    if (participantResult.rows.length === 0) {
      return res.status(400).json({ error: 'You are not a participant in this trip' });
    }

    // Remove user from trip
    await pool.query(`
      DELETE FROM trip_participants 
      WHERE trip_id = $1 AND user_id = $2
    `, [tripId, userId]);

    res.json({ message: 'Successfully left the camping trip' });
  } catch (error) {
    console.error('Error leaving trip:', error);
    res.status(500).json({ error: 'Failed to leave trip' });
  }
});

// Update trip (only organizer can update)
router.put('/:id', [
  authenticateToken,
  param('id').isInt().withMessage('Trip ID must be a valid integer'),
  body('title').trim().isLength({ min: 1, max: 200 }).withMessage('Title must be between 1 and 200 characters'),
  body('tripType').isIn(['car_camping', 'backpacking', 'rv_camping', 'glamping']).withMessage('Invalid trip type'),
  body('location').trim().isLength({ min: 1, max: 500 }).withMessage('Location must be between 1 and 500 characters'),
  body('startDate').isISO8601().withMessage('Start date must be a valid date'),
  body('endDate').isISO8601().withMessage('End date must be a valid date'),
  body('maxParticipants').isInt({ min: 1, max: 50 }).withMessage('Max participants must be between 1 and 50'),
  body('visibility').isIn(['public', 'private']).withMessage('Visibility must be public or private'),
  body('description').optional().trim().isLength({ max: 2000 }).withMessage('Description must be less than 2000 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const tripId = req.params.id;
    const userId = req.user.id;
    const {
      title,
      tripType,
      location,
      startDate,
      endDate,
      maxParticipants,
      visibility,
      description
    } = req.body;

    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (start >= end) {
      return res.status(400).json({ error: 'End date must be after start date' });
    }

    // Check if user is the organizer of this trip
    const tripCheck = await pool.query(
      'SELECT organizer_id FROM camping_trips WHERE id = $1 AND is_active = true',
      [tripId]
    );

    if (tripCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Trip not found' });
    }

    if (tripCheck.rows[0].organizer_id !== userId) {
      return res.status(403).json({ error: 'Only the trip organizer can edit this trip' });
    }

    // Check if reducing max participants would kick out existing participants
    const participantCount = await pool.query(
      'SELECT COUNT(*) as count FROM trip_participants WHERE trip_id = $1 AND status = $2',
      [tripId, 'confirmed']
    );

    const currentParticipants = parseInt(participantCount.rows[0].count);
    if (maxParticipants < currentParticipants) {
      return res.status(400).json({ 
        error: `Cannot reduce max participants to ${maxParticipants}. There are already ${currentParticipants} confirmed participants.` 
      });
    }

    // Convert visibility to is_public boolean
    const isPublic = visibility === 'public';

    // Update the trip
    const result = await pool.query(`
      UPDATE camping_trips 
      SET 
        title = $1,
        trip_type = $2,
        location = $3,
        start_date = $4,
        end_date = $5,
        max_participants = $6,
        is_public = $7,
        description = $8,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $9 AND organizer_id = $10
      RETURNING *
    `, [
      title,
      tripType,
      location,
      startDate,
      endDate,
      maxParticipants,
      isPublic,
      description || null,
      tripId,
      userId
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Trip not found or access denied' });
    }

    res.json({ 
      message: 'Trip updated successfully',
      trip: result.rows[0]
    });

  } catch (error) {
    console.error('Error updating trip:', error);
    res.status(500).json({ error: 'Failed to update trip' });
  }
});

// Get user's trip statistics
router.get('/my-stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get total trips user is involved in
    const totalTripsResult = await pool.query(`
      SELECT COUNT(DISTINCT ct.id) as count
      FROM camping_trips ct
      LEFT JOIN trip_participants tp ON ct.id = tp.trip_id
      WHERE ct.organizer_id = $1 OR tp.user_id = $1
    `, [userId]);
    
    // Get trips organized by user
    const organizedTripsResult = await pool.query(`
      SELECT COUNT(*) as count
      FROM camping_trips
      WHERE organizer_id = $1
    `, [userId]);
    
    // Get trips joined by user (not organized)
    const joinedTripsResult = await pool.query(`
      SELECT COUNT(DISTINCT ct.id) as count
      FROM camping_trips ct
      JOIN trip_participants tp ON ct.id = tp.trip_id
      WHERE tp.user_id = $1 AND ct.organizer_id != $1
    `, [userId]);
    
    // Get completed tasks by user
    const completedTasksResult = await pool.query(`
      SELECT COUNT(*) as count
      FROM trip_tasks tt
      JOIN camping_trips ct ON tt.trip_id = ct.id
      LEFT JOIN trip_participants tp ON ct.id = tp.trip_id
      WHERE tt.is_completed = true 
      AND tt.completed_by = $1
      AND (ct.organizer_id = $1 OR tp.user_id = $1)
    `, [userId]);
    
    const stats = {
      totalTrips: parseInt(totalTripsResult.rows[0].count),
      organizedTrips: parseInt(organizedTripsResult.rows[0].count),
      joinedTrips: parseInt(joinedTripsResult.rows[0].count),
      completedTasks: parseInt(completedTasksResult.rows[0].count)
    };
    
    res.json(stats);
  } catch (error) {
    console.error('Error getting trip statistics:', error);
    res.status(500).json({ error: 'Failed to get statistics' });
  }
});

// Delete a camping trip (only organizer can delete)
router.delete('/:id', authenticateToken, [
  param('id').isInt().withMessage('Trip ID must be a number')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const tripId = req.params.id;
    const userId = req.user.id;

    // Check if user is the organizer of this trip
    const organizerCheck = await pool.query(`
      SELECT organizer_id 
      FROM camping_trips 
      WHERE id = $1
    `, [tripId]);

    if (organizerCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Trip not found' });
    }

    if (organizerCheck.rows[0].organizer_id !== userId) {
      return res.status(403).json({ error: 'Only the trip organizer can delete this trip' });
    }

    // Delete the trip (CASCADE will handle related data)
    await pool.query(`
      DELETE FROM camping_trips 
      WHERE id = $1
    `, [tripId]);

    res.json({ message: 'Trip deleted successfully' });

  } catch (error) {
    console.error('Error deleting trip:', error);
    res.status(500).json({ error: 'Failed to delete trip' });
  }
});

module.exports = router;
