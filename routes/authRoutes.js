const express = require('express');
const router = express.Router();
const {
  logout,
  getMe,
  adminLogin,
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/logout', logout);
router.get('/me', protect, getMe);
router.post('/login', adminLogin);

module.exports = router;
