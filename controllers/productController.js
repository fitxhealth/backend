const Product = require('../models/Product');

// @desc    Get all products
// @route   GET /api/products
exports.getProducts = async (req, res) => {
  try {
    const products = await Product.find({});
    res.status(200).json({ success: true, count: products.length, data: products });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single product by slug
// @route   GET /api/products/:slug
exports.getProductBySlug = async (req, res) => {
  try {
    const product = await Product.findOne({ slug: req.params.slug });
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    res.status(200).json({ success: true, data: product });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create a product (Admin)
// @route   POST /api/products
exports.createProduct = async (req, res) => {
  try {
    const product = await Product.create(req.body);
    res.status(201).json({ success: true, data: product });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Update a product (Admin)
// @route   PUT /api/products/:id
exports.updateProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    res.status(200).json({ success: true, data: product });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Delete a product (Admin)
// @route   DELETE /api/products/:id
exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Create new review
// @route   POST /api/products/:id/reviews
exports.addProductReview = async (req, res) => {
  try {
    const { rating, comment, name } = req.body;
    const product = await Product.findById(req.params.id);

    if (product) {
      const review = {
        name: name,
        rating: Number(rating),
        comment: comment,
      };

      product.reviewList.push(review);
      product.numReviews = product.reviewList.length;
      product.rating = product.reviewList.reduce((acc, item) => item.rating + acc, 0) / product.reviewList.length;

      await product.save();
      res.status(201).json({ success: true, message: 'Review added' });
    } else {
      res.status(404).json({ success: false, message: 'Product not found' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete a review (Admin)
// @route   DELETE /api/products/:id/reviews/:reviewId
exports.deleteProductReview = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

    // Filter out the review matching the ID
    product.reviewList = product.reviewList.filter(r => r._id.toString() !== req.params.reviewId);
    
    // Recalculate totals
    product.numReviews = product.reviewList.length;
    product.rating = product.numReviews > 0 
      ? product.reviewList.reduce((acc, item) => item.rating + acc, 0) / product.numReviews 
      : 5; // Default back to 5 stars if empty

    await product.save();
    res.status(200).json({ success: true, message: 'Review deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Seed products to DB (Dev only)
// @route   POST /api/products/seed
exports.seedProducts = async (req, res) => {
  try {
    const products = req.body;
    await Product.deleteMany();
    const createdProducts = await Product.insertMany(products);
    res.status(201).json({ success: true, message: 'Products seeded', data: createdProducts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
