const express = require('express');
const router = express.Router();
const {
  getProducts,
  seedProducts,
  getProductBySlug,
  createProduct,
  updateProduct,
  deleteProduct,
  addProductReview,
  deleteProductReview,
  trackProductView,
  getProductPerformance
} = require('../controllers/productController');
const { protect, admin } = require('../middleware/authMiddleware');

router.route('/')
  .get(getProducts)
  .post(protect, admin, createProduct);
// Temporary route to seed initial products from JSON to DB
router.post('/seed', protect, admin, seedProducts);
router.get('/analytics/performance', protect, admin, getProductPerformance);
router.post('/:id/view', trackProductView);

router.get('/:slug', getProductBySlug);

router.route('/:id/reviews').post(addProductReview);
router.route('/:id/reviews/:reviewId').delete(protect, admin, deleteProductReview);

router.route('/:id')
  .put(protect, admin, updateProduct)
  .delete(protect, admin, deleteProduct);

module.exports = router;
