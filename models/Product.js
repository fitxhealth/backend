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
  stockLeft: { type: Number, default: 10 },
  description: { type: String },
  ingredients: { type: String },
  nutritionalFacts: [String],
  flavors: [
    {
      name: { type: String, required: true },
      image: { type: String, required: true },
      inStock: { type: Boolean, default: true }
    }
  ],
  sizes: [
    {
      weight: { type: String, required: true },
      price: { type: Number, required: true },
      oldPrice: { type: Number },
      allowedFlavors: [String]
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
