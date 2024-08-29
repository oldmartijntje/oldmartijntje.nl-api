const registrationCodeJsonSchema = {
    clearanceLevel: {
        type: Number,
        required: true,
        description: "'clearanceLevel' is required and is a number",
    },
    role: {
        type: String,
        required: false,
        description: "'role' is optional and is a string",
    },
    code: {
        type: String,
        required: true,
        unique: true,
        description: "'code' is required and is a string",
    },
};

module.exports = {
    registrationCodeJsonSchema: registrationCodeJsonSchema
};