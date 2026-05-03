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
  ]
});

module.exports = mongoose.model('Product', ProductSchema);
