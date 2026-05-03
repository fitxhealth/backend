const express = require('express');
const router = express.Router();
const { getSettings, updateSettings, getSiteVersion, incrementSiteVersion } = require('../controllers/settingController');
const { protect } = require('../middleware/authMiddleware');

router.route('/version')
    .get(getSiteVersion);

router.route('/version/increment')
    .put(protect, incrementSiteVersion);

router.route('/')
    .get(getSettings)
    .put(protect, updateSettings);

module.exports = router;