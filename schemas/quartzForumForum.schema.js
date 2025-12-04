const mongoose = require('mongoose');

const quartzForumForumJsonSchema = {
    implementationKey: {
        type: String,
        required: true,
        trim: true
    },
    subpage: {
        type: String,
        required: true,
        trim: true
    },
    lastPush: {
        type: Date,
        default: Date.now
    }
};

module.exports = {
    quartzForumForumJsonSchema
};