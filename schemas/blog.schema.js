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
    content: {
        type: String,
        required: false,
        default: ''
    },
    blogIdentifier: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    baseURL: {
        type: String,
        required: false,
        trim: true,
        default: null
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
    },
    views: {
        type: Number,
        required: false,
        default: 0
    }
};

module.exports = {
    blogJsonSchema
};