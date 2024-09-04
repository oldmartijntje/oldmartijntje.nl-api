const { Schema } = require("mongoose");

const displayItemJsonSchema = {
    title: {
        type: String,
        required: true,
        description: "'title' is required and is a string",
    },
    thumbnailImage: {
        type: String,
        required: false,
        description: "'thumbnailImage' is optional and is a string",
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
    infoPages: {
        type: Array, // {title: string, content: string}
        required: true,
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
    spoiler: {
        type: Boolean, // default = false
        required: true,
        description: "'spoiler' is required and is a boolean",
    },
    nsfw: {
        type: Boolean, // default = false
        required: true,
        description: "'nsfw' is required and is a boolean",
    },
    tags: {
        type: Array,
        required: true,
        description: "'tags' is required and is a array",
    },
    displayItemType: {
        type: String, // default = Project
        required: true,
        description: "'displayItemType' is required and is a string",
    },

};

module.exports = {
    displayItemJsonSchema: displayItemJsonSchema,
};