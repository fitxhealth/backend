const Setting = require('../models/Setting');
const axios = require('axios');
const crypto = require('crypto');

// @desc    Get all settings
// @route   GET /api/settings
// @access  Private (Admin)
exports.getSettings = async (req, res) => {
    try {
        const settingsArray = await Setting.find({});
        // Convert array to a key-value object for easier frontend use
        const settingsObject = settingsArray.reduce((acc, setting) => {
            acc[setting.key] = setting.value;
            return acc;
        }, {});
        res.status(200).json({ success: true, data: settingsObject });
    } catch {
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @desc    Get safe public settings
// @route   GET /api/public/settings
// @access  Public
exports.getPublicSettings = async (req, res) => {
    try {
        const settingsArray = await Setting.find({ key: { $in: ['noticeStrip', 'isLaunched', 'fomo'] } });
        const settingsObject = settingsArray.reduce((acc, setting) => {
            acc[setting.key] = setting.value;
            return acc;
        }, {});
        
        // Ensure defaults if not present
        const safeData = {
            noticeStrip: settingsObject.noticeStrip || { enabled: false, text: '' },
            isLaunched: settingsObject.isLaunched !== undefined ? settingsObject.isLaunched : true,
            fomo: settingsObject.fomo || { socialProof: true, exitIntent: true, scarcity: true, timerDuration: 600 }
        };
        
        // Cache this endpoint for 15s to absorb massive traffic spikes.
        // Frontend polling for version updates every 15s means this is perfectly safe.
        res.set('Cache-Control', 'public, s-maxage=15, stale-while-revalidate=30');
        res.status(200).json({ success: true, data: safeData });
    } catch {
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};
// @desc    Update settings
// @route   PUT /api/settings
// @access  Private (Admin)
exports.updateSettings = async (req, res) => {
    try {
        const { noticeStrip, isLaunched, fomo } = req.body;

        if (noticeStrip) {
            if (typeof noticeStrip.text !== 'string' || typeof noticeStrip.enabled !== 'boolean' || noticeStrip.text.length > 200) {
                return res.status(400).json({ success: false, message: 'Invalid noticeStrip payload' });
            }
            await Setting.findOneAndUpdate({ key: 'noticeStrip' }, { key: 'noticeStrip', value: noticeStrip }, { upsert: true });
        }

        if (typeof isLaunched === 'boolean') {
            await Setting.findOneAndUpdate({ key: 'isLaunched' }, { key: 'isLaunched', value: isLaunched }, { upsert: true });
        }
        
        if (fomo) {
            await Setting.findOneAndUpdate({ key: 'fomo' }, { key: 'fomo', value: fomo }, { upsert: true });
        }

        res.status(200).json({ success: true, message: 'Settings updated successfully' });
    } catch {
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
        // Obfuscate the version to avoid leaking deployment cycle info (e.g. 87)
        const obfuscatedVersion = crypto.createHash('sha256').update(version.toString()).digest('hex').substring(0, 8);
        res.status(200).json({ success: true, version: obfuscatedVersion });
    } catch {
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
    } catch {
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @desc    Sync data to Google Sheets
// @route   POST /api/settings/sync-sheets
// @access  Private (Admin)
exports.syncSheetsToGoogle = async (req, res) => {
    try {
        const { googleWebAppUrl, payload } = req.body;
        if (!googleWebAppUrl) {
            return res.status(400).json({ success: false, message: 'Google Web App URL is required' });
        }
        if (!payload) {
            return res.status(400).json({ success: false, message: 'Payload is required' });
        }

        console.info('Forwarding sync request to Google Sheets via Axios...');
        const response = await axios.post(googleWebAppUrl, payload, {
            headers: {
                'Content-Type': 'application/json'
            }
        });

        res.status(200).json({ success: true, data: response.data });
    } catch (error) {
        console.error('Google Sheets sync error:', error.message || error);
        res.status(500).json({ 
            success: false, 
            message: 'Server Error during Google Sheets sync', 
            error: error.response ? error.response.data : error.message 
        });
    }
};