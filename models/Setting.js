const mongoose = require('mongoose');

const SettingSchema = new mongoose.Schema({
    key: {
        type: String,
        required: true,
        unique: true,
        enum: ['noticeStrip', 'siteVersion', 'isLaunched', 'fomo'] // For site launch control and FOMO
    },
    value: {
        type: mongoose.Schema.Types.Mixed,
        required: true
    }
});

module.exports = mongoose.model('Setting', SettingSchema);