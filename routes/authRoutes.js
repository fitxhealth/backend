const express = require('express');
const router = express.Router();
const {
  sendOtp,
  verifyOtp,
  logout,
  getMe,
  adminLogin,
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

// ── Customer OTP Auth ─────────────────────────────────────────────────────────
router.post('/send-otp', sendOtp);
router.post('/verify-otp', verifyOtp);
router.post('/logout', logout);
router.get('/me', protect, getMe);

// ── Legacy Admin Login (password-based, kept for admin panel) ─────────────────
router.post('/login', adminLogin);

module.exports = router;
