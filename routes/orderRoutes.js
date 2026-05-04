const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Product = require('../models/Product');

// 1. CREATE A PENDING ORDER (Triggered from Frontend before WhatsApp opens)
router.post('/', async (req, res) => {
    try {
        const { customerDetails, products, totalAmount } = req.body;

        // Generate a clean, readable Order ID (e.g., LR-104938)
        const orderId = 'LR-' + Math.floor(100000 + Math.random() * 900000);

        const newOrder = new Order({
            orderId,
            customerDetails,
            products,
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
router.get('/', async (req, res) => {
    try {
        const orders = await Order.find().sort({ createdAt: -1 });
        res.status(200).json({ success: true, data: orders });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 3. CONFIRM ORDER & DEDUCT VARIANT STOCK (Admin Action)
router.put('/:id/confirm', async (req, res) => {
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
router.put('/:id/cancel', async (req, res) => {
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
