const express = require('express');
const multer = require('multer');
const path = require('path');
const { protect } = require('../middleware/authMiddleware');
const router = express.Router();

const storage = multer.diskStorage({
    destination(req, file, cb) {
        cb(null, 'uploads/');
    },
    filename(req, file, cb) {
        cb(null, `img-${Date.now()}${path.extname(file.originalname)}`);
    }
});

const upload = multer({ storage });

// @route   POST /api/upload
// @desc    Upload an image file
router.post('/', protect, upload.single('image'), (req, res) => {
    if (!req.file) return res.status(400).json({ success: false, message: 'No image uploaded' });
    res.json({ success: true, imageUrl: `/uploads/${req.file.filename}` });
});

module.exports = router;