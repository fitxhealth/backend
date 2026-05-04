const jwt = require('jsonwebtoken');
const User = require('../models/User');

const getCookieToken = (cookieHeader) => {
  if (!cookieHeader) return null;
  const cookies = cookieHeader.split(';');
  for (const cookie of cookies) {
    const [name, ...rest] = cookie.trim().split('=');
    if (name === 'token') {
      return decodeURIComponent(rest.join('='));
    }
  }
  return null;
};

exports.protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    token = getCookieToken(req.headers.cookie);
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized, no token' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-password');
    return next();
  } catch (error) {
    console.error(error);
    return res.status(401).json({ success: false, message: 'Not authorized, token failed' });
  }
};

exports.admin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Not authorized, no user context' });
  }

  const allowlistedAdmins = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  const isAllowlistedAdmin = req.user.email && allowlistedAdmins.includes(req.user.email.toLowerCase());

  if (req.user.role !== 'admin' && !isAllowlistedAdmin) {
    return res.status(403).json({ success: false, message: 'Admin access required' });
  }

  next();
};
