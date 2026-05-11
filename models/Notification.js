const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Please provide an email'],
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please provide a valid email'
    ]
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  productName: {
    type: String,
    required: true
  },
  variantKey: {
    type: String, // e.g. "flavorIndex-sizeIndex" or "FlavorName-Weight"
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'notified'],
    default: 'pending'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Notification', notificationSchema);
