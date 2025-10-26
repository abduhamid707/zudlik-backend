const express = require('express');
const router = express.Router();
const { register, login, getMe } = require('../controllers/authController');
const { himoyalash } = require('../middleware/authMiddleware');

// Public routes
router.post('/register', register);
router.post('/login', login);

// Private routes
router.get('/me', himoyalash, getMe);

module.exports = router;