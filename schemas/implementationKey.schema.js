const implementationKeyJsonSchema = {
    implementationKey: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    domain: {
        type: String,
        required: true,
        trim: true
    },
    disabled: {
        type: Boolean,
        default: false
    }
};

module.exports = {
    implementationKeyJsonSchema
};