const express = require('express');
const router = express.Router();
const { register, login, getMe, forgotPassword, resetPassword } = require('../controllers/authController');
const { himoyalash } = require('../middleware/authMiddleware');

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);  // ⭐ ADD THIS
router.put('/reset-password/:resetToken', resetPassword);  // ⭐ AND THIS
// Private routes
router.get('/me', himoyalash, getMe);

module.exports = router;