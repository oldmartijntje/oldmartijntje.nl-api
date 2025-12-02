const mongoose = require('mongoose');

const quartzForumMessageJsonSchema = {
    forumId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'QuartzForumForum'
    },
    accountId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'QuartzForumAccount',
        default: null
    },
    content: {
        type: String,
        required: true
    },
    limbo: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
};

module.exports = {
    quartzForumMessageJsonSchema
};