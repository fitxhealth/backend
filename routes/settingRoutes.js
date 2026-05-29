const express = require('express');
const router = express.Router();
const { getSettings, updateSettings, getSiteVersion, incrementSiteVersion, syncSheetsToGoogle } = require('../controllers/settingController');
const { protect, admin } = require('../middleware/authMiddleware');

router.route('/version')
    .get(getSiteVersion);

router.route('/version/increment')
    .put(protect, admin, incrementSiteVersion);

router.route('/sync-sheets')
    .post(protect, admin, syncSheetsToGoogle);

router.route('/')
    .get(getSettings)
    .put(protect, admin, updateSettings);

module.exports = router;