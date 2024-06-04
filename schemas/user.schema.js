const { Schema } = require("mongoose");

const userJsonSchema = {
    username: {
        type: String,
        required: true,
        description: "'name' is required and is a string",
        unique: true
    },
    password: {
        type: String,
        required: true,
        description: "'password' is required and is a string",
    },
    email: {
        type: String,
        required: true,
        description: "'email' is optional and is a string",
    },
    role: {
        type: String,
        required: false,
        description: "'role' is optional and is a string",
    },
    banned: {
        type: Boolean,
        required: false,
        description: "'banned' is optional and is a boolean",
    },

};

module.exports = {
    userJsonSchema: userJsonSchema,
};