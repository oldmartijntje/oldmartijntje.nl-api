const mongoose = require('mongoose');
const { userJsonSchema } = require("./schemas/user.schema");
const { sessionTokenJsonSchema } = require("./schemas/sessionToken.schema");
const { hash } = require('bcrypt');
const { displayItemJsonSchema } = require("./schemas/projects.schema");
const { sessionJsonSchema } = require("./schemas/session.schema");
const { registrationCodeJsonSchema } = require("./schemas/registrationCode.schema");




// This has to be done for all collections that we want to have JSON schema validation on
const sessionTokenSchema = new mongoose.Schema(sessionTokenJsonSchema);
const sessionTokens = mongoose.model('sessionToken', sessionTokenSchema);

const displayItemSchema = new mongoose.Schema(displayItemJsonSchema);
const displayItems = mongoose.model('displayItems', displayItemSchema);

const registrationCodeSchema = new mongoose.Schema(registrationCodeJsonSchema);
const registrationCodes = mongoose.model('registrationCode', registrationCodeSchema);

const sessionSchema = new mongoose.Schema(sessionJsonSchema);
sessionSchema.index({ lastCall: 1 }, { expireAfterSeconds: 60 * 60 });
const sessions = mongoose.model('session', sessionSchema);

const userSchema = new mongoose.Schema(userJsonSchema);
userSchema.pre('save', async function (next) {
    // Check if the password field is modified
    if (this.isModified('password')) {
        const hashedPassword = await hash(this.password, 10);
        this.password = hashedPassword;
    }
    next();
});
const users = mongoose.model('user', userSchema);

async function connectToDatabase(uri) {
    try {
        const mongoose = require('mongoose');
        await mongoose.connect(uri);
        return mongoose;
    } catch (error) {
        console.error('Error while connecting to database:', error);
        return undefined;
    }
}

module.exports = {
    connect: connectToDatabase,
    users: users,
    sessionTokens: sessionTokens,
    displayItems: displayItems,
    sessions: sessions,
    registrationCodes: registrationCodes
};