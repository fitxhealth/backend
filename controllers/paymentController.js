const Razorpay = require('razorpay');
const crypto = require('crypto');
const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const Combo = require('../models/Combo');

const ensureRazorpayEnabled = (res) => {
  if (process.env.ENABLE_RAZORPAY !== 'true') {
    res.status(503).json({
      success: false,
      message: 'Online payment is currently disabled. Please use WhatsApp checkout.'
    });
    return false;
  }
  return true;
};

// Initialize Razorpay
const getRazorpayInstance = () => {
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
};

// @desc    Create Razorpay Order
// @route   POST /api/payment/create-order
exports.createOrder = async (req, res) => {
  try {
    if (!ensureRazorpayEnabled(res)) return;
    const { amount, items } = req.body;

    // SECURE PRICING: Calculate total on the backend
    let calculatedTotal = 0;
    const sanitizedProducts = [];

    if (Array.isArray(items)) {
      for (const item of items) {
        const qty = Number(item.quantity) || 1;
        
        if (item.isCombo && item.comboId) {
          const combo = await Combo.findById(item.comboId);
          if (combo) {
            let comboPrice = combo.manualOverridePrice || 0;
            if (!combo.manualOverridePrice) {
              for (let cProd of combo.products) {
                const dbProd = await Product.findById(cProd.productId);
                if (dbProd) {
                  const basePrice = dbProd.sizes?.length > 0 ? dbProd.sizes[0].price : dbProd.price;
                  comboPrice += basePrice * cProd.quantity;
                }
              }
            }
            calculatedTotal += comboPrice * qty;
            sanitizedProducts.push({ ...item, price: comboPrice });
          }
        } else if (item.productId) {
          const product = await Product.findById(item.productId);
          if (product) {
            const sizeMatch = item.weight ? product.sizes.find(s => s.weight === item.weight) : null;
            const unitPrice = sizeMatch ? Number(sizeMatch.price) : Number(product.price);
            calculatedTotal += unitPrice * qty;
            sanitizedProducts.push({ ...item, price: unitPrice });
          }
        }
      }
    }

    if (calculatedTotal <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid order items or amount' });
    }

    const instance = getRazorpayInstance();
    
    const options = {
      amount: calculatedTotal * 100, // Razorpay amount is in paise
      currency: 'INR',
      receipt: `receipt_order_${Date.now()}`,
    };

    const razorpayOrder = await instance.orders.create(options);

    if (!razorpayOrder) {
      return res.status(500).json({ success: false, message: 'Some error occurred with Razorpay' });
    }

    // Save initial pending order to DB using current Order model shape
    const newOrder = await Order.create({
      orderId: `RZP-${Date.now()}`,
      customerDetails: {
        name: req.body?.customerDetails?.name || req.user.name || 'Customer',
        phone: req.body?.customerDetails?.phone || 'N/A',
        email: req.body?.customerDetails?.email || 'N/A',
        address: req.body?.customerDetails?.address || 'N/A'
      },
      products: sanitizedProducts,
      totalAmount: calculatedTotal,
      status: 'pending'
    });

    res.status(200).json({
      success: true,
      data: {
        id: razorpayOrder.id,
        currency: razorpayOrder.currency,
        amount: razorpayOrder.amount,
        dbOrderId: newOrder._id
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Verify Razorpay Payment
// @route   POST /api/payment/verify
exports.verifyPayment = async (req, res) => {
  try {
    if (!ensureRazorpayEnabled(res)) return;
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, dbOrderId } = req.body;

    const sign = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(sign.toString())
      .digest('hex');

    if (razorpay_signature === expectedSign) {
      // Payment is verified
      // Update order status
      const order = await Order.findById(dbOrderId);
      if (order) {
        order.status = 'confirmed';
        order.paymentId = razorpay_payment_id;
        await order.save();

        // Clear user cart after successful payment
        let cart = await Cart.findOne({ userId: req.user.id });
        if (cart) {
          cart.items = [];
          await cart.save();
        }

        return res.status(200).json({ success: true, message: 'Payment verified successfully' });
      } else {
        return res.status(404).json({ success: false, message: 'Order not found in DB' });
      }
    } else {
      return res.status(400).json({ success: false, message: 'Invalid signature sent!' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get Razorpay Config
// @route   GET /api/payment/config
exports.getConfig = async (req, res) => {
  if (!ensureRazorpayEnabled(res)) return;
  res.status(200).json({ success: true, key: process.env.RAZORPAY_KEY_ID });
};
