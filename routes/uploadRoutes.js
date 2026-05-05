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
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif']
    }
});

const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (!allowedMimeTypes.includes(file.mimetype)) {
            return cb(new Error('Unsupported file type. Upload jpg, png, gif, or webp only.'));
        }
        return cb(null, true);
    }
});

// @route   POST /api/upload
// @desc    Upload an image file
router.post('/', protect, admin, (req, res) => {
    upload.single('image')(req, res, function (err) {
        if (err) {
            console.error("Upload Error:", err);
            const errorMsg = err.message || (err.error && err.error.message) || 'File upload failed. Check Cloudinary settings.';
            return res.status(400).json({ success: false, message: errorMsg });
        }
        if (!req.file) return res.status(400).json({ success: false, message: 'No image uploaded' });
        res.json({ success: true, imageUrl: req.file.path || req.file.secure_url });
    });
});

module.exports = router;