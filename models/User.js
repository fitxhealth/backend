const mongoose = require('mongoose');

// ── Address Sub-schema ────────────────────────────────────────────────────────
const addressSchema = new mongoose.Schema({
  label:     { type: String, default: 'Home' }, // e.g. Home, Office, Hostel
  name:      { type: String, required: true },
  phone:     { type: String, required: true },
  house:     { type: String, required: true },
  street:    { type: String, default: '' },
  city:      { type: String, required: true },
  state:     { type: String, required: true },
  pin:       { type: String, required: true },
  landmark:  { type: String, default: '' },
  isDefault: { type: Boolean, default: false },
}, { _id: true });

// ── AI Profile Sub-schema (hidden — no frontend yet) ─────────────────────────
const aiProfileSchema = new mongoose.Schema({
  height:             { type: Number },
  weight:             { type: Number },
  age:                { type: Number },
  gender:             { type: String, enum: ['male', 'female', 'other'] },
  goal:               { type: String }, // e.g. muscle gain, fat loss
  experience:         { type: String }, // e.g. beginner, intermediate, advanced
  budget:             { type: Number },
  medicalRestrictions:{ type: String, default: '' },
}, { _id: false });

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

    // Saved delivery addresses
    addresses: [addressSchema],

    // Wishlist — array of Product ObjectIds
    wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],

    // Rewards — default 0, not active yet
    rewardPoints: { type: Number, default: 0 },

    role: {
      type: String,
      enum: ['customer', 'admin'],
      default: 'customer',
    },

    isActive: { type: Boolean, default: true },

    // AI Profile — schema prepared, UI hidden
    aiProfile: { type: aiProfileSchema, default: () => ({}) },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Customer', UserSchema);
