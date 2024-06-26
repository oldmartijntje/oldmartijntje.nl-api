const { UserHandler } = require("./user.handler");
const mongodb = require('mongodb');


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
     * Gets all tenants this selected user has access to and checks if the tenantId is in the list.
     * Only works if the user is authenticated.
     * 
     * @param tenantIdString - the tenantId string
     * @param res - the response object
     * @returns `Boolean` - data about if it was succesfull or not.
     */
    canThisTenantBeAccessedByThisUser(tenantIdString, res) {
        const tenantsFound = this.getUserData().tenantIdentifiers;
        if (!this.checkForMongoObjectInList(tenantsFound, tenantIdString)) {
            res.status(401).send({ "message": "You don't have access to this tenant, or it does not exist." });
            return false;
        }
        return true;
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
     * Login with a sessionToken and response object.
     * @param sessionTokenString - the sessionToken
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
    async authenticateBySessionTokenWithResponseHandling(sessionTokenString, res, requiredList = {}) {
        requiredList["sessionToken"] = sessionTokenString;
        const message = this.requiredListFormatter(requiredList);
        if (message !== undefined) {
            res.status(400).send({ "message": message });
            return false;
        }
        const authenticationResponse = await this.authenticateBySessionToken(sessionTokenString);
        if (!authenticationResponse) {
            res.status(403).send({ "message": "Invalid SessionToken" });
            return false;
        }
        return true;
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
            res.status(403).send({ "message": "Invalid username and password combination." });
            return false;
        }
        return true;
    }

    /**
     * Tries to login with sessionToken.
     * @param sessionTokenString - the sessionToken
     * @returns `boolean` - wether it's a valid token or not.
     */
    async authenticateBySessionToken(sessionTokenString) {
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
        this.#authorise();
        const sessionToken = await this.#userHandlerInstance.createSingularSessionToken();
        this.#sessionToken = sessionToken;
        return true;
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
     * List of required things formatter.
     * 
     * @param requiredDict - A dict of things, if any is undefined, will return a message.
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

    /**
     * Checks if your list of mongoDB ObjectIds contains the objectId you want to access.
     * @param {Array} tenantList - The list of ObjectIds
     * @param {String} tenantIdString - The tenantId String you want to access
     * @returns `boolean` - Wether the tenantIdString is in the tenantList or not.
     */
    checkForMongoObjectInList(tenantList, tenantIdString) {
        try {
            const tenantId = new mongodb.ObjectId(tenantIdString);
            return tenantList.some((objectId) => objectId.equals(tenantId))
        } catch {
            return false;
        }
    }
}

module.exports = {
    UserAuthenticator: UserAuthenticator
};