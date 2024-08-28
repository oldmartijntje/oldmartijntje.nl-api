const { Schema } = require("mongoose");
const settings = require('../settings.json');

const sessionTokenJsonSchema = {
    userId: {
        type: Schema.Types.ObjectId,
        required: true,
        description: "'userId' is required and must be a valid ObjectId",
    },
    // expireAt: { type: Date, expires: sessiontokenExpireTime, default: Date.now }, for some reason this makes it expire in a minute.
    expirationDate: {
        type: Date,
        required: true,
        description: "'expirationDate' is required and is a date",
        index: { expires: 10080 } // 10080 minutes = 7 days
    }
};

module.exports = {
    sessionTokenJsonSchema: sessionTokenJsonSchema
};