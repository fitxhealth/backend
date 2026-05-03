const express = require('express');
const router = express.Router();
const { getCart, addToCart, removeFromCart, updateCartItem } = require('../controllers/cartController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/').get(getCart).post(addToCart);
router.route('/:productId/:flavorIndex').delete(removeFromCart).put(updateCartItem);

module.exports = router;
