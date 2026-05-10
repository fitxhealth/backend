const Combo = require('../models/Combo');
const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Helper to safely extract grams from weight strings like "1 kg" or "500 g"
const parseWeightToGrams = (weightStr) => {
    if (!weightStr) return 0;
    const kgMatch = weightStr.match(/([\d.]+)\s*kg/i);
    if (kgMatch) return parseFloat(kgMatch[1]) * 1000;
    const gMatch = weightStr.match(/([\d.]+)\s*g/i);
    if (gMatch) return parseFloat(gMatch[1]);
    return 0;
};

// @desc    Get all combos (Auto-calculates pricing dynamically)
// @route   GET /api/combos
exports.getCombos = async (req, res) => {
    try {
        // Manually decode the token since this is a public route
        let isAdmin = false;
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            try {
                const token = req.headers.authorization.split(' ')[1];
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                const user = await User.findById(decoded.id).select('role');
                if (user && user.role === 'admin') isAdmin = true;
            } catch (err) {
                // Ignore invalid tokens, treat as public user
            }
        }
        
        const filter = isAdmin ? {} : { isPublished: true };

        const combos = await Combo.find(filter).populate('products.productId');

        // Map and dynamically calculate real-time savings/prices based on current product data
        const enrichedCombos = combos.map(combo => {
            let autoMrp = 0;
            let autoPrice = 0;
            let totalGrams = 0;
            const validProducts = [];

            combo.products.forEach(p => {
                if (p.productId) {
                    const prod = p.productId;
                    const qty = p.quantity;
                    
                    // Grab the default size price/weight, or fallback to global product price
                    const basePrice = prod.sizes && prod.sizes.length > 0 ? prod.sizes[0].price : prod.price;
                    const oldPrice = prod.sizes && prod.sizes.length > 0 && prod.sizes[0].oldPrice ? prod.sizes[0].oldPrice : (prod.oldPrice || basePrice);
                    const weightStr = prod.sizes && prod.sizes.length > 0 ? prod.sizes[0].weight : (prod.weight || '');

                    autoMrp += oldPrice * qty;
                    autoPrice += basePrice * qty;
                    totalGrams += parseWeightToGrams(weightStr) * qty;

                    validProducts.push({
                        _id: prod._id,
                        name: prod.name,
                        quantity: qty,
                        image: prod.flavors && prod.flavors.length > 0 ? prod.flavors[0].image : '',
                        price: basePrice
                    });
                }
            });

            const finalPrice = combo.manualOverridePrice ? combo.manualOverridePrice : autoPrice;
            const totalSavings = autoMrp - finalPrice;
            const displayWeight = totalGrams >= 1000 ? `${(totalGrams / 1000).toFixed(2)}kg` : `${totalGrams}g`;

            return {
                _id: combo._id,
                comboName: combo.comboName,
                comboSlug: combo.comboSlug,
                description: combo.description,
                comboBanner: combo.comboBanner,
                isPublished: combo.isPublished,
                products: validProducts,
                autoCalculatedMrp: autoMrp,
                autoCalculatedPrice: autoPrice,
                manualOverridePrice: combo.manualOverridePrice,
                finalPrice: finalPrice > 0 ? finalPrice : autoPrice,
                totalSavings: totalSavings,
                totalWeight: { grams: totalGrams, display: displayWeight },
                sizes: combo.sizes || [],
                images: combo.images || [],
                flavors: combo.flavors || []
            };
        });

        res.status(200).json({ success: true, data: enrichedCombos });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Create a combo (Admin)
// @route   POST /api/combos
exports.createCombo = async (req, res) => {
    try {
        const combo = await Combo.create(req.body);
        res.status(201).json({ success: true, data: combo });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// @desc    Update a combo (Admin)
// @route   PUT /api/combos/:id
exports.updateCombo = async (req, res) => {
    try {
        const combo = await Combo.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });
        if (!combo) return res.status(404).json({ success: false, message: 'Combo not found' });
        res.status(200).json({ success: true, data: combo });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// @desc    Delete a combo (Admin)
// @route   DELETE /api/combos/:id
exports.deleteCombo = async (req, res) => {
    try {
        const combo = await Combo.findByIdAndDelete(req.params.id);
        if (!combo) return res.status(404).json({ success: false, message: 'Combo not found' });
        res.status(200).json({ success: true, data: {} });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};