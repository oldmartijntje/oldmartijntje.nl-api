const { UserHandler } = require("./user.handler");
const { SecurityFlagHandler } = require("../helpers/securityFlag.handler.js");
const mongodb = require('mongodb');

const allowedCharactersUsername = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_.🌵✨🗿🫃🏽🔰";
const formattedAllowedCharactersUsername = "a-z, A-Z, 0-9, '._🌵✨🗿🫃🏽🔰'"
const allowedCharactersPassword = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?";
const formattedAllowedCharactersPassword = "a-z, A-Z, 0-9, '!@#$%^&*()_+-=[]{}|;:,.<>?'"
const minUsernameLength = 3;
const maxUsernameLength = 20;
const minPasswordLength = 8;
const maxPasswordLength = 50;

function checkStringForIllegalCharacters(string, allowedCharacterSet) {
    for (let i = 0; i < string.length; i++) {
        if (!allowedCharacterSet.includes(string[i])) {
            return false;
        }
    }
    return true;
}

/**
 * The UserAuthenticator class is used to authenticate users.
 * 
 * Uses the UserHandler class to handle the user data.
 * 
 * @class UserAuthenticator
 */
class UserAuthenticator {
    #userHandlerInstance; // The userHandler instance. `UserHandler`
    #sessionToken; // The sessionToken. `string | undefined`
    #isAuthenticated; // Wether or not the user is authenticated. `boolean`
    #user; // The user that is logged in. `UserInterface | undefined`

    constructor() {
        this.#userHandlerInstance = new UserHandler();
        this.#isAuthenticated = false;
    }

    /**
     * Sets the `isAuthenticated` boolean to `false`
     */
    #unAuthorise() {
        this.#isAuthenticated = false;
    }

    /**
     * Sets the `isAuthenticated` boolean to `true`
     */
    #authorise() {
        this.#isAuthenticated = true;
    }

    /**
     * Login with a sessionToken + username and response object.
     * @param sessionTokenString - the sessionToken
     * @param username - the username
     * @param res - the response object
     * @param requiredDict - A dict of things, if any is undefined, the user will be unauthorised. 
     * @returns `boolean` - wether it's a valid token or not.
     * 
     * @example
     * ```javascript
     * const requiredList = {
     *      "user": undefined,
     *      "test": "123",
     *      "test2": 123,
     *      "test3": false,
     *      "test4": undefined
     * }
     * const auth = new UserAuthenticator();
     * const authenticationResponse = await auth.authenticateBySessionTokenAndResponse(sessionTokenString, res, requiredList);
     * ```
     * this will return the following error:
     * ```json
     * {
     *    "message": "user and test4 are required"
     * }
     * ```
     */
    async authenticateBySessionTokenWithResponseHandling(sessionTokenString, username, res, requiredList = {}) {
        requiredList["sessionToken"] = sessionTokenString;
        const message = this.requiredListFormatter(requiredList);
        if (message !== undefined) {
            res.status(400).send({ "message": message });
            return false;
        }
        const authenticationResponse = await this.#authenticateBySessionToken(sessionTokenString);
        if (authenticationResponse) {
            if (this.#user.username === username || username === false) {
                return true;
            }
        }
        if (username === false) {
            res.status(401).send({ "message": "Invalid SessionToken" });
            return false;
        }
        res.status(401).send({ "message": "Invalid SessionToken and username combination" });
        return false;
    }

    /**
     * Login with a credentials and response object.
     * @param usernamne - the usernamne
     * @param password - the password
     * @param res - the response object
     * @param requiredDict - A dict of things, if any is undefined, the user will be unauthorised. 
     * @returns `boolean` - wether it's a valid token or not.
     * 
     * @example
     * ```javascript
     * const requiredList = {
     *      "user": undefined,
     *      "test": "123",
     *      "test2": 123,
     *      "test3": false,
     *      "test4": undefined
     * }
     * const auth = new UserAuthenticator();
     * const authenticationResponse = await auth.authenticateByCredentialsAndResponse("henk", "goodPassword123!", res, requiredList);
     * ```
     * this will return the following error:
     * ```json
     * {
     *    "message": "user and test4 are required"
     * }
     * ```
     */
    async authenticateByCredentialsWithResponseHandling(username, password, res, requiredList = {}) {
        requiredList["username"] = username;
        requiredList["password"] = password;
        const message = this.requiredListFormatter(requiredList);
        if (message !== undefined) {
            res.status(400).send({ "message": message });
            return false;
        }
        const success = await this.authenticateByLogin(username, password)
        if (!success) {
            res.status(401).send({ "message": "Invalid username and password combination." });
            return false;
        }
        return true;
    }

    /**
     * Create and Handle the creation of an account.
     * @param username - the username
     * @param password - the password
     * @param activationCode - the activationCode
     * @param res - the response object
     */
    async createAccount(username, password, activationCode, res) {
        if (!username || !password || !activationCode) {
            res.status(400).send({ "message": "username, password and activationCode are required" });
            return;
        }
        if (!checkStringForIllegalCharacters(username, allowedCharactersUsername)) {
            res.status(400).send({ "message": "Illegal characters in username. You are only allowed to use " + formattedAllowedCharactersUsername });
            return;
        }
        if (!checkStringForIllegalCharacters(password, allowedCharactersPassword)) {
            res.status(400).send({ "message": "Illegal characters in password. You are only allowed to use " + formattedAllowedCharactersPassword });
            return;
        }
        if (username.length < minUsernameLength || username.length > maxUsernameLength) {
            res.status(400).send({ "message": "Username must be between " + minUsernameLength + " and " + maxUsernameLength + " characters." });
            return;
        }
        if (password.length < minPasswordLength || password.length > maxPasswordLength) {
            res.status(400).send({ "message": "Password must be between " + minPasswordLength + " and " + maxPasswordLength + " characters." });
            return;
        }
        const validActivationCode = await this.#userHandlerInstance.validateActivationCode(activationCode, false);
        if (!validActivationCode) {
            res.status(400).send({ "message": "Invalid activation code." });
            return;
        }
        const successfullCreation = await this.#userHandlerInstance.createUser({
            username: username,
            password: password,
            clearanceLevel: validActivationCode.clearanceLevel,
            role: validActivationCode.role,
            textNote: validActivationCode.textNote,
        });
        if (!successfullCreation) {
            res.status(400).send({ "message": "Unable to create the user, username is probably already taken." });
            return;
        }
        this.#userHandlerInstance.deleteActivationCode(activationCode);
        res.status(200).send({ "message": "User created successfully." });
    }

    /**
     * Generate a registration code and handle the response.
     * @param sessionTokenString - the sessionToken
     * @param clearanceLevel - the clearanceLevel
     * @param role - the role
     * @param res - the response object
     * @returns `boolean` - wether it's a valid token or not.
     */
    async createRegistratonCodeHandling(clearanceLevel, role, textNote, res) {
        if (typeof clearanceLevel != typeof 0) {
            res.status(400).send({ "message": "sessionToken and clearanceLevel are required" });
            return;
        }
        const createdCode = await this.#userHandlerInstance.createRegistrationCode(role, clearanceLevel, textNote);
        if (!createdCode) {
            res.status(400).send({ "message": "Unable to create the code." });
            return;
        }
        const codes = await this.#userHandlerInstance.findAllRegistrationCodes();
        if (!codes) {
            res.status(200).send({ "message": "Code created successfully.", "code": createdCode.code });
            return;
        }
        res.status(200).send({ "message": "Code created successfully.", "code": createdCode.code, "codes": codes });
    }

    /**
     * Tries to login with sessionToken.
     * @param sessionTokenString - the sessionToken
     * @returns `boolean` - wether it's a valid token or not.
     * @private
     */
    async #authenticateBySessionToken(sessionTokenString) {
        const validSessionToken = await this.#userHandlerInstance.validateSessionToken(sessionTokenString);
        if (validSessionToken === false) {
            // The sessiontoken is invalid
            this.#unAuthorise();
            return this.isAuthorised();
        }
        const userId = await this.#userHandlerInstance.getUserIdBySessionToken(sessionTokenString);
        if (userId === undefined) {
            // The sessiontoken was valid, but unable to get the userId.
            this.#unAuthorise();
            return this.isAuthorised();
        }
        const user = await this.#userHandlerInstance.selectUserById(userId);
        if (user) {
            // user is authenticated
            this.#sessionToken = sessionTokenString;
            this.#user = this.#userHandlerInstance.getUser()
            this.#authorise();
        } else {
            // The sessiontoken was valid, but the user doesn't exist.
            this.#unAuthorise();
        }
        return this.isAuthorised();
    }

    /**
     * Wether or not the user is authenticated.
     * @returns `boolean`
     */
    isAuthorised() {
        return this.#isAuthenticated;
    }

    /**
     * Tries to login with credentials
     * Auto creates a sessiontoken.
     * @param username
     * @param password
     * @returns `boolean` - wether it's a valid login.
     */
    async authenticateByLogin(username, password) {
        if (!await this.#userHandlerInstance.findUserByUsername(username)) {
            this.#unAuthorise();
            return false;
        }
        if (!await this.#userHandlerInstance.validatePassword(password)) {
            this.#unAuthorise();
            return false;
        }
        this.#user = this.#userHandlerInstance.getUser()
        if (this.#user.clearanceLevel > 4) {
            // Create security flag for high-privilege user login
            try {
                await SecurityFlagHandler.createSecurityFlag({
                    ipAddress: 'unknown', // IP not available in this context
                    riskLevel: 3,
                    description: `User with high clearance level (${this.#user.clearanceLevel}) logged in`,
                    fileName: 'user.authenticator.js',
                    userId: this.#user._id,
                    additionalData: {
                        username: this.#user.username,
                        clearanceLevel: this.#user.clearanceLevel,
                        loginMethod: 'password'
                    }
                });
            } catch (flagError) {
                console.error('Error creating security flag:', flagError);
            }
        }
        this.#authorise();
        const sessionToken = await this.#userHandlerInstance.createSingularSessionToken();
        this.#sessionToken = sessionToken;
        return true;
    }

    /**
     * Refreshes the sessionToken.
     * @return `string` - the new sessionToken
     */
    refreshSessionToken() {
        if (!this.#user || this.#user.guestAccountIdentifier) {
            return;
        }
        const sessionToken = this.#userHandlerInstance.createSingularSessionToken();
        this.#sessionToken = sessionToken;
        return sessionToken;
    }

    /**
     * Returns the userHandler
     * @returns `UserHandler` - the userhandler the class uses.
     */
    getUserHandler() {
        return this.#userHandlerInstance;
    }

    /**
     * Returns your user data.
     * @returns `UserInterface` - without the password field.
     */
    getUserData() {
        if (!this.#user) {
            return;
        }
        const user = { ...this.#user };
        delete user.password;
        return user;
    }

    /**
     * Returns the SessionToken if definded.
     * @returns `string` sessionToken
     */
    getSessionToken() {
        return this.#sessionToken
    }

    /**
     * Check if the user has the required clearance level.
     * @param requiredLevel - the required clearance level.
     * @returns `boolean` - wether the user has the required clearance level.
     */
    checkAuthorityLevel(requiredLevel) {
        if (!this.#user || !this.#user.clearanceLevel) {
            return false;
        }
        if (this.#user.clearanceLevel >= requiredLevel) {
            return true;
        }
        return false
    }

    /**
     * List of required things formatter.
     * 
     * @param requiredDict - A dict of things, if any is null, will return a message.
     * @returns `string | undefined` - the message if any is undefined.
     * 
     * @example
     * ```javascript
     * console.log(this.requiredListFormatter({ 'e': undefined, 'a': undefined }));
       console.log(this.requiredListFormatter({ 'e': undefined, 'a': undefined, 'b': undefined }));
       console.log(this.requiredListFormatter({ 'e': undefined, 'a': false, 'b': undefined }));
       console.log(this.requiredListFormatter({ 'e': undefined, 'a': "123" }));
       console.log(this.requiredListFormatter({ 'e': 1, 'a': "123" }));
     * ```
    * this will return the following:
    * ```
    * e and a are required
    * e and a and b are required
    * e and b are required
    * e is required
    * undefined
    * ```
     */
    requiredListFormatter(requiredDict = {}) {
        let requiredList = "";
        let requiredListArray = [];
        for (const [key, value] of Object.entries(requiredDict)) {
            if (value === undefined) {
                requiredListArray.push(key);
            }
        }
        if (requiredListArray.length === 0) {
            return undefined;
        }
        requiredList = requiredListArray.join(" and ");
        if (requiredListArray.length === 1) {
            requiredList += " is required";
        } else {
            requiredList += " are required";
        }
        return requiredList;
    }

    /**
     * Check if a string is a valid Object.
     * 
     * @param {string} dataStringObject - The string to check.
     * @returns `boolean` - Wether the string is a valid Object or not.
     */
    isValidDataStringObject(dataStringObject) {
        try {
            JSON.parse(dataStringObject);
            return true;
        } catch (e) {
            return false;
        }
    }
}

module.exports = {
    UserAuthenticator: UserAuthenticator
};