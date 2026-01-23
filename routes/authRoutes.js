const express = require('express');
const router = express.Router();
const { register, login, getMe, verifyEmail, testEmailConfig } = require('../controllers/authControllers');

router.post('/register', register);
router.post('/login', login);
router.post('/verify-email', verifyEmail);

// Public route to test email config (Remove in production later)
router.get('/test-email-config', testEmailConfig);

const { protect } = require('../middleware/authMiddleware');
router.get('/me', protect, getMe);

module.exports = router;