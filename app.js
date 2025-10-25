const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const tripsRoutes = require('./routes/trips');
const statusRoutes = require('./routes/status');
const profileRoutes = require('./routes/profile');

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/auth', authRoutes);
app.use('/api/trips', tripsRoutes);
app.use('/api/status', statusRoutes);
app.use('/api/profile', profileRoutes);

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
