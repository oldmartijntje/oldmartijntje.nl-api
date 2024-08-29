const express = require("express");
const { UserAuthenticator } = require("./user.authenticator");
const { SessionHandler } = require("../authentication/sessionHandler");

const loginRouter = express.Router();
loginRouter.use(express.json());

/**
 * Get the sessiontoken by using your password and username.
 * 
 */
loginRouter.post("/", async (_req, res) => {
    try {
        const username = _req.body.username;
        const password = _req.body.password;
        const sessionH = new SessionHandler();
        sessionH.rateLimitMiddleware(_req, res, async () => {
            const auth = new UserAuthenticator();
            const authenticationSuccess = await auth.authenticateByCredentialsWithResponseHandling(username, password, res);
            if (!authenticationSuccess) {
                return;
            }
            const sessionToken = auth.getSessionToken();
            if (sessionToken) {
                const response = { "message": "Logged in succesfully", success: true, "data": auth.getUserData() };
                response["sessionToken"] = sessionToken;
                res.status(200).send(response);
                return;
            }
            res.status(501).send({ "message": "Unexpected logic escape: How did this occur?" });
        });
    } catch (error) {
        res.status(500).send({ "message": error.message });
    }
});

/**
 * check if your sessiontoken is valid.
 * 
 */
loginRouter.post("/validateToken", async (_req, res) => {
    try {
        const sessionTokenString = _req.body.sessionToken;
        const sessionH = new SessionHandler();
        sessionH.rateLimitMiddleware(_req, res, async () => {
            const auth = new UserAuthenticator();
            const authenticationSuccess = await auth.authenticateBySessionTokenWithResponseHandling(sessionTokenString, res);
            if (!authenticationSuccess) {
                return;
            }
            const response = { "message": "Logged in succesfully", success: true, "data": auth.getUserData() };
            res.status(200).send(response)
        });
    } catch (error) {
        res.status(500).send(error.message);
    }
});

/**
 * refresh your sessiontoken for a new one.
 * 
 */
loginRouter.post("/refreshToken", async (_req, res) => {
    try {
        const sessionTokenString = _req.body.sessionToken;
        const sessionH = new SessionHandler();
        sessionH.rateLimitMiddleware(_req, res, async () => {
            const auth = new UserAuthenticator();
            const authenticationSuccess = await auth.authenticateBySessionTokenWithResponseHandling(sessionTokenString, res);
            if (!authenticationSuccess) {
                return;
            }
            const sessionToken = auth.refreshSessionToken();
            if (sessionToken) {
                const response = { "message": "Logged in succesfully", success: true, "data": auth.getUserData() };
                response["sessionToken"] = sessionToken;
                res.status(200).send(response);
                return;
            }
            // Guest accounts cannot refresh their token.

            res.status(403).send({ "message": "Guest accounts cannot refresh their token." });
        });
    } catch (error) {
        res.status(500).send(error.message);
    }
});

module.exports = {
    loginRouter: loginRouter
}