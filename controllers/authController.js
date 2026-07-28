/**
 * controllers/authController.js
 *
 * Authentication for FitX Health Admin.
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const Customer = require('../models/User'); // Model is still named 'Customer' inside mongoose, but serves as User/Admin

// ── Helpers ───────────────────────────────────────────────────────────────────

function generateToken(id) {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
}

function buildCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  };
}

// ── POST /auth/logout ─────────────────────────────────────────────────────────

exports.logout = async (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  });
  return res.status(200).json({ success: true, message: 'Logged out.' });
};

// ── GET /auth/me ──────────────────────────────────────────────────────────────

exports.getMe = async (req, res) => {
  try {
    const user = await Customer.findById(req.user._id).select('-password -__v');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    return res.status(200).json({ success: true, data: user });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ── POST /auth/login (Admin Login) ────────────────────────────────────────────

exports.adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const user = await Customer.findOne({ email, role: 'admin' });
    if (!user || !user.password) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    const token = generateToken(user._id);
    res.cookie('token', token, buildCookieOptions());

    return res.status(200).json({
      success: true,
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
