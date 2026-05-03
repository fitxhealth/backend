const express = require('express');
const router = express.Router();
const { createOrder, verifyPayment, getConfig } = require('../controllers/paymentController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/config', getConfig);
router.post('/create-order', createOrder);
router.post('/verify', verifyPayment);

module.exports = router;
