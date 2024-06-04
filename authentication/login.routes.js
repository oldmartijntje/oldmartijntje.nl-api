const express = require("express");
const { UserAuthenticator } = require("./user.authenticator");

const loginRouter = express.Router();
loginRouter.use(express.json());

/**
 * Get the sessiontoken by using your password and username.
 * 
 * Also returns the tenants that the user is part of.
 */
loginRouter.post("/", async (_req, res) => {
    try {
        const username = _req.body.username;
        const password = _req.body.password;
        const auth = new UserAuthenticator();
        const authenticationSuccess = await auth.authenticateByCredentialsWithResponseHandling(username, password, res);
        if (!authenticationSuccess) {
            return;
        }
        const sessionToken = auth.getSessionToken();
        if (sessionToken) {
            const response = { "message": "Logged in succesfully", success: true };
            if (!response.success) {
                res.status(500).send({ "message": "Error while fetching tenants", error: response.error });
                return;
            }
            response["sessionToken"] = sessionToken;
            res.status(200).send(response);
            return;
        }
        res.status(501).send({ "message": "Unexpected logic escape: How did this occur?" });
    } catch (error) {
        res.status(500).send({ "message": error.message });
    }
});

/**
 * check if your sessiontoken is valid.
 * 
 * Also returns the tenants that the user is part of.
 */
loginRouter.post("/validateToken", async (_req, res) => {
    try {
        const sessionTokenString = _req.body.sessionToken;
        const auth = new UserAuthenticator();
        const authenticationSuccess = await auth.authenticateBySessionTokenWithResponseHandling(sessionTokenString, res);
        if (!authenticationSuccess) {
            return;
        }
        const response = { "message": "Logged in succesfully", success: true };
        if (!response.success) {
            res.status(500).send({ "message": "Error while fetching tenants", error: response.error });
            return;
        }
        res.status(200).send(response)
    } catch (error) {
        res.status(500).send(error.message);
    }
});

module.exports = {
    loginRouter: loginRouter
}