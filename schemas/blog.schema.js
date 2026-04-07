const blogJsonSchema = {
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true,
        trim: true
    },
    blogIdentifier: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    pubDate: {
        type: Date,
        required: true,
        default: Date.now
    },
    editDate: {
        type: Date,
        required: true,
        default: Date.now
    },
    hidden: {
        type: Boolean,
        required: true,
        default: false
    }
};

module.exports = {
    blogJsonSchema
};