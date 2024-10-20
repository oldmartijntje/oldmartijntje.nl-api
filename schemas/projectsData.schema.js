const { Schema } = require("mongoose");

const projectDataJsonSchema = {
    projectId: {
        type: String,
        required: true,
        description: "'projectId' is required and is a string",
    },
    attributes: {
        type: Map,
        required: false,
        description: "'thumbnailImage' is optional and is a string",
    },
    clearanceLevelNeeded: {
        type: Number,
        required: true,
        description: "'clearanceLevelNeeded' is required and is a number",
    },
};

module.exports = {
    projectDataJsonSchema: projectDataJsonSchema,
};