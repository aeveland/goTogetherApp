const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const pool = require('../database/db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Register endpoint
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('firstName').trim().isLength({ min: 1 }).withMessage('First name is required'),
  body('lastName').trim().isLength({ min: 1 }).withMessage('Last name is required'),
  // Optional profile fields
  body('bio').optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 1000 }).withMessage('Bio too long'),
  body('camperType').optional({ nullable: true, checkFalsy: true }).isIn(['tent', 'trailer', 'rv', 'van', 'fifth_wheel', 'cabin', 'glamping', 'backpacking']).withMessage('Invalid camper type'),
  body('groupSize').optional().isInt({ min: 1, max: 20 }).withMessage('Group size must be 1-20'),
  body('dietaryRestrictions').optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 50 }).withMessage('Dietary restrictions too long'),
  body('phone').optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 20 }).withMessage('Phone number too long')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { 
      email, password, firstName, lastName,
      bio, camperType, groupSize, dietaryRestrictions, phone 
    } = req.body;

    // Check if user already exists
    const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Clean profile data (convert empty strings to null)
    const cleanedProfileData = {
      bio: bio?.trim() || null,
      camperType: camperType?.trim() || null,
      groupSize: groupSize || 1,
      dietaryRestrictions: dietaryRestrictions?.trim() || null,
      phone: phone?.trim() || null
    };

    // Create user with profile fields (fallback to basic fields if profile columns don't exist)
    let result;
    try {
      result = await pool.query(`
        INSERT INTO users (
          email, password_hash, first_name, last_name,
          bio, camper_type, group_size, dietary_restrictions, phone
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
        RETURNING id, email, first_name, last_name, bio, camper_type, 
                  group_size, dietary_restrictions, phone
      `, [
        email, passwordHash, firstName, lastName,
        cleanedProfileData.bio, cleanedProfileData.camperType, 
        cleanedProfileData.groupSize, cleanedProfileData.dietaryRestrictions, 
        cleanedProfileData.phone
      ]);
    } catch (error) {
      // If profile columns don't exist, create user with basic fields only
      if (error.message.includes('column') && error.message.includes('does not exist')) {
        console.log('Profile columns not found, creating user with basic fields only');
        result = await pool.query(`
          INSERT INTO users (email, password_hash, first_name, last_name) 
          VALUES ($1, $2, $3, $4) 
          RETURNING id, email, first_name, last_name
        `, [email, passwordHash, firstName, lastName]);
      } else {
        throw error;
      }
    }

    const user = result.rows[0];

    // Generate JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Set HTTP-only cookie
    res.cookie('authToken', token, {
      httpOnly: true,
      secure: false, // Set to false for development
      sameSite: 'lax', // Changed from 'strict' to 'lax'
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login endpoint
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').exists().withMessage('Password is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    // Find user
    const result = await pool.query(
      'SELECT id, email, password_hash, first_name, last_name FROM users WHERE email = $1 AND is_active = true',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = result.rows[0];

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Generate JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Set HTTP-only cookie
    res.cookie('authToken', token, {
      httpOnly: true,
      secure: false, // Set to false for development
      sameSite: 'lax', // Changed from 'strict' to 'lax'
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Logout endpoint
router.post('/logout', (req, res) => {
  res.clearCookie('authToken');
  res.json({ message: 'Logout successful' });
});

// Get current user endpoint
router.get('/me', authenticateToken, (req, res) => {
  res.json({
    user: {
      id: req.user.id,
      email: req.user.email,
      firstName: req.user.first_name,
      lastName: req.user.last_name
    }
  });
});

module.exports = router;
