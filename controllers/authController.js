/**
 * controllers/authController.js
 *
 * Passwordless OTP authentication for Living Result customers.
 *
 * Flow:
 *   POST /auth/send-otp   → generate & send 6-digit OTP via email or phone
 *   POST /auth/verify-otp → verify OTP → create/login user → issue JWT cookie
 *   POST /auth/logout     → clear JWT cookie
 *   GET  /auth/me         → return current user from JWT cookie
 */

const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const Customer = require('../models/User');
const OTP = require('../models/OTP');
const { sendOtp: deliverOtp } = require('../services/otpService');

// ── Constants ─────────────────────────────────────────────────────────────────

const OTP_LENGTH = 6;
const MAX_ATTEMPTS = 5;
const MAX_OTP_PER_HOUR = 5;

// ── Helpers ───────────────────────────────────────────────────────────────────

function generateOtpCode() {
  // Cryptographically random 6-digit OTP
  return String(crypto.randomInt(100000, 999999));
}

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

function normaliseIdentifier(identifier, type) {
  if (type === 'email') return identifier.toLowerCase().trim();
  return identifier.replace(/\D/g, '').slice(-10); // strip non-digits, keep last 10
}

// ── POST /auth/send-otp ───────────────────────────────────────────────────────

exports.sendOtp = async (req, res) => {
  try {
    const { identifier: rawIdentifier, type } = req.body;

    if (!rawIdentifier || !type || !['email', 'phone'].includes(type)) {
      return res.status(400).json({ success: false, message: 'identifier and type (email|phone) are required.' });
    }

    const identifier = normaliseIdentifier(rawIdentifier, type);

    if (type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier)) {
      return res.status(400).json({ success: false, message: 'Invalid email address.' });
    }
    if (type === 'phone' && !/^[6-9]\d{9}$/.test(identifier)) {
      return res.status(400).json({ success: false, message: 'Invalid Indian mobile number (10 digits, starts with 6-9).' });
    }

    // ── Rate limit: max 5 OTPs per hour ───────────────────────────────────────
    const existing = await OTP.findOne({ identifier, type });

    if (existing) {
      const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const withinWindow = existing.hourWindowStart > hourAgo;

      if (withinWindow && existing.hourlyCount >= MAX_OTP_PER_HOUR) {
        return res.status(429).json({
          success: false,
          message: 'Too many OTP requests. Please wait before trying again.',
        });
      }

      // Delete old OTP — new one invalidates old ones
      await OTP.deleteMany({ identifier, type });
    }

    // ── Generate OTP ──────────────────────────────────────────────────────────
    const otpCode = generateOtpCode();
    const hashedOtp = await bcrypt.hash(otpCode, 10);

    const hourlyCount = existing
      ? (existing.hourWindowStart > new Date(Date.now() - 60 * 60 * 1000)
          ? existing.hourlyCount + 1
          : 1)
      : 1;

    await OTP.create({
      identifier,
      type,
      hashedOtp,
      attempts: 0,
      hourlyCount,
      hourWindowStart: existing?.hourWindowStart && existing.hourWindowStart > new Date(Date.now() - 60 * 60 * 1000)
        ? existing.hourWindowStart
        : new Date(),
      createdAt: new Date(),
    });

    // ── Deliver OTP ───────────────────────────────────────────────────────────
    try {
      await deliverOtp(type, identifier, otpCode);
    } catch (deliveryErr) {
      // Clean up created OTP doc on delivery failure
      await OTP.deleteMany({ identifier, type });
      console.error('[authController] OTP delivery failed:', deliveryErr.message);
      return res.status(502).json({ success: false, message: deliveryErr.message });
    }

    const response = { success: true, message: `OTP sent to your ${type}.` };

    // In development, expose the OTP in the response for easy testing
    if (process.env.NODE_ENV !== 'production') {
      response.devOtp = otpCode;
    }

    return res.status(200).json(response);

  } catch (err) {
    console.error('[authController] sendOtp error:', err);
    return res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
};

// ── POST /auth/verify-otp ─────────────────────────────────────────────────────

exports.verifyOtp = async (req, res) => {
  try {
    const { identifier: rawIdentifier, type, otp, name } = req.body;

    if (!rawIdentifier || !type || !otp) {
      return res.status(400).json({ success: false, message: 'identifier, type, and otp are required.' });
    }
    if (String(otp).length !== OTP_LENGTH) {
      return res.status(400).json({ success: false, message: 'OTP must be 6 digits.' });
    }

    const identifier = normaliseIdentifier(rawIdentifier, type);

    // ── Find OTP record ───────────────────────────────────────────────────────
    const otpRecord = await OTP.findOne({ identifier, type });

    if (!otpRecord) {
      return res.status(400).json({ success: false, message: 'OTP expired or not found. Please request a new one.' });
    }

    // ── Max attempts check ────────────────────────────────────────────────────
    if (otpRecord.attempts >= MAX_ATTEMPTS) {
      await OTP.deleteMany({ identifier, type });
      return res.status(429).json({
        success: false,
        message: 'Too many incorrect attempts. Please request a new OTP.',
      });
    }

    // ── Verify OTP ────────────────────────────────────────────────────────────
    const isMatch = await bcrypt.compare(String(otp), otpRecord.hashedOtp);

    if (!isMatch) {
      await OTP.findByIdAndUpdate(otpRecord._id, { $inc: { attempts: 1 } });
      const remaining = MAX_ATTEMPTS - (otpRecord.attempts + 1);
      return res.status(400).json({
        success: false,
        message: `Incorrect code. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.`,
      });
    }

    // ── OTP verified — delete it ───────────────────────────────────────────────
    await OTP.deleteMany({ identifier, type });

    // ── Find or create Customer ───────────────────────────────────────────────
    const query = type === 'email' ? { email: identifier } : { phone: identifier };
    let customer = await Customer.findOne(query);
    let isNewUser = false;

    if (!customer) {
      if (!name || !name.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Name is required to create a new account.',
        });
      }

      customer = await Customer.create({
        name: name.trim(),
        ...(type === 'email' ? { email: identifier, isEmailVerified: true } : {}),
        ...(type === 'phone' ? { phone: identifier, isPhoneVerified: true } : {}),
      });
      isNewUser = true;
    } else {
      // Update verified status
      const update = type === 'email' ? { isEmailVerified: true } : { isPhoneVerified: true };
      await Customer.findByIdAndUpdate(customer._id, update);
      customer.isEmailVerified = type === 'email' ? true : customer.isEmailVerified;
      customer.isPhoneVerified = type === 'phone' ? true : customer.isPhoneVerified;
    }

    // ── Issue JWT ─────────────────────────────────────────────────────────────
    const token = generateToken(customer._id);
    res.cookie('token', token, buildCookieOptions());

    return res.status(200).json({
      success: true,
      isNewUser,
      data: {
        _id: customer._id,
        name: customer.name,
        email: customer.email || null,
        phone: customer.phone || null,
        role: customer.role,
        rewardPoints: customer.rewardPoints,
        wishlist: customer.wishlist,
        addresses: customer.addresses,
        profileImage: customer.profileImage,
        isEmailVerified: customer.isEmailVerified,
        isPhoneVerified: customer.isPhoneVerified,
      },
    });

  } catch (err) {
    console.error('[authController] verifyOtp error:', err);
    return res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
};

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
    const customer = await Customer.findById(req.user._id).select('-__v');
    if (!customer) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    return res.status(200).json({ success: true, data: customer });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ── Legacy admin login (password-based) — kept for admin panel ────────────────
// Admin login is intentionally kept separate from customer OTP flow.

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
