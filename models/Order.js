const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  orderId: {
    type: String,
    required: true,
    unique: true
  },

  customerDetails: {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, required: true },
    address: { type: String, required: true }
  },
  products: [{
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    comboId: { type: mongoose.Schema.Types.ObjectId, ref: 'Combo' },
    isCombo: { type: Boolean, default: false },
    name: { type: String, required: true },
    flavor: { type: String, required: true },
    comboSelections: [{
      productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
      name: String,
      flavor: String,
      quantity: Number
    }],
    weight: { type: String }, // Optional: some simple products might not have a weight
    quantity: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true }
  }],
  totalAmount: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'packed', 'shipped', 'delivered', 'cancelled'],
    default: 'pending'
  },

}, { timestamps: true });

// Add Partial TTL Index to automatically delete pending/cancelled orders after 80 hours
// 80 hours = 80 * 60 * 60 = 288,000 seconds
orderSchema.index(
  { createdAt: 1 },
  { 
    expireAfterSeconds: 288000, 
    partialFilterExpression: { 
      status: { $in: ['pending', 'cancelled'] } 
    } 
  }
);

module.exports = mongoose.model('Order', orderSchema);