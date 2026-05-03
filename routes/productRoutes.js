const express = require('express');
const router = express.Router();
const { getProducts, seedProducts, getProductBySlug, createProduct, updateProduct, deleteProduct, addProductReview, deleteProductReview } = require('../controllers/productController');
const { protect } = require('../middleware/authMiddleware');

router.route('/')
  .get(getProducts)
  .post(protect, createProduct);
// Temporary route to seed initial products from JSON to DB
router.post('/seed', seedProducts);

router.get('/:slug', getProductBySlug);

router.route('/:id/reviews').post(addProductReview);
router.route('/:id/reviews/:reviewId').delete(protect, deleteProductReview);

router.route('/:id')
  .put(protect, updateProduct)
  .delete(protect, deleteProduct);

module.exports = router;
