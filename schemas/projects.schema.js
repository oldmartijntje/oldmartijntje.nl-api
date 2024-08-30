const { Schema } = require("mongoose");

const projectsJsonSchema = {
    title: {
        type: String,
        required: true,
        description: "'title' is required and is a string",
    },
    images: {
        type: Array,
        required: true,
        description: "'images' is required and is a array",
    },
    tumbnailImageId: {
        type: Number,
        required: true,
        description: "'tumbnailImageId' is required and is a number",
    },
    link: {
        type: String,
        required: false,
        description: "'link' is optional and is a string",
    },
    info: {
        type: String,
        required: true,
        description: "'info' is required and is a string",
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

};

module.exports = {
    projectsJsonSchema: projectsJsonSchema,
};