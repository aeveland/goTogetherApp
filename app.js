const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const compression = require('compression');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const tripsRoutes = require('./routes/trips');
const weatherRoutes = require('./routes/weather');
const statusRoutes = require('./routes/status');
const profileRoutes = require('./routes/profile');
const amazonRoutes = require('./routes/amazon');
const amazonMigrateRoutes = require('./routes/amazon-migrate');
const amazonImageRoutes = require('./routes/amazon-image');
const fetchAmazonImagesRoutes = require('./routes/fetch-amazon-images');
const tasksRoutes = require('./routes/tasks');
const shoppingRoutes = require('./routes/shopping');
const fixRoutes = require('./routes/fix');
const testRoutes = require('./routes/test');
const weatherTestRoutes = require('./routes/weather-test');
const fixAllTablesRoutes = require('./routes/fix-all-tables');
const debugRoutes = require('./routes/debug');
const fixShoppingColumnsRoutes = require('./routes/fix-shopping-columns');
const shoppingTableCheckRoutes = require('./routes/shopping-table-check');
const fixAssignmentConstraintRoutes = require('./routes/fix-assignment-constraint');
const addAmazonColumnRoutes = require('./routes/add-amazon-column');
const setupAssignmentsRoutes = require('./routes/setup-assignments');
const setupTaskAssignmentsRoutes = require('./routes/setup-task-assignments');
const onboardingRoutes = require('./routes/onboarding');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable gzip compression - reduces file sizes by 60-80%
app.use(compression({
  threshold: 1024, // Only compress files larger than 1KB
  level: 6, // Compression level (1-9, 6 is good balance)
  filter: (req, res) => {
    // Compress all compressible content
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  }
}));

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
app.use('/api/amazon', amazonRoutes);
app.use('/api/amazon-setup', amazonMigrateRoutes);
app.use('/api/amazon-image', amazonImageRoutes);
app.use('/api/fetch-amazon-images', fetchAmazonImagesRoutes);
app.use('/api/weather', weatherRoutes);
app.use('/api/fix', fixRoutes);
app.use('/api/test-system', testRoutes);
app.use('/api/weather-test', weatherTestRoutes);
app.use('/api/fix-all', fixAllTablesRoutes);
app.use('/api/debug', debugRoutes);
app.use('/api/fix-shopping', fixShoppingColumnsRoutes);
app.use('/api/shopping-check', shoppingTableCheckRoutes);
app.use('/api/fix-constraint', fixAssignmentConstraintRoutes);
app.use('/api/add-amazon-col', addAmazonColumnRoutes);
app.use('/api/setup-assignments', setupAssignmentsRoutes);
app.use('/api/setup-task-assignments', setupTaskAssignmentsRoutes);
app.use('/api/onboarding', onboardingRoutes);

// Landing page route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'landing.html'));
});

// Main app route
app.get('/app', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Serve static files with basic caching
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: '1h' // Cache for 1 hour - safe and improves repeat visits
}));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Performance optimizations: Gzip compression enabled, 1h static file caching`);
});
