const mongoose = require('mongoose');

const comboSchema = new mongoose.Schema({
  comboName: { type: String, required: true },
  comboSlug: { type: String, required: true, unique: true },
  description: { type: String },
  comboBanner: { type: String },
  
  // Dynamically reference existing products (Legacy fallback)
  products: [{
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, required: true, min: 1, default: 1 }
  }],
  
  // Dynamic Combo Groups for Customizable Stacks
  comboGroups: [{
    key: { type: String, required: true },
    label: { type: String, required: true },
    required: { type: Boolean, default: true },
    products: [{
      productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
      fixedWeight: { type: String }, // Optional: If we want to lock a specific size
      quantity: { type: Number, default: 1 },
      image: { type: String }, // Optional: Custom image for this specific combo combination
      customPrice: { type: Number } // Optional: Specific price for this product when chosen in this combo
    }]
  }],

  // Map of specific combo selections to images (e.g. 'hydra-whey-malai_mb-creatine' -> 'img.webp')
  comboImages: { type: Map, of: String },

  
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