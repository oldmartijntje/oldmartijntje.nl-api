const { Schema } = require("mongoose");

/**
 * The userJsonSchema is used to validate the user data.
 * 
 * @param username - The username of the user.
 * @param password - The password of the user.
 * @param email - The email of the user.
 * @param role - The role of the user.
 * @param clearanceLevel - The clearanceLevel of the user.
 * @param guestAccountIdentifier - The guestAccountIdentifier of the user, if it is not null, this will act as the sessiontoken.
 * @param banned - If the user is banned or not.
 * 
 * Guest accounts cannot do anything, they are just there to be able to use the API.
 */
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
        required: false,
        description: "'email' is optional and is a string",
    },
    role: {
        type: String,
        required: false,
        description: "'role' is optional and is a string",
    },
    clearanceLevel: {
        type: Number,
        required: false,
        description: "'clearanceLevel' is optional and is a number",
    },
    guestAccountIdentifier: {
        type: String,
        required: false,
        description: "'guestAccountIdentifier' is optional and is a string",
    },
    textNote: {
        type: String,
        required: false,
        description: "'notes' is optional and is a string",
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