const mongoose = require('mongoose');

const comboSchema = new mongoose.Schema({
  comboName: { type: String, required: true },
  comboSlug: { type: String, required: true, unique: true },
  description: { type: String },
  comboBanner: { type: String },
  
  // Dynamically reference existing products
  products: [{
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, required: true, min: 1, default: 1 }
  }],
  
  // Variant & Visuals (Matches Product structure)
  sizes: [{
      weight: String,
      price: Number,
      oldPrice: Number,
      allowedFlavors: [String],
      inStock: { type: Boolean, default: true }
  }],
  images: [{ type: String }],
  flavors: [{
      name: String,
      image: String,
      inStock: { type: Boolean, default: true }
  }],

  // Pricing & Metrics
  manualOverridePrice: { type: Number },
  isPublished: { type: Boolean, default: true },
  
  // Display Tags
  isFeatured: { type: Boolean, default: false },
  isLaunchCombo: { type: Boolean, default: false },
  
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Combo', comboSchema);