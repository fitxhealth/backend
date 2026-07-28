const mongoose = require('mongoose');



// ── User Schema ───────────────────────────────────────────────────────────────
const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      unique: true,
      sparse: true,   // allows null (phone-only users)
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      unique: true,
      sparse: true,   // allows null (email-only users)
      trim: true,
    },
    isEmailVerified: { type: Boolean, default: false },
    isPhoneVerified: { type: Boolean, default: false },

    profileImage: { type: String, default: '' },



    role: {
      type: String,
      enum: ['customer', 'admin'],
      default: 'customer',
    },

    password: { type: String },

    isActive: { type: Boolean, default: true },


  },
  { timestamps: true }
);

module.exports = mongoose.model('Customer', UserSchema);
