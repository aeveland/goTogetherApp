const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../database/db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get user profile by ID
router.get('/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    
    const result = await pool.query(`
      SELECT 
        id, email, first_name, last_name, bio, camper_type, 
        group_size, dietary_restrictions, phone, created_at,
        home_address, home_city, home_state, home_zip, home_country,
        home_latitude, home_longitude
      FROM users 
      WHERE id = $1 AND is_active = true
    `, [userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];
    
    // Only show full profile to the user themselves
    const isOwnProfile = req.user.id === parseInt(userId);
    
    if (!isOwnProfile) {
      // Public profile view - hide sensitive info
      delete user.email;
      delete user.phone;
    }

    res.json({ 
      user,
      isOwnProfile 
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Update user profile (only own profile)
router.put('/', authenticateToken, [
  body('firstName').trim().isLength({ min: 1, max: 100 }).withMessage('First name required (1-100 chars)'),
  body('lastName').trim().isLength({ min: 1, max: 100 }).withMessage('Last name required (1-100 chars)'),
  body('bio').optional().trim().isLength({ max: 1000 }).withMessage('Bio too long (max 1000 chars)'),
  body('camperType').optional({ nullable: true, checkFalsy: true }).isIn(['tent', 'trailer', 'rv', 'van', 'fifth_wheel']).withMessage('Invalid camper type'),
  body('groupSize').optional().isInt({ min: 1, max: 20 }).withMessage('Group size must be 1-20'),
  body('dietaryRestrictions').optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 50 }).withMessage('Dietary restrictions too long'),
  body('phone').optional().trim().isLength({ max: 20 }).withMessage('Phone number too long'),
  body('homeAddress').optional().trim().isLength({ max: 500 }).withMessage('Address too long'),
  body('homeCity').optional().trim().isLength({ max: 100 }).withMessage('City too long'),
  body('homeState').optional().trim().isLength({ max: 50 }).withMessage('State too long'),
  body('homeZip').optional().trim().isLength({ max: 20 }).withMessage('ZIP code too long'),
  body('homeCountry').optional().trim().isLength({ max: 50 }).withMessage('Country too long'),
  body('homeLatitude').optional().isFloat({ min: -90, max: 90 }).withMessage('Invalid latitude'),
  body('homeLongitude').optional().isFloat({ min: -180, max: 180 }).withMessage('Invalid longitude')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      firstName,
      lastName,
      bio,
      camperType,
      groupSize,
      dietaryRestrictions,
      phone,
      homeAddress,
      homeCity,
      homeState,
      homeZip,
      homeCountry,
      homeLatitude,
      homeLongitude
    } = req.body;

    // Convert empty strings to null for database constraints
    const cleanedData = {
      firstName: firstName?.trim(),
      lastName: lastName?.trim(),
      bio: bio?.trim() || null,
      camperType: camperType?.trim() || null,
      groupSize: groupSize || 1,
      dietaryRestrictions: dietaryRestrictions?.trim() || null,
      phone: phone?.trim() || null,
      homeAddress: homeAddress?.trim() || null,
      homeCity: homeCity?.trim() || null,
      homeState: homeState?.trim() || null,
      homeZip: homeZip?.trim() || null,
      homeCountry: homeCountry?.trim() || null,
      homeLatitude: homeLatitude || null,
      homeLongitude: homeLongitude || null
    };

    const result = await pool.query(`
      UPDATE users SET 
        first_name = $1,
        last_name = $2,
        bio = $3,
        camper_type = $4,
        group_size = $5,
        dietary_restrictions = $6,
        phone = $7,
        home_address = $8,
        home_city = $9,
        home_state = $10,
        home_zip = $11,
        home_country = $12,
        home_latitude = $13,
        home_longitude = $14,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $15
      RETURNING id, email, first_name, last_name, bio, camper_type, 
                group_size, dietary_restrictions, phone, home_address,
                home_city, home_state, home_zip, home_country,
                home_latitude, home_longitude
    `, [
      cleanedData.firstName, cleanedData.lastName, cleanedData.bio, 
      cleanedData.camperType, cleanedData.groupSize, 
      cleanedData.dietaryRestrictions, cleanedData.phone,
      cleanedData.homeAddress, cleanedData.homeCity, cleanedData.homeState,
      cleanedData.homeZip, cleanedData.homeCountry, cleanedData.homeLatitude,
      cleanedData.homeLongitude, req.user.id
    ]);

    res.json({
      message: 'Profile updated successfully',
      user: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

module.exports = router;
