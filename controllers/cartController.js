const Cart = require('../models/Cart');

// @desc    Get user cart
// @route   GET /api/cart
exports.getCart = async (req, res) => {
  try {
    let cart = await Cart.findOne({ userId: req.user.id }).populate('items.productId');
    if (!cart) {
      cart = await Cart.create({ userId: req.user.id, items: [] });
    }
    res.status(200).json({ success: true, data: cart });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Add item to cart
// @route   POST /api/cart
exports.addToCart = async (req, res) => {
  try {
    const { productId, flavorIndex, quantity } = req.body;

    let cart = await Cart.findOne({ userId: req.user.id });

    if (!cart) {
      cart = await Cart.create({ userId: req.user.id, items: [] });
    }

    // Check if item exists in cart with same flavor
    const itemIndex = cart.items.findIndex(
      (item) => item.productId.toString() === productId && item.flavorIndex === flavorIndex
    );

    if (itemIndex > -1) {
      cart.items[itemIndex].quantity += quantity || 1;
    } else {
      cart.items.push({ productId, flavorIndex, quantity: quantity || 1 });
    }

    await cart.save();
    cart = await Cart.findOne({ userId: req.user.id }).populate('items.productId');
    
    res.status(200).json({ success: true, data: cart });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update cart item quantity
// @route   PUT /api/cart/:productId/:flavorIndex
exports.updateCartItem = async (req, res) => {
  try {
    const { quantity } = req.body;
    const { productId, flavorIndex } = req.params;

    let cart = await Cart.findOne({ userId: req.user.id });
    if (!cart) return res.status(404).json({ success: false, message: 'Cart not found' });

    const itemIndex = cart.items.findIndex(
      (item) => item.productId.toString() === productId && item.flavorIndex.toString() === flavorIndex
    );

    if (itemIndex > -1) {
      if (quantity <= 0) {
        cart.items.splice(itemIndex, 1);
      } else {
        cart.items[itemIndex].quantity = quantity;
      }
      await cart.save();
      cart = await Cart.findOne({ userId: req.user.id }).populate('items.productId');
      res.status(200).json({ success: true, data: cart });
    } else {
      res.status(404).json({ success: false, message: 'Item not found in cart' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Remove item from cart
// @route   DELETE /api/cart/:productId/:flavorIndex
exports.removeFromCart = async (req, res) => {
  try {
    const { productId, flavorIndex } = req.params;

    let cart = await Cart.findOne({ userId: req.user.id });
    if (!cart) return res.status(404).json({ success: false, message: 'Cart not found' });

    cart.items = cart.items.filter(
      (item) => !(item.productId.toString() === productId && item.flavorIndex.toString() === flavorIndex)
    );

    await cart.save();
    cart = await Cart.findOne({ userId: req.user.id }).populate('items.productId');
    
    res.status(200).json({ success: true, data: cart });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
