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
      SELECT DISTINCT
        ct.*,
        u.first_name || ' ' || u.last_name as organizer_name,
        COUNT(tp.user_id) as current_participants,
        COALESCE(
          json_agg(
            json_build_object(
              'name', u2.first_name || ' ' || u2.last_name,
              'joined_at', tp2.joined_at
            )
          ) FILTER (WHERE tp2.user_id IS NOT NULL), 
          '[]'
        ) as participants
      FROM camping_trips ct
      LEFT JOIN users u ON ct.organizer_id = u.id
      LEFT JOIN trip_participants tp ON ct.id = tp.trip_id AND tp.status = 'confirmed'
      LEFT JOIN trip_participants tp2 ON ct.id = tp2.trip_id AND tp2.status = 'confirmed'
      LEFT JOIN users u2 ON tp2.user_id = u2.id
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
      WHERE ct.is_active = true AND ct.start_date >= CURRENT_DATE
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
  body('campground').optional().trim().isLength({ max: 255 }),
  body('startDate').isISO8601().withMessage('Invalid start date'),
  body('endDate').isISO8601().withMessage('Invalid end date'),
  body('maxParticipants').isInt({ min: 1, max: 50 }).withMessage('Max participants must be 1-50'),
  body('difficultyLevel').isIn(['easy', 'moderate', 'difficult']).withMessage('Invalid difficulty level'),
  body('tripType').isIn(['car_camping', 'backpacking', 'rv_camping', 'glamping']).withMessage('Invalid trip type')
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
      campground,
      startDate,
      endDate,
      maxParticipants,
      difficultyLevel,
      tripType
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

    // Create trip
    const result = await pool.query(`
      INSERT INTO camping_trips (
        title, description, location, campground, start_date, end_date,
        max_participants, difficulty_level, trip_type, organizer_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [
      title, description, location, campground, startDate, endDate,
      maxParticipants, difficultyLevel, tripType, req.user.id
    ]);

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

module.exports = router;
