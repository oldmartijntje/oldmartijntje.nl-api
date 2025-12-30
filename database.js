const mongoose = require('mongoose');
const { userJsonSchema } = require("./schemas/user.schema");
const { sessionTokenJsonSchema } = require("./schemas/sessionToken.schema");
const { hash } = require('bcrypt');
const { displayItemJsonSchema } = require("./schemas/projects.schema");
const { sessionJsonSchema } = require("./schemas/session.schema");
const { registrationCodeJsonSchema } = require("./schemas/registrationCode.schema");
const { projectDataJsonSchema } = require("./schemas/projectsData.schema");
const { implementationKeyJsonSchema } = require("./schemas/implementationKey.schema");
const { quartzForumAccountJsonSchema } = require("./schemas/quartzForumAccount.schema");
const { quartzForumForumJsonSchema } = require("./schemas/quartzForumForum.schema");
const { quartzForumMessageJsonSchema } = require("./schemas/quartzForumMessage.schema");
const { securityFlagJsonSchema } = require("./schemas/securityFlag.schema");

// This has to be done for all collections that we want to have JSON schema validation on
const sessionTokenSchema = new mongoose.Schema(sessionTokenJsonSchema);
const sessionTokens = mongoose.model('sessionToken', sessionTokenSchema);

const displayItemSchema = new mongoose.Schema(displayItemJsonSchema);
const displayItems = mongoose.model('displayItems', displayItemSchema);

const projectDataSchema = new mongoose.Schema(projectDataJsonSchema);
const projectData = mongoose.model('projectData', projectDataSchema);

const registrationCodeSchema = new mongoose.Schema(registrationCodeJsonSchema);
const registrationCodes = mongoose.model('registrationCode', registrationCodeSchema);

const sessionSchema = new mongoose.Schema(sessionJsonSchema);
sessionSchema.index({ lastCall: 1 }, { expireAfterSeconds: 60 * 60 });
const sessions = mongoose.model('session', sessionSchema);

const userSchema = new mongoose.Schema(userJsonSchema);
userSchema.pre('save', async function (next) {
    // Check if the password field is modified
    if (this.isModified('password')) {
        const hashedPassword = await hash(this.password, 12);
        this.password = hashedPassword;
    }
    next();
});
const users = mongoose.model('user', userSchema);

// QuartzForums schemas
const implementationKeySchema = new mongoose.Schema(implementationKeyJsonSchema);
const implementationKeys = mongoose.model('ImplementationKey', implementationKeySchema);

const quartzForumAccountSchema = new mongoose.Schema(quartzForumAccountJsonSchema);
quartzForumAccountSchema.pre('save', async function (next) {
    if (this.isModified('password')) {
        const hashedPassword = await hash(this.password, 12);
        this.password = hashedPassword;
    }
    next();
});
const quartzForumAccounts = mongoose.model('QuartzForumAccount', quartzForumAccountSchema);

const quartzForumForumSchema = new mongoose.Schema(quartzForumForumJsonSchema);
quartzForumForumSchema.index({ implementationKey: 1, subpage: 1 }, { unique: true });
const quartzForumForums = mongoose.model('QuartzForumForum', quartzForumForumSchema);

const quartzForumMessageSchema = new mongoose.Schema(quartzForumMessageJsonSchema);
const quartzForumMessages = mongoose.model('QuartzForumMessage', quartzForumMessageSchema);

const securityFlagSchema = new mongoose.Schema(securityFlagJsonSchema);
const securityFlags = mongoose.model('SecurityFlag', securityFlagSchema);

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
    registrationCodes: registrationCodes,
    projectData: projectData,
    implementationKeys: implementationKeys,
    quartzForumAccounts: quartzForumAccounts,
    quartzForumForums: quartzForumForums,
    quartzForumMessages: quartzForumMessages,
    securityFlags: securityFlags
};