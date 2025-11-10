const express = require('express');
const router = express.Router();
const pool = require('../database/db');

// Debug route to check database schema
router.get('/schema', async (req, res) => {
    try {
        // Check users table columns
        const usersColumns = await pool.query(`
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'users' 
            ORDER BY ordinal_position
        `);

        // Check camping_trips table columns
        const tripsColumns = await pool.query(`
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'camping_trips' 
            ORDER BY ordinal_position
        `);

        // Check if tables exist
        const tables = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name
        `);

        res.json({
            tables: tables.rows.map(r => r.table_name),
            users_columns: usersColumns.rows,
            camping_trips_columns: tripsColumns.rows
        });
    } catch (error) {
        console.error('Schema check error:', error);
        res.status(500).json({ 
            error: error.message,
            stack: error.stack 
        });
    }
});

// Test database connection
router.get('/connection', async (req, res) => {
    try {
        const result = await pool.query('SELECT NOW() as current_time');
        res.json({ 
            status: 'Connected',
            time: result.rows[0].current_time 
        });
    } catch (error) {
        res.status(500).json({ 
            status: 'Error',
            error: error.message 
        });
    }
});

// Test user creation (without profile fields)
router.post('/test-user', async (req, res) => {
    try {
        const { email, password, firstName, lastName } = req.body;
        
        if (!email || !password || !firstName || !lastName) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Try basic user creation first
        const result = await pool.query(`
            INSERT INTO users (email, password_hash, first_name, last_name) 
            VALUES ($1, $2, $3, $4) 
            RETURNING id, email, first_name, last_name
        `, [email, 'test_hash', firstName, lastName]);

        res.json({ 
            success: true, 
            user: result.rows[0] 
        });
    } catch (error) {
        res.status(500).json({ 
            error: error.message,
            code: error.code 
        });
    }
});

module.exports = router;
