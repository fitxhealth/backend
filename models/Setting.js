const mongoose = require('mongoose');

const SettingSchema = new mongoose.Schema({
    key: {
        type: String,
        required: true,
        unique: true,
        enum: ['noticeStrip', 'siteVersion', 'isLaunched'] // Added isLaunched for investor launch
    },
    value: {
        type: mongoose.Schema.Types.Mixed,
        required: true
    }
});

module.exports = mongoose.model('Setting', SettingSchema);