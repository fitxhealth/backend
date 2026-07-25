/**
 * controllers/userController.js
 *
 * All customer account endpoints:
 *   GET  /user/profile
 *   PUT  /user/profile
 *   PUT  /user/ai-profile
 *   GET  /user/orders
 *   GET  /user/wishlist
 *   POST /user/wishlist
 *   DELETE /user/wishlist/:productId
 *   GET  /user/addresses
 *   POST /user/address
 *   PUT  /user/address/:id
 *   DELETE /user/address/:id
 *   PUT  /user/address/:id/default
 *   GET  /user/rewards
 */

const Customer = require('../models/User');
const Order = require('../models/Order');
const Product = require('../models/Product');

// ── GET /user/profile ─────────────────────────────────────────────────────────

exports.getProfile = async (req, res) => {
  try {
    const customer = await Customer.findById(req.user._id).select('-__v');
    if (!customer) return res.status(404).json({ success: false, message: 'User not found.' });
    return res.status(200).json({ success: true, data: customer });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── PUT /user/profile ─────────────────────────────────────────────────────────

exports.updateProfile = async (req, res) => {
  try {
    const allowed = ['name', 'profileImage'];
    const updates = {};
    allowed.forEach((key) => {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    });

    if (updates.name !== undefined && !updates.name.trim()) {
      return res.status(400).json({ success: false, message: 'Name cannot be empty.' });
    }

    const customer = await Customer.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-__v');

    return res.status(200).json({ success: true, data: customer });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── PUT /user/ai-profile ──────────────────────────────────────────────────────

exports.updateAiProfile = async (req, res) => {
  try {
    const allowed = ['height', 'weight', 'age', 'gender', 'goal', 'experience', 'budget', 'medicalRestrictions'];
    const aiUpdates = {};
    allowed.forEach((key) => {
      if (req.body[key] !== undefined) aiUpdates[`aiProfile.${key}`] = req.body[key];
    });

    const customer = await Customer.findByIdAndUpdate(
      req.user._id,
      { $set: aiUpdates },
      { new: true, runValidators: true }
    ).select('aiProfile');

    return res.status(200).json({ success: true, data: customer.aiProfile });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET /user/orders ──────────────────────────────────────────────────────────

exports.getOrders = async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .select('-__v');
    return res.status(200).json({ success: true, data: orders });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET /user/wishlist ────────────────────────────────────────────────────────

exports.getWishlist = async (req, res) => {
  try {
    const customer = await Customer.findById(req.user._id)
      .populate({
        path: 'wishlist',
        select: 'name slug price oldPrice discount images flavors sizes category bestSeller rewardPoints',
      })
      .select('wishlist');

    if (!customer) return res.status(404).json({ success: false, message: 'User not found.' });
    return res.status(200).json({ success: true, data: customer.wishlist });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── POST /user/wishlist ───────────────────────────────────────────────────────

exports.addToWishlist = async (req, res) => {
  try {
    const { productId } = req.body;
    if (!productId) return res.status(400).json({ success: false, message: 'productId is required.' });

    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found.' });

    const customer = await Customer.findByIdAndUpdate(
      req.user._id,
      { $addToSet: { wishlist: productId } }, // addToSet prevents duplicates
      { new: true }
    ).select('wishlist');

    return res.status(200).json({ success: true, data: customer.wishlist });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── DELETE /user/wishlist/:productId ─────────────────────────────────────────

exports.removeFromWishlist = async (req, res) => {
  try {
    const { productId } = req.params;

    const customer = await Customer.findByIdAndUpdate(
      req.user._id,
      { $pull: { wishlist: productId } },
      { new: true }
    ).select('wishlist');

    return res.status(200).json({ success: true, data: customer.wishlist });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET /user/addresses ───────────────────────────────────────────────────────

exports.getAddresses = async (req, res) => {
  try {
    const customer = await Customer.findById(req.user._id).select('addresses');
    if (!customer) return res.status(404).json({ success: false, message: 'User not found.' });
    return res.status(200).json({ success: true, data: customer.addresses });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── POST /user/address ────────────────────────────────────────────────────────

exports.addAddress = async (req, res) => {
  try {
    const { label, name, phone, house, street, city, state, pin, landmark, isDefault } = req.body;

    if (!name || !phone || !house || !city || !state || !pin) {
      return res.status(400).json({ success: false, message: 'name, phone, house, city, state, and pin are required.' });
    }

    const customer = await Customer.findById(req.user._id).select('addresses');
    if (!customer) return res.status(404).json({ success: false, message: 'User not found.' });

    // If this address is set as default, clear default from others
    if (isDefault) {
      customer.addresses.forEach((addr) => { addr.isDefault = false; });
    }

    customer.addresses.push({ label, name, phone, house, street, city, state, pin, landmark, isDefault: !!isDefault });
    await customer.save();

    return res.status(201).json({ success: true, data: customer.addresses });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── PUT /user/address/:id ─────────────────────────────────────────────────────

exports.updateAddress = async (req, res) => {
  try {
    const customer = await Customer.findById(req.user._id).select('addresses');
    if (!customer) return res.status(404).json({ success: false, message: 'User not found.' });

    const addr = customer.addresses.id(req.params.id);
    if (!addr) return res.status(404).json({ success: false, message: 'Address not found.' });

    const fields = ['label', 'name', 'phone', 'house', 'street', 'city', 'state', 'pin', 'landmark', 'isDefault'];
    fields.forEach((key) => {
      if (req.body[key] !== undefined) addr[key] = req.body[key];
    });

    // If setting this as default, clear others
    if (req.body.isDefault) {
      customer.addresses.forEach((a) => { if (String(a._id) !== req.params.id) a.isDefault = false; });
    }

    await customer.save();
    return res.status(200).json({ success: true, data: customer.addresses });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── DELETE /user/address/:id ──────────────────────────────────────────────────

exports.deleteAddress = async (req, res) => {
  try {
    const customer = await Customer.findById(req.user._id).select('addresses');
    if (!customer) return res.status(404).json({ success: false, message: 'User not found.' });

    const addr = customer.addresses.id(req.params.id);
    if (!addr) return res.status(404).json({ success: false, message: 'Address not found.' });

    addr.deleteOne();
    await customer.save();

    return res.status(200).json({ success: true, data: customer.addresses });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── PUT /user/address/:id/default ─────────────────────────────────────────────

exports.setDefaultAddress = async (req, res) => {
  try {
    const customer = await Customer.findById(req.user._id).select('addresses');
    if (!customer) return res.status(404).json({ success: false, message: 'User not found.' });

    const addr = customer.addresses.id(req.params.id);
    if (!addr) return res.status(404).json({ success: false, message: 'Address not found.' });

    customer.addresses.forEach((a) => { a.isDefault = String(a._id) === req.params.id; });
    await customer.save();

    return res.status(200).json({ success: true, data: customer.addresses });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET /user/rewards ─────────────────────────────────────────────────────────

/**
 * Rewards are NOT active yet.
 * This endpoint returns the "Coming Soon" state.
 * When the rewards system is activated (REWARDS_ENABLED=true in .env),
 * swap this out to return actual points + transaction history.
 */
exports.getRewards = async (req, res) => {
  const REWARDS_ENABLED = process.env.REWARDS_ENABLED === 'true';

  if (!REWARDS_ENABLED) {
    return res.status(200).json({
      success: true,
      status: 'coming_soon',
      message: 'Rewards program is coming soon!',
      points: 0,
      transactions: [],
    });
  }

  // Future: fetch from RewardTransaction collection
  try {
    const customer = await Customer.findById(req.user._id).select('rewardPoints');
    return res.status(200).json({
      success: true,
      status: 'active',
      points: customer.rewardPoints,
      transactions: [], // TODO: populate from RewardTransaction model
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
