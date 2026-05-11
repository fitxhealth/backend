const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const Order = require('../models/Order');
const Product = require('../models/Product');
const Combo = require('../models/Combo');
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
            if (!item.quantity || Number(item.quantity) <= 0) {
                return res.status(400).json({ success: false, message: 'Invalid order item payload' });
            }

            const qty = Number(item.quantity);
            
            if (item.isCombo && item.comboId) {
                const combo = await Combo.findById(item.comboId);
                if (!combo) {
                    return res.status(404).json({ success: false, message: `Combo not found: ${item.comboId}` });
                }
                
                // SECURE COMBO PRICING: Calculate price on the backend
                let comboPrice = 0;
                if (combo.manualOverridePrice) {
                    comboPrice = combo.manualOverridePrice;
                } else {
                    // Auto-calculate based on DB products
                    for (let cProduct of combo.products) {
                        const dbProd = await Product.findById(cProduct.productId);
                        if (dbProd) {
                            const basePrice = dbProd.sizes && dbProd.sizes.length > 0 ? dbProd.sizes[0].price : dbProd.price;
                            comboPrice += basePrice * cProduct.quantity;
                        }
                    }
                }
                
                totalAmount += comboPrice * qty;
                sanitizedProducts.push({
                    comboId: combo._id,
                    isCombo: true,
                    name: combo.comboName,
                    flavor: item.flavor || 'Premium Bundle',
                    comboSelections: item.comboSelections || [],
                    weight: item.weight || '',
                    quantity: qty,
                    price: comboPrice
                });
            } else if (item.productId) {
                const product = await Product.findById(item.productId);
                if (!product) {
                    return res.status(404).json({ success: false, message: `Product not found: ${item.productId}` });
                }
                
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
            } else {
                return res.status(400).json({ success: false, message: 'Invalid order item: Missing productId or comboId' });
            }
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

// GET RECENT CONFIRMED ORDERS (Public - For Social Proof)
router.get('/recent', async (req, res) => {
    try {
        const orders = await Order.find({ status: 'confirmed' })
            .sort({ updatedAt: -1 })
            .limit(8);
        
        const recentOrders = orders.map(o => {
            const firstName = o.customerDetails?.name?.split(' ')[0] || 'Someone';
            const productName = o.products && o.products.length > 0 ? o.products[0].name : 'some items';
            return `${firstName} just secured ${productName}`;
        });

        res.status(200).json({ success: true, data: recentOrders });
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
            if (item.isCombo && item.comboId) {
                // PHASE 2: INVENTORY SYNC FOR COMBOS
                const combo = await Combo.findById(item.comboId);
                if (combo) {
                    const itemsToDeduct = item.comboSelections && item.comboSelections.length > 0 
                        ? item.comboSelections 
                        : combo.products.map(p => ({ productId: p.productId, quantity: p.quantity, flavor: null }));

                    for (let cItem of itemsToDeduct) {
                        const product = await Product.findById(cItem.productId);
                        if (!product) continue;

                        const deductionQty = item.quantity * cItem.quantity;
                        
                        if (cItem.flavor) {
                            const variant = product.variants ? product.variants.find(v => v.flavor === cItem.flavor) : null;
                            if (variant && variant.availableStock !== undefined) {
                                if (variant.availableStock < deductionQty) {
                                    return res.status(400).json({ success: false, message: `Insufficient stock for combo item: ${product.name} (${cItem.flavor})` });
                                }
                                variant.availableStock -= deductionQty;
                            } else {
                                if (product.stockLeft < deductionQty) {
                                    return res.status(400).json({ success: false, message: `Insufficient global stock for combo item: ${product.name}` });
                                }
                                product.stockLeft -= deductionQty;
                            }
                        } else {
                            if (product.stockLeft < deductionQty) {
                                return res.status(400).json({ success: false, message: `Insufficient global stock for combo item: ${product.name}` });
                            }
                            product.stockLeft -= deductionQty;
                        }
                        product.confirmedSales = Number(product.confirmedSales || 0) + deductionQty;
                        await product.save();
                    }
                }
            } else if (item.productId) {
                // STANDARD PRODUCT INVENTORY SYNC
                const product = await Product.findById(item.productId);
                if (!product) continue;

                // Find the exact variant by flavor and weight (Safeguard against undefined variants array)
                const variant = product.variants ? product.variants.find(v => v.flavor === item.flavor && v.weight === item.weight) : null;

                if (variant && variant.availableStock !== undefined) {
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
