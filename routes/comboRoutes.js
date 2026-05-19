const express = require('express');
const router = express.Router();
const { getCombos, createCombo, deleteCombo, updateCombo, getComboBySlug } = require('../controllers/comboController');
const { protect, admin } = require('../middleware/authMiddleware');

router.route('/')
    .get(getCombos)
    .post(protect, admin, createCombo);

// IMPORTANT: /slug/:slug must come BEFORE /:id to avoid :id catching "slug"
router.route('/slug/:slug')
    .get(getComboBySlug);

router.route('/:id')
    .put(protect, admin, updateCombo)
    .delete(protect, admin, deleteCombo);

module.exports = router;