const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  getProfile,
  updateProfile,
  updateAiProfile,
  getOrders,
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  getAddresses,
  addAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
  getRewards,
} = require('../controllers/userController');

// All user routes require authentication
router.use(protect);

// Profile
router.get('/profile', getProfile);
router.put('/profile', updateProfile);
router.put('/ai-profile', updateAiProfile);

// Orders
router.get('/orders', getOrders);

// Wishlist
router.get('/wishlist', getWishlist);
router.post('/wishlist', addToWishlist);
router.delete('/wishlist/:productId', removeFromWishlist);

// Addresses
router.get('/addresses', getAddresses);
router.post('/address', addAddress);
router.put('/address/:id', updateAddress);
router.delete('/address/:id', deleteAddress);
router.put('/address/:id/default', setDefaultAddress);

// Rewards
router.get('/rewards', getRewards);

module.exports = router;
