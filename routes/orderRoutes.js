const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const Order = require('../models/Order');
const Product = require('../models/Product');
const { protect, admin } = require('../middleware/authMiddleware');

// 1. CREATE A PENDING ORDER (Triggered from Frontend before WhatsApp opens)
router.post('/', async (req, res) => {
    try {
        const { customerDetails, products } = req.body;

        if (!customerDetails || !customerDetails.name || !customerDetails.phone || !customerDetails.email || !customerDetails.address) {
            return res.status(400).json({ success: false, message: 'Missing required customer details' });
        }

        if (!Array.isArray(products) || products.length === 0) {
            return res.status(400).json({ success: false, message: 'Order must contain at least one product' });
        }

        const orderId = `LR-${Date.now()}-${crypto.randomInt(1000, 9999)}`;
        let totalAmount = 0;
        const sanitizedProducts = [];

        for (const item of products) {
            if (!item.productId || !item.quantity || Number(item.quantity) <= 0) {
                return res.status(400).json({ success: false, message: 'Invalid order item payload' });
            }

            const product = await Product.findById(item.productId);
            if (!product) {
                return res.status(404).json({ success: false, message: `Product not found: ${item.productId}` });
            }

            const qty = Number(item.quantity);
            const sizeMatch = item.weight
                ? product.sizes.find((size) => size.weight === item.weight)
                : null;
            const unitPrice = sizeMatch ? Number(sizeMatch.price) : Number(product.price);

            totalAmount += unitPrice * qty;
            sanitizedProducts.push({
                productId: product._id,
                name: product.name,
                flavor: item.flavor || 'Default',
                weight: item.weight || '',
                quantity: qty,
                price: unitPrice
            });
        }

        const newOrder = new Order({
            orderId,
            customerDetails,
            products: sanitizedProducts,
            totalAmount,
            status: 'pending' // Defaults to pending until Admin confirms
        });

        await newOrder.save();
        res.status(201).json({ success: true, data: newOrder });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 2. GET ALL ORDERS (For the Admin Dashboard)
router.get('/', protect, admin, async (req, res) => {
    try {
        const orders = await Order.find().sort({ createdAt: -1 });
        res.status(200).json({ success: true, data: orders });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 3. CONFIRM ORDER & DEDUCT VARIANT STOCK (Admin Action)
router.put('/:id/confirm', protect, admin, async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);

        if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
        if (order.status !== 'pending') return res.status(400).json({ success: false, message: `Order is already ${order.status}` });

        // Iterate through products to check and deduct specific variant stock
        for (let item of order.products) {
            const product = await Product.findById(item.productId);
            if (!product) continue;

            // Find the exact variant by flavor and weight
            const variant = product.variants.find(v => v.flavor === item.flavor && v.weight === item.weight);

            if (variant) {
                // Prevent overselling!
                if (variant.availableStock < item.quantity) {
                    return res.status(400).json({
                        success: false,
                        message: `Insufficient stock for ${product.name} (${item.flavor} ${item.weight || ''}). Available: ${variant.availableStock}`
                    });
                }
                // Deduct stock
                variant.availableStock -= item.quantity;
            } else {
                // Fallback to global stock if variants aren't fully populated yet
                if (product.stockLeft < item.quantity) {
                    return res.status(400).json({ success: false, message: `Insufficient global stock for ${product.name}` });
                }
                product.stockLeft -= item.quantity;
            }

            // Analytics metrics: confirmed conversion + realized revenue
            product.confirmedSales = Number(product.confirmedSales || 0) + Number(item.quantity || 0);
            product.confirmedRevenue = Number(product.confirmedRevenue || 0) + (Number(item.price || 0) * Number(item.quantity || 0));

            await product.save();
        }

        // Mark as confirmed
        order.status = 'confirmed';
        await order.save();

        res.status(200).json({ success: true, data: order });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 4. CANCEL ORDER (Admin Action)
router.put('/:id/cancel', protect, admin, async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

        // Cancelling doesn't change stock because it was never deducted while 'pending'
        order.status = 'cancelled';
        await order.save();

        res.status(200).json({ success: true, data: order });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
