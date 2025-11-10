const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const tripsRoutes = require('./routes/trips');
const weatherRoutes = require('./routes/weather');
const statusRoutes = require('./routes/status');
const profileRoutes = require('./routes/profile');
const migrateRoutes = require('./routes/migrate');
const tasksRoutes = require('./routes/tasks');
const shoppingRoutes = require('./routes/shopping');
const fixRoutes = require('./routes/fix');
const testRoutes = require('./routes/test');
const weatherTestRoutes = require('./routes/weather-test');
const fixAllTablesRoutes = require('./routes/fix-all-tables');
const debugRoutes = require('./routes/debug');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());

// Simple test route
app.get('/api/test', (req, res) => {
  res.json({ message: 'API is working!', timestamp: new Date().toISOString() });
});

// API routes BEFORE static files
app.use('/api/auth', authRoutes);
app.use('/api/trips', tripsRoutes);
app.use('/api/status', statusRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/tasks', tasksRoutes);
app.use('/api/shopping', shoppingRoutes);
app.use('/api/weather', weatherRoutes);
app.use('/api/migrate', migrateRoutes);
app.use('/api/fix', fixRoutes);
app.use('/api/test-system', testRoutes);
app.use('/api/weather-test', weatherTestRoutes);
app.use('/api/fix-all', fixAllTablesRoutes);
app.use('/api/debug', debugRoutes);

// Landing page route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'landing.html'));
});

// Main app route
app.get('/app', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
