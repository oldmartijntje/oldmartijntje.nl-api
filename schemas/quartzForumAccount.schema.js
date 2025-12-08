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
    design: {
        type: Object,
        default: {
            footer: ""
        }
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
    },
    lastMessagePost: {
        type: Date,
        required: false
    },
    lastDesignUpdate: {
        type: Date,
        required: false
    }
};

module.exports = {
    quartzForumAccountJsonSchema
};