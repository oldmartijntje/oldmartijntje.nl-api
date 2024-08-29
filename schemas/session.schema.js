const { Schema } = require("mongoose");

const sessionJsonSchema = {
    ipAddress: {
        type: String,
        required: true,
    },
    calls: {
        type: Number,
        required: true,
        default: 1,
    },
    firstCall: {
        type: Date,
        required: true,
        default: Date.now,
    },
    lastCall: {
        type: Date,
        required: true,
        default: Date.now,
    },
    rateLimitedAt: {
        type: Date,
        required: false,
        index: { expires: '24h' }, // Automatically remove the document after 24 hours
    }
}

module.exports = {
    sessionJsonSchema: sessionJsonSchema,
};