const express = require('express');
const router = express.Router();
const { getCombos, createCombo, deleteCombo, updateCombo } = require('../controllers/comboController');
const { protect, admin } = require('../middleware/authMiddleware');

router.route('/')
    .get(getCombos)
    .post(protect, admin, createCombo);
router.route('/:id')
    .put(protect, admin, updateCombo)
    .delete(protect, admin, deleteCombo);

module.exports = router;