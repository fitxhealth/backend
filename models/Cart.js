const mongoose = require('mongoose');

const CartSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  items: [
    {
      productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
      },
      flavorIndex: { type: Number, required: true },
      quantity: { type: Number, default: 1, min: 1 }
    }
  ]
});

module.exports = mongoose.model('Cart', CartSchema);
