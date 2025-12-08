const mongoose = require('mongoose');

const securityFlagJsonSchema = {
    ipAddress: {
        type: String,
        required: true,
        trim: true
    },
    riskLevel: {
        type: Number,
        required: true,
        min: 1,
        max: 5
    },
    dateTime: {
        type: Date,
        default: Date.now,
        required: true
    },
    description: {
        type: String,
        required: true,
        trim: true
    },
    fileName: {
        type: String,
        required: true,
        trim: true
    },
    userAgent: {
        type: String,
        required: false,
        trim: true
    },
    sessionToken: {
        type: String,
        required: false,
        trim: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: false,
        ref: 'user'
    },
    quartzUserId: {
        type: mongoose.Schema.Types.ObjectId,
        required: false,
        ref: 'QuartzForumAccount'
    },
    implementationKey: {
        type: String,
        required: false,
        trim: true
    },
    requestMethod: {
        type: String,
        required: false,
        trim: true
    },
    requestUrl: {
        type: String,
        required: false,
        trim: true
    },
    requestHeaders: {
        type: Object,
        required: false,
        default: {}
    },
    additionalData: {
        type: Object,
        required: false,
        default: {}
    },
    resolved: {
        type: Boolean,
        default: false
    },
    resolvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        required: false,
        ref: 'user'
    },
    resolvedAt: {
        type: Date,
        required: false
    },
    resolvedNotes: {
        type: String,
        required: false,
        trim: true
    }
};

module.exports = {
    securityFlagJsonSchema
};