const { users, sessionTokens } = require("../database");
const { compare } = require('bcrypt');
const mongodb = require("mongodb");
const settings = require('../settings.json');

const sessiontokenExpireTime = settings['sessionTokenExpirationMinutes'];

function uuidv4BasedOnTime() {
    var dt = new Date().getTime();
    var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = (dt + Math.random() * 16) % 16 | 0;
        dt = Math.floor(dt / 16);
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
    return uuid;
}

function stripCredentials(user) {
    if (!user) {
        return undefined;
    }
    const strippedUser = { ...user };
    delete strippedUser.password;
    return strippedUser;
}

/**
 * The UserHandler class is used to handle user data.
 * 
 * From getting user data to creating session tokens.
 * 
 * It uses memory, so you once do a select method, and then a setsessiontoken / etc method.
 * 
 * @class UserHandler
 */
class UserHandler {
    #selectedUsers; //UserInterface[] = [];

    constructor() {
    }

    /**
     * Select a user by username.
     * Replaces the selected users array with the user found by the username, if found.
     * 
     * @param {string} username - the username to find
     * @returns `boolean` - wether the user was found or not
    */
    async findUserByUsername(username) {
        try {
            const user = await users.findOne({ username: username }).lean();
            if (!user) {
                return false;
            } else {
                this.#selectedUsers = [];
                this.#selectedUsers.push(stripCredentials(user));
                return true;
            }
        } catch (error) {
            console.error('Error finding user:', error);
            return false
        }
    }

    /**
     * Get the selected user.
     * Selected user being the first user in the already selected users array.
     * 
     * @returns `UserInterface | undefined`
     */
    getUser() {
        if (!this.#selectedUsers || this.#selectedUsers.length === 0 || !this.#selectedUsers[0]) {
            return undefined;
        }
        return this.#selectedUsers[0];
    }

    /**
     * Get the selected users.
     * Selected users being the users in the already selected users array.
     * 
     * @returns `UserInterface[] | undefined`
     */
    getUsers() {
        if (!this.#selectedUsers || this.#selectedUsers.length === 0) {
            return undefined;
        }
        return this.#selectedUsers;
    }

    /**
     * Changes the data of the selected user.
     * Selected user being the first user in the already selected users array.
     * - If multiple users are selected, only the first one will be used
     * @param newUserData - user object with the new data
     * @returns 
     */
    editUser(newUserData) {
        if (!this.#selectedUsers || this.#selectedUsers.length === 0 || !this.#selectedUsers[0]) {
            return false;
        }
        const user = this.#selectedUsers[0];
        if (newUserData.username)
            user.username = newUserData.username;
        if (newUserData.email)
            user.email = newUserData.email;
        if (newUserData.password)
            user.password = newUserData.password;
        if (newUserData.role)
            user.role = newUserData.role;
        try {
            const response = users.updateOne({ _id: user._id }, user).exec();
            if (!response) {
                return false;
            }
        } catch (error) {
            console.error('Error editing user:', error);
            return false;
        }

        return true;
    }



    /**
     * Validates the password for the selected user.
     * Selected user being the first user in the already selected users array.
     * - If multiple users are selected, only the first one will be used
    * @param {string} password - the password to validate
    * @returns `boolean` - wether the password is valid or not
    */
    async validatePassword(password) {
        if (!this.#selectedUsers) {
            return false;
        }
        try {
            const passwordMatch = await compare(password, this.#selectedUsers[0].password);
            if (!passwordMatch) {
                return false;
            } else {
                return true;
            }
        } catch (error) {
            console.error('Error validating password:', error);
            return false;
        }
    }

    /**
     * Creates a session token for the selected user.
     * Selected user being the first user in the already selected users array.
     * Automatically deletes old session tokens.
     * 
     * @returns `string | undefined` - the session token if a user is selected.
     */
    async createSingularSessionToken() {
        const tokens = await this.createMultipleSessionTokens(1);
        if (tokens.length === 0) {
            return undefined;
        }
        return tokens[0];
    }

    /**
     * Creates session tokens for the selected users up to the specified limit.
     * Automatically deletes old session tokens.
     * 
     * @param {number} limit - The number of session tokens to create.
     * @returns {Promise<string[]>} - A list of session tokens if users are selected.
     */
    async createMultipleSessionTokens(limit) {
        if (!this.#selectedUsers || this.#selectedUsers.length === 0) {
            return [];
        }

        const tokens = [];
        const usersToProcess = this.#selectedUsers.slice(0, limit);
        if (!await this.removeAllSessionTokensOfAllUsers(limit)) {
            return [];
        }


        for (const user of usersToProcess) {
            try {
                const expirationDate = new Date(Date.now());
                expirationDate.setMinutes(expirationDate.getMinutes() + sessiontokenExpireTime);
                const token = uuidv4BasedOnTime()
                const sessionToken = await sessionTokens.create({ userId: user._id, expirationDate: expirationDate, identifier: token });
                sessionToken.save();

                tokens.push(token);
            } catch (error) {
                console.error(error);
            }
        }

        return tokens;
    }


    /**
     * Checks if a session token is valid, meaning it exists and is not expired.
     * 
     * @param {string} sessionToken - the session token to check
     * @returns `boolean` - wether the session token is valid or not.
     * 
     */
    async validateSessionToken(sessionToken) {
        try {
            // check if the session token is valid by checking if it exists and if it's not expired
            let sessionTokenObject = await sessionTokens.findOne({ identifier: sessionToken }).lean();
            if (!sessionTokenObject) {
                sessionTokenObject = await users.findOne({ guestAccountIdentifier: sessionToken }).lean()
                if (!sessionTokenObject) {
                    return false;
                }
                return true;
            }
            if (sessionTokenObject.expirationDate < new Date()) {
                this.removeSessionToken(sessionToken);
                return false;
            }
        } catch (error) {
            console.error(error);
            return false;
        }
        return true;
    }

    /**
     * Removes a session token from the database by it's id.
     * 
     * @param {string} sessionToken - the session token to remove
     * @returns `boolean` - wether the session token was removed or not
     */
    async removeSessionToken(sessionToken) {
        try {
            const deleteResult = await sessionTokens.deleteOne({ identifier: sessionToken });
            if (deleteResult.deletedCount === 1) {
                return true;
            } else {
                return false;
            }
        } catch (error) {
            console.error(error);
            return false;
        }
    }

    /**
     * Removes session tokens from the database for the selected users up to the specified limit.
     * 
     * @param {number} limit - The maximum number of session tokens to remove.
     * @returns {Promise<boolean>} - Whether the session tokens were removed or not.
     */
    async removeAllSessionTokensOfAllUsers(limit) {
        if (!this.#selectedUsers || this.#selectedUsers.length === 0 || !this.#selectedUsers[0]) {
            return false;
        }

        const usersToProcess = this.#selectedUsers.slice(0, limit);

        try {
            for (const user of usersToProcess) {
                await sessionTokens.deleteMany({ userId: user._id });
            }
            return true;
        } catch (error) {
            console.error(error);
            return false;
        }
    }


    /**
     * Selects a user by it's id.
     * Overwrites the selected users array with the user found by the id, if found.
     * 
     * @param {string} userId - the id of the user to select
     * @returns `boolean` - wether the user was selected or not
     */
    async selectUserById(userIdString) {
        var userId = undefined;
        try {
            userId = new mongodb.ObjectId(userIdString);
        } catch (error) {
            return false;
        }
        try {
            const user = await users.findOne({ _id: userId }).lean();
            if (!user) {
                return false;
            } else {
                this.#selectedUsers = [];
                this.#selectedUsers.push(stripCredentials(user));
                return true;
            }
        } catch (error) {
            console.error('Error selecting user by id:', error);
            return false;
        }
    }

    /**
     * Get userID by sessionToken
     * 
     * @param {string} sessionToken - the session token to check
     * @returns `string | undefined` - the userid if it is a valid sessiontoken.
     */
    async getUserIdBySessionToken(sessionToken) {
        try {
            let sessionTokenObject = await sessionTokens.findOne({ identifier: sessionToken }).lean();
            if (!sessionTokenObject) {
                sessionTokenObject = await users.findOne({ guestAccountIdentifier: sessionToken }).lean()
                sessionTokenObject.userId = sessionTokenObject._id;
            }
            return `${sessionTokenObject.userId}`;
        } catch (error) {
            console.error(error);
            return;
        }
    }

    /**
     * Get the username of the selected user(s).
     * Selected user(s) being the user(s) in the already selected users array.
     * 
     * @returns `string[] | undefined` - the username of the selected user if a user is selected.
     */
    getUsernames() {
        if (!this.#selectedUsers || this.#selectedUsers.length === 0 || !this.#selectedUsers[0]) {
            return;
        }
        var usernames = [];
        this.#selectedUsers.forEach(user => {
            usernames.push(user.username);
        });
        return usernames;
    }
}

module.exports = {
    UserHandler: UserHandler
};