const mongoose = require('mongoose');

const quartzForumAccountJsonSchema = {
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    password: {
        type: String,
        required: true
    },
    accessKey: {
        type: String,
        required: true,
        unique: true
    },
    profileDesign: {
        type: Object,
        default: {}
    },
    lastUsage: {
        type: Date,
        default: Date.now
    },
    limbo: {
        type: Boolean,
        default: false
    },
    admin: {
        type: Boolean,
        default: false
    }
};

module.exports = {
    quartzForumAccountJsonSchema
};