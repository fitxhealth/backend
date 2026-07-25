const mongoose = require('mongoose');

/**
 * OTP Collection
 *
 * - TTL index: documents expire automatically after 5 minutes
 * - OTP is stored as a bcrypt hash (never plaintext)
 * - A new OTP request invalidates all previous OTPs for the same identifier
 * - attempts tracks failed verify tries (max 5)
 * - hourlyCount tracks how many OTPs were requested this hour (rate limit: 5/hr)
 */
const OTPSchema = new mongoose.Schema({
  identifier: {
    type: String,
    required: true,
    index: true,
  },
  type: {
    type: String,
    enum: ['email', 'phone'],
    required: true,
  },
  hashedOtp: {
    type: String,
    required: true,
  },
  attempts: {
    type: Number,
    default: 0,
  },
  // Rate limit: how many OTPs requested in the current hour window
  hourlyCount: {
    type: Number,
    default: 1,
  },
  hourWindowStart: {
    type: Date,
    default: Date.now,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// TTL index — MongoDB auto-deletes documents 5 minutes after createdAt
OTPSchema.index({ createdAt: 1 }, { expireAfterSeconds: 300 });

module.exports = mongoose.model('OTP', OTPSchema);
