const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
  id: { type: Number },
  slug: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  oldPrice: { type: Number },
  discount: { type: Number },
  rating: { type: Number, default: 5 },
  reviews: { type: Number, default: 0 },
  numReviews: { type: Number, default: 0 },
  bestSeller: { type: Boolean, default: false },
  category: { type: String, required: true, enum: ['common', 'unique', 'combos'] },
  subCategory: { type: String },
  stockLeft: { type: Number, default: 10 },
  scarcity: { type: Number, default: 0 },
  showScarcity: { type: Boolean, default: true },
  viewCount: { type: Number, default: 0 },
  confirmedSales: { type: Number, default: 0 },
  confirmedRevenue: { type: Number, default: 0 },
  description: { type: String },
  ingredients: { type: String },
  glutenFree: { type: Boolean, default: false },
  isBulking: { type: Boolean, default: false },
  isMuscle: { type: Boolean, default: false },
  isFatLoss: { type: Boolean, default: false },
  isStack: { type: Boolean, default: false },
  images: [{ type: String }],
  nutritionalFacts: [String],
  flavors: [
    {
      name: { type: String, required: true },
      image: { type: String, default: '' },
      inStock: { type: Boolean, default: true }
    }
  ],
  sizes: [
    {
      weight: { type: String, required: true },
      price: { type: Number, required: true },
      oldPrice: { type: Number },
      allowedFlavors: [String],
      inStock: { type: Boolean, default: true }
    }
  ],

  // --- NEW: VARIANT LEVEL INVENTORY ---
  // This tracks the exact stock for specific flavor + weight combinations
  variants: [
    {
      flavor: { type: String, required: true },
      weight: { type: String }, // E.g., '1 kg', '2 kg' (Optional for products with no size)
      availableStock: { type: Number, required: true, default: 0 }
    }
  ],
  // ------------------------------------

  reviewList: [
    {
      name: { type: String, required: true },
      rating: { type: Number, required: true },
      comment: { type: String, required: true },
      createdAt: { type: Date, default: Date.now }
    }
  ]
});

module.exports = mongoose.model('Product', ProductSchema);
