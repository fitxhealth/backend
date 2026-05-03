const Setting = require('../models/Setting');

// @desc    Get all settings
// @route   GET /api/settings
// @access  Public
exports.getSettings = async (req, res) => {
    try {
        const settingsArray = await Setting.find({});
        // Convert array to a key-value object for easier frontend use
        const settingsObject = settingsArray.reduce((acc, setting) => {
            acc[setting.key] = setting.value;
            return acc;
        }, {});
        res.status(200).json({ success: true, data: settingsObject });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @desc    Update settings
// @route   PUT /api/settings
// @access  Private (Admin)
exports.updateSettings = async (req, res) => {
    try {
        const { noticeStrip } = req.body;

        // Use findOneAndUpdate with upsert:true to create if it doesn't exist
        await Setting.findOneAndUpdate({ key: 'noticeStrip' }, { key: 'noticeStrip', value: noticeStrip }, { upsert: true });
        res.status(200).json({ success: true, message: 'Settings updated successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @desc    Get site version for polling
// @route   GET /api/settings/version
// @access  Public
exports.getSiteVersion = async (req, res) => {
    try {
        const versionSetting = await Setting.findOne({ key: 'siteVersion' });
        const version = versionSetting ? versionSetting.value : 1;
        res.status(200).json({ success: true, version });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @desc    Increment site version (Forces refresh for all users)
// @route   PUT /api/settings/version/increment
// @access  Private (Admin)
exports.incrementSiteVersion = async (req, res) => {
    try {
        const versionSetting = await Setting.findOne({ key: 'siteVersion' });
        let newVersion = 2;
        if (versionSetting) {
            newVersion = Number(versionSetting.value) + 1;
        }
        await Setting.findOneAndUpdate({ key: 'siteVersion' }, { key: 'siteVersion', value: newVersion }, { upsert: true });
        res.status(200).json({ success: true, message: 'Site version incremented', newVersion });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};