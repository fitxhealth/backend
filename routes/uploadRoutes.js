const express = require('express');
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;
const { protect, admin } = require('../middleware/authMiddleware');
const router = express.Router();

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'living-result',
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp']
    }
});

const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (!allowedMimeTypes.includes(file.mimetype)) {
            return cb(new Error('Unsupported file type. Upload jpg, png, or webp only.'));
        }
        return cb(null, true);
    }
});

// @route   POST /api/upload
// @desc    Upload an image file
router.post('/', protect, admin, upload.single('image'), (req, res) => {
    if (!req.file) return res.status(400).json({ success: false, message: 'No image uploaded' });
    res.json({ success: true, imageUrl: req.file.path });
});

module.exports = router;