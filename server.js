const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDatabase = require('./src/config/database');

// Environment variables yuklash
dotenv.config();

// Database ulanish
connectDatabase();

// Models'ni register qilish (import qilish kifoya)
require('./src/models/User');
require('./src/models/Problem');
require('./src/models/Comment');

// Express app yaratish
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', require('./src/routes/authRoutes'));
app.use('/api/problems', require('./src/routes/problemRoutes'));
app.use('/api', require('./src/routes/commentRoutes'));
app.use('/api/tags', require('./src/routes/tagsRoutes'));
app.use('/api/notifications', require('./src/routes/notifications'))



// Test route
app.get('/', (req, res) => {
  res.json({
    success: true,
    xabar: 'Zudlik API ishlamoqda! 🚀',
    version: '2.0.0',
    endpoints: {
      auth: '/api/auth',
      problems: '/api/problems',
      comments: '/api'
    }
  });
});

// 404 xatosi
app.use((req, res) => {
  res.status(404).json({
    success: false,
    xabar: 'Route topilmadi'
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Server xatosi:', err);
  res.status(500).json({
    success: false,
    xabar: 'Server xatosi',
    xato: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Server ishga tushirish
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`\n🚀 Server ${PORT}-portda ishlamoqda`);
  console.log(`📍 http://localhost:${PORT}`);
  console.log(`🌍 Muhit: ${process.env.NODE_ENV}\n`);
});