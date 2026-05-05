const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const cartRoutes = require('./routes/cartRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const settingRoutes = require('./routes/settingRoutes');
const orderRoutes = require('./routes/orderRoutes');

const Product = require('./models/Product');
const Order = require('./models/Order');
const { protect, admin } = require('./middleware/authMiddleware');

const app = express();

const allowedOrigins = [
  'http://localhost:5500',
  'http://127.0.0.1:5500',
  process.env.FRONTEND_URL || 'https://living-resultm.vercel.app'
];

app.use(helmet());
app.use(express.json({ limit: '1mb' }));
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const durationMs = Date.now() - start;
    console.info(
      JSON.stringify({
        level: 'info',
        method: req.method,
        path: req.originalUrl,
        statusCode: res.statusCode,
        durationMs
      })
    );
  });
  next();
});
app.use(cors({
  origin: (origin, callback) => {
    const isLocalhostWithAnyPort = /^https?:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin || '');
    if (!origin || origin === 'null' || allowedOrigins.includes(origin) || isLocalhostWithAnyPort) {
      return callback(null, true);
    }
    return callback(new Error('CORS: Origin not allowed'));
  },
  credentials: true
}));
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false
}));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: 'Too many login attempts. Try again later.' },
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/settings', settingRoutes);
app.use('/api/orders', orderRoutes);

// Dedicated route for resetting analytics and orders
app.delete('/api/admin/reset-data', protect, admin, async (req, res) => {
  try {
    await Product.updateMany({}, { $set: { viewCount: 0, confirmedSales: 0, confirmedRevenue: 0 } });
    await Order.deleteMany({});
    res.status(200).json({ success: true, message: 'Analytics and Orders reset successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.use((err, req, res, _next) => {
  console.error("Global Error Handler:", err.stack);
  res.status(500).json({ success: false, message: err.message || 'Server Error' });
});

module.exports = app;
