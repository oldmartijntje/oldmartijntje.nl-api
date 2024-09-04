const { Schema } = require("mongoose");

const displayItemJsonSchema = {
    title: {
        type: String,
        required: true,
        description: "'title' is required and is a string",
    },
    images: {
        type: Array,
        required: false, // remove later
        description: "'images' is depricated and is a array",
    },
    tumbnailImageId: {
        type: Number,
        required: false, // remove later
        description: "'tumbnailImageId' is depricated and is a number",
    },
    tumbnailImage: {
        type: String,
        required: false,
        description: "'tumbnailImage' is optional and is a string",
    },
    description: {
        type: String,
        required: false,
        description: "'description' is optional and is a string",
    },
    link: {
        type: String,
        required: false,
        description: "'link' is optional and is a string",
    },
    info: {
        type: String,
        required: false, // remove later
        description: "'info' is depricated and is a string",
    },
    infoPages: {
        type: Array,
        required: false, // set to true later
        description: "'infoPages' is required and is a array",
    },
    lastUpdated: {
        type: Date,
        required: false,
        description: "'lastUpdated' is optional and is a date",
    },
    hidden: {
        type: Boolean,
        required: true,
        description: "'hidden' is required and is a boolean",
    },
    tags: {
        type: Array,
        required: false,
        description: "'tags' is optional and is a array",
    },
    displayItemType: {
        type: String,
        required: false,
        description: "'displayItemType' is optional and is a string",
    },

};

module.exports = {
    displayItemJsonSchema: displayItemJsonSchema,
};